import assert from "node:assert/strict";
import fs from "node:fs";
import { loadChromium } from "./playwright-runtime.mjs";
import { PINYIN_ITEMS } from "../data/pinyin.js";
import { createInitialState, localDateString } from "../src/state.js";

const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const fixture = createInitialState(localDateString(), PINYIN_ITEMS.length);
fixture.masteredIds = PINYIN_ITEMS.map(item => item.id);
fixture.records = Object.fromEntries(fixture.masteredIds.map(id => [id, { status: "mastered", correctCount: 3 }]));
const protectedKeys = ["mario-hanzi-refactor-v1", "mario-phonetics-v1", "mario-word-learning-v1"];
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const results = [];
fs.mkdirSync("tmp", { recursive: true });
try {
  for (const width of [1440, 390]) {
    for (const embedded of [false, true]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: width === 390 });
      await context.addInitScript(({ fixture, protectedKeys }) => {
        if (location.pathname.endsWith("/pinyin.html")) {
          if (!localStorage.getItem("mario-pinyin-v1")) localStorage.setItem("mario-pinyin-v1", JSON.stringify(fixture));
          for (const key of protectedKeys) localStorage.setItem(key, JSON.stringify({ untouched: key }));
        }
        let callbacks = [], now;
        window.requestAnimationFrame = callback => { callbacks.push(callback); return callbacks.length; };
        window.__pad = { index: 0, id: "Pinyin empty-state Xbox fixture", mapping: "standard", connected: true,
          axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
        Object.defineProperty(navigator, "getGamepads", { value: () => [window.__pad] });
        window.__advance = (n = 3) => {
          now ??= performance.now();
          for (let i = 0; i < n; i++) {
            now += 1000 / 60;
            const batch = callbacks; callbacks = []; batch.forEach(callback => callback(now));
          }
        };
      }, { fixture, protectedKeys });
      const page = await context.newPage(), errors = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("response", response => { if (response.status() >= 400) errors.push(response.url()); });
      await page.goto(base + (embedded ? "index.html?test=pinyin-empty-owner" : "pinyin.html"));
      let surface = page;
      if (embedded) {
        await page.locator('nav a[href="./pinyin.html"]').click();
        surface = await (await page.locator("#study-module-frame").elementHandle()).contentFrame();
      }
      await surface.waitForFunction(() => window.__PINYIN_APP__);
      await page.bringToFront();
      await page.evaluate(() => window.__advance());
      const read = () => surface.evaluate(() => window.__PINYIN_APP__.getState());
      const original = await read();
      assert.equal(original.masteredIds.length, 63);
      assert.match(await surface.locator("#idleMessage").textContent(), /63.*完全认识/);
      for (const selector of ["#startDaily", "#startReview", "#nextBatch"]) {
        if (width === 390) await surface.locator(selector).tap();
        else await surface.locator(selector).click();
        assert.equal(await surface.locator("#feedback").isVisible(), true);
        assert.match(await surface.locator("#feedback").textContent(), /完全认识/);
        assert.deepEqual(await read(), original, "empty actions preserve all learning progress");
        assert.equal(await surface.locator("#finishNewWords").isVisible(), false);
      }
      await surface.locator("#startReview").focus();
      await page.keyboard.press("Enter");
      await page.keyboard.press("Space");
      assert.deepEqual(await read(), original, "native keyboard activation preserves progress");
      // Use the actual owner's gamepad cursor hit testing and A edge, including iframe routing.
      await surface.locator("#startDaily").scrollIntoViewIfNeeded();
      const box = await surface.locator("#startDaily").boundingBox();
      await page.evaluate(({ x, y }) => {
        for (let i = 0; i < 250; i++) {
          const pointer = document.getElementById("study-gamepad-cursor");
          const dx = x - parseFloat(pointer.style.left), dy = y - parseFloat(pointer.style.top);
          if (Math.hypot(dx, dy) < .7) break;
          const axis = d => Math.abs(d) < .2 ? 0 : Math.sign(d) * (.25 + .75 * Math.min(1, Math.abs(d) / (650 / 60)));
          window.__pad.axes = [0, 0, axis(dx), axis(dy)]; window.__advance(1);
        }
        window.__pad.axes = [0, 0, 0, 0]; window.__advance();
      }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
      await surface.evaluate(() => { document.getElementById("feedback").textContent = ""; });
      await page.evaluate(() => {
        window.__pad.buttons[0] = { pressed: true, value: 1 }; window.__advance();
        window.__pad.buttons[0] = { pressed: false, value: 0 }; window.__advance();
      });
      assert.match(await surface.locator("#feedback").textContent(), /完全认识/, "gamepad A reaches the visible button");
      assert.deepEqual(await read(), original);
      assert.equal(await surface.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const feedbackBox = await surface.locator("#feedback").boundingBox();
      assert.ok(feedbackBox.width > 40 && feedbackBox.height > 20, "feedback has a visible readable layout");
      await page.screenshot({ path: `tmp/pinyin-empty-${width}-${embedded ? "embedded" : "direct"}.png`, fullPage: true });
      const sentinels = await surface.evaluate(keys => keys.map(key => JSON.parse(localStorage.getItem(key))), protectedKeys);
      assert.deepEqual(sentinels, protectedKeys.map(key => ({ untouched: key })));
      await surface.goto(surface.url());
      await surface.waitForFunction(() => window.__PINYIN_APP__);
      assert.equal((await read()).masteredIds.length, 63);
      assert.match(await surface.locator("#idleMessage").textContent(), /63.*完全认识/);
      assert.deepEqual(errors, []);
      results.push({ width, embedded, allMastered: 63, mouseOrTouch: true, keyboard: true, gamepad: true, preservedProgress: true });
      await context.close();
    }
  }
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", results }));
} finally { await browser.close(); }
