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
    await context.addInitScript(root => {
      let callbacks = [], now = 0;
      window.requestAnimationFrame = callback => { callbacks.push(callback); return callbacks.length; };
      const held = sessionStorage.getItem("cursor-test-held") === "yes";
      sessionStorage.setItem(`mario-gamepad-cursor-position-v1:${root}`, JSON.stringify({ x: 75, y: 220 }));
      window.__pad = { index: 0, id: "Navigation cursor fixture", connected: true, mapping: "standard",
        axes: held ? [1, 0, 0, 0] : [0, 0, 0, 0],
        buttons: Array.from({ length: 18 }, (_, i) => ({ pressed: held && i === 0, value: held && i === 0 ? 1 : 0 })) };
      Object.defineProperty(navigator, "getGamepads", { value: () => window.__pad.connected ? [window.__pad] : [] });
      window.__advance = () => {
        for (let i = 0; i < 3; i++) { now += 17; const batch = callbacks; callbacks = []; batch.forEach(cb => cb(now)); }
      };
      window.__clicks = 0;
      document.addEventListener("click", () => { window.__clicks++; });
    }, new URL(base).pathname);
    let mode = "web";
    await context.route("**/api/controller-mouse", route => route.fulfill({ json: { supported: true, mode } }));
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(response.url()); });
    const advance = surface => surface.evaluate(() => window.__advance());
    async function ready(surface) {
      await surface.waitForFunction(() => Boolean(window.STUDY_GAMEPAD_CURSOR));
      await advance(surface);
    }
    async function visibleAtRest(surface) {
      assert.equal(await surface.locator("#study-gamepad-cursor").isVisible(), true, "Held inputs must not hide restored cursor");
      assert.deepEqual(await surface.locator("#study-gamepad-cursor").evaluate(node =>
        ({ x: parseFloat(node.style.left), y: parseFloat(node.style.top) })), { x: 75, y: 220 });
      assert.equal(await surface.evaluate(() => window.__clicks), 0, "Held A cannot click the incoming module");
      assert.ok(await surface.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await page.goto(base + "phonetics.html"); await page.bringToFront(); await ready(page);
    for (const name of ["scenario-learning", "review-learning", "phonetics"]) {
      await page.evaluate(() => sessionStorage.setItem("cursor-test-held", "yes"));
      await page.locator(`a[href="./${name}.html"]`).first().click();
      await page.waitForURL(url => url.pathname.endsWith(name + ".html")); await ready(page);
      await visibleAtRest(page); await advance(page); await visibleAtRest(page);
    }
    // Native fullscreen activation; only module navigation is tested, no lesson workflow.
    await page.evaluate(() => {
      const button = document.createElement("button"); button.id = "cursor-fullscreen"; button.textContent = "Fullscreen";
      button.onclick = () => document.documentElement.requestFullscreen(); document.body.append(button);
      window.__pad.axes = [0, 0, 0, 0]; window.__pad.buttons[0] = { pressed: false, value: 0 };
    });
    await advance(page); await page.locator("#cursor-fullscreen").click();
    await page.waitForFunction(() => Boolean(document.fullscreenElement));
    let source = page;
    for (const name of ["scenario-learning", "review-learning"]) {
      let release, entered;
      const blocked = new Promise(resolve => { release = resolve; });
      const requested = new Promise(resolve => { entered = resolve; });
      const pattern = `**/${name}.html`;
      await context.route(pattern, async route => { entered(); await blocked; await route.continue(); });
      await source.evaluate(name => document.querySelector(`a[href="./${name}.html"]`).click(), name);
      await requested;
      const bridge = page.locator("#study-navigation-cursor");
      assert.equal(await bridge.isVisible(), true, "Cursor stays above loading frame");
      const bounds = await bridge.boundingBox();
      assert.ok(Math.abs(bounds.x + bounds.width / 2 - 75) < .1 && Math.abs(bounds.y + bounds.height / 2 - 220) < .1);
      await advance(page); assert.equal(await bridge.isVisible(), true, "Dormant owner cannot hide transition cursor");
      await page.screenshot({ path: `tmp/cursor-transition-${name}-${width}.png` });
      release();
      const frame = await (await page.locator("#study-module-frame").elementHandle()).contentFrame();
      await frame.waitForURL(url => url.pathname.endsWith(name + ".html")); await ready(frame);
      await visibleAtRest(frame);
      assert.equal(await bridge.isVisible(), false, "Incoming cursor replaces bridge, never leaves a duplicate");
      assert.equal(await page.evaluate(() => Boolean(document.fullscreenElement)), true);
      await context.unroute(pattern); source = frame;
    }
    // Visibility does not bypass system mode, controller disconnect or neutral gating.
    mode = "system"; await source.evaluate(() => window.STUDY_CONTROLLER_MOUSE.refresh());
    await advance(source); assert.equal(await source.locator("#study-gamepad-cursor").isVisible(), false);
    mode = "web"; await source.evaluate(() => window.STUDY_CONTROLLER_MOUSE.refresh());
    await advance(source); await visibleAtRest(source);
    await source.evaluate(() => { window.__pad.connected = false; });
    await advance(source); assert.equal(await source.locator("#study-gamepad-cursor").isVisible(), false);
    await source.evaluate(() => { window.__pad.connected = true; }); await advance(source); await visibleAtRest(source);
    await source.evaluate(() => { window.__pad.axes = [0, 0, 0, 0]; window.__pad.buttons[0] = { pressed: false, value: 0 }; });
    await advance(source);
    await source.evaluate(() => { window.__pad.axes[2] = 1; }); await advance(source);
    assert.ok(await source.locator("#study-gamepad-cursor").evaluate(node => parseFloat(node.style.left) > 75), "Movement resumes after neutral");
    assert.deepEqual(errors, []);
    console.log(`PASS Edge ${width}: held-input visible cursor, loading bridge/handoff, no replay, mode/disconnect/neutral safeguards`);
    await context.close();
  }
} finally { await browser.close(); }
