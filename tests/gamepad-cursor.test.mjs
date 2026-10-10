import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "../src/gamepad-cursor.js";
const { safeDestination, cursorStep, edgeScrollAmount, restoreCursorPosition, createPositionStore } = globalThis.StudyGamepadCursorTools;

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

test("光标只在上下边缘继续外推时滚动，松开/死区/横推/离开边缘立即停止", () => {
  assert.equal(edgeScrollAmount({ y: 719 }, [0, 1], 0.02, 731), 10);
  assert.equal(edgeScrollAmount({ y: 12 }, [0, -1], 0.02, 731), -10);
  assert.equal(edgeScrollAmount({ y: 719 }, [0, 0.625], 0.02, 731), 5);
  for (const axes of [[0, 0], [0, 0.2], [1, 0], [0, -1], [0, NaN]]) {
    assert.equal(edgeScrollAmount({ y: 719 }, axes, 0.02, 731), 0);
  }
  assert.equal(edgeScrollAmount({ y: 12 }, [0, 1], 0.02, 731), 0);
  assert.equal(edgeScrollAmount({ y: 700 }, [0, 1], 0.02, 731), 0);
  assert.equal(edgeScrollAmount({ y: 719 }, [0, 1], 10, 731), 25);
  assert.equal(edgeScrollAmount({ y: 719 }, [0, 1], -1, 731), 0);
});

test("八个页面接入同一个光标资源，无新增进度存储或系统级鼠标入口", () => {
  for (const page of ["index", "pinyin", "book-learning", "theme-learning", "scenario-learning", "review-learning", "phonetics", "bomb-game"]) {
    const html = readFileSync(new URL(`../${page}.html`, import.meta.url), "utf8");
    assert.equal(html.split('src/gamepad-cursor.js?v=1.13').length - 1, 1, page);
  }
  const source = readFileSync(new URL("../src/gamepad-cursor.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /localStorage|window\.open|showPicker|requestPointerLock/);
  assert.match(source, /window\.sessionStorage/);
  assert.match(source, /mario-gamepad-cursor-position-v1/);
  assert.match(source, /gamepad-cursor\.css\?v=1\.1/);
  assert.match(source, /if \(document\.hidden \|\| !document\.hasFocus\(\)\)/);
});

test("光标坐标保留原位置，视口缩小时仅夹到边界，坏数据回退安全", () => {
  assert.deepEqual(restoreCursorPosition({ x: 125, y: 67 }, 1440, 900), { x: 125, y: 67 });
  assert.deepEqual(restoreCursorPosition({ x: 1300, y: 850 }, 390, 731), { x: 378, y: 719 });
  assert.deepEqual(restoreCursorPosition({ x: -20, y: 0 }, 390, 731), { x: 12, y: 12 });
  for (const value of [null, undefined, {}, [], { x: "20", y: 30 }, { x: NaN, y: 20 }, { x: 20, y: Infinity }]) {
    assert.deepEqual(restoreCursorPosition(value, 390, 900), { x: 195, y: 450 });
  }
});

test("坐标存储仅写会话专用key的x/y，非法数据及拒绝存储不影响输入", () => {
  const values = new Map(), writes = [];
  const storage = { getItem: key => values.get(key), setItem: (key, value) => { values.set(key, value); writes.push(key); } };
  const key = "mario-gamepad-cursor-position-v1:/";
  const store = createPositionStore(storage, key);
  store.save({ x: 125, y: 67, pressed: true, progress: "must not persist" });
  assert.deepEqual(writes, [key]); assert.deepEqual(JSON.parse(values.get(key)), { x: 125, y: 67 });
  assert.deepEqual(store.read(390, 900), { x: 125, y: 67 });
  store.save({ x: NaN, y: 30 }); assert.equal(writes.length, 1);
  values.set(key, "bad json"); assert.deepEqual(store.read(390, 900), { x: 195, y: 450 });
  const blocked = createPositionStore({ getItem() { throw Error("denied"); }, setItem() { throw Error("denied"); } }, key);
  assert.deepEqual(blocked.read(390, 900), { x: 195, y: 450 });
  assert.doesNotThrow(() => blocked.save({ x: 20, y: 30 }));
});
