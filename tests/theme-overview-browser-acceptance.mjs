import assert from "node:assert/strict";
import { chromium } from "file:///C:/Users/St/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const baseUrl = process.env.HANZI_BASE_URL || "http://127.0.0.1:53177/";
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
});
const protectedKeys = [
  "mario-hanzi-refactor-v1",
  "mario-literacy-desktop-mvp-v1",
  "mario-bomb-game-progress-v1",
  "mario-bomb-game-v1",
  "mario-phonetics-v1",
  "mario-book1-v1",
  "mario-theme-learning-v1"
];
const learnedKey = "mario-theme-learned-v1";
const pageErrors = [];
const failedResponses = [];

async function prepareContext(options) {
  const context = await browser.newContext(options);
  await context.addInitScript(() => {
    window.__storageMutations = [];
    window.__spoken = [];
    const originalSet = Storage.prototype.setItem;
    const originalRemove = Storage.prototype.removeItem;
    Storage.prototype.setItem = function(key, value) {
      window.__storageMutations.push({ operation: "set", key });
      return originalSet.call(this, key, value);
    };
    Storage.prototype.removeItem = function(key) {
      window.__storageMutations.push({ operation: "remove", key });
      return originalRemove.call(this, key);
    };
    class FakeUtterance { constructor(text) { this.text = text; } }
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: FakeUtterance });
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        cancel() {},
        speak(item) { window.__spoken.push(item.text); }
      }
    });
  });
  return context;
}

function watchPage(page) {
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) failedResponses.push(response.status() + " " + response.url());
  });
}

async function assertNoOverflow(page) {
  assert.equal(await page.evaluate(() =>
    document.documentElement.scrollWidth <= document.documentElement.clientWidth
  ), true);
}


async function openThemeSeries(page, themeId) {
  const seriesId = ["body", "colors"].includes(themeId)
    ? "basics"
    : ["numbers1", "numbersTeens", "tens", "ordinals"].includes(themeId)
      ? "counting"
      : themeId === "twinkle"
        ? "songs"
        : "items";
  const activeSeriesId = await page.evaluate(() => window.__THEME_LEARNING__.activeSeriesId);
  if (activeSeriesId === seriesId && await page.locator("#themeSeriesPanel").isVisible()) return;
  if (await page.locator("#learningView").isVisible()) await page.click("#backToThemes");
  if (await page.locator("#themeSeriesPanel").isVisible()) await page.click("#backToSeries");
  await page.click('[data-series-id="' + seriesId + '"]');
  assert.equal(await page.evaluate(() => window.__THEME_LEARNING__.activeSeriesId), seriesId);
}

async function completeTheme(page, themeId, expectedCount) {
  await openThemeSeries(page, themeId);
  await page.click('[data-theme-id="' + themeId + '"]');
  assert.equal(await page.locator("#completeThemeLearning").isDisabled(), false);
  await page.click("#completeThemeLearning");
  assert.equal(await page.locator("#completeThemeLearning").isDisabled(), true);
  assert.match((await page.locator("#themeLearningStatus").textContent()).trim(), /已加入总词库/);
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), learnedKey);
  assert.equal(saved.version, 2);
  assert.equal(saved.learned.length, expectedCount);
  await page.click("#backToThemes");
}

