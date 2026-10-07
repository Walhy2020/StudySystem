import assert from "node:assert/strict";
import fs from "node:fs";
import { loadChromium } from "./playwright-runtime.mjs";
const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const key = "mario-bomb-game-progress-v1";
const aimOnly = process.argv.includes("--aim-only");
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
fs.mkdirSync("tmp", { recursive: true });
const results = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addInitScript(() => {
      let callbacks = [], now;
      window.requestAnimationFrame = callback => { callbacks.push(callback); return callbacks.length; };
      window.__pad = { index: 0, id: "Standard PS5 fixture", mapping: "standard", connected: true,
        axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })) };
      Object.defineProperty(navigator, "getGamepads", { value: () => [window.__pad] });
      window.__advance = seconds => {
        now ??= performance.now();
        for (let i = 0; i < Math.ceil(seconds * 60); i++) {
          now += 1000 / 60; const batch = callbacks; callbacks = []; batch.forEach(callback => callback(now));
        }
      };
      const originalMove = CanvasRenderingContext2D.prototype.moveTo;
      window.__largeAimArrows = 0;
      CanvasRenderingContext2D.prototype.moveTo = function (x, y) {
        if (x === 48 && y === 0) window.__largeAimArrows++;
        return originalMove.call(this, x, y);
      };
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(response.url()); });
    const read = () => page.evaluate(() => window.__BOMB_GAME__.getState());
    const advance = seconds => page.evaluate(seconds => window.__advance(seconds), seconds);
    const button = (index, pressed) => page.evaluate(({ index, pressed }) => {
      window.__pad.buttons[index] = { pressed, value: pressed ? 1 : 0 };
    }, { index, pressed });
    const axes = (x, y) => page.evaluate(({ x, y }) => { window.__pad.axes[0] = x; window.__pad.axes[1] = y; }, { x, y });
    async function tap(index) { await button(index, true); await advance(0.02); await button(index, false); await advance(0.02); }
    async function load(saved) {
      await page.goto(base + "bomb-game.css?aim-fixture=1");
      await page.evaluate(({ key, saved }) => localStorage.setItem(key, JSON.stringify(saved)), { key, saved });
      await page.goto(base + "bomb-game.html?aim-fullscreen=1"); await advance(0.02);
      await page.locator("#overlayStartBombGame").click(); await advance(0.02);
    }
    await page.goto(base + "bomb-game.html?aim-fullscreen=1");
    await page.locator("#overlayStartBombGame").click(); await advance(0.02);
    const fixture = await read(), rows = fixture.map.length, cols = fixture.map[0].length;
    fixture.map = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) =>
      !x || !y || x === cols - 1 || y === rows - 1 ? 1 : 0));
    fixture.player = { gx: 3, gy: 3, move: null, invulnerable: 0, trail: [{ gx: 3, gy: 3 }] };
    fixture.enemies = [{ ...fixture.enemies.find(enemy => enemy.type === "bowser"), gx: 20, gy: 10,
      move: null, stunTimer: 1000, freezeTimer: 1000 }];
    for (const field of ["bombs", "fireballs", "mushroomShots", "explosions", "powerUps", "shells", "particles", "hiddenPowerUps"]) fixture[field] = [];
    fixture.hiddenWordCrates = fixture.todayNewWords.map((word, i) => {
      fixture.map[10][8 + i] = 2; return [`${8 + i},10`, word.id];
    });
    await load(fixture);
    await axes(0, -1); await advance(0.02); assert.equal((await read()).attackDirection, "up");
    await button(15, true); await advance(0.1);
    assert.equal((await read()).attackDirection, "right", "walking automatically overrides stationary aim");
    await button(10, true); await advance(0.1);
    assert.equal((await read()).attackDirection, "right", "L3 has no effect while walking");
    assert.equal("attackFollowsMovement" in (await read()), false, "old lock setting removed from saves");
    await button(10, false); await button(15, false); await axes(-1, 0); await advance(0.2);
    assert.equal((await read()).attackDirection, "left", "stopped player accepts stick aim");
    await tap(10); assert.equal((await read()).attackDirection, "left", "L3 has no effect while stopped");
    await tap(0); assert.equal((await read()).mushroomShots.at(-1).direction, "left", "stationary attack uses stick aim");
    await page.screenshot({ path: `tmp/bomb-aim-stopped-${width}.png` });
    await button(13, true); await advance(0.25);
    assert.equal((await read()).attackDirection, "down", "walking resumes follow despite held left stick");
    await button(13, false); await button(15, true); await advance(0.02);
    assert.equal((await read()).attackDirection, "right", "new directional input changes aim before the buffered turn completes");
    await advance(0.25); assert.equal((await read()).attackDirection, "right", "successful turn follows automatically");
    await button(15, false); await button(13, true); await advance(0.25);
    await tap(0); assert.equal((await read()).mushroomShots.at(-1).direction, "down");
    await page.screenshot({ path: `tmp/bomb-aim-moving-${width}.png` });
    await button(13, false); await axes(0, 0); await advance(0.2);
    const legacy = await read(); legacy.attackFollowsMovement = true;
    assert.ok(await page.evaluate(() => window.__largeAimArrows > 0), "enlarged arrow is actually rendered");
    await load(legacy);
    assert.equal("attackFollowsMovement" in (await read()), false, "old true lock flag is ignored and not written back");
    await tap(10);
    await axes(0, -1); await advance(0.02); assert.equal((await read()).attackDirection, "up");
    await axes(0, 0); await button(15, true); await advance(0.2);
    assert.equal((await read()).attackDirection, "right", "resumed save uses automatic movement follow");
    await button(15, false); await advance(0.2);
    const corridor = structuredClone(fixture);
    corridor.attackDirection = "right";
    corridor.map[2][3] = 1; corridor.map[4][3] = 2;
    corridor.map[4][4] = corridor.map[4][5] = 1;
    await load(corridor);
    // A connected left stick must not override a blocked D-pad direction.
    await axes(0, -1); await button(13, true); await advance(0.02);
    assert.equal((await read()).attackDirection, "down");
    assert.deepEqual([(await read()).player.gx, (await read()).player.gy], [3,3]);
    await tap(0);
    assert.equal((await read()).mushroomShots.at(-1).direction, "down", "blocked direction also controls actual attacks");
    await advance(0.1); assert.equal(new Map((await read()).crateHp).get("3,4"), 2);
    await button(13, false); await axes(0,0); await advance(0.02);
    await page.locator("#bombCanvas").focus(); await page.keyboard.press("ArrowUp");
    assert.equal((await read()).attackDirection, "up", "keyboard turns aim into a wall even with a controller connected");
    await page.keyboard.down("ArrowRight"); await advance(0.06);
    const movingRight = await read(); assert.equal(movingRight.player.move.direction, "right");
    await page.keyboard.down("ArrowDown");
    assert.equal((await read()).attackDirection, "down", "blocked turn immediately aims down during a rightward step");
    await advance(0.35);
    assert.equal((await read()).attackDirection, "down", "fallback rightward movement does not overwrite requested aim");
    await page.keyboard.up("ArrowRight"); await page.keyboard.up("ArrowDown");
    await advance(0.25);
    const savedAim = await read();
    savedAim.attackDirection = "down";
    savedAim.player.move = { direction: "right", fromX: 3, fromY: 3, toX: 4, toY: 3, time: 0.06, duration: 0.18 };
    savedAim.player.gx = 3 + 1/3; savedAim.player.gy = 3;
    await load(savedAim);
    assert.equal((await read()).attackDirection, "down", "Continue preserves aim independent of a restored movement step");
    await page.locator("#bombSettingsToggle").click();
    const menuAim = (await read()).attackDirection;
    await button(12, true); await advance(0.05);
    assert.equal((await read()).attackDirection, menuAim, "settings keep directional input inactive");
    await button(12, false);
    await button(10, true); await advance(0.1);
    assert.equal("attackFollowsMovement" in (await read()), false, "menus cannot restore removed lock mode");
    await button(10, false); await advance(0.02);

    if (!aimOnly) {
    // Real browser fullscreen with a trusted button click, not a mocked fullscreenElement.
    await page.locator("#bombFullscreenToggle").click();
    await page.waitForFunction(() => document.fullscreenElement?.classList.contains("bomb-game-app"));
    await page.evaluate(() => { window.__pad.axes[2] = 1; }); await advance(0.15);
    await page.evaluate(() => { window.__pad.axes[2] = 0; }); await advance(0.02);
    await page.locator("#bombSettingsToggle").click();
    const pointer = page.locator("#study-gamepad-cursor");
    assert.equal(await pointer.isVisible(), true);
    assert.equal(await pointer.evaluate(node => document.fullscreenElement.contains(node)), true);
    assert.equal(await page.locator("#study-gamepad-help").evaluate(node => document.fullscreenElement.contains(node)), true);
    await page.locator("#bombAttackToggle").click();
    // Move the virtual pointer to the capture control in the fullscreen top layer.
    const rect = await page.locator("#mushroomAttackKey").boundingBox();
    const target = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    for (let i = 0; i < 240; i++) {
      const done = await page.evaluate(target => {
        const pointer = document.getElementById("study-gamepad-cursor").getBoundingClientRect();
        const dx = target.x - pointer.x - pointer.width / 2, dy = target.y - pointer.y - pointer.height / 2;
        window.__pad.axes[2] = Math.abs(dx) < 5 ? 0 : Math.sign(dx) * (Math.abs(dx) < 15 ? 0.4 : 1);
        window.__pad.axes[3] = Math.abs(dy) < 5 ? 0 : Math.sign(dy) * (Math.abs(dy) < 15 ? 0.4 : 1);
        return Math.abs(dx) < 5 && Math.abs(dy) < 5;
      }, target);
      await advance(0.02); if (done) break;
    }
    await page.evaluate(() => { window.__pad.axes[2] = 0; window.__pad.axes[3] = 0; }); await advance(0.02);
    await tap(0);
    const capture = page.locator("#mushroomAttackKey");
    assert.equal(await capture.getAttribute("aria-pressed"), "true");
    assert.equal(await capture.evaluate(node => document.fullscreenElement.contains(node)), true);
    await page.keyboard.press("KeyJ");
    assert.equal((await read()).mushroomKey, "KeyJ");
    await page.screenshot({ path: `tmp/bomb-cursor-fullscreen-${width}.png` });
    await page.evaluate(() => document.exitFullscreen());
    await page.waitForFunction(() => !document.fullscreenElement);
    assert.equal(await pointer.evaluate(node => node.parentElement === document.body), true);
    assert.equal(await page.locator("#study-gamepad-help").evaluate(node => node.parentElement === document.body), true);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    results.push({ width, mockGamepad: true, requestedDirectionAim: true, blockedDpadAndKeyboardAim: true, stationaryStickAim: true,
      l3NoAction: true, oldLockIgnored: true, enlargedArrow: true,
      actualFullscreen: !aimOnly, cursorAndSelectPopupTested: !aimOnly });
    await context.close();
  }
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", physicalControllerTested: false, results }));
} finally { await browser.close(); }
