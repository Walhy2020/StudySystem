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

test("世界3至6的导弹数量逐世界、逐小关增加", () => {
  const state = { world: 3, subLevel: 1 };
  const math = Object.create(Math);
  const helpers = new Function("state", "Math", `
    ${source.match(/const BULLET_BILL_HIDDEN_COUNT_PER_LEVEL = [^;]+;/)[0]}
    const FIRST_WORLD = 3;
    const BOWSER_FIRE_COOLDOWN = 3;
    ${extract("bulletBillBrickCapacityForLevel")}
    return { bulletBillBrickCapacityForLevel };
  `)(state, math);
  for (const random of [0, 0.3499, 0.35, 0.9999]) {
    math.random = () => random;
    for (state.world = 3; state.world <= 6; state.world++) {
      for (state.subLevel = 1; state.subLevel <= 5; state.subLevel++) {
        assert.equal(helpers.bulletBillBrickCapacityForLevel(), state.subLevel + state.world - 2);
      }
    }
  }
});

test("世界3至6逐世界增加怪物且库巴不占出生点", () => {
  const state = { world: 3, subLevel: 1, map: [] };
  const createEnemies = new Function("state", "Math", "getDimensions", "coordKey", `
    let COLS = 17, ROWS = 11;
    const FIRST_WORLD = 3;
    const BOWSER_FIRE_COOLDOWN = 3;
    const TILE_FLOOR = 0;
    const difficultyIndexForSubLevel = () => state.subLevel + 1;
    ${extract("createEnemies")}
    return () => {
      ({ COLS, ROWS } = getDimensions(state.world, state.subLevel));
      state.map = Array.from({ length: ROWS }, () => Array(COLS).fill(TILE_FLOOR));
      return createEnemies();
    };
  `)(state, Math, (world, subLevel) => ({
    COLS: 27 + (world - 3 + subLevel - 1) * 2,
    ROWS: 15,
  }), coordKey);
  for (state.world = 3; state.world <= 6; state.world += 1) {
    for (state.subLevel = 1; state.subLevel <= 5; state.subLevel += 1) {
      const enemies = createEnemies();
      assert.equal(enemies.find(enemy => enemy.type === "bowser").hp, 40);
      assert.ok(enemies.filter(enemy => enemy.type !== "bowser").every(enemy => enemy.hp === 6));
      assert.equal(enemies.length, state.subLevel + 5 + (state.world - 3) * 2);
      assert.equal(enemies.filter(enemy => enemy.type === "koopa-green").length, 1);
      assert.equal(new Set(enemies.map(enemy => coordKey(enemy.gx, enemy.gy))).size, enemies.length);
      assert.ok(enemies.every(enemy => enemy.gx !== 1 || enemy.gy !== 1));
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
      powerUps: [], bombs: [], explosions: [], score: 0,
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
    status: "playing", map: [[2]], bombs: [], explosions: [], moonWordIds: words.map(w => w.id),
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

test("二十关地图在最稀疏随机结果下仍藏五题和足量导弹，敌人出生格安全", () => {
  const levels = [3, 4, 5, 6].flatMap((world) => [1, 2, 3, 4, 5].map((subLevel) => ({
    world, subLevel, cols: 27 + (world - 3 + subLevel - 1) * 2, rows: 15,
  })));
  for (const { world, subLevel, cols: COLS, rows: ROWS } of levels) {
    for (const random of [0, 0.5, 0.999999]) {
      const state = { world, subLevel };
      const math = Object.create(Math);
      math.random = () => random;
      const helpers = new Function("state", "Math", "COLS", "ROWS", "coordKey", "pendingLevelWords", `
        const TILE_CRATE = 2, TILE_FLOOR = 0, TILE_HARD = 1;
        const BOMB_MOONS_PER_LEVEL = 5;
        const FIRST_WORLD = 3;
        const maxFireFlowersForLevel = () => 2;
        ${source.match(/const BULLET_BILL_HIDDEN_COUNT_PER_LEVEL = [^;]+;/)[0]}
        ${extract("bulletBillBrickCapacityForLevel")}
        ${extract("createMap")}
        ${extract("seedHiddenPowerUps")}
        return { createMap, seedHiddenPowerUps };
      `)(state, math, COLS, ROWS, coordKey, () => words);
      state.map = helpers.createMap();
      helpers.seedHiddenPowerUps();
      assert.equal(state.hiddenWordCrates.size, 5);
      assert.deepEqual([...state.hiddenWordCrates.values()], words.map(word => word.id));
      const missiles = subLevel + world - 2;
      assert.equal(state.hiddenPowerUps.size, 3 + missiles);
      assert.equal([...state.hiddenPowerUps.values()].filter(type => type === "bulletBill").length, missiles);
      for (const [key] of state.hiddenWordCrates) {
        const [x, y] = key.split(",").map(Number);
        assert.equal(state.map[y][x], 2);
        assert.equal(state.hiddenPowerUps.has(key), false, "target/reward cannot share a brick");
      }
      for (const [x, y] of [[1,1],[1,2],[2,1]]) assert.equal(state.map[y][x], 0);
      if (world >= 3) {
        const center = Math.floor(COLS / 2);
        const middle = Math.floor(ROWS / 2);
        for (const [x, y] of [[COLS - 2, ROWS - 2], [COLS - 2, 1], [1, ROWS - 2],
          [center, middle], [center - 3, 1], [center + 3, ROWS - 2], [1, middle], [COLS - 2, middle]]) {
          assert.equal(state.map[y][x], 0, `enemy start ${x},${y} is open`);
        }
      }
      if (world > 3) {
        const center = Math.floor(COLS / 2);
        const middle = Math.floor(ROWS / 2);
        for (const [x, y] of [[center, 1], [center, ROWS - 2], [3, middle], [COLS - 4, middle],
          [center - 6, 3], [center + 6, ROWS - 4]]) {
          assert.equal(state.map[y][x], 0, `new-world enemy start ${x},${y} is open`);
        }
      }
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
