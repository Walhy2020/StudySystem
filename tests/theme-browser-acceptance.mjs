import assert from "node:assert/strict";
import { NUMBER_1_10_WORDS, NUMBER_11_19_WORDS, TENS_WORDS, TWINKLE_LYRICS, TWINKLE_SPOKEN_LYRICS, TWINKLE_WORDS, splitPhonetic } from "../theme-learning.js";
import { chromium } from "file:///C:/Users/St/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const baseUrl = process.env.HANZI_BASE_URL || "http://127.0.0.1:53177/";
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const pageErrors = [];
const failedResponses = [];
const protectedKeys = [
  "mario-hanzi-refactor-v1",
  "mario-literacy-desktop-mvp-v1",
  "mario-bomb-game-progress-v1",
  "mario-bomb-game-v1",
  "mario-phonetics-v1",
  "mario-book1-v1",
  "mario-theme-learning-v1"
];

async function prepareContext(options) {
  const context = await browser.newContext(options);
  await context.addInitScript(() => {
    window.__storageMutations = [];
    window.__spoken = [];
    window.__speechEvents = [];
    window.__speechTimer = 0;
    window.__completeSpeech = (item) => {
      window.__spoken.push(item.text);
      window.__speechEvents.push({ type: "start", text: item.text });
      clearTimeout(window.__speechTimer);
      window.__speechTimer = setTimeout(() => {
        window.__speechEvents.push({ type: "end", text: item.text });
        item.onend?.();
      }, 120);
    };
    const originalSet = Storage.prototype.setItem;
    const originalRemove = Storage.prototype.removeItem;
    Storage.prototype.setItem = function(key, value) { window.__storageMutations.push({ operation: "set", key }); return originalSet.call(this, key, value); };
    Storage.prototype.removeItem = function(key) { window.__storageMutations.push({ operation: "remove", key }); return originalRemove.call(this, key); };
    class FakeUtterance { constructor(text) { this.text = text; } }
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: FakeUtterance });
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: {
      cancel() { clearTimeout(window.__speechTimer); window.__speechEvents.push({ type: "cancel" }); },
      resume() {},
      getVoices() { return []; },
      addEventListener() {},
      removeEventListener() {},
      speak(item) { window.__completeSpeech(item); },
    } });
  });
  return context;
}

function watchPage(page) {
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => { if (response.status() >= 400) failedResponses.push(response.status() + " " + response.url()); });
}

async function assertNoOverflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
}

async function assertSeriesList(page, complete = false) {
  assert.equal(await page.locator(".theme-series-cell").count(), 4);
  const geometry = await page.locator(".theme-series-cell").evaluateAll((cells) => cells.map((cell) => {
    const box = cell.getBoundingClientRect();
    const preview = cell.querySelector(".series-preview").getBoundingClientRect();
    return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height, previewWidth: preview.width, previewHeight: preview.height, complete: cell.classList.contains("is-complete") };
  }));
  assert.ok(geometry.every(({ width, height, previewWidth, previewHeight }) => width >= 300 && height >= 300 && previewWidth >= 290 && previewHeight >= 170), JSON.stringify(geometry));
  assert.ok(geometry.every(({ top }) => Math.abs(top - geometry[0].top) <= 1), JSON.stringify(geometry));
  for (let index = 0; index < geometry.length - 1; index += 1) assert.ok(geometry[index].right <= geometry[index + 1].left, JSON.stringify(geometry));
  assert.equal(geometry.every(({ complete: value }) => value), complete);
}
async function openSeries(page, seriesId, action = "click") {
  const target = page.locator('[data-series-id="' + seriesId + '"]');
  if (action === "tap") await target.tap(); else await target.click();
  assert.equal(await page.locator("#themeSeriesList").isHidden(), true);
  assert.equal(await page.locator("#themeSeriesPanel").isVisible(), true);
  assert.equal(await page.evaluate(() => window.__THEME_LEARNING__.activeSeriesId), seriesId);
  const expected = { basics: 2, counting: 4, songs: 1, items: 4 }[seriesId];
  assert.equal(await page.locator(".theme-card:visible").count(), expected);
}

async function assertReviewedCard(page, themeId, expected = true) {
  const button = page.locator('[data-theme-id="' + themeId + '"]');
  const card = button.locator("xpath=ancestor::article[contains(@class,'theme-card')]");
  assert.equal(await card.evaluate((node) => node.classList.contains("is-reviewed")), expected);
  assert.equal(await card.locator(".theme-reviewed-badge").isVisible(), expected);
  assert.equal((await card.getAttribute("aria-label") || "").includes("复习完毕"), expected);
}

async function assertReviewedCardGeometry(page, expectedCount) {
  const cards = await page.locator(".theme-card.is-reviewed:visible").evaluateAll((nodes) => nodes.map((card) => {
    const badge = card.querySelector(".theme-reviewed-badge").getBoundingClientRect();
    const cardBox = card.getBoundingClientRect();
    const title = card.querySelector("h3").getBoundingClientRect();
    const button = card.querySelector("[data-theme-id]").getBoundingClientRect();
    const overlap = (left, right) => Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left)) *
      Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
    return {
      badgeLarge: badge.width >= 60 && badge.height >= 60,
      insideCard: badge.left >= cardBox.left && badge.top >= cardBox.top && badge.right <= cardBox.right && badge.bottom <= cardBox.bottom,
      clearOfTitle: overlap(badge, title) <= 1,
      clearOfButton: overlap(badge, button) <= 1
    };
  }));
  assert.equal(cards.length, expectedCount);
  assert.ok(cards.every((item) => Object.values(item).every(Boolean)), JSON.stringify(cards));
}

async function assertGeometry(page, themeId, ids, figureId) {
  const geometry = await page.evaluate(({ themeId, ids, figureId }) => {
    const svg = document.querySelector(figureId).getBoundingClientRect();
    return ids.map((id) => {
      const node = document.querySelector('[data-theme="' + themeId + '"] [data-target="' + id + '"]');
      const box = node.getBoundingClientRect();
      const points = [
        [box.left + box.width / 2, box.top + box.height / 2],
        [box.left + box.width * 0.35, box.top + box.height * 0.45],
        [box.left + box.width * 0.65, box.top + box.height * 0.45]
      ];
      const hit = points.some(([x, y]) => {
        const element = document.elementFromPoint(x, y);
        return element === node || node.contains(element);
      });
      return {
        id,
        visible: box.width >= 36 && box.height >= 36,
        inside: box.left >= svg.left - 1 && box.top >= svg.top - 1 && box.right <= svg.right + 1 && box.bottom <= svg.bottom + 1,
        hit
      };
    });
  }, { themeId, ids, figureId });
  assert.ok(geometry.every((item) => item.visible && item.inside && item.hit), JSON.stringify(geometry));
}

