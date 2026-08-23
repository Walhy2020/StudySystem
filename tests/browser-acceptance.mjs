import assert from "node:assert/strict";
import { chromium } from "file:///C:/Users/St/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const baseUrl = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const url = new URL("?test=browser-acceptance", baseUrl).href;
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage();
const pageErrors = [];
page.on("pageerror", (error) => pageErrors.push(error.message));

async function state() {
  return page.evaluate(() => window.__HANZI_APP__.getState());
}

async function resetTestKey() {
  await page.goto(url);
  await page.evaluate(() => {
    const key = window.__HANZI_APP__.getStorageKey();
    localStorage.removeItem(key);
  });
  await page.reload();
}

async function revealSpecificWord(character) {
  await page.evaluate((targetCharacter) => {
    const word = window.MARIO_WORD_BANK.find((item) => item.char === targetCharacter);
    const key = window.__HANZI_APP__.getStorageKey();
    const current = window.__HANZI_APP__.getState();
    Object.assign(current, {
      dailyPhase: "screening", dailyTaskStarted: true, dailyTaskDone: false,
      activeWordId: word.id, inlineReviewContext: null,
    });
    localStorage.setItem(key, JSON.stringify(current));
  }, character);
  await page.reload();
  assert.equal(await page.locator("#currentChar").textContent(), character);
  await page.click("#currentChar");
}
async function currentCharMetrics(expectedKind, expectedText) {
  const metrics = await page.locator("#currentChar").evaluate((button) => {
    const content = button.querySelector(".hanzi-content");
    const buttonBox = button.getBoundingClientRect();
    const textBox = content.getBoundingClientRect();
    const style = getComputedStyle(content);
    return {
      kind: button.dataset.contentKind,
      text: content.textContent,
      buttonWidth: buttonBox.width,
      buttonHeight: buttonBox.height,
      textWidth: textBox.width,
      textHeight: textBox.height,
      fontSize: parseFloat(style.fontSize),
      whiteSpace: style.whiteSpace,
      within: textBox.left >= buttonBox.left + 0.5 && textBox.right <= buttonBox.right - 0.5 &&
        textBox.top >= buttonBox.top + 0.5 && textBox.bottom <= buttonBox.bottom - 0.5,
      noScrollOverflow: button.scrollWidth <= button.clientWidth && button.scrollHeight <= button.clientHeight,
    };
  });
  assert.equal(metrics.kind, expectedKind);
  assert.equal(metrics.text, expectedText);
  assert.equal(metrics.whiteSpace, "nowrap");
  assert.equal(metrics.within, true, `${expectedText} text box must stay inside the yellow card`);
  assert.equal(metrics.noScrollOverflow, true, `${expectedText} must not overflow the yellow card`);
  return metrics;
}

async function glyphBadgeMetrics(label) {
  const metrics = await page.evaluate(() => {
    const button = document.querySelector("#currentChar");
    const content = button.querySelector(".hanzi-content");
    const badge = document.querySelector("#reviewRoundBadge");
    const buttonBox = button.getBoundingClientRect();
    const contentBox = content.getBoundingClientRect();
    const badgeBox = badge.getBoundingClientRect();
    const text = content.textContent;
    const style = getComputedStyle(content);
    const marker = document.createElement("span");
    marker.setAttribute("aria-hidden", "true");
    marker.style.cssText = "display:inline-block;width:0;height:0;padding:0;margin:0;border:0;vertical-align:baseline";
    content.append(marker);
    const baseline = marker.getBoundingClientRect().top;
    marker.remove();
    const context = document.createElement("canvas").getContext("2d");
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const ink = context.measureText(text);
    const glyph = {
      left: contentBox.left - ink.actualBoundingBoxLeft,
      right: contentBox.left + ink.actualBoundingBoxRight,
      top: baseline - ink.actualBoundingBoxAscent,
      bottom: baseline + ink.actualBoundingBoxDescent,
    };
    const overlapWidth = Math.max(0, Math.min(glyph.right, badgeBox.right) - Math.max(glyph.left, badgeBox.left));
    const overlapHeight = Math.max(0, Math.min(glyph.bottom, badgeBox.bottom) - Math.max(glyph.top, badgeBox.top));
    return {
      glyph: { left: glyph.left, right: glyph.right, top: glyph.top, bottom: glyph.bottom },
      badge: { left: badgeBox.left, right: badgeBox.right, top: badgeBox.top, bottom: badgeBox.bottom },
      overlapWidth,
      overlapHeight,
      horizontalGap: badgeBox.left - glyph.right,
      verticalGap: badgeBox.top - glyph.bottom,
      glyphInsideCard: glyph.left >= buttonBox.left && glyph.right <= buttonBox.right &&
        glyph.top >= buttonBox.top && glyph.bottom <= buttonBox.bottom,
      badgeInsideCard: badgeBox.left >= buttonBox.left && badgeBox.right <= buttonBox.right &&
        badgeBox.top >= buttonBox.top && badgeBox.bottom <= buttonBox.bottom,
    };
  });
  assert.equal(metrics.glyphInsideCard, true, `${label}: actual glyph ink must stay inside the card`);
  assert.equal(metrics.badgeInsideCard, true, `${label}: round badge must stay inside the card`);
  assert.equal(metrics.overlapWidth * metrics.overlapHeight, 0, `${label}: actual glyph ink must not overlap the badge`);
  assert.ok(
    metrics.horizontalGap >= 4 || metrics.verticalGap >= 4,
    `${label}: glyph and badge need at least 4px separation on one axis`,
  );
  return metrics;
}

