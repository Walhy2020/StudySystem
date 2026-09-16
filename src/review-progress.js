export const REVIEW_PROGRESS_KEY = "mario-total-review-v1";

export class ReviewProgress {
  constructor(storage) {
    this.storage = storage;
    this.records = {};
    this.round = null;
    this.available = true;
    try {
      if (!storage) throw new Error("Storage unavailable");
      const saved = JSON.parse(storage.getItem(REVIEW_PROGRESS_KEY) || "null");
      if (saved?.version === 1) {
        for (const [key, value] of Object.entries(saved.records || {})) {
          if (key.startsWith("total:") && ["remembered", "forgotten"].includes(value)) this.records[key] = value;
        }
        if (Array.isArray(saved.round?.questions) && Number.isInteger(saved.round.questionIndex) &&
            saved.round.questionIndex >= 0 && saved.round.questionIndex <= saved.round.questions.length) {
          this.round = saved.round;
        }
      }
    } catch { this.available = false; }
  }

  status(key) { return this.records[key] || "unmarked"; }

  prioritize(keys) {
    const rank = { forgotten: 0, unmarked: 1, remembered: 2 };
    return [...keys].sort((a, b) => rank[this.status(a)] - rank[this.status(b)]);
  }

  restore(session, restart = false) {
    const saved = restart ? null : this.round;
    const valid = key => typeof key === "string" && session.byKey.has(key);
    if (saved) {
      const seen = new Set();
      const unique = keys => keys.filter(key => valid(key) && !seen.has(key) && seen.add(key));
      const done = unique(saved.questions.slice(0, saved.questionIndex));
      const pending = unique(saved.questions.slice(saved.questionIndex));
      const added = this.prioritize(session.questions.filter(key => !seen.has(key)));
      session.questions = [...done, ...pending, ...added];
      session.questionIndex = done.length;
      session.correctCount = done.length;
    } else {
      session.questions = this.prioritize(session.questions);
    }
    session.complete = session.questionIndex >= session.questions.length;
    const options = Array.isArray(saved?.optionKeys) ? saved.optionKeys : [];
    const canRestoreOptions = saved && !session.complete &&
      saved.questions[saved.questionIndex] === session.target()?.key &&
      options.length === Math.min(session.optionLimit, session.words.length) &&
      new Set(options).size === options.length && options.every(valid) && options.includes(session.target().key);
    session.optionKeys = session.complete ? [] : canRestoreOptions ? [...options] : session.buildOptions();
    return this.save(session);
  }

  mark(key, status) {
    if (["remembered", "forgotten"].includes(status)) this.records[key] = status;
  }

  save(session) {
    this.round = {
      questions: [...session.questions], questionIndex: session.questionIndex,
      optionKeys: [...session.optionKeys]
    };
    try {
      this.storage.setItem(REVIEW_PROGRESS_KEY, JSON.stringify({
        version: 1, records: this.records, round: this.round
      }));
      this.available = true;
      return true;
    } catch {
      this.available = false;
      return false;
    }
  }
}