async function assertLibrary(page, expectedCount, expectedSources = [
  "./assets/themes/body/body-character-anime-v2.png",
  "./assets/themes/colors/colors-scene-v2.png",
  "./assets/themes/items/classic-items-1-scene-v1.png",
  "./assets/themes/items/classic-items-2-scene-v1.png",
  "./assets/themes/items/classic-items-3-scene-v1.png",
  "./assets/themes/items/classic-items-4-scene-v1.png"
]) {
  assert.equal(await page.locator(".library-card").count(), expectedCount);
  const result = await page.evaluate(async () => {
    const catalog = new Map(window.__THEME_OVERVIEW__.catalog.map((entry) => [entry.key, entry]));
    const cards = [...document.querySelectorAll(".library-card")].map((card) => {
      const entry = catalog.get(card.dataset.wordKey);
      const art = card.querySelector(".library-word-art");
      const image = art.querySelector?.("image") || null;
      const clipPath = art.querySelector?.("clipPath") || null;
      const clipRect = clipPath?.querySelector("rect") || null;
      const box = art.getBoundingClientRect();
      return {
        key: card.dataset.wordKey,
        word: card.querySelector("h3").textContent.trim(),
        phonetic: card.querySelector(".library-phonetic").textContent.trim(),
        chinese: card.querySelector(".library-translation").textContent.trim(),
        artType: entry.art.type,
        expectedSource: entry.art.src || null,
        source: image?.getAttribute("href") || null,
        expectedViewBox: entry.art.viewBox || null,
        viewBox: art.getAttribute?.("viewBox") || null,
        cropMode: art.getAttribute?.("preserveAspectRatio") || null,
        overflow: art.getAttribute?.("overflow") || null,
        clipId: clipPath?.id || null,
        clipRect: clipRect ? ["x", "y", "width", "height"].map((name) => clipRect.getAttribute(name)).join(" ") : null,
        clipReference: image?.getAttribute("clip-path") || null,
        ordinal: art.querySelector?.("strong")?.textContent.trim() || null,
        expectedOrdinal: entry.art.label || null,
        songIcon: art.querySelector?.("i")?.textContent.trim() || null,
        expectedSongIcon: entry.art.icon || null,
        units: art.querySelectorAll?.(".counting-units > i").length || 0,
        groups: art.querySelectorAll?.(".counting-groups .ten-frame").length || 0,
        groupDots: art.querySelectorAll?.(".counting-groups .ten-frame > b").length || 0,
        expectedValue: entry.art.value || null,
        expectedGroups: entry.art.groups || null,
        visible: box.width >= 80 && box.height >= 80
      };
    });
    const sources = [...new Set(cards.map(({ source }) => source).filter(Boolean))];
    const statuses = {};
    for (const source of sources) statuses[source] = (await fetch(source, { cache: "no-store" })).status;
    return { cards, statuses };
  });
  assert.equal(new Set(result.cards.map(({ key }) => key)).size, expectedCount);
  for (const card of result.cards) {
    assert.equal(card.visible, true, card.key);
    const entry = await page.evaluate((key) => window.__THEME_OVERVIEW__.catalog.find((item) => item.key === key), card.key);
    assert.equal(card.word, entry.word);
    assert.equal(card.phonetic, entry.phonetic);
    assert.equal(card.chinese, entry.chinese);
    if (card.artType === "image") {
      assert.equal(card.source, card.expectedSource, card.key);
      assert.equal(card.viewBox, card.expectedViewBox, card.key);
      assert.equal(card.cropMode, "xMidYMid meet", card.key);
      assert.equal(card.clipRect, card.expectedViewBox, card.key);
      assert.equal(card.clipReference, "url(#" + card.clipId + ")", card.key);
      assert.equal(card.overflow, "hidden", card.key);
    } else if (card.artType === "song-word") {
      assert.equal(card.songIcon, card.expectedSongIcon, card.key);
    } else if (card.artType === "ordinal") {
      assert.equal(card.ordinal, card.expectedOrdinal, card.key);
    } else if (card.artType === "count-units") {
      assert.equal(card.units, card.expectedValue, card.key);
      assert.equal(card.groups, 0, card.key);
    } else if (card.artType === "count-groups") {
      assert.equal(card.groups, card.expectedGroups, card.key);
      assert.equal(card.groupDots, card.expectedValue, card.key);
      assert.equal(card.units, 0, card.key);
    } else {
      assert.fail("Unknown artwork type: " + card.artType);
    }
  }
  assert.deepEqual(Object.values(result.statuses), Object.values(result.statuses).map(() => 200));
  assert.deepEqual(Object.keys(result.statuses).sort(), expectedSources);
}

