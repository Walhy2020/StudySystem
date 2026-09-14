import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  BodyThemeSession,
  CLASSROOM_WORDS,
  CLASSIC_ITEMS_1_WORDS,
  CLASSIC_ITEMS_2_WORDS,
  CLASSIC_ITEMS_3_WORDS,
  CLASSIC_ITEMS_4_WORDS,
  COLOR_WORDS,
  NUMBER_1_10_WORDS,
  NUMBER_11_19_WORDS,
  ORDINAL_WORDS,
  TENS_WORDS,
  TWINKLE_LYRICS,
  TWINKLE_SPOKEN_LYRICS,
  TWINKLE_WORDS,
  THEME_CONFIGS,
  THEME_WORDS,
  createEnglishSpeaker,
  ThemeSession,
  countingVisualMarkup,
  speakEnglish,
  splitPhonetic
} from "../theme-learning.js";
import {
  THEME_LEARNED_SCHEMA_VERSION,
  THEME_LEARNED_STORAGE_KEY,
  ThemeLearnedStore,
  TotalReviewSession,
  buildThemeCatalog,
  themeWordKey
} from "../src/theme-overview.js";

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

test("三个数数主题的数据、英式音标和数值逐项准确", () => {
  assert.deepEqual(NUMBER_1_10_WORDS.map(({ word, phonetic, chinese, value }) => [word, phonetic, chinese, value]), [
    ["one", "/wʌn/", "一", 1], ["two", "/tuː/", "二", 2], ["three", "/θriː/", "三", 3],
    ["four", "/fɔː/", "四", 4], ["five", "/faɪv/", "五", 5], ["six", "/sɪks/", "六", 6],
    ["seven", "/ˈsevən/", "七", 7], ["eight", "/eɪt/", "八", 8], ["nine", "/naɪn/", "九", 9],
    ["ten", "/ten/", "十", 10]
  ]);
  assert.deepEqual(NUMBER_11_19_WORDS.map(({ word, phonetic, chinese, value }) => [word, phonetic, chinese, value]), [
    ["eleven", "/ɪˈlevən/", "十一", 11], ["twelve", "/twelv/", "十二", 12],
    ["thirteen", "/ˌθɜːˈtiːn/", "十三", 13], ["fourteen", "/ˌfɔːˈtiːn/", "十四", 14],
    ["fifteen", "/ˌfɪfˈtiːn/", "十五", 15], ["sixteen", "/ˌsɪksˈtiːn/", "十六", 16],
    ["seventeen", "/ˌsevənˈtiːn/", "十七", 17], ["eighteen", "/ˌeɪˈtiːn/", "十八", 18],
    ["nineteen", "/ˌnaɪnˈtiːn/", "十九", 19]
  ]);
  assert.deepEqual(TENS_WORDS.map(({ word, phonetic, chinese, value, groups }) => [word, phonetic, chinese, value, groups]), [
    ["ten", "/ten/", "十", 10, 1], ["twenty", "/ˈtwenti/", "二十", 20, 2],
    ["thirty", "/ˈθɜːti/", "三十", 30, 3], ["forty", "/ˈfɔːti/", "四十", 40, 4],
    ["fifty", "/ˈfɪfti/", "五十", 50, 5], ["sixty", "/ˈsɪksti/", "六十", 60, 6],
    ["seventy", "/ˈsevənti/", "七十", 70, 7], ["eighty", "/ˈeɪti/", "八十", 80, 8],
    ["ninety", "/ˈnaɪnti/", "九十", 90, 9], ["one hundred", "/wʌn ˈhʌndrəd/", "一百", 100, 10]
  ]);
  for (const word of [...NUMBER_1_10_WORDS, ...NUMBER_11_19_WORDS, ...TENS_WORDS]) {
    assert.match(word.sentence, /[.]$/);
    assert.ok(word.ariaLabel.startsWith(String(word.value) + " "));
  }
});

test("数数配图严格匹配1到19个金币和1到10个十格组", () => {
  for (const word of [...NUMBER_1_10_WORDS, ...NUMBER_11_19_WORDS]) {
    const markup = countingVisualMarkup(word);
    assert.equal((markup.match(/<i><\/i>/g) || []).length, word.value, word.word);
    assert.match(markup, new RegExp('data-count="' + word.value + '"'));
  }
  for (const word of TENS_WORDS) {
    const markup = countingVisualMarkup(word);
    assert.equal((markup.match(/class="ten-frame"/g) || []).length, word.groups, word.word);
    assert.equal((markup.match(/<b><\/b>/g) || []).length, word.value, word.word);
    assert.match(markup, new RegExp('data-groups="' + word.groups + '"'));
  }
});

