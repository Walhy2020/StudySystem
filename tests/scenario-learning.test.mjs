import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { FIRST_MEETING_LINES, FIRST_MEETING_PRACTICE, SCENARIOS } from "../data/scenarios.js";
import { SCENARIO_SCHEMA_VERSION, SCENARIO_STORAGE_KEY, ScenarioPracticeSession, ScenarioStore, createScenarioSpeaker, scenarioStorageKeyFromLocation } from "../scenario-learning.js";

class MemoryStorage {
  constructor(initial = {}) { this.values = new Map(Object.entries(initial)); this.writes = []; }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.writes.push(key); this.values.set(key, String(value)); }
}

test("第一次见面包含六句准确对话、完整英式音标和中文", () => {
  assert.equal(SCENARIOS.length, 1);
  assert.deepEqual(FIRST_MEETING_LINES, [
    { id: "mia-intro", speaker: "Mia", text: "Hello! My name is Mia.", phonetic: "/həˈləʊ maɪ neɪm ɪz ˈmiːə/", chinese: "你好！我叫米娅。" },
    { id: "leo-intro", speaker: "Leo", text: "Hi, Mia. I'm Leo.", phonetic: "/haɪ ˈmiːə aɪm ˈliːəʊ/", chinese: "嗨，米娅。我叫利奥。" },
    { id: "mia-nice", speaker: "Mia", text: "Nice to meet you.", phonetic: "/naɪs tə miːt juː/", chinese: "很高兴认识你。" },
    { id: "leo-nice", speaker: "Leo", text: "Nice to meet you, too.", phonetic: "/naɪs tə miːt juː tuː/", chinese: "我也很高兴认识你。" },
    { id: "mia-how", speaker: "Mia", text: "How are you?", phonetic: "/haʊ ɑː juː/", chinese: "你好吗？" },
    { id: "leo-fine", speaker: "Leo", text: "I'm fine, thank you.", phonetic: "/aɪm faɪn θæŋk juː/", chinese: "我很好，谢谢你。" },
  ]);
  assert.ok(FIRST_MEETING_LINES.every((line) => line.phonetic.startsWith("/") && line.phonetic.endsWith("/") && line.chinese));
});

test("三组回应练习不重复，答错停留、答对推进并完成", () => {
  assert.equal(FIRST_MEETING_PRACTICE.length, 3);
  assert.equal(new Set(FIRST_MEETING_PRACTICE.map(({ id }) => id)).size, 3);
  const session = new ScenarioPracticeSession(SCENARIOS[0]);
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
  assert.equal(session.correctCount, 3);
  session.restart();
  assert.equal(session.questionIndex, 0);
  assert.equal(session.complete, false);
});

test("情景完成状态只写独立存储键并能恢复", () => {
  const memory = new MemoryStorage();
  const store = new ScenarioStore(memory);
  assert.equal(store.complete("first-meeting"), true);
  assert.equal(store.complete("first-meeting"), false);
  assert.deepEqual(memory.writes, [SCENARIO_STORAGE_KEY, SCENARIO_STORAGE_KEY]);
  const restored = new ScenarioStore(memory);
  assert.equal(restored.state.version, SCENARIO_SCHEMA_VERSION);
  assert.equal(restored.isComplete("first-meeting"), true);
  assert.equal(scenarioStorageKeyFromLocation({ search: "?test=abc" }), `${SCENARIO_STORAGE_KEY}:test:abc`);
  for (const key of memory.writes) assert.equal(key, SCENARIO_STORAGE_KEY);
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

test("情景页面资源、两阶段、手动声音按钮和独立导航齐全", async () => {
  const [html, css, script] = await Promise.all([
    readFile(new URL("../scenario-learning.html", import.meta.url), "utf8"),
    readFile(new URL("../scenario-learning.css", import.meta.url), "utf8"),
    readFile(new URL("../scenario-learning.js", import.meta.url), "utf8"),
  ]);
  assert.match(html, /scenario-learning\.css\?v=1\.6/);
  assert.match(html, /scenario-learning\.js\?v=1\.4/);
  assert.match(script, /scenario-playback\.js\?v=1\.1/);
  assert.doesNotMatch(html, /id="playDialogue"|id="dialogueLineList"/);
  assert.match(html, /id="continuousDialogue"/);
  assert.match(html, /id="replayDialogue"/);
  assert.match(css, /animation:actor-glow 2\.8s ease-in-out infinite/);
  assert.match(css, /drop-shadow\(0 0 22px #ffb900\)/);
  assert.doesNotMatch(css, /outline:4px dashed/);
  assert.match(script, /scenarios\.js\?v=1\.0/);
  assert.match(html, /id="learnStage"/);
  assert.match(html, /id="practiceStage"/);
  assert.match(html, /id="speakDialogue"/);
  assert.match(html, /id="speakPractice"/);
  assert.match(html, /data-scenario-id="first-meeting"/);
  assert.match(css, /grid-template-columns:repeat\(6/);
  assert.doesNotMatch(script, /mario-theme-learned-v1|mario-book1-v1|mario-hanzi-refactor-v1|mario-phonetics-v1|mario-bomb-game-progress-v1/);
});

test("情景使用内置imagegen正式PNG，无网页生成入口或API", async () => {
  const [png, html, workshop, server] = await Promise.all([
    readFile(new URL("../assets/scenarios/first-meeting-v1.png", import.meta.url)),
    readFile(new URL("../scenario-learning.html", import.meta.url), "utf8"),
    readFile(new URL("../src/scenario-workshop.js", import.meta.url), "utf8"),
    readFile(new URL("../server.py", import.meta.url), "utf8"),
  ]);
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(png.readUInt32BE(16), 1254);
  assert.equal(png.readUInt32BE(20), 1254);
  assert.equal((html.match(/assets\/scenarios\/first-meeting-v1\.png/g) || []).length, 1);
  for (const actor of ["mia", "leo"]) {
    assert.ok(html.includes(`assets/scenarios/${actor}-sprite-v1.png`));
    const sprite = await readFile(new URL(`../assets/scenarios/${actor}-sprite-v1.png`, import.meta.url));
    assert.equal(sprite.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(sprite[25], 6, "RGBA PNG required");
    assert.ok(sprite.readUInt32BE(20) > 500);
  }
  assert.doesNotMatch(html, /openScenarioCreator|scenarioGenerateForm|generationStatus|class="full-kid|class="kid /);
  assert.doesNotMatch(workshop, /fetch\(|OPENAI_API_KEY|\/api\/scenarios/);
  assert.doesNotMatch(server, /ScenarioService|OPENAI_API_KEY|urlopen|def do_POST/);
});
