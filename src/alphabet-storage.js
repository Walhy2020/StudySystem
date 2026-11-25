import { PhoneticsStorage } from "./phonetics-storage.js?v=1.1";

export const ALPHABET_STORAGE_KEY = "mario-alphabet-v1";
export class AlphabetStorage extends PhoneticsStorage {
  constructor(storage, items, options = {}) {
    const namespace = String(options.namespace || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 48);
    super(storage, items, { date: options.date,
      key: namespace ? `${ALPHABET_STORAGE_KEY}:test:${namespace}` : ALPHABET_STORAGE_KEY });
  }
}
