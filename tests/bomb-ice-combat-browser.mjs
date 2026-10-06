import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { loadChromium } from "./playwright-runtime.mjs";

const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const key = "mario-bomb-game-progress-v1";
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const results = [];
fs.mkdirSync(new URL("../tmp/", import.meta.url), { recursive: true });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width === 390 });
    await context.addInitScript(() => {
      let callbacks = [], now;
      window.requestAnimationFrame = cb => { callbacks.push(cb); return callbacks.length; };
      window.cancelAnimationFrame = () => {};
      window.__advance = seconds => {
        now ??= performance.now();
        for (let i = 0; i < Math.ceil(seconds * 60); i++) {
          now += 1000 / 60;
          const batch = callbacks; callbacks = [];
          batch.forEach(cb => cb(now));
        }
      };
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(response.url()); });
    const read = () => page.evaluate(() => window.__BOMB_GAME__.getState());
    const advance = seconds => page.evaluate(seconds => window.__advance(seconds), seconds);
    const screenshot = name => page.screenshot({ path: path.resolve("tmp", `bomb-${name}-${width}.png`) });
    await page.goto(base + "bomb-game.html?ice-check=1");
    await page.locator("#restartBombGame").click();
    const seed = await read();
    assert.deepEqual([seed.bombLimit, seed.flameRange, seed.mushroomKey, seed.iceBombKey], [1, 2, "Space", "KeyB"]);
    for (const type of ["iceFlower", "iceBomb"]) assert.equal(seed.hiddenPowerUps.filter(([, t]) => t === type).length, 1);
    assert.equal(seed.enemies.find(e => e.type === "bowser").hp, 40);
    assert.ok(seed.enemies.filter(e => e.type !== "bowser").every(e => e.hp === 6));
    if (await page.locator("#bombSettingsMenu").isHidden()) await page.locator("#bombSettingsToggle").click();
    if (width === 390) await page.locator("#bombAttackToggle").tap();
    else await page.locator("#bombAttackToggle").click();
    await page.locator("#mushroomAttackKey").click();
    await page.keyboard.press("KeyJ");
    await page.locator("#iceBombAttackKey").click();
    await page.keyboard.press("Space");
    await page.keyboard.press("Space");
    assert.equal((await read()).bombs.length, 0);
    await advance(0.02);
    const menu = await page.locator("#bombAttackMenu").boundingBox();
    assert.ok(menu.x >= 0 && menu.x + menu.width <= width);
    await screenshot("ice-settings");
    await page.keyboard.press("Escape");
    await page.reload();
    assert.deepEqual([(await read()).mushroomKey, (await read()).iceBombKey], ["KeyJ", "Space"]);
    const fixture = structuredClone(seed);
    const rows = seed.map.length, cols = seed.map[0].length;
    fixture.map = Array.from({ length: rows }, (_, y) => Array.from({ length: cols }, (_, x) =>
      !x || !y || x === cols - 1 || y === rows - 1 ? 1 : 0));
    fixture.status = "playing"; fixture.startLayerHidden = true;
    fixture.player = { gx: 2, gy: 3, move: null, invulnerable: 0, trail: [{ gx: 2, gy: 3 }] };
    fixture.enemies = [{ ...seed.enemies.find(e => e.type === "mushroom"),
      gx: 4, gy: 3, hp: 3, move: null, stunTimer: 1000, hitCooldown: 0 }];
    for (const field of ["bombs", "mushroomShots", "fireballs", "explosions", "shells", "powerUps", "hiddenPowerUps"]) fixture[field] = [];
    fixture.hiddenWordCrates = fixture.todayNewWords.map((word, i) => {
      fixture.map[10][8 + i] = 2; return [`${8 + i},10`, word.id];
    });
    fixture.lastDirection = "right"; fixture.throwDistance = 3;
    async function load(saved) {
      await page.goto(base + "bomb-game.css?fixture=1");
      await page.evaluate(({ key, saved }) => localStorage.setItem(key, JSON.stringify(saved)), { key, saved });
      await page.goto(base + "bomb-game.html?ice-check=1");
      assert.equal(await page.evaluate(() => window.__BOMB_GAME__.isAwaitingContinue()), true);
      await page.locator("#overlayStartBombGame").click(); await page.locator("#bombCanvas").focus();
    }
    for (const hp of [3, 2, 1, 40]) {
      const shot = structuredClone(fixture); shot.enemies[0].hp = hp;
      if (hp === 40) shot.enemies[0].type = "bowser";
      await load(shot); await page.keyboard.press("Space"); await advance(0.2);
      assert.equal((await read()).enemies[0].hp, hp - 1);
      assert.equal((await read()).enemies[0].alive, hp > 1);
      assert.equal((await read()).bombs.length, 0);
    }
    await load(fixture); await page.keyboard.press("B"); await page.keyboard.press("B");
    assert.equal((await read()).bombs.length, 1); assert.equal((await read()).bombs[0].range, 2);
    await advance(2.1);
    assert.ok((await read()).enemies[0].freezeTimer > 2.8);
    assert.equal((await read()).enemies[0].hp, 3); assert.equal((await read()).hp, fixture.hp);
    assert.equal(await page.locator("#bombAmmo").textContent(), "1", "capacity is restored after detonation");
    await screenshot("ice-freeze"); await page.reload();
    assert.ok((await read()).enemies[0].freezeTimer > 2.8);
    await page.locator("#overlayStartBombGame").click(); await advance(3.1);
    assert.equal((await read()).enemies[0].freezeTimer, 0);
    const items = structuredClone(fixture);
    items.powerUps = ["iceFlower", "iceBomb"].map(type => ({ type, gx: 2, gy: 3, seed: 0 }));
    await load(items); await advance(0.05);
    assert.deepEqual([(await read()).bombLimit, (await read()).flameRange], [2, 3]);
    await page.reload(); assert.deepEqual([(await read()).bombLimit, (await read()).flameRange], [2, 3]);
    const laterItems = structuredClone(items); laterItems.bombLimit = 10;
    await load(laterItems); await advance(0.05); await page.reload();
    assert.equal((await read()).bombLimit, 11, "later worlds still gain and retain capacity above ten");
    const brick = structuredClone(fixture); brick.enemies[0].gx = 20;
    brick.map[3][4] = 2; brick.hiddenPowerUps = [["4,3", "iceFlower"]];
    await load(brick); await page.keyboard.press("Space"); await advance(0.22);
    assert.equal((await read()).map[3][4], 2, "small mushrooms no longer open bricks");
    await page.keyboard.press("B"); await advance(2.1);
    assert.equal((await read()).map[3][4], 0);
    assert.equal((await read()).powerUps.find(p => p.type === "iceFlower").gx, 4);
    await advance(1.1); // let ice-bomb impact particles clear so the recolored artwork is visible
    await screenshot("ice-flower");
    const fire = structuredClone(fixture); fire.player.gx = 4;
    fire.enemies = [{ ...seed.enemies.find(e => e.type === "bowser"), gx: 2, gy: 3,
      dir: "right", hp: 40, stunTimer: 0, fireCooldown: 2, freezeTimer: 0,
      move: { fromX: 2, fromY: 3, toX: 2, toY: 3, time: 0, duration: 1000 } }];
    await load(fire); await advance(1.9); assert.equal((await read()).fireballs.length, 0);
    await advance(0.15); assert.equal((await read()).fireballs.length, 1);
    assert.ok((await read()).enemies[0].fireCooldown > 1.8); await screenshot("bowser-cd");
    await advance(0.7); assert.equal((await read()).hp, fixture.hp - 1);
    const repeatFire = structuredClone(fire);
    repeatFire.player.invulnerable = 100;
    await load(repeatFire); await advance(4.05);
    assert.equal((await read()).fireballs.length, 1, "a second shot fires at the next two-second interval");
    assert.ok((await read()).enemies[0].fireCooldown > 1.8);
    const wall = structuredClone(fire); wall.map[3][3] = 2;
    await load(wall); await advance(2.25);
    assert.equal((await read()).map[3][3], 0, "Bowser shoots and breaks a brick even without seeing the player");
    const old = structuredClone(fixture); delete old.combatRulesVersion;
    old.bombLimit = 3; old.flameRange = 1; old.enemies[0].hp = 1;
    old.map[6][6] = 2; old.map[6][7] = 2;
    old.hiddenPowerUps = [["6,6", "fireFlower"], ["7,6", "fireFlower"]]; old.fireFlowersSpawned = 0;
    await load(old); const migrated = await read();
    assert.deepEqual([migrated.bombLimit, migrated.flameRange, migrated.enemies[0].hp], [1, 2, 3]);
    for (const type of ["iceFlower", "iceBomb"]) assert.equal(migrated.hiddenPowerUps.filter(([, t]) => t === type).length, 1);
    assert.deepEqual(migrated.moonWordIds, old.moonWordIds);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    results.push({ width, dualKeys: true, iceFreeze: 3, enemyHp: 3, bowserHp: 40,
      capacity: 1, range: 2, eachItem: 1, fireCooldown: 2, migration: true });
    await context.close();
  }
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", results }));
} finally { await browser.close(); }
