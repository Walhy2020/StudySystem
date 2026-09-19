import assert from "node:assert/strict";
import { chromium } from "file:///C:/Users/St/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const rootUrl = process.env.PHONETICS_BASE_URL || process.env.HANZI_BASE_URL || "http://127.0.0.1:53177/";
const mainUrl = new URL("?test=phonetics-entry", rootUrl).href;
const phoneticsUrl = new URL("phonetics.html?test=phonetics-browser", rootUrl).href;
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
});
const protectedKeys = [
  "mario-hanzi-refactor-v1",
  "mario-bomb-game-v1",
  "mario-theme-learning-v1",
  "mario-book1-v1",
  "mario-literacy-desktop-mvp-v1",
];

async function installStorageAudit(context) {
  await context.addInitScript(() => {
    window.__storageMutations = [];
    const originalSet = Storage.prototype.setItem;
    const originalRemove = Storage.prototype.removeItem;
    Storage.prototype.setItem = function setItem(key, value) {
      window.__storageMutations.push({ operation: "set", key });
      return originalSet.call(this, key, value);
    };
    Storage.prototype.removeItem = function removeItem(key) {
      window.__storageMutations.push({ operation: "remove", key });
      return originalRemove.call(this, key);
    };
  });
}

async function installSpeechSpy(context) {
  await context.addInitScript(() => {
    const calls = [];
    const voices = [
      { name: "English US", lang: "en-US", localService: true },
      { name: "English UK", lang: "en-GB", localService: false },
    ];
    class FakeUtterance {
      constructor(text) { this.text = text; }
    }
    const spy = {
      calls,
      voices,
      cancelCount: 0,
      resumeCount: 0,
      getVoices: () => voices,
      cancel() { spy.cancelCount += 1; },
      resume() { spy.resumeCount += 1; },
      speak(utterance) {
        calls.push({
          text: utterance.text,
          lang: utterance.lang,
          rate: utterance.rate,
          pitch: utterance.pitch,
          voiceName: utterance.voice?.name || null,
          voiceLang: utterance.voice?.lang || null,
        });
      },
      addEventListener() {},
    };
    window.__phoneticsSpeechSpy = spy;
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: FakeUtterance });
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: spy });
  });
}

const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await installStorageAudit(context);
await installSpeechSpy(context);
const page = await context.newPage();
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));

await page.goto(mainUrl);
assert.deepEqual(await page.locator(".module-tabs .module-tab").allTextContents(), ["汉字", "Book1", "主题学习", "情景模式", "总复习", "音标"]);
assert.equal(await page.locator('.module-tabs a[href="./phonetics.html"]').isVisible(), true);
assert.equal(await page.locator("header .top-actions #bombGameEntry").isVisible(), true);
assert.equal(await page.locator('.module-tabs a[href*="bomb-game"]').count(), 0);

await page.goto(phoneticsUrl);
await page.evaluate(() => {
  const key = window.__PHONETICS_APP__.getStorageKey();
  localStorage.removeItem(key);
  for (const protectedKey of [
    "mario-hanzi-refactor-v1", "mario-bomb-game-v1",
    "mario-theme-learning-v1", "mario-book1-v1", "mario-literacy-desktop-mvp-v1",
  ]) localStorage.setItem(protectedKey, `sentinel:${protectedKey}`);
});
await page.reload();

