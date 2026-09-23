import assert from "node:assert/strict";
import { loadChromium } from "./playwright-runtime.mjs";

const chromium = await loadChromium();
const baseUrl = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const bombUrl = baseUrl + "bomb-game.html?test=bullet-bill";
const progressKey = "mario-bomb-game-progress-v1";
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, hasTouch: true });
await context.addInitScript(() => {
  window.__bulletBillSpriteDraws = [];
  const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function patchedDrawImage(image, ...args) {
    if (String(image?.src || "").includes("assets/sprites/enemies-bosses.png") && args.length === 8) {
      window.__bulletBillSpriteDraws.push(args.slice(0, 4));
    }
    return originalDrawImage.call(this, image, ...args);
  };
});

const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (response) => {
  if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
});

async function openBombGame() {
  await page.goto(bombUrl);
  await page.waitForFunction(() => Boolean(window.__BOMB_GAME__));
}

async function restoreSnapshot(snapshot, resume = true) {
  await page.goto(baseUrl + "bomb-game.css?bullet-bill-state-bridge=1");
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: progressKey,
    value: snapshot,
  });
  await openBombGame();
  if (resume && await page.evaluate(() => window.__BOMB_GAME__.isAwaitingContinue())) {
    await page.locator("#overlayStartBombGame").click();
  }
}

function makeOpenMap(rows, columns) {
  return Array.from({ length: rows }, (_, y) => Array.from({ length: columns }, (_, x) => (
    x === 0 || y === 0 || x === columns - 1 || y === rows - 1 ? 1 : 0
  )));
}

