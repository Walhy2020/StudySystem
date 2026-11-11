import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { loadChromium } from "./playwright-runtime.mjs";
const base=process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const key="mario-snake-game-progress-v1",source="mario-hanzi-refactor-v1";
mkdirSync("tmp",{recursive:true});
const browser=await(await loadChromium()).launch({headless:true,executablePath:"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"});
try {
 for(const width of [1440,390]) {
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:width===390});
  await context.route("**/api/controller-mouse**",r=>r.fulfill({json:{supported:true,mode:"web"}}));
  await context.addInitScript(()=>{
   if(!localStorage.getItem("mario-hanzi-refactor-v1"))localStorage.setItem("mario-hanzi-refactor-v1",JSON.stringify({records:{"0010":{status:"known",correctCount:1}}}));
   const fixture=sessionStorage.getItem("giant-fixture");
   if(fixture){localStorage.setItem("mario-snake-game-progress-v1",fixture);sessionStorage.removeItem("giant-fixture");}
   let callbacks=[],now=performance.now();window.__giantDraws=[];
   window.requestAnimationFrame=cb=>{callbacks.push(cb);return callbacks.length;};
   window.__step=(n=1)=>{for(let i=0;i<n;i++){now+=1000/60;const pending=callbacks;callbacks=[];pending.forEach(cb=>cb(now));}};
   const draw=CanvasRenderingContext2D.prototype.drawImage;
   CanvasRenderingContext2D.prototype.drawImage=function(img,...args){
    if(img.src?.includes("virus-giant-v1.png"))window.__giantDraws.push({src:img.src,args,width:img.naturalWidth,height:img.naturalHeight});
    return draw.call(this,img,...args);
   };
  });
  const page=await context.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  page.on("response",r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  const ready=()=>page.waitForFunction(()=>window.__snakeDemo?.getState().ready,null,{polling:50});
  const state=()=>page.evaluate(()=>__snakeDemo.getState());
  const persist=()=>page.evaluate(()=>window.dispatchEvent(new Event("pagehide")));
  const resume=async()=>{await page.locator("#resumeButton").click();await page.evaluate(()=>__step(6));};
  await page.goto(base+"snake-game.html?test=giant");await ready();await persist();
  const original=await page.evaluate(k=>localStorage.getItem(k),source);
  const baseline=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  const fixture=async(kind)=>{
   await page.evaluate(({baseline,kind})=>{
    const s=structuredClone(baseline);s.head={x:0,y:0};s.camera={x:0,y:0};s.angle=s.desiredAngle=0;
    s.config.speed=s.config.virusDriftSpeed=s.config.virusSnakeSpeed=0;s.config.virusSnakeCount=1;
    s.config.poisonInterval=5;s.config.antidoteCost=0;
    s.clock=0;s.glyphs=Array(300).fill("★");s.points=[{x:0,y:0},{x:-15000,y:0}];
    s.poison={active:false,nextPoisonAt:.05,nextDamageAt:60,poisonings:0};
    s.damageHits=s.capturedSuper=0;s.lastDamageAt=-10;
    const field=s.ecosystem.field,all=field.cells.flatMap(([,cell])=>cell);
    for(const v of all){v.consumed=true;v.respawnRemaining=600;}
    field.giants=[];field.giantPoisonings=0;field.drops=[];
    const npc=s.ecosystem.enemies.snakes[0];
    s.ecosystem.enemies.snakes=[];s.ecosystem.enemies.respawns=[];
    if(kind==="poison") {
     npc.head={x:0,y:-652};npc.previousHead={...npc.head};
     npc.trail.points=[{...npc.head},{x:0,y:-1000}];
     s.ecosystem.enemies.snakes=[npc];s.config.virusSnakeSpeed=1;
    }
    s.foods.forEach((f,i)=>Object.assign(f,{x:450,y:200+i*130}));
    if(kind==="old-poison") { s.poison.active=true;s.poison.poisonings=7;delete field.giants;delete field.giantPoisonings; }
    if(["capture","open","contact","art"].includes(kind)) {
     s.poison={active:true,nextPoisonAt:600,nextDamageAt:600,poisonings:1};field.giantPoisonings=1;
     field.giants=[{...all[0],id:"poison-giant:1",tier:"giant",color:"violet",x:0,y:0,homeX:0,homeY:0,consumed:false}];
     if(kind==="capture"||kind==="open") {
      const arc=kind==="capture"?Math.PI*2-.08:Math.PI*1.6;
      s.points=Array.from({length:481},(_,i)=>({x:Math.cos(arc*i/480)*490,y:Math.sin(arc*i/480)*490}));
      s.head={...s.points[0]};
     } else if(kind==="contact") {s.head={x:430,y:0};s.points=[{...s.head},{x:2000,y:0}];}
     else {s.head={x:750,y:0};s.points=[{...s.head},{x:2000,y:0}];s.config.zoom=.4;}
    }
    sessionStorage.setItem("giant-fixture",JSON.stringify(s));
   },{baseline,kind});
   await page.reload();await ready();await page.evaluate(()=>__step(2));
  };
  await fixture("poison");assert.equal((await state()).viruses.filter(v=>v.tier==="giant").length,0);
  await resume();let s=await state();
  assert.equal(s.poison.active,true);assert.equal(s.viruses.filter(v=>v.tier==="giant").length,1);
  assert.equal(s.virusSnakes.length,1,"active NPCs cannot eat giants or crash on their new type");
  const giant=s.viruses.find(v=>v.tier==="giant");
  assert.ok(Math.hypot(giant.x-s.head.x,giant.y-s.head.y)>=652);
  assert.ok(s.foods.every(f=>Math.hypot(giant.x-f.x,giant.y-f.y)>497));
  await page.evaluate(()=>__step(90));
  assert.equal((await state()).viruses.filter(v=>v.tier==="giant").length,1,"not one per frame or damage tick");
  const drawn=await page.evaluate(()=>__giantDraws.at(-1));
  assert.ok(drawn,"approved image actually drawn on canvas");assert.equal(drawn.width,1254);assert.equal(drawn.height,1254);
  assert.deepEqual(drawn.args,[-432,-432,864,864]);
  await persist();await page.reload();await ready();
  assert.equal((await state()).viruses.filter(v=>v.tier==="giant").length,1,"reload keeps one giant");
  await resume();await page.keyboard.press("g");await page.evaluate(()=>__step(310));await persist();
  const second=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  assert.equal(second.poison.poisonings,2);assert.equal(second.ecosystem.field.giants.length,2,"next poisoning adds exactly one");
  await fixture("old-poison");await persist();await page.reload();await ready();
  assert.equal((await state()).viruses.filter(v=>v.tier==="giant").length,1,"old active poison save upgrades only once");
  await fixture("art");await page.screenshot({path:`tmp/snake-giant-art-${width}.png`});
  await resume();await page.screenshot({path:`tmp/snake-giant-active-${width}.png`});
  await fixture("contact");await resume();assert.ok((await state()).damage.hits>0,"giant collision uses enlarged radius");
  await fixture("open");await resume();assert.equal((await state()).enclosure.capturedSuper,0,"open loop cannot capture giant");
  await fixture("capture");await resume();s=await state();
  assert.equal(s.enclosure.capturedSuper,1,"full giant can be encircled");
  assert.ok(!s.viruses.some(v=>v.tier==="giant"));
  assert.ok(s.viruses.filter(v=>v.id.startsWith("drop:")).length>=6,"capture leaves loot");
  await persist();await page.reload();await ready();await resume();await page.evaluate(()=>__step(30));
  assert.equal((await state()).enclosure.capturedSuper,1);assert.ok(!(await state()).viruses.some(v=>v.tier==="giant"),"captured giant stays gone after reload");
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),source),original);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  console.log(`PASS Edge ${width}: poison spawn once, safe placement, approved 864px art, reload/old save, next poisoning, collision, capture/loot, storage and resources`);
  await context.close();
 }
} finally { await browser.close(); }
