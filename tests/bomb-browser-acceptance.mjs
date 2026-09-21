import assert from "node:assert/strict";
import { chromium } from "file:///C:/Users/St/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const baseUrl = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const bombUrl = baseUrl + "bomb-game.html?test=bomb-browser";
const BOMB_KEY = "mario-bomb-game-progress-v1";
const HANZI_KEY = "mario-hanzi-refactor-v1";
const LEGACY_KEY = "mario-literacy-desktop-mvp-v1";

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(() => {
  window.__storageMutations = [];
  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;
  Storage.prototype.setItem = function patchedSetItem(key, value) {
    window.__storageMutations.push({ operation: "set", key });
    return originalSetItem.call(this, key, value);
  };
  Storage.prototype.removeItem = function patchedRemoveItem(key) {
    window.__storageMutations.push({ operation: "remove", key });
    return originalRemoveItem.call(this, key);
  };
});

const page = await context.newPage();
const pageErrors = [];
const failedResponses = [];
page.on("pageerror", (error) => pageErrors.push(error.message));
page.on("response", (response) => {
  if (response.status() >= 400) failedResponses.push(response.status() + " " + response.url());
});

async function tabTo(selector, maxPresses = 12) {
  const target = page.locator(selector);
  for (let press = 0; press < maxPresses; press += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((node) => document.activeElement === node)) return;
  }
  assert.fail("Tab did not reach " + selector);
}

async function restoreBombSnapshot(snapshot) {
  await page.goto(baseUrl + "bomb-game.css?state-bridge=1");
  await page.evaluate(({ bombKey, value }) => {
    localStorage.setItem(bombKey, JSON.stringify(value));
  }, { bombKey: BOMB_KEY, value: snapshot });
  await page.goto(bombUrl);
  await page.waitForFunction(() => Boolean(window.__BOMB_GAME__));
  // Gameplay fixtures deliberately resume; the session suite verifies the entry pause.
  if (await page.evaluate(() => window.__BOMB_GAME__.isAwaitingContinue())) {
    await page.locator("#overlayStartBombGame").click();
  }
}

await page.goto(baseUrl);
assert.equal(await page.locator("#appVersionLabel").textContent(), "v1.0.4", "system display version updated");
assert.equal(await page.locator('.module-tabs a[href="./bomb-game.html?v=1.0"]').count(), 0, "bomb entry is not a module tab");
assert.equal(await page.locator('.topbar .top-actions #bombGameEntry').isVisible(), true, "header shows bomb-game entry");
assert.equal(await page.locator('.topbar #resetProgress').count(), 0, "header does not contain Hanzi reset");
assert.equal(await page.locator('.map-visual .map-actions #bombGameEntry').count(), 0, "map background does not contain bomb entry");
assert.equal(await page.locator('.map-visual .map-actions #resetProgress').isVisible(), true, "map background keeps Hanzi reset");
const entry = page.locator('.topbar .top-actions a[href="./bomb-game.html?v=1.0"]');
assert.equal(await entry.isVisible(), true, "header bomb-game entry is visible");
await tabTo('.topbar .top-actions a[href="./bomb-game.html?v=1.0"]');
assert.equal(await entry.evaluate((node) => document.activeElement === node), true, "bomb entry is keyboard focusable");
await page.keyboard.press("Enter");
await page.waitForURL(/bomb-game\.html/);
const returnLink = page.locator('a[href="./index.html"]');
assert.equal(await returnLink.isVisible(), true, "game shows return link");
await tabTo('a[href="./index.html"]');
assert.equal(await returnLink.evaluate((node) => document.activeElement === node), true, "Tab focuses the game return link");
await page.keyboard.press("Enter");
await page.waitForURL((url) => url.pathname.endsWith("/index.html"));
await page.goto(bombUrl);
assert.equal(await page.locator("#bombCanvas").getAttribute("width"), "1280");
assert.equal(await page.locator("#bombCanvas").getAttribute("height"), "720");
assert.equal(await page.locator(".bomb-topbar .bomb-title").count(), 0, "removed title container does not exist");
assert.equal(await page.getByText("炸开砖块", { exact: true }).count(), 0, "removed subtitle is absent from the page and accessibility tree");
assert.equal(await page.getByRole("heading", { level: 1, name: "炸弹迷宫" }).count(), 0, "removed topbar heading is absent from the accessibility tree");
assert.equal(await page.locator("#bombStartTitle").count(), 1, "central level heading remains in the start dialog");
for (const selector of ["#bombHp", "#bombAmmo", "#mushroomLeft", "#bombLevel", "#bombPower"]) {
  assert.equal(await page.locator(selector).isVisible(), true, selector + " HUD value remains visible");
}
for (const selector of ["#startBombGame", "#restartBombGame", '.bomb-actions a[href="./index.html"]']) {
  assert.equal(await page.locator(selector).isVisible(), true, selector + " action remains visible");
}

