import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ALPHABET_ITEMS as items } from "../data/alphabet.js";
import { PhoneticsEngine } from "../src/phonetics-engine.js";
import { AlphabetStorage, ALPHABET_STORAGE_KEY } from "../src/alphabet-storage.js";
import { PHASE } from "../src/constants.js";

const date = "2026-11-25";
function fixture(options = {}) {
  const data = new Map(["mario-hanzi-refactor-v1", "mario-phonetics-v1", "mario-pinyin-v1", "mario-book1-v1"].map(key => [key, `sentinel:${key}`]));
  const writes = [];
  const storage = new AlphabetStorage({ getItem: key => data.get(key) ?? null,
    setItem(key, value) { writes.push(key); data.set(key, value); } }, items, { date, ...options });
  const restore = () => new PhoneticsEngine(storage.load(), items, { date, rng: () => 0 });
  return { data, writes, storage, restore };
}

test("alphabet has exactly 26 stable A–Z records, each pairing upper and lower case", () => {
  assert.equal(items.length, 26);
  assert.equal(new Set(items.map(item => item.id)).size, 26);
  assert.equal(items.map(item => item.upper).join(""), "ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  for (const item of items) {
    assert.equal(item.lower, item.upper.toLowerCase());
    assert.equal(item.symbol, `${item.upper} ${item.lower}`);
    assert.equal(item.id, `alphabet-${item.lower}`);
    assert.equal(item.examples, undefined);
  }
});

test("alphabet uses IPA screening, three new items, one recognition each and manual finish", () => {
  const { storage, restore } = fixture();
  let engine = restore(); engine.startDaily();
  assert.equal(engine.currentWord().upper, "A");
  for (let n = 0; n < 3; n++) engine.wrong();
  assert.equal(engine.state.dailyPhase, PHASE.NEW_LEARNING);
  assert.equal(engine.state.dailyNewIds.length, 3);
  const pending = engine.currentWord().id;
  const inline = engine.state.dailyNewIds.find(id => id !== pending);
  engine.startInlineReview(inline, "today-new"); engine.master();
  assert.equal(engine.currentWord().id, pending);
  while (engine.currentWord()) engine.correct();
  assert.equal(engine.canFinishNewLearning(), true);
  assert.equal(engine.state.dailyTaskDone, false);
  engine.finishNewLearning(); storage.save(engine.state); engine = restore();
  assert.equal(engine.state.dailyTaskDone, true);
  assert.equal(engine.currentWord(), null);
  assert.equal(engine.state.dailyPhase, PHASE.NEW_LEARNING);
});

test("alphabet review keeps all 26 across reload, stars exclude immediately, wrong letters require three repairs", () => {
  const { storage, restore } = fixture(); let engine = restore();
  engine.startReview(); assert.equal(engine.state.dailyReviewIds.length, 26);
  const mastered = engine.currentWord().id; engine.master();
  const wrong = engine.currentWord().id; engine.wrong();
  const active = engine.currentWord().id;
  storage.save(engine.state); engine = restore();
  assert.equal(engine.currentWord().id, active);
  assert.equal(engine.state.dailyReviewIds.length, 25);
  assert.equal(engine.state.dailyReviewIds.includes(mastered), false);
  for (let n = 0; n < 3; n++) {
    engine.startInlineReview(wrong, "review-wrong"); engine.correct();
    assert.equal(engine.reviewWrongCount(wrong), n + 1);
    assert.equal(engine.currentWord().id, active);
  }
  engine.startReview();
  while (engine.currentWord()) engine.master();
  engine.startReview(); assert.equal(engine.state.dailyReviewIds.length, 0);
  assert.equal(engine.state.dailyTaskDone, true);
});

test("alphabet save/reset never imports or writes other module keys, even with an override", () => {
  const { storage, restore, writes, data } = fixture({ key: "mario-phonetics-v1" });
  const engine = restore(); engine.startReview(); engine.master(); storage.save(engine.state); storage.reset();
  assert.deepEqual([...new Set(writes)], [ALPHABET_STORAGE_KEY]);
  for (const [key, value] of data) if (key !== ALPHABET_STORAGE_KEY) assert.equal(value, `sentinel:${key}`);
  assert.equal(fixture({ namespace: "letter-test" }).storage.key, `${ALPHABET_STORAGE_KEY}:test:letter-test`);
});

test("all learning and selection pages link to alphabet immediately before IPA", () => {
  for (const page of ["index", "pinyin", "word-learning", "book-learning", "theme-learning", "scenario-learning", "review-learning", "alphabet", "phonetics", "games"]) {
    const html = readFileSync(new URL(`../${page}.html`, import.meta.url), "utf8");
    const nav = html.match(/<nav[\s\S]*?<\/nav>/)[0];
    assert.ok(nav.indexOf(">字母<") < nav.indexOf(">音标<"), page);
    assert.equal((nav.match(/>字母</g) || []).length, 1, page);
  }
});
