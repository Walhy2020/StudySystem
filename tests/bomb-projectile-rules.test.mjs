import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../bomb-game.js", import.meta.url), "utf8");
function extract(name) {
  const start = source.indexOf(`  function ${name}(`);
  assert.ok(start >= 0);
  return source.slice(start, source.indexOf("\n  }", start) + 4);
}

test("小蘑菇碰砖结束、不打开砖或攻击砖后的敌人，击中敌人仍扣1血", () => {
  const enemy = { alive: true, gx: 4, gy: 3, type: "bowser", hp: 40 };
  let damaged = 0;
  const impact = new Function("enemy", "damageEnemy", `
    const state = { enemies: [enemy] }, sounds = { play() {} };
    const spawnParticles = () => {}, updateHud = () => {}, checkLevelComplete = () => {};
    const defeatEnemy = () => { throw new Error("unexpected missile"); };
    const openCrateCell = () => { throw new Error("mushroom must not open crates"); };
    ${extract("impactMushroomShot")}
    return impactMushroomShot;
  `)(enemy, target => { target.hp--; damaged++; });
  const blocked = {}; impact(blocked, 4, 3, true);
  assert.equal(blocked.done, true); assert.equal(damaged, 0);
  const hit = {}; impact(hit, 4, 3, false);
  assert.equal(hit.done, true); assert.equal(enemy.hp, 39); assert.equal(damaged, 1);
});

test("库巴每2秒发射，火球没有寿命/射程字段", () => {
  const state = { fireballs: [] }, enemy = { gx: 2, gy: 3, dir: "right", fireCooldown: 2 };
  const fire = new Function("state", `
    ${source.match(/const BOWSER_FIRE_COOLDOWN = [^;]+;/)[0]}
    const DIRS = { right: { x: 1, y: 0 }, left: { x: -1, y: 0 } }, FIREBALL_SPEED = 3;
    const saveBombProgress = () => {};
    ${extract("updateBowserFire")}
    return updateBowserFire;
  `)(state);
  fire(enemy, 1.9); assert.equal(state.fireballs.length, 0);
  fire(enemy, 0.1); // Floating point remainder can be tiny, so advance one more microsecond.
  fire(enemy, 0.000001); assert.equal(state.fireballs.length, 1);
  assert.equal(Object.hasOwn(state.fireballs[0], "life"), false);
  assert.equal(enemy.fireCooldown, 2);
  fire(enemy, 2); assert.equal(state.fireballs.length, 2);
});

test("火球飞行超过原5秒仍有效，碰硬墙/砖/炸弹/玩家仍结束，不穿墙", () => {
  function harness(block) {
    const state = { map: Array.from({ length: 5 }, () => Array(200).fill(0)),
      player: { gx: 150, gy: 1 }, fireballs: [{ gx: 2, gy: 3, vx: 3, vy: 0 }] };
    let opened = 0, damage = 0;
    if (block === "hard") state.map[3][5] = 1;
    if (block === "crate") state.map[3][5] = 2;
    if (block === "player") state.player = { gx: 5, gy: 3 };
    const update = new Function("state", "bombAt", "openCrateCell", "damagePlayer", `
      const TILE_HARD = 1, TILE_CRATE = 2, CRATE_MAX_HP = 3;
      const isInside = (x, y) => x >= 0 && x < 200 && y >= 0 && y < 5;
      const updateHud = () => {};
      ${extract("updateFireballs")}
      return updateFireballs;
    `)(state, (x, y) => block === "bomb" && x === 5 && y === 3,
      () => { opened++; }, () => { damage++; });
    return { state, update, opened: () => opened, damage: () => damage };
  }
  const free = harness(); free.update(6);
  assert.equal(free.state.fireballs.length, 1); assert.ok(Math.abs(free.state.fireballs[0].gx - 20) < 1e-9);
  for (const block of ["hard", "crate", "bomb", "player"]) {
    const app = harness(block); app.update(6);
    assert.equal(app.state.fireballs.length, 0);
    assert.equal(app.opened(), block === "crate" ? 1 : 0);
    assert.equal(app.damage(), block === "player" ? 1 : 0);
  }
});
