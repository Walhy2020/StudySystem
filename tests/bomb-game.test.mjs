import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const js = read("bomb-game.js");
const css = read("bomb-game.css");
const html = read("bomb-game.html");
const index = read("index.html");
const server = read("server.py");

const layoutSource = js.match(
  /function calculateBombViewportLayout\([\s\S]+?\r?\n  }\r?\n\r?\n  function fitBombViewport/
);
assert.ok(layoutSource, "viewport layout helper remains available");
const calculateLayout = new Function(
  layoutSource[0].replace(/\r?\n\r?\n  function fitBombViewport$/, "") +
  "\nreturn calculateBombViewportLayout;"
)();

[
  [1920, 1004],
  [1366, 692],
  [817, 608],
  [390, 749],
].forEach(([stageWidth, stageHeight]) => {
  const layout = calculateLayout(stageWidth, stageHeight);
  assert.ok(layout.canvasWidth <= stageWidth, stageWidth + "x" + stageHeight + ": canvas fits width");
  assert.ok(layout.canvasHeight <= stageHeight, stageWidth + "x" + stageHeight + ": canvas fits height");
  assert.ok(Math.abs(layout.canvasWidth / layout.canvasHeight - 16 / 9) < 1e-9, "canvas remains 16:9");
});

assert.match(html, /<canvas id="bombCanvas" width="1280" height="720"/);
assert.ok(html.includes('bomb-game.css?v=1.1'));
assert.ok(html.includes('bomb-game.js?v=2.9'));
assert.ok(html.includes('src/bomb-audio.js?v=1.1'));
assert.ok(html.includes('./data/characters.js?v=1.0'));
assert.ok(html.includes('./data/pinyin-readings.js?v=1.0'));
assert.ok(!html.includes("stable-url.js"));
assert.ok(!html.includes("learning-backup.js"));
assert.ok(!html.includes('class="bomb-title"'));
assert.ok(!html.includes("<h1>炸弹迷宫</h1>"));
assert.ok(!html.includes("<p>炸开砖块</p>"));
assert.ok(html.includes('<h2 id="bombStartTitle">炸弹迷宫</h2>'));
assert.ok(html.includes('<a href="./index.html">返回</a>'));
assert.ok(index.includes('href="./bomb-game.html?v=1.0"'));
assert.ok(index.includes('styles.css?v=2.2'));
assert.ok(!index.match(/<nav class="module-tabs"[\s\S]*?炸弹迷宫[\s\S]*?<\/nav>/));
assert.ok(index.match(/<header class="topbar">[\s\S]*?<div class="top-actions">[\s\S]*?id="bombGameEntry"[\s\S]*?<\/div>[\s\S]*?<\/header>/));
assert.ok(!index.match(/<header class="topbar">[\s\S]*?id="resetProgress"[\s\S]*?<\/header>/));
assert.ok(index.match(/<div class="map-actions"[^>]*>[\s\S]*?id="resetProgress"[\s\S]*?<\/div>/));
assert.ok(!index.match(/<div class="map-actions"[^>]*>[\s\S]*?bombGameEntry[\s\S]*?<\/div>/));
assert.ok(server.includes('path.endswith(".html")'));

