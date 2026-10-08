import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "../src/web-audio.js";
const { createController } = globalThis.StudyWebAudioTools;
test("网页静音只切换一次、立即通知/停止朗读，恢复保留原音量", () => {
  const events = [], writes = [];
  const audio = createController({ notify: muted => events.push(muted), write: muted => writes.push(muted),
    cancelSpeech: () => events.push("cancel") });
  assert.equal(audio.isMuted(), false);
  audio.setMuted(true); audio.receiveMuted(true);
  assert.deepEqual(events, [true, "cancel"]);
  assert.equal(audio.prepareSpeech({ volume: 0.7 }).volume, 0);
  audio.setMuted(false);
  assert.equal(audio.prepareSpeech({ volume: 0.7 }).volume, 0.7);
  assert.deepEqual(writes, [true, false]);
});
test("静音从当前标签会话恢复，存储不可用时仍能正常切换", () => {
  assert.equal(createController({ read: () => true }).isMuted(), true);
  const audio = createController({ read: () => { throw Error("blocked"); }, write: () => { throw Error("blocked"); } });
  audio.setMuted(true); assert.equal(audio.isMuted(), true);
  audio.setMuted(false); assert.equal(audio.isMuted(), false);
});
test("八页先加载共用静音控制；L1静音不滚动，不写入学习存储", () => {
  for (const page of ["index","pinyin","book-learning","theme-learning","scenario-learning","review-learning","phonetics","bomb-game"]) {
    const html = readFileSync(new URL(`../${page}.html`, import.meta.url), "utf8");
    assert.equal(html.split("src/web-audio.js?v=1.0").length - 1, 1);
    assert.ok(html.indexOf("src/web-audio.js") < html.indexOf("src/gamepad-cursor.js"));
  }
  const cursor = readFileSync(new URL("../src/gamepad-cursor.js", import.meta.url), "utf8");
  assert.match(cursor, /mute: pressed\(pad, 4\)/);
  assert.match(cursor, /buttons\.mute && !previous\.mute/);
  assert.doesNotMatch(cursor, /scrollUp: pressed\(pad, 4\)/);
  assert.doesNotMatch(readFileSync(new URL("../src/web-audio.js", import.meta.url), "utf8"), /localStorage/);
});
