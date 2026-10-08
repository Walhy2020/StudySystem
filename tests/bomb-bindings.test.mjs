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

test("键盘和手柄捕捉支持单键，拒绝重复和保留操作，不交换其他绑定", () => {
  const state = b.restore({}); const before = structuredClone(state);
  for (const code of ["KeyJ", "Digit1", "Numpad3", "Slash"]) assert.equal(b.validKey(code), true);
  for (const code of ["KeyW", "ArrowUp", "Enter", "Escape", "Tab", "ShiftLeft", "F5", ""]) assert.equal(b.validKey(code), false);
  for (const index of [0, 1, 2, 8, 10, 17]) assert.equal(b.validButton(index), true);
  for (const index of [-1, 3, 4, 5, 6, 7, 9, 11, 12, 13, 14, 15, 16, 32, NaN]) assert.equal(b.validButton(index), false);
  assert.match(b.conflict(state, "mushroom", "keyboard", "KeyB"), /冰炸弹/);
  assert.match(b.conflict(state, "iceBomb", "gamepad", 0), /小蘑菇/);
  assert.match(b.conflict(state, "mushroom", "gamepad", 5), /刷新/);
  assert.equal(b.conflict(state, "mushroom", "gamepad", 2), "");
  assert.equal(b.conflict(state, "mushroom", "keyboard", "Space"), "");
  assert.deepEqual(state, before);
});

test("页面接入捕捉按钮、同步前验证和固定青色箭头", () => {
  const html = readFileSync(new URL("../bomb-game.html", import.meta.url), "utf8");
  assert.match(html, /src\/bomb-bindings.js\?v=1.1/);
  assert.match(html, /<button id="mushroomAttackKey"/);
  assert.match(html, /<button id="iceBombAttackKey"/);
  assert.doesNotMatch(html, /<select/);
  const source = readFileSync(new URL("../bomb-game.js", import.meta.url), "utf8");
  assert.match(source, /ctx.fillStyle = "#67e8f9"/);
  assert.match(source, /setInputCapture\(true\)/);
  assert.match(source, /syncBombProgress\(\);\s+if \(!action/);
});
