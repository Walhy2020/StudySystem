import test from "node:test";
import assert from "node:assert/strict";
import { HanziEngine } from "../src/engine.js";
import { PHASE, REVIEW_INTERVAL_ROUNDS } from "../src/constants.js";
import { createInitialState, normalizeState } from "../src/state.js";

const DATE = "2026-08-18";
const words = Array.from({ length: 40 }, (_, index) => ({
  id: String(index + 1).padStart(4, "0"),
  char: String.fromCodePoint(0x4e00 + index),
  pinyin: "yī",
  parts: { initial: "y", medial: "", final: "i" },
  kingdom: 1,
  bigSun: 1,
  bigMoon: 1,
}));

function engineFrom(state = createInitialState(DATE), rng = () => 0) {
  return new HanziEngine(state, words, { date: DATE, rng });
}

test("今日新字：筛选 3 字、每字 3 次、显式结束后混合复习", () => {
  const engine = engineFrom();
  engine.startDaily({ resetCursor: true });
  engine.wrong();
  engine.wrong();
  engine.wrong();
  assert.equal(engine.state.dailyPhase, PHASE.NEW_LEARNING);
  assert.deepEqual(engine.state.dailyNewIds, ["0001", "0002", "0003"]);
  for (let index = 0; index < 9; index += 1) engine.correct();
  assert.deepEqual(Object.values(engine.state.dailyNewCorrectCounts), [3, 3, 3]);
  assert.equal(engine.state.dailyPhase, PHASE.NEW_LEARNING);
  assert.equal(engine.finishNewLearning().type, "mixed-started");
  for (let index = 0; index < 3; index += 1) engine.correct();
  assert.equal(engine.state.dailyTaskDone, true);
  assert.equal(engine.state.activeWordId, null);
});

test("今日新字学习答错会把该字当天计数清零、扣 HP 并换字", () => {
  const engine = engineFrom();
  engine.startDaily();
  engine.wrong(); engine.wrong(); engine.wrong();
  const first = engine.state.activeWordId;
  engine.correct();
  const countedId = first;
  while (engine.state.activeWordId !== countedId) engine.correct();
  const hp = engine.state.hp;
  engine.wrong();
  assert.equal(engine.state.dailyNewCorrectCounts[countedId], 0);
  assert.equal(engine.state.hp, hp - 1);
  assert.notEqual(engine.state.activeWordId, countedId);
});

test("普通复习每天固定最多 20 个，同日续批不增加 reviewRound", () => {
  const state = createInitialState(DATE);
  for (let index = 0; index < 25; index += 1) {
    state.records[words[index].id] = { status: "known", correctCount: 3, nextReviewRound: 1, reviewStage: 1 };
  }
  const engine = engineFrom(state);
  engine.startReview();
  const firstBatch = [...engine.state.dailyReviewIds];
  assert.equal(firstBatch.length, 20);
  assert.equal(engine.state.reviewRound, 1);
  engine.correct();
  engine.startReview();
  assert.deepEqual(engine.state.dailyReviewIds, firstBatch);
  assert.equal(engine.state.reviewRound, 1);
});

test("错字权重为 3，且累计正确 3 次才修复", () => {
  const state = createInitialState(DATE);
  Object.assign(state, {
    dailyTaskStarted: true,
    dailyPhase: PHASE.REVIEW,
    dailyReviewIds: ["0001", "0002"],
    dailyReviewDate: DATE,
    reviewWrongIds: ["0001"],
    reviewWrongCorrectCounts: { "0001": 0 },
    activeWordId: null,
  });
  state.records["0001"] = { status: "wrong", correctCount: 3, errorCount: 1, nextReviewRound: 1 };
  state.records["0002"] = { status: "known", correctCount: 3, nextReviewRound: 1 };
  const weighted = engineFrom(state, () => 0.6);
  assert.equal(weighted.state.activeWordId, "0001");

  weighted.state.dailyReviewIds = ["0001"];
  weighted.state.activeWordId = "0001";
  weighted.correct();
  assert.equal(weighted.state.reviewWrongCorrectCounts["0001"], 1);
  weighted.correct();
  assert.equal(weighted.state.reviewWrongCorrectCounts["0001"], 2);
  weighted.correct();
  assert.equal(weighted.state.reviewWrongCorrectCounts["0001"], 3);
  assert.equal(weighted.state.dailyTaskDone, true);
});

