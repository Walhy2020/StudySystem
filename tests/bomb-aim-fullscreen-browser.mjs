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
      window.__pad = { index: 0, id: "Standard PS5 fixture", mapping: "standard", connected: true,
        axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })) };
      Object.defineProperty(navigator, "getGamepads", { value: () => [window.__pad] });
      window.__advance = seconds => {
        now ??= performance.now();
        for (let i = 0; i < Math.ceil(seconds * 60); i++) {
          now += 1000 / 60; const batch = callbacks; callbacks = []; batch.forEach(callback => callback(now));
        }
      };
      const originalMove = CanvasRenderingContext2D.prototype.moveTo;
      window.__largeAimArrows = 0;
      CanvasRenderingContext2D.prototype.moveTo = function (x, y) {
        if (x === 48 && y === 0) window.__largeAimArrows++;
        return originalMove.call(this, x, y);
      };
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(response.url()); });
    const read = () => page.evaluate(() => window.__BOMB_GAME__.getState());
    const advance = seconds => page.evaluate(seconds => window.__advance(seconds), seconds);
    const button = (index, pressed) => page.evaluate(({ index, pressed }) => {
      window.__pad.buttons[index] = { pressed, value: pressed ? 1 : 0 };
    }, { index, pressed });
    const axes = (x, y) => page.evaluate(({ x, y }) => { window.__pad.axes[0] = x; window.__pad.axes[1] = y; }, { x, y });
    async function tap(index) { await button(index, true); await advance(0.02); await button(index, false); await advance(0.02); }
    async function load(saved) {
      await page.goto(base + "bomb-game.css?aim-fixture=1");
      await page.evaluate(({ key, saved }) => localStorage.setItem(key, JSON.stringify(saved)), { key, saved });
      await page.goto(base + "bomb-game.html?aim-fullscreen=1"); await advance(0.02);
      await page.locator("#overlayStartBombGame").click(); await advance(0.02);
    }
    await page.goto(base + "bomb-game.html?aim-fullscreen=1");
    await page.locator("#overlayStartBombGame").click(); await advance(0.02);
    const fixture = await read(), rows = fixture.map.length, cols = fixture.map[0].length;
    fixture.map = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) =>
      !x || !y || x === cols - 1 || y === rows - 1 ? 1 : 0));
    fixture.player = { gx: 3, gy: 3, move: null, invulnerable: 0, trail: [{ gx: 3, gy: 3 }] };
    fixture.enemies = [{ ...fixture.enemies.find(enemy => enemy.type === "bowser"), gx: 20, gy: 10,
      move: null, stunTimer: 1000, freezeTimer: 1000 }];
    for (const field of ["bombs", "fireballs", "mushroomShots", "explosions", "powerUps", "shells", "particles", "hiddenPowerUps"]) fixture[field] = [];
    fixture.hiddenWordCrates = fixture.todayNewWords.map((word, i) => {
      fixture.map[10][8 + i] = 2; return [`${8 + i},10`, word.id];
    });
    await load(fixture);
    await axes(0, -1); await advance(0.02); assert.equal((await read()).attackDirection, "up");
    await button(15, true); await advance(0.1);
    assert.equal((await read()).attackDirection, "up", "free aim remains independent while walking");
    await button(10, true); await advance(0.1);
    assert.equal((await read()).attackFollowsMovement, true);
    assert.equal((await read()).attackDirection, "right", "L3 aligns to actual current walk");
    await advance(0.1); assert.equal((await read()).attackFollowsMovement, true, "held L3 toggles once");
    await button(10, false); await button(15, false); await axes(-1, 0); await advance(0.2);
    await button(13, true); await advance(0.25);
    assert.equal((await read()).attackDirection, "down", "walking turns override stick aim only when locked");
    await tap(0); assert.equal((await read()).mushroomShots.at(-1).direction, "down");
    await button(13, false); await axes(0, 0); await advance(0.2);
    const locked = await read();
    assert.ok(await page.evaluate(() => window.__largeAimArrows > 0), "enlarged arrow is actually rendered");
    await page.screenshot({ path: `tmp/bomb-aim-locked-${width}.png` });
    await load(locked);
    assert.equal((await read()).attackFollowsMovement, true, "lock persists on reload/Continue");
    await tap(10); assert.equal((await read()).attackFollowsMovement, false);
    await axes(0, -1); await advance(0.02); assert.equal((await read()).attackDirection, "up");
    await axes(0, 0); await button(15, true); await advance(0.2);
    assert.equal((await read()).attackDirection, "up", "unlock returns to independent aim");
    await button(15, false); await advance(0.2);
    await page.locator("#bombSettingsToggle").click();
    await button(10, true); await advance(0.1);
    assert.equal((await read()).attackFollowsMovement, false, "menus ignore L3 gameplay input");
    await button(10, false); await advance(0.02);

    // Real browser fullscreen with a trusted button click, not a mocked fullscreenElement.
    await page.locator("#bombFullscreenToggle").click();
    await page.waitForFunction(() => document.fullscreenElement?.classList.contains("bomb-game-app"));
    await page.evaluate(() => { window.__pad.axes[2] = 1; }); await advance(0.15);
    await page.evaluate(() => { window.__pad.axes[2] = 0; }); await advance(0.02);
    const pointer = page.locator("#study-gamepad-cursor");
    assert.equal(await pointer.isVisible(), true);
    assert.equal(await pointer.evaluate(node => document.fullscreenElement.contains(node)), true);
    assert.equal(await page.locator("#study-gamepad-help").evaluate(node => document.fullscreenElement.contains(node)), true);
    await page.locator("#bombAttackToggle").click();
    // Move the virtual pointer to a real select and open its controller option popup.
    const rect = await page.locator("#mushroomAttackKey").boundingBox();
    const target = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    for (let i = 0; i < 240; i++) {
      const done = await page.evaluate(target => {
        const pointer = document.getElementById("study-gamepad-cursor").getBoundingClientRect();
        const dx = target.x - pointer.x - pointer.width / 2, dy = target.y - pointer.y - pointer.height / 2;
        window.__pad.axes[2] = Math.abs(dx) < 5 ? 0 : Math.sign(dx) * (Math.abs(dx) < 15 ? 0.4 : 1);
        window.__pad.axes[3] = Math.abs(dy) < 5 ? 0 : Math.sign(dy) * (Math.abs(dy) < 15 ? 0.4 : 1);
        return Math.abs(dx) < 5 && Math.abs(dy) < 5;
      }, target);
      await advance(0.02); if (done) break;
    }
    await page.evaluate(() => { window.__pad.axes[2] = 0; window.__pad.axes[3] = 0; }); await advance(0.02);
    await tap(0);
    const popup = page.locator(".study-gamepad-options");
    assert.equal(await popup.isVisible(), true);
    assert.equal(await popup.evaluate(node => document.fullscreenElement.contains(node)), true);
    await page.screenshot({ path: `tmp/bomb-cursor-fullscreen-${width}.png` });
    await page.evaluate(() => document.exitFullscreen());
    await page.waitForFunction(() => !document.fullscreenElement);
    assert.equal(await pointer.evaluate(node => node.parentElement === document.body), true);
    assert.equal(await page.locator("#study-gamepad-help").evaluate(node => node.parentElement === document.body), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    results.push({ width, mockGamepad: true, l3TogglePersistence: true, enlargedArrow: true,
      actualFullscreen: true, cursorAndSelectPopupVisible: true });
    await context.close();
  }
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", physicalControllerTested: false, results }));
} finally { await browser.close(); }
