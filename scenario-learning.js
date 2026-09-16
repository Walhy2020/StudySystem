import { SCENARIOS, scenarioById, scenarioLineById } from "./data/scenarios.js?v=1.4";
import { initializeScenarioWords } from "./src/scenario-workshop.js?v=1.8";
import { createDialoguePlayback } from "./src/scenario-playback.js?v=1.1";

export { SCENARIOS };
export const SCENARIO_STORAGE_KEY = "mario-scenario-learning-v1";
export const SCENARIO_SCHEMA_VERSION = 3;

const normalizeStage = (value) => ["learn", "practice", "words"].includes(value) ? value : "learn";

function safeParse(value) {
  try { return JSON.parse(value); } catch { return null; }
}

function validScenarioId(id) {
  return Boolean(scenarioById(id));
}

export function createScenarioState(source = {}) {
  const completedScenarioIds = [...new Set(Array.isArray(source.completedScenarioIds) ? source.completedScenarioIds : [])].filter(validScenarioId);
  const activeScenarioId = validScenarioId(source.activeScenarioId) ? source.activeScenarioId : SCENARIOS[0].id;
  const rawProgress = source.scenarioProgress && typeof source.scenarioProgress === "object" ? source.scenarioProgress : {};
  const scenarioProgress = Object.fromEntries(SCENARIOS.map((scenario) => {
    const candidate = rawProgress[scenario.id] && typeof rawProgress[scenario.id] === "object" ? rawProgress[scenario.id] : {};
    const stage = normalizeStage(candidate.stage);
    return [scenario.id, {
      lineIndex: Math.max(0, Math.min(Number(candidate.lineIndex) || 0, scenario.lines.length - 1)),
      stage,
      questionIndex: stage === "practice" ? Math.max(0, Math.min(Number(candidate.questionIndex) || 0, scenario.practice.length - 1)) : 0,
    }];
  }));
  const activeScenario = scenarioById(activeScenarioId);
  const activeSource = {
    ...scenarioProgress[activeScenarioId],
    lineIndex: source.lineIndex ?? scenarioProgress[activeScenarioId].lineIndex,
    stage: source.stage ?? scenarioProgress[activeScenarioId].stage,
    questionIndex: source.questionIndex ?? scenarioProgress[activeScenarioId].questionIndex,
  };
  const activeStage = normalizeStage(activeSource.stage);
  scenarioProgress[activeScenarioId] = {
    lineIndex: Math.max(0, Math.min(Number(activeSource.lineIndex) || 0, activeScenario.lines.length - 1)),
    stage: activeStage,
    questionIndex: activeStage === "practice" ? Math.max(0, Math.min(Number(activeSource.questionIndex) || 0, activeScenario.practice.length - 1)) : 0,
  };
  const activeProgress = scenarioProgress[activeScenarioId];
  return {
    version: SCENARIO_SCHEMA_VERSION,
    completedScenarioIds,
    learnedWords: [...new Set((Array.isArray(source.learnedWords) ? source.learnedWords : []).filter((word) => typeof word === "string" && /^[a-z]+(?:'[a-z]+)*$/i.test(word)).map((word) => word.toLowerCase()))],
    activeScenarioId,
    scenarioProgress,
    lineIndex: activeProgress.lineIndex,
    stage: activeProgress.stage,
    questionIndex: activeProgress.questionIndex,
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
    const activeScenarioId = validScenarioId(values.activeScenarioId)
      ? values.activeScenarioId
      : this.state.activeScenarioId;
    const saved = this.state.scenarioProgress?.[activeScenarioId]
      || { lineIndex: 0, stage: "learn", questionIndex: 0 };
    const switching = activeScenarioId !== this.state.activeScenarioId;
    this.state = createScenarioState({
      ...this.state,
      ...values,
      activeScenarioId,
      lineIndex: values.lineIndex ?? (switching ? saved.lineIndex : this.state.lineIndex),
      stage: values.stage ?? (switching ? saved.stage : this.state.stage),
      questionIndex: values.questionIndex ?? (switching ? saved.questionIndex : this.state.questionIndex),
    });
    return this.save();
  }

  progress(scenarioId) {
    return this.state.scenarioProgress?.[scenarioId]
      || { lineIndex: 0, stage: "learn", questionIndex: 0 };
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

export function renderAlignedSentence(container, line) {
  container.replaceChildren();
  container.setAttribute("aria-label", line.text);
  for (const token of line.tokens || []) {
    const word = document.createElement("span");
    word.className = "aligned-word";
    const english = document.createElement("strong");
    english.textContent = token.text;
    const phonetic = document.createElement("small");
    phonetic.textContent = token.phonetic;
    word.append(english, phonetic);
    container.append(word);
  }
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
  let continuousMode = false;
  const playback = createDialoguePlayback({
    count: () => scenario.lines.length,
    show(index, phase) { currentLineIndex = index; playbackPhase = phase; renderDialogue(); },
    speak: (index, onEnd, onError) => speaker.speak(scenario.lines[index].text, { onEnd, onError }),
    cancelSpeech: () => speaker.cancel(),
    arrivalMs: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 650,
    status(value) {
      dom.pauseDialogue.hidden = !["playing", "paused"].includes(value);
      dom.pauseDialogue.textContent = value === "paused" ? "继续" : "暂停";
      dom.pauseDialogue.setAttribute("aria-pressed", String(value === "paused"));
      dom.playbackStatus.textContent = { playing: continuousMode ? "正在连播" : "正在朗读当前句", paused: "已暂停，继续时重读当前句", "line-complete": currentLineIndex + 1 < scenario.lines.length ? "点击 Next 播放下一句" : "本句播放完毕", complete: "对话播放完毕", unavailable: "语音未能完成，可点击声音按钮重试或用 Next 继续" }[value] || "";
      if (value !== "playing") {
        dom.actorStage.classList.remove("is-speaking");
        dom.currentBubble.classList.remove("is-arriving");
      }
    },
  });
  function stopPlayback() { playback.stop(); playbackPhase = "manual"; dom.pauseDialogue.hidden = true; dom.pauseDialogue.setAttribute("aria-pressed", "false"); dom.actorStage.classList.remove("is-speaking"); dom.scenarioObjectFocus.classList.remove("is-breathing"); dom.currentBubble.classList.remove("is-arriving"); dom.playbackStatus.textContent = ""; }
  function playLine(index, continuous = false) {
    stopPlayback();
    continuousMode = continuous;
    playback.play(index, { continuous });
  }

  function syncPicker() {
    document.querySelectorAll(".scenario-card[data-scenario-id]").forEach((card) => {
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
    renderAlignedSentence(dom.dialogueAligned, line);
    dom.dialogueChinese.textContent = line.chinese;
    dom.actorMia.classList.add("is-present");
    dom.actorLeo.classList.toggle("is-present", currentLineIndex >= 1);
    dom.actorMia.setAttribute("aria-hidden", "false");
    dom.actorLeo.setAttribute("aria-hidden", String(currentLineIndex < 1));
    dom.actorStage.dataset.speaker = line.speaker;
    dom.actorStage.dataset.scenarioId = scenario.id;
    const focusObject = line.focusObject && scenario.focusObjects?.[line.focusObject];
    dom.scenarioObjectFocus.hidden = !focusObject;
    if (!focusObject || playbackPhase !== "finished") dom.scenarioObjectFocus.classList.remove("is-breathing");
    if (focusObject) {
      dom.scenarioObjectImage.src = focusObject.image;
      dom.scenarioObjectImage.alt = focusObject.label;
      dom.scenarioObjectFocus.setAttribute("aria-label", `重点物品：${focusObject.label}`);
      if (playbackPhase === "speaking") {
        void dom.scenarioObjectFocus.offsetWidth;
        dom.scenarioObjectFocus.classList.add("is-breathing");
      }
    } else {
      dom.scenarioObjectImage.removeAttribute("src");
      dom.scenarioObjectImage.alt = "";
      dom.scenarioObjectFocus.removeAttribute("aria-label");
    }
    dom.actorStage.classList.toggle("is-speaking", playbackPhase === "speaking");
    dom.currentBubble.dataset.speaker = line.speaker;
    dom.currentBubble.classList.toggle("is-arriving", playbackPhase === "arriving");
    dom.speakDialogue.setAttribute("aria-label", `朗读：${line.text}`);
    dom.previousLine.disabled = currentLineIndex === 0;
    dom.nextLine.disabled = currentLineIndex === scenario.lines.length - 1;
    store.patch({ activeScenarioId: scenario.id, lineIndex: currentLineIndex, stage: "learn" });
  }

  function renderPractice() {
    if (practice.complete) return finishPractice();
    const question = practice.question();
    const countingArt = scenario.id === "counting-pens" && scenario.focusObjects?.[question.prompt.focusObject];
    dom.countingPracticeImage.hidden = !countingArt;
    if (countingArt) {
      dom.countingPracticeImage.src = countingArt.image;
      dom.countingPracticeImage.alt = countingArt.label;
    } else {
      dom.countingPracticeImage.removeAttribute("src");
      dom.countingPracticeImage.alt = "";
    }
    dom.practiceProgress.textContent = `${practice.questionIndex + 1}/${scenario.practice.length}`;
    dom.practiceSpeaker.textContent = question.prompt.speaker;
    dom.practicePrompt.textContent = question.prompt.text;
    dom.practicePhonetic.textContent = question.prompt.phonetic;
    renderAlignedSentence(dom.practiceAligned, question.prompt);
    dom.speakPractice.setAttribute("aria-label", `朗读问题：${question.prompt.text}`);
    dom.practiceFeedback.textContent = "选择最合适的回应。";
    dom.practiceFeedback.className = "practice-feedback";
    dom.responseOptions.replaceChildren();
    for (const line of question.options) {
      const button = document.createElement("button");
      button.className = "response-option";
      button.type = "button";
      button.dataset.answerId = line.id;
      const aligned = document.createElement("div");
      aligned.className = "aligned-sentence";
      renderAlignedSentence(aligned, line);
      const chinese = document.createElement("small");
      chinese.textContent = line.chinese;
      button.append(aligned, chinese);
      button.addEventListener("click", () => answerPractice(button));
      dom.responseOptions.append(button);
    }
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
    dom.practiceResultTitle.textContent = scenario.completionTitle || `${scenario.chineseTitle}完成！`;
    dom.practiceResultScore.textContent = `${scenario.practice.length}/${scenario.practice.length}`;
    dom.practiceResultText.textContent = scenario.completionText || `你已经完成“${scenario.chineseTitle}”情景练习。`;
    syncPicker();
  }

  function setStage(nextStage, restore = false) {
    stopPlayback();
    clearTimeout(practiceTimer);
    speaker.cancel();
    stage = normalizeStage(nextStage);
    const isPractice = stage === "practice";
    const isWords = stage === "words";
    const isLearn = stage === "learn";
    dom.learnStage.classList.toggle("is-active", isLearn);
    dom.practiceStage.classList.toggle("is-active", isPractice);
    dom.wordsStage.classList.toggle("is-active", isWords);
    dom.learnStage.setAttribute("aria-pressed", String(isLearn));
    dom.practiceStage.setAttribute("aria-pressed", String(isPractice));
    dom.wordsStage.setAttribute("aria-pressed", String(isWords));
    dom.dialoguePanel.hidden = !isLearn;
    dom.practicePanel.hidden = !isPractice;
    dom.scenarioWordsPanel.hidden = !isWords;
    dom.practiceResult.hidden = true;
    if (isPractice) {
      practice.restart();
      if (restore) practice.restore(store.state.questionIndex);
      renderPractice();
    } else if (isWords) {
      store.patch({ activeScenarioId: scenario.id, stage: "words" });
      wordsView.render();
    } else {
      renderDialogue();
    }
  }

  function enterScenario(id, restore = false) {
    scenario = scenarioById(id) || SCENARIOS[0];
    practice = new ScenarioPracticeSession(scenario);
    const saved = store.progress(scenario.id);
    currentLineIndex = restore ? saved.lineIndex : 0;
    const nextStage = restore ? saved.stage : "learn";
    const questionIndex = restore ? saved.questionIndex : 0;
    store.patch({
      activeScenarioId: scenario.id,
      lineIndex: currentLineIndex,
      stage: nextStage,
      questionIndex,
    });
    dom.activeScenarioKicker.textContent = `情景 ${String(scenario.number).padStart(2, "0")}`;
    dom.activeScenarioTitle.textContent = `${scenario.chineseTitle} · ${scenario.englishTitle}`;
    wordsView.render();
    setView(true);
    setStage(nextStage, restore);
  }

  const wordsView = initializeScenarioWords({
    store,
    speaker,
    getScenario: () => scenario,
  });

  document.querySelectorAll(".scenario-card[data-scenario-id]").forEach((card) => card.querySelector("button").addEventListener("click", () => {
    const id = card.dataset.scenarioId;
    enterScenario(id, !store.isComplete(id));
  }));
  dom.backToScenarios.addEventListener("click", () => { stopPlayback(); clearTimeout(practiceTimer); speaker.cancel(); setView(false); syncPicker(); });
  dom.learnStage.addEventListener("click", () => setStage("learn"));
  dom.practiceStage.addEventListener("click", () => setStage("practice"));
  dom.wordsStage.addEventListener("click", () => setStage("words"));
  dom.previousLine.addEventListener("click", () => { if (currentLineIndex > 0) playLine(currentLineIndex - 1); });
  dom.nextLine.addEventListener("click", () => { if (currentLineIndex < scenario.lines.length - 1) playLine(currentLineIndex + 1); });
  dom.speakDialogue.addEventListener("click", () => playLine(currentLineIndex));
  function resetActorEntrance() {
    for (const actor of [dom.actorMia, dom.actorLeo]) {
      actor.style.transition = "none";
      actor.classList.remove("is-present");
    }
    void dom.actorStage.offsetWidth;
    for (const actor of [dom.actorMia, dom.actorLeo]) actor.style.removeProperty("transition");
  }
  dom.pauseDialogue.addEventListener("click", () => {
    if (playback.running) { playback.pause(); return; }
    playback.play(currentLineIndex, { continuous: continuousMode });
  });
  dom.replayDialogue.addEventListener("click", () => {
    stopPlayback(); resetActorEntrance();
    playLine(0);
  });
  dom.continuousDialogue.addEventListener("click", () => {
    stopPlayback(); resetActorEntrance();
    playLine(0, true);
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden && playback.running) playback.pause(); });
  window.addEventListener("pagehide", stopPlayback);
  dom.speakPractice.addEventListener("click", () => speaker.speak(practice.question()?.prompt.text));
  dom.restartPractice.addEventListener("click", () => setStage("practice"));
  dom.returnAfterComplete.addEventListener("click", () => { setView(false); syncPicker(); });

  syncPicker();
  window.__SCENARIO_LEARNING__ = { store, get scenario() { return scenario; }, get practice() { return practice; }, enterScenario, setStage };
}

if (typeof document !== "undefined" && document.querySelector("#scenarioPicker")) initializePage();
