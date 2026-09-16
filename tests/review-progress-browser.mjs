import assert from "node:assert/strict";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const { chromium } = await import(pathToFileURL(join(homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs")));
const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:53177/";
const key = "mario-total-review-v1";
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const results = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: width === 390 });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(response.url()); });
    await page.goto(new URL("review-learning.css", base).href);
    await page.evaluate(() => {
      localStorage.setItem("mario-theme-learned-v1", JSON.stringify({ version: 2, learned: ["body:head", "body:hand", "body:arm"] }));
    });
    await context.addInitScript(() => {
      window.__reviewWrites = [];
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) { window.__reviewWrites.push(key); return original.call(this, key, value); };
    });
    await page.goto(new URL("review-learning.html", base).href);
    const snapshot = () => page.evaluate(() => {
      const session = window.__THEME_OVERVIEW__.reviewSession;
      return { questions: session.questions, index: session.questionIndex, options: session.optionKeys, target: session.target()?.key };
    });
    const initial = await snapshot();
    await page.reload();
    assert.deepEqual(await snapshot(), initial, "initial order and options survive refresh");
    const first = initial.target;
    if (width === 390) {
      await page.locator("#reviewForgotten").scrollIntoViewIfNeeded();
      await page.locator("#reviewForgotten").tap();
    }
    else { await page.locator("#reviewForgotten").focus(); await page.keyboard.press("Enter"); }
    const afterX = await snapshot();
    assert.equal(afterX.index, 1);
    await page.reload(); // Deliberately reload before the 650ms transition ends.
    assert.deepEqual(await snapshot(), afterX, "rating and next question persist immediately");
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).records[window.__THEME_OVERVIEW__.reviewSession.questions[0]], key), "forgotten");
    await page.keyboard.press("Space");
    assert.equal(await page.locator("#totalReviewPhonetic").getAttribute("aria-expanded"), "true");
    await page.keyboard.press("Space");
    const second = (await snapshot()).target;
    await page.locator("#reviewRemembered").click();
    await page.reload();
    assert.equal((await snapshot()).index, 2);
    assert.equal(await page.evaluate(({key, second}) => JSON.parse(localStorage.getItem(key)).records[second], { key, second }), "remembered");
    const third = (await snapshot()).target;
    const option = page.locator('[data-review-key="' + third + '"]');
    await option.click();
    await page.reload();
    assert.equal(await page.locator("#totalReviewResult").isVisible(), true, "completed round survives refresh");
    await page.locator("#restartTotalReview").click();
    const next = await snapshot();
    assert.deepEqual(next.questions, [first, third, second], "next round prioritizes X, then unmarked, then checkmark");
    assert.equal(await page.locator("#reviewForgotten").getAttribute("aria-pressed"), "true");
    assert.match(await page.locator("#reviewMemoryStatus").textContent(), /没记住/);
    await page.locator("#openWordLibrary").click();
    await page.locator("#startLibraryReview").click();
    assert.deepEqual(await snapshot(), next, "library detour resumes same round");
    await page.locator("#totalReviewPhonetic").click();
    assert.equal(await page.locator("#totalReviewPhonemes").isVisible(), true);
    for (const id of ["reviewRemembered", "reviewForgotten"]) {
      const box = await page.locator("#" + id).boundingBox();
      assert.ok(box.width >= 100 && box.height >= 44);
      assert.ok(box.x >= 0 && box.x + box.width <= width);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: "tests/review-memory-" + width + ".png", fullPage: true });
    await page.locator("#reviewRemembered").click();
    await page.reload();
    assert.equal(await page.evaluate(({key, first}) => JSON.parse(localStorage.getItem(key)).records[first], { key, first }), "remembered", "checkmark replaces prior X");
    assert.ok((await page.evaluate(() => window.__reviewWrites)).every(item => item === "mario-total-review-v1"));
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("mario-theme-learned-v1")).learned.length), 3);
    assert.deepEqual(errors, []);
    results.push({ width, refresh: true, rating: true, priority: true, completedRestore: true, noOverflow: true });
    await context.close();
  }
  console.log(JSON.stringify({ ok: true, surface: "Microsoft Edge", results }, null, 2));
} finally { await browser.close(); }