test("经典道具 I 六词的英音中、例句和指令逐项准确", () => {
  assert.deepEqual(CLASSIC_ITEMS_1_WORDS, [
    { id: "coin", word: "coin", phonetic: "/kɔɪn/", chinese: "金币", sentence: "The coin is gold.", instruction: "Touch the coin.", ariaLabel: "coin 金币" },
    { id: "key", word: "key", phonetic: "/kiː/", chinese: "钥匙", sentence: "This key opens the door.", instruction: "Touch the key.", ariaLabel: "key 钥匙" },
    { id: "crown", word: "crown", phonetic: "/kraʊn/", chinese: "王冠", sentence: "The crown is royal.", instruction: "Touch the crown.", ariaLabel: "crown 王冠" },
    { id: "treasure", word: "treasure", phonetic: "/ˈtreʒə/", chinese: "宝藏", sentence: "The treasure is in the chest.", instruction: "Touch the treasure chest.", ariaLabel: "treasure chest 宝箱" },
    { id: "star", word: "star", phonetic: "/stɑː/", chinese: "星星", sentence: "The star is bright.", instruction: "Touch the star.", ariaLabel: "star 星星" },
    { id: "moon", word: "moon", phonetic: "/muːn/", chinese: "月亮", sentence: "The moon shines at night.", instruction: "Touch the moon.", ariaLabel: "moon 月亮" }
  ]);
  assert.equal(CLASSIC_ITEMS_1_WORDS.length, 6);
  assert.equal(new Set(CLASSIC_ITEMS_1_WORDS.map(({ id }) => id)).size, 6);
  assert.equal(new Set(CLASSIC_ITEMS_1_WORDS.map(({ word }) => word)).size, 6);
});
test("经典道具 II 六词数据逐项准确", () => {
  assert.deepEqual(CLASSIC_ITEMS_2_WORDS, [
    { id: "mushroom", word: "mushroom", phonetic: "/ˈmʌʃruːm/", chinese: "蘑菇", sentence: "This is a mushroom.", instruction: "Touch the mushroom.", ariaLabel: "mushroom 蘑菇" },
    { id: "flower", word: "flower", phonetic: "/ˈflaʊə/", chinese: "花", sentence: "The flower is bright.", instruction: "Touch the flower.", ariaLabel: "flower 花" },
    { id: "leaf", word: "leaf", phonetic: "/liːf/", chinese: "叶子", sentence: "The leaf is green.", instruction: "Touch the leaf.", ariaLabel: "leaf 叶子" },
    { id: "feather", word: "feather", phonetic: "/ˈfeðə/", chinese: "羽毛", sentence: "The feather is light.", instruction: "Touch the feather.", ariaLabel: "feather 羽毛" },
    { id: "bell", word: "bell", phonetic: "/bel/", chinese: "铃铛", sentence: "The bell rings.", instruction: "Touch the bell.", ariaLabel: "bell 铃铛" },
    { id: "acorn", word: "acorn", phonetic: "/ˈeɪkɔːn/", chinese: "橡果", sentence: "The acorn is small.", instruction: "Touch the acorn.", ariaLabel: "acorn 橡果" }
  ]);
});

test("经典道具 III 六词数据逐项准确", () => {
  assert.deepEqual(CLASSIC_ITEMS_3_WORDS, [
    { id: "banana", word: "banana", phonetic: "/bəˈnɑːnə/", chinese: "香蕉", sentence: "This is a banana.", instruction: "Touch the banana.", ariaLabel: "banana 香蕉" },
    { id: "shell", word: "shell", phonetic: "/ʃel/", chinese: "龟壳", sentence: "The shell is green.", instruction: "Touch the shell.", ariaLabel: "shell 龟壳" },
    { id: "bomb", word: "bomb", phonetic: "/bɒm/", chinese: "炸弹", sentence: "The bomb is black.", instruction: "Touch the bomb.", ariaLabel: "bomb 炸弹" },
    { id: "lightning", word: "lightning", phonetic: "/ˈlaɪtnɪŋ/", chinese: "闪电", sentence: "Lightning is fast.", instruction: "Touch the lightning.", ariaLabel: "lightning 闪电" },
    { id: "horn", word: "horn", phonetic: "/hɔːn/", chinese: "喇叭", sentence: "The horn is loud.", instruction: "Touch the horn.", ariaLabel: "horn 喇叭" },
    { id: "ink", word: "ink", phonetic: "/ɪŋk/", chinese: "墨水", sentence: "The ink is black.", instruction: "Touch the ink.", ariaLabel: "ink 墨水" }
  ]);
});

test("经典道具 IV 六词数据逐项准确", () => {
  assert.deepEqual(CLASSIC_ITEMS_4_WORDS, [
    { id: "cap", word: "cap", phonetic: "/kæp/", chinese: "帽子", sentence: "The cap is red.", instruction: "Touch the cap.", ariaLabel: "cap 帽子" },
    { id: "suit", word: "suit", phonetic: "/suːt/", chinese: "套装", sentence: "This is a suit.", instruction: "Touch the suit.", ariaLabel: "suit 套装" },
    { id: "hammer", word: "hammer", phonetic: "/ˈhæmə/", chinese: "锤子", sentence: "The hammer is heavy.", instruction: "Touch the hammer.", ariaLabel: "hammer 锤子" },
    { id: "boomerang", word: "boomerang", phonetic: "/ˈbuːməræŋ/", chinese: "回旋镖", sentence: "The boomerang comes back.", instruction: "Touch the boomerang.", ariaLabel: "boomerang 回旋镖" },
    { id: "spring", word: "spring", phonetic: "/sprɪŋ/", chinese: "弹簧", sentence: "The spring can bounce.", instruction: "Touch the spring.", ariaLabel: "spring 弹簧" },
    { id: "egg", word: "egg", phonetic: "/eɡ/", chinese: "蛋", sentence: "This is an egg.", instruction: "Touch the egg.", ariaLabel: "egg 蛋" }
  ]);
});

test("教室用品八词数据逐项准确", () => {
  assert.deepEqual(CLASSROOM_WORDS, [
    { id: "pencil", word: "pencil", phonetic: "/ˈpensəl/", chinese: "铅笔", sentence: "This is a pencil.", instruction: "Touch the pencil.", ariaLabel: "pencil 铅笔" },
    { id: "pen", word: "pen", phonetic: "/pen/", chinese: "钢笔", sentence: "This is a pen.", instruction: "Touch the pen.", ariaLabel: "pen 钢笔" },
    { id: "eraser", word: "eraser", phonetic: "/ɪˈreɪzə/", chinese: "橡皮", sentence: "This is an eraser.", instruction: "Touch the eraser.", ariaLabel: "eraser 橡皮" },
    { id: "ruler", word: "ruler", phonetic: "/ˈruːlə/", chinese: "尺子", sentence: "This is a ruler.", instruction: "Touch the ruler.", ariaLabel: "ruler 尺子" },
    { id: "book", word: "book", phonetic: "/bʊk/", chinese: "书", sentence: "This is a book.", instruction: "Touch the book.", ariaLabel: "book 书" },
    { id: "schoolbag", word: "schoolbag", phonetic: "/ˈskuːlbæɡ/", chinese: "书包", sentence: "This is a schoolbag.", instruction: "Touch the schoolbag.", ariaLabel: "schoolbag 书包" },
    { id: "table", word: "table", phonetic: "/ˈteɪbəl/", chinese: "桌子", sentence: "This is a table.", instruction: "Touch the table.", ariaLabel: "table 桌子" },
    { id: "chair", word: "chair", phonetic: "/tʃeə/", chinese: "椅子", sentence: "This is a chair.", instruction: "Touch the chair.", ariaLabel: "chair 椅子" }
  ]);
});

