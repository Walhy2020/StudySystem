import assert from "node:assert/strict";
import { loadChromium } from "./playwright-runtime.mjs";

const chromium = await loadChromium();
import { BOOK1_GROUPS } from "../data/book1.js";

const baseUrl = process.env.HANZI_BASE_URL || "http://127.0.0.1:53177/";
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const errors = [];
const failedResponses = [];

async function makeContext(viewport, hasTouch = false) {
  const context = await browser.newContext({ viewport, hasTouch });
  await context.addInitScript(() => {
    window.__spoken = [];
    window.__storageWrites = [];
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) { window.__storageWrites.push(key); return setItem.call(this, key, value); };
    class FakeUtterance { constructor(text) { this.text = text; } }
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: FakeUtterance });
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: {
      cancel() {}, getVoices() { return []; }, addEventListener() {},
      speak(item) { window.__spoken.push({ text: item.text, lang: item.lang }); item.onend?.(); },
    } });
  });
  return context;
}

function watch(page) {
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`); });
}

async function noOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
}

const desktopContext = await makeContext({ width: 1440, height: 1000 });
const page = await desktopContext.newPage();
watch(page);
await page.goto(new URL("book-learning.html?test=book1-browser", baseUrl).href);
assert.deepEqual(await page.locator(".book-nav > *").allTextContents(), ["汉字", "Book1", "主题学习", "情景模式", "总复习", "音标"]);
assert.equal(await page.locator(".letter-button").count(), 26);
assert.equal(await page.locator(".group-chip").count(), 5);
assert.equal(await page.locator("#groupLabel").textContent(), "Aa");
assert.equal(await page.locator("#currentWord").textContent(), "A");
assert.equal(await noOverflow(page), true);

await page.locator("#startGroup").click();
assert.equal(await page.locator("#currentWord").textContent(), "A");
await page.locator("#markCorrect").click();
assert.equal(await page.locator("#currentWord").textContent(), "apple");
const imageLoaded = await page.locator("#bookPicture img").evaluate((image) => image.complete && image.naturalWidth > 0);
assert.equal(imageLoaded, true);
await page.locator("#speakWord").click();
await page.waitForTimeout(90);
assert.deepEqual(await page.evaluate(() => window.__spoken.at(-1)), { text: "apple", lang: "en-GB" });
await page.locator("#markWrong").click();
assert.equal(await page.locator("#progressWrong").textContent(), "1");

await page.locator('[data-group-index="23"]').click();
assert.equal(await page.locator("#groupLabel").textContent(), "Xx");
assert.deepEqual(await page.locator(".group-chip span").allTextContents(), ["X", "fox", "box", "six", "wax"]);
await page.reload();
assert.equal(await page.locator("#groupLabel").textContent(), "Xx");

const assetStatuses = await page.evaluate(async (paths) => Promise.all(paths.map(async (path) => ({ path, status: (await fetch(path)).status }))), BOOK1_GROUPS.flatMap((group) => group.words.map((word) => word.image)));
assert.ok(assetStatuses.every(({ status }) => status === 200), JSON.stringify(assetStatuses.filter(({ status }) => status !== 200)));
await page.screenshot({ path: "tests/book1-desktop.png", fullPage: true });

const mobileContext = await makeContext({ width: 390, height: 844 }, true);
const mobile = await mobileContext.newPage();
watch(mobile);
await mobile.goto(new URL("book-learning.html?test=book1-mobile", baseUrl).href);
assert.equal(await noOverflow(mobile), true);
assert.equal(await mobile.locator(".book-nav > *").count(), 6);
assert.equal(await mobile.locator(".letter-button").count(), 26);
await mobile.locator("#startGroup").tap();
await mobile.locator("#learningCard").tap();
await mobile.waitForTimeout(90);
assert.deepEqual(await mobile.evaluate(() => window.__spoken.at(-1)), { text: "a", lang: "en-GB" });
await mobile.screenshot({ path: "tests/book1-390.png", fullPage: true });

const legacyContext = await makeContext({ width: 900, height: 800 });
await legacyContext.addInitScript((legacy) => localStorage.setItem("mario-literacy-english-v1", JSON.stringify(legacy)), {
  schemaVersion: 2,
  activeBookId: "opw2",
  books: {
    opw1: { letterIndex: 23, records: { "opw1:word-fox": { correctCount: 2 } }, masteredIds: ["opw1:word-fox"] },
    opw2: { records: { "opw2:word-ram": { correctCount: 50 } }, masteredIds: ["opw2:word-ram"] },
  },
});
const legacyPage = await legacyContext.newPage();
watch(legacyPage);
await legacyPage.goto(new URL("book-learning.html", baseUrl).href);
assert.equal(await legacyPage.locator("#migrationNote").isVisible(), true);
assert.equal(await legacyPage.locator("#groupLabel").textContent(), "Xx");
assert.equal(await legacyPage.locator("#progressMastered").textContent(), "1");
const storageSnapshot = await legacyPage.evaluate(() => ({
  legacy: localStorage.getItem("mario-literacy-english-v1"),
  book1: localStorage.getItem("mario-book1-v1"),
  writes: window.__storageWrites,
}));
assert.ok(storageSnapshot.book1);
assert.equal(storageSnapshot.book1.includes("opw2"), false);
assert.equal(storageSnapshot.writes.filter((key) => key === "mario-literacy-english-v1").length, 1);

assert.deepEqual(errors, []);
assert.deepEqual(failedResponses, []);
console.log(JSON.stringify({ ok: true, groups: 26, words: 104, items: 130, desktopOverflow: false, mobileOverflow: false, legacyBook: "opw1-only" }, null, 2));
await browser.close();