assert.ok(js.includes('const WORLDS_PER_RUN = 2;'));
assert.ok(js.includes('const LEVELS_PER_WORLD = 5;'));
assert.ok(js.includes('const ROWS = 11;'));
assert.ok(js.includes('const COLS_PER_LEVEL = 2;'));
assert.ok(js.includes('const BOMB_TIMER = 2;'));
assert.ok(js.includes('const FLAME_TIME = 0.5;'));
assert.ok(js.includes('const MAX_HP = 3;'));
assert.ok(js.includes('bombLimit: 3'));
assert.ok(js.includes('flameRange: 1'));
assert.ok(js.includes('const BOMB_MOONS_PER_LEVEL = 5;'));
assert.ok(js.includes('const BOMB_WORDS_PER_RUN = WORLDS_PER_RUN * LEVELS_PER_WORLD * BOMB_MOONS_PER_LEVEL;'));
assert.ok(js.includes("function fillLevelTargetIds(levelIds)"));
assert.ok(js.includes("function uniqueWordIdsByCharacter(ids)"));
assert.ok(js.includes("while (levelIds.length < BOMB_MOONS_PER_LEVEL && inspected < runIds.length)"));
assert.ok(js.includes("selectedCharacters.has(character)"), "a level cannot repeat the same Hanzi character");
assert.ok(js.includes("function spawnVisibleLevelTargets(words = pendingLevelWords())"));
assert.ok(js.includes("function normalizeRestoredLevelTargets(preserveRevealed = true)"));
assert.ok(js.includes("function completeLearningTarget(wordId)"));
assert.ok(js.includes("state.moonWordIds.push(wordId)"));
assert.ok(js.includes("isLevelTarget(wordId) || isLevelWordComplete(wordId)"), "only an unfinished level target can complete");
assert.ok(js.includes("state.moonWordIds.includes(wordId)"), "each target ID can complete at most once per level");
assert.ok(js.includes("state.moonWordIds = uniqueWordIdsByCharacter(state.moonWordIds)"), "polluted saves collapse repeated completions");
assert.ok(js.includes("function bombRunWordsFromLearning(learning)"));
assert.ok(js.indexOf("evidenceWords.forEach(addWord)") < js.indexOf("WORDS.forEach(addWord)"), "evidence words precede learnable fallback words");
assert.ok(js.includes("masteredIds.has(word.id)"), "mastered words are excluded from the run pool");
assert.ok(js.includes("uniqueWordIdsByCharacter(restoredIds.concat(availableIds))"), "a restored run keeps its existing unique pool before filling gaps");
assert.ok(js.includes("getBoardTargetSummary: () =>"));
assert.ok(js.includes("renderedLearningCardCount: lastRenderedLearningCardCount"));
assert.ok(js.includes('return state.subLevel % 2 === 1 ? LEARNING_MODES.pinyin : LEARNING_MODES.hanzi;'));
assert.ok(js.includes('return currentLearningMode() === LEARNING_MODES.pinyin ? "找汉字" : "找拼音";'));
assert.ok(js.includes('spawnPowerUp("pinyinChoice"'));
assert.ok(js.includes('"hanzi-to-pinyin"'));
assert.ok(js.includes('"pinyin-to-hanzi"'));
assert.ok(js.includes('drawPinyinReward(center, powerUp, bob, Boolean(activeLearningTargetId()))'));
assert.ok(js.includes('drawWordChoice(center, powerUp, bob, Boolean(activeLearningTargetId()))'));
assert.ok(!js.includes('drawQuestionCard'), "revealed targets show their content, not question marks");
assert.ok(js.includes("getActiveLearningQuestion: () =>"));
assert.ok(js.includes('retryWordNextLevel(wrongPinyinWordId);'));
assert.ok(js.includes('retryWordNextLevel(wrongWordTargetId);'));
assert.ok(js.includes("const blockedCells = [];"));
assert.ok(js.includes("Array.isArray(explosion.blockedCells)"));
assert.ok(js.includes("blockedCells.push({ gx, gy });"));
assert.ok(js.includes("state.explosions.push({ cells, blockedCells"));

assert.ok(js.includes('const HANZI_STORE_KEY = "mario-hanzi-refactor-v1";'));
assert.ok(js.includes('const LEGACY_STORE_KEY = "mario-literacy-desktop-mvp-v1";'));
assert.ok(js.includes('const BOMB_PROGRESS_KEY = "mario-bomb-game-progress-v1";'));
assert.ok(js.includes('const BOMB_PROGRESS_VERSION = 1;'));
const writes = [...js.matchAll(/localStorage\.(setItem|removeItem)\(([^,\)]+)/g)].map((match) => match[2].trim());
assert.deepEqual([...new Set(writes)], ["BOMB_PROGRESS_KEY"], "only bomb progress storage may be mutated");
assert.ok(js.includes("const hanzi = readStoredObject(HANZI_STORE_KEY);"));
assert.ok(js.includes("const legacy = readStoredObject(LEGACY_STORE_KEY);"));
assert.ok(js.includes('lastLearningSource = "legacy";'));
assert.ok(js.includes("Number(record.correctCount) > 0"));
assert.ok(js.includes("Number(record.errorCount ?? record.wrongCount) > 0"));
assert.ok(js.includes("Number(record.studyAppearanceCount) > 0"));
assert.ok(js.includes('record?.status === "mastered"'));
assert.ok(js.includes(".slice(0, BOMB_WORDS_PER_RUN)"));
for (const field of [
  "map", "player", "bombs", "enemies", "shells", "powerUps", "hiddenPowerUps",
  "hiddenWordCrates", "todayNewWords", "bombRunWordIds", "retryWordIds", "moonWordIds",
  "bombTargetRoundCounts", "bombSeenWordIds", "bombAppearanceHistory", "activePinyinWordId",
  "activeHanziWordId", "activePinyinStep", "activePinyinTotal",
]) {
  assert.ok(js.includes(field + ":"), "serialized field: " + field);
}