test("一闪一闪小星星八词与六行歌词音标逐项准确", () => {
  assert.deepEqual(TWINKLE_WORDS.map(({ word, phonetic, chinese }) => [word, phonetic, chinese]), [
    ["twinkle", "/ˈtwɪŋkəl/", "闪烁"], ["little", "/ˈlɪtəl/", "小的"],
    ["star", "/stɑː/", "星星"], ["wonder", "/ˈwʌndə/", "想知道"],
    ["world", "/wɜːld/", "世界"], ["high", "/haɪ/", "高高的"],
    ["diamond", "/ˈdaɪəmənd/", "钻石"], ["sky", "/skaɪ/", "天空"]
  ]);
  assert.equal(new Set(TWINKLE_WORDS.map(({ id }) => id)).size, 8);
  assert.deepEqual(TWINKLE_LYRICS, [
    { text: "Twinkle, twinkle, little star,", phonetic: "/ˈtwɪŋkəl ˈtwɪŋkəl ˈlɪtəl stɑː/" },
    { text: "How I wonder what you are!", phonetic: "/haʊ aɪ ˈwʌndə wɒt juː ɑː/" },
    { text: "Up above the world so high,", phonetic: "/ʌp əˈbʌv ðə wɜːld səʊ haɪ/" },
    { text: "Like a diamond in the sky.", phonetic: "/laɪk ə ˈdaɪəmənd ɪn ðə skaɪ/" },
    { text: "Twinkle, twinkle, little star,", phonetic: "/ˈtwɪŋkəl ˈtwɪŋkəl ˈlɪtəl stɑː/" },
    { text: "How I wonder what you are!", phonetic: "/haʊ aɪ ˈwʌndə wɒt juː ɑː/" }
  ]);
  assert.equal(TWINKLE_SPOKEN_LYRICS, TWINKLE_LYRICS.map(({ text }) => text).join(" "));
});

test("第1到第10主题十个序数词的英音中和例句逐项准确", () => {
  assert.deepEqual(ORDINAL_WORDS, [
    { id: "first", word: "first", phonetic: "/fɜːst/", chinese: "第一", sentence: "This is the first." },
    { id: "second", word: "second", phonetic: "/ˈsekənd/", chinese: "第二", sentence: "This is the second." },
    { id: "third", word: "third", phonetic: "/θɜːd/", chinese: "第三", sentence: "This is the third." },
    { id: "fourth", word: "fourth", phonetic: "/fɔːθ/", chinese: "第四", sentence: "This is the fourth." },
    { id: "fifth", word: "fifth", phonetic: "/fɪfθ/", chinese: "第五", sentence: "This is the fifth." },
    { id: "sixth", word: "sixth", phonetic: "/sɪksθ/", chinese: "第六", sentence: "This is the sixth." },
    { id: "seventh", word: "seventh", phonetic: "/ˈsevənθ/", chinese: "第七", sentence: "This is the seventh." },
    { id: "eighth", word: "eighth", phonetic: "/eɪtθ/", chinese: "第八", sentence: "This is the eighth." },
    { id: "ninth", word: "ninth", phonetic: "/naɪnθ/", chinese: "第九", sentence: "This is the ninth." },
    { id: "tenth", word: "tenth", phonetic: "/tenθ/", chinese: "第十", sentence: "This is the tenth." }
  ]);
  assert.equal(ORDINAL_WORDS.length, 10);
  assert.equal(new Set(ORDINAL_WORDS.map(({ id }) => id)).size, 10);
  assert.equal(new Set(ORDINAL_WORDS.map(({ word }) => word)).size, 10);
});