async function assertBodyScene(page) {
  const assetStatus = await page.evaluate(async () => (await fetch("./assets/themes/body/body-character-anime-v2.png", { cache: "no-store" })).status);
  assert.equal(assetStatus, 200);
  const result = await page.evaluate(() => {
    const figure = document.querySelector("#marioFigure");
    const image = figure.querySelector(".body-character-image");
    const imageBox = image.getBoundingClientRect();
    const targets = [...figure.querySelectorAll(".body-part")].map((node) => {
      const box = node.getBoundingClientRect();
      const center = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return {
        id: node.dataset.target,
        insideImage: box.left >= imageBox.left - 1 && box.top >= imageBox.top - 1 && box.right <= imageBox.right + 1 && box.bottom <= imageBox.bottom + 1,
        centerHit: center === node || node.contains(center)
      };
    });
    return {
      href: image.getAttribute("href"),
      pointerEvents: getComputedStyle(image).pointerEvents,
      viewBox: figure.getAttribute("viewBox"),
      width: image.getAttribute("width"),
      height: image.getAttribute("height"),
      targets
    };
  });
  assert.equal(result.href, "./assets/themes/body/body-character-anime-v2.png");
  assert.equal(result.pointerEvents, "none");
  assert.equal(result.viewBox, "0 0 1024 1536");
  assert.equal(result.width, "1024");
  assert.equal(result.height, "1536");
  assert.ok(result.targets.every((target) => target.insideImage && target.centerHit), JSON.stringify(result.targets));
}

async function assertColorsScene(page) {
  const assetStatus = await page.evaluate(async () => (await fetch("./assets/themes/colors/colors-scene-v2.png", { cache: "no-store" })).status);
  assert.equal(assetStatus, 200);
  const result = await page.evaluate(() => {
    const image = document.querySelector("#colorsFigure .color-scene-image");
    const imageBox = image.getBoundingClientRect();
    const targets = [...document.querySelectorAll('[data-theme="colors"] .color-target')].map((node) => {
      const box = node.getBoundingClientRect();
      const center = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return {
        id: node.dataset.target,
        box: { left: box.left, top: box.top, right: box.right, bottom: box.bottom },
        insideImage: box.left >= imageBox.left - 1 && box.top >= imageBox.top - 1 && box.right <= imageBox.right + 1 && box.bottom <= imageBox.bottom + 1,
        centerHit: center === node || node.contains(center)
      };
    });
    const overlaps = [];
    for (let left = 0; left < targets.length; left += 1) {
      for (let right = left + 1; right < targets.length; right += 1) {
        const a = targets[left].box;
        const b = targets[right].box;
        const overlapWidth = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const overlapHeight = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        if (overlapWidth * overlapHeight > 1) overlaps.push(targets[left].id + ":" + targets[right].id);
      }
    }
    return {
      href: image.getAttribute("href"),
      pointerEvents: getComputedStyle(image).pointerEvents,
      targets,
      overlaps
    };
  });
  assert.equal(result.href, "./assets/themes/colors/colors-scene-v2.png");
  assert.equal(result.pointerEvents, "none");
  assert.ok(result.targets.every((target) => target.insideImage && target.centerHit), JSON.stringify(result.targets));
  assert.deepEqual(result.overlaps, []);
}

async function assertItemsScene(page, series = 1) {
  const assetStatus = await page.evaluate(
    async (series) =>
      (
        await fetch(
          "./assets/themes/items/classic-items-" + series + "-scene-v1.png",
          { cache: "no-store" }
        )
      ).status,
    series
  );
  assert.equal(assetStatus, 200);
  const result = await page.evaluate((series) => {
    const figure = document.querySelector("#items" + series + "Figure");
    const image = figure.querySelector(".item-scene-image");
    const imageBox = image.getBoundingClientRect();
    const targets = [...figure.querySelectorAll(".item-target")].map((node) => {
      const box = node.getBoundingClientRect();
      const center = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return {
        id: node.dataset.target,
        box: { left: box.left, top: box.top, right: box.right, bottom: box.bottom },
        insideImage: box.left >= imageBox.left - 1 && box.top >= imageBox.top - 1 && box.right <= imageBox.right + 1 && box.bottom <= imageBox.bottom + 1,
        centerHit: center === node || node.contains(center)
      };
    });
    const overlaps = [];
    for (let left = 0; left < targets.length; left += 1) {
      for (let right = left + 1; right < targets.length; right += 1) {
        const a = targets[left].box;
        const b = targets[right].box;
        const overlapWidth = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
        const overlapHeight = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        if (overlapWidth * overlapHeight > 1) overlaps.push(targets[left].id + ":" + targets[right].id);
      }
    }
    return {
      href: image.getAttribute("href"),
      pointerEvents: getComputedStyle(image).pointerEvents,
      viewBox: figure.getAttribute("viewBox"),
      width: image.getAttribute("width"),
      height: image.getAttribute("height"),
      targets,
      overlaps
    };
  }, series);
  assert.equal(
    result.href,
    "./assets/themes/items/classic-items-" + series + "-scene-v1.png"
  );
  assert.equal(result.pointerEvents, "none");
  assert.equal(result.viewBox, "0 0 1536 1024");
  assert.equal(result.width, "1536");
  assert.equal(result.height, "1024");
  assert.ok(result.targets.every((target) => target.insideImage && target.centerHit), JSON.stringify(result.targets));
  assert.deepEqual(result.overlaps, []);
}
async function assertCountingVisual(page, themeId, words, figureId) {
  const result = await page.evaluate(({ themeId, words, figureId }) => {
    const figure = document.querySelector(figureId).getBoundingClientRect();
    const targets = words.map((word) => {
      const node = document.querySelector('[data-theme="' + themeId + '"] [data-target="' + word.id + '"]');
      const box = node.getBoundingClientRect();
      const units = node.querySelectorAll(".counting-units > i").length;
      const groups = node.querySelectorAll(".ten-frame").length;
      const groupDots = node.querySelectorAll(".ten-frame > b").length;
      return {
        id: word.id,
        units,
        groups,
        groupDots,
        expectedValue: word.value,
        expectedGroups: word.groups || 0,
        inside: box.left >= figure.left - 1 && box.top >= figure.top - 1 && box.right <= figure.right + 1 && box.bottom <= figure.bottom + 1,
        noOverflow: node.scrollWidth <= node.clientWidth && node.scrollHeight <= node.clientHeight
      };
    });
    const overlaps = [];
    for (let left = 0; left < targets.length; left += 1) {
      const a = document.querySelector('[data-theme="' + themeId + '"] [data-target="' + targets[left].id + '"]').getBoundingClientRect();
      for (let right = left + 1; right < targets.length; right += 1) {
        const b = document.querySelector('[data-theme="' + themeId + '"] [data-target="' + targets[right].id + '"]').getBoundingClientRect();
        const area = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
        if (area > 1) overlaps.push(targets[left].id + ":" + targets[right].id);
      }
    }
    return { targets, overlaps };
  }, { themeId, words, figureId });
  assert.deepEqual(result.overlaps, []);
  for (const target of result.targets) {
    assert.equal(target.inside, true, target.id);
    assert.equal(target.noOverflow, true, target.id);
    if (target.expectedGroups) {
      assert.equal(target.groups, target.expectedGroups, target.id);
      assert.equal(target.groupDots, target.expectedValue, target.id);
      assert.equal(target.units, 0, target.id);
    } else {
      assert.equal(target.units, target.expectedValue, target.id);
      assert.equal(target.groups, 0, target.id);
    }
  }
}

