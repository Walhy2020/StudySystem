import assert from "node:assert/strict";
import { chromium } from "file:///C:/Users/St/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import { BOOK1_ITEMS } from "../data/book1.js";
const base=process.env.HANZI_BASE_URL||"http://127.0.0.1:53177/";
const browser=await chromium.launch({headless:true,executablePath:"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"});
const errors=[], results=[];
try {
  for(const width of [1440,390]){
    const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width===390});
    const desk=BOOK1_ITEMS.find(x=>x.type==="word"&&x.word==="desk");
    await context.addInitScript(({deskId})=>{
      if(!sessionStorage.getItem("desk-seeded")){
        localStorage.setItem("mario-theme-learned-v1",JSON.stringify({version:2,learned:["classroom:table"],learnedThemes:["classroom"],reviewedThemes:["classroom"]}));
        localStorage.setItem("mario-book1-v1",JSON.stringify({masteredIds:[deskId]}));
        sessionStorage.setItem("desk-seeded","yes");
      }
      window.__spoken=[];window.__writes=[];
      const original=Storage.prototype.setItem;
      Storage.prototype.setItem=function(k,v){window.__writes.push(k);return original.call(this,k,v);};
      Object.defineProperty(window,"SpeechSynthesisUtterance",{value:class{constructor(text){this.text=text;}}});
      Object.defineProperty(window,"speechSynthesis",{value:{cancel(){},speak(u){window.__spoken.push(u.text);setTimeout(()=>u.onend?.(),50);}}});
    },{deskId:desk.id});
    const page=await context.newPage();
    page.on("pageerror",e=>errors.push(e.message));
    page.on("response",r=>{if(r.status()>=400)errors.push(r.status()+" "+r.url());});
    await page.goto(new URL("theme-learning.html",base).href);
    await page.locator('[data-series-id="classroom"]').click();
    assert.equal(await page.locator(".classroom-card").evaluate(el=>el.classList.contains("is-reviewed")),true);
    await page.locator("#startClassroom").click();
    const target=page.locator('[data-theme="classroom"] [data-target="table"]');
    if(width===390)await target.tap();else {await target.focus();await page.keyboard.press("Enter");}
    assert.equal(await target.getAttribute("aria-label"),"desk 课桌");
    for(const [sel,value] of [[".word-en","desk"],[".phonetic","/desk/"],[".translation","课桌"],[".sentence","This is a desk."]]){
      assert.equal((await page.locator(sel).textContent()).trim(),value);
    }
    await page.locator("#phoneticToggle").click();
    assert.deepEqual(await page.locator("#phonemeBreakdown .phoneme-chip").allTextContents(),["d","e","s","k"]);
    await page.locator("#repeatWord").click();
    await page.waitForFunction(()=>window.__spoken.includes("desk. This is a desk."));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:"tests/theme-desk-"+width+".png",fullPage:true});
    await page.locator("#practiceStage").click();
    let sawDesk=false;
    for(let i=0;i<8;i++){
      const current=await page.evaluate(()=>window.__THEME_LEARNING__.session.target());
      if(current.id==="table"){
        sawDesk=true;assert.equal(current.word,"desk");
        assert.equal((await page.locator("#practiceInstruction").textContent()).trim(),"Touch the desk.");
      }
      await page.locator('[data-theme="classroom"] [data-target="'+current.id+'"]').click();
      await page.waitForFunction(n=>{
        const session=window.__THEME_LEARNING__.session;
        return session.questionIndex>n && (session.complete
          ? !document.querySelector("#resultPanel").hidden
          : document.querySelector("#practiceInstruction").textContent.trim()===session.target().instruction);
      },i);
    }
    assert.equal(sawDesk,true);
    await page.waitForFunction(()=>!document.querySelector("#resultPanel").hidden);
    assert.equal((await page.locator("#resultScore").textContent()).trim(),"8/8");
    assert.ok((await page.evaluate(()=>window.__writes)).every(k=>k==="mario-theme-learned-v1"));
    await page.goto(new URL("review-learning.html",base).href);
    await page.locator("#openWordLibrary").click();
    const card=page.locator('[data-word-key="total:desk"]');
    assert.equal(await card.count(),1);
    assert.equal(await page.locator('[data-word-key="total:table"]').count(),0);
    assert.equal((await card.locator("h3").textContent()).trim(),"desk");
    assert.equal((await card.locator(".library-phonetic").textContent()).trim(),"/desk/");
    assert.match(await card.locator(".library-theme-label").textContent(),/Book1/);
    assert.equal(await card.locator("svg").getAttribute("viewBox"),"765 475 365 430");
    assert.equal(await page.locator("#wordLibraryCount").textContent(),"8/227");
    await card.locator(".library-speak").click();
    await page.waitForFunction(()=>window.__spoken.includes("desk. This is a desk."));
    await card.screenshot({path:"tests/library-desk-"+width+".png"});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.ok((await page.evaluate(()=>window.__writes)).every(key => key === "mario-total-review-v1"), "review writes only its own progress");
    await page.locator("#startLibraryReview").click();
    const words=await page.evaluate(()=>window.__THEME_OVERVIEW__.reviewSession.words.map(x=>x.word));
    assert.equal(words.filter(x=>x==="desk").length,1);assert.equal(words.includes("table"),false);
    results.push({width,desk:true,oldProgressPreserved:true,practice:"8/8",libraryDeduplicated:true,noOverflow:true});
    await context.close();
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,surface:"Microsoft Edge",results},null,2));
}finally{await browser.close();}
