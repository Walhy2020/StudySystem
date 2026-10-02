// 23 initials, 24 finals and 16 whole syllables; no Hanzi or example words.
export const PINYIN_GROUPS = Object.freeze([
  { id: "initial", title: "声母", symbols: "b p m f d t n l g k h j q x zh ch sh r z c s y w".split(" ") },
  { id: "final", title: "韵母", symbols: "a o e i u ü ai ei ui ao ou iu ie üe er an en in un ün ang eng ing ong".split(" ") },
  { id: "syllable", title: "整体认读音节", symbols: "zhi chi shi ri zi ci si yi wu yu ye yue yuan yin yun ying".split(" ") },
].map(group => Object.freeze({ ...group, symbols: Object.freeze(group.symbols) })));
export const PINYIN_ITEMS = Object.freeze(PINYIN_GROUPS.flatMap(group => group.symbols.map(symbol =>
  Object.freeze({ id: `pinyin-${group.id}-${symbol.replaceAll("ü", "v")}`,
    symbol, category: group.id, title: group.title }))));
