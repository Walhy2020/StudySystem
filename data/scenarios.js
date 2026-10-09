const tokens = (values) => Object.freeze(values.map(([text, phonetic]) => Object.freeze({ text, phonetic })));
const line = (id, speaker, text, phonetic, chinese, tokenValues, focusObject = null) => Object.freeze({
  id, speaker, text, phonetic, chinese, tokens: tokens(tokenValues), ...(focusObject ? { focusObject } : {}),
});

export const FIRST_MEETING_LINES = Object.freeze([
  line("mia-intro", "Mia", "Hello! My name is Mia.", "/həˈləʊ maɪ neɪm ɪz ˈmiːə/", "你好！我叫米娅。", [["Hello!", "/həˈləʊ/"], ["My", "/maɪ/"], ["name", "/neɪm/"], ["is", "/ɪz/"], ["Mia.", "/ˈmiːə/"]]),
  line("leo-intro", "Leo", "Hi, Mia. I'm Leo.", "/haɪ ˈmiːə aɪm ˈliːəʊ/", "嗨，米娅。我叫利奥。", [["Hi,", "/haɪ/"], ["Mia.", "/ˈmiːə/"], ["I'm", "/aɪm/"], ["Leo.", "/ˈliːəʊ/"]]),
  line("mia-nice", "Mia", "Nice to meet you.", "/naɪs tə miːt juː/", "很高兴认识你。", [["Nice", "/naɪs/"], ["to", "/tə/"], ["meet", "/miːt/"], ["you.", "/juː/"]]),
  line("leo-nice", "Leo", "Nice to meet you, too.", "/naɪs tə miːt juː tuː/", "我也很高兴认识你。", [["Nice", "/naɪs/"], ["to", "/tə/"], ["meet", "/miːt/"], ["you,", "/juː/"], ["too.", "/tuː/"]]),
  line("mia-how", "Mia", "How are you?", "/haʊ ɑː juː/", "你好吗？", [["How", "/haʊ/"], ["are", "/ɑː/"], ["you?", "/juː/"]]),
  line("leo-fine", "Leo", "I'm fine, thank you.", "/aɪm faɪn θæŋk juː/", "我很好，谢谢你。", [["I'm", "/aɪm/"], ["fine,", "/faɪn/"], ["thank", "/θæŋk/"], ["you.", "/juː/"]]),
]);

export const FIRST_MEETING_VOCABULARY = Object.freeze([
  ["hello", "/həˈləʊ/", "你好"], ["my", "/maɪ/", "我的"], ["name", "/neɪm/", "名字"], ["is", "/ɪz/", "是"],
  ["hi", "/haɪ/", "嗨，你好"], ["i", "/aɪ/", "我"], ["am", "/æm/", "是（与 I 连用）"], ["nice", "/naɪs/", "愉快的"],
  ["to", "/tə/", "用于 meet 前"], ["meet", "/miːt/", "认识；见面"], ["you", "/juː/", "你；你们"], ["too", "/tuː/", "也"],
  ["how", "/haʊ/", "怎样"], ["are", "/ɑː/", "是（与 you 连用）"], ["fine", "/faɪn/", "身体好的"], ["thank", "/θæŋk/", "感谢"],
].map(([word, phonetic, chinese]) => Object.freeze({ word, phonetic, chinese })));

export const FIRST_MEETING_PRACTICE = Object.freeze([
  Object.freeze({ id: "introductions", promptId: "mia-intro", answerId: "leo-intro", optionIds: Object.freeze(["leo-intro", "leo-nice", "leo-fine"]) }),
  Object.freeze({ id: "nice-to-meet", promptId: "mia-nice", answerId: "leo-nice", optionIds: Object.freeze(["leo-nice", "leo-fine", "leo-intro"]) }),
  Object.freeze({ id: "how-are-you", promptId: "mia-how", answerId: "leo-fine", optionIds: Object.freeze(["leo-fine", "leo-intro", "leo-nice"]) }),
]);

