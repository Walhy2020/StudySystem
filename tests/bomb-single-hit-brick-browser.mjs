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
          now += 1000 / 60; const batch = callbacks; callbacks = []; batch.forEach(cb => cb(now));
        }
      };
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(response.url()); });
    const read = () => page.evaluate(() => window.__BOMB_GAME__.getState());
    const advance = seconds => page.evaluate(seconds => window.__advance(seconds), seconds);
    await page.goto(base + "bomb-game.html?single-hit=1");
    const seed = await read();
    for (const kind of ["ice", "normal", "missile", "fireball"]) {
      const fixture = structuredClone(seed);
      fixture.map = seed.map.map(row => row.map(() => 1));
      fixture.map[3][2] = 0; fixture.map[3][3] = fixture.map[3][4] = 2;
      fixture.map[10][12] = 0;
      fixture.status = "playing"; fixture.startLayerHidden = true;
      fixture.player = { gx: 12, gy: 10, move: null, invulnerable: 1000 };
      fixture.enemies = [{ ...seed.enemies[0], gx: 12, gy: 10, alive: true,
        freezeTimer: 1000, stunTimer: 1000, move: null }];
      for (const field of ["bombs", "fireballs", "mushroomShots", "explosions", "particles", "powerUps", "shells"]) fixture[field] = [];
      fixture.crateHp = []; fixture.hiddenPowerUps = [["3,3", "bulletBill"]];
      fixture.hiddenWordCrates = fixture.todayNewWords.map((word, i) => {
        fixture.map[11][8+i] = 2; return [`${8+i},11`, word.id];
      });
      if (kind === "fireball") fixture.fireballs = [{ gx: 2, gy: 3, vx: 3, vy: 0 }];
      else fixture.bombs = [{ gx: 2, gy: 3, range: 6, time: 1.99,
        isIce: kind === "ice", fromBulletBill: kind === "missile", exploded: false }];
      await page.goto(base + "bomb-game.css?single-hit-fixture=1");
      await page.evaluate(({ key, fixture }) => localStorage.setItem(key, JSON.stringify(fixture)), { key, fixture });
      await page.goto(base + "bomb-game.html?single-hit=1");
      assert.equal(await page.evaluate(() => window.__BOMB_GAME__.isAwaitingContinue()), true);
      await page.locator("#overlayStartBombGame").click();
      await advance(0.25);
      const snapshot = await read();
      assert.equal(snapshot.map[3][3], 0, `${kind}: full-health brick breaks on one hit`);
      assert.equal(snapshot.map[3][4], 2, `${kind}: first brick still blocks penetration`);
      assert.equal(new Map(snapshot.crateHp).has("3,3"), false);
      assert.equal(snapshot.score, seed.score + 5);
      assert.equal(snapshot.enemies.filter(enemy => enemy.type === "bullet-bill").length, 1);
      if (kind === "fireball") assert.equal(snapshot.fireballs.length, 0);
      else assert.equal(snapshot.explosions[0].cells.some(cell => cell.gx > 3), false);
      await page.reload(); await advance(0.25);
      assert.equal((await read()).map[3][3], 0, "destroyed brick stays destroyed after refresh");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    assert.deepEqual(errors, []);
    results.push({ width, oneHit: true, firstBrickBlocking: true, singleMissileRelease: true, savedDestruction: true });
    await context.close();
  }
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", results }));
} finally { await browser.close(); }
