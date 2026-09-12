export const FIRST_MEETING_LINES = Object.freeze([
  Object.freeze({ id: "mia-intro", speaker: "Mia", text: "Hello! My name is Mia.", phonetic: "/həˈləʊ maɪ neɪm ɪz ˈmiːə/", chinese: "你好！我叫米娅。" }),
  Object.freeze({ id: "leo-intro", speaker: "Leo", text: "Hi, Mia. I'm Leo.", phonetic: "/haɪ ˈmiːə aɪm ˈliːəʊ/", chinese: "嗨，米娅。我叫利奥。" }),
  Object.freeze({ id: "mia-nice", speaker: "Mia", text: "Nice to meet you.", phonetic: "/naɪs tə miːt juː/", chinese: "很高兴认识你。" }),
  Object.freeze({ id: "leo-nice", speaker: "Leo", text: "Nice to meet you, too.", phonetic: "/naɪs tə miːt juː tuː/", chinese: "我也很高兴认识你。" }),
  Object.freeze({ id: "mia-how", speaker: "Mia", text: "How are you?", phonetic: "/haʊ ɑː juː/", chinese: "你好吗？" }),
  Object.freeze({ id: "leo-fine", speaker: "Leo", text: "I'm fine, thank you.", phonetic: "/aɪm faɪn θæŋk juː/", chinese: "我很好，谢谢你。" }),
]);

export const FIRST_MEETING_PRACTICE = Object.freeze([
  Object.freeze({ id: "introductions", promptId: "mia-intro", answerId: "leo-intro", optionIds: Object.freeze(["leo-intro", "leo-nice", "leo-fine"]) }),
  Object.freeze({ id: "nice-to-meet", promptId: "mia-nice", answerId: "leo-nice", optionIds: Object.freeze(["leo-nice", "leo-fine", "leo-intro"]) }),
  Object.freeze({ id: "how-are-you", promptId: "mia-how", answerId: "leo-fine", optionIds: Object.freeze(["leo-fine", "leo-intro", "leo-nice"]) }),
]);

export const WHAT_IS_IT_LINES = Object.freeze([
  Object.freeze({ id: "classroom-look", speaker: "Mia", text: "Look, Leo. What is it?", phonetic: "/lʊk ˈliːəʊ wɒt ɪz ɪt/", chinese: "看，利奥。这是什么？" }),
  Object.freeze({ id: "classroom-pen", speaker: "Leo", text: "It's a pen.", phonetic: "/ɪts ə pen/", chinese: "它是一支笔。" }),
  Object.freeze({ id: "classroom-what-pencils", speaker: "Mia", text: "What are they?", phonetic: "/wɒt ɑː ðeɪ/", chinese: "它们是什么？" }),
  Object.freeze({ id: "classroom-pencils", speaker: "Leo", text: "They're yellow pencils.", phonetic: "/ðeə ˈjeləʊ ˈpensəlz/", chinese: "它们是黄色的铅笔。" }),
  Object.freeze({ id: "classroom-what-marker", speaker: "Mia", text: "And what is it?", phonetic: "/ænd wɒt ɪz ɪt/", chinese: "那这个是什么？" }),
  Object.freeze({ id: "classroom-marker", speaker: "Leo", text: "It's a red marker.", phonetic: "/ɪts ə red ˈmɑːkə/", chinese: "它是一支红色的马克笔。" }),
  Object.freeze({ id: "classroom-what-erasers", speaker: "Mia", text: "And what are they?", phonetic: "/ænd wɒt ɑː ðeɪ/", chinese: "那它们是什么？" }),
  Object.freeze({ id: "classroom-erasers", speaker: "Leo", text: "They're green erasers.", phonetic: "/ðeə ɡriːn ɪˈreɪzəz/", chinese: "它们是绿色的橡皮。" }),
]);

export const WHAT_IS_IT_PRACTICE = Object.freeze([
  Object.freeze({ id: "identify-pen", promptId: "classroom-look", answerId: "classroom-pen", optionIds: Object.freeze(["classroom-pen", "classroom-marker", "classroom-pencils"]) }),
  Object.freeze({ id: "identify-pencils", promptId: "classroom-what-pencils", answerId: "classroom-pencils", optionIds: Object.freeze(["classroom-pencils", "classroom-erasers", "classroom-pen"]) }),
  Object.freeze({ id: "identify-marker", promptId: "classroom-what-marker", answerId: "classroom-marker", optionIds: Object.freeze(["classroom-marker", "classroom-pen", "classroom-erasers"]) }),
  Object.freeze({ id: "identify-erasers", promptId: "classroom-what-erasers", answerId: "classroom-erasers", optionIds: Object.freeze(["classroom-erasers", "classroom-pencils", "classroom-marker"]) }),
]);

export const WHAT_IS_IT_VOCABULARY = Object.freeze([
  ["look", "/lʊk/", "看"], ["what", "/wɒt/", "什么"], ["is", "/ɪz/", "是"], ["it", "/ɪt/", "它"],
  ["a", "/ə/", "一个；一支"], ["pen", "/pen/", "笔"], ["are", "/ɑː/", "是（用于复数）"], ["they", "/ðeɪ/", "它们"],
  ["yellow", "/ˈjeləʊ/", "黄色的"], ["pencils", "/ˈpensəlz/", "铅笔（复数）"], ["and", "/ænd/", "那么；和"],
  ["red", "/red/", "红色的"], ["marker", "/ˈmɑːkə/", "马克笔"], ["green", "/ɡriːn/", "绿色的"],
  ["erasers", "/ɪˈreɪzəz/", "橡皮（复数）"],
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
  }),
  Object.freeze({
    id: "what-is-it",
    number: 2,
    chineseTitle: "这是什么？",
    englishTitle: "What Is It?",
    description: "在教室里辨认文具，练习单数、复数和颜色表达。",
    completionTitle: "这是什么？完成！",
    completionText: "你已经会用英语询问并回答常见文具是什么。",
    lines: WHAT_IS_IT_LINES,
    practice: WHAT_IS_IT_PRACTICE,
    vocabulary: WHAT_IS_IT_VOCABULARY,
  }),
]);

export function scenarioById(id) {
  return SCENARIOS.find((scenario) => scenario.id === id) || null;
}

export function scenarioLineById(scenario, id) {
  return scenario?.lines.find((line) => line.id === id) || null;
}
