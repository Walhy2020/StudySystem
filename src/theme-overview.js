import { buildTotalWordCatalog, buildTotalWordLibrary } from "./total-word-library.js?v=1.0";

export const THEME_LEARNED_STORAGE_KEY = "mario-theme-learned-v1";
export const THEME_LEARNED_SCHEMA_VERSION = 2;

const BODY_CROPS = Object.freeze({
  head: "245 20 534 520",
  hand: "155 805 235 310",
  arm: "165 585 285 360",
  body: "285 485 475 500",
  leg: "250 900 320 455",
  foot: "135 1280 455 245"
});
const COLOR_CROPS = Object.freeze({
  red: "75 120 475 390",
  blue: "545 115 450 405",
  green: "1025 115 430 425",
  yellow: "90 490 440 430",
  black: "535 470 470 475",
  white: "970 485 505 385"
});
const ITEM_CROPS = Object.freeze([
  "35 25 490 445",
  "500 25 500 455",
  "985 35 515 455",
  "25 475 510 515",
  "510 470 515 520",
  "1000 465 510 525"
]);
const CLASSROOM_CROPS = Object.freeze([
  "55 85 380 405",
  "415 85 365 405",
  "765 85 365 405",
  "1110 85 380 405",
  "55 475 380 430",
  "415 475 365 430",
  "765 475 365 430",
  "1110 475 380 430"
]);
const ORDINAL_LABELS = Object.freeze(["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th"]);
const ITEM_ASSETS = Object.freeze({
  items1: "./assets/themes/items/classic-items-1-scene-v1.png",
  items2: "./assets/themes/items/classic-items-2-scene-v1.png",
  items3: "./assets/themes/items/classic-items-3-scene-v1.png",
  items4: "./assets/themes/items/classic-items-4-scene-v1.png"
});

export function themeWordKey(themeId, wordId) {
  return themeId + ":" + wordId;
}

function artFor(themeId, word, index) {
  if (Number.isInteger(word.value)) {
    return Object.freeze({
      type: word.groups ? "count-groups" : "count-units",
      value: word.value,
      groups: word.groups || 0
    });
  }
  if (themeId === "ordinals") {
    return Object.freeze({ type: "ordinal", label: ORDINAL_LABELS[index] });
  }
  if (themeId === "twinkle") {
    return Object.freeze({ type: "song-word", icon: Object.freeze(["✦", "★", "☆", "?", "◉", "↑", "◆", "☾"])[index] });
  }
  if (themeId === "body") {
    return Object.freeze({
      type: "image",
      src: "./assets/themes/body/body-character-anime-v2.png",
      width: 1024,
      height: 1536,
      viewBox: BODY_CROPS[word.id]
    });
  }
  if (themeId === "colors") {
    return Object.freeze({
      type: "image",
      src: "./assets/themes/colors/colors-scene-v2.png",
      width: 1536,
      height: 1024,
      viewBox: COLOR_CROPS[word.id]
    });
  }
  if (themeId === "classroom") {
    return Object.freeze({
      type: "image",
      src: "./assets/themes/classroom/classroom-things-scene-v1.png",
      width: 1536,
      height: 1024,
      viewBox: CLASSROOM_CROPS[index]
    });
  }
  return Object.freeze({
    type: "image",
    src: ITEM_ASSETS[themeId],
    width: 1536,
    height: 1024,
    viewBox: ITEM_CROPS[index]
  });
}

export function buildThemeCatalog(configs) {
  return Object.freeze(Object.values(configs).flatMap((config) =>
    config.words.map((word, index) => Object.freeze({
      ...word,
      key: themeWordKey(config.id, word.id),
      themeId: config.id,
      themeTitle: config.chineseTitle,
      themeEnglishTitle: config.englishTitle,
      art: artFor(config.id, word, index)
    }))
  ));
}

function uniqueByWord(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    const word = entry.word.trim().toLowerCase();
    if (seen.has(word)) return false;
    seen.add(word);
    return true;
  });
}

function getDefaultStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export class ThemeLearnedStore {
  constructor(catalog, storage = getDefaultStorage()) {
    this.catalog = catalog;
    this.byKey = new Map(catalog.map((entry) => [entry.key, entry]));
    this.themeEntriesById = new Map();
    catalog.forEach((entry) => {
      if (!this.themeEntriesById.has(entry.themeId)) this.themeEntriesById.set(entry.themeId, []);
      this.themeEntriesById.get(entry.themeId).push(entry);
    });
    this.storage = storage;
    this.learned = new Set();
    this.learnedThemes = new Set();
    this.reviewedThemes = new Set();
    this.load();
  }

  load() {
    this.learned.clear();
    this.learnedThemes.clear();
    this.reviewedThemes.clear();
    if (!this.storage) return this.entries();
    try {
      const parsed = JSON.parse(this.storage.getItem(THEME_LEARNED_STORAGE_KEY) || "null");
      if (!parsed || ![1, THEME_LEARNED_SCHEMA_VERSION].includes(parsed.version) || !Array.isArray(parsed.learned)) return this.entries();
      parsed.learned.forEach((key) => {
        if (this.byKey.has(key)) this.learned.add(key);
      });
      if (parsed.version === THEME_LEARNED_SCHEMA_VERSION) {
        (Array.isArray(parsed.learnedThemes) ? parsed.learnedThemes : []).forEach((themeId) => {
          if (this.themeEntriesById.has(themeId)) this.addWholeTheme(themeId);
        });
        (Array.isArray(parsed.reviewedThemes) ? parsed.reviewedThemes : []).forEach((themeId) => {
          if (!this.themeEntriesById.has(themeId)) return;
          this.addWholeTheme(themeId);
          this.reviewedThemes.add(themeId);
        });
      }
      this.syncLearnedThemes();
    } catch {
      this.learned.clear();
      this.learnedThemes.clear();
      this.reviewedThemes.clear();
    }
    return this.entries();
  }

  addWholeTheme(themeId) {
    const entries = this.themeEntriesById.get(themeId);
    if (!entries) return false;
    entries.forEach((entry) => this.learned.add(entry.key));
    this.learnedThemes.add(themeId);
    return true;
  }

  syncLearnedThemes() {
    for (const [themeId, entries] of this.themeEntriesById) {
      if (entries.length > 0 && entries.every((entry) => this.learned.has(entry.key))) this.learnedThemes.add(themeId);
    }
  }

  save() {
    if (!this.storage) return false;
    try {
      this.storage.setItem(THEME_LEARNED_STORAGE_KEY, JSON.stringify({
        version: THEME_LEARNED_SCHEMA_VERSION,
        learned: this.catalog.filter((entry) => this.learned.has(entry.key)).map((entry) => entry.key),
        learnedThemes: [...this.themeEntriesById.keys()].filter((themeId) => this.learnedThemes.has(themeId)),
        reviewedThemes: [...this.themeEntriesById.keys()].filter((themeId) => this.reviewedThemes.has(themeId)),
        updatedAt: new Date().toISOString()
      }));
      return true;
    } catch {
      return false;
    }
  }

  record(themeId, wordId) {
    return this.recordKey(themeWordKey(themeId, wordId));
  }

  recordKey(key) {
    if (!this.byKey.has(key)) return false;
    const before = this.learned.size;
    this.learned.add(key);
    if (this.learned.size !== before) {
      this.syncLearnedThemes();
      this.save();
    }
    return this.learned.size !== before;
  }

  recordTheme(themeId) {
    if (!this.themeEntriesById.has(themeId)) return false;
    const before = this.learned.size;
    const wasLearned = this.learnedThemes.has(themeId);
    this.addWholeTheme(themeId);
    const changed = this.learned.size !== before || !wasLearned;
    if (changed) this.save();
    return changed;
  }

  markReviewed(themeId) {
    if (!this.themeEntriesById.has(themeId)) return false;
    const beforeLearned = this.learned.size;
    const wasLearned = this.learnedThemes.has(themeId);
    const wasReviewed = this.reviewedThemes.has(themeId);
    this.addWholeTheme(themeId);
    this.reviewedThemes.add(themeId);
    const changed = this.learned.size !== beforeLearned || !wasLearned || !wasReviewed;
    if (changed) this.save();
    return changed;
  }

  entries() {
    return uniqueByWord(this.catalog.filter((entry) => this.learned.has(entry.key)));
  }

  uniqueCatalogEntries() {
    return uniqueByWord(this.catalog);
  }

  has(themeId, wordId) {
    return this.learned.has(themeWordKey(themeId, wordId));
  }

  isThemeLearned(themeId) {
    return this.learnedThemes.has(themeId);
  }

  isThemeReviewed(themeId) {
    return this.reviewedThemes.has(themeId);
  }
}

