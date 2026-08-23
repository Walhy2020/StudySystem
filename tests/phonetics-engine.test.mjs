import test from "node:test";
import assert from "node:assert/strict";
import { HanziEngine } from "../src/engine.js";
import { PhoneticsEngine, PHONETICS_REVIEW_POLICY_VERSION } from "../src/phonetics-engine.js";
import { PhoneticsStorage } from "../src/phonetics-storage.js";
import { createInitialState, normalizeState } from "../src/state.js";
import { PHASE } from "../src/constants.js";

globalThis.window = {};
await import("../data/phonetics.js");
const phonetics = window.MARIO_PHONETICS;
const DATE = "2026-08-21";
const PHONETICS_KEY = "mario-phonetics-v1";

function engine(words = phonetics, state = createInitialState(DATE), date = DATE) {
  return new PhoneticsEngine(state, words, { date, rng: () => 0 });
}

function completeDailyRoute(Engine, words) {
  const value = new Engine(createInitialState(DATE), words, { date: DATE, rng: () => 0 });
  value.startDaily({ resetCursor: true });
  for (let index = 0; index < 3; index += 1) value.wrong();
  assert.equal(value.state.dailyPhase, PHASE.NEW_LEARNING);
  for (let guard = 0; guard < 20 && value.progress().newDone < 3; guard += 1) value.correct();
  value.finishNewLearning();
  for (let guard = 0; guard < 10 && !value.state.dailyTaskDone; guard += 1) value.correct();
  return {
    phase: value.state.dailyPhase,
    dailyCount: value.state.dailyNewIds.length,
    correctCounts: Object.values(value.state.dailyNewCorrectCounts).sort(),
    mixedCount: value.state.dailyMixedDoneIds.length,
    done: value.state.dailyTaskDone,
    progress: value.progress(),
  };
}

test("汉字与音标使用同一状态机：今日新内容推进和完成结果完全一致", () => {
  const mirroredHanzi = phonetics.map((item, index) => ({ ...item, id: `h-${index}` }));
  assert.deepEqual(
    completeDailyRoute(PhoneticsEngine, phonetics),
    completeDailyRoute(HanziEngine, mirroredHanzi),
  );
});

test("48 项均未完全认识时全量复习 48 项，已认识、错误、到期和未学习项都纳入", () => {
  const state = createInitialState(DATE);
  state.records[phonetics[0].id] = { status: "known", correctCount: 3 };
  state.records[phonetics[1].id] = { status: "wrong", correctCount: 2, errorCount: 1 };
  state.records[phonetics[2].id] = { status: "known", correctCount: 3, nextReviewRound: 1 };
  const value = engine(phonetics, state);
  const result = value.startReview();
  assert.equal(value.state.dailyReviewIds.length, 48);
  assert.deepEqual(value.state.dailyReviewIds, phonetics.map((item) => item.id));
  assert.ok(value.state.dailyReviewIds.includes(phonetics[0].id), "已认识但未完全认识必须纳入");
  assert.ok(value.state.dailyReviewIds.includes(phonetics[1].id), "错误音标必须纳入");
  assert.ok(value.state.dailyReviewIds.includes(phonetics[2].id), "到期音标必须纳入");
  assert.ok(value.state.dailyReviewIds.includes(phonetics[47].id), "未学习音标必须纳入");
  assert.match(result.message, /48/);
  assert.equal(value.progress().reviewTotal, 48);
});

test("部分完全认识时唯一排除这些项目，再次进入不会重新加入", () => {
  const state = createInitialState(DATE);
  const mastered = phonetics.slice(0, 5).map((item) => item.id);
  state.masteredIds = mastered;
  for (const id of mastered) {
    state.records[id] = { status: "mastered", correctCount: 3 };
  }
  const value = engine(phonetics, state);
  value.startReview();
  assert.equal(value.state.dailyReviewIds.length, 43);
  assert.ok(mastered.every((id) => !value.state.dailyReviewIds.includes(id)));
  const newlyMastered = value.state.activeWordId;
  value.master();
  assert.ok(value.isMastered(newlyMastered));
  assert.ok(!value.state.dailyReviewIds.includes(newlyMastered));
  assert.ok(!value.state.reviewWrongIds.includes(newlyMastered));
  assert.notEqual(value.state.activeWordId, newlyMastered);
  value.startReview();
  assert.equal(value.state.dailyReviewIds.length, 42);
  assert.ok(!value.state.dailyReviewIds.includes(newlyMastered));
});

