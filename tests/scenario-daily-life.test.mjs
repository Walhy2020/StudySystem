import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DAILY_LIFE_SCENARIOS } from "../data/daily-life-scenarios.js";
import { dialogueWords, collectScenarioVocabulary } from "../src/scenario-vocabulary.js";
import { ScenarioStore } from "../scenario-learning.js";

test("五个生活情景保留确认的20句对话，词库完整且只含当前句出现的词", () => {
  assert.deepEqual(DAILY_LIFE_SCENARIOS.map(scene => scene.chineseTitle), ["起床", "睡觉", "吃饭", "喝水", "收拾玩具"]);
  const expected = [
    ["Good morning! Time to get up.", "Good morning, Mom.", "Let's get dressed.", "OK!"],
    ["It's time for bed.", "I'm sleepy.", "Good night. Sweet dreams!", "Good night, Mom."],
    ["It's time to eat.", "I'm hungry!", "Here's your rice.", "Thank you, Mom."],
    ["I'm thirsty.", "Can I have some water, please?", "Sure. Here you are.", "Thank you!"],
    ["Let's put the toys away.", "Where does this car go?", "Put it in the box.", "OK! All done!"],
  ];
  for (const [index, scene] of DAILY_LIFE_SCENARIOS.entries()) {
    assert.deepEqual(scene.lines.map(line => line.text), expected[index]);
    assert.deepEqual(new Set(scene.vocabulary.map(word => word.word)),
      new Set(dialogueWords(scene.lines.map(line => line.text).join(" "))));
    assert.ok(collectScenarioVocabulary([scene]).every(word => word.sources.length > 0));
    assert.equal(scene.actors[0].speaker, "Mom");
    assert.match(scene.actors[0].image, /home-mom-sprite-v3\.png$/);
    assert.match(scene.actors[1].image, /home-brother-sprite-v1\.png$/);
  }
});

test("五张背景和五位家人是真实PNG，角色使用RGBA透明格式", async () => {
  for (const scene of DAILY_LIFE_SCENARIOS) {
    const bytes = await readFile(new URL(`../${scene.image.slice(2)}`, import.meta.url));
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(bytes.readUInt32BE(16), bytes.readUInt32BE(20));
    assert.ok(bytes.readUInt32BE(16) >= 1024);
  }
  for (const name of ["mom-sprite-v3", "dad-sprite-v2", "grandma-sprite-v2", "brother-sprite-v1", "sister-sprite-v1"]) {
    const bytes = await readFile(new URL(`../assets/scenarios/home-${name}.png`, import.meta.url));
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(bytes[25], 6, `${name}: RGBA`);
    assert.ok(bytes.readUInt32BE(20) >= 1000);
  }
});

test("增加生活情景不重置旧存档，新情景独立保存位置且不自动学会单词", () => {
  let value = JSON.stringify({ activeScenarioId: "first-meeting", lineIndex: 3,
    completedScenarioIds: ["first-meeting"], learnedWords: ["hello"] });
  const store = new ScenarioStore({ getItem: () => value, setItem(key, next) {
    assert.equal(key, "mario-scenario-learning-v1"); value = next;
  } });
  assert.equal(store.progress("first-meeting").lineIndex, 3);
  store.patch({ activeScenarioId: "getting-up", lineIndex: 2, stage: "practice" });
  const restored = new ScenarioStore({ getItem: () => value, setItem() {} });
  assert.equal(restored.progress("getting-up").lineIndex, 2);
  assert.equal(restored.progress("first-meeting").lineIndex, 3);
  assert.deepEqual(restored.state.learnedWords, ["hello"]);
  assert.equal(restored.isComplete("first-meeting"), true);
});
