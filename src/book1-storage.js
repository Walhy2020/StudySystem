import { BOOK1_GROUPS, BOOK1_ITEMS, book1ItemById } from "../data/book1.js";

export const BOOK1_STORAGE_KEY = "mario-book1-v1";
export const LEGACY_ENGLISH_STORAGE_KEY = "mario-literacy-english-v1";
export const BOOK1_SCHEMA_VERSION = 1;

const VALID_PHASES = new Set(["idle", "learn", "review"]);
const ITEM_IDS = new Set(BOOK1_ITEMS.map((item) => item.id));

function safeParse(value) {
  try { return JSON.parse(value); } catch { return null; }
}

function uniqueIds(values) {
  return [...new Set(Array.isArray(values) ? values : [])].filter((id) => ITEM_IDS.has(id));
}

function normalizeRecord(record = {}, mastered = false) {
  const correctCount = Math.max(0, Number(record.correctCount) || 0);
  const errorCount = Math.max(0, Number(record.errorCount ?? record.wrongCount) || 0);
  const status = mastered
    ? "mastered"
    : (record.status === "wrong" || errorCount > correctCount ? "wrong" : (correctCount > 0 ? "known" : "new"));
  return { correctCount, errorCount, status };
}

export function createBook1State(source = {}) {
  const masteredIds = uniqueIds(source.masteredIds);
  const mastered = new Set(masteredIds);
  const records = Object.fromEntries(Object.entries(source.records || {})
    .filter(([id]) => ITEM_IDS.has(id))
    .map(([id, record]) => [id, normalizeRecord(record, mastered.has(id))]));
  masteredIds.forEach((id) => { records[id] = normalizeRecord(records[id], true); });
  const learnedIds = uniqueIds([
    ...(source.learnedIds || []),
    ...Object.entries(records).filter(([, record]) => record.correctCount > 0 || record.errorCount > 0).map(([id]) => id),
    ...masteredIds,
  ]);
  const wrongIds = uniqueIds(source.wrongIds).filter((id) => !mastered.has(id));
  const phase = VALID_PHASES.has(source.phase) ? source.phase : "idle";
  const queueIds = uniqueIds(source.queueIds).filter((id) => !mastered.has(id));
  const doneIds = uniqueIds(source.doneIds).filter((id) => queueIds.includes(id));
  const requestedActive = typeof source.activeId === "string" ? source.activeId : "";
  const activeId = phase !== "idle" && queueIds.includes(requestedActive) && !doneIds.includes(requestedActive)
    ? requestedActive
    : (phase !== "idle" ? queueIds.find((id) => !doneIds.includes(id)) || "" : "");
  return {
    schemaVersion: BOOK1_SCHEMA_VERSION,
    groupIndex: Math.max(0, Math.min(Number(source.groupIndex ?? source.letterIndex) || 0, BOOK1_GROUPS.length - 1)),
    phase: activeId ? phase : "idle",
    queueIds: activeId ? queueIds : [],
    doneIds: activeId ? doneIds : [],
    activeId,
    records,
    learnedIds,
    masteredIds,
    wrongIds,
    score: Math.max(0, Number(source.score) || 0),
    message: typeof source.message === "string" ? source.message : "",
    migration: source.migration && typeof source.migration === "object" ? { ...source.migration } : null,
  };
}

function idsFromCompletedKeys(keys) {
  return uniqueIds((Array.isArray(keys) ? keys : []).flatMap((key) => BOOK1_ITEMS
    .filter((item) => String(key).includes(item.id) || (item.type === "word" && String(key).toLowerCase().endsWith(`:${item.word.toLowerCase()}`)))
    .map((item) => item.id)));
}

function idsFromCompletedLessons(lessonIds) {
  const completed = new Set(Array.isArray(lessonIds) ? lessonIds : []);
  return uniqueIds(BOOK1_GROUPS.flatMap((group) => {
    const oldLessonId = `${group.unitId}-${group.lower}`;
    return completed.has(oldLessonId) || completed.has(group.id)
      ? BOOK1_ITEMS.filter((item) => item.groupId === group.id).map((item) => item.id)
      : [];
  }));
}

export function migrateLegacyBook1(legacyRoot, importedAt = new Date().toISOString()) {
  const root = legacyRoot && typeof legacyRoot === "object" ? legacyRoot : {};
  const source = root.books && typeof root.books === "object" && !Array.isArray(root.books)
    ? root.books.opw1
    : root;
  if (!source || typeof source !== "object") return null;
  const learnedIds = uniqueIds([
    ...(source.learnedIds || []),
    ...idsFromCompletedKeys(source.completedWordKeys),
    ...idsFromCompletedLessons(source.completedLessonIds),
    ...Object.keys(source.records || {}),
  ]);
  return createBook1State({
    groupIndex: source.letterIndex,
    records: source.records,
    learnedIds,
    masteredIds: source.masteredIds,
    wrongIds: source.wrongIds,
    score: source.score,
    migration: {
      sourceKey: LEGACY_ENGLISH_STORAGE_KEY,
      sourceBookId: "opw1",
      importedAt,
      strategy: "read-only-opw1",
    },
  });
}

export class Book1Storage {
  constructor(storage, options = {}) {
    this.storage = storage;
    this.key = options.key || BOOK1_STORAGE_KEY;
    this.legacyKey = options.legacyKey || LEGACY_ENGLISH_STORAGE_KEY;
    this.allowLegacyMigration = options.allowLegacyMigration !== false;
    this.lastLoad = { source: "initial", migrated: false };
  }

  load() {
    const saved = safeParse(this.storage.getItem(this.key));
    if (saved && typeof saved === "object") {
      const state = createBook1State(saved);
      this.save(state);
      this.lastLoad = { source: "new", migrated: false };
      return state;
    }
    if (this.allowLegacyMigration) {
      const legacyText = this.storage.getItem(this.legacyKey);
      const legacy = safeParse(legacyText);
      const migrated = migrateLegacyBook1(legacy);
      if (migrated) {
        this.save(migrated);
        this.lastLoad = { source: "legacy-opw1", migrated: true };
        return migrated;
      }
    }
    const state = createBook1State();
    this.save(state);
    return state;
  }

  save(state) {
    const normalized = createBook1State(state);
    this.storage.setItem(this.key, JSON.stringify(normalized));
    return normalized;
  }
}

export function book1StorageOptionsFromLocation(location) {
  const namespace = new URLSearchParams(location.search).get("test");
  if (!namespace) return { key: BOOK1_STORAGE_KEY, allowLegacyMigration: true };
  const safe = namespace.replace(/[^a-z0-9_-]/gi, "").slice(0, 48) || "browser";
  return { key: `${BOOK1_STORAGE_KEY}:test:${safe}`, allowLegacyMigration: false };
}

export function validBook1Item(id) {
  return Boolean(book1ItemById(id));
}
