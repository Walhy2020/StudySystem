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
      window.requestAnimationFrame = cb => { callbacks.push(cb); return callbacks.length; };
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
    await page.goto(base + "bomb-game.html?mushroom-brick=1");
    const seed = await read();
    for (const item of ["iceFlower", "bulletBill"]) {
      const fixture = structuredClone(seed);
      fixture.map = seed.map.map(row => row.map(() => 1));
      fixture.map[3][2] = fixture.map[3][5] = 0;
      fixture.map[3][3] = fixture.map[3][4] = 2;
      fixture.player = { gx: 2, gy: 3, move: null, invulnerable: 1000 };
      fixture.lastDirection = fixture.attackDirection = "right";
      fixture.status = "playing"; fixture.startLayerHidden = true;
      fixture.enemies = [{ ...seed.enemies.find(enemy => enemy.type === "bowser"),
        gx: 5, gy: 3, hp: 40, alive: true, freezeTimer: 1000, stunTimer: 1000, move: null }];
      for (const field of ["bombs","fireballs","mushroomShots","explosions","particles","powerUps","shells"]) fixture[field] = [];
      fixture.crateHp = []; fixture.hiddenPowerUps = [["3,3", item]];
      fixture.hiddenWordCrates = fixture.todayNewWords.map((word, i) => {
        fixture.map[11][8+i] = 2; return [`${8+i},11`, word.id];
      });
      await page.goto(base + "bomb-game.css?mushroom-brick-fixture=1");
      await page.evaluate(({ key, fixture }) => localStorage.setItem(key, JSON.stringify(fixture)), { key, fixture });
      await page.goto(base + "bomb-game.html?mushroom-brick=1");
      await page.locator("#overlayStartBombGame").click(); await page.locator("#bombCanvas").focus();
      for (const hp of [2,1,0]) {
        await page.keyboard.press("Space"); await advance(0.35);
        const snapshot = await read();
        assert.equal(snapshot.map[3][3], hp ? 2 : 0);
        assert.equal(new Map(snapshot.crateHp).get("3,3"), hp || undefined);
        assert.equal(snapshot.map[3][4], 2, "no damage through the first brick");
        assert.equal(snapshot.enemies[0].hp, 40);
        assert.equal(snapshot.mushroomShots.length, 0);
        assert.equal(snapshot.score, seed.score + (hp ? 0 : 5));
        assert.equal(snapshot.powerUps.filter(powerUp => powerUp.type === "iceFlower").length,
          item === "iceFlower" && hp === 0 ? 1 : 0);
        assert.equal(snapshot.enemies.filter(enemy => enemy.type === "bullet-bill").length,
          item === "bulletBill" && hp === 0 ? 1 : 0);
        if (hp === 2) {
          await page.reload(); await advance(0.35);
          assert.equal(new Map((await read()).crateHp).get("3,3"), 2);
          assert.equal(await page.evaluate(() => window.__BOMB_GAME__.isAwaitingContinue()), true);
          await page.locator("#overlayStartBombGame").click(); await page.locator("#bombCanvas").focus();
        }
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    assert.deepEqual(errors, []);
    results.push({ width, threeMushroomHits: true, noPenetration: true, partialHpResume: true, singleReward: true });
    await context.close();
  }
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", results }));
} finally { await browser.close(); }
