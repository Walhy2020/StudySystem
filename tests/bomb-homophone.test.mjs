import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../bomb-game.js", import.meta.url), "utf8");
const extract = (name) => {
  const start = source.indexOf("  function " + name + "(");
  assert.ok(start >= 0, name);
  return source.slice(start, source.indexOf("\n  }", start) + 4);
};
const words = [
  { id: "pen", char: "笔", readings: ["bǐ"] },
  { id: "compare", char: "比", readings: ["bǐ"] },
  { id: "coin", char: "币", readings: ["bì"] },
  { id: "rice", char: "米", readings: ["mǐ"] },
  { id: "flower", char: "花", readings: ["huā"] },
  { id: "fire", char: "火", readings: ["huǒ"] },
  { id: "mountain", char: "山", readings: ["shān"] },
  { id: "walk", char: "行", readings: ["xíng", "háng"] },
  { id: "boat", char: "航", readings: ["háng"] },
];
const wordById = (id) => words.find((word) => word.id === id) || null;
const pinyinReadings = (word) => word?.readings || [];
const sharesPinyinReading = new Function("pinyinReadings", `
  ${extract("sharesPinyinReading")}
  return sharesPinyinReading;
`)(pinyinReadings);

test("同声调同读音和多音字交集都不能作为错误答案，不同声调可用", () => {
  assert.equal(sharesPinyinReading(wordById("pen"), wordById("compare")), true);
  assert.equal(sharesPinyinReading(wordById("pen"), wordById("coin")), false);
  assert.equal(sharesPinyinReading(wordById("walk"), wordById("boat")), true);
  const spawned = [];
  const spawnWordChoices = new Function("wordById", "bombDistractorWordsForTarget", "randomOpenRewardCells",
    "spawnPowerUp", "sharesPinyinReading", "Math", `
      ${extract("spawnWordChoices")}
      return spawnWordChoices;
    `)(wordById, () => [wordById("compare"), wordById("coin"), wordById("rice")],
    (count) => Array.from({ length: count }, (_, index) => ({ x: index + 1, y: 1 })),
    (...args) => spawned.push(args), sharesPinyinReading, Math);
  spawnWordChoices("pen");
  assert.equal(spawned.length, 3);
  assert.deepEqual(new Set(spawned.map(([, , , data]) => data.wordId)),
    new Set(["pen", "coin", "rice"]));
  assert.equal(spawned.filter(([, , , data]) => data.correct).length, 1);
});

test("汉字选拼音也排除与多音字任一读音相同的错误候选", () => {
  const pinyinChoiceWordsForTarget = new Function("wordById", "pinyinReadingsLabel",
    "bombDistractorWordsForTarget", "sharesPinyinReading", "Math", `
      ${extract("pinyinChoiceWordsForTarget")}
      return pinyinChoiceWordsForTarget;
    `)(wordById, (word) => pinyinReadings(word).join(" / "),
    () => [wordById("boat"), wordById("flower"), wordById("fire")], sharesPinyinReading, Math);
  assert.deepEqual(new Set(pinyinChoiceWordsForTarget("walk").map((word) => word.id)),
    new Set(["walk", "flower", "fire"]));
});

test("拼音关的五个目标读音不重复，重试队列的同音字留待以后", () => {
  const state = {
    subLevel: 1,
    bombRunWordIds: words.map((word) => word.id),
    bombWordCursor: 0,
    retryWordIds: ["pen", "compare"],
    todayNewWords: [],
  };
  const nextBombLevelWords = new Function("state", "wordById", "sharesPinyinReading", `
    const BOMB_MOONS_PER_LEVEL = 5;
    const LEARNING_MODES = { pinyin: "pinyin", hanzi: "hanzi" };
    const currentLearningMode = () => state.subLevel % 2 ? "pinyin" : "hanzi";
    const uniqueIds = (ids) => [...new Set(ids)];
    const uniqueWordIdsByCharacter = (ids) => ids.filter((id, index) =>
      ids.findIndex((previousId) => wordById(previousId)?.char === wordById(id)?.char) === index);
    ${extract("fillLevelTargetIds")}
    ${extract("nextBombLevelWords")}
    return nextBombLevelWords;
  `)(state, wordById, sharesPinyinReading);
  nextBombLevelWords();
  assert.equal(state.todayNewWords.length, 5);
  assert.equal(state.todayNewWords.some((word) => word.id === "pen"), true);
  assert.equal(state.todayNewWords.some((word) => word.id === "compare"), false);
  assert.ok(state.retryWordIds.includes("compare"));
  for (let index = 0; index < state.todayNewWords.length; index += 1) {
    for (let other = index + 1; other < state.todayNewWords.length; other += 1) {
      assert.equal(sharesPinyinReading(state.todayNewWords[index], state.todayNewWords[other]), false);
    }
  }
});
