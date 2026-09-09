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
const STATUS_RANK = Object.freeze({ new: 0, wrong: 1, learning: 2, known: 3, mastered: 4 });
const DAILY_STATE_FIELDS = Object.freeze([
  "hp", "repairStreak", "todayDate", "dailyNewIds", "dailyNewCorrectCounts",
  "dailyMixedDoneIds", "dailyReviewIds", "dailyReviewDate", "dailyReviewDoneIds",
  "reviewWrongIds", "reviewWrongCorrectCounts", "dailyPhase", "dailyTaskStarted",
  "dailyTaskDone", "activeWordId", "inlineReviewContext",
]);

function numericMax(left, right) {
  return Math.max(Number(left) || 0, Number(right) || 0);
}

function cloneStateValue(value) {
  if (Array.isArray(value)) return [...value];
  if (value && typeof value === "object") return { ...value };
  return value;
}

function mergeRecord(current = {}, legacy = {}) {
  const currentRank = STATUS_RANK[current.status] ?? 0;
  const legacyRank = STATUS_RANK[legacy.status] ?? 0;
  const lastSeen = [current.lastSeen, legacy.lastSeen]
    .filter((value) => typeof value === "string")
    .sort()
    .at(-1) || null;
  return {
    ...current,
    ...legacy,
    status: currentRank >= legacyRank ? current.status : legacy.status,
    correctCount: numericMax(current.correctCount, legacy.correctCount),
    errorCount: numericMax(current.errorCount, legacy.errorCount),
    streak: numericMax(current.streak, legacy.streak),
    lastSeen,
    nextReview: numericMax(current.nextReview, legacy.nextReview),
    nextReviewRound: numericMax(current.nextReviewRound, legacy.nextReviewRound),
    intervalDays: numericMax(current.intervalDays, legacy.intervalDays),
    reviewIntervalRounds: numericMax(current.reviewIntervalRounds, legacy.reviewIntervalRounds),
    reviewStage: numericMax(current.reviewStage, legacy.reviewStage),
    studyAppearanceCount: numericMax(current.studyAppearanceCount, legacy.studyAppearanceCount),
    studyAppearanceKeys: [...new Set([
      ...(current.studyAppearanceKeys || []),
      ...(legacy.studyAppearanceKeys || []),
    ])].slice(-80),
  };
}

function mergeLegacyProgress(currentRaw, legacyRaw, words, date, importedAt = new Date().toISOString()) {
  const current = normalizeState(currentRaw, words, date);
  const legacy = migrateLegacyState(legacyRaw, words, date, importedAt);
  const recordIds = new Set([...Object.keys(current.records), ...Object.keys(legacy.records)]);
  const records = Object.fromEntries([...recordIds].map((id) => [
    id,
    mergeRecord(current.records[id], legacy.records[id]),
  ]));
  const masteredIds = [...new Set([...current.masteredIds, ...legacy.masteredIds])];
  const masteredSet = new Set(masteredIds);
  masteredIds.forEach((id) => {
    records[id] = mergeRecord(records[id], { status: "mastered", correctCount: 3 });
  });
  const dailySource = current.dailyTaskStarted ? current : legacy;
  const merged = {
    ...current,
    records,
    masteredIds,
    recentWrongIds: [...new Set([...current.recentWrongIds, ...legacy.recentWrongIds])]
      .filter((id) => !masteredSet.has(id)).slice(0, 30),
    reviewRound: numericMax(current.reviewRound, legacy.reviewRound),
    rewardCount: numericMax(current.rewardCount, legacy.rewardCount),
    stars: numericMax(current.stars, legacy.stars),
    scanCursor: numericMax(current.scanCursor, legacy.scanCursor),
    migration: {
      sourceKey: LEGACY_STORAGE_KEY,
      importedAt,
      strategy: "read-only-file-merge",
      previousSourceKey: current.migration?.sourceKey || null,
    },
  };
  DAILY_STATE_FIELDS.forEach((field) => {
    merged[field] = cloneStateValue(dailySource[field]);
  });
  return normalizeState(merged, words, date);
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

  previewLegacyPayload(payload, currentState) {
    const validation = validateBackupPayload(payload);
    if (!validation.ok) return validation;
    const importedAt = new Date().toISOString();
    const current = normalizeState(currentState, this.words, this.date);
    const legacy = migrateLegacyState(validation.state, this.words, this.date, importedAt);
    const state = mergeLegacyProgress(current, validation.state, this.words, this.date, importedAt);
    return {
      ...validation,
      state,
      currentCounts: migrationCounts(current),
      legacyCounts: migrationCounts(legacy),
      mergedCounts: migrationCounts(state),
    };
  }

  importLegacyPayload(payload, currentState) {
    const preview = this.previewLegacyPayload(payload, currentState);
    if (!preview.ok) return preview;
    const state = this.save(preview.state);
    return { ...preview, state, mergedCounts: migrationCounts(state) };
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
