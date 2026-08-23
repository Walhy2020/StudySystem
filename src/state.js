import {
  CHARACTER_COUNT,
  DAILY_NEW_LIMIT,
  DAILY_REVIEW_LIMIT,
  MAX_HP,
  PHASE,
  REVIEW_INTERVAL_ROUNDS,
  REVIEW_WRONG_REQUIRED_CORRECT,
  SCHEMA_VERSION,
  VALID_PHASES,
  WORD_BANK_VERSION,
} from "./constants.js";

export function localDateString(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function createInitialState(date = localDateString(), characterCount = CHARACTER_COUNT) {
  return {
    schemaVersion: SCHEMA_VERSION,
    wordBankVersion: WORD_BANK_VERSION,
    characterCount,
    hp: MAX_HP,
    rewardCount: 0,
    stars: 0,
    repairStreak: 0,
    records: {},
    masteredIds: [],
    recentWrongIds: [],
    reviewRound: 0,
    todayDate: date,
    dailyNewIds: [],
    dailyNewCorrectCounts: {},
    dailyMixedDoneIds: [],
    dailyReviewIds: [],
    dailyReviewDate: "",
    dailyReviewDoneIds: [],
    reviewWrongIds: [],
    reviewWrongCorrectCounts: {},
    dailyPhase: PHASE.IDLE,
    dailyTaskStarted: false,
    dailyTaskDone: false,
    scanCursor: 0,
    activeWordId: null,
    inlineReviewContext: null,
    migration: null,
  };
}

function number(value, fallback = 0, min = 0, max = Number.POSITIVE_INFINITY) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function uniqueValidIds(value, validIds, limit = Number.POSITIVE_INFINITY) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id) => typeof id === "string" && validIds.has(id)))].slice(0, limit);
}

function normalizeRecord(record = {}) {
  const statuses = new Set(["new", "learning", "known", "wrong", "mastered"]);
  const reviewStage = Math.floor(number(record.reviewStage, 0, 0, REVIEW_INTERVAL_ROUNDS.length - 1));
  const interval = Math.floor(number(record.reviewIntervalRounds ?? record.intervalDays, 0));
  return {
    status: statuses.has(record.status) ? record.status : "new",
    correctCount: Math.floor(number(record.correctCount, 0)),
    errorCount: Math.floor(number(record.errorCount ?? record.wrongCount, 0)),
    streak: Math.floor(number(record.streak, 0)),
    lastSeen: typeof record.lastSeen === "string" ? record.lastSeen : null,
    nextReview: number(record.nextReview, 0),
    nextReviewRound: Math.floor(number(record.nextReviewRound, 0)),
    intervalDays: Math.floor(number(record.intervalDays ?? interval, interval)),
    reviewIntervalRounds: interval,
    reviewStage,
    studyAppearanceCount: Math.floor(number(record.studyAppearanceCount, 0)),
    studyAppearanceKeys: Array.isArray(record.studyAppearanceKeys)
      ? [...new Set(record.studyAppearanceKeys.filter((item) => typeof item === "string"))].slice(-80)
      : [],
  };
}

function normalizeInlineContext(value, validIds) {
  if (!value || typeof value !== "object" || !validIds.has(value.wordId)) return null;
  const source = value.source === "today-new" || value.source === "review-wrong" ? value.source : "";
  if (!source) return null;
  return {
    wordId: value.wordId,
    source,
    returnWordId: validIds.has(value.returnWordId) ? value.returnWordId : null,
    returnPhase: VALID_PHASES.has(value.returnPhase) ? value.returnPhase : PHASE.IDLE,
    returnTaskStarted: value.returnTaskStarted === true,
    returnTaskDone: value.returnTaskDone === true,
  };
}