test("恢复进行中的复习缓存会过滤后来已完全认识的音标", () => {
  const state = createInitialState(DATE);
  const masteredId = phonetics[0].id;
  Object.assign(state, {
    phoneticsReviewPolicyVersion: PHONETICS_REVIEW_POLICY_VERSION,
    reviewIncludesDailyNew: true,
    dailyPhase: PHASE.REVIEW,
    dailyTaskStarted: true,
    dailyTaskDone: false,
    dailyReviewIds: phonetics.map((item) => item.id),
    dailyReviewDoneIds: [masteredId, phonetics[1].id],
    reviewWrongIds: [masteredId, phonetics[2].id],
    reviewWrongCorrectCounts: { [masteredId]: 1, [phonetics[2].id]: 2 },
    activeWordId: masteredId,
    masteredIds: [masteredId],
    records: { [masteredId]: { status: "mastered", correctCount: 3 } },
  });
  const restored = engine(phonetics, state);
  assert.equal(restored.state.dailyReviewIds.length, 47);
  assert.ok(!restored.state.dailyReviewIds.includes(masteredId));
  assert.ok(!restored.state.dailyReviewDoneIds.includes(masteredId));
  assert.ok(!restored.state.reviewWrongIds.includes(masteredId));
  assert.notEqual(restored.state.activeWordId, masteredId);
});

test("临时复习中点星会完全移除该音标并恢复被打断项", () => {
  const value = engine();
  value.startReview();
  const interruptedId = value.state.activeWordId;
  const inlineId = phonetics.find((item) => item.id !== interruptedId).id;
  value.state.reviewWrongIds = [inlineId];
  value.state.reviewWrongCorrectCounts = { [inlineId]: 0 };
  value.startInlineReview(inlineId, "review-wrong");
  assert.equal(value.state.activeWordId, inlineId);
  const result = value.master();
  assert.equal(result.type, "mastered");
  assert.equal(value.state.inlineReviewContext, null);
  assert.equal(value.state.activeWordId, interruptedId);
  assert.ok(value.isMastered(inlineId));
  assert.ok(!value.state.dailyReviewIds.includes(inlineId));
  assert.ok(!value.state.reviewWrongIds.includes(inlineId));
  value.startReview();
  assert.equal(value.state.dailyReviewIds.length, 47);
  assert.ok(!value.state.dailyReviewIds.includes(inlineId));
});

test("48 项全部完全认识时复习为 0 并返回明确完成态", () => {
  const state = createInitialState(DATE);
  state.masteredIds = phonetics.map((item) => item.id);
  state.records = Object.fromEntries(phonetics.map((item) => [
    item.id, { status: "mastered", correctCount: 3 },
  ]));
  const value = engine(phonetics, state);
  const result = value.startReview();
  assert.equal(value.state.dailyReviewIds.length, 0);
  assert.equal(value.state.dailyPhase, PHASE.IDLE);
  assert.equal(value.state.dailyTaskStarted, false);
  assert.equal(value.state.dailyTaskDone, true);
  assert.equal(value.state.activeWordId, null);
  assert.match(result.message, /所有音标均已完全认识.*暂无需要复习/);
});

test("旧固定 20 缓存在加载时扩展为完整集合，保留完成项和当前项", () => {
  const state = createInitialState(DATE);
  Object.assign(state, {
    dailyPhase: PHASE.REVIEW,
    dailyTaskStarted: true,
    dailyTaskDone: false,
    dailyReviewIds: phonetics.slice(0, 20).map((item) => item.id),
    dailyReviewDoneIds: phonetics.slice(0, 2).map((item) => item.id),
    dailyReviewDate: DATE,
    activeWordId: phonetics[2].id,
  });
  const value = engine(phonetics, state);
  assert.equal(value.reviewPolicyMigrated, true);
  assert.equal(value.state.phoneticsReviewPolicyVersion, PHONETICS_REVIEW_POLICY_VERSION);
  assert.equal(value.state.dailyReviewIds.length, 48);
  assert.deepEqual(value.state.dailyReviewDoneIds, phonetics.slice(0, 2).map((item) => item.id));
  assert.equal(value.state.activeWordId, phonetics[2].id);
});

