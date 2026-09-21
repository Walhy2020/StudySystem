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

test("原有火焰受伤及致命伤清空输入，无敌期不重复扣血", () => {
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

test("等待继续时冻结整个更新，包括爆炸、敌人和伤害", () => {
  new Function(`let awaitingContinue = true; ${extract("update")} update(10);`)();
});

test("怪物碰撞沿真实路线退两格：直行、拐弯、半步、短路、阻挡及旧存档", () => {
  const cases = [
    { trail: [[5, 1], [6, 1], [7, 1]], position: [7, 1], expected: [5, 1] },
    { trail: [[5, 1], [5, 2], [5, 3], [6, 3]], position: [6, 3], expected: [5, 2] },
    { trail: [[5, 1], [5, 2], [5, 3]], position: [5.6, 3], move: { fromX: 5, fromY: 3, toX: 6, toY: 3 }, expected: [5, 2] },
    { trail: [[5, 1], [6, 1]], position: [6, 1], expected: [5, 1] },
    { trail: [[5, 1], [6, 1], [7, 1]], position: [7, 1], blocked: [5, 1], expected: [6, 1] },
    { trail: [[5, 1], [6, 1], [7, 1]], position: [7, 1], blocked: [6, 1], expected: [7, 1] },
    { trail: [[5, 1], [6, 1]], position: [6.6, 1], move: { fromX: 6, fromY: 1, toX: 7, toY: 1 }, blocked: [6, 1], expected: [7, 1] },
    { position: [7, 3], expected: [7, 3] },
  ];
  for (const sample of cases) {
    const state = { hp: 3, status: "playing", player: { gx: sample.position[0], gy: sample.position[1],
      trail: sample.trail?.map(([gx, gy]) => ({ gx, gy })), invulnerable: 0, move: sample.move || null } };
    let clears = 0;
    const damage = new Function("state", "clearInputState", "isCellOpen", `
      const updateHud = () => {}, setMessage = () => {};
      ${extract("rememberPlayerCell")}
      ${extract("retreatPlayer")}
      ${extract("damagePlayer")}
      return damagePlayer;
    `)(state, () => { clears++; }, (gx, gy) => gx !== sample.blocked?.[0] || gy !== sample.blocked?.[1]);
    damage("monster");
    assert.equal(state.hp, 2);
    assert.deepEqual([state.player.gx, state.player.gy], sample.expected);
    assert.equal(state.player.move, null);
    assert.equal(state.player.invulnerable, 1);
    assert.equal(clears, 1);
    damage("monster");
    damage();
    assert.equal(state.hp, 2, "the same one-second shield blocks enemy and flame damage");
    assert.equal(clears, 1);
  }
});

test("无敌恰好1秒，与闪烁同步结束；存档暂停不会耗掉无敌时间", () => {
  const state = { player: { invulnerable: 1 }, bombs: [] };
  const app = new Function("state", `
    const advanceMove = () => true;
    ${extract("updatePlayer")}
    ${extract("isPlayerBlinkHidden")}
    return { updatePlayer, isPlayerBlinkHidden };
  `)(state);
  const blink = new Set();
  for (let i = 0; i < 16; i++) {
    blink.add(app.isPlayerBlinkHidden());
    app.updatePlayer(1 / 16);
  }
  assert.equal(blink.size, 2);
  assert.equal(state.player.invulnerable, 0);
  assert.equal(app.isPlayerBlinkHidden(), false);
});

test("蘑菇移动速度精确降低10%，库巴和乌龟不变，包含存档中的移动", () => {
  for (const type of ["mushroom", "bowser", "koopa-green"]) {
    const enemy = { type, alive: true, chaseTimer: 0, hitCooldown: 0, stunTimer: 0, move: {} };
    let elapsed;
    new Function("state", "advanceMove", `
      const MUSHROOM_SPEED_FACTOR = 0.9;
      const isNightTime = () => false, stopEnemyMoveBeforeBomb = () => false;
      ${extract("updateEnemies")}
      updateEnemies(0.1);
    `)({ enemies: [enemy] }, (_, dt) => { elapsed = dt; return true; });
    assert.ok(Math.abs(elapsed - (type === "mushroom" ? 0.09 : 0.1)) < 1e-10);
  }
  assert.match(source, /const MUSHROOM_SPEED_FACTOR = 0\.9;/);
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
