import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const { chromium } = await import(pathToFileURL(join(homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs")));
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const baseUrl = process.env.HANZI_BASE_URL || "http://127.0.0.1:53177/";
const errors = [];

async function openTheme(page, series, theme) {
  await page.locator(`[data-series-id="${series}"]`).click();
  await page.locator(`[data-theme-id="${theme}"]`).click();
}

async function checkViewport(viewport) {
  const context = await browser.newContext({ viewport, hasTouch: viewport.width === 390 });
  await context.addInitScript(() => {
    window.__spoken = [];
    class FakeUtterance { constructor(text) { this.text = text; } }
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: FakeUtterance });
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: {
      cancel() {}, resume() {}, getVoices() { return []; }, addEventListener() {},
      speak(item) { window.__spoken.push(item.text); item.onend?.(); },
    } });
  });
  const page = await context.newPage();
  const select = async (locator) => viewport.width === 390 ? locator.tap() : locator.click();
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto(new URL("theme-learning.html", baseUrl).href);
  await openTheme(page, "basics", "body");
  await page.locator('[data-theme="body"] [data-target="head"]').click();
  assert.equal(await page.locator("#wordCard .word-en").textContent(), "head");
  const seenBefore = await page.evaluate(() => window.__THEME_LEARNING__.session.seen.size);
  await page.locator("#reviewWordStage").click();
  assert.equal(await page.locator("#stageTitle").textContent(), "第二部分 · 复习单词");
  assert.equal(await page.locator("#wordCard .word-en").count(), 0);
  assert.equal(await page.locator("#completeThemeLearning").isVisible(), false);
  const storageBefore = await page.evaluate(() => JSON.stringify({ ...localStorage }));
  const spokenBefore = await page.evaluate(() => window.__spoken.length);
  const head = page.locator('[data-theme="body"] [data-target="head"]');
  assert.match(await head.getAttribute("aria-label"), /^目标 6/);
  await select(head);
  assert.equal(await page.locator("#revealReviewWord").isVisible(), true);
  assert.equal(await page.locator("#wordCard .word-en, #wordCard .phonetic, #wordCard .translation, #wordCard .sentence").count(), 0);
  assert.doesNotMatch(await page.locator("#scenePrompt").textContent(), /head|头/);
  await mkdir("output", { recursive: true });
  await page.screenshot({ path: `output/theme-word-review-${viewport.width}.png`, fullPage: true });
  await select(page.locator("#revealReviewWord"));
  assert.equal(await page.locator("#wordCard .word-en").textContent(), "head");
  assert.equal(await page.locator("#wordCard .phonetic").isVisible(), true);
  await select(page.locator('[data-theme="body"] [data-target="hand"]'));
  assert.equal(await page.locator("#wordCard .word-en").count(), 0);
  await page.locator("#revealReviewWord").click();
  assert.equal(await page.locator("#wordCard .word-en").textContent(), "hand");
  await page.locator("#previousWord").click();
  assert.equal(await page.locator("#wordCard .word-en").count(), 0);
  assert.equal(await page.locator("#revealReviewWord").isVisible(), true);
  await page.locator('[data-theme="body"] [data-target="hand"]').focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("#wordCard .word-en").count(), 0);
  await page.locator("#revealReviewWord").focus();
  await page.keyboard.press("Space");
  assert.equal(await page.locator("#wordCard .word-en").textContent(), "hand");
  assert.equal(await page.evaluate(() => window.__THEME_LEARNING__.session.seen.size), seenBefore);
  assert.equal(await page.evaluate(() => JSON.stringify({ ...localStorage })), storageBefore);
  assert.equal(await page.evaluate(() => window.__spoken.length), spokenBefore);
  if (viewport.width === 390) {
    const order = await page.evaluate(() => {
      const scene = document.querySelector("#characterPanel").getBoundingClientRect();
      const card = document.querySelector("#learnPanel").getBoundingClientRect();
      return scene.top < card.top;
    });
    assert.equal(order, true, "mobile review presents the image before the answer panel");
  }
  await page.locator("#learnStage").click();
  assert.equal(await page.locator("#completeThemeLearning").isVisible(), true);
  assert.equal(await head.getAttribute("aria-label"), "头 head");
  await page.locator("#practiceStage").click();
  assert.equal(await page.locator("#stageTitle").textContent(), "第三部分 · 互动练习");
  assert.equal(await page.locator("#practicePanel").isVisible(), true);

  await page.locator("#backToThemes").click();
  await page.locator("#backToSeries").click();
  await openTheme(page, "counting", "numbers1");
  await page.locator("#reviewWordStage").click();
  assert.equal(await page.locator(".counting-word:visible").count(), 0);
  await page.locator('[data-theme="numbers1"] [data-target="one"]').click();
  assert.equal(await page.locator("#wordCard .word-en").count(), 0);
  await page.locator("#revealReviewWord").click();
  assert.equal(await page.locator("#wordCard .word-en").textContent(), "one");

  await page.locator("#backToThemes").click();
  await page.locator('[data-theme-id="ordinals"]').click();
  await page.locator("#reviewWordStage").click();
  assert.equal(await page.locator(".ordinal-target span:visible").count(), 0);
  await page.locator('[data-theme="ordinals"] [data-target="first"]').click();
  assert.equal(await page.locator("#wordCard .word-en").count(), 0);
  await page.locator("#revealReviewWord").click();
  assert.equal(await page.locator("#wordCard .word-en").textContent(), "first");

  await page.locator("#backToThemes").click();
  await page.locator("#backToSeries").click();
  await openTheme(page, "songs", "twinkle");
  await page.locator("#reviewWordStage").click();
  assert.equal(await page.locator(".song-word-target strong:visible, .song-lyrics:visible, #speakSongLyrics:visible").count(), 0);
  await page.locator('[data-theme="twinkle"] [data-target="star"]').click();
  assert.equal(await page.locator("#wordCard .word-en").count(), 0);
  await page.locator("#revealReviewWord").click();
  assert.equal(await page.locator("#wordCard .word-en").textContent(), "star");
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
  await context.close();
}

try {
  await checkViewport({ width: 1440, height: 900 });
  await checkViewport({ width: 390, height: 844 });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, viewports: [1440, 390], modes: ["learn", "review", "practice"], examples: ["body", "numbers1", "ordinals", "twinkle"] }));
} finally {
  await browser.close();
}