assert.ok(js.includes("const KOOPA_MOVE_TIME = 1.0;"));
assert.ok(js.includes('if (isNightTime() && enemy.type !== "koopa-green")'));
assert.ok(js.includes('if (!isNightTime() || enemy.type === "koopa-green" || enemy.type === "bullet-bill") return;'));
assert.match(js, /function isNightTime\(\) \{\s+return false;\s+\}/);
assert.ok(js.includes('type: index === 1 ? "bowser" : "mushroom",'));
assert.ok(js.includes("hp: index === 1 ? 2 : 1,"));
assert.ok(js.includes('type: "koopa-green",'));
assert.ok(js.includes("spawnShell(gx, gy);"));
assert.ok(js.includes('const BULLET_BILL_FRAME = { sx: 560, sy: 48, sw: 16, sh: 16 };'));
assert.ok(!js.includes("BULLET_BILL_MAX_STEPS"));
assert.ok(js.includes("const BULLET_BILL_HIDDEN_COUNT_PER_LEVEL = 1;"));
assert.ok(!js.includes("BULLET_BILL_SPAWN_CHANCE"));
assert.ok(!js.includes("BULLET_BILL_TEST_FIRST_LEVEL"));
assert.ok(js.includes('if (hiddenType === "bulletBill")'));
assert.ok(js.includes('type: "bullet-bill",'));
assert.ok(js.includes("function chooseBulletBillDirection(enemy)"));
assert.ok(js.includes("function convertBombTouchedByBulletBill(enemy)"));
assert.ok(js.includes('if (enemy.type === "bullet-bill") return;'));
assert.ok(!js.includes("function explodeBulletBill("));
assert.ok(js.includes('enemy.type === "bullet-bill"'));
assert.ok(js.includes("advanceMove(enemy, dt, true)"), "Bullet Bill uses continuous linear movement between cells");
assert.ok(js.includes('window.addEventListener("resize", scheduleBombViewportFit)'));
assert.ok(js.includes('window.addEventListener("pageshow", scheduleBombViewportFit)'));
assert.ok(js.includes('window.visualViewport?.addEventListener("resize", scheduleBombViewportFit)'));
assert.ok(js.includes("viewportObserver.observe(topbarNode)"));
assert.ok(js.includes("viewportObserver.observe(stageNode)"));
assert.ok(js.includes("function hasNativeKeyboardTarget(target)"));
assert.ok(js.includes("if (!(target instanceof Element) || target === canvas) return false;"));
assert.ok(js.match(/window\.addEventListener\("keydown", \(event\) => \{\s+if \(hasNativeKeyboardTarget\(event\.target\)\) return;/));
assert.ok(js.match(/window\.addEventListener\("keyup", \(event\) => \{\s+const direction = KEY_DIRS\[event.code\];/));
assert.ok(js.includes('heldDirections.delete(direction);'));
assert.ok(js.includes('if (!hasNativeKeyboardTarget(event.target)) event.preventDefault();'));
for (const selector of [
  '"a"', '"button"', '"input"', '"select"', '"textarea"',
  "[contenteditable]", '[role="button"]', '[role="link"]', "[tabindex]",
]) {
  assert.ok(js.includes(selector), "native keyboard target selector: " + selector);
}
assert.ok(css.includes("--bomb-viewport-height"));
assert.ok(!css.includes(".bomb-title"));
assert.ok(css.includes('grid-template-areas: "hud actions";'));
assert.ok(css.includes("grid-template-columns: minmax(0, 1fr) auto;"));
assert.ok(css.includes("@media (max-width: 480px)"));

const expectedAssets = [
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
expectedAssets.forEach((asset) => assert.ok(fs.existsSync(path.join(root, asset)), "asset exists: " + asset));
for (const unused of [
  "assets/sprites/items-objects-npcs.png",
  "assets/sprites/mario-luigi.png",
  "assets/sprites/star-rain.png",
  "assets/sprites/tileset.png",
]) {
  assert.ok(!fs.existsSync(path.join(root, unused)), "unused sprite not copied: " + unused);
}

console.log("Bomb game static and viewport tests passed.");