test("★ 只奖励一颗星、设为完全认识并移出普通复习队列", () => {
  const state = createInitialState(DATE);
  Object.assign(state, {
    dailyTaskStarted: true,
    dailyPhase: PHASE.REVIEW,
    dailyReviewIds: ["0001", "0002"],
    dailyReviewDate: DATE,
    activeWordId: "0001",
  });
  state.records["0001"] = { status: "known", correctCount: 3, nextReviewRound: 1 };
  state.records["0002"] = { status: "known", correctCount: 3, nextReviewRound: 1 };
  const engine = engineFrom(state);
  const rewards = engine.state.rewardCount;
  engine.master();
  assert.equal(engine.state.stars, 1);
  assert.equal(engine.state.rewardCount, rewards);
  assert.ok(engine.state.masteredIds.includes("0001"));
  assert.ok(!engine.state.dailyReviewIds.includes("0001"));
});

test("最后一轮普通复习自动完全认识", () => {
  const state = createInitialState(DATE);
  Object.assign(state, {
    dailyTaskStarted: true, dailyPhase: PHASE.REVIEW,
    dailyReviewIds: ["0001"], dailyReviewDate: DATE, activeWordId: "0001",
  });
  state.records["0001"] = {
    status: "known", correctCount: 8, streak: 3, reviewStage: REVIEW_INTERVAL_ROUNDS.length - 1,
    reviewIntervalRounds: REVIEW_INTERVAL_ROUNDS.at(-1), nextReviewRound: 1,
  };
  const engine = engineFrom(state);
  engine.correct();
  assert.ok(engine.state.masteredIds.includes("0001"));
});

test("HP 为 0 后连续正确 3 次恢复 1 HP；错误会中断", () => {
  const engine = engineFrom();
  engine.startDaily();
  engine.wrong(); engine.wrong(); engine.wrong();
  engine.state.hp = 0;
  engine.correct(); engine.correct();
  assert.equal(engine.state.hp, 0);
  engine.correct();
  assert.equal(engine.state.hp, 1);
});

test("跨日只清理日状态并恢复 HP，长期记录、轮次、星星保留", () => {
  const state = createInitialState("2026-08-17");
  Object.assign(state, {
    hp: 0, stars: 7, reviewRound: 4, dailyTaskStarted: true,
    dailyPhase: PHASE.NEW_LEARNING, dailyNewIds: ["0001"], activeWordId: "0001",
  });
  state.records["0001"] = { status: "known", correctCount: 3, errorCount: 1 };
  const normalized = normalizeState(state, words, DATE);
  assert.equal(normalized.hp, 3);
  assert.equal(normalized.stars, 7);
  assert.equal(normalized.reviewRound, 4);
  assert.ok(normalized.records["0001"]);
  assert.deepEqual(normalized.dailyNewIds, []);
});

test("刷新后恢复阶段、当天批次和仍有效的当前字", () => {
  const state = createInitialState(DATE);
  Object.assign(state, {
    dailyTaskStarted: true,
    dailyPhase: PHASE.NEW_LEARNING,
    dailyNewIds: ["0001", "0002", "0003"],
    dailyNewCorrectCounts: { "0001": 1, "0002": 0, "0003": 0 },
    activeWordId: "0002",
  });
  const restored = engineFrom(JSON.parse(JSON.stringify(state)));
  assert.equal(restored.state.dailyPhase, PHASE.NEW_LEARNING);
  assert.deepEqual(restored.state.dailyNewIds, ["0001", "0002", "0003"]);
  assert.equal(restored.state.activeWordId, "0002");
});

test("列表临时复习完成后恢复原阶段和原当前字", () => {
  const state = createInitialState(DATE);
  Object.assign(state, {
    dailyTaskStarted: true,
    dailyPhase: PHASE.NEW_LEARNING,
    dailyNewIds: ["0001", "0002", "0003"],
    dailyNewCorrectCounts: { "0001": 1, "0002": 0, "0003": 0 },
    activeWordId: "0002",
  });
  const engine = engineFrom(state);
  engine.startInlineReview("0001", "today-new");
  assert.equal(engine.state.activeWordId, "0001");
  engine.correct();
  assert.equal(engine.state.dailyPhase, PHASE.NEW_LEARNING);
  assert.equal(engine.state.activeWordId, "0002");
  assert.equal(engine.state.inlineReviewContext, null);
});