export const WHAT_IS_IT_LINES = Object.freeze([
  line("classroom-look", "Mia", "Look, Leo. What is it?", "/lʊk ˈliːəʊ wɒt ɪz ɪt/", "看，利奥。这是什么？", [["Look,", "/lʊk/"], ["Leo.", "/ˈliːəʊ/"], ["What", "/wɒt/"], ["is", "/ɪz/"], ["it?", "/ɪt/"]], "pen"),
  line("classroom-pen", "Leo", "It's a pen.", "/ɪts ə pen/", "它是一支笔。", [["It's", "/ɪts/"], ["a", "/ə/"], ["pen.", "/pen/"]], "pen"),
  line("classroom-look-pencils", "Mia", "Look! What are they?", "/lʊk wɒt ɑː ðeɪ/", "看！它们是什么？", [["Look!", "/lʊk/"], ["What", "/wɒt/"], ["are", "/ɑː/"], ["they?", "/ðeɪ/"]], "pencils"),
  line("classroom-pencils", "Leo", "They're pencils.", "/ðeə ˈpensəlz/", "它们是铅笔。", [["They're", "/ðeə/"], ["pencils.", "/ˈpensəlz/"]], "pencils"),
  line("classroom-yellow-pencils", "Mia", "Yes, they're yellow pencils.", "/jes ðeə ˈjeləʊ ˈpensəlz/", "是的，它们是黄色的铅笔。", [["Yes,", "/jes/"], ["they're", "/ðeə/"], ["yellow", "/ˈjeləʊ/"], ["pencils.", "/ˈpensəlz/"]], "pencils"),
  line("classroom-what-marker", "Mia", "And what is it?", "/ænd wɒt ɪz ɪt/", "那这个是什么？", [["And", "/ænd/"], ["what", "/wɒt/"], ["is", "/ɪz/"], ["it?", "/ɪt/"]], "marker"),
  line("classroom-marker", "Leo", "It's a marker. A red marker.", "/ɪts ə ˈmɑːkə ə red ˈmɑːkə/", "它是一支马克笔。一支红色的马克笔。", [["It's", "/ɪts/"], ["a", "/ə/"], ["marker.", "/ˈmɑːkə/"], ["A", "/ə/"], ["red", "/red/"], ["marker.", "/ˈmɑːkə/"]], "marker"),
  line("classroom-good", "Mia", "Yes! Good, Leo.", "/jes ɡʊd ˈliːəʊ/", "答对了！很好，利奥。", [["Yes!", "/jes/"], ["Good,", "/ɡʊd/"], ["Leo.", "/ˈliːəʊ/"]], "marker"),
  line("classroom-what-erasers", "Mia", "And what are they?", "/ænd wɒt ɑː ðeɪ/", "那它们是什么？", [["And", "/ænd/"], ["what", "/wɒt/"], ["are", "/ɑː/"], ["they?", "/ðeɪ/"]], "erasers"),
  line("classroom-erasers", "Leo", "They're erasers.", "/ðeə ɪˈreɪzəz/", "它们是橡皮。", [["They're", "/ðeə/"], ["erasers.", "/ɪˈreɪzəz/"]], "erasers"),
  line("classroom-eraser-color", "Mia", "And what color are they?", "/ænd wɒt ˈkʌlə ɑː ðeɪ/", "那它们是什么颜色？", [["And", "/ænd/"], ["what", "/wɒt/"], ["color", "/ˈkʌlə/"], ["are", "/ɑː/"], ["they?", "/ðeɪ/"]], "erasers"),
  line("classroom-red-guess", "Leo", "They're red.", "/ðeə red/", "它们是红色的。", [["They're", "/ðeə/"], ["red.", "/red/"]], "erasers"),
  line("classroom-green-correction", "Mia", "Red? No, Leo. They're green erasers.", "/red nəʊ ˈliːəʊ ðeə ɡriːn ɪˈreɪzəz/", "红色？不对，利奥。它们是绿色的橡皮。", [["Red?", "/red/"], ["No,", "/nəʊ/"], ["Leo.", "/ˈliːəʊ/"], ["They're", "/ðeə/"], ["green", "/ɡriːn/"], ["erasers.", "/ɪˈreɪzəz/"]], "erasers"),
  line("classroom-red-erasers", "Leo", "No, look! They're red erasers.", "/nəʊ lʊk ðeə red ɪˈreɪzəz/", "不，看！它们是红色的橡皮。", [["No,", "/nəʊ/"], ["look!", "/lʊk/"], ["They're", "/ðeə/"], ["red", "/red/"], ["erasers.", "/ɪˈreɪzəz/"]], "red-erasers"),
]);

export const WHAT_IS_IT_OBJECTS = Object.freeze({
  pen: Object.freeze({ label: "一支蓝色笔", image: "./assets/scenarios/focus-pen-v1.png?v=1.0" }),
  pencils: Object.freeze({ label: "三支黄色铅笔", image: "./assets/scenarios/focus-yellow-pencils-v1.png?v=1.0" }),
  marker: Object.freeze({ label: "一支红色马克笔", image: "./assets/scenarios/focus-red-marker-v1.png?v=1.0" }),
  erasers: Object.freeze({ label: "三块绿色橡皮", image: "./assets/scenarios/focus-green-erasers-v1.png?v=1.0" }),
  "red-erasers": Object.freeze({ label: "三块红色橡皮", image: "./assets/scenarios/focus-red-erasers-v1.png?v=1.0" }),
});

export const WHAT_IS_IT_PRACTICE = Object.freeze([
  Object.freeze({ id: "identify-pen", promptId: "classroom-look", answerId: "classroom-pen", optionIds: Object.freeze(["classroom-pen", "classroom-marker", "classroom-pencils"]) }),
  Object.freeze({ id: "identify-pencils", promptId: "classroom-look-pencils", answerId: "classroom-pencils", optionIds: Object.freeze(["classroom-pencils", "classroom-erasers", "classroom-pen"]) }),
  Object.freeze({ id: "identify-marker", promptId: "classroom-what-marker", answerId: "classroom-marker", optionIds: Object.freeze(["classroom-marker", "classroom-pen", "classroom-erasers"]) }),
  Object.freeze({ id: "identify-erasers", promptId: "classroom-what-erasers", answerId: "classroom-erasers", optionIds: Object.freeze(["classroom-erasers", "classroom-pencils", "classroom-marker"]) }),
  Object.freeze({ id: "identify-eraser-color", promptId: "classroom-eraser-color", answerId: "classroom-green-correction", optionIds: Object.freeze(["classroom-red-guess", "classroom-green-correction", "classroom-red-erasers"]) }),
]);

