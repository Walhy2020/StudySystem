import { HanziEngine } from "./src/engine.js";
import { APP_VERSION, PHASE } from "./src/constants.js?v=1.0.74";
import { THEME_CONFIGS, speakEnglish } from "./theme-learning.js?v=2.25";
import { buildThemeCatalog, renderArt } from "./src/theme-overview.js?v=1.19";
import { buildWordLearningItems, WordLearningStorage } from "./src/word-learning-model.js?v=1.0";
import { PHONETIC_STRESS_MARKS, splitPhonetic } from "./src/phonetic-segmenter.js?v=1.0";

const items = buildWordLearningItems(buildThemeCatalog(THEME_CONFIGS));
const dom = Object.fromEntries([...document.querySelectorAll("[id]")].map(node => [node.id, node]));
let local;
try { local = window.localStorage; } catch { /* Memory-only fallback, with notice. */ }
const storage = new WordLearningStorage(local, items, { namespace: new URLSearchParams(location.search).get("test") || "" });
let engine = new HanziEngine(storage.load(), items), revealed = false, phoneticExpanded = false;
dom.appVersionLabel.textContent = `v${APP_VERSION}`;

function reveal() {
  const item = engine.currentWord();
  if (!item || !engine.state.dailyTaskStarted || engine.state.dailyTaskDone) return;
  if (revealed) { togglePhonetic(); return; }
  revealed = true;
  dom.currentWord.textContent = item.word;
  dom.currentWord.setAttribute("aria-expanded", "true");
  dom.currentWord.setAttribute("aria-label", `${item.word}，切换音标拆解`);
  dom.wordPhonetic.textContent = item.phonetic;
  dom.wordPhonetic.hidden = false;
  dom.wordPhonetic.setAttribute("aria-label", `拆解 ${item.word} 的音标 ${item.phonetic}`);
  dom.phonemeBreakdown.replaceChildren(...splitPhonetic(item.phonetic).map(symbol => {
    const span = document.createElement("span");
    span.className = "phoneme-chip" + (PHONETIC_STRESS_MARKS[symbol] ? " phoneme-stress" : "");
    span.textContent = symbol;
    if (PHONETIC_STRESS_MARKS[symbol]) span.setAttribute("aria-label", PHONETIC_STRESS_MARKS[symbol]);
    return span;
  }));
}
function togglePhonetic() {
  if (!revealed) return;
  phoneticExpanded = !phoneticExpanded;
  dom.wordPhonetic.setAttribute("aria-expanded", String(phoneticExpanded));
  dom.phonemeBreakdown.hidden = !phoneticExpanded;
}
function renderList(container, ids, source, empty) {
  container.replaceChildren();
  if (!ids.length) { const span = document.createElement("span"); span.className = "empty-list"; span.textContent = empty; container.append(span); }
  for (const id of ids) {
    const item = engine.wordMap.get(id);
    const count = source === "review-wrong" ? engine.reviewWrongCount(id) : engine.state.dailyNewCorrectCounts[id] || 0;
    const done = engine.isMastered(id) || count >= 3 || source === "today-new" && engine.state.dailyMixedDoneIds.includes(id);
    const button = document.createElement("button");
    button.type = "button"; button.className = `word-chip ${done ? "done" : source === "review-wrong" ? "wrong" : "pending"}`;
    button.textContent = item.word; button.dataset.inlineId = id; button.dataset.inlineSource = source;
    const detail = document.createElement("small"); detail.textContent = `${count}/3`; button.append(detail);
    button.disabled = engine.isMastered(id); container.append(button);
  }
}
function render() {
  const state = engine.state, item = engine.currentWord();
  const active = Boolean(item) && state.dailyTaskStarted && !state.dailyTaskDone && state.dailyPhase !== PHASE.IDLE;
  const progress = engine.progress(), stats = engine.stats();
  dom.phaseLabel.textContent = ({ idle: "等待开始", screening: "筛选今日新单词", newLearning: "今日新单词学习", mixedReview: "今日新单词混合复习", review: "普通复习" })[state.dailyPhase];
  dom.taskProgress.textContent = state.inlineReviewContext ? "临时复习 · 完成后返回原任务"
    : state.dailyPhase === PHASE.SCREENING ? `已选 ${state.dailyNewIds.length}/3`
    : state.dailyPhase === PHASE.NEW_LEARNING ? `完成 ${progress.newDone}/${progress.newTotal} · 每词需 3 次`
    : state.dailyPhase === PHASE.MIXED_REVIEW ? `混合 ${progress.mixedDone}/${progress.newTotal}`
    : state.dailyPhase === PHASE.REVIEW ? `普通 ${progress.reviewDone}/${progress.reviewTotal} · 错词 ${progress.wrongDone}/${progress.wrongTotal}` : "";
  revealed = false; phoneticExpanded = false;
  dom.wordPhonetic.textContent = ""; dom.wordPhonetic.hidden = true;
  dom.wordPhonetic.setAttribute("aria-expanded", "false");
  dom.wordPhonetic.setAttribute("aria-label", "拆解音标");
  dom.phonemeBreakdown.replaceChildren(); dom.phonemeBreakdown.hidden = true;
  dom.currentWord.textContent = active ? "显示" : state.dailyTaskDone ? "完成" : "开始";
  dom.currentWord.setAttribute("aria-label", "显示单词和音标");
  dom.currentWord.disabled = !active; dom.currentWord.setAttribute("aria-expanded", "false");
  dom.wordPicture.replaceChildren();
  if (active) {
    dom.wordPicture.innerHTML = renderArt(item, "vocabulary-art");
    dom.wordPicture.querySelectorAll(".ordinal-word-art span,.song-word-art strong").forEach(node => node.remove());
  } else { const span = document.createElement("span"); span.className = "empty-list"; span.textContent = state.dailyTaskDone ? "本次任务已完成" : "开始学习后显示配图"; dom.wordPicture.append(span); }
  dom.reviewRoundBadge.classList.toggle("hidden", !active);
  dom.reviewRoundBadge.textContent = active ? ["", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"][Math.max(1, Math.min(9, engine.record(item.id).studyAppearanceCount))] : "";
  for (const name of ["speakCurrent", "markCorrect", "markWrong", "markMastered"]) { dom[name].classList.toggle("hidden", !active); dom[name].disabled = !active; }
  for (const name of ["startDaily", "startReview"]) dom[name].classList.toggle("hidden", active);
  const ready = state.dailyPhase === PHASE.NEW_LEARNING && state.dailyNewIds.length === 3 && state.dailyNewIds.every(id => engine.isMastered(id) || state.dailyNewCorrectCounts[id] >= 3);
  dom.finishNewWords.classList.toggle("hidden", !ready);
  for (const name of ["known", "mastered", "wrong", "due"]) dom[`${name}Count`].textContent = stats[name];
  dom.progressCount.textContent = `${stats.touched}/${stats.total}`; dom.starCount.textContent = state.stars;
  renderList(dom.todayNewList, state.dailyNewIds, "today-new", "尚未选择");
  renderList(dom.reviewWrongList, state.reviewWrongIds, "review-wrong", "暂无错词");
  dom.saveNotice.hidden = !storage.saveFailed;
}
function act(callback) {
  engine.setDate(storage.date);
  const result = callback();
  dom.feedback.textContent = (result?.message || "").replaceAll("汉字", "单词").replaceAll("新字", "新单词").replaceAll("错字", "错词").replaceAll("这个字", "这个单词").replaceAll("复习字", "复习单词").replaceAll("旧字", "旧单词");
  storage.save(engine.state); render(); return result;
}
const actions = { startDaily: () => engine.startDaily(), startReview: () => engine.startReview(),
  correct: () => engine.correct(), wrong: () => engine.wrong(), master: () => engine.master(),
  finishNew: () => engine.finishNewLearning(), nextBatch: () => engine.startDaily({ resetCursor: true }),
  inline: (id, source) => engine.startInlineReview(id, source) };
for (const [id, action] of Object.entries({ startDaily: "startDaily", startReview: "startReview", markCorrect: "correct", markWrong: "wrong", markMastered: "master", finishNewWords: "finishNew", nextBatch: "nextBatch" })) dom[id].addEventListener("click", () => act(actions[action]));
dom.currentWord.addEventListener("click", reveal);
dom.wordPhonetic.addEventListener("click", togglePhonetic);
dom.speakCurrent.addEventListener("click", () => { const item = engine.currentWord(); if (item) speakEnglish(item.word); });
document.addEventListener("click", event => {
  const button = event.target.closest("[data-inline-id]");
  if (button && !button.disabled) act(() => actions.inline(button.dataset.inlineId, button.dataset.inlineSource));
});
window.addEventListener("keydown", event => {
  if (event.code !== "Space" || event.repeat || event.target.closest?.("a,button,input,select,textarea,[contenteditable],[role=button],[role=link],[tabindex]")) return;
  if (!engine.currentWord()) return;
  event.preventDefault(); reveal();
});
dom.resetWords.addEventListener("click", () => {
  if (!confirm("第一次确认：重置单词学习状态吗？") || !confirm("第二次确认：只重置单词，不影响汉字、Book1、主题、情景及总复习。确定继续吗？")) return;
  engine = new HanziEngine(storage.reset(), items); dom.feedback.textContent = "已重置单词状态。"; render();
});
window.addEventListener("studysystem:fullscreen-navigation", () => window.speechSynthesis?.cancel());
window.__WORD_LEARNING__ = { getState: () => structuredClone(engine.state), getItems: () => structuredClone(items),
  getCurrentWord: () => structuredClone(engine.currentWord()), getStorageKey: () => storage.key,
  dispatch(name, ...args) { if (!actions[name]) throw Error(`Unknown action: ${name}`); return act(() => actions[name](...args)); } };
storage.save(engine.state); render();
