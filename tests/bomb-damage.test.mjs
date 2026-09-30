import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../bomb-game.js", import.meta.url), "utf8");
const start = source.indexOf("  function damageEnemy(");
const damageSource = source.slice(start, source.indexOf("\n  }", start) + 4);

test("小蘑菇只扣1血，不打晕、打断移动或解除冰冻", () => {
  for (const type of ["mushroom", "koopa-green", "bowser"]) {
    const particles = [], messages = [];
    const damage = new Function("particles", "messages", `
      const ENEMY_HIT_COOLDOWN = 0.68, TOUGH_ENEMY_STUN_TIME = 3;
      const defeatEnemy = enemy => { enemy.alive = false; };
      const spawnShell = () => {};
      const spawnParticles = type => particles.push(type);
      const setMessage = message => messages.push(message);
      ${damageSource}
      return damageEnemy;
    `)(particles, messages);
    const move = { fromX: 4, fromY: 3, toX: 5, toY: 3, time: 0.2, duration: 0.6 };
    const enemy = { type, hp: 3, alive: true, hitCooldown: 0, gx: 4.3, gy: 3,
      move, stunTimer: 0, freezeTimer: 2, fireCooldown: 1.2 };
    damage(enemy, true);
    assert.equal(enemy.hp, 2);
    assert.equal(enemy.stunTimer, 0);
    assert.equal(enemy.gx, 4.3);
    assert.equal(enemy.move, move);
    assert.equal(enemy.freezeTimer, 2);
    assert.equal(enemy.fireCooldown, 1.2);
    assert.deepEqual(particles, []);
    assert.ok(messages.every(message => !message.includes("眩晕")));
    damage(enemy, true);
    assert.equal(enemy.hp, 1, "second mushroom still deals exactly one damage");
    damage(enemy, true);
    assert.equal(enemy.alive, false);
  }
});
