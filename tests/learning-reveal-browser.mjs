import assert from "node:assert/strict";
import { loadChromium } from "./playwright-runtime.mjs";
import { checkConcealedDialogue, checkPhoneticOnly, completeDialoguePractice } from "./dialogue-practice-helper.mjs";
import { SCENARIOS } from "../data/scenarios.js";

const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:53177/";
const results = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 960 }, hasTouch: width === 390, reducedMotion: "reduce" });
    await context.route("**/api/controller-mouse**", route => route.fulfill({ json: { supported: false, mode: "web" } }));
    await context.addInitScript(() => {
      window.__utterances = []; window.__writes = [];
      const setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) { window.__writes.push(key); return setItem.call(this, key, value); };
      Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: class { constructor(text) { this.text = text; } } });
      Object.defineProperty(window, "speechSynthesis", { configurable: true, value: {
        cancel() {}, getVoices: () => [], speak(item) { window.__utterances.push(item); setTimeout(() => item.onend?.(), 40); },
      } });
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    const act = selector => width === 390 ? page.locator(selector).tap() : page.locator(selector).click();
    const noOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    if (!process.argv.includes("--scenario-only")) {
    await page.goto(new URL(`book-learning.html?test=reveal-${width}`, base).href);
    await act('[data-theme="opw1:letter-A"]'); await act("#reviewStage");
    await act('[data-item="opw1:word-apple"]');
    assert.equal(await page.locator(".card-word").count(), 0);
    await act('[data-action="reveal"]');
    assert.equal(await page.locator(".card-word").textContent(), "apple");
    await act('[data-action="next"]');
    assert.equal(await page.locator(".card-word").count(), 0);
    await act('[data-action="reveal"]');
    assert.equal(await page.locator(".card-word").textContent(), "ax");
    await act('[data-action="previous"]');
    assert.equal(await page.locator(".card-word").count(), 0);
    await act('[data-action="reveal"]');
    await act('[data-item="opw1:word-ant"]');
    assert.equal(await page.locator(".card-word").count(), 0);
    await noOverflow();
    await page.screenshot({ path: `tmp/book1-reveal-${width}.png`, fullPage: true });
    await act("#learnStage"); await act('[data-item="opw1:word-apple"]');
    assert.equal(await page.locator(".card-word").textContent(), "apple");
    assert.deepEqual(await page.evaluate(() => window.__BOOK1__.state.learnedIds), []);
    }

    await page.goto(new URL(`scenario-learning.html?test=reveal-${width}`, base).href);
    const enter = () => act('[data-scenario-id="first-meeting"] [data-start-label]');
    await enter();
    const scene = SCENARIOS[0];
    assert.deepEqual(await page.locator("#dialogueAligned strong:visible").allTextContents(), scene.lines[0].tokens.map(token => token.text));
    assert.equal(await page.locator("#revealDialogue").isHidden(), true);
    const artwork = await page.locator("#actorMia").getAttribute("src");
    await act("#practiceStage"); await checkConcealedDialogue(page);
    assert.equal(await page.locator("#actorMia").getAttribute("src"), artwork);
    assert.equal(await page.locator("#actorMia").evaluate(image => image.complete && image.naturalWidth > 0), true);
    await noOverflow();
    await page.screenshot({ path: `tmp/scenario-concealed-${width}.png`, fullPage: true });
    if (width === 1440) { await page.locator("#revealDialogue").focus(); await page.keyboard.press("Enter"); }
    else await act("#revealDialogue");
    await checkPhoneticOnly(page);
    await act("#speakDialogue");
    await page.waitForFunction(() => window.__utterances.length > 0 && document.getElementById("pauseDialogue").hidden);
    await checkPhoneticOnly(page);
    await act("#revealDialogue");
    assert.ok(await page.locator("#dialogueAligned strong:visible").count() > 0);
    await act("#speakDialogue");
    await page.waitForFunction(() => window.__utterances.length > 0 && document.getElementById("pauseDialogue").hidden);
    assert.ok(await page.locator("#dialogueAligned strong:visible").count() > 0, "same-line speech phases keep reveal");
    await act("#nextLine");
    await page.waitForFunction(() => !document.getElementById("currentBubble").classList.contains("is-arriving"));
    await checkConcealedDialogue(page);
    await act("#revealDialogue"); await page.reload(); await enter();
    assert.equal(await page.locator("#dialogueProgress").textContent(), "2/6");
    assert.equal(await page.locator("#practiceStage").getAttribute("aria-pressed"), "true");
    await checkConcealedDialogue(page);
    await act("#previousLine");
    await page.waitForFunction(() => !document.getElementById("currentBubble").classList.contains("is-arriving"));
    await checkConcealedDialogue(page);
    await act("#revealDialogue"); await act("#replayDialogue");
    await page.waitForFunction(() => !document.getElementById("currentBubble").classList.contains("is-arriving"));
    await checkConcealedDialogue(page);
    await act("#revealDialogue"); await act("#continuousDialogue");
    await page.waitForFunction(() => document.getElementById("playbackStatus").textContent === "对话播放完毕");
    await checkConcealedDialogue(page);
    assert.equal(await page.locator("#completeDialoguePractice").isDisabled(), true);
    assert.deepEqual(await page.evaluate(() => window.__SCENARIO_LEARNING__.store.state.completedScenarioIds), []);
    await act("#learnStage");
    assert.ok(await page.locator("#dialogueAligned strong:visible").count() > 0);
    await act("#practiceStage");
    await completeDialoguePractice(page, scene, act);
    await act("#returnAfterComplete");
    assert.equal(await page.locator('[data-scenario-id="first-meeting"] [data-complete-badge]').isVisible(), true);
    assert.deepEqual(await page.evaluate(() => window.__SCENARIO_LEARNING__.store.state.learnedWords), []);
    await act('[data-scenario-id="classroom-commands"] [data-start-label]');
    await act("#practiceStage"); await checkConcealedDialogue(page);
    assert.equal(await page.locator("#dialogueProgress").textContent(), "1/5");
    assert.equal(await page.locator("#scenarioObjectFocus").isVisible(), true);
    await noOverflow();
    await act("#revealDialogue");
    const geometry = await page.locator(".dialogue-actions button:visible").evaluateAll(buttons => buttons.map(button => {
      const r = button.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.width > 0 && r.height >= 44;
    }));
    assert.ok(geometry.every(Boolean), "visible controls fit at both widths");
    await page.screenshot({ path: `tmp/scenario-revealed-${width}.png`, fullPage: true });
    await act("#backToScenarios");
    for (const daily of SCENARIOS.filter(scene => scene.image)) {
      const card = page.locator(`[data-scenario-id="${daily.id}"]`);
      await card.scrollIntoViewIfNeeded();
      const preview = card.locator("img");
      await preview.evaluate(image => image.decode());
      assert.equal(await preview.getAttribute("src"), daily.image);
      assert.ok(await preview.evaluate(image => image.naturalWidth >= 1024));
      const response = await page.request.get(new URL(daily.image, base).href);
      assert.equal(response.status(), 200); assert.match(response.headers()["content-type"], /image\/png/);
      await act(`[data-scenario-id="${daily.id}"] [data-start-label]`);
      assert.equal(await page.locator("#dialogueProgress").textContent(), "1/4");
      assert.deepEqual(await page.locator("#dialogueAligned strong:visible").allTextContents(), daily.lines[0].tokens.map(token => token.text));
      assert.ok((await page.locator("#actorStage").evaluate(stage => getComputedStyle(stage).backgroundImage)).includes(daily.image.slice(2)));
      for (const [slot, definition] of daily.actors.entries()) {
        const actor = page.locator(slot === 0 ? "#actorMia" : "#actorLeo");
        assert.equal(await actor.getAttribute("src"), definition.image);
        await actor.evaluate(image => image.decode());
        assert.equal(await actor.getAttribute("aria-hidden"), String(definition.speaker !== daily.lines[0].speaker));
      }
      await act("#replayDialogue");
      await page.waitForFunction(() => document.getElementById("playbackStatus").textContent.includes("Next"));
      assert.equal(await page.locator("#dialogueProgress").textContent(), "1/4", "manual replay does not auto advance");
      await act("#nextLine");
      await page.waitForFunction(() => !document.getElementById("currentBubble").classList.contains("is-arriving"));
      const inBounds = await page.locator("#actorStage").evaluate(stage => {
        const r = stage.getBoundingClientRect();
        return [...stage.querySelectorAll(".is-present")].every(actor => {
          const a = actor.getBoundingClientRect(); return a.left >= r.left && a.right <= r.right && a.top >= r.top && a.bottom <= r.bottom;
        });
      });
      assert.ok(inBounds, "complete characters fit inside the stage");
      await noOverflow();
      await page.locator("#actorStage").screenshot({ path: `tmp/${daily.id}-${width}.png` });
      await act("#practiceStage");
      await completeDialoguePractice(page, daily, act);
      await act("#returnAfterComplete");
      assert.equal(await card.locator("[data-complete-badge]").isVisible(), true);
    }
    assert.ok((await page.evaluate(() => window.__writes)).every(key => key === `mario-scenario-learning-v1:test:reveal-${width}`));
    assert.deepEqual(errors, []);
    results.push({ width, bookWordReset: !process.argv.includes("--scenario-only"), dialogueReveal: "hidden-ipa-sentence", resume: true, speechPhases: true, completion: true });
    await context.close();
  }
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", results }));
} finally { await browser.close(); }
