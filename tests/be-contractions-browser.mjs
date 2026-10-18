import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { loadChromium } from "./playwright-runtime.mjs";
import { BE_CONTRACTION_WORDS } from "../data/be-contractions.js";

const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const themeKey = "mario-theme-learned-v1";
mkdirSync("tmp", { recursive: true });
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const results = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 960 }, hasTouch: width === 390 });
    await context.route("**/api/controller-mouse**", route => route.fulfill({ json: { supported: false, mode: "web" } }));
    await context.addInitScript(() => {
      window.__spoken = []; window.__writes = [];
      class Utterance { constructor(text) { this.text = text; } }
      Object.defineProperty(window, "SpeechSynthesisUtterance", { value: Utterance });
      Object.defineProperty(window, "speechSynthesis", { value: {
        speak(item) { window.__spoken.push(item.text); item.onstart?.(); window.__speechTimer = setTimeout(() => item.onend?.(), 5); },
        cancel() { clearTimeout(window.__speechTimer); }, resume() {}, getVoices: () => [], addEventListener() {}, removeEventListener() {}
      } });
      if (!localStorage.getItem("mario-theme-learned-v1")) localStorage.setItem("mario-theme-learned-v1", JSON.stringify({ version: 2, learned: ["body:head"], learnedThemes: [], reviewedThemes: [] }));
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) { if (this === localStorage) window.__writes.push(key); return set.call(this, key, value); };
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    const act = selector => width === 390 ? page.locator(selector).tap() : page.locator(selector).click();
    const overflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const scene = "#beContractionsScene";
    await page.goto(`${base}theme-learning.html`);
    await page.waitForFunction(() => Boolean(window.__THEME_LEARNING__));
    await act("[data-series-id='basics']");
    await page.locator("#startBeContractions").focus(); await page.keyboard.press("Enter");
    assert.equal(await page.locator(scene).isVisible(), true);
    assert.equal(await page.locator(`${scene} .scene-target`).count(), 6);
    assert.equal(await page.evaluate(() => window.__spoken.length), 0, "entering and selecting never auto-play speech");
    for (const word of BE_CONTRACTION_WORDS) {
      await act(`${scene} [data-target='${word.id}']`);
      assert.equal(await page.locator(".word-en").textContent(), word.word);
      assert.equal(await page.locator("#phoneticToggle").textContent(), word.phonetic);
      assert.equal(await page.locator(".translation").textContent(), word.chinese);
      assert.equal(await page.locator(".sentence").textContent(), word.sentence);
      assert.equal(await page.locator(".sentence-chinese").textContent(), word.sentenceChinese);
      assert.equal(await page.locator(".contraction-equivalence").textContent(), `${word.fullForm} ↔ ${word.shortForm}`);
      assert.equal(await page.locator("#wordCard").evaluate(node => node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight), false, "answer card does not clip");
      assert.equal(await page.locator(`${scene} [data-target='${word.id}']`).evaluate(node => node.scrollWidth > node.clientWidth || node.scrollHeight > node.clientHeight), false, "form cards do not clip");
      await overflow();
    }
    assert.equal(await page.evaluate(() => window.__spoken.length), 0);
    assert.equal(await page.evaluate(() => window.__writes.length), 0, "looking alone never learns words");
    await act("#repeatWord");
    await page.waitForFunction(() => window.__spoken.length > 0);
    assert.ok((await page.evaluate(() => window.__spoken)).some(text => text.includes("It's a cat.")));
    await act(`${scene} [data-target='i-short']`);
    await act("#phoneticToggle"); assert.equal(await page.locator("#phonemeBreakdown").isVisible(), true);
    assert.deepEqual(await page.locator("#phonemeBreakdown .phoneme-chip").allTextContents(), ["aɪ", "m"]);
    await page.screenshot({ path: `tmp/be-contractions-learn-${width}.png`, fullPage: true });
    await act("#completeThemeLearning");
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), themeKey);
    assert.ok(saved.learned.includes("body:head"));
    assert.equal(saved.learned.filter(key => key.startsWith("beContractions:")).length, 6);
    assert.ok((await page.evaluate(() => window.__writes)).every(key => key === themeKey));

    await act("#reviewWordStage");
    for (const label of await page.locator(`${scene} .contraction-spelling`).evaluateAll(nodes => nodes.map(node => getComputedStyle(node).visibility))) assert.equal(label, "hidden");
    assert.equal(await page.locator(`${scene} .contraction-help`).isVisible(), false);
    await act(`${scene} [data-target='he-short']`);
    assert.equal(await page.locator(".word-en").count(), 0);
    assert.doesNotMatch(await page.locator(`${scene} [data-target='he-short']`).getAttribute("aria-label"), /He|is/);
    await act("#revealReviewWord"); assert.equal(await page.locator(".word-en").textContent(), "He's");
    await act(`${scene} [data-target='it-full']`); assert.equal(await page.locator(".word-en").count(), 0);
    await page.screenshot({ path: `tmp/be-contractions-review-${width}.png`, fullPage: true });

    await act("#practiceStage");
    assert.equal(await page.locator(`${scene} .contraction-spelling`).first().isVisible(), true);
    const targetId = await page.evaluate(() => window.__THEME_LEARNING__.session.target().id);
    const wrong = BE_CONTRACTION_WORDS.find(word => word.id !== targetId);
    await act(`${scene} [data-target='${wrong.id}']`);
    assert.equal(await page.evaluate(() => window.__THEME_LEARNING__.session.questionIndex), 0);
    assert.match(await page.locator("#practiceFeedback").textContent(), /再试一次/);
    const tested = [];
    for (let i = 0; i < 6; i++) {
      const target = await page.evaluate(() => window.__THEME_LEARNING__.session.target());
      tested.push(target.id);
      assert.equal(await page.locator("#practiceInstruction").textContent(), target.instruction);
      await act(`${scene} [data-target='${target.id}']`);
      await page.waitForFunction(i => i === 5 ? !document.getElementById("resultPanel").hidden : document.getElementById("roundProgress").textContent.startsWith(`第 ${i + 2}/`), i);
    }
    assert.equal(new Set(tested).size, 6);
    assert.equal(await page.locator("#resultScore").textContent(), "6/6");
    await overflow();
    await page.screenshot({ path: `tmp/be-contractions-complete-${width}.png`, fullPage: true });
    await page.reload(); await page.waitForFunction(() => Boolean(window.__THEME_LEARNING__));
    await act("[data-series-id='basics']");
    assert.equal(await page.locator(".contractions-card").evaluate(node => node.classList.contains("is-reviewed")), true);

    const sourceBefore = await page.evaluate(key => localStorage.getItem(key), themeKey);
    await page.goto(`${base}review-learning.html`);
    await page.waitForFunction(() => Boolean(window.__THEME_OVERVIEW__));
    const grammarPool = await page.evaluate(() => window.__THEME_OVERVIEW__.reviewSession.words.filter(word => word.themeId === "beContractions"));
    assert.equal(grammarPool.length, 6);
    await act("#openWordLibrary");
    for (const word of BE_CONTRACTION_WORDS) {
      const card = page.locator(`.library-card[data-word-key="total:${word.word.toLowerCase()}"]`);
      assert.equal(await card.locator("h3").textContent(), word.word, "canonical capitalization survives normalized library keys");
      assert.match(await card.locator(".meaning-word-art").textContent(), new RegExp(word.formLabel));
    }
    await overflow();
    assert.equal(await page.evaluate(key => localStorage.getItem(key), themeKey), sourceBefore);

    await page.goto(`${base}word-learning.html?test=be-contractions-${width}`);
    await page.waitForFunction(() => Boolean(window.__WORD_LEARNING__));
    await act("#startDaily");
    for (const word of BE_CONTRACTION_WORDS) {
      await page.evaluate(id => window.__WORD_LEARNING__.dispatch("inline", id, "catalog-test"), `word:${word.word.toLowerCase()}`);
      assert.equal(await page.locator("#wordTranslation").isVisible(), false);
      await page.locator("#wordPicture img").waitFor();
      await act("#currentWord");
      assert.equal(await page.locator("#currentWord").textContent(), word.word);
    }
    assert.equal(await page.evaluate(key => localStorage.getItem(key), themeKey), sourceBefore);
    await overflow();
    assert.deepEqual(errors, []);
    results.push({ width, forms: 6, practice: "6/6", library: grammarPool.length, saved: true, overflow: false });
    await context.close();
  }
  console.log(JSON.stringify({ browser: "Microsoft Edge", results }, null, 2));
} finally { await browser.close(); }
