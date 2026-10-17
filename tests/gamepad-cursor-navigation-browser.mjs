import assert from "node:assert/strict";
import fs from "node:fs";
import { loadChromium } from "./playwright-runtime.mjs";
const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
fs.mkdirSync("tmp", { recursive: true });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, hasTouch: width === 390 });
    await context.addInitScript(() => {
      let callbacks = [], now = 0;
      window.requestAnimationFrame = callback => { callbacks.push(callback); return callbacks.length; };
      window.__pad = parent !== window ? parent.__pad : {
        index: 0, id: "Persistent cursor fixture", connected: true, mapping: "standard",
        axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })),
      };
      Object.defineProperty(navigator, "getGamepads", { value: () => window.__pad.connected ? [window.__pad] : [] });
      window.__tick = time => { const batch = callbacks; callbacks = []; batch.forEach(cb => cb(time)); };
      window.__advance = (count = 3) => {
        for (let i = 0; i < count; i++) {
          now += 1000 / 60; window.__tick(now);
          for (let j = 0; j < frames.length; j++) frames[j].__tick?.(now);
        }
      };
      window.__clicks = 0;
      document.addEventListener("click", () => { window.__clicks++; });
    });
    let mode = "web";
    const clients = new Set();
    await context.route("**/api/controller-mouse", route => {
      clients.add(route.request().postDataJSON().client);
      return route.fulfill({ json: { supported: true, mode } });
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(response.url()); });
    const advance = (n = 3) => page.evaluate(n => window.__advance(n), n);
    const point = () => page.locator("#study-gamepad-cursor").evaluate(node =>
      ({ x: parseFloat(node.style.left), y: parseFloat(node.style.top) }));
    const axes = values => page.evaluate(values => { window.__pad.axes = values; }, values);
    const button = (i, down) => page.evaluate(({ i, down }) => {
      window.__pad.buttons[i] = { pressed: down, value: down ? 1 : 0 };
    }, { i, down });
    async function tap(i) { await button(i, true); await advance(); await button(i, false); await advance(); }
    async function move(x, y) {
      await page.evaluate(({ x, y }) => {
        for (let i = 0; i < 250; i++) {
          const node = document.getElementById("study-gamepad-cursor");
          const dx = x - parseFloat(node.style.left), dy = y - parseFloat(node.style.top);
          if (Math.hypot(dx, dy) < .5) break;
          const axis = d => Math.abs(d) < .2 ? 0 : Math.sign(d) * (.25 + .75 * Math.min(1, Math.abs(d) / (650 / 60)));
          window.__pad.axes = [0, 0, axis(dx), axis(dy)]; window.__advance(1);
        }
        window.__pad.axes = [0, 0, 0, 0]; window.__advance(1);
      }, { x, y });
      const actual = await point();
      assert.ok(Math.hypot(actual.x - x, actual.y - y) < 1, "real owner polling reaches target");
    }
    async function moduleFrame(name) {
      await page.waitForURL(url => url.pathname.endsWith(name + ".html"));
      await page.waitForFunction(() => !window.STUDY_FULLSCREEN_SHELL.isNavigating(), null, { timeout: 10000, polling: 50 }).catch(async error => {
        console.log(JSON.stringify({ errors, frames: await page.evaluate(() => Array.from(document.querySelectorAll("iframe")).map(f => ({
          src: f.src, url: f.contentWindow.location.href, state: f.contentDocument.readyState,
          embedded: f.contentWindow.STUDY_FULLSCREEN_SHELL?.isEmbedded(), cursor: Boolean(f.contentWindow.STUDY_GAMEPAD_CURSOR),
        }))) })); throw error;
      });
      const frame = await (await page.locator("#study-module-frame").elementHandle()).contentFrame();
      await frame.waitForURL(url => url.pathname.endsWith(name + ".html"));
      await advance();
      assert.equal(await page.evaluate(() => window.__owner === window.STUDY_GAMEPAD_CURSOR &&
        window.__pointer === document.getElementById("study-gamepad-cursor")), true, "same cursor owner AND DOM identity");
      assert.equal(await frame.locator("#study-gamepad-cursor").count(), 0, "modules must not create their own cursor");
      assert.equal(await frame.locator("#study-module-frame").count(), 0, "no nested shells");
      assert.equal(await page.locator("#study-gamepad-cursor").count(), 1);
      assert.equal(await page.locator("#study-navigation-cursor").count(), 0, "no temporary handoff pointer");
      const rect = await page.locator("#study-module-frame").boundingBox();
      assert.deepEqual(rect, { x: 0, y: 0, width, height: 900 });
      assert.equal(await frame.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      return frame;
    }
    await page.goto(base + "phonetics.html"); await page.bringToFront(); await advance();
    await page.evaluate(() => {
      window.__owner = window.STUDY_GAMEPAD_CURSOR;
      window.__pointer = document.getElementById("study-gamepad-cursor");
    });
    await move(75, 220);
    let surface = page;
    // Slow loading in BOTH windowed/fullscreen. Hold A and move the stick across
    // the document boundary: owner must keep moving, not restore a saved fixture point.
    for (const [name, fullscreen] of [["scenario-learning", false], ["review-learning", true]]) {
      if (fullscreen) {
        await surface.evaluate(() => {
          const button = document.createElement("button"); button.id = "cursor-fs";
          button.textContent = "Fullscreen";
          button.onclick = () => window.STUDY_FULLSCREEN_SHELL.toggleFullscreen();
          document.body.prepend(button);
        });
        await surface.locator("#cursor-fs").click();
        await page.waitForFunction(() => Boolean(document.fullscreenElement), null, { polling: 50 });
      }
      let release, entered;
      const blocked = new Promise(resolve => { release = resolve; });
      const requested = new Promise(resolve => { entered = resolve; });
      const pattern = "**/" + name + ".html";
      await context.route(pattern, async route => { entered(); await blocked; await route.continue(); });
      await button(0, true);
      await surface.locator('a[href="./' + name + '.html"]').first().click();
      await requested;
      assert.equal(await page.locator("#study-gamepad-cursor").isVisible(), true, "actual pointer remains visible during loading");
      const before = await point();
      await axes([0, 0, 1, 0]); await advance(3);
      const during = await point();
      assert.ok(during.x > before.x + 20, "same input loop continues during loading");
      await axes([0, 0, 0, 0]);
      await page.screenshot({ path: "tmp/persistent-cursor-loading-" + width + "-" + name + ".png" });
      release(); surface = await moduleFrame(name);
      assert.deepEqual(await point(), during, "new module cannot restore its own stale coordinates");
      assert.equal(await surface.evaluate(() => window.__clicks), 0, "held A does not replay in new module");
      assert.equal(await page.evaluate(() => Boolean(document.fullscreenElement)), fullscreen);
      // Calling a child's legacy poll hook cannot move/click the owner a second time.
      await surface.evaluate(() => window.STUDY_GAMEPAD_CURSOR.poll(999999));
      assert.deepEqual(await point(), during);
      await button(0, false); await advance();
      await context.unroute(pattern);
    }
    // Exit fullscreen with R2, without reloading iframe or its lesson state.
    await surface.evaluate(() => { window.__lessonToken = "same-content"; });
    await tap(7); await page.waitForFunction(() => !document.fullscreenElement, null, { polling: 50 });
    assert.equal(await surface.evaluate(() => window.__lessonToken), "same-content");
    await moduleFrame("review-learning");
    const fixed = await point();
    // Keyboard and touch/native navigation use the same owner.
    const link = surface.locator('a[href="./phonetics.html"]');
    await link.focus(); await link.press("Enter"); surface = await moduleFrame("phonetics");
    assert.deepEqual(await point(), fixed);
    if (width === 390) await surface.locator('a[href="./scenario-learning.html"]').tap();
    else await surface.locator('a[href="./scenario-learning.html"]').click();
    surface = await moduleFrame("scenario-learning");
    await page.evaluate(() => history.back()); surface = await moduleFrame("phonetics");
    await page.evaluate(() => history.forward()); surface = await moduleFrame("scenario-learning");
    assert.deepEqual(await point(), fixed);
    // Real hit testing/hover/click is routed into active content, not dormant root.
    await surface.evaluate(() => {
      const button = document.createElement("button"); button.id = "active-hit";
      button.textContent = "Hit fixture"; button.style.cssText = "position:fixed;left:50px;top:200px;width:120px;height:48px;z-index:999999";
      button.onclick = () => { window.__hits = (window.__hits || 0) + 1; }; document.body.append(button);
    });
    await move(110, 224); await tap(0);
    assert.equal(await surface.evaluate(() => window.__hits), 1);
    assert.equal(await surface.locator("#active-hit").evaluate(node => node.classList.contains("study-gamepad-hover")), true);
    await surface.locator("#active-hit").focus(); await surface.locator("#active-hit").press("Space");
    assert.equal(await surface.evaluate(() => window.__hits), 2, "native Space on a focused button stays native");
    await surface.evaluate(() => {
      const select = document.createElement("select"); select.id = "active-select";
      select.style.cssText = "position:fixed;left:50px;top:270px;width:160px;height:42px;z-index:999999";
      select.innerHTML = '<option value="one">One</option><option value="two">Two</option>';
      select.onchange = () => { window.__selected = select.value; }; document.body.append(select);
      const range = document.createElement("input"); range.type = "range"; range.id = "active-range";
      range.style.cssText = "position:fixed;left:50px;top:390px;width:160px;height:30px;z-index:999999";
      range.oninput = () => { window.__range = +range.value; }; document.body.append(range);
    });
    await move(110, 291); await tap(0);
    const choice = page.locator('.study-gamepad-options button').nth(1);
    assert.equal(await choice.isVisible(), true, "owner popup is above the module frame");
    const box = await choice.boundingBox(); await move(box.x + box.width / 2, box.y + box.height / 2); await tap(0);
    assert.equal(await surface.evaluate(() => window.__selected), "two");
    await move(190, 405); await tap(0);
    assert.ok(await surface.evaluate(() => window.__range > 70), "range input events reach content document");
    // One presence client and one mode govern all content modules.
    mode = "system"; await page.evaluate(() => window.STUDY_CONTROLLER_MOUSE.refresh()); await advance();
    assert.equal(await page.locator("#study-gamepad-cursor").isVisible(), false);
    assert.equal(await surface.evaluate(() => window.STUDY_CONTROLLER_MOUSE.isActive()), true);
    mode = "web"; await page.evaluate(() => window.STUDY_CONTROLLER_MOUSE.refresh()); await advance();
    assert.equal(await page.locator("#study-gamepad-cursor").isVisible(), true);
    await page.evaluate(() => { window.__pad.connected = false; }); await advance();
    assert.equal(await page.locator("#study-gamepad-cursor").isVisible(), false);
    const disconnected = await point();
    await page.evaluate(() => { window.__pad.connected = true; window.__pad.axes[2] = 1; }); await advance();
    assert.deepEqual(await point(), disconnected, "reconnect still requires neutral");
    await axes([0, 0, 0, 0]); await advance();
    // Scroll the content document, not the fixed shell.
    await surface.evaluate(() => { const div = document.createElement("div"); div.style.height = "2500px"; document.body.append(div); });
    await move(width - 30, 888);
    const y = await surface.evaluate(() => scrollY);
    await axes([0, 0, 0, 1]); await advance(12); await axes([0, 0, 0, 0]);
    assert.ok(await surface.evaluate(y => scrollY > y, y), "edge scroll reaches active module");
    assert.equal(await page.evaluate(() => scrollY), 0);
    await surface.evaluate(() => scrollTo(0, 0));
    await tap(5); surface = await moduleFrame("index");
    await surface.locator("#startDaily").click(); await tap(3);
    assert.equal(await surface.locator(".pinyin-readings").count(), 1, "Y targets active Hanzi, not dormant IPA owner");
    // All eight modules remain isolated content; pause/Continue and capture delegate.
    for (const name of ["pinyin", "book-learning", "theme-learning"]) {
      await surface.locator('a[href="./' + name + '.html"]').click(); surface = await moduleFrame(name);
    }
    await surface.locator('a[href="./index.html"]').click(); surface = await moduleFrame("index");
    await surface.locator('a[href*="bomb-game.html"]').first().click(); surface = await moduleFrame("bomb-game");
    await surface.evaluate(() => window.STUDY_GAMEPAD_CURSOR.setInputCapture(true));
    const captured = await point(); await axes([0, 0, 1, 0]); await advance();
    assert.deepEqual(await point(), captured);
    await surface.evaluate(() => window.STUDY_GAMEPAD_CURSOR.setInputCapture(false));
    await axes([0, 0, 0, 0]); await advance();
    await tap(9);
    assert.equal(await surface.evaluate(() => window.__BOMB_GAME__.getState().status), "playing");
    await axes([0, 0, 1, 0]); await advance(); await axes([0, 0, 0, 0]);
    assert.equal(await surface.evaluate(() => window.STUDY_GAMEPAD_CURSOR.isMenuActive()), true);
    const saved = await surface.evaluate(() => window.__BOMB_GAME__.getState());
    await advance(15);
    assert.equal(await surface.evaluate(() => window.__BOMB_GAME__.getState().dayClock), saved.dayClock, "owner cursor menu pauses embedded game");
    await surface.locator('a[href="./index.html"]').click(); surface = await moduleFrame("index");
    await surface.locator('a[href*="bomb-game.html"]').first().click(); surface = await moduleFrame("bomb-game");
    assert.equal(await surface.locator("#overlayStartBombGame").innerText(), "继续");
    const restored = await surface.evaluate(() => window.__BOMB_GAME__.getState());
    assert.equal(restored.hp, saved.hp); assert.equal(restored.dayClock, saved.dayClock);
    await surface.locator('a[href="./index.html"]').click(); surface = await moduleFrame("index");
    await page.screenshot({ path: "tmp/persistent-cursor-" + width + ".png" });
    assert.equal(clients.size, 1, "one native presence client across all modules");
    assert.deepEqual(errors, []);
    console.log("PASS Edge " + width + ": persistent cursor identity/input/lease, loading motion, no held replay, active clicks/scroll, history, R1/R2, game pause/capture");
    await context.close();
  }
} finally { await browser.close(); }