export const WHAT_IS_IT_VOCABULARY = Object.freeze([
  ["look", "/lʊk/", "看"], ["what", "/wɒt/", "什么"], ["is", "/ɪz/", "是"], ["it", "/ɪt/", "它"],
  ["a", "/ə/", "一个；一支"], ["pen", "/pen/", "笔"], ["are", "/ɑː/", "是（用于复数）"], ["they", "/ðeɪ/", "它们"],
  ["yellow", "/ˈjeləʊ/", "黄色的"], ["pencils", "/ˈpensəlz/", "铅笔（复数）"], ["and", "/ænd/", "那么；和"],
  ["red", "/red/", "红色的"], ["marker", "/ˈmɑːkə/", "马克笔"], ["green", "/ɡriːn/", "绿色的"],
  ["erasers", "/ɪˈreɪzəz/", "橡皮（复数）"], ["yes", "/jes/", "是的；答对了"],
  ["good", "/ɡʊd/", "好的；很棒"], ["color", "/ˈkʌlə/", "颜色"], ["no", "/nəʊ/", "不；不对"],
].map(([word, phonetic, chinese]) => Object.freeze({ word, phonetic, chinese })));

export const COUNTING_EXTRA_GROUPS = Object.freeze([
  ["three-pencils", 3, "three", "/θriː/", "pencils", "/ˈpensəlz/", "三", "支铅笔", "classroom", "pencil"],
  ["two-keys", 2, "two", "/tuː/", "keys", "/kiːz/", "二", "把钥匙", "items1", "key"],
  ["four-mushrooms", 4, "four", "/fɔː/", "mushrooms", "/ˈmʌʃruːmz/", "四", "个蘑菇", "items2", "mushroom"],
  ["five-coins", 5, "five", "/faɪv/", "coins", "/kɔɪnz/", "五", "枚金币", "items1", "coin"],
  ["six-stars", 6, "six", "/sɪks/", "stars", "/stɑːz/", "六", "颗星星", "items1", "star"],
].map(([id, count, number, numberIpa, word, wordIpa, chineseNumber, objectChinese, sourceTheme, sourceWord]) => Object.freeze({ id, count, number, numberIpa, word, wordIpa, chineseNumber, objectChinese, sourceTheme, sourceWord })));

const countingGroupLines = (group) => {
  const prefix = `counting-${group.id}`;
  const number = group.numberIpa.slice(1, -1), word = group.wordIpa.slice(1, -1);
  const amount = group.count === 2 ? "两" : group.chineseNumber;
  return [
    line(`${prefix}-number-question`, "Mia", "What number is it?", "/wɒt ˈnʌmbə ɪz ɪt/", "这是数字几？", [["What", "/wɒt/"], ["number", "/ˈnʌmbə/"], ["is", "/ɪz/"], ["it?", "/ɪt/"]], group.id),
    line(`${prefix}-number-answer`, "Leo", `It is ${group.number}.`, `/ɪt ɪz ${number}/`, `是数字${group.chineseNumber}。`, [["It", "/ɪt/"], ["is", "/ɪz/"], [`${group.number}.`, group.numberIpa]], group.id),
    line(`${prefix}-question`, "Mia", `How many ${group.word} do you have?`, `/haʊ ˈmeni ${word} duː juː hæv/`, `你有多少${group.objectChinese}？`, [["How", "/haʊ/"], ["many", "/ˈmeni/"], [group.word, group.wordIpa], ["do", "/duː/"], ["you", "/juː/"], ["have?", "/hæv/"]], group.id),
    line(`${prefix}-answer`, "Leo", `I have ${group.number} ${group.word}.`, `/aɪ hæv ${number} ${word}/`, `我有${amount}${group.objectChinese}。`, [["I", "/aɪ/"], ["have", "/hæv/"], [group.number, group.numberIpa], [`${group.word}.`, group.wordIpa]], group.id),
  ];
};

