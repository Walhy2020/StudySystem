import test from "node:test";
import assert from "node:assert/strict";
import { dialogueWords, knownScenarioWords, collectScenarioVocabulary, FIRST_MEETING_VOCABULARY } from "../src/scenario-vocabulary.js";
import { SCENARIOS, ScenarioStore } from "../scenario-learning.js";
import { BOOK1_ITEMS } from "../data/book1.js";

test("情景单词按词去重、拆开常用缩写，排除角色名但保留功能词", () => {
  assert.deepEqual(dialogueWords("Hi Mia, I’m fine. I'm fine!", ["Mia"]), ["hi", "i", "am", "fine"]);
  const words = collectScenarioVocabulary(SCENARIOS);
  assert.equal(words.length, 48);
  assert.ok(words.every((word) => word.sources.length && word.phonetic && word.chinese));
  assert.deepEqual(new Set(words.map((w) => w.word)), new Set(dialogueWords(SCENARIOS.flatMap((scenario) => scenario.lines).map((line) => line.text).join(" "), ["Mia", "Leo"])));
  for (const word of ["marker", "erasers"]) {
    assert.ok(words.find((item) => item.word === word).sources.every((source) => source.scenarioId === "what-is-it"));
  }
});

test("新单词严格跟随当前情景，不合并其他情景", () => {
  assert.equal(collectScenarioVocabulary([SCENARIOS[0]]).length, 16);
  assert.equal(collectScenarioVocabulary([SCENARIOS[1]]).length, 19);
  assert.equal(collectScenarioVocabulary([SCENARIOS[2]]).length, 22);
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
  assert.equal(collectScenarioVocabulary(SCENARIOS, known).filter((w) => !w.learned).length, 46);
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
  assert.equal(words.length, 48);
  assert.equal(words.find((w) => w.word === "hello").sources.length, 2);
  assert.ok(words.every((w) => !w.learned));
});