const assetStatuses = await page.evaluate(async () => {
  const assets = [
    "./phonetics.html", "./styles.css?v=2.2", "./phonetics.css?v=1.9",
    "./data/phonetics.js?v=1.0", "./data/phonetics-transcriptions.js?v=1.0",
    "./src/phonetics-app.js?v=1.7", "./src/phonetics-display.js?v=1.0",
    "./src/phonetics-engine.js?v=1.1", "./src/phonetics-storage.js?v=1.0",
    "./src/phonetics-tts.js?v=1.2", "./src/engine.js", "./src/storage.js",
    "./assets/backgrounds/phonetics-sound-kingdom-v2.png?v=1.0",
  ];
  return Object.fromEntries(await Promise.all(assets.map(async (asset) => {
    const response = await fetch(asset);
    return [asset, response.status];
  })));
});
assert.ok(Object.values(assetStatuses).every((status) => status === 200), JSON.stringify(assetStatuses));
assert.equal(await page.locator("#bootError").isHidden(), true);
assert.equal(await page.locator('.module-tabs a[href="./index.html"]').isVisible(), true);
assert.deepEqual(await page.locator(".module-tabs .module-tab").allTextContents(), ["汉字", "Book1", "主题学习", "情景模式", "总复习", "音标"]);
assert.equal(await page.locator("header .phonetics-header-actions #bombGameEntry").isVisible(), true);
assert.equal(await page.locator("header #resetPhonetics").count(), 0);
assert.equal(await page.locator(".map-visual #bombGameEntry").count(), 0);
assert.equal(await page.locator(".map-visual .phonetics-map-reset #resetPhonetics").isVisible(), true);
assert.equal(await page.locator("#bombGameEntry").getAttribute("href"), "./bomb-game.html?v=1.0");
assert.equal(await page.locator("#bombGameEntry").getAttribute("aria-label"), "进入炸弹迷宫");
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
assert.equal((await page.evaluate(() => window.__PHONETICS_APP__.getItems())).length, 48);
for (const selector of ["#startDaily", "#startReview"]) assert.equal(await page.locator(selector).isVisible(), true);
for (const selector of ["#speakCurrent", "#markCorrect", "#markWrong", "#markMastered"]) {
  assert.equal(await page.locator(selector).isVisible(), false);
}
await assertStateLabelFits(page, "开始");

