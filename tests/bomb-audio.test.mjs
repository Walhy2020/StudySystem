import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

const source = readFileSync(new URL("../src/bomb-audio.js", import.meta.url), "utf8");
const parameter = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });

test("四种游戏音效在手势解锁后各自调度，静音与缺失音频接口可降级", () => {
  const events = [];
  class FakeAudioContext {
    constructor() {
      events.push("context");
      this.state = "suspended";
      this.currentTime = 1;
      this.sampleRate = 4000;
      this.destination = {};
    }
    resume() { this.state = "running"; return Promise.resolve(); }
    createGain() { return { gain: parameter(), connect() {} }; }
    createOscillator() {
      return { frequency: parameter(), connect() {}, start() { events.push("tone"); }, stop() {} };
    }
    createBuffer(_channels, length) { return { getChannelData: () => new Float32Array(length) }; }
    createBufferSource() {
      return { connect() {}, start() { events.push("noise"); }, stop() {} };
    }
    createBiquadFilter() { return { frequency: parameter(), connect() {} }; }
  }
  const browser = { AudioContext: FakeAudioContext };
  runInNewContext(source, { window: browser, Math });
  const player = browser.createBombSoundPlayer();
  assert.equal(events.length, 0, "opening the page does not create or play audio");
  assert.equal(player.play("place"), false, "audio waits for a user gesture");
  assert.equal(player.unlock(), true);
  assert.equal(player.play("place"), true);
  assert.equal(player.play("explode"), true);
  assert.equal(player.play("pickup"), true);
  assert.equal(player.play("correct"), true);
  assert.equal(events.filter((event) => event === "context").length, 1);
  assert.equal(events.filter((event) => event === "noise").length, 1, "explosion includes a noise burst");
  assert.equal(events.filter((event) => event === "tone").length, 7);
  player.setEnabled(false);
  assert.equal(player.play("place"), false);
  player.setEnabled(true);
  assert.equal(player.play("place"), true);

  const unavailable = browser.createBombSoundPlayer(null);
  assert.equal(unavailable.supported, false);
  assert.equal(unavailable.unlock(), false);
  assert.equal(unavailable.play("explode"), false);
});
