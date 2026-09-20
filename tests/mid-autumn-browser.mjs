import assert from "node:assert/strict";
import { chromium } from "file:///C:/Users/St/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
import { MID_AUTUMN_WORDS, splitPhonetic } from "../theme-learning.js";
const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:53177/";
const browser = await chromium.launch({ headless:true, executablePath:"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const errors = [], results = [];
try {
  for (const width of [1440,390]) {
    const context = await browser.newContext({ viewport:{width,height:1000},hasTouch:width === 390 });
    await context.addInitScript(() => {
      window.__spoken=[]; window.__writes=[];
      const original=Storage.prototype.setItem;
      Storage.prototype.setItem=function(key,value){window.__writes.push(key);return original.call(this,key,value);};
      Object.defineProperty(window,"SpeechSynthesisUtterance",{value:class{constructor(text){this.text=text;}}});
      Object.defineProperty(window,"speechSynthesis",{value:{cancel(){},speak(u){window.__spoken.push(u.text);setTimeout(()=>u.onend?.(),50);}}});
    });
    const page = await context.newPage();
    page.on("pageerror", e=>errors.push(e.message));
    page.on("response", r=>{if(r.status()>=400)errors.push(r.status()+" "+r.url());});
    const activate = async locator => width === 390 ? locator.tap() : locator.click();
    await page.goto(new URL("theme-learning.html",base).href);
    assert.equal((await page.request.get(new URL("assets/themes/mid-autumn/mid-autumn-scene-v1.png",base).href)).status(),200);
    await activate(page.locator('[data-series-id="festivals"]'));
    assert.equal(await page.locator(".theme-card:visible").count(),1);
    await activate(page.locator("#startMidAutumn"));
    assert.equal(await page.evaluate(()=>window.__spoken.length),0);
    await page.locator("#midAutumnFigure").scrollIntoViewIfNeeded();
    for (const word of MID_AUTUMN_WORDS) {
      const target=page.locator('#midAutumnScene [data-target="'+word.id+'"]');
      await target.scrollIntoViewIfNeeded();
      assert.equal(await target.evaluate(node=>{
        const r=node.getBoundingClientRect();
        return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest("[data-target]") === node;
      }),true,word.id+" geometry hit");
      if(width===390)await target.tap();else {await target.focus();await page.keyboard.press("Enter");}
      assert.equal(await page.locator(".word-en").textContent(),word.word);
      assert.equal(await page.locator(".phonetic").textContent(),word.phonetic);
      assert.equal(await page.locator(".translation").textContent(),word.chinese);
      assert.equal(await page.evaluate(()=>window.__spoken.length),0,"learning stays manual");
      await page.locator("#phoneticToggle").click();
      assert.deepEqual(await page.locator("#phonemeBreakdown .phoneme-chip").allTextContents(),splitPhonetic(word.phonetic));
      await page.locator("#phoneticToggle").focus();
      await page.keyboard.press("Space");
      assert.equal(await page.locator("#phoneticToggle").getAttribute("aria-expanded"),"false");
    }
    await page.locator("#repeatWord").click();
    await page.waitForFunction(()=>window.__spoken.includes("family. We are a family."));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:`tests/mid-autumn-${width}.png`,fullPage:true});
    await page.locator("#midAutumnFigure").screenshot({path:`tests/mid-autumn-art-${width}.png`});
    await page.locator("#completeThemeLearning").click();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem("mario-theme-learned-v1")).learned.length),6);
    await page.locator("#practiceStage").click();
    const first=await page.evaluate(()=>window.__THEME_LEARNING__.session.target().id);
    await activate(page.locator('#midAutumnScene [data-target="'+MID_AUTUMN_WORDS.find(w=>w.id!==first).id+'"]'));
    assert.equal(await page.evaluate(()=>window.__THEME_LEARNING__.session.questionIndex),0);
    const seen=[];
    for(let i=0;i<6;i++) {
      const target=await page.evaluate(()=>window.__THEME_LEARNING__.session.target()); seen.push(target.id);
      await activate(page.locator('#midAutumnScene [data-target="'+target.id+'"]'));
      await page.waitForFunction(n=>{
        const s=window.__THEME_LEARNING__.session;
        return s.questionIndex>n && (s.complete ? !document.querySelector("#resultPanel").hidden : document.querySelector("#practiceInstruction").textContent===s.target().instruction);
      },i);
    }
    assert.equal(new Set(seen).size,6);
    assert.equal(await page.locator("#resultScore").textContent(),"6/6");
    assert.ok((await page.evaluate(()=>window.__writes)).every(k=>k==="mario-theme-learned-v1"));
    await page.reload();
    assert.ok(await page.locator('[data-series-id="festivals"]').evaluate(n=>n.classList.contains("is-complete")));
    await activate(page.locator('[data-series-id="festivals"]'));
    assert.ok(await page.locator(".midautumn-card").evaluate(n=>n.classList.contains("is-reviewed")));
    await page.screenshot({path:`tests/mid-autumn-complete-${width}.png`,fullPage:true});
    await page.goto(new URL("review-learning.html",base).href);
    await page.locator("#openWordLibrary").click();
    assert.equal(await page.locator("#wordLibraryCount").textContent(),"6/227");
    for(const word of MID_AUTUMN_WORDS){
      const card=page.locator('[data-word-key="total:'+word.word+'"]');
      assert.equal(await card.count(),1);
      assert.match(await card.locator(".library-theme-label").textContent(),/中秋节/);
      if(word.id!=="moon")assert.match(await card.locator("image").getAttribute("href"),/mid-autumn-scene-v1.png/);
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.screenshot({path:`tests/mid-autumn-library-${width}.png`,fullPage:true});
    await page.locator("#startLibraryReview").click();
    assert.equal(await page.evaluate(()=>window.__THEME_OVERVIEW__.reviewSession.words.length),6);
    assert.ok((await page.evaluate(()=>window.__writes)).every(k=>k==="mario-total-review-v1"));
    results.push({width,words:6,practice:"6/6",learnedLibrary:6,reviewedCheck:true,geometry:true,noOverflow:true});
    await context.close();
  }
  assert.deepEqual(errors,[]); console.log(JSON.stringify({ok:true,browser:"Microsoft Edge",results},null,2));
} finally { await browser.close(); }