async function learnAll(page, themeId, expected, action = "click") {
  for (const [id, values] of Object.entries(expected)) {
    const locator = page.locator('[data-theme="' + themeId + '"] [data-target="' + id + '"]');
    const spokenBeforeTarget = await page.evaluate(() => window.__spoken.length);
    if (action === "tap") await locator.tap(); else await locator.click();
    assert.equal(await page.evaluate(() => window.__spoken.length), spokenBeforeTarget);
    assert.equal((await page.locator(".word-en").textContent()).trim(), values[0]);
    assert.equal((await page.locator(".phonetic").textContent()).trim(), values[1]);
    assert.equal((await page.locator(".translation").textContent()).trim(), values[2]);
    assert.equal((await page.locator(".sentence").textContent()).trim(), values[3]);
    const toggle = page.locator("#phoneticToggle");
    assert.equal(await toggle.getAttribute("aria-expanded"), "false");
    assert.equal(await page.locator("#phonemeBreakdown").isHidden(), true);
    assert.equal(await page.locator("#phoneticHint").count(), 0);
    if (action === "tap") await toggle.tap(); else await toggle.click();
    assert.equal(await toggle.getAttribute("aria-expanded"), "true");
    assert.equal(await page.locator("#phonemeBreakdown").isVisible(), true);
    assert.deepEqual(await page.locator("#phonemeBreakdown .phoneme-chip").evaluateAll((nodes) => nodes.map((node) => node.dataset.symbol)), splitPhonetic(values[1]));
    assert.equal(await page.locator("#phonemeBreakdown .phoneme-chip").evaluateAll((nodes) => nodes.every((node) => !node.textContent.includes("/"))), true);
    assert.deepEqual(await page.locator("#phonemeBreakdown .phoneme-stress").allTextContents().then((items) => items.map((item) => item.trim())), splitPhonetic(values[1]).filter((symbol) => symbol === "ˈ" || symbol === "ˌ"));
    if (action === "tap") await toggle.tap(); else await toggle.click();
    assert.equal(await toggle.getAttribute("aria-expanded"), "false");
    if (action !== "tap") {
      await locator.focus();
      await page.keyboard.press("Space");
      assert.equal(await toggle.getAttribute("aria-expanded"), "true");
      assert.equal(await page.locator("#phonemeBreakdown").isVisible(), true);
      await page.keyboard.press("Space");
      assert.equal(await toggle.getAttribute("aria-expanded"), "false");
      assert.equal(await page.locator("#phonemeBreakdown").isHidden(), true);
    }
    const repeat = page.locator("#repeatWord");
    assert.equal((await repeat.textContent()).trim(), "🔊");
    assert.equal(await repeat.getAttribute("aria-label"), "朗读 " + values[0] + " 和例句");
    const spokenBeforeRepeat = await page.evaluate(() => window.__spoken.length);
    if (action === "tap") await repeat.tap(); else await repeat.click();
    await page.waitForFunction((before) => window.__spoken.length > before, spokenBeforeRepeat);
    assert.equal(await page.evaluate(() => window.__spoken.length), spokenBeforeRepeat + 1);
    assert.equal(await page.evaluate(() => window.__spoken.at(-1)), values[0] + ". " + values[3]);
  }
  const total = Object.keys(expected).length;
  assert.equal((await page.locator("#sessionProgress").textContent()).trim(), "已认识 " + total + "/" + total);
}

async function assertWordNavigation(page, themeId, ids, action = "click") {
  const spokenBefore = await page.evaluate(() => window.__spoken.length);
  const firstTarget = page.locator('[data-theme="' + themeId + '"] [data-target="' + ids[0] + '"]');
  if (action === "tap") await firstTarget.tap(); else await firstTarget.click();
  assert.deepEqual(await page.locator(".word-navigation > button").evaluateAll((nodes) => nodes.map((node) => node.id)), ["repeatWord", "previousWord", "nextWord"]);
  assert.equal((await page.locator("#previousWord").textContent()).trim(), "Previous");
  assert.equal((await page.locator("#nextWord").textContent()).trim(), "Next");
  assert.equal(await page.locator("#previousWord").getAttribute("aria-label"), "Previous word");
  assert.equal(await page.locator("#nextWord").getAttribute("aria-label"), "Next word");
  assert.equal(await page.locator("#previousWord").isDisabled(), true);
  assert.equal(await page.locator("#nextWord").isEnabled(), true);
  const next = page.locator("#nextWord");
  if (action === "tap") await next.tap(); else await next.click();
  assert.equal((await page.locator(".word-en").textContent()).trim(), ids[1]);
  assert.equal(await page.locator("#previousWord").isEnabled(), true);
  const previous = page.locator("#previousWord");
  if (action === "tap") await previous.tap(); else await previous.click();
  assert.equal((await page.locator(".word-en").textContent()).trim(), ids[0]);
  const lastTarget = page.locator('[data-theme="' + themeId + '"] [data-target="' + ids.at(-1) + '"]');
  if (action === "tap") await lastTarget.tap(); else await lastTarget.click();
  assert.equal(await page.locator("#nextWord").isDisabled(), true);
  assert.equal(await page.evaluate(() => window.__spoken.length), spokenBefore);
  await assertNoOverflow(page);
}
async function finishRound(page, themeId, ids, action = "click") {
  const seenQuestions = [];
  const firstTarget = await page.evaluate(() => window.__THEME_LEARNING__.session.target().id);
  const wrongTarget = ids.find((id) => id !== firstTarget);
  const wrongLocator = page.locator('[data-theme="' + themeId + '"] [data-target="' + wrongTarget + '"]');
  if (action === "tap") await wrongLocator.tap(); else await wrongLocator.click();
  assert.match((await page.locator("#practiceFeedback").textContent()).trim(), /再试一次/);
  assert.equal(await page.evaluate(() => window.__THEME_LEARNING__.session.questionIndex), 0);
  for (let count = 0; count < ids.length; count += 1) {
    const target = await page.evaluate(() => window.__THEME_LEARNING__.session.target().id);
    const sentence = await page.evaluate((id) => window.__THEME_LEARNING__.session.word(id).sentence, target);
    const eventStart = await page.evaluate(() => window.__speechEvents.length);
    seenQuestions.push(target);
    const targetLocator = page.locator('[data-theme="' + themeId + '"] [data-target="' + target + '"]');
    if (action === "tap") await targetLocator.tap(); else await targetLocator.click();
    assert.match((await page.locator("#practiceFeedback").textContent()).trim(), /答对了/);
    await page.waitForTimeout(930);
    const speechEvents = await page.evaluate((start) => window.__speechEvents.slice(start), eventStart);
    const sentenceStart = speechEvents.findIndex((event) => event.type === "start" && event.text === sentence);
    const sentenceEnd = speechEvents.findIndex((event) => event.type === "end" && event.text === sentence);
    const nextStart = speechEvents.findIndex((event, index) => index > sentenceStart && event.type === "start" && event.text !== sentence);
    assert.ok(sentenceStart >= 0 && sentenceEnd > sentenceStart, JSON.stringify(speechEvents));
    if (nextStart >= 0) assert.ok(sentenceEnd < nextStart, JSON.stringify(speechEvents));
  }
  assert.equal(new Set(seenQuestions).size, ids.length);
  assert.equal(await page.locator("#resultPanel").isVisible(), true);
  assert.equal((await page.locator("#resultScore").textContent()).trim(), ids.length + "/" + ids.length);
}

