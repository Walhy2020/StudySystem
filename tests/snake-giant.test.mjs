import test from "node:test";
import assert from "node:assert/strict";
import { VirusField } from "../src/snake-world.js";
import { VIRUS_TYPES, GIANT_VIRUS_SIZE } from "../src/snake-virus-types.js";
import { WORLD_BOUNDS, setWorldSize } from "../src/snake-upstream-v029/world.js";
import { VirusSnakes } from "../src/snake-upstream-v029/virus-snakes.js";
import { saveEcosystem, restoreEcosystem } from "../src/snake-ecosystem.js";
import { pullViruses } from "../src/snake-actions.js";

test("poison creates one dedicated giant per cycle, three times the original boss diameter", () => {
  const field = new VirusField({seed:42}); field.sync({x:0,y:0});
  assert.equal(GIANT_VIRUS_SIZE, VIRUS_TYPES.find(t=>t.tier==="super").size*3);
  assert.equal(field.giants.length,0,"normal streamed world never generates giants");
  assert.equal(field.spawnPoisonGiant(1,{x:0,y:0}),true);
  for(let i=0;i<20;i++) assert.equal(field.spawnPoisonGiant(1,{x:0,y:0}),false);
  assert.equal(field.giants.length,1);
  const giant = {...field.giants[0]};
  pullViruses(field.giants,{x:giant.x+80,y:giant.y},0,1,1000);
  assert.deepEqual(field.giants[0],giant,"vacuum cannot pull giants");
  field.consume(giant.id);
  assert.equal(field.spawnPoisonGiant(1,{x:0,y:0}),false,"captured giant does not respawn in the same poisoning");
  assert.equal(field.spawnPoisonGiant(2,{x:0,y:0}),true);
  assert.equal(field.giants.length,1);
});

test("giant placement keeps its entire radius inside the map, clear of player and choices", () => {
  setWorldSize(3200);
  try {
    for(const player of [{x:0,y:0},{x:1530,y:1530},{x:-1530,y:-1530},{x:1530,y:-1530}]) {
      const field = new VirusField({seed:42}); field.sync(player);
      const choices=[{x:player.x-250,y:player.y-250},{x:player.x+250,y:player.y+250}];
      assert.equal(field.spawnPoisonGiant(1,player,choices),true);
      const giant=field.giants[0],r=GIANT_VIRUS_SIZE/2;
      assert.ok(Math.hypot(giant.x-player.x,giant.y-player.y)>=r+220);
      assert.ok(giant.x-r>=WORLD_BOUNDS.minX && giant.x+r<=WORLD_BOUNDS.maxX);
      assert.ok(giant.y-r>=WORLD_BOUNDS.minY && giant.y+r<=WORLD_BOUNDS.maxY);
      assert.ok(choices.every(p=>Math.hypot(giant.x-p.x,giant.y-p.y)>r+65));
      const blocked={x:giant.x,y:giant.y};
      assert.equal(field.placeGiant(giant,player,[blocked]),true);
      assert.ok(Math.hypot(giant.x-blocked.x,giant.y-blocked.y)>r+65);
    }
  } finally { setWorldSize(12800); }
});

test("alive and captured poison giants persist without duplication; old ecosystems remain valid", () => {
  const field=new VirusField({seed:42}),enemies=new VirusSnakes({count:0});
  field.sync({x:0,y:0});enemies.reset();field.spawnPoisonGiant(3,{x:0,y:0});
  const roundTrip=()=>{
    const next=new VirusField(),npc=new VirusSnakes({count:0});
    assert.equal(restoreEcosystem(JSON.parse(JSON.stringify(saveEcosystem(field,enemies))),next,npc),true);
    return next;
  };
  const alive=roundTrip();assert.equal(alive.giants.length,1);
  assert.equal(alive.spawnPoisonGiant(3,{x:0,y:0}),false);
  field.consume(field.giants[0].id);
  const captured=roundTrip();assert.equal(captured.giants.length,0);
  assert.equal(captured.spawnPoisonGiant(3,{x:0,y:0}),false);
  const old=saveEcosystem(field,enemies);delete old.field.giants;delete old.field.giantPoisonings;
  assert.equal(restoreEcosystem(old,captured,new VirusSnakes({count:0})),true);
  assert.equal(captured.spawnPoisonGiant(3,{x:0,y:0}),true);
  captured.reset();assert.equal(captured.giants.length,0);assert.equal(captured.giantPoisonings,0);
});
