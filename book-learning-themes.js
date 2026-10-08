import { BOOK1_ITEMS, BOOK1_META } from "./data/book1.js";
import { BOOK1_THEMES, book1ThemeById } from "./data/book1-themes.js";
import { Book1Storage, book1StorageOptionsFromLocation } from "./src/book1-storage.js";
import { splitPhonetic, PHONETIC_STRESS_MARKS } from "./src/phonetic-segmenter.js";

const storage = new Book1Storage(localStorage, book1StorageOptionsFromLocation(location));
let state = storage.load();
let theme = null;
let stage = "learn";
let selectedId = "";
let revealed = false;
let questionIndex = 0;
let answered = false;
let mistakes = 0;
let speechTimer = 0;
const ids = ["themePicker", "themeList", "learningView", "backToThemes", "activeThemeLabel", "stageTitle", "learnStage", "reviewStage", "practiceStage", "scenePrompt", "sessionProgress", "pictureGrid", "learnPanel", "wordCard", "completionPanel", "completeTheme", "completionStatus", "practicePanel", "roundProgress", "practiceInstruction", "playInstruction", "nextPractice", "practiceFeedback", "resultPanel", "resultScore", "restartRound", "learnedCount", "migrationNote"];
const dom = Object.fromEntries(ids.map((id) => [id, document.getElementById(id)]));
const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
const learned = (id) => state.learnedIds.includes(id);
const chosen = () => theme?.items.find((item) => item.id === selectedId);
function save() { state = storage.save(state); }

function stopSpeech() { clearTimeout(speechTimer); window.speechSynthesis?.cancel?.(); }
window.addEventListener("studysystem:fullscreen-navigation", stopSpeech);
window.addEventListener("studysystem:audiochange", event => { if (event.detail.muted) stopSpeech(); });
function speak(item) {
  if (!item || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
  stopSpeech();
  speechTimer = window.setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(item.type === "letter" ? item.word.toLowerCase() : item.word);
    utterance.lang = "en-GB"; utterance.rate = .82;
    const voices = window.speechSynthesis.getVoices?.() || [];
    utterance.voice = voices.find((voice) => /^en-GB/i.test(voice.lang) && voice.localService)
      || voices.find((voice) => /^en-GB/i.test(voice.lang)) || voices.find((voice) => /^en/i.test(voice.lang)) || null;
    globalThis.STUDY_AUDIO?.prepareSpeech(utterance);
    window.speechSynthesis.speak(utterance);
  }, 60);
}

