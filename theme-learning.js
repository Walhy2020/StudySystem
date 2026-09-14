import { PHONETIC_STRESS_MARKS, splitPhonetic } from "./src/phonetic-segmenter.js?v=1.0";
import { initializeThemeProgress } from "./src/theme-overview.js?v=1.7";

export { splitPhonetic };

export const THEME_WORDS = Object.freeze([
  { id: "head", word: "head", phonetic: "/hed/", chinese: "头", sentence: "This is Mario's head." },
  { id: "hand", word: "hand", phonetic: "/hænd/", chinese: "手", sentence: "This is Mario's hand." },
  { id: "arm", word: "arm", phonetic: "/ɑːm/", chinese: "手臂", sentence: "This is Mario's arm." },
  { id: "leg", word: "leg", phonetic: "/leɡ/", chinese: "腿", sentence: "This is Mario's leg." },
  { id: "foot", word: "foot", phonetic: "/fʊt/", chinese: "脚", sentence: "This is Mario's foot." },
  { id: "body", word: "body", phonetic: "/ˈbɒdi/", chinese: "身体", sentence: "This is Mario's body." }
]);

export const COLOR_WORDS = Object.freeze([
  { id: "red", word: "red", phonetic: "/red/", chinese: "红色", object: "cap", objectChinese: "帽子", sentence: "The cap is red.", instruction: "Touch the red cap.", ariaLabel: "red cap 红色帽子" },
  { id: "blue", word: "blue", phonetic: "/bluː/", chinese: "蓝色", object: "block", objectChinese: "方块", sentence: "The block is blue.", instruction: "Touch the blue block.", ariaLabel: "blue block 蓝色方块" },
  { id: "green", word: "green", phonetic: "/ɡriːn/", chinese: "绿色", object: "pipe", objectChinese: "水管", sentence: "The pipe is green.", instruction: "Touch the green pipe.", ariaLabel: "green pipe 绿色水管" },
  { id: "yellow", word: "yellow", phonetic: "/ˈjeləʊ/", chinese: "黄色", object: "coin", objectChinese: "金币", sentence: "The coin is yellow.", instruction: "Touch the yellow coin.", ariaLabel: "yellow coin 黄色金币" },
  { id: "black", word: "black", phonetic: "/blæk/", chinese: "黑色", object: "bomb", objectChinese: "炸弹", sentence: "The bomb is black.", instruction: "Touch the black bomb.", ariaLabel: "black bomb 黑色炸弹" },
  { id: "white", word: "white", phonetic: "/waɪt/", chinese: "白色", object: "cloud", objectChinese: "云朵", sentence: "The cloud is white.", instruction: "Touch the white cloud.", ariaLabel: "white cloud 白色云朵" }
]);

export const NUMBER_1_10_WORDS = Object.freeze([
  { id: "one", word: "one", phonetic: "/wʌn/", chinese: "一", value: 1, sentence: "There is one coin.", ariaLabel: "1 one 一" },
  { id: "two", word: "two", phonetic: "/tuː/", chinese: "二", value: 2, sentence: "There are two coins.", ariaLabel: "2 two 二" },
  { id: "three", word: "three", phonetic: "/θriː/", chinese: "三", value: 3, sentence: "There are three coins.", ariaLabel: "3 three 三" },
  { id: "four", word: "four", phonetic: "/fɔː/", chinese: "四", value: 4, sentence: "There are four coins.", ariaLabel: "4 four 四" },
  { id: "five", word: "five", phonetic: "/faɪv/", chinese: "五", value: 5, sentence: "There are five coins.", ariaLabel: "5 five 五" },
  { id: "six", word: "six", phonetic: "/sɪks/", chinese: "六", value: 6, sentence: "There are six coins.", ariaLabel: "6 six 六" },
  { id: "seven", word: "seven", phonetic: "/ˈsevən/", chinese: "七", value: 7, sentence: "There are seven coins.", ariaLabel: "7 seven 七" },
  { id: "eight", word: "eight", phonetic: "/eɪt/", chinese: "八", value: 8, sentence: "There are eight coins.", ariaLabel: "8 eight 八" },
  { id: "nine", word: "nine", phonetic: "/naɪn/", chinese: "九", value: 9, sentence: "There are nine coins.", ariaLabel: "9 nine 九" },
  { id: "ten", word: "ten", phonetic: "/ten/", chinese: "十", value: 10, sentence: "There are ten coins.", ariaLabel: "10 ten 十" }
]);

export const NUMBER_11_19_WORDS = Object.freeze([
  { id: "eleven", word: "eleven", phonetic: "/ɪˈlevən/", chinese: "十一", value: 11, sentence: "There are eleven coins.", ariaLabel: "11 eleven 十一" },
  { id: "twelve", word: "twelve", phonetic: "/twelv/", chinese: "十二", value: 12, sentence: "There are twelve coins.", ariaLabel: "12 twelve 十二" },
  { id: "thirteen", word: "thirteen", phonetic: "/ˌθɜːˈtiːn/", chinese: "十三", value: 13, sentence: "There are thirteen coins.", ariaLabel: "13 thirteen 十三" },
  { id: "fourteen", word: "fourteen", phonetic: "/ˌfɔːˈtiːn/", chinese: "十四", value: 14, sentence: "There are fourteen coins.", ariaLabel: "14 fourteen 十四" },
  { id: "fifteen", word: "fifteen", phonetic: "/ˌfɪfˈtiːn/", chinese: "十五", value: 15, sentence: "There are fifteen coins.", ariaLabel: "15 fifteen 十五" },
  { id: "sixteen", word: "sixteen", phonetic: "/ˌsɪksˈtiːn/", chinese: "十六", value: 16, sentence: "There are sixteen coins.", ariaLabel: "16 sixteen 十六" },
  { id: "seventeen", word: "seventeen", phonetic: "/ˌsevənˈtiːn/", chinese: "十七", value: 17, sentence: "There are seventeen coins.", ariaLabel: "17 seventeen 十七" },
  { id: "eighteen", word: "eighteen", phonetic: "/ˌeɪˈtiːn/", chinese: "十八", value: 18, sentence: "There are eighteen coins.", ariaLabel: "18 eighteen 十八" },
  { id: "nineteen", word: "nineteen", phonetic: "/ˌnaɪnˈtiːn/", chinese: "十九", value: 19, sentence: "There are nineteen coins.", ariaLabel: "19 nineteen 十九" }
]);

