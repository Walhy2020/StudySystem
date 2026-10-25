import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { loadChromium } from "./playwright-runtime.mjs";
const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const key = "mario-snake-game-progress-v1";
mkdirSync("tmp", { recursive: true });
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const sourceKeys = ["mario-hanzi-refactor-v1", "mario-literacy-desktop-mvp-v1", "mario-phonetics-v1", "mario-pinyin-v1", "mario-word-learning-v1", "mario-book1-v1", "mario-theme-learned-v1", "mario-scenario-learning-v1", "mario-total-review-v1", "mario-bomb-game-progress-v1"];
const results = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 960 }, hasTouch: width === 390 });
    let mouseMode = "web";
    await context.route("**/api/controller-mouse**", route => route.fulfill({ json: { supported: true, mode: mouseMode } }));
    await context.addInitScript(({ sourceKeys, key }) => {
      for (const k of sourceKeys) if (!localStorage.getItem(k)) localStorage.setItem(k, k.includes("hanzi-refactor")
        ? JSON.stringify({ records: { "0010": { status: "known", correctCount: 1 } }, dailyNewIds: ["0010"] }) : JSON.stringify({ sentinel: k }));
      const fixture = sessionStorage.getItem("snake-acceptance-fixture");
      if (fixture) { localStorage.setItem(key, fixture); sessionStorage.removeItem("snake-acceptance-fixture"); }
      let callbacks = [], now = performance.now();
      window.requestAnimationFrame = callback => { callbacks.push(callback); return callbacks.length; };
      window.__tick = time => { const pending = callbacks; callbacks = []; pending.forEach(cb => cb(time)); };
      window.__step = (count = 1) => { for (let i = 0; i < count; i++) { now += 1000 / 60; window.__tick(now); for (let j = 0; j < frames.length; j++) frames[j].__tick?.(now); } };
      window.__pad = parent !== window ? parent.__pad : { connected: true, mapping: "standard", id: "Snake acceptance standard controller", index: 0,
        axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ pressed: false, value: 0 })) };
      Object.defineProperty(navigator, "getGamepads", { value: () => [window.__pad] });
      window.__speech = 0; speechSynthesis.speak = () => { window.__speech++; };
      window.__drawnAssets = [];
      window.__poisonDraws = 0; window.__mainFilters = 0;
      const filter = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype,"filter");
      Object.defineProperty(CanvasRenderingContext2D.prototype,"filter",{...filter,set(value) {
        if (this.canvas.id==="game" && value!=="none") window.__mainFilters++;
        filter.set.call(this,value);
      }});
      const drawImage = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function(image, ...args) {
        if (this.canvas.id==="game" && image.dataset?.snakePoisonSprite) window.__poisonDraws++;
        if (image.src && !window.__drawnAssets.includes(image.src)) window.__drawnAssets.push(image.src);
        return drawImage.call(this, image, ...args);
      };
    }, { sourceKeys, key });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("response", r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    const act = selector => width === 390 ? page.locator(selector).tap() : page.locator(selector).click();
    const state = () => page.evaluate(() => window.__snakeDemo.getState());
    const step = n => page.evaluate(n => window.__step(n), n);
    const waitFor = predicate => page.waitForFunction(predicate, null, { polling: 50 });
    const waitReady = async () => { await waitFor(() => window.__snakeDemo?.getState().ready); await step(3); };
    const button = async (index, pressed, frames = 2) => page.evaluate(({ index, pressed, frames }) => {
      window.__pad.buttons[index] = { pressed, value: pressed ? 1 : 0 }; window.__step(frames);
    }, { index, pressed, frames });
    const beforeSource = async () => page.evaluate(keys => Object.fromEntries(keys.map(k => [k, localStorage.getItem(k)])), sourceKeys);
    await page.goto(base + `snake-game.html?test=snake-${width}`); await waitReady();
    const originalSource = await beforeSource();
    const initial = await state(); assert.equal(initial.paused, true); assert.equal(initial.learning.source, "hanzi");
    assert.equal(initial.upstream, "0.2.9"); assert.equal(initial.world.size, 12800);
    assert.equal(initial.virusSnakes.length, 5); assert.ok(initial.viruses.length > 20);
    assert.equal(initial.learning.targets[0], "0010"); assert.equal(initial.learning.targets.length, 5);
    assert.equal(initial.learning.type, "pinyin-to-hanzi");
    assert.equal(await page.locator("#fullscreenStars").isVisible(),false);
    assert.ok(initial.foods.every(food => Math.hypot(food.x-initial.head.x,food.y-initial.head.y)>=300), "choices leave room around the head");
    if (width === 390) {
      const { viewport, foods } = initial;
      for (const food of foods) {
        const x = (food.x - viewport.camera.x) * viewport.zoom + viewport.width / 2;
        const y = (food.y - viewport.camera.y) * viewport.zoom + viewport.height / 2;
        assert.ok(x >= 23 && x <= viewport.width - 23 && y >= 23 && y <= viewport.height - 23, "mobile choices appear inside visible stage");
      }
    }
    assert.equal(await page.locator("#targetGlyph").textContent(), initial.learning.prompt);
    assert.ok(await page.evaluate(() => window.__drawnAssets.some(s => s.includes("hanzi-star-v2.png"))));
    assert.ok(await page.evaluate(() => window.__drawnAssets.some(s => /virus-/.test(s))));
    assert.ok(await page.evaluate(() => performance.getEntriesByType("resource").some(r => r.name.includes("arena-floor-v2.jpg"))));
    const initialHead = initial.head; await step(120); assert.deepEqual((await state()).head, initialHead, "entry waits for explicit Continue");
    for (const [asset, signature] of [["flystar-head-v1.png", "89504e470d0a1a0a"], ["hanzi-star-v2.png", "89504e470d0a1a0a"], ["arena-floor-v2.jpg", "ffd8ff"], ["virus-super-v2.png", "89504e470d0a1a0a"], ["virus-small-mint-v1.png", "89504e470d0a1a0a"]]) {
      const response = await page.request.get(base + "assets/snake/" + asset); assert.equal(response.status(), 200);
      assert.ok((await response.body()).toString("hex").startsWith(signature));
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    for (const selector of ["#targetGlyph", ".game-topbar", "#game", "#batchCount"]) {
      const box = await page.locator(selector).boundingBox(); assert.ok(box.width > 0 && box.x >= 0 && box.x + box.width <= width + 1, selector);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight), true, "one-screen layout");
    assert.ok((await page.locator("#game").boundingBox()).height > 800, "stage uses the main screen area");
    assert.equal(await page.locator(".sidebar, .page-header, .stage-hint, .keyboard-hint").count(), 0);
    assert.equal(await page.locator("#settingsMenu").isVisible(), false);
    for (const height of [640, 430]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(80);
      const bounds = await page.locator("#game").boundingBox();
      const header = await page.locator(".game-topbar").boundingBox();
      assert.ok(bounds.height >= height - header.height - 35 && bounds.y + bounds.height <= height, "short viewport stays on screen");
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight), true);
    }
    await page.setViewportSize({ width, height: 960 }); await page.waitForTimeout(80);
    await page.screenshot({ path: `tmp/snake-ready-${width}.png`, fullPage: true });
    await page.evaluate(key=>{
      window.dispatchEvent(new Event("pagehide")); const saved=JSON.parse(localStorage.getItem(key));
      delete saved.choiceLayout;
      saved.foods.forEach(food=>{food.x=saved.head.x+80;food.y=saved.head.y;});
      sessionStorage.setItem("snake-acceptance-fixture",JSON.stringify(saved));
    },key);
    await page.reload(); await waitReady();
    assert.deepEqual((await state()).learning,initial.learning,"layout migration keeps learning progress");
    assert.ok((await state()).foods.every(food=>Math.hypot(food.x-initial.head.x,food.y-initial.head.y)>=300),"old nearby choices are repositioned");
    // Keyboard keeps native focused button Space; canvas directions cannot bypass a saved gate.
    await page.locator("#game").focus(); await page.keyboard.press("ArrowUp"); assert.equal((await state()).paused, true);
    await page.locator("#resumeButton").focus(); await page.keyboard.press("Space"); assert.equal((await state()).paused, false);
    await step(25); assert.notDeepEqual((await state()).head, initialHead);
    await act("#settingsButton");
    assert.equal((await state()).paused, true);
    const settingsHead = (await state()).head; await step(40); assert.deepEqual((await state()).head, settingsHead);
    assert.equal(await page.locator("#settingsButton").getAttribute("aria-expanded"), "true");
    await button(5, true); await button(5, false);
    assert.equal(await page.locator("#settingsMenu").isVisible(), false, "R1 closes settings before returning");
    assert.equal((await state()).paused, true);
    await act("#settingsButton"); await page.keyboard.press("Escape");
    assert.equal(await page.locator("#settingsMenu").isVisible(), false);
    await act("#resumeButton");
    const angle = (await state()).angle; await page.keyboard.down("ArrowDown"); await step(15); await page.keyboard.up("ArrowDown"); assert.notEqual((await state()).angle, angle);
    await page.keyboard.press("Space"); assert.equal((await state()).paused, true);
    if (width === 390) { await act("#resumeButton"); await act('[data-direction="left"]'); await step(10); assert.equal((await state()).paused, false); await page.keyboard.press("Space"); }
    await page.locator("#game").focus(); await step(3); await button(0, true, 20); assert.equal((await state()).paused, false, "A confirms once");
    await button(0, false); await button(9, true, 20); assert.equal((await state()).paused, true, "held Start does not resume again"); await button(9, false);
    await act("#resumeButton"); await step(3);
    const oldAngle = (await state()).angle;
    await page.evaluate(() => { window.__pad.axes[0] = -1; window.__step(12); });
    assert.notEqual((await state()).angle, oldAngle, "left stick controls snake without opening cursor menu");
    const analogAngle = (await state()).angle;
    await page.evaluate(() => { window.__pad.axes[0] = 0; window.__pad.axes[1] = .25; window.__step(15); window.__pad.axes[1] = 0; });
    assert.notEqual((await state()).angle, analogAngle, "Snake's 0.2 deadzone works below the bomb reader's 0.35 threshold");
    await page.evaluate(() => { window.__pad.axes[0] = 0; window.__step(3); window.__pad.axes[2] = .8; window.__step(8); });
    assert.equal((await state()).paused, false); assert.equal(await page.evaluate(() => STUDY_GAMEPAD_CURSOR.isMenuActive()), true);
    const menuHead = (await state()).head; await step(40); assert.notDeepEqual((await state()).head, menuHead,"cursor movement never pauses play");
    assert.equal(await page.locator("#pauseOverlay").isVisible(),false);
    await button(9,true,20); assert.equal((await state()).paused,true,"Menu/Start pauses even with cursor active");
    await button(9,false); await button(9,true); await button(9,false); assert.equal((await state()).paused,false);
    await page.evaluate(()=>window.dispatchEvent(new Event("blur"))); await step(3);
    assert.equal((await state()).paused,false,"focus/input reset does not create a rest prompt");
    await page.evaluate(() => { window.__pad.axes[2] = 0; window.__step(3); window.__pad.axes[2] = .8; window.__step(5); window.__pad.axes[2] = 0; window.__step(3); });
    await button(3, true); assert.equal(await page.evaluate(() => STUDY_GAMEPAD_CURSOR.isMenuActive()), false); assert.equal((await state()).paused, false); await button(3, false);
    await button(4, true); assert.equal(await page.evaluate(() => STUDY_AUDIO.isMuted()), true); await button(4, false);
    assert.equal(await page.locator("#speakButton").isDisabled(), true);
    await button(4, true); await button(4, false); await act("#speakButton"); assert.equal(await page.evaluate(() => window.__speech), 1);
    mouseMode = "system"; await button(8, true);
    await waitFor(() => STUDY_CONTROLLER_MOUSE.isActive());
    const viewHead = (await state()).head; await button(0, true, 30); assert.equal((await state()).paused, false); assert.deepEqual((await state()).head, viewHead);
    await button(0, false, 3); await button(8, false);
    await page.waitForTimeout(100);
    mouseMode = "web"; await button(8, true);
    await waitFor(() => !STUDY_CONTROLLER_MOUSE.isActive());
    await button(8, false, 3);
    // Actual collisions from explicit isolated save fixtures, using the original game loop.
    const collision = async correct => {
      await page.evaluate(({ key, correct }) => {
        window.dispatchEvent(new Event("pagehide"));
        const saved = JSON.parse(localStorage.getItem(key));
        const food = saved.foods.find(f => f.correct === correct);
        saved.head = { x: food.x - 48, y: food.y }; saved.angle = 0; saved.desiredAngle = 0;
        saved.lastDamageAt = -10;
        saved.points = [saved.head, { x: saved.head.x - 1000, y: saved.head.y }]; saved.camera = { ...saved.head };
        sessionStorage.setItem("snake-acceptance-fixture", JSON.stringify(saved));
      }, { key, correct });
      await page.reload(); await waitReady(); const before = await state();
      await act("#resumeButton"); await step(18); return { before, after: await state() };
    };
    let hit = await collision(false); assert.equal(hit.after.collected, hit.before.collected); assert.ok(hit.after.learning.retry.includes(hit.before.learning.active));
    assert.equal(hit.after.damage.hits, hit.before.damage.hits + 1); assert.equal(hit.after.length, hit.before.length - 2);
    hit = await collision(true); assert.equal(hit.after.collected, hit.before.collected + 1); assert.equal(hit.after.rewards.stars, hit.before.rewards.stars + 1);
    assert.equal(await page.locator("#fullscreenStarScore").textContent(),String(hit.after.rewards.stars),"star award updates fullscreen counter");
    assert.equal(hit.after.length, hit.before.length, "correct answers award stars; virus growth builds the body");
    assert.equal(hit.after.learning.done.length, 1); assert.ok(!hit.after.learning.retry.includes(hit.before.learning.active));
    await page.screenshot({ path: `tmp/snake-active-${width}.png`, fullPage: true });
    const savedState = await state(); await page.reload(); await waitReady(); const resumed = await state();
    assert.equal(resumed.paused, true); assert.deepEqual(resumed.head, savedState.head); assert.deepEqual(resumed.foods, savedState.foods);
    assert.deepEqual(resumed.learning.counts, savedState.learning.counts); assert.deepEqual(resumed.learning.done, savedState.learning.done);
    await act("#settingsButton"); await act("#autoButton");
    const checkpoint = await page.evaluate(key => localStorage.getItem(key), key);
    await step(600); assert.ok((await state()).collected > resumed.collected);
    assert.equal(await page.evaluate(key => localStorage.getItem(key), key), checkpoint, "demo does not overwrite real progress");
    await act("#startButton"); assert.equal((await state()).collected, resumed.collected); assert.deepEqual((await state()).learning.counts, resumed.learning.counts);
    for (let i = 0; i < 4; i++) await collision(true);
    assert.equal((await state()).learning.batch, 2); assert.equal((await state()).learning.done.length, 0);
    assert.equal((await state()).paused, false, "five targets advance automatically without interrupting play");
    assert.equal(await page.locator("#pauseOverlay").isVisible(), false);
    assert.doesNotMatch(await page.locator("#batchCount").textContent(), /关/);
    assert.equal((await state()).learning.type, "hanzi-to-pinyin");
    assert.equal(await page.locator("#targetGlyph").textContent(), (await state()).learning.prompt);
    assert.ok((await state()).foods.every(f => /^[a-züāáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜ /]+$/u.test(f.glyph)));
    await step(3); await page.screenshot({ path: `tmp/snake-pinyin-${width}.png`, fullPage: true });
    const countSum = counts => Object.values(counts).reduce((a, b) => a + b, 0);
    const beforeDemoReset = countSum((await state()).learning.counts);
    await act("#settingsButton"); await act("#autoButton"); await step(600); await act("#resetButton");
    assert.equal((await state()).collected, 0); assert.equal((await state()).paused, true);
    assert.equal(countSum((await state()).learning.counts), beforeDemoReset + 1, "resetting from demo never imports its appearance history");
    // New gameplay uses the real loop with controlled virus positions, independent of learning answers.
    const virusFixture = async tier => {
      await page.evaluate(({key,tier}) => {
        window.dispatchEvent(new Event("pagehide"));
        const saved = JSON.parse(localStorage.getItem(key));
        saved.config.speed = 0; saved.config.virusSnakeCount = 0;
        const field = saved.ecosystem.field;
        const virus = structuredClone(field.cells.flatMap(c => c[1]).find(v => v.tier !== "super"));
        for (const [,cell] of field.cells) for (const v of cell) v.consumed = true;
        field.drops = [{...virus,id:"fixture-virus",tier,x:saved.head.x,y:saved.head.y,homeX:saved.head.x,homeY:saved.head.y,consumed:false}];
        saved.ecosystem.enemies.snakes = []; saved.ecosystem.enemies.respawns = [];
        saved.rewards.growthPoints = tier === "large" ? 5 : 0;
        saved.lastDamageAt = -10; saved.damageFlashUntil = -10;
        sessionStorage.setItem("snake-acceptance-fixture", JSON.stringify(saved));
      }, {key,tier});
      await page.reload(); await waitReady(); const before = await state();
      await act("#resumeButton"); await step(3); return {before,after:await state()};
    };
    let gameplay = await virusFixture("large");
    assert.equal(gameplay.after.length, gameplay.before.length + 1); assert.equal(gameplay.after.rewards.growthPoints, 0);
    assert.equal(gameplay.after.collected, gameplay.before.collected, "virus growth never completes a learning answer");
    gameplay = await virusFixture("super");
    assert.equal(gameplay.after.length, gameplay.before.length - 2); assert.equal(gameplay.after.damage.hits, gameplay.before.damage.hits + 1);
    await step(20); assert.equal((await state()).damage.hits, gameplay.after.damage.hits, "damage cooldown prevents immediate repeated loss");
    await page.evaluate(key => {
      window.dispatchEvent(new Event("pagehide")); const saved = JSON.parse(localStorage.getItem(key));
      const template = saved.ecosystem.field.cells.flatMap(c=>c[1])[0];
      saved.ecosystem.field.drops = [["small",180],["medium",220],["large",200],["small",-180]].map(([tier,dx],i)=>
        ({...template,id:`vacuum-${i}`,tier,x:saved.head.x+dx,y:saved.head.y,homeX:saved.head.x+dx,homeY:saved.head.y,consumed:false}));
      saved.angle = saved.desiredAngle = 0; saved.rewards.growthPoints = 0; saved.lastDamageAt = -10;
      saved.foods.forEach((food,i)=>{ food.x=saved.head.x+480; food.y=saved.head.y+i*140; });
      sessionStorage.setItem("snake-acceptance-fixture",JSON.stringify(saved));
    },key);
    await page.reload(); await waitReady(); await act("#resumeButton");
    await page.keyboard.down("f"); await step(30);
    assert.equal((await state()).vacuum.active,true); assert.equal((await state()).rewards.growthPoints,4);
    assert.ok(!(await state()).viruses.some(v=>["vacuum-0","vacuum-1"].includes(v.id)));
    assert.ok((await state()).viruses.some(v=>v.id==="vacuum-2")); assert.ok((await state()).viruses.some(v=>v.id==="vacuum-3"));
    await page.screenshot({path:`tmp/snake-vacuum-${width}.png`});
    await step(170); assert.equal((await state()).vacuum.active,false, "holding never extends the three-second vacuum");
    await page.keyboard.up("f"); await page.keyboard.down("f"); await step(2); assert.equal((await state()).vacuum.active,true);
    await page.keyboard.up("f"); await step(2); assert.equal((await state()).vacuum.active,false);
    await button(2,true); assert.equal((await state()).vacuum.active,true); await button(2,false); assert.equal((await state()).vacuum.active,false);
    await page.evaluate(key => {
      window.dispatchEvent(new Event("pagehide")); const saved=JSON.parse(localStorage.getItem(key));
      saved.config.speed=100; saved.config.alignedSpeedBoost=75; saved.angle=saved.desiredAngle=0;
      saved.ecosystem.field.drops=[];
      sessionStorage.setItem("snake-acceptance-fixture",JSON.stringify(saved));
    },key);
    await page.reload(); await waitReady(); await act("#resumeButton");
    assert.equal((await state()).config.alignedSpeedBoost,75);
    await page.keyboard.down("ArrowRight"); await step(12); assert.equal((await state()).speed,175);
    await page.keyboard.up("ArrowRight"); await step(2); assert.equal((await state()).speed,100);
    await page.keyboard.down("ArrowDown"); await step(1); assert.equal((await state()).speed,100);
    await step(90); assert.equal((await state()).speed,175); await page.keyboard.up("ArrowDown");
    // Isolate timed poison and actual configurable keyboard/controller/touch actions.
    await page.evaluate(key=>{
      window.dispatchEvent(new Event("pagehide")); const saved=JSON.parse(localStorage.getItem(key));
      saved.config.speed=100; saved.config.virusSnakeCount=0; saved.config.poisonInterval=5;
      saved.config.poisonTickInterval=.5; saved.config.poisonTailLoss=1; saved.config.antidoteCost=3;
      saved.config.vacuumRange=400; saved.bindings={vacuum:{key:"KeyH",button:6},antidote:{key:"KeyJ",button:11}};
      saved.poison={active:false,nextPoisonAt:saved.clock+5,nextDamageAt:saved.clock+.5,poisonings:0};
      saved.collected=saved.rewards.stars=2; saved.glyphs=Array(12).fill("★");
      saved.ecosystem.field.drops=[]; saved.ecosystem.enemies.snakes=[]; saved.ecosystem.enemies.respawns=[];
      for (const [,cell] of saved.ecosystem.field.cells) for (const v of cell) v.consumed=true;
      sessionStorage.setItem("snake-acceptance-fixture",JSON.stringify(saved));
    },key);
    await page.reload(); await waitReady(); const healthy=await state();
    await step(400); assert.equal((await state()).poison.active,false,"paused time never poisons");
    await act("#resumeButton"); await step(307); assert.equal((await state()).poison.active,true);
    assert.equal((await state()).speed,50,"poison moves at half the normal speed");
    assert.equal((await state()).length,healthy.length); await step(33);
    assert.equal((await state()).length,healthy.length-1);
    await page.keyboard.press("j"); assert.equal((await state()).poison.active,true,"insufficient stars cannot cure");
    await page.screenshot({path:`tmp/snake-poison-${width}.png`});
    assert.ok(await page.evaluate(()=>__poisonDraws>0),"poison uses cached green sprites");
    assert.equal(await page.evaluate(()=>__mainFilters),0,"no per-frame full-canvas or per-segment filters");
    await page.keyboard.down("f"); await step(2); assert.equal((await state()).vacuum.active,false,"old shortcut stops acting"); await page.keyboard.up("f");
    await page.keyboard.down("h"); await step(2); assert.equal((await state()).vacuum.active,true); await page.keyboard.up("h");
    await button(6,true); assert.equal((await state()).vacuum.active,true); await button(6,false);
    await page.evaluate(key=>{
      window.dispatchEvent(new Event("pagehide")); const saved=JSON.parse(localStorage.getItem(key));
      saved.collected=saved.rewards.stars=8; sessionStorage.setItem("snake-acceptance-fixture",JSON.stringify(saved));
    },key);
    await page.reload(); await waitReady(); assert.equal((await state()).poison.active,true,"refresh retains poison");
    await act("#resumeButton"); await page.keyboard.press("j");
    assert.equal((await state()).poison.active,false); assert.equal((await state()).collected,5);
    assert.equal(await page.locator("#fullscreenStarScore").textContent(),"5","cure updates current owned stars");
    await step(2); assert.equal((await state()).speed,100,"cure restores normal speed");
    const curedLength=(await state()).length;
    await step(120); assert.equal((await state()).length,curedLength,"cure stops tail loss");
    await step(190); assert.equal((await state()).poison.active,true,"poison returns after configured interval");
    await button(11,true); await button(11,false);
    assert.equal((await state()).poison.active,false); assert.equal((await state()).collected,2);
    if (width===390) {
      const vacuumButton=await page.locator("#vacuumButton").boundingBox();
      await page.mouse.move(vacuumButton.x+vacuumButton.width/2,vacuumButton.y+vacuumButton.height/2); await page.mouse.down();
      await step(2); assert.equal((await state()).vacuum.active,true);
      await page.mouse.up();
      await step(2); assert.equal((await state()).vacuum.active,false);
    }
    await act("#tuningToggle");
    await act(".tuning-group:nth-of-type(2) summary");
    await page.locator("#tune-speed").fill("175"); await page.locator("#tune-speed").dispatchEvent("change");
    const ecosystem = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).ecosystem, key);
    await page.reload(); await waitReady();
    assert.equal((await state()).config.speed, 175); assert.equal((await state()).paused, true);
    assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).ecosystem,key), ecosystem);
    // v0.1.0 snapshots migrate without losing questions, appearance history or body length.
    const old = await state();
    await page.evaluate(key => {
      const saved = JSON.parse(localStorage.getItem(key)); saved.version = 1; saved.glyphs.fill("字");
      for (const name of ["config","ecosystem","rewards","clock","damageHits","lastDamageAt","damageFlashUntil","capturedSuper"]) delete saved[name];
      sessionStorage.setItem("snake-acceptance-fixture",JSON.stringify(saved));
    },key);
    await page.reload(); await waitReady();
    assert.deepEqual((await state()).learning,old.learning); assert.equal((await state()).length,old.length);
    assert.equal((await state()).collected,old.collected); assert.equal((await state()).config.speed,201);
    assert.deepEqual(await beforeSource(), originalSource, "all foreign source keys are unchanged");
    // Real fullscreen via a trusted click; gamepad R2 uses the same single handler.
    await act("#settingsButton"); await act("#fullscreenButton"); await waitFor(() => Boolean(document.fullscreenElement));
    await waitFor(() => document.body.classList.contains("snake-fullscreen"));
    assert.equal(await page.locator(".game-topbar").isVisible(), false);
    assert.equal(await page.locator("#settingsMenu").isVisible(), false);
    assert.equal(await page.locator("#fullscreenTarget").textContent(), (await state()).learning.prompt);
    assert.equal(await page.locator("#fullscreenStars").isVisible(),true);
    assert.equal(await page.locator("#fullscreenStarScore").textContent(),String((await state()).rewards.stars));
    const badge=await page.locator("#fullscreenStars").boundingBox();
    const targetBox=await page.locator("#fullscreenTarget").boundingBox();
    assert.ok(badge.y>=0 && badge.y<40 && badge.x>width/2 && badge.x+badge.width<=width,"stars stay at top right");
    assert.ok(targetBox.x+targetBox.width<=badge.x,"target and stars do not overlap");
    assert.equal(await page.locator("#fullscreenStars img").evaluate(img=>img.complete&&img.naturalWidth>0),true);
    const fullStage = await page.locator("#game").boundingBox();
    const screenSize = await page.evaluate(() => ({ width:innerWidth,height:innerHeight }));
    assert.ok(Math.abs(fullStage.width - screenSize.width) < 2 && Math.abs(fullStage.height - screenSize.height) < 2);
    await waitFor(() => window.__snakeDemo.getState().viewport.height === innerHeight);
    await act("#resumeButton"); await step(3);
    await button(1,true); await button(1,false);
    assert.equal(await page.evaluate(()=>Boolean(document.fullscreenElement)),true,"B never toggles fullscreen");
    await page.screenshot({ path:`tmp/snake-fullscreen-${width}.png` });
    await page.evaluate(() => { window.__pad.buttons[7] = { pressed: false, value: 0 }; window.__step(3); });
    await button(7, true); await waitFor(() => !document.fullscreenElement); await button(7, false);
    await waitFor(() => !document.body.classList.contains("snake-fullscreen"));
    assert.equal(await page.locator(".game-topbar").isVisible(), true);
    assert.equal(await page.locator("#fullscreenStars").isVisible(),false);
    // Focused return link retains native Enter; shell keeps exactly one owner.
    await page.locator("#snakeBack").focus(); await page.keyboard.press("Enter");
    await waitFor(() => STUDY_FULLSCREEN_SHELL.activeWindow()?.location.pathname.endsWith("/index.html"));
    assert.equal(await page.locator("#study-gamepad-cursor").count(), 1);
    assert.equal(await page.frameLocator("#study-module-frame").locator("#snakeGameEntry").count(), 1);
    await page.frameLocator("#study-module-frame").locator("#snakeGameEntry").click();
    await waitFor(() => STUDY_FULLSCREEN_SHELL.activeWindow()?.__snakeDemo?.getState().ready);
    assert.equal(await page.frameLocator("#study-module-frame").locator("#study-gamepad-cursor").count(), 0);
    assert.equal(await page.evaluate(() => STUDY_FULLSCREEN_SHELL.activeWindow().__snakeDemo.getState().paused), true);
    await step(4); await button(0, true, 8); await button(0, false);
    assert.equal(await page.evaluate(() => STUDY_FULLSCREEN_SHELL.activeWindow().__snakeDemo.getState().paused), false, "embedded game shares owner controller");
    await button(9,true); await button(9,false);
    await page.evaluate(() => {
      const target = STUDY_FULLSCREEN_SHELL.activeWindow().document.getElementById("resumeButton");
      window.__pad.axes[2] = .8; window.__step(3); window.__pad.axes[2] = 0;
      const box = target.getBoundingClientRect(), desired = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      for (let i = 0; i < 200; i++) {
        const cursor = document.getElementById("study-gamepad-cursor");
        const dx = desired.x - parseFloat(cursor.style.left), dy = desired.y - parseFloat(cursor.style.top);
        if (Math.hypot(dx, dy) < 5) break;
        const axis = delta => Math.abs(delta) < 2 ? 0 : Math.sign(delta) * (.25 + .75 * Math.min(1, Math.abs(delta) / 45));
        window.__pad.axes[2] = axis(dx); window.__pad.axes[3] = axis(dy); window.__step();
      }
      window.__pad.axes[2] = window.__pad.axes[3] = 0; window.__step(3);
    });
    assert.equal(await page.evaluate(() => STUDY_FULLSCREEN_SHELL.activeWindow().__snakeDemo.getState().paused), true);
    await button(0, true, 12); await button(0, false);
    assert.equal(await page.evaluate(() => STUDY_GAMEPAD_CURSOR.isMenuActive()), false, "A cursor click leaves embedded game menu once");
    assert.equal(await page.evaluate(() => STUDY_FULLSCREEN_SHELL.activeWindow().__snakeDemo.getState().paused), false);
    await page.evaluate(() => { window.__pad.buttons[5] = { pressed: false, value: 0 }; window.__step(3); window.__pad.buttons[5] = { pressed: true, value: 1 }; window.__step(2); });
    await waitFor(() => STUDY_FULLSCREEN_SHELL.activeWindow()?.location.pathname.endsWith("/index.html"));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.frameLocator("#study-module-frame").locator("#snakeGameEntry").click();
    await waitFor(() => STUDY_FULLSCREEN_SHELL.activeWindow()?.__snakeDemo?.getState().ready);
    const embedded = page.frameLocator("#study-module-frame");
    await embedded.locator("#settingsButton").click(); await embedded.locator("#fullscreenButton").click();
    await waitFor(() => Boolean(document.fullscreenElement)); await step(3);
    assert.equal(await embedded.locator(".game-topbar").isVisible(), false, "embedded Snake follows the owner's fullscreen state");
    assert.equal(await embedded.locator("#fullscreenStars").isVisible(),true,"hosted fullscreen shows stars too");
    assert.equal(await embedded.locator("#fullscreenTarget").textContent(), await page.evaluate(() => STUDY_FULLSCREEN_SHELL.activeWindow().__snakeDemo.getState().learning.prompt));
    await button(7,true); await waitFor(() => !document.fullscreenElement); await button(7,false); await step(3);
    assert.equal(await embedded.locator(".game-topbar").isVisible(), true);
    assert.deepEqual(errors, []);
    results.push({ width, realBrowser: "Microsoft Edge", upstream:"0.2.9", sourceIsolation: true, virusGrowthDamage:true, migration:true, configPersistence:true, bidirectional: true, savedContinue: true, simulatedGamepad: true, resources: "200", errors });
    await context.close();
  }
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
