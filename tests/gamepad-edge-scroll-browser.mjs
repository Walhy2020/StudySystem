import assert from "node:assert/strict";
import fs from "node:fs";
import { loadChromium } from "./playwright-runtime.mjs";
const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
fs.mkdirSync("tmp", { recursive: true });
const results = [];
try {
  for (const width of [1440, 390]) {
    const height = 600;
    const context = await browser.newContext({ viewport: { width, height } });
    await context.route("**/api/controller-mouse**", route => route.fulfill({ json: { supported: false, mode: "web" } }));
    await context.addInitScript(() => {
      let callbacks = [], now;
      window.requestAnimationFrame = cb => { callbacks.push(cb); return callbacks.length; };
      window.__pad = { index: 0, id: "Standard PS5 edge-scroll fixture", connected: true, mapping: "standard",
        axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })) };
      Object.defineProperty(navigator, "getGamepads", { value: () => window.__pad.connected ? [window.__pad] : [] });
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
    const axes = (x, y) => page.evaluate(({ x, y }) => { window.__pad.axes = [0, 0, x, y]; }, { x, y });
    const scroll = () => page.evaluate(() => document.scrollingElement.scrollTop);
    const pointer = page.locator("#study-gamepad-cursor");
    await page.goto(base + "phonetics.html?edge-scroll-check=1");
    await page.waitForFunction(() => Boolean(window.__PHONETICS_APP__));
    if (width === 390) {
      // Actual narrow module navigation, including its outer page padding.
      await advance(.05);
      const nav = page.locator(".module-tabs"), box = await nav.boundingBox();
      await page.evaluate(y => {
        for (let i = 0; i < 150; i++) {
          const pointer = document.getElementById("study-gamepad-cursor");
          const dy = y - parseFloat(pointer.style.top);
          if (Math.abs(dy) < 1) break;
          window.__pad.axes = [0,0,0,Math.sign(dy) * (.25 + .75 * Math.min(1,Math.abs(dy)/(650/60)))];
          window.__advance(1/60);
        }
      }, box.y + box.height / 2);
      await axes(1,0); await advance(1.2);
      assert.ok(await nav.evaluate(node => node.scrollLeft) > 0, "real module tabs scroll to the right");
      await axes(-1,0); await advance(2);
      assert.equal(await nav.evaluate(node => node.scrollLeft), 0, "real module tabs scroll back left");
      await axes(0,0); await advance(.05);
    }
    assert.ok(await page.evaluate(() => document.scrollingElement.scrollHeight > innerHeight), "actual learning page has scrollable height");
    await advance(0.05); await axes(0, 1); await advance(0.1);
    assert.equal(await scroll(), 0, "no scrolling until cursor reaches the bottom");
    await advance(0.9); const first = await scroll(); assert.ok(first > 0);
    await advance(0.2); assert.ok(await scroll() > first, "continued outward push keeps scrolling");
    const bounds = await pointer.boundingBox(); assert.ok(bounds.y + bounds.height <= height);
    await axes(0, 0); const stopped = await scroll(); await advance(0.3); assert.equal(await scroll(), stopped);
    await axes(0, 0.2); await advance(0.3); assert.equal(await scroll(), stopped, "drift/deadzone does not scroll");
    await axes(0, -1); await advance(0.1); assert.equal(await scroll(), stopped, "moving away from bottom does not scroll");
    await advance(1); assert.ok(await scroll() < stopped, "top edge scrolls back up");
    await advance(5); assert.equal(await scroll(), 0, "no overscroll beyond top");
    await axes(0, 1); await advance(10);
    assert.ok(await page.evaluate(() => Math.abs(document.scrollingElement.scrollTop - (document.scrollingElement.scrollHeight - innerHeight)) < 2));
    await axes(0, 0); await advance(0.1);
    await page.screenshot({ path: `tmp/gamepad-edge-bottom-${width}.png` });

    // Each axis scrolls only its matching container; do not convert down to right.
    await page.evaluate(() => {
      document.scrollingElement.scrollTop = 100;
      const panel = document.createElement("div"); panel.id = "edge-fixture";
      panel.style.cssText = "position:fixed;inset:auto 0 0;height:90px;overflow-x:auto;overflow-y:hidden;background:white;z-index:99";
      panel.style.scrollSnapType = "x mandatory";
      const content = document.createElement("div"); content.style.cssText = "display:flex;width:5000px;height:70px";
      for (let i = 0; i < 20; i++) { const cell = document.createElement("div"); cell.style.cssText = "flex:0 0 250px;height:70px;scroll-snap-align:start"; content.append(cell); }
      panel.append(content); document.body.append(panel);
    });
    await axes(0, 1); await advance(0.3);
    assert.equal(await page.locator("#edge-fixture").evaluate(n => n.scrollLeft), 0);
    assert.ok(await scroll() > 100);
    await axes(1, 0); await advance(1.6);
    const horizontal = await page.locator("#edge-fixture").evaluate(n => n.scrollLeft);
    assert.ok(horizontal > 0, "right edge scrolls horizontal content");
    const verticalHeld = await scroll();
    await advance(.3); assert.ok(await page.locator("#edge-fixture").evaluate(n => n.scrollLeft) > horizontal);
    assert.equal(await scroll(), verticalHeld, "horizontal input does not scroll the page down");
    await axes(0, 0); await advance(.05);
    assert.equal(await page.locator("#edge-fixture").evaluate(n => n.style.scrollSnapType), "x mandatory", "restore original snap style on release");
    const horizontalStopped = await page.locator("#edge-fixture").evaluate(n => n.scrollLeft);
    await advance(.3); assert.equal(await page.locator("#edge-fixture").evaluate(n => n.scrollLeft), horizontalStopped);
    await axes(-1, 0); await advance(2.7);
    assert.ok(await page.locator("#edge-fixture").evaluate(n => n.scrollLeft) < horizontalStopped, "left edge reverses horizontal scrolling");
    await axes(0, 0); await advance(.05);
    await page.evaluate(() => {
      document.scrollingElement.scrollTop = 100;
      const panel = document.getElementById("edge-fixture");
      panel.style.cssText = "position:fixed;inset:0;overflow-y:auto;overflow-x:hidden;background:white;z-index:99";
      panel.firstElementChild.style.cssText = "height:3000px;width:100%";
    });
    await axes(0, 1); await advance(1.1);
    await advance(0.3); assert.ok(await page.locator("#edge-fixture").evaluate(n => n.scrollTop) > 0);
    assert.equal(await scroll(), 100, "scroll innermost vertical panel before the page");
    await page.locator("#edge-fixture").evaluate(n => { n.scrollTop = n.scrollHeight; });
    await advance(0.3); assert.ok(await scroll() > 100, "exhausted nested panel falls back to the page");

    await page.evaluate(() => document.getElementById("edge-fixture").remove());
    const held = await scroll();
    await page.evaluate(() => window.STUDY_GAMEPAD_CURSOR.setInputCapture(true)); await advance(0.3); assert.equal(await scroll(), held);
    await page.evaluate(() => window.STUDY_GAMEPAD_CURSOR.setInputCapture(false)); await advance(0.3); assert.equal(await scroll(), held);
    await axes(0, 0); await advance(0.05); await axes(0, 1); await advance(0.2); assert.ok(await scroll() > held);
    await page.evaluate(() => { window.__pad.connected = false; });
    const disconnected = await scroll(); await advance(0.3); assert.equal(await scroll(), disconnected);
    assert.equal(await pointer.isVisible(), false);
    await page.evaluate(() => { window.__pad.connected = true; }); await advance(0.3); assert.equal(await scroll(), disconnected);
    await axes(0, 0); await advance(0.05); await axes(0, 1); await advance(0.2); assert.ok(await scroll() > disconnected);
    // A synthetic blur alone is not actual focus loss with the persistent shell.
    await page.evaluate(() => { Object.defineProperty(document, "hasFocus", { value: () => false, configurable: true }); window.dispatchEvent(new Event("blur")); });
    const blurred = await scroll(); await advance(0.3); assert.equal(await scroll(), blurred);
    await page.evaluate(() => { Object.defineProperty(document, "hasFocus", { value: () => true, configurable: true }); });
    await axes(0, 0); await advance(0.05);

    // A remains a single click after scrolling; no application learning state is changed.
    await page.evaluate(() => {
      const button = document.createElement("button"); button.id = "edge-click"; button.textContent = "Scroll click fixture";
      button.style.cssText = "position:fixed;left:0;right:0;bottom:0;width:100%;height:45px;z-index:99";
      window.__clicks = 0; button.onclick = () => { window.__clicks++; }; document.body.append(button);
      window.__pad.buttons[0] = { pressed: true, value: 1 };
    });
    await advance(0.2); assert.equal(await page.evaluate(() => window.__clicks), 1);
    await page.evaluate(() => { window.__pad.buttons[0] = { pressed: false, value: 0 }; document.getElementById("edge-click").remove(); });
    await advance(0.05);
    // The persistent root scrolls the active child, not its inert previous page.
    await page.evaluate(() => window.STUDY_FULLSCREEN_SHELL.navigate("word-learning.html?test=edge-child"));
    await page.waitForFunction(() => !window.STUDY_FULLSCREEN_SHELL.isNavigating(), null, { polling: 50 });
    const frame = page.frameLocator("#study-module-frame");
    await frame.locator("body").evaluate(body => {
      const panel = document.createElement("div"); panel.id = "child-horizontal";
      panel.style.cssText = "position:fixed;inset:auto 0 0;height:90px;overflow-x:auto;overflow-y:hidden;background:white;z-index:99";
      panel.innerHTML = '<div style="width:5000px;height:70px"></div>'; body.append(panel);
    });
    await axes(0,0); await advance(.05); await axes(1,0); await advance(width / 650 + 1);
    assert.ok(await frame.locator("#child-horizontal").evaluate(node => node.scrollLeft) > 0, "horizontal scroll routes to the active child");
    await axes(0,0); await advance(.05);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal((await page.request.get(base + "src/gamepad-cursor.js?v=1.17")).status(), 200);
    assert.deepEqual(errors, []);
    results.push({ width, actualLearningScroll: true, stopAndReverse: true, bounds: true,
      nestedFallback: true, noHorizontalConversion: true, horizontalEdges: true, snapPreserved: true, activeChild: true, inputSafety: true, clickPreserved: true });
    await context.close();
  }
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", simulatedStandardGamepad: true, results }));
} finally { await browser.close(); }
