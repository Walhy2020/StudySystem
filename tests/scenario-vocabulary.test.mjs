import test from "node:test";
import assert from "node:assert/strict";
import { dialogueWords, knownScenarioWords, collectScenarioVocabulary, collectNewScenarioVocabulary, FIRST_MEETING_VOCABULARY } from "../src/scenario-vocabulary.js";
import { SCENARIOS, ScenarioStore } from "../scenario-learning.js";
import { BOOK1_ITEMS } from "../data/book1.js";

test("情景单词按词去重、拆开常用缩写，排除角色名但保留功能词", () => {
  assert.deepEqual(dialogueWords("Hi Mia, I’m fine. I'm fine!", ["Mia"]), ["hi", "i", "am", "fine"]);
  const words = collectScenarioVocabulary(SCENARIOS);
  assert.equal(words.length, 111);
  assert.ok(words.every((word) => word.sources.length && word.phonetic && word.chinese));
  assert.deepEqual(new Set(words.map((w) => w.word)), new Set(dialogueWords(SCENARIOS.flatMap((scenario) => scenario.lines).map((line) => line.text).join(" "), ["Mia", "Leo", "Beijing", "Lujiang"])));
  for (const word of ["marker", "erasers"]) {
    assert.ok(words.find((item) => item.word === word).sources.every((source) => source.scenarioId === "what-is-it"));
  }
});

test("原始情景定义保留完整对话词汇，展示去重不删除词库定义", () => {
  assert.equal(collectScenarioVocabulary([SCENARIOS[0]]).length, 16);
  assert.equal(collectScenarioVocabulary([SCENARIOS[1]]).length, 19);
  assert.equal(collectScenarioVocabulary([SCENARIOS[2]]).length, 22);
  assert.equal(collectScenarioVocabulary([SCENARIOS[3]]).length, 25);
  assert.equal(collectScenarioVocabulary([SCENARIOS[4]]).length, 17);
  assert.equal(collectScenarioVocabulary([SCENARIOS[5]]).length, 12);
  assert.equal(collectScenarioVocabulary([SCENARIOS[0]]).some(({ word }) => word === "marker"), false);
  assert.equal(collectScenarioVocabulary([SCENARIOS[1]]).some(({ word }) => word === "hello"), false);
});

test("已学判断只读统一总词库并隔离测试命名空间", () => {
  const apple = BOOK1_ITEMS.find((i) => i.type === "word" && i.word === "apple");
  const data = { "mario-theme-learned-v1:test:a": { learned: ["colors:red"] }, "mario-book1-v1:test:a": { learnedIds: [apple.id] } };
  const reads = [];
  const storage = { getItem(key) { reads.push(key); return JSON.stringify(data[key]); }, setItem() { assert.fail("must not write foreign keys"); } };
  const known = knownScenarioWords(storage, ["Hello"], ":test:a");
  assert.deepEqual([...known].sort(), ["apple", "hello", "red"]);
  assert.ok(reads.every((key) => key.endsWith(":test:a")));
  assert.equal(collectScenarioVocabulary(SCENARIOS, known).filter((w) => !w.learned).length, 108);
  assert.doesNotThrow(() => knownScenarioWords({ getItem: () => '{"learned":null,"masteredIds":{}}' }));
});

test("旧情景状态升级保留完成及位置；学会后刷新不重新加入", () => {
  let value = JSON.stringify({ completedScenarioIds: ["first-meeting"], activeScenarioId: "first-meeting", lineIndex: 3 });
  const storage = { getItem: () => value, setItem(key, next) { assert.equal(key, "mario-scenario-learning-v1"); value = next; } };
  const store = new ScenarioStore(storage);
  store.patch({ learnedWords: ["hello", "hello"] });
  const restored = new ScenarioStore(storage);
  assert.equal(restored.state.lineIndex, 3);
  assert.equal(restored.isComplete("first-meeting"), true);
  assert.deepEqual(restored.state.learnedWords, ["hello"]);
});

test("重复情景不重复收词且保留来源；不能凭完成对话当作学会单词", () => {
  const extra = { id: "example", title: "又见面", lines: [{ text: "Hello!" }], vocabulary: [FIRST_MEETING_VOCABULARY[0]] };
  const words = collectScenarioVocabulary([...SCENARIOS, extra]);
  assert.equal(words.length, 111);
  assert.equal(words.find((w) => w.word === "hello").sources.length, 4);
  assert.ok(words.every((w) => !w.learned));
});

test("新单词只归属添加顺序中首次出现的情景，不要求前面已学完", () => {
  const owners = new Map();
  for (const scene of SCENARIOS) for (const item of scene.vocabulary) {
    const word = item.word.trim().toLowerCase();
    if (!owners.has(word)) owners.set(word, scene.id);
  }
  const all = [];
  for (const scene of SCENARIOS) {
    const words = collectNewScenarioVocabulary(SCENARIOS, scene.id);
    assert.deepEqual(new Set(words.map(item => item.word)), new Set([...owners].filter(([, id]) => id === scene.id).map(([word]) => word)));
    assert.ok(words.every(item => !item.learned && item.sources.every(source => source.scenarioId === scene.id)));
    all.push(...words);
  }
  assert.equal(all.length, owners.size);
  assert.equal(new Set(all.map(item => item.word)).size, all.length);
  assert.equal(collectNewScenarioVocabulary(SCENARIOS, "what-is-it").some(item => ["is", "are"].includes(item.word)), false);
});

test("添加顺序去重规范拼写，保留已学状态，新增情景只增新词且不改原词库", () => {
  const scene = (id, words) => ({ id, lines: [{ text: words.join(" ") }], vocabulary: words.map(word => ({ word, phonetic: "/test/", chinese: "测试" })) });
  const scenes = [scene("first", [" Hello ", "I'm"]), scene("second", ["HELLO", "I’m", "apple", "APPLE"]), scene("third", ["apple"])];
  const before = JSON.stringify(scenes), known = new Set(["apple"]);
  assert.deepEqual(collectNewScenarioVocabulary(scenes, "second", known).map(item => [item.word, item.learned]), [["apple", true]]);
  assert.deepEqual(collectNewScenarioVocabulary(scenes, "third"), []);
  assert.deepEqual(collectNewScenarioVocabulary(scenes, "missing"), []);
  assert.deepEqual(collectNewScenarioVocabulary([...scenes, scene("new", ["hello", "novelword"])], "new").map(item => item.word), ["novelword"]);
  assert.equal(JSON.stringify(scenes), before);
  assert.deepEqual([...known], ["apple"]);
});
