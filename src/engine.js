import {
  DAILY_NEW_LIMIT,
  DAILY_NEW_REQUIRED_CORRECT,
  DAILY_REVIEW_LIMIT,
  MAX_HP,
  PHASE,
  REVIEW_INTERVAL_ROUNDS,
  REVIEW_WRONG_REQUIRED_CORRECT,
  REVIEW_WRONG_WEIGHT,
} from "./constants.js";
import { localDateString, normalizeState, resetDailyBoundary } from "./state.js";

const unique = (items) => [...new Set(items)];

export class HanziEngine {
  constructor(state, words, options = {}) {
    this.words = words;
    this.wordMap = new Map(words.map((word) => [word.id, word]));
    this.rng = options.rng || Math.random;
    this.date = options.date || localDateString();
    this.state = normalizeState(state, words, this.date);
    this.restoreCurrent();
  }

  setDate(date) {
    this.date = date;
    if (this.state.todayDate !== date) resetDailyBoundary(this.state, date);
    return this.state;
  }

  record(id) {
    if (!this.state.records[id]) {
      this.state.records[id] = {
        status: "new", correctCount: 0, errorCount: 0, streak: 0,
        lastSeen: null, nextReview: 0, nextReviewRound: 0,
        intervalDays: 0, reviewIntervalRounds: 0, reviewStage: 0,
        studyAppearanceCount: 0, studyAppearanceKeys: [],
      };
    }
    return this.state.records[id];
  }

  isMastered(id) {
    return this.state.masteredIds.includes(id) || this.state.records[id]?.status === "mastered";
  }

  currentWord() {
    return this.wordMap.get(this.state.activeWordId) || null;
  }

  _setActive(id) {
    this.state.activeWordId = id && this.wordMap.has(id) ? id : null;
    if (!this.state.activeWordId || !this.state.dailyTaskStarted) return;
    const record = this.record(this.state.activeWordId);
    if (!record.studyAppearanceKeys.includes(this.date)) {
      record.studyAppearanceKeys.push(this.date);
      record.studyAppearanceKeys = record.studyAppearanceKeys.slice(-80);
      record.studyAppearanceCount += 1;
    }
  }

  _choose(ids, avoidId = this.state.activeWordId) {
    if (!ids.length) return null;
    const alternatives = ids.filter((id) => id !== avoidId);
    const pool = alternatives.length ? alternatives : ids;
    return pool[Math.floor(this.rng() * pool.length)] || pool[0];
  }

  _screeningWord() {
    if (this.state.dailyNewIds.length >= DAILY_NEW_LIMIT || !this.words.length) return null;
    const start = ((this.state.scanCursor % this.words.length) + this.words.length) % this.words.length;
    const passes = [
      (id) => !this.state.dailyNewIds.includes(id) && !this.isMastered(id) && this.state.records[id]?.status !== "known",
      (id) => !this.state.dailyNewIds.includes(id) && !this.isMastered(id),
    ];
    for (const predicate of passes) {
      for (let offset = 0; offset < this.words.length; offset += 1) {
        const index = (start + offset) % this.words.length;
        const id = this.words[index].id;
        if (predicate(id)) {
          this.state.scanCursor = (index + 1) % this.words.length;
          return id;
        }
      }
    }
    return null;
  }

  _dailyLearningWord() {
    const available = this.state.dailyNewIds.filter((id) => !this.isMastered(id));
    const unfinished = available.filter((id) => (this.state.dailyNewCorrectCounts[id] || 0) < DAILY_NEW_REQUIRED_CORRECT);
    return this._choose(unfinished.length ? unfinished : available);
  }

  _mixedWord() {
    const unfinished = this.state.dailyNewIds.filter((id) => !this.isMastered(id) && !this.state.dailyMixedDoneIds.includes(id));
    return this._choose(unfinished);
  }

  reviewWrongCount(id) {
    return Math.max(0, Math.min(REVIEW_WRONG_REQUIRED_CORRECT, Number(this.state.reviewWrongCorrectCounts[id]) || 0));
  }

