import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

test("系统鼠标：物理 View 边沿、断线/空闲保护和受限同源接口（模拟输出）", () => {
  const result = spawnSync("python", ["tests/controller-mouse.py"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
});
test("八页先接入互斥层；R1只有返回，View不再绑定攻击", () => {
  for (const page of ["index", "pinyin", "book-learning", "theme-learning", "scenario-learning", "review-learning", "phonetics", "bomb-game"]) {
    const html = readFileSync(new URL(`../${page}.html`, import.meta.url), "utf8");
    assert.equal(html.split('src/controller-mouse.js?v=1.0').length - 1, 1);
    assert.ok(html.indexOf("src/controller-mouse.js") < html.indexOf("src/gamepad-cursor.js"));
  }
  const cursor = readFileSync(new URL("../src/gamepad-cursor.js", import.meta.url), "utf8");
  assert.doesNotMatch(cursor, /scrollDown/);
  assert.match(cursor, /back: pressed\(pad, 5\), fullscreen: pressed\(pad, 7\)/);
  assert.match(cursor, /const view = pressed\(pad, 8\)/);
  assert.match(cursor, /STUDY_CONTROLLER_MOUSE\?\.isActive/);
});
