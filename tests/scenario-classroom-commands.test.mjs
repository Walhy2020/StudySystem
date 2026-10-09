import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { scenarioById, CLASSROOM_COMMAND_LINES } from "../data/scenarios.js";
import { collectScenarioVocabulary, dialogueWords, knownScenarioWords } from "../src/scenario-vocabulary.js";
import { ScenarioStore, ScenarioPracticeSession } from "../scenario-learning.js";
import { buildTotalWordCatalog, buildTotalWordLibrary } from "../src/total-word-library.js";
import { buildThemeCatalog } from "../src/theme-overview.js";
import { THEME_CONFIGS } from "../theme-learning.js";

const scene = scenarioById("classroom-commands");

test("课堂指令严格保留五句用户原文、中译和逐词英式音标", () => {
  assert.equal(scene.number, 6);
  assert.deepEqual(CLASSROOM_COMMAND_LINES.map(line => [line.text, line.chinese]), [
    ["Please stand up.", "请站起来。"], ["Please sit down.", "请坐下。"],
    ["Please raise your hands.", "请举起小手。"], ["Thank you.", "谢谢你。"], ["You're welcome.", "不客气。"],
  ]);
  for (const line of scene.lines) {
    assert.equal(line.tokens.map(token => token.text).join(" "), line.text);
    assert.equal(line.tokens.map(token => token.phonetic.slice(1, -1)).join(" "), line.phonetic.slice(1, -1));
    assert.ok(line.tokens.every(token => /^\/.+\/$/.test(token.phonetic)));
  }
  assert.deepEqual(scene.lines.map(line => line.focusObject || null), ["stand-up", "sit-down", "raise-hands", null, null]);
  const spokenWords = new Set(scene.lines.flatMap(line => dialogueWords(line.text)));
  assert.equal(scene.vocabulary.length, 12);
  assert.deepEqual(new Set(scene.vocabulary.map(item => item.word)), spokenWords);
  assert.ok(!spokenWords.has("you're"));
  assert.deepEqual(dialogueWords("You're welcome."), ["you", "are", "welcome"]);
});

test("五道课堂练习按中文选英文，站坐举手和谢谢不客气互为干扰项", () => {
  assert.equal(scene.practiceMode, "chinese-to-english");
  assert.equal(scene.practice.length, 5);
  assert.equal(new Set(scene.practice.map(item => item.answerId)).size, 5);
  const session = new ScenarioPracticeSession(scene);
  for (const [index, item] of scene.practice.entries()) {
    assert.equal(item.promptId, scene.lines[index].id);
    assert.equal(item.answerId, item.promptId);
    assert.equal(new Set(item.optionIds).size, 3);
    const wrong = item.optionIds.find(id => id !== item.answerId);
    assert.equal(session.answer(wrong).status, "wrong");
    assert.equal(session.questionIndex, index);
    assert.equal(session.answer(item.answerId).status, index === 4 ? "complete" : "correct");
  }
  assert.equal(session.correctCount, 5);
  assert.ok(scene.practice[3].optionIds.includes("command-welcome"));
  assert.ok(scene.practice[4].optionIds.includes("command-thank-you"));
});

test("课堂新词读总词库、只写原情景键，完成练习不会自动把词标为学会", () => {
  const values = new Map([["mario-scenario-learning-v1", JSON.stringify({
    activeScenarioId: "first-meeting", lineIndex: 4, completedScenarioIds: ["what-is-it"], learnedWords: ["thank", "you"],
  })]]);
  const writes = [];
  const storage = { getItem: key => values.get(key), setItem(key, value) { writes.push(key); values.set(key, value); } };
  const store = new ScenarioStore(storage);
  store.patch({ activeScenarioId: scene.id, lineIndex: 2 });
  store.complete(scene.id);
  const restored = new ScenarioStore(storage);
  assert.equal(restored.progress(scene.id).lineIndex, 2);
  assert.equal(restored.progress("first-meeting").lineIndex, 4);
  assert.ok(restored.isComplete("what-is-it"));
  assert.deepEqual(restored.state.learnedWords, ["thank", "you"]);
  const words = collectScenarioVocabulary([scene], knownScenarioWords(storage, restored.state.learnedWords));
  assert.ok(words.find(item => item.word === "thank").learned);
  assert.ok(!words.find(item => item.word === "hands").learned);
  assert.ok(words.every(item => item.sources.length && item.sources.every(source => source.scenarioId === scene.id)));
  assert.ok(writes.every(key => key === "mario-scenario-learning-v1"));
  const catalog = buildTotalWordCatalog([], { bookItems: [], scenarios: [scene] });
  assert.equal(catalog.find(item => item.word === "are").sentence, "You're welcome.");
  assert.equal(catalog.find(item => item.word === "stand").art.src, scene.focusObjects["stand-up"].image);
  assert.equal(catalog.find(item => item.word === "hands").art.type, "meaning", "avoid identical raise/hands picture answers");
  store.patch({ learnedWords: [...store.state.learnedWords, "raise"] });
  const library = buildTotalWordLibrary(buildThemeCatalog(THEME_CONFIGS), storage);
  assert.equal(library.filter(item => item.word === "raise").length, 1);
  assert.equal(library.some(item => item.word === "stand"), false);
});

test("课堂四张配图均为完整方形 RGB PNG，页面、舞台实际接入", () => {
  for (const name of ["classroom-commands", "command-stand-up", "command-sit-down", "command-raise-hands"]) {
    const b = readFileSync(new URL(`../assets/scenarios/${name}-v1.png`, import.meta.url));
    assert.equal(b.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.equal(b.readUInt32BE(16), 1254); assert.equal(b.readUInt32BE(20), 1254);
    assert.equal(b[25], 2, "truecolor RGB");
  }
  const html = readFileSync(new URL("../scenario-learning.html", import.meta.url), "utf8");
  const css = readFileSync(new URL("../scenario-learning.css", import.meta.url), "utf8");
  assert.match(html, /data-scenario-id="classroom-commands"/);
  assert.match(html, /classroom-commands-v1\.png\?v=1\.0/);
  assert.match(css, /classroom-commands-v1\.png\?v=1\.0/);
  assert.match(html, /id="practiceOptionsTitle"/);
});
