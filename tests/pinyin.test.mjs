import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PINYIN_ITEMS, PINYIN_GROUPS } from "../data/pinyin.js";
import { PinyinEngine } from "../src/pinyin-engine.js";
import { PinyinStorage, PINYIN_STORAGE_KEY } from "../src/pinyin-storage.js";
import { createInitialState } from "../src/state.js";
import { PHASE } from "../src/constants.js";

const date = "2026-10-02";
const make = state => new PinyinEngine(state || createInitialState(date, 63), PINYIN_ITEMS, { date, rng: () => 0 });
function store() {
  const data = new Map([["mario-hanzi-refactor-v1", "hanzi-sentinel"], ["mario-phonetics-v1", "ipa-sentinel"]]);
  const writes = [];
  return { data, writes, getItem: key => data.get(key) ?? null,
    setItem(key, value) { writes.push(key); data.set(key, value); } };
}

test("拼音目录准确收录23声母、24韵母、16整体音节，不包含汉字/关联例子", () => {
  assert.deepEqual(PINYIN_GROUPS.map(group => group.symbols.length), [23, 24, 16]);
  assert.equal(PINYIN_ITEMS.length, 63);
  assert.equal(new Set(PINYIN_ITEMS.map(item => item.id)).size, 63);
  assert.equal(new Set(PINYIN_ITEMS.map(item => item.symbol)).size, 63);
  for (const symbol of ["ü", "üe", "ün", "zh", "ch", "sh", "yuan", "ying"]) {
    assert.ok(PINYIN_ITEMS.some(item => item.symbol === symbol));
  }
  assert.ok(PINYIN_ITEMS.every(item => !item.examples && !item.char && /^[a-zü]+$/.test(item.symbol)));
});

test("拼音筛选63项各一遍后停止，全勾也能确认学习完毕且刷新保持完成", () => {
  const memory = store(); const storage = new PinyinStorage(memory, PINYIN_ITEMS, { date });
  let value = make(storage.load()); value.startDaily(); const seen = new Set();
  for (let i = 0; i < 63; i++) {
    const current = value.currentWord(); assert.ok(current); assert.ok(!seen.has(current.id));
    assert.equal(current.id, PINYIN_ITEMS[i].id, "screening follows the entire catalog including category boundaries");
    seen.add(current.id); value.correct(); storage.save(value.state); value = make(storage.load());
  }
  assert.equal(value.currentWord(), null);
  assert.equal(value.canFinishNewLearning(), true);
  assert.equal(value.state.dailyTaskDone, false);
  value.finishNewLearning(); storage.save(value.state); value = make(storage.load());
  assert.equal(value.state.dailyTaskDone, true); assert.equal(value.currentWord(), null);
});

test("拼音新项每项认识一次即可结束，不进入混合循环；临时复习恢复被打断项", () => {
  const value = make(); value.startDaily(); for (let i = 0; i < 3; i++) value.wrong();
  assert.equal(value.state.dailyPhase, PHASE.NEW_LEARNING);
  assert.equal(value.state.dailyNewIds.length, 3);
  const returning = value.currentWord().id;
  const inline = value.state.dailyNewIds.find(id => id !== returning);
  value.startInlineReview(inline, "today-new"); value.master();
  assert.equal(value.currentWord().id, returning);
  for (let i = 0; i < 3 && value.currentWord(); i++) value.correct();
  assert.equal(value.canFinishNewLearning(), true);
  value.finishNewLearning(); assert.equal(value.state.dailyTaskDone, true);
  assert.equal(value.state.dailyPhase, PHASE.NEW_LEARNING);
});

test("拼音每轮复习全部非mastered，刷新不截成20项，点星立即排除，全mastered为0", () => {
  const memory = store(); const storage = new PinyinStorage(memory, PINYIN_ITEMS, { date });
  let value = make(storage.load()); value.startReview(); assert.equal(value.state.dailyReviewIds.length, 63);
  const mastered = value.currentWord().id; value.master(); value.correct();
  const active = value.currentWord().id; storage.save(value.state); value = make(storage.load());
  assert.equal(value.state.dailyReviewIds.length, 62); assert.equal(value.currentWord().id, active);
  assert.equal(value.state.dailyReviewDoneIds.length, 1); value.startReview();
  assert.equal(value.state.dailyReviewIds.includes(mastered), false);
  while (value.currentWord()) value.master(); value.startReview();
  assert.equal(value.state.dailyReviewIds.length, 0); assert.equal(value.state.dailyTaskDone, true);
});