export const COUNTING_LINES = Object.freeze([
  line("counting-number-question", "Mia", "What number is it?", "/wɒt ˈnʌmbə ɪz ɪt/", "这是数字几？", [["What", "/wɒt/"], ["number", "/ˈnʌmbə/"], ["is", "/ɪz/"], ["it?", "/ɪt/"]], "eight-pens"),
  line("counting-number-answer", "Leo", "It is eight.", "/ɪt ɪz eɪt/", "是数字八。", [["It", "/ɪt/"], ["is", "/ɪz/"], ["eight.", "/eɪt/"]], "eight-pens"),
  line("counting-pens-question", "Mia", "How many pens do you have?", "/haʊ ˈmeni penz duː juː hæv/", "你有多少支笔？", [["How", "/haʊ/"], ["many", "/ˈmeni/"], ["pens", "/penz/"], ["do", "/duː/"], ["you", "/juː/"], ["have?", "/hæv/"]], "eight-pens"),
  line("counting-pens-answer", "Leo", "I have eight pens.", "/aɪ hæv eɪt penz/", "我有八支笔。", [["I", "/aɪ/"], ["have", "/hæv/"], ["eight", "/eɪt/"], ["pens.", "/penz/"]], "eight-pens"),
  ...COUNTING_EXTRA_GROUPS.flatMap(countingGroupLines),
]);

export const COUNTING_VOCABULARY = Object.freeze([
  ["what", "/wɒt/", "什么"], ["number", "/ˈnʌmbə/", "数字"], ["is", "/ɪz/", "是"], ["it", "/ɪt/", "它"],
  ["eight", "/eɪt/", "八"], ["how", "/haʊ/", "怎样（how many 表示多少）"], ["many", "/ˈmeni/", "许多（how many 表示多少）"],
  ["pens", "/penz/", "笔（复数）"], ["do", "/duː/", "用于构成疑问句"], ["you", "/juː/", "你；你们"],
  ["have", "/hæv/", "有"], ["i", "/aɪ/", "我"],
  ...COUNTING_EXTRA_GROUPS.flatMap(group => [[group.number, group.numberIpa, group.chineseNumber], [group.word, group.wordIpa, `${group.objectChinese.slice(1)}（复数）`]]),
].map(([word, phonetic, chinese]) => Object.freeze({ word, phonetic, chinese })));

export const COUNTING_PRACTICE = Object.freeze([
  Object.freeze({ id: "read-eight", promptId: "counting-number-question", answerId: "counting-number-answer", optionIds: Object.freeze(["counting-number-answer", "counting-pens-answer", "counting-pens-question"]) }),
  Object.freeze({ id: "count-eight-pens", promptId: "counting-pens-question", answerId: "counting-pens-answer", optionIds: Object.freeze(["counting-number-answer", "counting-number-question", "counting-pens-answer"]) }),
  ...COUNTING_EXTRA_GROUPS.flatMap(group => {
    const prefix = `counting-${group.id}`;
    return [
      Object.freeze({ id: `read-${group.number}`, promptId: `${prefix}-number-question`, answerId: `${prefix}-number-answer`, optionIds: Object.freeze(["counting-number-answer", `${prefix}-number-answer`, `${prefix}-answer`]) }),
      Object.freeze({ id: `count-${group.id}`, promptId: `${prefix}-question`, answerId: `${prefix}-answer`, optionIds: Object.freeze([`${prefix}-answer`, "counting-pens-answer", `${prefix}-number-answer`]) }),
    ];
  }),
]);

export const FRUIT_TASTING_GROUPS = Object.freeze([
  Object.freeze({ id: "apple", article: "an", articleIpa: "/ən/", fruitIpa: "/ˈæpəl/", chinese: "苹果", color: "red", colorIpa: "/red/", colorChinese: "红色", taste: "sweet and crisp", tasteIpa: "/swiːt ən krɪsp/", tasteChinese: "甜而脆", tasteTokens: Object.freeze([["sweet", "/swiːt/"], ["and", "/ən/"], ["crisp.", "/krɪsp/"]]), image: "fruit-red-apple-v1" }),
  Object.freeze({ id: "lemon", article: "a", articleIpa: "/ə/", fruitIpa: "/ˈlemən/", chinese: "柠檬", color: "yellow", colorIpa: "/ˈjeləʊ/", colorChinese: "黄色", taste: "sour", tasteIpa: "/ˈsaʊə/", tasteChinese: "酸", image: "fruit-yellow-lemon-v1" }),
  Object.freeze({ id: "pear", article: "a", articleIpa: "/ə/", fruitIpa: "/peə/", chinese: "梨", color: "green", colorIpa: "/ɡriːn/", colorChinese: "绿色", taste: "sweet", tasteIpa: "/swiːt/", tasteChinese: "甜", image: "fruit-green-pear-v1" }),
  Object.freeze({ id: "orange", article: "an", articleIpa: "/ən/", fruitIpa: "/ˈɒrɪndʒ/", chinese: "橙子", color: "orange", colorIpa: "/ˈɒrɪndʒ/", colorChinese: "橙色", taste: "sweet", tasteIpa: "/swiːt/", tasteChinese: "甜", image: "fruit-orange-v1" }),
  Object.freeze({ id: "banana", article: "a", articleIpa: "/ə/", fruitIpa: "/bəˈnɑːnə/", chinese: "香蕉", color: "yellow", colorIpa: "/ˈjeləʊ/", colorChinese: "黄色", taste: "sweet", tasteIpa: "/swiːt/", tasteChinese: "甜", image: "fruit-banana-v1" }),
  Object.freeze({ id: "strawberry", article: "a", articleIpa: "/ə/", fruitIpa: "/ˈstrɔːbəri/", chinese: "草莓", color: "red", colorIpa: "/red/", colorChinese: "红色", taste: "sweet", tasteIpa: "/swiːt/", tasteChinese: "甜", image: "fruit-strawberry-v1" }),
]);

