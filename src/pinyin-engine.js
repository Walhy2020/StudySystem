import { PhoneticsEngine } from "./phonetics-engine.js?v=1.2";
import { PHASE } from "./constants.js";
// Reuse single-pass learning/full non-mastered review, with isolated pinyin state.
export class PinyinEngine extends PhoneticsEngine {
  startDaily(options = {}) {
    // A fresh learning round always begins with the catalog, not a saved scan offset.
    return super.startDaily({ ...options, resetCursor: true });
  }

  _dailyLearningWord() {
    const pending = new Set(this.state.dailyNewIds.filter(id =>
      !this.isMastered(id) && (this.state.dailyNewCorrectCounts[id] || 0) < 1));
    return this.words.find(item => pending.has(item.id))?.id || null;
  }

  _canRestore(id) {
    if (this.state.dailyPhase === PHASE.NEW_LEARNING && !this.state.inlineReviewContext) {
      return Boolean(id && id === this._dailyLearningWord());
    }
    return super._canRestore(id);
  }
}
