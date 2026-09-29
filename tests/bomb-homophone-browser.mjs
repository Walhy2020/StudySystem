import assert from "node:assert/strict";
import { loadChromium } from "./playwright-runtime.mjs";

const chromium = await loadChromium();
const baseUrl = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const gameUrl = baseUrl + "bomb-game.html?homophone-acceptance=1";
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
    await page.goto(baseUrl + "bomb-game.css?homophone-clear=1");
    await page.evaluate(key => localStorage.removeItem(key), progressKey);
    await page.goto(gameUrl);
    await page.waitForFunction(() => Boolean(window.__BOMB_GAME__));
    const fixture = await page.evaluate(() => {
      const word = (char) => window.MARIO_WORD_BANK.find((item) => item.char === char);
      const selected = ["笔", "比", "火", "山", "月", "天", "人"].map(word);
      if (selected.some((item) => !item)) throw new Error("Missing character fixture");
      const saved = window.__BOMB_GAME__.getState();
      saved.status = "playing";
      saved.startLayerHidden = true;
      saved.todayNewWords = selected.slice(0, 5);
      saved.bombRunWordIds = selected.map((item) => item.id);
      saved.bombWordCursor = 0;
      saved.retryWordIds = [];
      saved.moonWordIds = [];
      saved.map = Array.from({ length: 11 }, (_, y) => Array.from({ length: 17 }, (_, x) =>
        x === 0 || y === 0 || x === 16 || y === 10 ? 1 : 0));
      saved.hiddenWordCrates = selected.slice(0, 5).map((item, index) => {
        saved.map[3][3 + index] = 2;
        return [`${3 + index},3`, item.id];
      });
      saved.hiddenPowerUps = [];
      saved.powerUps = [
        { type: "wordChoice", gx: 1, gy: 2, wordId: selected[0].id, targetWordId: selected[0].id, correct: true },
        { type: "wordChoice", gx: 2, gy: 1, wordId: selected[1].id, targetWordId: selected[0].id, correct: false },
        { type: "wordChoice", gx: 3, gy: 1, wordId: selected[2].id, targetWordId: selected[0].id, correct: false },
      ];
      saved.activePinyinWordId = selected[0].id;
      saved.activeHanziWordId = null;
      saved.enemies = [];
      saved.bombs = [];
      saved.mushroomShots = [];
      saved.explosions = [];
      saved.shells = [];
      return { saved, penId: selected[0].id, compareId: selected[1].id };
    });

    async function loadSaved(saved) {
      await page.goto(baseUrl + "bomb-game.css?homophone-seed=1");
      await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
        { key: progressKey, value: saved });
      await page.goto(gameUrl);
      await page.waitForFunction(() => Boolean(window.__BOMB_GAME__));
    }

    await loadSaved(fixture.saved);
    const restored = await page.evaluate(() => ({
      state: window.__BOMB_GAME__.getState(),
      question: window.__BOMB_GAME__.getActiveLearningQuestion(),
    }));
    assert.equal(await page.evaluate(() => window.__BOMB_GAME__.isAwaitingContinue()), true);
    assert.equal(restored.state.todayNewWords.length, 5);
    assert.ok(restored.state.todayNewWords.some((item) => item.id === fixture.penId));
    assert.ok(!restored.state.todayNewWords.some((item) => item.id === fixture.compareId),
      "unfinished same-reading target is replaced without losing the five questions");
    assert.ok(restored.state.retryWordIds.includes(fixture.compareId));
    assert.ok(!restored.question.options.some((item) => item.value === "比"),
      "old saved same-reading wrong choice is removed");
    assert.equal(restored.question.options.filter((item) => item.correct).length, 1);

    const completedSave = structuredClone(fixture.saved);
    completedSave.moonWordIds = [fixture.compareId];
    await loadSaved(completedSave);
    const completed = await page.evaluate(() => window.__BOMB_GAME__.getState());
    assert.deepEqual(completed.moonWordIds, [fixture.compareId], "completed progress is preserved");
    assert.ok(completed.todayNewWords.some((item) => item.id === fixture.compareId));
    assert.ok(!completed.todayNewWords.some((item) => item.id === fixture.penId));
    assert.equal(completed.activePinyinWordId, null, "superseded active question is retired");
    assert.deepEqual(errors, []);
    results.push({ width, currentChoices: restored.question.options.map((item) => item.value),
      targetCount: restored.state.todayNewWords.length, completedPreserved: completed.moonWordIds.length });
    await context.close();
  }
  process.stdout.write(JSON.stringify({ ok: true, results }) + "\n");
} finally {
  await browser.close();
}
