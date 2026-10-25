// Independent adaptation of bomb-game.js learning policy; never writes source progress.
export const SNAKE_PROGRESS_KEY = "mario-snake-game-progress-v1";
export const HANZI_KEY = "mario-hanzi-refactor-v1";
export const LEGACY_KEY = "mario-literacy-desktop-mvp-v1";
export const BATCH_SIZE = 5;
export const RUN_SIZE = 100; // Bomb worlds 3–6, five levels × five targets.

const unique = values => [...new Set(values)];
const list = value => Array.isArray(value) ? value : [];
const object = value => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const evidence = r => r && (Number(r.correctCount) > 0 || Number(r.errorCount ?? r.wrongCount) > 0 ||
  Number(r.studyAppearanceCount) > 0 || list(r.studyAppearanceKeys).length > 0 || Boolean(r.lastSeen) ||
  ["learning", "known", "wrong", "mastered"].includes(r.status));
const evidenceLists = ["dailyReviewIds", "dailyReviewDoneIds", "reviewWrongIds", "recentWrongIds", "masteredIds"];

export function readObject(storage, key) {
  try { return object(JSON.parse(storage.getItem(key) || "null")); } catch { return {}; }
}

export function learningSource(storage, words) {
  const valid = new Set(words.map(w => w.id));
  const hasEvidence = state => Object.values(object(state.records)).some(evidence) ||
    evidenceLists.some(key => list(state[key]).some(id => valid.has(id)));
  const primary = readObject(storage, HANZI_KEY);
  if (hasEvidence(primary)) return { state: primary, source: "hanzi" };
  const legacy = readObject(storage, LEGACY_KEY);
  return hasEvidence(legacy) ? { state: legacy, source: "legacy" } : { state: primary, source: "none" };
}

export class SnakeLearning {
  constructor(words, storage, readings = w => [w.pinyin], random = Math.random, saved = {}) {
    saved = object(saved);
    this.words = words;
    this.byId = new Map(words.map(w => [w.id, w]));
    this.storage = storage;
    this.readings = w => unique(list(readings(w)).map(s => String(s).trim().normalize("NFC").toLowerCase()).filter(Boolean));
    this.random = random;
    this.counts = Object.fromEntries(Object.entries(object(saved.counts)).filter(([id, n]) => this.byId.has(id) && Number.isSafeInteger(n) && n > 0));
    this.seen = this.validIds(saved.seen);
    this.retry = this.validIds(saved.retry);
    this.history = list(saved.history).filter(e => e && this.byId.has(e.wordId)).slice(-5000);
    this.batch = Number.isSafeInteger(saved.batch) && saved.batch > 0 ? saved.batch : 1;
    this.cursor = Number.isSafeInteger(saved.cursor) && saved.cursor >= 0 ? saved.cursor : 0;
    this.refreshPool(saved.runIds);
    this.targets = this.validIds(saved.targets).filter(id => this.runIds.includes(id));
    this.done = this.validIds(saved.done).filter(id => this.targets.includes(id));
    // Repair ambiguous unfinished restored targets, retaining completed work.
    this.targets = this.targets.filter((id, i, ids) => this.done.includes(id) || !ids.slice(0, i).some(other =>
      this.byId.get(other).char === this.byId.get(id).char || (this.isPinyin && this.shares(id, other)))).slice(0, BATCH_SIZE);
    if (!this.targets.length) { this.nextBatch(false); return; }
    this.fillTargets();
    this.active = this.targets.find(id => !this.done.includes(id)) || null;
    this.shown = saved.active === this.active && saved.shown === true;
    this.options = this.active ? this.makeOptions(this.active) : [];
    const options = list(saved.options);
    if (this.active && options.length > 0 && options.length <= 3 &&
        options.filter(o => o?.correct === true && o.wordId === this.active).length === 1 &&
        new Set(options.map(o => o?.wordId)).size === options.length &&
        options.every(o => o && this.runIds.includes(o.wordId) && o.correct === (o.wordId === this.active) &&
          o.glyph === (this.isPinyin ? this.byId.get(o.wordId).char : this.label(o.wordId)) &&
          (o.correct || !this.shares(this.active, o.wordId))) &&
        (this.isPinyin || new Set(options.map(o => o.glyph)).size === options.length)) this.options = options.map(o => ({ ...o }));
    if (!this.shown) this.showTarget();
  }

  validIds(ids) { return unique(list(ids)).filter(id => this.byId.has(id)); }
  get isPinyin() { return ((this.batch - 1) % 5 + 1) % 2 === 1; }
  get type() { return this.isPinyin ? "pinyin-to-hanzi" : "hanzi-to-pinyin"; }
  label(id) { return this.readings(this.byId.get(id)).join(" / "); }
  shares(a, b) { const r = this.readings(this.byId.get(a)); return this.readings(this.byId.get(b)).some(s => r.includes(s)); }
  get complete() { return this.targets.length > 0 && this.done.length === this.targets.length; }
  get current() { return this.byId.get(this.active) || null; }
  get prompt() { return this.current ? (this.isPinyin ? this.label(this.active) : this.current.char) : "暂无可学字"; }