test("新策略进行中刷新恢复完整集合，不漏今日新项和当前项", () => {
  const state = createInitialState(DATE);
  state.dailyNewIds = phonetics.slice(0, 3).map((item) => item.id);
  state.dailyNewCorrectCounts = Object.fromEntries(state.dailyNewIds.map((id) => [id, 1]));
  const value = engine(phonetics, state);
  value.startReview();
  const current = value.state.activeWordId;
  const restored = engine(phonetics, structuredClone(value.state));
  assert.equal(restored.state.dailyReviewIds.length, 48);
  assert.ok(state.dailyNewIds.every((id) => restored.state.dailyReviewIds.includes(id)));
  assert.equal(restored.state.activeWordId, current);
  assert.equal(restored.reviewPolicyMigrated, false);
});

test("汉字复习仍固定最多 20 项，音标操作不写汉字存储", () => {
  const hanziWords = phonetics.map((item, index) => ({ ...item, id: `h-${index}` }));
  const hanziState = createInitialState(DATE);
  for (const item of hanziWords.slice(0, 25)) {
    hanziState.records[item.id] = { status: "known", correctCount: 3, nextReviewRound: 1 };
  }
  const hanzi = new HanziEngine(hanziState, hanziWords, { date: DATE, rng: () => 0 });
  hanzi.startReview();
  assert.equal(hanzi.state.dailyReviewIds.length, 20);
});

test("音标正确、错误、错项修复、临时列表复习和返回当前项与汉字一致", () => {
  const state = createInitialState(DATE);
  Object.assign(state, {
    dailyTaskStarted: true,
    dailyPhase: PHASE.NEW_LEARNING,
    dailyNewIds: phonetics.slice(0, 3).map((item) => item.id),
    dailyNewCorrectCounts: Object.fromEntries(phonetics.slice(0, 3).map((item) => [item.id, 0])),
    activeWordId: phonetics[0].id,
  });
  const value = engine(phonetics, state);
  const interrupted = value.state.activeWordId;
  value.startInlineReview(phonetics[1].id, "today-new");
  assert.equal(value.state.activeWordId, phonetics[1].id);
  value.correct();
  assert.equal(value.state.activeWordId, interrupted);
  assert.equal(value.state.inlineReviewContext, null);

  value.wrong();
  assert.equal(value.state.dailyNewCorrectCounts[interrupted], 0);
  assert.equal(value.state.records[interrupted].status, "wrong");
  assert.notEqual(value.state.activeWordId, interrupted);
});

test("音标刷新恢复、跨日边界和全量重置只作用于专属 key", () => {
  const state = createInitialState(DATE);
  Object.assign(state, {
    stars: 4,
    reviewRound: 2,
    dailyTaskStarted: true,
    dailyPhase: PHASE.NEW_LEARNING,
    dailyNewIds: phonetics.slice(0, 3).map((item) => item.id),
    dailyNewCorrectCounts: { [phonetics[0].id]: 1, [phonetics[1].id]: 0, [phonetics[2].id]: 0 },
    activeWordId: phonetics[0].id,
  });
  const restored = engine(phonetics, structuredClone(state));
  assert.equal(restored.state.activeWordId, phonetics[0].id);
  assert.deepEqual(restored.state.dailyNewIds, state.dailyNewIds);
  const tomorrow = normalizeState(restored.state, phonetics, "2026-08-22");
  assert.equal(tomorrow.dailyPhase, PHASE.IDLE);
  assert.deepEqual(tomorrow.dailyNewIds, []);
  assert.equal(tomorrow.stars, 4);
  assert.equal(tomorrow.reviewRound, 2);

  const protectedValues = {
    "mario-hanzi-refactor-v1": "hanzi",
    "mario-bomb-game-v1": "bomb",
    "mario-theme-learning-v1": "theme",
    "mario-literacy-desktop-mvp-v1": "legacy",
  };
  const values = new Map(Object.entries(protectedValues));
  const writes = [];
  const memory = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => { writes.push(key); values.set(key, value); },
  };
  const storage = new PhoneticsStorage(memory, phonetics, { key: PHONETICS_KEY, date: DATE });
  storage.load();
  const resetState = storage.reset();
  assert.deepEqual([...new Set(writes)], [PHONETICS_KEY]);
  for (const [key, value] of Object.entries(protectedValues)) assert.equal(values.get(key), value);
  const afterReset = engine(phonetics, resetState);
  afterReset.startReview();
  assert.equal(afterReset.state.dailyReviewIds.length, 48);
});
