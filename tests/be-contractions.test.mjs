import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { BE_CONTRACTION_PAIRS, BE_CONTRACTION_WORDS } from "../data/be-contractions.js";
import { THEME_CONFIGS, THEME_SERIES, ThemeSession } from "../theme-learning.js";
import { buildThemeCatalog, ThemeLearnedStore, renderArt } from "../src/theme-overview.js";
import { buildTotalWordCatalog, buildTotalWordLibrary } from "../src/total-word-library.js";
import { buildWordLearningItems } from "../src/word-learning-model.js";

test("人称与缩写只教三组BE对应，六个形式含准确音标、中文、简单例句", () => {
  assert.deepEqual(BE_CONTRACTION_PAIRS.map(pair => [pair.full, pair.short]), [["I am", "I'm"], ["He is", "He's"], ["It is", "It's"]]);
  assert.deepEqual(BE_CONTRACTION_WORDS.map(word => word.phonetic), ["/aɪ æm/", "/aɪm/", "/hiː ɪz/", "/hiːz/", "/ɪt ɪz/", "/ɪts/"]);
  assert.equal(new Set(BE_CONTRACTION_WORDS.map(word => word.id)).size, 6);
  assert.ok(BE_CONTRACTION_WORDS.every(word => word.sentence && word.sentenceChinese && word.displayWord === word.word));
  assert.match(BE_CONTRACTION_PAIRS[0].note, /大写/);
  assert.match(BE_CONTRACTION_PAIRS[2].note, /its.*它的/);
  assert.ok(THEME_SERIES.basics.themeIds.includes("beContractions"));
  assert.deepEqual(THEME_CONFIGS.beContractions.words, BE_CONTRACTION_WORDS);
});

test("完整与缩写双向六题不重复，答错不推进、不把am和is交叉对应", () => {
  const session = new ThemeSession(BE_CONTRACTION_WORDS, () => 0.3);
  const seen = new Set();
  while (!session.complete) {
    const target = session.target(), before = session.questionIndex;
    const prompt = THEME_CONFIGS.beContractions.instruction(target);
    assert.equal(prompt, target.form === "short" ? `Choose the short form of ${target.fullForm}.` : `Choose the full form of ${target.shortForm}.`);
    const wrong = BE_CONTRACTION_WORDS.find(word => word.id !== target.id);
    assert.equal(session.answer(wrong.id).status, "wrong"); assert.equal(session.questionIndex, before);
    seen.add(target.id); assert.equal(session.answer(target.id).status, "correct");
  }
  assert.equal(seen.size, 6); assert.equal(session.correctCount, 6);
});

test("新主题只写原主题key，旧单词保留，六个表达只在明确学习后进入总词库", () => {
  const catalog = buildThemeCatalog(THEME_CONFIGS), writes = [];
  const data = new Map([["mario-theme-learned-v1", JSON.stringify({ version: 2, learned: ["body:head"], learnedThemes: [], reviewedThemes: [] })], ["mario-scenario-learning-v1", JSON.stringify({ learnedWords: [] })]]);
  const storage = { getItem: key => data.get(key), setItem: (key, value) => { writes.push(key); data.set(key, value); } };
  const store = new ThemeLearnedStore(catalog, storage);
  assert.equal(buildTotalWordLibrary(catalog, storage).filter(word => word.themeId === "beContractions").length, 0);
  assert.equal(store.recordTheme("beContractions"), true); assert.equal(store.recordTheme("beContractions"), false);
  assert.ok(store.learned.has("body:head"));
  const learned = buildTotalWordLibrary(catalog, storage).filter(word => word.themeId === "beContractions");
  assert.equal(learned.length, 6);
  assert.equal(new Set(learned.map(word => word.art.label)).size, 6, "same meaning but full/short options remain distinguishable");
  for (const word of learned) assert.ok(renderArt(word).includes(word.formLabel));
  assert.deepEqual([...new Set(writes)], ["mario-theme-learned-v1"]);
  assert.equal(new ThemeLearnedStore(catalog, storage).isThemeLearned("beContractions"), true);
  assert.equal(buildTotalWordCatalog(catalog).length, 284);
});

test("独立单词模块自动加入六个表达，规范化ID不变且图片侧没有文字答案", () => {
  const words = buildWordLearningItems(buildThemeCatalog(THEME_CONFIGS));
  for (const entry of BE_CONTRACTION_WORDS) {
    const word = words.find(item => item.word === entry.word.toLowerCase());
    assert.equal(word.id, `word:${entry.word.toLowerCase()}`);
    assert.equal(word.displayWord, entry.word);
    assert.equal(word.art.type, "image-url");
    assert.ok(existsSync(new URL("../" + word.art.src, import.meta.url)));
  }
  const css = readFileSync(new URL("../theme-learning.css", import.meta.url), "utf8");
  assert.match(css, /\.is-word-review \.contraction-spelling\{visibility:hidden\}/);
  assert.match(css, /\.is-word-review \.contraction-help\{display:none\}/);
});
