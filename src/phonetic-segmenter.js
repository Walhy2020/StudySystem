const PHONEME_TOKENS = Object.freeze([
  "iː", "ɜː", "uː", "ɔː", "ɑː", "eɪ", "aɪ", "ɔɪ", "əʊ", "aʊ", "ɪə", "eə", "ʊə",
  "tʃ", "dʒ", "tr", "dr", "ts", "dz",
  "ɪ", "e", "æ", "ə", "ʌ", "ʊ", "ɒ", "p", "b", "t", "d", "k", "ɡ", "f", "v", "θ", "ð",
  "s", "z", "ʃ", "ʒ", "h", "m", "n", "ŋ", "l", "r", "j", "w", "i"
]);

export function splitPhonetic(transcription) {
  if (typeof transcription !== "string") return [];
  let source = transcription.trim();
  if (source.startsWith("/") && source.endsWith("/") && source.length > 1) source = source.slice(1, -1);
  source = source.replaceAll(":", "ː");
  const segments = [];
  for (let index = 0; index < source.length;) {
    const character = source[index];
    if (/\s|[.·-]/u.test(character)) {
      index += 1;
      continue;
    }
    if (character === "ˈ" || character === "ˌ") {
      segments.push(character);
      index += character.length;
      continue;
    }
    const token = PHONEME_TOKENS.find((candidate) => source.startsWith(candidate, index));
    if (token) {
      segments.push(token);
      index += token.length;
      continue;
    }
    segments.push(character);
    index += character.length;
  }
  return segments;
}

export const PHONETIC_STRESS_MARKS = Object.freeze({ "ˈ": "重音", "ˌ": "次重音" });