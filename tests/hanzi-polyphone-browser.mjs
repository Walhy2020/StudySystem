import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { loadChromium } from "./playwright-runtime.mjs";

const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
mkdirSync("tmp", { recursive: true });
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const results = [];
try {
  for (const width of [1440, 1024, 800, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: width === 390 });
    await context.route("**/api/controller-mouse**", route => route.fulfill({ json: { supported:false, mode:"web" } }));
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await page.goto(base + "?test=hanzi-polyphone");
    await page.waitForFunction(() => Boolean(window.__HANZI_APP__));
    await page.locator("#startDaily").click();
    for (const character of ["的", "着", "和", "天"]) {
      await page.evaluate(character => {
        const app = window.__HANZI_APP__, state = app.getState();
        const word = window.MARIO_WORD_BANK.find(word => word.char === character);
        Object.assign(state, { dailyPhase: "screening", dailyTaskStarted: true, dailyTaskDone: false,
          activeWordId: word.id, inlineReviewContext: null });
        localStorage.setItem(app.getStorageKey(), JSON.stringify(state));
      }, character);
      await page.reload();
      if (width === 390) await page.locator("#currentChar").tap();
      else { await page.locator("#currentChar").focus(); await page.keyboard.press("Space"); }
      const expected = await page.evaluate(character => {
        const word = window.MARIO_WORD_BANK.find(word => word.char === character);
        return window.MARIO_PINYIN_READINGS.getReadings(word, window.MARIO_WORD_BANK);
      }, character);
      assert.deepEqual((await page.locator(".pinyin-compact").allTextContents()).map(text => text.replace(/\s+/g, "")), expected);
      const geometry = await page.evaluate(() => {
        const line = document.getElementById("pinyinLine"), box = line.getBoundingClientRect();
        const controls = document.querySelector(".voice-row").getBoundingClientRect();
        const readings = [...line.querySelectorAll(".pinyin-reading-item")].map(item => {
          const r = item.getBoundingClientRect();
          return { top:r.top-box.top, bottom:r.bottom-box.top, left:r.left-box.left, right:r.right-box.left };
        });
        return { height:box.height, width:box.width, readings, controlsBelow:controls.top>=box.bottom,
          overflow:document.documentElement.scrollWidth>innerWidth,
          font:parseFloat(getComputedStyle(line.querySelector(".pinyin-compact")).fontSize) };
      });
      for (const r of geometry.readings) {
        assert.ok(r.top>=0 && r.bottom<=geometry.height && r.left>=0 && r.right<=geometry.width,
          `${width}px ${character}: every reading must fit, ${JSON.stringify(geometry)}`);
      }
      assert.equal(geometry.controlsBelow,true,"readings do not cover answer controls");
      assert.equal(geometry.overflow,false,"page has no horizontal overflow");
      assert.ok(Math.abs(geometry.font-(width===390?85.8:Math.min(236,Math.max(84,width*.12))))<.1,"reading size stays unchanged");
      if (character === "着") {
        await page.locator("#pinyinLine").scrollIntoViewIfNeeded();
        await page.screenshot({ path:`tmp/hanzi-polyphone-${width}.png`,fullPage:true });
      }
      results.push({ width, character, readings:expected.length, height:geometry.height });
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
  console.log(JSON.stringify({ browser:"Microsoft Edge",results,errors:[] },null,2));
} finally { await browser.close(); }
