// This introductory theme teaches only BE contractions (not he has / it has).
export const BE_CONTRACTION_PAIRS = Object.freeze([
  Object.freeze({ id: "i", full: "I am", short: "I'm", fullPhonetic: "/aɪ æm/", shortPhonetic: "/aɪm/", chinese: "我是",
    fullSentence: "I am happy.", shortSentence: "I'm happy.", sentenceChinese: "我很开心。", note: "I 无论在句子哪里都要大写；I 和 am 缩写成 I'm。" }),
  Object.freeze({ id: "he", full: "He is", short: "He's", fullPhonetic: "/hiː ɪz/", shortPhonetic: "/hiːz/", chinese: "他是",
    fullSentence: "He is a boy.", shortSentence: "He's a boy.", sentenceChinese: "他是一个男孩。", note: "he 表示他，和 is 搭配；本主题 He's 表示 He is。" }),
  Object.freeze({ id: "it", full: "It is", short: "It's", fullPhonetic: "/ɪt ɪz/", shortPhonetic: "/ɪts/", chinese: "它是",
    fullSentence: "It is a cat.", shortSentence: "It's a cat.", sentenceChinese: "它是一只猫。", note: "it 表示它，和 is 搭配；It's 是 It is 的缩写，its 则表示它的。" }),
  Object.freeze({ id: "they", full: "They are", short: "They're", fullPhonetic: "/ðeɪ ɑː/", shortPhonetic: "/ðeə/", chinese: "他们是；她们是；它们是",
    fullSentence: "They are friends.", shortSentence: "They're friends.", sentenceChinese: "他们是朋友。", note: "they 表示他们、她们或它们，和 are 搭配；They're 是 They are 的缩写。" }),
  Object.freeze({ id: "she", full: "She is", short: "She's", fullPhonetic: "/ʃiː ɪz/", shortPhonetic: "/ʃiːz/", chinese: "她是",
    fullSentence: "She is a girl.", shortSentence: "She's a girl.", sentenceChinese: "她是一个女孩。", note: "she 表示她，和 is 搭配；本主题 She's 表示 She is。" }),
  Object.freeze({ id: "you", full: "You are", short: "You're", fullPhonetic: "/juː ɑː/", shortPhonetic: "/jɔː/", chinese: "你是；你们是",
    fullSentence: "You are kind.", shortSentence: "You're kind.", sentenceChinese: "你很友善。", note: "you 表示你或你们，和 are 搭配；You're 是 You are 的缩写，your 则表示你的或你们的。" }),
]);

export const BE_CONTRACTION_WORDS = Object.freeze(BE_CONTRACTION_PAIRS.flatMap(pair =>
  ["full", "short"].map(form => Object.freeze({
    id: `${pair.id}-${form}`, word: pair[form], displayWord: pair[form], phonetic: pair[`${form}Phonetic`], chinese: pair.chinese,
    sentence: pair[`${form}Sentence`], sentenceChinese: pair.sentenceChinese,
    fullForm: pair.full, shortForm: pair.short, fullPhonetic: pair.fullPhonetic, shortPhonetic: pair.shortPhonetic,
    form, formLabel: form === "full" ? "完整形式" : "缩写", note: pair.note,
    instruction: form === "short" ? `Choose the short form of ${pair.full}.` : `Choose the full form of ${pair.short}.`,
    ariaLabel: `${pair[form]} ${pair.chinese} ${form === "full" ? "完整形式" : "缩写"}`,
  }))
));
