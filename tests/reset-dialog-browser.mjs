import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { loadChromium } from "./playwright-runtime.mjs";

const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
mkdirSync("tmp", { recursive: true });
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width === 390 });
    // Test controller output only in the page; never lease the user's desktop mouse.
    await context.route("**/api/controller-mouse**", route => route.fulfill({ json: { supported: true, mode: "web" } }));
    await context.addInitScript(() => {
      let callbacks = [], now = 0;
      window.requestAnimationFrame = cb => { callbacks.push(cb); return callbacks.length; };
      window.__pad = parent !== window ? parent.__pad : {
        index: 0, id: "Xbox reset fixture", mapping: "standard", connected: true,
        axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })),
      };
      Object.defineProperty(navigator, "getGamepads", { value: () => [window.__pad] });
      window.__tick = time => { const batch = callbacks; callbacks = []; batch.forEach(cb => cb(time)); };
      window.__advance = (n = 3) => {
        for (let i = 0; i < n; i++) {
          now += 1000 / 60; window.__tick(now);
          for (let j = 0; j < frames.length; j++) frames[j].__tick?.(now);
        }
      };
    });
    const page = await context.newPage(), errors = [], nativeDialogs = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(response.url()); });
    page.on("dialog", async dialog => { nativeDialogs.push(dialog.message()); await dialog.dismiss(); });
    const advance = () => page.evaluate(() => window.__advance());
    async function tapButton(index) {
      for (const down of [true, false]) {
        await page.evaluate(({ index, down }) => {
          window.__pad.buttons[index] = { pressed: down, value: Number(down) }; window.__advance();
        }, { index, down });
      }
    }
    async function controllerClick(locator) {
      const box = await locator.boundingBox(); assert.ok(box);
      const target = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      const actual = await page.evaluate(({ x, y }) => {
        const pointer = document.getElementById("study-gamepad-cursor");
        for (let i = 0; i < 300; i++) {
          const dx = x - parseFloat(pointer.style.left), dy = y - parseFloat(pointer.style.top);
          if (Math.hypot(dx, dy) < .5) break;
          const axis = d => Math.abs(d) < .2 ? 0 : Math.sign(d) * (.25 + .75 * Math.min(1, Math.abs(d) / (650 / 60)));
          window.__pad.axes = [0, 0, axis(dx), axis(dy)]; window.__advance(1);
        }
        window.__pad.axes = [0, 0, 0, 0]; window.__advance(1);
        return { x: parseFloat(pointer.style.left), y: parseFloat(pointer.style.top), visible: !pointer.hidden };
      }, target);
      assert.ok(actual.visible && Math.hypot(actual.x - target.x, actual.y - target.y) < 1);
      await tapButton(0);
    }
    for (const [path, api, reset] of [
      ["index.html", "__HANZI_APP__", "resetProgress"],
      ["pinyin.html", "__PINYIN_APP__", "resetPinyin"],
      ["phonetics.html", "__PHONETICS_APP__", "resetPhonetics"],
      ["word-learning.html", "__WORD_LEARNING__", "resetWords"],
    ]) {
      await page.goto(`${base}${path}?test=reset-dialog`); await page.bringToFront();
      await page.waitForFunction(api => Boolean(window[api]), api, { polling: 50 });
      await page.evaluate(api => {
        window[api].dispatch("startDaily");
        localStorage.setItem("reset-dialog-other-module", "keep");
      }, api);
      await advance();
      const snapshot = () => page.evaluate(api => localStorage.getItem(window[api].getStorageKey()), api);
      const before = await snapshot();
      const open = async () => {
        await page.locator(`#${reset}`).click();
        await page.locator("[role=dialog]").waitFor();
        await page.waitForFunction(() => getComputedStyle(document.querySelector(".study-dialog-overlay")).position === "fixed", null, { polling: 50 });
        assert.equal(await page.evaluate(() => document.activeElement.hasAttribute("data-study-dialog-cancel")), true);
      };
      // Cancel at either stage must retain the complete original save.
      await open(); await controllerClick(page.locator("[data-study-dialog-cancel]"));
      assert.equal(await page.locator("[role=dialog]").count(), 0); assert.equal(await snapshot(), before);
      await open(); await controllerClick(page.locator("[data-study-dialog-confirm]"));
      await page.waitForFunction(() => document.querySelector("#study-dialog-title")?.textContent.includes("最后确认"), null, { polling: 50 });
      assert.equal(await snapshot(), before);
      await tapButton(5); // Actual shared R1 handling cancels instead of navigating.
      assert.equal(await page.locator("[role=dialog]").count(), 0); assert.equal(await snapshot(), before);
      if (path === "index.html") {
        await open(); await page.keyboard.press("Tab");
        assert.equal(await page.evaluate(() => document.activeElement.hasAttribute("data-study-dialog-confirm")), true);
        await page.keyboard.press("Tab");
        assert.equal(await page.evaluate(() => document.activeElement.hasAttribute("data-study-dialog-cancel")), true);
        await page.keyboard.press("Escape"); assert.equal(await snapshot(), before);
        // Fullscreen uses the same overlay and shared gamepad pointer.
        await page.evaluate(() => {
          const button = document.createElement("button"); button.id = "reset-test-fullscreen";
          button.onclick = () => document.documentElement.requestFullscreen(); document.body.prepend(button);
        });
        await page.locator("#reset-test-fullscreen").click();
        await page.waitForFunction(() => Boolean(document.fullscreenElement), null, { polling: 50 });
      }
      await open();
      const backgroundBefore = await page.evaluate(() => document.getElementById("pinyinLine")?.textContent);
      await tapButton(3); // Y must not reveal the lesson behind the dialog.
      assert.equal(await page.evaluate(() => document.getElementById("pinyinLine")?.textContent), backgroundBefore);
      assert.equal(await snapshot(), before);
      const geometry = await page.locator(".study-dialog").evaluate(panel => {
        const box = panel.getBoundingClientRect();
        return { fit: box.left >= 0 && box.top >= 0 && box.right <= innerWidth && box.bottom <= innerHeight,
          overflow: document.documentElement.scrollWidth > innerWidth };
      });
      assert.deepEqual(geometry, { fit: true, overflow: false });
      if (path === "index.html") await page.screenshot({ path: `tmp/reset-dialog-${width}.png` });
      if (width === 390) await page.locator("[data-study-dialog-confirm]").tap();
      else await controllerClick(page.locator("[data-study-dialog-confirm]"));
      await page.waitForFunction(() => document.querySelector("#study-dialog-title")?.textContent.includes("最后确认"), null, { polling: 50 });
      assert.equal(await snapshot(), before);
      await controllerClick(page.locator("[data-study-dialog-confirm]"));
      await page.waitForFunction(() => !document.querySelector("[role=dialog]"), null, { polling: 50 });
      assert.notEqual(await snapshot(), before);
      assert.equal(await page.evaluate(api => window[api].getState().dailyTaskStarted, api), false);
      assert.equal(await page.evaluate(() => localStorage.getItem("reset-dialog-other-module")), "keep");
      assert.equal(await page.evaluate(() => document.querySelectorAll("[inert]").length), 0);
      // A subsequent controller click still opens the flow; R1 cancels it again.
      await page.locator(`#${reset}`).scrollIntoViewIfNeeded(); await advance();
      await controllerClick(page.locator(`#${reset}`)); await page.locator("[role=dialog]").waitFor();
      await tapButton(5); assert.equal(await page.locator("[role=dialog]").count(), 0);
    }
    // The parent cursor must also click an in-page dialog in the persistent module iframe.
    await page.evaluate(() => window.STUDY_FULLSCREEN_SHELL.navigate("pinyin.html?test=reset-dialog-shell"));
    await page.waitForFunction(() => !window.STUDY_FULLSCREEN_SHELL.isNavigating(), null, { polling: 50 });
    const frame = await (await page.locator("#study-module-frame").elementHandle()).contentFrame();
    await frame.waitForFunction(() => Boolean(window.__PINYIN_APP__), null, { polling: 50 }); await advance();
    await frame.locator("#resetPinyin").click();
    await frame.waitForFunction(() => getComputedStyle(document.querySelector(".study-dialog-overlay")).position === "fixed", null, { polling: 50 });
    await controllerClick(frame.locator("[data-study-dialog-confirm]"));
    await frame.waitForFunction(() => document.querySelector("#study-dialog-title")?.textContent.includes("最后确认"), null, { polling: 50 });
    await tapButton(5); assert.equal(await frame.locator("[role=dialog]").count(), 0);
    assert.deepEqual(nativeDialogs, []); assert.deepEqual(errors, []);
    console.log(`PASS Microsoft Edge ${width}: four reset flows, both cancellations, save isolation, keyboard/touch, fullscreen and iframe controller operation (simulated gamepad)`);
    await context.close();
  }
} finally { await browser.close(); }
