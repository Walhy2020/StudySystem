import { HanziEngine } from "./engine.js";
import { MAX_HP, PHASE } from "./constants.js?v=1.4";

export const PHONETICS_REVIEW_POLICY_VERSION = 2;

export class PhoneticsEngine extends HanziEngine {
  constructor(state, words, options = {}) {
    const source = state && typeof state === "object" ? structuredClone(state) : {};
    super(state, words, options);
    this.state.phoneticsScreenedIds = source.todayDate === this.date && Array.isArray(source.phoneticsScreenedIds)
      ? [...new Set(source.phoneticsScreenedIds)].filter((id) => this.wordMap.has(id)) : [];
    // Old mixed-review saves have already completed new learning. Await confirmation, not another lap.
    if (this.state.dailyPhase === PHASE.MIXED_REVIEW) this.state.dailyPhase = PHASE.NEW_LEARNING;
    this.reviewPolicyMigrated = false;
    this._restorePhoneticsReviewPolicy(source);
    this.restoreCurrent();
  }

  _allNotMasteredIds() {
    return this.words.filter((item) => !this.isMastered(item.id)).map((item) => item.id);
  }

  _validPolicyIds(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value)].filter((id) => this.wordMap.has(id) && !this.isMastered(id));
  }

  _restorePhoneticsReviewPolicy(source) {
    if (source.todayDate !== this.date) source = {};
    const sourceVersion = Math.max(0, Number(source.phoneticsReviewPolicyVersion) || 0);
    const activeReview = source.dailyPhase === PHASE.REVIEW && source.dailyTaskStarted === true;
    this.state.phoneticsReviewPolicyVersion = PHONETICS_REVIEW_POLICY_VERSION;
    this.state.reviewIncludesDailyNew = source.reviewIncludesDailyNew === true;

    if (sourceVersion >= PHONETICS_REVIEW_POLICY_VERSION && this.state.reviewIncludesDailyNew) {
      this.state.dailyReviewIds = this._validPolicyIds(source.dailyReviewIds);
      this.state.dailyReviewDoneIds = this._validPolicyIds(source.dailyReviewDoneIds)
        .filter((id) => this.state.dailyReviewIds.includes(id));
    } else if (sourceVersion < PHONETICS_REVIEW_POLICY_VERSION) {
      this.reviewPolicyMigrated = true;
      if (activeReview) {
        const previouslyDone = new Set(this._validPolicyIds(source.dailyReviewDoneIds));
        this.state.dailyReviewIds = this._allNotMasteredIds();
        this.state.dailyReviewDoneIds = this.state.dailyReviewIds.filter((id) => previouslyDone.has(id));
        this.state.dailyReviewDate = this.date;
        this.state.reviewIncludesDailyNew = true;
        this.state.dailyTaskDone = this.taskComplete();
      }
    }

    this.state.dailyReviewIds = this._validPolicyIds(this.state.dailyReviewIds);
    this.state.dailyReviewDoneIds = this._validPolicyIds(this.state.dailyReviewDoneIds)
      .filter((id) => this.state.dailyReviewIds.includes(id));
    this.state.reviewWrongIds = this._validPolicyIds(this.state.reviewWrongIds);
    this.state.reviewWrongCorrectCounts = Object.fromEntries(this.state.reviewWrongIds.map((id) => [
      id, Math.max(0, Number(this.state.reviewWrongCorrectCounts[id]) || 0),
    ]));

    // The shared constructor only sees 20 review IDs. Recompute after restoring the full IPA queue.
    if (this.state.dailyPhase === PHASE.REVIEW && this.state.dailyTaskStarted) {
      this.state.dailyTaskDone = this.taskComplete();
    }
    if (this.state.dailyPhase !== PHASE.REVIEW || !this.state.dailyTaskStarted || this.state.dailyTaskDone) {
      if (this.state.dailyTaskDone) this._setActive(null);
      return;
    }
    const sourceActive = source.activeWordId;
    const canRestoreSource = this.state.dailyReviewIds.includes(sourceActive) &&
      !this.state.dailyReviewDoneIds.includes(sourceActive) && !this.isMastered(sourceActive);
    if (canRestoreSource) this._setActive(sourceActive);
    else this.restoreCurrent();
  }

  startDaily(options = {}) {
    this.state.phoneticsScreenedIds = [];
    const result = super.startDaily(options);
    this.state.reviewIncludesDailyNew = false;
    this.state.phoneticsReviewPolicyVersion = PHONETICS_REVIEW_POLICY_VERSION;
    return result;
  }

  _screeningWord() {
    const seen = new Set(this.state.phoneticsScreenedIds || []);
    const start = this.state.scanCursor % this.words.length;
    for (let offset = 0; offset < this.words.length; offset += 1) {
      const index = (start + offset) % this.words.length;
      const id = this.words[index].id;
      if (!seen.has(id) && !this.isMastered(id) && !this.state.dailyNewIds.includes(id)) {
        this.state.scanCursor = (index + 1) % this.words.length;
        return id;
      }
    }
    // Also permits batches smaller than three, including an all-known/all-mastered empty batch.
    this.state.dailyPhase = PHASE.NEW_LEARNING;
    return this._dailyLearningWord();
  }

  _dailyLearningWord() {
    return this._choose(this.state.dailyNewIds.filter((id) =>
      !this.isMastered(id) && (this.state.dailyNewCorrectCounts[id] || 0) < 1));
  }

  _canRestore(id) {
    if (this.state.inlineReviewContext?.wordId === id) return super._canRestore(id);
    if (this.state.dailyPhase === PHASE.NEW_LEARNING && (this.state.dailyNewCorrectCounts[id] || 0) >= 1) return false;
    if (this.state.dailyPhase === PHASE.SCREENING && this.state.phoneticsScreenedIds?.includes(id)) return false;
    return super._canRestore(id);
  }

  _markScreened() {
    if (this.state.dailyPhase !== PHASE.SCREENING || this.state.inlineReviewContext || !this.state.activeWordId) return;
    this.state.phoneticsScreenedIds = [...new Set([...(this.state.phoneticsScreenedIds || []), this.state.activeWordId])];
  }

  correct() {
    this._markScreened();
    if (this.state.dailyPhase !== PHASE.NEW_LEARNING || this.state.inlineReviewContext) return super.correct();
    const id = this.state.activeWordId;
    if (!id) return { type: "ignored", message: "本轮已学完，请点击学习完毕。" };
    const record = this.record(id);
    this.state.dailyNewCorrectCounts[id] = 1;
    record.correctCount += 1;
    record.streak += 1;
    record.status = "known";
    record.lastSeen = this.date;
    this._schedule(record);
    this.state.rewardCount += 1;
    this.state.recentWrongIds = this.state.recentWrongIds.filter((value) => value !== id);
    this._recoverHpAfterCorrect();
    this._advance();
    return { type: "correct", message: this.canFinishNewLearning() ? "本轮已学完，请点击学习完毕。" : "已记住，继续下一个音标。" };
  }

  wrong() {
    this._markScreened();
    const result = super.wrong();
    if (result.type === "screening-new") result.message = "已加入今日新音标，每项认识一次后即可完成。";
    return result;
  }

  canFinishNewLearning() {
    return this.state.dailyPhase === PHASE.NEW_LEARNING && !this.state.inlineReviewContext &&
      this.state.dailyTaskStarted && !this.state.dailyTaskDone &&
      this.state.dailyNewIds.every((id) => this.isMastered(id) || (this.state.dailyNewCorrectCounts[id] || 0) >= 1);
  }

  finishNewLearning() {
    if (!this.canFinishNewLearning()) return { type: "ignored", message: "请先学完本轮音标。" };
    this.state.dailyTaskDone = true;
    this._setActive(null);
    return { type: "new-completed", message: "本轮音标学习完毕。" };
  }

  progress() {
    return { ...super.progress(), newDone: this.state.dailyNewIds.filter((id) =>
      this.isMastered(id) || (this.state.dailyNewCorrectCounts[id] || 0) >= 1).length };
  }

  taskComplete() {
    if (this.state.dailyPhase === PHASE.REVIEW) {
      return this.state.dailyReviewIds.every((id) => this.isMastered(id) || this.state.dailyReviewDoneIds.includes(id)) &&
        this.state.reviewWrongIds.every((id) => this.isMastered(id) || this.reviewWrongCount(id) >= 3);
    }
    return super.taskComplete();
  }

  startReview() {
    this.state.inlineReviewContext = null;
    this.state.hp = MAX_HP;
    this.state.repairStreak = 0;
    this.state.reviewRound += 1;
    this.state.reviewWrongIds = [];
    this.state.reviewWrongCorrectCounts = {};
    this.state.dailyReviewIds = this._allNotMasteredIds();
    this.state.dailyReviewDoneIds = [];
    this.state.dailyReviewDate = this.date;
    this.state.reviewIncludesDailyNew = true;
    this.state.phoneticsReviewPolicyVersion = PHONETICS_REVIEW_POLICY_VERSION;

    if (this.state.dailyReviewIds.length) {
      this.state.dailyPhase = PHASE.REVIEW;
      this.state.dailyTaskStarted = true;
      this.state.dailyTaskDone = false;
      this._setActive(null);
      this._advance();
      return {
        type: "review-started",
        message: `已生成本轮 ${this.state.dailyReviewIds.length} 个复习音标。`,
      };
    }

    this.state.dailyPhase = PHASE.IDLE;
    this.state.dailyTaskStarted = false;
    this.state.dailyTaskDone = true;
    this._setActive(null);
    return {
      type: "review-empty",
      message: "所有音标均已完全认识，暂无需要复习的音标。",
    };
  }

  master() {
    this._markScreened();
    const inlineContext = this.state.inlineReviewContext ? structuredClone(this.state.inlineReviewContext) : null;
    const result = super.master();
    if (inlineContext && result.type === "mastered") {
      this.state.inlineReviewContext = inlineContext;
      this._restoreInline();
      return { ...result, message: "已设为完全认识，并返回原任务。" };
    }
    return result;
  }
}
