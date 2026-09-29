import { BOOK1_ITEMS, book1ItemById, book1WordSlug } from "./book1.js";

const TOPICS = [
  { id: "food", title: "水果与食物", english: "Food & Drinks", cover: "apple",
    words: ["apple", "banana", "egg", "hot dog", "jam", "juice", "lemon", "milk", "nut", "olive", "peach", "pineapple", "rice", "water", "yogurt"] },
  { id: "farm", title: "身边的动物", english: "Pets & Farm Animals", cover: "cat",
    words: ["cat", "dog", "duck", "goat", "horse", "mouse", "ox", "rabbit"] },
  { id: "wild", title: "野生动物", english: "Wild Animals", cover: "lion",
    words: ["alligator", "bear", "elephant", "fox", "gorilla", "iguana", "kangaroo", "lion", "monkey", "panda", "tiger", "wolf", "yak", "zebra"] },
  { id: "birds", title: "鸟虫与水族", english: "Birds, Bugs & Sea", cover: "fish",
    words: ["ant", "bird", "fish", "insect", "octopus", "ostrich", "seal", "turtle"] },
  { id: "people", title: "人物与身体", english: "People & Body", cover: "girl",
    words: ["elbow", "girl", "king", "nose", "queen", "teacher", "uncle", "umpire", "vet"] },
  { id: "home", title: "家里的东西", english: "At Home", cover: "bed",
    words: ["bed", "box", "cup", "desk", "doll", "fan", "fork", "house", "lamp", "quilt", "soap"] },
  { id: "clothes", title: "衣物与随身物品", english: "Clothes & Accessories", cover: "hat",
    words: ["hat", "jacket", "socks", "umbrella", "vest", "watch", "zipper"] },
  { id: "school", title: "学习与提问", english: "Learning & Questions", cover: "pen",
    words: ["computer", "envelope", "ink", "pen", "question", "quiz"] },
  { id: "travel", title: "出行与玩耍", english: "Travel & Play", cover: "car",
    words: ["car", "jet", "kite", "robot", "tent", "van", "violin", "yacht", "yo-yo"] },
  { id: "nature", title: "自然与地点", english: "Nature & Places", cover: "sun",
    words: ["farm", "igloo", "leaf", "nest", "rose", "sun", "web", "zoo"] },
  { id: "tools", title: "工具与宝物", english: "Tools & Treasures", cover: "key",
    words: ["ax", "gift", "key", "money", "net", "wax"] },
  { id: "numbers", title: "数字与方向", english: "Numbers & Direction", cover: "six",
    words: ["six", "zero", "up"] },
];

export const BOOK1_THEMES = Object.freeze([
  Object.freeze({ id: "letters", title: "字母 A–Z", english: "Letters A–Z", cover: null,
    items: Object.freeze(BOOK1_ITEMS.filter((item) => item.type === "letter")) }),
  ...TOPICS.map((topic) => Object.freeze({
    id: topic.id,
    title: topic.title,
    english: topic.english,
    cover: `./assets/books/opw1/word-images/${book1WordSlug(topic.cover)}.jpg`,
    items: Object.freeze(topic.words.map((word) => book1ItemById(`opw1:word-${book1WordSlug(word)}`))),
  })),
]);

export function book1ThemeById(id) {
  return BOOK1_THEMES.find((theme) => theme.id === id) || null;
}