test("十二个主题的91个主题词音标按48音标口径准确拆解", () => {
  const expected = {
    head: ["h", "e", "d"], hand: ["h", "æ", "n", "d"], arm: ["ɑː", "m"], leg: ["l", "e", "ɡ"], foot: ["f", "ʊ", "t"], body: ["ˈ", "b", "ɒ", "d", "i"],
    red: ["r", "e", "d"], blue: ["b", "l", "uː"], green: ["ɡ", "r", "iː", "n"], yellow: ["ˈ", "j", "e", "l", "əʊ"], black: ["b", "l", "æ", "k"], white: ["w", "aɪ", "t"],
    one: ["w", "ʌ", "n"], two: ["t", "uː"], three: ["θ", "r", "iː"], four: ["f", "ɔː"], five: ["f", "aɪ", "v"], six: ["s", "ɪ", "k", "s"], seven: ["ˈ", "s", "e", "v", "ə", "n"], eight: ["eɪ", "t"], nine: ["n", "aɪ", "n"], ten: ["t", "e", "n"],
    eleven: ["ɪ", "ˈ", "l", "e", "v", "ə", "n"], twelve: ["t", "w", "e", "l", "v"], thirteen: ["ˌ", "θ", "ɜː", "ˈ", "t", "iː", "n"], fourteen: ["ˌ", "f", "ɔː", "ˈ", "t", "iː", "n"], fifteen: ["ˌ", "f", "ɪ", "f", "ˈ", "t", "iː", "n"], sixteen: ["ˌ", "s", "ɪ", "k", "s", "ˈ", "t", "iː", "n"], seventeen: ["ˌ", "s", "e", "v", "ə", "n", "ˈ", "t", "iː", "n"], eighteen: ["ˌ", "eɪ", "ˈ", "t", "iː", "n"], nineteen: ["ˌ", "n", "aɪ", "n", "ˈ", "t", "iː", "n"],
    twenty: ["ˈ", "t", "w", "e", "n", "t", "i"], thirty: ["ˈ", "θ", "ɜː", "t", "i"], forty: ["ˈ", "f", "ɔː", "t", "i"], fifty: ["ˈ", "f", "ɪ", "f", "t", "i"], sixty: ["ˈ", "s", "ɪ", "k", "s", "t", "i"], seventy: ["ˈ", "s", "e", "v", "ə", "n", "t", "i"], eighty: ["ˈ", "eɪ", "t", "i"], ninety: ["ˈ", "n", "aɪ", "n", "t", "i"], "one-hundred": ["w", "ʌ", "n", "ˈ", "h", "ʌ", "n", "dr", "ə", "d"],
    coin: ["k", "ɔɪ", "n"], key: ["k", "iː"], crown: ["k", "r", "aʊ", "n"], treasure: ["ˈ", "tr", "e", "ʒ", "ə"], star: ["s", "t", "ɑː"], moon: ["m", "uː", "n"],
    mushroom: ["ˈ", "m", "ʌ", "ʃ", "r", "uː", "m"], flower: ["ˈ", "f", "l", "aʊ", "ə"], leaf: ["l", "iː", "f"], feather: ["ˈ", "f", "e", "ð", "ə"], bell: ["b", "e", "l"], acorn: ["ˈ", "eɪ", "k", "ɔː", "n"],
    banana: ["b", "ə", "ˈ", "n", "ɑː", "n", "ə"], shell: ["ʃ", "e", "l"], bomb: ["b", "ɒ", "m"], lightning: ["ˈ", "l", "aɪ", "t", "n", "ɪ", "ŋ"], horn: ["h", "ɔː", "n"], ink: ["ɪ", "ŋ", "k"],
    twinkle: ["ˈ", "t", "w", "ɪ", "ŋ", "k", "ə", "l"], little: ["ˈ", "l", "ɪ", "t", "ə", "l"], wonder: ["ˈ", "w", "ʌ", "n", "d", "ə"], world: ["w", "ɜː", "l", "d"], high: ["h", "aɪ"], diamond: ["ˈ", "d", "aɪ", "ə", "m", "ə", "n", "d"], sky: ["s", "k", "aɪ"],
    cap: ["k", "æ", "p"], suit: ["s", "uː", "t"], hammer: ["ˈ", "h", "æ", "m", "ə"], boomerang: ["ˈ", "b", "uː", "m", "ə", "r", "æ", "ŋ"], spring: ["s", "p", "r", "ɪ", "ŋ"], egg: ["e", "ɡ"],
    pencil: ["ˈ", "p", "e", "n", "s", "ə", "l"], pen: ["p", "e", "n"], eraser: ["ɪ", "ˈ", "r", "eɪ", "z", "ə"], ruler: ["ˈ", "r", "uː", "l", "ə"], book: ["b", "ʊ", "k"], schoolbag: ["ˈ", "s", "k", "uː", "l", "b", "æ", "ɡ"], table: ["ˈ", "t", "eɪ", "b", "ə", "l"], chair: ["tʃ", "eə"],
    first: ["f", "ɜː", "s", "t"], second: ["ˈ", "s", "e", "k", "ə", "n", "d"], third: ["θ", "ɜː", "d"], fourth: ["f", "ɔː", "θ"], fifth: ["f", "ɪ", "f", "θ"], sixth: ["s", "ɪ", "k", "s", "θ"], seventh: ["ˈ", "s", "e", "v", "ə", "n", "θ"], eighth: ["eɪ", "t", "θ"], ninth: ["n", "aɪ", "n", "θ"], tenth: ["t", "e", "n", "θ"]
  };
  for (const word of [...THEME_WORDS, ...COLOR_WORDS, ...NUMBER_1_10_WORDS, ...NUMBER_11_19_WORDS, ...TENS_WORDS, ...ORDINAL_WORDS, ...CLASSIC_ITEMS_1_WORDS, ...CLASSIC_ITEMS_2_WORDS, ...CLASSIC_ITEMS_3_WORDS, ...CLASSIC_ITEMS_4_WORDS, ...CLASSROOM_WORDS, ...TWINKLE_WORDS]) {
    assert.deepEqual(splitPhonetic(word.phonetic), expected[word.id], word.id);
  }
  for (const diphthong of ["eɪ", "aɪ", "ɔɪ", "əʊ", "aʊ", "ɪə", "eə", "ʊə"]) {
    assert.deepEqual(splitPhonetic("/" + diphthong + "/"), [diphthong]);
  }
  assert.deepEqual(splitPhonetic("/i:/"), ["iː"]);
  assert.deepEqual(splitPhonetic(null), []);
});

test("通用会话认识去重、每轮不重复、错误重试、完成并可重开", () => {
  for (const words of [THEME_WORDS, COLOR_WORDS, NUMBER_1_10_WORDS, NUMBER_11_19_WORDS, TENS_WORDS, ORDINAL_WORDS, CLASSIC_ITEMS_1_WORDS, CLASSIC_ITEMS_2_WORDS, CLASSIC_ITEMS_3_WORDS, CLASSIC_ITEMS_4_WORDS, CLASSROOM_WORDS, TWINKLE_WORDS]) {
    const session = new ThemeSession(words, () => 0.37);
    session.learn(words[0].id); session.learn(words[0].id); session.learn(words[4].id);
    assert.equal(session.seen.size, 2);
    assert.equal(new Set(session.questions).size, words.length);
    const first = session.target();
    const wrong = words.find(({ id }) => id !== first.id).id;
    assert.equal(session.answer(wrong).status, "wrong");
    assert.equal(session.target().id, first.id);
    for (const id of [...session.questions]) assert.equal(session.answer(id).status, "correct");
    assert.equal(session.complete, true);
    assert.equal(session.correctCount, words.length);
    session.startRound();
    assert.equal(session.complete, false);
    assert.equal(session.correctCount, 0);
    assert.equal(new Set(session.questions).size, words.length);
  }
});

