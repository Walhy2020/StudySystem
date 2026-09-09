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
]);

export function scenarioById(id) {
  return SCENARIOS.find((scenario) => scenario.id === id) || null;
}

export function scenarioLineById(scenario, id) {
  return scenario?.lines.find((line) => line.id === id) || null;
}
