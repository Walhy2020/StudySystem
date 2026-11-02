import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { loadChromium } from "./playwright-runtime.mjs";
const base=process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
mkdirSync("tmp",{recursive:true});
const browser=await(await loadChromium()).launch({headless:true,executablePath:"C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"});
try {
 for(const width of [1440,390]){
  const context=await browser.newContext({viewport:{width,height:900},hasTouch:width===390});
  await context.route("**/api/controller-mouse**",r=>r.fulfill({json:{supported:true,mode:"web"}}));
  await context.addInitScript(()=>{
   localStorage.setItem("mario-hanzi-refactor-v1",JSON.stringify({records:{"0010":{status:"known",correctCount:1}}}));
   window.__pad={connected:true,mapping:"standard",id:"Games selector fixture",index:0,axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,value:0}))};
   Object.defineProperty(navigator,"getGamepads",{value:()=>[window.__pad]});
  });
  const page=await context.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(e.message));page.on("response",r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  for(const name of ["index","pinyin","word-learning","phonetics"]){
   await page.goto(base+name+".html");
   assert.equal(await page.locator("#bombGameEntry,#snakeGameEntry").count(),0);
   assert.equal(await page.locator('a[href*="bomb-game.html"],a[href*="snake-game.html"]').count(),0);
   assert.equal(await page.locator('nav a[href="./games.html"]').count(),1);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  }
  await page.locator('nav a[href="./games.html"]').click();
  await page.waitForFunction(()=>STUDY_FULLSCREEN_SHELL.activeWindow()?.location.pathname.endsWith("/games.html") && !STUDY_FULLSCREEN_SHELL.isNavigating());
  const surface=()=>page.frameLocator("#study-module-frame");
  assert.equal(await surface().locator(".scenario-card").count(),2);
  for(const img of await surface().locator(".game-preview img").all()) assert.equal(await img.evaluate(i=>i.complete&&i.naturalWidth>0),true);
  const cards=await surface().locator(".scenario-card").evaluateAll(nodes=>nodes.map(el=>{const b=el.getBoundingClientRect();return{x:b.x,y:b.y,width:b.width,height:b.height};}));
  if(width===1440)assert.equal(cards[0].y,cards[1].y);else assert.ok(cards[1].y>cards[0].y+cards[0].height);
  assert.ok(cards.every(b=>b.x>=0 && b.x+b.width<=width));
  await page.screenshot({path:`tmp/games-${width}.png`,fullPage:true});
  const pointer=page.locator("#study-gamepad-cursor");
  const before=await pointer.evaluate(el=>parseFloat(el.style.left));
  await page.evaluate(()=>{__pad.axes[2]=.75;});await page.waitForTimeout(150);await page.evaluate(()=>{__pad.axes[2]=0;});
  assert.ok(await pointer.evaluate((el,b)=>parseFloat(el.style.left)>b,before));
  // R2 toggles once, and this same fullscreen/cursor owner survives both games.
  await surface().locator("h1").click();
  await page.evaluate(()=>{__pad.buttons[7]={pressed:true,value:1};});
  await page.waitForFunction(()=>Boolean(document.fullscreenElement));
  await page.evaluate(()=>{__pad.buttons[7]={pressed:false,value:0};});
  for(const [id,path,back]of [["bombGameEntry","bomb-game.html",'a[href="./games.html"]'],["snakeGameEntry","snake-game.html","#snakeBack"]]){
   if(width===390)await surface().locator("#"+id).tap();
   else { await surface().locator("#"+id).focus();await page.keyboard.press("Enter"); }
   await page.waitForFunction(path=>STUDY_FULLSCREEN_SHELL.activeWindow()?.location.pathname.endsWith(path) && !STUDY_FULLSCREEN_SHELL.isNavigating(),path);
   assert.equal(await page.evaluate(()=>Boolean(document.fullscreenElement)),true);
   assert.equal(await page.locator("#study-gamepad-cursor").count(),1);
   const frame=page.frames().find(f=>f.parentFrame()===page.mainFrame());
   assert.equal(await frame.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   if(path==="snake-game.html")await frame.waitForFunction(()=>window.__snakeDemo?.getState().ready);
   await page.evaluate(()=>{__pad.buttons[7]={pressed:true,value:1};});
   await page.waitForFunction(()=>!document.fullscreenElement);
   await page.evaluate(()=>{__pad.buttons[7]={pressed:false,value:0};});
   await page.waitForTimeout(80);
   await surface().locator(back).click();
   await page.waitForFunction(()=>STUDY_FULLSCREEN_SHELL.activeWindow()?.location.pathname.endsWith("/games.html") && !STUDY_FULLSCREEN_SHELL.isNavigating());
   await surface().locator("h1").click();
   await page.evaluate(()=>{__pad.buttons[7]={pressed:true,value:1};});
   await page.waitForFunction(()=>Boolean(document.fullscreenElement));
   await page.evaluate(()=>{__pad.buttons[7]={pressed:false,value:0};});
   await page.waitForTimeout(80);
  }
  await page.evaluate(()=>{__pad.buttons[7]={pressed:true,value:1};});await page.waitForFunction(()=>!document.fullscreenElement);
  assert.deepEqual(errors,[]);
  console.log(`PASS Edge ${width}: independent game cards, keyboard entry/return, right-stick cursor and persistent R2 fullscreen`);
  await context.close();
 }
}finally{await browser.close();}