export function normalizeState(raw, words, date = localDateString()) {
  const source = raw && typeof raw === "object" ? raw : {};
  const base = createInitialState(date, words.length);
  const validIds = new Set(words.map((word) => word.id));
  const records = {};
  if (source.records && typeof source.records === "object") {
    Object.entries(source.records).forEach(([id, record]) => {
      if (validIds.has(id) && record && typeof record === "object") records[id] = normalizeRecord(record);
    });
  }

  const masteredFromRecords = Object.entries(records)
    .filter(([, record]) => record.status === "mastered")
    .map(([id]) => id);
  const masteredIds = [...new Set([
    ...uniqueValidIds(source.masteredIds, validIds),
    ...masteredFromRecords,
  ])];
  const masteredSet = new Set(masteredIds);
  masteredIds.forEach((id) => {
    records[id] = normalizeRecord({ ...records[id], status: "mastered", correctCount: Math.max(3, records[id]?.correctCount || 0) });
  });

  const dailyNewIds = uniqueValidIds(source.dailyNewIds, validIds, DAILY_NEW_LIMIT);
  const dailyNewSet = new Set(dailyNewIds);
  const dailyReviewIds = uniqueValidIds(source.dailyReviewIds, validIds, DAILY_REVIEW_LIMIT)
    .filter((id) => !dailyNewSet.has(id) && !masteredSet.has(id));
  const reviewWrongIds = uniqueValidIds(source.reviewWrongIds, validIds)
    .filter((id) => !masteredSet.has(id));

  const inferredStarted = source.dailyTaskStarted === true || dailyNewIds.length > 0 ||
    dailyReviewIds.length > 0 || (VALID_PHASES.has(source.dailyPhase) && source.dailyPhase !== PHASE.IDLE);
  let inferredPhase = VALID_PHASES.has(source.dailyPhase) ? source.dailyPhase : PHASE.IDLE;
  if (inferredStarted && inferredPhase === PHASE.IDLE) {
    inferredPhase = dailyReviewIds.length ? PHASE.REVIEW :
      (dailyNewIds.length < DAILY_NEW_LIMIT ? PHASE.SCREENING :
        (source.dailyTaskDone === true || source.dailyNewFinished === true ? PHASE.MIXED_REVIEW : PHASE.NEW_LEARNING));
  }
  const state = {
    ...base,
    schemaVersion: SCHEMA_VERSION,
    wordBankVersion: WORD_BANK_VERSION,
    characterCount: words.length,
    hp: Math.floor(number(source.hp, MAX_HP, 0, MAX_HP)),
    rewardCount: Math.floor(number(source.rewardCount, 0)),
    stars: Math.floor(number(source.stars, 0)),
    repairStreak: Math.floor(number(source.repairStreak, 0, 0, 2)),
    records,
    masteredIds,
    recentWrongIds: uniqueValidIds(source.recentWrongIds, validIds)
      .filter((id) => !masteredSet.has(id)).slice(0, 30),
    reviewRound: Math.floor(number(source.reviewRound, 0)),
    todayDate: typeof source.todayDate === "string" ? source.todayDate : date,
    dailyNewIds,
    dailyNewCorrectCounts: Object.fromEntries(dailyNewIds.map((id) => [id, Math.floor(number(source.dailyNewCorrectCounts?.[id], 0, 0, 3))])),
    dailyMixedDoneIds: uniqueValidIds(source.dailyMixedDoneIds, validIds).filter((id) => dailyNewSet.has(id)),
    dailyReviewIds,
    dailyReviewDate: typeof source.dailyReviewDate === "string" ? source.dailyReviewDate : "",
    dailyReviewDoneIds: uniqueValidIds(source.dailyReviewDoneIds, validIds).filter((id) => dailyReviewIds.includes(id)),
    reviewWrongIds,
    reviewWrongCorrectCounts: Object.fromEntries(reviewWrongIds.map((id) => [id, Math.floor(number(source.reviewWrongCorrectCounts?.[id], 0, 0, REVIEW_WRONG_REQUIRED_CORRECT))])),
    dailyPhase: inferredPhase,
    dailyTaskStarted: inferredStarted,
    dailyTaskDone: source.dailyTaskDone === true,
    scanCursor: Math.floor(number(source.scanCursor, 0, 0, Math.max(0, words.length - 1))),
    activeWordId: validIds.has(source.activeWordId) ? source.activeWordId : null,
    inlineReviewContext: normalizeInlineContext(source.inlineReviewContext, validIds),
    migration: source.migration && typeof source.migration === "object" ? { ...source.migration } : null,
  };

  if (state.todayDate !== date) resetDailyBoundary(state, date);
  if (!state.dailyTaskStarted) {
    state.dailyPhase = PHASE.IDLE;
    state.dailyTaskDone = false;
    state.activeWordId = null;
    state.inlineReviewContext = null;
  }
  if (state.activeWordId && masteredSet.has(state.activeWordId) && !state.dailyNewIds.includes(state.activeWordId)) {
    state.activeWordId = null;
  }
  return state;
}

export function resetDailyBoundary(state, date = localDateString()) {
  Object.assign(state, {
    hp: MAX_HP,
    repairStreak: 0,
    todayDate: date,
    dailyNewIds: [],
    dailyNewCorrectCounts: {},
    dailyMixedDoneIds: [],
    dailyReviewIds: [],
    dailyReviewDate: "",
    dailyReviewDoneIds: [],
    reviewWrongIds: [],
    reviewWrongCorrectCounts: {},
    dailyPhase: PHASE.IDLE,
    dailyTaskStarted: false,
    dailyTaskDone: false,
    activeWordId: null,
    inlineReviewContext: null,
  });
  return state;
}

export function migrateLegacyState(legacy, words, date = localDateString(), migratedAt = new Date().toISOString()) {
  const candidate = legacy && typeof legacy === "object" ? legacy : {};
  const state = normalizeState(candidate, words, date);
  state.migration = {
    sourceKey: "mario-literacy-desktop-mvp-v1",
    importedAt: migratedAt,
    strategy: "read-only-copy",
  };
  return state;
}

export function validateBackupPayload(payload) {
  if (!payload || typeof payload !== "object") return { ok: false, reason: "备份不是有效的 JSON 对象。" };
  const candidate = payload.state && typeof payload.state === "object" ? payload.state : payload;
  const recognizable = candidate.records && typeof candidate.records === "object" ||
    Array.isArray(candidate.masteredIds) || Number.isFinite(Number(candidate.reviewRound));
  if (!recognizable) return { ok: false, reason: "备份中没有可识别的汉字学习状态。" };
  const count = Number(payload.characterCount ?? payload.wordCount ?? candidate.characterCount ?? 0);
  return { ok: true, state: candidate, characterCount: count || null };
}
