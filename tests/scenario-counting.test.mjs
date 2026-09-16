import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { scenarioById, COUNTING_EXTRA_GROUPS } from "../data/scenarios.js";
import { THEME_CONFIGS } from "../theme-learning.js";
import { ScenarioStore } from "../scenario-learning.js";
import { dialogueWords } from "../src/scenario-vocabulary.js";
import { buildTotalWordLibrary } from "../src/total-word-library.js";

test("数数六组先认数字再问数量，24句逐词音标和新词完整", () => {
  const scene = scenarioById("counting-pens");
  assert.deepEqual(scene.lines.slice(0, 4).map(x => x.text), ["What number is it?", "It is eight.", "How many pens do you have?", "I have eight pens."]);
  assert.equal(scene.lines.length, 24);
  assert.ok(scene.lines.every((x, i) => x.speaker === (i % 2 ? "Leo" : "Mia")));
  assert.deepEqual(new Set(scene.vocabulary.map(x => x.word)), new Set(dialogueWords(scene.lines.map(x => x.text).join(" "))));
  assert.equal(scene.vocabulary.find(x => x.word === "pens").phonetic, "/penz/");
  assert.equal(scene.practice.length, 12);
  assert.ok(scene.lines.every(x => scene.focusObjects[x.focusObject]));
});

test("五组新增道具来自已发布主题，数量、图片和练习逐一对应", async () => {
  const scene = scenarioById("counting-pens");
  const manifest = JSON.parse(await readFile(new URL("../assets/scenarios/counting-objects-v1.json", import.meta.url)));
  assert.equal(COUNTING_EXTRA_GROUPS.length, 5);
  assert.equal(scene.vocabulary.length, 22);
  for (const [index, group] of COUNTING_EXTRA_GROUPS.entries()) {
    assert.ok(THEME_CONFIGS[group.sourceTheme].words.some(x => x.word === group.sourceWord));
    const source = manifest.find(x => x.id === group.id);
    assert.equal(source.count, group.count);
    assert.equal(source.word, group.sourceWord);
    assert.equal(source.theme, group.sourceTheme);
    const lines = scene.lines.slice(4 + index * 4, 8 + index * 4);
    assert.equal(lines[1].text, `It is ${group.number}.`);
    assert.equal(lines[3].text, `I have ${group.number} ${group.word}.`);
    assert.ok(lines.every(x => x.focusObject === group.id));
    const asset = await readFile(new URL(`../assets/scenarios/counting-${group.id}-v1.png`, import.meta.url));
    assert.equal(asset.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(asset.readUInt32BE(16), 1254);
    assert.equal(asset.readUInt32BE(20), 1254);
    assert.equal(scene.practice[2 + index * 2].promptId, lines[0].id);
    assert.equal(scene.practice[3 + index * 2].answerId, lines[3].id);
  }
});

test("数数进度独立持久化，完成练习不自动入库，明确学会才入总词库", () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key), setItem(key, value) { assert.equal(key, "mario-scenario-learning-v1"); data.set(key, value); } };
  const store = new ScenarioStore(storage);
  store.patch({ activeScenarioId: "what-is-it", lineIndex: 6 });
  store.patch({ activeScenarioId: "counting-pens", lineIndex: 2 });
  store.complete("counting-pens");
  const restored = new ScenarioStore(storage);
  assert.equal(restored.progress("counting-pens").lineIndex, 2);
  assert.equal(restored.progress("what-is-it").lineIndex, 6);
  assert.equal(restored.isComplete("counting-pens"), true);
  assert.deepEqual(buildTotalWordLibrary([], storage), []);
  restored.patch({ learnedWords: ["pens", "have"] });
  const library = buildTotalWordLibrary([], storage);
  assert.deepEqual(library.map(x => x.word).sort(), ["have", "pens"]);
  assert.match(library.find(x => x.word === "pens").art.src, /counting-pens-v1\.png/);
});

test("数数配图是已核验的正式PNG，舞台与封面使用同一张图", async () => {
  const asset = await readFile(new URL("../assets/scenarios/counting-pens-v1.png", import.meta.url));
  assert.equal(asset.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(asset.readUInt32BE(16), 1254);
  assert.equal(asset.readUInt32BE(20), 1254);
  const html = await readFile(new URL("../scenario-learning.html", import.meta.url), "utf8");
  assert.ok(html.includes(scenarioById("counting-pens").focusObjects["eight-pens"].image));
});
