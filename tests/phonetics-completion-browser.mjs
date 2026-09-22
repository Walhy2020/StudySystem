import assert from "node:assert/strict";
import { chromium } from "file:///C:/Users/St/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:53177/";
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const errors = [];
const state = page => page.evaluate(() => window.__PHONETICS_APP__.getState());
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, hasTouch: true });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(response.url()); });
    await page.goto(base + `phonetics.html?test=completion-${width}`);
    await page.locator("#startDaily").click();
    for (const selector of ["#startDaily", "#startReview"]) assert.equal(await page.locator(selector).isVisible(), false);
    for (let i = 0; i < 3; i++) await page.locator("#markWrong").click();
    const ids = new Set();
    for (let i = 0; i < 3; i++) {
      const current = (await state(page)).activeWordId;
      assert.ok(current && !ids.has(current));
      ids.add(current);
      await page.locator("#markCorrect").click();
    }
    assert.equal((await state(page)).activeWordId, null);
    assert.equal((await state(page)).dailyTaskDone, false);
    assert.equal(await page.locator("#finishNewWords").isVisible(), true);
    assert.equal(await page.locator("#markCorrect").isVisible(), false);
    await page.reload();
    assert.equal(await page.locator("#finishNewWords").isVisible(), true);
    assert.equal((await state(page)).activeWordId, null);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const button = await page.locator("#finishNewWords").boundingBox();
    assert.ok(button.width > 0 && button.x >= 0 && button.x + button.width <= width);
    await page.screenshot({ path: `tests/phonetics-completion-${width}.png`, fullPage: true });
    if (width === 390) await page.locator("#finishNewWords").tap();
    else {
      await page.locator("#finishNewWords").focus();
      await page.keyboard.press("Enter");
    }
    assert.equal((await state(page)).dailyTaskDone, true);
    await page.reload();
    assert.equal((await state(page)).dailyTaskDone, true);
    assert.equal((await state(page)).activeWordId, null);

    // All checkmarks in screening must finish after exactly one pass, including a mid-pass reload.
    await page.locator("#startDaily").click();
    const seen = new Set();
    for (let i = 0; i < 48; i++) {
      const current = (await state(page)).activeWordId;
      assert.ok(current && !seen.has(current), "screening never loops after checkmark");
      seen.add(current);
      await page.locator("#markCorrect").click();
      if (i === 23) await page.reload();
    }
    assert.equal(seen.size, 48);
    assert.equal((await state(page)).activeWordId, null);
    await page.locator("#finishNewWords").click();
    assert.equal((await state(page)).dailyTaskDone, true);

    // Entry choices disappear during review, including after restoring a saved round.
    for (const selector of ["#startDaily", "#startReview"]) assert.equal(await page.locator(selector).isVisible(), true);
    if (width === 390) await page.locator("#startReview").tap();
    else {
      await page.locator("#startReview").focus();
      await page.keyboard.press("Enter");
    }
    assert.equal((await state(page)).dailyReviewIds.length, 48);
    for (const selector of ["#startDaily", "#startReview"]) assert.equal(await page.locator(selector).isVisible(), false);
    for (const selector of ["#speakCurrent", "#markCorrect", "#markWrong", "#markMastered"]) assert.equal(await page.locator(selector).isVisible(), true);
    await page.screenshot({ path: `tests/phonetics-review-active-${width}.png`, fullPage: true });
    const target = await page.evaluate(() => {
      const app = window.__PHONETICS_APP__;
      const saved = app.getState();
      saved.dailyReviewDoneIds = saved.dailyReviewIds.slice(0, 20);
      saved.activeWordId = saved.dailyReviewIds[20];
      localStorage.setItem(app.getStorageKey(), JSON.stringify(saved));
      return saved.activeWordId;
    });
    await page.reload();
    assert.equal((await state(page)).activeWordId, target);
    assert.equal((await state(page)).dailyTaskDone, false);
    assert.equal((await state(page)).dailyReviewIds.length, 48);
    for (const selector of ["#startDaily", "#startReview"]) assert.equal(await page.locator(selector).isVisible(), false);
    await page.locator("#markCorrect").click();
    assert.equal((await state(page)).dailyReviewDoneIds.length, 21);
    await page.evaluate(() => {
      while (!window.__PHONETICS_APP__.getState().dailyTaskDone) window.__PHONETICS_APP__.dispatch("correct");
    });
    for (const selector of ["#startDaily", "#startReview"]) assert.equal(await page.locator(selector).isVisible(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", widths: [1440, 390], singlePass: true,
    screeningCheckmarks: 48, completionPersists: true, activeEntryButtonsHidden: true, completionEntryButtonsVisible: true, fullReviewResumeAfter20: true }));
} finally {
  await browser.close();
}
