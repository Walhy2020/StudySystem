// Approved home dialogues with aligned British IPA, independent scenario progress.
const dictionary = [
  ["good", "ɡʊd", "好的"], ["morning", "ˈmɔːnɪŋ", "早晨"], ["time", "taɪm", "时间"],
  ["to", "tə", "用于动词前"], ["get", "ɡet", "变得；起身"], ["up", "ʌp", "向上"],
  ["mom", "mɒm", "妈妈"], ["let", "let", "让"], ["us", "ʌs", "我们"], ["dressed", "drest", "穿好衣服的"],
  ["ok", "əʊˈkeɪ", "好的"], ["it", "ɪt", "它"], ["is", "ɪz", "是"], ["for", "fə", "为了；适于"],
  ["bed", "bed", "床；睡觉"], ["i", "aɪ", "我"], ["am", "æm", "是（与 I 连用）"],
  ["sleepy", "ˈsliːpi", "困倦的"], ["night", "naɪt", "夜晚"], ["sweet", "swiːt", "甜美的"],
  ["dreams", "driːmz", "梦（复数）"], ["eat", "iːt", "吃"], ["hungry", "ˈhʌŋɡri", "饥饿的"],
  ["here", "hɪə", "这里"], ["your", "jɔː", "你的"], ["rice", "raɪs", "米饭"],
  ["thank", "θæŋk", "感谢"], ["you", "juː", "你"], ["thirsty", "ˈθɜːsti", "口渴的"],
  ["can", "kæn", "可以；能"], ["have", "hæv", "有；喝"], ["some", "sʌm", "一些"],
  ["water", "ˈwɔːtə", "水"], ["please", "pliːz", "请"], ["sure", "ʃɔː", "当然"], ["are", "ɑː", "是"],
  ["put", "pʊt", "放"], ["the", "ðə", "这；那（定冠词）"], ["toys", "tɔɪz", "玩具（复数）"],
  ["away", "əˈweɪ", "收起；离开"], ["where", "weə", "哪里"], ["does", "dʌz", "助动词"],
  ["this", "ðɪs", "这个"], ["car", "kɑː", "小汽车"], ["go", "ɡəʊ", "去；放置"],
  ["in", "ɪn", "在……里面"], ["box", "bɒks", "盒子"], ["all", "ɔːl", "全部"], ["done", "dʌn", "完成的"],
];
const actors = Object.freeze([
  Object.freeze({ speaker: "Mom", image: "./assets/scenarios/home-mom-sprite-v5.png", label: "卡通妈妈，长直发、珊瑚红上衣" }),
  Object.freeze({ speaker: "Child", image: "./assets/scenarios/home-brother-sprite-v3.png", label: "卡通哥哥，短黑发、亮黄色上衣" }),
]);
function homeScenario(id, number, chineseTitle, englishTitle, description, rows, words) {
  const lines = Object.freeze(rows.map(([speaker, chinese, values], index) => {
    const tokens = Object.freeze(values.map(([text, ipa]) => Object.freeze({ text, phonetic: `/${ipa}/` })));
    return Object.freeze({ id: `${id}-${index + 1}`, speaker, chinese, tokens,
      text: tokens.map(token => token.text).join(" "), phonetic: `/${values.map(([, ipa]) => ipa).join(" ")}/` });
  }));
  return Object.freeze({ id, number, chineseTitle, englishTitle, description, lines, actors,
    image: `./assets/scenarios/${id}-v2.png`, imageAlt: description,
    // Kept for legacy session compatibility; current practice uses the dialogue player.
    practice: Object.freeze(lines.map((item, index) => Object.freeze({ id: `${id}-practice-${index + 1}`,
      promptId: item.id, answerId: item.id,
      optionIds: Object.freeze([item.id, lines[(index + 1) % 4].id, lines[(index + 2) % 4].id]) }))),
    vocabulary: Object.freeze(dictionary.filter(([word]) => words.split(" ").includes(word))
      .map(([word, ipa, chinese]) => Object.freeze({ word, phonetic: `/${ipa}/`, chinese }))),
    completionText: `你已经完成“${chineseTitle}”的四句生活对话。`,
  });
}
export const DAILY_LIFE_SCENARIOS = Object.freeze([
  homeScenario("getting-up", 7, "起床", "Getting Up", "阳光照进卧室，妈妈和孩子问早安、准备起床穿衣。", [
    ["Mom", "早上好！该起床了。", [["Good", "ɡʊd"], ["morning!", "ˈmɔːnɪŋ"], ["Time", "taɪm"], ["to", "tə"], ["get", "ɡet"], ["up.", "ʌp"]]],
    ["Child", "早上好，妈妈。", [["Good", "ɡʊd"], ["morning,", "ˈmɔːnɪŋ"], ["Mom.", "mɒm"]]],
    ["Mom", "我们穿衣服吧。", [["Let's", "lets"], ["get", "ɡet"], ["dressed.", "drest"]]],
    ["Child", "好的！", [["OK!", "əʊˈkeɪ"]]],
  ], "good morning time to get up mom let us dressed ok"),
  homeScenario("going-to-bed", 8, "睡觉", "Going to Bed", "月亮和星星出现在窗外，妈妈和孩子互道晚安。", [
    ["Mom", "该睡觉了。", [["It's", "ɪts"], ["time", "taɪm"], ["for", "fə"], ["bed.", "bed"]]],
    ["Child", "我困了。", [["I'm", "aɪm"], ["sleepy.", "ˈsliːpi"]]],
    ["Mom", "晚安，做个好梦！", [["Good", "ɡʊd"], ["night.", "naɪt"], ["Sweet", "swiːt"], ["dreams!", "driːmz"]]],
    ["Child", "晚安，妈妈。", [["Good", "ɡʊd"], ["night,", "naɪt"], ["Mom.", "mɒm"]]],
  ], "it is time for bed i am sleepy good night sweet dreams mom"),
  homeScenario("having-a-meal", 9, "吃饭", "Having a Meal", "家里的餐桌上摆着一碗米饭，练习表达饥饿与感谢。", [
    ["Mom", "该吃饭了。", [["It's", "ɪts"], ["time", "taɪm"], ["to", "tə"], ["eat.", "iːt"]]],
    ["Child", "我饿了！", [["I'm", "aɪm"], ["hungry!", "ˈhʌŋɡri"]]],
    ["Mom", "这是你的米饭。", [["Here's", "hɪəz"], ["your", "jɔː"], ["rice.", "raɪs"]]],
    ["Child", "谢谢妈妈。", [["Thank", "θæŋk"], ["you,", "juː"], ["Mom.", "mɒm"]]],
  ], "it is time to eat i am hungry here your rice thank you mom"),
  homeScenario("drinking-water", 10, "喝水", "Drinking Water", "桌上有清水和水杯，孩子礼貌地向妈妈要水喝。", [
    ["Child", "我渴了。", [["I'm", "aɪm"], ["thirsty.", "ˈθɜːsti"]]],
    ["Child", "可以给我一些水吗？", [["Can", "kæn"], ["I", "aɪ"], ["have", "hæv"], ["some", "sʌm"], ["water,", "ˈwɔːtə"], ["please?", "pliːz"]]],
    ["Mom", "当然，给你。", [["Sure.", "ʃɔː"], ["Here", "hɪə"], ["you", "juː"], ["are.", "ɑː"]]],
    ["Child", "谢谢！", [["Thank", "θæŋk"], ["you!", "juː"]]],
  ], "i am thirsty can have some water please sure here you are thank"),
  homeScenario("putting-toys-away", 11, "收拾玩具", "Putting Toys Away", "把红色玩具汽车和积木收进玩具盒，练习收拾与放置。", [
    ["Mom", "我们把玩具收起来吧。", [["Let's", "lets"], ["put", "pʊt"], ["the", "ðə"], ["toys", "tɔɪz"], ["away.", "əˈweɪ"]]],
    ["Child", "这辆小汽车放在哪里？", [["Where", "weə"], ["does", "dʌz"], ["this", "ðɪs"], ["car", "kɑː"], ["go?", "ɡəʊ"]]],
    ["Mom", "把它放进盒子里。", [["Put", "pʊt"], ["it", "ɪt"], ["in", "ɪn"], ["the", "ðə"], ["box.", "bɒks"]]],
    ["Child", "好的！收拾好了！", [["OK!", "əʊˈkeɪ"], ["All", "ɔːl"], ["done!", "dʌn"]]],
  ], "let us put the toys away where does this car go it in box ok all done"),
]);
