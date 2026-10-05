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
      window.__pad = { index: 0, id: "Mock standard controller", mapping: "standard", connected: true,
        axes: [0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })) };
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
    const read = () => page.evaluate(() => window.__BOMB_GAME__.getState());
    const advance = seconds => page.evaluate(seconds => window.__advance(seconds), seconds);
    const axes = (x, y) => page.evaluate(({ x, y }) => { window.__pad.axes = [x, y]; }, { x, y });
    const button = (index, down) => page.evaluate(({ index, down }) => {
      window.__pad.buttons[index] = { pressed: down, value: down ? 1 : 0 };
    }, { index, down });
    async function tap(index) { await button(index, true); await advance(0.02); await button(index, false); await advance(0.02); }
    await page.goto(base + "bomb-game.html?gamepad=1");
    await advance(0.02); await page.screenshot({ path: `tmp/bomb-gamepad-start-${width}.png` });
    assert.equal(await page.locator("[data-gamepad-status]").last().textContent(), "手柄已连接");
    await tap(0); assert.equal((await read()).status, "playing");
    assert.equal((await read()).mushroomShots.length, 0, "A starts without throwing");
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
    fixture.lastDirection = "right"; fixture.throwDistance = 8;
    async function load(saved, start = true) {
      await page.goto(base + "bomb-game.css?gamepad-fixture=1");
      await page.evaluate(({ key, saved }) => localStorage.setItem(key, JSON.stringify(saved)), { key, saved });
      await page.goto(base + "bomb-game.html?gamepad=1"); await advance(0.02);
      if (start) { await tap(9); assert.equal((await read()).status, "playing"); }
    }
    await load(fixture, false); await axes(1, 0); await advance(0.3);
    assert.equal((await read()).player.gx, 2, "stick cannot bypass Continue");
    await axes(0, 0); await advance(0.02); await tap(9);
    assert.equal(await page.evaluate(() => window.__BOMB_GAME__.isAwaitingContinue()), false);
    await axes(0.2, 0.1); await advance(0.3); assert.equal((await read()).player.gx, 2);
    await axes(1, 0); await advance(0.3); assert.ok((await read()).player.gx > 3);
    await axes(0, 1); await advance(0.3); assert.ok((await read()).player.gy > 3, "turn is buffered during a step");
    await axes(0, 0); await advance(0.4); const stopped = (await read()).player;
    await advance(0.2); assert.equal((await read()).player.gy, stopped.gy);
    await load(fixture); await button(0, true); await advance(0.12);
    assert.equal((await read()).mushroomShots.length, 1, "held A throws only once");
    await button(0, false); await advance(0.02); await tap(0);
    assert.equal((await read()).mushroomShots.length, 2);
    await tap(1); assert.equal((await read()).bombs.filter(bomb => bomb.isIce).length, 1);
    await page.keyboard.press("Space"); assert.equal((await read()).mushroomShots.length, 3);
    await page.locator("#bombAttackToggle").click(); await tap(0); await axes(1, 0); await advance(0.2);
    assert.equal((await read()).mushroomShots.length, 3); assert.equal((await read()).player.gx, 2);
    await page.keyboard.press("Escape"); await page.locator("#bombCanvas").focus();
    await advance(0.1); assert.equal((await read()).player.gx, 2, "held stick after menu cannot drift");
    await axes(0, 0); await advance(0.02); await axes(1, 0); await advance(0.1);
    await page.keyboard.down("ArrowRight"); await axes(0, 0); await advance(0.3);
    assert.ok((await read()).player.gx > 3, "gamepad release preserves held keyboard direction");
    await page.keyboard.up("ArrowRight"); await advance(0.3);
    await axes(1, 0); await advance(0.1);
    await page.evaluate(() => { window.__pad.connected = false; }); await advance(0.4);
    const disconnectedX = (await read()).player.gx; await advance(0.3);
    assert.equal((await read()).player.gx, disconnectedX);
    await page.evaluate(() => { window.__pad.connected = true; }); await advance(0.3);
    assert.equal((await read()).player.gx, disconnectedX, "reconnect requires neutral");

    const damage = structuredClone(fixture); damage.player.invulnerable = 0;
    Object.assign(damage.enemies[0], { gx: 3, gy: 3, stunTimer: 0, freezeTimer: 0,
      move: { fromX: 3, fromY: 3, toX: 3, toY: 3, time: 0, duration: 1000 } });
    await load(damage); await axes(1, 0); await advance(0.35);
    assert.equal((await read()).hp, fixture.hp - 1);
    const damagedX = (await read()).player.gx; await advance(0.5);
    assert.equal((await read()).player.gx, damagedX, "damage requires releasing the held stick");
    await axes(0, 0); await advance(0.02); await button(12, true); await advance(0.2);
    assert.ok((await read()).player.gy < 3, "D-pad works after neutral");
    await button(12, false); await advance(0.2);

    const next = structuredClone(fixture); next.subLevel = 2; next.status = "ready"; next.startLayerHidden = false;
    next.map = next.map.map((row, y) => [...row.slice(0, -1), ...Array(2).fill(!y || y === rows - 1 ? 1 : 0), 1]);
    await load(next, false); await button(0, true); await advance(0.3);
    assert.equal((await read()).subLevel, 2); assert.equal((await read()).status, "playing");
    assert.equal((await read()).mushroomShots.length, 0, "next-level A confirmation is not an attack");
    await button(0, false); await advance(0.02); await tap(0);
    assert.equal((await read()).mushroomShots.length, 1);
    await load(next, false); await tap(9); assert.equal((await read()).status, "playing");
    await page.locator("#bombAttackToggle").click(); await advance(0.02);
    await page.screenshot({ path: `tmp/bomb-gamepad-help-${width}.png` });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    results.push({ width, mockStandardGamepad: true, movement: true, dualAttacks: true,
      startContinueNext: true, disconnectNeutral: true, damageNeutral: true, keyboardPreserved: true });
    await context.close();
  }
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", results }));
} finally { await browser.close(); }