test("十二个主题会话状态完全隔离", () => {
  const sessions = new Map(Object.entries(THEME_CONFIGS).map(([themeId, config], index) => [
    themeId,
    new ThemeSession(config.words, () => (index + 1) / 20)
  ]));
  for (const [themeId, session] of sessions) {
    const first = THEME_CONFIGS[themeId].words[0];
    session.learn(first.id);
    assert.deepEqual([...session.seen], [first.id], themeId);
    assert.equal(session.correctCount, 0, themeId);
  }
  const colors = sessions.get("colors");
  colors.answer(colors.target().id);
  assert.equal(colors.correctCount, 1);
  for (const [themeId, session] of sessions) {
    if (themeId !== "colors") assert.equal(session.correctCount, 0, themeId);
  }
  sessions.get("body").startRound();
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

test("主题朗读延迟重启且只保留最后请求，结束回调后再推进", async () => {
  class Utterance { constructor(text) { this.text = text; } }
  const calls = [];
  let cancelCount = 0;
  let resumeCount = 0;
  const synthesis = {
    cancel() { cancelCount += 1; },
    resume() { resumeCount += 1; },
    speak(item) { calls.push(item); },
  };
  const speaker = createEnglishSpeaker({ synthesis, Utterance, restartDelayMs: 5 });
  let firstEnded = 0;
  let secondEnded = 0;
  assert.equal(speaker.speak("first instruction", { onEnd: () => { firstEnded += 1; } }), true);
  assert.equal(speaker.speak("The answer sentence is complete.", { onEnd: () => { secondEnded += 1; } }), true);
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.deepEqual(calls.map(({ text }) => text), ["The answer sentence is complete."]);
  assert.equal(firstEnded, 0);
  assert.ok(cancelCount >= 2);
  assert.equal(resumeCount, 1);
  calls[0].onend();
  assert.equal(secondEnded, 1);
  speaker.cancel();
});
test("总词库覆盖十二个主题89个唯一单词且数数配图无歧义", () => {
  const catalog = buildThemeCatalog(THEME_CONFIGS);
  assert.equal(catalog.length, 91);
  assert.equal(new Set(catalog.map(({ key }) => key)).size, 91);
  assert.equal(new Set(catalog.map(({ word }) => word.toLowerCase())).size, 89);
  assert.equal(catalog.filter(({ word }) => word === "ten").length, 2);
  assert.equal(catalog.filter(({ art }) => art.type === "image").length, 44);
  assert.equal(catalog.filter(({ art }) => art.type === "song-word").length, 8);
  assert.equal(catalog.filter(({ art }) => art.type === "ordinal").length, 10);
  assert.equal(catalog.filter(({ art }) => art.type === "count-units").length, 19);
  assert.equal(catalog.filter(({ art }) => art.type === "count-groups").length, 10);
  for (const entry of catalog) {
    assert.equal(entry.key, themeWordKey(entry.themeId, entry.id));
    if (entry.art.type === "song-word") {
      assert.match(entry.art.icon, /\S/);
      continue;
    }
    if (entry.art.type === "ordinal") {
      assert.match(entry.art.label, /^\d+(st|nd|rd|th)$/);
      continue;
    }
    if (entry.art.type === "count-units") {
      assert.equal(entry.art.value, entry.value);
      assert.ok(entry.art.value >= 1 && entry.art.value <= 19);
      continue;
    }
    if (entry.art.type === "count-groups") {
      assert.equal(entry.art.groups * 10, entry.art.value);
      assert.ok(entry.art.groups >= 1 && entry.art.groups <= 10);
      continue;
    }
    assert.match(entry.art.src, /^\.\/assets\/themes\/(body|colors|items|classroom)\//);
    assert.ok(entry.art.width > 0 && entry.art.height > 0);
    const crop = entry.art.viewBox.split(/\s+/).map(Number);
    assert.equal(crop.length, 4);
    assert.ok(crop.every((value) => Number.isFinite(value) && value >= 0));
    assert.ok(crop[0] + crop[2] <= entry.art.width);
    assert.ok(crop[1] + crop[3] <= entry.art.height);
  }
  for (const series of [1, 2, 3, 4]) {
    const entries = catalog.filter(({ themeId }) => themeId === "items" + series);
    assert.equal(entries.length, 6);
    assert.ok(entries.every(({ art }) => art.src === "./assets/themes/items/classic-items-" + series + "-scene-v1.png"));
  }
  const classroomEntries = catalog.filter(({ themeId }) => themeId === "classroom");
  assert.equal(classroomEntries.length, 8);
  assert.ok(classroomEntries.every(({ art }) => art.src === "./assets/themes/classroom/classroom-things-scene-v1.png"));
  const store = new ThemeLearnedStore(catalog, null);
  for (const themeId of Object.keys(THEME_CONFIGS)) store.recordTheme(themeId);
  assert.equal(store.entries().length, 89);
  assert.equal(store.entries().filter(({ word }) => word === "ten").length, 1);
  assert.equal(store.uniqueCatalogEntries().length, 89);
});
test("学习完毕整批入库，复习完毕单独记录并保持幂等", () => {
  const catalog = buildThemeCatalog(THEME_CONFIGS);
  const values = new Map();
  const mutations = [];
  const storage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { mutations.push(key); values.set(key, value); }
  };
  const store = new ThemeLearnedStore(catalog, storage);
  assert.equal(store.recordTheme("body"), true);
  assert.equal(store.recordTheme("body"), false);
  assert.equal(store.entries().length, 6);
  assert.ok(store.entries().every(({ themeId }) => themeId === "body"));
  assert.equal(store.isThemeLearned("body"), true);
  assert.equal(store.isThemeReviewed("body"), false);

  assert.equal(store.markReviewed("colors"), true);
  assert.equal(store.markReviewed("colors"), false);
  assert.equal(store.entries().length, 12);
  assert.equal(store.isThemeLearned("colors"), true);
  assert.equal(store.isThemeReviewed("colors"), true);
  assert.equal(store.recordTheme("missing"), false);
  assert.equal(store.markReviewed("missing"), false);
  assert.deepEqual(mutations, [THEME_LEARNED_STORAGE_KEY, THEME_LEARNED_STORAGE_KEY]);

  const saved = JSON.parse(values.get(THEME_LEARNED_STORAGE_KEY));
  assert.equal(saved.version, THEME_LEARNED_SCHEMA_VERSION);
  assert.equal(saved.version, 2);
  assert.equal(saved.learned.length, 12);
  assert.deepEqual(saved.learnedThemes, ["body", "colors"]);
  assert.deepEqual(saved.reviewedThemes, ["colors"]);
});

test("旧版逐词数据无损迁移，未知词和无效主题会被过滤", () => {
  const catalog = buildThemeCatalog(THEME_CONFIGS);
  const bodyKeys = catalog.filter(({ themeId }) => themeId === "body").map(({ key }) => key);
  const values = new Map([[THEME_LEARNED_STORAGE_KEY, JSON.stringify({
    version: 1,
    learned: [...bodyKeys, "items4:egg", "unknown:value"]
  })]]);
  const storage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); }
  };
  const restored = new ThemeLearnedStore(catalog, storage);
  assert.equal(restored.entries().length, 7);
  assert.equal(restored.isThemeLearned("body"), true);
  assert.equal(restored.isThemeReviewed("body"), false);
  assert.equal(restored.isThemeLearned("items4"), false);
  assert.equal(restored.record("missing", "word"), false);
  assert.equal(restored.recordTheme("items4"), true);
  assert.equal(restored.entries().length, 12);
  const migrated = JSON.parse(values.get(THEME_LEARNED_STORAGE_KEY));
  assert.equal(migrated.version, 2);
  assert.ok(migrated.learned.includes("items4:egg"));
  assert.deepEqual(migrated.learnedThemes, ["body", "items4"]);
  assert.deepEqual(migrated.reviewedThemes, []);
});
test("总复习每轮覆盖全部已学词、图片选项唯一、答错重试并可重开", () => {
  const words = buildThemeCatalog(THEME_CONFIGS).slice(0, 9);
  const session = new TotalReviewSession(words, () => 0.37, 4);
  assert.equal(session.questions.length, 9);
  assert.equal(new Set(session.questions).size, 9);
  while (!session.complete) {
    const target = session.target();
    const options = session.options();
    assert.ok(options.some(({ key }) => key === target.key));
    assert.equal(new Set(options.map(({ key }) => key)).size, options.length);
    assert.ok(options.length >= 1 && options.length <= 4);
    const wrong = options.find(({ key }) => key !== target.key);
    if (wrong) {
      assert.equal(session.answer(wrong.key).status, "wrong");
      assert.equal(session.target().key, target.key);
    }
    assert.equal(session.answer(target.key).status, "correct");
  }
  assert.equal(session.correctCount, 9);
  session.startRound();
  assert.equal(session.complete, false);
  assert.equal(session.correctCount, 0);
  assert.equal(new Set(session.questions).size, 9);

  const empty = new TotalReviewSession([], () => 0.5);
  assert.equal(empty.complete, true);
  assert.deepEqual(empty.options(), []);
});

