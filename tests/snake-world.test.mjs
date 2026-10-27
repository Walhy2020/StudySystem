import test from "node:test";
import assert from "node:assert/strict";
import { VirusField } from "../src/snake-world.js";
import { VirusSnakes } from "../src/snake-upstream-v029/virus-snakes.js";
import { saveEcosystem, restoreEcosystem } from "../src/snake-ecosystem.js";

test("small/medium world viruses return after ten playing seconds, including old consumed saves",()=>{
  const field=new VirusField({seed:42}); field.sync({x:0,y:0});
  const victims=["small","medium","large","super"].map(tier=>field.nearby().find(v=>v.tier===tier));
  assert.ok(victims.every(Boolean));
  for (const v of victims) field.consume(v.id);
  field.advance(9,0,{x:6000,y:6000});
  assert.ok(victims.every(v=>v.consumed));
  field.advance(1,0,{x:6000,y:6000});
  assert.deepEqual(victims.map(v=>v.consumed),[false,false,true,true]);
  assert.equal(victims[0].x,victims[0].homeX);
});
test("respawn waits for player clearance, keeps drop loot single-use, and preserves remaining time across refresh",()=>{
  const field=new VirusField({seed:42}), enemies=new VirusSnakes({count:0});
  field.sync({x:0,y:0}); enemies.reset();
  const v=field.nearby().find(v=>v.tier==="small"), drop=field.spill({x:0,y:0},8).find(v=>v.tier==="small");
  field.consume(v.id); field.consume(drop.id); field.advance(4,0,{x:6000,y:6000});
  const restored=new VirusField(), nextEnemies=new VirusSnakes({count:0});
  assert.equal(restoreEcosystem(JSON.parse(JSON.stringify(saveEcosystem(field,enemies))),restored,nextEnemies),true);
  const next=[...restored.cells.values()].flat().find(item=>item.id===v.id);
  restored.advance(6,0,{x:next.homeX,y:next.homeY}); assert.equal(next.consumed,true);
  restored.advance(.1,0,{x:6000,y:6000}); assert.equal(next.consumed,false);
  assert.equal(restored.drops.find(item=>item.id===drop.id).consumed,true);
});