const fruitGroupLines = ({ id, article, articleIpa, fruitIpa, chinese, color, colorIpa, colorChinese, taste, tasteIpa, tasteChinese, tasteTokens }) => [
  line(`${id}-fruit-question`, "Mia", "What fruit is this?", "/wɒt fruːt ɪz ðɪs/", "这是什么水果？", [["What", "/wɒt/"], ["fruit", "/fruːt/"], ["is", "/ɪz/"], ["this?", "/ðɪs/"]], id),
  line(`${id}-fruit-answer`, "Leo", `It's ${article} ${id}.`, `/ɪts ${articleIpa.slice(1, -1)} ${fruitIpa.slice(1, -1)}/`, `这是${chinese}。`, [["It's", "/ɪts/"], [article, articleIpa], [`${id}.`, fruitIpa]], id),
  line(`${id}-color-question`, "Mia", "What color is it?", "/wɒt ˈkʌlə ɪz ɪt/", "它是什么颜色？", [["What", "/wɒt/"], ["color", "/ˈkʌlə/"], ["is", "/ɪz/"], ["it?", "/ɪt/"]], id),
  line(`${id}-color-answer`, "Leo", `It's ${color}.`, `/ɪts ${colorIpa.slice(1, -1)}/`, `它是${colorChinese}的。`, [["It's", "/ɪts/"], [`${color}.`, colorIpa]], id),
  line(`${id}-taste-question`, "Mia", "How does it taste?", "/haʊ dʌz ɪt teɪst/", "它尝起来怎么样？", [["How", "/haʊ/"], ["does", "/dʌz/"], ["it", "/ɪt/"], ["taste?", "/teɪst/"]], id),
  line(`${id}-taste-answer`, "Leo", `It tastes ${taste}.`, `/ɪt teɪsts ${tasteIpa.slice(1, -1)}/`, `它尝起来是${tasteChinese}的。`, [["It", "/ɪt/"], ["tastes", "/teɪsts/"], ...(tasteTokens || [[`${taste}.`, tasteIpa]])], id),
];

export const FRUIT_TASTING_LINES = Object.freeze(FRUIT_TASTING_GROUPS.flatMap(fruitGroupLines));
export const FRUIT_TASTING_OBJECTS = Object.freeze(Object.fromEntries(FRUIT_TASTING_GROUPS.map(({ id, colorChinese, chinese, image }) => [
  id, Object.freeze({ label: `${colorChinese}${chinese}`, image: `./assets/scenarios/${image}.png?v=1.0` }),
])));
export const FRUIT_TASTING_PRACTICE = Object.freeze(FRUIT_TASTING_GROUPS.flatMap(({ id, color, taste }) => [
  Object.freeze({ id: `identify-${id}`, promptId: `${id}-fruit-question`, answerId: `${id}-fruit-answer`, optionIds: Object.freeze([`${id}-fruit-answer`, ...FRUIT_TASTING_GROUPS.filter(fruit => fruit.id !== id).slice(0, 2).map(fruit => `${fruit.id}-fruit-answer`)]) }),
  Object.freeze({ id: `color-${id}`, promptId: `${id}-color-question`, answerId: `${id}-color-answer`, optionIds: Object.freeze([`${id}-color-answer`, ...FRUIT_TASTING_GROUPS.filter(fruit => fruit.color !== color).filter((fruit, index, fruits) => fruits.findIndex(other => other.color === fruit.color) === index).slice(0, 2).map(fruit => `${fruit.id}-color-answer`)]) }),
  Object.freeze({ id: `taste-${id}`, promptId: `${id}-taste-question`, answerId: `${id}-taste-answer`, optionIds: Object.freeze([`${id}-taste-answer`, `${taste === "sour" ? "apple" : "lemon"}-taste-answer`, `${id}-fruit-answer`]) }),
]));
export const FRUIT_TASTING_VOCABULARY = Object.freeze([
  ["what", "/wɒt/", "什么"], ["fruit", "/fruːt/", "水果"], ["is", "/ɪz/", "是"], ["this", "/ðɪs/", "这个"],
  ["it", "/ɪt/", "它"], ["an", "/ən/", "一个"], ["apple", "/ˈæpəl/", "苹果"], ["color", "/ˈkʌlə/", "颜色"],
  ["red", "/red/", "红色的"], ["how", "/haʊ/", "怎样"], ["does", "/dʌz/", "用于提问"], ["taste", "/teɪst/", "尝起来"],
  ["tastes", "/teɪsts/", "尝起来（第三人称）"], ["sweet", "/swiːt/", "甜的"], ["a", "/ə/", "一个"], ["lemon", "/ˈlemən/", "柠檬"],
  ["yellow", "/ˈjeləʊ/", "黄色的"], ["sour", "/ˈsaʊə/", "酸的"], ["pear", "/peə/", "梨"], ["green", "/ɡriːn/", "绿色的"],
  ["and", "/ən/", "和"], ["crisp", "/krɪsp/", "脆的"], ["orange", "/ˈɒrɪndʒ/", "橙子；橙色的"], ["banana", "/bəˈnɑːnə/", "香蕉"], ["strawberry", "/ˈstrɔːbəri/", "草莓"],
].map(([word, phonetic, chinese]) => Object.freeze({ word, phonetic, chinese })));

