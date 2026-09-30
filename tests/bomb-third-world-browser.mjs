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
      saved.score = 123;
      saved.hp = 2;
      saved.bombLimit = 4;
      saved.flameRange = 3;
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
    assert.equal(oldPlaying.world, 3, "retired world 2 safely enters world 3");
    assert.equal(oldPlaying.cols, 27);
    assert.equal(oldPlaying.rows, 15);
    assert.equal(await page.evaluate(() => window.__BOMB_GAME__.isAwaitingContinue()), false);
    const migrated = await page.evaluate(() => window.__BOMB_GAME__.getState());
    assert.equal(migrated.status, "ready");
    assert.deepEqual([migrated.score, migrated.hp, migrated.bombLimit, migrated.flameRange], [123, 2, 4, 3]);
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
    assert.equal(opening.constants.worlds, 6);
    assert.equal(opening.constants.wordsPerRun, 100);
    assert.equal(opening.constants.levelsPerWorld, 5);
    assert.equal(opening.layout.subLevel, 1);
    assert.equal(opening.layout.cols, 27);
    assert.equal(opening.layout.rows, 15);
    assert.equal(opening.layout.tile, 48);
    assert.equal(opening.layout.enemyCount, 6);
    const openingEnemies = opening.state.enemies;
    assert.equal(openingEnemies.filter((enemy) => enemy.type === "bowser").length, 1);
    assert.equal(new Set(openingEnemies.map((enemy) => `${enemy.gx},${enemy.gy}`)).size, openingEnemies.length);
    assert.ok(openingEnemies.every((enemy) => opening.state.map[enemy.gy]?.[enemy.gx] === 0));
    assert.ok(openingEnemies.every((enemy) => enemy.gx !== 1 || enemy.gy !== 1));
    assert.equal(opening.layout.hiddenBulletBills, 2);
    assert.equal(opening.targets.hiddenTargetIds.length, 5);
    assert.equal(opening.state.status, "ready", "retired 2-5 save opens at a safe 3-1 start gate");
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
    const bowserStarts = new Set();
    let levelReady = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await page.goto(baseUrl + `bomb-game.css?third-world-random-${attempt}=1`);
      await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
        { key: progressKey, value: oldWin });
      await page.goto(gameUrl);
      await page.waitForFunction(() => window.__BOMB_GAME__?.getLevelLayout().world === 3);
      levelReady = await page.evaluate(() => window.__BOMB_GAME__.getState());
      const bowser = levelReady.enemies.find((enemy) => enemy.type === "bowser");
      assert.ok(bowser);
      assert.notDeepEqual([bowser.gx, bowser.gy], [1, 1]);
      assert.equal(levelReady.map[bowser.gy][bowser.gx], 0);
      bowserStarts.add(`${bowser.gx},${bowser.gy}`);
    }
    assert.ok(bowserStarts.size >= 2, "Bowser does not reuse one fixed corner across new levels");
    const thirdWorldCounts = [levelReady.enemies.length];
    for (let subLevel = 2; subLevel <= 5; subLevel += 1) {
      const completed = structuredClone(levelReady);
      completed.status = "playing";
      completed.startLayerHidden = true;
      completed.enemies = [{ ...completed.enemies[0], alive: false }];
      completed.moonWordIds = completed.todayNewWords.map((word) => word.id);
      completed.hiddenPowerUps = [];
      completed.hiddenWordCrates = [];
      completed.powerUps = [];
      completed.bombs = [];
      completed.explosions = [];
      completed.player.invulnerable = 20;
      await page.goto(baseUrl + `bomb-game.css?third-world-complete-${subLevel}=1`);
      await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
        { key: progressKey, value: completed });
      await page.goto(gameUrl);
      await page.waitForFunction(() => Boolean(window.__BOMB_GAME__));
      await page.locator("#overlayStartBombGame").click();
      await page.locator("#bombCanvas").focus();
      await page.keyboard.press("Space");
      try {
        await page.waitForFunction((expected) => window.__BOMB_GAME__?.getLevelLayout().subLevel === expected,
          subLevel, { timeout: 5000 });
      } catch (error) {
        const actual = await page.evaluate(() => {
          const state = window.__BOMB_GAME__.getState();
          return { world: state.world, subLevel: state.subLevel, status: state.status,
            completed: state.moonWordIds.length, enemies: state.enemies.length,
            alive: state.enemies.filter((enemy) => enemy.alive).length,
            hiddenPowerUps: state.hiddenPowerUps.length, hiddenWordCrates: state.hiddenWordCrates.length,
            awaitingContinue: window.__BOMB_GAME__.isAwaitingContinue() };
        });
        console.error("third-world advance diagnostic", JSON.stringify({ expected: subLevel, actual }));
        throw error;
      }
      levelReady = await page.evaluate(() => window.__BOMB_GAME__.getState());
      assert.equal(levelReady.world, 3);
      assert.equal(levelReady.status, "ready");
      assert.equal(levelReady.enemies.length, subLevel + 5);
      assert.equal(new Set(levelReady.enemies.map((enemy) => `${enemy.gx},${enemy.gy}`)).size,
        levelReady.enemies.length);
      assert.ok(levelReady.enemies.every((enemy) => levelReady.map[enemy.gy]?.[enemy.gx] === 0));
      thirdWorldCounts.push(levelReady.enemies.length);
    }
    assert.deepEqual(thirdWorldCounts, [6, 7, 8, 9, 10]);
    const nextWorlds = [];
    for (const world of [3, 4, 5, 6]) {
      const completed = structuredClone(opening.state);
      completed.world = world;
      completed.subLevel = 5;
      const cols = 27 + (world - 3 + 4) * 2;
      completed.map = Array.from({ length: 15 }, (_, y) => Array.from({ length: cols }, (_, x) =>
        x === 0 || y === 0 || x === cols - 1 || y === 14 ? 1 : 0));
      completed.status = "playing";
      completed.startLayerHidden = true;
      completed.player = { gx: 1, gy: 1, move: null, invulnerable: 20, trail: [{ gx: 1, gy: 1 }] };
      completed.enemies = [{ ...completed.enemies[0], alive: false, move: null }];
      completed.moonWordIds = completed.todayNewWords.map(word => word.id);
      completed.powerUps = [];
      completed.hiddenWordCrates = [];
      completed.hiddenPowerUps = [];
      completed.bombs = [{ gx: 1, gy: 1, time: 1.95, range: 1, ownerInside: false, exploded: false }];
      completed.explosions = [];
      await page.goto(baseUrl + `bomb-game.css?world-transition-${width}-${world}=1`);
      await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
        { key: progressKey, value: completed });
      await page.goto(gameUrl);
      await page.waitForFunction(() => Boolean(window.__BOMB_GAME__));
      await page.locator("#overlayStartBombGame").click();
      if (world < 6) {
        await page.waitForFunction(expected => window.__BOMB_GAME__?.getLevelLayout().world === expected,
          world + 1);
        const next = await page.evaluate(() => ({
          layout: window.__BOMB_GAME__.getLevelLayout(),
          state: window.__BOMB_GAME__.getState(),
        }));
        assert.equal(next.layout.subLevel, 1);
        assert.equal(next.layout.cols, 27 + (world - 2) * 2);
        assert.equal(next.layout.rows, 15);
        assert.equal(next.layout.tile, 48);
        assert.equal(next.layout.enemyCount, 6 + (world - 2) * 2);
        assert.equal(next.layout.hiddenBulletBills, world);
        assert.equal(next.state.hiddenWordCrates.length, 5);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        if (next.layout.world === 6) {
          await page.screenshot({ path: path.join(output, `bomb-sixth-world-${width}.png`) });
        }
        nextWorlds.push({ world: next.layout.world, enemies: next.layout.enemyCount,
          missiles: next.layout.hiddenBulletBills });
      } else {
        await page.waitForFunction(() => window.__BOMB_GAME__?.getState().status === "win");
        assert.equal((await page.evaluate(() => window.__BOMB_GAME__.getState())).world, 6);
      }
    }
    assert.deepEqual(errors, []);
    results.push({ width, world: opening.layout.world, levels: opening.constants.levelsPerWorld,
      openingCols: opening.layout.cols, rows: opening.layout.rows,
      enemies: opening.layout.enemyCount, thirdWorldCounts, bowserSpawnVariants: bowserStarts.size,
      missiles: opening.layout.hiddenBulletBills,
      camera: moved.camera, savedCamera: resumed.camera, nextWorlds });
    await context.close();
  }
  process.stdout.write(JSON.stringify({ ok: true, results }) + "\n");
} finally {
  await browser.close();
}
