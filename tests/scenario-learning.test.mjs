import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { FIRST_MEETING_LINES, FIRST_MEETING_PRACTICE, WHAT_IS_IT_LINES, WHAT_IS_IT_PRACTICE, SCENARIOS } from "../data/scenarios.js";
import { SCENARIO_SCHEMA_VERSION, SCENARIO_STORAGE_KEY, ScenarioPracticeSession, ScenarioStore, createScenarioSpeaker, scenarioStorageKeyFromLocation } from "../scenario-learning.js";

class MemoryStorage {
  constructor(initial = {}) { this.values = new Map(Object.entries(initial)); this.writes = []; }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.writes.push(key); this.values.set(key, String(value)); }
}

test("三个情景包含准确对话、逐词英式音标和中文", () => {
  assert.equal(SCENARIOS.length, 3);
  assert.equal(FIRST_MEETING_LINES.length, 6);
  assert.equal(WHAT_IS_IT_LINES.length, 14);
  assert.deepEqual(WHAT_IS_IT_LINES.slice(-3).map(({ text }) => text), [
    "They're red.",
    "Red? No, Leo. They're green erasers.",
    "No, look! They're red erasers.",
  ]);
  assert.ok(FIRST_MEETING_LINES.every((line) => line.phonetic.startsWith("/") && line.phonetic.endsWith("/") && line.chinese));
  assert.ok(WHAT_IS_IT_LINES.every((line) => line.phonetic.startsWith("/") && line.phonetic.endsWith("/") && line.chinese));
  for (const item of SCENARIOS.flatMap((scenario) => scenario.lines)) {
    assert.equal(item.tokens.map(({ text }) => text).join(" "), item.text);
    assert.ok(item.tokens.every(({ phonetic }) => phonetic.startsWith("/") && phonetic.endsWith("/")));
    assert.equal(item.tokens.map(({ phonetic }) => phonetic.slice(1, -1)).join(" "), item.phonetic.slice(1, -1));
  }
});

test("三个情景的回应练习不重复，答错停留、答对推进并完成", () => {
  assert.equal(FIRST_MEETING_PRACTICE.length, 3);
  assert.equal(WHAT_IS_IT_PRACTICE.length, 5);
  for (const scenario of SCENARIOS) {
    assert.equal(new Set(scenario.practice.map(({ id }) => id)).size, scenario.practice.length);
    const session = new ScenarioPracticeSession(scenario);
    while (!session.complete) {
      const question = session.question();
      assert.equal(question.options.length, 3);
      assert.equal(new Set(question.options.map(({ id }) => id)).size, 3);
      const wrong = question.options.find(({ id }) => id !== question.answerId);
      const index = session.questionIndex;
      assert.equal(session.answer(wrong.id).status, "wrong");
      assert.equal(session.questionIndex, index);
      session.answer(question.answerId);
    }
    assert.equal(session.correctCount, scenario.practice.length);
    session.restart();
    assert.equal(session.questionIndex, 0);
    assert.equal(session.complete, false);
  }
});

test("情景完成状态只写独立存储键并能恢复", () => {
  const memory = new MemoryStorage();
  const store = new ScenarioStore(memory);
  assert.equal(store.complete("first-meeting"), true);
  assert.equal(store.complete("first-meeting"), false);
  assert.equal(store.complete("what-is-it"), true);
  assert.deepEqual(memory.writes, [SCENARIO_STORAGE_KEY, SCENARIO_STORAGE_KEY, SCENARIO_STORAGE_KEY]);
  const restored = new ScenarioStore(memory);
  assert.equal(restored.state.version, SCENARIO_SCHEMA_VERSION);
  assert.equal(restored.isComplete("first-meeting"), true);
  assert.equal(restored.isComplete("what-is-it"), true);
  assert.equal(scenarioStorageKeyFromLocation({ search: "?test=abc" }), `${SCENARIO_STORAGE_KEY}:test:abc`);
  for (const key of memory.writes) assert.equal(key, SCENARIO_STORAGE_KEY);
});

test("两个情景独立保存位置，旧版顶层进度迁移到当时活动情景", () => {
  const memory = new MemoryStorage({
    [SCENARIO_STORAGE_KEY]: JSON.stringify({ version: 1, activeScenarioId: "first-meeting", lineIndex: 4, stage: "practice", questionIndex: 1 }),
  });
  const store = new ScenarioStore(memory);
  assert.deepEqual(store.progress("first-meeting"), { lineIndex: 4, stage: "practice", questionIndex: 1 });
  assert.deepEqual(store.progress("what-is-it"), { lineIndex: 0, stage: "learn", questionIndex: 0 });
  store.patch({ activeScenarioId: "what-is-it", lineIndex: 6, stage: "practice", questionIndex: 2 });
  assert.deepEqual(store.progress("what-is-it"), { lineIndex: 6, stage: "practice", questionIndex: 2 });
  store.patch({ activeScenarioId: "first-meeting" });
  assert.equal(store.state.lineIndex, 4);
  assert.equal(store.state.stage, "practice");
  assert.equal(store.state.questionIndex, 1);
  const restored = new ScenarioStore(memory);
  assert.deepEqual(restored.progress("what-is-it"), { lineIndex: 6, stage: "practice", questionIndex: 2 });
  store.patch({ activeScenarioId: "what-is-it", stage: "words" });
  assert.deepEqual(store.progress("what-is-it"), { lineIndex: 6, stage: "words", questionIndex: 0 });
});