await page.goto(baseUrl + "bomb-game.css?primary-fixture=1");
await page.evaluate(({ bombKey, hanziKey, legacyKey }) => {
  const records = {
    "0001": { status: "new", correctCount: 0, errorCount: 0, studyAppearanceCount: 0, studyAppearanceKeys: [], lastSeen: null },
  };
  for (let index = 2; index <= 61; index += 1) {
    const id = String(index).padStart(4, "0");
    records[id] = { status: "known", correctCount: 1, errorCount: 0, studyAppearanceCount: 1, lastSeen: "2026-08-19" };
  }
  records["0004"] = { status: "mastered", correctCount: 3, errorCount: 0, studyAppearanceCount: 3, lastSeen: "2026-08-19" };
  localStorage.setItem(hanziKey, JSON.stringify({
    schemaVersion: 1,
    records,
    masteredIds: ["0004"],
    dailyNewIds: ["0002"],
    dailyReviewIds: ["0003"],
  }));
  localStorage.setItem(legacyKey, JSON.stringify({
    records: { "0062": { status: "known", correctCount: 2, lastSeen: "2026-08-18" } },
    masteredIds: [],
    bombSeenWordIds: ["0062"],
    bombTargetRoundCounts: { "0062": 2 },
    bombAppearanceHistory: [{ sequence: 1, wordId: "0062" }],
  }));
  localStorage.removeItem(bombKey);
}, { bombKey: BOMB_KEY, hanziKey: HANZI_KEY, legacyKey: LEGACY_KEY });
await page.goto(bombUrl);
await page.waitForFunction(() => Boolean(window.__BOMB_GAME__));
const primaryIds = await page.evaluate(() => window.__BOMB_GAME__.getLearningWordIds());
assert.equal(await page.evaluate(() => window.__BOMB_GAME__.getLearningSource()), "hanzi");
assert.equal(primaryIds.length, 50, "one run is capped at 50 learning words");
assert.equal(new Set(primaryIds).size, 50, "evidence-backed selection contains unique IDs");
assert.ok(primaryIds.every((id) => Number(id) >= 2 && Number(id) <= 61), "every selected word has real learning evidence");
assert.ok(!primaryIds.includes("0001"), "unlearned word is excluded");
assert.ok(!primaryIds.includes("0004"), "fully mastered word is excluded");
assert.ok(!primaryIds.includes("0062"), "legacy data does not override learned primary data");
await page.locator("#restartBombGame").click();
await page.waitForFunction(() => window.__BOMB_GAME__.getBoardTargetSummary().renderedLearningCardCount === 0);
const initialTargetSummary = await page.evaluate(() => window.__BOMB_GAME__.getBoardTargetSummary());
assert.equal(initialTargetSummary.levelTargetIds.length, 5, "new level selects exactly five target instances");
assert.equal(new Set(initialTargetSummary.levelTargetIds).size, 5, "new level target IDs are unique");
assert.equal(initialTargetSummary.hiddenTargetIds.length, 5, "new level places five simultaneous hidden target cards");
assert.equal(new Set(initialTargetSummary.hiddenTargetIds).size, 5, "new level renders five different target cards");
assert.equal(initialTargetSummary.targetEntityCount, 5, "new level state contains five target entities");
assert.equal(initialTargetSummary.renderedLearningCardCount, 0, "canvas renders no initial target cards");
assert.equal((await page.evaluate(() => window.__BOMB_GAME__.getState().hiddenWordCrates.length)), 5, "all learning targets are hidden behind bricks");
const concealedInitialQuestions = await page.evaluate(() => ({
  activeQuestion: window.__BOMB_GAME__.getActiveLearningQuestion(),
  promptTypes: window.__BOMB_GAME__.getState().powerUps
    .filter((powerUp) => ["pinyin", "hanziPrompt"].includes(powerUp.type))
    .map((powerUp) => powerUp.type),
  choiceCount: window.__BOMB_GAME__.getState().powerUps
    .filter((powerUp) => ["wordChoice", "pinyinChoice"].includes(powerUp.type)).length,
}));
assert.equal(concealedInitialQuestions.activeQuestion, null, "no question answer is exposed before a question card is touched");
assert.deepEqual(concealedInitialQuestions.promptTypes, [], "first level begins with five concealed pinyin question cards");
assert.equal(concealedInitialQuestions.choiceCount, 0, "answer choices appear only after a question is activated");

const constants = await page.evaluate(() => window.__BOMB_GAME__.getConstants());
assert.deepEqual({
  progressKey: constants.progressKey,
  progressVersion: constants.progressVersion,
  worlds: constants.worlds,
  levelsPerWorld: constants.levelsPerWorld,
  rows: constants.rows,
  bombTimer: constants.bombTimer,
  flameTime: constants.flameTime,
  moonsPerLevel: constants.moonsPerLevel,
  wordsPerRun: constants.wordsPerRun,
  koopaMoveTime: constants.koopaMoveTime,
  nightTime: constants.nightTime,
  canvas: [constants.canvasWidth, constants.canvasHeight],
}, {
  progressKey: BOMB_KEY,
  progressVersion: 1,
  worlds: 2,
  levelsPerWorld: 5,
  rows: 11,
  bombTimer: 2,
  flameTime: 0.5,
  moonsPerLevel: 5,
  wordsPerRun: 50,
  koopaMoveTime: 1,
  nightTime: false,
  canvas: [1280, 720],
});

const primaryBefore = await page.evaluate(({ hanziKey, legacyKey }) => ({
  hanzi: localStorage.getItem(hanziKey),
  legacy: localStorage.getItem(legacyKey),
}), { hanziKey: HANZI_KEY, legacyKey: LEGACY_KEY });

const resourcePaths = [
  "index.html",
  "bomb-game.html",
  "bomb-game.css?v=1.1",
  "bomb-game.js?v=1.8",
  "data/characters.js?v=1.0",
  "data/pinyin-readings.js?v=1.0",
  "assets/sprites/enemies-bosses.png",
  "其他素材/P305/Mario SVG Bundle/PNG/109.png",
  "其他素材/P305/Mario SVG Bundle/PNG/11.png",
  "其他素材/P305/Mario SVG Bundle/PNG/253.png",
  "其他素材/FlyStar/images/Part_01.png",
  "其他素材/FlyStar/images/Part_02.png",
  "其他素材/FlyStar/images/Part_03.png",
  "其他素材/FlyStar/images/Part_04.png",
  "其他素材/FlyStar/images/Part_05.png",
  "其他素材/FlyStar/images/Part_06.png",
];
const resourceStatuses = await page.evaluate(async (paths) => Promise.all(paths.map(async (path) => {
  const response = await fetch(new URL(path, location.origin + "/"));
  return { path, status: response.status };
})), resourcePaths);
assert.deepEqual(resourceStatuses.filter((item) => item.status !== 200), []);

const desktopLayout = await page.evaluate(() => {
  const canvas = document.querySelector("#bombCanvas").getBoundingClientRect();
  const stage = document.querySelector(".bomb-stage").getBoundingClientRect();
  const topbar = document.querySelector(".bomb-topbar").getBoundingClientRect();
  const hud = document.querySelector(".bomb-hud").getBoundingClientRect();
  const actions = document.querySelector(".bomb-actions").getBoundingClientRect();
  const hudItems = [...document.querySelectorAll(".bomb-hud .hud-pill")].map((node) => node.getBoundingClientRect());
  const actionItems = [...document.querySelectorAll(".bomb-actions button, .bomb-actions a")].map((node) => node.getBoundingClientRect());
  const isVisibleInside = (rect) => rect.width > 0 && rect.height > 0 &&
    rect.left >= topbar.left - 0.5 && rect.right <= topbar.right + 0.5 &&
    rect.top >= topbar.top - 0.5 && rect.bottom <= topbar.bottom + 0.5;
  return {
    ratio: canvas.width / canvas.height,
    withinStage: canvas.left >= stage.left - 0.5 && canvas.right <= stage.right + 0.5 &&
      canvas.top >= stage.top - 0.5 && canvas.bottom <= stage.bottom + 0.5,
    topbarHeight: topbar.height,
    hudStartsAtLeft: hud.left - topbar.left <= 20,
    zonesSeparated: hud.right <= actions.left + 0.5,
    hudVisible: hudItems.length === 5 && hudItems.every(isVisibleInside),
    actionsVisible: actionItems.length === 3 && actionItems.every(isVisibleInside),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth ||
      document.documentElement.scrollHeight > document.documentElement.clientHeight,
  };
});
assert.ok(Math.abs(desktopLayout.ratio - 16 / 9) < 0.001);
assert.equal(desktopLayout.withinStage, true);
assert.ok(desktopLayout.topbarHeight < 76, "desktop topbar contracts after removing the title block");
assert.equal(desktopLayout.hudStartsAtLeft, true, "HUD occupies the removed title area without a blank block");
assert.equal(desktopLayout.zonesSeparated, true, "desktop HUD and actions do not overlap");
assert.equal(desktopLayout.hudVisible, true, "all desktop HUD items remain contained and visible");
assert.equal(desktopLayout.actionsVisible, true, "all desktop actions remain contained and visible");
assert.equal(desktopLayout.overflow, false);
await page.screenshot({ path: "tests/bomb-desktop.png", fullPage: true });