  _reviewWord() {
    const wrong = this.state.reviewWrongIds.filter((id) => !this.isMastered(id) && this.reviewWrongCount(id) < REVIEW_WRONG_REQUIRED_CORRECT);
    const wrongSet = new Set(wrong);
    const ordinary = this.state.dailyReviewIds.filter((id) => !this.state.dailyReviewDoneIds.includes(id) && !wrongSet.has(id) && !this.isMastered(id));
    const weighted = wrong.flatMap((id) => Array(REVIEW_WRONG_WEIGHT).fill(id));
    return this._choose(weighted.concat(ordinary));
  }

  _nextId() {
    if (!this.state.dailyTaskStarted || this.state.dailyTaskDone) return null;
    if (this.state.dailyPhase === PHASE.SCREENING) return this._screeningWord();
    if (this.state.dailyPhase === PHASE.NEW_LEARNING) return this._dailyLearningWord();
    if (this.state.dailyPhase === PHASE.MIXED_REVIEW) return this._mixedWord();
    if (this.state.dailyPhase === PHASE.REVIEW) return this._reviewWord();
    return null;
  }

  _canRestore(id) {
    if (!id || !this.wordMap.has(id) || !this.state.dailyTaskStarted) return false;
    if (this.state.inlineReviewContext?.wordId === id) return true;
    if (this.state.dailyTaskDone || this.isMastered(id)) return false;
    if (this.state.dailyPhase === PHASE.SCREENING) return !this.state.dailyNewIds.includes(id) && this.state.dailyNewIds.length < DAILY_NEW_LIMIT;
    if (this.state.dailyPhase === PHASE.NEW_LEARNING) return this.state.dailyNewIds.includes(id);
    if (this.state.dailyPhase === PHASE.MIXED_REVIEW) return this.state.dailyNewIds.includes(id) && !this.state.dailyMixedDoneIds.includes(id);
    if (this.state.dailyPhase === PHASE.REVIEW) {
      return this.state.dailyReviewIds.includes(id) && !this.state.dailyReviewDoneIds.includes(id) ||
        this.state.reviewWrongIds.includes(id) && this.reviewWrongCount(id) < REVIEW_WRONG_REQUIRED_CORRECT;
    }
    return false;
  }

  restoreCurrent() {
    if (!this._canRestore(this.state.activeWordId)) this._setActive(this._nextId());
    if (this.state.dailyTaskStarted && this.state.dailyPhase !== PHASE.NEW_LEARNING && !this.state.activeWordId) {
      this.state.dailyTaskDone = this.taskComplete();
    }
    return this.currentWord();
  }

  _advance() {
    this._setActive(this._nextId());
    if (!this.state.activeWordId && this.state.dailyPhase !== PHASE.NEW_LEARNING) {
      this.state.dailyTaskDone = this.taskComplete();
    }
    return this.currentWord();
  }

  taskComplete() {
    if (this.state.dailyPhase === PHASE.MIXED_REVIEW) {
      return this.state.dailyNewIds.length > 0 && this.state.dailyNewIds.every((id) => this.isMastered(id) || this.state.dailyMixedDoneIds.includes(id));
    }
    if (this.state.dailyPhase === PHASE.REVIEW) {
      const ordinaryDone = this.state.dailyReviewIds.every((id) => this.isMastered(id) || this.state.dailyReviewDoneIds.includes(id));
      const wrongDone = this.state.reviewWrongIds.every((id) => this.isMastered(id) || this.reviewWrongCount(id) >= REVIEW_WRONG_REQUIRED_CORRECT);
      return (this.state.dailyReviewIds.length > 0 || this.state.reviewWrongIds.length > 0) && ordinaryDone && wrongDone;
    }
    return false;
  }

  startDaily(options = {}) {
    Object.assign(this.state, {
      hp: MAX_HP,
      repairStreak: 0,
      dailyNewIds: [],
      dailyNewCorrectCounts: {},
      dailyMixedDoneIds: [],
      dailyReviewIds: [],
      dailyReviewDate: "",
      dailyReviewDoneIds: [],
      reviewWrongIds: [],
      reviewWrongCorrectCounts: {},
      dailyPhase: PHASE.SCREENING,
      dailyTaskStarted: true,
      dailyTaskDone: false,
      activeWordId: null,
      inlineReviewContext: null,
    });
    if (options.resetCursor) this.state.scanCursor = 0;
    this._advance();
    return { type: "daily-started", message: "请用 × 选出 3 个不认识的今日新字。" };
  }

