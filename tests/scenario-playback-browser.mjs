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
        cancel(){},getVoices(){return [{lang:"en-GB"}];},speak(u){window.__utterances.push(u);}
      }});
    });
    const page=await context.newPage();
    page.on("pageerror",e=>errors.push(e.message));
    page.on("response",r=>{if(r.status()>=400)errors.push(r.status()+" "+r.url());});
    await page.goto(new URL("scenario-learning.html?test=playback-"+width,base).href);
    await page.locator("[data-start-label]").click();
    const present=(id)=>page.locator("#"+id).evaluate(el=>el.classList.contains("is-present"));
    const count=()=>page.evaluate(()=>window.__utterances.length);
    const finish=()=>page.evaluate(()=>window.__utterances.at(-1).onend());
    async function speakAction(action) {
      const previous=await count(); await action();
      await page.waitForFunction(n=>window.__utterances.length===n,previous+1);
    }
    async function single(index, speaking=true) {
      assert.equal(await page.locator("#dialogueProgress").textContent(),(index+1)+"/6");
      assert.equal(await page.locator(".chat-bubble:visible").count(),1);
      assert.equal(await page.locator(".dialogue-line-button, #dialogueLineList").count(),0);
      const effects=await page.locator(".scene-actor").evaluateAll(actors=>actors.map(el=>{
        const s=getComputedStyle(el);
        return {id:el.id,outline:s.outlineStyle,animation:s.animationName,duration:s.animationDuration,iterations:s.animationIterationCount,easing:s.animationTimingFunction,filter:s.filter};
      }));
      assert.ok(effects.every(x=>x.outline!=="dashed"));
      const glowing=effects.filter(x=>x.animation==="actor-glow");
      assert.deepEqual(glowing.map(x=>x.id),speaking?[index%2?"actorLeo":"actorMia"]:[]);
      if(speaking){assert.equal(glowing[0].duration,"1s");assert.equal(glowing[0].iterations,"2");assert.equal(glowing[0].easing,"ease-in-out");assert.equal((glowing[0].filter.match(/drop-shadow/g)||[]).length,2);}
    }
    assert.equal(await present("actorMia"),true);assert.equal(await present("actorLeo"),false);
    assert.equal(await count(),0);
    assert.equal(await page.locator("#playDialogue").count(),0);
    assert.equal(await page.locator("#continuousDialogue").textContent(),"从头连播");
    assert.equal(await page.locator("#replayDialogue").textContent(),"从头重播");
    await speakAction(async()=>{
      await page.locator("#replayDialogue").focus(); await page.keyboard.press("Enter");
      assert.equal(await page.locator("#actorMia").evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).m41 < -10),true);
    });
    await single(0); assert.equal(await present("actorLeo"),false);
    await finish(); await page.waitForTimeout(1000);
    assert.equal(await count(),1); await single(0,false);
    assert.equal(await present("actorLeo"),false);
    await speakAction(()=>width===390?page.locator("#nextLine").tap():page.locator("#nextLine").click());
    await single(1); assert.equal(await present("actorLeo"),true);
    await finish(); await page.waitForTimeout(1000);
    assert.equal(await count(),2); await single(1,false);
    // Continuous mode always restarts at the first line and waits for its speech end.
    await speakAction(()=>page.locator("#continuousDialogue").click());
    await single(0);assert.equal(await present("actorLeo"),false);
    await page.waitForTimeout(800);assert.equal(await count(),3);
    await speakAction(finish);await single(1);
    const geometry=await page.evaluate(()=>{
      const english=document.querySelector("#dialogueEnglish").getBoundingClientRect();
      const ipa=document.querySelector("#dialoguePhonetic").getBoundingClientRect();
      const stage=document.querySelector("#actorStage").getBoundingClientRect();
      return {ipaBelow:ipa.top>=english.bottom-1,noOverflow:document.documentElement.scrollWidth<=innerWidth,
        fits:[...document.querySelectorAll(".scene-actor")].every(img=>{
          const r=img.getBoundingClientRect();
          return r.left>=stage.left&&r.right<=stage.right&&r.top>=stage.top&&r.bottom<=stage.bottom;
        })};
    });
    assert.deepEqual(geometry,{ipaBelow:true,noOverflow:true,fits:true});
    const pulse=await page.locator("#actorLeo").evaluate(el=>{
      const animation=el.getAnimations().find(a=>a.animationName==="actor-glow");
      animation.pause();animation.currentTime=0;
      const low=getComputedStyle(el).filter;
      animation.currentTime=500;
      const high=getComputedStyle(el).filter;
      return {low,high,opacity:getComputedStyle(el).opacity};
    });
    assert.notEqual(pulse.low,pulse.high,"halo smoothly changes strength");
    assert.ok(pulse.low.includes("rgb(255, 138, 0)"), pulse.low);
    assert.ok(pulse.high.includes("rgb(255, 101, 0)") && pulse.high.includes("rgb(255, 149, 0)"), pulse.high);
    assert.equal(pulse.opacity,"1","only the halo pulses, not the character");
    await page.screenshot({path:"tests/scenario-playback-"+width+".png",fullPage:true});
    await page.locator("#actorLeo").evaluate(el=>el.getAnimations().forEach(a=>a.play()));
    await page.waitForFunction(()=>document.querySelector("#actorLeo").getAnimations().every(a=>a.playState==="finished"));
    const settled=await page.locator("#actorLeo").evaluate(el=>getComputedStyle(el).filter);
    assert.equal(settled,pulse.low,"after two cycles the halo stays steady");
    await page.waitForTimeout(600);
    assert.equal(await page.locator("#actorLeo").evaluate(el=>getComputedStyle(el).filter),settled,"no third cycle");
    assert.equal(await count(),4,"halo ending must not advance dialogue");
    await page.locator("#pauseDialogue").click();await finish();
    await page.waitForTimeout(500);await single(1,false);
    assert.equal(await count(),4);
    await speakAction(()=>page.locator("#pauseDialogue").click()); await single(1);
    for(let index=1;index<6;index++){
      await single(index);
      if(index<5)await speakAction(finish); else await finish();
    }
    await page.waitForFunction(()=>document.querySelector("#playbackStatus").textContent==="对话播放完毕");
    await single(5,false);
    assert.deepEqual(await page.evaluate(()=>window.__SCENARIO_LEARNING__.store.state.completedScenarioIds),[]);
    assert.deepEqual(await page.evaluate(()=>window.__SCENARIO_LEARNING__.store.state.learnedWords),[]);
    // Switch from a running auto sequence to manual replay; stale callback must do nothing.
    await speakAction(()=>page.locator("#continuousDialogue").click());
    await page.evaluate(()=>{window.__stale=window.__utterances.at(-1).onend;});
    await speakAction(()=>page.locator("#replayDialogue").click());
    await page.evaluate(()=>window.__stale()); await finish();
    const stopped=await count();await page.waitForTimeout(1000);
    assert.equal(await count(),stopped);await single(0,false);
    await speakAction(()=>page.locator("#continuousDialogue").click());
    await page.locator("#openScenarioWords").click();await finish();
    const exited=await count();await page.waitForTimeout(500);assert.equal(await count(),exited);
    assert.ok((await page.evaluate(()=>window.__writes)).every(k=>k==="mario-scenario-learning-v1:test:playback-"+width));
    results.push({width,manualReplay:true,manualNext:true,continuousFromStart:true,singleBubble:true,brightBreathingGlow:true,ipaBelow:true,noOverflow:true,storageIsolated:true});
    await context.close();
  }
  const fallback=await browser.newContext({viewport:{width:390,height:960},reducedMotion:"reduce"});
  await fallback.addInitScript(()=>Object.defineProperty(window,"speechSynthesis",{value:undefined}));
  const p=await fallback.newPage();
  await p.goto(new URL("scenario-learning.html?test=playback-unavailable",base).href);
  await p.locator("[data-start-label]").click();await p.locator("#continuousDialogue").click();
  await p.waitForFunction(()=>document.querySelector("#playbackStatus").textContent.includes("语音未能完成"));
  await p.locator("#nextLine").click();
  assert.equal(await p.locator("#dialogueProgress").textContent(),"2/6");
  await fallback.close();
  const reduced=await browser.newContext({viewport:{width:390,height:960},reducedMotion:"reduce"});
  await reduced.addInitScript(()=>{
    Object.defineProperty(window,"SpeechSynthesisUtterance",{value:class {constructor(text){this.text=text;}}});
    Object.defineProperty(window,"speechSynthesis",{value:{cancel(){},speak(){}}});
  });
  const quiet=await reduced.newPage();
  await quiet.goto(new URL("scenario-learning.html?test=glow-reduced",base).href);
  await quiet.locator("[data-start-label]").click();await quiet.locator("#replayDialogue").click();
  await quiet.waitForFunction(()=>document.querySelector("#actorStage").classList.contains("is-speaking"));
  const steady=await quiet.locator("#actorMia").evaluate(el=>({animation:getComputedStyle(el).animationName,filter:getComputedStyle(el).filter}));
  assert.equal(steady.animation,"none");
  assert.equal((steady.filter.match(/drop-shadow/g)||[]).length,2);
  await reduced.close();
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ok:true,surface:"Microsoft Edge",results},null,2));
} finally {await browser.close();}
