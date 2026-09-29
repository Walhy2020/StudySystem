import { BOOK1_GROUPS, book1ItemsForGroup } from "./book1.js";

// Keep the textbook's order: one letter and its four words per group.
export const BOOK1_THEMES = Object.freeze(BOOK1_GROUPS.map((group, index) => Object.freeze({
  id: group.id,
  title: `${group.upper}${group.lower} 字母组`,
  english: group.words.map((item) => item.word).join(" · "),
  cover: group.words[0].image,
  items: Object.freeze(book1ItemsForGroup(index)),
})));

export function book1ThemeById(id) {
  return BOOK1_THEMES.find((theme) => theme.id === id) || null;
}