await page.locator("#startBombGame").focus();
await page.keyboard.press("Space");
await page.waitForFunction(() => window.__BOMB_GAME__.getState().status === "playing");
assert.equal(await page.evaluate(() => window.__BOMB_GAME__.getState().bombs.length), 0, "button Space keeps native activation without placing a bomb");
assert.ok(Math.abs(await page.locator(".bomb-topbar").evaluate((node) => node.getBoundingClientRect().height) - desktopLayout.topbarHeight) < 0.5, "starting the game does not shift the topbar");
await page.evaluate(({ bombKey }) => localStorage.removeItem(bombKey), { bombKey: BOMB_KEY });
await page.reload();
await page.waitForFunction(() => Boolean(window.__BOMB_GAME__));
await page.locator("#bombCanvas").focus();
await page.keyboard.press("Enter");
await page.waitForFunction(() => window.__BOMB_GAME__.getState().status === "playing");

async function moveWith(kind) {
  const choice = await page.evaluate((requestedKind) => {
    const current = window.__BOMB_GAME__.getState();
    const player = current.player;
    const directions = [
      { arrow: "ArrowRight", wasd: "KeyD", dx: 1, dy: 0 },
      { arrow: "ArrowDown", wasd: "KeyS", dx: 0, dy: 1 },
      { arrow: "ArrowLeft", wasd: "KeyA", dx: -1, dy: 0 },
      { arrow: "ArrowUp", wasd: "KeyW", dx: 0, dy: -1 },
    ];
    const direction = directions.find((item) => current.map[Math.round(player.gy) + item.dy]?.[Math.round(player.gx) + item.dx] === 0);
    if (!direction) return null;
    return { code: direction[requestedKind], before: { gx: player.gx, gy: player.gy } };
  }, kind);
  assert.ok(choice, kind + " has an open adjacent cell");
  await page.keyboard.down(choice.code);
  await page.waitForTimeout(260);
  await page.keyboard.up(choice.code);
  await page.waitForTimeout(80);
  const after = await page.evaluate(() => window.__BOMB_GAME__.getState().player);
  assert.ok(Math.hypot(after.gx - choice.before.gx, after.gy - choice.before.gy) > 0.2, kind + " moves the player");
}
await moveWith("arrow");
await moveWith("wasd");
await page.waitForFunction(() => !window.__BOMB_GAME__.getState().player.move);

const stateBeforeBomb = await page.evaluate(() => window.__BOMB_GAME__.getState());
assert.equal(stateBeforeBomb.status, "playing", "game remains active before placing a bomb");
const bombsBefore = stateBeforeBomb.bombs.length;
await page.keyboard.press("Space");
await page.waitForTimeout(120);
const stateAfterBomb = await page.evaluate(() => window.__BOMB_GAME__.getState());
assert.ok(stateAfterBomb.bombs.length > bombsBefore, "Space places a bomb");
const saveBeforeRefresh = await page.evaluate(({ bombKey }) => JSON.parse(localStorage.getItem(bombKey)), { bombKey: BOMB_KEY });
assert.equal(saveBeforeRefresh.version, 1);
assert.ok(saveBeforeRefresh.bombs.length > 0);
await page.locator("#restartBombGame").focus();
await page.keyboard.press("Enter");
const restarted = await page.evaluate(() => {
  const current = window.__BOMB_GAME__.getState();
  return { status: current.status, world: current.world, subLevel: current.subLevel, hp: current.hp, bombs: current.bombs.length };
});
assert.deepEqual(restarted, { status: "playing", world: 1, subLevel: 1, hp: 3, bombs: 0 }, "Enter on restart performs a full native restart");
await page.waitForFunction(() => window.__BOMB_GAME__.getBoardTargetSummary().renderedLearningCardCount === 0);
const restartedTargets = await page.evaluate(() => window.__BOMB_GAME__.getBoardTargetSummary());
assert.equal(restartedTargets.levelTargetIds.length, 5, "restart rebuilds five target instances");
assert.equal(restartedTargets.hiddenTargetIds.length, 5, "restart shows five target cards on the board");
assert.equal(restartedTargets.targetEntityCount, 5, "restart state contains five target entities");

await page.goto(baseUrl + "bomb-game.css?pause-before-restore=1");
await page.evaluate(({ bombKey, oldSave }) => {
  delete oldSave.bombSeenWordIds;
  delete oldSave.bombAppearanceHistory;
  oldSave.hp = 2;
  oldSave.score = 123;
  localStorage.setItem(bombKey, JSON.stringify(oldSave));
}, { bombKey: BOMB_KEY, oldSave: saveBeforeRefresh });
await page.goto(bombUrl);
await page.waitForFunction(() => Boolean(window.__BOMB_GAME__));
const restored = await page.evaluate(() => window.__BOMB_GAME__.getState());
assert.equal(restored.version, 1);
assert.equal(restored.hp, 2);
assert.equal(restored.score, 123);
assert.deepEqual(restored.map, saveBeforeRefresh.map);
assert.ok(restored.bombs.length > 0, "version-1 save restores bombs");
const restoredTargets = await page.evaluate(() => window.__BOMB_GAME__.getBoardTargetSummary());
assert.equal(restoredTargets.levelTargetIds.length, 5, "restored version-1 save retains five level targets");
assert.equal(restoredTargets.targetEntityCount, 5, "restored version-1 save retains five completed, visible, or active target entities");

