import assert from "node:assert/strict";
import { loadChromium } from "./playwright-runtime.mjs";
const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.route("**/api/controller-mouse", route => route.fulfill({ json: { supported: true, mode: "web" } }));
    await context.addInitScript(() => {
      localStorage.setItem("mario-hanzi-refactor-v1", JSON.stringify({ records: { "0010": { status: "known", correctCount: 1 } } }));
      window.__pad = { connected: true, mapping: "standard", index: 0, id: "Y binding fixture",
        axes: [0,0,0,0], buttons: Array.from({length:18}, () => ({pressed:false,value:0})) };
      Object.defineProperty(navigator,"getGamepads", { value: () => [window.__pad] });
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const setY = down => page.evaluate(down => { window.__pad.buttons[3] = {pressed:down,value:Number(down)}; },down);
    const state = () => page.evaluate(() => window.__snakeDemo.getState());
    const ready = () => page.waitForFunction(() => window.__snakeDemo?.getState().ready);
    await page.goto(base + "snake-game.html?test=y-binding"); await ready();
    await page.locator("#settingsButton").click(); await page.locator("#tuningToggle").click();
    await page.locator("#bind-vacuum-button").click(); await setY(true);
    await page.waitForFunction(() => window.__snakeDemo.getState().bindings.vacuum.button === 3);
    assert.equal(await page.locator("#bind-vacuum-button").textContent(), "Y / △");
    assert.match(await page.locator("#bindingStatus").textContent(), /已保存/);
    await setY(false); await page.waitForTimeout(100);
    await page.reload(); await ready();
    assert.equal((await state()).bindings.vacuum.button,3,"Y binding survives reload");
    await page.locator("#resumeButton").click(); await page.locator("#game").focus();
    await page.waitForTimeout(150); await setY(true);
    await page.waitForFunction(() => window.__snakeDemo.getState().vacuum.active);
    assert.equal(await page.evaluate(() => window.STUDY_GAMEPAD_CURSOR.isMenuActive()),false,"Bound Y cannot open shared cursor menu");
    assert.equal((await state()).paused,false);
    await setY(false);
    await page.waitForFunction(() => !window.__snakeDemo.getState().vacuum.active);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
    assert.deepEqual(errors,[]);
    console.log(`PASS Edge ${width}: Y捕捉/保存/刷新恢复/实际吸取，无菜单抢键（模拟手柄）`);
    await context.close();
  }
} finally { await browser.close(); }
