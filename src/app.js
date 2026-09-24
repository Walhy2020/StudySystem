import { HanziEngine } from "./engine.js";
import { APP_VERSION, PHASE, REVIEW_INTERVAL_ROUNDS } from "./constants.js?v=1.17";
import { HanziStorage, storageOptionsFromLocation } from "./storage.js?v=1.1";
import { speakChineseCharacter } from "./tts.js";

const words = Array.isArray(window.MARIO_WORD_BANK) ? window.MARIO_WORD_BANK : [];
const dom = Object.fromEntries([...document.querySelectorAll("[id]")].map((node) => [node.id, node]));
dom.appVersionLabel.textContent = `v${APP_VERSION}`;
let pinyinRevealed = false;
let feedbackText = "";

if (words.length !== 1600 || new Set(words.map((word) => word.id)).size !== 1600) {
  dom.bootError.hidden = false;
  dom.bootError.textContent = `字库校验失败：需要 1600 个唯一 ID，当前读取 ${words.length} 个。`;
  throw new Error(dom.bootError.textContent);
}

const storage = new HanziStorage(localStorage, words, storageOptionsFromLocation(location));
let engine = new HanziEngine(storage.load(), words);

function persist() {
  storage.save(engine.state);
}

function wordById(id) {
  return words.find((word) => word.id === id) || null;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function readings(word) {
  return window.MARIO_PINYIN_READINGS?.getReadings(word, words) || [word.pinyin].filter(Boolean);
}

function cleanPinyin(value) {
  return String(value || "").replace(/[.。．]+$/u, "");
}

function removeTone(value) {
  return cleanPinyin(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ü/g, "u");
}

function initialLength(value) {
  const plain = removeTone(value).toLowerCase();
  return ["zh", "ch", "sh", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "r", "z", "c", "s", "y", "w"]
    .find((initial) => plain.startsWith(initial))?.length || 0;
}

function pinyinParts(word, reading) {
  const marked = cleanPinyin(reading);
  const primary = marked === cleanPinyin(word.pinyin);
  const initial = primary ? word.parts.initial.length : initialLength(marked);
  const medial = primary ? word.parts.medial.length : 0;
  return {
    initial: marked.slice(0, initial),
    medial: marked.slice(initial, initial + medial),
    final: marked.slice(initial + medial),
  };
}

function renderReading(word, reading) {
  const parts = pinyinParts(word, reading);
  return `<span class="pinyin-compact">
    ${parts.initial ? `<span class="pinyin-segment segment-initial">${escapeHtml(parts.initial)}</span>` : ""}
    ${parts.medial ? `<span class="pinyin-segment segment-medial">${escapeHtml(parts.medial)}</span>` : ""}
    <span class="pinyin-segment segment-final">${escapeHtml(parts.final)}</span>
  </span>`;
}

function revealPinyin() {
  const word = engine.currentWord();
  if (!word || pinyinRevealed) return;
  pinyinRevealed = true;
  const all = readings(word);
  const readingItems = all.map((item, index) => `<span class="pinyin-reading-item">${
    index ? '<span class="reading-divider" aria-hidden="true">|</span>' : ""}${renderReading(word, item)}</span>`).join("");
  dom.pinyinLine.innerHTML = `<div class="pinyin-readings" aria-label="拼音 ${escapeHtml(all.join(" | "))}">${readingItems}</div>`;
}

function phaseText() {
  return ({
    [PHASE.IDLE]: "等待开始",
    [PHASE.SCREENING]: "筛选今日新字",
    [PHASE.NEW_LEARNING]: "今日新字学习",
    [PHASE.MIXED_REVIEW]: "今日新字混合复习",
    [PHASE.REVIEW]: "普通复习",
  })[engine.state.dailyPhase] || "等待开始";
}

function progressText() {
  const progress = engine.progress();
  if (engine.state.inlineReviewContext) return "临时复习 · 完成后返回原任务";
  if (engine.state.dailyPhase === PHASE.SCREENING) return `已选 ${engine.state.dailyNewIds.length}/3`;
  if (engine.state.dailyPhase === PHASE.NEW_LEARNING) return `完成 ${progress.newDone}/${progress.newTotal} · 每字需 3 次`;
  if (engine.state.dailyPhase === PHASE.MIXED_REVIEW) return `混合 ${progress.mixedDone}/${progress.newTotal}`;
  if (engine.state.dailyPhase === PHASE.REVIEW) return `普通 ${progress.reviewDone}/${progress.reviewTotal} · 错字 ${progress.wrongDone}/${progress.wrongTotal}`;
  return "";
}

function fitPlaceholderText() {
  if (dom.currentChar.dataset.contentKind !== "placeholder") return;
  const content = dom.currentChar.querySelector(".hanzi-content");
  if (!content) return;
  const buttonStyle = getComputedStyle(dom.currentChar);
  const availableWidth = dom.currentChar.clientWidth - parseFloat(buttonStyle.paddingLeft) - parseFloat(buttonStyle.paddingRight);
  const availableHeight = dom.currentChar.clientHeight - parseFloat(buttonStyle.paddingTop) - parseFloat(buttonStyle.paddingBottom);
  let lower = 12;
  let upper = Math.min(availableHeight, 220);
  for (let step = 0; step < 12; step += 1) {
    const candidate = (lower + upper) / 2;
    content.style.fontSize = `${candidate}px`;
    const bounds = content.getBoundingClientRect();
    if (bounds.width <= availableWidth && bounds.height <= availableHeight) lower = candidate;
    else upper = candidate;
  }
  content.style.fontSize = `${Math.floor(lower)}px`;
}

function setCurrentCharContent(kind, text) {
  dom.currentChar.dataset.contentKind = kind;
  const content = document.createElement("span");
  content.className = "hanzi-content";
  content.textContent = text;
  dom.currentChar.replaceChildren(content);
  dom.currentChar.setAttribute("aria-label", kind === "character" ? "点击显示拼音" : text);
  if (kind === "placeholder") fitPlaceholderText();
}

let placeholderResizeFrame = 0;
window.addEventListener("resize", () => {
  if (dom.currentChar.dataset.contentKind !== "placeholder") return;
  cancelAnimationFrame(placeholderResizeFrame);
  placeholderResizeFrame = requestAnimationFrame(fitPlaceholderText);
});

function renderWord() {
  const word = engine.currentWord();
  const hasActiveWord = Boolean(word) && engine.state.dailyTaskStarted &&
    engine.state.dailyPhase !== PHASE.IDLE && !engine.state.dailyTaskDone;
  [dom.startDaily, dom.startReview].forEach((button) => {
    button.classList.toggle("hidden", hasActiveWord);
  });
  pinyinRevealed = false;
  dom.masteredBadge.classList.add("hidden");
  dom.reviewRoundBadge.classList.add("hidden");
  if (!hasActiveWord) {
    setCurrentCharContent("placeholder", engine.state.dailyTaskDone ? "完成" : "开始");
    dom.currentChar.disabled = true;
    dom.pinyinLine.innerHTML = `<span class="idle-copy">${engine.state.dailyTaskDone ? "本次任务已完成" : "选择今日新字或复习汉字"}</span>`;
    [dom.speakCurrent, dom.markCorrect, dom.markWrong, dom.markMastered].forEach((button) => {
      button.disabled = true;
      button.classList.add("hidden");
    });
    return;
  }
  dom.currentChar.disabled = false;
  setCurrentCharContent("character", word.char);
  dom.pinyinLine.innerHTML = '<span class="idle-copy">点击汉字或按 Space 显示拼音</span>';
  dom.kingdomLabel.textContent = `${String(word.kingdom).padStart(2, "0")} 王国`;
  dom.levelLabel.textContent = `S${String(word.bigSun).padStart(2, "0")} · M${((word.bigMoon - 1) % 5) + 1}`;
  [dom.speakCurrent, dom.markCorrect, dom.markWrong].forEach((button) => {
    button.disabled = false;
    button.classList.remove("hidden");
  });
  dom.markMastered.disabled = engine.isMastered(word.id);
  dom.markMastered.classList.toggle("hidden", engine.isMastered(word.id));
  if (engine.isMastered(word.id)) dom.masteredBadge.classList.remove("hidden");
  const appearance = Math.max(1, Math.min(9, Number(engine.record(word.id).studyAppearanceCount) || 1));
  dom.reviewRoundBadge.textContent = ["", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"][appearance];
  dom.reviewRoundBadge.classList.remove("hidden");
}

function chipClass(id, source) {
  if (engine.isMastered(id)) return "done";
  if (source === "review-wrong") return engine.reviewWrongCount(id) >= 3 ? "done" : "wrong";
  if ((engine.state.dailyNewCorrectCounts[id] || 0) >= 3 || engine.state.dailyMixedDoneIds.includes(id)) return "done";
  if (engine.state.records[id]?.status === "wrong") return "wrong";
  return "pending";
}

function renderList(container, ids, source, emptyText) {
  if (!ids.length) {
    container.innerHTML = `<span class="empty-list">${emptyText}</span>`;
    return;
  }
  container.innerHTML = ids.map((id) => {
    const word = wordById(id);
    const disabled = engine.isMastered(id) ? "disabled" : "";
    const detail = source === "review-wrong" ? `${engine.reviewWrongCount(id)}/3` : `${engine.state.dailyNewCorrectCounts[id] || 0}/3`;
    return `<button class="word-chip ${chipClass(id, source)}" type="button" data-inline-id="${id}" data-inline-source="${source}" ${disabled} aria-label="临时复习 ${escapeHtml(word.char)}，进度 ${detail}">${escapeHtml(word.char)}<small>${detail}</small></button>`;
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
  dom.feedback.textContent = feedbackText;
  renderList(dom.todayNewList, engine.state.dailyNewIds, "today-new", "尚未选择");
  renderList(dom.reviewWrongList, engine.state.reviewWrongIds, "review-wrong", "暂无错字");
  const ready = engine.state.dailyPhase === PHASE.NEW_LEARNING && engine.state.dailyNewIds.length === 3 &&
    engine.state.dailyNewIds.every((id) => engine.isMastered(id) || (engine.state.dailyNewCorrectCounts[id] || 0) >= 3);
  dom.finishNewWords.classList.toggle("hidden", !ready);
  renderWord();
}

function act(callback) {
  const result = callback();
  feedbackText = result?.message || "";
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
dom.currentChar.addEventListener("click", revealPinyin);
dom.speakCurrent.addEventListener("click", () => {
  const word = engine.currentWord();
  feedbackText = word && speakChineseCharacter(word.char) ? "" : "当前没有可朗读的汉字。";
  dom.feedback.textContent = feedbackText;
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-inline-id]");
  if (button) act(() => engine.startInlineReview(button.dataset.inlineId, button.dataset.inlineSource));
});

window.addEventListener("keydown", (event) => {
  const editable = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement ||
    event.target instanceof HTMLSelectElement || event.target?.isContentEditable;
  if (editable || event.code !== "Space" || !engine.currentWord()) return;
  event.preventDefault();
  if (!event.repeat) revealPinyin();
});

dom.resetProgress.addEventListener("click", () => {
  if (!window.confirm("第一次确认：要重置新系统汉字学习状态吗？")) return;
  if (!window.confirm("第二次确认：此操作只重置新系统汉字状态，旧系统 legacy 数据不会被触碰。确定继续吗？")) return;
  engine = new HanziEngine(storage.reset(), words);
  feedbackText = "已重置新系统汉字学习状态。";
  render();
});

dom.importLegacyProgress.addEventListener("click", () => {
  dom.importLegacyProgressFile.value = "";
  dom.importLegacyProgressFile.click();
});

dom.importLegacyProgressFile.addEventListener("change", async () => {
  const file = dom.importLegacyProgressFile.files?.[0];
  if (!file) return;
  try {
    if (file.size > 10 * 1024 * 1024) throw new Error("备份文件超过 10 MB，未导入。");
    const payload = JSON.parse(await file.text());
    const preview = storage.previewLegacyPayload(payload, engine.state);
    if (!preview.ok) throw new Error(preview.reason);
    const summary = `旧备份包含 ${preview.legacyCounts.records} 条记录、${preview.legacyCounts.mastered} 个完全认识、${preview.legacyCounts.stars} 颗星。\n\n导入后新系统将有 ${preview.mergedCounts.records} 条记录、${preview.mergedCounts.mastered} 个完全认识、${preview.mergedCounts.stars} 颗星。\n\n只读合并不会清空当前进度，确定导入吗？`;
    if (!window.confirm(summary)) return;
    const result = storage.importLegacyPayload(payload, engine.state);
    if (!result.ok) throw new Error(result.reason);
    engine = new HanziEngine(result.state, words);
    feedbackText = `旧版进度已合并：${result.mergedCounts.records} 条记录，${result.mergedCounts.mastered} 个完全认识，${result.mergedCounts.stars} 颗星。`;
    render();
  } catch (error) {
    feedbackText = `导入失败：${error instanceof Error ? error.message : "无法读取备份文件。"}`;
    dom.feedback.textContent = feedbackText;
  } finally {
    dom.importLegacyProgressFile.value = "";
  }
});
window.__HANZI_APP__ = {
  getState: () => structuredClone(engine.state),
  getStorageKey: () => storage.key,
  getCurrentWord: () => structuredClone(engine.currentWord()),
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

if (storage.lastLoad.migrated) {
  feedbackText = `已从旧系统只读迁移汉字状态：${storage.lastLoad.counts.records} 条记录。`;
}
render();
