import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MID_AUTUMN_WORDS, THEME_CONFIGS, THEME_SERIES, splitPhonetic, ThemeSession } from "../theme-learning.js";
import { buildThemeCatalog, ThemeLearnedStore } from "../src/theme-overview.js";
import { buildTotalWordLibrary } from "../src/total-word-library.js";

test("中秋六词、英式音标和节日分组准确，使用茶而非柚子", () => {
  assert.deepEqual(MID_AUTUMN_WORDS.map(w => [w.word, w.phonetic, w.chinese]), [
    ["moon", "/muːn/", "月亮"], ["mooncake", "/ˈmuːnkeɪk/", "月饼"],
    ["lantern", "/ˈlæntən/", "灯笼"], ["rabbit", "/ˈræbɪt/", "兔子"],
    ["tea", "/tiː/", "茶"], ["family", "/ˈfæməli/", "家人"]
  ]);
  assert.deepEqual(THEME_SERIES.festivals.themeIds, ["midAutumn"]);
  assert.equal(THEME_CONFIGS.midAutumn.words, MID_AUTUMN_WORDS);
  assert.deepEqual(splitPhonetic(MID_AUTUMN_WORDS[1].phonetic), ["ˈ", "m", "uː", "n", "k", "eɪ", "k"]);
  assert.deepEqual(splitPhonetic(MID_AUTUMN_WORDS[4].phonetic), ["t", "iː"]);
  const session = new ThemeSession(MID_AUTUMN_WORDS, () => 0.4);
  assert.equal(new Set(session.questions).size, 6);
  for (let index = 0; index < 6; index++) assert.equal(session.answer(session.target().id).status, "correct");
  assert.equal(session.complete, true);
});

test("中秋PNG为1536x1024，六幅裁图在画布内且互不重叠", () => {
  const bytes = readFileSync(new URL("../assets/themes/mid-autumn/mid-autumn-scene-v1.png", import.meta.url));
  assert.equal(bytes.subarray(0,8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(bytes.readUInt32BE(16), 1536);
  assert.equal(bytes.readUInt32BE(20), 1024);
  const entries = buildThemeCatalog(THEME_CONFIGS).filter(w => w.themeId === "midAutumn");
  const boxes = entries.map(w => w.art.viewBox.split(" ").map(Number));
  for (const [index, [x,y,w,h]] of boxes.entries()) {
    assert.ok(x >= 0 && y >= 0 && x+w <= 1536 && y+h <= 1024);
    for (const [xx,yy,ww,hh] of boxes.slice(index+1)) assert.ok(x+w <= xx || xx+ww <= x || y+h <= yy || yy+hh <= y);
  }
});

test("中秋学习完毕六词入总词库，复习完成独立保存且月亮不重复", () => {
  const catalog = buildThemeCatalog(THEME_CONFIGS), data = new Map(), writes = [];
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key,value) => { writes.push(key); data.set(key,value); } };
  const store = new ThemeLearnedStore(catalog, storage);
  assert.equal(buildTotalWordLibrary(catalog, storage).length, 0);
  store.recordTheme("midAutumn");
  assert.equal(store.isThemeLearned("midAutumn"), true);
  assert.equal(store.isThemeReviewed("midAutumn"), false);
  assert.deepEqual(buildTotalWordLibrary(catalog, storage).map(w=>w.word).sort(), MID_AUTUMN_WORDS.map(w=>w.word).sort());
  store.markReviewed("midAutumn");
  assert.equal(new ThemeLearnedStore(catalog, storage).isThemeReviewed("midAutumn"), true);
  store.recordTheme("items1");
  assert.equal(buildTotalWordLibrary(catalog, storage).filter(w=>w.word === "moon").length, 1);
  assert.ok(writes.every(key => key === "mario-theme-learned-v1"));
});
