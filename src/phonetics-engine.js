import { HanziEngine } from "./engine.js";
import { MAX_HP, PHASE } from "./constants.js?v=1.4";

export const PHONETICS_REVIEW_POLICY_VERSION = 2;

export class PhoneticsEngine extends HanziEngine {
  constructor(state, words, options = {}) {
    const source = state && typeof state === "object" ? structuredClone(state) : {};
    super(state, words, options);
    this.reviewPolicyMigrated = false;
    this._restorePhoneticsReviewPolicy(source);
  }

  _allNotMasteredIds() {
    return this.words.filter((item) => !this.isMastered(item.id)).map((item) => item.id);
  }

  _validPolicyIds(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value)].filter((id) => this.wordMap.has(id) && !this.isMastered(id));
  }

  _restorePhoneticsReviewPolicy(source) {
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
    const result = super.startDaily(options);
    this.state.reviewIncludesDailyNew = false;
    this.state.phoneticsReviewPolicyVersion = PHONETICS_REVIEW_POLICY_VERSION;
    return result;
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
