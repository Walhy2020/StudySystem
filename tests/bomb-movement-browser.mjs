import assert from "node:assert/strict";
import { loadChromium } from "./playwright-runtime.mjs";

const chromium = await loadChromium();
const baseUrl = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const gameUrl = baseUrl + "bomb-game.html?movement-acceptance=1";
const progressKey = "mario-bomb-game-progress-v1";
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
});
const results = [];

try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => {
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });
    await page.goto(gameUrl);
    await page.waitForFunction(() => Boolean(window.__BOMB_GAME__));
    const fixture = await page.evaluate(() => {
      const saved = window.__BOMB_GAME__.getState();
      const rows = saved.map.length;
      const columns = saved.map[0].length;
      saved.map = Array.from({ length: rows }, (_, y) => Array.from({ length: columns }, (_, x) =>
        x === 0 || y === 0 || x === columns - 1 || y === rows - 1 ? 1 : 0));
      saved.status = "playing";
      saved.startLayerHidden = true;
      saved.player = { gx: 3, gy: 3, move: null, invulnerable: 0, trail: [{ gx: 3, gy: 3 }] };
      saved.bombs = [];
      saved.explosions = [];
      saved.shells = [];
      saved.powerUps = [];
      saved.hiddenPowerUps = [];
      saved.hiddenWordCrates = [];
      saved.moonWordIds = saved.todayNewWords.map(word => word.id);
      saved.enemies = [{ ...saved.enemies.find(enemy => enemy.type === "mushroom"),
        gx: columns - 2, gy: rows - 2, move: null, stunTimer: 1000, alive: true }];
      return saved;
    });
    assert.equal(fixture.moonWordIds.length, 5);

    async function loadFixture(saved = fixture) {
      await page.goto(baseUrl + "bomb-game.css?movement-fixture=1");
      await page.evaluate(({ key, saved }) => localStorage.setItem(key, JSON.stringify(saved)), { key: progressKey, saved });
      await page.goto(gameUrl);
      await page.waitForFunction(() => Boolean(window.__BOMB_GAME__));
      assert.equal(await page.evaluate(() => window.__BOMB_GAME__.isAwaitingContinue()), true);
      await page.locator("#overlayStartBombGame").click();
      const setup = await page.evaluate(() => window.__BOMB_GAME__.getState());
      assert.equal(setup.map[3][3], 0);
      assert.equal(setup.map[3][4], 0);
      assert.equal(setup.map[2][4], saved.map[2][4]);
      assert.deepEqual([setup.player.gx, setup.player.gy], [3, 3]);
    }

    await loadFixture();
    await page.keyboard.down("ArrowRight");
    await page.waitForFunction(() => window.__BOMB_GAME__.getState().player.gx > 4.05, null, { timeout: 5000 });
    await page.keyboard.up("ArrowRight");
    await page.waitForFunction(() => !window.__BOMB_GAME__.getState().player.move);
    const continuous = await page.evaluate(() => window.__BOMB_GAME__.getState().player);
    assert.ok(Number.isInteger(continuous.gx) && continuous.gx >= 5, "held movement crosses cells and stops at a center");

    await loadFixture();
    await page.keyboard.down("ArrowRight");
    await page.evaluate(async () => {
      await new Promise(resolve => {
        const tapTurn = () => {
          const player = window.__BOMB_GAME__.getState().player;
          if (player.move?.direction === "right" && player.gx >= 3.3 && player.gx <= 3.7) {
            window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowUp", key: "ArrowUp", bubbles: true }));
            window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowUp", key: "ArrowUp", bubbles: true }));
            resolve();
          } else requestAnimationFrame(tapTurn);
        };
        tapTurn();
      });
    });
    await page.keyboard.up("ArrowRight");
    await page.waitForFunction(() => window.__BOMB_GAME__.getState().player.gy < 3);
    const turned = await page.evaluate(() => window.__BOMB_GAME__.getState().player);
    assert.equal(turned.gx, 4, "a quick turn waits until the cell center");

    const earlyTurnFixture = structuredClone(fixture);
    earlyTurnFixture.map[2][4] = 1;
    await loadFixture(earlyTurnFixture);
    await page.keyboard.down("ArrowRight");
    await page.evaluate(async () => {
      await new Promise(resolve => {
        const tapTurn = () => {
          const player = window.__BOMB_GAME__.getState().player;
          if (player.move?.direction === "right" && player.gx >= 3.3 && player.gx <= 3.7) {
            window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowUp", key: "ArrowUp", bubbles: true }));
            window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowUp", key: "ArrowUp", bubbles: true }));
            resolve();
          } else requestAnimationFrame(tapTurn);
        };
        tapTurn();
      });
    });
    await page.waitForFunction(() => window.__BOMB_GAME__.getState().player.gy < 3);
    await page.keyboard.up("ArrowRight");
    const earlyTurn = await page.evaluate(() => window.__BOMB_GAME__.getState().player);
    assert.equal(earlyTurn.gx, 5, "an early tap survives the blocked first junction and turns at the next one");

    await loadFixture();
    await page.keyboard.down("ArrowRight");
    const target = await page.evaluate(async () => {
      return new Promise(resolve => {
        const queueBomb = () => {
          const player = window.__BOMB_GAME__.getState().player;
          if (player.move?.direction === "right" && player.gx >= 3.3 && player.gx <= 3.7) {
            const target = [player.move.toX, player.move.toY];
            window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyB", key: "b", bubbles: true }));
            resolve(target);
          } else requestAnimationFrame(queueBomb);
        };
        queueBomb();
      });
    });
    await page.keyboard.up("ArrowRight");
    await page.waitForFunction(() => window.__BOMB_GAME__.getState().bombs.length === 1);
    const dropped = await page.evaluate(() => window.__BOMB_GAME__.getState().bombs[0]);
    assert.deepEqual([dropped.gx, dropped.gy], target, "B during movement drops at the next cell center");
    await page.waitForFunction(() => !window.__BOMB_GAME__.getState().player.move);

    await page.locator("#bombSoundToggle").focus();
    const beforeButtonKey = await page.evaluate(() => window.__BOMB_GAME__.getState().player);
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(80);
    const afterButtonKey = await page.evaluate(() => window.__BOMB_GAME__.getState().player);
    assert.deepEqual([afterButtonKey.gx, afterButtonKey.gy], [beforeButtonKey.gx, beforeButtonKey.gy], "focused controls keep native arrow behavior");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    results.push({ width, continuous: continuous.gx, turn: [turned.gx, turned.gy], earlyTurn: [earlyTurn.gx, earlyTurn.gy], bomb: target });
    await context.close();
  }
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", results }));
} finally {
  await browser.close();
}
