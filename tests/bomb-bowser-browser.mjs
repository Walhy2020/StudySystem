import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadChromium } from "./playwright-runtime.mjs";

const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const key = "mario-bomb-game-progress-v1";
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
fs.mkdirSync(new URL("../tmp/", import.meta.url), { recursive: true });
const results = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(() => {
      let callbacks = [], now;
      window.requestAnimationFrame = callback => { callbacks.push(callback); return callbacks.length; };
      window.cancelAnimationFrame = () => {};
      Math.random = () => 0.5;
      window.__greenCooldownStrokes = 0;
      const stroke = CanvasRenderingContext2D.prototype.stroke;
      CanvasRenderingContext2D.prototype.stroke = function () {
        if (this.strokeStyle === "#22c55e") window.__greenCooldownStrokes++;
        return stroke.call(this);
      };
      window.__advance = seconds => {
        now ??= performance.now();
        for (let i = 0; i < Math.ceil(seconds * 60); i++) {
          now += 1000 / 60;
          const pending = callbacks; callbacks = [];
          pending.forEach(callback => callback(now));
        }
      };
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(response.url()); });
    const state = () => page.evaluate(() => window.__BOMB_GAME__.getState());
    const advance = seconds => page.evaluate(seconds => window.__advance(seconds), seconds);
    await page.goto(base + "bomb-game.html?bowser-check=1");
    const seed = await state();
    assert.equal(seed.enemies.find(enemy => enemy.type === "bowser").hp, 40);
    const fixture = structuredClone(seed);
    fixture.map = seed.map.map(row => row.map(() => 1));
    fixture.map[3][3] = 0;
    fixture.map[3][4] = fixture.map[3][5] = 2;
    fixture.map[3][6] = fixture.map[3][7] = fixture.map[10][12] = 0;
    fixture.status = "playing"; fixture.startLayerHidden = true;
    fixture.player = { gx: 12, gy: 10, invulnerable: 0, move: null };
    fixture.enemies = [{ ...seed.enemies.find(enemy => enemy.type === "bowser"),
      gx: 3, gy: 3, dir: "right", hp: 40, stunTimer: 0, freezeTimer: 0, fireCooldown: 3,
      move: { fromX: 3, fromY: 3, toX: 3, toY: 3, time: 0, duration: 1000 } }];
    for (const field of ["fireballs", "bombs", "mushroomShots", "explosions", "powerUps", "particles", "shells", "hiddenPowerUps"]) fixture[field] = [];
    fixture.hiddenWordCrates = fixture.todayNewWords.map((word, index) => {
      const x = index === 0 ? 4 : 8 + index, y = index === 0 ? 3 : 8;
      fixture.map[y][x] = 2;
      return [`${x},${y}`, word.id];
    });
    async function load(saved, start = true) {
      await page.goto(base + "bomb-game.css?bowser-fixture=1");
      await page.evaluate(({ key, saved }) => localStorage.setItem(key, JSON.stringify(saved)), { key, saved });
      await page.goto(base + "bomb-game.html?bowser-check=1");
      assert.equal(await page.evaluate(() => window.__BOMB_GAME__.isAwaitingContinue()), true);
      if (start) await page.locator("#overlayStartBombGame").click();
    }
    await load(fixture);
    await advance(2.9); assert.equal((await state()).fireballs.length, 0);
    await advance(0.15); assert.equal((await state()).fireballs.length, 1);
    assert.ok((await state()).enemies[0].fireCooldown > 2.8);
    assert.ok(await page.evaluate(() => window.__greenCooldownStrokes > 0), "cooldown ring is rendered green");
    await advance(0.2);
    assert.equal((await state()).map[3][4], 0);
    assert.equal((await state()).map[3][5], 2, "fire stops at the first brick");
    assert.ok((await state()).powerUps.some(item => item.gx === 4 && item.gy === 3), "brick contents are revealed");
    await advance(3.5); assert.equal((await state()).map[3][5], 0, "next cooldown fires again without sight");
    await page.screenshot({ path: path.resolve("tmp", `bomb-bowser-autofire-${width}.png`) });

    const roaming = structuredClone(fixture); roaming.enemies[0].move = null;
    await load(roaming); await advance(3.55);
    assert.ok((await state()).enemies[0].gx > 3, "Bowser walks into the path opened by his fireball");
    const frozen = structuredClone(fixture); frozen.enemies[0].freezeTimer = 4;
    await load(frozen); await advance(3);
    assert.equal((await state()).map[3][4], 2);
    assert.equal((await state()).fireballs.length, 0);
    const wall = structuredClone(fixture); wall.map[3][4] = 1;
    await load(wall); await advance(3.3);
    assert.equal((await state()).map[3][4], 1, "hard walls cannot be broken");
    assert.ok((await state()).enemies[0].fireCooldown > 2.6, "blocked sight does not stop the cooldown firing");

    const old = structuredClone(fixture); delete old.bowserRulesVersion;
    old.enemies[0].hp = 12; old.bombLimit = 4; old.flameRange = 8;
    await load(old, false);
    assert.deepEqual([(await state()).enemies[0].hp, (await state()).bombLimit, (await state()).flameRange], [37, 4, 8]);
    await advance(4); assert.equal((await state()).fireballs.length, 0, "Continue still pauses gameplay");
    await page.reload(); assert.equal((await state()).enemies[0].hp, 37, "migration does not heal on each refresh");
    old.bowserRulesVersion = 1; old.enemies[0].hp = 48;
    await load(old, false); assert.equal((await state()).enemies[0].hp, 38, "previous 50-HP save retains two damage");
    await page.reload(); assert.equal((await state()).enemies[0].hp, 38);
    old.enemies[0].alive = false; old.enemies[0].hp = 0;
    await load(old, false); assert.equal((await state()).enemies[0].alive, false);
    assert.equal((await state()).enemies[0].hp, 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    const hit = structuredClone(fixture);
    hit.map = seed.map.map((row, y) => row.map((_, x) => !x || !y || x === row.length - 1 || y === seed.map.length - 1 ? 1 : 0));
    hit.player.gx = 2; hit.player.gy = 3; hit.lastDirection = "right";
    hit.enemies[0].gx = 4;
    hit.enemies[0].move = { fromX: 4, fromY: 3, toX: 5, toY: 3, time: 0, duration: 1000 };
    hit.hiddenWordCrates = fixture.hiddenWordCrates.map(([position, id]) => {
      const [x, y] = position.split(",").map(Number);
      if (y !== 3) hit.map[y][x] = 2;
      return [position, id];
    });
    await load(hit); await page.locator("#bombCanvas").focus(); await page.keyboard.press("Space");
    await advance(0.22);
    assert.equal((await state()).enemies[0].hp, 39);
    assert.equal((await state()).enemies[0].stunTimer, 0);
    assert.equal((await state()).enemies[0].move.toX, 5, "mushroom does not stop a moving Bowser");
    results.push({ width, bowserHp: 40, cooldown: 3, greenRing: true, mushroomStun: false,
      autonomous: true, crateBreak: true, roaming: true, frozenPause: true, migration: true });
    await context.close();
  }
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", results }));
} finally { await browser.close(); }
