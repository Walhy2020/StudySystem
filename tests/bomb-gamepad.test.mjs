import test from "node:test";
import assert from "node:assert/strict";
import "../src/bomb-gamepad.js";

function harness() {
  const pad = { index: 0, id: "test", connected: true, mapping: "standard", axes: [0, 0],
    buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })) };
  let pads = [pad];
  const reader = globalThis.createBombGamepadReader(() => pads);
  return { pad, reader, connect: value => { pads = value; },
    button: (index, down) => { pad.buttons[index] = { pressed: down, value: down ? 1 : 0 }; } };
}

test("自定义手柄攻击只响应新按钮，捕捉期间仅返回原始按下按钮且不执行操作", () => {
  const h = harness(); h.reader.poll(); h.reader.setBindings(2, 10); h.reader.poll();
  h.button(0, true); assert.equal(h.reader.poll().mushroom, false);
  h.button(0, false); h.reader.poll();
  h.button(2, true); assert.equal(h.reader.poll().mushroom, true);
  assert.equal(h.reader.poll().mushroom, false);
  h.reader.setBindings(8, 10); h.button(8, true);
  assert.equal(h.reader.poll().mushroom, false, "remap requires neutral");
  h.button(2, false); h.button(8, false); h.reader.poll();
  h.button(10, true); assert.equal(h.reader.poll().ice, true);
  h.button(5, true); h.button(7, true);
  const capture = h.reader.poll(false, false);
  assert.deepEqual(capture.pressedButtons, [5, 7, 10]);
  for (const action of ["mushroom", "ice", "confirm", "refresh", "fullscreen"]) assert.equal(capture[action], false);
  assert.equal(h.reader.poll().ice, false, "capture press cannot leak into gameplay");
});

test("清空手柄攻击绑定不恢复默认，也不影响另一个攻击", () => {
  const h = harness(); h.reader.setBindings(2, null); h.reader.poll();
  for (const index of [0, 1, 2, 10]) {
    h.button(index, true); const result = h.reader.poll();
    assert.equal(result.mushroom, index === 2);
    assert.equal(result.ice, false);
    h.button(index, false); h.reader.poll();
  }
  h.reader.setBindings(null, 2); h.reader.poll();
  h.button(2, true); const result = h.reader.poll();
  assert.equal(result.mushroom, false); assert.equal(result.ice, true);
});

test("左摇杆只瞄准、十字键只移动，死区和主轴避免斜移", () => {
  const h = harness(); h.reader.poll();
  h.pad.axes = [0.2, -0.2]; assert.equal(h.reader.poll().direction, "");
  h.pad.axes = [0.8, 0.4]; assert.equal(h.reader.poll().aim, "right");
  assert.equal(h.reader.poll().direction, "");
  h.pad.axes = [0.1, -0.8]; assert.equal(h.reader.poll().aim, "up");
  h.button(14, true); assert.equal(h.reader.poll().direction, "left");
  h.button(15, true); assert.equal(h.reader.poll().direction, "");
});

test("手柄攻击/确认只在新按下触发一次，R1/R2由共享入口处理", () => {
  const h = harness(); h.reader.poll();
  for (const [index, action] of [[0, "mushroom"], [1, "ice"], [9, "confirm"]]) {
    h.button(index, true); assert.equal(h.reader.poll()[action], true);
    assert.equal(h.reader.poll()[action], false);
    h.button(index, false); h.reader.poll();
    h.button(index, true); assert.equal(h.reader.poll()[action], true);
    h.button(index, false); h.reader.poll();
  }
});

test("L3无动作，也不影响连接回中、移动、瞄准和攻击", () => {
  const h = harness(); h.reader.poll();
  h.pad.axes = [1, 0]; h.button(12, true); h.button(10, true);
  const moving = h.reader.poll();
  assert.equal("aimToggle" in moving, false); assert.equal(moving.direction, "up");
  assert.equal(moving.aim, "right");
  h.button(0, true); assert.equal(h.reader.poll().mushroom, true);
  h.button(0, false); h.reader.poll(false);
  h.pad.axes = [0, 0]; h.button(12, false); h.button(10, false); h.reader.poll();
  h.button(10, true); assert.equal("aimToggle" in h.reader.poll(), false);
  h.connect([]); h.reader.poll(); h.connect([h.pad]);
  assert.equal("aimToggle" in h.reader.poll(), false);
});

test("连接、受伤重置、暂停和重连时按住不误动作，必须回中松键", () => {
  const h = harness(); h.pad.axes = [0, 1]; h.button(0, true);
  assert.equal(h.reader.poll().direction, ""); assert.equal(h.reader.poll().mushroom, false);
  h.pad.axes = [0, 0]; h.button(0, false); h.reader.poll();
  h.pad.axes = [0, 1]; assert.equal(h.reader.poll().aim, "down");
  h.reader.reset(); assert.equal(h.reader.poll().direction, "");
  h.pad.axes = [0, 0]; h.reader.poll();
  h.reader.poll(false); h.pad.axes = [0, 1]; assert.equal(h.reader.poll().direction, "");
  h.pad.axes = [0, 0]; h.reader.poll();
  h.connect([]); assert.equal(h.reader.poll().connected, false);
  h.pad.axes = [1, 0]; h.connect([h.pad]); assert.equal(h.reader.poll().direction, "");
});

test("战斗读入器不重复处理R1/R2，菜单禁用攻击", () => {
  const h = harness(); h.reader.poll(false, true);
  h.button(5, true); h.button(0, true);
  assert.equal(h.reader.poll(false, true).refresh, false);
  assert.equal(h.reader.poll(false, true).mushroom, false);
  assert.equal(h.reader.poll(false, true).refresh, false);
  h.reader.poll(false, false);
  assert.equal(h.reader.poll(true, true).refresh, false);
  h.button(5, false); h.button(0, false); h.reader.poll();
  h.button(7, true); assert.equal(h.reader.poll().fullscreen, false);
  h.connect([]); h.reader.poll(); h.connect([h.pad]);
  assert.equal(h.reader.poll().fullscreen, false);
});

test("手柄保留已选标准设备，非标准/API不可用不猜测攻击按钮", () => {
  const h = harness(); h.reader.poll();
  const other = { ...h.pad, id: "other", index: 1, axes: [-1, 0] };
  h.connect([other, h.pad]); assert.equal(h.reader.poll().direction, "");
  h.pad.mapping = ""; h.connect([h.pad]); h.button(0, true);
  assert.equal(h.reader.poll().standard, false); assert.equal(h.reader.poll().mushroom, false);
  const unavailable = globalThis.createBombGamepadReader(() => { throw new Error("blocked"); });
  assert.equal(unavailable.poll().connected, false);
});
