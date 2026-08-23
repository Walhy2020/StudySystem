import test from "node:test";
import assert from "node:assert/strict";
import { HanziStorage, migrationCounts } from "../src/storage.js";
import { LEGACY_STORAGE_KEY, STORAGE_KEY } from "../src/constants.js";

const words = Array.from({ length: 30 }, (_, index) => ({ id: String(index + 1).padStart(4, "0") }));

class MemoryStorage {
  constructor(initial = {}) { this.values = new Map(Object.entries(initial)); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

test("legacy 只读迁移幂等，关键计数一致且未知字段不被改写", () => {
  const legacy = {
    records: {
      "0001": { status: "known", correctCount: 3, errorCount: 1 },
      "0002": { status: "mastered", correctCount: 5 },
    },
    masteredIds: ["0002"], recentWrongIds: ["0001"], reviewRound: 8,
    hp: 2, stars: 9, unknownFutureField: { keep: true },
  };
  const originalLegacy = JSON.stringify(legacy);
  const memory = new MemoryStorage({ [LEGACY_STORAGE_KEY]: originalLegacy });
  const firstStorage = new HanziStorage(memory, words, { date: "2026-08-18" });
  const first = firstStorage.load();
  const firstCounts = migrationCounts(first);
  const secondStorage = new HanziStorage(memory, words, { date: "2026-08-18" });
  const second = secondStorage.load();
  assert.deepEqual(migrationCounts(second), firstCounts);
  assert.equal(memory.getItem(LEGACY_STORAGE_KEY), originalLegacy);
  assert.ok(memory.getItem(STORAGE_KEY));
  assert.equal(secondStorage.lastLoad.source, "new");
  assert.deepEqual(firstCounts, { records: 2, touched: 2, mastered: 1, wrong: 1, dailyNew: 0, dailyReview: 0, reviewRound: 8, hp: 2, stars: 9 });
});

test("测试命名空间禁用 legacy 迁移", () => {
  const memory = new MemoryStorage({ [LEGACY_STORAGE_KEY]: JSON.stringify({ records: { "0001": { correctCount: 3 } } }) });
  const storage = new HanziStorage(memory, words, { key: `${STORAGE_KEY}:test:x`, allowLegacyMigration: false, date: "2026-08-18" });
  assert.equal(Object.keys(storage.load().records).length, 0);
  assert.equal(memory.getItem(LEGACY_STORAGE_KEY), JSON.stringify({ records: { "0001": { correctCount: 3 } } }));
});

test("导出包含 schema、稳定 ID、字库数量和时间；导入拒绝无效状态", () => {
  const memory = new MemoryStorage();
  const storage = new HanziStorage(memory, words, { date: "2026-08-18" });
  const state = storage.load();
  const payload = storage.exportPayload(state);
  assert.equal(payload.schemaVersion, 1);
  assert.equal(payload.characterCount, 1600);
  assert.deepEqual(payload.stableWordIds, words.map((word) => word.id));
  assert.ok(payload.exportedAt);
  assert.equal(storage.previewPayload({ hello: "world" }).ok, false);
});
