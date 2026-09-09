import { BOOK1_GROUPS, BOOK1_ITEMS, BOOK1_META, book1ItemById, book1ItemsForGroup } from "./data/book1.js";
import { Book1Storage, book1StorageOptionsFromLocation } from "./src/book1-storage.js";

const storage = new Book1Storage(localStorage, book1StorageOptionsFromLocation(location));
let state = storage.load();
let speechTimer = 0;

const dom = Object.fromEntries([
  "letterList", "learnedCount", "unitLabel", "groupLabel", "previousGroup", "nextGroup",
  "learningCard", "bookPicture", "itemKind", "currentWord", "currentPhonetic", "currentTranslation",
  "masteredMark", "startGroup", "startReview", "speakWord", "markCorrect", "markWrong",
  "markMastered", "bookFeedback", "groupItems", "progressLearned", "progressMastered",
  "progressWrong", "roundProgress", "migrationNote",
].map((id) => [id, document.getElementById(id)]));

function unique(values) { return [...new Set(values)]; }
function currentGroup() { return BOOK1_GROUPS[state.groupIndex]; }
function activeItem() { return book1ItemById(state.activeId); }
function previewItem() { return activeItem() || book1ItemsForGroup(state.groupIndex)[0]; }
function isMastered(id) { return state.masteredIds.includes(id); }
function isWrong(id) { return state.wrongIds.includes(id); }
function isLearned(id) { return state.learnedIds.includes(id); }

function save() { state = storage.save(state); }

function setMessage(message) {
  state.message = message;
  dom.bookFeedback.textContent = message;
}

function updateRecord(item, outcome) {
  const record = state.records[item.id] || { correctCount: 0, errorCount: 0, status: "new" };
  if (outcome === "correct") {
    record.correctCount += 1;
    record.status = "known";
  } else if (outcome === "wrong") {
    record.errorCount += 1;
    record.status = "wrong";
  } else {
    record.correctCount = Math.max(record.correctCount, 1);
    record.status = "mastered";
  }
  state.records[item.id] = record;
  state.learnedIds = unique([...state.learnedIds, item.id]);
}

function advance() {
  const remaining = state.queueIds.filter((id) => !state.doneIds.includes(id) && !isMastered(id));
  if (!remaining.length) {
    state.phase = "idle";
    state.queueIds = [];
    state.doneIds = [];
    state.activeId = "";
    setMessage("本轮学习完成！可以选择下一个字母组或开始复习。");
    return;
  }
  const currentIndex = remaining.indexOf(state.activeId);
  state.activeId = remaining[(currentIndex + 1 + remaining.length) % remaining.length];
}

function startQueue(ids, phase, message) {
  const queueIds = unique(ids).filter((id) => book1ItemById(id) && !isMastered(id));
  state.phase = queueIds.length ? phase : "idle";
  state.queueIds = queueIds;
  state.doneIds = [];
  state.activeId = queueIds[0] || "";
  setMessage(queueIds.length ? message : (phase === "review" ? "还没有需要复习的 Book1 内容。" : "本组内容都已完全认识。"));
  save();
  render();
}

function startGroup() {
  startQueue(book1ItemsForGroup(state.groupIndex).map((item) => item.id), "learn", `开始学习 ${currentGroup().upper}${currentGroup().lower} 组。`);
}

function startReview() {
  const reviewIds = unique([...state.wrongIds, ...state.learnedIds]).filter((id) => !isMastered(id));
  startQueue(reviewIds, "review", `开始复习 ${reviewIds.length} 个已学内容。`);
}

function markCorrect() {
  const item = activeItem();
  if (!item) return;
  updateRecord(item, "correct");
  state.wrongIds = state.wrongIds.filter((id) => id !== item.id);
  state.doneIds = unique([...state.doneIds, item.id]);
  state.score += 1;
  setMessage(`${item.word} 已认识。`);
  advance();
  save();
  render();
}

function markWrong() {
  const item = activeItem();
  if (!item) return;
  updateRecord(item, "wrong");
  state.wrongIds = unique([item.id, ...state.wrongIds]);
  setMessage(`${item.word} 稍后再练一次。`);
  advance();
  save();
  render();
}

function markMastered() {
  const item = activeItem();
  if (!item) return;
  updateRecord(item, "mastered");
  state.masteredIds = unique([...state.masteredIds, item.id]);
  state.wrongIds = state.wrongIds.filter((id) => id !== item.id);
  state.doneIds = unique([...state.doneIds, item.id]);
  state.score += 1;
  setMessage(`${item.word} 已标记为完全认识。`);
  advance();
  save();
  render();
}

function chooseGroup(index, start = false) {
  state.groupIndex = Math.max(0, Math.min(index, BOOK1_GROUPS.length - 1));
  state.phase = "idle";
  state.queueIds = [];
  state.doneIds = [];
  state.activeId = "";
  setMessage(`已选择 ${currentGroup().upper}${currentGroup().lower} 组。`);
  save();
  render();
  if (start) startGroup();
}

function speakCurrent() {
  const item = previewItem();
  if (!item || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
    setMessage("当前浏览器无法朗读，但仍可继续学习。");
    return;
  }
  clearTimeout(speechTimer);
  window.speechSynthesis.cancel();
  speechTimer = window.setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(item.type === "letter" ? item.word.toLowerCase() : item.word);
    utterance.lang = "en-GB";
    utterance.rate = .82;
    const voices = window.speechSynthesis.getVoices?.() || [];
    utterance.voice = voices.find((voice) => /^en-GB/i.test(voice.lang) && voice.localService)
      || voices.find((voice) => /^en-GB/i.test(voice.lang))
      || voices.find((voice) => /^en/i.test(voice.lang))
      || null;
    window.speechSynthesis.speak(utterance);
  }, 60);
}

