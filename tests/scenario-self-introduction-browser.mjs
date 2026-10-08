import assert from "node:assert/strict";
import { scenarioById } from "../data/scenarios.js";
import { loadChromium } from "./playwright-runtime.mjs";

const scene = scenarioById("self-introduction");
const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const results = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 960 }, hasTouch: width === 390 });
    await context.addInitScript(() => {
      window.__spoken = []; window.__writes = [];
      localStorage.setItem("mario-theme-learned-v1", JSON.stringify({ learnedThemes: ["classroom", "items2", "items3"] }));
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) { window.__writes.push(key); return original.call(this, key, value); };
      Object.defineProperty(window, "SpeechSynthesisUtterance", { value: class { constructor(text) { this.text = text; } } });
      Object.defineProperty(window, "speechSynthesis", { value: { getVoices: () => [], cancel() {},
        speak(item) { window.__spoken.push(item); setTimeout(() => item.onend?.(), 30); } } });
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(response.url()); });
    const act = selector => width === 390 ? page.locator(selector).tap() : page.locator(selector).click();
    const enter = () => act('[data-scenario-id="self-introduction"] [data-start-label]');
    const noOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.goto(base + "scenario-learning.html");
    assert.equal(await page.locator(".scenario-card").count(), 5);
    const cover = page.locator('[data-scenario-id="self-introduction"] img');
    await cover.evaluate(image => image.decode());
    assert.deepEqual(await cover.evaluate(image => [image.naturalWidth, image.naturalHeight, getComputedStyle(image).objectFit]), [1254, 1254, "contain"]);
    await noOverflow(); await enter();
    assert.equal(await page.locator("#activeScenarioTitle").textContent(), "介绍一下自己 · Introducing Ourselves");
    assert.equal(await page.evaluate(() => window.__spoken.length), 0);
    for (const [index, line] of scene.lines.entries()) {
      await page.waitForFunction(expected => document.getElementById("dialogueProgress").textContent === expected, `${index + 1}/12`);
      assert.equal(await page.locator("#dialogueSpeaker").textContent(), line.speaker);
      assert.equal(await page.locator("#dialogueEnglish").textContent(), line.text);
      assert.deepEqual(await page.locator("#dialogueAligned .aligned-word small").allTextContents(), line.tokens.map(token => token.phonetic));
      assert.equal(await page.locator("#actorLeo").getAttribute("aria-hidden"), String(index < 6));
      assert.equal(await page.locator("#currentBubble").count(), 1);
      const focus = scene.focusObjects[line.focusObject];
      assert.equal(await page.locator("#scenarioObjectFocus").isVisible(), Boolean(focus));
      if (focus) {
        assert.equal(await page.locator("#scenarioObjectImage").getAttribute("src"), focus.image);
        await page.locator("#scenarioObjectImage").evaluate(image => image.decode());
        const geometry = await page.locator("#scenarioObjectImage").evaluate(image => {
          const art = image.getBoundingClientRect(), stage = document.getElementById("actorStage").getBoundingClientRect();
          return { fit: getComputedStyle(image).objectFit,
            contained: art.left >= stage.left && art.right <= stage.right && art.top >= stage.top && art.bottom <= stage.bottom,
            readable: art.width > 120 };
        });
        assert.deepEqual(geometry, { fit: "contain", contained: true, readable: true });
      }
      assert.equal(await page.locator("#dialogueAligned").evaluate(node => [...node.querySelectorAll(".aligned-word")].every(word =>
        word.querySelector("small").getBoundingClientRect().top >= word.querySelector("strong").getBoundingClientRect().bottom - 1)), true);
      await noOverflow();
      if (index === 5 || index === 11) await page.screenshot({ path: `tmp/self-intro-${line.speaker}-${width}.png`, fullPage: true });
      if (index < 11) {
        const count = await page.evaluate(() => window.__spoken.length);
        await act("#nextLine");
        await page.waitForFunction(expected => window.__spoken.length === expected && document.getElementById("pauseDialogue").hidden, count + 1);
        assert.equal(await page.evaluate(() => window.__spoken.at(-1).text), scene.lines[index + 1].text);
      }
    }
    await page.reload(); await enter();
    assert.equal(await page.locator("#dialogueProgress").textContent(), "12/12");
    await act("#replayDialogue");
    await page.waitForFunction(() => window.__spoken.length === 1 && document.getElementById("pauseDialogue").hidden);
    await page.waitForTimeout(100);
    assert.equal(await page.locator("#dialogueProgress").textContent(), "1/12", "manual replay does not advance");
    await act("#continuousDialogue");
    await page.waitForFunction(() => window.__spoken.length === 13 && document.getElementById("playbackStatus").textContent === "对话播放完毕");
    assert.deepEqual(await page.evaluate(() => window.__spoken.slice(1).map(item => item.text)), scene.lines.map(line => line.text));
    await act("#practiceStage");
    for (const [index, question] of scene.practice.entries()) {
      await page.waitForFunction(expected => document.getElementById("practiceProgress").textContent === expected, `${index + 1}/6`);
      assert.match(await page.locator("#practiceFeedback").textContent(), /同类信息/);
      await act(`[data-answer-id="${question.optionIds.find(id => id !== question.answerId)}"]`);
      assert.equal(await page.locator("#practiceProgress").textContent(), `${index + 1}/6`);
      await act(`[data-answer-id="${question.answerId}"]`);
    }
    await page.locator("#practiceResult").waitFor({ state: "visible" });
    assert.equal(await page.locator("#practiceResultScore").textContent(), "6/6");
    await act("#returnAfterComplete");
    assert.equal(await page.locator('[data-scenario-id="self-introduction"] [data-complete-badge]').isVisible(), true);
    await enter(); await act("#wordsStage");
    for (const word of ["pen", "pencil", "flower", "banana"]) assert.equal(await page.locator(`[data-word="${word}"]`).count(), 0);
    for (const word of ["years", "old", "live", "in"]) assert.equal(await page.locator(`[data-word="${word}"]`).count(), 1);
    await act('[data-word="live"] button:last-child');
    assert.equal(await page.locator('[data-word="live"]').count(), 0);
    await page.reload(); await enter();
    assert.equal(await page.locator('[data-word="live"]').count(), 0);
    assert.ok((await page.evaluate(() => window.__writes)).every(key => key === "mario-scenario-learning-v1"));
    await noOverflow();
    for (const resource of ["introducing-ourselves-v1", "self-intro-flower-v1", "self-intro-pencil-v1"]) {
      const response = await page.request.get(base + `assets/scenarios/${resource}.png?v=1.0`);
      assert.equal(response.status(), 200); assert.match(response.headers()["content-type"], /image\/png/);
    }
    assert.deepEqual(errors, []);
    results.push({ width, lines: 12, aBeforeB: true, manualAndContinuous: true, questions: 6, artAndIpa: true, progressAndWords: true });
    await context.close();
  }
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", results }));
} finally { await browser.close(); }