  dueWordIds() {
    return this.words
      .filter((word) => {
        const record = this.state.records[word.id];
        return !this.isMastered(word.id) && record && Number(record.nextReviewRound) > 0 && Number(record.nextReviewRound) <= this.state.reviewRound;
      })
      .sort((a, b) => Number(this.state.records[a.id].nextReviewRound) - Number(this.state.records[b.id].nextReviewRound))
      .map((word) => word.id);
  }

  startReview() {
    this.state.inlineReviewContext = null;
    const continued = this.state.dailyReviewDate === this.date;
    if (!continued) {
      this.state.reviewRound += 1;
      this.state.reviewWrongIds = [];
      this.state.reviewWrongCorrectCounts = {};
      this.state.dailyReviewIds = this.dueWordIds()
        .filter((id) => !this.state.dailyNewIds.includes(id))
        .slice(0, DAILY_REVIEW_LIMIT);
      this.state.dailyReviewDoneIds = [];
      this.state.dailyReviewDate = this.date;
    }
    const hasReviewItems = this.state.dailyReviewIds.length > 0 || this.state.reviewWrongIds.length > 0;
    if (hasReviewItems) {
      this.state.dailyPhase = PHASE.REVIEW;
      this.state.dailyTaskStarted = true;
      this.state.dailyTaskDone = false;
      this._setActive(null);
      this._advance();
    } else {
      this.state.dailyPhase = PHASE.IDLE;
      this.state.dailyTaskStarted = false;
      this.state.dailyTaskDone = false;
      this._setActive(null);
    }
    return {
      type: continued ? "review-continued" : "review-started",
      message: this.state.dailyReviewIds.length
        ? (continued ? "继续今天的固定复习批次。" : `已生成今天的 ${this.state.dailyReviewIds.length} 个复习字。`)
        : (continued ? "今天没有可以复习的旧字。" : "还没有到期的复习字。"),
    };
  }

  _schedule(record) {
    const stage = Math.max(0, Math.min(REVIEW_INTERVAL_ROUNDS.length - 1, Number(record.reviewStage) || 0));
    const interval = REVIEW_INTERVAL_ROUNDS[stage];
    record.intervalDays = interval;
    record.reviewIntervalRounds = interval;
    record.nextReviewRound = this.state.reviewRound + interval;
    record.nextReview = 0;
    record.reviewStage = Math.min(stage + 1, REVIEW_INTERVAL_ROUNDS.length - 1);
  }

  _screeningCorrect(id) {
    const record = this.record(id);
    record.correctCount = Math.max(record.correctCount, DAILY_NEW_REQUIRED_CORRECT);
    record.streak = Math.max(record.streak, DAILY_NEW_REQUIRED_CORRECT);
    record.status = "known";
    record.lastSeen = this.date;
    if (!record.nextReviewRound && !record.nextReview) this._schedule(record);
    this.state.recentWrongIds = this.state.recentWrongIds.filter((item) => item !== id);
  }

  _restoreInline() {
    const context = this.state.inlineReviewContext;
    this.state.inlineReviewContext = null;
    this.state.dailyPhase = context.returnPhase;
    this.state.dailyTaskStarted = context.returnTaskStarted;
    this.state.dailyTaskDone = context.returnTaskDone;
    if (this._canRestore(context.returnWordId)) this._setActive(context.returnWordId);
    else if (this.state.dailyTaskStarted && !this.state.dailyTaskDone) this._setActive(this._nextId());
    else this._setActive(null);
  }

  _inlineCorrect(id, source) {
    const record = this.record(id);
    record.correctCount += 1;
    record.streak += 1;
    record.status = "known";
    record.lastSeen = this.date;
    if (source === "today-new") {
      this.state.dailyNewCorrectCounts[id] = DAILY_NEW_REQUIRED_CORRECT;
      if (!this.state.dailyMixedDoneIds.includes(id)) this.state.dailyMixedDoneIds.push(id);
      if (!record.nextReviewRound && !record.nextReview) this._schedule(record);
    } else {
      if (!this.state.reviewWrongIds.includes(id)) this.state.reviewWrongIds.push(id);
      this.state.reviewWrongCorrectCounts[id] = Math.min(REVIEW_WRONG_REQUIRED_CORRECT, this.reviewWrongCount(id) + 1);
    }
    this.state.recentWrongIds = this.state.recentWrongIds.filter((item) => item !== id);
    this._restoreInline();
  }