function art(item) {
  return item.type === "letter"
    ? `<span class="letter-art" aria-hidden="true"><strong>${esc(item.word)}</strong><span>${esc(item.word.toLowerCase())}</span></span>`
    : `<img src="${esc(item.image)}" alt="" draggable="false" />`;
}
function renderPicker() {
  dom.themeList.innerHTML = BOOK1_THEMES.map((entry) => {
    const count = entry.items.filter((item) => learned(item.id)).length;
    const done = count === entry.items.length;
    const cover = entry.cover ? `<img src="${esc(entry.cover)}" alt="" />` : '<span class="theme-letter-cover" aria-hidden="true">ABC</span>';
    return `<button class="book-theme-card${done ? " is-complete" : ""}" type="button" data-theme="${entry.id}" aria-label="${esc(entry.title)}，已学习 ${count}/${entry.items.length}"><span class="theme-cover">${cover}</span><span class="theme-copy"><strong>${esc(entry.title)}</strong><small>${esc(entry.english)}</small><span>${count}/${entry.items.length} 已学习</span></span>${done ? '<span class="theme-check" aria-label="已学习完毕">✓</span>' : ""}</button>`;
  }).join("");
}
function practiceChoices() {
  const target = theme.items[questionIndex];
  if (!target) return [];
  const others = theme.items.filter((item) => item.id !== target.id);
  const start = questionIndex % Math.max(1, others.length);
  return [target, ...Array.from({ length: Math.min(3, others.length) }, (_, index) => others[(start + index) % others.length])]
    .sort((a, b) => theme.items.indexOf(a) - theme.items.indexOf(b));
}
function renderGrid() {
  const items = stage === "practice" ? practiceChoices() : theme.items;
  dom.pictureGrid.innerHTML = items.map((item) => {
    const active = stage === "practice" ? answered && item.id === theme.items[questionIndex]?.id : item.id === selectedId;
    return `<button class="book-picture-choice${active ? " is-selected" : ""}${learned(item.id) && stage === "learn" ? " is-learned" : ""}" type="button" data-item="${esc(item.id)}" aria-label="${stage === "practice" ? "选择" : "查看"} ${esc(item.word)}" aria-pressed="${active}">${art(item)}</button>`;
  }).join("");
}
function renderCard() {
  const item = chosen();
  if (!item) {
    dom.wordCard.innerHTML = `<span class="book-tap-icon" aria-hidden="true">☝</span><h3>${stage === "review" ? "复习单词" : "点一个目标"}</h3><p>${stage === "review" ? "点击左边图片，先回忆单词，再点击显示。" : "英文、音标和中文会显示在这里。"}</p>`;
    return;
  }
  if (stage === "review" && !revealed) {
    dom.wordCard.innerHTML = '<h3>想一想这个单词</h3><p>先看左边图片，回忆单词，再点击显示核对。</p><button class="primary-action" type="button" data-action="reveal">显示</button>';
    return;
  }
  const index = theme.items.findIndex((entry) => entry.id === item.id);
  const phonemes = splitPhonetic(item.phonetic).map((symbol) => PHONETIC_STRESS_MARKS[symbol]
    ? `<span class="book-phoneme-chip is-stress" aria-label="${esc(PHONETIC_STRESS_MARKS[symbol])}">${esc(symbol)}</span>`
    : `<span class="book-phoneme-chip">${esc(symbol)}</span>`).join("");
  dom.wordCard.innerHTML = `<h3 class="card-word">${esc(item.word)}</h3><button class="card-phonetic" type="button" data-action="phonetic" aria-expanded="false" aria-controls="bookPhonemeBreakdown" aria-label="拆分 ${esc(item.word)} 的音标 ${esc(item.phonetic)}">${esc(item.phonetic)}</button><div class="book-phoneme-breakdown" id="bookPhonemeBreakdown" hidden>${phonemes}</div><span class="card-translation">${esc(item.translation)}</span><div class="book-word-navigation"><button class="book-sound-button" type="button" data-action="speak" aria-label="朗读 ${esc(item.word)}" title="朗读 ${esc(item.word)}">🔊</button><button class="book-nav-button" type="button" data-action="previous" aria-label="Previous word"${index === 0 ? " disabled" : ""}>Previous</button><button class="book-nav-button" type="button" data-action="next" aria-label="Next word"${index === theme.items.length - 1 ? " disabled" : ""}>Next</button></div>`;
}
function render() {
  renderPicker();
  dom.themePicker.hidden = Boolean(theme); dom.learningView.hidden = !theme;
  dom.learnedCount.textContent = state.learnedIds.length;
  dom.migrationNote.hidden = state.migration?.sourceBookId !== "opw1";
  if (!theme) return;
  dom.activeThemeLabel.textContent = `${theme.title} · ${theme.english}`;
  dom.stageTitle.textContent = ({ learn: "第一部分 · 认识单词", review: "第二部分 · 复习单词", practice: "第三部分 · 互动练习" })[stage];
  for (const name of ["learn", "review", "practice"]) {
    dom[`${name}Stage`].classList.toggle("is-active", stage === name);
    dom[`${name}Stage`].setAttribute("aria-pressed", String(stage === name));
  }
  const count = theme.items.filter((item) => learned(item.id)).length;
  dom.sessionProgress.textContent = stage === "practice" ? `${Math.min(questionIndex + 1, theme.items.length)}/${theme.items.length}` : `${count}/${theme.items.length} 已学习`;
  dom.scenePrompt.textContent = stage === "practice" ? "根据右边单词选择图片" : "点击一张图片";
  dom.learnPanel.hidden = stage === "practice";
  dom.practicePanel.hidden = stage !== "practice" || questionIndex >= theme.items.length;
  dom.resultPanel.hidden = stage !== "practice" || questionIndex < theme.items.length;
  dom.completionPanel.hidden = stage !== "learn";
  dom.completionStatus.textContent = count === theme.items.length ? "本组已学习完毕。" : "点击后，本组四个单词会加入总词库。";
  dom.completeTheme.disabled = count === theme.items.length;
  dom.completeTheme.classList.toggle("is-complete", count === theme.items.length);
  dom.completeTheme.textContent = count === theme.items.length ? "✓ 已学习完毕" : "学习完毕";
  renderGrid();
  if (stage !== "practice") renderCard();
  if (stage === "practice" && questionIndex < theme.items.length) {
    dom.roundProgress.textContent = `第 ${questionIndex + 1}/${theme.items.length} 题`;
    dom.practiceInstruction.textContent = `找到 ${theme.items[questionIndex].word} 的图片`;
    dom.nextPractice.hidden = !answered;
    dom.practiceFeedback.textContent = answered ? "找对了！可以进入下一题。" : (mistakes ? "再试一次。" : "");
  }
  if (stage === "practice" && questionIndex >= theme.items.length) dom.resultScore.textContent = `${theme.items.length}/${theme.items.length} 题完成`;
}
function openTheme(id) { stopSpeech(); theme = book1ThemeById(id); stage = "learn"; selectedId = ""; revealed = false; render(); }
function setStage(next) { stopSpeech(); stage = next; selectedId = ""; revealed = false; if (next === "practice") { questionIndex = 0; answered = false; mistakes = 0; } render(); }

