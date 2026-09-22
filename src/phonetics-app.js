import { PhoneticsEngine } from "./phonetics-engine.js?v=1.2";
import { APP_VERSION, PHASE } from "./constants.js?v=1.10";
import { PhoneticsStorage } from "./phonetics-storage.js?v=1.1";
import { cancelPhoneticSpeech, speakPhoneticExample } from "./phonetics-tts.js?v=1.2";
import { displaySymbol, exampleEntries } from "./phonetics-display.js?v=1.0";

export const PHONETICS_STORAGE_KEY = "mario-phonetics-v1";

const items = Array.isArray(window.MARIO_PHONETICS) ? window.MARIO_PHONETICS : [];
const exampleTranscriptions = window.MARIO_PHONETIC_EXAMPLE_TRANSCRIPTIONS || {};
const dom = Object.fromEntries([...document.querySelectorAll("[id]")].map((node) => [node.id, node]));
dom.appVersionLabel.textContent = `v${APP_VERSION}`;

const validData = items.length === 48 &&
  new Set(items.map((item) => item.id)).size === 48 &&
  new Set(items.map((item) => item.symbol)).size === 48 &&
  items.every((item) => item.id && item.symbol && item.title && item.letters?.length === 1 && item.examples?.length === 3 &&
    item.examples.every((word) => /^\/.+\/$/.test(exampleTranscriptions[word] || "")));
if (!validData) {
  dom.bootError.hidden = false;
  dom.bootError.textContent = `音标数据校验失败：需要 48 个唯一 ID 和符号，当前读取 ${items.length} 个。`;
  throw new Error(dom.bootError.textContent);
}

function storageOptions() {
  const namespace = new URLSearchParams(location.search).get("test");
  if (!namespace) return { key: PHONETICS_STORAGE_KEY, allowLegacyMigration: false };
  const safe = namespace.replace(/[^a-z0-9_-]/gi, "").slice(0, 48) || "browser";
  return { key: `${PHONETICS_STORAGE_KEY}:test:${safe}`, allowLegacyMigration: false };
}

const storage = new PhoneticsStorage(localStorage, items, storageOptions());
let engine = new PhoneticsEngine(storage.load(), items);
let renderedSpeechItemId = null;

function persist() {
  storage.save(engine.state);
}

if (engine.reviewPolicyMigrated) persist();

