import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source = readFileSync(new URL("../bomb-game.js", import.meta.url), "utf8");
function extract(name) {
  const start = source.indexOf(`  function ${name}(`);
  assert.ok(start >= 0);
  return source.slice(start, source.indexOf("\n  }", start) + 4);
}
test("旧存档小怪/导弹血量只升级一次，保留已受伤、死亡、库巴和冰升级", () => {
  const state = { bombLimit: 4, flameRange: 7, enemies: [
    { type: "mushroom", alive: true, hp: 1 }, { type: "koopa-green", alive: true, hp: 3 },
    { type: "bullet-bill", alive: true, hp: 1 }, { type: "mushroom", alive: false, hp: 0 },
    { type: "bowser", alive: true, hp: 26 },
  ] };
  const migrate = new Function("state", `const ENEMY_HP_RULES_VERSION = 1;
    ${extract("migrateEnemyHpRules")} return migrateEnemyHpRules;`)(state);
  migrate({});
  assert.deepEqual(state.enemies.map(enemy => enemy.hp), [4, 6, 3, 0, 26]);
  migrate({ enemyHpRulesVersion: 1 });
  assert.deepEqual(state.enemies.map(enemy => enemy.hp), [4, 6, 3, 0, 26]);
  assert.equal(state.enemies[3].alive, false);
  assert.deepEqual([state.bombLimit, state.flameRange], [4, 7]);
});
test("导弹需3次小蘑菇攻击，第三击才死亡掉弹，不打晕且保留其他攻击免疫", () => {
  let defeated = 0;
  const damage = new Function("defeatEnemy", `
    const ENEMY_HIT_COOLDOWN = 0.68, TOUGH_ENEMY_STUN_TIME = 3;
    const spawnShell = () => {}, spawnParticles = () => {}, setMessage = () => {};
    ${extract("damageEnemy")} return damageEnemy;`)(enemy => { enemy.alive = false; defeated++; });
  const move = { time: 0.2 }, enemy = { type: "bullet-bill", alive: true, hp: 3, move, stunTimer: 0 };
  damage(enemy); assert.equal(enemy.hp, 3);
  for (const hp of [2, 1]) { damage(enemy, true); assert.equal(enemy.hp, hp); assert.equal(defeated, 0); }
  assert.equal(enemy.move, move); assert.equal(enemy.stunTimer, 0);
  damage(enemy, true); assert.equal(defeated, 1); assert.equal(enemy.alive, false);
  damage(enemy, true); assert.equal(defeated, 1);
});

test("砖块释放的新导弹初始3血，仍保留启动等待", () => {
  const make = new Function(`const BULLET_BILL_LAUNCH_DELAY = 1;
    ${extract("makeBulletBillEnemy")} return makeBulletBillEnemy;`)();
  const enemy = make(99, 4, 5, "right");
  assert.equal(enemy.hp, 3);
  assert.equal(enemy.launchDelay, 1);
  assert.equal(enemy.alive, true);
});
