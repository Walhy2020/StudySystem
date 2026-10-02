import assert from "node:assert/strict";
import { loadChromium } from "./playwright-runtime.mjs";
import { APP_VERSION } from "../src/constants.js";

const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const results = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: width === 390 });
    await context.addInitScript(() => { Math.random = () => 0.999; });
    const page = await context.newPage(); const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(response.url()); });
    await page.goto(base + "pinyin.html?test=fixed-order");
    await page.waitForFunction(() => window.__PINYIN_APP__);
    const symbol = () => page.locator("#pinyinSymbol").textContent();
    if (width === 390) await page.locator("#startDaily").tap();
    else await page.locator("#startDaily").click();
    for (const expected of ["b", "p", "m"]) {
      assert.equal(await symbol(), expected); await page.locator("#markWrong").click();
    }
    assert.equal(await symbol(), "b", "learning ignores RNG=0.999");
    await page.evaluate(() => {
      const app = window.__PINYIN_APP__; const saved = app.getState();
      saved.dailyNewIds.reverse(); saved.activeWordId = saved.dailyNewIds[0];
      localStorage.setItem(app.getStorageKey(), JSON.stringify(saved));
    });
    await page.reload(); await page.waitForFunction(() => window.__PINYIN_APP__);
    assert.equal(await symbol(), "b", "old randomly selected m is reordered without wiping progress");
    await page.locator("#markCorrect").focus(); await page.keyboard.press("Enter");
    assert.equal(await symbol(), "p");
    await page.reload(); await page.waitForFunction(() => window.__PINYIN_APP__);
    assert.equal(await symbol(), "p", "completed b stays completed after reload");
    await page.locator("#markCorrect").click(); assert.equal(await symbol(), "m");
    await page.locator("#markCorrect").click();
    assert.equal(await page.locator("#finishNewWords").isVisible(), true);
    await page.locator("#finishNewWords").click();
    await page.locator("#startDaily").click(); assert.equal(await symbol(), "b");
    await page.locator("#markMastered").click(); assert.equal(await symbol(), "p");
    await page.locator("#nextBatch").click(); assert.equal(await symbol(), "p");
    assert.equal(await page.locator("#appVersionLabel").textContent(), `v${APP_VERSION}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    results.push({ width, screening: ["b", "p", "m"], learning: ["b", "p", "m"],
      reorderedOldSave: true, retainedCompleted: true, masteredSkip: true });
    await context.close();
  }
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", results }));
} finally { await browser.close(); }