const primaryAfter = await page.evaluate(({ hanziKey, legacyKey }) => ({
  hanzi: localStorage.getItem(hanziKey),
  legacy: localStorage.getItem(legacyKey),
  mutations: window.__storageMutations,
}), { hanziKey: HANZI_KEY, legacyKey: LEGACY_KEY });
assert.equal(primaryAfter.hanzi, primaryBefore.hanzi, "bomb game never writes Hanzi state");
assert.equal(primaryAfter.legacy, primaryBefore.legacy, "bomb game never writes legacy main state");
assert.ok(primaryAfter.mutations.every((entry) => entry.key === BOMB_KEY), "all runtime storage mutations target bomb progress");

await page.setViewportSize({ width: 390, height: 844 });
await page.reload();
await page.waitForFunction(() => Boolean(window.__BOMB_GAME__));
const mobileLayout = await page.evaluate(() => {
  const canvas = document.querySelector("#bombCanvas").getBoundingClientRect();
  const stage = document.querySelector(".bomb-stage").getBoundingClientRect();
  const topbar = document.querySelector(".bomb-topbar").getBoundingClientRect();
  const hud = document.querySelector(".bomb-hud").getBoundingClientRect();
  const actions = document.querySelector(".bomb-actions").getBoundingClientRect();
  const hudItems = [...document.querySelectorAll(".bomb-hud .hud-pill")].map((node) => node.getBoundingClientRect());
  const actionItems = [...document.querySelectorAll(".bomb-actions button, .bomb-actions a")].map((node) => node.getBoundingClientRect());
  const isVisibleInside = (rect) => rect.width > 0 && rect.height > 0 &&
    rect.left >= topbar.left - 0.5 && rect.right <= topbar.right + 0.5 &&
    rect.top >= topbar.top - 0.5 && rect.bottom <= topbar.bottom + 0.5;
  return {
    ratio: canvas.width / canvas.height,
    withinStage: canvas.left >= stage.left - 0.5 && canvas.right <= stage.right + 0.5 &&
      canvas.top >= stage.top - 0.5 && canvas.bottom <= stage.bottom + 0.5,
    noTitleSlot: document.querySelector(".bomb-title") === null && hud.top - topbar.top <= 9,
    zonesSeparated: hud.bottom <= actions.top + 0.5 && actions.top - hud.bottom <= 9,
    hudVisible: hudItems.length === 5 && hudItems.every(isVisibleInside),
    actionsVisible: actionItems.length === 3 && actionItems.every(isVisibleInside),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth ||
      document.documentElement.scrollHeight > document.documentElement.clientHeight,
  };
});
assert.ok(Math.abs(mobileLayout.ratio - 16 / 9) < 0.001);
assert.equal(mobileLayout.withinStage, true);
assert.equal(mobileLayout.noTitleSlot, true, "390px topbar begins with HUD and leaves no title placeholder");
assert.equal(mobileLayout.zonesSeparated, true, "390px HUD and actions are tightly stacked without overlap");
assert.equal(mobileLayout.hudVisible, true, "all 390px HUD items remain contained and visible");
assert.equal(mobileLayout.actionsVisible, true);
assert.equal(mobileLayout.overflow, false);
await page.screenshot({ path: "tests/bomb-390.png", fullPage: true });

await page.locator('a[href="./index.html"]').click();
await page.waitForURL(/\/index\.html$/);
assert.equal(await page.locator("#hanziView").isVisible(), true, "return link reaches new index");

await page.goto(baseUrl + "bomb-game.css?legacy-fixture=1");
await page.evaluate(({ bombKey, hanziKey, legacyKey }) => {
  localStorage.setItem(hanziKey, JSON.stringify({
    schemaVersion: 1,
    records: { "0001": { status: "new", correctCount: 0, errorCount: 0 } },
    masteredIds: [],
  }));
  localStorage.setItem(legacyKey, JSON.stringify({
    records: {
      "0062": { status: "known", correctCount: 2, lastSeen: "2026-08-18" },
      "0063": { status: "mastered", correctCount: 3, lastSeen: "2026-08-18" },
      "0064": { status: "new", correctCount: 0, errorCount: 0 },
    },
    masteredIds: ["0063"],
  }));
  localStorage.removeItem(bombKey);
}, { bombKey: BOMB_KEY, hanziKey: HANZI_KEY, legacyKey: LEGACY_KEY });
await page.goto(bombUrl);
await page.waitForFunction(() => Boolean(window.__BOMB_GAME__));
const fallbackIds = await page.evaluate(() => window.__BOMB_GAME__.getLearningWordIds());
assert.equal(await page.evaluate(() => window.__BOMB_GAME__.getLearningSource()), "legacy");
assert.ok(fallbackIds.includes("0062"), "legacy learned word is included on fallback");
assert.ok(!fallbackIds.includes("0063"), "legacy mastered word is excluded");
assert.ok(!fallbackIds.includes("0064"), "legacy unlearned word is excluded");
const fallbackMutations = await page.evaluate(() => window.__storageMutations);
assert.ok(fallbackMutations.every((entry) => entry.key === BOMB_KEY), "fallback remains read-only");