export const SELF_INTRODUCTION_LINES = Object.freeze([
  line("self-mia-hello", "Mia", "Hello! I'm Mia.", "/həˈləʊ aɪm ˈmiːə/", "你好！我是米娅。", [["Hello!", "/həˈləʊ/"], ["I'm", "/aɪm/"], ["Mia.", "/ˈmiːə/"]]),
  line("self-mia-age", "Mia", "I'm eight years old.", "/aɪm eɪt jɪəz əʊld/", "我八岁了。", [["I'm", "/aɪm/"], ["eight", "/eɪt/"], ["years", "/jɪəz/"], ["old.", "/əʊld/"]]),
  line("self-mia-home", "Mia", "I live in Beijing.", "/aɪ lɪv ɪn ˌbeɪˈdʒɪŋ/", "我住在北京。", [["I", "/aɪ/"], ["live", "/lɪv/"], ["in", "/ɪn/"], ["Beijing.", "/ˌbeɪˈdʒɪŋ/"]]),
  line("self-mia-pen", "Mia", "I have a pen.", "/aɪ hæv ə pen/", "我有一支笔。", [["I", "/aɪ/"], ["have", "/hæv/"], ["a", "/ə/"], ["pen.", "/pen/"]], "pen"),
  line("self-mia-apple", "Mia", "I have an apple.", "/aɪ hæv ən ˈæpəl/", "我有一个苹果。", [["I", "/aɪ/"], ["have", "/hæv/"], ["an", "/ən/"], ["apple.", "/ˈæpəl/"]], "apple"),
  line("self-mia-flower", "Mia", "I have a flower.", "/aɪ hæv ə ˈflaʊə/", "我有一朵花（游戏里的火焰花）。", [["I", "/aɪ/"], ["have", "/hæv/"], ["a", "/ə/"], ["flower.", "/ˈflaʊə/"]], "flower"),
  line("self-leo-hello", "Leo", "Hello! I'm Leo.", "/həˈləʊ aɪm ˈliːəʊ/", "你好！我是利奥。", [["Hello!", "/həˈləʊ/"], ["I'm", "/aɪm/"], ["Leo.", "/ˈliːəʊ/"]]),
  line("self-leo-age", "Leo", "I'm nine years old.", "/aɪm naɪn jɪəz əʊld/", "我九岁了。", [["I'm", "/aɪm/"], ["nine", "/naɪn/"], ["years", "/jɪəz/"], ["old.", "/əʊld/"]]),
  line("self-leo-home", "Leo", "I live in Lujiang.", "/aɪ lɪv ɪn luː dʒjɑːŋ/", "我住在庐江。", [["I", "/aɪ/"], ["live", "/lɪv/"], ["in", "/ɪn/"], ["Lujiang.", "/luː dʒjɑːŋ/"]]),
  line("self-leo-pencil", "Leo", "I have a pencil.", "/aɪ hæv ə ˈpensəl/", "我有一支铅笔。", [["I", "/aɪ/"], ["have", "/hæv/"], ["a", "/ə/"], ["pencil.", "/ˈpensəl/"]], "pencil"),
  line("self-leo-banana", "Leo", "I have a banana.", "/aɪ hæv ə bəˈnɑːnə/", "我有一根香蕉。", [["I", "/aɪ/"], ["have", "/hæv/"], ["a", "/ə/"], ["banana.", "/bəˈnɑːnə/"]], "banana"),
  line("self-leo-flower", "Leo", "I have a flower.", "/aɪ hæv ə ˈflaʊə/", "我有一朵花（游戏里的火焰花）。", [["I", "/aɪ/"], ["have", "/hæv/"], ["a", "/ə/"], ["flower.", "/ˈflaʊə/"]], "flower"),
]);

export const SELF_INTRODUCTION_OBJECTS = Object.freeze({
  pen: WHAT_IS_IT_OBJECTS.pen,
  apple: FRUIT_TASTING_OBJECTS.apple,
  pencil: Object.freeze({ label: "一支黄色铅笔（教室用品）", image: "./assets/scenarios/self-intro-pencil-v1.png?v=1.0" }),
  banana: FRUIT_TASTING_OBJECTS.banana,
  flower: Object.freeze({ label: "经典道具 II 的火焰花，没有火焰形状", image: "./assets/scenarios/self-intro-flower-v1.png?v=1.0" }),
});

