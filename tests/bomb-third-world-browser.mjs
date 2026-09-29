import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadChromium } from "./playwright-runtime.mjs";

const chromium = await loadChromium();
const baseUrl = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const gameUrl = baseUrl + "bomb-game.html?third-world-acceptance=1";
const progressKey = "mario-bomb-game-progress-v1";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "tmp");
fs.mkdirSync(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
});
const results = [];

try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 900 },
      hasTouch: width === 390,
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => {
      if (response.status() >= 400 && response.url().startsWith(baseUrl)) {
        errors.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto(baseUrl + "bomb-game.css?third-world-clear=1");
    await page.evaluate(key => localStorage.removeItem(key), progressKey);
    await page.goto(gameUrl);
    await page.waitForFunction(() => Boolean(window.__BOMB_GAME__));
    const oldWin = await page.evaluate(() => {
      const saved = window.__BOMB_GAME__.getState();
      saved.world = 2;
      saved.subLevel = 5;
      saved.status = "win";
      saved.map = Array.from({ length: 11 }, (_, y) => Array.from({ length: 25 }, (_, x) =>
        x === 0 || y === 0 || x === 24 || y === 10 ? 1 : 0));
      return saved;
    });
    await page.goto(baseUrl + "bomb-game.css?third-world-old-playing=1");
    await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
      { key: progressKey, value: { ...oldWin, status: "playing" } });
    await page.goto(gameUrl);
    await page.waitForFunction(() => Boolean(window.__BOMB_GAME__));
    const oldPlaying = await page.evaluate(() => window.__BOMB_GAME__.getLevelLayout());
    assert.equal(oldPlaying.world, 2, "in-progress world 2 is not advanced");
    assert.equal(oldPlaying.cols, 25);
    assert.equal(oldPlaying.rows, 11);
    assert.equal(await page.evaluate(() => window.__BOMB_GAME__.isAwaitingContinue()), true);
    await page.goto(baseUrl + "bomb-game.css?third-world-seed=1");
    await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
      { key: progressKey, value: oldWin });
    await page.goto(gameUrl);
    await page.waitForFunction(() => window.__BOMB_GAME__?.getLevelLayout().world === 3);

    const opening = await page.evaluate(() => ({
      layout: window.__BOMB_GAME__.getLevelLayout(),
      state: window.__BOMB_GAME__.getState(),
      constants: window.__BOMB_GAME__.getConstants(),
      targets: window.__BOMB_GAME__.getBoardTargetSummary(),
    }));
    assert.equal(opening.constants.worlds, 3);
    assert.equal(opening.constants.levelsPerWorld, 5);
    assert.equal(opening.layout.subLevel, 1);
    assert.equal(opening.layout.cols, 27);
    assert.equal(opening.layout.rows, 15);
    assert.equal(opening.layout.tile, 48);
    assert.equal(opening.layout.enemyCount, 4);
    assert.equal(opening.layout.hiddenBulletBills, 2);
    assert.equal(opening.targets.hiddenTargetIds.length, 5);
    assert.equal(opening.state.status, "ready", "old 2-5 win opens at a safe 3-1 start gate");
    assert.equal(await page.locator("#bombStartLayer").isVisible(), true);

    await page.locator("#overlayStartBombGame").click();
    await page.screenshot({ path: path.join(output, `bomb-third-world-${width}.png`) });
    const fixture = await page.evaluate(() => {
      const saved = window.__BOMB_GAME__.getState();
      const ids = saved.todayNewWords.map(word => word.id);
      saved.map = Array.from({ length: 15 }, (_, y) => Array.from({ length: 27 }, (_, x) =>
        x === 0 || y === 0 || x === 26 || y === 14 ? 1 : 0));
      saved.hiddenWordCrates = ids.map((id, index) => {
        saved.map[13][20 + index] = 2;
        return [`${20 + index},13`, id];
      });
      saved.hiddenPowerUps = [];
      saved.enemies = [];
      saved.powerUps = [];
      saved.bombs = [];
      saved.mushroomShots = [];
      saved.explosions = [];
      saved.shells = [];
      saved.player = { gx: 1, gy: 1, move: null, invulnerable: 0, trail: [{ gx: 1, gy: 1 }] };
      saved.status = "playing";
      saved.startLayerHidden = true;
      return saved;
    });
    await page.goto(baseUrl + "bomb-game.css?third-world-move=1");
    await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
      { key: progressKey, value: fixture });
    await page.goto(gameUrl);
    await page.waitForFunction(() => Boolean(window.__BOMB_GAME__));
    assert.equal(await page.evaluate(() => window.__BOMB_GAME__.isAwaitingContinue()), true);
    await page.locator("#overlayStartBombGame").click();
    await page.locator("#bombCanvas").focus();
    await page.keyboard.down("ArrowRight");
    await page.waitForFunction(() => window.__BOMB_GAME__.getLevelLayout().camera.x <= -100);
    await page.keyboard.up("ArrowRight");
    await page.keyboard.down("ArrowDown");
    await page.waitForFunction(() => window.__BOMB_GAME__.getLevelLayout().camera.y <= -100);
    await page.keyboard.up("ArrowDown");
    const moved = await page.evaluate(() => window.__BOMB_GAME__.getLevelLayout());
    assert.equal(moved.tile, 48, "camera never changes the tile size");
    assert.ok(moved.playerScreen.x >= moved.viewport.x &&
      moved.playerScreen.x <= moved.viewport.x + moved.viewport.width);
    assert.ok(moved.playerScreen.y >= moved.viewport.y &&
      moved.playerScreen.y <= moved.viewport.y + moved.viewport.height);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(output, `bomb-third-world-follow-${width}.png`) });
    await page.waitForTimeout(500);
    await page.reload();
    await page.waitForFunction(() => Boolean(window.__BOMB_GAME__));
    const resumed = await page.evaluate(() => window.__BOMB_GAME__.getLevelLayout());
    assert.equal(await page.evaluate(() => window.__BOMB_GAME__.isAwaitingContinue()), true);
    assert.equal(resumed.world, 3);
    assert.ok(resumed.camera.x < 0 && resumed.camera.y < 0, "camera follows restored player position");

    for (let subLevel = 2; subLevel <= 5; subLevel += 1) {
      const cols = 27 + (subLevel - 1) * 2;
      const levelSave = structuredClone(fixture);
      levelSave.subLevel = subLevel;
      levelSave.map = Array.from({ length: 15 }, (_, y) => Array.from({ length: cols }, (_, x) =>
        x === 0 || y === 0 || x === cols - 1 || y === 14 ? 1 : 0));
      levelSave.hiddenWordCrates.forEach(([key]) => {
        const [gx, gy] = key.split(",").map(Number);
        levelSave.map[gy][gx] = 2;
      });
      levelSave.player.gx = cols - 2;
      levelSave.player.gy = 12;
      await page.goto(baseUrl + `bomb-game.css?third-world-level-${subLevel}=1`);
      await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
        { key: progressKey, value: levelSave });
      await page.goto(gameUrl);
      await page.waitForFunction(() => Boolean(window.__BOMB_GAME__));
      const level = await page.evaluate(() => ({
        layout: window.__BOMB_GAME__.getLevelLayout(),
        constants: window.__BOMB_GAME__.getConstants(),
      }));
      assert.equal(level.layout.subLevel, subLevel);
      assert.equal(level.layout.cols, cols);
      assert.equal(level.layout.rows, 15);
      assert.equal(level.layout.tile, 48);
      assert.equal(level.constants.bulletBill.hiddenCountPerLevel, subLevel + 1);
      assert.ok(level.layout.playerScreen.x <= level.layout.viewport.x + level.layout.viewport.width);
      assert.ok(level.layout.playerScreen.y <= level.layout.viewport.y + level.layout.viewport.height);
    }
    assert.deepEqual(errors, []);
    results.push({ width, world: opening.layout.world, levels: opening.constants.levelsPerWorld,
      openingCols: opening.layout.cols, rows: opening.layout.rows,
      enemies: opening.layout.enemyCount, missiles: opening.layout.hiddenBulletBills,
      camera: moved.camera, savedCamera: resumed.camera });
    await context.close();
  }
  process.stdout.write(JSON.stringify({ ok: true, results }) + "\n");
} finally {
  await browser.close();
}
