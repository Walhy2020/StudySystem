import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "../src/fullscreen-shell.js";
const { moduleUrl } = globalThis.StudyFullscreenShellTools;
test("全屏外壳仅接收同源同目录八个模块，拒绝外链与私有/素材路径", () => {
  const base = "http://127.0.0.1:53177/study/";
  for (const href of ["", "index.html?test=abc", "phonetics.html", "bomb-game.html?v=1.0"]) assert.ok(moduleUrl(href, base));
  for (const href of ["https://example.com/index.html", "../index.html", "../study2/index.html", "assets/x.png", "javascript:alert(1)", "fullscreen.html", "//example.com/"]) assert.equal(moduleUrl(href, base), null);
});
test("八页在手柄光标之前加载外壳，无新存储或服务接口", () => {
  for (const page of ["index", "pinyin", "book-learning", "theme-learning", "scenario-learning", "review-learning", "phonetics", "bomb-game"]) {
    const html = readFileSync(new URL(`../${page}.html`, import.meta.url), "utf8");
    assert.equal(html.split("src/fullscreen-shell.js?v=1.0").length - 1, 1);
    assert.ok(html.indexOf("src/fullscreen-shell.js") < html.indexOf("src/gamepad-cursor.js"));
  }
  const source = readFileSync(new URL("../src/fullscreen-shell.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /localStorage|sessionStorage|window\.open|fetch\(|postMessage/);
  assert.match(source, /frame\.contentWindow === child/);
});
test("外壳后台暂停存档/游戏循环/重复版本提示，切换时取消朗读推进", () => {
  const bomb = readFileSync(new URL("../bomb-game.js", import.meta.url), "utf8");
  assert.match(bomb, /function saveBombProgress\(\) \{\s+if \(window\.STUDY_FULLSCREEN_SHELL\?\.isHosting\(\)\) return/);
  assert.match(bomb, /function loop\(now\) \{\s+if \(window\.STUDY_FULLSCREEN_SHELL\?\.isHosting/);
  for (const file of ["book-learning-themes.js", "theme-learning.js", "scenario-learning.js", "src/phonetics-tts.js"]) {
    assert.match(readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), /studysystem:fullscreen-navigation/);
  }
  assert.match(readFileSync(new URL("../src/version-update.js", import.meta.url), "utf8"), /!window\.STUDY_FULLSCREEN_SHELL\?\.isHosting/);
});

test("显示版本入口使用当前 constants 缓存，防止旧版本标记覆写新发布", () => {
  const version = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")).version;
  for (const file of ["src/app.js", "src/pinyin-app.js", "src/phonetics-app.js"]) {
    assert.ok(readFileSync(new URL(`../${file}`, import.meta.url), "utf8").includes(`./constants.js?v=${version}`));
  }
});