async function pageActionGeometry(label) {
  const geometry = await page.evaluate(() => {
    const rect = (selector) => {
      const box = document.querySelector(selector).getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
    };
    const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const inside = (child, parent) => child.left >= parent.left && child.right <= parent.right &&
      child.top >= parent.top && child.bottom <= parent.bottom;
    const topbar = rect(".topbar");
    const brand = rect(".brand");
    const tabs = rect(".module-tabs");
    const bomb = rect("#bombGameEntry");
    const map = rect(".map-visual");
    const group = rect(".map-actions");
    const reset = rect("#resetProgress");
    const star = rect(".star-counter");
    const next = rect("#nextBatch");
    const overlay = rect(".map-overlay");
    return {
      topbar, brand, tabs, bomb, map, group, reset, star, next, overlay,
      bombInsideHeader: inside(bomb, topbar),
      bombTabsOverlap: overlaps(bomb, tabs),
      bombBrandOverlap: overlaps(bomb, brand),
      groupInsideMap: inside(group, map),
      resetInsideMap: inside(reset, map),
      starOverlap: overlaps(group, star),
      nextOverlap: overlaps(group, next),
      overlayOverlap: overlaps(group, overlay),
    };
  });
  assert.equal(geometry.bombInsideHeader, true, `${label}: bomb entry must stay inside the header`);
  assert.equal(geometry.bombTabsOverlap, false, `${label}: header bomb entry must not cover module tabs`);
  assert.equal(geometry.bombBrandOverlap, false, `${label}: header bomb entry must not cover title or version`);
  assert.equal(geometry.groupInsideMap, true, `${label}: action group must stay inside map background`);
  assert.equal(geometry.resetInsideMap, true, `${label}: reset button must stay inside map background`);
  assert.equal(geometry.starOverlap, false, `${label}: reset must not cover star counter`);
  assert.equal(geometry.nextOverlap, false, `${label}: reset must not cover next-batch control`);
  assert.equal(geometry.overlayOverlap, false, `${label}: reset must not cover kingdom/level controls`);
  return geometry;
}

