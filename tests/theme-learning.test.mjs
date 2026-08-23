import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  BodyThemeSession,
  COLOR_WORDS,
  THEME_CONFIGS,
  THEME_WORDS,
  ThemeSession,
  speakEnglish
} from "../theme-learning.js";

test("身体主题六词数据保持准确、唯一且字段不变", () => {
  assert.deepEqual(THEME_WORDS, [
    { id: "head", word: "head", phonetic: "/hed/", chinese: "头", sentence: "This is Mario's head." },
    { id: "hand", word: "hand", phonetic: "/hænd/", chinese: "手", sentence: "This is Mario's hand." },
    { id: "arm", word: "arm", phonetic: "/ɑːm/", chinese: "手臂", sentence: "This is Mario's arm." },
    { id: "leg", word: "leg", phonetic: "/leɡ/", chinese: "腿", sentence: "This is Mario's leg." },
    { id: "foot", word: "foot", phonetic: "/fʊt/", chinese: "脚", sentence: "This is Mario's foot." },
    { id: "body", word: "body", phonetic: "/ˈbɒdi/", chinese: "身体", sentence: "This is Mario's body." }
  ]);
  assert.equal(new Set(THEME_WORDS.map(({ id }) => id)).size, 6);
});

test("颜色主题六词的英音中、物体、例句、指令逐项准确", () => {
  assert.deepEqual(COLOR_WORDS, [
    { id: "red", word: "red", phonetic: "/red/", chinese: "红色", object: "cap", objectChinese: "帽子", sentence: "The cap is red.", instruction: "Touch the red cap.", ariaLabel: "red cap 红色帽子" },
    { id: "blue", word: "blue", phonetic: "/bluː/", chinese: "蓝色", object: "block", objectChinese: "方块", sentence: "The block is blue.", instruction: "Touch the blue block.", ariaLabel: "blue block 蓝色方块" },
    { id: "green", word: "green", phonetic: "/ɡriːn/", chinese: "绿色", object: "pipe", objectChinese: "水管", sentence: "The pipe is green.", instruction: "Touch the green pipe.", ariaLabel: "green pipe 绿色水管" },
    { id: "yellow", word: "yellow", phonetic: "/ˈjeləʊ/", chinese: "黄色", object: "coin", objectChinese: "金币", sentence: "The coin is yellow.", instruction: "Touch the yellow coin.", ariaLabel: "yellow coin 黄色金币" },
    { id: "black", word: "black", phonetic: "/blæk/", chinese: "黑色", object: "bomb", objectChinese: "炸弹", sentence: "The bomb is black.", instruction: "Touch the black bomb.", ariaLabel: "black bomb 黑色炸弹" },
    { id: "white", word: "white", phonetic: "/waɪt/", chinese: "白色", object: "cloud", objectChinese: "云朵", sentence: "The cloud is white.", instruction: "Touch the white cloud.", ariaLabel: "white cloud 白色云朵" }
  ]);
  assert.equal(COLOR_WORDS.length, 6);
  assert.equal(new Set(COLOR_WORDS.map(({ id }) => id)).size, 6);
  assert.equal(new Set(COLOR_WORDS.map(({ word }) => word)).size, 6);
});

test("通用会话认识去重、六题不重复、错误重试、完成并可重开", () => {
  for (const words of [THEME_WORDS, COLOR_WORDS]) {
    const session = new ThemeSession(words, () => 0.37);
    session.learn(words[0].id); session.learn(words[0].id); session.learn(words[4].id);
    assert.equal(session.seen.size, 2);
    assert.equal(new Set(session.questions).size, 6);
    const first = session.target();
    const wrong = words.find(({ id }) => id !== first.id).id;
    assert.equal(session.answer(wrong).status, "wrong");
    assert.equal(session.target().id, first.id);
    for (const id of [...session.questions]) assert.equal(session.answer(id).status, "correct");
    assert.equal(session.complete, true);
    assert.equal(session.correctCount, 6);
    session.startRound();
    assert.equal(session.complete, false);
    assert.equal(session.correctCount, 0);
    assert.equal(new Set(session.questions).size, 6);
  }
});

test("Body 兼容会话与 Colors 会话状态完全隔离", () => {
  const body = new BodyThemeSession(() => 0.2);
  const colors = new ThemeSession(THEME_CONFIGS.colors.words, () => 0.8);
  body.learn("head");
  colors.learn("red");
  colors.answer(colors.target().id);
  assert.deepEqual([...body.seen], ["head"]);
  assert.deepEqual([...colors.seen], ["red"]);
  assert.equal(body.correctCount, 0);
  assert.equal(colors.correctCount, 1);
  body.startRound();
  assert.equal(colors.correctCount, 1);
});

test("TTS 不可用或调用失败时不抛错并使用英式语言标签", () => {
  class Utterance { constructor(text) { this.text = text; } }
  assert.equal(speakEnglish("head", null, Utterance), false);
  assert.doesNotThrow(() => speakEnglish("head", { speak() { throw new Error("blocked"); } }, Utterance));
  assert.equal(speakEnglish("head", { speak() { throw new Error("blocked"); } }, Utterance), false);
  let spoken;
  const synthesis = { cancel() {}, speak(item) { spoken = item; } };
  assert.equal(speakEnglish("blue", synthesis, Utterance), true);
  assert.equal(spoken.lang, "en-GB");
});

test("主题页两个卡片、十二个键盘热区、阶段隔离和 v1.1 引用齐全", async () => {
  const html = await readFile(new URL("../theme-learning.html", import.meta.url), "utf8");
  assert.match(html, /data-theme-id="body"/);
  assert.match(html, /data-theme-id="colors"/);
  for (const id of THEME_WORDS.map(({ id }) => id)) {
    assert.match(html, new RegExp('data-target="' + id + '" data-part="' + id + '" tabindex="0" role="button"'));
  }
  for (const item of COLOR_WORDS) {
    assert.match(html, new RegExp('data-target="' + item.id + '" tabindex="0" role="button" aria-label="' + item.ariaLabel + '"'));
  }
  assert.match(html, /id="learnPanel"/);
  assert.match(html, /id="practicePanel" hidden/);
  assert.match(html, /id="backToThemes"/);
  assert.match(html, /theme-learning\.css\?v=1\.1/);
  assert.match(html, /theme-learning\.js\?v=1\.1/);
});

test("主题脚本不访问任何浏览器存储", async () => {
  const script = await readFile(new URL("../theme-learning.js", import.meta.url), "utf8");
  assert.doesNotMatch(script, /localStorage|sessionStorage|\.setItem\s*\(|\.removeItem\s*\(/);
});