test("拼音错项需三次修复，存储与重置仅写自己key，不接收外部key覆盖", () => {
  const memory = store(); const storage = new PinyinStorage(memory, PINYIN_ITEMS, { date, key: "mario-phonetics-v1" });
  let value = make(storage.load()); value.startReview(); const wrongId = value.currentWord().id;
  value.wrong(); assert.ok(value.state.reviewWrongIds.includes(wrongId));
  for (let i = 0; i < 3; i++) { value.startInlineReview(wrongId, "review-wrong"); value.correct(); }
  assert.equal(value.reviewWrongCount(wrongId), 3);
  storage.save(value.state); value = make(storage.reset()); value.startReview();
  assert.equal(value.state.dailyReviewIds.length, 63);
  assert.deepEqual([...new Set(memory.writes)], [PINYIN_STORAGE_KEY]);
  assert.equal(memory.data.get("mario-hanzi-refactor-v1"), "hanzi-sentinel");
  assert.equal(memory.data.get("mario-phonetics-v1"), "ipa-sentinel");
});

test("六个学习页拼音导航在汉字前，页面含独立版本与资源", () => {
  for (const page of ["index", "book-learning", "theme-learning", "scenario-learning", "review-learning", "phonetics"]) {
    const html = readFileSync(new URL(`../${page}.html`, import.meta.url), "utf8");
    const nav = html.match(/<nav[\s\S]*?<\/nav>/)[0];
    assert.ok(nav.indexOf("拼音") < nav.indexOf("汉字"), page);
    assert.ok(html.includes("module-navigation.css?v=1.0"), page);
  }
  const html = readFileSync(new URL("../pinyin.html", import.meta.url), "utf8");
  assert.ok(html.includes("pinyin-app.js?v=1.15")); assert.ok(html.includes("pinyin.css?v=1.0"));
  assert.equal((html.match(/id="pinyinSymbol"/g) || []).length, 1);
  assert.ok(!html.includes("phonetic-examples"));
});

test("新拼音从教材开头筛选，学习按目录而非随机/存档列表顺序，刷新保留完成记录", () => {
  for (const random of [0, 0.5, 0.999]) {
    const value = new PinyinEngine(createInitialState(date, 63), PINYIN_ITEMS, { date, rng: () => random });
    value.state.scanCursor = 40;
    value.startDaily();
    assert.equal(value.currentWord().symbol, "b");
    for (let i = 0; i < 3; i++) value.wrong();
    assert.equal(value.currentWord().symbol, "b");
    const saved = structuredClone(value.state);
    saved.dailyNewIds.reverse(); saved.activeWordId = saved.dailyNewIds[0];
    let restored = new PinyinEngine(saved, PINYIN_ITEMS, { date, rng: () => { throw new Error("new learning must not use random"); } });
    for (const symbol of ["b", "p", "m"]) {
      assert.equal(restored.currentWord().symbol, symbol);
      restored.correct();
      restored = new PinyinEngine(structuredClone(restored.state), PINYIN_ITEMS, { date, rng: () => { throw new Error("new learning must not use random"); } });
    }
    assert.equal(restored.currentWord(), null);
    assert.equal(restored.canFinishNewLearning(), true);
  }
});

test("新学习跨分类仍按目录，跳过已完成或mastered，不改变复习抽取", () => {
  for (const symbols of [["w", "a", "o"], ["ong", "zhi", "chi"], ["yuan", "yin", "yun"]]) {
    const saved = createInitialState(date, 63);
    saved.dailyTaskStarted = true; saved.dailyPhase = PHASE.NEW_LEARNING;
    saved.dailyNewIds = symbols.map(symbol => PINYIN_ITEMS.find(item => item.symbol === symbol).id).reverse();
    const value = make(saved);
    for (const symbol of symbols) { assert.equal(value.currentWord().symbol, symbol); value.correct(); }
    assert.equal(value.canFinishNewLearning(), true);
  }
  const value = make(); value.startDaily(); value.master();
  value.state.scanCursor = 40; value.startDaily();
  assert.equal(value.currentWord().symbol, "p", "mastered b is skipped from the catalog start");
  let randomCalls = 0;
  const review = new PinyinEngine(createInitialState(date, 63), PINYIN_ITEMS,
    { date, rng: () => { randomCalls++; return 0.999; } });
  review.startReview(); assert.equal(randomCalls, 1, "review keeps its existing selection policy");
  assert.equal(review.state.dailyReviewIds.length, 63);
});
