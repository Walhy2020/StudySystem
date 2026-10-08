import assert from "node:assert/strict";
import fs from "node:fs";
import { loadChromium } from "./playwright-runtime.mjs";
const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const key = "mario-bomb-game-progress-v1";
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
fs.mkdirSync("tmp", { recursive: true });
const results = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(() => {
      let callbacks = [], now;
      window.requestAnimationFrame = callback => { callbacks.push(callback); return callbacks.length; };
      window.__pad = { index: 0, id: "Quiet HUD fixture", mapping: "standard", connected: true, axes: [0,0,0,0],
        buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })) };
      Object.defineProperty(navigator, "getGamepads", { value: () => [window.__pad] });
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
    const advance = seconds => page.evaluate(seconds => window.__advance(seconds), seconds);
    const read = () => page.evaluate(() => window.__BOMB_GAME__.getState());
    const hp = (snapshot, x, y) => snapshot.map[y][x] === 2 ? new Map(snapshot.crateHp).get(`${x},${y}`) ?? 3 : 0;
    await page.goto(base + "bomb-game.html?brick-hp=1"); await page.locator("#restartBombGame").click();
    const seed = await read(), rows = seed.map.length, cols = seed.map[0].length;
    const fixture = structuredClone(seed);
    fixture.map = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) =>
      x === 0 || y === 0 || x === cols - 1 || y === rows - 1 ? 1 : 0));
    fixture.status = "playing"; fixture.startLayerHidden = true;
    fixture.player = { gx: 2, gy: 3, move: null, invulnerable: 1000 };
    fixture.enemies = [{ ...seed.enemies[0], gx: cols - 3, gy: rows - 3, alive: true,
      freezeTimer: 1000, stunTimer: 1000, move: null }];
    for (const field of ["bombs","mushroomShots","fireballs","explosions","particles","powerUps","shells"]) fixture[field] = [];
    fixture.hiddenPowerUps = [["3,3","iceFlower"], ["5,3","bulletBill"]];
    fixture.map[3][3] = fixture.map[3][5] = 2;
    fixture.moonWordIds = [];
    fixture.hiddenWordCrates = fixture.todayNewWords.map((word, i) => {
      fixture.map[11][8+i] = 2; return [`${8+i},11`, word.id];
    });
    delete fixture.crateHp; // Legacy maps gain default HP without resetting their layout.
    fixture.messageText = "旧提示：+100"; fixture.messageTimer = 10;
    async function load(snapshot) {
      await page.goto(base + "bomb-game.css?brick-fixture=1");
      await page.evaluate(({ key, snapshot }) => localStorage.setItem(key, JSON.stringify(snapshot)), { key, snapshot });
      await page.goto(base + "bomb-game.html?brick-hp=1");
      assert.equal(await page.evaluate(() => window.__BOMB_GAME__.isAwaitingContinue()), true);
      assert.equal(await page.locator("#bombMessage").isVisible(), false);
      assert.equal((await read()).messageText, "");
      await page.locator("#overlayStartBombGame").click(); await page.locator("#bombCanvas").focus();
    }
    fixture.bombs = [{ gx: 2, gy: 3, range: 2, time: 1.99, isIce: true, exploded: false, ownerInside: true }];
    await load(fixture); assert.equal(hp(await read(),3,3), 3); await advance(0.05);
    assert.equal(hp(await read(),3,3), 0); assert.equal((await read()).powerUps.filter(item => item.type === "iceFlower").length, 1);
    await page.reload(); await advance(1);
    assert.equal(hp(await read(),3,3), 0); assert.equal(await page.evaluate(() => window.__BOMB_GAME__.isAwaitingContinue()), true);
    await page.locator("#overlayStartBombGame").click(); await page.locator("#bombCanvas").focus();
    await advance(0.7);
    await advance(0.7); await page.keyboard.down("ArrowRight"); await advance(0.2); await page.keyboard.up("ArrowRight");
    assert.equal((await read()).flameRange, 3, "pickup still works without a toast");
    assert.equal(await page.locator("#bombMessage").textContent(), "");
    assert.equal(await page.locator("#bombMessage").isVisible(), false);
    const black = await read(); black.player = { gx: 4, gy: 3, move: null, invulnerable: 1000 };
    black.bombs = [{ gx: 4, gy: 3, range: 2, time: 1.99, isIce: true, exploded: false, ownerInside: true }];
    black.explosions = [];
    await load(black); await advance(0.05);
    assert.equal(hp(await read(),5,3), 0);
    assert.equal((await read()).enemies.filter(enemy => enemy.type === "bullet-bill").length, 1);
    // HUD restores the number, not five individual moon slots; menus keep working.
    const moons = await read(); moons.moonWordIds = moons.todayNewWords.slice(0,3).map(word => word.id);
    await load(moons);
    assert.equal(await page.locator("#bombMoonCount").textContent(), "3");
    assert.equal(await page.locator("#bombMoons .moon-hud-icon").count(), 1);
    const rect = await page.locator("#bombMoons").boundingBox();
    assert.ok(Math.abs(rect.x + rect.width / 2 - width / 2) < 1);
    await advance(0.1); await page.evaluate(() => { window.__pad.axes[2] = 1; }); await advance(0.1);
    assert.equal(await page.locator("#study-gamepad-cursor").isVisible(), true);
    assert.equal(await page.locator("#study-gamepad-help").isVisible(), false);
    await page.evaluate(() => { window.__pad.axes[2] = 0; });
    await page.locator("#bombSettingsToggle").click(); await page.locator("#bombFullscreenToggle").click();
    await page.waitForFunction(() => Boolean(document.fullscreenElement));
    assert.equal(await page.locator("#bombMessage").isVisible(), false);
    assert.equal(await page.locator("#study-gamepad-help").isVisible(), false);
    assert.equal(await page.locator(".study-gamepad-fullscreen").count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.locator("#bombSettingsToggle").click();
    await page.screenshot({ path: `tmp/bomb-quiet-hud-${width}.png` });
    for (const resource of ["bomb-game.css?v=1.9","bomb-game.js?v=2.39","src/gamepad-cursor.js?v=1.10"]) {
      assert.equal((await page.request.get(base + resource)).status(), 200);
    }
    assert.deepEqual(errors, []);
    results.push({ width, ordinaryAndMissileBricks: true, singleHit: true, savedDestruction: true,
      singleLoot: true, moonCount: true, quietPickupAndFullscreen: true });
    await context.close();
  }
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", simulatedStandardGamepad: true, results }));
} finally { await browser.close(); }