export const TENS_WORDS = Object.freeze([
  { id: "ten", word: "ten", phonetic: "/ten/", chinese: "十", value: 10, groups: 1, sentence: "Ten is one group of ten.", ariaLabel: "10 ten 十" },
  { id: "twenty", word: "twenty", phonetic: "/ˈtwenti/", chinese: "二十", value: 20, groups: 2, sentence: "Twenty is two groups of ten.", ariaLabel: "20 twenty 二十" },
  { id: "thirty", word: "thirty", phonetic: "/ˈθɜːti/", chinese: "三十", value: 30, groups: 3, sentence: "Thirty is three groups of ten.", ariaLabel: "30 thirty 三十" },
  { id: "forty", word: "forty", phonetic: "/ˈfɔːti/", chinese: "四十", value: 40, groups: 4, sentence: "Forty is four groups of ten.", ariaLabel: "40 forty 四十" },
  { id: "fifty", word: "fifty", phonetic: "/ˈfɪfti/", chinese: "五十", value: 50, groups: 5, sentence: "Fifty is five groups of ten.", ariaLabel: "50 fifty 五十" },
  { id: "sixty", word: "sixty", phonetic: "/ˈsɪksti/", chinese: "六十", value: 60, groups: 6, sentence: "Sixty is six groups of ten.", ariaLabel: "60 sixty 六十" },
  { id: "seventy", word: "seventy", phonetic: "/ˈsevənti/", chinese: "七十", value: 70, groups: 7, sentence: "Seventy is seven groups of ten.", ariaLabel: "70 seventy 七十" },
  { id: "eighty", word: "eighty", phonetic: "/ˈeɪti/", chinese: "八十", value: 80, groups: 8, sentence: "Eighty is eight groups of ten.", ariaLabel: "80 eighty 八十" },
  { id: "ninety", word: "ninety", phonetic: "/ˈnaɪnti/", chinese: "九十", value: 90, groups: 9, sentence: "Ninety is nine groups of ten.", ariaLabel: "90 ninety 九十" },
  { id: "one-hundred", word: "one hundred", phonetic: "/wʌn ˈhʌndrəd/", chinese: "一百", value: 100, groups: 10, sentence: "One hundred is ten groups of ten.", ariaLabel: "100 one hundred 一百" }
]);

