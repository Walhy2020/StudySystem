import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../bomb-game.js", import.meta.url), "utf8");
test("成功移动或回退移动不覆盖最新请求的攻击方向", () => {
  const start = source.indexOf("  function startMove(");
  const functionSource = source.slice(start, source.indexOf("\n  }", start) + 4);
  const result = new Function(`
    const player = { gx:3, gy:3 }, state = { player };
    const DIRS = { right:{x:1,y:0} }, rememberPlayerCell = () => {};
    let attackDirection = 'down';
    ${functionSource}
    startMove(player, 'right', 0.18);
    return { aim: attackDirection, move: player.move.direction };
  `)();
  assert.deepEqual(result, { aim: "down", move: "right" });
});
test("按方向即瞄准：键盘不受已连接手柄限制，恢复中的走路方向不覆盖瞄准", () => {
  assert.match(source, /lastDirection = gamepadDirection;\s+attackDirection = gamepadDirection/);
  assert.match(source, /if \(!event\.repeat\) \{\s+attackDirection = direction/);
  assert.doesNotMatch(source, /if \(!gamepadConnected\) attackDirection = direction/);
  assert.doesNotMatch(source, /attackDirection = state\.player\.move\.direction/);
  assert.match(source, /!input\.direction && !keyboardDirections\.size && !state\.player\.move && input\.aim/);
});