try {
  await page.goto(baseUrl + "bomb-game.css?bullet-bill-clear=1");
  await page.evaluate((key) => localStorage.removeItem(key), progressKey);
  await openBombGame();

  const initial = await page.evaluate(() => window.__BOMB_GAME__.getState());
  const constants = await page.evaluate(() => window.__BOMB_GAME__.getConstants().bulletBill);
  assert.deepEqual(constants, {
    frame: { sx: 560, sy: 48, sw: 16, sh: 16 },
    moveTime: 0.18,
    hiddenCountPerLevel: 1,
  });
  const firstLevelBills = initial.enemies.filter((enemy) => enemy.type === "bullet-bill" && enemy.alive);
  assert.equal(firstLevelBills.length, 0, "level 1-1 never opens with a visible Bullet Bill");
  assert.equal(initial.enemies.filter(enemy => enemy.alive && enemy.type === "mushroom").length, 1, "normal first-level mushroom is restored");
  assert.equal(initial.hiddenPowerUps.filter(([, type]) => type === "bulletBill").length, 1, "exactly one missile starts hidden inside a brick");
  await page.locator("#overlayStartBombGame").click();
  await page.waitForTimeout(1200);
  const runningStart = await page.evaluate(() => window.__BOMB_GAME__.getState());
  assert.equal(runningStart.enemies.some(enemy => enemy.type === "bullet-bill"), false, "starting the game does not release a missile");
  assert.equal(runningStart.enemyClearOpenedBricks, false, "no automatic clearing at start");
  assert.ok(runningStart.map.flat().some(tile => tile === 2));

  // Exercise actual next-level generation across both worlds, not just a constant check.
  let generatedLevel = structuredClone(initial);
  for (let levelIndex = 0; levelIndex < 10; levelIndex++) {
    assert.equal(generatedLevel.world, Math.floor(levelIndex / 5) + 1);
    assert.equal(generatedLevel.subLevel, levelIndex % 5 + 1);
    const missiles = generatedLevel.hiddenPowerUps.filter(([, type]) => type === "bulletBill");
    assert.equal(missiles.length, 1, `level ${generatedLevel.world}-${generatedLevel.subLevel} hides exactly one missile`);
    const [x, y] = missiles[0][0].split(",").map(Number);
    assert.equal(generatedLevel.map[y][x], 2);
    assert.equal(generatedLevel.hiddenWordCrates.length, 5);
    assert.equal(generatedLevel.hiddenWordCrates.some(([key]) => key === missiles[0][0]), false);
    assert.equal(generatedLevel.enemies.some(enemy => enemy.type === "bullet-bill"), false);
    if (levelIndex === 9) break;
    const completed = structuredClone(generatedLevel);
    completed.status = "playing";
    completed.startLayerHidden = true;
    completed.moonWordIds = completed.todayNewWords.map(word => word.id);
    completed.hiddenPowerUps = [];
    completed.hiddenWordCrates = [];
    completed.powerUps = [];
    completed.enemies.forEach(enemy => { enemy.alive = false; enemy.move = null; });
    completed.bombs = [{ gx: 1, gy: 1, time: 1.8, range: 1, ownerInside: false, exploded: false }];
    completed.player.invulnerable = 20;
    await restoreSnapshot(completed);
    await page.waitForFunction(({ world, subLevel }) => {
      const state = window.__BOMB_GAME__.getState();
      return state.world !== world || state.subLevel !== subLevel;
    }, { world: generatedLevel.world, subLevel: generatedLevel.subLevel });
    generatedLevel = await page.evaluate(() => window.__BOMB_GAME__.getState());
  }

  const spawnFixture = structuredClone(initial);
  const [brickKey] = spawnFixture.hiddenPowerUps.find(([, type]) => type === "bulletBill");
  const [brickX, brickY] = brickKey.split(",").map(Number);
  const neighbor = [
    [brickX - 1, brickY],
    [brickX + 1, brickY],
    [brickX, brickY - 1],
    [brickX, brickY + 1],
  ].find(([x, y]) => spawnFixture.map[y]?.[x] !== undefined && spawnFixture.map[y][x] !== 1);
  assert.ok(neighbor, "hidden Bullet Bill brick has an adjacent destructible path cell");
  spawnFixture.map[neighbor[1]][neighbor[0]] = 0;
  const safePlayerCell = spawnFixture.map.flatMap((row, y) => row.map((tile, x) => ({ tile, x, y })))
    .find((cell) => cell.tile === 0 && Math.abs(cell.x - brickX) + Math.abs(cell.y - brickY) > 4);
  assert.ok(safePlayerCell, "fixture has a safe player cell");
  spawnFixture.status = "playing";
  spawnFixture.startLayerHidden = true;
  spawnFixture.enemies = [];
  spawnFixture.shells = [];
  spawnFixture.explosions = [];
  spawnFixture.bombs = [{
    gx: neighbor[0], gy: neighbor[1], time: 0.05, range: 1, ownerInside: false, exploded: false,
  }];
  spawnFixture.player = {
    gx: safePlayerCell.x,
    gy: safePlayerCell.y,
    move: null,
    invulnerable: 0,
    trail: [{ gx: safePlayerCell.x, gy: safePlayerCell.y }],
  };
  await restoreSnapshot(spawnFixture);
  await page.waitForFunction(() => window.__BOMB_GAME__.getState().enemies.some((enemy) => enemy.type === "bullet-bill"));
  const spawned = await page.evaluate(() => window.__BOMB_GAME__.getState());
  assert.equal(spawned.hiddenPowerUps.some(([, type]) => type === "bulletBill"), false, "brick reveal consumes the hidden Bullet Bill");
  assert.equal(spawned.enemies.filter((enemy) => enemy.type === "bullet-bill").length, 1, "destroying the brick spawns exactly one Bullet Bill");

  const chaseFixture = structuredClone(spawned);
  const rows = chaseFixture.map.length;
  const columns = chaseFixture.map[0].length;
  chaseFixture.status = "playing";
  chaseFixture.startLayerHidden = true;
  chaseFixture.map = makeOpenMap(rows, columns);
  chaseFixture.player = { gx: columns - 2, gy: 5, move: null, invulnerable: 20, trail: [{ gx: columns - 2, gy: 5 }] };
  chaseFixture.enemies = [{
    id: 100,
    type: "bullet-bill",
    hp: 1,
    gx: 1,
    gy: 5,
    dir: "right",
    move: null,
    stepsTravelled: 0,
    straightSteps: 0,
    turnPause: 0,
    turnResetPending: false,
    chaseTimer: 0,
    stunTimer: 0,
    hitCooldown: 0,
    lastSeen: null,
    seed: 0,
    alive: true,
  }];
  chaseFixture.bombs = [];
  chaseFixture.explosions = [];
  chaseFixture.shells = [];
  chaseFixture.powerUps = [];
  chaseFixture.hiddenPowerUps = [];
  chaseFixture.hiddenWordCrates = [];
  await restoreSnapshot(chaseFixture);
  await page.waitForFunction(() => {
    const state = window.__BOMB_GAME__.getState();
    return state.enemies.some((enemy) => enemy.type === "bullet-bill" && enemy.move);
  });
  const afterBomb = await page.evaluate(() => window.__BOMB_GAME__.getState());
  assert.equal(afterBomb.enemies.find(enemy => enemy.type === "bullet-bill").move.duration, 0.18, "first actual missile step matches the player's cell duration");
  const motionSamples = await page.evaluate(async () => {
    const samples = [];
    for (let frame = 0; frame < 16; frame += 1) {
      await new Promise(requestAnimationFrame);
      const bullet = window.__BOMB_GAME__.getState().enemies.find((enemy) => enemy.type === "bullet-bill" && enemy.alive);
      if (bullet?.move) samples.push({ gx: bullet.gx, gy: bullet.gy, move: bullet.move, straightSteps: bullet.straightSteps });
    }
    return samples;
  });
  assert.ok(motionSamples.length >= 8, "real Edge captured enough in-flight missile frames");
  motionSamples.forEach(({ gx, gy, move, straightSteps }) => {
    assert.equal(move.duration, 0.18, "all actual movement uses constant player speed");
    const ratio = Math.min(1, move.time / move.duration);
    const expectedX = move.fromX + (move.toX - move.fromX) * ratio;
    const expectedY = move.fromY + (move.toY - move.fromY) * ratio;
    assert.ok(Math.abs(gx - expectedX) < 0.001 && Math.abs(gy - expectedY) < 0.001, "missile glides linearly without per-cell easing");
  });
  await page.waitForFunction(() => {
    const bullet = window.__BOMB_GAME__.getState().enemies.find((enemy) => enemy.type === "bullet-bill");
    return bullet && bullet.alive && bullet.stepsTravelled >= 12;
  }, null, { timeout: 10000 });
  const persistentChaser = await page.evaluate(() => window.__BOMB_GAME__.getState());
  assert.equal(persistentChaser.enemies[0].alive, true, "missile survives beyond ten cells");
  assert.equal(persistentChaser.explosions.length, 0, "no distance-triggered explosion");

  const turnFixture = structuredClone(chaseFixture);
  turnFixture.enemies[0].dir = "up";
  turnFixture.enemies[0].turnPause = 0.45;
  turnFixture.enemies[0].turnResetPending = true;
  await restoreSnapshot(turnFixture);
  const turningFrames = await page.evaluate(async () => {
    const samples = [];
    for (let frame = 0; frame < 12; frame++) {
      await new Promise(requestAnimationFrame);
      const enemy = window.__BOMB_GAME__.getState().enemies[0];
      samples.push({ dir: enemy.dir, duration: enemy.move?.duration, turnPause: enemy.turnPause });
    }
    return samples;
  });
  assert.ok(turningFrames.every(frame => frame.dir === "right" && frame.duration === 0.18 && frame.turnPause === 0), "turning/restoring never inserts a pause or slowdown");

  const collisionFixture = structuredClone(chaseFixture);
  collisionFixture.map[5][5] = 2;
  collisionFixture.bombs = [{ gx: 3, gy: 5, time: 0, range: 3, ownerInside: false, exploded: false }];
  collisionFixture.enemyClearOpenedBricks = false;
  await restoreSnapshot(collisionFixture);
  await page.waitForFunction(() => window.__BOMB_GAME__.getState().bombs.some(bomb => bomb.isRed));
  const converted = await page.evaluate(() => window.__BOMB_GAME__.getState());
  assert.equal(converted.enemies[0].alive, false, "missile is consumed by collision");
  assert.equal(converted.enemies[0].move, null);
  assert.equal(converted.bombs.length, 1, "one black bomb becomes one red bomb");
  assert.equal(converted.bombs[0].range, 3, "power is inherited, not added");
  assert.ok(converted.bombs[0].time < 0.5, "conversion restarts the ordinary fuse");
  assert.equal(converted.explosions.length, 0, "collision is not instant detonation");
  assert.equal(converted.map[5][5], 2, "conversion does not automatically clear bricks");
  await page.reload();
  await page.waitForFunction(() => window.__BOMB_GAME__?.isAwaitingContinue());
  assert.equal((await page.evaluate(() => window.__BOMB_GAME__.getState())).bombs[0].isRed, true, "red color survives reload");
  await page.locator("#overlayStartBombGame").click();
  await page.waitForFunction(() => window.__BOMB_GAME__.getState().explosions.some(explosion => explosion.cells.some(cell => cell.gx === 3 && cell.gy === 5)));
  const redBlast = await page.evaluate(() => window.__BOMB_GAME__.getState().explosions[0].cells);
  const blackFixture = structuredClone(collisionFixture);
  blackFixture.enemies = [];
  blackFixture.bombs[0].time = 1.8;
  await restoreSnapshot(blackFixture);
  await page.waitForFunction(() => window.__BOMB_GAME__.getState().explosions.length > 0);
  assert.deepEqual(await page.evaluate(() => window.__BOMB_GAME__.getState().explosions[0].cells), redBlast, "red/black bomb blast cells and brick blocking are identical");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const preview = structuredClone(converted);
    preview.status = "ready";
    preview.startLayerHidden = true;
    preview.bombs.push({ gx: 7, gy: 5, time: 0, range: 3, ownerInside: false, exploded: false });
    await restoreSnapshot(preview, false);
    await page.screenshot({ path: `tests/bullet-bill-red-bomb-${width}.png`, fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  }

  // A real final-enemy death opens all ordinary/target bricks, but not the hidden missile.
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const cleanupFixture = structuredClone(initial);
    cleanupFixture.status = "playing";
    cleanupFixture.startLayerHidden = true;
    cleanupFixture.enemyClearOpenedBricks = false;
    cleanupFixture.map = makeOpenMap(rows, columns);
    cleanupFixture.map[5][4] = 2;
    cleanupFixture.map[6][6] = 2;
    cleanupFixture.hiddenPowerUps = [["4,5", "bulletBill"]];
    cleanupFixture.hiddenWordCrates = cleanupFixture.todayNewWords.map((word, index) => {
      cleanupFixture.map[3][5 + index] = 2;
      return [`${5 + index},3`, word.id];
    });
    cleanupFixture.powerUps = [];
    cleanupFixture.moonWordIds = [];
    cleanupFixture.bombs = [];
    cleanupFixture.explosions = [{ cells: [{ gx: 10, gy: 7 }], blockedCells: [], life: 1, maxLife: 1 }];
    cleanupFixture.shells = [];
    cleanupFixture.player = { gx: 3, gy: 5, move: null, invulnerable: 20, trail: [{ gx: 3, gy: 5 }] };
    cleanupFixture.enemies = [{ ...initial.enemies.find(enemy => enemy.type === "mushroom"), gx: 10, gy: 7, move: null, hp: 1, stunTimer: 1, hitCooldown: 0 }];
    await restoreSnapshot(cleanupFixture);
    await page.waitForFunction(() => window.__BOMB_GAME__.getState().enemyClearOpenedBricks);
    const cleared = await page.evaluate(() => window.__BOMB_GAME__.getState());
    assert.equal(cleared.map.flat().filter(tile => tile === 2).length, 1, "only the hidden missile brick remains");
    assert.equal(cleared.map[5][4], 2);
    assert.deepEqual(cleared.hiddenPowerUps, [["4,5", "bulletBill"]]);
    assert.equal(cleared.enemies.filter(enemy => enemy.alive).length, 0, "cleanup does not spawn the missile");
    assert.equal(cleared.hiddenWordCrates.length, 0);
    assert.equal((await page.evaluate(() => window.__BOMB_GAME__.getBoardTargetSummary())).visibleInitialTargetIds.length, 5);
    await page.reload();
    await page.waitForFunction(() => window.__BOMB_GAME__?.isAwaitingContinue());
    assert.equal((await page.evaluate(() => window.__BOMB_GAME__.getState())).map[5][4], 2, "reload preserves the retained brick");
    if (width === 390) await page.locator("#overlayStartBombGame").tap();
    else {
      await page.locator("#overlayStartBombGame").focus();
      await page.keyboard.press("Enter");
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `tests/bullet-bill-retained-brick-${width}.png`, fullPage: true });
    await page.locator("#bombCanvas").focus();
    await page.keyboard.press("Space");
    await page.waitForFunction(() => window.__BOMB_GAME__.getState().bombs.length === 1);
    await page.waitForFunction(() => window.__BOMB_GAME__.getState().enemies.some(enemy => enemy.type === "bullet-bill" && enemy.alive));
    const manuallyRevealed = await page.evaluate(() => window.__BOMB_GAME__.getState());
    assert.equal(manuallyRevealed.map[5][4], 0, "player bomb destroys the retained brick");
    assert.equal(manuallyRevealed.hiddenPowerUps.some(([, type]) => type === "bulletBill"), false);
    assert.equal(manuallyRevealed.enemies.filter(enemy => enemy.alive).length, 1, "player bomb reveals exactly one live missile");
  }

  const visualFixture = structuredClone(initial);
  visualFixture.status = "ready";
  visualFixture.startLayerHidden = true;
  visualFixture.messageText = "第一关：1 枚导弹藏在砖块里";
  visualFixture.bombs = [];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await restoreSnapshot(visualFixture, false);
    assert.equal((await page.evaluate(() => window.__BOMB_GAME__.getState())).enemies.some(enemy => enemy.type === "bullet-bill" && enemy.alive), false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}px has no horizontal overflow`);
    await page.screenshot({ path: `tests/bullet-bill-${width}.png`, fullPage: true });
  }
  const spriteStatus = await page.evaluate(() => fetch("./assets/sprites/enemies-bosses.png").then((response) => response.status));
  assert.equal(spriteStatus, 200, "Bullet Bill sprite sheet is served successfully");
  assert.deepEqual(errors, [], "Bullet Bill acceptance has no page or resource errors");
  console.log(JSON.stringify({
    firstLevelVisibleBills: 0,
    firstLevelHiddenBills: 1,
    allTenLevelsHideOneMissile: true,
    brickSpawn: true,
    enemyClearRetainsMissileBrick: true,
    retainedBrickSurvivesReload: true,
    playerBombRevealsRetainedMissile: true,
    bombContactConvertsToRed: true,
    redBombSameBlastAndPersistence: true,
    linearMotionSamples: motionSamples.length,
    constantSpeedAndInstantTurns: true,
    survivesBeyondTenCells: true,
    spriteFrame: constants.frame,
    desktopAndMobile: true,
  }, null, 2));
} finally {
  await context.close();
  await browser.close();
}