export const ORDINAL_WORDS = Object.freeze([
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
export const CLASSIC_ITEMS_1_WORDS = Object.freeze([
  { id: "coin", word: "coin", phonetic: "/kɔɪn/", chinese: "金币", sentence: "The coin is gold.", instruction: "Touch the coin.", ariaLabel: "coin 金币" },
  { id: "key", word: "key", phonetic: "/kiː/", chinese: "钥匙", sentence: "This key opens the door.", instruction: "Touch the key.", ariaLabel: "key 钥匙" },
  { id: "crown", word: "crown", phonetic: "/kraʊn/", chinese: "王冠", sentence: "The crown is royal.", instruction: "Touch the crown.", ariaLabel: "crown 王冠" },
  { id: "treasure", word: "treasure", phonetic: "/ˈtreʒə/", chinese: "宝藏", sentence: "The treasure is in the chest.", instruction: "Touch the treasure chest.", ariaLabel: "treasure chest 宝箱" },
  { id: "star", word: "star", phonetic: "/stɑː/", chinese: "星星", sentence: "The star is bright.", instruction: "Touch the star.", ariaLabel: "star 星星" },
  { id: "moon", word: "moon", phonetic: "/muːn/", chinese: "月亮", sentence: "The moon shines at night.", instruction: "Touch the moon.", ariaLabel: "moon 月亮" }
]);
export const CLASSIC_ITEMS_2_WORDS = Object.freeze([
  { id: "mushroom", word: "mushroom", phonetic: "/ˈmʌʃruːm/", chinese: "蘑菇", sentence: "This is a mushroom.", instruction: "Touch the mushroom.", ariaLabel: "mushroom 蘑菇" },
  { id: "flower", word: "flower", phonetic: "/ˈflaʊə/", chinese: "花", sentence: "The flower is bright.", instruction: "Touch the flower.", ariaLabel: "flower 花" },
  { id: "leaf", word: "leaf", phonetic: "/liːf/", chinese: "叶子", sentence: "The leaf is green.", instruction: "Touch the leaf.", ariaLabel: "leaf 叶子" },
  { id: "feather", word: "feather", phonetic: "/ˈfeðə/", chinese: "羽毛", sentence: "The feather is light.", instruction: "Touch the feather.", ariaLabel: "feather 羽毛" },
  { id: "bell", word: "bell", phonetic: "/bel/", chinese: "铃铛", sentence: "The bell rings.", instruction: "Touch the bell.", ariaLabel: "bell 铃铛" },
  { id: "acorn", word: "acorn", phonetic: "/ˈeɪkɔːn/", chinese: "橡果", sentence: "The acorn is small.", instruction: "Touch the acorn.", ariaLabel: "acorn 橡果" }
]);

export const CLASSIC_ITEMS_3_WORDS = Object.freeze([
  { id: "banana", word: "banana", phonetic: "/bəˈnɑːnə/", chinese: "香蕉", sentence: "This is a banana.", instruction: "Touch the banana.", ariaLabel: "banana 香蕉" },
  { id: "shell", word: "shell", phonetic: "/ʃel/", chinese: "龟壳", sentence: "The shell is green.", instruction: "Touch the shell.", ariaLabel: "shell 龟壳" },
  { id: "bomb", word: "bomb", phonetic: "/bɒm/", chinese: "炸弹", sentence: "The bomb is black.", instruction: "Touch the bomb.", ariaLabel: "bomb 炸弹" },
  { id: "lightning", word: "lightning", phonetic: "/ˈlaɪtnɪŋ/", chinese: "闪电", sentence: "Lightning is fast.", instruction: "Touch the lightning.", ariaLabel: "lightning 闪电" },
  { id: "horn", word: "horn", phonetic: "/hɔːn/", chinese: "喇叭", sentence: "The horn is loud.", instruction: "Touch the horn.", ariaLabel: "horn 喇叭" },
  { id: "ink", word: "ink", phonetic: "/ɪŋk/", chinese: "墨水", sentence: "The ink is black.", instruction: "Touch the ink.", ariaLabel: "ink 墨水" }
]);

export const CLASSIC_ITEMS_4_WORDS = Object.freeze([
  { id: "cap", word: "cap", phonetic: "/kæp/", chinese: "帽子", sentence: "The cap is red.", instruction: "Touch the cap.", ariaLabel: "cap 帽子" },
  { id: "suit", word: "suit", phonetic: "/suːt/", chinese: "套装", sentence: "This is a suit.", instruction: "Touch the suit.", ariaLabel: "suit 套装" },
  { id: "hammer", word: "hammer", phonetic: "/ˈhæmə/", chinese: "锤子", sentence: "The hammer is heavy.", instruction: "Touch the hammer.", ariaLabel: "hammer 锤子" },
  { id: "boomerang", word: "boomerang", phonetic: "/ˈbuːməræŋ/", chinese: "回旋镖", sentence: "The boomerang comes back.", instruction: "Touch the boomerang.", ariaLabel: "boomerang 回旋镖" },
  { id: "spring", word: "spring", phonetic: "/sprɪŋ/", chinese: "弹簧", sentence: "The spring can bounce.", instruction: "Touch the spring.", ariaLabel: "spring 弹簧" },
  { id: "egg", word: "egg", phonetic: "/eɡ/", chinese: "蛋", sentence: "This is an egg.", instruction: "Touch the egg.", ariaLabel: "egg 蛋" }
]);

export const CLASSROOM_WORDS = Object.freeze([
  { id: "pencil", word: "pencil", phonetic: "/ˈpensəl/", chinese: "铅笔", sentence: "This is a pencil.", instruction: "Touch the pencil.", ariaLabel: "pencil 铅笔" },
  { id: "pen", word: "pen", phonetic: "/pen/", chinese: "钢笔", sentence: "This is a pen.", instruction: "Touch the pen.", ariaLabel: "pen 钢笔" },
  { id: "eraser", word: "eraser", phonetic: "/ɪˈreɪzə/", chinese: "橡皮", sentence: "This is an eraser.", instruction: "Touch the eraser.", ariaLabel: "eraser 橡皮" },
  { id: "ruler", word: "ruler", phonetic: "/ˈruːlə/", chinese: "尺子", sentence: "This is a ruler.", instruction: "Touch the ruler.", ariaLabel: "ruler 尺子" },
  { id: "book", word: "book", phonetic: "/bʊk/", chinese: "书", sentence: "This is a book.", instruction: "Touch the book.", ariaLabel: "book 书" },
  { id: "schoolbag", word: "schoolbag", phonetic: "/ˈskuːlbæɡ/", chinese: "书包", sentence: "This is a schoolbag.", instruction: "Touch the schoolbag.", ariaLabel: "schoolbag 书包" },
  { id: "table", word: "table", phonetic: "/ˈteɪbəl/", chinese: "桌子", sentence: "This is a table.", instruction: "Touch the table.", ariaLabel: "table 桌子" },
  { id: "chair", word: "chair", phonetic: "/tʃeə/", chinese: "椅子", sentence: "This is a chair.", instruction: "Touch the chair.", ariaLabel: "chair 椅子" }
]);

export const TWINKLE_WORDS = Object.freeze([
  { id: "twinkle", word: "twinkle", phonetic: "/ˈtwɪŋkəl/", chinese: "闪烁", sentence: "Twinkle, twinkle, little star.", instruction: "Touch twinkle.", ariaLabel: "twinkle 闪烁" },
  { id: "little", word: "little", phonetic: "/ˈlɪtəl/", chinese: "小的", sentence: "The little star is bright.", instruction: "Touch little.", ariaLabel: "little 小的" },
  { id: "star", word: "star", phonetic: "/stɑː/", chinese: "星星", sentence: "The star shines at night.", instruction: "Touch the star.", ariaLabel: "star 星星" },
  { id: "wonder", word: "wonder", phonetic: "/ˈwʌndə/", chinese: "想知道", sentence: "How I wonder what you are!", instruction: "Touch wonder.", ariaLabel: "wonder 想知道" },
  { id: "world", word: "world", phonetic: "/wɜːld/", chinese: "世界", sentence: "Up above the world so high.", instruction: "Touch the world.", ariaLabel: "world 世界" },
  { id: "high", word: "high", phonetic: "/haɪ/", chinese: "高高的", sentence: "The star is high in the sky.", instruction: "Touch high.", ariaLabel: "high 高高的" },
  { id: "diamond", word: "diamond", phonetic: "/ˈdaɪəmənd/", chinese: "钻石", sentence: "Like a diamond in the sky.", instruction: "Touch the diamond.", ariaLabel: "diamond 钻石" },
  { id: "sky", word: "sky", phonetic: "/skaɪ/", chinese: "天空", sentence: "The star is in the sky.", instruction: "Touch the sky.", ariaLabel: "sky 天空" }
]);
export const TWINKLE_LYRICS = Object.freeze([
  Object.freeze({ text: "Twinkle, twinkle, little star,", phonetic: "/ˈtwɪŋkəl ˈtwɪŋkəl ˈlɪtəl stɑː/" }),
  Object.freeze({ text: "How I wonder what you are!", phonetic: "/haʊ aɪ ˈwʌndə wɒt juː ɑː/" }),
  Object.freeze({ text: "Up above the world so high,", phonetic: "/ʌp əˈbʌv ðə wɜːld səʊ haɪ/" }),
  Object.freeze({ text: "Like a diamond in the sky.", phonetic: "/laɪk ə ˈdaɪəmənd ɪn ðə skaɪ/" }),
  Object.freeze({ text: "Twinkle, twinkle, little star,", phonetic: "/ˈtwɪŋkəl ˈtwɪŋkəl ˈlɪtəl stɑː/" }),
  Object.freeze({ text: "How I wonder what you are!", phonetic: "/haʊ aɪ ˈwʌndə wɒt juː ɑː/" })
]);
export const TWINKLE_SPOKEN_LYRICS = TWINKLE_LYRICS.map(({ text }) => text).join(" ");
export const THEME_CONFIGS = Object.freeze({
  body: Object.freeze({
    id: "body", chineseTitle: "身体", englishTitle: "Body", words: THEME_WORDS,
    sceneId: "bodyScene", sceneLabel: "马里奥身体部位互动图",
    learnPrompt: "点击马里奥的身体部位", practicePrompt: "听指令，点击正确部位",
    learnPlaceholderTitle: "点一个身体部位", learnPlaceholderText: "英文、音标、中文和例句会显示在这里。",
    retryLabel: (word) => word.chinese + "（" + word.word + "）",
    instruction: (word) => "Touch Mario's " + word.id + ".",
    completePrompt: "完成！六个部位全部找对", completeTitle: "六个部位全部找对！",
    completeText: "你完成了身体 Body 的听音点击练习。"
  }),
  colors: Object.freeze({
    id: "colors", chineseTitle: "颜色", englishTitle: "Colors", words: COLOR_WORDS,
    sceneId: "colorsScene", sceneLabel: "马里奥风格颜色物体互动图",
    learnPrompt: "点击场景中的彩色物体", practicePrompt: "听指令，点击正确的彩色物体",
    learnPlaceholderTitle: "点一个彩色物体", learnPlaceholderText: "颜色、音标、中文和例句会显示在这里。",
    retryLabel: (word) => word.ariaLabel,
    instruction: (word) => word.instruction,
    completePrompt: "完成！六种颜色全部找对", completeTitle: "六种颜色全部找对！",
    completeText: "你完成了颜色 Colors 的听音点击练习。"
  }),
  numbers1: Object.freeze({
    id: "numbers1", chineseTitle: "数字 1–10", englishTitle: "Numbers 1–10", words: NUMBER_1_10_WORDS,
    sceneId: "numbers1Scene", sceneLabel: "数字一到十数量互动卡",
    learnPrompt: "点击数字卡，数一数对应的金币", practicePrompt: "听数字，点击正确数量卡",
    learnPlaceholderTitle: "点一个数字卡", learnPlaceholderText: "数字、英语、音标和对应数量会显示在这里。",
    retryLabel: (word) => word.ariaLabel,
    instruction: (word) => "Touch number " + word.word + ".",
    completePrompt: "完成！数字一到十全部找对", completeTitle: "数字 1–10 全部找对！",
    completeText: "你完成了数字 1–10 Numbers 1–10 的听音点击练习。"
  }),
  numbersTeens: Object.freeze({
    id: "numbersTeens", chineseTitle: "数字 11–19", englishTitle: "Numbers 11–19", words: NUMBER_11_19_WORDS,
    sceneId: "numbersTeensScene", sceneLabel: "数字十一到十九数量互动卡",
    learnPrompt: "点击数字卡，数一数十一到十九", practicePrompt: "听数字，点击正确数量卡",
    learnPlaceholderTitle: "点一个数字卡", learnPlaceholderText: "数字、英语、音标和对应数量会显示在这里。",
    retryLabel: (word) => word.ariaLabel,
    instruction: (word) => "Touch number " + word.word + ".",
    completePrompt: "完成！数字十一到十九全部找对", completeTitle: "数字 11–19 全部找对！",
    completeText: "你完成了数字 11–19 Numbers 11–19 的听音点击练习。"
  }),
  tens: Object.freeze({
    id: "tens", chineseTitle: "整十 10–100", englishTitle: "Tens 10–100", words: TENS_WORDS,
    sceneId: "tensScene", sceneLabel: "十到一百整十数量互动卡",
    learnPrompt: "点击整十数字卡，观察十个一组", practicePrompt: "听数字，点击正确的整十数量卡",
    learnPlaceholderTitle: "点一个整十数字卡", learnPlaceholderText: "每个小方框代表十个，帮助理解十到一百。",
    retryLabel: (word) => word.ariaLabel,
    instruction: (word) => "Touch " + word.word + ".",
    completePrompt: "完成！十到一百全部找对", completeTitle: "整十 10–100 全部找对！",
    completeText: "你完成了整十 10–100 Tens 10–100 的听音点击练习。"
  }),
  ordinals: Object.freeze({
    id: "ordinals", chineseTitle: "第1到第10", englishTitle: "First–Tenth", words: ORDINAL_WORDS,
    sceneId: "ordinalsScene", sceneLabel: "第一到第十序数词互动卡",
    learnPrompt: "点击序号卡，认识 first 到 tenth", practicePrompt: "听指令，点击正确序号",
    learnPlaceholderTitle: "点一个序号卡", learnPlaceholderText: "序数词、音标、中文和例句会显示在这里。",
    retryLabel: (word) => word.chinese + "（" + word.word + "）",
    instruction: (word) => "Touch the " + word.word + ".",
    completePrompt: "完成！十个序数词全部找对", completeTitle: "十个序数词全部找对！",
    completeText: "你完成了第1到第10 First–Tenth 的听音点击练习。"
  }),
  twinkle: Object.freeze({
    id: "twinkle", chineseTitle: "一闪一闪小星星", englishTitle: "Twinkle, Twinkle, Little Star", words: TWINKLE_WORDS,
    sceneId: "twinkleScene", sceneLabel: "一闪一闪小星星歌词与夜空词汇互动场景",
    learnPrompt: "读歌词，点击夜空中的核心单词", practicePrompt: "听指令，点击正确的童谣单词",
    learnPlaceholderTitle: "点一个童谣单词", learnPlaceholderText: "单词、音标、中文和歌词例句会显示在这里。",
    retryLabel: (word) => word.ariaLabel,
    instruction: (word) => word.instruction,
    completePrompt: "完成！八个童谣单词全部找对", completeTitle: "八个童谣单词全部找对！",
    completeText: "你完成了 Twinkle, Twinkle, Little Star 的听音点击练习。"
  }),
  items1: Object.freeze({
    id: "items1", chineseTitle: "经典道具 I", englishTitle: "Classic Items I", words: CLASSIC_ITEMS_1_WORDS,
    sceneId: "items1Scene", sceneLabel: "经典道具第一系列互动图",
    learnPrompt: "点击场景中的经典道具", practicePrompt: "听指令，点击正确道具",
    learnPlaceholderTitle: "点一个经典道具", learnPlaceholderText: "单词、音标、中文和例句会显示在这里。",
    retryLabel: (word) => word.ariaLabel,
    instruction: (word) => word.instruction,
    completePrompt: "完成！六个经典道具全部找对", completeTitle: "六个经典道具全部找对！",
    completeText: "你完成了经典道具 I Classic Items I 的听音点击练习。"
  }),
  items2: Object.freeze({
    id: "items2", chineseTitle: "经典道具 II", englishTitle: "Classic Items II", words: CLASSIC_ITEMS_2_WORDS,
    sceneId: "items2Scene", sceneLabel: "经典道具第二系列互动图",
    learnPrompt: "点击场景中的能力道具", practicePrompt: "听指令，点击正确能力道具",
    learnPlaceholderTitle: "点一个能力道具", learnPlaceholderText: "单词、音标、中文和例句会显示在这里。",
    retryLabel: (word) => word.ariaLabel, instruction: (word) => word.instruction,
    completePrompt: "完成！六个能力道具全部找对", completeTitle: "六个能力道具全部找对！",
    completeText: "你完成了经典道具 II Classic Items II 的听音点击练习。"
  }),
  items3: Object.freeze({
    id: "items3", chineseTitle: "经典道具 III", englishTitle: "Classic Items III", words: CLASSIC_ITEMS_3_WORDS,
    sceneId: "items3Scene", sceneLabel: "经典道具第三系列互动图",
    learnPrompt: "点击场景中的赛车道具", practicePrompt: "听指令，点击正确赛车道具",
    learnPlaceholderTitle: "点一个赛车道具", learnPlaceholderText: "单词、音标、中文和例句会显示在这里。",
    retryLabel: (word) => word.ariaLabel, instruction: (word) => word.instruction,
    completePrompt: "完成！六个赛车道具全部找对", completeTitle: "六个赛车道具全部找对！",
    completeText: "你完成了经典道具 III Classic Items III 的听音点击练习。"
  }),
  items4: Object.freeze({
    id: "items4", chineseTitle: "经典道具 IV", englishTitle: "Classic Items IV", words: CLASSIC_ITEMS_4_WORDS,
    sceneId: "items4Scene", sceneLabel: "经典道具第四系列互动图",
    learnPrompt: "点击场景中的特殊装备", practicePrompt: "听指令，点击正确特殊装备",
    learnPlaceholderTitle: "点一个特殊装备", learnPlaceholderText: "单词、音标、中文和例句会显示在这里。",
    retryLabel: (word) => word.ariaLabel, instruction: (word) => word.instruction,
    completePrompt: "完成！六个特殊装备全部找对", completeTitle: "六个特殊装备全部找对！",
    completeText: "你完成了经典道具 IV Classic Items IV 的听音点击练习。"
  }),
  classroom: Object.freeze({
    id: "classroom", chineseTitle: "教室用品", englishTitle: "Classroom Things", words: CLASSROOM_WORDS,
    sceneId: "classroomScene", sceneLabel: "教室用品互动图",
    learnPrompt: "点击场景中的教室用品", practicePrompt: "听指令，点击正确的教室用品",
    learnPlaceholderTitle: "点一个教室用品", learnPlaceholderText: "单词、音标、中文和例句会显示在这里。",
    retryLabel: (word) => word.ariaLabel, instruction: (word) => word.instruction,
    completePrompt: "完成！八个教室用品全部找对", completeTitle: "八个教室用品全部找对！",
    completeText: "你完成了教室用品 Classroom Things 的听音点击练习。"
  })
});

export const THEME_SERIES = Object.freeze({
  basics: Object.freeze({ id: "basics", title: "基础认知", description: "认识身体部位和常见颜色。", themeIds: Object.freeze(["body", "colors"]) }),
  counting: Object.freeze({ id: "counting", title: "数字天地", description: "从 1 数到 100，并学习第1到第10。", themeIds: Object.freeze(["numbers1", "numbersTeens", "tens", "ordinals"]) }),
  songs: Object.freeze({ id: "songs", title: "英文童谣", description: "跟着经典童谣学习歌词、音标和核心单词。", themeIds: Object.freeze(["twinkle"]) }),
  items: Object.freeze({ id: "items", title: "经典道具", description: "分四个系列认识马里奥世界里的经典道具。", themeIds: Object.freeze(["items1", "items2", "items3", "items4"]) }),
  classroom: Object.freeze({ id: "classroom", title: "教室用品", description: "认识课堂里常见的文具、书包和桌椅。", themeIds: Object.freeze(["classroom"]) })
});

export function shuffledIds(words = THEME_WORDS, random = Math.random) {
  if (typeof words === "function") {
    random = words;
    words = THEME_WORDS;
  }
  const ids = words.map((item) => item.id);
  for (let index = ids.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [ids[index], ids[other]] = [ids[other], ids[index]];
  }
  return ids;
}

export class ThemeSession {
  constructor(words, random = Math.random) {
    this.words = words;
    this.random = random;
    this.seen = new Set();
    this.startRound();
  }
  word(id) { return this.words.find((item) => item.id === id) || null; }
  learn(id) {
    const word = this.word(id);
    if (!word) throw new Error("Unknown theme target: " + id);
    this.seen.add(id);
    return word;
  }
  startRound() {
    this.questions = shuffledIds(this.words, this.random);
    this.questionIndex = 0;
    this.correctCount = 0;
    this.complete = false;
  }
  target() { return this.complete ? null : this.word(this.questions[this.questionIndex]); }
  answer(id) {
    if (this.complete) return { status: "complete", complete: true };
    const target = this.target();
    if (id !== target.id) return { status: "wrong", complete: false, target };
    this.correctCount += 1;
    this.questionIndex += 1;
    this.complete = this.questionIndex === this.questions.length;
    return { status: "correct", complete: this.complete, target, next: this.target() };
  }
}

export class BodyThemeSession extends ThemeSession {
  constructor(random = Math.random) { super(THEME_WORDS, random); }
}

export function speakEnglish(text, synthesis = globalThis.speechSynthesis, Utterance = globalThis.SpeechSynthesisUtterance) {
  try {
    if (!synthesis || typeof synthesis.speak !== "function" || typeof Utterance !== "function") return false;
    if (typeof synthesis.cancel === "function") synthesis.cancel();
    const utterance = new Utterance(text);
    utterance.lang = "en-GB";
    utterance.rate = 0.86;
    synthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

export const THEME_SPEECH_RESTART_DELAY_MS = 60;

export function createEnglishSpeaker(options = {}) {
  const synthesis = options.synthesis ?? globalThis.speechSynthesis;
  const Utterance = options.Utterance ?? globalThis.SpeechSynthesisUtterance;
  const restartDelayMs = Math.max(0, Number(options.restartDelayMs ?? THEME_SPEECH_RESTART_DELAY_MS) || 0);
  let pending = null;

  function finish(job, reason) {
    if (pending !== job) return;
    clearTimeout(job.restartTimer);
    clearTimeout(job.completionTimer);
    pending = null;
    if (reason === "ended" || reason === "timeout") job.onEnd?.(reason);
    else job.onError?.(reason);
  }

  function cancel() {
    if (pending) {
      clearTimeout(pending.restartTimer);
      clearTimeout(pending.completionTimer);
      pending = null;
    }
    if (!synthesis || typeof synthesis.cancel !== "function") return false;
    try {
      synthesis.cancel();
      return true;
    } catch {
      return false;
    }
  }

  function speak(text, callbacks = {}) {
    const value = String(text || "").trim();
    if (!value || !synthesis || typeof synthesis.speak !== "function" || typeof Utterance !== "function") return false;
    cancel();
    const job = {
      restartTimer: 0,
      completionTimer: 0,
      onEnd: callbacks.onEnd,
      onError: callbacks.onError,
    };
    pending = job;
    job.restartTimer = setTimeout(() => {
      if (pending !== job) return;
      try {
        const utterance = new Utterance(value);
        utterance.lang = "en-GB";
        utterance.rate = 0.86;
        utterance.onend = () => finish(job, "ended");
        utterance.onerror = () => finish(job, "error");
        const words = value.split(/\s+/u).filter(Boolean).length;
        const timeoutMs = Math.max(2500, Math.min(12000, Number(callbacks.timeoutMs) || words * 650 + 1000));
        job.completionTimer = setTimeout(() => finish(job, "timeout"), timeoutMs);
        synthesis.resume?.();
        synthesis.speak(utterance);
        callbacks.onStart?.(utterance);
      } catch {
        finish(job, "error");
      }
    }, restartDelayMs);
    return true;
  }

  return Object.freeze({ speak, cancel });
}

export function countingVisualMarkup(word) {
  if (word.groups) {
    const frames = Array.from({ length: word.groups }, () =>
      '<i class="ten-frame">' + '<b></b>'.repeat(10) + '</i>'
    ).join("");
    return '<span class="counting-visual counting-groups" data-groups="' + word.groups + '" aria-hidden="true">' + frames + '</span>';
  }
  return '<span class="counting-visual counting-units" data-count="' + word.value + '" aria-hidden="true">' +
    '<i></i>'.repeat(word.value) + '</span>';
}

function renderCountingScenes() {
  for (const themeId of ["numbers1", "numbersTeens", "tens"]) {
    const config = THEME_CONFIGS[themeId];
    const board = document.querySelector("#" + themeId + "Figure");
    board.innerHTML = config.words.map((word) =>
      '<button class="scene-target counting-target" type="button" data-target="' + word.id + '" aria-label="' + word.ariaLabel + '">' +
      '<strong>' + word.value + '</strong><span class="counting-word">' + word.word + '</span>' +
      countingVisualMarkup(word) + '</button>'
    ).join("");
  }
}

function initializePage() {
  renderCountingScenes();
  const dom = Object.fromEntries([...document.querySelectorAll("[id]")].map((node) => [node.id, node]));
  const scenes = [...document.querySelectorAll(".theme-scene")];
  let activeThemeId = null;
  let activeSeriesId = null;
  let session = null;
  let stage = "learn";
  let feedbackTimer = 0;
  let advanceTimer = 0;
  const speaker = createEnglishSpeaker();

  const activeConfig = () => THEME_CONFIGS[activeThemeId];
  const activeTargets = () => activeThemeId
    ? [...document.querySelectorAll('[data-theme="' + activeThemeId + '"] .scene-target')]
    : [];

  function speak(text, onEnd) {
    const ok = speaker.speak(text, {
      onEnd,
      onError: () => { dom.ttsNotice.hidden = false; },
    });
    if (!ok) dom.ttsNotice.hidden = false;
    return ok;
  }
  function clearTargetStates() {
    document.querySelectorAll(".scene-target").forEach((target) => {
      target.classList.remove("is-selected", "is-correct", "is-wrong", "is-hint");
      target.setAttribute("aria-pressed", "false");
    });
  }

  function syncSeriesCards() {
    document.querySelectorAll("[data-series-id]").forEach((button) => {
      const series = THEME_SERIES[button.dataset.seriesId];
      if (!series) return;
      const reviewed = series.themeIds.filter((themeId) => progress.store.isThemeReviewed(themeId)).length;
      const complete = reviewed === series.themeIds.length;
      button.classList.toggle("is-complete", complete);
      button.querySelector("[data-series-progress]").textContent = reviewed + "/" + series.themeIds.length + " 已复习";
      button.setAttribute("aria-label", series.title + "，" + series.themeIds.length + "个主题，已复习" + reviewed + "个" + (complete ? "，全部复习完毕" : ""));
    });
  }
  function showSeries(seriesId) {
    const series = THEME_SERIES[seriesId];
    if (!series) return;
    activeSeriesId = seriesId;
    dom.themeSeriesList.hidden = true;
    dom.themeSeriesPanel.hidden = false;
    dom.seriesTitle.textContent = series.title;
    dom.seriesDescription.textContent = series.description;
    document.querySelectorAll(".theme-card[data-series]").forEach((card) => {
      card.hidden = card.dataset.series !== seriesId;
    });
    syncThemeCards();
    document.querySelector('[data-series="' + seriesId + '"] [data-theme-id]')?.focus();
  }
  function returnToSeries() {
    activeSeriesId = null;
    dom.themeSeriesPanel.hidden = true;
    dom.themeSeriesList.hidden = false;
    syncSeriesCards();
    document.querySelector("[data-series-id]")?.focus();
  }

  function syncThemeCards() {
    document.querySelectorAll("[data-theme-id]").forEach((button) => {
      const themeId = button.dataset.themeId;
      const card = button.closest(".theme-card");
      if (!card) return;
      const reviewed = progress.store.isThemeReviewed(themeId);
      card.classList.toggle("is-reviewed", reviewed);
      card.setAttribute("aria-label", THEME_CONFIGS[themeId].chineseTitle + " " + THEME_CONFIGS[themeId].englishTitle + (reviewed ? "，复习完毕" : ""));
      let badge = card.querySelector(".theme-reviewed-badge");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "theme-reviewed-badge";
        badge.setAttribute("aria-hidden", "true");
        badge.textContent = "✓";
        card.append(badge);
      }
      badge.hidden = !reviewed;
    });
    syncSeriesCards();
  }
  function updateLearningCompletion() {
    if (!activeThemeId) return;
    const config = activeConfig();
    const learned = progress.store.isThemeLearned(activeThemeId);
    dom.completeThemeLearning.disabled = learned;
    dom.completeThemeLearning.classList.toggle("is-complete", learned);
    dom.completeThemeLearning.textContent = learned ? "✓ 已学习完毕" : "学习完毕";
    dom.themeLearningStatus.textContent = learned
      ? "本主题 " + config.words.length + " 个单词已加入总词库。"
      : "点击后，本主题全部 " + config.words.length + " 个单词会加入总词库。";
  }
  function completeThemeLearning() {
    if (!activeThemeId) return;
    progress.recordTheme(activeThemeId);
    updateLearningCompletion();
  }
  function toggleCurrentPhonetic() {
    if (stage !== "learn") return false;
    const toggle = dom.wordCard.querySelector("#phoneticToggle");
    const breakdown = dom.wordCard.querySelector("#phonemeBreakdown");
    if (!toggle || !breakdown) return false;
    const expanded = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(expanded));
    breakdown.hidden = !expanded;
    return true;
  }  function renderWord(word) {
    const phonemes = splitPhonetic(word.phonetic);
    const wordIndex = session.words.findIndex(({ id }) => id === word.id);
    const previousDisabled = wordIndex <= 0 ? " disabled" : "";
    const nextDisabled = wordIndex >= session.words.length - 1 ? " disabled" : "";
    const phonemeMarkup = phonemes.map((symbol) => {
      const stressLabel = PHONETIC_STRESS_MARKS[symbol];
      if (stressLabel) return '<span class="phoneme-chip phoneme-stress" data-symbol="' + symbol + '" aria-label="' + stressLabel + '" title="' + stressLabel + '">' + symbol + '</span>';
      return '<span class="phoneme-chip" data-symbol="' + symbol + '">' + symbol + '</span>';
    }).join("");
    dom.wordCard.className = "word-detail";
    dom.wordCard.innerHTML = '<h3 class="word-en">' + word.word + '</h3><button class="phonetic phonetic-toggle" id="phoneticToggle" type="button" aria-expanded="false" aria-controls="phonemeBreakdown" aria-label="拆分 ' + word.word + ' 的音标 ' + word.phonetic + '">' + word.phonetic + '</button><div class="phoneme-breakdown" id="phonemeBreakdown" aria-label="' + word.word + ' 音素拆解" hidden>' + phonemeMarkup + '</div><span class="translation">' + word.chinese + '</span><p class="sentence">' + word.sentence + '</p><div class="word-navigation"><button class="primary-button icon-action sound-action theme-sound-button" id="repeatWord" type="button" aria-label="朗读 ' + word.word + ' 和例句" title="朗读 ' + word.word + ' 和例句"><span aria-hidden="true">🔊</span></button><button class="word-nav-button" id="previousWord" type="button" aria-label="Previous word"' + previousDisabled + '>Previous</button><button class="word-nav-button" id="nextWord" type="button" aria-label="Next word"' + nextDisabled + '>Next</button></div>';
    dom.wordCard.querySelector("#phoneticToggle").addEventListener("click", toggleCurrentPhonetic);
    dom.wordCard.querySelector("#previousWord").addEventListener("click", () => {
      const previousWord = session.words[wordIndex - 1];
      if (previousWord) selectTarget(previousWord.id);
    });
    dom.wordCard.querySelector("#repeatWord").addEventListener("click", () => speak(word.word + ". " + word.sentence));
    dom.wordCard.querySelector("#nextWord").addEventListener("click", () => {
      const nextWord = session.words[wordIndex + 1];
      if (nextWord) selectTarget(nextWord.id);
    });
  }
  function renderLearnPlaceholder(config) {
    dom.wordCard.className = "word-card-placeholder";
    dom.wordCard.innerHTML = '<span class="tap-icon" aria-hidden="true">☝</span><h3>' + config.learnPlaceholderTitle + '</h3><p>' + config.learnPlaceholderText + '</p>';
  }
  function renderQuestion() {
    const config = activeConfig();
    const target = session.target();
    dom.roundProgress.textContent = "第 " + (session.questionIndex + 1) + "/" + session.questions.length + " 题";
    dom.practiceInstruction.textContent = config.instruction(target);
    dom.practiceFeedback.className = "practice-feedback";
    dom.practiceFeedback.textContent = config.practicePrompt + "。";
    dom.sessionProgress.textContent = "练习 " + session.correctCount + "/" + session.questions.length;
  }
  function speakInstruction() {
    const target = session?.target();
    if (target) speak(activeConfig().instruction(target));
  }
  function finishRound() {
    const config = activeConfig();
    dom.practicePanel.hidden = true;
    dom.resultPanel.hidden = false;
    dom.resultTitle.textContent = config.completeTitle;
    dom.resultText.textContent = config.completeText;
    dom.resultScore.textContent = session.correctCount + "/" + session.questions.length;
    dom.sessionProgress.textContent = "练习 " + session.questions.length + "/" + session.questions.length;
    dom.scenePrompt.textContent = config.completePrompt;
    progress.markReviewed(activeThemeId);
    updateLearningCompletion();
    syncThemeCards();
  }
  function setStage(next) {
    if (!session) return;
    stage = next;
    clearTimeout(feedbackTimer);
    clearTimeout(advanceTimer);
    speaker.cancel();
    clearTargetStates();
    const practice = next === "practice";
    const config = activeConfig();
    dom.learnPanel.hidden = practice;
    dom.practicePanel.hidden = !practice;
    dom.resultPanel.hidden = true;
    dom.learnStage.classList.toggle("is-active", !practice);
    dom.practiceStage.classList.toggle("is-active", practice);
    dom.learnStage.setAttribute("aria-pressed", String(!practice));
    dom.practiceStage.setAttribute("aria-pressed", String(practice));
    dom.stageTitle.textContent = practice ? "第二部分 · 互动练习" : "第一部分 · 认识单词";
    dom.scenePrompt.textContent = practice ? config.practicePrompt : config.learnPrompt;
    if (practice) {
      session.startRound();
      renderQuestion();
      speakInstruction();
    } else {
      dom.sessionProgress.textContent = "已认识 " + session.seen.size + "/" + session.words.length;
    }
  }
  function selectTarget(id) {
    if (!session) return;
    clearTimeout(feedbackTimer);
    clearTimeout(advanceTimer);
    speaker.cancel();
    clearTargetStates();
    const targets = activeTargets();
    const targetNode = targets.find((node) => node.dataset.target === id);
    if (!targetNode) return;
    if (stage === "learn") {
      const word = session.learn(id);
      targetNode.classList.add("is-selected");
      targetNode.setAttribute("aria-pressed", "true");
      renderWord(word);
      dom.scenePrompt.textContent = "已选择：" + (word.ariaLabel || word.chinese + " " + word.word);
      dom.sessionProgress.textContent = "已认识 " + session.seen.size + "/" + session.words.length;

      return;
    }
    if (session.complete) return;
    const result = session.answer(id);
    if (result.status === "wrong") {
      targetNode.classList.add("is-wrong");
      const hintNode = targets.find((node) => node.dataset.target === result.target.id);
      hintNode.classList.add("is-hint");
      dom.practiceFeedback.className = "practice-feedback is-error";
      dom.practiceFeedback.textContent = "再试一次。提示：找 " + activeConfig().retryLabel(result.target) + "。";
      speak(activeConfig().instruction(result.target));
      feedbackTimer = setTimeout(clearTargetStates, 900);
      return;
    }
    targetNode.classList.add("is-correct");
    targetNode.setAttribute("aria-pressed", "true");
    dom.practiceFeedback.className = "practice-feedback is-success";
    dom.practiceFeedback.textContent = "答对了！" + result.target.sentence;
    dom.sessionProgress.textContent = "练习 " + session.correctCount + "/" + session.questions.length;
    const advance = () => {
      advanceTimer = setTimeout(() => {
        clearTargetStates();
        if (result.complete) finishRound();
        else {
          renderQuestion();
          speakInstruction();
        }
      }, 350);
    };
    if (!speak(result.target.sentence, advance)) {
      advanceTimer = setTimeout(advance, 900);
    }
  }
  function enterTheme(themeId) {
    const config = THEME_CONFIGS[themeId];
    if (!config) return;
    clearTimeout(feedbackTimer);
    clearTimeout(advanceTimer);
    activeThemeId = themeId;
    activeSeriesId = Object.values(THEME_SERIES).find((series) => series.themeIds.includes(themeId))?.id || activeSeriesId;
    session = new ThemeSession(config.words);
    dom.ttsNotice.hidden = true;
    dom.themePicker.hidden = true;
    dom.learningView.hidden = false;
    dom.activeThemeKicker.textContent = config.chineseTitle + " " + config.englishTitle;
    dom.characterPanel.setAttribute("aria-label", config.sceneLabel);
    scenes.forEach((scene) => { scene.hidden = scene.id !== config.sceneId; });
    renderLearnPlaceholder(config);
    setStage("learn");
    updateLearningCompletion();
    dom.learnStage.focus();
  }
  function returnToPicker() {
    clearTimeout(feedbackTimer);
    speaker.cancel();
    clearTimeout(advanceTimer);
    clearTargetStates();
    activeThemeId = null;
    session = null;
    dom.learningView.hidden = true;
    dom.themePicker.hidden = false;
    syncThemeCards();
    if (activeSeriesId) showSeries(activeSeriesId);
    else returnToSeries();
  }

  document.querySelectorAll("[data-series-id]").forEach((button) => {
    button.addEventListener("click", () => showSeries(button.dataset.seriesId));
  });
  document.querySelectorAll("[data-theme-id]").forEach((button) => {
    button.addEventListener("click", () => enterTheme(button.dataset.themeId));
  });
  document.querySelectorAll(".scene-target").forEach((target) => {
    target.setAttribute("aria-pressed", "false");
    target.addEventListener("click", () => selectTarget(target.dataset.target));
    target.addEventListener("keydown", (event) => {
      if (event.key === " " && stage === "learn" && dom.wordCard.querySelector("#phoneticToggle")) {
        event.preventDefault();
        if (!event.repeat) toggleCurrentPhonetic();
        return;
      }
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (!event.repeat) selectTarget(target.dataset.target);
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || event.key !== " " || event.repeat || stage !== "learn" || !session || dom.learningView.hidden) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("button,a,input,select,textarea,[contenteditable='true']")) return;
    if (toggleCurrentPhonetic()) event.preventDefault();
  });  dom.backToThemes.addEventListener("click", returnToPicker);
  dom.backToSeries.addEventListener("click", returnToSeries);
  dom.learnStage.addEventListener("click", () => setStage("learn"));
  dom.practiceStage.addEventListener("click", () => setStage("practice"));
  dom.playInstruction.addEventListener("click", speakInstruction);
  dom.restartRound.addEventListener("click", () => setStage("practice"));
  dom.speakSongLyrics.addEventListener("click", () => speak(TWINKLE_SPOKEN_LYRICS));

  const progress = initializeThemeProgress({ configs: THEME_CONFIGS });
  dom.completeThemeLearning.addEventListener("click", completeThemeLearning);
  syncThemeCards();
  const api = {
    get activeThemeId() { return activeThemeId; },
    get session() { return session; },
    get activeSeriesId() { return activeSeriesId; },
    enterTheme, showSeries, returnToSeries, returnToPicker, selectTarget, setStage, completeThemeLearning, syncThemeCards, themes: THEME_CONFIGS, series: THEME_SERIES, progress
  };
  window.__THEME_LEARNING__ = api;
  window.__BODY_THEME__ = {
    get session() { return session; },
    selectPart: selectTarget,
    setStage,
    words: THEME_WORDS
  };
}

if (typeof document !== "undefined" && document.querySelector("#themePicker")) initializePage();
