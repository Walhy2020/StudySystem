import test from "node:test";
import assert from "node:assert/strict";
import { createStarBatch } from "../src/snake-drawing.js";
import { StarBursts, MAX_STAR_PARTICLES } from "../src/snake-upstream-v029/star-burst.js";

test("star batches cull only fully off-screen sprites and keep edge-crossing stars",()=>{
  const calls=[],ctx={drawImage:(...args)=>calls.push(args)};
  const draw=createStarBatch(ctx,{camera:{x:1000,y:500},width:200,height:100,zoom:2});
  assert.equal(draw("star",1061,500,20,"body"),false);
  assert.equal(draw("star",1060,500,20,"body"),true);
  assert.equal(draw("star",1000,536,20,"body"),false);
  assert.equal(calls.length,1);
});

test("only nearly coincident stars share a draw; separate layers, positions and frames remain visible",()=>{
  const calls=[],ctx={drawImage:(...args)=>calls.push(args)},view={camera:{x:0,y:0},width:200,height:100,zoom:2};
  const draw=createStarBatch(ctx,view);
  assert.equal(draw("gold",0,0,74,"body"),true);
  assert.equal(draw("gold",.1,.1,74,"body"),false);
  assert.equal(draw("gold",4,0,74,"body"),true);
  assert.equal(draw("gold",0,0,40,"links"),true);
  assert.equal(draw("green",0,0,84),true,"growing stars remain independent");
  assert.equal(createStarBatch(ctx,view)("green",0,0,74,"body"),true,"a new frame/poison sprite is never skipped");
  assert.equal(calls.length,5);
});

test("rapid glyph rewards keep bounded recent star effects without affecting their expiry",()=>{
  const bursts=new StarBursts(()=>.5);
  for(let i=0;i<50;i++)bursts.add(i,0,0);
  assert.equal(bursts.particles.length,MAX_STAR_PARTICLES);
  assert.ok(bursts.particles.every(p=>p.x>=42));
  assert.equal(bursts.active(.5).length,MAX_STAR_PARTICLES);
  assert.equal(bursts.active(3).length,0);
});
