import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { loadChromium } from "./playwright-runtime.mjs";
const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
mkdirSync("tmp", { recursive: true });
const browser = await (await loadChromium()).launch({ headless: true, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const results = [];
try {
  for (const width of [1440, 827, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 960 }, hasTouch: width === 390 });
    await context.route("**/api/controller-mouse**", route => route.fulfill({ json: { supported: false, mode: "web" } }));
    await context.addInitScript(() => {
      window.requestAnimationFrame = () => 0;
      window.__pad = { connected: true, mapping: "standard", id: "Words test controller", index: 0, axes: [0,0,0,0], buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })) };
      Object.defineProperty(navigator, "getGamepads", { value: () => [window.__pad] });
      window.__speechCalls = 0;
      speechSynthesis.speak = () => { window.__speechCalls++; };
      for (const key of ["mario-hanzi-refactor-v1", "mario-phonetics-v1", "mario-pinyin-v1", "mario-book1-v1", "mario-theme-learned-v1", "mario-scenario-learning-v1", "mario-total-review-v1"]) {
        if (!localStorage.getItem(key)) localStorage.setItem(key, "source-sentinel");
      }
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    const act = selector => width === 390 ? page.locator(selector).tap() : page.locator(selector).click();
    const state = () => page.evaluate(() => window.__WORD_LEARNING__.getState());
    await page.goto(base + `word-learning.html?test=words-${width}`);
    await page.waitForFunction(() => Boolean(window.__WORD_LEARNING__));
    const catalog = await page.evaluate(() => window.__WORD_LEARNING__.getItems());
    assert.ok(catalog.length >= 278); assert.equal(new Set(catalog.map(item => item.word)).size, catalog.length);
    assert.equal(await page.locator("#wordPicture img,#wordPicture svg").count(), 0);
    // Reuse the actual Hanzi geometry, rather than an independently sized layout.
    const reference = await browser.newContext({ viewport: { width, height: 960 } });
    const hanzi = await reference.newPage();
    await hanzi.goto(base + "index.html?test=word-layout-reference");
    for (const selector of [".map-visual", ".challenge", ".word-card", ".pinyin-line"]) {
      const expected = await hanzi.locator(selector).boundingBox();
      const actual = await page.locator(selector).boundingBox();
      for (const axis of ["x", "y", "width", "height"]) assert.ok(Math.abs(expected[axis] - actual[axis]) <= 1, `${width} ${selector} ${axis}: ${actual[axis]} vs ${expected[axis]}`);
    }
    const picture = await page.locator("#wordPicture").boundingBox(), character = await hanzi.locator("#currentChar").boundingBox();
    assert.equal(picture.width, character.width); assert.equal(picture.height, character.height);
    await reference.close();
    await act("#startDaily");
    assert.equal(await page.locator("#currentWord").textContent(), "显示", "picture appears without answer");
    assert.equal(await page.locator("#wordPhonetic").textContent(), "");
    assert.equal(await page.locator("#wordTranslation").textContent(), "");
    assert.equal(await page.locator("#wordTranslation").isVisible(), false);
    assert.ok(await page.locator("#wordPicture svg").count());
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press("Space"); assert.ok(await page.locator("#wordPhonetic").textContent());
    assert.equal(await page.locator("#currentWord").textContent(), await page.evaluate(() => window.__WORD_LEARNING__.getCurrentWord().word));
    assert.equal(await page.locator("#wordTranslation").textContent(), await page.evaluate(() => window.__WORD_LEARNING__.getCurrentWord().chinese));
    const fontSizes = await page.evaluate(() => ["currentWord", "wordPhonetic"].map(id => parseFloat(getComputedStyle(document.getElementById(id)).fontSize)));
    assert.ok(fontSizes[0] >= (width === 390 ? 52 : 57), "larger English word");
    assert.ok(fontSizes[1] >= (width === 390 ? 40 : 41), "larger IPA");
    await page.keyboard.press("Space"); assert.equal(await page.locator("#phonemeBreakdown").isVisible(), true);
    await page.locator("#currentWord").focus(); await page.keyboard.press("Space");
    assert.equal(await page.locator("#phonemeBreakdown").isVisible(), false, "focused button keeps native Space activation");
    await page.evaluate(() => {
      let now = performance.now(); const poll = () => window.STUDY_GAMEPAD_CURSOR.poll(now += 20);
      poll(); poll(); window.__pad.buttons[3] = { pressed: true, value: 1 }; poll();
      window.__pad.buttons[3] = { pressed: false, value: 0 }; poll();
    });
    assert.equal(await page.locator("#phonemeBreakdown").isVisible(), true, "Y matches Space");
    for (let i = 0; i < 3; i++) await act("#markWrong");
    assert.equal(await page.locator("#wordTranslation").textContent(), "", "next word hides translation again");
    assert.equal((await state()).dailyPhase, "newLearning");
    for (let i = 0; i < 9; i++) await act("#markCorrect");
    assert.equal(await page.locator("#finishNewWords").isVisible(), true);
    await page.reload(); await page.waitForFunction(() => Boolean(window.__WORD_LEARNING__));
    assert.equal(await page.locator("#finishNewWords").isVisible(), true, "resume ready state");
    await act("#finishNewWords");
    for (let i = 0; i < 3; i++) await act("#markCorrect");
    assert.equal((await state()).dailyTaskDone, true);
    assert.equal(await page.evaluate(() => window.__speechCalls), 0, "no automatic speech");

    // Check each existing art representation, plus abstract contextual pictures.
    const longestWord = [...catalog].sort((a, b) => b.word.length - a.word.length)[0].word;
    const samples = [...new Set(["arm", "apple", "hello", "first", "one", "twinkle", longestWord])];
    for (const word of samples) {
      const item = catalog.find(item => item.word === word); assert.ok(item, word);
      await page.evaluate(async id => {
        const { createInitialState } = await import("./src/state.js");
        const api = window.__WORD_LEARNING__, items = api.getItems(), next = createInitialState();
        next.dailyNewIds = [id, ...items.filter(item => item.id !== id).slice(0,2).map(item => item.id)];
        Object.assign(next, { dailyPhase: "newLearning", dailyTaskStarted: true, activeWordId: id });
        localStorage.setItem(api.getStorageKey(), JSON.stringify(next));
      }, item.id);
      await page.reload(); await page.waitForFunction(() => Boolean(window.__WORD_LEARNING__));
      assert.equal(await page.locator("#currentWord").textContent(), "显示", "reload and new word hide spelling");
      assert.equal(await page.locator("#wordPhonetic").textContent(), "", "new word hides pronunciation");
      assert.equal(await page.locator("#phonemeBreakdown").textContent(), "");
      assert.equal(await page.locator("#wordTranslation").textContent(), "");
      await act("#currentWord");
      assert.equal(await page.locator("#currentWord").textContent(), word);
      assert.equal(await page.locator("#wordPhonetic").textContent(), item.phonetic);
      assert.equal(await page.locator("#wordTranslation").textContent(), item.chinese);
      assert.equal(await page.locator("#wordTranslation").isVisible(), true);
      await act("#wordPhonetic");
      assert.equal(await page.locator("#phonemeBreakdown").isVisible(), true);
      const answerBounds = await page.locator(".word-question").boundingBox();
      for (const selector of ["#currentWord", "#wordPhonetic", "#phonemeBreakdown", "#wordTranslation"]) {
        const bounds = await page.locator(selector).boundingBox();
        assert.ok(bounds.x >= answerBounds.x && bounds.x + bounds.width <= answerBounds.x + answerBounds.width + 1, `${word} ${selector} fits horizontally`);
        assert.ok(bounds.y >= answerBounds.y && bounds.y + bounds.height <= answerBounds.y + answerBounds.height + 1, `${word} ${selector} is not clipped`);
      }
      const translationBounds = await page.locator("#wordTranslation").boundingBox(), splitBounds = await page.locator("#phonemeBreakdown").boundingBox();
      assert.ok(translationBounds.y >= splitBounds.y + splitBounds.height, "Chinese translation sits below IPA breakdown");
      if (word === "hello") assert.ok((await page.locator(".phoneme-chip").allTextContents()).includes("əʊ"), "diphthong stays together");
      assert.doesNotMatch(await page.locator("#phonemeBreakdown").textContent(), /重音|\//);
      if (word === "hello") await page.screenshot({ path: `tmp/word-learning-split-${width}.png`, fullPage: true });
      await act("#wordPhonetic");
      assert.equal(await page.locator("#phonemeBreakdown").isVisible(), false);
      await page.locator("#wordPicture img").evaluateAll(images => Promise.all(images.map(image => image.decode())));
      if (item.art.type === "image") assert.equal(await page.locator("#wordPicture svg").getAttribute("viewBox"), item.art.viewBox);
      if (item.art.src) { const response = await page.request.get(new URL(item.art.src, base).href); assert.equal(response.status(), 200); }
      assert.equal(await page.locator("#wordPicture").evaluate(node => /[a-zA-Z\u4e00-\u9fff]/.test(node.textContent.replace(/\d+(?:st|nd|rd|th)?/g, ""))), false, "picture side contains only artwork or numeric illustration");
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if (word === "apple") await page.screenshot({ path: `tmp/word-learning-${width}.png`, fullPage: true });
      if (word === "arm") await page.screenshot({ path: `tmp/word-learning-arm-${width}.png`, fullPage: true });
    }
    const sources = await page.evaluate(() => Object.entries(localStorage).filter(([key]) => !key.startsWith("mario-word-learning-v1") && !key.startsWith("mario-gamepad")));
    assert.ok(sources.every(([, value]) => value === "source-sentinel"), JSON.stringify(sources));
    // Route to the new module through the persistent owner; no second cursor.
    await page.goto(base + "index.html");
    await page.locator('a[href="./word-learning.html"]').click();
    await page.waitForFunction(() => window.STUDY_FULLSCREEN_SHELL?.isHosting() && !window.STUDY_FULLSCREEN_SHELL?.isNavigating(), null, { polling: 50 });
    const frame = page.frameLocator("#study-module-frame");
    assert.equal(await frame.locator("#startDaily").count(), 1);
    assert.equal(await frame.locator("#study-gamepad-cursor").count(), 0);
    assert.deepEqual(errors, []);
    results.push({ width, words: catalog.length, flow: "Hanzi engine", hanziGeometry: true, concealedAnswer: true, phonemeToggle: true, artSamples: samples.length, storageIsolated: true, keyboardAndY: true, navigation: true });
    await context.close();
  }
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", simulatedGamepad: true, results }));
} finally { await browser.close(); }
