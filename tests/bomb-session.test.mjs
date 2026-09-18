import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../bomb-game.js", import.meta.url), "utf8");
function extract(name) {
  const start = source.indexOf("  function " + name + "(");
  assert.ok(start >= 0);
  return source.slice(start, source.indexOf("\n  }", start) + 4);
}

test("过期窗口即使尚未收到 storage 事件，也不能覆盖新存档；重新操作才接管", () => {
  const storage = { value: JSON.stringify({ score: 10 }), writes: [],
    getItem: () => storage.value,
    setItem: (key, value) => { storage.writes.push(key); storage.value = value; } };
  const app = new Function("localStorage", `
    const BOMB_PROGRESS_KEY = "mario-bomb-game-progress-v1";
    let lastStoredProgress = localStorage.getItem(BOMB_PROGRESS_KEY), ownsProgress = true;
    let data = JSON.parse(lastStoredProgress), clears = 0;
    const clearInputState = () => { clears++; };
    const serializeBombProgress = () => data;
    const resetGame = () => { data = { score: 0 }; };
    const restoreBombProgress = () => {
      lastStoredProgress = localStorage.getItem(BOMB_PROGRESS_KEY);
      data = JSON.parse(lastStoredProgress);
      return !!data;
    };
    ${extract("saveBombProgress")}
    ${extract("syncBombProgress")}
    ${extract("claimBombProgress")}
    return { saveBombProgress, claimBombProgress, syncBombProgress,
      read: () => ({ data, ownsProgress, clears }) };
  `)(storage);
  storage.value = JSON.stringify({ score: 25 });
  app.saveBombProgress();
  assert.equal(storage.writes.length, 0);
  assert.deepEqual(app.read(), { data: { score: 25 }, ownsProgress: false, clears: 1 });
  app.saveBombProgress();
  assert.equal(storage.writes.length, 0, "passive timer/pagehide never writes");
  app.claimBombProgress();
  assert.equal(app.read().ownsProgress, true);
  assert.deepEqual(storage.writes, ["mario-bomb-game-progress-v1"]);
  storage.value = null;
  app.syncBombProgress();
  app.saveBombProgress();
  assert.equal(storage.value, null, "storage deletion cannot resurrect stale progress");
  assert.deepEqual(app.read().data, { score: 0 });
});

test("碰撞受伤及致命伤都清空按住的方向和移动动画，无敌期不误清除", () => {
  for (const hp of [1, 3]) {
    const state = { status: "playing", hp, player: { gx: 11, gy: 3, invulnerable: 0, move: {} } };
    const held = new Set(["down"]);
    const damage = new Function("state", "clearInputState", `
      const updateHud = () => {}, setMessage = () => {};
      const startTitle = {}, overlayStartButton = {}, startLayer = { classList: { remove() {} } };
      ${extract("damagePlayer")}
      return damagePlayer;
    `)(state, () => held.clear());
    damage();
    assert.equal(held.size, 0);
    assert.equal(state.player.move, null);
    assert.equal(state.hp, hp - 1);
    if (hp > 1) {
      assert.equal(state.player.gx, 1);
      assert.equal(state.player.gy, 1);
      held.add("down");
      damage();
      assert.equal(held.size, 1);
      assert.equal(state.hp, hp - 1);
    } else assert.equal(state.status, "gameover");
  }
});

test("方向键在原生按钮上释放仍清理游戏输入，但保留按钮默认行为", () => {
  const start = source.indexOf('window.addEventListener("keyup", (event) => {');
  const end = source.indexOf("\n  });", start) + 6;
  let handler;
  const heldDirections = new Set(["down"]);
  new Function("window", "heldDirections", "KEY_DIRS", "hasNativeKeyboardTarget", source.slice(start, end))(
    { addEventListener: (_, fn) => { handler = fn; } }, heldDirections, { ArrowDown: "down" }, () => true);
  handler({ code: "ArrowDown", target: {}, preventDefault: () => assert.fail("must preserve native default") });
  assert.equal(heldDirections.size, 0);
});