await resetTestKey();
assert.equal(await page.locator("#bootError").isHidden(), true);
assert.equal(await page.locator("#appVersionLabel").isVisible(), true);
assert.equal(await page.locator("#appVersionLabel").textContent(), "v1.0.0");
const packageVersion = await page.evaluate(() => fetch("./package.json").then((response) => response.json()).then((metadata) => metadata.version));
assert.equal(packageVersion, "1.0.0");
assert.equal(await page.locator("#appVersionLabel").textContent(), `v${packageVersion}`);
assert.equal(await page.locator(".hp-counter, #hpIcons, #repairHint").count(), 0);
assert.equal(await page.locator(".star-counter").isVisible(), true);
assert.equal(await page.locator("#starCount").isVisible(), true);
assert.equal(await page.locator("text=Book").count(), 0);
assert.equal(await page.locator("#exportProgress").count(), 0);
assert.equal(await page.locator("#importProgress").count(), 0);
assert.equal(await page.locator("#importProgressFile").count(), 0);
assert.equal(await page.locator("#resetProgress").isVisible(), true);
assert.equal(await page.locator(".module-tabs #bombGameEntry, .module-tabs a[href=\"./bomb-game.html?v=1.0\"]").count(), 0);
assert.deepEqual(await page.locator(".module-tabs .module-tab").allTextContents(), ["汉字", "主题学习", "音标"]);
assert.equal(await page.locator(".topbar .top-actions #bombGameEntry").isVisible(), true);
assert.equal(await page.locator(".topbar #resetProgress").count(), 0);
const bombEntry = page.locator(".topbar .top-actions #bombGameEntry");
assert.equal(await bombEntry.isVisible(), true);
assert.equal(await bombEntry.getAttribute("href"), "./bomb-game.html?v=1.0");
assert.equal(await bombEntry.evaluate((node) => node.tagName === "A" && node.tabIndex === 0), true);
assert.equal(await page.locator(".map-visual .map-actions #resetProgress").isVisible(), true);
assert.equal(await page.locator(".map-visual #bombGameEntry").count(), 0);
assert.equal(await page.locator(".map-actions").getAttribute("aria-label"), "汉字页操作");
const desktopPageActions = await pageActionGeometry("desktop");
const desktopIdleCard = await currentCharMetrics("placeholder", "开始");
assert.equal(await page.locator("#reviewRoundBadge").isHidden(), true);
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
for (const selector of ["#startDaily", "#startReview"]) {
  assert.equal(await page.locator(selector).isVisible(), true, `${selector} should be visible while idle`);
}
for (const selector of ["#speakCurrent", "#markCorrect", "#markWrong", "#markMastered"]) {
  assert.equal(await page.locator(selector).isVisible(), false, `${selector} should be hidden while idle`);
}

// Real-page pinyin rendering: 地 has one visible | separator; a single-reading word has none.
await page.click("#startDaily");
await revealSpecificWord("地");
const desktopCharacterCard = await currentCharMetrics("character", "地");
assert.equal(desktopCharacterCard.fontSize, 170, "active desktop Hanzi size must remain unchanged");
const desktopGlyphBadge = await glyphBadgeMetrics("desktop 地");
assert.equal(await page.locator("#reviewRoundBadge").isVisible(), true);
const diReadings = await page.locator("#pinyinLine .pinyin-compact").allTextContents();
assert.deepEqual(diReadings.map((text) => text.replace(/\s+/g, "")), ["dì", "de"]);
assert.equal(await page.locator("#pinyinLine .reading-divider").count(), 1);
assert.equal(await page.locator("#pinyinLine .reading-divider").textContent(), "|");
assert.equal((await page.locator("#pinyinLine .pinyin-readings").textContent()).includes("/"), false);
assert.equal(await page.locator("#pinyinLine .pinyin-readings").getAttribute("aria-label"), "拼音 dì | de");
const desktopPinyinSize = await page.locator("#pinyinLine .pinyin-compact").first().evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
const desktopDividerSize = await page.locator("#pinyinLine .reading-divider").evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
assert.ok(Math.abs(desktopPinyinSize - 172.8) < 0.01, `desktop pinyin should be 2x 86.4px, got ${desktopPinyinSize}px`);
assert.ok(Math.abs(desktopDividerSize - 115.2) < 0.01, `desktop divider should be 2x 57.6px, got ${desktopDividerSize}px`);

await revealSpecificWord("天");
assert.deepEqual(
  (await page.locator("#pinyinLine .pinyin-compact").allTextContents()).map((text) => text.replace(/\s+/g, "")),
  ["tiān"],
);
assert.equal(await page.locator("#pinyinLine .reading-divider").count(), 0);
assert.equal((await page.locator("#pinyinLine .pinyin-readings").textContent()).includes("|"), false);
assert.equal((await page.locator("#pinyinLine .pinyin-readings").textContent()).includes("/"), false);
await resetTestKey();

// An empty review attempt stays in idle so both task choices remain available.
await page.click("#startReview");
assert.equal((await state()).dailyPhase, "idle");
assert.equal((await state()).activeWordId, null);
for (const selector of ["#startDaily", "#startReview"]) {
  assert.equal(await page.locator(selector).isVisible(), true, `${selector} should remain visible when no review is due`);
}

