import test from "node:test";
import assert from "node:assert/strict";
import { HoldVacuum, PoisonState, pullViruses, speedForInput } from "../src/snake-actions.js";
import { DEFAULT_BINDINGS, normalizeBindings, bindingError } from "../src/snake-bindings.js";
import { normalizeConfig } from "../src/snake-config.js";
test("vacuum expires after three seconds while held and rearms only after release", () => {
  const vacuum = new HoldVacuum();
  vacuum.press("keyboard", 5); assert.equal(vacuum.active(7.9), true); assert.equal(vacuum.active(8), false);
  vacuum.press("keyboard", 8.1); assert.equal(vacuum.active(8.1), false);
  vacuum.press("pad", 8.1); vacuum.release("keyboard"); assert.equal(vacuum.active(8.2), false);
  vacuum.release("pad"); vacuum.press("pad", 9); assert.equal(vacuum.remaining(9.5), 2.5);
  vacuum.reset(); assert.equal(vacuum.active(9.5), false);
});
test("only front-facing nearby small and medium viruses are pulled without crossing the head", () => {
  const viruses = [{tier:"small",x:180,y:0},{tier:"medium",x:200,y:30},{tier:"large",x:180,y:0},
    {tier:"super",x:180,y:0},{tier:"small",x:-100,y:0},{tier:"small",x:400,y:0}];
  pullViruses(viruses, {x:0,y:0}, 0, .2);
  assert.ok(viruses[0].x < 180 && viruses[0].x >= 0); assert.ok(viruses[1].x < 200);
  assert.deepEqual(viruses.slice(2), [{tier:"large",x:180,y:0},{tier:"super",x:180,y:0},{tier:"small",x:-100,y:0},{tier:"small",x:400,y:0}]);
  pullViruses(viruses, {x:0,y:0}, 0, 10); assert.equal(viruses[0].x, 0);
});
test("aligned held input adds configurable speed; idle and turning retain base speed", () => {
  const config = normalizeConfig({speed:100});
  assert.equal(config.alignedSpeedBoost, 50); assert.equal(speedForInput(config,0,0),150);
  assert.equal(speedForInput(config,0,null),100); assert.equal(speedForInput(config,0,Math.PI/2),100);
  assert.equal(speedForInput(config,Math.PI,-Math.PI),150);
  assert.equal(speedForInput(normalizeConfig({speed:100,alignedSpeedBoost:75}),0,0),175);
  assert.equal(speedForInput(normalizeConfig({speed:100,alignedSpeedBoost:0}),0,0),100);
  assert.equal(normalizeConfig({alignedSpeedBoost:Infinity}).alignedSpeedBoost,50);
});
test("configured vacuum range changes reach without pulling larger viruses", () => {
  const viruses=[{tier:"small",x:350,y:0},{tier:"large",x:350,y:0}];
  pullViruses(viruses,{x:0,y:0},0,.1,260); assert.equal(viruses[0].x,350);
  pullViruses(viruses,{x:0,y:0},0,.1,400); assert.ok(viruses[0].x<350); assert.equal(viruses[1].x,350);
});
test("poison halves normal movement including aligned boost and cure restores full speed", () => {
  const config=normalizeConfig({speed:100});
  assert.equal(speedForInput(config,0,null,true),50);
  assert.equal(speedForInput(config,0,0,true),75);
  assert.equal(speedForInput(config,0,null,false),100);
  assert.equal(speedForInput(normalizeConfig({speed:100,poisonSpeedPercent:60}),0,null,true),60);
});
test("poison persists, damages continuously, requires stars and schedules the next poisoning after cure", () => {
  const config=normalizeConfig(), poison=new PoisonState(0,config), losses=[];
  poison.update(29.9,config,n=>losses.push(n)); assert.equal(poison.active,false);
  poison.update(30,config,n=>losses.push(n)); assert.equal(poison.active,true); assert.deepEqual(losses,[]);
  poison.update(31,config,n=>losses.push(n)); poison.update(32,config,n=>losses.push(n)); assert.deepEqual(losses,[1,1]);
  assert.deepEqual(poison.cure(4,config,32),{cured:false,stars:4}); assert.equal(poison.active,true);
  const restored=new PoisonState(0,config); restored.restore(poison.snapshot(),32,config);
  assert.equal(restored.active,true); assert.equal(restored.nextDamageAt,poison.nextDamageAt);
  restored.update(33,config,n=>losses.push(n)); assert.deepEqual(losses,[1,1,1]);
  assert.deepEqual(restored.cure(8,config,33),{cured:true,stars:3}); assert.equal(restored.active,false);
  restored.update(62.9,config,()=>assert.fail()); assert.equal(restored.active,false);
  restored.update(63,config,()=>assert.fail()); assert.equal(restored.active,true);
});
test("poison parameters reconfigure the active schedule and tail loss", () => {
  const base=normalizeConfig(), config=normalizeConfig({poisonInterval:5,poisonTickInterval:.5,poisonTailLoss:3,antidoteCost:2});
  const poison=new PoisonState(0,base), losses=[];
  poison.configure(base,config,2); poison.update(7,config,n=>losses.push(n));
  poison.update(7.5,config,n=>losses.push(n)); assert.deepEqual(losses,[3]);
  assert.deepEqual(poison.cure(2,config,8),{cured:true,stars:0}); assert.equal(poison.nextPoisonAt,13);
});
test("shortcut normalization preserves saved swaps and rejects shared or duplicate controls", () => {
  const swapped={vacuum:{key:"KeyG",button:1},antidote:{key:"KeyF",button:2}};
  assert.deepEqual(normalizeBindings(swapped),{...swapped,slow:DEFAULT_BINDINGS.slow});
  assert.deepEqual(normalizeBindings({vacuum:{key:"Space",button:7}}),DEFAULT_BINDINGS);
  assert.ok(bindingError(DEFAULT_BINDINGS,"vacuum","key","KeyG"));
  assert.ok(bindingError(DEFAULT_BINDINGS,"vacuum","button",1));
  assert.deepEqual(normalizeBindings({vacuum:{key:"KeyH",button:6},antidote:{key:"KeyH",button:6}}),DEFAULT_BINDINGS);
});

test("reading slow has an editable speed cap, suppresses boost and never speeds up poison",()=>{
  const config=normalizeConfig({speed:100});
  assert.equal(speedForInput(config,0,0,false,true),50);
  assert.equal(speedForInput(config,0,null,false,true),50);
  assert.equal(speedForInput(normalizeConfig({speed:100,readingSpeedPercent:25}),0,0,true,true),25);
  assert.equal(speedForInput(normalizeConfig({speed:100,readingSpeedPercent:80}),0,0,true,true),50);
  assert.equal(speedForInput(config,0,0,false,false),150);
});
test("new slow shortcut preserves old custom controls and all three actions stay unique",()=>{
  const old={vacuum:{key:"KeyH",button:6},antidote:{key:"KeyJ",button:11}};
  const next=normalizeBindings(old);
  assert.deepEqual(next.vacuum,old.vacuum); assert.deepEqual(next.antidote,old.antidote);
  assert.equal(next.slow.key,"KeyR"); assert.equal(next.slow.button,10);
  assert.deepEqual(normalizeBindings(next),next);
  assert.match(bindingError(next,"slow","key","KeyH"),/吸取/);
  assert.match(bindingError(DEFAULT_BINDINGS,"vacuum","button",6),/阅读减速/);
});