// Reproduce the user's real state: only Tian has evidence, while one fallback word is mastered.
await page.setViewportSize({ width: 1440, height: 1000 });
await page.goto(baseUrl + "bomb-game.css?one-evidence-fixture=1");
await page.evaluate(({ bombKey, hanziKey, legacyKey }) => {
  localStorage.setItem(hanziKey, JSON.stringify({
    schemaVersion: 1,
    records: {
      "0001": { status: "known", correctCount: 1, errorCount: 0, studyAppearanceCount: 1, lastSeen: "2026-08-22" },
      "0004": { status: "mastered", correctCount: 3, errorCount: 0, studyAppearanceCount: 3, lastSeen: "2026-08-22" },
    },
    masteredIds: ["0004"],
    dailyNewIds: ["0001"],
  }));
  localStorage.setItem(legacyKey, JSON.stringify({ records: {}, masteredIds: [] }));
  localStorage.removeItem(bombKey);
}, { bombKey: BOMB_KEY, hanziKey: HANZI_KEY, legacyKey: LEGACY_KEY });
const oneEvidenceHanziBefore = await page.evaluate(({ hanziKey, legacyKey }) => ({
  hanzi: localStorage.getItem(hanziKey),
  legacy: localStorage.getItem(legacyKey),
}), { hanziKey: HANZI_KEY, legacyKey: LEGACY_KEY });
await page.goto(bombUrl);
await page.waitForFunction(() => Boolean(window.__BOMB_GAME__));
await page.locator("#restartBombGame").click();
await page.waitForFunction(() => window.__BOMB_GAME__.getBoardTargetSummary().renderedLearningCardCount === 0);
const uniqueNewGame = await page.evaluate(() => {
  const summary = window.__BOMB_GAME__.getBoardTargetSummary();
  const state = window.__BOMB_GAME__.getState();
  const charsById = new Map(window.MARIO_WORD_BANK.map((word) => [word.id, word.char]));
  return {
    summary,
    levelChars: summary.levelTargetIds.map((id) => charsById.get(id)),
    visibleChars: summary.hiddenTargetIds.map((id) => charsById.get(id)),
    runIds: state.bombRunWordIds,
    runChars: state.bombRunWordIds.map((id) => charsById.get(id)),
  };
});
assert.deepEqual(uniqueNewGame.summary.levelTargetIds, ["0001", "0002", "0003", "0005", "0006"], "evidence word comes first, then stable non-mastered fallback words");
assert.equal(new Set(uniqueNewGame.summary.levelTargetIds).size, 5, "new game has five different target IDs");
assert.equal(new Set(uniqueNewGame.levelChars).size, 5, "new game has five different Hanzi characters");
assert.deepEqual(uniqueNewGame.summary.hiddenTargetIds, uniqueNewGame.summary.levelTargetIds, "all five unique targets are hidden in bricks");
assert.equal(new Set(uniqueNewGame.visibleChars).size, 5, "the rendered target cards show five different characters");
assert.equal(uniqueNewGame.summary.targetEntityCount, 5);
assert.equal(uniqueNewGame.summary.renderedLearningCardCount, 0);
assert.equal(uniqueNewGame.runIds.length, 50, "Bomb run pool remains capped at 50 unique words");
assert.equal(new Set(uniqueNewGame.runIds).size, 50, "Bomb run pool contains unique IDs");
assert.equal(new Set(uniqueNewGame.runChars).size, 50, "Bomb run pool contains unique characters");
assert.equal(uniqueNewGame.runIds.includes("0004"), false, "mastered Hanzi is never used as fallback");
await page.screenshot({ path: "tests/bomb-desktop.png", fullPage: true });

await page.locator("#restartBombGame").focus();
await page.keyboard.press("Enter");
await page.waitForFunction(() => window.__BOMB_GAME__.getBoardTargetSummary().renderedLearningCardCount === 0);
const uniqueRestart = await page.evaluate(() => window.__BOMB_GAME__.getBoardTargetSummary());
assert.deepEqual(uniqueRestart.levelTargetIds, ["0001", "0002", "0003", "0005", "0006"], "restart rebuilds the same stable five unique targets");
assert.equal(new Set(uniqueRestart.hiddenTargetIds).size, 5, "restart hides five different cards");
assert.equal(uniqueRestart.targetEntityCount, 5);

