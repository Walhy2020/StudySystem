import assert from "node:assert/strict";
import { loadChromium } from "./playwright-runtime.mjs";
const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:53177/";
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: width === 390 });
    await context.addInitScript(() => {
      window.__pad = { index: 0, id: "Xbox standard test", connected: true, mapping: "standard", axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
      if (location.search.includes("held-y")) window.__pad.buttons[3] = { pressed: true, value: 1 };
      Object.defineProperty(navigator, "getGamepads", { value: () => window.__pad.connected ? [window.__pad] : [] });
      window.__spaceEvents = 0;
      document.addEventListener("click", event => {
        if (["currentChar", "phoneticToggle"].includes(event.target.id)) window.__spaceEvents++;
      });
    });
    let mode = "web";
    // Never attach a native mouse lease to the user's real desktop during acceptance.
    await context.route("**/api/controller-mouse", route => route.fulfill({ contentType: "application/json",
      body: JSON.stringify({ supported: true, mode }) }));
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    async function load(path) { await page.goto(base + path); await page.bringToFront(); await page.waitForTimeout(130); }
    const setY = down => page.evaluate(down => { window.__pad.buttons[3] = { pressed: down, value: down ? 1 : 0 }; }, down);
    async function tapY() { await setY(true); await page.waitForTimeout(100); await setY(false); await page.waitForTimeout(100); }
    await load("index.html?test=gamepad-space&held-y");
    await page.locator("#startDaily").click();
    assert.equal(await page.evaluate(() => window.__spaceEvents), 0, "connect-held Y must not reveal");
    assert.equal(await page.locator(".pinyin-readings").count(), 0);
    await setY(false); await page.waitForTimeout(100);
    const character = await page.locator("#currentChar").textContent();
    await setY(true); await page.waitForTimeout(250);
    assert.equal(await page.evaluate(() => window.__spaceEvents), 1, "holding Y triggers once");
    assert.equal(await page.locator(".pinyin-readings").count(), 1);
    const pinyin = await page.locator("#pinyinLine").textContent();
    await setY(false); await page.waitForTimeout(100); await tapY();
    assert.equal(await page.locator("#pinyinLine").textContent(), pinyin, "Hanzi retains its original reveal-only rule");
    assert.equal(await page.locator("#currentChar").textContent(), character);
    await page.keyboard.press("Space");
    assert.equal(await page.locator("#pinyinLine").textContent(), pinyin);

    await load("theme-learning.html");
    await page.locator('[data-series-id="basics"]').click(); await page.locator("#startTheme").click();
    await page.locator('#bodyScene [data-target="head"]').click();
    assert.ok(await page.locator("#phonemeBreakdown").isHidden());
    await setY(true); await page.waitForTimeout(250);
    assert.ok(await page.locator("#phonemeBreakdown").isVisible());
    assert.equal(await page.evaluate(() => window.__spaceEvents), 1);
    const breakdown = await page.locator("#phonemeBreakdown").textContent();
    await setY(false); await page.waitForTimeout(100); await tapY();
    assert.ok(await page.locator("#phonemeBreakdown").isHidden());
    await page.locator("#phoneticToggle").focus(); await page.keyboard.press("Space");
    assert.equal(await page.locator("#phonemeBreakdown").textContent(), breakdown);
    assert.ok(await page.locator("#phonemeBreakdown").isVisible());
    await page.keyboard.press("Space"); assert.ok(await page.locator("#phonemeBreakdown").isHidden());
    await page.evaluate(() => { const input = document.createElement("input"); input.id = "typingTest"; document.body.append(input); input.focus(); });
    await tapY(); assert.ok(await page.locator("#phonemeBreakdown").isHidden(), "editing ignores Y");
    await page.evaluate(() => document.getElementById("typingTest").remove());
    await page.evaluate(() => window.STUDY_GAMEPAD_CURSOR.setInputCapture(true));
    await tapY(); assert.ok(await page.locator("#phonemeBreakdown").isHidden(), "binding capture ignores Y");
    await page.evaluate(() => window.STUDY_GAMEPAD_CURSOR.setInputCapture(false)); await page.waitForTimeout(100);
    mode = "system"; await page.evaluate(() => window.STUDY_CONTROLLER_MOUSE.refresh());
    await tapY(); assert.ok(await page.locator("#phonemeBreakdown").isHidden(), "system mouse mode ignores Y");
    mode = "web"; await page.evaluate(() => window.STUDY_CONTROLLER_MOUSE.refresh()); await page.waitForTimeout(100);
    await page.evaluate(() => { window.__pad.connected = false; }); await page.waitForTimeout(80);
    await setY(true); await page.evaluate(() => { window.__pad.connected = true; }); await page.waitForTimeout(100);
    assert.ok(await page.locator("#phonemeBreakdown").isHidden(), "reconnect-held Y ignored");
    await setY(false); await page.waitForTimeout(100); await tapY();
    assert.ok(await page.locator("#phonemeBreakdown").isVisible());
    await page.locator("#practiceStage").click(); const events = await page.evaluate(() => window.__spaceEvents);
    await tapY(); assert.equal(await page.evaluate(() => window.__spaceEvents), events);
    assert.ok(await page.locator("#phoneticToggle").isHidden(), "practice does not reveal a word card");
    await load("bomb-game.html?test=gamepad-space");
    await page.locator("#overlayStartBombGame").click(); await page.waitForTimeout(100); await tapY();
    assert.equal(await page.evaluate(() => window.__spaceEvents), 0, "bomb Y still toggles menu only");
    assert.equal(await page.evaluate(() => window.STUDY_GAMEPAD_CURSOR.isMenuActive()), true);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    for (const asset of ["src/gamepad-cursor.js?v=1.14", "src/app.js?v=1.42", "theme-learning.js?v=2.21"]) {
      assert.equal((await page.request.get(base + asset)).status(), 200);
    }
    assert.deepEqual(errors, []);
    console.log(`PASS Microsoft Edge ${width}: Y=Space 汉字/主题、按住/重连/编辑/捕捉/系统鼠标保护，炸弹Y菜单保留（模拟手柄）`);
    await context.close();
  }
} finally { await browser.close(); }
