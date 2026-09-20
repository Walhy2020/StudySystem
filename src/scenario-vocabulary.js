import { THEME_CONFIGS } from "../theme-learning.js?v=2.14";
import { buildThemeCatalog } from "./theme-overview.js?v=1.11";
import { totalLearnedWordSet } from "./total-word-library.js?v=1.2";
import { FIRST_MEETING_VOCABULARY } from "../data/scenarios.js?v=1.4";
export { FIRST_MEETING_VOCABULARY };
export const normalizeWord = (value) => String(value || "").trim().toLowerCase().replaceAll("’", "'");
const CONTRACTIONS = { "i'm": ["i", "am"], "you're": ["you", "are"], "we're": ["we", "are"], "they're": ["they", "are"], "it's": ["it", "is"], "he's": ["he", "is"], "she's": ["she", "is"], "don't": ["do", "not"], "can't": ["can", "not"], "i've": ["i", "have"], "i'll": ["i", "will"] };
export function dialogueWords(text, names = []) {
  const excluded = new Set(names.map(normalizeWord));
  return [...new Set((normalizeWord(text).match(/[a-z]+(?:'[a-z]+)*/g) || []).flatMap((word) => CONTRACTIONS[word] || [word]).filter((word) => !excluded.has(word)))];
}
export function knownScenarioWords(storage, learnedWords = [], suffix = "") {
  const known = totalLearnedWordSet(storage, buildThemeCatalog(THEME_CONFIGS), { suffix });
  for (const word of learnedWords) if (typeof word === "string") known.add(normalizeWord(word));
  return known;
}
export function collectScenarioVocabulary(scenarios, known = new Set()) {
  const entries = new Map();
  for (const scenario of scenarios) {
    for (const item of scenario.vocabulary || []) {
      const key = normalizeWord(item.word);
      if (!key) continue;
      const sources = scenario.lines.filter((line) => dialogueWords(line.text).includes(key)).map((line) => ({ scenarioId: scenario.id, title: scenario.chineseTitle || scenario.title, text: line.text }));
      if (!entries.has(key)) entries.set(key, { ...item, word: key, learned: known.has(key), sources: [] });
      entries.get(key).sources.push(...sources);
    }
  }
  return [...entries.values()];
}
