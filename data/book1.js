const WORD_PHONETICS = Object.freeze({
  alligator: "/ˈælɪɡeɪtə/", apple: "/ˈæpəl/", ant: "/ænt/", ax: "/æks/",
  banana: "/bəˈnɑ:nə/", bear: "/beə/", bed: "/bed/", bird: "/bɜ:d/",
  box: "/bɒks/", car: "/kɑ:/", cat: "/kæt/", computer: "/kəmˈpju:tə/", cup: "/kʌp/",
  desk: "/desk/", dog: "/dɒɡ/", doll: "/dɒl/", duck: "/dʌk/",
  egg: "/eɡ/", elbow: "/ˈelbəʊ/", elephant: "/ˈelɪfənt/", envelope: "/ˈenvələʊp/",
  fan: "/fæn/", farm: "/fɑ:m/", fish: "/fɪʃ/", fork: "/fɔ:k/", fox: "/fɒks/",
  gift: "/ɡɪft/", girl: "/ɡɜ:l/", goat: "/ɡəʊt/", gorilla: "/ɡəˈrɪlə/",
  hat: "/hæt/", horse: "/hɔ:s/", "hot dog": "/ˈhɒt dɒɡ/", house: "/haʊs/",
  igloo: "/ˈɪɡlu:/", iguana: "/ɪˈɡwɑ:nə/", ink: "/ɪŋk/", insect: "/ˈɪnsekt/",
  jacket: "/ˈdʒækɪt/", jam: "/dʒæm/", jet: "/dʒet/", juice: "/dʒu:s/",
  kangaroo: "/ˌkæŋɡəˈru:/", key: "/ki:/", king: "/kɪŋ/", kite: "/kaɪt/",
  lamp: "/læmp/", leaf: "/li:f/", lemon: "/ˈlemən/", lion: "/ˈlaɪən/",
  milk: "/mɪlk/", money: "/ˈmʌnɪ/", monkey: "/ˈmʌŋkɪ/", mouse: "/maʊs/",
  nest: "/nest/", net: "/net/", nose: "/nəʊz/", nut: "/nʌt/",
  octopus: "/ˈɒktəpəs/", olive: "/ˈɒlɪv/", ostrich: "/ˈɒstrɪtʃ/", ox: "/ɒks/",
  panda: "/ˈpændə/", peach: "/pi:tʃ/", pen: "/pen/", pineapple: "/ˈpaɪnˌæpəl/",
  queen: "/kwi:n/", question: "/ˈkwestʃən/", quilt: "/kwɪlt/", quiz: "/kwɪz/",
  rabbit: "/ˈræbɪt/", rice: "/raɪs/", robot: "/ˈrəʊbɒt/", rose: "/rəʊz/",
  seal: "/si:l/", six: "/sɪks/", soap: "/səʊp/", socks: "/sɒks/", sun: "/sʌn/",
  teacher: "/ˈti:tʃə/", tent: "/tent/", tiger: "/ˈtaɪɡə/", turtle: "/ˈtɜ:təl/",
  umbrella: "/ʌmˈbrelə/", umpire: "/ˈʌmpaɪə/", uncle: "/ˈʌŋkəl/", up: "/ʌp/",
  van: "/væn/", vest: "/vest/", vet: "/vet/", violin: "/ˌvaɪəˈlɪn/",
  watch: "/wɒtʃ/", water: "/ˈwɔ:tə/", wax: "/wæks/", web: "/web/", wolf: "/wʊlf/",
  yacht: "/jɒt/", yak: "/jæk/", "yo-yo": "/ˈjəʊ jəʊ/", yogurt: "/ˈjɒɡət/",
  zebra: "/ˈzebrə/", zero: "/ˈzɪərəʊ/", zipper: "/ˈzɪpə/", zoo: "/zu:/",
});

const WORD_TRANSLATIONS = Object.freeze({
  alligator: "短吻鳄", apple: "苹果", ant: "蚂蚁", ax: "斧头",
  banana: "香蕉", bear: "熊", bed: "床", bird: "鸟", box: "盒子",
  car: "汽车", cat: "猫", computer: "电脑", cup: "杯子", desk: "书桌",
  dog: "狗", doll: "娃娃", duck: "鸭子", egg: "鸡蛋", elbow: "胳膊肘",
  elephant: "大象", envelope: "信封", fan: "风扇", farm: "农场", fish: "鱼",
  fork: "叉子", fox: "狐狸", gift: "礼物", girl: "女孩", goat: "山羊",
  gorilla: "大猩猩", hat: "帽子", horse: "马", "hot dog": "热狗", house: "房子",
  igloo: "冰屋", iguana: "鬣蜥", ink: "墨水", insect: "昆虫", jacket: "夹克",
  jam: "果酱", jet: "喷气式飞机", juice: "果汁", kangaroo: "袋鼠", key: "钥匙",
  king: "国王", kite: "风筝", lamp: "台灯", leaf: "叶子", lemon: "柠檬",
  lion: "狮子", milk: "牛奶", money: "钱", monkey: "猴子", mouse: "老鼠",
  nest: "鸟巢", net: "网", nose: "鼻子", nut: "坚果", octopus: "章鱼",
  olive: "橄榄", ostrich: "鸵鸟", ox: "公牛", panda: "熊猫", peach: "桃子",
  pen: "钢笔", pineapple: "菠萝", queen: "女王", question: "问题", quilt: "被子",
  quiz: "小测验", rabbit: "兔子", rice: "米饭", robot: "机器人", rose: "玫瑰",
  seal: "海豹", six: "六", soap: "肥皂", socks: "袜子", sun: "太阳",
  teacher: "老师", tent: "帐篷", tiger: "老虎", turtle: "乌龟", umbrella: "雨伞",
  umpire: "裁判", uncle: "叔叔", up: "向上", van: "面包车", vest: "背心",
  vet: "兽医", violin: "小提琴", watch: "手表", water: "水", wax: "蜡",
  web: "网", wolf: "狼", yacht: "游艇", yak: "牦牛", "yo-yo": "悠悠球",
  yogurt: "酸奶", zebra: "斑马", zero: "零", zipper: "拉链", zoo: "动物园",
});

