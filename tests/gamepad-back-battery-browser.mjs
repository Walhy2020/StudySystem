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
    const context = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: width === 390 });
    await context.addInitScript(() => {
      window.__pad = { index: 0, id: "Xbox Wireless Controller (XInput)", connected: true, mapping: "standard",
        axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
      if (location.search.includes("held")) window.__pad.buttons[7] = { pressed: true, value: 1 };
      Object.defineProperty(navigator, "getGamepads", { value: () => window.__pad.connected ? [window.__pad] : [] });
      window.__hidRequests = 0;
      const hid = new EventTarget(); hid.getDevices = async () => [];
      hid.requestDevice = async () => { window.__hidRequests++; return []; };
      Object.defineProperty(navigator, "hid", { value: hid });
      const original = Element.prototype.requestFullscreen;
      window.__fullscreenRequests = 0;
      Element.prototype.requestFullscreen = function (...args) { window.__fullscreenRequests++; return original.apply(this, args); };
    });
    let native = { supported: true, controllers: [{ slot: 1, level: "low" }] }, apiFailure = false;
    await context.route("**/api/controller-battery", route => route.fulfill({ status: apiFailure ? 503 : 200,
      contentType: "application/json", body: JSON.stringify(native) }));
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    async function load(name, query = "") {
      await page.goto(base + name + ".html" + query); await page.bringToFront();
      await page.waitForFunction(() => window.STUDY_GAMEPAD_CURSOR);
      await page.waitForTimeout(100);
    }
    const setR2 = down => page.evaluate(down => { window.__pad.buttons[7] = { pressed: down, value: down ? 1 : 0 }; }, down);
    async function back() {
      await setR2(false); await page.waitForTimeout(80);
      await setR2(true); await page.waitForTimeout(100);
      // A destination must re-arm only after release, even across navigation.
      await setR2(false); await page.waitForTimeout(100);
    }
    const home = () => page.waitForURL(/index\.html$/);
    await load("scenario-learning", "?held=1");
    assert.ok(await page.locator("#scenarioPicker").isVisible(), "held-on-connect must not return home");
    await setR2(false); await page.waitForTimeout(100);
    await page.locator(".scenario-card button").first().click();
    await setR2(true); await page.waitForTimeout(300);
    assert.ok(await page.locator("#scenarioPicker").isVisible());
    assert.match(page.url(), /scenario-learning/); // No hold cascade to home.
    await setR2(false); await page.waitForTimeout(100); await back(); await home();
    await load("theme-learning");
    await page.locator('[data-series-id="basics"]').click(); await page.locator("#startTheme").click();
    await back(); assert.ok(await page.locator("#backToSeries").isVisible());
    await back(); assert.ok(await page.locator('[data-series-id="basics"]').isVisible());
    await back(); await home();
    await load("book-learning"); await page.locator("#themeList button").first().click();
    await back(); assert.ok(await page.locator("#themePicker").isVisible()); await back(); await home();
    for (const name of ["pinyin", "phonetics", "review-learning"]) {
      await load(name); await back(); await home();
    }
    await load("index"); await back(); assert.match(page.url(), /index\.html$/);
    assert.equal(await page.evaluate(() => window.__fullscreenRequests), 0);
    // Actual fullscreen, with R2 inner/home returns staying inside its owner/frame.
    await load("bomb-game"); await page.locator("#bombSettingsToggle").click();
    await page.locator("#bombFullscreenToggle").click();
    await page.waitForFunction(() => document.fullscreenElement);
    await back(); // Direct game -> home in the fullscreen shell.
    await page.waitForSelector("#study-module-frame");
    let frame = page.frames().find(frame => frame !== page.mainFrame());
    await frame.waitForSelector('a[href="./scenario-learning.html"]');
    await frame.locator('a[href="./scenario-learning.html"]').click();
    frame = page.frames().find(frame => frame !== page.mainFrame());
    await frame.waitForSelector(".scenario-card button");
    await frame.locator(".scenario-card button").first().click();
    await frame.waitForTimeout(150);
    const frameBack = async () => {
      await frame.evaluate(() => { window.__pad.buttons[7] = { pressed: false, value: 0 }; });
      await frame.waitForTimeout(80);
      await frame.evaluate(() => { window.__pad.buttons[7] = { pressed: true, value: 1 }; });
      await frame.waitForTimeout(100);
      await frame.evaluate(() => { window.__pad.buttons[7] = { pressed: false, value: 0 }; });
      await frame.waitForTimeout(100);
    };
    await frameBack(); assert.ok(await frame.locator("#scenarioPicker").isVisible());
    assert.ok(await page.evaluate(() => Boolean(document.fullscreenElement)));
    await frameBack(); await page.waitForURL(/index\.html$/);
    assert.ok(await page.evaluate(() => Boolean(document.fullscreenElement)));
    await page.evaluate(() => document.exitFullscreen());
    await page.waitForSelector("#study-module-frame", { state: "detached" });
    await load("bomb-game");
    await page.locator("#bombSettingsToggle").click();
    const battery = page.locator("#bombGamepadBattery");
    await page.waitForFunction(() => document.getElementById("bombGamepadBattery").textContent === "手柄电量：低");
    assert.ok(await battery.isVisible(), "battery requires no Attack Settings submenu");
    assert.equal(await page.locator("#bombAttackMenu p:not([role='status'])").count(), 0);
    const geometry = await page.locator("#bombSettingsMenu").evaluate(menu => {
      const box = menu.getBoundingClientRect();
      return { inside: box.left >= 0 && box.right <= innerWidth && box.bottom <= innerHeight,
        overflow: document.documentElement.scrollWidth > innerWidth };
    });
    assert.deepEqual(geometry, { inside: true, overflow: false });
    for (const [level, expected] of [["medium", "中"], ["full", "满"], ["wired", "有线连接 · 电量未知"]]) {
      native.controllers[0].level = level;
      if (width === 390) await page.locator("#readGamepadBattery").tap();
      else { await page.locator("#readGamepadBattery").focus(); await page.keyboard.press("Enter"); }
      await page.waitForFunction(label => document.getElementById("bombGamepadBattery").textContent === label, "手柄电量：" + expected);
    }
    native.controllers = []; await page.locator("#readGamepadBattery").click();
    await page.waitForFunction(() => document.getElementById("bombGamepadBattery").textContent === "手柄电量：未知");
    assert.equal(await page.evaluate(() => window.__hidRequests), 0, "Xbox must not open a Sony chooser");
    apiFailure = true; await page.locator("#readGamepadBattery").click();
    await page.waitForTimeout(100); assert.equal(await battery.textContent(), "手柄电量：未知"); apiFailure = false;
    await page.locator("#bombAttackToggle").click();
    await back(); assert.ok(await page.locator("#bombAttackMenu").isHidden()); assert.ok(await page.locator("#bombSettingsMenu").isVisible());
    await back(); assert.ok(await page.locator("#bombSettingsMenu").isHidden());
    await page.locator("#bombSettingsToggle").click();
    await page.screenshot({ path: `tmp/gamepad-back-settings-${width}.png` });
    await back(); await back(); await home();
    assert.deepEqual(errors, []);
    for (const resource of ["src/gamepad-cursor.js?v=1.11", "src/bomb-gamepad.js?v=1.5", "src/bomb-gamepad-battery.js?v=1.1", "bomb-game.css?v=1.10", "bomb-game.js?v=2.41"]) {
      assert.equal((await page.request.get(base + resource)).status(), 200, resource);
    }
    results.push({ width, backLevels: true, fullscreenPreserved: true, xboxBatteryUI: "mocked XInput levels", settingsFit: true });
    await context.close();
  }
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", physicalControllerTested: false, results }));
} finally { await browser.close(); }
