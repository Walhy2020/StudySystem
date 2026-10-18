import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("八个学习页面导航统一使用主题、情景短标题且保留导航顺序", () => {
  for (const name of ["index", "pinyin", "word-learning", "book-learning", "theme-learning", "scenario-learning", "review-learning", "phonetics"]) {
    const html = readFileSync(new URL(`../${name}.html`, import.meta.url), "utf8");
    const nav = html.match(/<nav[\s\S]*?<\/nav>/)[0];
    const labels = Array.from(nav.matchAll(/<(?:a|span)\b[^>]*>([^<]+)<\/(?:a|span)>/g), match => match[1]);
    assert.deepEqual(labels, ["拼音", "汉字", "单词", "Book1", "主题", "情景", "总复习", "音标"], name);
  }
  for (const [name, title] of [["theme-learning", "主题"], ["scenario-learning", "情景"]]) {
    const html = readFileSync(new URL(`../${name}.html`, import.meta.url), "utf8");
    assert.ok(html.includes(`<title>马里奥学习系统 · ${title}</title>`));
    assert.ok(html.includes(`<h1>${title}</h1>`));
  }
});

test("主题系列改为与情景相同的纵向换行列表，不保留横向滑动与固定卡宽", () => {
  const css = readFileSync(new URL("../theme-learning.css", import.meta.url), "utf8");
  assert.match(css, /\.theme-series-list\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:1050px\)\{\.theme-series-list\{grid-template-columns:1fr\}/);
  assert.match(css, /@media\(max-width:560px\)\{\.theme-series-cell\{grid-template-columns:1fr\}/);
  assert.doesNotMatch(css, /\.theme-series-list\{[^}]*(?:overflow-x|scroll-snap|margin-right:-)/);
  assert.doesNotMatch(css, /\.theme-series-cell\{[^}]*(?:flex-basis|flex:0 0)/);
});