async function finishTotalReview(page) {
  const total = await page.evaluate(() => window.__THEME_OVERVIEW__.reviewSession.questions.length);
  assert.equal(total, 81);
  assert.equal(await page.evaluate(() =>
    new Set(window.__THEME_OVERVIEW__.reviewSession.questions).size
  ), 81);
  for (let index = 0; index < total; index += 1) {
    const state = await page.evaluate(() => {
      const session = window.__THEME_OVERVIEW__.reviewSession;
      return {
        targetKey: session.target().key,
        word: session.target().word,
        options: session.options().map(({ key }) => key),
        questionIndex: session.questionIndex
      };
    });
    assert.ok(state.options.includes(state.targetKey));
    assert.equal(new Set(state.options).size, state.options.length);
    assert.equal(state.options.length, 4);
    if (index === 0) {
      const wrong = state.options.find((key) => key !== state.targetKey);
      await page.click('[data-review-key="' + wrong + '"]');
      assert.equal(await page.evaluate(() => window.__THEME_OVERVIEW__.reviewSession.questionIndex), 0);
      assert.equal(await page.locator('[data-review-key="' + wrong + '"]').evaluate((node) => node.classList.contains("is-wrong")), true);
    }
    await page.click('[data-review-key="' + state.targetKey + '"]');
    if (index === total - 1) {
      await page.locator("#totalReviewResult").waitFor({ state: "visible" });
    } else {
      await page.waitForFunction(({ word }) =>
        document.querySelector("#totalReviewWord")?.textContent.trim() !== word,
      { word: state.word });
    }
  }
  assert.equal((await page.locator("#totalReviewResultScore").textContent()).trim(), "81/81");
}

const desktopContext = await prepareContext({ viewport: { width: 1440, height: 1000 } });
const page = await desktopContext.newPage();
watchPage(page);
await page.goto(new URL("review-learning.html", baseUrl).href);
await assertNoOverflow(page);
assert.deepEqual(await page.locator(".theme-nav .nav-link").allTextContents().then((items) => items.map((item) => item.trim())), ["汉字", "Book1", "主题学习", "情景模式", "总复习", "音标"]);
assert.equal((await page.locator("#totalReviewCount").textContent()).trim(), "0 个已学");
assert.equal((await page.locator("#wordLibraryCount").textContent()).trim(), "0/81");
assert.equal(await page.locator("#totalReviewEmpty").isVisible(), true);

await page.click("#openWordLibrary");
assert.equal(await page.locator("#libraryEmpty").isVisible(), true);
assert.equal(await page.locator("#startLibraryReview").isDisabled(), true);
await page.click("#openTotalReview");
assert.equal(await page.locator("#totalReviewEmpty").isVisible(), true);
await page.click("#emptyReviewLibrary");
assert.equal(await page.locator("#wordLibraryView").isVisible(), true);

await page.locator('.theme-nav a[href="./theme-learning.html"]').click();
await page.waitForURL(/theme-learning\.html/);
assert.equal(await page.locator("#openTotalReview, #openWordLibrary, #totalReviewView, #wordLibraryView").count(), 0);
assert.equal(await page.locator(".theme-series-cell").count(), 4);
await openThemeSeries(page, "body");

await page.click("#startTheme");
await page.click('[data-theme="body"] [data-target="head"]');
assert.equal(await page.evaluate((key) => localStorage.getItem(key), learnedKey), null);
await page.click("#completeThemeLearning");
let saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), learnedKey);
assert.equal(saved.version, 2);
assert.equal(saved.learned.length, 6);
assert.deepEqual(saved.learnedThemes, ["body"]);
assert.deepEqual(saved.reviewedThemes, []);
await page.click("#backToThemes");

await page.locator('.theme-nav a[href="./review-learning.html"]').click();
await page.waitForURL(/review-learning\.html/);
assert.equal((await page.locator("#totalReviewCount").textContent()).trim(), "6 个已学");
assert.equal((await page.locator("#wordLibraryCount").textContent()).trim(), "6/81");
await page.click("#openWordLibrary");
assert.equal(await page.locator(".library-card").count(), 6);

await page.locator('.theme-nav a[href="./theme-learning.html"]').click();
await page.waitForURL(/theme-learning\.html/);
await completeTheme(page, "ordinals", 16);
await page.locator('.theme-nav a[href="./review-learning.html"]').click();
await page.waitForURL(/review-learning\.html/);
assert.equal((await page.locator("#totalReviewCount").textContent()).trim(), "16 个已学");
assert.equal((await page.locator("#wordLibraryCount").textContent()).trim(), "16/81");

