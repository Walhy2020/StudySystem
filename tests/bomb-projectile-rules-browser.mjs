import assert from "node:assert/strict";
import fs from "node:fs";
import { loadChromium } from "./playwright-runtime.mjs";
const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const key = "mario-bomb-game-progress-v1";
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const results = [];
fs.mkdirSync("tmp", { recursive: true });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(() => {
      let callbacks = [], now;
      window.requestAnimationFrame = callback => { callbacks.push(callback); return callbacks.length; };
      window.cancelAnimationFrame = () => {};
      window.__fireballRadii = [];
      const arc = CanvasRenderingContext2D.prototype.arc;
      CanvasRenderingContext2D.prototype.arc = function (...args) {
        if (this.fillStyle === "#ef4444" || this.fillStyle === "#fde68a") window.__fireballRadii.push([this.fillStyle, args[2]]);
        return arc.apply(this, args);
      };
      window.__advance = seconds => {
        now ??= performance.now();
        for (let i = 0; i < Math.ceil(seconds * 60); i++) {
          now += 1000 / 60;
          const pending = callbacks; callbacks = []; pending.forEach(callback => callback(now));
        }
      };
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(response.url()); });
    const read = () => page.evaluate(() => window.__BOMB_GAME__.getState());
    const advance = seconds => page.evaluate(seconds => window.__advance(seconds), seconds);
    await page.goto(base + "bomb-game.html?projectile-rules=1");
    await page.locator("#restartBombGame").click(); const seed = await read();
    const fixture = structuredClone(seed);
    const rows = seed.map.length, cols = seed.map[0].length;
    fixture.map = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) =>
      !x || !y || x === cols - 1 || y === rows - 1 ? 1 : 0));
    fixture.status = "playing"; fixture.startLayerHidden = true;
    fixture.player = { gx: 2, gy: 10, move: null, invulnerable: 1000 };
    fixture.enemies = [{ ...seed.enemies.find(enemy => enemy.type === "bowser"), gx: 2, gy: 3, dir: "right",
      hp: 40, fireCooldown: 3, freezeTimer: 0, stunTimer: 0,
      move: { fromX: 2, fromY: 3, toX: 2, toY: 3, time: 0, duration: 1000 } }];
    for (const field of ["fireballs", "bombs", "mushroomShots", "explosions", "powerUps", "particles", "shells", "hiddenPowerUps"]) fixture[field] = [];
    fixture.hiddenWordCrates = fixture.todayNewWords.map((word, i) => {
      fixture.map[10][8 + i] = 2; return [`${8 + i},10`, word.id];
    });
    async function load(saved, start = true) {
      await page.goto(base + "bomb-game.css?projectile-fixture=1");
      await page.evaluate(({ key, saved }) => localStorage.setItem(key, JSON.stringify(saved)), { key, saved });
      await page.goto(base + "bomb-game.html?projectile-rules=1");
      assert.equal(await page.evaluate(() => window.__BOMB_GAME__.isAwaitingContinue()), true);
      if (start) { await page.locator("#overlayStartBombGame").click(); await page.locator("#bombCanvas").focus(); }
    }
    await load(fixture); assert.equal((await read()).enemies[0].fireCooldown, 2, "old 3-second cooldown is capped without resetting HP");
    await advance(1.9); assert.equal((await read()).fireballs.length, 0);
    await advance(0.15); assert.equal((await read()).fireballs.length, 1);
    assert.ok((await read()).enemies[0].fireCooldown > 1.8);
    assert.equal(Object.hasOwn((await read()).fireballs[0], "life"), false);
    await advance(0.5);
    const radii = await page.evaluate(() => window.__fireballRadii);
    assert.ok(radii.some(([color, radius]) => color === "#ef4444" && radius === 20));
    assert.ok(radii.some(([color, radius]) => color === "#fde68a" && radius === 12));
    await page.screenshot({ path: `tmp/bomb-large-fireball-${width}.png` });
    await advance(1.5); assert.equal((await read()).fireballs.length, 2, "next shot follows the two-second cooldown");

    const longFlight = structuredClone(fixture); longFlight.enemies[0].freezeTimer = 1000;
    longFlight.fireballs = [{ gx: 2, gy: 3, vx: 3, vy: 0, life: 0.01 }];
    await load(longFlight); await advance(5.4);
    assert.equal((await read()).fireballs.length, 1, "old saved fireball flies beyond five seconds/fifteen cells");
    assert.ok((await read()).fireballs[0].gx > 18);
    const oldX = (await read()).fireballs[0].gx;
    await page.reload(); await advance(1);
    assert.equal((await read()).fireballs[0].gx, oldX, "Continue gate preserves the no-expiry shot");
    await page.locator("#overlayStartBombGame").click(); await advance(0.1);
    assert.ok((await read()).fireballs[0].gx > oldX);
    await advance(3); assert.equal((await read()).fireballs.length, 0, "board boundary still stops it");

    const brick = structuredClone(fixture); brick.player.gy = 3; brick.lastDirection = "right";
    brick.map[3][4] = 2; brick.hiddenPowerUps = [["4,3", "iceFlower"]];
    Object.assign(brick.enemies[0], { gx: 5, gy: 3, move: null, freezeTimer: 1000 });
    await load(brick); await page.keyboard.press("Space"); await advance(0.3);
    assert.equal((await read()).map[3][4], 2); assert.equal((await read()).mushroomShots.length, 0);
    assert.equal((await read()).enemies[0].hp, 40, "mushroom cannot hit through the brick");
    assert.equal((await read()).powerUps.length, 0, "brick content remains hidden");
    await page.keyboard.press("B"); await advance(2.1);
    assert.equal((await read()).map[3][4], 2, "first ice bomb damages but does not open a 3-HP brick");
    assert.equal(new Map((await read()).crateHp).get("4,3"), 2);
    for (const expectedHp of [1,0]) {
      await advance(0.7); await page.keyboard.press("KeyB"); await advance(2.05);
      assert.equal((await read()).map[3][4], expectedHp === 0 ? 0 : 2);
    }
    assert.ok((await read()).powerUps.some(item => item.type === "iceFlower"));
    const hit = structuredClone(brick); hit.map[3][4] = 0; hit.enemies[0].gx = 4;
    await load(hit); await page.keyboard.press("Space"); await advance(0.22);
    assert.equal((await read()).enemies[0].hp, 39, "mushrooms retain one damage against enemies");

    const firstBrick = structuredClone(fixture); firstBrick.enemies[0].fireCooldown = 0;
    firstBrick.map[3][3] = firstBrick.map[3][4] = 2;
    await load(firstBrick); await advance(0.25);
    assert.equal((await read()).map[3][3], 2); assert.equal((await read()).map[3][4], 2);
    assert.equal(new Map((await read()).crateHp).get("3,3"), 2);
    assert.equal((await read()).fireballs.length, 0, "fireball still stops at the first brick");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    results.push({ width, mushroomCrateDamage: false, enemyDamage: 1, fireballRadius: 20,
      coreRadius: 12, cooldown: 2, unlimitedFlight: true, restore: true, collisionsPreserved: true });
    await context.close();
  }
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", results }));
} finally { await browser.close(); }
