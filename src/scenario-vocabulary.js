// Other modules are read-only here; do not construct their progress stores.
import { THEME_CONFIGS } from "../theme-learning.js?v=2.7";
import { BOOK1_ITEMS } from "../data/book1.js";
export const normalizeWord = (value) => String(value || "").trim().toLowerCase().replaceAll("’", "'");
const CONTRACTIONS = { "i'm": ["i", "am"], "you're": ["you", "are"], "we're": ["we", "are"], "they're": ["they", "are"], "it's": ["it", "is"], "he's": ["he", "is"], "she's": ["she", "is"], "don't": ["do", "not"], "can't": ["can", "not"], "i've": ["i", "have"], "i'll": ["i", "will"] };
export function dialogueWords(text, names = []) {
  const excluded = new Set(names.map(normalizeWord));
  return [...new Set((normalizeWord(text).match(/[a-z]+(?:'[a-z]+)*/g) || []).flatMap((word) => CONTRACTIONS[word] || [word]).filter((word) => !excluded.has(word)))];
}
export const FIRST_MEETING_VOCABULARY = [
  ["hello", "/həˈləʊ/", "你好"], ["my", "/maɪ/", "我的"], ["name", "/neɪm/", "名字"], ["is", "/ɪz/", "是"],
  ["hi", "/haɪ/", "嗨，你好"], ["i", "/aɪ/", "我"], ["am", "/æm/", "是（与 I 连用）"], ["nice", "/naɪs/", "愉快的"],
  ["to", "/tə/", "用于 meet 前"], ["meet", "/miːt/", "认识；见面"], ["you", "/juː/", "你；你们"], ["too", "/tuː/", "也"],
  ["how", "/haʊ/", "怎样"], ["are", "/ɑː/", "是（与 you 连用）"], ["fine", "/faɪn/", "身体好的"], ["thank", "/θæŋk/", "感谢"],
].map(([word, phonetic, chinese]) => ({ word, phonetic, chinese }));
function read(storage, key) {
  try { const value = JSON.parse(storage.getItem(key)); return value && typeof value === "object" ? value : {}; } catch { return {}; }
}
const array = (value) => Array.isArray(value) ? value : [];
export function knownScenarioWords(storage, learnedWords = [], suffix = "") {
  const known = new Set(array(learnedWords).filter((v) => typeof v === "string").map(normalizeWord));
  const theme = read(storage, `mario-theme-learned-v1${suffix}`);
  const themeIds = new Set(array(theme.learned));
  const wholeThemes = new Set([...array(theme.learnedThemes), ...array(theme.reviewedThemes)]);
  for (const config of Object.values(THEME_CONFIGS)) for (const entry of config.words) {
    if (wholeThemes.has(config.id) || themeIds.has(`${config.id}:${entry.id}`)) known.add(normalizeWord(entry.word));
  }
  const book = read(storage, `mario-book1-v1${suffix}`);
  const bookIds = new Set([...array(book.learnedIds), ...array(book.masteredIds)]);
  for (const [id, record] of Object.entries(book.records || {})) if (record && (Number(record.correctCount) > 0 || Number(record.errorCount) > 0)) bookIds.add(id);
  for (const entry of BOOK1_ITEMS) if (entry.type === "word" && bookIds.has(entry.id)) known.add(normalizeWord(entry.word));
  return known;
}
export function collectScenarioVocabulary(scenarios, known = new Set()) {
  const entries = new Map();
  for (const scenario of scenarios) {
    for (const item of scenario.vocabulary || (scenario.id === "first-meeting" ? FIRST_MEETING_VOCABULARY : [])) {
      const key = normalizeWord(item.word);
      if (!key) continue;
      const sources = scenario.lines.filter((line) => dialogueWords(line.text).includes(key)).map((line) => ({ scenarioId: scenario.id, title: scenario.chineseTitle || scenario.title, text: line.text }));
      if (!entries.has(key)) entries.set(key, { ...item, word: key, learned: known.has(key), sources: [] });
      entries.get(key).sources.push(...sources);
    }
  }
  return [...entries.values()];
}
