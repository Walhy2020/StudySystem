import assert from "node:assert/strict";
import { FRUIT_TASTING_LINES, FRUIT_TASTING_PRACTICE, FRUIT_TASTING_VOCABULARY, scenarioById } from "../data/scenarios.js";
import { loadChromium } from "./playwright-runtime.mjs";

const scene = scenarioById("fruit-tasting");
const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const chromium = await loadChromium();
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const failures = [], results = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 960 }, hasTouch: width === 390 });
    await context.addInitScript(() => {
      window.__spoken = [];
      window.__writes = [];
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) { window.__writes.push(key); return original.call(this, key, value); };
      Object.defineProperty(window, "SpeechSynthesisUtterance", { value: class { constructor(text) { this.text = text; } } });
      Object.defineProperty(window, "speechSynthesis", { value: { cancel() {}, speak(item) { window.__spoken.push(item); }, getVoices() { return [{ lang: "en-GB" }]; } } });
    });
    const page = await context.newPage();
    page.on("pageerror", error => failures.push(error.message));
    page.on("response", response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
    const act = selector => width === 390 ? page.locator(selector).tap() : page.locator(selector).click();
    const enter = () => act('[data-scenario-id="fruit-tasting"] [data-start-label]');
    const spoken = count => page.waitForFunction(expected => window.__spoken.length === expected, count, { polling: 100 });
    const noOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.goto(new URL("scenario-learning.html", base).href);
    assert.equal(await page.locator(".scenario-card").count(), 4);
    for (const name of ["fruit-table-v2", "fruit-red-apple-v1", "fruit-yellow-lemon-v1", "fruit-green-pear-v1", "fruit-orange-v1", "fruit-banana-v1", "fruit-strawberry-v1"]) {
      const response = await page.request.get(new URL(`assets/scenarios/${name}.png?v=1.0`, base).href);
      assert.equal(response.status(), 200, name);
      assert.match(response.headers()["content-type"], /image\/png/, name);
    }
    await page.locator('[data-scenario-id="fruit-tasting"] img').evaluate(image => image.decode());
    await enter();
    assert.equal(await page.locator("#activeScenarioTitle").textContent(), "水果尝一尝 · Fruit Tasting");
    assert.equal(await page.evaluate(() => window.__spoken.length), 0, "entering the scene stays silent");
    for (const [index, item] of FRUIT_TASTING_LINES.entries()) {
      assert.equal(await page.locator("#dialogueEnglish").textContent(), item.text);
      assert.equal(await page.locator("#dialoguePhonetic").textContent(), item.phonetic);
      assert.deepEqual(await page.locator("#dialogueAligned .aligned-word strong").allTextContents(), item.tokens.map(({ text }) => text));
      assert.deepEqual(await page.locator("#dialogueAligned .aligned-word small").allTextContents(), item.tokens.map(({ phonetic }) => phonetic));
      const image = page.locator("#scenarioObjectImage");
      assert.equal(await image.getAttribute("src"), scene.focusObjects[item.focusObject].image);
      await image.evaluate(node => node.decode());
      const geometry = await image.evaluate(node => {
        const imageRect = node.getBoundingClientRect(), stageRect = document.querySelector("#actorStage").getBoundingClientRect();
        return { size: [node.naturalWidth, node.naturalHeight], fit: getComputedStyle(node).objectFit,
          contained: imageRect.left >= stageRect.left && imageRect.right <= stageRect.right && imageRect.top >= stageRect.top && imageRect.bottom <= stageRect.bottom,
          readable: imageRect.width >= 125,
          ipaBelow: [...document.querySelectorAll("#dialogueAligned .aligned-word")].every(word => word.querySelector("small").getBoundingClientRect().top >= word.querySelector("strong").getBoundingClientRect().bottom - 1) };
      });
      assert.deepEqual(geometry, { size: [1254, 1254], fit: "contain", contained: true, readable: true, ipaBelow: true });
      await noOverflow();
      if (index % 6 === 1) await page.screenshot({ path: `tests/scenario-fruit-${item.focusObject}-${width}.png`, fullPage: true });
      if (index < FRUIT_TASTING_LINES.length - 1) {
        const before = await page.evaluate(() => window.__spoken.length);
        await act("#nextLine");
        await spoken(before + 1);
        await page.evaluate(() => window.__spoken.at(-1).onend?.());
      }
    }
    await page.reload();
    await enter();
    assert.equal(await page.locator("#dialogueProgress").textContent(), "36/36", "refresh restores the current fruit line");
    await act("#practiceStage");
    for (const [index, question] of FRUIT_TASTING_PRACTICE.entries()) {
      await page.waitForFunction(expected => document.querySelector("#practiceProgress").textContent === expected, `${index + 1}/18`);
      const prompt = scene.lines.find(({ id }) => id === question.promptId);
      const image = page.locator("#countingPracticeImage");
      assert.equal(await image.getAttribute("src"), scene.focusObjects[prompt.focusObject].image);
      await image.evaluate(node => node.decode());
      assert.equal(await image.isVisible(), true);
      await act(`[data-answer-id="${question.optionIds.find(id => id !== question.answerId)}"]`);
      assert.equal(await page.locator("#practiceProgress").textContent(), `${index + 1}/18`, "wrong answer does not advance");
      await act(`[data-answer-id="${question.answerId}"]`);
    }
    await page.locator("#practiceResult").waitFor({ state: "visible" });
    assert.equal(await page.locator("#practiceResultScore").textContent(), "18/18");
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem("mario-scenario-learning-v1")).learnedWords), [], "practice completion does not auto-learn words");
    await page.screenshot({ path: `tests/scenario-fruit-practice-${width}.png`, fullPage: true });
    await act("#returnAfterComplete");
    assert.equal(await page.locator('[data-scenario-id="fruit-tasting"] [data-complete-badge]').isVisible(), true);
    await enter();
    await act("#wordsStage");
    assert.equal(await page.locator(".scenario-word-card").count(), FRUIT_TASTING_VOCABULARY.length);
    for (const word of ["pear", "sour", "crisp", "strawberry"]) await act(`[data-word="${word}"] button:last-child`);
    assert.equal(await page.locator(".scenario-word-card").count(), FRUIT_TASTING_VOCABULARY.length - 4);
    assert.ok((await page.evaluate(() => window.__writes)).every(key => key === "mario-scenario-learning-v1"));
    await page.goto(new URL("review-learning.html", base).href);
    await act("#openWordLibrary");
    assert.equal(await page.locator("#wordLibraryCount").textContent(), "4/239");
    const pear = page.locator('[data-word-key="total:pear"] img');
    assert.equal(await pear.getAttribute("src"), scene.focusObjects.pear.image);
    await pear.evaluate(node => node.decode());
    const strawberry = page.locator('[data-word-key="total:strawberry"] img');
    assert.equal(await strawberry.getAttribute("src"), scene.focusObjects.strawberry.image);
    await strawberry.evaluate(node => node.decode());
    await noOverflow();
    results.push({ width, lines: 36, questions: 18, fruitImages: 7, learnedWords: 4, noOverflow: true });
    await context.close();
  }
  assert.deepEqual(failures, []);
  console.log(JSON.stringify({ ok: true, surface: "Microsoft Edge", results }, null, 2));
} finally {
  await browser.close();
}
