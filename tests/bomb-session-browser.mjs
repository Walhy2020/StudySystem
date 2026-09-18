import assert from "node:assert/strict";
import { chromium } from "file:///C:/Users/St/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const key = "mario-bomb-game-progress-v1";
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const errors = [];
context.on("page", page => {
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => { if (response.status() >= 400) errors.push(response.url()); });
});
const state = page => page.evaluate(() => window.__BOMB_GAME__.getState());
const owner = page => page.evaluate(() => window.__BOMB_GAME__.isProgressOwner());
async function open(page) {
  await page.goto(base + "bomb-game.html?test=bomb-session");
  await page.waitForFunction(() => !!window.__BOMB_GAME__);
}
async function restore(page, saved) {
  await page.goto(base + "bomb-game.css?fixture=session");
  await page.evaluate(({ key, saved }) => localStorage.setItem(key, JSON.stringify(saved)), { key, saved });
  await open(page);
}
function stationaryEnemy(enemy, gx, gy) {
  return { ...enemy, alive: true, gx, gy, stunTimer: 0, hitCooldown: 0,
    move: { fromX: gx, fromY: gy, toX: gx, toY: gy, time: 0, duration: 999 } };
}
try {
  const first = await context.newPage();
  await open(first);
  const initial = await state(first);

  // Even policy-1 saves from a never-started level must not expose question cards.
  for (const subLevel of [1, 2]) {
    const ready = structuredClone(initial);
    ready.subLevel = subLevel;
    // The second level uses a wider board. Generate it from a compatible first-level fixture.
    if (subLevel === 2) {
      ready.map = ready.map.map(row => [...row.slice(0, -1), 0, 0, 1]);
      ready.map[0].fill(1);
      ready.map.at(-1).fill(1);
    }
    ready.hiddenWordCrates = [];
    ready.powerUps = ready.todayNewWords.map((word, index) => ({
      type: subLevel === 1 ? "pinyin" : "hanziPrompt", wordId: word.id, gx: 3 + index, gy: 1, seed: 0,
    }));
    await restore(first, ready);
    const summary = await first.evaluate(() => window.__BOMB_GAME__.getBoardTargetSummary());
    assert.equal(summary.hiddenTargetIds.length, 5);
    assert.equal(summary.visibleInitialTargetIds.length, 0);
    assert.equal(summary.targetEntityCount, 5);
  }

  const safe = structuredClone(initial);
  safe.score = 125;
  safe.hp = 2;
  safe.enemies = [stationaryEnemy(safe.enemies[0], safe.map[0].length - 2, 9)];
  safe.player = { gx: 1, gy: 1, move: null, invulnerable: 99 };
  await restore(first, safe);
  await first.locator("#startBombGame").click();
  await first.locator("#bombCanvas").focus();
  await first.keyboard.down("ArrowDown");
  await first.waitForFunction(() => !!window.__BOMB_GAME__.getState().player.move);
  await first.keyboard.up("ArrowDown");
  await first.waitForFunction(() => window.__BOMB_GAME__.getState().player.gy === 2 && !window.__BOMB_GAME__.getState().player.move);
  // Real window blur flushes the latest state, rather than waiting for the autosave interval.
  await first.evaluate(() => window.dispatchEvent(new Event("blur")));
  const played = await state(first);
  const second = await context.newPage();
  await open(second);
  await first.waitForFunction(() => !window.__BOMB_GAME__.isProgressOwner());
  const continued = await state(second);
  for (const field of ["world", "subLevel", "hp", "score", "map", "hiddenWordCrates", "moonWordIds", "powerUps"]) {
    assert.deepEqual(continued[field], played[field], "new window restores " + field);
  }
  assert.equal(continued.player.gy, 2);
  assert.equal(await owner(second), true);
  await new Promise(resolve => setTimeout(resolve, 1100));
  assert.equal(await owner(first), false, "old window never takes back autosave ownership");
  assert.equal(await owner(second), true);
  const currentSession = (await state(second)).progressSessionId;
  assert.equal(await first.evaluate(key => JSON.parse(localStorage.getItem(key)).progressSessionId, key), currentSession);

  // Explicit input can safely resume the old window; a late close of the other cannot overwrite it.
  await first.bringToFront();
  await first.locator("#bombCanvas").focus();
  await first.keyboard.down("ArrowUp");
  await first.waitForFunction(() => !!window.__BOMB_GAME__.getState().player.move);
  await first.keyboard.up("ArrowUp");
  await first.waitForFunction(() => window.__BOMB_GAME__.getState().player.gy === 1 && !window.__BOMB_GAME__.getState().player.move);
  await second.waitForFunction(() => !window.__BOMB_GAME__.isProgressOwner());
  await second.close();
  await first.evaluate(() => window.dispatchEvent(new Event("blur")));
  await first.reload();
  await first.waitForFunction(() => !!window.__BOMB_GAME__);
  assert.equal((await state(first)).player.gy, 1);
  assert.equal((await state(first)).score, 125);

  // Top-right downward collision: damage must cancel held input, including OS auto-repeat.
  for (const width of [1440, 390]) {
    await first.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const fixture = structuredClone(initial);
    const gx = fixture.map[0].length - 2;
    fixture.hp = 3;
    fixture.player = { gx, gy: 1, move: null, invulnerable: 0 };
    for (const y of [1, 2, 3]) fixture.map[y][gx] = 0;
    fixture.enemies = [stationaryEnemy({ ...fixture.enemies[0], type: "bowser", hp: 2 }, gx, 3)];
    await restore(first, fixture);
    await first.locator("#startBombGame").click();
    await first.locator("#bombCanvas").focus();
    await first.keyboard.down("ArrowDown");
    await first.waitForFunction(() => window.__BOMB_GAME__.getState().hp === 2);
    for (let repeat = 0; repeat < 3; repeat += 1) await first.keyboard.down("ArrowDown");
    await new Promise(resolve => setTimeout(resolve, 500));
    const respawn = (await state(first)).player;
    assert.deepEqual({ gx: respawn.gx, gy: respawn.gy, move: respawn.move }, { gx: 1, gy: 1, move: null }, "respawn stays still at " + width);
    await first.screenshot({ path: `tests/bomb-respawn-${width}.png`, fullPage: true });
    await first.keyboard.up("ArrowDown");
    await first.keyboard.down("ArrowDown");
    await first.waitForFunction(() => !!window.__BOMB_GAME__.getState().player.move);
    await first.keyboard.up("ArrowDown");
    await first.waitForFunction(() => window.__BOMB_GAME__.getState().player.gy === 2);
    assert.equal(await first.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", sameProfileWindowRestore: true,
    staleWindowCannotOverwrite: true, explicitInputTakeover: true, readySaveHidesQuestions: ["pinyin", "hanzi"],
    respawnStopsHeldDirection: [1440, 390], freshPressResumes: true }, null, 2));
} finally {
  await browser.close();
}
