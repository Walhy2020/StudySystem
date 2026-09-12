import test from "node:test";
import assert from "node:assert/strict";
import { BOOK1_ITEMS } from "../data/book1.js";
import { THEME_CONFIGS } from "../theme-learning.js";
import { buildThemeCatalog } from "../src/theme-overview.js";
import {
  buildTotalWordCatalog,
  buildTotalWordLibrary,
  totalLearnedWordSet,
} from "../src/total-word-library.js";

class MemoryStorage {
  constructor(values = {}) { this.values = new Map(Object.entries(values)); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem() { assert.fail("统一词库只能读取各模块进度，不能写入"); }
}

const themeCatalog = buildThemeCatalog(THEME_CONFIGS);

test("总单词目录合并 Book1、主题和情景并按英文去重", () => {
  const catalog = buildTotalWordCatalog(themeCatalog);
  assert.equal(catalog.length, 208);
  assert.equal(new Set(catalog.map(({ word }) => word)).size, 208);
  assert.equal(catalog.some(({ word }) => word === "apple"), true);
  assert.equal(catalog.some(({ word }) => word === "head"), true);
  assert.equal(catalog.some(({ word }) => word === "look"), true);
});

test("总单词库只汇总三个模块实际学过的词并保留来源", () => {
  const head = themeCatalog.find(({ word }) => word === "head");
  const red = themeCatalog.find(({ themeId, word }) => themeId === "colors" && word === "red");
  const apple = BOOK1_ITEMS.find(({ type, word }) => type === "word" && word === "apple");
  const pen = BOOK1_ITEMS.find(({ type, word }) => type === "word" && word === "pen");
  const storage = new MemoryStorage({
    "mario-theme-learned-v1": JSON.stringify({ version: 2, learned: [head.key, red.key] }),
    "mario-book1-v1": JSON.stringify({ learnedIds: [apple.id], masteredIds: [pen.id] }),
    "mario-scenario-learning-v1": JSON.stringify({ learnedWords: ["look", "pen", "red"] }),
  });
  const words = buildTotalWordLibrary(themeCatalog, storage);
  assert.deepEqual(words.map(({ word }) => word).sort(), ["apple", "head", "look", "pen", "red"]);
  assert.match(words.find(({ word }) => word === "pen").sourceLabel, /Book1.*情景模式/);
  assert.match(words.find(({ word }) => word === "red").sourceLabel, /主题学习.*情景模式/);
  assert.equal(words.find(({ word }) => word === "look").art.type, "meaning");
  assert.equal(words.find(({ word }) => word === "apple").art.type, "image-url");
  assert.deepEqual([...totalLearnedWordSet(storage, themeCatalog)].sort(), ["apple", "head", "look", "pen", "red"]);
});

test("统一词库读取测试命名空间且不误读正式进度", () => {
  const apple = BOOK1_ITEMS.find(({ type, word }) => type === "word" && word === "apple");
  const storage = new MemoryStorage({
    "mario-book1-v1": JSON.stringify({ learnedIds: [apple.id] }),
    "mario-scenario-learning-v1:test:case": JSON.stringify({ learnedWords: ["look"] }),
  });
  assert.deepEqual([...totalLearnedWordSet(storage, themeCatalog, { suffix: ":test:case" })], ["look"]);
});
