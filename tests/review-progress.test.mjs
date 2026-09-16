import test from "node:test";
import assert from "node:assert/strict";
import { ReviewProgress, REVIEW_PROGRESS_KEY } from "../src/review-progress.js";
import { TotalReviewSession } from "../src/theme-overview.js";

const words = ["a", "b", "c", "d"].map(word => ({ word, key: "total:" + word }));
function storage(raw = null) {
  let value = raw;
  return { writes: [], getItem: () => value, setItem(key, next) {
    assert.equal(key, REVIEW_PROGRESS_KEY);
    this.writes.push(next); value = next;
  }};
}
function start(progress, items = words, restart = false) {
  const session = new TotalReviewSession(items, () => 0.5);
  progress.restore(session, restart);
  return session;
}
test("刷新保留题序、位置、选项和标记，完成态不会自动重开", () => {
  const db = storage();
  let progress = new ReviewProgress(db);
  const session = start(progress);
  const first = session.target().key;
  progress.mark(first, "forgotten");
  session.answer(first);
  progress.save(session);
  progress = new ReviewProgress(db);
  const restored = start(progress);
  assert.deepEqual(restored.questions, session.questions);
  assert.equal(restored.questionIndex, 1);
  assert.deepEqual(restored.optionKeys, session.optionKeys);
  assert.equal(progress.status(first), "forgotten");
  while (!restored.complete) restored.answer(restored.target().key);
  progress.save(restored);
  assert.equal(start(new ReviewProgress(db)).complete, true);
  assert.equal(start(new ReviewProgress(db), words, true).questionIndex, 0);
});
test("下一轮先×再未标记再✓，本轮不重排，✓能覆盖旧×", () => {
  const progress = new ReviewProgress(storage());
  const session = start(progress);
  progress.mark("total:d", "forgotten");
  progress.mark("total:a", "remembered");
  progress.save(session);
  assert.deepEqual(start(progress).questions, session.questions);
  const next = start(progress, words, true);
  assert.equal(next.questions[0], "total:d");
  assert.equal(next.questions.at(-1), "total:a");
  assert.equal(new Set(next.questions).size, 4);
  progress.mark("total:d", "remembered");
  progress.save(next);
  assert.equal(new ReviewProgress(progress.storage).status("total:d"), "remembered");
});
test("词库增减保留有效已做题和当前题，新词追加且不重复", () => {
  const progress = new ReviewProgress(storage());
  const session = start(progress);
  session.answer(session.target().key);
  progress.save(session);
  const removed = session.questions.at(-1);
  const items = words.filter(word => word.key !== removed).concat({ word: "new", key: "total:new" });
  const restored = start(progress, items);
  assert.equal(restored.questionIndex, 1);
  assert.equal(restored.target().key, session.target().key);
  assert.equal(restored.questions.includes(removed), false);
  assert.equal(restored.questions.at(-1), "total:new");
  assert.equal(new Set(restored.questions).size, restored.questions.length);
});
test("损坏和不可用存储可降级，加载不写其他模块", () => {
  for (const raw of ["not json", '{"version":99}', '{"version":1,"round":{"questions":[],"questionIndex":-1}}']) {
    const db = storage(raw);
    const progress = new ReviewProgress(db);
    assert.equal(db.writes.length, 0);
    assert.equal(start(progress).questions.length, 4);
  }
  const blocked = new ReviewProgress({ getItem() { throw Error("blocked"); }, setItem() { throw Error("quota"); } });
  const session = start(blocked);
  assert.equal(blocked.available, false);
  blocked.mark(session.target().key, "forgotten");
  session.answer(session.target().key);
  assert.equal(blocked.save(session), false);
  assert.equal(session.questionIndex, 1);
});