function renderLetters() {
  dom.letterList.innerHTML = BOOK1_GROUPS.map((group, index) => {
    const ids = book1ItemsForGroup(index).map((item) => item.id);
    const complete = ids.every(isMastered);
    return `<button class="letter-button${index === state.groupIndex ? " is-active" : ""}${complete ? " is-complete" : ""}" type="button" data-group-index="${index}" aria-label="${group.upper}${group.lower} 组${complete ? "，已完全认识" : ""}"><span>${group.upper}${group.lower}</span><small>${group.unitTitle}</small></button>`;
  }).join("");
}

function renderPicture(item) {
  if (item.type === "letter") {
    dom.bookPicture.innerHTML = `<div class="letter-art" aria-label="字母 ${item.word}"><strong>${item.word}</strong><span>${item.word.toLowerCase()}</span></div>`;
  } else {
    dom.bookPicture.innerHTML = `<img src="${item.image}" alt="${item.word} ${item.translation}" draggable="false" />`;
  }
}

function renderCurrent() {
  const item = previewItem();
  renderPicture(item);
  dom.itemKind.textContent = item.type === "letter" ? "LETTER" : `${item.letter} WORD`;
  dom.currentWord.textContent = item.word;
  dom.currentPhonetic.textContent = item.phonetic;
  dom.currentTranslation.textContent = item.translation;
  dom.masteredMark.hidden = !isMastered(item.id);
  const speechLabel = `朗读 ${item.word}`;
  dom.learningCard.setAttribute("aria-label", speechLabel);
  dom.speakWord.setAttribute("aria-label", speechLabel);
  dom.speakWord.title = speechLabel;
}

function renderGroupItems() {
  dom.groupItems.innerHTML = book1ItemsForGroup(state.groupIndex).map((item) => {
    const classes = ["group-chip"];
    if (item.id === state.activeId) classes.push("is-current");
    if (state.doneIds.includes(item.id) || isLearned(item.id)) classes.push("is-done");
    if (isWrong(item.id)) classes.push("is-wrong");
    if (isMastered(item.id)) classes.push("is-mastered");
    return `<button class="${classes.join(" ")}" type="button" data-item-id="${item.id}" aria-label="学习 ${item.word}"><span>${item.word}</span><small>${item.phonetic}</small></button>`;
  }).join("");
}

function render() {
  const group = currentGroup();
  renderLetters();
  renderCurrent();
  renderGroupItems();
  dom.unitLabel.textContent = `${group.unitTitle} · Pages ${group.pages}`;
  dom.groupLabel.textContent = `${group.upper}${group.lower}`;
  dom.previousGroup.disabled = state.groupIndex === 0;
  dom.nextGroup.disabled = state.groupIndex === BOOK1_GROUPS.length - 1;
  const active = Boolean(activeItem());
  [dom.markCorrect, dom.markWrong, dom.markMastered].forEach((button) => { button.disabled = !active; });
  dom.learnedCount.textContent = state.learnedIds.length;
  dom.progressLearned.textContent = state.learnedIds.length;
  dom.progressMastered.textContent = state.masteredIds.length;
  dom.progressWrong.textContent = state.wrongIds.length;
  dom.roundProgress.textContent = active ? `${state.doneIds.length}/${state.queueIds.length}` : "0/0";
  dom.bookFeedback.textContent = state.message || "选择字母组，然后开始学习。";
  dom.migrationNote.hidden = state.migration?.sourceBookId !== "opw1";
}

dom.letterList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-group-index]");
  if (button) chooseGroup(Number(button.dataset.groupIndex));
});
dom.groupItems.addEventListener("click", (event) => {
  const button = event.target.closest("[data-item-id]");
  if (!button) return;
  const item = book1ItemById(button.dataset.itemId);
  if (!item) return;
  const index = BOOK1_GROUPS.findIndex((group) => group.id === item.groupId);
  state.groupIndex = index;
  startQueue(book1ItemsForGroup(index).map((entry) => entry.id), "learn", `开始学习 ${currentGroup().upper}${currentGroup().lower} 组。`);
  if (!isMastered(item.id)) { state.activeId = item.id; save(); render(); }
});
dom.previousGroup.addEventListener("click", () => chooseGroup(state.groupIndex - 1));
dom.nextGroup.addEventListener("click", () => chooseGroup(state.groupIndex + 1));
dom.startGroup.addEventListener("click", startGroup);
dom.startReview.addEventListener("click", startReview);
dom.speakWord.addEventListener("click", speakCurrent);
dom.learningCard.addEventListener("click", speakCurrent);
dom.learningCard.addEventListener("keydown", (event) => {
  if (event.key === " " || event.key === "Enter") { event.preventDefault(); speakCurrent(); }
});
dom.markCorrect.addEventListener("click", markCorrect);
dom.markWrong.addEventListener("click", markWrong);
dom.markMastered.addEventListener("click", markMastered);

render();

window.__BOOK1__ = {
  get state() { return structuredClone(state); },
  groups: BOOK1_GROUPS,
  items: BOOK1_ITEMS,
  meta: BOOK1_META,
  startGroup,
  startReview,
};
