import assert from "node:assert/strict";
import fs from "node:fs";
import { loadChromium } from "./playwright-runtime.mjs";
import { APP_VERSION } from "../src/constants.js";

const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
fs.mkdirSync("tmp", { recursive: true });
const results = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: width === 390 });
    await context.route("**/api/controller-mouse", route => route.fulfill({ json: { supported: false, mode: "web" } }));
    await context.addInitScript(() => {
      const keys = ["mario-hanzi-refactor-v1", "mario-literacy-desktop-mvp-v1", "mario-pinyin-v1", "mario-phonetics-v1", "mario-word-learning-v1", "mario-book1-v1", "mario-theme-learned-v1", "mario-scenario-learning-v1", "mario-total-review-v1", "mario-bomb-game-progress-v1", "mario-snake-game-progress-v1"];
      // Seed only a disposable context, before any application module loads.
      if (!sessionStorage.alphabetSentinels) {
        keys.forEach(key => localStorage.setItem(key, JSON.stringify({ alphabetSentinel: key })));
        sessionStorage.alphabetSentinels = "1";
      }
      window.alphabetWrites = [];
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (this === localStorage) window.alphabetWrites.push(key);
        return original.call(this, key, value);
      };
      window.spokenLetters = [];
      speechSynthesis.speak = utterance => window.spokenLetters.push({ text: utterance.text, lang: utterance.lang });
    });
    const page = await context.newPage(); const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    const load = async () => { await page.goto(base + "alphabet.html?test=alphabet-browser"); await page.waitForFunction(() => window.__ALPHABET_APP__); };
    const read = () => page.evaluate(() => window.__ALPHABET_APP__.getState());
    const current = () => page.evaluate(() => window.__ALPHABET_APP__.getCurrentItem());
    const dispatch = name => page.evaluate(name => window.__ALPHABET_APP__.dispatch(name), name);
    const geometry = async () => {
      const g = await page.evaluate(() => {
        const a = document.querySelector("#currentChar").getBoundingClientRect();
        const b = document.querySelector("#alphabetSymbol").getBoundingClientRect();
        return { overflow: document.documentElement.scrollWidth > innerWidth, left: b.left - a.left, right: a.right - b.right,
          top: b.top - a.top, bottom: a.bottom - b.bottom };
      });
      assert.equal(g.overflow, false, JSON.stringify(g));
      for (const field of ["left", "right", "top", "bottom"]) assert.ok(g[field] >= 12, JSON.stringify(g));
    };
    await load();
    assert.equal(await page.locator("#appVersionLabel").textContent(), `v${APP_VERSION}`);
    assert.equal(await page.locator("nav [aria-current=page]").textContent(), "字母");
    assert.equal((await page.evaluate(() => window.__ALPHABET_APP__.getItems())).length, 26);
    await geometry();
    if (width === 390) await page.locator("#startDaily").tap();
    else { await page.locator("#startDaily").focus(); await page.keyboard.press("Enter"); }
    assert.equal((await current()).symbol, "A a");
    await geometry();
    await page.locator("#currentChar").focus(); await page.keyboard.press("Space");
    await page.waitForFunction(() => window.spokenLetters.length === 1);
    assert.deepEqual(await page.evaluate(() => window.spokenLetters[0]), { text: "A", lang: "en-GB" });
    for (let n = 0; n < 3; n++) await page.locator("#markWrong").click();
    assert.equal((await read()).dailyNewIds.length, 3);
    const pending = (await current()).id;
    await page.reload(); await page.waitForFunction(() => window.__ALPHABET_APP__);
    assert.equal((await current()).id, pending);
    const other = (await read()).dailyNewIds.find(id => id !== pending);
    await page.locator(`[data-inline-id="${other}"]`).click();
    assert.equal((await current()).id, other);
    await page.locator("#markMastered").click();
    assert.equal((await current()).id, pending);
    while (await current()) await page.locator("#markCorrect").click();
    assert.equal(await page.locator("#finishNewWords").isVisible(), true);
    assert.equal((await read()).dailyTaskDone, false);
    await page.locator("#finishNewWords").click();
    assert.equal((await read()).dailyTaskDone, true);
    await page.locator("#startReview").click();
    assert.equal((await read()).dailyReviewIds.length, 25);
    const wrong = (await current()).id; await page.locator("#markWrong").click();
    const original = (await current()).id;
    for (let n = 0; n < 3; n++) {
      await page.locator(`#reviewWrongList [data-inline-id="${wrong}"]`).click();
      await page.locator("#markCorrect").click();
      assert.equal((await current()).id, original);
    }
    assert.equal((await read()).reviewWrongCorrectCounts[wrong], 3);
    await page.reload(); await page.waitForFunction(() => window.__ALPHABET_APP__);
    assert.equal((await read()).dailyReviewIds.length, 25);
    assert.equal((await current()).id, original);
    await geometry();
    await page.screenshot({ path: `tmp/alphabet-active-${width}.png`, fullPage: true });
    const before = await read();
    await page.locator("#resetAlphabet").click();
    await page.getByRole("button", { name: "取消", exact: true }).click();
    assert.deepEqual(await read(), before);
    await page.locator("#resetAlphabet").click();
    await page.keyboard.press("Escape");
    assert.deepEqual(await read(), before);
    await page.locator("#resetAlphabet").click();
    await page.getByRole("button", { name: "确定重置", exact: true }).click();
    assert.equal((await read()).masteredIds.length, 0);
    await page.locator("#startReview").click();
    assert.equal((await read()).dailyReviewIds.length, 26);
    await dispatch("nextBatch");
    for (const upper of "ABCDEFGHIJKLMNOPQRSTUVWXYZ") {
      assert.equal((await current()).upper, upper);
      await geometry();
      if (upper === "W") await page.screenshot({ path: `tmp/alphabet-wide-${width}.png`, fullPage: true });
      await dispatch("correct");
    }
    assert.equal(await current(), null);
    await page.locator("#finishNewWords").click();
    await page.locator("#startReview").click();
    assert.equal((await read()).dailyReviewIds.length, 26);
    await page.evaluate(() => {
      const app = window.__ALPHABET_APP__;
      for (let n = 0; n < 26 && app.getCurrentItem(); n++) app.dispatch("master");
    });
    assert.equal((await read()).masteredIds.length, 26);
    for (const id of ["startDaily", "startReview", "nextBatch"]) {
      await page.locator(`#${id}`).click();
      assert.match(await page.locator("#feedback").textContent(), /26 项字母均已标为/);
      assert.equal(await current(), null);
    }
    await page.reload(); await page.waitForFunction(() => window.__ALPHABET_APP__);
    assert.equal((await read()).masteredIds.length, 26);
    await geometry();
    await page.screenshot({ path: `tmp/alphabet-mastered-${width}.png`, fullPage: true });
    const saved = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith("mario-") && !key.startsWith("mario-alphabet"))));
    for (const [key, value] of Object.entries(saved)) assert.equal(value, JSON.stringify({ alphabetSentinel: key }));
    assert.ok((await page.evaluate(() => window.alphabetWrites)).every(key => key === "mario-alphabet-v1:test:alphabet-browser"));

    // Actual top-level navigation retains one shell owner and loads the alphabet frame.
    await page.goto(base + "games.html");
    await page.locator('nav [href="./alphabet.html"]').focus(); await page.keyboard.press("Enter");
    const frame = await (await page.locator("#study-module-frame").elementHandle()).contentFrame();
    await frame.waitForFunction(() => window.__ALPHABET_APP__);
    assert.equal(await frame.locator("nav [aria-current=page]").textContent(), "字母");
    assert.equal(await page.locator("#study-gamepad-cursor").count(), 1);
    assert.equal(await frame.locator("#study-gamepad-cursor").count(), 0);
    await frame.locator("#startReview").click();
    assert.equal((await frame.evaluate(() => window.__ALPHABET_APP__.getState())).dailyReviewIds.length, 26);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    results.push({ width, browser: "Microsoft Edge", learning: true, review: 26, speech: "mocked letter-name request", isolatedStorage: true, shell: true });
    await context.close();
  }
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
