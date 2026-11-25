import { ALPHABET_ITEMS } from "../data/alphabet.js?v=1.0";
import { confirmStudyDialog } from "./study-dialog.js?v=1.0";
import { PhoneticsEngine } from "./phonetics-engine.js?v=1.2";
import { cancelPhoneticSpeech, speakPhoneticExample } from "./phonetics-tts.js?v=1.4";
import { AlphabetStorage } from "./alphabet-storage.js?v=1.0";
import { APP_VERSION, PHASE } from "./constants.js?v=1.0.109";

const items = ALPHABET_ITEMS;
const allMasteredMessage = `${items.length} 项字母均已标为“完全认识”，暂无新字母或待复习项。`;
const dom = Object.fromEntries([...document.querySelectorAll("[id]")].map(node => [node.id, node]));
dom.appVersionLabel.textContent = `v${APP_VERSION}`;
if (items.length !== 26 || new Set(items.map(item => item.id)).size !== 26) {
  dom.bootError.hidden = false;
  dom.bootError.textContent = "字母数据校验失败。";
  throw new Error(dom.bootError.textContent);
}
const storage = new AlphabetStorage(localStorage, items, { namespace: new URLSearchParams(location.search).get("test") });
let engine = new PhoneticsEngine(storage.load(), items);
storage.save(engine.state);

function fitSymbol() {
  const stage = dom.currentChar.querySelector(".phonetic-symbol-stage");
  const maxWidth = Math.max(1, stage.clientWidth - 44);
  const maxHeight = Math.max(1, stage.clientHeight - 86);
  let lower = 12;
  let upper = dom.currentChar.dataset.contentKind === "placeholder" ? 96 : 160;
  for (let step = 0; step < 12; step++) {
    const size = (lower + upper) / 2;
    dom.alphabetSymbol.style.fontSize = `${size}px`;
    const rect = dom.alphabetSymbol.getBoundingClientRect();
    if (rect.width <= maxWidth && rect.height <= maxHeight) lower = size;
    else upper = size;
  }
  dom.alphabetSymbol.style.fontSize = `${Math.floor(lower)}px`;
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
    button.setAttribute("aria-label", `临时复习字母 ${item.symbol}`);
    container.append(button);
  }
}

