import { buildTotalWordCatalog, normalizeLibraryWord } from "./total-word-library.js?v=1.9";
import { SCENARIOS } from "../data/scenarios.js?v=1.11";
import { createInitialState, localDateString, normalizeState } from "./state.js";

export const WORD_LEARNING_STORAGE_KEY = "mario-word-learning-v1";
const ORIGINAL_SCENE_IMAGES = Object.freeze({
  "first-meeting": "first-meeting-v1.png", "what-is-it": "what-is-it-classroom-v1.png",
  "counting-pens": "counting-pens-v1.png", "fruit-tasting": "fruit-table-v2.png",
  "self-introduction": "introducing-ourselves-v1.png", "classroom-commands": "classroom-commands-v1.png",
});

// Import definitions, not another module's learned-state. IDs survive reordering
// and future theme/scenario additions; duplicate spellings share one record.
export function buildWordLearningItems(themeCatalog, options = {}) {
  const scenarios = options.scenarios || SCENARIOS;
  const scenarioPictures = new Map(buildTotalWordCatalog([], { bookItems: [], scenarios })
    .filter(entry => entry.art.type === "image-url").map(entry => [entry.word, entry.art]));
  return buildTotalWordCatalog(themeCatalog, { ...options, scenarios }).map(entry => {
    // Prefer existing clean object cutouts over a textbook scan when available;
    // theme-specific object crops still keep their original priority.
    let art = entry.sourceType === "book1" ? scenarioPictures.get(entry.word) || entry.art : entry.art;
    if (art.type === "meaning") {
      const scene = scenarios.find(scene => scene.vocabulary?.some(item =>
        normalizeLibraryWord(item.word) === entry.word));
      // Abstract dialogue words use their context scene, never a Chinese-text
      // answer tile on the picture-only side of the lesson.
      art = { type: "image-url", src: scene?.image || `./assets/scenarios/${ORIGINAL_SCENE_IMAGES[scene?.id] || ORIGINAL_SCENE_IMAGES["first-meeting"]}`, alt: `${entry.word} 的情景配图` };
    }
    return { ...entry, id: `word:${entry.word}`, art };
  });
}

export class WordLearningStorage {
  constructor(storage, items, { namespace = "", date = localDateString() } = {}) {
    this.storage = storage; this.items = items; this.date = date;
    this.key = WORD_LEARNING_STORAGE_KEY + (namespace ? `:test:${namespace}` : "");
    this.saveFailed = false;
  }
  load() {
    let raw;
    try { raw = JSON.parse(this.storage?.getItem(this.key) || "null"); } catch { raw = null; }
    return normalizeState(raw, this.items, this.date);
  }
  save(state) {
    const normalized = normalizeState(state, this.items, this.date);
    try { this.storage?.setItem(this.key, JSON.stringify(normalized)); this.saveFailed = !this.storage; }
    catch { this.saveFailed = true; }
    return normalized;
  }
  reset() { return this.save(createInitialState(this.date, this.items.length)); }
}
