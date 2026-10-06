import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../bomb-game.js", import.meta.url), "utf8");
function extract(name) {
  const start = source.indexOf(`  function ${name}(`);
  assert.ok(start >= 0, name);
  return source.slice(start, source.indexOf("\n  }", start) + 4);
}
function harness() {
  const state = { map: [[1,1,1,1,1,1,1], [1,0,0,2,2,0,1], [1,1,1,1,1,1,1]],
    crateHp: new Map(), score: 0, powerUps: [], explosions: [], bombs: [],
    fireballs: [], player: { gx: 1, gy: 1 } };
  const rewards = [], particles = [], moves = [];
  const api = new Function("state", "rewards", "particles", "moves", `
    const CRATE_MAX_HP = 3, TILE_CRATE = 2, TILE_HARD = 1, TILE_FLOOR = 0, FLAME_TIME = 0.5, BOMB_TIMER = 2;
    const DIRS = { right: { x: 1, y: 0 }, left: { x: -1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 } };
    const coordKey = (x, y) => x + ',' + y;
    const isInside = (x, y) => x >= 0 && x < 7 && y >= 0 && y < 3;
    const maybeSpawnBrickPowerUp = (x, y) => rewards.push(coordKey(x,y));
    const spawnParticles = (...args) => particles.push(args);
    const sounds = { play() {} }, updateHud = () => {}, checkLevelComplete = () => {};
    const destroyFireFlowersInCells = () => {}, bombAt = () => null, damagePlayer = () => {};
    const SHELL_MOVE_TIME = 0.1, enemyAt = () => null, damageEnemy = () => {};
    const removeShell = shell => { shell.alive = false; };
    const startMove = (...args) => moves.push(args);
    ${extract("restoreCrateHp")}
    ${extract("crateHpAt")}
    ${extract("openCrateCell")}
    ${extract("explodeBomb")}
    ${extract("updateFireballs")}
    ${extract("continueShellRun")}
    return { restoreCrateHp, crateHpAt, openCrateCell, explodeBomb, updateFireballs, continueShellRun };
  `)(state, rewards, particles, moves);
  return { state, rewards, particles, moves, ...api };
}

test("砖块3血：前两击不出道具、不加分，第三击只开启/计分一次", () => {
  const app = harness();
  assert.equal(app.crateHpAt(3, 1), 3);
  for (const hp of [2, 1]) {
    assert.equal(app.openCrateCell(3, 1), false);
    assert.equal(app.crateHpAt(3, 1), hp); assert.equal(app.state.map[1][3], 2);
    assert.deepEqual(app.rewards, []); assert.equal(app.state.score, 0);
  }
  assert.equal(app.openCrateCell(3, 1), true);
  assert.equal(app.state.map[1][3], 0); assert.equal(app.crateHpAt(3, 1), 0);
  assert.equal(app.state.crateHp.size, 0); assert.equal(app.state.score, 5);
  assert.deepEqual(app.rewards, ["3,1"]);
  assert.equal(app.openCrateCell(3, 1), false); assert.equal(app.state.score, 5);
});

test("旧存档砖块默认3血，受损存档保留1/2血，坏数据及已开砖不复活", () => {
  const app = harness(); app.restoreCrateHp(); assert.equal(app.crateHpAt(3,1), 3);
  app.restoreCrateHp([["3,1", 2], ["4,1", 1], ["2,1", 2], ["03,1", 1], ["100,1", 1],
    ["3,1", 0], ["3,1", 9], ["3,1", "1"], ["3,1", 1.5], null, {}]);
  assert.deepEqual([...app.state.crateHp], [["3,1", 2], ["4,1", 1]]);
  app.openCrateCell(4,1); app.restoreCrateHp([["4,1",1], ["3,1",2]]);
  assert.equal(app.crateHpAt(4,1), 0); assert.equal(app.crateHpAt(3,1), 2);
});

test("冰/普通/导弹炸弹均每次扣1血，重叠爆炸不漏计伤害也不穿过砖块", () => {
  for (const kind of ["ice", "normal", "missile"]) {
    const app = harness();
    for (const hp of [2,1,0]) {
      const bomb = { gx: 1, gy: 1, range: 6, isIce: kind === "ice", fromBulletBill: kind === "missile" };
      app.explodeBomb(bomb); app.explodeBomb(bomb); // One bomb cannot damage twice.
      assert.equal(app.crateHpAt(3,1), hp);
      assert.equal(app.crateHpAt(4,1), 3);
      assert.equal(app.state.explosions.at(-1).cells.some(cell => cell.gx > 3), false);
    }
    assert.equal(app.state.score, 5); assert.deepEqual(app.rewards, ["3,1"]);
    app.state.explosions = [];
    app.explodeBomb({ gx: 1, gy: 1, range: 6, isIce: true });
    assert.equal(app.crateHpAt(4,1), 2);
  }
});

test("火球和龟壳扣1血，未碎砖阻挡它们，不在一帧穿砖或连续扣三次", () => {
  const fire = harness();
  for (const hp of [2,1,0]) {
    fire.state.fireballs = [{ gx: 2, gy: 1, vx: 3, vy: 0 }]; fire.updateFireballs(0.3);
    assert.equal(fire.state.fireballs.length, 0); assert.equal(fire.crateHpAt(3,1), hp);
    assert.equal(fire.crateHpAt(4,1), 3);
  }
  const shell = harness();
  for (const hp of [2,1,0]) {
    const actor = { gx: 2, gy: 1, dir: "right", alive: true }; shell.continueShellRun(actor);
    assert.equal(shell.crateHpAt(3,1), hp); assert.equal(actor.alive, hp === 0);
    assert.equal(shell.moves.length, hp === 0 ? 1 : 0);
  }
});

test("月亮单图标乘数量，过程提示及旧提示存档不显示，保留设置/开始入口", () => {
  const html = readFileSync(new URL("../bomb-game.html", import.meta.url), "utf8");
  assert.equal((html.match(/class="moon-hud-icon/g) || []).length, 1);
  assert.match(html, /id="bombMoonCount"/); assert.match(html, /id="bombMessage" hidden aria-hidden="true"/);
  const app = new Function(`const messageNode = { textContent: 'legacy' }; let messageTimer = 9;
    ${extract("setMessage")}; setMessage('吃到东西'); return { text: messageNode.textContent, timer: messageTimer };`)();
  assert.deepEqual(app, { text: "", timer: 0 });
  assert.match(source, /setMessage\(\); \/\/ Ignore legacy transient banners/);
  assert.match(source, /state\.map = createMap\(\);\s+state\.crateHp = new Map/);
  const cursor = readFileSync(new URL("../src/gamepad-cursor.js", import.meta.url), "utf8");
  assert.match(cursor, /pointer\.hidden = !menu; help\.hidden = true/);
  assert.doesNotMatch(cursor, /浏览器需要真实点击授权/);
});
