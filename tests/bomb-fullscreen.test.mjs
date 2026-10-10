import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../bomb-game.js", import.meta.url), "utf8");
const start = source.indexOf("  async function toggleFullscreen(");
const toggleSource = source.slice(start, source.indexOf("\n  }", start) + 4);
function harness({ fail = false, embedded = false, request } = {}) {
  const calls = [];
  const document = { fullscreenElement: null, exitFullscreen: async () => calls.push("exit") };
  const appNode = { requestFullscreen: request || (async () => {
    calls.push("request"); if (fail) throw Error("activation denied");
  }) };
  const window = { STUDY_FULLSCREEN_SHELL: { isEmbedded: () => embedded,
    toggleFullscreen: async () => calls.push("embedded") } };
  const toggle = new Function("document", "appNode", "window", "calls", `
    let fullscreenPending = false;
    const clearInputState = () => calls.push('clear'), saveBombProgress = () => calls.push('save');
    const setSettingsMenuOpen = open => calls.push(['settings', open]);
    const canvas = { focus: () => calls.push('focus') };
    const scheduleBombViewportFit = () => calls.push('fit');
    const console = { warn: () => calls.push('denied') };
    ${toggleSource}
    return toggleFullscreen;
  `)(document, appNode, window, calls);
  return { toggle, calls, document };
}
test("设置中的全屏按钮被拒绝不打开设置或抢焦点，可再次请求", async () => {
  const app = harness({ fail: true });
  assert.equal(await app.toggle(), false); assert.equal(await app.toggle(), false);
  assert.equal(app.calls.filter(call => call === "request").length, 2);
  assert.ok(!app.calls.some(call => Array.isArray(call) || call === "focus"));
});
test("全屏成功直接收起菜单，退出和内嵌模块仍走原生/外壳路径", async () => {
  const app = harness(); assert.equal(await app.toggle(), true);
  assert.ok(app.calls.some(call => Array.isArray(call) && call[1] === false));
  app.document.fullscreenElement = {}; assert.equal(await app.toggle(), true);
  assert.ok(app.calls.includes("exit"));
  const frame = harness({ embedded: true }); await frame.toggle();
  assert.ok(frame.calls.includes("embedded")); assert.ok(!frame.calls.includes("request"));
});
test("待处理的全屏请求不重复发起，学习页不再创建授权弹窗", async () => {
  let resolve;
  const app = harness({ request: () => new Promise(done => { resolve = done; }) });
  const first = app.toggle(); assert.equal(await app.toggle(), false);
  resolve(); assert.equal(await first, true);
  const cursor = readFileSync(new URL("../src/gamepad-cursor.js", import.meta.url), "utf8");
  assert.doesNotMatch(cursor, /showFullscreenPrompt|fullscreenPrompt|全屏授权/);
  assert.doesNotMatch(cursor, /requestFullscreen\(\)/);
  assert.match(cursor, /back: pressed\(pad, 5\), fullscreen: pressed\(pad, 7\)/);
});
