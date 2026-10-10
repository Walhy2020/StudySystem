import { PINYIN_ITEMS } from "../data/pinyin.js?v=1.0";
import { PinyinEngine } from "./pinyin-engine.js?v=1.1";
import { PinyinStorage } from "./pinyin-storage.js?v=1.0";
import { APP_VERSION, PHASE } from "./constants.js?v=1.0.63";

const items = PINYIN_ITEMS;
const dom = Object.fromEntries([...document.querySelectorAll("[id]")].map(node => [node.id, node]));
dom.appVersionLabel.textContent = `v${APP_VERSION}`;
if (items.length !== 63 || new Set(items.map(item => item.id)).size !== 63) {
  dom.bootError.hidden = false;
  dom.bootError.textContent = "拼音数据校验失败。";
  throw new Error(dom.bootError.textContent);
}
const storage = new PinyinStorage(localStorage, items, { namespace: new URLSearchParams(location.search).get("test") });
let engine = new PinyinEngine(storage.load(), items);
storage.save(engine.state);

function fitSymbol() {
  const stage = dom.currentPinyin.querySelector(".phonetic-symbol-stage");
  const maxWidth = Math.max(1, stage.clientWidth - 44);
  const maxHeight = Math.max(1, stage.clientHeight - 86);
  let lower = 12;
  let upper = dom.currentPinyin.dataset.contentKind === "placeholder" ? 96 : 160;
  for (let step = 0; step < 12; step++) {
    const size = (lower + upper) / 2;
    dom.pinyinSymbol.style.fontSize = `${size}px`;
    const rect = dom.pinyinSymbol.getBoundingClientRect();
    if (rect.width <= maxWidth && rect.height <= maxHeight) lower = size;
    else upper = size;
  }
  dom.pinyinSymbol.style.fontSize = `${Math.floor(lower)}px`;
}

function renderList(container, ids, source, emptyText) {
  container.replaceChildren();
  if (!ids.length) {
    const empty = document.createElement("span");
    empty.className = "empty-list"; empty.textContent = emptyText; container.append(empty);
    return;
  }
  for (const id of ids) {
    const item = engine.wordMap.get(id);
    if (!item) continue;
    const done = engine.isMastered(id) || (source === "review-wrong"
      ? engine.reviewWrongCount(id) >= 3 : (engine.state.dailyNewCorrectCounts[id] || 0) >= 1);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `word-chip ${done ? "done" : source === "review-wrong" ? "wrong" : "pending"}`;
    button.textContent = item.symbol;
    button.dataset.inlineId = id; button.dataset.inlineSource = source;
    button.disabled = engine.isMastered(id);
    button.setAttribute("aria-label", `临时复习拼音 ${item.symbol}`);
    container.append(button);
  }
}