  refreshPool(previous = []) {
    const { state, source } = learningSource(this.storage, this.words);
    this.source = source;
    const records = object(state.records);
    const learned = new Set(Object.entries(records).filter(([, r]) => evidence(r)).map(([id]) => id));
    evidenceLists.forEach(key => list(state[key]).forEach(id => learned.add(id)));
    const mastered = new Set(list(state.masteredIds));
    Object.entries(records).forEach(([id, r]) => { if (r?.status === "mastered") mastered.add(id); });
    const today = new Set(list(state.dailyNewIds).filter(id => learned.has(id)));
    const candidates = this.words.filter(w => learned.has(w.id) && !mastered.has(w.id)).sort((a, b) =>
      (this.counts[a.id] || 0) - (this.counts[b.id] || 0) || Number(today.has(b.id)) - Number(today.has(a.id))).slice(0, RUN_SIZE);
    const seen = new Set();
    this.runIds = this.validIds([...list(previous), ...candidates.map(w => w.id), ...this.words.map(w => w.id)])
      .filter(id => { const w = this.byId.get(id); if (mastered.has(id) || seen.has(w.char)) return false; seen.add(w.char); return true; }).slice(0, RUN_SIZE);
    this.cursor = this.runIds.length ? this.cursor % this.runIds.length : 0;
  }

  fillTargets() {
    const add = id => {
      if (this.targets.length >= BATCH_SIZE || !this.runIds.includes(id) || this.targets.some(other =>
        this.byId.get(other).char === this.byId.get(id).char || (this.isPinyin && this.shares(other, id)))) return;
      this.targets.push(id);
    };
    this.retry.forEach(add);
    this.retry = this.retry.filter(id => !this.targets.includes(id));
    for (let n = 0; n < this.runIds.length && this.targets.length < BATCH_SIZE; n++) {
      add(this.runIds[this.cursor]); this.cursor = (this.cursor + 1) % this.runIds.length;
    }
  }

  nextBatch(advance = true) {
    if (advance) this.batch++;
    if (advance && (this.batch - 1) % 20 === 0) { this.cursor = 0; this.refreshPool(); }
    else if (advance) this.refreshPool(this.runIds);
    this.targets = []; this.done = []; this.fillTargets();
    this.active = this.targets[0] || null; this.shown = false;
    this.options = this.active ? this.makeOptions(this.active) : [];
    this.showTarget();
  }

  shuffle(items) { return items.map(item => ({ item, key: this.random() })).sort((a, b) => a.key - b.key).map(x => x.item); }
  makeOptions(id) {
    const candidates = this.runIds.filter(other => other !== id && !this.shares(id, other));
    const past = candidates.filter(other => this.seen.includes(other) || this.counts[other]);
    const rest = candidates.filter(other => !past.includes(other));
    const labels = new Set([this.label(id)]);
    const distractors = [...this.shuffle(past), ...this.shuffle(rest)].filter(other => {
      if (this.isPinyin) return true;
      const label = this.label(other); if (!label || labels.has(label)) return false; labels.add(label); return true;
    }).slice(0, 2);
    return this.shuffle([id, ...distractors]).map(wordId => ({ wordId, correct: wordId === id,
      glyph: this.isPinyin ? this.byId.get(wordId).char : this.label(wordId) }));
  }

  showTarget() {
    if (!this.active || this.shown) return;
    this.shown = true;
    this.counts[this.active] = (this.counts[this.active] || 0) + 1;
    this.seen = unique([...this.seen, this.active]);
    const add = (wordId, role, value) => this.history.push({ wordId, targetWordId: this.active, batch: this.batch,
      type: this.type, role, value, timestamp: new Date().toISOString() });
    add(this.active, "prompt", this.prompt);
    this.options.forEach(o => add(o.wordId, o.correct ? "target" : "distractor", o.glyph));
    this.history = this.history.slice(-5000);
  }

  answer(id) {
    if (!this.active || !this.options.some(o => o.wordId === id)) return null;
    if (id !== this.active) { this.retry = unique([...this.retry, this.active]); return { correct: false }; }
    const word = this.current;
    this.done.push(this.active); this.retry = this.retry.filter(other => other !== this.active);
    this.active = this.targets.find(other => !this.done.includes(other)) || null;
    this.shown = false; this.options = this.active ? this.makeOptions(this.active) : [];
    this.showTarget();
    return { correct: true, word, complete: this.complete };
  }

  snapshot() {
    return Object.fromEntries(["counts", "seen", "retry", "history", "batch", "cursor", "runIds", "targets", "done", "active", "shown", "options"].map(key => [key, this[key]]));
  }
}