await page.setViewportSize({ width: 390, height: 844 });
await page.reload();
await page.waitForFunction(() => window.__BOMB_GAME__.getBoardTargetSummary().renderedLearningCardCount === 0);
const uniqueMobile = await page.evaluate(() => {
  const summary = window.__BOMB_GAME__.getBoardTargetSummary();
  const charsById = new Map(window.MARIO_WORD_BANK.map((word) => [word.id, word.char]));
  return {
    summary,
    visibleChars: summary.hiddenTargetIds.map((id) => charsById.get(id)),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
});
assert.equal(uniqueMobile.summary.hiddenTargetIds.length, 5, "390px board still renders five target cards");
assert.equal(new Set(uniqueMobile.summary.hiddenTargetIds).size, 5, "390px target IDs are unique");
assert.equal(new Set(uniqueMobile.visibleChars).size, 5, "390px target characters are unique");
assert.equal(uniqueMobile.summary.renderedLearningCardCount, 0);
assert.equal(uniqueMobile.overflow, false);
await page.screenshot({ path: "tests/bomb-390.png", fullPage: true });

// A version-1 save polluted by the previous repeated/over-five strategy is repaired on restore.
await page.setViewportSize({ width: 1440, height: 1000 });
const pollutedSave = await page.evaluate(() => {
  const current = window.__BOMB_GAME__.getState();
  const tian = current.todayNewWords.find((word) => word.id === "0001");
  const tianPrompt = { type: "pinyin", wordId: "0001", gx: 3, gy: 1, seed: 0 };
  delete current.targetRevealPolicy;
  current.hiddenWordCrates = [];
  current.todayNewWords = Array(7).fill(tian);
  current.bombRunWordIds = Array(60).fill("0001");
  current.bombWordCursor = 41;
  current.retryWordIds = Array(8).fill("0001");
  current.moonWordIds = [];
  current.powerUps = Array.from({ length: 7 }, (_, index) => ({
    ...tianPrompt,
    gx: index === 0 ? tianPrompt.gx : 1 + index,
    gy: index === 0 ? tianPrompt.gy : 1,
  }));
  return current;
});
await restoreBombSnapshot(pollutedSave);
await page.waitForFunction(() => window.__BOMB_GAME__.getBoardTargetSummary().renderedLearningCardCount === 0);
const repairedPollutedSave = await page.evaluate(() => window.__BOMB_GAME__.getBoardTargetSummary());
assert.equal(repairedPollutedSave.levelTargetIds.length, 5, "polluted save is capped to five targets");
assert.equal(new Set(repairedPollutedSave.levelTargetIds).size, 5, "polluted repeated target IDs are replaced with five unique IDs");
assert.equal(new Set(repairedPollutedSave.hiddenTargetIds).size, 5, "polluted board entities are replaced with five hidden unique cards");
assert.equal(repairedPollutedSave.targetEntityCount, 5, "polluted save cannot retain a sixth target entity");

// Restart clears the polluted queue and starts a clean five-target level.
await page.locator("#restartBombGame").click();
await page.waitForFunction(() => window.__BOMB_GAME__.getBoardTargetSummary().renderedLearningCardCount === 0);
const cleanAfterPollution = await page.evaluate(() => ({
  state: window.__BOMB_GAME__.getState(),
  summary: window.__BOMB_GAME__.getBoardTargetSummary(),
}));
assert.equal(new Set(cleanAfterPollution.summary.levelTargetIds).size, 5, "restart clears repeated target queues");
assert.equal(cleanAfterPollution.state.retryWordIds.length, 0, "restart clears polluted retry entries");
assert.equal(cleanAfterPollution.summary.completedTargetIds.length, 0, "restart clears polluted completion entries");

const oneEvidenceHanziAfter = await page.evaluate(({ hanziKey, legacyKey }) => ({
  hanzi: localStorage.getItem(hanziKey),
  legacy: localStorage.getItem(legacyKey),
}), { hanziKey: HANZI_KEY, legacyKey: LEGACY_KEY });
assert.deepEqual(oneEvidenceHanziAfter, oneEvidenceHanziBefore, "fallback selection never mutates Hanzi or legacy state");

await page.setViewportSize({ width: 390, height: 844 });
await assertBrickRevealAndEnemyClear("pinyin");
await page.setViewportSize({ width: 1440, height: 1000 });
const completionGateSave = await page.evaluate(() => window.__BOMB_GAME__.getState());
const firstLevelTargetIds = completionGateSave.todayNewWords.map((word) => word.id);
completionGateSave.status = "playing";
completionGateSave.enemies = [];
completionGateSave.shells = [];
completionGateSave.bombs = [];
completionGateSave.explosions = [];
completionGateSave.map = completionGateSave.map.map((row) => row.map((tile) => tile === 2 ? 0 : tile));
await restoreBombSnapshot(completionGateSave);

for (let completed = 0; completed < 5; completed += 1) {
  const beforePrompt = await page.evaluate(() => window.__BOMB_GAME__.getState());
  const prompt = beforePrompt.powerUps.find((powerUp) => powerUp.type === "pinyin");
  assert.ok(prompt, "target prompt " + (completed + 1) + " exists on the board");
  beforePrompt.status = "playing";
  beforePrompt.player = { ...beforePrompt.player, gx: prompt.gx, gy: prompt.gy, move: null };
  await restoreBombSnapshot(beforePrompt);
  await page.waitForFunction(() => window.__BOMB_GAME__.getState().powerUps.some((powerUp) => powerUp.type === "wordChoice" && powerUp.correct));

  if (completed === 0) {
    const activeQuestion = await page.evaluate(() => window.__BOMB_GAME__.getActiveLearningQuestion());
    assert.equal(activeQuestion.type, "pinyin-to-hanzi");
    assert.equal(activeQuestion.options.length, 3, "pinyin question renders three Hanzi choices");
    assert.equal(activeQuestion.options.filter((option) => option.correct).length, 1, "pinyin question has one correct Hanzi");
    assert.ok(activeQuestion.prompt && activeQuestion.options.every((option) => option.value !== activeQuestion.prompt));
  }
  const beforeChoice = await page.evaluate(() => window.__BOMB_GAME__.getState());
  const correctChoice = beforeChoice.powerUps.find((powerUp) => powerUp.type === "wordChoice" && powerUp.correct);
  assert.ok(correctChoice, "correct choice for target " + (completed + 1) + " is rendered");
  beforeChoice.status = "playing";
  beforeChoice.player = { ...beforeChoice.player, gx: correctChoice.gx, gy: correctChoice.gy, move: null };
  await restoreBombSnapshot(beforeChoice);

  if (completed < 4) {
    await page.waitForFunction((expected) => {
      const state = window.__BOMB_GAME__.getState();
      return state.subLevel === 1 && state.moonWordIds.length === expected;
    }, completed + 1);
    const partial = await page.evaluate(() => window.__BOMB_GAME__.getBoardTargetSummary());
    assert.equal(partial.completedTargetIds.length, completed + 1);
    assert.equal(new Set(partial.completedTargetIds).size, completed + 1, "each target completes at most once");
    assert.equal(partial.visibleInitialTargetIds.length, 4 - completed, "each solved target removes exactly one visible initial card");
    assert.equal(partial.targetEntityCount, 5, "target accounting remains five until level completion");
    if (completed === 1) {
      const partialSave = await page.evaluate(() => window.__BOMB_GAME__.getState());
      await restoreBombSnapshot(partialSave);
      const partialRestored = await page.evaluate(() => window.__BOMB_GAME__.getBoardTargetSummary());
      assert.equal(partialRestored.completedTargetIds.length, 2, "partial save restores completed target count");
      assert.equal(partialRestored.visibleInitialTargetIds.length, 3, "partial save restores the remaining three visible targets");
      assert.equal(partialRestored.targetEntityCount, 5, "partial save restores all five target instances");
    }
  } else {
    await page.waitForFunction(() => window.__BOMB_GAME__.getState().subLevel === 2);
    await page.waitForFunction(() => window.__BOMB_GAME__.getBoardTargetSummary().renderedLearningCardCount === 0);
    const nextLevelTargets = await page.evaluate(() => ({
      state: window.__BOMB_GAME__.getState(),
      summary: window.__BOMB_GAME__.getBoardTargetSummary(),
    }));
    assert.equal(nextLevelTargets.state.subLevel, 2, "level advances only after the fifth target is solved");
    assert.equal(nextLevelTargets.summary.levelTargetIds.length, 5, "next level selects five targets");
    assert.equal(new Set(nextLevelTargets.summary.levelTargetIds).size, 5, "next level target IDs are unique");
    assert.equal(nextLevelTargets.summary.hiddenTargetIds.length, 5, "next level hides five target cards");
    assert.equal(new Set(nextLevelTargets.summary.hiddenTargetIds).size, 5, "next level renders five different cards");
    assert.equal(nextLevelTargets.summary.targetEntityCount, 5);
    assert.deepEqual(nextLevelTargets.summary.levelTargetIds.filter((id) => firstLevelTargetIds.includes(id)), [], "next level rotates to five different words when the pool permits");
    await page.waitForTimeout(500);
    assert.equal((await page.evaluate(() => window.__BOMB_GAME__.getState().subLevel)), 2, "the fifth completion advances exactly once and cannot trigger a sixth round");
  }
}

const nextLevelSave = await page.evaluate(() => window.__BOMB_GAME__.getState());
await restoreBombSnapshot(nextLevelSave);
await page.waitForFunction(() => window.__BOMB_GAME__.getBoardTargetSummary().renderedLearningCardCount === 0);
const nextLevelRestored = await page.evaluate(() => window.__BOMB_GAME__.getBoardTargetSummary());
assert.equal(nextLevelRestored.levelTargetIds.length, 5, "fresh next-level save restores five targets");
assert.equal(new Set(nextLevelRestored.levelTargetIds).size, 5, "fresh next-level save restores five unique target IDs");
assert.equal(nextLevelRestored.hiddenTargetIds.length, 5, "fresh next-level save restores five hidden cards");
assert.equal(new Set(nextLevelRestored.hiddenTargetIds).size, 5, "fresh next-level save restores five different cards");
assert.equal(nextLevelRestored.targetEntityCount, 5);

await assertBrickRevealAndEnemyClear("hanzi");
const hanziQuestionSave = await page.evaluate(() => window.__BOMB_GAME__.getState());
const hanziPrompt = hanziQuestionSave.powerUps.find((powerUp) => powerUp.type === "hanziPrompt");
assert.ok(hanziPrompt, "second level begins with concealed Hanzi question cards");
hanziQuestionSave.status = "playing";
hanziQuestionSave.bombs = [];
hanziQuestionSave.explosions = [];
hanziQuestionSave.player = { ...hanziQuestionSave.player, gx: hanziPrompt.gx, gy: hanziPrompt.gy, move: null };
await restoreBombSnapshot(hanziQuestionSave);
await page.waitForFunction(() => window.__BOMB_GAME__.getActiveLearningQuestion()?.type === "hanzi-to-pinyin");
const hanziQuestion = await page.evaluate(() => window.__BOMB_GAME__.getActiveLearningQuestion());
assert.equal(hanziQuestion.type, "hanzi-to-pinyin");
assert.ok(hanziQuestion.prompt, "Hanzi question exposes only the target Hanzi after activation");
assert.equal(hanziQuestion.options.length, 3, "Hanzi question renders three complete pinyin choices");
assert.equal(hanziQuestion.options.filter((option) => option.correct).length, 1, "Hanzi question has one correct pinyin");
assert.equal(new Set(hanziQuestion.options.map((option) => option.value)).size, 3, "complete pinyin choices are distinct");
assert.ok(hanziQuestion.options.every((option) => option.value !== hanziQuestion.prompt), "question and answers use separate Hanzi/pinyin forms");

const beforePinyinAnswer = await page.evaluate(() => window.__BOMB_GAME__.getState());
const correctPinyinChoice = beforePinyinAnswer.powerUps.find((powerUp) => powerUp.type === "pinyinChoice" && powerUp.correct);
assert.ok(correctPinyinChoice, "the complete correct pinyin is present as one choice");
const hpBeforeCorrectPinyin = beforePinyinAnswer.hp;
beforePinyinAnswer.status = "playing";
beforePinyinAnswer.player = { ...beforePinyinAnswer.player, gx: correctPinyinChoice.gx, gy: correctPinyinChoice.gy, move: null };
await restoreBombSnapshot(beforePinyinAnswer);
await page.waitForFunction((targetId) => window.__BOMB_GAME__.getState().moonWordIds.includes(targetId), correctPinyinChoice.targetWordId);
const afterPinyinAnswer = await page.evaluate(() => window.__BOMB_GAME__.getState());
assert.equal(afterPinyinAnswer.hp, hpBeforeCorrectPinyin, "correct pinyin choice does not cost health");
assert.equal(await page.evaluate(() => window.__BOMB_GAME__.getActiveLearningQuestion()), null, "correct pinyin closes the active question");
assert.equal(afterPinyinAnswer.powerUps.filter((powerUp) => powerUp.type === "pinyinChoice").length, 0, "all choices for the solved Hanzi are removed");

const barrierSave = await page.evaluate(() => window.__BOMB_GAME__.getState());
barrierSave.status = "playing";
barrierSave.hp = 3;
barrierSave.enemies = [];
barrierSave.shells = [];
barrierSave.powerUps = [];
barrierSave.explosions = [];
barrierSave.map = barrierSave.map.map((row) => row.slice());
for (let gx = 2; gx <= 6; gx += 1) barrierSave.map[3][gx] = 0;
barrierSave.map[3][4] = 2;
barrierSave.player = { ...barrierSave.player, gx: 6, gy: 3, move: null, invulnerable: 0 };
barrierSave.bombs = [
  { gx: 3, gy: 3, time: 2, range: 5, ownerInside: false, exploded: false },
  { gx: 2, gy: 3, time: 2, range: 5, ownerInside: false, exploded: false },
];
await restoreBombSnapshot(barrierSave);
await page.waitForFunction(() => window.__BOMB_GAME__.getState().explosions.length === 2);
await page.waitForTimeout(80);
const barrierResult = await page.evaluate(() => ({
  hp: window.__BOMB_GAME__.getState().hp,
  blocked: window.__BOMB_GAME__.getState().explosions.some((explosion) => explosion.blockedCells?.some((cell) => cell.gx === 4 && cell.gy === 3)),
  reachedBehindBrick: window.__BOMB_GAME__.getState().explosions.some((explosion) => explosion.cells.some((cell) => cell.gy === 3 && cell.gx > 4)),
}));
assert.equal(barrierResult.hp, 3, "the fly-star behind the brick is not damaged");
assert.equal(barrierResult.blocked, true, "the destroyed brick remains a flame barrier for the active flame period");
assert.equal(barrierResult.reachedBehindBrick, false, "a simultaneous second explosion cannot pass the just-destroyed brick");




assert.deepEqual(pageErrors, []);
assert.deepEqual(failedResponses, []);
console.log(JSON.stringify({
  ok: true,
  entryAndReturn: "Tab+Enter",
  controls: ["canvas Enter", "Arrow keys", "WASD", "canvas Space", "button Space", "restart Enter"],
  removedTopbarCopy: ["炸弹迷宫 heading", "炸开砖块 subtitle"],
  restoredVersion1Save: true,
  storageWrites: [BOMB_KEY],
  learningFilters: ["evidence priority", "unique non-mastered fallback", "mastered excluded", "legacy fallback", "Hanzi stores read-only"],
  wordsPerRun: primaryIds.length,
  desktop16By9: true,
  mobile390NoOverflow: true,
  fiveTargetsPerLevel: ["new game", "restart", "next level", "partial restore", "fresh restore", "polluted-save repair"],
  completionBoundary: "five unique completions, one advance, no sixth event",
  hiddenDifferentTargetCards: 5,
  resources200: resourceStatuses.length,
}, null, 2));

await context.close();
await browser.close();

async function assertBrickRevealAndEnemyClear(mode) {
  const saved = await page.evaluate(() => window.__BOMB_GAME__.getState());
  assert.equal(saved.hiddenWordCrates.length, 5, mode + ": five hidden questions");
  const counts = saved.bombTargetRoundCounts;
  await restoreBombSnapshot(saved);
  assert.deepEqual(await page.evaluate(() => window.__BOMB_GAME__.getState().hiddenWordCrates), saved.hiddenWordCrates, "refresh keeps hiding locations");
  assert.deepEqual(await page.evaluate(() => window.__BOMB_GAME__.getState().bombTargetRoundCounts), counts, "hidden questions do not add appearance rounds");
  const ids = saved.todayNewWords.map(word => word.id);
  saved.status = "playing";
  saved.enemyClearOpenedBricks = false;
  saved.shells = [];
  saved.powerUps = [];
  saved.hiddenPowerUps = [];
  saved.explosions = [];
  saved.map = saved.map.map(row => row.map(tile => tile === 2 ? 0 : tile));
  const cells = [[4,3], [3,5], [5,5], [7,5], [9,5]];
  saved.hiddenWordCrates = cells.map(([x,y], index) => {
    saved.map[y][x] = 2;
    return [x + "," + y, ids[index]];
  });
  saved.map[3][2] = 0;
  saved.map[3][3] = 0;
  saved.player = { ...saved.player, gx: 1, gy: 1, move: null, invulnerable: 99 };
  const enemyX = saved.map[0].length - 2;
  saved.enemies = [7,9].map((y,index) => ({
    ...saved.enemies[0], id: index + 1, type: "mushroom", hp: 1, alive: true,
    gx: enemyX, gy: y, move: null, stunTimer: 99, hitCooldown: 0
  }));
  saved.enemies.forEach(enemy => { saved.map[enemy.gy][enemy.gx] = 0; });
  saved.bombs = [{ gx: 3, gy: 3, time: 0.12, range: 1, ownerInside: false, exploded: false }];
  await restoreBombSnapshot(saved);
  await page.waitForFunction(() => window.__BOMB_GAME__.getBoardTargetSummary().visibleInitialTargetIds.length === 1);
  const revealed = await page.evaluate(() => window.__BOMB_GAME__.getState());
  const summary = await page.evaluate(() => window.__BOMB_GAME__.getBoardTargetSummary());
  assert.equal(summary.hiddenTargetIds.length, 4);
  assert.equal(summary.targetEntityCount, 5);
  assert.deepEqual(summary.visibleInitialTargetIds, [ids[0]]);
  await assertRevealedTargetText(mode);
  assert.equal(revealed.powerUps.find(item => item.wordId === ids[0]).type, mode === "hanzi" ? "hanziPrompt" : "pinyin");
  assert.equal(revealed.enemies.filter(enemy => enemy.alive).length, 2);
  assert.equal(revealed.bombTargetRoundCounts[ids[0]], (counts[ids[0]] || 0) + 1, "appearance increments only on reveal");
  revealed.explosions = [];
  revealed.bombs = [];
  await restoreBombSnapshot(revealed);
  assert.equal((await page.evaluate(() => window.__BOMB_GAME__.getBoardTargetSummary())).hiddenTargetIds.length, 4, "reload preserves partially revealed board");
  assert.deepEqual(await page.evaluate(() => window.__BOMB_GAME__.getState().bombTargetRoundCounts), revealed.bombTargetRoundCounts, "reload never adds appearance rounds");
  for (let index = 0; index < 2; index += 1) {
    const attack = await page.evaluate(() => window.__BOMB_GAME__.getState());
    const enemy = attack.enemies.find(item => item.alive);
    attack.explosions = [];
    attack.bombs = [{ gx: enemy.gx, gy: enemy.gy, time: 0.12, range: 1, ownerInside: false, exploded: false }];
    await restoreBombSnapshot(attack);
    await page.waitForFunction(count => window.__BOMB_GAME__.getState().enemies.filter(item => item.alive).length === count, 1 - index);
    if (index === 0) assert.equal((await page.evaluate(() => window.__BOMB_GAME__.getBoardTargetSummary())).hiddenTargetIds.length, 4, "one remaining enemy prevents full reveal");
  }
  await page.waitForFunction(() => window.__BOMB_GAME__.getBoardTargetSummary().renderedLearningCardCount === 5);
  const cleared = await page.evaluate(() => window.__BOMB_GAME__.getState());
  assert.equal(cleared.hiddenWordCrates.length, 0, "last enemy reveals every pending question");
  assert.equal(cleared.map.flat().includes(2), false, "enemy clear opens remaining bricks");
  assert.equal(cleared.moonWordIds.length, 0, "reveal never counts as an answer");
  assert.equal((await page.evaluate(() => window.__BOMB_GAME__.getBoardTargetSummary())).targetEntityCount, 5);
  const previousViewport = page.viewportSize();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await assertRevealedTargetText(mode);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `tests/bomb-revealed-${mode}-${width}.png`, fullPage: true });
  }
  await page.setViewportSize(previousViewport);
  await page.screenshot({ path: "tests/bomb-revealed-" + mode + ".png", fullPage: true });
  await restoreBombSnapshot(cleared);
  assert.equal((await page.evaluate(() => window.__BOMB_GAME__.getBoardTargetSummary())).visibleInitialTargetIds.length, 5, "cleared save keeps all pending questions visible");
}

