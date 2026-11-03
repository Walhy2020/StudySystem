import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { loadChromium } from "./playwright-runtime.mjs";
const base=process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const key="mario-snake-game-progress-v1",sourceKey="mario-hanzi-refactor-v1";
mkdirSync("tmp",{recursive:true});
const browser=await(await loadChromium()).launch({headless:true,executablePath:"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"});
try {
  for (const width of [1440,390]) {
    const context=await browser.newContext({viewport:{width,height:900},hasTouch:width===390});
    await context.route("**/api/controller-mouse**",r=>r.fulfill({json:{supported:true,mode:"web"}}));
    await context.addInitScript(()=>{
      if(!localStorage.getItem("mario-hanzi-refactor-v1"))localStorage.setItem("mario-hanzi-refactor-v1",JSON.stringify({records:{"0010":{status:"known",correctCount:1}}}));
      const fixture=sessionStorage.getItem("snake-contact-fixture");
      if(fixture){localStorage.setItem("mario-snake-game-progress-v1",fixture);sessionStorage.removeItem("snake-contact-fixture");}
      let callbacks=[],now=performance.now();
      window.requestAnimationFrame=cb=>{callbacks.push(cb);return callbacks.length;};
      window.__step=(n=1)=>{for(let i=0;i<n;i++){now+=1000/60;const pending=callbacks;callbacks=[];pending.forEach(cb=>cb(now));}};
    });
    const page=await context.newPage(),errors=[];
    page.on("pageerror",e=>errors.push(e.message));
    page.on("response",r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    const ready=()=>page.waitForFunction(()=>window.__snakeDemo?.getState().ready,null,{polling:50});
    const state=()=>page.evaluate(()=>__snakeDemo.getState());
    await page.goto(base+"snake-game.html?test=contacts");await ready();
    const originalSource=await page.evaluate(k=>localStorage.getItem(k),sourceKey);
    await page.evaluate(()=>window.dispatchEvent(new Event("pagehide")));
    const baseline=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
    const fixture=async scenario=>{
      await page.evaluate(({key,baseline,scenario})=>{
        const saved=structuredClone(baseline);
        saved.config.speed=0;saved.config.virusSnakeSpeed=0;saved.config.virusSnakeCount=1;
        saved.head={x:0,y:0};saved.camera={x:0,y:0};saved.points=[{x:0,y:0},{x:-1800,y:0}];
        saved.glyphs=Array(30).fill("★");saved.angle=saved.desiredAngle=0;
        saved.clock=0;saved.damageHits=saved.capturedSuper=0;saved.lastDamageAt=-10;
        saved.rewards.growthPoints=0;saved.rewards.stars=0;saved.collected=0;
        saved.poison={active:false,nextPoisonAt:600,nextDamageAt:600,poisonings:0};
        const field=saved.ecosystem.field,all=field.cells.flatMap(([,cell])=>cell);
        for(const v of all){v.consumed=true;v.respawnRemaining=600;}
        const make=(id,tier,x,y)=>({...all[0],id,tier,x,y,homeX:x,homeY:y,consumed:false});
        field.drops=[];
        const enemies=saved.ecosystem.enemies,enemy=enemies.snakes[0];
        enemies.snakes=[];enemies.respawns=[];enemies.defeated=0;
        if(scenario==="small")field.drops=[make("contact-a","small",80,0),make("contact-b","small",80,5)];
        else if(scenario==="enemy"){
          enemy.head={x:-170,y:0};enemy.previousHead={...enemy.head};
          enemy.trail.points=[{...enemy.head},{x:-500,y:0}];enemies.snakes=[enemy];
        }else{
          const radius=scenario==="tight"?165:180;
          const arc=scenario==="open"?Math.PI*1.6:scenario==="tight"?Math.PI*2:Math.PI*2-.35;
          saved.points=Array.from({length:241},(_,i)=>({x:Math.cos(arc*i/240)*radius,y:Math.sin(arc*i/240)*radius}));
          saved.head={...saved.points[0]};saved.camera={x:0,y:0};saved.glyphs=Array(100).fill("★");
          field.drops=[make("capture-boss","super",0,0)];
        }
        saved.foods.forEach((f,i)=>{f.x=480;f.y=300+i*140;});
        sessionStorage.setItem("snake-contact-fixture",JSON.stringify(saved));
      },{key,baseline,scenario});
      await page.reload();await ready();await page.evaluate(()=>__step(1));
      if(width===390)await page.locator("#resumeButton").tap();else await page.locator("#resumeButton").click();
      await page.evaluate(()=>__step(6));return state();
    };
    const small=await fixture("small");
    assert.ok(!small.viruses.some(v=>v.id.startsWith("contact-")));
    assert.equal(small.rewards.growthPoints,2,"both touching small viruses are consumed without waiting for separate frames");
    const enemy=await fixture("enemy");
    assert.equal(enemy.enemyDefeats,1,"an already overlapping stationary enemy dies immediately");
    assert.equal(enemy.virusSnakes.length,0);
    await page.evaluate(()=>__step(20));assert.equal((await state()).enemyDefeats,1,"defeat rewarded only once");
    for(const scenario of ["closed","tight","open"]){
      const after=await fixture(scenario),captured=scenario!=="open";
      assert.equal(after.enclosure.capturedSuper,captured?1:0,scenario);
      assert.equal(after.viruses.some(v=>v.id==="capture-boss"),!captured,scenario);
      assert.equal(after.length,captured?103:100,"capture growth awarded once");
      if(captured){
        const loot=after.viruses.filter(v=>v.id.startsWith("drop:"));
        assert.ok(loot.length>=6,"captured super virus leaves visible consumable loot");
        assert.ok(loot.every(v=>v.tier!=="super"));
        assert.ok(loot.some(v=>v.tier==="small") && loot.some(v=>v.tier==="medium"));
      }else assert.equal(after.viruses.filter(v=>v.id.startsWith("drop:")).length,0);
      if(scenario==="closed"){
        await page.screenshot({path:`tmp/snake-capture-${width}.png`});
        await page.evaluate(()=>window.dispatchEvent(new Event("pagehide")));
        await page.reload();await ready();
        assert.equal((await state()).enclosure.capturedSuper,1);
        assert.ok(!(await state()).viruses.some(v=>v.id==="capture-boss"));
        const restoredLoot=(await state()).viruses.filter(v=>v.id.startsWith("drop:"));
        assert.ok(restoredLoot.length>=6,"uneaten loot survives refresh");
        // Eat the central large drop using the real movement loop after reload.
        await page.evaluate(k=>{
          const saved=JSON.parse(localStorage.getItem(k));
          const loot=saved.ecosystem.field.drops.find(v=>v.id.startsWith("drop:")&&!v.consumed);
          saved.head={x:loot.x,y:loot.y};saved.points=[{...saved.head},{x:loot.x-1800,y:loot.y}];
          sessionStorage.setItem("snake-contact-fixture",JSON.stringify(saved));
        },key);
        await page.reload();await ready();
        const beforeLoot=await state();
        await page.locator("#resumeButton").click();await page.evaluate(()=>__step(2));
        const eatenLoot=await state();
        assert.ok(eatenLoot.viruses.filter(v=>v.id.startsWith("drop:")).length<restoredLoot.length,"loot can actually be eaten");
        assert.ok(eatenLoot.length*10+eatenLoot.rewards.growthPoints>beforeLoot.length*10+beforeLoot.rewards.growthPoints,"eating loot grants growth");
      }
    }
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),sourceKey),originalSource);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.deepEqual(errors,[]);
    console.log(`PASS Edge ${width}: contacts, enclosure and open-loop rejection; visible super-virus loot, saved loot and actual pickup growth`);
    await context.close();
  }
}finally{await browser.close();}
