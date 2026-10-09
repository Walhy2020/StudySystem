import assert from "node:assert/strict";
import fs from "node:fs";
import { scenarioById } from "../data/scenarios.js";
import { BOOK1_ITEMS } from "../data/book1.js";
import { loadChromium } from "./playwright-runtime.mjs";
const scene = scenarioById("classroom-commands");
const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const upId = BOOK1_ITEMS.find(item => item.word === "up").id;
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
fs.mkdirSync("tmp", { recursive: true });
const results = [];
try {
  for (const width of [1440, 390]) {
    const namespace = `commands-${width}`, suffix = `:test:${namespace}`;
    const key = "mario-scenario-learning-v1" + suffix;
    const context = await browser.newContext({ viewport: { width, height: 960 }, hasTouch: width === 390 });
    await context.addInitScript(({ suffix, upId, key }) => {
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify({ activeScenarioId: "first-meeting", lineIndex: 4,
          completedScenarioIds: ["what-is-it"], learnedWords: ["thank", "you"] }));
        localStorage.setItem("mario-book1-v1" + suffix, JSON.stringify({ learnedIds: [upId] }));
        localStorage.setItem("mario-theme-learned-v1" + suffix, JSON.stringify({ learned: ["body:hand"] }));
        for (const foreign of ["mario-hanzi-refactor-v1", "mario-phonetics-v1", "mario-pinyin-v1", "mario-bomb-game-progress-v1"])
          localStorage.setItem(foreign, JSON.stringify({ untouched: true }));
      }
      window.__spoken = []; window.__writes = [];
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (this === localStorage) window.__writes.push(key);
        return original.call(this, key, value);
      };
      Object.defineProperty(window, "SpeechSynthesisUtterance", { value: class { constructor(text) { this.text = text; } } });
      Object.defineProperty(window, "speechSynthesis", { value: { getVoices: () => [], cancel() {},
        speak(item) { window.__spoken.push(item); setTimeout(() => item.onend?.(), 30); } } });
    }, { suffix, upId, key });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(response.url()); });
    const act = selector => width === 390 ? page.locator(selector).tap() : page.locator(selector).click();
    const enter = () => act('[data-scenario-id="classroom-commands"] [data-start-label]');
    const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
    const noOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const foreign = () => page.evaluate(({ key }) => Object.fromEntries(Object.keys(localStorage).filter(item => item !== key)
      .map(item => [item, localStorage.getItem(item)])), { key });
    await page.goto(base + `scenario-learning.html?test=${namespace}`);
    const foreignBefore = await foreign();
    assert.equal(await page.locator(".scenario-card").count(), 6);
    const cover = page.locator('[data-scenario-id="classroom-commands"] img');
    await cover.evaluate(image => image.decode());
    assert.deepEqual(await cover.evaluate(image => [image.naturalWidth, image.naturalHeight, getComputedStyle(image).objectFit]), [1254, 1254, "contain"]);
    await noOverflow(); await enter();
    assert.equal(await page.locator("#activeScenarioTitle").textContent(), "课堂指令 · Classroom Commands");
    assert.equal(await page.evaluate(() => window.__spoken.length), 0);
    for (const [index, line] of scene.lines.entries()) {
      assert.equal(await page.locator("#dialogueProgress").textContent(), `${index + 1}/5`);
      assert.equal(await page.locator("#dialogueEnglish").textContent(), line.text);
      assert.equal(await page.locator("#dialogueChinese").textContent(), line.chinese);
      assert.equal(await page.locator("#dialogueSpeaker").textContent(), line.speaker);
      assert.equal(await page.locator("#actorLeo").getAttribute("aria-hidden"), String(index < 4));
      assert.deepEqual(await page.locator("#dialogueAligned .aligned-word strong").allTextContents(), line.tokens.map(token => token.text));
      assert.deepEqual(await page.locator("#dialogueAligned .aligned-word small").allTextContents(), line.tokens.map(token => token.phonetic));
      assert.equal(await page.locator("#dialogueAligned").evaluate(node => [...node.querySelectorAll(".aligned-word")].every(word =>
        word.querySelector("small").getBoundingClientRect().top >= word.querySelector("strong").getBoundingClientRect().bottom - 1)), true);
      const focus = scene.focusObjects[line.focusObject];
      assert.equal(await page.locator("#scenarioObjectFocus").isVisible(), Boolean(focus));
      if (focus) {
        assert.equal(await page.locator("#scenarioObjectImage").getAttribute("src"), focus.image);
        await page.locator("#scenarioObjectImage").evaluate(image => image.decode());
        const geometry = await page.locator("#scenarioObjectImage").evaluate(image => {
          const art = image.getBoundingClientRect(), stage = document.getElementById("actorStage").getBoundingClientRect();
          return { fit: getComputedStyle(image).objectFit, size: [image.naturalWidth, image.naturalHeight],
            contained: art.left >= stage.left && art.right <= stage.right && art.top >= stage.top && art.bottom <= stage.bottom,
            readable: art.width > 130 };
        });
        assert.deepEqual(geometry, { fit: "contain", size: [1254, 1254], contained: true, readable: true });
        assert.match(await page.locator("#scenarioObjectFocus").getAttribute("aria-label"), /^重点动作/);
        await page.screenshot({ path: `tmp/commands-${line.focusObject}-${width}.png`, fullPage: true });
      }
      await noOverflow();
      if (index === 2) {
        await page.reload(); await enter();
        assert.equal(await page.locator("#dialogueProgress").textContent(), "3/5", "refresh keeps this scenario line");
      }
      if (index < 4) {
        const count = await page.evaluate(() => window.__spoken.length);
        await act("#nextLine");
        await page.waitForFunction(expected => window.__spoken.length === expected && document.getElementById("pauseDialogue").hidden, count + 1);
        assert.equal(await page.evaluate(() => window.__spoken.at(-1).text), scene.lines[index + 1].text);
      }
    }
    await act("#replayDialogue");
    await page.waitForFunction(() => document.getElementById("pauseDialogue").hidden);
    assert.equal(await page.locator("#dialogueProgress").textContent(), "1/5");
    const manualCount = await page.evaluate(() => window.__spoken.length);
    await page.waitForTimeout(120);
    assert.equal(await page.evaluate(() => window.__spoken.length), manualCount, "manual replay never advances");
    await act("#continuousDialogue");
    await page.waitForFunction(() => document.getElementById("playbackStatus").textContent === "对话播放完毕");
    assert.deepEqual(await page.evaluate(() => window.__spoken.slice(-5).map(item => item.text)), scene.lines.map(line => line.text));
    assert.deepEqual((await read()).learnedWords, ["thank", "you"]);
    await act("#practiceStage");
    for (const [index, question] of scene.practice.entries()) {
      await page.waitForFunction(expected => document.getElementById("practiceProgress").textContent === expected, `${index + 1}/5`);
      assert.equal(await page.locator("#practiceOptionsTitle").textContent(), "选择对应的英文");
      assert.equal(await page.locator("#practiceSpeaker").textContent(), "中文提示");
      assert.equal(await page.locator("#practiceAligned").getAttribute("aria-label"), scene.lines[index].chinese);
      assert.deepEqual(await page.locator("#practiceAligned strong").allTextContents(), [scene.lines[index].chinese]);
      assert.equal(await page.locator("#practiceAligned small").count(), 0);
      const options = page.locator(".response-option");
      assert.equal(await options.count(), 3);
      assert.equal(await options.locator(":scope > small").count(), 0, "no Chinese answer leaked");
      assert.equal(await options.evaluateAll(nodes => nodes.every(node => !/[\u4e00-\u9fff]/.test(node.textContent))), true);
      const count = await page.evaluate(() => window.__spoken.length);
      await act("#speakPractice");
      await page.waitForFunction(expected => window.__spoken.length === expected, count + 1);
      assert.equal(await page.evaluate(() => window.__spoken.at(-1).text), scene.lines[index].text);
      if (index === 2) {
        await page.reload(); await enter();
        assert.equal(await page.locator("#practiceProgress").textContent(), "3/5", "refresh resumes current question");
      }
      await act(`[data-answer-id="${question.optionIds.find(id => id !== question.answerId)}"]`);
      assert.equal(await page.locator("#practiceProgress").textContent(), `${index + 1}/5`);
      assert.match(await page.locator("#practiceFeedback").textContent(), /不对应/);
      await noOverflow();
      if (index === 2) await page.screenshot({ path: `tmp/commands-practice-${width}.png`, fullPage: true });
      if (width === 1440 && index === 0) {
        await page.locator(`[data-answer-id="${question.answerId}"]`).focus();
        await page.keyboard.press("Enter");
      } else await act(`[data-answer-id="${question.answerId}"]`);
    }
    await page.locator("#practiceResult").waitFor({ state: "visible" });
    assert.equal(await page.locator("#practiceResultScore").textContent(), "5/5");
    assert.deepEqual((await read()).learnedWords, ["thank", "you"], "practice completion never learns words automatically");
    assert.equal((await read()).scenarioProgress["first-meeting"].lineIndex, 4);
    await act("#returnAfterComplete");
    assert.equal(await page.locator('[data-scenario-id="classroom-commands"] [data-complete-badge]').isVisible(), true);
    assert.equal(await page.locator('[data-scenario-id="what-is-it"] [data-complete-badge]').isVisible(), true);
    await enter(); await act("#wordsStage");
    for (const word of ["thank", "you", "up"]) assert.equal(await page.locator(`[data-word="${word}"]`).count(), 0);
    for (const word of ["please", "stand", "sit", "raise", "your", "hands", "welcome", "are", "down"])
      assert.equal(await page.locator(`[data-word="${word}"]`).count(), 1);
    assert.equal(await page.locator("#scenarioWordCount").textContent(), "9");
    assert.ok((await page.locator(".word-source").allTextContents()).every(text => text.startsWith("课堂指令：")));
    await act('[data-word="raise"] button:last-child');
    assert.equal(await page.locator('[data-word="raise"]').count(), 0);
    await page.reload(); await enter();
    assert.equal(await page.locator('[data-word="raise"]').count(), 0);
    const library = await page.evaluate(async suffix => {
      const { buildTotalWordLibrary } = await import("./src/total-word-library.js?v=1.6");
      const { buildThemeCatalog } = await import("./src/theme-overview.js?v=1.15");
      const { THEME_CONFIGS } = await import("./theme-learning.js?v=2.21");
      return buildTotalWordLibrary(buildThemeCatalog(THEME_CONFIGS), localStorage, { suffix });
    }, suffix);
    assert.equal(library.filter(item => item.word === "raise").length, 1);
    assert.equal(library.find(item => item.word === "raise").art.src, scene.focusObjects["raise-hands"].image);
    assert.equal(library.some(item => item.word === "stand"), false);
    assert.deepEqual(await foreign(), foreignBefore, "no foreign progress changes");
    assert.ok((await page.evaluate(() => window.__writes)).every(item => item === key));
    await act("#backToScenarios");
    await act('[data-scenario-id="first-meeting"] [data-start-label]');
    await act("#practiceStage");
    assert.equal(await page.locator("#practiceOptionsTitle").textContent(), "你会怎么回应？");
    assert.ok(await page.locator(".response-option > small").count() > 0, "existing response exercises unchanged");
    await act("#backToScenarios");
    await act('[data-scenario-id="what-is-it"] [data-start-label]');
    assert.equal(await page.locator("#dialogueProgress").textContent(), "1/14");
    assert.match(await page.locator("#scenarioObjectImage").getAttribute("src"), /focus-pen-v1/);
    assert.match(await page.locator("#scenarioObjectFocus").getAttribute("aria-label"), /^重点物品/);
    await act("#practiceStage");
    assert.equal(await page.locator("#practiceOptionsTitle").textContent(), "你会怎么回应？");
    assert.equal(await page.locator("#practicePanel").getAttribute("data-practice-mode"), "response");
    await noOverflow();
    for (const resource of ["classroom-commands", "command-stand-up", "command-sit-down", "command-raise-hands"]) {
      const response = await page.request.get(base + `assets/scenarios/${resource}-v1.png?v=1.0`);
      assert.equal(response.status(), 200); assert.match(response.headers()["content-type"], /image\/png/);
    }
    assert.deepEqual(errors, []);
    results.push({ width, lines: 5, actionArt: true, alignedIpa: true, manualAndContinuous: true,
      chineseMatching: 5, refreshResume: true, explicitWordLearning: true, isolatedStorage: true, geometry: true });
    await context.close();
  }
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", results }));
} finally { await browser.close(); }
