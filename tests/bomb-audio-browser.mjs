import assert from "node:assert/strict";
import { loadChromium } from "./playwright-runtime.mjs";

const chromium = await loadChromium();
const baseUrl = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const progressKey = "mario-bomb-game-progress-v1";
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, hasTouch: true });
await context.addInitScript(() => {
  window.__soundEvents = [];
  Object.defineProperty(window, "createBombSoundPlayer", {
    configurable: true,
    set(factory) {
      Object.defineProperty(window, "createBombSoundPlayer", {
        configurable: true,
        value: () => {
          const player = factory();
          return {
            ...player,
            play(effect) {
              const scheduled = player.play(effect);
              window.__soundEvents.push({ effect, scheduled });
              return scheduled;
            },
          };
        },
      });
    },
  });
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (response) => {
  if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
});

async function open() {
  await page.goto(baseUrl + "bomb-game.html?test=audio");
  await page.waitForFunction(() => Boolean(window.__BOMB_GAME__));
}

async function restore(snapshot) {
  await page.goto(baseUrl + "bomb-game.css?audio-state-bridge=1");
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: progressKey,
    value: snapshot,
  });
  await open();
  await page.locator("#overlayStartBombGame").click();
}

async function events() {
  return page.evaluate(() => window.__soundEvents);
}

try {
  await page.goto(baseUrl + "bomb-game.css?audio-clear=1");
  await page.evaluate((key) => localStorage.removeItem(key), progressKey);
  await open();
  const initial = await page.evaluate(() => window.__BOMB_GAME__.getState());
  assert.deepEqual(await events(), [], "page load is silent");
  await page.locator("#overlayStartBombGame").click();
  assert.deepEqual(await events(), [], "starting a game is silent");
  await page.locator("#bombCanvas").focus();
  await page.keyboard.press("Space");
  await page.waitForFunction(() => window.__soundEvents.some((event) => event.effect === "place"));
  assert.deepEqual((await events()).map((event) => event.effect), ["place"]);
  await page.waitForFunction(() => window.__soundEvents.some((event) => event.effect === "explode"), null, { timeout: 5000 });
  assert.deepEqual((await events()).map((event) => event.effect), ["place", "explode"]);
  assert.equal((await events()).every((event) => event.scheduled), true, "placement and blast reach the audio engine");

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto(baseUrl + "bomb-game.css?audio-mute-clear=1");
    await page.evaluate((key) => localStorage.removeItem(key), progressKey);
    await open();
    const toggle = page.locator("#bombSoundToggle");
    assert.equal(await toggle.isVisible(), true);
    assert.equal(await toggle.getAttribute("aria-label"), "关闭音效");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.waitForTimeout(200);
    await page.screenshot({ path: `tests/bomb-audio-${width}.png`, fullPage: true });
    if (width === 390) await toggle.tap();
    else { await toggle.focus(); await page.keyboard.press("Enter"); }
    assert.equal(await toggle.getAttribute("aria-pressed"), "false");
    assert.equal(await toggle.getAttribute("aria-label"), "开启音效");
    await page.locator("#overlayStartBombGame").click();
    await page.locator("#bombCanvas").focus();
    await page.keyboard.press("Space");
    await page.waitForFunction(() => window.__soundEvents.length > 0);
    assert.deepEqual(await events(), [{ effect: "place", scheduled: false }], "mute suppresses audio while gameplay continues");
  }

  const pickup = structuredClone(initial);
  pickup.status = "playing";
  pickup.startLayerHidden = true;
  pickup.player = { gx: 1, gy: 1, move: null, invulnerable: 20, trail: [{ gx: 1, gy: 1 }] };
  pickup.map[1][1] = 0;
  pickup.bombs = [];
  pickup.explosions = [];
  pickup.enemyClearOpenedBricks = true;
  pickup.powerUps = [{ type: "fireFlower", gx: 1, gy: 1 }];
  await restore(pickup);
  await page.waitForFunction(() => window.__soundEvents.some((event) => event.effect === "pickup"));
  assert.equal((await events()).filter((event) => event.effect === "pickup").length, 1);

  const correct = structuredClone(pickup);
  const target = correct.todayNewWords[0];
  assert.ok(target?.id, "fixture has a target Hanzi");
  correct.activePinyinWordId = target.id;
  correct.powerUps = [{ type: "wordChoice", gx: 1, gy: 1, wordId: target.id, targetWordId: target.id, correct: true }];
  await restore(correct);
  await page.waitForFunction(() => window.__soundEvents.some((event) => event.effect === "correct"));
  assert.equal((await events()).filter((event) => event.effect === "correct").length, 1);
  assert.equal((await events()).at(-1).scheduled, true);
  assert.equal((await page.evaluate(() => window.__BOMB_GAME__.getState())).moonWordIds.includes(target.id), true);
  assert.deepEqual(errors, [], "no script or resource errors");
  console.log(JSON.stringify({ effects: ["place", "explode", "pickup", "correct"], mute: true, desktopAnd390: true, errors: 0 }));
} finally {
  await context.close();
  await browser.close();
}
