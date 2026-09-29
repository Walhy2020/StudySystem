import assert from "node:assert/strict";
import { loadChromium } from "./playwright-runtime.mjs";
import { BOOK1_THEMES } from "../data/book1-themes.js";

const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const baseUrl = process.env.HANZI_BASE_URL || "http://127.0.0.1:53177/";
const errors = [];
const failed = [];
async function context(viewport, hasTouch = false) {
  const result = await browser.newContext({ viewport, hasTouch });
  await result.addInitScript(() => {
    window.__spoken = [];
    window.__writes = [];
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) { window.__writes.push(key); return original.call(this, key, value); };
    class Utterance { constructor(text) { this.text = text; } }
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: Utterance });
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: {
      cancel() {}, getVoices() { return []; },
      speak(item) { window.__spoken.push({ text: item.text, lang: item.lang }); item.onend?.(); },
    } });
  });
  return result;
}
function watch(page) {
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => { if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`); });
}
async function noOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
}
const desktop = await context({ width: 1440, height: 1000 });
const page = await desktop.newPage();
watch(page);
await page.goto(new URL("book-learning.html?test=book1-theme-desktop", baseUrl).href);
assert.deepEqual(await page.locator(".book-nav > *").allTextContents(), ["汉字", "Book1", "主题学习", "情景模式", "总复习", "音标"]);
assert.equal(await page.locator(".book-theme-card").count(), 13);
assert.equal(await noOverflow(page), true);
await page.locator('[data-theme="food"]').click();
assert.equal(await page.locator(".book-picture-choice").count(), 15);
assert.equal(await page.locator("#stageTitle").textContent(), "第一部分 · 认识单词");
await page.locator('[data-item="opw1:word-apple"]').click();
assert.equal(await page.locator(".card-word").textContent(), "apple");
assert.equal(await page.locator(".book-picture-choice.is-selected img").evaluate((image) => image.complete && image.naturalWidth > 0), true);
await page.locator('[data-action="speak"]').click();
await page.waitForTimeout(90);
assert.deepEqual(await page.evaluate(() => window.__spoken.at(-1)), { text: "apple", lang: "en-GB" });
await page.locator('[data-action="mastered"]').click();
assert.equal(await page.locator("#progressMastered").textContent(), "1");
await page.locator("#reviewStage").click();
await page.locator('[data-item="opw1:word-banana"]').click();
assert.equal(await page.locator(".card-word").count(), 0);
await page.locator('[data-action="reveal"]').click();
assert.equal(await page.locator(".card-word").textContent(), "banana");
await page.locator('[data-item="opw1:word-egg"]').click();
assert.equal(await page.locator(".card-word").count(), 0);
await page.locator("#practiceStage").click();
assert.equal(await page.locator(".book-picture-choice").count(), 4);
assert.match(await page.locator("#practiceInstruction").textContent(), /apple/);
await page.locator('[data-item="opw1:word-banana"]').click();
assert.match(await page.locator("#practiceFeedback").textContent(), /再试/);
await page.locator('[data-item="opw1:word-apple"]').click();
assert.equal(await page.locator("#nextPractice").isVisible(), true);
await page.locator("#nextPractice").click();
assert.match(await page.locator("#practiceInstruction").textContent(), /banana/);
await page.locator("#learnStage").click();
await page.locator("#completeTheme").click();
assert.equal(await page.locator("#topicProgress").textContent(), "15/15");
await page.locator("#practiceStage").click();
for (const item of BOOK1_THEMES.find((entry) => entry.id === "food").items) {
  await page.locator(`[data-item="${item.id}"]`).click();
  await page.locator("#nextPractice").click();
}
assert.equal(await page.locator("#resultPanel").isVisible(), true);
await page.locator("#restartRound").click();
assert.match(await page.locator("#practiceInstruction").textContent(), /apple/);
await page.locator("#backToThemes").click();
assert.equal(await page.locator('[data-theme="food"] .theme-check').count(), 1);
await page.reload();
assert.equal(await page.locator('[data-theme="food"] .theme-check').count(), 1);
const snapshot = await page.evaluate(() => ({ state: JSON.parse(localStorage.getItem("mario-book1-v1:test:book1-theme-desktop")), writes: window.__writes }));
assert.equal(snapshot.state.learnedIds.filter((id) => id.startsWith("opw1:word-")).length, 15);
assert.ok(snapshot.writes.every((key) => key === "mario-book1-v1:test:book1-theme-desktop"));
const assets = BOOK1_THEMES.flatMap((entry) => entry.items.filter((item) => item.image).map((item) => item.image));
assert.equal(new Set(assets).size, 104);
assert.ok((await page.evaluate(async (paths) => Promise.all(paths.map(async (path) => (await fetch(path)).status)), assets)).every((status) => status === 200));
await page.screenshot({ path: "tmp/book1-theme-desktop.png", fullPage: true });

const mobileContext = await context({ width: 390, height: 844 }, true);
const mobile = await mobileContext.newPage();
watch(mobile);
await mobile.goto(new URL("book-learning.html?test=book1-theme-mobile", baseUrl).href);
await mobile.locator('[data-theme="letters"]').tap();
assert.equal(await mobile.locator(".book-picture-choice").count(), 26);
await mobile.locator('[data-item="opw1:letter-A"]').tap();
assert.equal(await mobile.locator(".card-word").textContent(), "A");
await mobile.locator("#reviewStage").tap();
await mobile.locator('[data-item="opw1:letter-B"]').tap();
assert.equal(await mobile.locator(".card-word").count(), 0);
await mobile.locator('[data-action="reveal"]').tap();
assert.equal(await mobile.locator(".card-word").textContent(), "B");
assert.equal(await noOverflow(mobile), true);
await mobile.screenshot({ path: "tmp/book1-theme-390.png", fullPage: true });

const legacyContext = await context({ width: 900, height: 800 });
await legacyContext.addInitScript(() => localStorage.setItem("mario-literacy-english-v1", JSON.stringify({
  books: { opw1: { records: { "opw1:word-fox": { correctCount: 2 } }, masteredIds: ["opw1:word-fox"] },
    opw2: { records: { "opw2:word-ram": { correctCount: 50 } } } },
})));
const legacy = await legacyContext.newPage();
watch(legacy);
await legacy.goto(new URL("book-learning.html", baseUrl).href);
await legacy.locator('[data-theme="wild"]').click();
assert.equal(await legacy.locator("#migrationNote").isVisible(), true);
assert.equal(await legacy.locator("#progressMastered").textContent(), "1");
assert.equal((await legacy.evaluate(() => localStorage.getItem("mario-book1-v1"))).includes("opw2"), false);
assert.deepEqual(errors, []);
assert.deepEqual(failed, []);
console.log(JSON.stringify({ ok: true, themes: 13, words: 104, letters: 26, desktopOverflow: false, mobileOverflow: false, legacy: "opw1-only" }));
await browser.close();
