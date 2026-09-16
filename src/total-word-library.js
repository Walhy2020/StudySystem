import { BOOK1_ITEMS } from "../data/book1.js";
import { SCENARIOS } from "../data/scenarios.js?v=1.4";

export const TOTAL_WORD_SOURCE_KEYS = Object.freeze({
  theme: "mario-theme-learned-v1",
  book1: "mario-book1-v1",
  scenario: "mario-scenario-learning-v1",
});

export const normalizeLibraryWord = (value) => String(value || "").trim().toLowerCase().replaceAll("’", "'");
const CONTRACTIONS = Object.freeze({ "i'm": ["i", "am"], "they're": ["they", "are"], "it's": ["it", "is"] });

function wordsInText(text) {
  return (normalizeLibraryWord(text).match(/[a-z]+(?:'[a-z]+)*/g) || []).flatMap((word) => CONTRACTIONS[word] || [word]);
}

function read(storage, key) {
  try {
    const value = JSON.parse(storage?.getItem?.(key) || "null");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

const values = (value) => Array.isArray(value) ? value : [];

function scenarioArt(word, scenarios) {
  const countingScene = scenarios.find(({ id }) => id === "counting-pens");
  const countingObject = { keys: "two-keys", mushrooms: "four-mushrooms", coins: "five-coins", stars: "six-stars" }[word];
  if (countingObject && countingScene?.focusObjects?.[countingObject]) {
    const art = countingScene.focusObjects[countingObject];
    return Object.freeze({ type: "image-url", src: art.image, alt: art.label });
  }
  if (word === "pens" || word === "number") {
    const counting = scenarios.find(({ id }) => id === "counting-pens")?.focusObjects?.["eight-pens"];
    if (counting) return Object.freeze({ type: "image-url", src: counting.image, alt: counting.label });
  }
  const scenario = scenarios.find(({ id }) => id === "what-is-it");
  const objectId = {
    pen: "pen",
    pencils: "pencils",
    yellow: "pencils",
    marker: "marker",
    green: "erasers",
    erasers: "erasers",
    red: "red-erasers",
  }[word];
  const object = objectId && scenario?.focusObjects?.[objectId];
  return object
    ? Object.freeze({ type: "image-url", src: object.image, alt: object.label })
    : null;
}

function candidatePriority(entry) {
  if (entry.sourceType === "theme") return 3;
  if (entry.art?.type === "image-url") return 2;
  return 1;
}

export function buildTotalWordCatalog(themeCatalog, { bookItems = BOOK1_ITEMS, scenarios = SCENARIOS } = {}) {
  const candidates = [
    ...themeCatalog.map((entry) => ({ ...entry, sourceType: "theme", sourceLabel: `主题学习 · ${entry.themeTitle}` })),
    ...bookItems.filter(({ type }) => type === "word").map((entry) => ({
      key: `total:${normalizeLibraryWord(entry.word)}`,
      word: entry.word,
      phonetic: entry.phonetic,
      chinese: entry.translation,
      sentence: `${entry.letter} for ${entry.word}.`,
      themeTitle: "Book1",
      themeEnglishTitle: "Oxford Phonics World 1",
      sourceType: "book1",
      sourceLabel: "Book1",
      art: Object.freeze({ type: "image-url", src: entry.image, alt: `${entry.word} ${entry.translation}` }),
    })),
    ...scenarios.flatMap((scenario) => (scenario.vocabulary || []).map((entry) => {
      const word = normalizeLibraryWord(entry.word);
      const sourceLine = scenario.lines.find((line) => wordsInText(line.text).includes(word));
      return {
        key: `total:${word}`,
        word,
        phonetic: entry.phonetic,
        chinese: entry.chinese,
        sentence: sourceLine?.text || `${scenario.englishTitle} · ${entry.word}`,
        themeTitle: "情景模式",
        themeEnglishTitle: scenario.englishTitle,
        sourceType: "scenario",
        sourceLabel: `情景模式 · ${scenario.chineseTitle}`,
        art: scenarioArt(word, scenarios) || Object.freeze({ type: "meaning", label: entry.chinese }),
      };
    })),
  ];
  const byWord = new Map();
  for (const candidate of candidates) {
    const word = normalizeLibraryWord(candidate.word);
    if (!word) continue;
    const normalized = { ...candidate, key: `total:${word}`, word };
    const existing = byWord.get(word);
    if (!existing || candidatePriority(normalized) > candidatePriority(existing)) byWord.set(word, normalized);
  }
  return [...byWord.values()];
}

export function totalLearnedWordSources(storage, themeCatalog, { suffix = "", bookItems = BOOK1_ITEMS, scenarios = SCENARIOS } = {}) {
  const sources = new Map();
  const add = (word, source) => {
    const key = normalizeLibraryWord(word);
    if (!key) return;
    if (!sources.has(key)) sources.set(key, new Set());
    sources.get(key).add(source);
  };

  const themeState = read(storage, TOTAL_WORD_SOURCE_KEYS.theme + suffix);
  const themeKeys = new Set(values(themeState.learned));
  const wholeThemes = new Set([...values(themeState.learnedThemes), ...values(themeState.reviewedThemes)]);
  for (const entry of themeCatalog) {
    if (themeKeys.has(entry.key) || wholeThemes.has(entry.themeId)) add(entry.word, `主题学习 · ${entry.themeTitle}`);
  }

  const bookState = read(storage, TOTAL_WORD_SOURCE_KEYS.book1 + suffix);
  const bookIds = new Set([...values(bookState.learnedIds), ...values(bookState.masteredIds)]);
  for (const [id, record] of Object.entries(bookState.records || {})) {
    if (record && (Number(record.correctCount) > 0 || Number(record.errorCount) > 0)) bookIds.add(id);
  }
  for (const entry of bookItems) {
    if (entry.type === "word" && bookIds.has(entry.id)) add(entry.word, "Book1");
  }

  const scenarioState = read(storage, TOTAL_WORD_SOURCE_KEYS.scenario + suffix);
  for (const word of values(scenarioState.learnedWords)) {
    const scenario = scenarios.find((item) => (item.vocabulary || []).some((entry) => normalizeLibraryWord(entry.word) === normalizeLibraryWord(word)));
    add(word, scenario ? `情景模式 · ${scenario.chineseTitle}` : "情景模式");
  }
  return sources;
}

export function totalLearnedWordSet(storage, themeCatalog, options = {}) {
  return new Set(totalLearnedWordSources(storage, themeCatalog, options).keys());
}

export function buildTotalWordLibrary(themeCatalog, storage, options = {}) {
  const sources = totalLearnedWordSources(storage, themeCatalog, options);
  return buildTotalWordCatalog(themeCatalog, options)
    .filter(({ word }) => sources.has(normalizeLibraryWord(word)))
    .map((entry) => ({ ...entry, sourceLabel: [...sources.get(normalizeLibraryWord(entry.word))].join(" · ") }));
}
