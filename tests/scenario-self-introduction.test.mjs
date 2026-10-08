import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { scenarioById, SELF_INTRODUCTION_LINES } from "../data/scenarios.js";
import { THEME_CONFIGS } from "../theme-learning.js";
import { collectScenarioVocabulary, knownScenarioWords } from "../src/scenario-vocabulary.js";
import { ScenarioStore } from "../scenario-learning.js";

const scene = scenarioById("self-introduction");
test("自我介绍 A 先说完六句再轮到 B，物品来自既有课程，生词排除姓名城市", () => {
  assert.equal(scene.number, 5);
  assert.deepEqual(SELF_INTRODUCTION_LINES.map(line => line.speaker), [...Array(6).fill("Mia"), ...Array(6).fill("Leo")]);
  assert.deepEqual(SELF_INTRODUCTION_LINES.map(line => line.text), [
    "Hello! I'm Mia.", "I'm eight years old.", "I live in Beijing.", "I have a pen.", "I have an apple.", "I have a flower.",
    "Hello! I'm Leo.", "I'm nine years old.", "I live in Lujiang.", "I have a pencil.", "I have a banana.", "I have a flower.",
  ]);
  for (const word of ["pen", "pencil", "banana", "flower"]) {
    assert.ok(Object.values(THEME_CONFIGS).some(theme => theme.words.some(item => item.word === word)));
  }
  const memory = new Map([["mario-theme-learned-v1", JSON.stringify({ learnedThemes: ["classroom", "items2"] })]]);
  const known = knownScenarioWords({ getItem: key => memory.get(key) }, ["apple", "banana"]);
  const pending = collectScenarioVocabulary([scene], known).filter(item => !item.learned).map(item => item.word);
  for (const word of ["pen", "pencil", "flower", "apple", "banana", "mia", "leo", "beijing", "lujiang"]) assert.ok(!pending.includes(word));
  for (const word of ["years", "old", "live", "in"]) assert.ok(pending.includes(word));
  assert.equal(new Set(scene.vocabulary.map(item => item.word)).size, scene.vocabulary.length);
});

test("新情景图片签名尺寸和独立进度正确，旧情景进度不变", () => {
  for (const [name, size] of [["introducing-ourselves", 1254], ["self-intro-flower", 640], ["self-intro-pencil", 640]]) {
    const b = readFileSync(new URL(`../assets/scenarios/${name}-v1.png`, import.meta.url));
    assert.equal(b.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(b.readUInt32BE(16), size); assert.equal(b.readUInt32BE(20), size);
  }
  const values = new Map(), writes = [];
  const storage = { getItem: key => values.get(key), setItem: (key, value) => { writes.push(key); values.set(key, value); } };
  const store = new ScenarioStore(storage);
  store.patch({ activeScenarioId: "first-meeting", lineIndex: 4 });
  store.patch({ activeScenarioId: scene.id, lineIndex: 11 });
  const restored = new ScenarioStore(storage);
  assert.equal(restored.progress(scene.id).lineIndex, 11);
  assert.equal(restored.progress("first-meeting").lineIndex, 4);
  assert.ok(writes.every(key => key === "mario-scenario-learning-v1"));
  const html = readFileSync(new URL("../scenario-learning.html", import.meta.url), "utf8");
  assert.match(html, /data-scenario-id="self-introduction"/);
  assert.match(html, /introducing-ourselves-v1\.png\?v=1\.0/);
});