  _recoverHpAfterCorrect() {
    if (this.state.hp > 0) return;
    this.state.repairStreak += 1;
    if (this.state.repairStreak >= 3) {
      this.state.hp = 1;
      this.state.repairStreak = 0;
    }
  }

  correct() {
    const id = this.state.activeWordId;
    if (!id) return { type: "ignored", message: "请先开始学习任务。" };
    const inline = this.state.inlineReviewContext;
    if (inline?.wordId === id) {
      this._inlineCorrect(id, inline.source);
      return { type: "inline-correct", message: "临时复习完成，已返回原任务。" };
    }
    if (this.state.dailyPhase === PHASE.SCREENING) {
      this._screeningCorrect(id);
      this._advance();
      return { type: "screening-known", message: "已记录为认识，继续筛选。" };
    }

    const record = this.record(id);
    const isDailyNew = this.state.dailyNewIds.includes(id);
    const isDailyReview = this.state.dailyReviewIds.includes(id);
    const isWrongReview = this.state.reviewWrongIds.includes(id);
    const beforeDaily = Number(this.state.dailyNewCorrectCounts[id]) || 0;
    record.correctCount += 1;
    record.streak += 1;
    record.lastSeen = this.date;

    if (isDailyNew && this.state.dailyPhase === PHASE.NEW_LEARNING) {
      this.state.dailyNewCorrectCounts[id] = Math.min(DAILY_NEW_REQUIRED_CORRECT, beforeDaily + 1);
    }
    if (isDailyNew && this.state.dailyPhase === PHASE.MIXED_REVIEW && !this.state.dailyMixedDoneIds.includes(id)) {
      this.state.dailyMixedDoneIds.push(id);
    }

    let wrongRepairComplete = !isWrongReview;
    if (isWrongReview) {
      this.state.reviewWrongCorrectCounts[id] = Math.min(REVIEW_WRONG_REQUIRED_CORRECT, this.reviewWrongCount(id) + 1);
      wrongRepairComplete = this.reviewWrongCount(id) >= REVIEW_WRONG_REQUIRED_CORRECT;
    }
    if (isDailyReview && wrongRepairComplete && !this.state.dailyReviewDoneIds.includes(id)) this.state.dailyReviewDoneIds.push(id);

    const completedLastReview = isDailyReview && wrongRepairComplete &&
      Number(record.reviewIntervalRounds || record.intervalDays) >= REVIEW_INTERVAL_ROUNDS.at(-1);
    if (completedLastReview) this._setMastered(id, false);
    else if (record.correctCount >= DAILY_NEW_REQUIRED_CORRECT && record.streak >= DAILY_NEW_REQUIRED_CORRECT) record.status = "known";
    else record.status = "learning";

    const dailyJustCompleted = isDailyNew && this.state.dailyPhase === PHASE.NEW_LEARNING &&
      beforeDaily < DAILY_NEW_REQUIRED_CORRECT && this.state.dailyNewCorrectCounts[id] >= DAILY_NEW_REQUIRED_CORRECT;
    const shouldSchedule = !completedLastReview && ((isDailyReview && wrongRepairComplete) || dailyJustCompleted);
    if (shouldSchedule) this._schedule(record);

    this.state.rewardCount += 1;
    this.state.recentWrongIds = this.state.recentWrongIds.filter((item) => item !== id);
    this._recoverHpAfterCorrect();
    this._advance();
    return { type: "correct", message: this.state.dailyTaskDone ? "本次任务完成！" : "正确，继续。" };
  }

  _recordWrong(id) {
    const record = this.record(id);
    record.errorCount += 1;
    record.streak = 0;
    record.status = "wrong";
    record.lastSeen = this.date;
    record.nextReview = 0;
    record.nextReviewRound = this.state.reviewRound;
    record.reviewIntervalRounds = 0;
    record.intervalDays = 0;
    record.reviewStage = Math.max(0, (Number(record.reviewStage) || 0) - 1);
    this.state.recentWrongIds = [id, ...this.state.recentWrongIds.filter((item) => item !== id)].slice(0, 30);
  }

