import assert from "node:assert/strict";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const { chromium } = await import(pathToFileURL(join(homedir(), ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs")));

const baseUrl = process.env.HANZI_BASE_URL || "http://127.0.0.1:53177/";
const browser = await chromium.launch({ headless: true, executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const errors = [];
const failedResponses = [];

async function makeContext(viewport, hasTouch = false) {
  const context = await browser.newContext({ viewport, hasTouch });
  await context.addInitScript(() => {
    window.__spoken = [];
    window.__storageWrites = [];
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) { window.__storageWrites.push(key); return setItem.call(this, key, value); };
    class FakeUtterance { constructor(text) { this.text = text; } }
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: FakeUtterance });
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: {
      cancel() {}, speak(item) { window.__spoken.push({ text: item.text, lang: item.lang }); },
    } });
  });
  return context;
}

function watch(page) {
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => { if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`); });
}

async function noOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
}

const desktopContext = await makeContext({ width: 1440, height: 1000 });
const page = await desktopContext.newPage();
watch(page);
await page.goto(new URL("scenario-learning.html?test=scenario-desktop", baseUrl).href);
assert.deepEqual(await page.locator(".scenario-nav > *").allTextContents(), ["汉字", "Book1", "主题学习", "情景模式", "总复习", "音标"]);
assert.equal(await page.locator(".scenario-card").count(), 2);
assert.equal(await page.locator(".scenario-card.is-complete").count(), 0);
assert.equal(await noOverflow(page), true);

await page.locator('[data-scenario-id="first-meeting"] [data-start-label]').click();
assert.equal(await page.locator(".chat-bubble").count(), 1);
assert.equal(await page.locator("#practicePanel").isHidden(), true);
assert.equal(await page.locator("#practiceResult").isHidden(), true);
assert.equal(await page.locator("#dialogueEnglish").textContent(), "Hello! My name is Mia.");
assert.equal(await page.evaluate(() => window.__spoken.length), 0, "dialogue must not autoplay");
await page.locator("#speakDialogue").click();
await page.waitForFunction(() => window.__spoken.length === 1);
assert.deepEqual(await page.evaluate(() => window.__spoken.at(-1)), { text: "Hello! My name is Mia.", lang: "en-GB" });
await page.locator("#nextLine").focus();
await page.keyboard.press("Enter");
assert.equal(await page.locator("#dialogueEnglish").textContent(), "Hi, Mia. I'm Leo.");
await page.locator("#previousLine").focus();
await page.keyboard.press("Space");
assert.equal(await page.locator("#dialogueEnglish").textContent(), "Hello! My name is Mia.");
for (let i = 0; i < 4; i++) await page.locator('#nextLine').click();
assert.equal(await page.locator("#dialogueEnglish").textContent(), "How are you?");
await page.reload();
await page.locator('[data-scenario-id="first-meeting"] [data-start-label]').click();
assert.equal(await page.locator("#dialogueEnglish").textContent(), "How are you?", "refresh restores current line");

await page.locator("#practiceStage").click();
assert.equal(await page.locator(".response-option").count(), 3);
assert.equal(await page.locator("#practicePrompt").textContent(), "Hello! My name is Mia.");
await page.locator('[data-answer-id="leo-nice"]').click();
assert.match(await page.locator("#practiceFeedback").textContent(), /再想一想/);
assert.equal(await page.locator("#practiceProgress").textContent(), "1/3");
const spokenBeforeAnswer = await page.evaluate(() => window.__spoken.length);
await page.locator('[data-answer-id="leo-intro"]').click();
await page.waitForTimeout(360);
assert.equal(await page.evaluate(() => window.__spoken.length), spokenBeforeAnswer, "correct answers must not autoplay");
await page.waitForTimeout(360);
assert.equal(await page.locator("#practiceProgress").textContent(), "2/3");
await page.reload();
await page.locator('[data-scenario-id="first-meeting"] [data-start-label]').click();
assert.equal(await page.locator("#practiceProgress").textContent(), "2/3", "refresh restores practice question");
await page.locator('[data-answer-id="leo-nice"]').click();
await page.waitForTimeout(360);
await page.locator('[data-answer-id="leo-fine"]').click();
await page.waitForTimeout(360);
assert.equal(await page.locator("#practiceResult").isVisible(), true);
assert.equal(await page.locator("#practiceResultScore").textContent(), "3/3");
await page.locator("#returnAfterComplete").click();
assert.equal(await page.locator(".scenario-card.is-complete").count(), 1);
assert.equal(await page.locator('[data-scenario-id="first-meeting"] [data-complete-badge]').isVisible(), true);
await page.reload();
assert.equal(await page.locator(".scenario-card.is-complete").count(), 1, "completion persists");

await page.locator('[data-scenario-id="what-is-it"] [data-start-label]').click();
assert.equal(await page.locator("#activeScenarioTitle").textContent(), "这是什么？ · What Is It?");
assert.equal(await page.locator("#dialogueEnglish").textContent(), "Look, Leo. What is it?");
assert.equal(await page.locator("#dialogueProgress").textContent(), "1/14");
assert.equal(await page.locator("#scenarioObjectImage").getAttribute("alt"), "一支蓝色笔");
assert.equal(await page.locator("#scenarioObjectFocus").isVisible(), true);
assert.equal(await page.locator("#dialogueAligned .aligned-word").count(), 5);
assert.deepEqual(await page.locator("#dialogueAligned .aligned-word").evaluateAll((words) => words.map((word) => [word.querySelector("strong").textContent, word.querySelector("small").textContent])), [
  ["Look,", "/lʊk/"], ["Leo.", "/ˈliːəʊ/"], ["What", "/wɒt/"], ["is", "/ɪz/"], ["it?", "/ɪt/"],
]);
await page.locator("#nextLine").click();
await page.locator("#nextLine").click();
assert.equal(await page.locator("#dialogueEnglish").textContent(), "Look! What are they?");
assert.equal(await page.locator("#scenarioObjectImage").getAttribute("alt"), "三支黄色铅笔");
await page.locator("#backToScenarios").click();
await page.locator('[data-scenario-id="first-meeting"] [data-start-label]').click();
assert.equal(await page.locator("#dialogueProgress").textContent(), "1/6", "completed first scenario restarts independently");
await page.locator("#backToScenarios").click();
await page.locator('[data-scenario-id="what-is-it"] [data-start-label]').click();
assert.equal(await page.locator("#dialogueProgress").textContent(), "3/14", "second scenario restores its own line");
await page.reload();
await page.locator('[data-scenario-id="what-is-it"] [data-start-label]').click();
assert.equal(await page.locator("#dialogueProgress").textContent(), "3/14", "second scenario line persists after refresh");
await page.locator("#practiceStage").click();
assert.equal(await page.locator("#practiceProgress").textContent(), "1/5");
assert.equal(await page.locator("#practiceAligned .aligned-word").count(), 5);
for (const answerId of ["classroom-pen", "classroom-pencils", "classroom-marker", "classroom-erasers", "classroom-green-correction"]) {
  await page.locator(`[data-answer-id="${answerId}"]`).click();
  await page.waitForTimeout(360);
}
assert.equal(await page.locator("#practiceResult").isVisible(), true);
assert.equal(await page.locator("#practiceResultTitle").textContent(), "这是什么？完成！");
assert.equal(await page.locator("#practiceResultScore").textContent(), "5/5");
assert.match(await page.locator("#practiceResultText").textContent(), /文具/);
await page.locator("#returnAfterComplete").click();
assert.equal(await page.locator(".scenario-card.is-complete").count(), 2);
const desktopWrites = await page.evaluate(() => window.__storageWrites);
assert.ok(desktopWrites.length > 0);
assert.ok(desktopWrites.every((key) => key === "mario-scenario-learning-v1:test:scenario-desktop"), JSON.stringify(desktopWrites));
await page.screenshot({ path: "tests/scenario-desktop.png", fullPage: true });

const mobileContext = await makeContext({ width: 390, height: 844 }, true);
const mobile = await mobileContext.newPage();
watch(mobile);
await mobile.goto(new URL("scenario-learning.html?test=scenario-mobile", baseUrl).href);
assert.equal(await mobile.locator(".scenario-nav > *").count(), 6);
assert.equal(await noOverflow(mobile), true);
await mobile.locator('[data-scenario-id="what-is-it"] [data-start-label]').tap();
await mobile.locator('#nextLine').tap();
assert.equal(await mobile.locator("#dialogueEnglish").textContent(), "It's a pen.");
assert.equal(await mobile.locator("#scenarioObjectImage").getAttribute("alt"), "一支蓝色笔");
await mobile.locator("#speakDialogue").tap();
await mobile.waitForFunction(() => window.__spoken.length >= 1);
assert.deepEqual(await mobile.evaluate(() => window.__spoken.at(-1)), { text: "It's a pen.", lang: "en-GB" });
const mobileObjectBreathing = await mobile.locator("#scenarioObjectFocus").evaluate((focus) => {
  const style = getComputedStyle(focus);
  return { animation: style.animationName, duration: style.animationDuration, iterations: style.animationIterationCount };
});
assert.deepEqual(mobileObjectBreathing, { animation: "object-focus-breathe", duration: "1s", iterations: "3" });
assert.equal(await noOverflow(mobile), true);
const mobileStage = await mobile.locator("#actorStage").evaluate((stage) => {
  const stageBox = stage.getBoundingClientRect();
  const mia = document.querySelector("#actorMia").getBoundingClientRect();
  const leo = document.querySelector("#actorLeo").getBoundingClientRect();
  return {
    background: getComputedStyle(stage).backgroundImage,
    centerGap: (leo.left - mia.right) / stageBox.width,
  };
});
assert.match(mobileStage.background, /what-is-it-classroom-v1\.png/);
assert.ok(mobileStage.centerGap >= 0.35, JSON.stringify(mobileStage));
await mobile.screenshot({ path: "tests/scenario-390.png", fullPage: true });

const focusContext = await makeContext({ width: 1440, height: 1000 });
const focusPage = await focusContext.newPage();
watch(focusPage);
await focusPage.goto(new URL("scenario-learning.html?test=scenario-focus-objects", baseUrl).href);
await focusPage.locator('[data-scenario-id="what-is-it"] [data-start-label]').click();
await focusPage.locator("#speakDialogue").click();
await focusPage.waitForFunction(() => document.querySelector("#scenarioObjectFocus").classList.contains("is-breathing"));
const objectBreathing = await focusPage.locator("#scenarioObjectFocus").evaluate((focus) => {
  const animation = focus.getAnimations().find((item) => item.animationName === "object-focus-breathe");
  animation.pause();
  animation.currentTime = 0;
  const smallWidth = focus.getBoundingClientRect().width;
  animation.currentTime = 500;
  const largeWidth = focus.getBoundingClientRect().width;
  const style = getComputedStyle(focus);
  const result = { smallWidth, largeWidth, duration: style.animationDuration, iterations: style.animationIterationCount, easing: style.animationTimingFunction };
  animation.play();
  return result;
});
assert.equal(objectBreathing.duration, "1s");
assert.equal(objectBreathing.iterations, "3");
assert.equal(objectBreathing.easing, "ease-in-out");
assert.ok(objectBreathing.largeWidth > objectBreathing.smallWidth * 1.1, JSON.stringify(objectBreathing));
const focusLabels = [
  "一支蓝色笔", "一支蓝色笔",
  "三支黄色铅笔", "三支黄色铅笔", "三支黄色铅笔",
  "一支红色马克笔", "一支红色马克笔", "一支红色马克笔",
  "三块绿色橡皮", "三块绿色橡皮", "三块绿色橡皮", "三块绿色橡皮", "三块绿色橡皮",
  "三块红色橡皮",
];
for (let index = 0; index < focusLabels.length; index += 1) {
  assert.equal(await focusPage.locator("#scenarioObjectImage").getAttribute("alt"), focusLabels[index]);
  await focusPage.locator("#scenarioObjectImage").evaluate((image) => image.decode());
  const focusGeometry = await focusPage.locator("#scenarioObjectFocus").evaluate((focus) => {
    const stage = document.querySelector("#actorStage").getBoundingClientRect();
    const box = focus.getBoundingClientRect();
    const image = focus.querySelector("img");
    return {
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      white: getComputedStyle(focus).backgroundColor === "rgb(255, 255, 255)",
      centered: Math.abs((box.left + box.width / 2) - (stage.left + stage.width / 2)) <= 2,
      onBlackboard: box.top >= stage.top && box.bottom <= stage.top + stage.height * 0.42,
    };
  });
  assert.ok(focusGeometry.naturalWidth >= 512 && focusGeometry.naturalHeight >= 512, JSON.stringify(focusGeometry));
  assert.deepEqual({ white: focusGeometry.white, centered: focusGeometry.centered, onBlackboard: focusGeometry.onBlackboard }, { white: true, centered: true, onBlackboard: true });
  if (index === 12 || index === 13) {
    await focusPage.waitForTimeout(720);
    await focusPage.screenshot({ path: `tests/scenario-focus-${index + 1}.png`, fullPage: true });
  }
  if (index < focusLabels.length - 1) await focusPage.locator("#nextLine").click();
}
await focusContext.close();

assert.deepEqual(errors, []);
assert.deepEqual(failedResponses, []);
console.log(JSON.stringify({ ok: true, scenarios: 2, lines: 20, practiceQuestions: 8, desktopOverflow: false, mobileOverflow: false, storage: "isolated", classroomCenterClear: true, alignedIpa: true, focusedObjects: true, focusedObjectBreathing: "3 cycles" }, null, 2));
await browser.close();
