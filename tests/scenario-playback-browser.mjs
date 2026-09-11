import assert from "node:assert/strict";
import { chromium } from "file:///C:/Users/St/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:53177/";
const browser = await chromium.launch({ headless:true, executablePath:"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const errors=[], results=[];
try {
  for (const width of [1440,390]) {
    const context=await browser.newContext({viewport:{width,height:960},hasTouch:width===390});
    await context.addInitScript(() => {
      window.__utterances=[]; window.__writes=[];
      const original=Storage.prototype.setItem;
      Storage.prototype.setItem=function(k,v){window.__writes.push(k);return original.call(this,k,v);};
      Object.defineProperty(window,"SpeechSynthesisUtterance",{configurable:true,value:class { constructor(text){this.text=text;} }});
      Object.defineProperty(window,"speechSynthesis",{configurable:true,value:{
        cancel(){},getVoices(){return [{lang:"en-GB"}];},
        speak(u){window.__utterances.push(u);}
      }});
    });
    const page=await context.newPage();
    page.on("pageerror",e=>errors.push(e.message));
    page.on("response",r=>{if(r.status()>=400)errors.push(r.status()+" "+r.url());});
    await page.goto(new URL("scenario-learning.html?test=playback-"+width,base).href);
    await page.locator("[data-start-label]").click();
    const present=(id)=>page.locator("#"+id).evaluate(el=>el.classList.contains("is-present"));
    assert.equal(await present("actorMia"),true);
    assert.equal(await present("actorLeo"),false);
    assert.equal(await page.evaluate(()=>window.__utterances.length),0);
    const start=page.locator("#playDialogue");
    await start.focus(); await page.keyboard.press("Enter");
    assert.equal(await page.locator("#actorMia").evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m41 < -10), true, "girl slides in from the left");
    await page.waitForFunction(()=>window.__utterances.length===1);
    assert.equal(await page.locator("#actorMia").evaluate(el => Math.abs(new DOMMatrix(getComputedStyle(el).transform).m41) < 1), true);
    assert.equal(await present("actorLeo"),false);
    await page.waitForTimeout(800);
    assert.equal(await page.evaluate(()=>window.__utterances.length),1,"must wait on actual speech end");
    await page.evaluate(()=>window.__utterances.at(-1).onend());
    await page.waitForFunction(()=>window.__utterances.length===2);
    assert.equal(await present("actorLeo"),true);
    assert.equal(await page.locator("#dialogueEnglish").textContent(),"Hi, Mia. I'm Leo.");
    assert.equal(await page.locator(".dialogue-line-button:visible").count(),1);
    const geometry=await page.evaluate(()=>{
      const english=document.querySelector("#dialogueEnglish").getBoundingClientRect();
      const ipa=document.querySelector("#dialoguePhonetic").getBoundingClientRect();
      const stage=document.querySelector("#actorStage").getBoundingClientRect();
      const images=[...document.querySelectorAll(".scene-actor")].map(img=>{
        const r=img.getBoundingClientRect(), canvas=document.createElement("canvas");
        canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
        const ctx=canvas.getContext("2d");ctx.drawImage(img,0,0);
        const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
        let clear=0,opaque=0;
        for(let i=3;i<pixels.length;i+=4){if(pixels[i]===0)clear++;if(pixels[i]===255)opaque++;}
        return {fits:r.left>=stage.left && r.right<=stage.right && r.top>=stage.top && r.bottom<=stage.bottom,clear,opaque};
      });
      return {ipaBelow:ipa.top>=english.bottom-1,noOverflow:document.documentElement.scrollWidth<=innerWidth,images};
    });
    assert.equal(geometry.ipaBelow,true);assert.equal(geometry.noOverflow,true);
    assert.ok(geometry.images.every(x=>x.fits&&x.clear>1000&&x.opaque>1000),JSON.stringify(geometry));
    await page.screenshot({path:"tests/scenario-playback-"+width+".png",fullPage:true});
    // Pause does not allow stale completion to reveal the following sentence.
    await start.click();
    await page.evaluate(()=>window.__utterances.at(-1).onend());
    await page.waitForTimeout(450);
    assert.equal(await page.locator("#dialogueProgress").textContent(),"2/6");
    assert.equal(await start.getAttribute("aria-pressed"),"false");
    await start.click();
    await page.waitForFunction(()=>window.__utterances.length===3);
    for(let index=1;index<6;index++){
      assert.equal(await page.locator("#dialogueProgress").textContent(),(index+1)+"/6");
      await page.evaluate(()=>window.__utterances.at(-1).onend());
      if(index<5) await page.waitForFunction(n=>window.__utterances.length>=n,index+3);
    }
    await page.waitForFunction(()=>document.querySelector("#playbackStatus").textContent==="对话播放完毕");
    assert.equal(await page.evaluate(()=>window.__SCENARIO_LEARNING__.store.state.completedScenarioIds.length),0);
    assert.deepEqual(await page.evaluate(()=>window.__SCENARIO_LEARNING__.store.state.learnedWords),[]);
    if(width===390)await page.locator("#replayDialogue").tap();else await page.locator("#replayDialogue").click();
    await page.waitForFunction(()=>window.__utterances.length===8);
    assert.equal(await present("actorLeo"),false);
    await page.locator("#nextLine").click();
    await page.evaluate(()=>window.__utterances.at(-1).onend());
    await page.waitForTimeout(500);
    assert.equal(await page.locator("#dialogueProgress").textContent(),"2/6");
    await start.click();
    await page.waitForFunction(()=>window.__utterances.length===9);
    await page.locator("#openScenarioWords").click();
    await page.evaluate(()=>window.__utterances.at(-1).onend());
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(()=>window.__utterances.length),9);
    assert.ok((await page.evaluate(()=>window.__writes)).every(k=>k==="mario-scenario-learning-v1:test:playback-"+width));
    await page.locator("#closeWorkshop").click();
    await page.locator("[data-start-label]").click();
    await page.evaluate(()=>{Object.defineProperty(window,"speechSynthesis",{value:undefined});});
    // Test unavailable browser API on a fresh load, not by changing the captured speaker.
    await context.close();
    results.push({width,speechEndGated:true,alpha:true,ipaBelow:true,pauseReplay:true,storageIsolated:true});
  }
  const fallback=await browser.newContext({viewport:{width:390,height:960},reducedMotion:"reduce"});
  await fallback.addInitScript(()=>Object.defineProperty(window,"speechSynthesis",{value:undefined}));
  const p=await fallback.newPage();
  await p.goto(new URL("scenario-learning.html?test=playback-unavailable",base).href);
  await p.locator("[data-start-label]").click();await p.locator("#playDialogue").click();
  await p.waitForFunction(()=>document.querySelector("#playbackStatus").textContent.includes("语音未能完成"));
  await p.locator("#nextLine").click();
  assert.equal(await p.locator("#dialogueProgress").textContent(),"2/6");
  await fallback.close();
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ok:true,surface:"Microsoft Edge",results},null,2));
} finally {await browser.close();}