  wrong() {
    const id = this.state.activeWordId;
    if (!id) return { type: "ignored", message: "请先开始学习任务。" };
    const inline = this.state.inlineReviewContext;
    if (inline?.wordId === id) {
      this._recordWrong(id);
      if (inline.source === "today-new") {
        this.state.dailyNewCorrectCounts[id] = 0;
        this.state.dailyMixedDoneIds = this.state.dailyMixedDoneIds.filter((item) => item !== id);
      } else {
        if (!this.state.reviewWrongIds.includes(id)) this.state.reviewWrongIds.push(id);
        this.state.reviewWrongCorrectCounts[id] = 0;
      }
      if (this.state.dailyPhase !== PHASE.SCREENING) this.state.hp = Math.max(0, this.state.hp - 1);
      this.state.repairStreak = 0;
      this._restoreInline();
      return { type: "inline-wrong", message: "已记录错误，并返回原任务。" };
    }
    if (this.state.dailyPhase === PHASE.SCREENING) {
      const record = this.record(id);
      record.errorCount += 1;
      record.streak = 0;
      record.status = "learning";
      record.lastSeen = this.date;
      record.nextReview = 0;
      record.nextReviewRound = 0;
      record.reviewIntervalRounds = 0;
      this.state.dailyNewIds.push(id);
      this.state.dailyNewCorrectCounts[id] = 0;
      this.state.recentWrongIds = [id, ...this.state.recentWrongIds.filter((item) => item !== id)].slice(0, 30);
      if (this.state.dailyNewIds.length >= DAILY_NEW_LIMIT) this.state.dailyPhase = PHASE.NEW_LEARNING;
      this._advance();
      return { type: "screening-new", message: this.state.dailyPhase === PHASE.NEW_LEARNING ? "已选满 3 个今日新字，开始循环学习。" : "已加入今日新字，继续筛选。" };
    }

    this._recordWrong(id);
    if (this.state.dailyNewIds.includes(id)) {
      this.state.dailyNewCorrectCounts[id] = 0;
      this.state.dailyMixedDoneIds = this.state.dailyMixedDoneIds.filter((item) => item !== id);
      this.state.dailyTaskDone = false;
    }
    if (this.state.dailyReviewIds.includes(id)) {
      if (!this.state.reviewWrongIds.includes(id)) this.state.reviewWrongIds.push(id);
      this.state.reviewWrongCorrectCounts[id] = 0;
      if (!this.state.dailyReviewDoneIds.includes(id)) this.state.dailyReviewDoneIds.push(id);
    }
    if (this.state.reviewWrongIds.includes(id)) this.state.reviewWrongCorrectCounts[id] = 0;
    this.state.hp = Math.max(0, this.state.hp - 1);
    this.state.repairStreak = 0;
    this._advance();
    return { type: "wrong", message: "已记录错误，换下一个。" };
  }

  finishNewLearning() {
    const ready = this.state.dailyPhase === PHASE.NEW_LEARNING && this.state.dailyNewIds.length === DAILY_NEW_LIMIT &&
      this.state.dailyNewIds.every((id) => this.isMastered(id) || (this.state.dailyNewCorrectCounts[id] || 0) >= DAILY_NEW_REQUIRED_CORRECT);
    if (!ready) return { type: "ignored", message: "每个今日新字都正确 3 次后才能进入混合复习。" };
    this.state.dailyPhase = PHASE.MIXED_REVIEW;
    this.state.dailyMixedDoneIds = [];
    this.state.dailyReviewIds = [];
    this.state.dailyReviewDate = "";
    this.state.dailyReviewDoneIds = [];
    this.state.dailyTaskDone = false;
    this.state.inlineReviewContext = null;
    this._setActive(null);
    this._advance();
    return { type: "mixed-started", message: "开始混合复习：每个今日新字再正确 1 次。" };
  }

