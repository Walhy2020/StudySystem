import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { displaySymbol, exampleEntries } from "../src/phonetics-display.js";

globalThis.window = {};
await import("../data/phonetics.js");
await import("../data/phonetics-transcriptions.js");

const items = window.MARIO_PHONETICS;
const transcriptions = window.MARIO_PHONETIC_EXAMPLE_TRANSCRIPTIONS;
const expectedSymbols = [
  "/i:/", "/ɪ/", "/e/", "/æ/", "/ɜ:/", "/ə/", "/ʌ/", "/u:/", "/ʊ/", "/ɔ:/", "/ɒ/", "/ɑ:/",
  "/eɪ/", "/aɪ/", "/ɔɪ/", "/əʊ/", "/aʊ/", "/ɪə/", "/eə/", "/ʊə/",
  "/p/", "/b/", "/t/", "/d/", "/k/", "/ɡ/", "/f/", "/v/", "/θ/", "/ð/", "/s/", "/z/", "/ʃ/", "/ʒ/",
  "/h/", "/tʃ/", "/dʒ/", "/tr/", "/dr/", "/ts/", "/dz/", "/m/", "/n/", "/ŋ/", "/l/", "/r/", "/j/", "/w/",
];

test("旧系统 DJ 运行数据裁定为固定 48 音标，ID 和符号唯一", () => {
  assert.equal(items.length, 48);
  assert.equal(new Set(items.map((item) => item.id)).size, 48);
  assert.equal(new Set(items.map((item) => item.symbol)).size, 48);
  assert.deepEqual(items.map((item) => item.symbol), expectedSymbols);
  assert.equal(items.some((item) => item.id === "phonics-i-happy" || item.symbol === "/i/"), false);
});

test("元辅音与旧 DJ 48 子分类数量一致且字段完整", () => {
  const counts = Object.fromEntries([...new Set(items.map((item) => item.letters[0]))]
    .map((category) => [category, items.filter((item) => item.letters[0] === category).length]));
  assert.equal(items.filter((item) => item.title === "DJ 元音").length, 20);
  assert.equal(items.filter((item) => item.title === "DJ 辅音").length, 28);
  assert.deepEqual(counts, {
    "长元音": 5, "短元音": 7, "双元音": 8,
    "清辅音": 11, "浊辅音": 10, "鼻音": 3, "舌侧音": 1, "摩擦音": 1, "半元音": 2,
  });
  assert.ok(items.every((item) =>
    /^phonics-/.test(item.id) && /^\/.+\/$/.test(item.symbol) &&
    item.letters.length === 1 && item.examples.length === 3 &&
    item.examples.every((example) => /^[a-z-]+$/i.test(example))));
});

test("目标音标展示只剥离成对外层斜杠，原始 48 项数据保持来源格式", () => {
  assert.deepEqual(items.map((item) => displaySymbol(item.symbol)), expectedSymbols.map((symbol) => symbol.slice(1, -1)));
  assert.ok(items.every((item) => !displaySymbol(item.symbol).startsWith("/") && !displaySymbol(item.symbol).endsWith("/")));
  assert.equal(displaySymbol("/ʃ/"), "ʃ");
  assert.equal(displaySymbol("/i:/"), "i:");
  assert.equal(displaySymbol("/unpaired"), "/unpaired");
  assert.equal(displaySymbol("unpaired/"), "unpaired/");
});

test("旧运行映射完整覆盖 48 项全部示例词且保留整词音标斜杠", () => {
  const usedWords = [...new Set(items.flatMap((item) => item.examples))];
  assert.equal(usedWords.length, 114);
  assert.equal(Object.keys(transcriptions).length, 114);
  assert.deepEqual(Object.keys(transcriptions).sort(), usedWords.sort());
  for (const item of items) {
    const entries = exampleEntries(item, transcriptions);
    assert.equal(entries.length, 3);
    for (const { word, transcription } of entries) {
      assert.equal(typeof word, "string");
      assert.match(transcription, /^\/.+\/$/, `${word} 缺少完整音标转写`);
    }
  }
  assert.equal(transcriptions.sheep, "/ʃi:p/");
  assert.equal(transcriptions.tree, "/tri:/");
  assert.equal(transcriptions.sea, "/si:/");
  assert.equal(transcriptions.violin, "/ˌvaɪəˈlɪn/");
  assert.equal(transcriptions.teacher, "/ˈti:tʃə/");
});

test("炸弹入口位于音标页 header，地图内只保留重置按钮，提示区仅供读屏", () => {
  const html = fs.readFileSync(new URL("../phonetics.html", import.meta.url), "utf8");
  const appSource = fs.readFileSync(new URL("../src/phonetics-app.js", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../phonetics.css", import.meta.url), "utf8");
  const header = html.match(/<header\b[\s\S]*?<\/header>/)?.[0] || "";
  const map = html.match(/<div class="map-visual">[\s\S]*?<\/div>\s*<section class="challenge"/)?.[0] || "";
  const currentCard = html.match(/<button class="hanzi phonetic-symbol"[\s\S]*?<\/button>/)?.[0] || "";
  assert.match(header, /top-actions[\s\S]*bombGameEntry/);
  assert.doesNotMatch(header, /resetPhonetics/);
  assert.match(map, /phonetics-map-reset[\s\S]*resetPhonetics/);
  assert.doesNotMatch(map, /bombGameEntry/);
  assert.match(currentCard, /phonetic-card-category[\s\S]*phonetic-symbol-stage[\s\S]*hanzi-content/);
  assert.match(appSource, /phonetic-example-word[\s\S]*phonetic-transcription/);
  assert.match(map, /assets\/backgrounds\/phonetics-sound-kingdom-v2\.png\?v=1\.0/);
  assert.doesNotMatch(map, /adventure-map\.svg/);
  assert.match(appSource, /classList\.toggle\("phonetic-state-label", kind === "placeholder"\)/);
  assert.doesNotMatch(appSource, /class="phonetic-category"/);
  assert.doesNotMatch(appSource, /<small>/);
  assert.match(css, /\.phonetic-card-category\s*\{[\s\S]*?position:\s*absolute/);
  assert.match(html, /<span class="phonetics-sr-only" id="feedback"/);
  assert.doesNotMatch(html, /<p class="feedback"/);
  assert.match(html, /phonetics\.css\?v=1\.9/);
  assert.match(html, /phonetics-transcriptions\.js\?v=1\.0/);
  assert.match(html, /phonetics-app\.js\?v=1\.19/);
});
