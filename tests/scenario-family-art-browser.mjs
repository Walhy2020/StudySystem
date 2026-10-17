// Focused art-replacement acceptance; no unrelated lesson/game flows.
import assert from "node:assert/strict";
import { loadChromium } from "./playwright-runtime.mjs";
import { DAILY_LIFE_SCENARIOS } from "../data/daily-life-scenarios.js";

const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:53177/";
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const results = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 960 }, hasTouch: width === 390, reducedMotion: "reduce" });
    await context.route("**/api/controller-mouse**", route => route.fulfill({ json: { supported: false, mode: "web" } }));
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    const act = selector => width === 390 ? page.locator(selector).tap() : page.locator(selector).click();
    await page.goto(new URL(`scenario-learning.html?test=family-art-${width}`, base).href);
    for (const name of ["home-mom-sprite-v5", "home-dad-sprite-v4", "home-grandma-sprite-v3", "home-brother-sprite-v3", "home-sister-sprite-v3"]) {
      const response = await page.request.get(new URL(`assets/scenarios/${name}.png`, base).href);
      assert.equal(response.status(), 200);
      assert.match(response.headers()["content-type"], /image\/png/);
    }
    for (const scene of DAILY_LIFE_SCENARIOS) {
      await act(`[data-scenario-id="${scene.id}"] [data-start-label]`);
      // Reveal both actors without triggering real speech.
      await page.evaluate(() => window.__SCENARIO_LEARNING__.store.patch({ lineIndex: 3 }));
      await page.evaluate(id => window.__SCENARIO_LEARNING__.enterScenario(id, true), scene.id);
      for (const [index, definition] of scene.actors.entries()) {
        const actor = page.locator(index === 0 ? "#actorMia" : "#actorLeo");
        await actor.evaluate(image => image.decode());
        assert.equal(await actor.getAttribute("src"), definition.image);
        assert.equal(await actor.getAttribute("aria-hidden"), "false");
        assert.equal(await actor.evaluate(image => getComputedStyle(image).objectFit), "contain");
      }
      const geometry = await page.locator("#actorStage").evaluate(stage => {
        const r = stage.getBoundingClientRect();
        return [...stage.querySelectorAll(".scene-actor")].every(actor => {
          const a = actor.getBoundingClientRect();
          return a.width > 0 && a.height > 0 && a.left >= r.left && a.right <= r.right && a.top >= r.top && a.bottom <= r.bottom;
        });
      });
      assert.ok(geometry);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      if (scene.id === "getting-up") {
        await page.locator("#actorStage").screenshot({ path: `tmp/family-cartoon-stage-${width}.png` });
        await act("#practiceStage");
        assert.equal(await page.locator("#dialogueAligned small:visible").count(), 0);
        await act("#revealDialogue");
        assert.ok(await page.locator("#dialogueAligned small:visible").count() > 0);
        assert.equal(await page.locator("#dialogueAligned strong:visible").count(), 0);
        await act("#revealDialogue");
        assert.ok(await page.locator("#dialogueAligned strong:visible").count() > 0);
      }
      await act("#backToScenarios");
    }
    assert.deepEqual(errors, []);
    results.push({ width, scenes: DAILY_LIFE_SCENARIOS.length, images: "HTTP200", clipping: false });
    await context.close();
  }
  console.log(JSON.stringify({ ok: true, browser: "Microsoft Edge", results }));
} finally { await browser.close(); }