test("情景朗读只在手动调用后延迟播放并使用英式语言", async () => {
  class Utterance { constructor(text) { this.text = text; } }
  const spoken = [];
  const speaker = createScenarioSpeaker({ synthesis: { cancel() {}, speak(item) { spoken.push(item); } }, Utterance, delay: 5 });
  assert.equal(spoken.length, 0);
  assert.equal(speaker.speak("Hello!"), true);
  await new Promise((resolve) => setTimeout(resolve, 12));
  assert.deepEqual(spoken.map(({ text, lang }) => ({ text, lang })), [{ text: "Hello!", lang: "en-GB" }]);
  assert.equal(createScenarioSpeaker({}).speak("Hello!"), false);
});

test("情景页面资源、三个阶段、手动声音按钮和独立导航齐全", async () => {
  const [html, css, script] = await Promise.all([
    readFile(new URL("../scenario-learning.html", import.meta.url), "utf8"),
    readFile(new URL("../scenario-learning.css", import.meta.url), "utf8"),
    readFile(new URL("../scenario-learning.js", import.meta.url), "utf8"),
  ]);
  assert.match(html, /scenario-learning\.css\?v=2\.4/);
  assert.match(html, /scenario-learning\.js\?v=2\.4/);
  assert.match(script, /scenario-workshop\.js\?v=1\.9/);
  assert.match(script, /scenario-playback\.js\?v=1\.1/);
  assert.doesNotMatch(html, /id="playDialogue"|id="dialogueLineList"/);
  assert.match(html, /id="continuousDialogue"/);
  assert.match(html, /id="replayDialogue"/);
  assert.match(css, /animation:actor-glow 1s ease-in-out 3/);
  assert.match(css, /drop-shadow\(0 0 4px #ff6500\) drop-shadow\(0 0 16px #ff9500\)/);
  assert.match(css, /animation:object-focus-breathe 1s ease-in-out 3/);
  assert.match(css, /scale\(\.94\).*scale\(1\.06\)/);
  assert.match(script, /scenarioObjectFocus\.classList\.add\("is-breathing"\)/);
  assert.doesNotMatch(css, /#fff7ae|#fffbd6/);
  assert.doesNotMatch(css, /outline:4px dashed/);
  assert.match(script, /scenarios\.js\?v=1\.4/);
  assert.match(html, /id="learnStage"/);
  assert.match(html, /id="practiceStage"/);
  assert.match(html, /id="wordsStage"/);
  assert.match(html, /id="scenarioObjectFocus"/);
  assert.match(html, /id="dialogueAligned"/);
  assert.match(html, /id="practiceAligned"/);
  assert.match(html, /id="speakDialogue"/);
  assert.match(html, /id="speakPractice"/);
  assert.match(html, /data-scenario-id="first-meeting"/);
  assert.match(html, /data-scenario-id="what-is-it"/);
  assert.match(html, /data-scenario-id="counting-pens"/);
  assert.match(css, /grid-template-columns:repeat\(6/);
  assert.doesNotMatch(script, /mario-theme-learned-v1|mario-book1-v1|mario-hanzi-refactor-v1|mario-phonetics-v1|mario-bomb-game-progress-v1/);
});

test("情景使用内置imagegen正式PNG和独立文具强调图，无网页生成入口或API", async () => {
  const [png, classroomPng, html, workshop, server] = await Promise.all([
    readFile(new URL("../assets/scenarios/first-meeting-v1.png", import.meta.url)),
    readFile(new URL("../assets/scenarios/what-is-it-classroom-v1.png", import.meta.url)),
    readFile(new URL("../scenario-learning.html", import.meta.url), "utf8"),
    readFile(new URL("../src/scenario-workshop.js", import.meta.url), "utf8"),
    readFile(new URL("../server.py", import.meta.url), "utf8"),
  ]);
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(png.readUInt32BE(16), 1254);
  assert.equal(png.readUInt32BE(20), 1254);
  assert.equal(classroomPng.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(classroomPng.readUInt32BE(16), 1254);
  assert.equal(classroomPng.readUInt32BE(20), 1254);
  assert.match(workshop, /scenario-vocabulary\.js\?v=1\.8/);
  assert.equal((html.match(/assets\/scenarios\/first-meeting-v1\.png/g) || []).length, 1);
  assert.equal((html.match(/assets\/scenarios\/what-is-it-classroom-v1\.png/g) || []).length, 1);
  for (const actor of ["mia", "leo"]) {
    assert.ok(html.includes(`assets/scenarios/${actor}-sprite-v1.png`));
    const sprite = await readFile(new URL(`../assets/scenarios/${actor}-sprite-v1.png`, import.meta.url));
    assert.equal(sprite.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(sprite[25], 6, "RGBA PNG required");
    assert.ok(sprite.readUInt32BE(20) > 500);
  }
  for (const name of ["pen", "yellow-pencils", "red-marker", "green-erasers", "red-erasers"]) {
    const asset = await readFile(new URL(`../assets/scenarios/focus-${name}-v1.png`, import.meta.url));
    assert.equal(asset.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(asset[25], 6, `${name} must be RGBA PNG`);
    assert.ok(asset.readUInt32BE(16) >= 512 && asset.readUInt32BE(20) >= 512);
  }
  assert.doesNotMatch(html, /openScenarioCreator|scenarioGenerateForm|generationStatus|class="full-kid|class="kid /);
  assert.doesNotMatch(workshop, /fetch\(|OPENAI_API_KEY|\/api\/scenarios/);
  assert.doesNotMatch(server, /ScenarioService|OPENAI_API_KEY|urlopen|def do_POST/);
});