const GROUP_SOURCE = [
  ["A", "a", "/a/", 1, "4-11", ["apple", "ax", "ant", "alligator"]],
  ["B", "b", "/b/", 1, "4-11", ["bear", "bird", "bed", "banana"]],
  ["C", "c", "/k/", 1, "4-11", ["cat", "cup", "car", "computer"]],
  ["D", "d", "/d/", 2, "12-19", ["dog", "desk", "doll", "duck"]],
  ["E", "e", "/e/", 2, "12-19", ["egg", "elbow", "envelope", "elephant"]],
  ["F", "f", "/f/", 2, "12-19", ["fish", "fan", "farm", "fork"]],
  ["G", "g", "/g/", 3, "24-31", ["gorilla", "goat", "gift", "girl"]],
  ["H", "h", "/h/", 3, "24-31", ["horse", "hat", "house", "hot dog"]],
  ["I", "i", "/i/", 3, "24-31", ["insect", "ink", "igloo", "iguana"]],
  ["J", "j", "/j/", 4, "32-39", ["jet", "jam", "juice", "jacket"]],
  ["K", "k", "/k/", 4, "32-39", ["kangaroo", "key", "king", "kite"]],
  ["L", "l", "/l/", 4, "32-39", ["lion", "lamp", "leaf", "lemon"]],
  ["M", "m", "/m/", 5, "44-51", ["monkey", "milk", "money", "mouse"]],
  ["N", "n", "/n/", 5, "44-51", ["nut", "net", "nest", "nose"]],
  ["O", "o", "/o/", 5, "44-51", ["octopus", "ox", "olive", "ostrich"]],
  ["P", "p", "/p/", 6, "52-59", ["peach", "pen", "panda", "pineapple"]],
  ["Q", "q", "/kw/", 6, "52-59", ["queen", "quiz", "quilt", "question"]],
  ["R", "r", "/r/", 6, "52-59", ["rabbit", "rose", "rice", "robot"]],
  ["S", "s", "/s/", 7, "64-73", ["seal", "sun", "soap", "socks"]],
  ["T", "t", "/t/", 7, "64-73", ["turtle", "tent", "tiger", "teacher"]],
  ["U", "u", "/u/", 7, "64-73", ["umbrella", "up", "uncle", "umpire"]],
  ["V", "v", "/v/", 7, "64-73", ["van", "vet", "vest", "violin"]],
  ["W", "w", "/w/", 8, "74-83", ["wolf", "web", "water", "watch"]],
  ["X", "x", "/ks/", 8, "74-83", ["fox", "box", "six", "wax"]],
  ["Y", "y", "/y/", 8, "74-83", ["yo-yo", "yak", "yogurt", "yacht"]],
  ["Z", "z", "/z/", 8, "74-83", ["zipper", "zero", "zoo", "zebra"]],
];

export function book1WordSlug(word) {
  return String(word || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const BOOK1_GROUPS = Object.freeze(GROUP_SOURCE.map(([upper, lower, sound, unit, pages, words], index) => Object.freeze({
  id: `opw1:letter-${upper}`,
  index,
  upper,
  lower,
  sound,
  unitId: `opw1:unit-${unit}`,
  unitTitle: `Unit ${unit}`,
  pages,
  words: Object.freeze(words.map((word) => Object.freeze({
    id: `opw1:word-${book1WordSlug(word)}`,
    type: "word",
    word,
    phonetic: WORD_PHONETICS[word],
    translation: WORD_TRANSLATIONS[word],
    image: `./assets/books/opw1/word-images/${book1WordSlug(word)}.jpg`,
    letter: upper,
  }))),
})));

export const BOOK1_ITEMS = Object.freeze(BOOK1_GROUPS.flatMap((group) => [
  Object.freeze({
    id: `opw1:letter-${group.upper}`,
    type: "letter",
    word: group.upper,
    phonetic: group.sound,
    translation: `字母${group.upper}`,
    letter: group.upper,
    groupId: group.id,
  }),
  ...group.words.map((word) => Object.freeze({ ...word, groupId: group.id })),
]));

export const BOOK1_META = Object.freeze({
  id: "opw1",
  title: "Oxford Phonics World 1",
  label: "Book 1 字母启蒙",
  groupCount: 26,
  wordCount: 104,
  itemCount: 130,
});

export function book1ItemById(id) {
  return BOOK1_ITEMS.find((item) => item.id === id) || null;
}

export function book1ItemsForGroup(index) {
  const safeIndex = Math.max(0, Math.min(Number(index) || 0, BOOK1_GROUPS.length - 1));
  return BOOK1_ITEMS.filter((item) => item.groupId === BOOK1_GROUPS[safeIndex].id);
}
