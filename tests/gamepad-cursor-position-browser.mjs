import assert from "node:assert/strict";
import fs from "node:fs";
import { loadChromium } from "./playwright-runtime.mjs";
const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
fs.mkdirSync("tmp", { recursive: true });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.route("**/api/controller-mouse", route => route.fulfill({ json: { supported: false, mode: "web" } }));
    await context.addInitScript(() => {
      window.requestAnimationFrame = () => 0;
      window.__time = 0;
      window.__pad = parent !== window ? parent.__pad : { index: 0, id: "Position fixture", mapping: "standard", connected: true,
        axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })) };
      Object.defineProperty(navigator, "getGamepads", { value: () => [window.__pad] });
      window.__step = () => window.STUDY_GAMEPAD_CURSOR.poll(window.__time += 1000 / 60);
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const point = () => page.locator("#study-gamepad-cursor").evaluate(node => ({ x: +parseFloat(node.style.left), y: +parseFloat(node.style.top) }));
    async function ready() {
      await page.waitForFunction(() => Boolean(window.STUDY_GAMEPAD_CURSOR), null, { polling: 50 });
      await page.evaluate(() => { window.__step(); window.__step(); });
    }
    async function same(expected) {
      const actual = await point();
      assert.ok(Math.hypot(actual.x - expected.x, actual.y - expected.y) < .1, JSON.stringify({ actual, expected }));
    }
    async function move(x, y) {
      await page.evaluate(({ x, y }) => {
        for (let i = 0; i < 300; i++) {
          const cursor = document.getElementById("study-gamepad-cursor");
          const dx = x - parseFloat(cursor.style.left), dy = y - parseFloat(cursor.style.top);
          if (Math.hypot(dx, dy) < .1) break;
          const axis = d => Math.abs(d) < .04 ? 0 : Math.sign(d) * (.25 + .75 * Math.min(1, Math.abs(d) / (650 / 60)));
          window.__pad.axes = [0, 0, axis(dx), axis(dy)]; window.__step();
        }
        window.__pad.axes = [0, 0, 0, 0]; window.__step();
      }, { x, y });
      await same({ x, y });
    }
    async function content(name) {
      await page.waitForURL(url => url.pathname.endsWith(name + ".html"));
      await page.waitForFunction(() => !window.STUDY_FULLSCREEN_SHELL.isNavigating(), null, { polling: 50 });
      const frame = await (await page.locator("#study-module-frame").elementHandle()).contentFrame();
      await frame.waitForURL(url => url.pathname.endsWith(name + ".html"));
      return frame;
    }
    await page.goto(base + "bomb-game.html"); await ready();
    await page.locator("#overlayStartBombGame").click(); await ready();
    await move(71, 233);
    await page.evaluate(() => {
      window.__pointer = document.getElementById("study-gamepad-cursor");
      window.__gameBefore = window.__BOMB_GAME__.getState();
    });
    // The real game requests fullscreen on its nested .bomb-game-app, not <html>.
    await page.locator("#bombSettingsToggle").click(); await page.locator("#bombFullscreenToggle").click();
    await page.waitForFunction(() => document.fullscreenElement?.classList.contains("bomb-game-app"), null, { polling: 50 });
    await page.locator('a[href="./index.html"]').click(); let frame = await content("index"); await same({ x: 71, y: 233 });
    await move(137, 288);
    await frame.evaluate(() => { window.__contentToken = "preserved"; });
    await page.evaluate(() => window.STUDY_FULLSCREEN_SHELL.toggleFullscreen());
    await page.waitForFunction(() => !document.fullscreenElement, null, { polling: 50 });
    assert.equal(await frame.evaluate(() => window.__contentToken), "preserved", "fullscreen exit never reparents/reloads content");
    assert.equal(await page.locator("#study-gamepad-cursor").isVisible(), true);
    assert.equal(await page.evaluate(() => window.__pointer === document.getElementById("study-gamepad-cursor")), true);
    await same({ x: 137, y: 288 });
    assert.equal(await page.evaluate(() => window.__BOMB_GAME__.getState().dayClock === window.__gameBefore.dayClock), true);
    await page.screenshot({ path: "tmp/persistent-cursor-bomb-owner-" + width + ".png" });
    // Root refresh loads the visible module, and only session x/y survive.
    await page.reload(); await ready(); await same({ x: 137, y: 288 });
    assert.equal(await page.locator("#study-module-frame").count(), 0);
    const stored = await page.evaluate(root => JSON.parse(sessionStorage.getItem("mario-gamepad-cursor-position-v1:" + root)), new URL(base).pathname);
    assert.deepEqual(Object.keys(stored).sort(), ["x", "y"]);
    assert.ok(Math.hypot(stored.x - 137, stored.y - 288) < .1);
    await move(width - 20, 875);
    await page.setViewportSize({ width: 390, height: 500 });
    await same({ x: Math.min(width - 20, 378), y: 488 });
    const second = await context.newPage(); await second.goto(base + "pinyin.html");
    assert.deepEqual(await second.locator("#study-gamepad-cursor").evaluate(node =>
      ({ x: parseFloat(node.style.left), y: parseFloat(node.style.top) })), { x: width / 2, y: 450 });
    await second.close();
    for (const asset of ["src/fullscreen-shell.js?v=1.4", "fullscreen-shell.css?v=1.2", "src/gamepad-cursor.js?v=1.18", "src/controller-mouse.js?v=1.3"])
      assert.equal((await page.request.get(base + asset)).status(), 200);
    assert.deepEqual(errors, []);
    console.log("PASS Edge " + width + ": nested game fullscreen owner/exit, constant DOM identity, root refresh, x/y only, clamp, tab isolation, asset200");
    await context.close();
  }
} finally { await browser.close(); }