test("主题页十二个卡片、九十一个互动目标、歌词音标、阶段隔离和缓存引用齐全", async () => {
  const html = await readFile(new URL("../theme-learning.html", import.meta.url), "utf8");
  assert.match(html, /data-theme-id="body"/);
  assert.match(html, /data-theme-id="colors"/);
  assert.match(html, /data-theme-id="numbers1"/);
  assert.match(html, /data-theme-id="numbersTeens"/);
  assert.match(html, /data-theme-id="tens"/);
  assert.match(html, /data-theme-id="ordinals"/);
  assert.equal((html.match(/data-theme-id=/g) || []).length, 12);
  assert.match(html, /data-theme-id="items1"/);
  assert.match(html, /data-theme-id="items2"/);
  assert.match(html, /data-theme-id="items3"/);
  assert.match(html, /data-theme-id="items4"/);
  assert.match(html, /data-theme-id="twinkle"/);
  assert.match(html, /data-theme-id="classroom"/);
  for (const id of THEME_WORDS.map(({ id }) => id)) {
    assert.match(html, new RegExp('data-target="' + id + '" data-part="' + id + '" tabindex="0" role="button"'));
  }
  for (const item of COLOR_WORDS) {
    assert.match(html, new RegExp('data-target="' + item.id + '" tabindex="0" role="button" aria-label="' + item.ariaLabel + '"'));
  }
  for (const item of ORDINAL_WORDS) {
    assert.match(html, new RegExp('data-target="' + item.id + '" tabindex="0" role="button" aria-label="' + item.chinese + ' ' + item.word + '"'));
  }
  for (const item of CLASSIC_ITEMS_1_WORDS) {
    assert.match(html, new RegExp('data-target="' + item.id + '" tabindex="0" role="button" aria-label="' + item.ariaLabel + '"'));
  }
  for (const item of [...CLASSIC_ITEMS_2_WORDS, ...CLASSIC_ITEMS_3_WORDS, ...CLASSIC_ITEMS_4_WORDS]) {
    assert.match(html, new RegExp('data-target="' + item.id + '" tabindex="0" role="button" aria-label="' + item.ariaLabel + '"'));
  }
  for (const item of CLASSROOM_WORDS) {
    assert.match(html, new RegExp('data-target="' + item.id + '" tabindex="0" role="button" aria-label="' + item.ariaLabel + '"'));
  }
  assert.match(html, /id="learnPanel"/);
  assert.match(html, /id="practicePanel" hidden/);
  assert.match(html, /id="backToThemes"/);
  assert.equal((html.match(/data-series-id=/g) || []).length, 5);
  assert.match(html, /data-series-id="basics"/);
  assert.match(html, /data-series-id="counting"/);
  assert.match(html, /data-series-id="items"/);
  assert.match(html, /data-series-id="songs"/);
  assert.match(html, /data-series-id="classroom"/);
  assert.match(html, /id="themeSeriesList"/);
  assert.doesNotMatch(html, /id="pickerTitle"|选择一个主题系列|今天想认识什么|先选择一个系列/);
  assert.match(html, /id="themeSeriesPanel"/);
  assert.match(html, /id="backToSeries"/);
  assert.equal((html.match(/data-series="basics"/g) || []).length, 2);
  assert.equal((html.match(/data-series="counting"/g) || []).length, 4);
  assert.equal((html.match(/data-series="items"/g) || []).length, 4);
  assert.equal((html.match(/data-series="songs"/g) || []).length, 1);
  assert.equal((html.match(/data-series="classroom"/g) || []).length, 1);
  assert.match(html, /id="startNumbers1"/);
  assert.match(html, /id="startNumbersTeens"/);
  assert.match(html, /id="startTens"/);
  assert.match(html, /id="numbers1Scene"/);
  assert.match(html, /id="numbersTeensScene"/);
  assert.match(html, /id="tensScene"/);
  assert.match(html, /id="startOrdinals"/);
  assert.match(html, /id="ordinalsScene"/);
  assert.match(html, /id="startItems1"/);
  assert.match(html, /id="items1Scene"/);
  assert.match(html, /id="startItems2"/);
  assert.match(html, /id="startItems3"/);
  assert.match(html, /id="startItems4"/);
  assert.match(html, /id="items2Scene"/);
  assert.match(html, /id="items3Scene"/);
  assert.match(html, /id="items4Scene"/);
  assert.match(html, /id="startClassroom"/);
  assert.match(html, /id="classroomScene"/);
  assert.match(html, /id="startTwinkle"/);
  assert.match(html, /id="twinkleScene"/);
  assert.equal((html.match(/class="scene-target song-word-target"/g) || []).length, 8);
  for (const item of TWINKLE_WORDS) assert.match(html, new RegExp('data-target="' + item.id + '" aria-label="' + item.ariaLabel + '"'));
  assert.equal((html.match(/class="song-lyric-line"/g) || []).length, 6);
  assert.equal((html.match(/class="song-lyric-text"/g) || []).length, 6);
  assert.equal((html.match(/class="song-lyric-ipa"/g) || []).length, 6);
  for (const line of TWINKLE_LYRICS) assert.ok(html.includes(line.phonetic));
  assert.match(html, /id="speakSongLyrics"/);



  assert.doesNotMatch(html, /id="openTotalReview"|id="openWordLibrary"|id="wordLibraryView"|id="totalReviewView"/);
  assert.match(html, /href="\.\/review-learning\.html">总复习<\/a>/);
  assert.match(html, /theme-learning\.css\?v=3\.4/);
  assert.match(html, /theme-learning\.js\?v=2\.9/);
  const script = await readFile(new URL("../theme-learning.js", import.meta.url), "utf8");
  assert.match(script, /phonetic-segmenter\.js\?v=1\.0/);
  assert.match(script, /theme-overview\.js\?v=1\.7/);
  assert.match(script, /function renderCountingScenes/);
  assert.match(script, /export const THEME_SERIES/);
  assert.match(script, /function showSeries/);
  assert.match(script, /function syncSeriesCards/);
  assert.match(script, /countingVisualMarkup/);
  assert.match(script, /initializeThemeProgress/);
  assert.match(html, /id="completeThemeLearning"[^>]*>学习完毕<\/button>/);
  assert.match(html, /id="themeLearningStatus"/);
  assert.match(script, /progress\.recordTheme\(activeThemeId\)/);
  assert.match(script, /progress\.markReviewed\(activeThemeId\)/);
  assert.doesNotMatch(script, /dispatchEvent\(new CustomEvent\("theme-word-learned"/);
  assert.match(script, /class="phonetic phonetic-toggle"/);
  assert.match(script, /class="phoneme-breakdown"/);
  assert.match(script, /aria-expanded="false"/);
  assert.match(script, /class="primary-button icon-action sound-action theme-sound-button"/);
  assert.match(script, /id="previousWord"/);
  assert.match(script, /id="nextWord"/);
  assert.match(script, /word-navigation">[\s\S]*?id="repeatWord"[\s\S]*?id="previousWord"[\s\S]*?id="nextWord"/);
  assert.match(script, />Previous<\/button>/);
  assert.match(script, />Next<\/button>/);
  assert.doesNotMatch(script, /← 上一个|下一个 →|phoneticHint|点击音标拆解|收起音标拆解/);
  assert.match(script, /toggleCurrentPhonetic/);
  assert.doesNotMatch(script, /<small>/);
  assert.doesNotMatch(script, />\/' \+ symbol \+ '\/<\/span>/);
  const learnBranch = script.match(/if \(stage === "learn"\) \{([\s\S]*?)\r?\n    \}\r?\n    if \(session\.complete\)/)?.[1];
  assert.ok(learnBranch);
  assert.doesNotMatch(learnBranch, /speak\s*\(/);
  assert.doesNotMatch(html, /WORD CARD/);
  const css = await readFile(new URL("../theme-learning.css", import.meta.url), "utf8");
  assert.match(css, /\.theme-series-list\{display:flex/);
  assert.match(css, /\.theme-series-cell/);
  assert.match(css, /\.series-preview/);
  assert.match(css, /--phonetic-font:/);
  assert.match(css, /\.theme-card\.is-reviewed/);
  assert.match(css, /\.theme-reviewed-badge/);
  assert.match(css, /\.theme-learning-completion/);
  assert.match(css, /\.counting-board/);
  assert.match(css, /\.counting-units/);
  assert.match(css, /\.counting-groups/);
  assert.match(css, /\.ten-frame/);
  assert.match(css, /\.song-lyrics/);
  assert.match(css, /\.song-lyric-ipa/);
  assert.match(css, /\.song-word-target/);
  assert.match(css, /\.song-word-art/);
  assert.match(css, /\.theme-sound-button\{[^}]*width:76px[^}]*height:76px/);
  assert.match(html, /href="\.\/assets\/themes\/body\/body-character-anime-v2\.png"/);
  assert.match(html, /class="body-character-image"[^>]+pointer-events="none"/);
  assert.match(html, /href="\.\/assets\/themes\/colors\/colors-scene-v2\.png"/);
  assert.match(html, /class="color-scene-image"[^>]+pointer-events="none"/);
  assert.match(html, /href="\.\/assets\/themes\/items\/classic-items-1-scene-v1\.png"/);
  assert.match(html, /class="item-scene-image"[^>]+pointer-events="none"/);
  for (const series of [2, 3, 4]) assert.match(html, new RegExp("classic-items-" + series + "-scene-v1\\.png"));
  assert.match(html, /assets\/themes\/classroom\/classroom-things-scene-v1\.png/);
  assert.doesNotMatch(html, /代码原生场景|代码绘制的红帽蓝裤角色原型/);
});

test("总复习是独立并列模块，主题页只记录学习进度", async () => {
  const [themeHtml, reviewHtml, indexHtml, phoneticsHtml, reviewScript] = await Promise.all([
    readFile(new URL("../theme-learning.html", import.meta.url), "utf8"),
    readFile(new URL("../review-learning.html", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../phonetics.html", import.meta.url), "utf8"),
    readFile(new URL("../review-learning.js", import.meta.url), "utf8")
  ]);
  assert.doesNotMatch(themeHtml, /id="openTotalReview"|id="openWordLibrary"|id="wordLibraryView"|id="totalReviewView"/);
  assert.match(themeHtml, /href="\.\/review-learning\.html">总复习<\/a>/);
  assert.match(indexHtml, /href="\.\/review-learning\.html">总复习<\/a>/);
  assert.match(phoneticsHtml, /href="\.\/review-learning\.html">总复习<\/a>/);
  assert.match(reviewHtml, /<title>马里奥学习系统 · 总复习<\/title>/);
  assert.match(reviewHtml, /aria-current="page">总复习<\/span>/);
  assert.match(reviewHtml, /id="openTotalReview"/);
  assert.match(reviewHtml, /id="openWordLibrary"/);
  assert.match(reviewHtml, /id="totalReviewView"/);
  assert.match(reviewHtml, /id="wordLibraryView" hidden/);
  assert.match(reviewHtml, /theme-learning\.css\?v=3\.4/);
  assert.match(reviewHtml, /review-learning\.js\?v=1\.6/);
  assert.match(reviewHtml, /id="wordLibraryCount">0\/215<\/b>/);
  assert.match(reviewScript, /theme-learning\.js\?v=2\.9/);
  assert.match(reviewScript, /theme-overview\.js\?v=1\.7/);
  assert.match(reviewScript, /overview\.openReview\(\)/);
});

test("Body 场景素材为 1024x1536 透明 PNG", async () => {
  const image = await readFile(new URL("../assets/themes/body/body-character-anime-v2.png", import.meta.url));
  assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(image.subarray(12, 16).toString("ascii"), "IHDR");
  assert.equal(image.readUInt32BE(16), 1024);
  assert.equal(image.readUInt32BE(20), 1536);
  assert.equal(image[25], 6);
});

test("Colors 场景素材为 1536x1024 PNG", async () => {
  const image = await readFile(new URL("../assets/themes/colors/colors-scene-v2.png", import.meta.url));
  assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(image.subarray(12, 16).toString("ascii"), "IHDR");
  assert.equal(image.readUInt32BE(16), 1536);
  assert.equal(image.readUInt32BE(20), 1024);
});

test("Classic Items I 场景素材为 1536x1024 PNG", async () => {
  const image = await readFile(new URL("../assets/themes/items/classic-items-1-scene-v1.png", import.meta.url));
  assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(image.subarray(12, 16).toString("ascii"), "IHDR");
  assert.equal(image.readUInt32BE(16), 1536);
  assert.equal(image.readUInt32BE(20), 1024);
});
for (const series of [2, 3, 4]) {
  test("Classic Items " + series + " 场景素材为 1536x1024 PNG", async () => {
    const image = await readFile(new URL("../assets/themes/items/classic-items-" + series + "-scene-v1.png", import.meta.url));
    assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(image.readUInt32BE(16), 1536);
    assert.equal(image.readUInt32BE(20), 1024);
  });
}
test("Classroom Things 场景素材为 1536x1024 PNG", async () => {
  const image = await readFile(new URL("../assets/themes/classroom/classroom-things-scene-v1.png", import.meta.url));
  assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(image.readUInt32BE(16), 1536);
  assert.equal(image.readUInt32BE(20), 1024);
});
test("总词库图片严格裁切到单词 viewBox，不显示相邻物体", async () => {
  const overviewScript = await readFile(new URL("../src/theme-overview.js", import.meta.url), "utf8");
  assert.match(overviewScript, /preserveAspectRatio="xMidYMid meet" overflow="hidden"><defs><clipPath/);
  assert.match(overviewScript, /<rect x=/);
  assert.match(overviewScript, /clip-path="url\(#/);
  assert.doesNotMatch(overviewScript, /preserveAspectRatio="xMidYMid slice"/);
});
test("主题模块只持久化新的已学词专属键", async () => {
  const mainScript = await readFile(new URL("../theme-learning.js", import.meta.url), "utf8");
  const overviewScript = await readFile(new URL("../src/theme-overview.js", import.meta.url), "utf8");
  assert.doesNotMatch(mainScript, /localStorage|sessionStorage|\.setItem\s*\(|\.removeItem\s*\(/);
  assert.match(overviewScript, /THEME_LEARNED_STORAGE_KEY = "mario-theme-learned-v1"/);
  assert.match(overviewScript, /\.setItem\(THEME_LEARNED_STORAGE_KEY/);
  for (const protectedKey of [
    "mario-hanzi-refactor-v1",
    "mario-literacy-desktop-mvp-v1",
    "mario-bomb-game-progress-v1",
    "mario-bomb-game-v1",
    "mario-phonetics-v1",
    "mario-theme-learning-v1"
  ]) assert.doesNotMatch(overviewScript, new RegExp(protectedKey));
});
