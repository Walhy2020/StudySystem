import assert from "node:assert/strict";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const { chromium } = await import(pathToFileURL(join(homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs")));
const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:53177/";
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const errors = [], apiCalls = [], results = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 960 }, hasTouch: width === 390 });
    await context.addInitScript(() => {
      window.__writes = []; window.__spoken = [];
      const setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) { window.__writes.push(key); return setItem.call(this, key, value); };
      Object.defineProperty(window, "speechSynthesis", { value: { cancel() {}, speak(u) { window.__spoken.push(u.text); } } });
      Object.defineProperty(window, "SpeechSynthesisUtterance", { value: class { constructor(text) { this.text = text; } } });
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    page.on("request", (request) => { if (request.url().includes("/api/")) apiCalls.push(request.url()); });
    await page.goto(new URL(`scenario-learning.html?test=workshop-${width}`, base).href);
    assert.equal(await page.locator("#openScenarioCreator, textarea, #generateScenario").count(), 0);
    assert.equal(await page.locator(".kid, .full-kid, .meeting-place").count(), 0);
    async function checkImage(selector) {
      const node = page.locator(selector);
      await node.evaluate((img) => img.decode());
      const actual = await node.evaluate((img) => {
        const box = img.getBoundingClientRect();
        return { w: img.naturalWidth, h: img.naturalHeight, fit: getComputedStyle(img).objectFit,
          full: Math.abs(box.width-box.height) < 1.5 && box.left >= 0 && box.right <= innerWidth };
      });
      assert.deepEqual(actual, { w: 1254, h: 1254, fit: "contain", full: true });
    }
    assert.equal(await page.locator(".scene-preview img").count(), 2);
    for (let index = 0; index < 2; index += 1) await checkImage(`.scene-preview img >> nth=${index}`);
    await page.screenshot({ path: `tests/scenario-cover-${width}.png`, fullPage: true });
    await page.locator('[data-scenario-id="first-meeting"] [data-start-label]').click();
    for (const id of ["actorMia", "actorLeo"]) {
      await page.locator(`#${id}`).evaluate((img) => img.decode());
      assert.equal(await page.locator(`#${id}`).evaluate((img) => img.naturalHeight > 500 && getComputedStyle(img).objectFit === "contain"), true);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: `tests/scenario-art-${width}.png`, fullPage: true });
    await page.locator("#wordsStage").click();
    assert.equal(await page.locator(".scenario-word-card").count(), 16);
    assert.equal(await page.locator('[data-word="marker"]').count(), 0);
    assert.equal(await page.evaluate(() => window.__spoken.length), 0);
    await page.locator('[data-word="hello"] button').first().click();
    await page.waitForTimeout(100);
    assert.deepEqual(await page.evaluate(() => window.__spoken), ["hello"]);
    await page.locator('[data-word="hello"] button').last().focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator(".scenario-word-card").count(), 15);
    await page.reload();
    await page.locator('[data-scenario-id="first-meeting"] [data-start-label]').click();
    await page.locator("#wordsStage").click();
    assert.equal(await page.locator(".scenario-word-card").count(), 15);
    await page.locator("#showLearnedScenarioWords").check();
    assert.equal(await page.locator('[data-word="hello"]').count(), 1);
    await page.locator('[data-word="hello"] button').last().click();
    await page.locator("#showLearnedScenarioWords").uncheck();
    assert.equal(await page.locator(".scenario-word-card").count(), 16);
    await page.evaluate((testWidth) => {
      localStorage.setItem(`mario-book1-v1:test:workshop-${testWidth}`, JSON.stringify({ learnedIds: ["opw1:word-pen"] }));
      window.__writes = [];
    }, width);
    await page.locator("#backToScenarios").click();
    await page.locator('[data-scenario-id="what-is-it"] [data-start-label]').click();
    await page.locator("#wordsStage").click();
    assert.equal(await page.locator(".scenario-word-card").count(), 18);
    assert.equal(await page.locator('[data-word="hello"]').count(), 0);
    assert.equal(await page.locator('[data-word="pen"]').count(), 0, "Book1 已学词必须按总单词库判定为非新词");
    assert.match(await page.locator('[data-word="marker"] .word-source').textContent(), /这是什么/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.ok((await page.evaluate(() => window.__writes)).every((key) => key === `mario-scenario-learning-v1:test:workshop-${width}`));
    await page.screenshot({ path: `tests/scenario-words-${width}.png`, fullPage: true });
    await page.locator("#backToScenarios").click();
    assert.equal(await page.locator("#scenarioPicker").isVisible(), true);
    results.push({ width, noOverflow: true, imageFull: true, learnedWordsPreserved: true });
    await context.close();
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(apiCalls, []);
  console.log(JSON.stringify({ ok: true, surface: "Microsoft Edge", apiCalls: 0, results }, null, 2));
} finally { await browser.close(); }