// Space reveals pinyin, but an editable control keeps the native Space behavior.
await page.click("#startDaily");
for (const selector of ["#startDaily", "#startReview"]) {
  assert.equal(await page.locator(selector).isVisible(), false, `${selector} should hide after starting today's task`);
}
for (const selector of ["#speakCurrent", "#markCorrect", "#markWrong", "#markMastered"]) {
  assert.equal(await page.locator(selector).isVisible(), true, `${selector} should be visible with an active word`);
}
assert.equal(await page.locator("#pinyinLine .pinyin-readings").count(), 0);
await page.keyboard.press("Space");
assert.ok(await page.locator("#pinyinLine .pinyin-readings").count());
await page.click("#markWrong");
assert.equal(await page.locator("#pinyinLine .pinyin-readings").count(), 0);
const editableResult = await page.evaluate(() => {
  const input = document.createElement("input");
  document.body.append(input);
  input.focus();
  const event = new KeyboardEvent("keydown", { code: "Space", key: " ", bubbles: true, cancelable: true });
  input.dispatchEvent(event);
  const prevented = event.defaultPrevented;
  input.remove();
  return prevented;
});
assert.equal(editableResult, false);

// Refresh restores the phase, fixed daily IDs, and current valid character.
await page.click("#markWrong");
await page.click("#markWrong");
await page.click("#markCorrect");
const beforeRefresh = await state();
await page.reload();
const afterRefresh = await state();
assert.equal(afterRefresh.dailyPhase, beforeRefresh.dailyPhase);
for (const selector of ["#startDaily", "#startReview"]) {
  assert.equal(await page.locator(selector).isVisible(), false, `${selector} should stay hidden after restoring an active task`);
}
assert.deepEqual(afterRefresh.dailyNewIds, beforeRefresh.dailyNewIds);
assert.equal(afterRefresh.activeWordId, beforeRefresh.activeWordId);

// List inline review restores the interrupted word.
const interruptedId = afterRefresh.activeWordId;
const inlineButton = page.locator(`#todayNewList [data-inline-id]:not([data-inline-id="${interruptedId}"])`).first();
assert.ok(await inlineButton.count());
await inlineButton.click();
assert.notEqual((await state()).activeWordId, interruptedId);
await page.click("#markCorrect");
assert.equal((await state()).activeWordId, interruptedId);

// Complete the full daily-new route: each word 3 times, explicit finish, then 1 mixed pass.
for (let guard = 0; guard < 20; guard += 1) {
  const current = await state();
  if (current.dailyNewIds.every((id) => (current.dailyNewCorrectCounts[id] || 0) >= 3 || current.masteredIds.includes(id))) break;
  await page.click("#markCorrect");
}
assert.equal(await page.locator("#finishNewWords").isVisible(), true);
await page.click("#finishNewWords");
for (let guard = 0; guard < 10 && !(await state()).dailyTaskDone; guard += 1) await page.click("#markCorrect");
assert.equal((await state()).dailyTaskDone, true);
const desktopCompleteCard = await currentCharMetrics("placeholder", "完成");
assert.equal(desktopCompleteCard.fontSize, desktopIdleCard.fontSize);
for (const selector of ["#startDaily", "#startReview"]) {
  assert.equal(await page.locator(selector).isVisible(), true, `${selector} should return after task completion`);
}
for (const selector of ["#speakCurrent", "#markCorrect", "#markWrong", "#markMastered"]) {
  assert.equal(await page.locator(selector).isVisible(), false, `${selector} should be hidden after task completion`);
}

// Prepare due records in the isolated key, then exercise fixed-20 review, wrong repair, and star.
await page.evaluate(() => {
  const key = window.__HANZI_APP__.getStorageKey();
  const base = window.__HANZI_APP__.getState();
  Object.assign(base, {
    hp: 3, stars: 0, rewardCount: 0, reviewRound: 0, todayDate: "2026-08-18",
    dailyNewIds: [], dailyNewCorrectCounts: {}, dailyMixedDoneIds: [],
    dailyReviewIds: [], dailyReviewDate: "", dailyReviewDoneIds: [],
    reviewWrongIds: [], reviewWrongCorrectCounts: {}, dailyPhase: "idle",
    dailyTaskStarted: false, dailyTaskDone: false, activeWordId: null, inlineReviewContext: null,
  });
  base.records = {};
  base.masteredIds = [];
  base.recentWrongIds = [];
  for (let index = 1; index <= 25; index += 1) {
    const id = String(index).padStart(4, "0");
    base.records[id] = { status: "known", correctCount: 3, errorCount: 0, streak: 3, nextReviewRound: 1, reviewStage: 1 };
  }
  localStorage.setItem(key, JSON.stringify(base));
});
await page.reload();
await page.click("#startReview");
const reviewBatch = (await state()).dailyReviewIds;
assert.equal(reviewBatch.length, 20);
assert.equal((await state()).reviewRound, 1);
for (const selector of ["#startDaily", "#startReview"]) {
  assert.equal(await page.locator(selector).isVisible(), false, `${selector} should hide during review`);
}
await page.evaluate(() => window.__HANZI_APP__.dispatch("startReview"));
assert.deepEqual((await state()).dailyReviewIds, reviewBatch);
assert.equal((await state()).reviewRound, 1);