function shuffle(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export class TotalReviewSession {
  constructor(words, random = Math.random, optionLimit = 4) {
    this.words = [...words];
    this.byKey = new Map(this.words.map((entry) => [entry.key, entry]));
    this.random = random;
    this.optionLimit = optionLimit;
    this.startRound();
  }

  startRound() {
    this.questions = shuffle(this.words.map((entry) => entry.key), this.random);
    this.questionIndex = 0;
    this.correctCount = 0;
    this.complete = this.questions.length === 0;
    this.optionKeys = this.complete ? [] : this.buildOptions();
  }

  target() {
    return this.complete ? null : this.byKey.get(this.questions[this.questionIndex]) || null;
  }

  buildOptions() {
    const target = this.byKey.get(this.questions[this.questionIndex]);
    if (!target) return [];
    const distractors = shuffle(this.words.filter((entry) => entry.key !== target.key), this.random)
      .slice(0, Math.max(0, this.optionLimit - 1));
    return shuffle([target, ...distractors], this.random).map((entry) => entry.key);
  }

  options() {
    return this.optionKeys.map((key) => this.byKey.get(key)).filter(Boolean);
  }

  answer(key) {
    const target = this.target();
    if (!target) return { status: "complete", complete: true, target: null };
    if (key !== target.key) return { status: "wrong", complete: false, target };
    this.correctCount += 1;
    this.questionIndex += 1;
    this.complete = this.questionIndex === this.questions.length;
    if (!this.complete) this.optionKeys = this.buildOptions();
    return { status: "correct", complete: this.complete, target, next: this.target() };
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function renderArt(entry, className = "word-art") {
  const label = entry.word + " " + entry.chinese + " 配图";
  if (entry.art.type === "image-url") {
    return '<img class="' + className + ' library-source-image" src="' + escapeHtml(entry.art.src) +
      '" alt="' + escapeHtml(entry.art.alt || label) + '" />';
  }
  if (entry.art.type === "meaning") {
    return '<div class="' + className + ' meaning-word-art" role="img" aria-label="' + escapeHtml(entry.word + " 的中文释义：" + entry.chinese) + '"><strong>' +
      escapeHtml(entry.art.label || entry.chinese) + "</strong></div>";
  }
  if (entry.art.type === "count-units" || entry.art.type === "count-groups") {
    const visual = entry.art.type === "count-groups"
      ? '<span class="counting-visual counting-groups" data-groups="' + entry.art.groups + '" aria-hidden="true">' +
        Array.from({ length: entry.art.groups }, () => '<i class="ten-frame">' + '<b></b>'.repeat(10) + '</i>').join("") + '</span>'
      : '<span class="counting-visual counting-units" data-count="' + entry.art.value + '" aria-hidden="true">' +
        '<i></i>'.repeat(entry.art.value) + '</span>';
    return '<div class="' + className + ' counting-word-art" role="img" aria-label="' + escapeHtml(label) + '"><strong>' +
      entry.art.value + '</strong>' + visual + '</div>';
  }
  if (entry.art.type === "ordinal") {
    return '<div class="' + className + ' ordinal-word-art" role="img" aria-label="' + escapeHtml(label) + '"><strong>' +
      escapeHtml(entry.art.label) + '</strong><span>' + escapeHtml(entry.word) + "</span></div>";
  }
  if (entry.art.type === "song-word") {
    return '<div class="' + className + ' song-word-art" role="img" aria-label="' + escapeHtml(label) + '"><i aria-hidden="true">' +
      escapeHtml(entry.art.icon) + '</i><strong>' + escapeHtml(entry.word) + "</strong></div>";
  }
  const [cropX, cropY, cropWidth, cropHeight] = entry.art.viewBox.split(/\s+/);
  const clipId = ("art-clip-" + entry.key + "-" + className).replace(/[^a-zA-Z0-9_-]/g, "-");
  return '<svg class="' + className + '" role="img" aria-label="' + escapeHtml(label) + '" viewBox="' +
    entry.art.viewBox + '" preserveAspectRatio="xMidYMid meet" overflow="hidden"><defs><clipPath id="' + clipId + '"><rect x="' + cropX + '" y="' + cropY + '" width="' + cropWidth + '" height="' + cropHeight + '"/></clipPath></defs><image href="' + entry.art.src +
    '" x="0" y="0" width="' + entry.art.width + '" height="' + entry.art.height +
    '" preserveAspectRatio="xMidYMid meet" clip-path="url(#' + clipId + ')" pointer-events="none"/></svg>';
}

function phonemeMarkup(word, splitPhonetic, stressMarks) {
  return splitPhonetic(word.phonetic).map((symbol) => {
    const stressLabel = stressMarks[symbol];
    const label = stressLabel ? ' aria-label="' + escapeHtml(stressLabel) + '" title="' + escapeHtml(stressLabel) + '"' : "";
    return '<span class="phoneme-chip' + (stressLabel ? " phoneme-stress" : "") +
      '" data-symbol="' + escapeHtml(symbol) + '"' + label + ">" + escapeHtml(symbol) + "</span>";
  }).join("");
}

export function initializeThemeProgress({ configs }) {
  if (typeof window === "undefined") return null;
  const catalog = buildThemeCatalog(configs);
  const store = new ThemeLearnedStore(catalog);
  function record(themeId, wordId) {
    return store.record(themeId, wordId);
  }
  function recordTheme(themeId) {
    return store.recordTheme(themeId);
  }
  function markReviewed(themeId) {
    return store.markReviewed(themeId);
  }
  window.addEventListener("theme-word-learned", (event) => {
    if (event.detail?.themeId && event.detail?.wordId) record(event.detail.themeId, event.detail.wordId);
  });
  window.addEventListener("theme-learning-complete", (event) => {
    if (event.detail?.themeId) recordTheme(event.detail.themeId);
  });
  window.addEventListener("theme-review-complete", (event) => {
    if (event.detail?.themeId) markReviewed(event.detail.themeId);
  });
  const api = { catalog, store, record, recordTheme, markReviewed };
  window.__THEME_PROGRESS__ = api;
  return api;
}

export function initializeThemeOverview({ configs, splitPhonetic, stressMarks, speakEnglish, reviewProgress = null }) {
  if (typeof document === "undefined") return null;
  const catalog = buildThemeCatalog(configs);
  const store = new ThemeLearnedStore(catalog);
  const totalCatalog = buildTotalWordCatalog(catalog);
  const dom = Object.fromEntries([...document.querySelectorAll("[id]")].map((node) => [node.id, node]));
  let reviewSession = null;
  let reviewTimer = 0;
  let libraryByKey = new Map();
  let reviewAdvancing = false;

  function saveReview() {
    if (reviewProgress && reviewSession) {
      const saved = reviewProgress.save(reviewSession);
      if (dom.reviewSaveNotice) dom.reviewSaveNotice.hidden = saved;
    }
  }

  function learnedEntries() {
    const entries = buildTotalWordLibrary(catalog, store.storage);
    libraryByKey = new Map(entries.map((entry) => [entry.key, entry]));
    return entries;
  }

  function updateCounts() {
    const count = learnedEntries().length;
    dom.totalReviewCount.textContent = count + " 个已学";
    const total = totalCatalog.length;
    dom.wordLibraryCount.textContent = count + "/" + total;
    dom.librarySummary.textContent = "已收录 " + count + "/" + total + " 个单词";
    return count;
  }

  function showPicker() {
    clearTimeout(reviewTimer);
    dom.wordLibraryView.hidden = true;
    dom.totalReviewView.hidden = true;
    if (dom.learningView) dom.learningView.hidden = true;
    if (dom.themePicker) dom.themePicker.hidden = false;
    updateCounts();
    dom.openTotalReview.focus();
  }

  function renderLibrary() {
    const entries = learnedEntries();
    updateCounts();
    dom.libraryEmpty.hidden = entries.length > 0;
    dom.libraryGrid.hidden = entries.length === 0;
    dom.startLibraryReview.disabled = entries.length === 0;
    dom.libraryGrid.innerHTML = entries.map((entry) =>
      '<article class="library-card" data-word-key="' + escapeHtml(entry.key) + '">' +
      '<div class="library-art-wrap">' + renderArt(entry, "library-word-art") + "</div>" +
      '<div class="library-card-copy"><span class="library-theme-label">' + escapeHtml(entry.sourceLabel) + "</span>" +
      '<h3>' + escapeHtml(entry.word) + "</h3>" +
      '<button class="library-phonetic" type="button" aria-expanded="false" aria-label="拆分 ' + escapeHtml(entry.word) + " 的音标 " + escapeHtml(entry.phonetic) + '">' + escapeHtml(entry.phonetic) + "</button>" +
      '<div class="library-phonemes phoneme-breakdown" hidden>' + phonemeMarkup(entry, splitPhonetic, stressMarks) + "</div>" +
      '<strong class="library-translation">' + escapeHtml(entry.chinese) + "</strong>" +
      '<p>' + escapeHtml(entry.sentence) + "</p>" +
      '<button class="library-speak" type="button" aria-label="朗读 ' + escapeHtml(entry.word) + '"><span aria-hidden="true">🔊</span></button>' +
      "</div></article>"
    ).join("");

    dom.libraryGrid.querySelectorAll(".library-phonetic").forEach((button) => {
      button.addEventListener("click", () => {
        const breakdown = button.nextElementSibling;
        const expanded = button.getAttribute("aria-expanded") !== "true";
        button.setAttribute("aria-expanded", String(expanded));
        breakdown.hidden = !expanded;
      });
    });
    dom.libraryGrid.querySelectorAll(".library-speak").forEach((button) => {
      button.addEventListener("click", () => {
        const entry = libraryByKey.get(button.closest(".library-card").dataset.wordKey);
        if (entry) speakEnglish(entry.word + ". " + entry.sentence);
      });
    });
  }

  function openLibrary() {
    clearTimeout(reviewTimer);
    dom.openWordLibrary.classList.add("is-active");
    dom.openWordLibrary.setAttribute("aria-pressed", "true");
    dom.openTotalReview.classList.remove("is-active");
    dom.openTotalReview.setAttribute("aria-pressed", "false");
    if (dom.themePicker) dom.themePicker.hidden = true;
    if (dom.learningView) dom.learningView.hidden = true;
    dom.totalReviewView.hidden = true;
    dom.wordLibraryView.hidden = false;
    renderLibrary();
    (dom.backFromLibrary || dom.openWordLibrary).focus();
  }

  function renderReviewQuestion() {
    reviewAdvancing = false;
    const target = reviewSession.target();
    if (!target) return finishReview();
    dom.totalReviewProgress.textContent = "第 " + (reviewSession.questionIndex + 1) + "/" + reviewSession.questions.length + " 题";
    dom.totalReviewWord.textContent = target.word;
    dom.totalReviewPhonetic.textContent = target.phonetic;
    dom.totalReviewPhonetic.setAttribute("aria-label", "拆分 " + target.word + " 的音标 " + target.phonetic);
    dom.totalReviewPhonetic.setAttribute("aria-expanded", "false");
    dom.totalReviewPhonemes.hidden = true;
    dom.totalReviewPhonemes.innerHTML = phonemeMarkup(target, splitPhonetic, stressMarks);
    dom.totalReviewSpeak.setAttribute("aria-label", "朗读 " + target.word);
    const memory = reviewProgress?.status(target.key) || "unmarked";
    if (dom.reviewMemoryStatus) dom.reviewMemoryStatus.textContent =
      memory === "forgotten" ? "上次：× 没记住" : memory === "remembered" ? "上次：✓ 记住了" : "尚未标记";
    for (const [button, status] of [[dom.reviewRemembered, "remembered"], [dom.reviewForgotten, "forgotten"]]) {
      if (!button) continue;
      button.disabled = false;
      button.setAttribute("aria-pressed", String(memory === status));
    }
    dom.totalReviewFeedback.className = "total-review-feedback";
    dom.totalReviewFeedback.textContent = "选择与 " + target.word + " 对应的图片或中文释义。";
    dom.totalReviewOptions.innerHTML = reviewSession.options().map((entry) =>
      '<button class="review-option" type="button" data-review-key="' + escapeHtml(entry.key) +
      '" aria-label="选择 ' + escapeHtml(entry.chinese) + '">' +
      renderArt(entry, "review-word-art") + "</button>"
    ).join("");
    dom.totalReviewOptions.querySelectorAll(".review-option").forEach((button) => {
      button.addEventListener("click", () => answerReview(button.dataset.reviewKey, button));
    });
  }

  function answerReview(key, button, memory = null) {
    if (!reviewSession || reviewSession.complete || reviewAdvancing) return;
    const currentKey = reviewSession.target().key;
    const result = reviewSession.answer(key);
    if (result.status === "wrong") {
      button.classList.add("is-wrong");
      dom.totalReviewFeedback.className = "total-review-feedback is-error";
      dom.totalReviewFeedback.textContent = "再看一看，选择 " + result.target.word + " 的正确图片或中文释义。";
      return;
    }
    if (memory) reviewProgress?.mark(currentKey, memory);
    reviewAdvancing = true;
    saveReview(); // Persist the next question before the feedback animation or page close.
    if (dom.reviewRemembered) dom.reviewRemembered.disabled = true;
    if (dom.reviewForgotten) dom.reviewForgotten.disabled = true;
    dom.totalReviewOptions.querySelectorAll(".review-option").forEach((option) => { option.disabled = true; });
    button.classList.add("is-correct");
    dom.totalReviewFeedback.className = "total-review-feedback is-success";
    dom.totalReviewFeedback.textContent = result.target.word + " · " + result.target.chinese +
      (memory === "forgotten" ? " · × 没记住，下轮优先" : memory === "remembered" ? " · ✓ 记住了" : "");
    reviewTimer = setTimeout(() => {
      if (result.complete) finishReview();
      else {
        renderReviewQuestion();
        dom.totalReviewPhonetic.focus({ preventScroll: true });
      }
    }, 650);
  }

  function finishReview() {
    clearTimeout(reviewTimer);
    dom.totalReviewPanel.hidden = true;
    dom.totalReviewEmpty.hidden = true;
    dom.totalReviewResult.hidden = false;
    dom.totalReviewResultScore.textContent = reviewSession.correctCount + "/" + reviewSession.questions.length;
    dom.totalReviewResultText.textContent = "已复习全部 " + reviewSession.questions.length + " 个已学单词。";
  }

  function openReview(restart = false) {
    clearTimeout(reviewTimer);
    reviewAdvancing = false;
    dom.openTotalReview.classList.add("is-active");
    dom.openTotalReview.setAttribute("aria-pressed", "true");
    dom.openWordLibrary.classList.remove("is-active");
    dom.openWordLibrary.setAttribute("aria-pressed", "false");
    const entries = learnedEntries();
    if (dom.themePicker) dom.themePicker.hidden = true;
    if (dom.learningView) dom.learningView.hidden = true;
    dom.wordLibraryView.hidden = true;
    dom.totalReviewView.hidden = false;
    dom.totalReviewResult.hidden = true;
    dom.totalReviewEmpty.hidden = entries.length > 0;
    dom.totalReviewPanel.hidden = entries.length === 0;
    dom.reviewHeaderCount.textContent = entries.length + " 个已学单词";
    if (entries.length > 0) {
      reviewSession = new TotalReviewSession(entries);
      if (reviewProgress) {
        const saved = reviewProgress.restore(reviewSession, restart === true);
        if (dom.reviewSaveNotice) dom.reviewSaveNotice.hidden = saved;
      }
      if (reviewSession.complete) finishReview();
      else renderReviewQuestion();
    } else {
      reviewSession = null;
    }
    (dom.backFromReview || dom.openTotalReview).focus();
  }

  function record(themeId, wordId) {
    const changed = store.record(themeId, wordId);
    if (changed) updateCounts();
    return changed;
  }

  function recordTheme(themeId) {
    const changed = store.recordTheme(themeId);
    if (changed) updateCounts();
    return changed;
  }

  dom.openWordLibrary.addEventListener("click", openLibrary);
  dom.openTotalReview.addEventListener("click", openReview);
  dom.backFromLibrary?.addEventListener("click", showPicker);
  dom.backFromReview?.addEventListener("click", showPicker);
  dom.startLibraryReview.addEventListener("click", openReview);
  dom.emptyReviewLibrary.addEventListener("click", openLibrary);
  dom.restartTotalReview.addEventListener("click", () => openReview(true));
  dom.reviewRemembered?.addEventListener("click", () => {
    const target = reviewSession?.target();
    if (target) answerReview(target.key, dom.reviewRemembered, "remembered");
  });
  dom.reviewForgotten?.addEventListener("click", () => {
    const target = reviewSession?.target();
    if (target) answerReview(target.key, dom.reviewForgotten, "forgotten");
  });
  dom.totalReviewPhonetic.addEventListener("click", () => {
    const expanded = dom.totalReviewPhonetic.getAttribute("aria-expanded") !== "true";
    dom.totalReviewPhonetic.setAttribute("aria-expanded", String(expanded));
    dom.totalReviewPhonemes.hidden = !expanded;
  });
  dom.totalReviewSpeak.addEventListener("click", () => {
    const target = reviewSession?.target();
    if (target) speakEnglish(target.word + ". " + target.sentence);
  });
  window.addEventListener("theme-word-learned", (event) => {
    if (event.detail?.themeId && event.detail?.wordId) record(event.detail.themeId, event.detail.wordId);
  });

  updateCounts();
  const api = {
    catalog,
    totalCatalog,
    store,
    get reviewSession() { return reviewSession; },
    record,
    recordTheme,
    openLibrary,
    openReview,
    showPicker,
    renderLibrary
  };
  window.__THEME_OVERVIEW__ = api;
  return api;
}