const countingExpected = (words) => Object.fromEntries(words.map((word) => [word.id, [word.word, word.phonetic, word.chinese, word.sentence]]));
const countingSeries = [
  { id: "numbers1", button: "#startNumbers1", figure: "#numbers1Figure", words: NUMBER_1_10_WORDS, expected: countingExpected(NUMBER_1_10_WORDS), instruction: /^Touch number (one|two|three|four|five|six|seven|eight|nine|ten)\.$/, completeTitle: "数字 1–10 全部找对！", screenshotDesktop: "tests/theme-numbers1-desktop.png", screenshotMobile: "tests/theme-numbers1-390.png" },
  { id: "numbersTeens", button: "#startNumbersTeens", figure: "#numbersTeensFigure", words: NUMBER_11_19_WORDS, expected: countingExpected(NUMBER_11_19_WORDS), instruction: /^Touch number (eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)\.$/, completeTitle: "数字 11–19 全部找对！", screenshotDesktop: "tests/theme-numbers-teens-desktop.png", screenshotMobile: "tests/theme-numbers-teens-390.png" },
  { id: "tens", button: "#startTens", figure: "#tensFigure", words: TENS_WORDS, expected: countingExpected(TENS_WORDS), instruction: /^Touch (ten|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|one hundred)\.$/, completeTitle: "整十 10–100 全部找对！", screenshotDesktop: "tests/theme-tens-desktop.png", screenshotMobile: "tests/theme-tens-390.png" }
];

const bodyIds = ["head", "hand", "arm", "leg", "foot", "body"];
const colorIds = ["red", "blue", "green", "yellow", "black", "white"];
const ordinalIds = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];
const itemIds = ["coin", "key", "crown", "treasure", "star", "moon"];
const item2Ids = ["mushroom", "flower", "leaf", "feather", "bell", "acorn"];
const item3Ids = ["banana", "shell", "bomb", "lightning", "horn", "ink"];
const item4Ids = ["cap", "suit", "hammer", "boomerang", "spring", "egg"];
const twinkleIds = TWINKLE_WORDS.map(({ id }) => id);
const bodyExpected = {
  head: ["head", "/hed/", "头", "This is Mario's head."],
  hand: ["hand", "/hænd/", "手", "This is Mario's hand."],
  arm: ["arm", "/ɑːm/", "手臂", "This is Mario's arm."],
  leg: ["leg", "/leɡ/", "腿", "This is Mario's leg."],
  foot: ["foot", "/fʊt/", "脚", "This is Mario's foot."],
  body: ["body", "/ˈbɒdi/", "身体", "This is Mario's body."]
};
const colorExpected = {
  red: ["red", "/red/", "红色", "The cap is red."],
  blue: ["blue", "/bluː/", "蓝色", "The block is blue."],
  green: ["green", "/ɡriːn/", "绿色", "The pipe is green."],
  yellow: ["yellow", "/ˈjeləʊ/", "黄色", "The coin is yellow."],
  black: ["black", "/blæk/", "黑色", "The bomb is black."],
  white: ["white", "/waɪt/", "白色", "The cloud is white."]
};

const ordinalExpected = {
  first: ["first", "/fɜːst/", "第一", "This is the first."],
  second: ["second", "/ˈsekənd/", "第二", "This is the second."],
  third: ["third", "/θɜːd/", "第三", "This is the third."],
  fourth: ["fourth", "/fɔːθ/", "第四", "This is the fourth."],
  fifth: ["fifth", "/fɪfθ/", "第五", "This is the fifth."],
  sixth: ["sixth", "/sɪksθ/", "第六", "This is the sixth."],
  seventh: ["seventh", "/ˈsevənθ/", "第七", "This is the seventh."],
  eighth: ["eighth", "/eɪtθ/", "第八", "This is the eighth."],
  ninth: ["ninth", "/naɪnθ/", "第九", "This is the ninth."],
  tenth: ["tenth", "/tenθ/", "第十", "This is the tenth."]
};
const itemsExpected = {
  coin: ["coin", "/kɔɪn/", "金币", "The coin is gold."],
  key: ["key", "/kiː/", "钥匙", "This key opens the door."],
  crown: ["crown", "/kraʊn/", "王冠", "The crown is royal."],
  treasure: ["treasure", "/ˈtreʒə/", "宝藏", "The treasure is in the chest."],
  star: ["star", "/stɑː/", "星星", "The star is bright."],
  moon: ["moon", "/muːn/", "月亮", "The moon shines at night."]
};const items2Expected = {
  mushroom: ["mushroom", "/ˈmʌʃruːm/", "蘑菇", "This is a mushroom."], flower: ["flower", "/ˈflaʊə/", "花", "The flower is bright."], leaf: ["leaf", "/liːf/", "叶子", "The leaf is green."], feather: ["feather", "/ˈfeðə/", "羽毛", "The feather is light."], bell: ["bell", "/bel/", "铃铛", "The bell rings."], acorn: ["acorn", "/ˈeɪkɔːn/", "橡果", "The acorn is small."]
};
const items3Expected = {
  banana: ["banana", "/bəˈnɑːnə/", "香蕉", "This is a banana."], shell: ["shell", "/ʃel/", "龟壳", "The shell is green."], bomb: ["bomb", "/bɒm/", "炸弹", "The bomb is black."], lightning: ["lightning", "/ˈlaɪtnɪŋ/", "闪电", "Lightning is fast."], horn: ["horn", "/hɔːn/", "喇叭", "The horn is loud."], ink: ["ink", "/ɪŋk/", "墨水", "The ink is black."]
};
const items4Expected = {
  cap: ["cap", "/kæp/", "帽子", "The cap is red."], suit: ["suit", "/suːt/", "套装", "This is a suit."], hammer: ["hammer", "/ˈhæmə/", "锤子", "The hammer is heavy."], boomerang: ["boomerang", "/ˈbuːməræŋ/", "回旋镖", "The boomerang comes back."], spring: ["spring", "/sprɪŋ/", "弹簧", "The spring can bounce."], egg: ["egg", "/eɡ/", "蛋", "This is an egg."]
};
const twinkleExpected = Object.fromEntries(TWINKLE_WORDS.map(({ id, word, phonetic, chinese, sentence }) => [id, [word, phonetic, chinese, sentence]]));
const additionalItemSeries = [
  { series: 2, id: "items2", ids: item2Ids, expected: items2Expected, labels: { mushroom: "mushroom 蘑菇", flower: "flower 花", leaf: "leaf 叶子", feather: "feather 羽毛", bell: "bell 铃铛", acorn: "acorn 橡果" }, instructions: ["mushroom", "flower", "leaf", "feather", "bell", "acorn"], completeTitle: "六个能力道具全部找对！", screenshotDesktop: "tests/theme-items2-desktop.png", screenshotMobile: "tests/theme-items2-390.png" },
  { series: 3, id: "items3", ids: item3Ids, expected: items3Expected, labels: { banana: "banana 香蕉", shell: "shell 龟壳", bomb: "bomb 炸弹", lightning: "lightning 闪电", horn: "horn 喇叭", ink: "ink 墨水" }, instructions: ["banana", "shell", "bomb", "lightning", "horn", "ink"], completeTitle: "六个赛车道具全部找对！", screenshotDesktop: "tests/theme-items3-desktop.png", screenshotMobile: "tests/theme-items3-390.png" },
  { series: 4, id: "items4", ids: item4Ids, expected: items4Expected, labels: { cap: "cap 帽子", suit: "suit 套装", hammer: "hammer 锤子", boomerang: "boomerang 回旋镖", spring: "spring 弹簧", egg: "egg 蛋" }, instructions: ["cap", "suit", "hammer", "boomerang", "spring", "egg"], completeTitle: "六个特殊装备全部找对！", screenshotDesktop: "tests/theme-items4-desktop.png", screenshotMobile: "tests/theme-items4-390.png" }
];