await page.click("#startDaily");
for (const selector of ["#startDaily", "#startReview"]) assert.equal(await page.locator(selector).isVisible(), false);
assert.equal(await page.locator(".phonetic-details").isVisible(), true);
assert.equal(await page.locator(".phonetic-example").count(), 3);
assert.equal(await page.locator("#currentChar .phonetic-card-category").isVisible(), true);
assert.equal(await page.locator("#pinyinLine .phonetic-card-category, #pinyinLine .phonetic-category").count(), 0);
assert.equal(await page.locator(".phonetic-example-word").count(), 3);
assert.equal(await page.locator(".phonetic-transcription").count(), 3);
assert.ok((await page.locator(".phonetic-transcription").allTextContents()).every((value) => /^\/.+\/$/.test(value)));
assert.doesNotMatch((await page.locator("#currentChar .hanzi-content").textContent()).trim(), /^\/.+\/$/);
assert.doesNotMatch(await page.locator("#currentChar").getAttribute("aria-label"), /音标 \/.+\//);
const firstDetails = await page.locator(".phonetic-details").textContent();
const firstSpeechItem = await page.evaluate(() => window.__PHONETICS_APP__.getCurrentItem());
const firstSpeechLabel = `朗读 ${firstSpeechItem.symbol.slice(1, -1)} 的示例词 ${firstSpeechItem.examples[0]}`;
assert.match(await page.locator("#currentChar").getAttribute("aria-label"), new RegExp(firstSpeechLabel));
assert.equal(await page.locator("#speakCurrent").getAttribute("aria-label"), firstSpeechLabel);
assert.equal(await page.locator("#speakCurrent").getAttribute("title"), firstSpeechLabel);
let speechCount = await page.evaluate(() => window.__phoneticsSpeechSpy.calls.length);
await page.click("#currentChar");
await page.waitForFunction((count) => window.__phoneticsSpeechSpy.calls.length === count + 1, speechCount);
let lastSpeech = await page.evaluate(() => window.__phoneticsSpeechSpy.calls.at(-1));
assert.deepEqual(
  { text: lastSpeech.text, lang: lastSpeech.lang, voiceLang: lastSpeech.voiceLang },
  { text: firstSpeechItem.examples[0], lang: "en-GB", voiceLang: "en-GB" },
);
speechCount += 1;
await page.click("#speakCurrent");
await page.waitForFunction((count) => window.__phoneticsSpeechSpy.calls.length === count + 1, speechCount);
speechCount += 1;
await page.locator("#currentChar").focus();
await page.keyboard.press("Space");
await page.waitForFunction((count) => window.__phoneticsSpeechSpy.calls.length === count + 1, speechCount);
speechCount += 1;
const beforeRapid = await page.evaluate(() => ({ calls: window.__phoneticsSpeechSpy.calls.length, cancels: window.__phoneticsSpeechSpy.cancelCount }));
await page.evaluate(() => { document.querySelector("#currentChar").click(); document.querySelector("#currentChar").click(); });
await page.waitForFunction((count) => window.__phoneticsSpeechSpy.calls.length === count + 1, beforeRapid.calls);
const afterRapid = await page.evaluate(() => ({ calls: window.__phoneticsSpeechSpy.calls.length, cancels: window.__phoneticsSpeechSpy.cancelCount }));
assert.equal(afterRapid.calls, beforeRapid.calls + 1);
assert.ok(afterRapid.cancels >= beforeRapid.cancels + 2);
await page.evaluate(() => Object.defineProperty(window, "speechSynthesis", { configurable: true, value: null }));
const beforeUnavailable = await page.evaluate(() => window.__phoneticsSpeechSpy.calls.length);
await page.click("#currentChar");
await page.waitForFunction(() => document.querySelector("#feedback").textContent.includes("发音当前不可用"));
assert.equal(await page.evaluate(() => window.__phoneticsSpeechSpy.calls.length), beforeUnavailable);
await page.evaluate(() => Object.defineProperty(window, "speechSynthesis", { configurable: true, value: window.__phoneticsSpeechSpy }));
assert.equal(await page.locator(".phonetic-details").textContent(), firstDetails);
await page.click("#markWrong");
assert.notEqual(await page.locator(".phonetic-details").textContent(), firstDetails);
assert.equal(await page.locator(".phonetic-example").count(), 3);
const secondSpeechItem = await page.evaluate(() => window.__PHONETICS_APP__.getCurrentItem());
assert.notEqual(secondSpeechItem.examples[0], firstSpeechItem.examples[0]);
speechCount = await page.evaluate(() => window.__phoneticsSpeechSpy.calls.length);
await page.click("#currentChar");
await page.waitForFunction((count) => window.__phoneticsSpeechSpy.calls.length === count + 1, speechCount);
lastSpeech = await page.evaluate(() => window.__phoneticsSpeechSpy.calls.at(-1));
assert.equal(lastSpeech.text, secondSpeechItem.examples[0]);
for (let index = 1; index < 3; index += 1) await page.click("#markWrong");
let dailyState = await page.evaluate(() => window.__PHONETICS_APP__.getState());
assert.equal(dailyState.dailyNewIds.length, 3);
assert.equal(dailyState.dailyPhase, "newLearning");
const chipSymbols = await page.locator("#todayNewList [data-inline-id]").evaluateAll((buttons) =>
  buttons.map((button) => ({ symbol: button.childNodes[0]?.textContent?.trim(), aria: button.getAttribute("aria-label") })));
assert.ok(chipSymbols.every(({ symbol, aria }) => symbol && !symbol.startsWith("/") && !symbol.endsWith("/") && aria.includes(`音标 ${symbol}`)));
assert.equal(await page.locator(".phonetic-list .word-chip small").count(), 0);

const feedbackGeometry = await page.locator("#feedback").evaluate((node) => {
  const rect = node.getBoundingClientRect();
  const style = getComputedStyle(node);
  return { width: rect.width, height: rect.height, position: style.position };
});
assert.equal(await page.locator("p.feedback").count(), 0);
assert.equal(await page.locator("#feedback").isVisible(), false);
assert.equal(feedbackGeometry.position, "absolute");
assert.ok(feedbackGeometry.width <= 1 && feedbackGeometry.height <= 1);

async function assertMapControlsDoNotOverlap(targetPage) {
  const boxes = await targetPage.locator(".map-visual").evaluate((map) => {
    const selectors = [".phonetics-map-reset", ".map-overlay", ".map-economy", ".map-next-batch"];
    return Object.fromEntries(selectors.map((selector) => {
      const rect = map.querySelector(selector).getBoundingClientRect();
      return [selector, { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }];
    }));
  });
  const action = boxes[".phonetics-map-reset"];
  for (const selector of [".map-overlay", ".map-economy", ".map-next-batch"]) {
    const other = boxes[selector];
    const overlaps = action.left < other.right && action.right > other.left && action.top < other.bottom && action.bottom > other.top;
    assert.equal(overlaps, false, `.phonetics-map-reset overlaps ${selector}`);
  }
}
async function assertStateLabelFits(targetPage, expectedText) {
  const geometry = await targetPage.locator("#currentChar").evaluate((button) => {
    const card = button.getBoundingClientRect();
    const label = button.querySelector(".hanzi-content").getBoundingClientRect();
    const category = button.querySelector(".phonetic-card-category");
    const round = button.parentElement.querySelector("#reviewRoundBadge");
    const mastered = button.parentElement.querySelector("#masteredBadge");
    return {
      text: button.querySelector(".hanzi-content").textContent.trim(),
      hasStateClass: button.querySelector(".hanzi-content").classList.contains("phonetic-state-label"),
      centerXDelta: Math.abs((label.left + label.right) / 2 - (card.left + card.right) / 2),
      centerYDelta: Math.abs((label.top + label.bottom) / 2 - (card.top + card.bottom) / 2),
      safeInsets: {
        left: label.left - card.left,
        right: card.right - label.right,
        top: label.top - card.top,
        bottom: card.bottom - label.bottom,
      },
      labelWidth: label.width,
      labelHeight: label.height,
      cardWidth: card.width,
      cardHeight: card.height,
      fontSize: parseFloat(getComputedStyle(button.querySelector(".hanzi-content")).fontSize),
      noScrollOverflow: button.scrollWidth <= button.clientWidth + 1 && button.scrollHeight <= button.clientHeight + 1,
      categoryHidden: category.classList.contains("hidden"),
      roundHidden: round.classList.contains("hidden"),
      masteredHidden: mastered.classList.contains("hidden"),
    };
  });
  const message = JSON.stringify({ expectedText, geometry });
  assert.equal(geometry.text, expectedText, message);
  assert.equal(geometry.hasStateClass, true, message);
  assert.ok(geometry.centerXDelta <= 1.5 && geometry.centerYDelta <= 1.5, message);
  assert.ok(Object.values(geometry.safeInsets).every((value) => value >= 12), message);
  assert.ok(geometry.labelWidth < geometry.cardWidth && geometry.labelHeight < geometry.cardHeight, message);
  assert.ok(geometry.fontSize <= 96, message);
  assert.equal(geometry.noScrollOverflow, true, message);
  assert.equal(geometry.categoryHidden, true, message);
  assert.equal(geometry.roundHidden, true, message);
  assert.equal(geometry.masteredHidden, true, message);
}
async function showCompletedState(targetPage) {
  await targetPage.evaluate(() => {
    const key = window.__PHONETICS_APP__.getStorageKey();
    const state = window.__PHONETICS_APP__.getState();
    const ids = window.__PHONETICS_APP__.getItems().map((item) => item.id);
    state.masteredIds = ids;
    state.records = Object.fromEntries(ids.map((id) => [id, { status: "mastered", correctCount: 3 }]));
    Object.assign(state, {
      dailyNewIds: [], dailyNewCorrectCounts: {}, dailyMixedDoneIds: [],
      dailyReviewIds: [], dailyReviewDate: "", dailyReviewDoneIds: [],
      reviewWrongIds: [], reviewWrongCorrectCounts: {}, dailyPhase: "idle",
      dailyTaskStarted: false, dailyTaskDone: false, activeWordId: null, inlineReviewContext: null,
    });
    localStorage.setItem(key, JSON.stringify(state));
  });
  await targetPage.reload();
  await targetPage.click("#startReview");
}
async function assertLearningContentLayout(targetPage, mobileLayout = false) {
  const card = await targetPage.locator("#currentChar").evaluate((button) => {
    const cardRect = button.getBoundingClientRect();
    const category = button.querySelector(".phonetic-card-category").getBoundingClientRect();
    const symbol = button.querySelector(".hanzi-content").getBoundingClientRect();
    const round = button.parentElement.querySelector("#reviewRoundBadge").getBoundingClientRect();
    const masteredNode = button.parentElement.querySelector("#masteredBadge");
    const masteredWasHidden = masteredNode.classList.contains("hidden");
    masteredNode.classList.remove("hidden");
    const mastered = masteredNode.getBoundingClientRect();
    if (masteredWasHidden) masteredNode.classList.add("hidden");
    const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    return {
      centerXDelta: Math.abs((symbol.left + symbol.right) / 2 - (cardRect.left + cardRect.right) / 2),
      centerYDelta: Math.abs((symbol.top + symbol.bottom) / 2 - (cardRect.top + cardRect.bottom) / 2),
      categorySymbolOverlap: intersects(category, symbol),
      categoryRoundOverlap: intersects(category, round),
      symbolRoundOverlap: intersects(symbol, round),
      categoryMasteredOverlap: intersects(category, mastered),
      symbolMasteredOverlap: intersects(symbol, mastered),
    };
  });
  const examples = await targetPage.locator(".phonetic-example").evaluateAll((nodes) => nodes.map((node) => {
    const wordNode = node.querySelector(".phonetic-example-word");
    const transcriptionNode = node.querySelector(".phonetic-transcription");
    const word = wordNode.getBoundingClientRect();
    const transcription = transcriptionNode.getBoundingClientRect();
    return {
      transcriptionBelowWord: transcription.top >= word.bottom - 1,
      wordCentered: Math.abs((word.left + word.right) / 2 - (transcription.left + transcription.right) / 2) <= 2,
      wordFontSize: parseFloat(getComputedStyle(wordNode).fontSize),
      transcriptionFontSize: parseFloat(getComputedStyle(transcriptionNode).fontSize),
      noOverflow: wordNode.scrollWidth <= wordNode.clientWidth + 1 && transcriptionNode.scrollWidth <= transcriptionNode.clientWidth + 1,
    };
  }));
  const diagnostics = { mobileLayout, card, examples };
  const diagnosticMessage = JSON.stringify(diagnostics);
  assert.ok(card.centerXDelta <= 1.5, diagnosticMessage);
  assert.ok(card.centerYDelta <= 1.5, diagnosticMessage);
  assert.equal(card.categorySymbolOverlap, false, diagnosticMessage);
  assert.equal(card.categoryRoundOverlap, false, diagnosticMessage);
  assert.equal(card.symbolRoundOverlap, false, diagnosticMessage);
  assert.equal(card.categoryMasteredOverlap, false, diagnosticMessage);
  assert.equal(card.symbolMasteredOverlap, false, diagnosticMessage);
  assert.equal(examples.length, 3, diagnosticMessage);
  assert.ok(examples.every((entry) => entry.transcriptionBelowWord), diagnosticMessage);
  assert.ok(examples.every((entry) => entry.wordCentered), diagnosticMessage);
  assert.ok(examples.every((entry) => entry.noOverflow), diagnosticMessage);
  assert.ok(examples.every((entry) => entry.wordFontSize >= (mobileLayout ? 36 : 40)), diagnosticMessage);
  assert.ok(examples.every((entry) => entry.transcriptionFontSize >= (mobileLayout ? 26 : 28)), diagnosticMessage);
  assert.ok(examples.every((entry) => entry.transcriptionFontSize < entry.wordFontSize), diagnosticMessage);
}
async function assertVisiblePhoneticChips(targetPage, mobileLayout = false) {
  const chips = await targetPage.locator(".phonetic-list .word-chip:visible").evaluateAll((buttons) => buttons.map((button) => ({
    text: button.textContent.trim(),
    hasProgressNode: Boolean(button.querySelector("small")),
    fontSize: parseFloat(getComputedStyle(button).fontSize),
    noOverflow: button.scrollWidth <= button.clientWidth + 1 && button.scrollHeight <= button.clientHeight + 1,
  })));
  assert.ok(chips.length > 0, "没有可见音标芯片");
  assert.ok(chips.every((chip) => !chip.hasProgressNode && !/\d+\s*\/\s*\d+/.test(chip.text)), JSON.stringify(chips));
  assert.ok(chips.every((chip) => chip.fontSize >= (mobileLayout ? 34 : 32)), JSON.stringify(chips));
  assert.ok(chips.every((chip) => chip.noOverflow), JSON.stringify(chips));
}
async function assertHeaderDoesNotOverlapTabs(targetPage) {
  const boxes = await targetPage.locator("header").evaluate((header) => {
    const toBox = (node) => {
      const rect = node.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    };
    return { tabs: toBox(header.querySelector(".module-tabs")), bomb: toBox(header.querySelector("#bombGameEntry")) };
  });
  const overlaps = boxes.tabs.left < boxes.bomb.right && boxes.tabs.right > boxes.bomb.left &&
    boxes.tabs.top < boxes.bomb.bottom && boxes.tabs.bottom > boxes.bomb.top;
  assert.equal(overlaps, false, "header bomb entry overlaps module tabs");
}
await assertMapControlsDoNotOverlap(page);
await assertHeaderDoesNotOverlapTabs(page);
await assertLearningContentLayout(page);
await assertVisiblePhoneticChips(page);
await page.locator("#bombGameEntry").focus();
assert.equal(await page.evaluate(() => document.activeElement?.id), "bombGameEntry");
await Promise.all([
  page.waitForURL(/bomb-game\.html/),
  page.keyboard.press("Enter"),
]);
assert.match(page.url(), /bomb-game\.html/);
await page.goBack();
await page.waitForFunction(() => Boolean(window.__PHONETICS_APP__));

const coveragePage = await context.newPage();
const coverageErrors = [];
coveragePage.on("pageerror", (error) => coverageErrors.push(error.message));
await coveragePage.goto(new URL("phonetics.html?test=phonetics-layout-coverage", rootUrl).href);
await coveragePage.evaluate(() => localStorage.removeItem(window.__PHONETICS_APP__.getStorageKey()));
await coveragePage.reload();
await coveragePage.click("#startReview");
const coveredIds = new Set();
for (let index = 0; index < 48; index += 1) {
  const current = await coveragePage.evaluate(() => window.__PHONETICS_APP__.getCurrentItem());
  assert.ok(current && !coveredIds.has(current.id), `布局覆盖重复或缺失：${current?.id}`);
  coveredIds.add(current.id);
  assert.equal((await coveragePage.locator("#currentChar .phonetic-card-category").textContent()).trim(), `${current.title.replace(/^DJ\s*/, "")} · ${current.letters[0]}`);
  assert.equal(await coveragePage.locator("#pinyinLine .phonetic-category").count(), 0);
  assert.deepEqual(await coveragePage.locator(".phonetic-example-word").allTextContents(), current.examples);
  assert.ok((await coveragePage.locator(".phonetic-transcription").allTextContents()).every((value) => /^\/.+\/$/.test(value)));
  assert.equal(await coveragePage.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
  const cellsFit = await coveragePage.locator(".phonetic-example").evaluateAll((nodes) =>
    nodes.every((node) => node.scrollWidth <= node.clientWidth + 1));
  assert.equal(cellsFit, true, `示例词溢出：${current.id}`);
  await assertLearningContentLayout(coveragePage);
  await coveragePage.click("#markMastered");
}
assert.equal(coveredIds.size, 48);
assert.deepEqual(coverageErrors, []);
await coveragePage.close();

const intermediateContext = await browser.newContext({ viewport: { width: 847, height: 1039 } });
const intermediate = await intermediateContext.newPage();
await intermediate.goto(new URL("phonetics.html?test=phonetics-intermediate", rootUrl).href);
await intermediate.evaluate(() => localStorage.removeItem(window.__PHONETICS_APP__.getStorageKey()));
await intermediate.reload();
await assertStateLabelFits(intermediate, "开始");
await showCompletedState(intermediate);
await assertStateLabelFits(intermediate, "完成");
assert.equal(await intermediate.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
await intermediateContext.close();

const interruptedId = dailyState.activeWordId;
const inline = page.locator(`#todayNewList [data-inline-id]:not([data-inline-id="${interruptedId}"])`).first();
await inline.focus();
await page.keyboard.press("Enter");
assert.notEqual((await page.evaluate(() => window.__PHONETICS_APP__.getState())).activeWordId, interruptedId);
await page.click("#markCorrect");
assert.equal((await page.evaluate(() => window.__PHONETICS_APP__.getState())).activeWordId, interruptedId);

const beforeRefresh = await page.evaluate(() => window.__PHONETICS_APP__.getState());
await page.reload();
const afterRefresh = await page.evaluate(() => window.__PHONETICS_APP__.getState());
assert.deepEqual(afterRefresh.dailyNewIds, beforeRefresh.dailyNewIds);
assert.equal(afterRefresh.activeWordId, beforeRefresh.activeWordId);
for (let guard = 0; guard < 20; guard += 1) {
  const current = await page.evaluate(() => window.__PHONETICS_APP__.getState());
  if (current.dailyNewIds.every((id) => (current.dailyNewCorrectCounts[id] || 0) >= 3 || current.masteredIds.includes(id))) break;
  await page.click("#markCorrect");
}
assert.equal(await page.locator("#finishNewWords").isVisible(), true);
await page.click("#finishNewWords");
for (let guard = 0; guard < 10; guard += 1) {
  if ((await page.evaluate(() => window.__PHONETICS_APP__.getState())).dailyTaskDone) break;
  await page.click("#markCorrect");
}
assert.equal((await page.evaluate(() => window.__PHONETICS_APP__.getState())).dailyTaskDone, true);
for (const selector of ["#startDaily", "#startReview"]) assert.equal(await page.locator(selector).isVisible(), true);
await page.screenshot({ path: "tests/phonetics-desktop.png", fullPage: true });

await page.evaluate(() => {
  const key = window.__PHONETICS_APP__.getStorageKey();
  const state = window.__PHONETICS_APP__.getState();
  Object.assign(state, {
    reviewRound: 0, todayDate: "2026-08-21",
    dailyNewIds: [], dailyNewCorrectCounts: {}, dailyMixedDoneIds: [],
    dailyReviewIds: [], dailyReviewDate: "", dailyReviewDoneIds: [],
    reviewWrongIds: [], reviewWrongCorrectCounts: {}, dailyPhase: "idle",
    dailyTaskStarted: false, dailyTaskDone: false, activeWordId: null, inlineReviewContext: null,
  });
  state.records = {};
  state.masteredIds = [];
  state.recentWrongIds = [];
  for (const item of window.__PHONETICS_APP__.getItems().slice(0, 25)) {
    state.records[item.id] = { status: "known", correctCount: 3, errorCount: 0, streak: 3, nextReviewRound: 1, reviewStage: 1 };
  }
  localStorage.setItem(key, JSON.stringify(state));
});
await page.reload();
await page.click("#startReview");
const firstReview = (await page.evaluate(() => window.__PHONETICS_APP__.getState())).dailyReviewIds;
assert.equal(firstReview.length, 48);
assert.deepEqual(firstReview, (await page.evaluate(() => window.__PHONETICS_APP__.getItems())).map((item) => item.id));
await page.evaluate(() => window.__PHONETICS_APP__.dispatch("startReview"));
assert.deepEqual((await page.evaluate(() => window.__PHONETICS_APP__.getState())).dailyReviewIds, firstReview);
await page.reload();
assert.deepEqual((await page.evaluate(() => window.__PHONETICS_APP__.getState())).dailyReviewIds, firstReview);
await page.click("#markWrong");
await assertVisiblePhoneticChips(page);

const newlyMastered = (await page.evaluate(() => window.__PHONETICS_APP__.getState())).activeWordId;
await page.click("#markMastered");
const immediatelyAfterMaster = await page.evaluate(() => window.__PHONETICS_APP__.getState());
assert.equal(immediatelyAfterMaster.dailyReviewIds.includes(newlyMastered), false);
assert.equal(immediatelyAfterMaster.reviewWrongIds.includes(newlyMastered), false);
assert.notEqual(immediatelyAfterMaster.activeWordId, newlyMastered);
await page.evaluate(() => window.__PHONETICS_APP__.dispatch("startReview"));
const afterMasteredReentry = await page.evaluate(() => window.__PHONETICS_APP__.getState());
assert.equal(afterMasteredReentry.dailyReviewIds.length, 47);
assert.equal(afterMasteredReentry.dailyReviewIds.includes(newlyMastered), false);

await page.evaluate(() => {
  const key = window.__PHONETICS_APP__.getStorageKey();
  const state = window.__PHONETICS_APP__.getState();
  const ids = window.__PHONETICS_APP__.getItems().map((item) => item.id);
  state.masteredIds = ids;
  state.records = Object.fromEntries(ids.map((id) => [id, { status: "mastered", correctCount: 3 }]));
  Object.assign(state, {
    dailyNewIds: [], dailyNewCorrectCounts: {}, dailyMixedDoneIds: [],
    dailyReviewIds: [], dailyReviewDate: "", dailyReviewDoneIds: [],
    reviewWrongIds: [], reviewWrongCorrectCounts: {}, dailyPhase: "idle",
    dailyTaskStarted: false, dailyTaskDone: false, activeWordId: null, inlineReviewContext: null,
  });
  localStorage.setItem(key, JSON.stringify(state));
});
await page.reload();
await page.click("#startReview");
const emptyReview = await page.evaluate(() => window.__PHONETICS_APP__.getState());
assert.equal(emptyReview.dailyReviewIds.length, 0);
assert.equal(emptyReview.dailyTaskStarted, false);
assert.equal(emptyReview.dailyTaskDone, true);
assert.equal((await page.locator("#currentChar .hanzi-content").textContent()).trim(), "完成");
await assertStateLabelFits(page, "完成");
assert.match(await page.locator("#pinyinLine").textContent(), /本次任务已完成/);
assert.equal(await page.locator("#feedback").isVisible(), false);
for (const selector of ["#startDaily", "#startReview"]) assert.equal(await page.locator(selector).isVisible(), true);

let dialogs = 0;
page.on("dialog", async (dialog) => { dialogs += 1; await dialog.accept(); });
await page.click("#resetPhonetics");
assert.equal(dialogs, 2);
const isolation = await page.evaluate((keys) => ({
  values: Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)])),
  mutations: window.__storageMutations,
  phoneticsKey: window.__PHONETICS_APP__.getStorageKey(),
  state: window.__PHONETICS_APP__.getState(),
}), protectedKeys);
for (const key of protectedKeys) assert.equal(isolation.values[key], `sentinel:${key}`);
assert.ok(isolation.mutations.filter((entry) => !protectedKeys.includes(entry.key))
  .every((entry) => entry.key === isolation.phoneticsKey));
