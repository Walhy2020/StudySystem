import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { loadChromium } from "./playwright-runtime.mjs";
const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const key = "mario-snake-game-progress-v1", hanzi = "mario-hanzi-refactor-v1";
mkdirSync("tmp", { recursive: true });
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
try {
  for (const width of [1440,390]) {
    const context = await browser.newContext({viewport:{width,height:900}});
    await context.route("**/api/controller-mouse**", r => r.fulfill({json:{supported:true,mode:"web"}}));
    await context.addInitScript(() => {
      if (!localStorage.getItem("mario-hanzi-refactor-v1")) localStorage.setItem("mario-hanzi-refactor-v1",JSON.stringify({records:{"0010":{status:"known",correctCount:1}}}));
      const fixture=sessionStorage.getItem("snake-pool-poison-fixture");
      if(fixture){localStorage.setItem("mario-snake-game-progress-v1",fixture);sessionStorage.removeItem("snake-pool-poison-fixture");}
      let callbacks=[], now=performance.now();
      window.requestAnimationFrame=cb=>{callbacks.push(cb);return callbacks.length;};
      window.__step=n=>{for(let i=0;i<n;i++){now+=1000/60;const pending=callbacks;callbacks=[];pending.forEach(cb=>cb(now));}};
      window.__poisonDraws=0;window.__poisonCanvasDraws=0;window.__filters=0;
      const draw=CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
        if(this.canvas.id==="game" && image.dataset?.snakePoisonSprite){
          window.__poisonDraws++;if(!(image instanceof HTMLImageElement))window.__poisonCanvasDraws++;
        }
        if(this.canvas.id==="game" && this.filter!=="none")window.__filters++;
        return draw.call(this,image,...args);
      };
    });
    const page=await context.newPage(), errors=[];
    page.on("pageerror", e=>errors.push(e.message));
    page.on("response", r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    const ready=()=>page.waitForFunction(()=>window.__snakeDemo?.getState().ready,null,{polling:50});
    const state=()=>page.evaluate(()=>window.__snakeDemo.getState());
    const step=n=>page.evaluate(n=>window.__step(n),n);
    await page.goto(base+"snake-game.html?test=pool-poison");await ready();
    assert.deepEqual((await state()).learning.runIds,["0010"]);
    assert.ok((await state()).foods.every(f=>f.wordId==="0010"));
    const source=await page.evaluate(key=>localStorage.getItem(key),hanzi);
    // Reproduce a legacy padded run whose current target and food were unstudied.
    await page.evaluate(key=>{
      const saved=JSON.parse(localStorage.getItem(key));
      saved.learning.runIds=["0001","0010","0002"];
      saved.learning.targets=["0001","0010"];saved.learning.done=[];
      saved.learning.active="0001";saved.learning.retry=["0002"];
      saved.foods=[{x:100,y:100,wordId:"0001",correct:true,glyph:"一"}];
      saved.config.poisonTickInterval=1;saved.config.poisonSpeedPercent=50;
      saved.config.virusSnakeCount=0;saved.config.poisonInterval=600;
      saved.poison={active:true,nextPoisonAt:saved.clock+600,nextDamageAt:saved.clock+1,poisonings:1};
      sessionStorage.setItem("snake-pool-poison-fixture",JSON.stringify(saved));
    },key);
    await page.reload();await ready();await step(2);
    const restored=await state();
    assert.deepEqual(restored.learning.runIds,["0010"]);
    assert.deepEqual(restored.learning.targets,["0010"]);
    assert.ok(restored.foods.length>0 && restored.foods.every(f=>f.wordId==="0010"));
    assert.equal(restored.poison.active,true);
    const length=restored.length;
    await page.locator("#resumeButton").click();await step(70);
    const active=await state();
    assert.equal(active.poison.active,true);assert.equal(active.speed,active.config.speed*.5);
    assert.ok(active.length<length,"poison still removes tail segments");
    assert.ok(await page.evaluate(()=>window.__poisonDraws>0));
    assert.equal(await page.evaluate(()=>window.__poisonCanvasDraws+window.__filters),0,"poison uses decoded images without frame filters");
    assert.equal(await page.evaluate(key=>localStorage.getItem(key),hanzi),source);
    await page.screenshot({path:`tmp/snake-pool-poison-${width}.png`});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.evaluate(hanzi=>localStorage.setItem(hanzi,JSON.stringify({records:{},dailyNewIds:["0001"]})),hanzi);
    await page.reload();await ready();await step(2);
    assert.deepEqual((await state()).learning.targets,[]);
    assert.deepEqual((await state()).foods,[]);
    assert.equal(await page.locator("#resumeButton").isDisabled(),true);
    assert.match(await page.locator("#pauseTitle").textContent(),/请先到汉字模块学习/);
    assert.deepEqual(errors,[]);
    console.log(`PASS Microsoft Edge ${width}: learned-only pool, padded-save repair, empty pool, actual poison image draws/speed/tail, source isolation`);
    await context.close();
  }
} finally {await browser.close();}