await page.locator('.theme-nav a[href="./theme-learning.html"]').click();
await page.waitForURL(/theme-learning\.html/);
for (const [themeId, expectedCount] of [["numbers1", 26], ["numbersTeens", 35], ["tens", 45], ["colors", 51], ["twinkle", 59], ["items1", 65], ["items2", 71], ["items3", 77], ["items4", 83]]) {
  await completeTheme(page, themeId, expectedCount);
}
const themeStorageMutations = await page.evaluate(() => window.__storageMutations);
assert.deepEqual(themeStorageMutations.filter(({ key }) => protectedKeys.includes(key)), []);
assert.equal(themeStorageMutations.filter(({ key }) => key === learnedKey).length, 9);
await page.locator('.theme-nav a[href="./review-learning.html"]').click();
await page.waitForURL(/review-learning\.html/);
assert.equal((await page.locator("#totalReviewCount").textContent()).trim(), "81 个已学");
assert.equal((await page.locator("#wordLibraryCount").textContent()).trim(), "81/81");
saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), learnedKey);
assert.equal(saved.version, 2);
assert.equal(saved.learned.length, 83);
assert.equal(new Set(saved.learned).size, 83);
assert.equal(saved.learnedThemes.length, 11);
assert.deepEqual(saved.reviewedThemes, []);
assert.deepEqual(await page.evaluate((keys) =>
  window.__storageMutations.filter(({ key }) => keys.includes(key)),
protectedKeys), []);

await page.click("#openWordLibrary");
await assertLibrary(page, 81);
await assertNoOverflow(page);
const firstPhonetic = page.locator(".library-phonetic").first();
await firstPhonetic.click();
assert.equal(await firstPhonetic.getAttribute("aria-expanded"), "true");
assert.equal(await page.locator(".library-phonemes").first().isVisible(), true);
assert.equal(await page.locator(".library-phonemes").first().locator(".phoneme-chip").evaluateAll((nodes) =>
  nodes.every((node) => !node.textContent.includes("/"))
), true);
const spokenBefore = await page.evaluate(() => window.__spoken.length);
await page.locator(".library-speak").first().click();
assert.equal(await page.evaluate(() => window.__spoken.length), spokenBefore + 1);
await page.screenshot({ path: "tests/theme-library-desktop.png", fullPage: true });

await page.reload();
assert.equal((await page.locator("#wordLibraryCount").textContent()).trim(), "81/81");
await page.click("#openWordLibrary");
await page.click("#startLibraryReview");
assert.equal(await page.locator("#totalReviewPanel").isVisible(), true);
assert.equal(await page.locator(".review-option").count(), 4);
await page.locator("#totalReviewPhonetic").click();
assert.equal(await page.locator("#totalReviewPhonemes").isVisible(), true);
const reviewSpokenBefore = await page.evaluate(() => window.__spoken.length);
await page.locator("#totalReviewSpeak").click();
assert.equal(await page.evaluate(() => window.__spoken.length), reviewSpokenBefore + 1);
await page.screenshot({ path: "tests/theme-review-desktop.png", fullPage: true });
await finishTotalReview(page);
await page.screenshot({ path: "tests/theme-review-complete-desktop.png", fullPage: true });
await page.click("#restartTotalReview");
assert.equal(await page.evaluate(() =>
  new Set(window.__THEME_OVERVIEW__.reviewSession.questions).size
), 81);
await desktopContext.close();

