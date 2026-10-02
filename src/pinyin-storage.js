import { PhoneticsStorage } from "./phonetics-storage.js?v=1.1";
export const PINYIN_STORAGE_KEY = "mario-pinyin-v1";
export class PinyinStorage extends PhoneticsStorage {
  constructor(storage, items, options = {}) {
    const namespace = String(options.namespace || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 48);
    super(storage, items, { date: options.date,
      key: namespace ? `${PINYIN_STORAGE_KEY}:test:${namespace}` : PINYIN_STORAGE_KEY });
  }
}