assert.equal(isolation.state.characterCount, 48);
await page.click("#startReview");
assert.equal((await page.evaluate(() => window.__PHONETICS_APP__.getState())).dailyReviewIds.length, 48);

const mobileContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
await installSpeechSpy(mobileContext);
const mobile = await mobileContext.newPage();
await mobile.goto(new URL("phonetics.html?test=phonetics-mobile", rootUrl).href);
await mobile.evaluate(() => localStorage.removeItem(window.__PHONETICS_APP__.getStorageKey()));
await mobile.reload();
assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
await assertStateLabelFits(mobile, "开始");
await showCompletedState(mobile);
await assertStateLabelFits(mobile, "完成");
await mobile.evaluate(() => localStorage.removeItem(window.__PHONETICS_APP__.getStorageKey()));
await mobile.reload();
await assertStateLabelFits(mobile, "开始");
await mobile.tap("#startDaily");
assert.equal(await mobile.locator(".phonetic-details").isVisible(), true);
const mobileDetails = await mobile.locator(".phonetic-details").textContent();
const mobileSpeechCount = await mobile.evaluate(() => window.__phoneticsSpeechSpy.calls.length);
await mobile.tap("#currentChar");
await mobile.waitForFunction((count) => window.__phoneticsSpeechSpy.calls.length === count + 1, mobileSpeechCount);
assert.equal(await mobile.locator(".phonetic-details").isVisible(), true);
assert.equal(await mobile.locator(".phonetic-details").textContent(), mobileDetails);
assert.equal(await mobile.locator("#markWrong").isVisible(), true);
assert.equal(await mobile.locator("header .phonetics-header-actions #bombGameEntry").isVisible(), true);
assert.equal(await mobile.locator("header #resetPhonetics").count(), 0);
assert.equal(await mobile.locator(".map-visual #bombGameEntry").count(), 0);
assert.equal(await mobile.locator(".map-visual .phonetics-map-reset #resetPhonetics").isVisible(), true);
assert.equal(await mobile.locator('.module-tabs a[href="./index.html"]').isVisible(), true);
assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
await assertMapControlsDoNotOverlap(mobile);
await assertHeaderDoesNotOverlapTabs(mobile);
await assertLearningContentLayout(mobile, true);
for (let index = 0; index < 3; index += 1) await mobile.tap("#markWrong");
await assertVisiblePhoneticChips(mobile, true);
await mobile.screenshot({ path: "tests/phonetics-390.png", fullPage: true });

assert.deepEqual(pageErrors, []);
console.log(JSON.stringify({
  ok: true,
  dataCount: 48,
  desktopOverflow: false,
  mobileWidth: 390,
  intermediateViewport: "847x1039",
  mobileOverflow: false,
  dailyRoute: "complete",
  reviewBatch: firstReview.length,
  fullReviewPolicy: "all-not-mastered",
  refreshRestoredFullReview: true,
  masteredExcludedOnReentry: true,
  allMasteredReviewCount: 0,
  inlineRestore: true,
  keyboard: ["Space"],
  touch: ["startDaily", "currentChar"],
  speechInputs: ["currentChar", "speakCurrent", "Space"],
  bombEntryLocation: "header",
  resetLocation: "map",
  layoutCoverage: 48,
  storageKey: isolation.phoneticsKey,
  protectedKeysUnchanged: protectedKeys,
  httpStatuses: assetStatuses,
  screenshots: ["tests/phonetics-desktop.png", "tests/phonetics-390.png"],
}, null, 2));

await mobileContext.close();
await context.close();
await browser.close();
