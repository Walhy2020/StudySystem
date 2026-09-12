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
]);

export function scenarioById(id) {
  return SCENARIOS.find((scenario) => scenario.id === id) || null;
}

export function scenarioLineById(scenario, id) {
  return scenario?.lines.find((line) => line.id === id) || null;
}
