// Transport fixtures, not a claim of live AI generation. Real Edge renders the UI.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "file:///C:/Users/St/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import { BOOK1_ITEMS } from "../data/book1.js";
const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:53177/";
const png = await readFile(new URL("../assets/themes/colors/colors-scene-v2.png", import.meta.url));
const fixture = { id: "browser-fixture-1", title: "对话生成流程验收（模拟配图）", image: "/api/scenarios/images/browser-fixture-1.png", lines: [
  { speaker: "Mia", text: "A red apple.", phonetic: "/ə red ˈæpəl/", chinese: "一个红苹果。" },
  { speaker: "Leo", text: "Yes!", phonetic: "/jes/", chinese: "是的！" },
], vocabulary: [
  { word: "a", phonetic: "/ə/", chinese: "一个" }, { word: "red", phonetic: "/red/", chinese: "红色" },
  { word: "apple", phonetic: "/ˈæpəl/", chinese: "苹果" }, { word: "yes", phonetic: "/jes/", chinese: "是的" },
] };
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const errors = [];
const results = [];
try {
  for (const width of [1440, 390]) {
    const suffix = `:test:workshop-${width}`;
    const context = await browser.newContext({ viewport: { width, height: 960 }, hasTouch: width === 390 });
    const apple = BOOK1_ITEMS.find((item) => item.word === "apple" && item.type === "word");
    await context.addInitScript(({ suffix, appleId }) => {
      const seeded = sessionStorage.getItem("test-seeded");
      if (!seeded) {
        localStorage.setItem("mario-theme-learned-v1" + suffix, JSON.stringify({ version: 2, learned: ["colors:red"] }));
        localStorage.setItem("mario-book1-v1" + suffix, JSON.stringify({ learnedIds: [appleId] }));
        sessionStorage.setItem("test-seeded", "true");
      }
      window.__writes = []; window.__spoken = [];
      const setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) { window.__writes.push(key); return setItem.call(this, key, value); };
      Object.defineProperty(window, "speechSynthesis", { value: { cancel() {}, speak(u) { window.__spoken.push(u.text); } } });
      Object.defineProperty(window, "SpeechSynthesisUtterance", { value: class { constructor(text) { this.text = text; } } });
    }, { suffix, appleId: apple.id });
    let saved = [], posts = 0, fail = false, configured = true;
    await context.route("**/api/scenarios**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith(".png")) return route.fulfill({ contentType: "image/png", body: png });
      let value;
      if (path.endsWith("/config")) value = { configured, token: "fixture-token" };
      else if (path.endsWith("/generate")) {
        assert.equal(route.request().headers()["x-scenario-token"], "fixture-token"); posts++;
        value = { id: "browser-fixture-1" };
      } else if (path.includes("/jobs/")) value = fail ? { state: "failed", message: "API Key 无效或已失效。" } : { state: "ready", message: "模拟生成完成", lesson: fixture };
      else if (path.endsWith("/save")) { saved = [fixture]; value = { lesson: fixture }; }
      else value = { lessons: saved };
      await route.fulfill({ contentType: "application/json", body: JSON.stringify(value) });
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await page.goto(new URL(`scenario-learning.html?test=workshop-${width}`, base).href);
    await page.waitForFunction(() => document.querySelector("#scenarioWordCount").textContent === "16");
    await page.locator("#openScenarioWords").click();
    assert.equal(await page.locator(".scenario-word-card").count(), 16);
    assert.equal(await page.evaluate(() => window.__spoken.length), 0);
    await page.locator('[data-word="hello"] button').first().click();
    await page.waitForTimeout(100);
    assert.deepEqual(await page.evaluate(() => window.__spoken), ["hello"]);
    await page.locator('[data-word="hello"] button').last().focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator(".scenario-word-card").count(), 15);
    await page.reload();
    await page.locator("#openScenarioWords").click();
    assert.equal(await page.locator(".scenario-word-card").count(), 15);
    await page.locator("#showLearnedScenarioWords").check();
    assert.equal(await page.locator('[data-word="hello"]').count(), 1);
    await page.locator("#showLearnedScenarioWords").uncheck();
    await page.screenshot({ path: `tests/scenario-words-${width}.png`, fullPage: true });
    await page.locator("#openScenarioCreator").click();
    const input = "Mia: A red apple.\nLeo: Yes!";
    await page.locator("#scenarioDialogueInput").fill(input);
    await page.locator("#generateScenario").click();
    await page.locator("#saveGeneratedScenario").waitFor({ state: "visible" });
    assert.equal(posts, 1);
    assert.equal(saved.length, 0, "preview must not autosave");
    assert.equal(await page.locator("#generatedPreview .generated-dialogue-line").count(), 2);
    const image = page.locator("#generatedPreview img");
    await image.evaluate((img) => img.decode());
    const geometry = await image.evaluate((img) => ({ width: img.naturalWidth, height: img.naturalHeight, fit: getComputedStyle(img).objectFit }));
    assert.deepEqual(geometry, { width: 1536, height: 1024, fit: "contain" });
    await page.locator("#saveGeneratedScenario").click();
    await page.waitForFunction(() => document.querySelector("#generationStatus").textContent.includes("已保存到本机"));
    await page.reload();
    await page.locator(".custom-scenario-card button").waitFor();
    await page.locator(".custom-scenario-card button").click();
    assert.equal(await page.locator("#customScenarioLesson .generated-dialogue-line").count(), 2);
    assert.equal(await page.locator("#customScenarioLesson .lesson-word-breakdown>div").count(), 4);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator("#customScenarioLesson img").evaluate((img) => img.decode());
    assert.equal(await page.locator("#customScenarioLesson img").evaluate((img) => {
      const box = img.getBoundingClientRect();
      return Math.abs(box.width / box.height - 1.5) < .02 && box.left >= 0 && box.right <= innerWidth;
    }), true);
    await page.locator("#openScenarioWords").click();
    assert.equal(await page.locator(".scenario-word-card").count(), 17);
    assert.equal(await page.locator('[data-word="red"], [data-word="apple"]').count(), 0);
    assert.equal(await page.locator('[data-word="a"], [data-word="yes"]').count(), 2);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.ok((await page.evaluate(() => window.__writes)).every((key) => key === "mario-scenario-learning-v1" + suffix));
    // New form failure preserves user input and does not create a second scenario.
    fail = true;
    await page.locator("#openScenarioCreator").click();
    await page.locator("#scenarioDialogueInput").fill(input);
    await page.locator("#generateScenario").click();
    await page.waitForFunction(() => document.querySelector("#generationStatus").textContent.includes("API Key"));
    assert.equal(await page.locator("#scenarioDialogueInput").inputValue(), input);
    assert.equal(saved.length, 1);
    configured = false;
    await page.goto(new URL(`scenario-learning.html?test=workshop-${width}`, base).href);
    await page.locator("#openScenarioCreator").click();
    await page.waitForFunction(() => document.querySelector("#generationStatus").textContent.includes("OPENAI_API_KEY"));
    assert.equal(await page.locator("#generateScenario").isDisabled(), true);
    await page.screenshot({ path: `tests/scenario-creator-${width}.png`, fullPage: true });
    results.push({ width, storageIsolated: true, imageContained: true, noOverflow: true });
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, surface: "Microsoft Edge", api: "mocked; no paid calls", results }, null, 2));
} finally { await browser.close(); }
