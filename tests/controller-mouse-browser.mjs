import assert from "node:assert/strict";
import fs from "node:fs";
import { loadChromium } from "./playwright-runtime.mjs";
const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
fs.mkdirSync("tmp", { recursive: true });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: width === 390 });
    await context.addInitScript(() => {
      window.__pad = { index: 0, id: "Xbox XInput test", connected: true, mapping: "standard",
        axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
      if (location.search.includes("held-view")) window.__pad.buttons[8] = { pressed: true, value: 1 };
      Object.defineProperty(navigator, "getGamepads", { value: () => window.__pad.connected ? [window.__pad] : [] });
    });
    let mode = "web", activeLease = false;
    // Native engine has separate pure tests. Browser test never controls desktop input.
    await context.route("**/api/controller-mouse", route => {
      const request = route.request().postDataJSON();
      assert.deepEqual(Object.keys(request).sort(), ["active", "client"]);
      activeLease = request.active;
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ supported: true, mode }) });
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const set = (index, down) => page.evaluate(({ index, down }) => {
      window.__pad.buttons[index] = { pressed: down, value: down ? 1 : 0 };
    }, { index, down });
    async function tap(index) { await set(index, true); await page.waitForTimeout(100); await set(index, false); await page.waitForTimeout(150); }
    await page.goto(base + "index.html?held-view"); await page.bringToFront();
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => window.STUDY_CONTROLLER_MOUSE.isActive()), false, "connect-held View does nothing");
    await set(8, false); await page.waitForTimeout(100);
    await page.evaluate(() => {
      const spacer = document.createElement("div"); spacer.style.height = "3000px"; document.body.append(spacer);
      window.scrollTo(0, 200); window.__clicks = 0;
      const button = document.createElement("button"); button.id = "mouseTestClick"; button.textContent = "点击测试";
      button.style.cssText = `position:fixed;left:${innerWidth / 2 - 100}px;top:${innerHeight / 2 - 30}px;width:200px;height:60px;z-index:99999`;
      button.onclick = () => { window.__clicks++; }; document.body.append(button);
    });
    await page.waitForTimeout(100);
    const before = await page.evaluate(() => ({ y: scrollY, left: document.querySelector("#study-gamepad-cursor").style.left,
      top: document.querySelector("#study-gamepad-cursor").style.top }));
    await tap(5); await tap(6);
    assert.deepEqual(await page.evaluate(() => ({ y: scrollY, left: document.querySelector("#study-gamepad-cursor").style.left,
      top: document.querySelector("#study-gamepad-cursor").style.top })), before, "R1/L2 do not move or scroll cursor");
    assert.match(page.url(), /index\.html/);
    await tap(0); assert.equal(await page.evaluate(() => window.__clicks), 1);
    mode = "system"; await tap(8);
    await page.waitForFunction(() => document.querySelector("#study-controller-mouse-mode").textContent === "系统鼠标" &&
      !document.querySelector("#study-controller-mouse-mode").hidden);
    assert.ok(await page.locator("#study-gamepad-cursor").isHidden());
    await tap(0); await tap(5); await tap(7);
    assert.equal(await page.evaluate(() => window.__clicks), 1);
    assert.equal(await page.evaluate(() => Boolean(document.fullscreenElement)), false);
    await page.screenshot({ path: `tmp/controller-mouse-${width}.png` });
    mode = "web"; await set(0, true); await tap(8);
    await page.waitForFunction(() => !window.STUDY_CONTROLLER_MOUSE.isActive());
    assert.equal(await page.evaluate(() => window.__clicks), 1, "held A must not click after returning to web");
    await set(0, false); await page.waitForTimeout(100); await tap(0);
    assert.equal(await page.evaluate(() => window.__clicks), 2);
    await page.evaluate(() => window.STUDY_GAMEPAD_CURSOR.setInputCapture(true));
    await page.waitForTimeout(500); assert.equal(activeLease, false, "capture cannot arm native View");
    await tap(8); assert.equal(await page.evaluate(() => window.STUDY_CONTROLLER_MOUSE.isActive()), false);
    await page.evaluate(() => window.STUDY_GAMEPAD_CURSOR.setInputCapture(false));
    await page.goto(base + "bomb-game.html?test=1"); await page.bringToFront();
    await page.locator("#overlayStartBombGame").click(); await page.waitForTimeout(120);
    mode = "system"; await tap(8); await page.waitForTimeout(500);
    assert.equal(await page.locator("#overlayStartBombGame").textContent(), "继续");
    const read = () => page.evaluate(() => window.__BOMB_GAME__.getState());
    const snapshot = await read(); await tap(0); await tap(1); await tap(13); await page.waitForTimeout(200);
    const paused = await read();
    assert.deepEqual(paused.player, snapshot.player); assert.equal(paused.mushroomShots.length, snapshot.mushroomShots.length);
    assert.equal(paused.bombs.length, snapshot.bombs.length);
    mode = "web"; await tap(8);
    await page.waitForFunction(() => !window.STUDY_CONTROLLER_MOUSE.isActive());
    assert.ok(await page.locator("#overlayStartBombGame").isVisible(), "web return still needs explicit Continue");
    await page.locator("#overlayStartBombGame").click(); await page.locator("#bombSettingsToggle").click();
    await tap(5); assert.ok(await page.locator("#bombSettingsMenu").isHidden(), "R1 closes settings");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "no horizontal overflow");
    for (const asset of ["src/controller-mouse.js?v=1.0", "src/gamepad-cursor.js?v=1.13", "bomb-game.js?v=2.43"]) {
      assert.equal((await page.request.get(base + asset)).status(), 200);
    }
    assert.deepEqual(errors, []);
    console.log(`PASS Edge ${width}: R1 return, View互斥、重连/捕捉、防重复点击与游戏暂停（模拟手柄/本机状态）`);
    await context.close();
  }
} finally { await browser.close(); }