const mobileContext = await prepareContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const mobile = await mobileContext.newPage();
watchPage(mobile);
await mobile.goto(new URL("review-learning.html", baseUrl).href);
await mobile.evaluate(() => {
  for (const themeId of ["body", "colors", "numbers1", "numbersTeens", "tens", "ordinals", "twinkle", "items1", "items2", "items3", "items4"]) {
    window.__THEME_OVERVIEW__.recordTheme(themeId);
  }
});
await mobile.tap("#openWordLibrary");
await assertLibrary(mobile, 81);
await assertNoOverflow(mobile);
const mobileGeometry = await mobile.locator(".library-card").evaluateAll((cards) => ({
  allInside: cards.every((card) => {
    const box = card.getBoundingClientRect();
    return box.left >= 0 && box.right <= document.documentElement.clientWidth;
  }),
  firstArt: cards[0].querySelector(".library-word-art").getBoundingClientRect().width,
  lastArt: cards.at(-1).querySelector(".library-word-art").getBoundingClientRect().width
}));
assert.equal(mobileGeometry.allInside, true);
assert.ok(mobileGeometry.firstArt >= 100 && mobileGeometry.lastArt >= 100);
await mobile.screenshot({ path: "tests/theme-library-390.png", fullPage: true });
await mobile.tap("#startLibraryReview");
await assertNoOverflow(mobile);
assert.equal(await mobile.locator(".review-option").count(), 4);
const optionGeometry = await mobile.locator(".review-option").evaluateAll((options) => options.map((node) => {
  const box = node.getBoundingClientRect();
  return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
}));
const mobileViewportWidth = await mobile.evaluate(() => document.documentElement.clientWidth);
assert.ok(optionGeometry.every(({ left, right, width, height }) =>
  left >= 0 && right <= mobileViewportWidth && width >= 120 && height >= 120
));
for (let index = 0; index < optionGeometry.length; index += 1) {
  for (let other = index + 1; other < optionGeometry.length; other += 1) {
    const a = optionGeometry[index];
    const b = optionGeometry[other];
    const overlap = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) *
      Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    assert.ok(overlap <= 1);
  }
}
await mobile.screenshot({ path: "tests/theme-review-390.png", fullPage: true });
assert.deepEqual(await mobile.evaluate((keys) =>
  window.__storageMutations.filter(({ key }) => keys.includes(key)),
protectedKeys), []);
assert.ok((await mobile.evaluate((key) =>
  window.__storageMutations.filter((item) => item.key === key).length,
learnedKey)), 11);
await mobileContext.close();

const itemCropContext = await prepareContext({ viewport: { width: 1440, height: 1000 } });
const itemCropPage = await itemCropContext.newPage();
watchPage(itemCropPage);
await itemCropPage.goto(new URL("review-learning.html", baseUrl).href);
await itemCropPage.evaluate(() => window.__THEME_OVERVIEW__.recordTheme("items1"));
await itemCropPage.click("#openWordLibrary");
await assertLibrary(itemCropPage, 6, ["./assets/themes/items/classic-items-1-scene-v1.png"]);
assert.match((await itemCropPage.locator('[data-word-key="items1:star"] .library-theme-label').textContent()).trim(), /经典道具 I/);
await itemCropPage.locator('[data-word-key="items1:star"]').screenshot({ path: "tests/theme-library-star-desktop.png" });
await itemCropPage.setViewportSize({ width: 390, height: 844 });
await assertNoOverflow(itemCropPage);
await itemCropPage.locator('[data-word-key="items1:star"]').screenshot({ path: "tests/theme-library-star-390.png" });
await itemCropContext.close();

assert.deepEqual(pageErrors, []);
assert.deepEqual(failedResponses, []);
console.log(JSON.stringify({
  ok: true,
  themeRecords: 83,
  learnedWords: 81,
  libraryCards: { desktop: 81, mobile390: 81 },
  review: { questions: 81, unique: 81, choicesPerQuestion: 4, wrongRetry: true, restart: true },
  artwork: { mappedThemeRecords: 83, uniqueLibraryWords: 81, songWordCards: 8, imageCrops: 35, croppedToViewBox: true, ordinalCards: 10, countUnits: 19, countGroups: 9, assetsHttp200: 6 },
  persistence: { key: learnedKey, schema: 2, themeCompletionWrites: 11, refreshRestored: true, protectedKeysUnchanged: protectedKeys },
  overflow: { desktop: false, mobile390: false },
  screenshots: [
    "tests/theme-library-desktop.png",
    "tests/theme-library-star-desktop.png",
    "tests/theme-review-desktop.png",
    "tests/theme-review-complete-desktop.png",
    "tests/theme-library-390.png",
    "tests/theme-library-star-390.png",
    "tests/theme-review-390.png"
  ]
}, null, 2));
await browser.close();