let renderedSpeechItemId = null;
function render() {
  const item = engine.currentWord();
  const stats = engine.stats();
  const allMastered = stats.mastered === items.length;
  const active = Boolean(item) && engine.state.dailyTaskStarted && !engine.state.dailyTaskDone && engine.state.dailyPhase !== PHASE.IDLE;
  if ((active ? item.id : null) !== renderedSpeechItemId) {
    cancelPhoneticSpeech();
    renderedSpeechItemId = active ? item.id : null;
  }
  dom.currentChar.disabled = !active;
  dom.currentChar.setAttribute("aria-label", active ? `字母 ${item.symbol}，点击朗读` : "开始");
  dom.speakCurrent.classList.toggle("hidden", !active);
  dom.speakCurrent.disabled = !active;
  const ready = engine.canFinishNewLearning();
  const phases = { [PHASE.IDLE]: "等待开始", [PHASE.SCREENING]: "筛选今日新字母",
    [PHASE.NEW_LEARNING]: "今日新字母学习", [PHASE.REVIEW]: "复习字母" };
  const progress = engine.progress();
  dom.phaseLabel.textContent = allMastered ? "全部已掌握" : phases[engine.state.dailyPhase] || "等待开始";
  dom.taskProgress.textContent = engine.state.inlineReviewContext ? "临时复习 · 完成后返回原任务"
    : engine.state.dailyPhase === PHASE.SCREENING ? `已选 ${engine.state.dailyNewIds.length}/3`
    : engine.state.dailyPhase === PHASE.NEW_LEARNING ? `完成 ${progress.newDone}/${progress.newTotal} · 每项认识 1 次`
    : engine.state.dailyPhase === PHASE.REVIEW ? `普通 ${progress.reviewDone}/${progress.reviewTotal} · 错字母 ${progress.wrongDone}/${progress.wrongTotal}` : "";
  dom.currentChar.dataset.contentKind = active ? "character" : "placeholder";
  dom.alphabetSymbol.textContent = active ? item.symbol : allMastered ? "已掌握" : engine.state.dailyTaskDone ? "完成" : ready ? "学完了" : "开始";
  dom.alphabetSymbol.classList.toggle("phonetic-state-label", !active);
  dom.categoryLabel.textContent = active ? "大写 · 小写" : "";
  dom.categoryLabel.classList.toggle("hidden", !active);
  dom.idleMessage.textContent = allMastered ? allMasteredMessage : active ? "" : engine.state.dailyTaskDone ? "本次任务已完成"
    : ready ? "本轮已学完，请点击“学习完毕”。" : "选择今日新字母或复习字母";
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
  dom.startDaily.disabled = !allMastered && learning && engine.state.dailyPhase !== PHASE.REVIEW;
  dom.startReview.disabled = !allMastered && learning && engine.state.dailyPhase === PHASE.REVIEW;
  dom.finishNewWords.classList.toggle("hidden", !ready || allMastered);
  dom.feedback.hidden = !dom.feedback.textContent;
  for (const field of ["known", "mastered", "wrong", "due"]) dom[`${field}Count`].textContent = stats[field];
  dom.progressCount.textContent = `${stats.touched}/${stats.total}`;
  dom.starCount.textContent = engine.state.stars;
  renderList(dom.todayNewList, engine.state.dailyNewIds, "today-new", "尚未选择");
  renderList(dom.reviewWrongList, engine.state.reviewWrongIds, "review-wrong", "暂无错字母");
  fitSymbol();
}

function act(callback) {
  const result = callback();
  dom.feedback.textContent = (result?.message || "").replaceAll("今日新字", "今日新字母").replaceAll("汉字", "字母").replaceAll("这个字", "这个字母").replaceAll("音标", "字母");
  storage.save(engine.state); render();
  return result;
}
function startRound(mode, options) {
  if (engine.stats().mastered === items.length) {
    return { type: "all-mastered", message: `${allMasteredMessage}如需重新学习，可使用“重置字母状态”。` };
  }
  return mode === "review" ? engine.startReview() : engine.startDaily(options);
}
const actions = {
  startDaily: () => startRound("daily"), nextBatch: () => startRound("daily", { resetCursor: true }),
  startReview: () => startRound("review"), correct: () => engine.correct(), wrong: () => engine.wrong(),
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
dom.resetAlphabet.addEventListener("click", async () => {
  if (!await confirmStudyDialog("只重置字母学习进度，其他模块不受影响。确定重置吗？", { title: "重置字母", confirmLabel: "确定重置", danger: true })) return;
  engine = new PhoneticsEngine(storage.reset(), items);
  dom.feedback.textContent = "已重置字母学习状态。";
  render();
});
async function playCurrentLetter() {
  const item = engine.currentWord();
  if (!item || dom.currentChar.disabled) return;
  const result = await speakPhoneticExample({ examples: [item.upper] });
  if (result.reason === "superseded") return;
  dom.feedback.textContent = result.ok ? `正在朗读字母 ${item.upper}` : "发音当前不可用，可继续学习。";
  dom.feedback.hidden = false;
}
dom.currentChar.addEventListener("click", playCurrentLetter);
dom.speakCurrent.addEventListener("click", playCurrentLetter);
window.addEventListener("resize", fitSymbol);
document.fonts?.ready.then(fitSymbol);
window.__ALPHABET_APP__ = {
  getState: () => structuredClone(engine.state), getCurrentItem: () => structuredClone(engine.currentWord()),
  getItems: () => structuredClone(items), getStorageKey: () => storage.key,
  dispatch(name) { if (!actions[name]) throw new Error(`Unknown action: ${name}`); return act(actions[name]); },
};
render();
