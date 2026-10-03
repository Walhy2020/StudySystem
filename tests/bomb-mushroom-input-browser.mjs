import assert from "node:assert/strict";
import { loadChromium } from "./playwright-runtime.mjs";

const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const key = "mario-bomb-game-progress-v1";
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const results = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(() => {
      let callbacks = [], now;
      window.requestAnimationFrame = callback => { callbacks.push(callback); return callbacks.length; };
      window.__advance = seconds => {
        now ??= performance.now();
        for (let i = 0; i < Math.ceil(seconds * 60); i++) {
          now += 1000 / 60;
          const batch = callbacks; callbacks = [];
          batch.forEach(callback => callback(now));
        }
      };
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(response.url()); });
    const read = () => page.evaluate(() => window.__BOMB_GAME__.getState());
    const advance = seconds => page.evaluate(seconds => window.__advance(seconds), seconds);
    await page.goto(base + "bomb-game.html?mushroom-input=1");
    await page.locator("#restartBombGame").click();
    const fixture = await read();
    const rows = fixture.map.length, cols = fixture.map[0].length;
    fixture.map = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) =>
      !x || !y || x === cols - 1 || y === rows - 1 ? 1 : 0));
    fixture.status = "playing"; fixture.startLayerHidden = true;
    fixture.player = { gx: 2, gy: 3, move: null, invulnerable: 1000, trail: [{ gx: 2, gy: 3 }] };
    fixture.enemies = [{ ...fixture.enemies.find(enemy => enemy.type === "bowser"),
      gx: 20, gy: 10, hp: 40, move: null, stunTimer: 1000, hitCooldown: 0 }];
    for (const field of ["bombs", "mushroomShots", "fireballs", "explosions", "shells", "powerUps", "hiddenPowerUps"]) fixture[field] = [];
    fixture.hiddenWordCrates = fixture.todayNewWords.map((word, i) => {
      fixture.map[10][8 + i] = 2; return [`${8 + i},10`, word.id];
    });
    fixture.lastDirection = "right"; fixture.throwDistance = 8;
    async function load(saved) {
      await page.goto(base + "bomb-game.css?fixture=1");
      await page.evaluate(({ key, saved }) => localStorage.setItem(key, JSON.stringify(saved)), { key, saved });
      await page.goto(base + "bomb-game.html?mushroom-input=1");
      assert.equal(await page.evaluate(() => window.__BOMB_GAME__.isAwaitingContinue()), true);
      await page.locator("#overlayStartBombGame").click();
      await page.locator("#bombCanvas").focus();
    }
    for (const avatar of ["fly-star", "super-mushroom", "bomber"]) {
      const saved = structuredClone(fixture); saved.playerAvatar = avatar;
      await load(saved);
      assert.equal((await read()).playerAvatar, avatar);
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press("Space");
        await advance(0.05);
      }
      assert.equal((await read()).mushroomShots.length, 5, "every fresh press must throw even with three mushrooms in flight");
      await page.keyboard.press("B");
      assert.equal((await read()).bombs.length, 1, "ice bombs remain independently usable");
      await page.reload();
      const resumed = await read();
      assert.equal(resumed.mushroomShots.length, 5);
      await advance(1);
      assert.equal((await read()).mushroomShots.length, 5, "Continue gate pauses projectiles");
      await page.locator("#overlayStartBombGame").click();
      await page.locator("#bombCanvas").focus();
      await advance(0.9);
      assert.equal((await read()).mushroomShots.length, 0, "all shots expire at the configured range");
      await page.keyboard.press("Space");
      assert.equal((await read()).mushroomShots.length, 1, "throwing still works after resume and cleanup");
    }
    const remapped = structuredClone(fixture);
    remapped.mushroomKey = "KeyJ"; remapped.iceBombKey = "Space";
    await load(remapped);
    for (let i = 0; i < 5; i++) await page.keyboard.press("J");
    assert.equal((await read()).mushroomShots.length, 5);
    await page.keyboard.press("Space"); assert.equal((await read()).bombs.length, 1);
    await page.locator("#bombAttackToggle").focus();
    await page.keyboard.press("J");
    assert.equal((await read()).mushroomShots.length, 5, "native controls keep their keyboard guard");
    const stale = structuredClone(fixture);
    stale.mushroomShots = Array.from({ length: 3 }, () => ({ gx: 2, gy: 3,
      direction: "right", progress: -1000, steps: 0, range: 3 }));
    await load(stale);
    assert.equal((await read()).mushroomShots.length, 0, "invalid saved shots cannot persist across refresh");
    await page.keyboard.press("Space");
    assert.equal((await read()).mushroomShots.length, 1);
    await advance(0.9);
    assert.equal((await read()).mushroomShots.length, 0);
    const hit = structuredClone(fixture);
    hit.throwDistance = 3; hit.enemies[0].gx = 4; hit.enemies[0].gy = 3;
    await load(hit);
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press("Space"); await advance(0.22);
    }
    assert.equal((await read()).enemies[0].hp, 37, "each thrown mushroom still deals one damage");
    const brick = structuredClone(fixture); brick.map[3][3] = 2;
    await load(brick); await page.keyboard.press("Space"); await advance(0.15);
    assert.equal((await read()).map[3][3], 2, "a mushroom stops at the first brick without opening it");
    assert.equal((await read()).mushroomShots.length, 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    results.push({ width, rapidThrows: 5, avatars: 3, resume: true, projectileCleanup: true, remappedKeys: true });
    await context.close();
  }
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", results }));
} finally { await browser.close(); }
