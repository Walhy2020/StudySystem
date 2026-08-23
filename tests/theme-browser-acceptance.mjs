import assert from "node:assert/strict";
import { chromium } from "file:///C:/Users/St/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

const baseUrl = process.env.HANZI_BASE_URL || "http://127.0.0.1:53177/";
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const pageErrors = [];
const failedResponses = [];
const protectedKeys = [
  "mario-hanzi-refactor-v1",
  "mario-literacy-desktop-mvp-v1",
  "mario-bomb-game-progress-v1",
  "mario-bomb-game-v1",
  "mario-phonetics-v1",
  "mario-theme-learning-v1"
];

async function prepareContext(options) {
  const context = await browser.newContext(options);
  await context.addInitScript(() => {
    window.__storageMutations = [];
    window.__spoken = [];
    const originalSet = Storage.prototype.setItem;
    const originalRemove = Storage.prototype.removeItem;
    Storage.prototype.setItem = function(key, value) { window.__storageMutations.push({ operation: "set", key }); return originalSet.call(this, key, value); };
    Storage.prototype.removeItem = function(key) { window.__storageMutations.push({ operation: "remove", key }); return originalRemove.call(this, key); };
    class FakeUtterance { constructor(text) { this.text = text; } }
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: FakeUtterance });
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { cancel() {}, getVoices() { return []; }, addEventListener() {}, removeEventListener() {}, speak(item) { window.__spoken.push(item.text); } } });
  });
  return context;
}

function watchPage(page) {
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("response", (response) => { if (response.status() >= 400) failedResponses.push(response.status() + " " + response.url()); });
}

async function assertNoOverflow(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
}

async function assertGeometry(page, themeId, ids, figureId) {
  const geometry = await page.evaluate(({ themeId, ids, figureId }) => {
    const svg = document.querySelector(figureId).getBoundingClientRect();
    return ids.map((id) => {
      const node = document.querySelector('[data-theme="' + themeId + '"] [data-target="' + id + '"]');
      const box = node.getBoundingClientRect();
      const points = [
        [box.left + box.width / 2, box.top + box.height / 2],
        [box.left + box.width * 0.35, box.top + box.height * 0.45],
        [box.left + box.width * 0.65, box.top + box.height * 0.45]
      ];
      const hit = points.some(([x, y]) => {
        const element = document.elementFromPoint(x, y);
        return element === node || node.contains(element);
      });
      return {
        id,
        visible: box.width >= 36 && box.height >= 36,
        inside: box.left >= svg.left - 1 && box.top >= svg.top - 1 && box.right <= svg.right + 1 && box.bottom <= svg.bottom + 1,
        hit
      };
    });
  }, { themeId, ids, figureId });
  assert.ok(geometry.every((item) => item.visible && item.inside && item.hit), JSON.stringify(geometry));
}

async function learnAll(page, themeId, expected, action = "click") {
  for (const [id, values] of Object.entries(expected)) {
    const locator = page.locator('[data-theme="' + themeId + '"] [data-target="' + id + '"]');
    if (action === "tap") await locator.tap(); else await locator.click();
    assert.equal((await page.locator(".word-en").textContent()).trim(), values[0]);
    assert.equal((await page.locator(".phonetic").textContent()).trim(), values[1]);
    assert.equal((await page.locator(".translation").textContent()).trim(), values[2]);
    assert.equal((await page.locator(".sentence").textContent()).trim(), values[3]);
  }
  assert.equal((await page.locator("#sessionProgress").textContent()).trim(), "已认识 6/6");
}

async function finishRound(page, themeId, ids, action = "click") {
  const seenQuestions = [];
  const firstTarget = await page.evaluate(() => window.__THEME_LEARNING__.session.target().id);
  const wrongTarget = ids.find((id) => id !== firstTarget);
  const wrongLocator = page.locator('[data-theme="' + themeId + '"] [data-target="' + wrongTarget + '"]');
  if (action === "tap") await wrongLocator.tap(); else await wrongLocator.click();
  assert.match((await page.locator("#practiceFeedback").textContent()).trim(), /再试一次/);
  assert.equal(await page.evaluate(() => window.__THEME_LEARNING__.session.questionIndex), 0);
  for (let count = 0; count < 6; count += 1) {
    const target = await page.evaluate(() => window.__THEME_LEARNING__.session.target().id);
    seenQuestions.push(target);
    const targetLocator = page.locator('[data-theme="' + themeId + '"] [data-target="' + target + '"]');
    if (action === "tap") await targetLocator.tap(); else await targetLocator.click();
    assert.match((await page.locator("#practiceFeedback").textContent()).trim(), /答对了/);
    await page.waitForTimeout(930);
  }
  assert.equal(new Set(seenQuestions).size, 6);
  assert.equal(await page.locator("#resultPanel").isVisible(), true);
  assert.equal((await page.locator("#resultScore").textContent()).trim(), "6/6");
}

