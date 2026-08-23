import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = {};
await import("../data/characters.js");
await import("../data/pinyin-readings.js");

test("汉字字库恰好 1600 条且稳定 ID 唯一", () => {
  const words = window.MARIO_WORD_BANK;
  assert.equal(words.length, 1600);
  assert.equal(new Set(words.map((word) => word.id)).size, 1600);
  assert.equal(words[0].id, "0001");
  assert.equal(words.at(-1).id, "1600");
  assert.ok(words.every((word) => word.char && word.pinyin && word.parts));
});

test("多音字表与字库读音合并去重", () => {
  const word = window.MARIO_WORD_BANK.find((item) => item.char === "地");
  const readings = window.MARIO_PINYIN_READINGS.getReadings(word, window.MARIO_WORD_BANK);
  assert.ok(readings.includes("dì"));
  assert.ok(readings.includes("de"));
  assert.equal(readings.length, new Set(readings).size);
});
