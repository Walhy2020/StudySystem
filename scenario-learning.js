import { SCENARIOS, scenarioById, scenarioLineById } from "./data/scenarios.js?v=1.0";
import { initializeScenarioWorkshop } from "./src/scenario-workshop.js?v=1.1";
import { createDialoguePlayback } from "./src/scenario-playback.js?v=1.0";

export { SCENARIOS };
export const SCENARIO_STORAGE_KEY = "mario-scenario-learning-v1";
export const SCENARIO_SCHEMA_VERSION = 1;

function safeParse(value) {
  try { return JSON.parse(value); } catch { return null; }
}

function validScenarioId(id) {
  return Boolean(scenarioById(id));
}

export function createScenarioState(source = {}) {
  const completedScenarioIds = [...new Set(Array.isArray(source.completedScenarioIds) ? source.completedScenarioIds : [])].filter(validScenarioId);
  const activeScenarioId = validScenarioId(source.activeScenarioId) ? source.activeScenarioId : SCENARIOS[0].id;
  const scenario = scenarioById(activeScenarioId);
  const stage = source.stage === "practice" ? "practice" : "learn";
  return {
    version: SCENARIO_SCHEMA_VERSION,
    completedScenarioIds,
    learnedWords: [...new Set((Array.isArray(source.learnedWords) ? source.learnedWords : []).filter((word) => typeof word === "string" && /^[a-z]+(?:'[a-z]+)*$/i.test(word)).map((word) => word.toLowerCase()))],
    activeScenarioId,
    lineIndex: Math.max(0, Math.min(Number(source.lineIndex) || 0, scenario.lines.length - 1)),
    stage,
    questionIndex: stage === "practice" ? Math.max(0, Math.min(Number(source.questionIndex) || 0, scenario.practice.length - 1)) : 0,
  };
}

export class ScenarioStore {
  constructor(storage, key = SCENARIO_STORAGE_KEY) {
    this.storage = storage;
    this.key = key;
    this.state = createScenarioState(safeParse(this.storage?.getItem?.(key)) || {});
    this.save();
  }

  save() {
    this.state = createScenarioState(this.state);
    this.storage?.setItem?.(this.key, JSON.stringify(this.state));
    return this.state;
  }

  patch(values) {
    this.state = createScenarioState({ ...this.state, ...values });
    return this.save();
  }

  complete(scenarioId) {
    if (!validScenarioId(scenarioId)) return false;
    if (this.state.completedScenarioIds.includes(scenarioId)) return false;
    this.state.completedScenarioIds.push(scenarioId);
    this.save();
    return true;
  }

  isComplete(scenarioId) {
    return this.state.completedScenarioIds.includes(scenarioId);
  }
}

export class ScenarioPracticeSession {
  constructor(scenario) {
    this.scenario = scenario;
    this.questionIndex = 0;
    this.correctCount = 0;
    this.complete = scenario.practice.length === 0;
  }

  restore(questionIndex = 0) {
    this.questionIndex = Math.max(0, Math.min(Number(questionIndex) || 0, this.scenario.practice.length - 1));
    this.correctCount = this.questionIndex;
    this.complete = false;
    return this;
  }

  question() {
    if (this.complete) return null;
    const item = this.scenario.practice[this.questionIndex];
    return {
      ...item,
      prompt: scenarioLineById(this.scenario, item.promptId),
      answer: scenarioLineById(this.scenario, item.answerId),
      options: item.optionIds.map((id) => scenarioLineById(this.scenario, id)),
    };
  }

  answer(lineId) {
    const question = this.question();
    if (!question) return { status: "complete" };
    if (lineId !== question.answerId) return { status: "wrong", question };
    this.correctCount += 1;
    this.questionIndex += 1;
    if (this.questionIndex >= this.scenario.practice.length) this.complete = true;
    return { status: this.complete ? "complete" : "correct", question };
  }

  restart() {
    this.questionIndex = 0;
    this.correctCount = 0;
    this.complete = this.scenario.practice.length === 0;
  }
}

export function createScenarioSpeaker({ synthesis, Utterance, delay = 60 } = {}) {
  let timer = null;
  let generation = 0;
  let watchdog = null;
  return {
    speak(text, { onEnd, onError } = {}) {
      if (!synthesis || !Utterance || !text) return false;
      const current = ++generation;
      clearTimeout(watchdog);
      if (timer) clearTimeout(timer);
      try { synthesis.cancel(); } catch { return false; }
      timer = setTimeout(() => {
        timer = null;
        try {
          const utterance = new Utterance(text);
          utterance.lang = "en-GB";
          const voices = synthesis.getVoices?.() || [];
          utterance.voice = voices.find((voice) => voice.lang === "en-GB") || voices.find((voice) => /^en[-_]/i.test(voice.lang)) || null;
          let settled = false;
          const settle = (callback) => {
            if (current !== generation || settled) return;
            settled = true; clearTimeout(watchdog); callback?.();
          };
          utterance.onend = () => settle(onEnd);
          utterance.onerror = () => settle(onError);
          if (onError) watchdog = setTimeout(() => settle(onError), 45000);
          synthesis.speak(utterance);
        } catch { clearTimeout(watchdog); if (current === generation) onError?.(); }
      }, delay);
      return true;
    },
    cancel() {
      generation += 1; clearTimeout(watchdog);
      if (timer) clearTimeout(timer);
      timer = null;
      try { synthesis?.cancel?.(); } catch {}
    },
  };
}

export function scenarioStorageKeyFromLocation(location) {
  const namespace = new URLSearchParams(location?.search || "").get("test");
  if (!namespace) return SCENARIO_STORAGE_KEY;
  const safe = namespace.replace(/[^a-z0-9_-]/gi, "").slice(0, 48) || "browser";
  return `${SCENARIO_STORAGE_KEY}:test:${safe}`;
}

function initializePage() {
  const dom = Object.fromEntries([...document.querySelectorAll("[id]")].map((node) => [node.id, node]));
  const store = new ScenarioStore(window.localStorage, scenarioStorageKeyFromLocation(window.location));
  const speaker = createScenarioSpeaker({ synthesis: window.speechSynthesis, Utterance: window.SpeechSynthesisUtterance });
  let scenario = scenarioById(store.state.activeScenarioId) || SCENARIOS[0];
  let practice = new ScenarioPracticeSession(scenario);
  let currentLineIndex = store.state.lineIndex;
  let stage = store.state.stage;
  let practiceTimer = null;
  let playbackPhase = "manual";
  const playback = createDialoguePlayback({
    count: () => scenario.lines.length,
    show(index, phase) { currentLineIndex = index; playbackPhase = phase; renderDialogue(); },
    speak: (index, onEnd, onError) => speaker.speak(scenario.lines[index].text, { onEnd, onError }),
    cancelSpeech: () => speaker.cancel(),
    arrivalMs: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 650,
    status(value) {
      dom.playDialogue.textContent = value === "playing" ? "暂停" : value === "paused" ? "继续播放" : "播放对话";
      dom.playDialogue.setAttribute("aria-pressed", String(value === "playing"));
      dom.playbackStatus.textContent = { playing: "正在播放", paused: "已暂停，继续时重读当前句", complete: "对话播放完毕", unavailable: "语音未能完成，可点击声音按钮重试或用 Next 继续" }[value] || "";
      if (value !== "playing") {
        dom.actorStage.classList.remove("is-speaking");
        dom.currentBubble.classList.remove("is-arriving");
      }
    },
  });
  function stopPlayback() { playback.stop(); playbackPhase = "manual"; dom.playDialogue.textContent = "播放对话"; dom.playDialogue.setAttribute("aria-pressed", "false"); dom.actorStage.classList.remove("is-speaking"); dom.playbackStatus.textContent = ""; }

  function syncPicker() {
    document.querySelectorAll("[data-scenario-id]").forEach((card) => {
      const complete = store.isComplete(card.dataset.scenarioId);
      card.classList.toggle("is-complete", complete);
      card.querySelector("[data-complete-badge]").hidden = !complete;
      card.querySelector("[data-start-label]").textContent = complete ? "再次学习" : "开始情景";
    });
  }

  function setView(isLearning) {
    dom.scenarioPicker.hidden = isLearning;
    dom.scenarioLearningView.hidden = !isLearning;
  }

  function renderDialogue() {
    const line = scenario.lines[currentLineIndex];
    dom.dialogueProgress.textContent = `${currentLineIndex + 1}/${scenario.lines.length}`;
    dom.dialogueSpeaker.textContent = line.speaker;
    dom.dialogueEnglish.textContent = line.text;
    dom.dialoguePhonetic.textContent = line.phonetic;
    dom.dialogueChinese.textContent = line.chinese;
    dom.actorMia.classList.add("is-present");
    dom.actorLeo.classList.toggle("is-present", currentLineIndex >= 1);
    dom.actorMia.setAttribute("aria-hidden", "false");
    dom.actorLeo.setAttribute("aria-hidden", String(currentLineIndex < 1));
    dom.actorStage.dataset.speaker = line.speaker;
    dom.actorStage.classList.toggle("is-speaking", playbackPhase === "speaking");
    dom.currentBubble.dataset.speaker = line.speaker;
    dom.currentBubble.classList.toggle("is-arriving", playbackPhase === "arriving");
    dom.speakDialogue.setAttribute("aria-label", `朗读：${line.text}`);
    dom.previousLine.disabled = currentLineIndex === 0;
    dom.nextLine.disabled = currentLineIndex === scenario.lines.length - 1;
    document.querySelectorAll(".dialogue-line-button").forEach((button, index) => {
      button.classList.toggle("is-active", index === currentLineIndex);
      button.setAttribute("aria-current", index === currentLineIndex ? "true" : "false");
      button.hidden = index >= currentLineIndex;
    });
    store.patch({ activeScenarioId: scenario.id, lineIndex: currentLineIndex, stage: "learn" });
    const workspace = dom.currentBubble.closest(".dialogue-workspace");
    requestAnimationFrame(() => { workspace.scrollTop = workspace.scrollHeight; });
  }

  function renderLineList() {
    dom.dialogueLineList.innerHTML = scenario.lines.map((line, index) => `
      <button class="dialogue-line-button" type="button" data-line-index="${index}">
        <span>${line.speaker}</span><strong>${line.text}</strong><small>${line.phonetic}</small>
      </button>`).join("");
    dom.dialogueLineList.querySelectorAll("[data-line-index]").forEach((button) => {
      button.addEventListener("click", () => {
        stopPlayback(); currentLineIndex = Number(button.dataset.lineIndex);
        renderDialogue();
      });
    });
  }

  function renderPractice() {
    if (practice.complete) return finishPractice();
    const question = practice.question();
    dom.practiceProgress.textContent = `${practice.questionIndex + 1}/${scenario.practice.length}`;
    dom.practiceSpeaker.textContent = question.prompt.speaker;
    dom.practicePrompt.textContent = question.prompt.text;
    dom.practicePhonetic.textContent = question.prompt.phonetic;
    dom.speakPractice.setAttribute("aria-label", `朗读问题：${question.prompt.text}`);
    dom.practiceFeedback.textContent = "选择最合适的回应。";
    dom.practiceFeedback.className = "practice-feedback";
    dom.responseOptions.innerHTML = question.options.map((line) => `
      <button class="response-option" type="button" data-answer-id="${line.id}">
        <strong>${line.text}</strong><span>${line.phonetic}</span><small>${line.chinese}</small>
      </button>`).join("");
    dom.responseOptions.querySelectorAll("[data-answer-id]").forEach((button) => button.addEventListener("click", () => answerPractice(button)));
    store.patch({ activeScenarioId: scenario.id, stage: "practice", questionIndex: practice.questionIndex });
  }

  function answerPractice(button) {
    const result = practice.answer(button.dataset.answerId);
    if (result.status === "wrong") {
      button.classList.add("is-wrong");
      dom.practiceFeedback.textContent = "再想一想，这句回应还不合适。";
      dom.practiceFeedback.className = "practice-feedback is-wrong";
      return;
    }
    dom.responseOptions.querySelectorAll("button").forEach((option) => { option.disabled = true; });
    button.classList.add("is-correct");
    dom.practiceFeedback.textContent = "回答正确！";
    dom.practiceFeedback.className = "practice-feedback is-correct";

    if (result.status === "complete") {
      practiceTimer = setTimeout(finishPractice, 280);
    } else {
      store.patch({ stage: "practice", questionIndex: practice.questionIndex });
      practiceTimer = setTimeout(renderPractice, 280);
    }
  }

  function finishPractice() {
    store.complete(scenario.id);
    dom.practicePanel.hidden = true;
    dom.practiceResult.hidden = false;
    dom.practiceResultScore.textContent = `${scenario.practice.length}/${scenario.practice.length}`;
    syncPicker();
  }

  function setStage(nextStage, restore = false) {
    stopPlayback();
    clearTimeout(practiceTimer);
    speaker.cancel();
    stage = nextStage;
    const isPractice = stage === "practice";
    dom.learnStage.classList.toggle("is-active", !isPractice);
    dom.practiceStage.classList.toggle("is-active", isPractice);
    dom.learnStage.setAttribute("aria-pressed", String(!isPractice));
    dom.practiceStage.setAttribute("aria-pressed", String(isPractice));
    dom.dialoguePanel.hidden = isPractice;
    dom.practicePanel.hidden = !isPractice;
    dom.practiceResult.hidden = true;
    if (isPractice) {
      practice.restart();
      if (restore) practice.restore(store.state.questionIndex);
      renderPractice();
    } else {
      renderDialogue();
    }
  }

  function enterScenario(id, restore = false) {
    scenario = scenarioById(id) || SCENARIOS[0];
    practice = new ScenarioPracticeSession(scenario);
    currentLineIndex = restore ? store.state.lineIndex : 0;
    dom.activeScenarioKicker.textContent = `情景 ${String(scenario.number).padStart(2, "0")}`;
    dom.activeScenarioTitle.textContent = `${scenario.chineseTitle} · ${scenario.englishTitle}`;
    renderLineList();
    setView(true);
    setStage(restore ? store.state.stage : "learn", restore);
  }

  document.querySelectorAll("[data-scenario-id]").forEach((card) => card.querySelector("button").addEventListener("click", () => {
    const id = card.dataset.scenarioId;
    enterScenario(id, !store.isComplete(id));
  }));
  dom.backToScenarios.addEventListener("click", () => { stopPlayback(); clearTimeout(practiceTimer); speaker.cancel(); setView(false); syncPicker(); });
  dom.learnStage.addEventListener("click", () => setStage("learn"));
  dom.practiceStage.addEventListener("click", () => setStage("practice"));
  dom.previousLine.addEventListener("click", () => { stopPlayback(); if (currentLineIndex > 0) { currentLineIndex -= 1; renderDialogue(); } });
  dom.nextLine.addEventListener("click", () => { stopPlayback(); if (currentLineIndex < scenario.lines.length - 1) { currentLineIndex += 1; renderDialogue(); } });
  dom.speakDialogue.addEventListener("click", () => { stopPlayback(); renderDialogue(); speaker.speak(scenario.lines[currentLineIndex].text); });
  function resetActorEntrance() {
    for (const actor of [dom.actorMia, dom.actorLeo]) {
      actor.style.transition = "none";
      actor.classList.remove("is-present");
    }
    void dom.actorStage.offsetWidth;
    for (const actor of [dom.actorMia, dom.actorLeo]) actor.style.removeProperty("transition");
  }
  dom.playDialogue.addEventListener("click", () => {
    if (playback.running) { playback.pause(); return; }
    if (currentLineIndex === 0) resetActorEntrance();
    playback.play(currentLineIndex);
  });
  dom.replayDialogue.addEventListener("click", () => {
    stopPlayback(); resetActorEntrance();
    playback.play(0);
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden && playback.running) playback.pause(); });
  window.addEventListener("pagehide", stopPlayback);
  dom.speakPractice.addEventListener("click", () => speaker.speak(practice.question()?.prompt.text));
  dom.restartPractice.addEventListener("click", () => setStage("practice"));
  dom.returnAfterComplete.addEventListener("click", () => { setView(false); syncPicker(); });

  syncPicker();
  initializeScenarioWorkshop({ store, speaker, scenarios: SCENARIOS, onOpen() { stopPlayback(); clearTimeout(practiceTimer); speaker.cancel(); setView(false); syncPicker(); } });
  window.__SCENARIO_LEARNING__ = { store, get scenario() { return scenario; }, get practice() { return practice; }, enterScenario, setStage };
}

if (typeof document !== "undefined" && document.querySelector("#scenarioPicker")) initializePage();