const bodyIds = ["head", "hand", "arm", "leg", "foot", "body"];
const colorIds = ["red", "blue", "green", "yellow", "black", "white"];
const bodyExpected = {
  head: ["head", "/hed/", "头", "This is Mario's head."],
  hand: ["hand", "/hænd/", "手", "This is Mario's hand."],
  arm: ["arm", "/ɑːm/", "手臂", "This is Mario's arm."],
  leg: ["leg", "/leɡ/", "腿", "This is Mario's leg."],
  foot: ["foot", "/fʊt/", "脚", "This is Mario's foot."],
  body: ["body", "/ˈbɒdi/", "身体", "This is Mario's body."]
};
const colorExpected = {
  red: ["red", "/red/", "红色", "The cap is red."],
  blue: ["blue", "/bluː/", "蓝色", "The block is blue."],
  green: ["green", "/ɡriːn/", "绿色", "The pipe is green."],
  yellow: ["yellow", "/ˈjeləʊ/", "黄色", "The coin is yellow."],
  black: ["black", "/blæk/", "黑色", "The bomb is black."],
  white: ["white", "/waɪt/", "白色", "The cloud is white."]
};

const desktopContext = await prepareContext({ viewport: { width: 1440, height: 1000 } });
const page = await desktopContext.newPage();
watchPage(page);
await page.goto(baseUrl);
assert.ok((await page.locator(".module-tab").allTextContents()).some((item) => item.trim() === "主题学习"));
assert.deepEqual(await page.locator(".top-actions > *").allTextContents().then((x) => x.map((v) => v.trim())), ["炸弹迷宫"]);
await page.locator('.module-tab[href="./theme-learning.html"]').click();
await page.waitForURL(/theme-learning\.html/);
assert.deepEqual(await page.locator(".theme-card h3").allTextContents().then((items) => items.map((x) => x.replace(/\s+/g, " ").trim())), ["身体 Body", "颜色 Colors"]);
await assertNoOverflow(page);

await page.click("#startTheme");
assert.equal(await page.evaluate(() => window.__THEME_LEARNING__.activeThemeId), "body");
assert.equal(await page.locator("#learnPanel").isVisible(), true);
assert.equal(await page.locator("#practicePanel").isVisible(), false);
await assertGeometry(page, "body", bodyIds, "#marioFigure");
await learnAll(page, "body", bodyExpected);
await page.locator('[data-theme="body"] [data-target="head"]').focus();
await page.keyboard.press("Enter");
assert.equal((await page.locator(".word-en").textContent()).trim(), "head");
await page.locator('[data-theme="body"] [data-target="hand"]').focus();
await page.keyboard.press("Space");
assert.equal((await page.locator(".word-en").textContent()).trim(), "hand");
await page.screenshot({ path: "tests/theme-body-desktop.png", fullPage: true });
await page.click("#practiceStage");
await finishRound(page, "body", bodyIds);
await page.click("#restartRound");
assert.equal(new Set(await page.evaluate(() => window.__THEME_LEARNING__.session.questions)).size, 6);