async function runCountingTheme(page, config, action = "click") {
  if (action === "tap") await page.locator(config.button).tap(); else await page.locator(config.button).click();
  const ids = config.words.map(({ id }) => id);
  assert.equal(await page.evaluate(() => window.__THEME_LEARNING__.activeThemeId), config.id);
  assert.equal((await page.locator("#sessionProgress").textContent()).trim(), "已认识 0/" + ids.length);
  await page.locator(config.figure).scrollIntoViewIfNeeded();
  await assertGeometry(page, config.id, ids, config.figure);
  await assertCountingVisual(page, config.id, config.words, config.figure);
  await learnAll(page, config.id, config.expected, action);
  await assertWordNavigation(page, config.id, ids, action);
  await page.screenshot({ path: action === "tap" ? config.screenshotMobile : config.screenshotDesktop, fullPage: true });
  if (action === "tap") await page.locator("#practiceStage").tap(); else await page.locator("#practiceStage").click();
  assert.match((await page.locator("#practiceInstruction").textContent()).trim(), config.instruction);
  await finishRound(page, config.id, ids, action);
  assert.equal((await page.locator("#resultTitle").textContent()).trim(), config.completeTitle);
  if (action === "tap") await page.locator("#restartRound").tap(); else await page.locator("#restartRound").click();
  assert.equal(new Set(await page.evaluate(() => window.__THEME_LEARNING__.session.questions)).size, ids.length);
}

async function runAdditionalItemSeries(page, config, action = "click") {
  const activate = page.locator("#startItems" + config.series);
  if (action === "tap") await activate.tap(); else await activate.click();
  assert.equal(await page.evaluate(() => window.__THEME_LEARNING__.activeThemeId), config.id);
  assert.equal((await page.locator("#sessionProgress").textContent()).trim(), "已认识 0/6");
  await page.locator("#items" + config.series + "Figure").scrollIntoViewIfNeeded();
  await assertGeometry(page, config.id, config.ids, "#items" + config.series + "Figure");
  await assertItemsScene(page, config.series);
  await learnAll(page, config.id, config.expected, action);
  await assertWordNavigation(page, config.id, config.ids, action);
  for (const [key, label] of Object.entries(config.labels)) assert.equal(await page.locator('[data-theme="' + config.id + '"] [data-target="' + key + '"]').getAttribute("aria-label"), label);
  await page.screenshot({ path: action === "tap" ? config.screenshotMobile : config.screenshotDesktop, fullPage: true });
  if (action === "tap") await page.locator("#practiceStage").tap(); else await page.locator("#practiceStage").click();
  assert.match((await page.locator("#practiceInstruction").textContent()).trim(), new RegExp("^Touch the (" + config.instructions.join("|") + ")\\.$"));
  await finishRound(page, config.id, config.ids, action);
  assert.equal((await page.locator("#resultTitle").textContent()).trim(), config.completeTitle);
  if (action === "tap") await page.locator("#restartRound").tap(); else await page.locator("#restartRound").click();
  assert.equal(new Set(await page.evaluate(() => window.__THEME_LEARNING__.session.questions)).size, 6);
}

async function runTwinkleTheme(page, action = "click") {
  const activate = page.locator("#startTwinkle");
  const spokenBeforeEntry = await page.evaluate(() => window.__spoken.length);
  if (action === "tap") await activate.tap(); else await activate.click();
  assert.equal(await page.evaluate(() => window.__THEME_LEARNING__.activeThemeId), "twinkle");
  assert.equal((await page.locator("#sessionProgress").textContent()).trim(), "已认识 0/8");
  assert.equal(await page.evaluate(() => window.__spoken.length), spokenBeforeEntry);
  await page.locator("#twinkleScene .song-night").scrollIntoViewIfNeeded();
  await assertGeometry(page, "twinkle", twinkleIds, "#twinkleScene .song-night");
  const lyrics = await page.locator(".song-lyric-line").evaluateAll((lines) => lines.map((line) => {
    const text = line.querySelector(".song-lyric-text").getBoundingClientRect();
    const ipa = line.querySelector(".song-lyric-ipa").getBoundingClientRect();
    return { text: line.querySelector(".song-lyric-text").textContent.trim(), ipa: line.querySelector(".song-lyric-ipa").textContent.trim(), below: ipa.top >= text.bottom - 1, centered: Math.abs((text.left + text.right) / 2 - (ipa.left + ipa.right) / 2) <= 2, visible: text.width > 0 && text.height > 0 && ipa.width > 0 && ipa.height > 0 };
  }));
  assert.deepEqual(lyrics.map(({ text, ipa }) => ({ text, phonetic: ipa })), TWINKLE_LYRICS);
  assert.ok(lyrics.every(({ below, centered, visible }) => below && centered && visible), JSON.stringify(lyrics));
  const spokenBeforeLyrics = await page.evaluate(() => window.__spoken.length);
  if (action === "tap") await page.locator("#speakSongLyrics").tap(); else await page.locator("#speakSongLyrics").click();
  await page.waitForFunction((before) => window.__spoken.length > before, spokenBeforeLyrics);
  assert.equal(await page.evaluate(() => window.__spoken.at(-1)), TWINKLE_SPOKEN_LYRICS);
  assert.equal(await page.evaluate(() => window.__spoken.length), spokenBeforeLyrics + 1);
  await learnAll(page, "twinkle", twinkleExpected, action);
  await assertWordNavigation(page, "twinkle", twinkleIds, action);
  await page.screenshot({ path: action === "tap" ? "tests/theme-twinkle-390.png" : "tests/theme-twinkle-desktop.png", fullPage: true });
  if (action === "tap") await page.locator("#practiceStage").tap(); else await page.locator("#practiceStage").click();
  assert.match((await page.locator("#practiceInstruction").textContent()).trim(), /^Touch (twinkle|little|wonder|high|the star|the world|the diamond|the sky).$/);
  await finishRound(page, "twinkle", twinkleIds, action);
  assert.equal((await page.locator("#resultTitle").textContent()).trim(), "八个童谣单词全部找对！");
  if (action === "tap") await page.locator("#restartRound").tap(); else await page.locator("#restartRound").click();
  assert.equal(new Set(await page.evaluate(() => window.__THEME_LEARNING__.session.questions)).size, 8);
  await assertNoOverflow(page);
}

