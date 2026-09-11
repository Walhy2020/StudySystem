import test from "node:test";
import assert from "node:assert/strict";
import { createDialoguePlayback } from "../src/scenario-playback.js";
import { createScenarioSpeaker } from "../scenario-learning.js";
const wait = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));

test("single-line replay waits for manual next; continuous playback can restart from zero", async () => {
  const calls = [], statuses = [];
  const playback = createDialoguePlayback({ count: () => 2, arrivalMs: 1, gapMs: 1,
    show() {}, cancelSpeech() {}, status: value => statuses.push(value),
    speak(index, end) { calls.push({ index, end }); return true; } });
  try {
    playback.play(0, { continuous: false }); await wait();
    calls[0].end(); await wait(80);
    assert.equal(calls.length, 1); assert.equal(playback.index, 0);
    assert.equal(statuses.at(-1), "line-complete");
    playback.play(1, { continuous: false }); await wait();
    calls[1].end(); await wait();
    assert.equal(calls.length, 2); assert.equal(playback.running, false);
    playback.play(0, { continuous: true }); await wait();
    assert.equal(calls[2].index, 0); calls[2].end(); await wait();
    assert.equal(calls[3].index, 1); calls[3].end();
    assert.equal(statuses.at(-1), "complete");
  } finally { playback.stop(); }
});

test("dialogue advances only on speech end; pause invalidates callbacks", async () => {
  const shown = [], utterances = [], statuses = [];
  const playback = createDialoguePlayback({ count: () => 2, arrivalMs: 1, gapMs: 1,
    show: (i, phase) => shown.push([i, phase]), cancelSpeech() {}, status: (s) => statuses.push(s),
    speak(i, end, error) { utterances.push({ i, end, error }); return true; } });
  try {
    playback.play(0); await wait();
    assert.deepEqual(shown, [[0, "arriving"], [0, "speaking"]]);
    await wait(); assert.equal(utterances.length, 1);
    playback.pause(); utterances[0].end(); await wait();
    assert.equal(playback.index, 0); assert.equal(playback.running, false);
    playback.play(); await wait(); utterances[1].end(); await wait();
    assert.equal(utterances[2].i, 1);
    utterances[2].end(); await wait();
    assert.equal(statuses.at(-1), "complete");
    assert.equal(playback.running, false);
  } finally { playback.stop(); }
});

test("replay and navigation discard old speech, unavailable or thrown speech stops", async () => {
  for (const kind of ["false", "throw", "error"]) {
    const statuses = [];
    const playback = createDialoguePlayback({ count: () => 2, arrivalMs: 1, gapMs: 1,
      show() {}, cancelSpeech() {}, status: (s) => statuses.push(s),
      speak(i, end, error) { if (kind === "throw") throw Error("speech"); if (kind === "error") error(); return false; } });
    playback.play(0); await wait();
    assert.equal(statuses.at(-1), "unavailable"); assert.equal(playback.running, false);
    playback.stop();
  }
});

test("speaker prioritizes en-GB and suppresses stale callbacks and errors", async () => {
  const items = [], calls = [];
  class Utterance { constructor(text) { this.text = text; } }
  const voice = { lang: "en-GB" };
  const speaker = createScenarioSpeaker({ delay: 1, Utterance, synthesis: { cancel() {}, getVoices: () => [{lang:"en-US"},voice], speak: (u) => items.push(u) } });
  speaker.speak("Hello", { onEnd: () => calls.push("old"), onError() {} }); await wait();
  speaker.cancel(); items[0].onend(); assert.deepEqual(calls, []);
  speaker.speak("Hi", { onEnd: () => calls.push("new"), onError() {} }); await wait();
  assert.equal(items[1].voice, voice); items[1].onend(); items[1].onend();
  assert.deepEqual(calls, ["new"]); speaker.cancel();
  const broken = createScenarioSpeaker({ delay: 1, Utterance, synthesis: { cancel() {}, speak() { throw Error("no speech"); } } });
  broken.speak("Hi", { onError: () => calls.push("error") }); await wait();
  assert.equal(calls.at(-1), "error"); broken.cancel();
});
