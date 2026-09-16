import assert from "node:assert/strict";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { COUNTING_LINES, COUNTING_PRACTICE, COUNTING_VOCABULARY, scenarioById } from "../data/scenarios.js";
const scene = scenarioById("counting-pens");
const { chromium } = await import(pathToFileURL(join(homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs")));
const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:53177/";
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const errors = [], results = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 960 }, hasTouch: width === 390 });
    await context.addInitScript(() => {
      window.__spoken = []; window.__writes = [];
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(k, v) { window.__writes.push(k); return original.call(this, k, v); };
      Object.defineProperty(window, "SpeechSynthesisUtterance", { value: class { constructor(text) { this.text = text; } } });
      Object.defineProperty(window, "speechSynthesis", { value: { cancel() {}, speak(u) { window.__spoken.push(u); }, getVoices() { return [{ lang: "en-GB" }]; } } });
    });
    const page = await context.newPage();
    page.on("pageerror", e => errors.push(e.message));
    page.on("response", r => { if (r.status() >= 400) errors.push(r.status() + " " + r.url()); });
    const act = async selector => width === 390 ? page.locator(selector).tap() : page.locator(selector).click();
    const enter = () => act('[data-scenario-id="counting-pens"] [data-start-label]');
    const count = () => page.evaluate(() => window.__spoken.length);
    const spoken = n => page.waitForFunction(n => window.__spoken.length === n, n, { polling: 100 });
    const finish = () => page.evaluate(() => window.__spoken.at(-1).onend?.());
    const noOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    // A fresh browser context isolates normal keys and exercises the actual cross-page flow.
    await page.goto(new URL("scenario-learning.html", base).href);
    assert.equal(await page.locator(".scenario-card").count(), 3);
    const response = await page.request.get(new URL("assets/scenarios/counting-pens-v1.png?v=1.0", base).href);
    assert.equal(response.status(), 200);
    assert.match(response.headers()["content-type"], /image\/png/);
    await enter();
    assert.equal(await count(), 0, "entry remains silent");
    await page.locator("#scenarioObjectImage").evaluate(img => img.decode());
    for (let i = 0; i < COUNTING_LINES.length; i++) {
      assert.equal(await page.locator("#dialogueEnglish").textContent(), COUNTING_LINES[i].text);
      await page.locator("#scenarioObjectImage").evaluate(img => img.decode());
      assert.equal(await page.locator("#scenarioObjectImage").getAttribute("src"), scene.focusObjects[COUNTING_LINES[i].focusObject].image);
      assert.deepEqual(await page.locator("#dialogueAligned .aligned-word strong").allTextContents(), COUNTING_LINES[i].tokens.map(x => x.text));
      assert.deepEqual(await page.locator("#dialogueAligned .aligned-word small").allTextContents(), COUNTING_LINES[i].tokens.map(x => x.phonetic));
      const geometry = await page.locator("#scenarioObjectImage").evaluate(img => {
        const r = img.getBoundingClientRect(), s = document.querySelector("#actorStage").getBoundingClientRect();
        return { width: img.naturalWidth, height: img.naturalHeight, fit: getComputedStyle(img).objectFit,
          inside: r.left >= s.left && r.right <= s.right && r.top >= s.top && r.bottom <= s.bottom,
          readable: r.width >= 165, square: Math.abs(r.width-r.height) <= 1,
          ipaBelow: [...document.querySelectorAll("#dialogueAligned .aligned-word")].every(x => x.querySelector("small").getBoundingClientRect().top >= x.querySelector("strong").getBoundingClientRect().bottom - 1) };
      });
      assert.deepEqual(geometry, { width: 1254, height: 1254, fit: "contain", inside: true, readable: true, square: true, ipaBelow: true });
      await noOverflow();
      if (i % 4 === 3) await page.screenshot({ path: `tests/scenario-counting-${COUNTING_LINES[i].focusObject}-${width}.png`, fullPage: true });
      if (i < COUNTING_LINES.length - 1) { const n = await count(); await act("#nextLine"); await spoken(n + 1); await finish(); }
    }
    await page.reload(); await enter();
    assert.equal(await page.locator("#dialogueProgress").textContent(), "24/24", "refresh restores current line");
    await act("#replayDialogue"); await spoken(1); await finish();
    assert.equal(await page.locator("#dialogueProgress").textContent(), "1/24");
    await act("#continuousDialogue");
    for (let i = 0; i < COUNTING_LINES.length; i++) { await spoken(i + 2); assert.equal(await page.evaluate(() => window.__spoken.at(-1).text), COUNTING_LINES[i].text); await finish(); }
    assert.equal(await page.locator("#nextLine").isDisabled(), true);
    await page.screenshot({ path: `tests/scenario-counting-${width}.png`, fullPage: true });
    await act("#practiceStage");
    for (const [i, question] of COUNTING_PRACTICE.entries()) {
      await page.waitForFunction(text => document.querySelector("#practiceProgress").textContent === text, `${i + 1}/12`, { polling: 100 });
      const line = COUNTING_LINES.find(x => x.id === question.promptId);
      assert.equal(await page.locator("#countingPracticeImage").getAttribute("src"), scene.focusObjects[line.focusObject].image);
      await page.locator("#countingPracticeImage").evaluate(img => img.decode());
      assert.equal(await page.locator("#countingPracticeImage").isVisible(), true);
      await act(`[data-answer-id="${question.optionIds.find(x => x !== question.answerId)}"]`);
      assert.equal(await page.locator("#practiceProgress").textContent(), `${i + 1}/12`, "wrong answer must not advance");
      await noOverflow();
      if (i === 10) await page.screenshot({ path: `tests/scenario-counting-practice-${width}.png`, fullPage: true });
      await act(`[data-answer-id="${question.answerId}"]`);
    }
    await page.locator("#practiceResult").waitFor({ state: "visible" });
    assert.equal(await page.locator("#practiceResultScore").textContent(), "12/12");
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem("mario-scenario-learning-v1")).learnedWords), []);
    await act("#returnAfterComplete");
    assert.equal(await page.locator('[data-scenario-id="counting-pens"] [data-complete-badge]').isVisible(), true);
    assert.equal(await page.locator('[data-scenario-id="first-meeting"] [data-complete-badge]').isHidden(), true);
    await enter(); await act("#wordsStage");
    assert.equal(await page.locator(".scenario-word-card").count(), COUNTING_VOCABULARY.length);
    await page.locator('[data-word="pens"] button').last().focus(); await page.keyboard.press("Enter");
    assert.equal(await page.locator(".scenario-word-card").count(), COUNTING_VOCABULARY.length - 1);
    await page.reload(); await enter(); await act("#wordsStage");
    assert.equal(await page.locator('[data-word="pens"]').count(), 0);
    for (const word of ["keys", "mushrooms", "coins", "stars"]) {
      await page.locator(`[data-word="${word}"] button`).last().click();
    }
    assert.ok((await page.evaluate(() => window.__writes)).every(k => k === "mario-scenario-learning-v1"));
    await page.goto(new URL("review-learning.html", base).href);
    await act("#openWordLibrary");
    assert.equal(await page.locator('[data-word-key="total:pens"]').count(), 1);
    assert.equal(await page.locator("#wordLibraryCount").textContent(), "5/223");
    for (const [word, objectId] of Object.entries({ keys: "two-keys", mushrooms: "four-mushrooms", coins: "five-coins", stars: "six-stars" })) {
      const image = page.locator(`[data-word-key="total:${word}"] img`);
      assert.equal(await image.getAttribute("src"), scene.focusObjects[objectId].image);
      await image.evaluate(img => img.decode());
      assert.equal(await image.evaluate(img => getComputedStyle(img).objectFit), "contain");
    }
    await noOverflow();
    results.push({ width, lines: COUNTING_LINES.length, questions: COUNTING_PRACTICE.length, groups: 6, refresh: true, learnedWordInLibrary: true, asset: "1254x1254", noOverflow: true });
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, surface: "Microsoft Edge", results }, null, 2));
} finally { await browser.close(); }
