import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { loadChromium } from "./playwright-runtime.mjs";
const base=process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
mkdirSync("tmp",{recursive:true});
const browser=await(await loadChromium()).launch({headless:true,executablePath:"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"});
try {
 for(const width of [1440,390]) {
  const context=await browser.newContext({viewport:{width,height:1000},hasTouch:width===390});
  await context.route("**/api/controller-mouse**",r=>r.fulfill({json:{supported:false,mode:"web"}}));
  const page=await context.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  page.on("response",r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(base+"?test=hanzi-jiang");
  await page.waitForFunction(()=>Boolean(window.__HANZI_APP__));
  await page.locator("#startDaily").click();
  await page.evaluate(()=>{
   const app=window.__HANZI_APP__,state=app.getState();
   Object.assign(state,{dailyPhase:"screening",dailyTaskStarted:true,dailyTaskDone:false,activeWordId:"0304",inlineReviewContext:null});
   localStorage.setItem(app.getStorageKey(),JSON.stringify(state));
  });
  for(let round=0;round<2;round++) {
   await page.reload();await page.waitForFunction(()=>Boolean(window.__HANZI_APP__));
   assert.ok((await page.locator("#currentChar").textContent()).includes("降"));
   assert.equal(await page.locator(".pinyin-readings").count(),0,"answers remain hidden before reveal");
   const before=await page.evaluate(()=>JSON.stringify(__HANZI_APP__.getState()));
   if(width===390)await page.locator("#currentChar").tap();
   else {await page.locator("#currentChar").focus();await page.keyboard.press("Space");}
   assert.deepEqual((await page.locator(".pinyin-compact").allTextContents()).map(v=>v.replace(/\s+/g,"")),["jiàng","xiáng"]);
   assert.equal(await page.locator(".pinyin-readings").getAttribute("aria-label"),"拼音 jiàng | xiáng");
   const geometry=await page.evaluate(()=>{
    const box=document.getElementById("pinyinLine").getBoundingClientRect();
    return {fit:[...document.querySelectorAll(".pinyin-reading-item")].every(n=>{const r=n.getBoundingClientRect();return r.top>=box.top&&r.bottom<=box.bottom&&r.left>=box.left&&r.right<=box.right;}),overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert.deepEqual(geometry,{fit:true,overflow:false});
   assert.equal(await page.evaluate(()=>JSON.stringify(__HANZI_APP__.getState())),before,"reveal does not change learning progress");
  }
  assert.equal(await page.evaluate(()=>localStorage.getItem("mario-hanzi-refactor-v1")),null,"real Hanzi save is untouched");
  await page.locator("#pinyinLine").scrollIntoViewIfNeeded();
  await page.screenshot({path:`tmp/hanzi-jiang-${width}.png`,fullPage:true});
  assert.deepEqual(errors,[]);
  console.log(`PASS Edge ${width}: 降 jiàng/xiáng, hidden/reveal, reload, geometry, isolated progress and resources`);
  await context.close();
 }
} finally {await browser.close();}