const desktopContext = await prepareContext({ viewport: { width: 1440, height: 1000 } });
const page = await desktopContext.newPage();
watchPage(page);
await page.goto(baseUrl);
assert.ok((await page.locator(".module-tab").allTextContents()).some((item) => item.trim() === "主题学习"));
assert.deepEqual(await page.locator(".top-actions > *").allTextContents().then((x) => x.map((v) => v.trim())), ["炸弹迷宫"]);
await page.locator('.module-tab[href="./theme-learning.html"]').click();
await page.waitForURL(/theme-learning\.html/);
assert.deepEqual(await page.locator(".theme-card h3").allTextContents().then((items) => items.map((x) => x.replace(/\s+/g, " ").trim())), ["身体 Body", "颜色 Colors", "数字 1–10 Numbers 1–10", "数字 11–19 Numbers 11–19", "整十 10–100 Tens 10–100", "第1到第10 First–Tenth", "一闪一闪小星星 Twinkle, Twinkle, Little Star", "经典道具 I Classic Items I", "经典道具 II Classic Items II", "经典道具 III Classic Items III", "经典道具 IV Classic Items IV"]);
assert.equal(await page.locator(".theme-reviewed-badge").count(), 11);
assert.equal(await page.locator(".theme-reviewed-badge:visible").count(), 0);
assert.equal(await page.locator("#themeSeriesPanel").isHidden(), true);
assert.equal(await page.locator("#themePicker > .picker-copy").count(), 0);
await assertSeriesList(page);
await assertNoOverflow(page);
await openSeries(page, "basics");

await page.click("#startTheme");
assert.equal(await page.evaluate(() => window.__THEME_LEARNING__.activeThemeId), "body");
assert.equal(await page.locator("#learnPanel").isVisible(), true);
assert.equal(await page.locator("#practicePanel").isVisible(), false);
await assertGeometry(page, "body", bodyIds, "#marioFigure");
await assertBodyScene(page);
await learnAll(page, "body", bodyExpected);
assert.equal(await page.evaluate(() => localStorage.getItem("mario-theme-learned-v1")), null);
assert.equal(await page.locator("#completeThemeLearning").isDisabled(), false);
await page.click("#completeThemeLearning");
assert.equal(await page.locator("#completeThemeLearning").isDisabled(), true);
assert.equal((await page.locator("#completeThemeLearning").textContent()).trim(), "✓ 已学习完毕");
assert.match((await page.locator("#themeLearningStatus").textContent()).trim(), /6 个单词已加入总词库/);
const bodyLearnedState = await page.evaluate(() => JSON.parse(localStorage.getItem("mario-theme-learned-v1")));
assert.equal(bodyLearnedState.version, 2);
assert.equal(bodyLearnedState.learned.length, 6);
assert.deepEqual(bodyLearnedState.learnedThemes, ["body"]);
assert.deepEqual(bodyLearnedState.reviewedThemes, []);
await assertWordNavigation(page, "body", bodyIds);
await page.locator('[data-theme="body"] [data-target="head"]').focus();
await page.keyboard.press("Enter");
assert.equal((await page.locator(".word-en").textContent()).trim(), "head");
await page.locator('[data-theme="body"] [data-target="hand"]').focus();
await page.keyboard.press("Enter");
assert.equal((await page.locator(".word-en").textContent()).trim(), "hand");
await page.screenshot({ path: "tests/theme-body-desktop.png", fullPage: true });
await page.click("#practiceStage");
await finishRound(page, "body", bodyIds);
assert.equal(await page.evaluate(() => window.__THEME_LEARNING__.progress.store.isThemeReviewed("body")), true);
await page.click("#restartRound");
assert.equal(new Set(await page.evaluate(() => window.__THEME_LEARNING__.session.questions)).size, 6);

await page.click("#backToThemes");
assert.equal(await page.locator("#themePicker").isVisible(), true);
await assertReviewedCard(page, "body");
await page.click("#startColors");
assert.equal(await page.evaluate(() => window.__THEME_LEARNING__.activeThemeId), "colors");
assert.equal((await page.locator("#sessionProgress").textContent()).trim(), "已认识 0/6");
await assertGeometry(page, "colors", colorIds, "#colorsFigure");
await assertColorsScene(page);
await learnAll(page, "colors", colorExpected);
await assertWordNavigation(page, "colors", colorIds);
for (const [key, instruction] of Object.entries({ red: "red cap 红色帽子", blue: "blue block 蓝色方块", green: "green pipe 绿色水管", yellow: "yellow coin 黄色金币", black: "black bomb 黑色炸弹", white: "white cloud 白色云朵" })) {
  assert.equal(await page.locator('[data-theme="colors"] [data-target="' + key + '"]').getAttribute("aria-label"), instruction);
}
await page.locator('[data-theme="colors"] [data-target="red"]').focus();
await page.keyboard.press("Enter");
assert.equal((await page.locator(".word-en").textContent()).trim(), "red");
await page.locator('[data-theme="colors"] [data-target="blue"]').focus();
await page.keyboard.press("Enter");
assert.equal((await page.locator(".word-en").textContent()).trim(), "blue");
await page.evaluate(() => { window.speechSynthesis.speak = () => { throw new Error("tts blocked"); }; });
await page.locator('[data-theme="colors"] [data-target="white"]').click();
assert.equal(await page.locator("#ttsNotice").isVisible(), false);
assert.equal((await page.locator(".word-en").textContent()).trim(), "white");
await page.locator("#repeatWord").click();
await page.locator("#ttsNotice").waitFor({ state: "visible" });
assert.equal(await page.locator("#ttsNotice").isVisible(), true);
await page.screenshot({ path: "tests/theme-colors-desktop.png", fullPage: true });
await page.evaluate(() => { window.speechSynthesis.speak = (item) => window.__completeSpeech(item); });
await page.click("#practiceStage");
assert.match((await page.locator("#practiceInstruction").textContent()).trim(), /^Touch the (red cap|blue block|green pipe|yellow coin|black bomb|white cloud)\.$/);
await finishRound(page, "colors", colorIds);
assert.equal((await page.locator("#resultTitle").textContent()).trim(), "六种颜色全部找对！");
await page.click("#restartRound");
assert.equal(new Set(await page.evaluate(() => window.__THEME_LEARNING__.session.questions)).size, 6);

