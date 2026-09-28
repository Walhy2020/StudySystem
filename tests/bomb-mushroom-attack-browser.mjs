import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadChromium } from "./playwright-runtime.mjs";

const chromium = await loadChromium();
const baseUrl = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const gameUrl = baseUrl + "bomb-game.html?mushroom-attack-acceptance=1";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const progressKey = "mario-bomb-game-progress-v1";
const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
});
const results = [];

try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 },
      hasTouch: width === 390 });
    await context.addInitScript(() => {
      window.__mushroomShotDraws = 0;
      const original = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function trackMushroomShot(image, ...args) {
        if (String(image?.src || "").includes("super-mushroom-v1.png") && args[2] === 30) {
          window.__mushroomShotDraws += 1;
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
    await page.goto(baseUrl + "bomb-game.css?mushroom-clear=1");
    await page.evaluate(key => localStorage.removeItem(key), progressKey);
    await page.goto(gameUrl);
    await page.waitForFunction(() => Boolean(window.__BOMB_GAME__));
    assert.equal(await page.evaluate(() => window.__BOMB_GAME__.getState().attackMode), "bomb");

    if (width === 390) {
      await page.locator("#bombAttackToggle").tap();
      await page.locator('[data-attack-mode="mushroom"]').tap();
    } else {
      await page.locator("#bombAttackToggle").focus();
      await page.keyboard.press("Space");
      await page.locator('[data-attack-mode="mushroom"]').focus();
      await page.keyboard.press("Enter");
    }
    assert.equal(await page.evaluate(() => window.__BOMB_GAME__.getState().attackMode), "mushroom");
    assert.equal(await page.locator("#attackHudIcon").textContent(), "🍄");
    assert.equal(await page.locator("#attackRangeLabel").textContent(), "距离");
    assert.equal(await page.locator("#bombAmmo").textContent(), "∞");
    await page.locator("#bombAttackToggle").click();
    await page.locator("#mushroomThrowDistance").focus();
    await page.keyboard.press("Home");
    assert.equal(await page.evaluate(() => window.__BOMB_GAME__.getState().throwDistance), 1);
    const menu = await page.locator("#bombAttackMenu").boundingBox();
    assert.ok(menu.x >= 0 && menu.x + menu.width <= width, `${width}px attack menu fits`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(root, "tmp", `bomb-mushroom-attack-${width}.png`) });
    await page.keyboard.press("Escape");
    await page.locator("#restartBombGame").click();
    const seeded = await page.evaluate(() => window.__BOMB_GAME__.getState());
    assert.equal(seeded.hiddenPowerUps.some(([, type]) => type === "fireFlower"), false);
    assert.equal(seeded.powerUps.some(powerUp => powerUp.type === "fireFlower"), false);

    const fixture = await page.evaluate(() => {
      const saved = window.__BOMB_GAME__.getState();
      const rows = saved.map.length;
      const cols = saved.map[0].length;
      saved.map = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) =>
        x === 0 || y === 0 || x === cols - 1 || y === rows - 1 ? 1 : 0));
      saved.map[3][4] = 2;
      saved.map[7][7] = 2;
      saved.hiddenPowerUps = [["7,7", "bulletBill"]];
      const ids = saved.todayNewWords.map(word => word.id);
      ids.forEach((id, index) => { saved.map[8][7 + index] = 2; });
      saved.hiddenWordCrates = ids.map((id, index) => [`${7 + index},8`, id]);
      saved.status = "playing";
      saved.startLayerHidden = true;
      saved.player = { gx: 2, gy: 3, move: null, invulnerable: 0, trail: [{ gx: 2, gy: 3 }] };
      saved.enemies = [{ ...saved.enemies.find(enemy => enemy.type === "mushroom"),
        gx: 10, gy: 3, hp: 1, move: null, stunTimer: 1000, hitCooldown: 0, alive: true }];
      saved.bombs = [];
      saved.mushroomShots = [];
      saved.explosions = [];
      saved.powerUps = [];
      saved.shells = [];
      saved.attackMode = "mushroom";
      saved.throwDistance = 1;
      saved.lastDirection = "right";
      return saved;
    });
    assert.equal(fixture.hiddenWordCrates.length, 5);

    async function loadFixture(saved) {
      await page.goto(baseUrl + "bomb-game.css?mushroom-fixture=1");
      await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
        { key: progressKey, value: saved });
      await page.goto(gameUrl);
      await page.waitForFunction(() => Boolean(window.__BOMB_GAME__));
      assert.equal(await page.evaluate(() => window.__BOMB_GAME__.isAwaitingContinue()), true);
      await page.locator("#overlayStartBombGame").click();
      await page.locator("#bombCanvas").focus();
    }

    await loadFixture(fixture);
    await page.keyboard.press("Space");
    await page.waitForTimeout(230);
    assert.ok(await page.evaluate(() => window.__mushroomShotDraws > 0), "small red mushroom sprite is actually drawn");
    assert.equal(await page.evaluate(() => window.__BOMB_GAME__.getState().map[3][4]), 2,
      "one-cell throw cannot reach a brick two cells away");
    await page.locator("#bombAttackToggle").click();
    await page.locator("#mushroomThrowDistance").focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    assert.equal(await page.evaluate(() => window.__BOMB_GAME__.getState().throwDistance), 3);
    await page.keyboard.press("Escape");
    await page.locator("#bombCanvas").focus();
    await page.keyboard.press("Space");
    await page.waitForFunction(() => window.__BOMB_GAME__.getState().map[3][4] === 0);
    assert.equal(await page.evaluate(() => window.__BOMB_GAME__.getState().bombs.length), 0,
      "mushroom throw does not place a bomb");

    await page.reload();
    await page.waitForFunction(() => Boolean(window.__BOMB_GAME__));
    assert.equal(await page.evaluate(() => window.__BOMB_GAME__.isAwaitingContinue()), true);
    assert.deepEqual(await page.evaluate(() => {
      const state = window.__BOMB_GAME__.getState();
      return [state.attackMode, state.throwDistance, state.map[3][4]];
    }), ["mushroom", 3, 0], "throw settings and broken brick survive refresh");

    const enemyFixture = structuredClone(fixture);
    enemyFixture.map[3][4] = 0;
    enemyFixture.enemies[0].gx = 4;
    enemyFixture.throwDistance = 3;
    await loadFixture(enemyFixture);
    await page.keyboard.press("Space");
    await page.waitForFunction(() => window.__BOMB_GAME__.getState().enemies[0].alive === false);
    assert.equal(await page.evaluate(() => window.__BOMB_GAME__.getState().hp), fixture.hp,
      "mushroom impact does not burn the player");

    await page.locator("#bombAttackToggle").click();
    await page.locator('[data-attack-mode="bomb"]').click();
    await page.locator("#restartBombGame").click();
    const bombMode = await page.evaluate(() => window.__BOMB_GAME__.getState());
    assert.equal(bombMode.attackMode, "bomb");
    assert.equal(bombMode.hiddenPowerUps.filter(([, type]) => type === "fireFlower").length, 2,
      "existing bomb mode still seeds its two Fire Flowers");
    assert.equal(await page.locator("#attackRangeLabel").textContent(), "威力");
    await page.locator("#bombAttackToggle").click();
    await page.locator('[data-attack-mode="mushroom"]').click();
    const switched = await page.evaluate(() => window.__BOMB_GAME__.getState());
    assert.equal(switched.hiddenPowerUps.some(([, type]) => type === "fireFlower"), false,
      "switching modes removes still-hidden Fire Flowers immediately");
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    results.push({ width, throwDistance: 3, brickBroken: true, enemyDefeated: true, fireFlowersInMushroomMode: 0 });
    await context.close();
  }
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", results }));
} finally {
  await browser.close();
}
