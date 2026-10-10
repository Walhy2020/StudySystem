import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import "../src/bomb-bindings.js";
const b = globalThis.BombBindings;

test("旧快捷键迁移仅返回绑定字段，默认手柄按钮独立且不重复", () => {
  assert.deepEqual(b.restore({ mushroomKey: "KeyJ", iceBombKey: "Space", hp: 1 }), {
    mushroomKey: "KeyJ", iceBombKey: "Space", mushroomGamepadButton: 0, iceBombGamepadButton: 1 });
  assert.deepEqual(b.restore({ mushroomKey: "KeyB", iceBombKey: "KeyB", mushroomGamepadButton: 1, iceBombGamepadButton: 1 }), {
    mushroomKey: "KeyB", iceBombKey: "Space", mushroomGamepadButton: 1, iceBombGamepadButton: 0 });
  const restored = b.restore({ mushroomKey: "KeyW", iceBombKey: "Escape", mushroomGamepadButton: 5, iceBombGamepadButton: 7 });
  assert.deepEqual(restored, b.restore({}));
  assert.deepEqual(b.restore(restored), restored);
});

test("键盘和手柄捕捉支持单键，允许转移攻击键但拒绝保留操作", () => {
  const state = b.restore({}); const before = structuredClone(state);
  for (const code of ["KeyJ", "Digit1", "Numpad3", "Slash"]) assert.equal(b.validKey(code), true);
  for (const code of ["KeyW", "ArrowUp", "Enter", "Escape", "Tab", "ShiftLeft", "F5", ""]) assert.equal(b.validKey(code), false);
  for (const index of [0, 1, 2, 10, 17]) assert.equal(b.validButton(index), true);
  for (const index of [-1, 3, 4, 5, 6, 7, 8, 9, 11, 12, 13, 14, 15, 16, 32, NaN]) assert.equal(b.validButton(index), false);
  assert.equal(b.conflict(state, "mushroom", "keyboard", "KeyB"), "");
  assert.equal(b.conflict(state, "iceBomb", "gamepad", 0), "");
  assert.match(b.conflict(state, "mushroom", "gamepad", 5), /返回/);
  assert.equal(b.conflict(state, "mushroom", "gamepad", 2), "");
  assert.equal(b.conflict(state, "mushroom", "keyboard", "Space"), "");
  assert.deepEqual(state, before);
});

test("攻击绑定转移仅清空另一攻击的同设备槽，空绑定刷新后保留", () => {
  const state = b.restore({ iceBombGamepadButton: 2 });
  assert.deepEqual(b.assign(state, "mushroom", "gamepad", 2), { error: "", clearedAction: "iceBomb" });
  assert.deepEqual(state, { mushroomKey: "Space", iceBombKey: "KeyB", mushroomGamepadButton: 2, iceBombGamepadButton: null });
  assert.deepEqual(b.restore(JSON.parse(JSON.stringify(state))), state);
  assert.equal(b.buttonLabel(state.iceBombGamepadButton), "未设置");
  assert.equal(b.assign(state, "iceBomb", "gamepad", 2).clearedAction, "mushroom");
  assert.equal(state.mushroomGamepadButton, null);
  assert.equal(b.assign(state, "mushroom", "keyboard", "KeyB").clearedAction, "iceBomb");
  assert.equal(state.iceBombKey, null);
  assert.equal(state.iceBombGamepadButton, 2);
  assert.equal(b.keyLabel(null), "未设置");
  assert.deepEqual(b.restore(state), state);
  const before = structuredClone(state);
  assert.match(b.assign(state, "mushroom", "gamepad", 5).error, /返回/);
  assert.match(b.assign(state, "mushroom", "keyboard", "KeyW").error, /移动/);
  assert.deepEqual(state, before);
  assert.equal(b.assign(state, "mushroom", "keyboard", "KeyB").clearedAction, "");
  const empty = { mushroomKey: null, iceBombKey: null, mushroomGamepadButton: null, iceBombGamepadButton: null };
  assert.deepEqual(b.restore(empty), empty);
});

test("页面接入捕捉按钮、同步前验证和固定青色箭头", () => {
  const html = readFileSync(new URL("../bomb-game.html", import.meta.url), "utf8");
  assert.match(html, /src\/bomb-bindings.js\?v=1.5/);
  assert.match(html, /<button id="mushroomAttackKey"/);
  assert.match(html, /<button id="iceBombAttackKey"/);
  assert.doesNotMatch(html, /<select/);
  const source = readFileSync(new URL("../bomb-game.js", import.meta.url), "utf8");
  assert.match(source, /ctx.fillStyle = "#67e8f9"/);
  assert.match(source, /setInputCapture\(true\)/);
  assert.match(source, /syncBombProgress\(\);\s+if \(!action/);
});

test("旧 View 攻击绑定只清空对应槽，不改变其他绑定", () => {
  const restored = b.restore({ mushroomGamepadButton: 8, iceBombGamepadButton: 2, mushroomKey: "KeyJ" });
  assert.equal(restored.mushroomGamepadButton, null);
  assert.equal(restored.iceBombGamepadButton, 2); assert.equal(restored.mushroomKey, "KeyJ");
  assert.equal(b.restore({ iceBombGamepadButton: 8 }).iceBombGamepadButton, null);
  assert.match(b.conflict(restored, "mushroom", "gamepad", 8), /鼠标模式切换/);
});
