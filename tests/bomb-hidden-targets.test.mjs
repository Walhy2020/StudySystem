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
        const isBulletBillTestLevel = () => false;
        const bulletBillBrickCapacityForLevel = () => 1;
        const shouldSeedBulletBill = () => true;
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
