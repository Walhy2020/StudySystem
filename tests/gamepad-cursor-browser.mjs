import assert from "node:assert/strict";
import fs from "node:fs";
import { loadChromium } from "./playwright-runtime.mjs";
const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const key = "mario-bomb-game-progress-v1";
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const results = [];
fs.mkdirSync("tmp", { recursive: true });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(() => {
      let callbacks = [], now;
      window.requestAnimationFrame = callback => { callbacks.push(callback); return callbacks.length; };
      window.__pad = { index: 0, id: "Standard cursor fixture", mapping: "standard", connected: true,
        axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })) };
      Object.defineProperty(navigator, "getGamepads", { value: () => window.__pad.connected ? [window.__pad] : [] });
      window.__advance = seconds => {
        now ??= performance.now();
        for (let i = 0; i < Math.ceil(seconds * 60); i++) {
          now += 1000 / 60;
          const batch = callbacks; callbacks = []; batch.forEach(callback => callback(now));
        }
      };
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(response.url()); });
    const advance = seconds => page.evaluate(seconds => window.__advance(seconds), seconds);
    const button = (index, down) => page.evaluate(({ index, down }) => {
      window.__pad.buttons[index] = { pressed: down, value: down ? 1 : 0 };
    }, { index, down });
    async function tap(index = 0) { await button(index, true); await advance(0.02); await button(index, false); await advance(0.02); }
    async function aim(selector) {
      const target = await page.locator(selector).first().boundingBox();
      assert.ok(target, selector);
      const x = target.x + target.width / 2, y = target.y + target.height / 2;
      assert.ok(x >= 12 && x <= width - 12 && y >= 12 && y <= 888, `${selector} must be reachable in viewport`);
      await page.evaluate(({ x, y }) => {
        for (let i = 0; i < 200; i++) {
          const node = document.getElementById("study-gamepad-cursor");
          const dx = x - (parseFloat(node.style.left) || innerWidth / 2);
          const dy = y - (parseFloat(node.style.top) || innerHeight / 2);
          if (Math.hypot(dx, dy) < 1.5) break;
          const axis = delta => Math.abs(delta) < 0.7 ? 0 : Math.sign(delta) * (0.25 + 0.75 * Math.min(1, Math.abs(delta) / (650 / 60)));
          window.__pad.axes[2] = axis(dx); window.__pad.axes[3] = axis(dy);
          window.__advance(1 / 60);
        }
        window.__pad.axes = [0, 0, 0, 0]; window.__advance(1 / 60);
        const cursor = document.getElementById("study-gamepad-cursor");
        if (Math.hypot(parseFloat(cursor.style.left) - x, parseFloat(cursor.style.top) - y) > 2) throw Error("cursor missed target");
      }, { x, y });
    }
    for (const name of ["index", "pinyin", "book-learning", "theme-learning", "scenario-learning", "review-learning", "phonetics", "bomb-game"]) {
      await page.goto(base + name + ".html?cursor=1"); await advance(0.05);
      assert.equal(await page.locator("#study-gamepad-cursor").count(), 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    }
    await page.goto(base + "pinyin.html?cursor=1"); await advance(0.05);
    await aim('a[href="./index.html"]'); await button(0, true);
    await Promise.all([page.waitForURL(/index\.html/), advance(0.02).catch(error => {
      if (!error.message.includes("Execution context was destroyed")) throw error;
    })]);
    await advance(0.05);
    await page.evaluate(() => {
      const box = document.createElement("div"); box.id = "cursor-fixture";
      box.style.cssText = "position:fixed;left:40px;top:160px;z-index:1000;display:grid;width:150px;gap:10px";
      box.innerHTML = '<button id="cursor-count">计数</button><button disabled id="cursor-disabled">禁用</button><a id="cursor-external" href="https://example.com/" target="_blank">外部</a><a id="cursor-download" href="index.html" download>下载</a>';
      document.body.append(box); window.__count = 0;
      for (const id of ["cursor-count", "cursor-disabled", "cursor-external", "cursor-download"]) {
        document.getElementById(id).addEventListener("click", () => { window.__count++; });
      }
    });
    await aim("#cursor-count"); await button(0, true); await advance(0.3);
    assert.equal(await page.evaluate(() => window.__count), 1, "held click activates once");
    await button(0, false); await advance(0.02);
    for (const selector of ["#cursor-disabled", "#cursor-external", "#cursor-download"]) { await aim(selector); await tap(); }
    assert.equal(await page.evaluate(() => window.__count), 1); assert.equal(context.pages().length, 1);
    await page.evaluate(() => { window.__pad.axes = [1, 1, 1, 1]; }); await advance(2);
    const bounds = await page.locator("#study-gamepad-cursor").boundingBox();
    assert.ok(bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= width && bounds.y + bounds.height <= 900);
    await page.evaluate(() => { window.__pad.connected = false; }); await advance(0.02);
    assert.equal(await page.locator("#study-gamepad-cursor").isVisible(), false);
    await page.evaluate(() => { window.__pad.connected = true; }); await advance(0.1);
    assert.equal(await page.locator("#study-gamepad-cursor").isVisible(), false, "reconnection waits for neutral");
    await page.evaluate(() => { window.__pad.axes = [0, 0, 0, 0]; }); await advance(0.05);
    assert.equal(await page.locator("#study-gamepad-cursor").isVisible(), true);

    await page.goto(base + "theme-learning.html?cursor=1"); await advance(0.05);
    await aim('[data-series-id="festivals"]');
    const scrollBefore = await page.locator("#themeSeriesList").evaluate(node => node.scrollLeft);
    await tap(6);
    const scrollAfter = await page.locator("#themeSeriesList").evaluate(node => node.scrollLeft);
    assert.ok(scrollAfter > scrollBefore, "L2 scrolls the horizontal theme list");
    await page.locator('[data-series-id="basics"]').scrollIntoViewIfNeeded();
    await aim('[data-series-id="basics"]'); await tap();
    await aim('[data-theme-id="body"]'); await tap();
    await page.locator('#bodyScene [data-target="head"]').scrollIntoViewIfNeeded();
    await aim('#bodyScene [data-target="head"]'); await tap();
    assert.ok((await page.locator("#wordCard").textContent()).includes("head"), "SVG hotspot accepts the pointer click");
    await page.screenshot({ path: `tmp/gamepad-cursor-theme-${width}.png` });

    await page.goto(base + "bomb-game.html?cursor=1"); await advance(0.05);
    await aim("#overlayStartBombGame"); await tap();
    const read = () => page.evaluate(() => window.__BOMB_GAME__.getState());
    assert.equal((await read()).status, "playing");
    assert.equal((await read()).mushroomShots.length, 0, "menu A confirmation does not also attack");
    const fixture = await read();
    const rows = fixture.map.length, cols = fixture.map[0].length;
    fixture.map = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) =>
      !x || !y || x === cols - 1 || y === rows - 1 ? 1 : 0));
    fixture.player = { gx: 2, gy: 3, move: null, invulnerable: 1000, trail: [{ gx: 2, gy: 3 }] };
    fixture.enemies = [{ ...fixture.enemies.find(enemy => enemy.type === "bowser"), gx: 20, gy: 10,
      hp: 40, move: null, stunTimer: 1000, freezeTimer: 1000 }];
    for (const field of ["bombs", "fireballs", "mushroomShots", "explosions", "powerUps", "shells", "particles", "hiddenPowerUps"]) fixture[field] = [];
    fixture.hiddenWordCrates = fixture.todayNewWords.map((word, i) => {
      fixture.map[10][8 + i] = 2; return [`${8 + i},10`, word.id];
    });
    await page.goto(base + "bomb-game.css?cursor-fixture=1");
    await page.evaluate(({ key, fixture }) => localStorage.setItem(key, JSON.stringify(fixture)), { key, fixture });
    await page.goto(base + "bomb-game.html?cursor=1"); await advance(0.05);
    await tap(9); await aim("#bombSettingsToggle"); await tap(); await aim("#bombAvatarToggle");
    const paused = await read(); await advance(0.5);
    assert.equal((await read()).dayClock, paused.dayClock, "cursor menu pauses the game");
    await tap(); await aim('[data-avatar="super-mushroom"]'); await tap();
    assert.equal((await read()).playerAvatar, "super-mushroom");
    assert.equal((await read()).mushroomShots.length, 0);
    await aim("#bombSettingsToggle"); await tap(); await aim("#bombAttackToggle"); await tap(); await aim("#iceBombAttackKey"); await tap();
    assert.equal(await page.locator("#iceBombAttackKey").getAttribute("aria-pressed"), "true");
    await page.keyboard.press("KeyJ");
    assert.equal((await read()).iceBombKey, "KeyJ");
    await aim("#mushroomThrowDistance"); await tap(); assert.ok((await read()).throwDistance >= 4);
    await page.screenshot({ path: `tmp/gamepad-cursor-bomb-${width}.png` });
    await tap(3); assert.equal(await page.locator("#bombAttackMenu").isVisible(), false);
    assert.equal(await page.locator("#study-gamepad-cursor").isVisible(), false);
    await page.evaluate(() => { window.__pad.buttons[15] = { pressed: true, value: 1 }; }); await advance(0.2);
    assert.ok((await read()).player.gx > 2, "D-pad returns to gameplay after cursor mode");
    await page.evaluate(() => { window.__pad.buttons[15] = { pressed: false, value: 0 }; }); await advance(0.02);
    await tap(); assert.equal((await read()).mushroomShots.length, 1);
    await tap(1); assert.equal((await read()).bombs.filter(bomb => bomb.isIce).length, 1);
    await aim("#bombSettingsToggle"); await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    assert.equal(await page.locator("#study-gamepad-cursor").isVisible(), false);
    assert.deepEqual(errors, []);
    results.push({ width, sharedPages: 8, internalNavigation: true, blockedExternal: true,
      bounds: true, singleClicks: true, svgClick: true, selectRange: true, pausedMenus: true,
      gameControlsPreserved: true, simulatedStandardGamepad: true });
    await context.close();
  }
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", results }));
} finally { await browser.close(); }