await page.click("#backToThemes");
await page.click("#backToSeries");
await openSeries(page, "counting");
for (let index = 0; index < countingSeries.length; index += 1) {
  if (index > 0) await page.click("#backToThemes");
  await runCountingTheme(page, countingSeries[index]);
}

await page.click("#backToThemes");
await page.click("#startOrdinals");
assert.equal(await page.evaluate(() => window.__THEME_LEARNING__.activeThemeId), "ordinals");
assert.equal((await page.locator("#sessionProgress").textContent()).trim(), "已认识 0/10");
await assertGeometry(page, "ordinals", ordinalIds, "#ordinalsFigure");
await learnAll(page, "ordinals", ordinalExpected);
await assertWordNavigation(page, "ordinals", ordinalIds);
await page.locator('[data-theme="ordinals"] [data-target="first"]').focus();
await page.keyboard.press("Enter");
assert.equal((await page.locator(".word-en").textContent()).trim(), "first");
await page.locator('[data-theme="ordinals"] [data-target="second"]').focus();
await page.keyboard.press("Enter");
assert.equal((await page.locator(".word-en").textContent()).trim(), "second");
await page.screenshot({ path: "tests/theme-ordinals-desktop.png", fullPage: true });
await page.click("#practiceStage");
assert.match((await page.locator("#practiceInstruction").textContent()).trim(), /^Touch the (first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth)\.$/);
await finishRound(page, "ordinals", ordinalIds);
assert.equal((await page.locator("#resultTitle").textContent()).trim(), "十个序数词全部找对！");
await page.click("#restartRound");
assert.equal(new Set(await page.evaluate(() => window.__THEME_LEARNING__.session.questions)).size, 10);
await page.click("#backToThemes");
await page.click("#backToSeries");
await openSeries(page, "songs");
await runTwinkleTheme(page);
await page.click("#backToThemes");
await page.click("#backToSeries");
await openSeries(page, "items");
await page.click("#startItems1");
assert.equal(await page.evaluate(() => window.__THEME_LEARNING__.activeThemeId), "items1");
assert.equal((await page.locator("#sessionProgress").textContent()).trim(), "已认识 0/6");
await assertGeometry(page, "items1", itemIds, "#items1Figure");
await assertItemsScene(page);
await learnAll(page, "items1", itemsExpected);
await assertWordNavigation(page, "items1", itemIds);
for (const [key, label] of Object.entries({ coin: "coin 金币", key: "key 钥匙", crown: "crown 王冠", treasure: "treasure chest 宝箱", star: "star 星星", moon: "moon 月亮" })) {
  assert.equal(await page.locator('[data-theme="items1"] [data-target="' + key + '"]').getAttribute("aria-label"), label);
}
await page.locator('[data-theme="items1"] [data-target="coin"]').focus();
await page.keyboard.press("Enter");
assert.equal((await page.locator(".word-en").textContent()).trim(), "coin");
await page.locator('[data-theme="items1"] [data-target="key"]').focus();
await page.keyboard.press("Enter");
assert.equal((await page.locator(".word-en").textContent()).trim(), "key");
await page.screenshot({ path: "tests/theme-items1-desktop.png", fullPage: true });
await page.click("#practiceStage");
assert.match((await page.locator("#practiceInstruction").textContent()).trim(), /^Touch the (coin|key|crown|treasure chest|star|moon)\.$/);
await finishRound(page, "items1", itemIds);
assert.equal((await page.locator("#resultTitle").textContent()).trim(), "六个经典道具全部找对！");
await page.click("#restartRound");
assert.equal(new Set(await page.evaluate(() => window.__THEME_LEARNING__.session.questions)).size, 6);
for (const config of additionalItemSeries) {
  await page.click("#backToThemes");
  await runAdditionalItemSeries(page, config);
}
await page.click("#backToThemes");
await page.click("#backToSeries");
await openSeries(page, "basics");
await page.click("#startTheme");
assert.equal((await page.locator("#sessionProgress").textContent()).trim(), "已认识 0/6");
await page.click("#backToThemes");
await page.click("#startColors");
assert.equal((await page.locator("#sessionProgress").textContent()).trim(), "已认识 0/6");
await page.click("#backToThemes");
await page.click("#backToSeries");
await openSeries(page, "counting");
for (const config of countingSeries) {
  await page.locator(config.button).click();
  assert.equal((await page.locator("#sessionProgress").textContent()).trim(), "已认识 0/" + config.words.length);
  await page.click("#backToThemes");
}
await page.click("#startOrdinals");
assert.equal((await page.locator("#sessionProgress").textContent()).trim(), "已认识 0/10");
await page.click("#backToThemes");
await page.click("#backToSeries");
await openSeries(page, "items");
await page.click("#startItems1");
assert.equal((await page.locator("#sessionProgress").textContent()).trim(), "已认识 0/6");
const completedThemeState = await page.evaluate(() => JSON.parse(localStorage.getItem("mario-theme-learned-v1")));
assert.equal(completedThemeState.version, 2);
assert.equal(completedThemeState.learned.length, 83);
assert.equal(completedThemeState.learnedThemes.length, 11);
assert.equal(completedThemeState.reviewedThemes.length, 11);
await page.click("#backToThemes");
assert.equal(await page.locator(".theme-card.is-reviewed").count(), 11);
assert.equal(await page.locator(".theme-reviewed-badge:not([hidden])").count(), 11);
assert.equal(await page.locator(".theme-reviewed-badge:visible").count(), 4);
await assertReviewedCardGeometry(page, 4);
await page.click("#backToSeries");
await assertSeriesList(page, true);
await assertNoOverflow(page);
await page.screenshot({ path: "tests/theme-picker-complete-desktop.png", fullPage: true });
assert.deepEqual(await page.evaluate((keys) => window.__storageMutations.filter((item) => keys.includes(item.key)), protectedKeys), []);
await page.locator('.nav-link[href="./index.html"]').click();
await page.waitForURL((url) => url.pathname.endsWith("/") || url.pathname.endsWith("/index.html"));
await desktopContext.close();

