import test from "node:test";
import assert from "node:assert/strict";

globalThis.window = {};
await import("../data/phonetics.js");
const items = window.MARIO_PHONETICS;

test("48项首词可朗读，voices回退、连续重播和无API降级正确", async () => {
  assert.equal(items.length, 48);
  assert.ok(items.every((item) => typeof item.examples?.[0] === "string" && item.examples[0].trim()));

  let voices = [];
  let speakThrows = false;
  const calls = [];
  const listeners = {};
  class FakeUtterance {
    constructor(text) { this.text = text; }
  }
  const synthesis = {
    cancelCount: 0,
    resumeCount: 0,
    getVoices: () => voices,
    cancel() { this.cancelCount += 1; },
    resume() { this.resumeCount += 1; },
    speak(utterance) {
      if (speakThrows) throw new Error("speak failed");
      calls.push(utterance);
    },
    addEventListener(name, listener) { listeners[name] = listener; },
  };
  window.speechSynthesis = synthesis;
  window.SpeechSynthesisUtterance = FakeUtterance;
  const tts = await import(`../src/phonetics-tts.js?node-test=${Date.now()}`);

  const defaultVoiceResult = await tts.speakPhoneticExample(items[0], { delayMs: 0 });
  assert.equal(defaultVoiceResult.ok, true);
  assert.equal(calls.at(-1).text, "sheep");
  assert.equal(calls.at(-1).lang, "en-GB");
  assert.equal(calls.at(-1).voice, undefined);
  assert.equal(synthesis.resumeCount, 1);

  const enUs = { name: "US", lang: "en-US", localService: true };
  const enGb = { name: "GB", lang: "en-GB", localService: false };
  voices = [{ name: "FR", lang: "fr-FR", localService: true }, enUs, enGb];
  listeners.voiceschanged();
  const gbResult = await tts.speakPhoneticExample(items[0], { delayMs: 0 });
  assert.equal(gbResult.ok, true);
  assert.equal(calls.at(-1).voice, enGb);

  voices = [{ name: "FR", lang: "fr-FR", localService: true }, enUs];
  listeners.voiceschanged();
  const englishFallback = await tts.speakPhoneticExample(items[0], { delayMs: 0 });
  assert.equal(englishFallback.ok, true);
  assert.equal(calls.at(-1).voice, enUs);

  const beforeContinuous = calls.length;
  const first = tts.speakPhoneticExample(items[0], { delayMs: 30 });
  const second = tts.speakPhoneticExample(items[1], { delayMs: 0 });
  const [superseded, spoken] = await Promise.all([first, second]);
  assert.equal(superseded.reason, "superseded");
  assert.equal(spoken.ok, true);
  assert.equal(calls.length, beforeContinuous + 1);
  assert.equal(calls.at(-1).text, "ship");
  assert.ok(synthesis.cancelCount >= 5);

  speakThrows = true;
  const failed = await tts.speakPhoneticExample(items[2], { delayMs: 0 });
  assert.deepEqual({ ok: failed.ok, reason: failed.reason }, { ok: false, reason: "failed" });
  speakThrows = false;

  window.speechSynthesis = null;
  const unavailable = await tts.speakPhoneticExample(items[3], { delayMs: 0 });
  assert.deepEqual({ ok: unavailable.ok, reason: unavailable.reason }, { ok: false, reason: "unavailable" });
});
