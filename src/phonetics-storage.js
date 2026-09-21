import { createInitialState, localDateString, normalizeState } from "./state.js";
import { PHONETICS_REVIEW_POLICY_VERSION } from "./phonetics-engine.js?v=1.2";

function safeParse(text) {
  try { return JSON.parse(text); } catch { return null; }
}

export class PhoneticsStorage {
  constructor(storage, words, options = {}) {
    this.storage = storage;
    this.words = words;
    this.key = options.key;
    this.date = options.date || localDateString();
    this.lastLoad = { migrated: false, source: "initial" };
  }

  _withReviewPolicy(normalized, source = {}) {
    if (source.todayDate !== this.date) source = {};
    const validIds = new Set(this.words.map((item) => item.id));
    normalized.phoneticsScreenedIds = Array.isArray(source.phoneticsScreenedIds)
      ? [...new Set(source.phoneticsScreenedIds)].filter((id) => validIds.has(id)) : [];
    const mastered = new Set(normalized.masteredIds);
    const valid = (value) => Array.isArray(value)
      ? [...new Set(value)].filter((id) => validIds.has(id) && !mastered.has(id))
      : [];
    normalized.phoneticsReviewPolicyVersion = Math.max(0, Number(source.phoneticsReviewPolicyVersion) || 0);
    normalized.reviewIncludesDailyNew = source.reviewIncludesDailyNew === true;
    if (normalized.reviewIncludesDailyNew) {
      normalized.dailyReviewIds = valid(source.dailyReviewIds);
      normalized.dailyReviewDoneIds = valid(source.dailyReviewDoneIds)
        .filter((id) => normalized.dailyReviewIds.includes(id));
      if (validIds.has(source.activeWordId)) normalized.activeWordId = source.activeWordId;
    }
    return normalized;
  }

  load() {
    const saved = safeParse(this.storage.getItem(this.key));
    if (saved && typeof saved === "object") {
      const state = this._withReviewPolicy(normalizeState(saved, this.words, this.date), saved);
      this.lastLoad = { migrated: false, source: "saved" };
      this.storage.setItem(this.key, JSON.stringify(state));
      return state;
    }
    const state = createInitialState(this.date, this.words.length);
    state.phoneticsReviewPolicyVersion = PHONETICS_REVIEW_POLICY_VERSION;
    state.reviewIncludesDailyNew = false;
    this.storage.setItem(this.key, JSON.stringify(state));
    return state;
  }

  save(state) {
    const normalized = this._withReviewPolicy(normalizeState(state, this.words, this.date), state);
    this.storage.setItem(this.key, JSON.stringify(normalized));
    return normalized;
  }

  reset() {
    const state = createInitialState(this.date, this.words.length);
    state.phoneticsReviewPolicyVersion = PHONETICS_REVIEW_POLICY_VERSION;
    state.reviewIncludesDailyNew = false;
    this.storage.setItem(this.key, JSON.stringify(state));
    return state;
  }
}
