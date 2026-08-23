import {
  CHARACTER_COUNT,
  LEGACY_STORAGE_KEY,
  SCHEMA_VERSION,
  STORAGE_KEY,
  WORD_BANK_VERSION,
} from "./constants.js";
import {
  createInitialState,
  localDateString,
  migrateLegacyState,
  normalizeState,
  validateBackupPayload,
} from "./state.js";

function safeParse(text) {
  try { return JSON.parse(text); } catch { return null; }
}

export function migrationCounts(state) {
  const records = Object.values(state.records || {});
  return {
    records: records.length,
    touched: records.filter((record) => Number(record.correctCount) > 0 || Number(record.errorCount) > 0).length,
    mastered: state.masteredIds?.length || 0,
    wrong: state.recentWrongIds?.length || 0,
    dailyNew: state.dailyNewIds?.length || 0,
    dailyReview: state.dailyReviewIds?.length || 0,
    reviewRound: Number(state.reviewRound) || 0,
    hp: Number(state.hp) || 0,
    stars: Number(state.stars) || 0,
  };
}

export class HanziStorage {
  constructor(storage, words, options = {}) {
    this.storage = storage;
    this.words = words;
    this.key = options.key || STORAGE_KEY;
    this.legacyKey = options.legacyKey || LEGACY_STORAGE_KEY;
    this.allowLegacyMigration = options.allowLegacyMigration !== false;
    this.date = options.date || localDateString();
    this.lastLoad = { migrated: false, source: "initial" };
  }

  load() {
    const saved = safeParse(this.storage.getItem(this.key));
    if (saved && typeof saved === "object") {
      const state = normalizeState(saved, this.words, this.date);
      this.lastLoad = { migrated: false, source: "new", counts: migrationCounts(state) };
      this.save(state);
      return state;
    }
    if (this.allowLegacyMigration) {
      const legacy = safeParse(this.storage.getItem(this.legacyKey));
      if (legacy && typeof legacy === "object" && (legacy.records || legacy.masteredIds || legacy.dailyNewIds || Number.isFinite(Number(legacy.reviewRound)))) {
        const state = migrateLegacyState(legacy, this.words, this.date);
        this.save(state);
        this.lastLoad = { migrated: true, source: "legacy", counts: migrationCounts(state) };
        return state;
      }
    }
    const state = createInitialState(this.date, this.words.length);
    this.save(state);
    this.lastLoad = { migrated: false, source: "initial", counts: migrationCounts(state) };
    return state;
  }

  save(state) {
    const normalized = normalizeState(state, this.words, this.date);
    this.storage.setItem(this.key, JSON.stringify(normalized));
    return normalized;
  }

  reset() {
    const state = createInitialState(this.date, this.words.length);
    this.storage.setItem(this.key, JSON.stringify(state));
    return state;
  }

  previewPayload(payload) {
    return validateBackupPayload(payload);
  }

  importPayload(payload) {
    const validation = validateBackupPayload(payload);
    if (!validation.ok) return validation;
    const state = normalizeState(validation.state, this.words, this.date);
    this.save(state);
    return { ...validation, state };
  }

  exportPayload(state) {
    return {
      app: "马里奥学习系统",
      backupType: "mario-hanzi-state",
      schemaVersion: SCHEMA_VERSION,
      wordBankVersion: WORD_BANK_VERSION,
      characterCount: CHARACTER_COUNT,
      stableWordIds: this.words.map((word) => word.id),
      exportedAt: new Date().toISOString(),
      state: normalizeState(state, this.words, this.date),
    };
  }
}

export function storageOptionsFromLocation(location) {
  const namespace = new URLSearchParams(location.search).get("test");
  if (!namespace) return { key: STORAGE_KEY, allowLegacyMigration: true };
  const safe = namespace.replace(/[^a-z0-9_-]/gi, "").slice(0, 48) || "browser";
  return { key: `${STORAGE_KEY}:test:${safe}`, allowLegacyMigration: false };
}
