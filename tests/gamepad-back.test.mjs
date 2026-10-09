import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../src/gamepad-cursor.js", import.meta.url), "utf8");
const start = source.indexOf("  function returnOneLevel()");
const handler = source.slice(start, source.indexOf("\n  function closePopup", start));

test("返回优先模块退出入口，隐藏按钮跳过，最后回首页而非浏览器历史", () => {
  function run({ visible = [], capture = false, popup = false, consumed = false, path = "/study/scenario-learning.html", embedded = false } = {}) {
    const calls = [];
    const back = new Function("window", "document", "location", "CustomEvent", "calls", `
      const base = new URL('http://localhost/study/');
      const inputCapture = ${capture}, popup = ${popup};
      const closePopup = () => calls.push('popup'), rememberPosition = () => calls.push('position');
      ${handler}
      return returnOneLevel;
    `)({ dispatchEvent: () => !consumed, STUDY_FULLSCREEN_SHELL: { navigate: href => { calls.push(['shell', href]); return embedded; } } },
      { getElementById: id => ({ disabled: false, getClientRects: () => visible.includes(id) ? [{}] : [], click: () => calls.push(id) }) },
      { pathname: path, assign: href => calls.push(['assign', href]) }, class {}, calls);
    back(); return calls;
  }
  assert.deepEqual(run({ visible: ["backToScenarios"] }), ["backToScenarios"]);
  assert.deepEqual(run({ visible: ["backToThemes", "backToSeries"] }), ["backToThemes"]);
  assert.deepEqual(run({ visible: ["backToSeries"] }), ["backToSeries"]);
  assert.deepEqual(run({ capture: true }), []);
  assert.deepEqual(run({ popup: true }), ["popup"]);
  assert.deepEqual(run({ consumed: true }), []);
  assert.deepEqual(run({ path: "/study/index.html" }), []);
  assert.deepEqual(run({ embedded: true }), ["position", ["shell", "http://localhost/study/index.html"]]);
  assert.deepEqual(run(), ["position", ["shell", "http://localhost/study/index.html"], ["assign", "http://localhost/study/index.html"]]);
  assert.doesNotMatch(handler, /history\.back|exitFullscreen|requestFullscreen/);
});
