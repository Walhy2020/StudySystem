import assert from "node:assert/strict";
import { loadChromium } from "./playwright-runtime.mjs";
import { APP_VERSION } from "../src/constants.js";

const chromium = await loadChromium();
const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const browser = await chromium.launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const pages = ["index", "book-learning", "theme-learning", "scenario-learning", "review-learning", "phonetics", "bomb-game"];
const parts = APP_VERSION.split(".").map(Number);
const next = `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
const newer = `${parts[0]}.${parts[1]}.${parts[2] + 2}`;
const errors = [];
async function waitUntil(page, predicate) {
  const deadline = Date.now() + 6000;
  while (!predicate() && Date.now() < deadline) await page.waitForTimeout(50);
  assert.ok(predicate(), "version-check event completed");
}

try {
  for (const [name, width] of [...pages.map(name => [name, 1440]), ["bomb-game", 390]]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width === 390 });
    const page = await context.newPage();
    let servedVersion = APP_VERSION;
    let accept = false;
    let requests = 0;
    let loads = 0;
    const dialogs = [];
    await context.addInitScript(() => {
      window.__updatePrompts = 0;
      window.addEventListener("studysystem:update-prompt", () => { window.__updatePrompts++; });
    });
    await page.route("**/package.json?version-check=*", route => {
      requests++;
      return route.fulfill({ contentType: "application/json", body: JSON.stringify({ version: servedVersion }) });
    });
    page.on("pageerror", error => errors.push(`${name}: ${error.message}`));
    page.on("load", () => loads++);
    page.on("dialog", async dialog => {
      assert.equal(dialog.type(), "confirm");
      dialogs.push(dialog.message());
      if (accept) {
        // Simulate the deployment becoming the current release after this reload.
        servedVersion = APP_VERSION;
        await dialog.accept();
      } else await dialog.dismiss();
    });
    await page.goto(`${base}${name}.html?update-acceptance=1`);
    await page.evaluate(() => localStorage.setItem("update-check-sentinel", "preserved"));
    const initialLoads = loads;
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await waitUntil(page, () => requests > 0);
    await page.waitForTimeout(100);
    assert.equal(dialogs.length, 0, `${name}: no prompt for current version`);
    if (name === "bomb-game") {
      if (width === 390) await page.locator("#overlayStartBombGame").tap();
      else await page.locator("#overlayStartBombGame").click();
    }
    servedVersion = next;
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await waitUntil(page, () => dialogs.length === 1);
    assert.ok(dialogs[0].includes(`v${next}`));
    assert.equal(loads, initialLoads, `${name}: cancel does not reload`);
    assert.equal(await page.evaluate(() => window.__updatePrompts), 1);
    await page.evaluate(() => {
      window.dispatchEvent(new Event("focus"));
      window.dispatchEvent(new Event("online"));
    });
    await page.waitForTimeout(150);
    assert.equal(dialogs.length, 1, `${name}: no repeated prompt for a dismissed release`);
    servedVersion = newer;
    accept = true;
    await page.evaluate(() => window.dispatchEvent(new Event("focus"))).catch(error => {
      if (!/context was destroyed|navigation/i.test(error.message)) throw error;
    });
    await waitUntil(page, () => loads > initialLoads);
    await page.waitForLoadState("load");
    assert.equal(dialogs.length, 2, `${name}: a later release can prompt again`);
    assert.ok(dialogs[1].includes(`v${newer}`));
    assert.ok(page.url().endsWith(`${name}.html?update-acceptance=1`), "reload preserves current route/query");
    assert.equal(await page.evaluate(() => localStorage.getItem("update-check-sentinel")), "preserved");
    if (name === "bomb-game") {
      assert.equal(await page.evaluate(() => window.__BOMB_GAME__.isAwaitingContinue()), true, "bomb reload waits for Continue");
      assert.equal((await page.evaluate(() => window.__BOMB_GAME__.getState())).world, 1);
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", pageCount: 7,
    desktopAnd390: true, noPromptForSameVersion: true, cancelKeepsPage: true,
    newerVersionRePrompts: true, confirmReloads: true, progressPreserved: true }));
} finally {
  await browser.close();
}