const mobileContext = await prepareContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const mobile = await mobileContext.newPage();
watchPage(mobile);
await mobile.goto(new URL("theme-learning.html", baseUrl).href);
await assertSeriesList(mobile);
await assertNoOverflow(mobile);
await openSeries(mobile, "basics", "tap");
await mobile.tap("#startColors");
await assertNoOverflow(mobile);
await mobile.locator("#colorsFigure").scrollIntoViewIfNeeded();
await assertGeometry(mobile, "colors", colorIds, "#colorsFigure");
await assertColorsScene(mobile);
await learnAll(mobile, "colors", colorExpected, "tap");
await assertWordNavigation(mobile, "colors", colorIds, "tap");
await mobile.screenshot({ path: "tests/theme-colors-390.png", fullPage: true });
await mobile.tap("#practiceStage");
await finishRound(mobile, "colors", colorIds, "tap");
await mobile.tap("#backToThemes");
await mobile.tap("#backToSeries");
await openSeries(mobile, "counting", "tap");
for (let index = 0; index < countingSeries.length; index += 1) {
  if (index > 0) await mobile.tap("#backToThemes");
  await runCountingTheme(mobile, countingSeries[index], "tap");
}
await mobile.tap("#backToThemes");
await mobile.tap("#startOrdinals");
await mobile.locator("#ordinalsFigure").scrollIntoViewIfNeeded();
await assertGeometry(mobile, "ordinals", ordinalIds, "#ordinalsFigure");
await learnAll(mobile, "ordinals", ordinalExpected, "tap");
await assertWordNavigation(mobile, "ordinals", ordinalIds, "tap");
await mobile.screenshot({ path: "tests/theme-ordinals-390.png", fullPage: true });
await mobile.tap("#practiceStage");
await finishRound(mobile, "ordinals", ordinalIds, "tap");
await mobile.tap("#backToThemes");
await mobile.tap("#backToSeries");
await openSeries(mobile, "songs", "tap");
await runTwinkleTheme(mobile, "tap");
await mobile.tap("#backToThemes");
await mobile.tap("#backToSeries");
await openSeries(mobile, "items", "tap");
await mobile.tap("#startItems1");
await mobile.locator("#items1Figure").scrollIntoViewIfNeeded();
await assertGeometry(mobile, "items1", itemIds, "#items1Figure");
await assertItemsScene(mobile);
await learnAll(mobile, "items1", itemsExpected, "tap");
await assertWordNavigation(mobile, "items1", itemIds, "tap");
await mobile.screenshot({ path: "tests/theme-items1-390.png", fullPage: true });
await mobile.tap("#practiceStage");
await finishRound(mobile, "items1", itemIds, "tap");
for (const config of additionalItemSeries) {
  await mobile.tap("#backToThemes");
  await runAdditionalItemSeries(mobile, config, "tap");
}
await mobile.tap("#backToThemes");
await mobile.tap("#backToSeries");
await openSeries(mobile, "basics", "tap");
await mobile.tap("#startTheme");
await mobile.locator("#marioFigure").scrollIntoViewIfNeeded();
await assertGeometry(mobile, "body", bodyIds, "#marioFigure");
await assertBodyScene(mobile);
await learnAll(mobile, "body", bodyExpected, "tap");
await assertWordNavigation(mobile, "body", bodyIds, "tap");
await mobile.screenshot({ path: "tests/theme-body-390.png", fullPage: true });
await mobile.tap("#practiceStage");
await finishRound(mobile, "body", bodyIds, "tap");
const mobileCompletedState = await mobile.evaluate(() => JSON.parse(localStorage.getItem("mario-theme-learned-v1")));
assert.equal(mobileCompletedState.learned.length, 83);
assert.equal(mobileCompletedState.learnedThemes.length, 11);
assert.equal(mobileCompletedState.reviewedThemes.length, 11);
await mobile.tap("#backToThemes");
assert.equal(await mobile.locator(".theme-card.is-reviewed").count(), 11);
assert.equal(await mobile.locator(".theme-reviewed-badge:not([hidden])").count(), 11);
assert.equal(await mobile.locator(".theme-reviewed-badge:visible").count(), 2);
await assertReviewedCardGeometry(mobile, 2);
await mobile.tap("#backToSeries");
await assertSeriesList(mobile, true);
await assertNoOverflow(mobile);
await mobile.screenshot({ path: "tests/theme-picker-complete-390.png", fullPage: true });
assert.deepEqual(await mobile.evaluate((keys) => window.__storageMutations.filter((item) => keys.includes(item.key)), protectedKeys), []);
await mobileContext.close();

assert.deepEqual(pageErrors, []);
assert.deepEqual(failedResponses, []);
console.log(JSON.stringify({
  ok: true,
  themes: ["body", "colors", "numbers1", "numbersTeens", "tens", "ordinals", "twinkle", "items1", "items2", "items3", "items4"],
  words: 83,
  rounds: { desktop: 11, mobile390: 11, uniqueQuestionsEach: { body: 6, colors: 6, numbers1: 10, numbersTeens: 9, tens: 10, ordinals: 10, twinkle: 8, items1: 6, items2: 6, items3: 6, items4: 6 }, wrongRetry: true, restart: true },
  ttsFallback: true,
  completion: { learnedWords: 83, learnedThemes: 11, reviewedThemes: 11, greenChecks: 11, persisted: true },
  storageProtected: protectedKeys,
  overflow: { desktop: false, mobile390: false },
  hotAreasAligned: { desktop: 83, mobile390: 83, colorsNonOverlapping: true, itemsNonOverlapping: true, countingExact: true, centersHit: true },
  bodyAsset: { path: "assets/themes/body/body-character-anime-v2.png", httpStatus: 200, size: "1024x1536", alpha: true },
  colorsAsset: { path: "assets/themes/colors/colors-scene-v2.png", httpStatus: 200, size: "1536x1024" },
  itemsAsset: { path: "assets/themes/items/classic-items-1-scene-v1.png", httpStatus: 200, size: "1536x1024" },
  additionalItemsAssets: [2, 3, 4].map((series) => ({ path: "assets/themes/items/classic-items-" + series + "-scene-v1.png", httpStatus: 200, size: "1536x1024" })),
  input: ["mouse", "touch", "Enter", "Space"],
  screenshots: ["tests/theme-picker-complete-desktop.png", "tests/theme-picker-complete-390.png", "tests/theme-body-desktop.png", "tests/theme-colors-desktop.png", "tests/theme-numbers1-desktop.png", "tests/theme-numbers-teens-desktop.png", "tests/theme-tens-desktop.png", "tests/theme-ordinals-desktop.png", "tests/theme-twinkle-desktop.png", "tests/theme-items1-desktop.png", "tests/theme-items2-desktop.png", "tests/theme-items3-desktop.png", "tests/theme-items4-desktop.png", "tests/theme-body-390.png", "tests/theme-colors-390.png", "tests/theme-numbers1-390.png", "tests/theme-numbers-teens-390.png", "tests/theme-tens-390.png", "tests/theme-ordinals-390.png", "tests/theme-twinkle-390.png", "tests/theme-items1-390.png", "tests/theme-items2-390.png", "tests/theme-items3-390.png", "tests/theme-items4-390.png"]
}, null, 2));
await browser.close();
