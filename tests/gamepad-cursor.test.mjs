import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "../src/gamepad-cursor.js";
const { safeDestination, cursorStep } = globalThis.StudyGamepadCursorTools;

test("手柄光标只允许八个系统页面同源同目录导航，不开放外链、下载或脚本", () => {
  const base = "http://127.0.0.1:53177/study/";
  for (const page of ["", "index.html", "pinyin.html", "bomb-game.html?test=1", "theme-learning.html#learn"]) {
    assert.ok(safeDestination(page, base));
  }
  for (const page of ["https://example.com/", "//other.test/index.html", "javascript:alert(1)",
    "data:text/html,test", "../index.html", "other.html", "assets/a.png", "../study2/index.html"]) {
    assert.equal(safeDestination(page, base), null);
  }
});

test("手柄光标死区、速度与对角归一，边界始终限于网页视口", () => {
  assert.deepEqual(cursorStep({ x: 50, y: 50 }, [0.2, -0.1], 0.02, 390, 731), { x: 50, y: 50 });
  const straight = cursorStep({ x: 50, y: 50 }, [1, 0], 0.02, 390, 731);
  assert.equal(straight.x, 63);
  const diagonal = cursorStep({ x: 50, y: 50 }, [1, 1], 0.02, 390, 731);
  assert.ok(Math.abs(Math.hypot(diagonal.x - 50, diagonal.y - 50) - 13) < 1e-9);
  assert.deepEqual(cursorStep({ x: 389, y: 730 }, [1, 1], 1, 390, 731), { x: 378, y: 719 });
  assert.deepEqual(cursorStep({ x: 0, y: 0 }, [-1, -1], 1, 390, 731), { x: 12, y: 12 });
});

test("八个页面接入同一个光标资源，无新增进度存储或系统级鼠标入口", () => {
  for (const page of ["index", "pinyin", "book-learning", "theme-learning", "scenario-learning", "review-learning", "phonetics", "bomb-game"]) {
    const html = readFileSync(new URL(`../${page}.html`, import.meta.url), "utf8");
    assert.equal(html.split('src/gamepad-cursor.js?v=1.0').length - 1, 1, page);
  }
  const source = readFileSync(new URL("../src/gamepad-cursor.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /localStorage|sessionStorage|window\.open|showPicker|requestPointerLock/);
  assert.match(source, /gamepad-cursor\.css\?v=1\.0/);
  assert.match(source, /if \(document\.hidden \|\| !document\.hasFocus\(\)\)/);
});
