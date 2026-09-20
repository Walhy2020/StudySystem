export const APP_VERSION = "1.0.3";
export const SCHEMA_VERSION = 1;
export const WORD_BANK_VERSION = 1;
export const CHARACTER_COUNT = 1600;
export const LEGACY_STORAGE_KEY = "mario-literacy-desktop-mvp-v1";
export const STORAGE_KEY = "mario-hanzi-refactor-v1";

export const MAX_HP = 3;
export const DAILY_NEW_LIMIT = 3;
export const DAILY_NEW_REQUIRED_CORRECT = 3;
export const DAILY_REVIEW_LIMIT = 20;
export const REVIEW_WRONG_REQUIRED_CORRECT = 3;
export const REVIEW_WRONG_WEIGHT = 3;
export const REVIEW_INTERVAL_ROUNDS = Object.freeze([1, 2, 4, 7, 15, 30, 60]);

export const PHASE = Object.freeze({
  IDLE: "idle",
  SCREENING: "screening",
  NEW_LEARNING: "newLearning",
  MIXED_REVIEW: "mixedReview",
  REVIEW: "review",
});

export const VALID_PHASES = new Set(Object.values(PHASE));
