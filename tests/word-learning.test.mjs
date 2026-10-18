import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { HanziEngine } from "../src/engine.js";
import { APP_VERSION, PHASE } from "../src/constants.js";
import { BOOK1_ITEMS } from "../data/book1.js";
import { SCENARIOS } from "../data/scenarios.js";
import { THEME_CONFIGS } from "../theme-learning.js";
import { buildThemeCatalog } from "../src/theme-overview.js";
import { buildWordLearningItems, WordLearningStorage, WORD_LEARNING_STORAGE_KEY } from "../src/word-learning-model.js";
const date = "2026-10-17", themeCatalog = buildThemeCatalog(THEME_CONFIGS);
const items = buildWordLearningItems(themeCatalog);
function memory() {
  const data = new Map(["mario-hanzi-refactor-v1", "mario-book1-v1", "mario-theme-learned-v1", "mario-scenario-learning-v1", "mario-total-review-v1"].map(key => [key, "sentinel"]));
  const writes = [];
  return { data, writes, getItem: key => data.get(key), setItem(key, value) { data.set(key, value); writes.push(key); } };
}
test("单词自动包含Book1/主题/情景定义，拼写去重、全部有配图，不依赖已学记录", () => {
  assert.equal(new Set(items.map(item => item.word)).size, items.length);
  assert.equal(new Set(items.map(item => item.id)).size, items.length);
  for (const item of BOOK1_ITEMS.filter(item => item.type === "word")) assert.ok(items.some(word => word.word === item.word.toLowerCase()), item.word);
  for (const scenario of SCENARIOS) for (const word of scenario.vocabulary) assert.ok(items.some(item => item.word === word.word.toLowerCase().replaceAll("’", "'")), word.word);
  for (const item of items) {
    assert.equal(item.id, `word:${item.word}`);
    assert.ok(typeof item.chinese === "string" && item.chinese.trim(), `Chinese translation for ${item.word}`);
    assert.notEqual(item.art.type, "meaning");
    if (["image", "image-url"].includes(item.art.type)) assert.ok(item.art.src, item.word);
  }
});
test("新增情景自动扩容、重复词不重复加入，顺序/配图变化不丢失学习进度", () => {
  const extra = { id: "test-new", image: "./assets/scenarios/first-meeting-v1.png", chineseTitle: "新场景", englishTitle: "New", lines: [{ text: "Apple novelword." }], vocabulary: [{ word: "APPLE", phonetic: "æpəl", chinese: "苹果" }, { word: "novelword", phonetic: "test", chinese: "测试" }] };
  const grown = buildWordLearningItems(themeCatalog, { scenarios: [...SCENARIOS, extra] });
  assert.equal(grown.length, items.length + 1);
  assert.equal(grown.filter(item => item.word === "apple").length, 1);
  const storage = new WordLearningStorage(memory(), items, { date });
  const engine = new HanziEngine(storage.load(), items, { date });
  engine.startDaily(); engine.wrong(); storage.save(engine.state);
  const restored = new HanziEngine(new WordLearningStorage(storage.storage, [...grown].reverse(), { date }).load(), [...grown].reverse(), { date });
  assert.deepEqual(restored.state.dailyNewIds, engine.state.dailyNewIds);
  assert.equal(restored.state.activeWordId, engine.state.activeWordId);
  assert.equal(restored.state.records[engine.state.dailyNewIds[0]].errorCount, 1);
});
test("直接复用汉字三词筛选、每词三次、手动学习完毕、混合复习流程", () => {
  const engine = new HanziEngine(new WordLearningStorage(memory(), items, { date }).load(), items, { date, rng: () => 0 });
  engine.startDaily(); for (let i = 0; i < 3; i++) engine.wrong();
  assert.equal(engine.state.dailyPhase, PHASE.NEW_LEARNING);
  for (let i = 0; i < 9; i++) engine.correct();
  assert.equal(engine.progress().newDone, 3); assert.equal(engine.state.dailyPhase, PHASE.NEW_LEARNING);
  engine.finishNewLearning(); assert.equal(engine.state.dailyPhase, PHASE.MIXED_REVIEW);
  for (let i = 0; i < 3; i++) engine.correct();
  assert.equal(engine.state.dailyTaskDone, true);
});
test("普通复习固定最多20，错误需修复三次，刷新延续原批次并只写单词key", () => {
  const mem = memory(), storage = new WordLearningStorage(mem, items, { date });
  const state = storage.load();
  for (const item of items.slice(0, 25)) state.records[item.id] = { status: "known", correctCount: 3, streak: 3, nextReviewRound: 1 };
  const engine = new HanziEngine(state, items, { date, rng: () => 0 });
  engine.startReview(); assert.equal(engine.state.dailyReviewIds.length, 20);
  const wrongId = engine.state.activeWordId; engine.wrong();
  assert.equal(engine.reviewWrongCount(wrongId), 0);
  for (let i = 0; i < 60 && engine.reviewWrongCount(wrongId) < 3; i++) engine.correct();
  assert.equal(engine.reviewWrongCount(wrongId), 3);
  storage.save(engine.state);
  const restored = new HanziEngine(storage.load(), items, { date });
  assert.equal(restored.state.activeWordId, engine.state.activeWordId);
  assert.deepEqual(restored.state.dailyReviewDoneIds, engine.state.dailyReviewDoneIds);
  restored.startReview(); assert.deepEqual(restored.state.dailyReviewIds, engine.state.dailyReviewIds);
  storage.reset();
  assert.ok(mem.writes.every(key => key === WORD_LEARNING_STORAGE_KEY));
  assert.ok([...mem.data].filter(([key]) => key !== WORD_LEARNING_STORAGE_KEY).every(([, value]) => value === "sentinel"));
});
test("单词测试命名空间隔离，损坏/禁用存储可继续使用但报告保存失败", () => {
  const mem = memory(), storage = new WordLearningStorage(mem, items, { date, namespace: "words" });
  assert.equal(storage.key, `${WORD_LEARNING_STORAGE_KEY}:test:words`);
  mem.data.set(storage.key, "invalid"); const state = storage.load(); assert.deepEqual(state.records, {});
  const denied = new WordLearningStorage({ getItem() { throw Error(); }, setItem() { throw Error(); } }, items, { date });
  assert.doesNotThrow(() => denied.save(denied.load())); assert.equal(denied.saveFailed, true);
});
test("全部学习页在汉字右边接入单词入口，图片侧没有文本答案，使用同一个汉字引擎", () => {
  for (const name of ["index", "pinyin", "word-learning", "book-learning", "theme-learning", "scenario-learning", "review-learning", "phonetics"]) {
    const html = readFileSync(new URL(`../${name}.html`, import.meta.url), "utf8");
    const nav = html.match(/<nav[\s\S]*?<\/nav>/)[0];
    assert.match(nav, />汉字<\/[^>]+>\s*<(?:a|span)[^>]*>单词<\//, name);
  }
  const script = readFileSync(new URL("../word-learning.js", import.meta.url), "utf8");
  assert.ok(script.includes(`./src/constants.js?v=${APP_VERSION}`));
  assert.match(script, /new HanziEngine/);
  assert.match(script, /\.ordinal-word-art span,\.song-word-art strong/);
  assert.match(script, /event\.target\.closest/);
});

test("单词卡沿用汉字布局，先隐藏答案，揭示后显示英文/音标并复用双元音拆解", () => {
  const html = readFileSync(new URL("../word-learning.html", import.meta.url), "utf8");
  const script = readFileSync(new URL("../word-learning.js", import.meta.url), "utf8");
  const css = readFileSync(new URL("../word-learning.css", import.meta.url), "utf8");
  assert.match(html, /class="stage word-lesson"/);
  for (const name of ["map-visual", "word-card", "hanzi-panel", "pinyin-line word-question"]) assert.ok(html.includes(`class="${name}"`));
  assert.match(html, /word-learning\.css\?v=1\.3/);
  assert.match(html, /word-learning\.js\?v=1\.5/);
  assert.match(html, /id="wordTranslation" hidden/);
  assert.match(html, /class="word-picture-panel">[\s\S]*?id="wordPicture"[\s\S]*?id="wordTranslation"[\s\S]*?class="pinyin-line word-question"/);
  assert.match(script, /dom\.wordTranslation\.textContent = active \? item\.chinese : ""/);
  assert.match(script, /dom\.wordTranslation\.hidden = !active/);
  assert.doesNotMatch(script.slice(script.indexOf("function reveal()"), script.indexOf("function togglePhonetic()")), /wordTranslation/);
  assert.match(script, /active \? "显示"/);
  assert.match(script, /dom\.currentWord\.textContent = item\.displayWord \|\| item\.word/);
  assert.match(script, /splitPhonetic\(item\.phonetic\)/);
  assert.match(script, /dom\.wordPhonetic\.addEventListener\("click", togglePhonetic\)/);
  assert.match(script, /dom\.phonemeBreakdown\.replaceChildren\(\); dom\.phonemeBreakdown\.hidden = true/);
  assert.doesNotMatch(css, /min-height:420px|\.word-lesson\{display:grid/);
});