const wrongId = (await state()).activeWordId;
const hpBeforeWrong = (await state()).hp;
await page.click("#markWrong");
const wrongState = await state();
assert.ok(wrongState.reviewWrongIds.includes(wrongId));
assert.equal(wrongState.hp, hpBeforeWrong - 1);
assert.notEqual(wrongState.activeWordId, wrongId);
for (let index = 0; index < 3; index += 1) {
  await page.locator(`#reviewWrongList [data-inline-id="${wrongId}"]`).click();
  await page.click("#markCorrect");
}
assert.equal((await state()).reviewWrongCorrectCounts[wrongId], 3);

const starTarget = (await state()).activeWordId;
await page.click("#markMastered");
const starState = await state();
assert.equal(starState.stars, 1);
assert.ok(starState.masteredIds.includes(starTarget));
assert.ok(!starState.dailyReviewIds.includes(starTarget));

// TTS does not judge or mutate state.
const beforeSpeech = JSON.stringify(await state());
await page.click("#speakCurrent");
assert.equal(JSON.stringify(await state()), beforeSpeech);

// Two-step reset affects only the isolated new key.
let dialogs = 0;
page.on("dialog", async (dialog) => { dialogs += 1; await dialog.accept(); });
await page.click("#resetProgress");
await page.waitForFunction(() => window.__HANZI_APP__.getState().stars === 0);
assert.equal(dialogs, 2);
for (const selector of ["#startDaily", "#startReview"]) {
  assert.equal(await page.locator(selector).isVisible(), true, `${selector} should return after reset`);
}
for (const selector of ["#speakCurrent", "#markCorrect", "#markWrong", "#markMastered"]) {
  assert.equal(await page.locator(selector).isVisible(), false, `${selector} should be hidden after reset`);
}
await page.screenshot({ path: "tests/browser-desktop.png", fullPage: true });

// 390px acceptance: no horizontal overflow and idle controls use the intended layout.
await page.setViewportSize({ width: 390, height: 844 });
await page.reload();
assert.equal(await page.locator("#appVersionLabel").isVisible(), true);
assert.equal(await page.locator("#appVersionLabel").textContent(), "v1.0.0");
assert.equal(await page.locator(".hp-counter, #hpIcons, #repairHint").count(), 0);
assert.equal(await page.locator(".star-counter").isVisible(), true);
assert.equal(await page.locator("#starCount").isVisible(), true);
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
assert.equal(await page.locator(".module-tabs #bombGameEntry, .module-tabs a[href=\"./bomb-game.html?v=1.0\"]").count(), 0);
assert.equal(await page.locator(".topbar .top-actions #bombGameEntry").isVisible(), true);
assert.equal(await page.locator(".topbar #resetProgress").count(), 0);
assert.equal(await page.locator(".map-visual #bombGameEntry").count(), 0);
assert.equal(await page.locator(".map-visual .map-actions #resetProgress").isVisible(), true);
const mobilePageActions = await pageActionGeometry("390px");
const mobileIdleCard = await currentCharMetrics("placeholder", "开始");
assert.equal(await page.locator("#reviewRoundBadge").isHidden(), true);
for (const selector of ["#startDaily", "#startReview", "#resetProgress"]) {
  assert.equal(await page.locator(selector).isVisible(), true, `${selector} should be visible at 390px`);
}
for (const selector of ["#speakCurrent", "#markCorrect", "#markWrong", "#markMastered"]) {
  assert.equal(await page.locator(selector).isVisible(), false, `${selector} should not occupy idle layout at 390px`);
}

