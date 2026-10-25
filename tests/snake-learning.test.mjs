import test from "node:test";
import assert from "node:assert/strict";
import { SnakeLearning, learningSource, HANZI_KEY, LEGACY_KEY } from "../src/snake-learning.js";
globalThis.window = {};
await import("../data/characters.js");
await import("../data/pinyin-readings.js");
const words = window.MARIO_WORD_BANK;
const readings = word => window.MARIO_PINYIN_READINGS.getReadings(word, words);
const storage = data => ({ getItem: key => JSON.stringify(data[key] || null), setItem: () => assert.fail("learning model must never write progress") });
const make = (data = {}, saved = {}) => new SnakeLearning(words, storage(data), readings, () => .5, saved);

test("Snake mirrors bomb evidence precedence, mastery exclusion, today/round priority and 100 unique characters", () => {
  const ids = words.slice(0, 8).map(w => w.id);
  const primary = { records: Object.fromEntries(ids.map(id => [id, { status: "known" }])), dailyNewIds: [ids[4]], masteredIds: [ids[0]] };
  const model = make({ [HANZI_KEY]: primary }, { counts: { [ids[1]]: 3 } });
  assert.equal(model.source, "hanzi"); assert.equal(model.runIds.length, 100);
  assert.equal(model.runIds[0], ids[4]); assert.equal(model.runIds[6], ids[1]);
  assert.ok(!model.runIds.includes(ids[0]));
  assert.equal(new Set(model.runIds.map(id => model.byId.get(id).char)).size, 100);
  assert.equal(learningSource(storage({ [HANZI_KEY]: { records: {} }, [LEGACY_KEY]: primary }), words).source, "legacy");
  assert.equal(learningSource(storage({ [HANZI_KEY]: primary, [LEGACY_KEY]: { masteredIds: [ids[4]] } }), words).source, "hanzi");
  assert.equal(make({ [HANZI_KEY]: { dailyNewIds: ids } }).source, "none", "dailyNewIds alone is not evidence");
});

test("five distinct targets, bidirectional sublevel parity, unambiguous polyphones, actual-show counts and paused reload", () => {
  let model = make();
  for (let batch = 1; batch <= 21; batch++) {
    assert.equal(model.batch, batch);
    assert.equal(model.type, ((batch - 1) % 5 + 1) % 2 ? "pinyin-to-hanzi" : "hanzi-to-pinyin");
    assert.equal(model.targets.length, 5); assert.equal(new Set(model.targets).size, 5);
    const targetIds = model.targets.slice();
    if (model.isPinyin) targetIds.forEach((a, i) => targetIds.slice(i + 1).forEach(b => assert.equal(model.shares(a, b), false)));
    const before = model.counts[model.active];
    const restored = make({}, model.snapshot());
    assert.deepEqual(restored.counts, model.counts); assert.equal(before, restored.counts[restored.active]);
    assert.deepEqual(restored.options, model.options, "refresh retains the same question options");
    for (let n = 0; n < 5; n++) {
      assert.ok(model.prompt && !model.prompt.includes("?"));
      assert.equal(model.options.filter(o => o.correct).length, 1);
      model.options.filter(o => !o.correct).forEach(o => assert.equal(model.shares(o.wordId, model.active), false));
      const round = model.counts[model.active];
      assert.ok(round > 0);
      const bad = model.options.find(o => !o.correct);
      const target = model.active;
      if (bad) {
        assert.equal(model.answer(bad.wordId).correct, false); assert.equal(model.active, target);
        assert.ok(model.retry.includes(target)); assert.equal(model.counts[target], round);
      }
      assert.equal(model.answer(target).correct, true); assert.ok(!model.retry.includes(target));
    }
    assert.equal(model.complete, true); assert.equal(model.answer(targetIds[0]), null);
    model = make({}, model.snapshot()); assert.equal(model.complete, true);
    if (batch < 21) model.nextBatch();
  }
});

test("empty and small non-mastered pools never invent or duplicate words, corrupt saves repair safely", () => {
  const allMastered = { masteredIds: words.map(w => w.id) };
  const empty = make({ [HANZI_KEY]: allMastered });
  assert.deepEqual(empty.targets, []); assert.equal(empty.current, null); assert.equal(empty.prompt, "暂无可学字");
  const tiny = new SnakeLearning(words.slice(0, 2), storage({}), readings, () => .5);
  assert.equal(new Set(tiny.targets).size, tiny.targets.length); assert.ok(tiny.targets.length <= 2);
  const repaired = make({}, { batch: -1, cursor: NaN, targets: ["missing"], counts: { missing: 10 }, runIds: ["missing"] });
  assert.equal(repaired.batch, 1); assert.equal(repaired.targets.length, 5);
  assert.ok(!repaired.runIds.includes("missing"));
  assert.equal(make({}, null).targets.length, 5);
});
