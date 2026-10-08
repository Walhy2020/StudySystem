import assert from "node:assert/strict";
import { loadChromium } from "./playwright-runtime.mjs";
const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const results = [];
try {
  for (const width of [1440,390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(() => {
      let callbacks = [], now;
      window.requestAnimationFrame = cb => { callbacks.push(cb); return callbacks.length; };
      window.__pad = { index:0,id:"L1 fixture",connected:true,mapping:"standard",axes:[0,0,0,0],
        buttons:Array.from({length:18},(_, i)=>({pressed:i===4,value:i===4?1:0})) };
      Object.defineProperty(navigator,"getGamepads",{value:()=>[window.__pad]});
      window.__advance = seconds => {
        now ??= performance.now();
        for(let i=0;i<Math.ceil(seconds*60);i++) {
          now+=1000/60; const batch=callbacks;callbacks=[];batch.forEach(cb=>cb(now));
        }
      };
      window.__volumes=[];window.__cancelled=0;window.__gains=[];window.__notes=0;
      const synthesis={getVoices:()=>[],resume(){},cancel(){window.__cancelled++;},addEventListener(){},
        speak(utterance){window.__volumes.push(utterance.volume);}};
      Object.defineProperty(window,"speechSynthesis",{value:synthesis});
      window.SpeechSynthesisUtterance=class {constructor(text){this.text=text;this.volume=1;}};
      const parameter=()=>({value:0,setValueAtTime(v){this.value=v;},setTargetAtTime(v){this.value=v;},exponentialRampToValueAtTime(v){this.value=v;}});
      window.AudioContext=class {
        constructor(){this.state="running";this.currentTime=0;this.sampleRate=4000;this.destination={};}
        resume(){return Promise.resolve();}
        createGain(){const gain=parameter();window.__gains.push(gain);return {gain,connect(){}};}
        createOscillator(){return {frequency:parameter(),connect(){},start(){window.__notes++;},stop(){}};}
        createBuffer(_c,n){return {getChannelData:()=>new Float32Array(n)};}
        createBufferSource(){return {connect(){},start(){window.__notes++;},stop(){}};}
        createBiquadFilter(){return {frequency:parameter(),connect(){}};}
      };
    });
    const page=await context.newPage(),errors=[];
    page.on("pageerror",e=>errors.push(e.message));
    page.on("response",r=>{if(r.status()>=400)errors.push(r.url());});
    const advance=(target=page)=>target.evaluate(()=>window.__advance(.1));
    const button=(down,target=page)=>target.evaluate(down=>{window.__pad.buttons[4]={pressed:down,value:down?1:0};},down);
    const muted=(target=page)=>target.evaluate(()=>window.STUDY_AUDIO.isMuted());
    for(const name of ["index","pinyin","book-learning","theme-learning","scenario-learning","review-learning","phonetics","bomb-game"]) {
      await page.goto(base+name+".html?mute-check=1");
      await page.waitForFunction(()=>Boolean(window.STUDY_AUDIO)&&Boolean(window.STUDY_GAMEPAD_CURSOR));
      await advance();assert.equal(await muted(),false,"held-on-connect does not mute");
      if(name==="bomb-game")await page.locator("#overlayStartBombGame").click();
      await button(false);await advance();
      const before=await page.evaluate(()=>({y:scrollY,notes:window.__notes}));
      await button(true);await advance();await advance();
      assert.equal(await muted(),true);assert.equal(await page.evaluate(()=>scrollY),before.y,"L1 no longer scrolls");
      assert.equal(await page.evaluate(()=>document.documentElement.dataset.studyMuted),"true");
      if(name==="bomb-game") {
        assert.equal(await page.locator("#bombSoundToggle").textContent(),"🔇");
        assert.equal(await page.evaluate(()=>window.__gains[0].value),0);
        assert.equal(await page.evaluate(()=>window.__gains[1].value),0);
        await page.locator("#bombCanvas").focus();await page.keyboard.press("Space");await advance();
        assert.equal(await page.evaluate(()=>window.__notes),before.notes,"muted attacks do not schedule sounds");
      }
      if(name==="index")await page.evaluate(async()=>{(await import("./src/tts.js?v=1.1")).speakChineseCharacter("天");});
      if(name==="phonetics")await page.evaluate(async()=>{await(await import("./src/phonetics-tts.js?v=1.4")).speakPhoneticExample({examples:["apple"]},{delayMs:0});});
      if(["theme-learning","review-learning"].includes(name))await page.evaluate(async()=>{(await import("./theme-learning.js?v=2.20")).speakEnglish("hello");});
      if(name==="scenario-learning") {
        await page.evaluate(async()=>{(await import("./scenario-learning.js?v=2.9")).createScenarioSpeaker({synthesis:speechSynthesis,Utterance:SpeechSynthesisUtterance,delay:0}).speak("hello");});
        await page.waitForTimeout(30);
      }
      if(name==="book-learning") {
        await page.locator('[data-theme="opw1:letter-A"]').click();
        await page.locator('#pictureGrid [data-item]').first().click();
        await page.locator('[data-action="speak"]').click();await page.waitForTimeout(100);
      }
      if(name!=="pinyin"&&name!=="bomb-game")assert.equal(await page.evaluate(()=>window.__volumes.at(-1)),0,`${name}: speech is silent`);
      await button(false);await advance();await button(true);await advance();
      assert.equal(await muted(),false,"second fresh press restores audio");
      if(name==="bomb-game")assert.equal(await page.evaluate(()=>window.__gains[0].value),.8);
      await button(false);await advance();
      await page.evaluate(()=>window.STUDY_GAMEPAD_CURSOR.setInputCapture(true));
      await button(true);await advance();assert.equal(await muted(),false,"capture cannot mute");
      await page.evaluate(()=>window.STUDY_GAMEPAD_CURSOR.setInputCapture(false));
      await advance();assert.equal(await muted(),false,"capture exit requires release");
      await button(false);await advance();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    }
    await page.evaluate(()=>window.STUDY_AUDIO.setMuted(true));await page.reload();
    assert.equal(await muted(),true,"refresh preserves this tab preference");
    await page.goto(base+"index.html?mute-check=1");assert.equal(await muted(),true,"module navigation preserves mute");
    const activation=await page.evaluateHandle(()=>{
      const b=document.createElement("button");b.id="mute-fullscreen-fixture";b.textContent="Fullscreen";
      b.onclick=()=>document.documentElement.requestFullscreen();document.body.prepend(b);return b;
    });
    await activation.asElement().click();
    await page.evaluate(()=>window.STUDY_FULLSCREEN_SHELL.navigate("theme-learning.html?mute-check=1"));
    const frame=await(await page.waitForSelector("#study-module-frame")).contentFrame();
    await frame.waitForFunction(()=>Boolean(window.STUDY_AUDIO));
    assert.equal(await muted(frame),true);
    await frame.evaluate(()=>window.STUDY_AUDIO.setMuted(false));
    assert.equal(await muted(),false,"embedded module synchronizes the dormant owner");
    await page.evaluate(()=>document.exitFullscreen());
    assert.deepEqual(errors,[]);
    results.push({width,pages:8,l1Toggle:true,noScroll:true,speechVolumeZero:true,gameGainsZero:true,
      captureSafety:true,tabPersistence:true,fullscreenFrameSync:true});
    await context.close();
  }
  console.log(JSON.stringify({ok:true,browser:"Microsoft Edge",simulatedStandardGamepad:true,results}));
} finally {await browser.close();}
