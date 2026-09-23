import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../bomb-game.js", import.meta.url), "utf8");
const extract = (name) => {
  const start = source.indexOf("  function " + name + "(");
  assert.ok(start >= 0);
  return source.slice(start, source.indexOf("\n  }", start) + 4);
};
const coordKey = (x, y) => x + "," + y;
const words = Array.from({ length: 5 }, (_, index) => ({ id: String(index + 1) }));

test("两个世界十个关卡均固定预留一枚隐藏导弹，不受随机概率影响", () => {
  const state = { world: 1, subLevel: 1 };
  const math = Object.create(Math);
  const helpers = new Function("state", "Math", `
    ${source.match(/const BULLET_BILL_HIDDEN_COUNT_PER_LEVEL = [^;]+;/)[0]}
    ${extract("bulletBillBrickCapacityForLevel")}
    return { bulletBillBrickCapacityForLevel };
  `)(state, math);
  for (const random of [0, 0.3499, 0.35, 0.9999]) {
    math.random = () => random;
    for (state.world = 1; state.world <= 2; state.world++) {
      for (state.subLevel = 1; state.subLevel <= 5; state.subLevel++) {
        assert.equal(helpers.bulletBillBrickCapacityForLevel(), 1);
      }
    }
  }
});

test("怪物清场保留导弹砖，五题仍全揭示；已揭示导弹不保留空砖", () => {
  for (const hiddenMissile of [true, false]) {
    const state = {
      map: [[2, 2, 2, 2, 2, 2, 2]],
      enemies: [{ alive: false }], enemyClearOpenedBricks: false,
      hiddenPowerUps: new Map(hiddenMissile ? [["5,0", "bulletBill"]] : []),
      hiddenWordCrates: new Map(words.map((word, x) => [coordKey(x, 0), word.id])),
      powerUps: [], bombs: [], score: 0,
    };
    const cleanup = new Function("state", "coordKey", `
      const ROWS = 1, COLS = 7, TILE_CRATE = 2, TILE_FLOOR = 0;
      const livingEnemyCount = () => state.enemies.filter(e => e.alive).length;
      const hasVisibleLearningPowerUp = () => state.powerUps.length > 0;
      const isAvailableLearningPowerUp = () => true;
      const spawnParticles = () => {}, setMessage = () => {}, updateHud = () => {};
      const maybeSpawnBrickPowerUp = (x, y) => {
        const key = coordKey(x, y);
        if (state.hiddenWordCrates.has(key)) {
          state.powerUps.push({ wordId: state.hiddenWordCrates.get(key) });
          state.hiddenWordCrates.delete(key);
        }
        if (state.hiddenPowerUps.get(key) === "bulletBill") throw Error("auto-spawned missile");
      };
      ${extract("hasHiddenBulletBillBrick")}
      ${extract("autoOpenBricksAfterEnemyClear")}
      return autoOpenBricksAfterEnemyClear;
    `)(state, coordKey);
    cleanup();
    assert.deepEqual(state.map[0], [0, 0, 0, 0, 0, hiddenMissile ? 2 : 0, 0]);
    assert.equal(state.hiddenPowerUps.size, hiddenMissile ? 1 : 0);
    assert.equal(state.powerUps.length, 5);
    assert.equal(state.hiddenWordCrates.size, 0);
    assert.equal(state.score, (hiddenMissile ? 6 : 7) * 5);
    cleanup();
    assert.equal(state.powerUps.length, 5, "cleanup is idempotent");
  }
});

test("五题完成后仍需手动炸出隐藏导弹，且活导弹死亡后才过关", () => {
  const state = {
    status: "playing", map: [[2]], bombs: [], moonWordIds: words.map(w => w.id),
    hiddenPowerUps: new Map([["0,0", "bulletBill"]]), enemies: [{ alive: false }],
  };
  let advances = 0;
  const check = new Function("state", "advanceSubLevel", `
    const TILE_CRATE = 2, BOMB_MOONS_PER_LEVEL = 5;
    const livingEnemyCount = () => state.enemies.filter(e => e.alive).length;
    const crateCount = () => state.map.flat().filter(tile => tile === TILE_CRATE).length;
    ${extract("hasHiddenBulletBillBrick")}
    ${extract("checkLevelComplete")}
    return checkLevelComplete;
  `)(state, () => advances++);
  check();
  assert.equal(advances, 0);
  state.map[0][0] = 0;
  state.hiddenPowerUps.clear();
  state.enemies.push({ alive: true });
  check();
  assert.equal(advances, 0);
  state.enemies[1].alive = false;
  state.bombs.push({ isRed: true, exploded: false });
  check();
  assert.equal(advances, 0, "converted red bomb still blocks completion");
  state.bombs[0].exploded = true;
  check();
  assert.equal(advances, 1);
});

test("每种地图尺寸在最稀疏随机结果下仍有五个藏题砖，不占出生安全区", () => {
  for (const COLS of [13, 15, 17, 19, 21]) {
    for (const random of [0, 0.5, 0.999999]) {
      const state = {};
      const math = Object.create(Math);
      math.random = () => random;
      const helpers = new Function("state", "Math", "COLS", "coordKey", "pendingLevelWords", `
        const ROWS = 11, TILE_CRATE = 2, TILE_FLOOR = 0, TILE_HARD = 1;
        const BOMB_MOONS_PER_LEVEL = 5;
        const maxFireFlowersForLevel = () => 2;
        ${source.match(/const BULLET_BILL_HIDDEN_COUNT_PER_LEVEL = [^;]+;/)[0]}
        ${extract("bulletBillBrickCapacityForLevel")}
        ${extract("createMap")}
        ${extract("seedHiddenPowerUps")}
        return { createMap, seedHiddenPowerUps };
      `)(state, math, COLS, coordKey, () => words);
      state.map = helpers.createMap();
      helpers.seedHiddenPowerUps();
      assert.equal(state.hiddenWordCrates.size, 5);
      assert.deepEqual([...state.hiddenWordCrates.values()], words.map(word => word.id));
      assert.equal(state.hiddenPowerUps.size, 4);
      assert.equal([...state.hiddenPowerUps.values()].filter(type => type === "bulletBill").length, 1);
      for (const [key] of state.hiddenWordCrates) {
        const [x, y] = key.split(",").map(Number);
        assert.equal(state.map[y][x], 2);
        assert.equal(state.hiddenPowerUps.has(key), false, "target/reward cannot share a brick");
      }
      for (const [x, y] of [[1,1],[1,2],[2,1]]) assert.equal(state.map[y][x], 0);
    }
  }
});

test("只有藏题砖被打开才生成对应题卡，两题型各触发一次", () => {
  for (const mode of ["pinyin", "hanzi"]) {
    const state = { hiddenWordCrates: new Map([["4,3","one"]]), hiddenPowerUps: new Map() };
    const calls = [];
    const reveal = new Function("state", "coordKey", "spawnPowerUp", "currentLearningMode", `
      const powerUpAt = () => false;
      const LEARNING_MODES = { hanzi: "hanzi" };
      ${extract("maybeSpawnBrickPowerUp")}
      return maybeSpawnBrickPowerUp;
    `)(state, coordKey, (...args) => calls.push(args), () => mode);
    reveal(3,3);
    assert.equal(calls.length, 0);
    reveal(4,3);
    reveal(4,3);
    assert.deepEqual(calls, [[mode === "hanzi" ? "hanziPrompt" : "pinyin", 4, 3, { wordId: "one" }]]);
    assert.equal(state.hiddenWordCrates.size, 0);
  }
});
