import assert from "node:assert/strict";
import fs from "node:fs";
import { loadChromium } from "./playwright-runtime.mjs";
const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
fs.mkdirSync("tmp", { recursive: true });
const results = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width === 390 });
    await context.addInitScript(() => {
      let callbacks = [], now;
      window.requestAnimationFrame = cb => { callbacks.push(cb); return callbacks.length; };
      window.__pad = { index: 0, id: "PS5 shell fixture", mapping: "standard", connected: true, axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })) };
      Object.defineProperty(navigator, "getGamepads", { value: () => [window.__pad] });
      window.__advance = seconds => {
        now ??= performance.now();
        for (let i = 0; i < Math.ceil(seconds * 60); i++) {
          now += 1000 / 60; const batch = callbacks; callbacks = []; batch.forEach(cb => cb(now));
        }
      };
      window.__exits = 0;
      document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement) window.__exits++; });
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(response.url()); });
    const advance = (surface, s = 0.05) => surface.evaluate(s => window.__advance(s), s);
    const button = (surface, index, pressed) => surface.evaluate(({ index, pressed }) => {
      window.__pad.buttons[index] = { pressed, value: pressed ? 1 : 0 };
    }, { index, pressed });
    async function tap(surface, index) { await button(surface, index, true); await advance(surface); await button(surface, index, false); await advance(surface); }
    async function activate() {
      await page.evaluate(() => {
        const node = document.createElement("button"); node.id = "shell-activation"; node.textContent = "Activation fixture";
        node.style.cssText = "position:fixed;top:0;left:0;z-index:2147483647"; document.body.append(node);
      });
      await page.locator("#shell-activation").click(); await page.evaluate(() => document.getElementById("shell-activation").remove());
      await advance(page); await tap(page, 7);
      await page.waitForFunction(() => Boolean(document.fullscreenElement));
    }
    async function moduleFrame(name) {
      const element = await page.waitForSelector("#study-module-frame");
      const frame = await element.contentFrame();
      await frame.waitForURL(url => url.pathname.endsWith(name + ".html"));
      await frame.waitForFunction(() => Boolean(window.STUDY_GAMEPAD_CURSOR) && Boolean(window.STUDY_FULLSCREEN_SHELL));
      await advance(frame);
      assert.equal(await page.evaluate(() => Boolean(document.fullscreenElement)), true);
      assert.equal(await page.evaluate(() => window.__exits), 0, "fullscreen never exits during module switches");
      assert.equal(await page.locator("#study-module-frame").count(), 1, "one reusable frame, no nested shell");
      assert.equal(await frame.locator("#study-module-frame").count(), 0);
      assert.equal(await frame.evaluate(() => window.STUDY_FULLSCREEN_SHELL.isEmbedded()), true);
      const rect = await page.locator("#study-module-frame").boundingBox();
      assert.ok(rect.x === 0 && rect.y === 0 && Math.abs(rect.width - width) < 1 && Math.abs(rect.height - 900) < 1);
      assert.equal(await frame.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      return frame;
    }
    await page.goto(base + "phonetics.html?shell-check=1");
    await page.waitForFunction(() => document.getElementById("appVersionLabel")?.textContent === "v1.0.57");
    const phoneticsBefore = await page.evaluate(() => localStorage.getItem("mario-phonetics-v1"));
    await activate();
    await page.locator('a[href="./index.html"]').click();
    let frame = await moduleFrame("index");
    for (const name of ["pinyin", "book-learning", "theme-learning", "scenario-learning", "review-learning", "phonetics"]) {
      const link = frame.locator(`a[href="./${name}.html"]`).first();
      if (name === "theme-learning") { await link.focus(); await link.press("Enter"); }
      else if (name === "review-learning" && width === 390) await link.tap();
      else await link.click();
      frame = await moduleFrame(name);
      assert.equal(await frame.locator("#study-gamepad-cursor").isVisible(), true);
    }
    await page.evaluate(() => history.back()); frame = await moduleFrame("review-learning");
    await page.evaluate(() => history.forward()); frame = await moduleFrame("phonetics");
    const phoneticsAfter = JSON.parse(await frame.evaluate(() => localStorage.getItem("mario-phonetics-v1")));
    for (const [key, value] of Object.entries(JSON.parse(phoneticsBefore))) {
      assert.deepEqual(phoneticsAfter[key], value, `source progress preserved: ${key}`);
    }
    await page.screenshot({ path: `tmp/fullscreen-shell-learning-${width}.png` });
    // The actual gamepad pointer selects Hanzi while the outer fullscreen stays intact.
    await frame.locator('a[href="./index.html"]').scrollIntoViewIfNeeded();
    const target = await frame.locator('a[href="./index.html"]').boundingBox();
    for (let i = 0; i < 220; i++) {
      const done = await frame.evaluate(target => {
        const rect = document.getElementById("study-gamepad-cursor").getBoundingClientRect();
        const dx = target.x + target.width / 2 - rect.x - rect.width / 2;
        const dy = target.y + target.height / 2 - rect.y - rect.height / 2;
        window.__pad.axes[2] = Math.abs(dx) < 4 ? 0 : Math.sign(dx) * (Math.abs(dx) < 15 ? 0.4 : 1);
        window.__pad.axes[3] = Math.abs(dy) < 4 ? 0 : Math.sign(dy) * (Math.abs(dy) < 15 ? 0.4 : 1);
        return Math.abs(dx) < 4 && Math.abs(dy) < 4;
      }, target);
      await advance(frame, 0.02); if (done) break;
    }
    await frame.evaluate(() => { window.__pad.axes = [0, 0, 0, 0]; }); await advance(frame);
    await button(frame, 0, true); await advance(frame);
    frame = await moduleFrame("index");
    await frame.locator('a[href*="bomb-game.html"]').first().click(); frame = await moduleFrame("bomb-game");
    await frame.locator("#overlayStartBombGame").click(); await advance(frame);
    const bombBefore = await frame.evaluate(() => window.__BOMB_GAME__.getState());
    await frame.locator('a[href="./index.html"]').click(); frame = await moduleFrame("index");
    await frame.locator('a[href*="bomb-game.html"]').first().click(); frame = await moduleFrame("bomb-game");
    const bombAfter = await frame.evaluate(() => window.__BOMB_GAME__.getState());
    assert.equal(await frame.locator("#overlayStartBombGame").innerText(), "继续");
    assert.equal(bombAfter.hp, bombBefore.hp); assert.deepEqual(bombAfter.map, bombBefore.map);
    assert.equal(bombAfter.dayClock, bombBefore.dayClock, "no background game progression before Continue");
    await page.screenshot({ path: `tmp/fullscreen-shell-bomb-${width}.png` });
    // R2 exits the outer fullscreen and opens the currently visible module normally.
    await button(frame, 7, true); await advance(frame);
    await page.waitForFunction(() => !document.fullscreenElement && !document.getElementById("study-module-frame") && Boolean(window.__BOMB_GAME__));
    assert.ok(page.url().includes("bomb-game.html"));
    assert.equal((await page.evaluate(() => window.__BOMB_GAME__.getState())).hp, bombBefore.hp);

    // Starting from bomb fullscreen uses the same host and fully freezes its dormant source.
    await page.locator("#overlayStartBombGame").click(); await advance(page);
    await activate(); await page.locator('a[href="./index.html"]').click(); frame = await moduleFrame("index");
    const sourceBomb = await page.evaluate(() => window.__BOMB_GAME__.getState());
    await advance(page, 1);
    assert.equal((await page.evaluate(() => window.__BOMB_GAME__.getState())).dayClock, sourceBomb.dayClock);
    assert.equal((await page.evaluate(() => window.__BOMB_GAME__.getState())).hp, sourceBomb.hp);
    await frame.locator('a[href="./phonetics.html"]').click(); frame = await moduleFrame("phonetics");
    await button(frame, 7, true); await advance(frame);
    await page.waitForFunction(() => !document.fullscreenElement && !document.getElementById("study-module-frame") && location.pathname.endsWith("phonetics.html"));
    assert.ok(page.url().includes("phonetics.html"), "exit never jumps back to the dormant bomb page");
    await page.locator('a[href="./index.html"]').click();
    await page.waitForURL(url => url.pathname.endsWith("index.html"));
    assert.equal(await page.locator("#study-module-frame").count(), 0, "windowed links still use normal navigation");
    // Browser-initiated exit (the same fullscreenchange path as Escape).
    await activate(); await page.locator('a[href="./phonetics.html"]').click(); frame = await moduleFrame("phonetics");
    await page.evaluate(() => document.exitFullscreen());
    await page.waitForFunction(() => !document.fullscreenElement && !document.getElementById("study-module-frame") && location.pathname.endsWith("phonetics.html"));
    for (const resource of ["src/fullscreen-shell.js?v=1.0", "fullscreen-shell.css?v=1.0", "src/gamepad-cursor.js?v=1.10", "bomb-game.js?v=2.34"]) {
      assert.equal((await page.request.get(base + resource)).status(), 200);
    }
    assert.deepEqual(errors, []);
    results.push({ width, allModules: true, uninterruptedFullscreen: true, gamepadNavigation: true,
      noNestedShell: true, gamePauseAndSave: true, exitCurrentModule: true, browserExit: true, history: true, windowedNavigation: true });
    await context.close();
  }
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", simulatedStandardGamepad: true, results }));
} finally { await browser.close(); }
