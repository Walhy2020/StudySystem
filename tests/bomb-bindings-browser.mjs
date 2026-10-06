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
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width === 390 });
    await context.addInitScript(() => {
      let callbacks = [], now;
      window.requestAnimationFrame = cb => { callbacks.push(cb); return callbacks.length; };
      window.__pad = { index: 0, id: "Standard PS5 fixture", mapping: "standard", connected: true,
        axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })) };
      Object.defineProperty(navigator, "getGamepads", { value: () => [window.__pad] });
      window.__advance = seconds => {
        now ??= performance.now();
        for (let i = 0; i < Math.ceil(seconds * 60); i++) {
          now += 1000 / 60; const batch = callbacks; callbacks = []; batch.forEach(cb => cb(now));
        }
      };
      const proto = CanvasRenderingContext2D.prototype;
      const begin = proto.beginPath, move = proto.moveTo, fill = proto.fill;
      window.__arrowColors = [];
      proto.beginPath = function (...args) { this.__arrow = false; return begin.apply(this, args); };
      proto.moveTo = function (x, y) { if (x === 48 && y === 0) this.__arrow = true; return move.call(this, x, y); };
      proto.fill = function (...args) { if (this.__arrow) window.__arrowColors.push(this.fillStyle); return fill.apply(this, args); };
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(response.url()); });
    const read = () => page.evaluate(() => window.__BOMB_GAME__.getState());
    const advance = (seconds = 0.04) => page.evaluate(seconds => window.__advance(seconds), seconds);
    const button = (index, pressed) => page.evaluate(({ index, pressed }) => {
      window.__pad.buttons[index] = { pressed, value: pressed ? 1 : 0 };
    }, { index, pressed });
    async function tap(index) { await button(index, true); await advance(); await button(index, false); await advance(); }
    async function capture(id) {
      const node = page.locator(id);
      if (width === 390) await node.tap(); else await node.click();
      await advance();
      assert.equal(await node.getAttribute("aria-pressed"), "true");
    }
    async function settings() {
      await page.locator("#bombSettingsToggle").click();
      await page.locator("#bombAttackToggle").click();
    }
    await page.goto(base + "bomb-game.html?bindings-check=1");
    await page.locator("#overlayStartBombGame").click(); await advance();
    const seed = await read(), rows = seed.map.length, cols = seed.map[0].length;
    seed.map = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) =>
      !x || !y || x === cols - 1 || y === rows - 1 ? 1 : 0));
    seed.player = { gx: 3, gy: 3, move: null, invulnerable: 0, trail: [{ gx: 3, gy: 3 }] };
    seed.enemies = [{ ...seed.enemies.find(e => e.type === "bowser"), gx: 20, gy: 10,
      move: null, stunTimer: 1000, freezeTimer: 1000 }];
    for (const field of ["bombs", "fireballs", "mushroomShots", "explosions", "powerUps", "shells", "particles", "hiddenPowerUps"]) seed[field] = [];
    seed.hiddenWordCrates = seed.todayNewWords.map((word, i) => {
      seed.map[10][8 + i] = 2; return [`${8 + i},10`, word.id];
    });
    await page.evaluate(({ key, seed }) => localStorage.setItem(key, JSON.stringify(seed)), { key, seed });
    await page.reload(); await advance();
    await page.locator("#overlayStartBombGame").click(); await advance();
    await settings(); const paused = await read();
    await capture("#mushroomAttackKey"); await page.keyboard.press("KeyJ");
    assert.equal((await read()).mushroomKey, "KeyJ");
    await capture("#iceBombAttackKey"); await page.keyboard.press("KeyJ");
    assert.match(await page.locator("#bombBindingStatus").innerText(), /已绑定小蘑菇/);
    assert.equal((await read()).iceBombKey, "KeyB");
    for (const input of ["KeyW", "ArrowUp", "Enter", "Control+KeyK"]) {
      await page.keyboard.press(input);
      assert.equal(await page.locator("#iceBombAttackKey").getAttribute("aria-pressed"), "true");
      assert.equal((await read()).iceBombKey, "KeyB");
    }
    await page.keyboard.press("Digit1"); assert.equal((await read()).iceBombKey, "Digit1");
    await capture("#mushroomAttackKey"); await page.keyboard.press("Escape");
    assert.equal(await page.locator("#mushroomAttackKey").getAttribute("aria-pressed"), "false");
    await capture("#mushroomAttackKey"); await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    assert.equal(await page.locator("#mushroomAttackKey").getAttribute("aria-pressed"), "false");

    // Held menu-confirm button is not captured, and independent cursor RAF is blocked.
    await button(0, true); await capture("#mushroomAttackKey"); await advance();
    assert.equal(await page.locator("#mushroomAttackKey").getAttribute("aria-pressed"), "true");
    await button(0, false); await advance();
    const url = page.url();
    for (const index of [5, 7, 3, 12]) {
      await tap(index);
      assert.equal(await page.locator("#mushroomAttackKey").getAttribute("aria-pressed"), "true");
      assert.equal(page.url(), url);
      assert.equal(await page.evaluate(() => Boolean(document.fullscreenElement)), false);
      assert.match(await page.locator("#bombBindingStatus").innerText(), /已用于/);
    }
    await button(2, true); await button(10, true); await advance();
    assert.match(await page.locator("#bombBindingStatus").innerText(), /只按一个/);
    await button(2, false); await button(10, false); await advance();
    await tap(2); assert.equal((await read()).mushroomGamepadButton, 2);
    await capture("#iceBombAttackKey"); await tap(2);
    assert.match(await page.locator("#bombBindingStatus").innerText(), /已绑定小蘑菇/);
    await tap(10); assert.equal((await read()).iceBombGamepadButton, 10);
    assert.equal((await read()).mushroomShots.length, 0);
    assert.equal((await read()).bombs.length, 0);
    assert.equal((await read()).dayClock, paused.dayClock);
    assert.equal((await read()).hp, paused.hp);
    assert.deepEqual((await read()).map, paused.map);
    await capture("#mushroomAttackKey"); await page.screenshot({ path: `tmp/bomb-bindings-capture-${width}.png` });
    await page.locator("#bombSettingsToggle").click();
    assert.equal(await page.locator("#mushroomAttackKey").getAttribute("aria-pressed"), "false");
    await page.reload(); await advance();
    const restored = await read();
    assert.deepEqual([restored.mushroomKey, restored.iceBombKey, restored.mushroomGamepadButton, restored.iceBombGamepadButton], ["KeyJ", "Digit1", 2, 10]);
    assert.deepEqual(restored.map, paused.map); assert.equal(restored.hp, paused.hp);
    await page.locator("#overlayStartBombGame").click(); await advance();
    await tap(0); await tap(1); assert.equal((await read()).mushroomShots.length, 0); assert.equal((await read()).bombs.length, 0);
    await tap(2); assert.equal((await read()).mushroomShots.length, 1);
    await tap(10); assert.equal((await read()).bombs.length, 1);
    await page.keyboard.press("KeyJ"); assert.equal((await read()).mushroomShots.length, 2);
    await page.keyboard.press("Digit1"); assert.equal((await read()).bombs.length, 1, "single bomb limit unchanged");
    await page.evaluate(() => { window.__arrowColors = []; window.__pad.axes[0] = 0; window.__pad.axes[1] = -1; });
    await advance(); assert.equal((await read()).attackDirection, "up");
    await button(15, true); await advance(0.15); assert.equal((await read()).attackDirection, "right");
    await button(15, false); await advance(0.3);
    assert.deepEqual(await page.evaluate(() => [...new Set(window.__arrowColors)]), ["#67e8f9"], "stationary and moving arrow render same cyan");
    await page.evaluate(() => { window.__pad.axes = [0, 0, 0, 0]; }); await advance();
    await page.screenshot({ path: `tmp/bomb-bindings-game-${width}.png` });
    await settings();
    if (width === 390) await page.setViewportSize({ width, height: 500 });
    await page.locator("#mushroomAttackKey").scrollIntoViewIfNeeded();
    const rect = await page.locator("#mushroomAttackKey").boundingBox();
    assert.ok(rect.x >= 0 && rect.x + rect.width <= width && rect.y >= 0 && rect.y + rect.height <= (width === 390 ? 500 : 900));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `tmp/bomb-bindings-menu-${width}.png` });
    for (const resource of ["bomb-game.css?v=1.8", "bomb-game.js?v=2.32", "src/bomb-bindings.js?v=1.0", "src/bomb-gamepad.js?v=1.4", "src/gamepad-cursor.js?v=1.5"]) {
      assert.equal((await page.request.get(base + resource)).status(), 200);
    }
    assert.deepEqual(errors, []);
    results.push({ width, keyboardCapture: true, controllerCapture: true, conflictsRejected: true,
      reservedSuppressed: true, noInputLeak: true, persisted: true, constantCyan: true, geometry: true });
    await context.close();
  }
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", simulatedStandardGamepad: true, results }));
} finally { await browser.close(); }
