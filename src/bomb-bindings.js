(function () {
  const reservedKeys = new Set(["KeyW", "KeyA", "KeyS", "KeyD"]);
  const reservedButtons = new Map([[3, "菜单光标"], [4, "网页静音"], [5, "返回"],
    [6, "菜单向下滚动"], [7, "全屏"], [9, "开始/继续"], [11, "菜单点选"],
    [12, "向上移动"], [13, "向下移动"], [14, "向左移动"], [15, "向右移动"], [16, "系统按钮"]]);
  function validKey(code) {
    return typeof code === "string" && !reservedKeys.has(code) &&
      /^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|Space|Backspace|Delete|Insert|Home|End|PageUp|PageDown|Minus|Equal|BracketLeft|BracketRight|Backslash|Semicolon|Quote|Comma|Period|Slash|NumpadAdd|NumpadSubtract|NumpadMultiply|NumpadDivide|NumpadDecimal)$/.test(code);
  }
  function validButton(index) { return Number.isInteger(index) && index >= 0 && index <= 31 && !reservedButtons.has(index); }
  function keyLabel(code) {
    if (code === null) return "未设置";
    if (code === "Space") return "空格";
    if (/^Key/.test(code)) return code.slice(3);
    if (/^Digit/.test(code)) return code.slice(5);
    return code.replace(/^Numpad/, "小键盘 ");
  }
  function buttonLabel(index) {
    if (index === null) return "未设置";
    return ({ 0: "× / A", 1: "○ / B", 2: "□ / X", 3: "△ / Y", 4: "L1", 5: "R1", 6: "L2", 7: "R2",
      8: "Share / Select", 9: "Options / Start", 10: "L3", 11: "R3" })[index] || `手柄键 ${index}`;
  }
  function restore(saved) {
    const mushroomKey = saved.mushroomKey === null ? null : validKey(saved.mushroomKey) ? saved.mushroomKey : "Space";
    const iceBombKey = saved.iceBombKey === null ? null : validKey(saved.iceBombKey) && saved.iceBombKey !== mushroomKey
      ? saved.iceBombKey : mushroomKey === "KeyB" ? "Space" : "KeyB";
    const mushroomGamepadButton = saved.mushroomGamepadButton === null ? null : validButton(saved.mushroomGamepadButton) ? saved.mushroomGamepadButton : 0;
    const iceBombGamepadButton = saved.iceBombGamepadButton === null ? null : validButton(saved.iceBombGamepadButton) && saved.iceBombGamepadButton !== mushroomGamepadButton
      ? saved.iceBombGamepadButton : mushroomGamepadButton === 1 ? 0 : 1;
    return { mushroomKey, iceBombKey, mushroomGamepadButton, iceBombGamepadButton };
  }
  function conflict(state, action, device, value) {
    if (device === "keyboard" && !validKey(value)) return "该键已用于移动/系统操作，或不支持单键绑定，请换一个键。";
    if (device === "gamepad" && !validButton(value)) return `${buttonLabel(value)} 已用于${reservedButtons.get(value) || "系统操作"}，请换一个按钮。`;
    return "";
  }
  function assign(state, action, device, value) {
    const error = conflict(state, action, device, value);
    if (error) return { error, clearedAction: "" };
    const other = action === "mushroom" ? "iceBomb" : "mushroom";
    const suffix = device === "keyboard" ? "Key" : "GamepadButton";
    const clearedAction = state[other + suffix] === value ? other : "";
    if (clearedAction) state[other + suffix] = null;
    state[action + suffix] = value;
    return { error: "", clearedAction };
  }
  globalThis.BombBindings = Object.freeze({ validKey, validButton, keyLabel, buttonLabel, restore, conflict, assign });
}());
