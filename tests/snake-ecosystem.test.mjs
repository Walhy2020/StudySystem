import test from "node:test";
import assert from "node:assert/strict";
import { VirusField } from "../src/snake-upstream-v029/world.js";
import { VirusSnakes } from "../src/snake-upstream-v029/virus-snakes.js";
import { saveEcosystem, restoreEcosystem } from "../src/snake-ecosystem.js";

test("Snake ecosystem preserves consumed viruses, drops, moving enemies and respawn timers", () => {
  const field = new VirusField({ seed: 42 }), enemies = new VirusSnakes({ count: 5, seed: 13 });
  const player = { x: 150, y: -120 };
  field.sync(player); enemies.reset(player, 13);
  field.consume(field.nearby()[0].id); field.spill(player, 8); field.advance(.4, 22);
  enemies.advance(.2, { speed: 35, player, foods: field.nearby(), consume: id => field.consume(id) });
  enemies.snakes.pop(); enemies.respawns.push({ index: 4, remaining: 5.4 }); enemies.defeated = 1;
  const saved = JSON.parse(JSON.stringify(saveEcosystem(field, enemies)));
  const nextField = new VirusField(), nextEnemies = new VirusSnakes({ count: 5 });
  assert.equal(restoreEcosystem(saved, nextField, nextEnemies), true);
  assert.deepEqual(saveEcosystem(nextField, nextEnemies), saved);
  assert.deepEqual(nextField.nearby(), field.nearby());
  nextEnemies.advance(.01, { speed: 35, player });
  assert.notDeepEqual(nextEnemies.snakes[0].head, enemies.snakes[0].head);
});

test("Malformed ecosystem falls back without partially changing the active world", () => {
  const field = new VirusField({ seed: 42 }), enemies = new VirusSnakes({ count: 1 });
  field.sync({ x: 0, y: 0 }); enemies.reset();
  const original = JSON.parse(JSON.stringify(saveEcosystem(field, enemies)));
  for (const corrupt of [saved => saved.field.cells[0][1][0].x = Infinity,
    saved => saved.enemies.snakes[0].trail.points = [], saved => saved.enemies.snakes[0].head.x = 99999]) {
    const saved = structuredClone(original); corrupt(saved);
    assert.equal(restoreEcosystem(saved, field, enemies), false);
    assert.deepEqual(saveEcosystem(field, enemies), original);
  }
});
