import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { BOOK1_GROUPS, BOOK1_ITEMS, BOOK1_META, book1ItemsForGroup, book1WordSlug } from "../data/book1.js";
import {
  BOOK1_STORAGE_KEY,
  LEGACY_ENGLISH_STORAGE_KEY,
  Book1Storage,
  migrateLegacyBook1,
} from "../src/book1-storage.js";

class MemoryStorage {
  constructor(initial = {}) { this.values = new Map(Object.entries(initial)); this.writes = []; }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.writes.push(key); this.values.set(key, String(value)); }
}

test("Book1 精确保留 A-Z 26组、104词和130学习项，不含 Book2", async () => {
  assert.deepEqual(BOOK1_META, {
    id: "opw1", title: "Oxford Phonics World 1", label: "Book 1 字母启蒙",
    groupCount: 26, wordCount: 104, itemCount: 130,
  });
  assert.equal(BOOK1_GROUPS.length, 26);
  assert.equal(BOOK1_ITEMS.length, 130);
  assert.equal(BOOK1_ITEMS.filter((item) => item.type === "word").length, 104);
  assert.equal(new Set(BOOK1_ITEMS.map((item) => item.id)).size, 130);
  assert.deepEqual(BOOK1_GROUPS.map((group) => group.upper).join(""), "ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  assert.deepEqual(BOOK1_GROUPS.find((group) => group.upper === "X").words.map(({ word }) => word), ["fox", "box", "six", "wax"]);
  assert.ok(BOOK1_GROUPS.every((group, index) => group.words.length === 4 && book1ItemsForGroup(index).length === 5));
  assert.ok(BOOK1_ITEMS.every((item) => item.id.startsWith("opw1:") && item.phonetic.startsWith("/") && item.phonetic.endsWith("/") && item.translation));
  const source = await readFile(new URL("../data/book1.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /opw2|Oxford Phonics World 2/i);
});

test("Book1 的104张单词图逐词存在、非空且 slug 与旧规则一致", async () => {
  const words = BOOK1_ITEMS.filter((item) => item.type === "word");
  assert.equal(book1WordSlug("hot dog"), "hot-dog");
  assert.equal(new Set(words.map((item) => item.image)).size, 104);
  for (const item of words) {
    const path = fileURLToPath(new URL(`../${item.image.replace(/^\.\//, "")}`, import.meta.url));
    const metadata = await stat(path);
    assert.ok(metadata.size > 0, `${item.word} 图片为空`);
  }
});

test("旧英文存储只读迁移 books.opw1，完全忽略 opw2", () => {
  const legacy = {
    schemaVersion: 2,
    activeBookId: "opw2",
    books: {
      opw1: {
        letterIndex: 23,
        records: {
          "opw1:word-fox": { correctCount: 4, wrongCount: 1, status: "known" },
          "opw1:word-box": { correctCount: 2, wrongCount: 3, status: "wrong" },
        },
        completedWordKeys: ["opw1:learning:opw1:word-six", "opw1:unit-1-a:apple"],
        completedLessonIds: ["opw1:unit-1-b"],
        masteredIds: ["opw1:word-fox"],
        wrongIds: ["opw1:word-box"],
        score: 12,
      },
      opw2: {
        records: { "opw2:word-ram": { correctCount: 99 } },
        masteredIds: ["opw2:word-ram"],
        score: 999,
      },
    },
  };
  const original = JSON.stringify(legacy);
  const memory = new MemoryStorage({ [LEGACY_ENGLISH_STORAGE_KEY]: original });
  const first = new Book1Storage(memory).load();
  assert.equal(first.groupIndex, 23);
  assert.deepEqual(first.masteredIds, ["opw1:word-fox"]);
  assert.deepEqual(first.wrongIds, ["opw1:word-box"]);
  assert.ok(first.learnedIds.includes("opw1:word-six"));
  assert.ok(first.learnedIds.includes("opw1:word-apple"));
  assert.ok(book1ItemsForGroup(1).every((item) => first.learnedIds.includes(item.id)));
  assert.equal(first.records["opw1:word-box"].errorCount, 3);
  assert.equal(JSON.stringify(first).includes("opw2"), false);
  assert.equal(memory.getItem(LEGACY_ENGLISH_STORAGE_KEY), original);
  assert.ok(memory.writes.every((key) => key === BOOK1_STORAGE_KEY));
  assert.ok(memory.getItem(BOOK1_STORAGE_KEY));
  assert.deepEqual(new Book1Storage(memory).load(), first);
});

test("旧单Book格式仍可迁移，测试命名空间可以禁用旧数据读取", () => {
  const flatLegacy = { records: { "opw1:word-apple": { correctCount: 2 } }, wrongIds: ["opw1:word-apple"] };
  const migrated = migrateLegacyBook1(flatLegacy, "2026-09-08T00:00:00.000Z");
  assert.ok(migrated.learnedIds.includes("opw1:word-apple"));
  assert.equal(migrated.migration.sourceBookId, "opw1");
  const memory = new MemoryStorage({ [LEGACY_ENGLISH_STORAGE_KEY]: JSON.stringify(flatLegacy) });
  const isolated = new Book1Storage(memory, { key: `${BOOK1_STORAGE_KEY}:test:x`, allowLegacyMigration: false }).load();
  assert.equal(isolated.learnedIds.length, 0);
  assert.equal(memory.writes.includes(LEGACY_ENGLISH_STORAGE_KEY), false);
});

test("Book1 页面只引用独立资源和独立存储入口", async () => {
  const html = await readFile(new URL("../book-learning.html", import.meta.url), "utf8");
  const app = await readFile(new URL("../book-learning.js", import.meta.url), "utf8");
  assert.match(html, /book-learning\.css\?v=1\.1/);
  assert.match(html, /book-learning\.js\?v=1\.0/);
  assert.match(html, /Oxford Phonics World 1/);
  assert.doesNotMatch(html + app, /Book2|opw2|Oxford Phonics World 2/i);
  assert.match(app, /Book1Storage/);
});