function itemById(id) {
  return items.find((item) => item.id === id) || null;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function renderDetails(item) {
  const category = `${item.title.replace(/^DJ\s*/, "")} · ${item.letters[0]}`;
  const examples = exampleEntries(item, exampleTranscriptions);
  const spokenExamples = examples.map(({ word, transcription }) => `${word} ${transcription}`).join("，");
  dom.pinyinLine.innerHTML = `<div class="phonetic-details" aria-label="音标 ${escapeHtml(displaySymbol(item.symbol))}，${escapeHtml(category)}，示例词 ${escapeHtml(spokenExamples)}">
    <span class="phonetic-examples">${examples.map(({ word, transcription }) =>
      `<span class="phonetic-example"><span class="phonetic-example-word">${escapeHtml(word)}</span><span class="phonetic-transcription">${escapeHtml(transcription)}</span></span>`).join("")}</span>
  </div>`;
}

async function playCurrentExample() {
  const item = engine.currentWord();
  if (!item) return false;
  const targetSymbol = displaySymbol(item.symbol);
  dom.feedback.textContent = `准备朗读 ${targetSymbol} 的示例词 ${item.examples[0]}`;
  const result = await speakPhoneticExample(item);
  if (result.reason === "superseded") return false;
  dom.feedback.textContent = result.ok
    ? `正在朗读 ${targetSymbol} 的示例词 ${result.example}`
    : "发音当前不可用，可继续学习。";
  return result.ok;
}

function phaseText() {
  return ({
    [PHASE.IDLE]: "等待开始",
    [PHASE.SCREENING]: "筛选今日新音标",
    [PHASE.NEW_LEARNING]: "今日新音标学习",
    [PHASE.MIXED_REVIEW]: "今日新音标混合复习",
    [PHASE.REVIEW]: "普通复习",
  })[engine.state.dailyPhase] || "等待开始";
}

function progressText() {
  const progress = engine.progress();
  if (engine.state.inlineReviewContext) return "临时复习 · 完成后返回原任务";
  if (engine.state.dailyPhase === PHASE.SCREENING) return `已选 ${engine.state.dailyNewIds.length}/3`;
  if (engine.state.dailyPhase === PHASE.NEW_LEARNING) return `完成 ${progress.newDone}/${progress.newTotal} · 每个认识 1 次`;
  if (engine.state.dailyPhase === PHASE.MIXED_REVIEW) return `混合 ${progress.mixedDone}/${progress.newTotal}`;
  if (engine.state.dailyPhase === PHASE.REVIEW) {
    return `普通 ${progress.reviewDone}/${progress.reviewTotal} · 错音标 ${progress.wrongDone}/${progress.wrongTotal}`;
  }
  return "";
}

function fitPlaceholderText() {
  if (dom.currentChar.dataset.contentKind !== "placeholder") return;
  const content = dom.currentChar.querySelector(".hanzi-content");
  const stage = dom.currentChar.querySelector(".phonetic-symbol-stage");
  if (!content || !stage) return;
  const safeInset = Math.max(14, Math.min(22, stage.clientWidth * 0.08));
  const availableWidth = Math.max(1, stage.clientWidth - safeInset * 2);
  const availableHeight = Math.max(1, stage.clientHeight - safeInset * 2);
  let lower = 12;
  let upper = Math.min(availableHeight, 96);
  for (let step = 0; step < 12; step += 1) {
    const candidate = (lower + upper) / 2;
    content.style.fontSize = `${candidate}px`;
    const bounds = content.getBoundingClientRect();
    if (bounds.width <= availableWidth && bounds.height <= availableHeight) lower = candidate;
    else upper = candidate;
  }
  content.style.fontSize = `${Math.floor(lower)}px`;
}

function setCardContent(kind, text, ariaLabel = text, categoryText = "") {
  dom.currentChar.dataset.contentKind = kind;
  const category = dom.currentChar.querySelector(".phonetic-card-category");
  const content = dom.currentChar.querySelector(".hanzi-content");
  category.textContent = categoryText;
  category.classList.toggle("hidden", kind !== "character");
  content.classList.toggle("phonetic-state-label", kind === "placeholder");
  content.style.fontSize = "";
  content.textContent = text;
  dom.currentChar.setAttribute("aria-label", ariaLabel);
  if (kind === "placeholder") fitPlaceholderText();
}

let placeholderResizeFrame = 0;
window.addEventListener("resize", () => {
  if (dom.currentChar.dataset.contentKind !== "placeholder") return;
  cancelAnimationFrame(placeholderResizeFrame);
  placeholderResizeFrame = requestAnimationFrame(fitPlaceholderText);
});

function renderItem() {
  const item = engine.currentWord();
  const active = Boolean(item) && engine.state.dailyTaskStarted &&
    engine.state.dailyPhase !== PHASE.IDLE && !engine.state.dailyTaskDone;
  const nextSpeechItemId = active ? item.id : null;
  if (nextSpeechItemId !== renderedSpeechItemId) {
    cancelPhoneticSpeech();
    renderedSpeechItemId = nextSpeechItemId;
  }
  const learning = engine.state.dailyTaskStarted && !engine.state.dailyTaskDone;
  // Entry choices belong to idle/completed screens, not the active learning controls.
  [dom.startDaily, dom.startReview].forEach(button => button.classList.toggle("hidden", active));
  dom.startDaily.disabled = learning && engine.state.dailyPhase !== PHASE.REVIEW;
  dom.startReview.disabled = learning && engine.state.dailyPhase === PHASE.REVIEW;
  dom.masteredBadge.classList.add("hidden");
  dom.reviewRoundBadge.classList.add("hidden");
  if (!active) {
    const ready = engine.canFinishNewLearning();
    setCardContent("placeholder", engine.state.dailyTaskDone ? "完成" : ready ? "学完了" : "开始");
    dom.currentChar.disabled = true;
    dom.pinyinLine.innerHTML = `<span class="idle-copy">${engine.state.dailyTaskDone ? "本次任务已完成" : ready ? "本轮已学完，请点击“学习完毕”。" : "选择今日新音标或复习音标"}</span>`;
    [dom.speakCurrent, dom.markCorrect, dom.markWrong, dom.markMastered].forEach((button) => {
      button.disabled = true;
      button.classList.add("hidden");
    });
    return;
  }
  dom.currentChar.disabled = false;
  const targetSymbol = displaySymbol(item.symbol);
  const category = `${item.title.replace(/^DJ\s*/, "")} · ${item.letters[0]}`;
  const speechLabel = `朗读 ${targetSymbol} 的示例词 ${item.examples[0]}`;
  setCardContent("character", targetSymbol, `${category}，音标 ${targetSymbol}，点击或按空格${speechLabel}`, category);
  dom.speakCurrent.setAttribute("aria-label", speechLabel);
  dom.speakCurrent.title = speechLabel;
  renderDetails(item);
  dom.kingdomLabel.textContent = item.title;
  dom.levelLabel.textContent = item.letters[0];
  [dom.speakCurrent, dom.markCorrect, dom.markWrong].forEach((button) => {
    button.disabled = false;
    button.classList.remove("hidden");
  });
  dom.markMastered.disabled = engine.isMastered(item.id);
  dom.markMastered.classList.toggle("hidden", engine.isMastered(item.id));
  if (engine.isMastered(item.id)) dom.masteredBadge.classList.remove("hidden");
  const appearance = Math.max(1, Math.min(9, Number(engine.record(item.id).studyAppearanceCount) || 1));
  dom.reviewRoundBadge.textContent = ["", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"][appearance];
  dom.reviewRoundBadge.classList.remove("hidden");
}

function chipClass(id, source) {
  if (engine.isMastered(id)) return "done";
  if (source === "review-wrong") return engine.reviewWrongCount(id) >= 3 ? "done" : "wrong";
  if ((engine.state.dailyNewCorrectCounts[id] || 0) >= 1 || engine.state.dailyMixedDoneIds.includes(id)) return "done";
  if (engine.state.records[id]?.status === "wrong") return "wrong";
  return "pending";
}

function renderList(container, ids, source, emptyText) {
  if (!ids.length) {
    container.innerHTML = `<span class="empty-list">${emptyText}</span>`;
    return;
  }
  container.innerHTML = ids.map((id) => {
    const item = itemById(id);
    const disabled = engine.isMastered(id) ? "disabled" : "";
    const detail = source === "review-wrong" ? `${engine.reviewWrongCount(id)}/3` : `${Math.min(1, engine.state.dailyNewCorrectCounts[id] || 0)}/1`;
    const targetSymbol = displaySymbol(item.symbol);
    return `<button class="word-chip ${chipClass(id, source)}" type="button" data-inline-id="${id}" data-inline-source="${source}" ${disabled} aria-label="临时复习音标 ${escapeHtml(targetSymbol)}，进度 ${detail}">${escapeHtml(targetSymbol)}</button>`;
  }).join("");
}

function render() {
  const stats = engine.stats();
  dom.knownCount.textContent = stats.known;
  dom.masteredCount.textContent = stats.mastered;
  dom.wrongCount.textContent = stats.wrong;
  dom.dueCount.textContent = stats.due;
  dom.progressCount.textContent = `${stats.touched}/${stats.total}`;
  dom.starCount.textContent = engine.state.stars;
  dom.phaseLabel.textContent = phaseText();
  dom.taskProgress.textContent = progressText();
  renderList(dom.todayNewList, engine.state.dailyNewIds, "today-new", "尚未选择");
  renderList(dom.reviewWrongList, engine.state.reviewWrongIds, "review-wrong", "暂无错音标");
  const ready = engine.canFinishNewLearning();
  dom.finishNewWords.classList.toggle("hidden", !ready);
  renderItem();
}

function act(callback) {
  const result = callback();
  dom.feedback.textContent = result?.message?.replaceAll("汉字", "音标").replaceAll("字", "音标") || "";
  persist();
  render();
  return result;
}

dom.startDaily.addEventListener("click", () => act(() => engine.startDaily()));
dom.nextBatch.addEventListener("click", () => act(() => engine.startDaily({ resetCursor: true })));
dom.startReview.addEventListener("click", () => act(() => engine.startReview()));
dom.markCorrect.addEventListener("click", () => act(() => engine.correct()));
dom.markWrong.addEventListener("click", () => act(() => engine.wrong()));
dom.markMastered.addEventListener("click", () => act(() => engine.master()));
dom.finishNewWords.addEventListener("click", () => act(() => engine.finishNewLearning()));
dom.currentChar.addEventListener("click", playCurrentExample);
dom.speakCurrent.addEventListener("click", playCurrentExample);

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-inline-id]");
  if (button) act(() => engine.startInlineReview(button.dataset.inlineId, button.dataset.inlineSource));
});