// The real 地 example remains fully visible at 390px with the exact doubled mobile sizes.
await page.click("#startDaily");
await revealSpecificWord("地");
const mobileCharacterCard = await currentCharMetrics("character", "地");
assert.ok(Math.abs(mobileCharacterCard.fontSize - 136.5) < 0.01, "active 390px Hanzi size must remain unchanged");
const mobileGlyphBadge = await glyphBadgeMetrics("390px 地");
assert.equal(await page.locator("#reviewRoundBadge").isVisible(), true);
assert.equal(await page.locator("#reviewRoundBadge").evaluate((badge) => {
  const top = document.elementFromPoint(badge.getBoundingClientRect().left + badge.offsetWidth / 2, badge.getBoundingClientRect().top + badge.offsetHeight / 2);
  return top === badge || badge.contains(top);
}), true);
assert.equal(await page.locator("#pinyinLine .reading-divider").textContent(), "|");
const mobilePinyinSize = await page.locator("#pinyinLine .pinyin-compact").first().evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
const mobileDividerSize = await page.locator("#pinyinLine .reading-divider").evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
assert.ok(Math.abs(mobilePinyinSize - 85.8) < 0.01, `390px pinyin should be 2x 42.9px, got ${mobilePinyinSize}px`);
assert.equal(mobileDividerSize, 56, `390px divider should be 2x 28px, got ${mobileDividerSize}px`);
assert.equal(await page.evaluate(() => {
  const line = document.querySelector("#pinyinLine").getBoundingClientRect();
  return [...document.querySelectorAll("#pinyinLine .pinyin-compact, #pinyinLine .reading-divider")].every((node) => {
    const box = node.getBoundingClientRect();
    return box.left >= line.left - 0.5 && box.right <= line.right + 0.5;
  });
}), true);
assert.equal(await page.evaluate(() => {
  const badge = document.querySelector("#reviewRoundBadge").getBoundingClientRect();
  const pinyin = document.querySelector("#pinyinLine").getBoundingClientRect();
  const controls = document.querySelector(".voice-row").getBoundingClientRect();
  const overlapsBadge = badge.left < pinyin.right && badge.right > pinyin.left && badge.top < pinyin.bottom && badge.bottom > pinyin.top;
  const overlapsControls = pinyin.bottom > controls.top + 0.5;
  return !overlapsBadge && !overlapsControls;
}), true);
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
await page.screenshot({ path: "tests/browser-390.png", fullPage: true });

assert.deepEqual(pageErrors, []);
console.log(JSON.stringify({
  ok: true,
  desktopOverflow: false,
  mobileWidth: 390,
  mobileOverflow: false,
  dailyRoute: "complete",
  reviewBatch: reviewBatch.length,
  inlineRestore: true,
  ttsStateUnchanged: true,
  idleAnswerControlsHidden: true,
  taskChoiceVisibility: true,
  displayedVersion: "1.0.0",
  desktopIdleCard: `${desktopIdleCard.buttonWidth}x${desktopIdleCard.buttonHeight} @ ${desktopIdleCard.fontSize}px`,
  desktopCharacterPx: desktopCharacterCard.fontSize,
  desktopCompletePx: desktopCompleteCard.fontSize,
  mobileIdleCard: `${mobileIdleCard.buttonWidth}x${mobileIdleCard.buttonHeight} @ ${mobileIdleCard.fontSize}px`,
  mobileCharacterPx: mobileCharacterCard.fontSize,
  glyphBadgeGeometry: {
    desktopHorizontalGap: desktopGlyphBadge.horizontalGap,
    desktopVerticalGap: desktopGlyphBadge.verticalGap,
    mobileHorizontalGap: mobileGlyphBadge.horizontalGap,
    mobileVerticalGap: mobileGlyphBadge.verticalGap,
  },
  moduleTabs: ["汉字", "主题学习", "音标"],
  headerActions: ["炸弹迷宫"],
  mapActions: ["重置汉字状态"],
  bombEntryPlacement: "header",
  pageActionGeometry: {
    desktopBomb: `${desktopPageActions.bomb.width}x${desktopPageActions.bomb.height}`,
    desktopReset: `${desktopPageActions.reset.width}x${desktopPageActions.reset.height}`,
    mobileBomb: `${mobilePageActions.bomb.width}x${mobilePageActions.bomb.height}`,
    mobileReset: `${mobilePageActions.reset.width}x${mobilePageActions.reset.height}`,
  },
  resetDialogs: dialogs,
  pinyinSeparator: "|",
  desktopPinyinPx: desktopPinyinSize,
  mobilePinyinPx: mobilePinyinSize,
  singleReadingSeparatorCount: 0,
}, null, 2));

await context.close();
await browser.close();
