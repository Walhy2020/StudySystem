import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { loadChromium } from "./playwright-runtime.mjs";

const base = process.env.HANZI_BASE_URL || "http://127.0.0.1:5177/";
const names = ["拼音", "汉字", "单词", "Book1", "主题", "情景", "总复习", "音标"];
const pages = ["pinyin", "index", "word-learning", "book-learning", "theme-learning", "scenario-learning", "review-learning", "phonetics"];
mkdirSync("tmp", { recursive: true });
const browser = await (await loadChromium()).launch({ headless: true,
  executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" });
const results = [];
try {
  for (const width of [1440, 827, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 960 }, hasTouch: width === 390 });
    await context.route("**/api/controller-mouse**", route => route.fulfill({ json: { supported: false, mode: "web" } }));
    await context.addInitScript(() => {
      speechSynthesis.speak = () => {};
      window.__writes = [];
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (this === localStorage) window.__writes.push(key);
        return set.call(this, key, value);
      };
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("response", response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    const act = selector => width === 390 ? page.locator(selector).tap() : page.locator(selector).click();
    const noOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    for (const name of pages) {
      await page.goto(`${base}${name}.html?test=theme-list-${width}`);
      await page.locator("nav[aria-label='学习模块']").waitFor();
      assert.deepEqual(await page.locator("nav[aria-label='学习模块'] > a,nav[aria-label='学习模块'] > span").allTextContents().then(labels => labels.map(label => label.trim())), names, `${width} ${name}`);
      await noOverflow();
    }
    await page.goto(`${base}scenario-learning.html?test=theme-list-${width}`);
    await page.waitForFunction(() => document.querySelectorAll(".scenario-card").length >= 11);
    const scenarioColumns = await page.locator(".scenario-list").evaluate(node => getComputedStyle(node).gridTemplateColumns.split(" ").length);
    await page.goto(`${base}theme-learning.html?test=theme-list-${width}`);
    await page.waitForFunction(() => Boolean(window.__THEME_LEARNING__));
    assert.equal(await page.locator(".theme-series-cell").count(), 6);
    assert.equal(await page.locator(".theme-series-list").evaluate(node => getComputedStyle(node).gridTemplateColumns.split(" ").length), scenarioColumns);
    const geometry = await page.locator(".theme-series-cell").evaluateAll(nodes => nodes.map(node => {
      const box = node.getBoundingClientRect(), copy = node.querySelector(".series-cell-copy"), preview = node.querySelector(".series-preview").getBoundingClientRect();
      const image = node.querySelector(".series-preview img")?.getBoundingClientRect();
      return { x: box.x, y: box.y, bottom: box.bottom, right: box.right, width: box.width, height: box.height,
        preview: { width: preview.width, height: preview.height }, clipped: copy.scrollWidth > copy.clientWidth || copy.scrollHeight > copy.clientHeight,
        imageFits: !image || (image.height <= preview.height + 1 && image.width <= preview.width + 1) };
    }));
    assert.ok(geometry.every(box => box.x >= 0 && box.right <= width && !box.clipped), JSON.stringify(geometry));
    assert.ok(geometry.at(-1).y > geometry[0].bottom, "list wraps down rather than overflowing sideways");
    for (let i = scenarioColumns; i < geometry.length; i++) assert.ok(geometry[i].y >= geometry[i - scenarioColumns].bottom);
    assert.ok(geometry.every(box => box.preview.height >= 230));
    assert.ok(geometry.every(box => box.imageFits), "preview images must stay within their actual grid track");
    if (width === 390) assert.ok(geometry.every(box => Math.abs(box.preview.width - box.width + 2) < 2), "mobile image stacks above text");
    await page.screenshot({ path: `tmp/theme-list-${width}.png`, fullPage: true });

    // Every existing group and theme remains reachable via real controls.
    const seriesIds = await page.locator("[data-series-id]").evaluateAll(nodes => nodes.map(node => node.dataset.seriesId));
    let themeCount = 0;
    for (const seriesId of seriesIds) {
      const selector = `[data-series-id='${seriesId}']`;
      if (seriesId === "basics") {
        await page.locator(selector).focus(); await page.keyboard.press("Enter");
      } else await act(selector);
      assert.equal(await page.locator("#themeSeriesList").isHidden(), true);
      const themeIds = await page.locator(".theme-card:visible [data-theme-id]").evaluateAll(nodes => nodes.map(node => node.dataset.themeId));
      themeCount += themeIds.length;
      for (const themeId of themeIds) {
        await act(`[data-theme-id='${themeId}']`);
        assert.equal(await page.locator("#learningView").isVisible(), true);
        assert.equal(await page.evaluate(() => window.__THEME_LEARNING__.activeThemeId), themeId);
        await act("#backToThemes");
      }
      await noOverflow();
      await act("#backToSeries");
    }
    assert.equal(themeCount, 14);

    await page.locator("[data-series-id='basics']").focus(); await page.keyboard.press("Space");
    await act("#startTheme");
    await page.locator("#bodyScene [data-target='head']").focus(); await page.keyboard.press("Enter");
    assert.equal((await page.locator(".word-en").textContent()).trim(), "head");
    await page.evaluate(() => {
      const api = window.__THEME_LEARNING__;
      for (const word of api.themes.body.words) api.selectTarget(word.id);
    });
    await act("#completeThemeLearning");
    await act("#backToThemes");
    assert.equal(await page.evaluate(() => window.__THEME_LEARNING__.progress.store.isThemeLearned("body")), true);
    await page.evaluate(() => {
      const api = window.__THEME_LEARNING__;
      for (const id of api.series.basics.themeIds) api.progress.markReviewed(id);
      api.syncThemeCards();
    });
    await act("#backToSeries");
    assert.equal(await page.locator("[data-series-id='basics']").evaluate(node => node.classList.contains("is-complete")), true);
    await page.screenshot({ path: `tmp/theme-list-complete-${width}.png`, fullPage: true });
    assert.ok((await page.evaluate(() => window.__writes)).every(key => key === "mario-theme-learned-v1"));
    await page.reload(); await page.waitForFunction(() => Boolean(window.__THEME_LEARNING__));
    assert.equal(await page.locator("[data-series-id='basics']").evaluate(node => node.classList.contains("is-complete")), true);
    assert.equal(await page.locator("[data-series-id='basics'] [data-series-progress]").textContent(), "3/3 已复习");
    const writes = await page.evaluate(() => window.__writes);
    assert.ok(writes.every(key => key === "mario-theme-learned-v1"), JSON.stringify(writes));
    await noOverflow();
    // Actual shared-shell navigation still lands on Scenario with the shortened label.
    await act("nav a[href='./scenario-learning.html']");
    await page.waitForURL(url => url.pathname.endsWith("scenario-learning.html"));
    const frame = page.frameLocator("#study-module-frame");
    await frame.locator(".scenario-nav [aria-current='page']").waitFor();
    assert.equal(await frame.locator(".scenario-nav [aria-current='page']").textContent(), "情景");
    assert.deepEqual(errors, []);
    results.push({ width, themeCount, columns: scenarioColumns, overflow: false });
    await context.close();
  }
  console.log(JSON.stringify({ browser: "Microsoft Edge", results }, null, 2));
} finally { await browser.close(); }
