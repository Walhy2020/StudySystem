import assert from "node:assert/strict";
import fs from "node:fs";
import { loadChromium } from "./playwright-runtime.mjs";
const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const pages = ["index", "pinyin", "book-learning", "theme-learning", "scenario-learning", "review-learning", "phonetics", "bomb-game"];
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
fs.mkdirSync("tmp", { recursive: true });
const results = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(() => {
      let callbacks = [], now;
      window.requestAnimationFrame = cb => { callbacks.push(cb); return callbacks.length; };
      window.__pad = { index: 0, id: "Standard PS5 R2 fixture", connected: true, mapping: "standard", axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })) };
      Object.defineProperty(navigator, "getGamepads", { value: () => [window.__pad] });
      window.__advance = seconds => {
        now ??= performance.now();
        for (let i = 0; i < Math.ceil(seconds * 60); i++) {
          now += 1000 / 60; const batch = callbacks; callbacks = []; batch.forEach(cb => cb(now));
        }
      };
      window.__requests = []; window.__blocked = true;
      const request = Element.prototype.requestFullscreen;
      Element.prototype.requestFullscreen = function (...args) {
        window.__requests.push(this.tagName);
        return window.__blocked ? Promise.reject(new DOMException("activation required", "NotAllowedError")) : request.apply(this, args);
      };
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(response.url()); });
    const advance = (s = 0.05) => page.evaluate(s => window.__advance(s), s);
    const button = down => page.evaluate(down => { window.__pad.buttons[7] = { pressed: down, value: down ? 1 : 0 }; }, down);
    const requests = () => page.evaluate(() => window.__requests);
    async function activateR2() {
      await button(false); await advance();
      await page.evaluate(() => {
        const activation = document.createElement("button"); activation.id = "r2-activation-fixture";
        activation.textContent = "Activation fixture"; activation.style.cssText = "position:fixed;top:0;left:0;z-index:2147483647";
        document.body.append(activation);
      });
      await page.locator("#r2-activation-fixture").click();
      await page.evaluate(() => document.getElementById("r2-activation-fixture").remove());
      await button(true); await advance();
    }
    for (const name of pages) {
      await page.goto(base + name + ".html?r2-check=1");
      await page.waitForFunction(() => Boolean(window.STUDY_GAMEPAD_CURSOR) && (location.pathname.endsWith("bomb-game.html") ? Boolean(window.__BOMB_GAME__) : true));
      const game = name === "bomb-game";
      await button(true); await advance(); assert.deepEqual(await requests(), [], "held-on-connect cannot toggle");
      await button(false); await advance();
      await button(true); await advance();
      assert.deepEqual(await requests(), [game ? "DIV" : "HTML"], "R2 routes exactly once to correct fullscreen owner");
      await advance(0.5); assert.equal((await requests()).length, 1, "held R2 does not repeat");
      const prompt = page.locator(".study-gamepad-fullscreen");
      assert.equal(await prompt.count(), 0, "denied R2 never creates a page fullscreen prompt");
      if (game) assert.equal(await page.locator("#bombSettingsToggle").getAttribute("aria-expanded"), "false");
      assert.equal(await page.evaluate(() => Boolean(document.fullscreenElement)), false, "denial is not fake fullscreen");
      await button(false); await advance();
      // Supply real transient activation, then R2 exercises the actual native API.
      await page.evaluate(() => { window.__blocked = false; });
      await activateR2();
      await page.waitForFunction(game => document.fullscreenElement === (game ? document.querySelector(".bomb-game-app") : document.documentElement), game);
      await advance();
      if (game) {
        assert.equal(await page.locator("#bombSettingsToggle").getAttribute("aria-expanded"), "false");
        await page.evaluate(() => { window.__pad.axes[2] = 1; }); await advance(0.1); await page.evaluate(() => { window.__pad.axes[2] = 0; });
      }
      assert.equal(await page.locator("#study-gamepad-cursor").isVisible(), true);
      assert.equal(await page.locator("#study-gamepad-cursor").evaluate(n => document.fullscreenElement.contains(n)), true);
      assert.equal(await page.locator("#study-gamepad-help").evaluate(n => document.fullscreenElement.contains(n)), true);
      if (name === "phonetics") await page.screenshot({ path: `tmp/gamepad-r2-fullscreen-${width}.png` });
      await button(false); await advance(); await button(true); await advance(); await page.waitForFunction(() => !document.fullscreenElement);
      await advance(0.3); assert.equal(await page.evaluate(() => Boolean(document.fullscreenElement)), false);
      assert.equal((await requests()).length, 2, "exit does not immediately re-enter");
      await button(false); await advance();
      await page.evaluate(() => window.STUDY_GAMEPAD_CURSOR.setInputCapture(true));
      if (game) {
        await page.locator("#bombSettingsToggle").click();
        await page.locator("#bombAttackToggle").click(); await page.locator("#mushroomAttackKey").click(); await advance();
      }
      await button(true); await advance(); assert.equal((await requests()).length, 2, "capture suppresses R2");
      await button(false); await advance();
      if (game) await page.keyboard.press("Escape");
      else await page.evaluate(() => window.STUDY_GAMEPAD_CURSOR.setInputCapture(false));
      await advance();
      await page.evaluate(() => {
        document.hasFocus = () => false;
        window.dispatchEvent(new Event("blur"));
      });
      await button(true); await advance(); assert.equal((await requests()).length, 2, `${name}: no R2 while unfocused`);
      await page.evaluate(() => { document.hasFocus = () => true; });
      await advance(); assert.equal((await requests()).length, 2, `${name}: refocus requires release before R2`);
      await button(false); await advance();
      await activateR2();
      await page.waitForFunction(() => Boolean(document.fullscreenElement));
      assert.equal((await requests()).length, 3, `${name}: R2 enters real fullscreen when activation permits`);
      if (game) assert.equal(await page.locator("#bombSettingsToggle").getAttribute("aria-expanded"), "false", "success closes already open settings");
      await button(false); await advance(); await button(true); await advance();
      await page.waitForFunction(() => !document.fullscreenElement);
      await button(false); await advance();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    assert.deepEqual(errors, []);
    assert.equal((await page.request.get(base + "src/gamepad-cursor.js?v=1.10")).status(), 200);
    assert.equal((await page.request.get(base + "gamepad-cursor.css?v=1.1")).status(), 200);
    results.push({ width, pages: 8, r2Edge: true, actualFullscreen: true, pointerVisible: true,
      noPagePromptOrAutoSettings: true, captureAndFocusSafety: true, noDoubleGameToggle: true });
    await context.close();
  }
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", simulatedStandardGamepad: true, results }));
} finally { await browser.close(); }