window.addEventListener("keydown", (event) => {
  const editable = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement ||
    event.target instanceof HTMLSelectElement || event.target?.isContentEditable;
  if (editable || event.code !== "Space" || event.target !== dom.currentChar || !engine.currentWord()) return;
  event.preventDefault();
  if (!event.repeat) playCurrentExample();
});

dom.resetPhonetics.addEventListener("click", () => {
  if (!window.confirm("第一次确认：要重置音标学习状态吗？")) return;
  if (!window.confirm("第二次确认：此操作只重置音标状态，不影响汉字、主题或炸弹迷宫。确定继续吗？")) return;
  engine = new PhoneticsEngine(storage.reset(), items);
  dom.feedback.textContent = "已重置音标学习状态。";
  render();
});

window.__PHONETICS_APP__ = {
  getState: () => structuredClone(engine.state),
  getStorageKey: () => storage.key,
  getCurrentItem: () => structuredClone(engine.currentWord()),
  getItems: () => structuredClone(items),
  dispatch(name, ...args) {
    const actions = {
      startDaily: () => engine.startDaily(...args), startReview: () => engine.startReview(...args),
      correct: () => engine.correct(...args), wrong: () => engine.wrong(...args), master: () => engine.master(...args),
      finishNew: () => engine.finishNewLearning(...args), inline: () => engine.startInlineReview(...args),
    };
    if (!actions[name]) throw new Error(`Unknown action: ${name}`);
    return act(actions[name]);
  },
};

render();