export const SELF_INTRODUCTION_VOCABULARY = Object.freeze([
  ["hello", "/həˈləʊ/", "你好"], ["i", "/aɪ/", "我"], ["am", "/æm/", "是（与 I 连用）"],
  ["eight", "/eɪt/", "八"], ["nine", "/naɪn/", "九"], ["years", "/jɪəz/", "年（复数）"],
  ["old", "/əʊld/", "年龄为……的"], ["live", "/lɪv/", "居住"], ["in", "/ɪn/", "在……里面；在（某地）"],
  ["have", "/hæv/", "有"], ["a", "/ə/", "一个；一支"], ["an", "/ən/", "一个（用于元音音素前）"],
  ["pen", "/pen/", "笔"], ["pencil", "/ˈpensəl/", "铅笔"], ["apple", "/ˈæpəl/", "苹果"],
  ["banana", "/bəˈnɑːnə/", "香蕉"], ["flower", "/ˈflaʊə/", "花（游戏画面使用火焰花）"],
].map(([word, phonetic, chinese]) => Object.freeze({ word, phonetic, chinese })));

export const SELF_INTRODUCTION_PRACTICE = Object.freeze([
  ["hello", "self-mia-hello", "self-leo-hello", "self-leo-age", "self-leo-home"],
  ["age", "self-mia-age", "self-leo-age", "self-leo-home", "self-leo-pencil"],
  ["home", "self-mia-home", "self-leo-home", "self-leo-age", "self-leo-banana"],
  ["stationery", "self-mia-pen", "self-leo-pencil", "self-leo-banana", "self-leo-flower"],
  ["fruit", "self-mia-apple", "self-leo-banana", "self-leo-pencil", "self-leo-home"],
  ["flower", "self-mia-flower", "self-leo-flower", "self-leo-banana", "self-leo-pencil"],
].map(([id, promptId, answerId, wrong1, wrong2]) => Object.freeze({
  id: `self-${id}`, promptId, answerId, optionIds: Object.freeze([wrong1, answerId, wrong2]),
})));

export const CLASSROOM_COMMAND_LINES = Object.freeze([
  line("command-stand-up", "Mia", "Please stand up.", "/pliːz stænd ʌp/", "请站起来。", [["Please", "/pliːz/"], ["stand", "/stænd/"], ["up.", "/ʌp/"]], "stand-up"),
  line("command-sit-down", "Mia", "Please sit down.", "/pliːz sɪt daʊn/", "请坐下。", [["Please", "/pliːz/"], ["sit", "/sɪt/"], ["down.", "/daʊn/"]], "sit-down"),
  line("command-raise-hands", "Mia", "Please raise your hands.", "/pliːz reɪz jɔː hændz/", "请举起小手。", [["Please", "/pliːz/"], ["raise", "/reɪz/"], ["your", "/jɔː/"], ["hands.", "/hændz/"]], "raise-hands"),
  line("command-thank-you", "Mia", "Thank you.", "/θæŋk juː/", "谢谢你。", [["Thank", "/θæŋk/"], ["you.", "/juː/"]]),
  line("command-welcome", "Leo", "You're welcome.", "/jɔː ˈwelkəm/", "不客气。", [["You're", "/jɔː/"], ["welcome.", "/ˈwelkəm/"]]),
]);

export const CLASSROOM_COMMAND_OBJECTS = Object.freeze({
  "stand-up": Object.freeze({ label: "小朋友站在椅子旁，双脚着地，双手自然放下", image: "./assets/scenarios/command-stand-up-v1.png?v=1.0" }),
  "sit-down": Object.freeze({ label: "小朋友坐在椅子上，双脚着地", image: "./assets/scenarios/command-sit-down-v1.png?v=1.0" }),
  "raise-hands": Object.freeze({ label: "小朋友站好，双手举过头顶", image: "./assets/scenarios/command-raise-hands-v1.png?v=1.0" }),
});

export const CLASSROOM_COMMAND_VOCABULARY = Object.freeze([
  ["please", "/pliːz/", "请"], ["stand", "/stænd/", "站；站立"], ["up", "/ʌp/", "向上（stand up 表示站起来）"],
  ["sit", "/sɪt/", "坐"], ["down", "/daʊn/", "向下（sit down 表示坐下）"], ["raise", "/reɪz/", "举起"],
  ["your", "/jɔː/", "你的；你们的"], ["hands", "/hændz/", "手（复数）"], ["thank", "/θæŋk/", "感谢"],
  ["you", "/juː/", "你；你们"], ["are", "/ɑː/", "是（You're 是 You are 的缩写）"], ["welcome", "/ˈwelkəm/", "不客气（用于 You're welcome）"],
].map(([word, phonetic, chinese]) => Object.freeze({ word, phonetic, chinese })));

