import assert from "node:assert/strict";
import { chromium } from "file:///C:/Users/St/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";

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
assert.equal(await page.locator(".scenario-card").count(), 1);
assert.equal(await page.locator(".scenario-card.is-complete").count(), 0);
assert.equal(await noOverflow(page), true);

await page.locator("[data-start-label]").click();
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
await page.locator("[data-start-label]").click();
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
await page.locator("[data-start-label]").click();
assert.equal(await page.locator("#practiceProgress").textContent(), "2/3", "refresh restores practice question");
await page.locator('[data-answer-id="leo-nice"]').click();
await page.waitForTimeout(360);
await page.locator('[data-answer-id="leo-fine"]').click();
await page.waitForTimeout(360);
assert.equal(await page.locator("#practiceResult").isVisible(), true);
assert.equal(await page.locator("#practiceResultScore").textContent(), "3/3");
await page.locator("#returnAfterComplete").click();
assert.equal(await page.locator(".scenario-card.is-complete").count(), 1);
assert.equal(await page.locator("[data-complete-badge]").isVisible(), true);
await page.reload();
assert.equal(await page.locator(".scenario-card.is-complete").count(), 1, "completion persists");
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
await mobile.locator("[data-start-label]").tap();
await mobile.locator('#nextLine').tap();
assert.equal(await mobile.locator("#dialogueEnglish").textContent(), "Hi, Mia. I'm Leo.");
await mobile.locator("#speakDialogue").tap();
await mobile.waitForFunction(() => window.__spoken.length >= 1);
assert.deepEqual(await mobile.evaluate(() => window.__spoken.at(-1)), { text: "Hi, Mia. I'm Leo.", lang: "en-GB" });
assert.equal(await noOverflow(mobile), true);
await mobile.screenshot({ path: "tests/scenario-390.png", fullPage: true });

assert.deepEqual(errors, []);
assert.deepEqual(failedResponses, []);
console.log(JSON.stringify({ ok: true, scenarios: 1, lines: 6, practiceQuestions: 3, desktopOverflow: false, mobileOverflow: false, storage: "isolated" }, null, 2));
await browser.close();