async function assertRevealedTargetText(mode) {
  const result = await page.evaluate(async mode => {
    const saved = window.__BOMB_GAME__.getState();
    const expected = saved.powerUps.filter(item => item.type === (mode === "hanzi" ? "hanziPrompt" : "pinyin"))
      .map(item => {
        const word = window.MARIO_WORD_BANK.find(word => word.id === item.wordId);
        return mode === "hanzi" ? word.char : window.MARIO_PINYIN_READINGS.label(word, window.MARIO_WORD_BANK);
      });
    const drawn = await new Promise(resolve => {
      const calls = [];
      const original = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function(text, ...args) {
        if (this.canvas.id === "bombCanvas") calls.push({ text: String(text), width: this.measureText(text).width });
        return original.call(this, text, ...args);
      };
      requestAnimationFrame(() => requestAnimationFrame(() => {
        CanvasRenderingContext2D.prototype.fillText = original;
        resolve(calls);
      }));
    });
    return { expected, drawn };
  }, mode);
  assert.ok(result.expected.length > 0);
  for (const target of result.expected) {
    const draws = result.drawn.filter(call => call.text === target);
    assert.ok(draws.length > 0, mode + ": canvas actually draws " + target);
    assert.ok(draws.every(call => call.width <= (mode === "hanzi" ? 42 : 66)), target + " fits its card");
  }
  assert.equal(result.drawn.some(call => ["?", "？", "拼音题", "汉字题"].includes(call.text)), false);
}
