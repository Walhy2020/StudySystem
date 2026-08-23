(function () {
  const POLYPHONIC_PINYIN = {
    "的": ["de", "dí", "dì"],
    "地": ["dì", "de"],
    "得": ["dé", "děi", "de"],
    "给": ["gěi", "jǐ"],
    "了": ["le", "liǎo"],
    "着": ["zhe", "zháo", "zhuó"],
    "都": ["dōu", "dū"],
    "为": ["wèi", "wéi"],
    "行": ["xíng", "háng"],
    "乐": ["lè", "yuè"],
    "长": ["cháng", "zhǎng"],
    "重": ["zhòng", "chóng"],
    "朝": ["cháo", "zhāo"],
    "觉": ["jué", "jiào"],
    "数": ["shù", "shǔ"],
    "只": ["zhī", "zhǐ"],
    "中": ["zhōng", "zhòng"],
    "好": ["hǎo", "hào"],
    "还": ["hái", "huán"],
    "少": ["shǎo", "shào"],
    "大": ["dà", "dài"],
    "会": ["huì", "kuài"],
    "看": ["kàn", "kān"],
    "要": ["yào", "yāo"],
    "当": ["dāng", "dàng"],
    "空": ["kōng", "kòng"],
    "种": ["zhǒng", "zhòng"],
    "处": ["chù", "chǔ"],
    "发": ["fā", "fà"],
    "干": ["gān", "gàn"],
    "分": ["fēn", "fèn"],
    "教": ["jiāo", "jiào"],
    "校": ["xiào", "jiào"],
    "便": ["biàn", "pián"],
    "间": ["jiān", "jiàn"],
    "没": ["méi", "mò"],
    "背": ["bèi", "bēi"],
    "应": ["yīng", "yìng"],
    "曲": ["qū", "qǔ"],
    "兴": ["xīng", "xìng"],
    "转": ["zhuǎn", "zhuàn"],
    "似": ["sì", "shì"],
    "强": ["qiáng", "qiǎng", "jiàng"],
    "弹": ["dàn", "tán"],
    "圈": ["quān", "juàn"],
    "号": ["hào", "háo"],
    "藏": ["cáng", "zàng"],
    "传": ["chuán", "zhuàn"],
    "落": ["luò", "là", "lào"],
    "难": ["nán", "nàn"],
    "结": ["jié", "jiē"],
    "量": ["liàng", "liáng"],
    "尽": ["jìn", "jǐn"],
    "奔": ["bēn", "bèn"],
    "和": ["hé", "hè", "huó", "huò", "hú"],
    "露": ["lù", "lòu"],
    "系": ["xì", "jì"],
    "差": ["chā", "chà", "chāi", "cī"],
    "铺": ["pū", "pù"],
    "扇": ["shàn", "shān"],
    "将": ["jiāng", "jiàng"],
    "参": ["cān", "shēn", "cēn"],
    "宿": ["sù", "xiǔ", "xiù"],
    "省": ["shěng", "xǐng"],
    "鲜": ["xiān", "xiǎn"],
    "漂": ["piāo", "piǎo", "piào"],
    "薄": ["báo", "bó", "bò"],
    "蒙": ["mēng", "méng", "měng"],
    "盛": ["shèng", "chéng"],
    "载": ["zǎi", "zài"],
    "磨": ["mó", "mò"],
    "饮": ["yǐn", "yìn"],
    "撒": ["sā", "sǎ"],
    "厦": ["shà", "xià"],
    "累": ["lèi", "lěi", "léi"],
    "解": ["jiě", "jiè", "xiè"],
    "挑": ["tiāo", "tiǎo"],
    "担": ["dān", "dàn"],
    "率": ["shuài", "lǜ"],
    "假": ["jiǎ", "jià"],
    "宁": ["níng", "nìng"],
    "佛": ["fó", "fú"],
    "更": ["gēng", "gèng"],
    "冲": ["chōng", "chòng"],
    "挨": ["āi", "ái"],
    "泡": ["pào", "pāo"],
    "单": ["dān", "shàn", "chán"],
    "扁": ["biǎn", "piān"],
    "几": ["jǐ", "jī"],
    "占": ["zhàn", "zhān"],
    "华": ["huá", "huà"],
    "塞": ["sāi", "sài", "sè"],
    "恶": ["è", "wù", "ě"],
    "咽": ["yān", "yàn", "yè"],
    "咳": ["ké", "hāi"],
    "缝": ["féng", "fèng"],
    "壳": ["ké", "qiào"],
    "冠": ["guān", "guàn"],
    "卷": ["juǎn", "juàn"],
    "脏": ["zāng", "zàng"]
  };

  function clean(text) {
    return String(text || "").trim().replace(/[.。．]+$/u, "");
  }

  function addUnique(target, value) {
    const cleaned = clean(value);
    if (cleaned && !target.includes(cleaned)) {
      target.push(cleaned);
    }
  }

  function valuesFrom(value) {
    if (Array.isArray(value)) return value;
    if (typeof value !== "string") return [];
    return value.split(/[\/,，、\s]+/u).filter(Boolean);
  }

  function readingsForWord(word, wordBank) {
    if (!word) return [];
    const readings = [];
    (POLYPHONIC_PINYIN[word.char] || []).forEach((item) => addUnique(readings, item));
    addUnique(readings, word.pinyin);
    valuesFrom(word.pinyins).forEach((item) => addUnique(readings, item));
    valuesFrom(word.pinyinList).forEach((item) => addUnique(readings, item));
    valuesFrom(word.alternatePinyin).forEach((item) => addUnique(readings, item));
    valuesFrom(word.altPinyin).forEach((item) => addUnique(readings, item));

    const words = Array.isArray(wordBank) ? wordBank : (Array.isArray(window.MARIO_WORD_BANK) ? window.MARIO_WORD_BANK : []);
    words.forEach((item) => {
      if (item && item.char === word.char) addUnique(readings, item.pinyin);
    });
    return readings;
  }

  window.MARIO_POLYPHONIC_PINYIN = POLYPHONIC_PINYIN;
  window.MARIO_PINYIN_READINGS = {
    clean,
    getReadings: readingsForWord,
    label(word, wordBank) {
      return readingsForWord(word, wordBank).join(" / ");
    }
  };
})();
