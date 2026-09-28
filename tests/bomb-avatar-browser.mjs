import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadChromium } from "./playwright-runtime.mjs";

const chromium = await loadChromium();
const baseUrl = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, hasTouch: true });
await context.addInitScript(() => {
  window.__mushroomDraws = 0;
  window.__mushroomDrawWidths = [];
  window.__bomberDraws = 0;
  const original = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function avatarDrawImage(image, ...args) {
    if (String(image?.src || "").includes("assets/sprites/super-mushroom-v1.png")) {
      window.__mushroomDraws += 1;
      window.__mushroomDrawWidths.push(args[2]);
    }
    if (image instanceof HTMLCanvasElement && image.width === 736 && image.height === 708) {
      window.__bomberDraws += 1;
    }
    return original.call(this, image, ...args);
  };
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", error => errors.push(error.message));
page.on("response", response => {
  if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
});

async function assertLayout(width) {
  const geometry = await page.evaluate(() => {
    const button = document.querySelector("#bombAvatarToggle").getBoundingClientRect();
    const menu = document.querySelector("#bombAvatarMenu").getBoundingClientRect();
    return {
      viewport: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      button: { left: button.left, right: button.right, top: button.top, bottom: button.bottom },
      menu: { left: menu.left, right: menu.right, top: menu.top, bottom: menu.bottom },
    };
  });
  assert.equal(geometry.viewport, width);
  assert.ok(geometry.scrollWidth <= width, `no horizontal overflow at ${width}px`);
  assert.ok(geometry.button.left >= 0 && geometry.button.right <= width, `avatar button fits at ${width}px`);
  assert.ok(geometry.menu.left >= 0 && geometry.menu.right <= width, `avatar menu fits at ${width}px`);
  assert.ok(geometry.menu.top >= geometry.button.bottom, `avatar menu is below its button at ${width}px`);
}

try {
  await page.goto(baseUrl + "bomb-game.css?avatar-clear=1");
  await page.evaluate(() => localStorage.removeItem("mario-bomb-game-progress-v1"));
  await page.goto(baseUrl + "bomb-game.html?avatar-acceptance=1");
  await page.waitForFunction(() => Boolean(window.__BOMB_GAME__));
  assert.equal(await page.evaluate(() => window.__BOMB_GAME__.getSelectedAvatar()), "fly-star");
  assert.match(await page.locator("#bombAvatarToggle").getAttribute("aria-label"), /小飞星/);

  await page.locator("#bombAvatarToggle").focus();
  await page.keyboard.press("Space");
  assert.equal(await page.locator("#bombAvatarToggle").getAttribute("aria-expanded"), "true");
  await assertLayout(1440);
  assert.equal(await page.locator("#bombAvatarMenu [data-avatar]").count(), 3);
  await page.locator('[data-avatar="bomber"]').focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => window.__BOMB_GAME__.getSelectedAvatar()), "bomber");
  assert.equal(await page.locator("#bombAvatarMenu").isHidden(), true);
  await page.locator("#overlayStartBombGame").click();
  await page.waitForFunction(() => window.__bomberDraws > 0);
  await page.screenshot({ path: path.join(root, "tmp", "bomb-avatar-bomber-desktop.png") });
  const before = await page.evaluate(() => window.__BOMB_GAME__.getState());
  await page.locator("#bombAvatarToggle").click();
  await page.waitForTimeout(220);
  const paused = await page.evaluate(() => window.__BOMB_GAME__.getState());
  await page.waitForTimeout(220);
  const stillPaused = await page.evaluate(() => window.__BOMB_GAME__.getState());
  assert.equal(paused.dayClock, stillPaused.dayClock, "opening the menu pauses gameplay");
  assert.equal(paused.hp, stillPaused.hp, "no damage while choosing a character");
  await page.locator('[data-avatar="super-mushroom"]').tap();
  assert.equal(await page.evaluate(() => window.__BOMB_GAME__.getSelectedAvatar()), "super-mushroom");
  const after = await page.evaluate(() => window.__BOMB_GAME__.getState());
  assert.equal(after.world, before.world);
  assert.equal(after.subLevel, before.subLevel);
  assert.equal(after.score, before.score);
  assert.deepEqual(after.map, before.map, "avatar change does not restart the level");
  await page.waitForFunction(() => window.__mushroomDraws > 0);
  assert.deepEqual(await page.evaluate(() => [...new Set(window.__mushroomDrawWidths)]), [52], "mushroom image is 20% smaller than its previous 65px draw width");
  await page.screenshot({ path: path.join(root, "tmp", "bomb-avatar-mushroom-desktop.png") });

  await page.reload();
  await page.waitForFunction(() => Boolean(window.__BOMB_GAME__));
  assert.equal(await page.evaluate(() => window.__BOMB_GAME__.getSelectedAvatar()), "super-mushroom");
  assert.equal(await page.evaluate(() => window.__BOMB_GAME__.isAwaitingContinue()), true);
  await page.locator("#overlayStartBombGame").click();
  await page.locator("#restartBombGame").click();
  assert.equal(await page.evaluate(() => window.__BOMB_GAME__.getSelectedAvatar()), "super-mushroom", "restart keeps the chosen character");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#bombAvatarToggle").tap();
  await assertLayout(390);
  await page.locator('[data-avatar="fly-star"]').tap();
  assert.equal(await page.evaluate(() => window.__BOMB_GAME__.getSelectedAvatar()), "fly-star");
  await page.evaluate(() => { window.__bomberDraws = 0; });
  await page.locator("#bombAvatarToggle").tap();
  await page.locator('[data-avatar="bomber"]').tap();
  await page.waitForFunction(() => window.__bomberDraws > 0);
  await page.screenshot({ path: path.join(root, "tmp", "bomb-avatar-bomber-390.png") });
  await page.evaluate(() => { window.__mushroomDraws = 0; });
  await page.evaluate(() => { window.__mushroomDrawWidths = []; });
  await page.locator("#bombAvatarToggle").tap();
  await page.locator('[data-avatar="super-mushroom"]').tap();
  await page.waitForFunction(() => window.__mushroomDraws > 0);
  assert.deepEqual(await page.evaluate(() => [...new Set(window.__mushroomDrawWidths)]), [52], "mobile mushroom uses the same reduced sprite size");
  await page.screenshot({ path: path.join(root, "tmp", "bomb-avatar-mushroom-390.png") });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const mushroomDraws = await page.evaluate(() => window.__mushroomDraws);

  const oldSave = await page.evaluate(() => window.__BOMB_GAME__.getState());
  delete oldSave.playerAvatar;
  await page.goto(baseUrl + "bomb-game.css?avatar-old-save=1");
  await page.evaluate(snapshot => localStorage.setItem("mario-bomb-game-progress-v1", JSON.stringify(snapshot)), oldSave);
  await page.goto(baseUrl + "bomb-game.html?avatar-old-save=1");
  await page.waitForFunction(() => Boolean(window.__BOMB_GAME__));
  assert.equal(await page.evaluate(() => window.__BOMB_GAME__.getSelectedAvatar()), "fly-star", "older saves default to the previous character");
  assert.equal(await page.evaluate(() => window.__BOMB_GAME__.isAwaitingContinue()), true);

  const sprite = await page.request.get(baseUrl + "assets/sprites/super-mushroom-v1.png?v=1.0");
  assert.equal(sprite.status(), 200);
  assert.match(sprite.headers()["content-type"] || "", /image\/png/);
  const bomberSprite = await page.request.get(baseUrl + "assets/sprites/bomber-original-v1.png?v=1.0");
  assert.equal(bomberSprite.status(), 200);
  assert.match(bomberSprite.headers()["content-type"] || "", /image\/png/);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", avatars: ["bomber", "fly-star", "super-mushroom"], viewports: [1440, 390], mushroomDraws }));
} finally {
  await browser.close();
}
