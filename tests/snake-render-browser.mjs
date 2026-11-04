import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { loadChromium } from "./playwright-runtime.mjs";
const base=process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const key="mario-snake-game-progress-v1";
mkdirSync("tmp",{recursive:true});
const browser=await(await loadChromium()).launch({headless:true,executablePath:"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"});
const results=[];
try{
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:width===390});
  await context.route("**/api/controller-mouse**",r=>r.fulfill({json:{supported:true,mode:"web"}}));
  await context.addInitScript(()=>{
   if(!localStorage.getItem("mario-hanzi-refactor-v1"))localStorage.setItem("mario-hanzi-refactor-v1",JSON.stringify({records:{"0010":{status:"known",correctCount:1}}}));
   const fixture=sessionStorage.getItem("snake-render-fixture");
   if(fixture){localStorage.setItem("mario-snake-game-progress-v1",fixture);sessionStorage.removeItem("snake-render-fixture");}
   window.__pad={connected:true,mapping:"standard",id:"Render check",index:0,axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};
   Object.defineProperty(navigator,"getGamepads",{value:()=>[__pad]});
   let callbacks=[],time=performance.now();window.__drawOrder=[];window.__starDraws=0;
   window.requestAnimationFrame=cb=>{callbacks.push(cb);return callbacks.length;};
   window.__step=(n=1)=>{for(let i=0;i<n;i++){time+=1000/60;const pending=callbacks;callbacks=[];__drawOrder=[];__starDraws=0;pending.forEach(cb=>cb(time));}};
   const draw=CanvasRenderingContext2D.prototype.drawImage,text=CanvasRenderingContext2D.prototype.fillText;
   CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
    if(this.canvas.id==="game"){
     if(image.src?.includes("hanzi-star") || image.src?.includes("star-poison")){__starDraws++;__drawOrder.push("star");}
     if(image.src?.includes("flystar-head"))__drawOrder.push("head");
    }
    return draw.call(this,image,...args);
   };
   CanvasRenderingContext2D.prototype.fillText=function(value,...args){if(this.canvas.id==="game")__drawOrder.push(`text:${value}`);return text.call(this,value,...args);};
  });
  const page=await context.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(e.message));page.on("response",r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  const ready=()=>page.waitForFunction(()=>window.__snakeDemo?.getState().ready,null,{polling:50});
  const state=()=>page.evaluate(()=>__snakeDemo.getState());
  await page.goto(base+"snake-game.html?test=render");await ready();await page.evaluate(()=>window.dispatchEvent(new Event("pagehide")));
  const baseline=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
  const originalSource=await page.evaluate(()=>localStorage.getItem("mario-hanzi-refactor-v1"));
  const fixture=async(shape,type="hanzi")=>{
   await page.evaluate(({baseline,shape,type})=>{
    const s=structuredClone(baseline);s.glyphs=Array(2000).fill("★");s.config.speed=0;s.config.virusSnakeCount=0;
    s.clock=0;s.poison={active:false,nextPoisonAt:600,nextDamageAt:600,poisonings:0};
    s.ecosystem.enemies.snakes=[];s.ecosystem.enemies.respawns=[];s.ecosystem.field.drops=[];
    for(const [,cell]of s.ecosystem.field.cells)for(const v of cell){v.consumed=true;v.respawnRemaining=600;}
    s.head={x:0,y:0};s.camera={x:0,y:0};s.angle=s.desiredAngle=0;
    s.points=shape==="coiled"?Array.from({length:6000},(_,i)=>({x:Math.cos(i*.04)*180-180,y:Math.sin(i*.04)*180})):[{x:0,y:0},{x:-30000,y:0}];
    const word=MARIO_WORD_BANK.find(w=>w.id==="0010"),glyph=type==="hanzi"?word.char:MARIO_PINYIN_READINGS.getReadings(word,MARIO_WORD_BANK).join(" / ");
    Object.assign(s.learning,{batch:type==="hanzi"?1:2,targets:[word.id],runIds:[word.id],active:word.id,shown:true,done:[],options:[{wordId:word.id,glyph,correct:true}]});
    s.choiceLayout=2;s.foods=[{wordId:word.id,glyph,correct:true,x:-120,y:0}];
    sessionStorage.setItem("snake-render-fixture",JSON.stringify(s));
   },{baseline,shape,type});
   await page.reload();await ready();await page.evaluate(()=>__step(2));
  };
  for(const shape of ["straight","coiled"]){
   await fixture(shape);
   const data=await page.evaluate(()=>{
    const times=[];const ctx=document.querySelector("#game").getContext("2d");
    for(let i=0;i<15;i++){const begin=performance.now();__step();ctx.getImageData(0,0,1,1);if(i>2)times.push(performance.now()-begin);}
    return{draws:__starDraws,medianMs:times.sort((a,b)=>a-b)[Math.floor(times.length/2)],length:__snakeDemo.getState().length};
   });
   assert.equal(data.length,2000);assert.ok(data.draws<(shape==="straight"?300:1600));
   results.push({width,shape,...data});
  }
  for(const type of ["hanzi","pinyin"]){
   await fixture("straight",type);
   await page.locator("#resumeButton").click();await page.locator("#game").focus();await page.evaluate(()=>__step(2));
   const choice=(await state()).foods[0].glyph.split(" / ")[0];
   const order=()=>page.evaluate(choice=>({choice:__drawOrder.lastIndexOf(`text:${choice}`),star:__drawOrder.lastIndexOf("star"),head:__drawOrder.lastIndexOf("head")}),choice);
   let drawOrder=await order();assert.ok(drawOrder.choice>=0 && drawOrder.choice<drawOrder.star,"normal stacking is preserved");
   await page.keyboard.down("h");await page.evaluate(()=>__step(2));
   assert.equal((await state()).readingSlow,true);drawOrder=await order();
   assert.ok(drawOrder.choice>drawOrder.star && drawOrder.choice>drawOrder.head,"reading choice is painted after all body/head sprites");
   await page.screenshot({path:`tmp/snake-reading-${type}-${width}.png`});
   await page.keyboard.up("h");await page.evaluate(()=>__step(2));assert.equal((await state()).readingSlow,false);
   await page.evaluate(()=>{const b=__snakeDemo.getState().bindings.slow.button;__pad.buttons[b]={pressed:true,value:1};__step(3);});
   assert.equal((await state()).readingSlow,true);drawOrder=await order();assert.ok(drawOrder.choice>drawOrder.star);
   await page.evaluate(()=>{const b=__snakeDemo.getState().bindings.slow.button;__pad.buttons[b]={pressed:false,value:0};__step(3);});
   if(width===390){
    const b=await page.locator("#slowButton").boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.evaluate(()=>__step(2));
    assert.equal((await state()).readingSlow,true);drawOrder=await order();assert.ok(drawOrder.choice>drawOrder.star);
    await page.mouse.up();await page.evaluate(()=>__step(2));assert.equal((await state()).readingSlow,false);
   }
  }
  assert.equal(await page.evaluate(()=>localStorage.getItem("mario-hanzi-refactor-v1")),originalSource);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  console.log(`PASS Edge ${width}: 2000-segment culling/coalescing, length preserved; Hanzi/Pinyin reading layer with keyboard/pad/touch`);
  await context.close();
 }
 writeFileSync("tmp/snake-render-metrics.json",JSON.stringify(results,null,2));console.log(JSON.stringify(results));
}finally{await browser.close();}
