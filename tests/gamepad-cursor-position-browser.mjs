import assert from "node:assert/strict";
import fs from "node:fs";
import { loadChromium } from "./playwright-runtime.mjs";
const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const positionKey = `mario-gamepad-cursor-position-v1:${new URL(base).pathname}`;
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
      window.__pad = { index: 0, id: "Cursor position fixture", mapping: "standard", connected: true,
        axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })) };
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
    const advance = surface => surface.evaluate(() => window.__advance(0.05));
    const point = surface => surface.evaluate(() => {
      const node = document.getElementById("study-gamepad-cursor");
      return { x: parseFloat(node.style.left), y: parseFloat(node.style.top) };
    });
    async function ready(surface) {
      await surface.waitForFunction(() => Boolean(window.STUDY_GAMEPAD_CURSOR)); await advance(surface);
    }
    async function samePoint(surface, expected) {
      const actual = await point(surface);
      assert.ok(Math.abs(actual.x - expected.x) < 0.01 && Math.abs(actual.y - expected.y) < 0.01,
        `cursor moved unexpectedly: ${JSON.stringify({ expected, actual })}`);
      assert.equal(await surface.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    async function move(surface, target) {
      await surface.evaluate(({ x, y }) => {
        for (let i = 0; i < 250; i++) {
          const node = document.getElementById("study-gamepad-cursor");
          const dx = x - parseFloat(node.style.left), dy = y - parseFloat(node.style.top);
          if (Math.hypot(dx, dy) < 1) break;
          const axis = delta => Math.abs(delta) < 0.4 ? 0 : Math.sign(delta) * (0.25 + 0.75 * Math.min(1, Math.abs(delta) / (650 / 60)));
          window.__pad.axes[2] = axis(dx); window.__pad.axes[3] = axis(dy); window.__advance(1 / 60);
        }
        window.__pad.axes = [0, 0, 0, 0]; window.__advance(1 / 60);
      }, target);
      const actual = await point(surface);
      assert.ok(Math.hypot(actual.x - target.x, actual.y - target.y) < 1.5, "real cursor polling reached target");
      assert.equal(await surface.locator("#study-gamepad-cursor").isVisible(), true);
      return actual;
    }
    async function goFrame(surface, name) {
      await surface.locator(`a[href="./${name}.html"]`).first().click();
      const frame = await (await page.waitForSelector("#study-module-frame")).contentFrame();
      await frame.waitForURL(url => url.pathname.endsWith(name + ".html")); await ready(frame);
      assert.equal(await page.evaluate(() => Boolean(document.fullscreenElement)), true);
      return frame;
    }
    await page.goto(base + "pinyin.html?cursor-position-check=1"); await ready(page);
    await samePoint(page, { x: width / 2, y: 450 });
    const first = await move(page, { x: 71, y: 233 });
    // Only navigation is exercised; no unrelated learning or gameplay workflows.
    for (const name of ["index", "book-learning", "theme-learning", "scenario-learning", "review-learning", "phonetics"]) {
      await page.locator(`a[href="./${name}.html"]`).first().click();
      await page.waitForURL(url => url.pathname.endsWith(name + ".html")); await ready(page); await samePoint(page, first);
    }
    await page.locator('a[href*="bomb-game.html"]').first().click();
    await page.waitForURL(/bomb-game\.html/); await ready(page); await samePoint(page, first);
    await page.locator('a[href="./index.html"]').click(); await page.waitForURL(/index\.html/); await ready(page); await samePoint(page, first);
    // The clicked navigation cell also keeps the position, not just native links.
    const link = page.locator('a[href="./pinyin.html"]'); await link.scrollIntoViewIfNeeded();
    const rect = await link.boundingBox(); const selected = await move(page, { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
    await page.evaluate(() => { window.__pad.buttons[0] = { pressed: true, value: 1 }; window.__advance(1 / 60); });
    await page.waitForURL(/pinyin\.html/); await ready(page); await samePoint(page, selected);
    await page.evaluate(() => {
      const button = document.createElement("button"); button.id = "position-fullscreen"; button.textContent = "Fullscreen fixture";
      button.style.cssText = "position:fixed;top:0;left:0;z-index:2147483647";
      button.onclick = () => document.documentElement.requestFullscreen(); document.body.append(button);
    });
    await page.locator("#position-fullscreen").click(); await page.waitForFunction(() => Boolean(document.fullscreenElement));
    await page.evaluate(() => document.getElementById("position-fullscreen").remove()); await samePoint(page, selected);
    let frame = await goFrame(page, "index"); await samePoint(frame, selected);
    const childPoint = await move(frame, { x: 137, y: 288 });
    for (const name of ["theme-learning", "phonetics"]) {
      frame = await goFrame(frame, name); await samePoint(frame, childPoint);
    }
    await page.screenshot({ path: `tmp/cursor-position-${width}.png` });
    // R2 exit destroys the frame; the dormant owner must not save its stale point.
    await page.evaluate(() => document.exitFullscreen());
    await page.waitForFunction(() => !document.fullscreenElement && !document.getElementById("study-module-frame") && location.pathname.endsWith("phonetics.html"));
    await ready(page); await samePoint(page, childPoint);
    const stored = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)), positionKey);
    assert.deepEqual(Object.keys(stored).sort(), ["x", "y"]);
    assert.ok(Math.hypot(stored.x - childPoint.x, stored.y - childPoint.y) < 0.01);
    await page.reload(); await ready(page); await samePoint(page, childPoint);
    const edgePoint = await move(page, { x: width - 20, y: 875 });
    await page.setViewportSize({ width: 390, height: 500 }); await ready(page);
    await samePoint(page, { x: Math.min(edgePoint.x, 378), y: 488 });
    // A separate browser tab has independent UI coordinates.
    const second = await context.newPage(); await second.goto(base + "pinyin.html"); await ready(second);
    await samePoint(second, { x: width / 2, y: 450 });
    await second.close();
    assert.equal((await page.request.get(base + "src/gamepad-cursor.js?v=1.13")).status(), 200);
    assert.deepEqual(errors, []);
    results.push({ width, windowedEightPages: true, pointerNavigation: true, fullscreenSwitch: true,
      exitAndReload: true, staleOwnerProtected: true, viewportClamp: true, tabIsolation: true });
    await context.close();
  }
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", simulatedStandardGamepad: true, results }));
} finally { await browser.close(); }