function render() {
  const item = engine.currentWord();
  const active = Boolean(item) && engine.state.dailyTaskStarted && !engine.state.dailyTaskDone && engine.state.dailyPhase !== PHASE.IDLE;
  const ready = engine.canFinishNewLearning();
  const phases = { [PHASE.IDLE]: "等待开始", [PHASE.SCREENING]: "筛选今日新拼音",
    [PHASE.NEW_LEARNING]: "今日新拼音学习", [PHASE.REVIEW]: "复习拼音" };
  const progress = engine.progress();
  dom.phaseLabel.textContent = phases[engine.state.dailyPhase] || "等待开始";
  dom.taskProgress.textContent = engine.state.inlineReviewContext ? "临时复习 · 完成后返回原任务"
    : engine.state.dailyPhase === PHASE.SCREENING ? `已选 ${engine.state.dailyNewIds.length}/3`
    : engine.state.dailyPhase === PHASE.NEW_LEARNING ? `完成 ${progress.newDone}/${progress.newTotal} · 每项认识 1 次`
    : engine.state.dailyPhase === PHASE.REVIEW ? `普通 ${progress.reviewDone}/${progress.reviewTotal} · 错拼音 ${progress.wrongDone}/${progress.wrongTotal}` : "";
  dom.currentPinyin.dataset.contentKind = active ? "character" : "placeholder";
  dom.pinyinSymbol.textContent = active ? item.symbol : engine.state.dailyTaskDone ? "完成" : ready ? "学完了" : "开始";
  dom.pinyinSymbol.classList.toggle("phonetic-state-label", !active);
  dom.categoryLabel.textContent = active ? item.title : "";
  dom.categoryLabel.classList.toggle("hidden", !active);
  dom.idleMessage.textContent = active ? "" : engine.state.dailyTaskDone ? "本次任务已完成"
    : ready ? "本轮已学完，请点击“学习完毕”。" : "选择今日新拼音或复习拼音";
  dom.idleMessage.classList.toggle("hidden", active);
  dom.masteredBadge.classList.add("hidden");
  dom.reviewRoundBadge.classList.toggle("hidden", !active);
  if (active) {
    const count = Math.max(1, Math.min(9, Number(engine.record(item.id).studyAppearanceCount) || 1));
    dom.reviewRoundBadge.textContent = ["", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"][count];
  }
  [dom.markCorrect, dom.markWrong, dom.markMastered].forEach(button => {
    button.classList.toggle("hidden", !active); button.disabled = !active;
  });
  [dom.startDaily, dom.startReview].forEach(button => button.classList.toggle("hidden", active));
  const learning = engine.state.dailyTaskStarted && !engine.state.dailyTaskDone;
  dom.startDaily.disabled = learning && engine.state.dailyPhase !== PHASE.REVIEW;
  dom.startReview.disabled = learning && engine.state.dailyPhase === PHASE.REVIEW;
  dom.finishNewWords.classList.toggle("hidden", !ready);
  const stats = engine.stats();
  for (const field of ["known", "mastered", "wrong", "due"]) dom[`${field}Count`].textContent = stats[field];
  dom.progressCount.textContent = `${stats.touched}/${stats.total}`;
  dom.starCount.textContent = engine.state.stars;
  renderList(dom.todayNewList, engine.state.dailyNewIds, "today-new", "尚未选择");
  renderList(dom.reviewWrongList, engine.state.reviewWrongIds, "review-wrong", "暂无错拼音");
  fitSymbol();
}

function act(callback) {
  const result = callback();
  dom.feedback.textContent = (result?.message || "").replaceAll("音标", "拼音").replaceAll("汉字", "拼音").replaceAll("这个字", "这项拼音");
  storage.save(engine.state); render();
  return result;
}
const actions = {
  startDaily: () => engine.startDaily(), nextBatch: () => engine.startDaily({ resetCursor: true }),
  startReview: () => engine.startReview(), correct: () => engine.correct(), wrong: () => engine.wrong(),
  master: () => engine.master(), finishNew: () => engine.finishNewLearning(),
};
for (const [id, action] of Object.entries({ startDaily: "startDaily", nextBatch: "nextBatch", startReview: "startReview",
  markCorrect: "correct", markWrong: "wrong", markMastered: "master", finishNewWords: "finishNew" })) {
  dom[id].addEventListener("click", () => act(actions[action]));
}
document.addEventListener("click", event => {
  const button = event.target.closest("[data-inline-id]");
  if (button && !button.disabled) act(() => engine.startInlineReview(button.dataset.inlineId, button.dataset.inlineSource));
});
dom.resetPinyin.addEventListener("click", () => {
  if (!confirm("第一次确认：要重置拼音学习状态吗？")) return;
  if (!confirm("第二次确认：只重置拼音，不影响汉字、音标及其他模块。确定继续吗？")) return;
  engine = new PinyinEngine(storage.reset(), items);
  dom.feedback.textContent = "已重置拼音学习状态。";
  render();
});
window.addEventListener("resize", fitSymbol);
document.fonts?.ready.then(fitSymbol);
window.__PINYIN_APP__ = {
  getState: () => structuredClone(engine.state), getCurrentItem: () => structuredClone(engine.currentWord()),
  getItems: () => structuredClone(items), getStorageKey: () => storage.key,
  dispatch(name) { if (!actions[name]) throw new Error(`Unknown action: ${name}`); return act(actions[name]); },
};
render();