dom.themeList.addEventListener("click", (event) => { const button = event.target.closest("[data-theme]"); if (button) openTheme(button.dataset.theme); });
dom.backToThemes.addEventListener("click", () => { stopSpeech(); theme = null; render(); });
for (const name of ["learn", "review", "practice"]) dom[`${name}Stage`].addEventListener("click", () => setStage(name));
dom.pictureGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-item]");
  const item = theme?.items.find((entry) => entry.id === button?.dataset.item);
  if (!item) return;
  stopSpeech();
  if (stage === "practice") {
    if (answered) return;
    if (item.id !== theme.items[questionIndex].id) { mistakes += 1; render(); return; }
    answered = true; render(); return;
  }
  selectedId = item.id; revealed = stage === "learn"; render();
});
dom.wordCard.addEventListener("click", (event) => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  const item = chosen();
  if (!item || !action) return;
  if (action === "reveal") { revealed = true; renderCard(); }
  else if (action === "speak") speak(item);
  else if (action === "phonetic") {
    const button = dom.wordCard.querySelector('[data-action="phonetic"]');
    const breakdown = dom.wordCard.querySelector("#bookPhonemeBreakdown");
    const expanded = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(expanded));
    breakdown.hidden = !expanded;
  } else if (action === "previous" || action === "next") {
    const index = theme.items.findIndex((entry) => entry.id === item.id);
    const next = theme.items[index + (action === "previous" ? -1 : 1)];
    if (!next) return;
    stopSpeech(); selectedId = next.id; revealed = stage === "learn"; render();
  }
});
window.addEventListener("keydown", (event) => {
  if (event.key !== " " || event.repeat || !theme || stage === "practice" || (stage === "review" && !revealed)) return;
  if (event.target instanceof Element && event.target.closest("button,a,input,textarea,select,[role='button'],[contenteditable='true']")) return;
  const button = dom.wordCard.querySelector('[data-action="phonetic"]');
  if (!button) return;
  event.preventDefault(); button.click();
});
dom.completeTheme.addEventListener("click", () => {
  for (const item of theme.items) {
    if (learned(item.id)) continue;
    state.learnedIds.push(item.id);
    state.records[item.id] = { correctCount: 1, errorCount: 0, status: "known" };
  }
  save(); render();
});
dom.playInstruction.addEventListener("click", () => speak(theme?.items[questionIndex]));
dom.nextPractice.addEventListener("click", () => { if (!answered) return; questionIndex += 1; answered = false; mistakes = 0; render(); });
dom.restartRound.addEventListener("click", () => setStage("practice"));

render();
window.__BOOK1__ = { get state() { return structuredClone(state); }, get themeId() { return theme?.id || ""; }, themes: BOOK1_THEMES, items: BOOK1_ITEMS, meta: BOOK1_META };
