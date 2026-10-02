import assert from "node:assert/strict";
import fs from "node:fs";
import { loadChromium } from "./playwright-runtime.mjs";
import { APP_VERSION } from "../src/constants.js";

const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const results = [];
fs.mkdirSync("tmp", { recursive: true });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: width === 390 });
    const page = await context.newPage(); const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(response.url()); });
    await page.goto(base + "index.html?test=pinyin-nav");
    await page.locator('nav [href="./pinyin.html"]').focus(); await page.keyboard.press("Enter");
    await page.waitForFunction(() => window.__PINYIN_APP__);
    const protectedKeys = ["mario-hanzi-refactor-v1", "mario-literacy-desktop-mvp-v1", "mario-phonetics-v1",
      "mario-bomb-game-progress-v1", "mario-book1-v1", "mario-theme-learned-v1", "mario-scenario-learning-v1", "mario-total-review-v1"];
    await page.evaluate(keys => {
      for (const key of keys) localStorage.setItem(key, JSON.stringify({ pinyinSentinel: key }));
      const writes = []; window.__pinyinWrites = writes;
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) { writes.push(key); return original.call(this, key, value); };
    }, protectedKeys);
    const read = () => page.evaluate(() => window.__PINYIN_APP__.getState());
    const current = () => page.evaluate(() => window.__PINYIN_APP__.getCurrentItem());
    const dispatch = name => page.evaluate(name => window.__PINYIN_APP__.dispatch(name), name);
    async function geometry() {
      const rects = await page.evaluate(() => {
        const card = document.getElementById("currentPinyin").getBoundingClientRect();
        const symbol = document.getElementById("pinyinSymbol").getBoundingClientRect();
        return { left: symbol.left - card.left, right: card.right - symbol.right,
          top: symbol.top - card.top, bottom: card.bottom - symbol.bottom,
          dx: (symbol.left + symbol.right - card.left - card.right) / 2,
          dy: (symbol.top + symbol.bottom - card.top - card.bottom) / 2,
          overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert.ok(rects.left >= 20 && rects.right >= 20 && rects.top >= 25 && rects.bottom >= 25, JSON.stringify(rects));
      assert.ok(Math.abs(rects.dx) <= 1.5 && Math.abs(rects.dy) <= 1.5, JSON.stringify(rects));
      assert.equal(rects.overflow, false);
    }
    assert.equal(await page.locator("#appVersionLabel").textContent(), `v${APP_VERSION}`);
    await geometry();
    if (width === 390) await page.locator("#startDaily").tap();
    else await page.locator("#startDaily").click();
    assert.equal((await current()).symbol, "b");
    assert.equal(await page.locator("#startDaily").isVisible(), false);
    assert.equal(await page.locator("#startReview").isVisible(), false);
    for (let i = 0; i < 3; i++) await page.locator("#markWrong").click();
    assert.equal((await read()).dailyNewIds.length, 3);
    const before = (await current()).id;
    await page.reload(); await page.waitForFunction(() => window.__PINYIN_APP__);
    assert.equal((await current()).id, before);
    for (let i = 0; i < 3; i++) {
      await page.locator("#markCorrect").focus(); await page.keyboard.press("Enter");
    }
    assert.equal(await current(), null); assert.equal(await page.locator("#finishNewWords").isVisible(), true);
    await page.locator("#finishNewWords").click();
    assert.equal((await read()).dailyTaskDone, true);
    await page.reload(); await page.waitForFunction(() => window.__PINYIN_APP__);
    assert.equal((await read()).dailyTaskDone, true);
    await page.locator("#startReview").click();
    assert.equal((await read()).dailyReviewIds.length, 63);
    const starred = (await current()).id;
    await page.locator("#markMastered").click(); await page.locator("#markCorrect").click();
    const resume = await read(); await page.reload(); await page.waitForFunction(() => window.__PINYIN_APP__);
    assert.equal((await read()).activeWordId, resume.activeWordId);
    assert.equal((await read()).dailyReviewIds.length, 62);
    assert.deepEqual((await read()).dailyReviewDoneIds, resume.dailyReviewDoneIds);
    await dispatch("startReview");
    assert.equal((await read()).dailyReviewIds.includes(starred), false);
    page.on("dialog", dialog => dialog.accept());
    await page.locator("#resetPinyin").click();
    assert.equal((await read()).masteredIds.length, 0);
    await page.locator("#startDaily").click();
    const seen = new Set();
    for (let i = 0; i < 63; i++) {
      const item = await current(); assert.ok(item); assert.ok(!seen.has(item.id)); seen.add(item.id);
      assert.equal(await page.locator("#pinyinSymbol").textContent(), item.symbol);
      assert.equal(await page.locator(".phonetic-examples, .phonetic-details, #pinyinLine").count(), 0);
      await geometry();
      if (["ü", "yuan"].includes(item.symbol)) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: `tmp/pinyin-${item.symbol === "ü" ? "u-umlaut" : item.symbol}-${width}.png` });
      }
      await dispatch("correct");
    }
    assert.equal(await current(), null); assert.equal(await page.locator("#finishNewWords").isVisible(), true);
    await page.locator("#finishNewWords").click(); await geometry();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: `tmp/pinyin-complete-${width}.png` });
    await dispatch("startReview");
    for (let i = 0; i < 63; i++) await dispatch("master");
    await dispatch("startReview"); assert.equal((await read()).dailyReviewIds.length, 0);
    const sentinels = await page.evaluate(keys => Object.fromEntries(keys.map(key => [key, JSON.parse(localStorage.getItem(key))])), protectedKeys);
    for (const key of protectedKeys) assert.deepEqual(sentinels[key], { pinyinSentinel: key });
    const names = ["拼音", "汉字", "Book1", "主题学习", "情景模式", "总复习", "音标"];
    // Navigation-only checks: do not run the other modules' learning/gameplay suites.
    for (const module of ["pinyin", "index", "phonetics", "book-learning", "theme-learning", "scenario-learning", "review-learning"]) {
      await page.goto(base + `${module}.html?test=pinyin-nav`);
      assert.deepEqual((await page.locator('nav[aria-label="学习模块"] > *').allTextContents()).map(text => text.trim()), names);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const last = page.locator('nav[aria-label="学习模块"] > *').last(); await last.scrollIntoViewIfNeeded();
      const box = await last.boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= width);
    }
    assert.deepEqual(errors, []);
    results.push({ width, catalog: 63, geometryCoverage: seen.size, singlePass: true, review: 63,
      masteredExclusion: true, refresh: true, isolatedStorage: true, navigationOnly: 7 });
    await context.close();
  }
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", results }));
} finally { await browser.close(); }