  _setMastered(id, keepDailySlot) {
    const record = this.record(id);
    record.status = "mastered";
    record.correctCount = Math.max(DAILY_NEW_REQUIRED_CORRECT, record.correctCount);
    record.streak = Math.max(DAILY_NEW_REQUIRED_CORRECT, record.streak);
    record.nextReview = 0;
    record.nextReviewRound = 0;
    record.intervalDays = 0;
    record.reviewIntervalRounds = 0;
    this.state.masteredIds = unique([...this.state.masteredIds, id]);
    if (!keepDailySlot) {
      this.state.dailyNewIds = this.state.dailyNewIds.filter((item) => item !== id);
      delete this.state.dailyNewCorrectCounts[id];
      this.state.dailyMixedDoneIds = this.state.dailyMixedDoneIds.filter((item) => item !== id);
    }
    this.state.dailyReviewIds = this.state.dailyReviewIds.filter((item) => item !== id);
    this.state.dailyReviewDoneIds = this.state.dailyReviewDoneIds.filter((item) => item !== id);
    this.state.reviewWrongIds = this.state.reviewWrongIds.filter((item) => item !== id);
    delete this.state.reviewWrongCorrectCounts[id];
    this.state.recentWrongIds = this.state.recentWrongIds.filter((item) => item !== id);
  }

  master() {
    const id = this.state.activeWordId;
    if (!id || this.isMastered(id)) return { type: "ignored", message: "当前没有可设为完全认识的汉字。" };
    const keepDailySlot = this.state.dailyNewIds.includes(id) && [PHASE.NEW_LEARNING, PHASE.MIXED_REVIEW].includes(this.state.dailyPhase);
    if (keepDailySlot) {
      this.state.dailyNewCorrectCounts[id] = DAILY_NEW_REQUIRED_CORRECT;
      if (this.state.dailyPhase === PHASE.MIXED_REVIEW && !this.state.dailyMixedDoneIds.includes(id)) this.state.dailyMixedDoneIds.push(id);
    }
    this._setMastered(id, keepDailySlot);
    this.state.stars += 1;
    this.state.inlineReviewContext = null;
    this._advance();
    return { type: "mastered", message: "已设为完全认识，奖励 1 颗星星。" };
  }

  startInlineReview(id, source) {
    if (!this.wordMap.has(id) || this.isMastered(id)) return { type: "ignored", message: "这个字当前不可临时复习。" };
    if (source === "today-new" && !this.state.dailyNewIds.includes(id)) return { type: "ignored", message: "这个字不在今日新字中。" };
    if (source === "review-wrong" && !this.state.reviewWrongIds.includes(id)) return { type: "ignored", message: "这个字不在复习错字中。" };
    const existing = this.state.inlineReviewContext;
    this.state.inlineReviewContext = existing || {
      wordId: id,
      source,
      returnWordId: this.state.activeWordId && this.state.activeWordId !== id ? this.state.activeWordId : null,
      returnPhase: this.state.dailyPhase,
      returnTaskStarted: this.state.dailyTaskStarted,
      returnTaskDone: this.state.dailyTaskDone,
    };
    this.state.inlineReviewContext.wordId = id;
    this.state.inlineReviewContext.source = source;
    this.state.dailyTaskDone = false;
    this._setActive(id);
    return { type: "inline-started", message: "临时复习这个字，完成后会返回原任务。" };
  }

  stats() {
    const recordValues = Object.values(this.state.records);
    const touched = recordValues.filter((record) => Number(record.correctCount) > 0 || Number(record.errorCount) > 0).length;
    return {
      known: Object.entries(this.state.records).filter(([id, record]) => !this.isMastered(id) && record.status === "known").length,
      mastered: this.state.masteredIds.length,
      wrong: this.state.recentWrongIds.filter((id) => !this.isMastered(id)).length,
      due: this.dueWordIds().filter((id) => !this.state.dailyNewIds.includes(id)).length,
      touched,
      total: this.words.length,
    };
  }

  progress() {
    return {
      newDone: this.state.dailyNewIds.filter((id) => this.isMastered(id) || (this.state.dailyNewCorrectCounts[id] || 0) >= DAILY_NEW_REQUIRED_CORRECT).length,
      newTotal: this.state.dailyPhase === PHASE.SCREENING ? DAILY_NEW_LIMIT : this.state.dailyNewIds.length,
      mixedDone: this.state.dailyNewIds.filter((id) => this.isMastered(id) || this.state.dailyMixedDoneIds.includes(id)).length,
      reviewDone: this.state.dailyReviewDoneIds.filter((id) => this.state.dailyReviewIds.includes(id)).length,
      reviewTotal: this.state.dailyReviewIds.length,
      wrongDone: this.state.reviewWrongIds.filter((id) => this.reviewWrongCount(id) >= REVIEW_WRONG_REQUIRED_CORRECT).length,
      wrongTotal: this.state.reviewWrongIds.length,
    };
  }
}
