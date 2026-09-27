import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { FRUIT_TASTING_GROUPS, FRUIT_TASTING_LINES, FRUIT_TASTING_PRACTICE, FRUIT_TASTING_VOCABULARY, scenarioById } from "../data/scenarios.js";
import { dialogueWords } from "../src/scenario-vocabulary.js";
import { ScenarioStore } from "../scenario-learning.js";
import { buildTotalWordCatalog, buildTotalWordLibrary } from "../src/total-word-library.js";

const scene = scenarioById("fruit-tasting");

test("水果情景用六种水果练习名称、颜色、酸甜与脆", () => {
  assert.equal(scene.number, 4);
  assert.equal(FRUIT_TASTING_GROUPS.length, 6);
  assert.equal(FRUIT_TASTING_LINES.length, 36);
  assert.equal(FRUIT_TASTING_PRACTICE.length, 18);
  assert.deepEqual(FRUIT_TASTING_GROUPS.map(({ id, color, taste }) => [id, color, taste]), [
    ["apple", "red", "sweet and crisp"], ["lemon", "yellow", "sour"], ["pear", "green", "sweet"],
    ["orange", "orange", "sweet"], ["banana", "yellow", "sweet"], ["strawberry", "red", "sweet"],
  ]);
  for (const [index, fruit] of FRUIT_TASTING_GROUPS.entries()) {
    const lines = scene.lines.slice(index * 6, index * 6 + 6);
    assert.deepEqual(lines.map(({ text }) => text), [
      "What fruit is this?", `It's ${fruit.article} ${fruit.id}.`, "What color is it?",
      `It's ${fruit.color}.`, "How does it taste?", `It tastes ${fruit.taste}.`,
    ]);
    assert.ok(lines.every((item, i) => item.speaker === (i % 2 ? "Leo" : "Mia") && item.focusObject === fruit.id));
    for (const item of lines) {
      assert.equal(item.tokens.map(({ text }) => text).join(" "), item.text);
      assert.equal(item.tokens.map(({ phonetic }) => phonetic.slice(1, -1)).join(" "), item.phonetic.slice(1, -1));
      assert.ok(item.chinese);
    }
    const questions = scene.practice.slice(index * 3, index * 3 + 3);
    for (const [questionIndex, question] of questions.entries()) {
      assert.equal(question.promptId, lines[questionIndex * 2].id);
      assert.equal(question.answerId, lines[questionIndex * 2 + 1].id);
      assert.equal(new Set(question.optionIds).size, 3);
      assert.ok(question.optionIds.includes(question.answerId));
      assert.equal(new Set(question.optionIds.map(id => scene.lines.find(line => line.id === id).text)).size, 3);
    }
  }
  assert.deepEqual(new Set(FRUIT_TASTING_VOCABULARY.map(({ word }) => word)), new Set(dialogueWords(scene.lines.map(({ text }) => text).join(" "))));
});

test("七张在用水果配图与情景页面逐一对应", async () => {
  const html = await readFile(new URL("../scenario-learning.html", import.meta.url), "utf8");
  const css = await readFile(new URL("../scenario-learning.css", import.meta.url), "utf8");
  assert.match(html, /data-scenario-id="fruit-tasting"/);
  assert.match(html, /fruit-table-v2\.png\?v=1\.0/);
  assert.match(css, /fruit-table-v2\.png\?v=1\.0/);
  for (const name of ["fruit-table-v2", "fruit-red-apple-v1", "fruit-yellow-lemon-v1", "fruit-green-pear-v1", "fruit-orange-v1", "fruit-banana-v1", "fruit-strawberry-v1"]) {
    const png = await readFile(new URL(`../assets/scenarios/${name}.png`, import.meta.url));
    assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", name);
    assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1254, 1254], name);
    assert.ok(png.length > 100_000, name);
  }
  assert.match(scene.focusObjects.apple.image, /fruit-red-apple-v1\.png/);
  assert.match(scene.focusObjects.lemon.image, /fruit-yellow-lemon-v1\.png/);
  assert.match(scene.focusObjects.pear.image, /fruit-green-pear-v1\.png/);
  assert.match(scene.focusObjects.orange.image, /fruit-orange-v1\.png/);
  assert.match(scene.focusObjects.banana.image, /fruit-banana-v1\.png/);
  assert.match(scene.focusObjects.strawberry.image, /fruit-strawberry-v1\.png/);
});

test("水果词只在明确学会后进入独立总词库，新水果使用对应配图", () => {
  const values = new Map();
  const writes = [];
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem(key, value) { writes.push(key); values.set(key, value); },
  };
  const store = new ScenarioStore(storage);
  store.patch({ activeScenarioId: "fruit-tasting", lineIndex: 9 });
  store.complete("fruit-tasting");
  assert.equal(store.isComplete("fruit-tasting"), true);
  assert.deepEqual(buildTotalWordLibrary([], storage, { bookItems: [], scenarios: [scene] }), []);
  store.patch({ learnedWords: ["pear", "sour", "crisp", "strawberry"] });
  const learned = buildTotalWordLibrary([], storage, { bookItems: [], scenarios: [scene] });
  assert.deepEqual(learned.map(({ word }) => word), ["sour", "pear", "crisp", "strawberry"]);
  assert.equal(learned.find(({ word }) => word === "pear").art.src, scene.focusObjects.pear.image);
  assert.equal(learned.find(({ word }) => word === "strawberry").art.src, scene.focusObjects.strawberry.image);
  assert.equal(buildTotalWordCatalog([], { bookItems: [], scenarios: [scene] }).length, FRUIT_TASTING_VOCABULARY.length);
  assert.ok(writes.every(key => key === "mario-scenario-learning-v1"));
});
