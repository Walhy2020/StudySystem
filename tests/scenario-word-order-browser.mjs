import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { loadChromium } from "./playwright-runtime.mjs";
import { SCENARIOS } from "../data/scenarios.js";

const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
mkdirSync("tmp", { recursive: true });
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 960 }, hasTouch: width === 390 });
    await context.route("**/api/controller-mouse**", route => route.fulfill({ json: { supported: false, mode: "web" } }));
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    const namespace = `word-order-${width}`, key = `mario-scenario-learning-v1:test:${namespace}`;
    await page.goto(`${base}scenario-learning.html?test=${namespace}`);
    await page.evaluate(() => {
      window.__writes = [];
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) { if (this === localStorage) __writes.push(key); return set.call(this, key, value); };
    });
    const act = selector => width === 390 ? page.locator(selector).tap() : page.locator(selector).click();
    const seen = new Set(), introduced = [];
    for (const scene of SCENARIOS) {
      await act(`[data-scenario-id='${scene.id}'] [data-start-label]`);
      await act("#wordsStage");
      const expected = [...new Set(scene.vocabulary.map(item => item.word.trim().toLowerCase()))].filter(word => !seen.has(word));
      const actual = await page.locator(".scenario-word-card").evaluateAll(nodes => nodes.map(node => node.dataset.word));
      assert.deepEqual(actual, expected, scene.id);
      assert.equal(Number(await page.locator("#scenarioWordCount").textContent()), expected.length);
      await page.locator("#showLearnedScenarioWords").check();
      assert.deepEqual(await page.locator(".scenario-word-card").evaluateAll(nodes => nodes.map(node => node.dataset.word)), expected, "show learned must not reintroduce earlier scenarios' words");
      await page.locator("#showLearnedScenarioWords").uncheck();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      for (const word of scene.vocabulary) seen.add(word.word.trim().toLowerCase());
      introduced.push(...actual);
      if (scene.id === "drinking-water") await page.screenshot({ path: `tmp/scenario-word-order-${width}.png`, fullPage: true });
      await act("#backToScenarios");
    }
    assert.equal(new Set(introduced).size, introduced.length);
    assert.equal(introduced.length, seen.size);
    assert.ok((await page.evaluate(() => __writes)).every(writtenKey => writtenKey === key));
    // Learning/unlearning and refresh retain ownership and existing progress.
    await act("[data-scenario-id='first-meeting'] [data-start-label]");
    await act("#wordsStage");
    await act("[data-word='hello'] button:last-child");
    assert.equal(await page.locator("[data-word='hello']").count(), 0);
    await page.reload();
    await act("[data-scenario-id='first-meeting'] [data-start-label]");
    await act("#wordsStage");
    assert.equal(await page.locator("[data-word='hello']").count(), 0);
    await page.locator("#showLearnedScenarioWords").check();
    await act("[data-word='hello'] button:last-child");
    assert.equal(await page.locator("[data-word='hello']").count(), 1);
    assert.ok((await page.evaluate(k => JSON.parse(localStorage.getItem(k)), key)).scenarioProgress);
    assert.deepEqual(errors, []);
    console.log(`PASS Edge ${width}: ${SCENARIOS.length} scenarios, ${introduced.length} unique new words, learning/reload preserved`);
    await context.close();
  }
} finally { await browser.close(); }