await page.click("#backToThemes");
assert.equal(await page.locator("#themePicker").isVisible(), true);
await page.click("#startColors");
assert.equal(await page.evaluate(() => window.__THEME_LEARNING__.activeThemeId), "colors");
assert.equal((await page.locator("#sessionProgress").textContent()).trim(), "已认识 0/6");
await assertGeometry(page, "colors", colorIds, "#colorsFigure");
await learnAll(page, "colors", colorExpected);
for (const [key, instruction] of Object.entries({ red: "red cap 红色帽子", blue: "blue block 蓝色方块", green: "green pipe 绿色水管", yellow: "yellow coin 黄色金币", black: "black bomb 黑色炸弹", white: "white cloud 白色云朵" })) {
  assert.equal(await page.locator('[data-theme="colors"] [data-target="' + key + '"]').getAttribute("aria-label"), instruction);
}
await page.locator('[data-theme="colors"] [data-target="red"]').focus();
await page.keyboard.press("Enter");
assert.equal((await page.locator(".word-en").textContent()).trim(), "red");
await page.locator('[data-theme="colors"] [data-target="blue"]').focus();
await page.keyboard.press("Space");
assert.equal((await page.locator(".word-en").textContent()).trim(), "blue");
await page.evaluate(() => { window.speechSynthesis.speak = () => { throw new Error("tts blocked"); }; });
await page.locator('[data-theme="colors"] [data-target="white"]').click();
assert.equal(await page.locator("#ttsNotice").isVisible(), true);
assert.equal((await page.locator(".word-en").textContent()).trim(), "white");
await page.screenshot({ path: "tests/theme-colors-desktop.png", fullPage: true });
await page.evaluate(() => { window.speechSynthesis.speak = (item) => window.__spoken.push(item.text); });
await page.click("#practiceStage");
assert.match((await page.locator("#practiceInstruction").textContent()).trim(), /^Touch the (red cap|blue block|green pipe|yellow coin|black bomb|white cloud)\.$/);
await finishRound(page, "colors", colorIds);
assert.equal((await page.locator("#resultTitle").textContent()).trim(), "六种颜色全部找对！");
await page.click("#restartRound");
assert.equal(new Set(await page.evaluate(() => window.__THEME_LEARNING__.session.questions)).size, 6);

await page.click("#backToThemes");
await page.click("#startTheme");
assert.equal((await page.locator("#sessionProgress").textContent()).trim(), "已认识 0/6");
await page.click("#backToThemes");
await page.click("#startColors");
assert.equal((await page.locator("#sessionProgress").textContent()).trim(), "已认识 0/6");
assert.deepEqual(await page.evaluate((keys) => window.__storageMutations.filter((item) => keys.includes(item.key)), protectedKeys), []);
await page.locator('.nav-link[href="./index.html"]').click();
await page.waitForURL((url) => url.pathname.endsWith("/") || url.pathname.endsWith("/index.html"));
await desktopContext.close();

const mobileContext = await prepareContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const mobile = await mobileContext.newPage();
watchPage(mobile);
await mobile.goto(new URL("theme-learning.html", baseUrl).href);
await assertNoOverflow(mobile);
await mobile.tap("#startColors");
await assertNoOverflow(mobile);
await mobile.locator("#colorsFigure").scrollIntoViewIfNeeded();
await assertGeometry(mobile, "colors", colorIds, "#colorsFigure");
await learnAll(mobile, "colors", colorExpected, "tap");
await mobile.screenshot({ path: "tests/theme-colors-390.png", fullPage: true });
await mobile.tap("#practiceStage");
await finishRound(mobile, "colors", colorIds, "tap");
await mobile.tap("#backToThemes");
await mobile.tap("#startTheme");
await mobile.locator("#marioFigure").scrollIntoViewIfNeeded();
await assertGeometry(mobile, "body", bodyIds, "#marioFigure");
await learnAll(mobile, "body", bodyExpected, "tap");
await mobile.screenshot({ path: "tests/theme-body-390.png", fullPage: true });
await mobile.tap("#practiceStage");
await finishRound(mobile, "body", bodyIds, "tap");
assert.deepEqual(await mobile.evaluate((keys) => window.__storageMutations.filter((item) => keys.includes(item.key)), protectedKeys), []);
await mobileContext.close();

assert.deepEqual(pageErrors, []);
assert.deepEqual(failedResponses, []);
console.log(JSON.stringify({
  ok: true,
  themes: ["body", "colors"],
  words: 12,
  rounds: { desktop: 2, mobile390: 2, uniqueQuestionsEach: 6, wrongRetry: true, restart: true },
  ttsFallback: true,
  storageProtected: protectedKeys,
  overflow: { desktop: false, mobile390: false },
  hotAreasAligned: { desktop: 12, mobile390: 12 },
  input: ["mouse", "touch", "Enter", "Space"],
  screenshots: ["tests/theme-body-desktop.png", "tests/theme-colors-desktop.png", "tests/theme-body-390.png", "tests/theme-colors-390.png"]
}, null, 2));
await browser.close();