export const CLASSROOM_COMMAND_PRACTICE = Object.freeze([
  ["stand-up", "sit-down", "raise-hands"],
  ["sit-down", "raise-hands", "stand-up"],
  ["raise-hands", "stand-up", "sit-down"],
  ["thank-you", "welcome", "stand-up"],
  ["welcome", "thank-you", "sit-down"],
].map(([correct, wrong1, wrong2], index) => {
  const answerId = `command-${correct}`;
  const options = [`command-${wrong1}`, `command-${wrong2}`];
  options.splice(index % 3, 0, answerId);
  return Object.freeze({ id: `match-${correct}`, promptId: answerId, answerId, optionIds: Object.freeze(options) });
}));

export const SCENARIOS = Object.freeze([
  Object.freeze({
    id: "first-meeting",
    number: 1,
    chineseTitle: "第一次见面",
    englishTitle: "First Meeting",
    description: "学习问候、自我介绍和第一次见面时的简短回应。",
    lines: FIRST_MEETING_LINES,
    practice: FIRST_MEETING_PRACTICE,
    vocabulary: FIRST_MEETING_VOCABULARY,
  }),
  Object.freeze({
    id: "what-is-it",
    number: 2,
    chineseTitle: "这是什么？",
    englishTitle: "What Is It?",
    description: "在教室里辨认文具，练习单数、复数、颜色判断和纠正表达。",
    completionTitle: "这是什么？完成！",
    completionText: "你已经会用英语询问并回答常见文具是什么。",
    lines: WHAT_IS_IT_LINES,
    practice: WHAT_IS_IT_PRACTICE,
    vocabulary: WHAT_IS_IT_VOCABULARY,
    focusObjects: WHAT_IS_IT_OBJECTS,
  }),
  Object.freeze({
    id: "counting-pens",
    number: 3,
    chineseTitle: "数一数",
    englishTitle: "Let's Count!",
    description: "用笔、铅笔、钥匙、蘑菇、金币和星星，先认数字，再问数量。",
    completionTitle: "数一数完成！",
    completionText: "你已经会询问数字，并用英语问答物品的数量。",
    lines: COUNTING_LINES,
    practice: COUNTING_PRACTICE,
    vocabulary: COUNTING_VOCABULARY,
    focusObjects: Object.freeze({
      "eight-pens": Object.freeze({ label: "数字8和八支蓝色笔，每排四支，共两排", image: "./assets/scenarios/counting-pens-v1.png?v=1.0" }),
      ...Object.fromEntries(COUNTING_EXTRA_GROUPS.map(group => [group.id, Object.freeze({ label: `数字${group.count}和${group.count === 2 ? "两" : group.chineseNumber}${group.objectChinese}`, image: `./assets/scenarios/counting-${group.id}-v1.png?v=1.0` })])),
    }),
  }),
  Object.freeze({
    id: "fruit-tasting",
    number: 4,
    chineseTitle: "水果尝一尝",
    englishTitle: "Fruit Tasting",
    description: "认识六种水果，练习询问颜色和味道，包括酸与甜脆。",
    completionTitle: "水果尝一尝完成！",
    completionText: "你已经会说出六种水果的名字、颜色和味道。",
    lines: FRUIT_TASTING_LINES,
    practice: FRUIT_TASTING_PRACTICE,
    vocabulary: FRUIT_TASTING_VOCABULARY,
    focusObjects: FRUIT_TASTING_OBJECTS,
  }),
  Object.freeze({
    id: "self-introduction",
    number: 5,
    chineseTitle: "介绍一下自己",
    englishTitle: "Introducing Ourselves",
    description: "米娅先介绍姓名、年龄、城市和物品，利奥再用相同句式介绍。",
    completionTitle: "自我介绍完成！",
    completionText: "你已经会介绍自己是谁、几岁、住在哪里，以及自己有什么。",
    practiceInstruction: "听米娅的介绍，选出利奥介绍同类信息的句子。",
    lines: SELF_INTRODUCTION_LINES,
    practice: SELF_INTRODUCTION_PRACTICE,
    vocabulary: SELF_INTRODUCTION_VOCABULARY,
    focusObjects: SELF_INTRODUCTION_OBJECTS,
  }),
  Object.freeze({
    id: "classroom-commands",
    number: 6,
    chineseTitle: "课堂指令",
    englishTitle: "Classroom Commands",
    description: "练习站起来、坐下、举起小手，以及谢谢你和不客气。",
    completionTitle: "课堂指令完成！",
    completionText: "你已经会说三句简单课堂指令，以及谢谢你和不客气。",
    practiceMode: "chinese-to-english",
    practiceInstruction: "看中文提示，选出对应的英文；也可以点击声音按钮听英文提示。",
    focusKind: "动作",
    lines: CLASSROOM_COMMAND_LINES,
    practice: CLASSROOM_COMMAND_PRACTICE,
    vocabulary: CLASSROOM_COMMAND_VOCABULARY,
    focusObjects: CLASSROOM_COMMAND_OBJECTS,
  }),
]);

export function scenarioById(id) {
  return SCENARIOS.find((scenario) => scenario.id === id) || null;
}

export function scenarioLineById(scenario, id) {
  return scenario?.lines.find((line) => line.id === id) || null;
}
