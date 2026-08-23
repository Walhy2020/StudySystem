export const THEME_WORDS = Object.freeze([
  { id: "head", word: "head", phonetic: "/hed/", chinese: "头", sentence: "This is Mario's head." },
  { id: "hand", word: "hand", phonetic: "/hænd/", chinese: "手", sentence: "This is Mario's hand." },
  { id: "arm", word: "arm", phonetic: "/ɑːm/", chinese: "手臂", sentence: "This is Mario's arm." },
  { id: "leg", word: "leg", phonetic: "/leɡ/", chinese: "腿", sentence: "This is Mario's leg." },
  { id: "foot", word: "foot", phonetic: "/fʊt/", chinese: "脚", sentence: "This is Mario's foot." },
  { id: "body", word: "body", phonetic: "/ˈbɒdi/", chinese: "身体", sentence: "This is Mario's body." }
]);

export const COLOR_WORDS = Object.freeze([
  { id: "red", word: "red", phonetic: "/red/", chinese: "红色", object: "cap", objectChinese: "帽子", sentence: "The cap is red.", instruction: "Touch the red cap.", ariaLabel: "red cap 红色帽子" },
  { id: "blue", word: "blue", phonetic: "/bluː/", chinese: "蓝色", object: "block", objectChinese: "方块", sentence: "The block is blue.", instruction: "Touch the blue block.", ariaLabel: "blue block 蓝色方块" },
  { id: "green", word: "green", phonetic: "/ɡriːn/", chinese: "绿色", object: "pipe", objectChinese: "水管", sentence: "The pipe is green.", instruction: "Touch the green pipe.", ariaLabel: "green pipe 绿色水管" },
  { id: "yellow", word: "yellow", phonetic: "/ˈjeləʊ/", chinese: "黄色", object: "coin", objectChinese: "金币", sentence: "The coin is yellow.", instruction: "Touch the yellow coin.", ariaLabel: "yellow coin 黄色金币" },
  { id: "black", word: "black", phonetic: "/blæk/", chinese: "黑色", object: "bomb", objectChinese: "炸弹", sentence: "The bomb is black.", instruction: "Touch the black bomb.", ariaLabel: "black bomb 黑色炸弹" },
  { id: "white", word: "white", phonetic: "/waɪt/", chinese: "白色", object: "cloud", objectChinese: "云朵", sentence: "The cloud is white.", instruction: "Touch the white cloud.", ariaLabel: "white cloud 白色云朵" }
]);

export const THEME_CONFIGS = Object.freeze({
  body: Object.freeze({
    id: "body", chineseTitle: "身体", englishTitle: "Body", words: THEME_WORDS,
    sceneId: "bodyScene", sceneLabel: "马里奥身体部位互动图",
    learnPrompt: "点击马里奥的身体部位", practicePrompt: "听指令，点击正确部位",
    learnPlaceholderTitle: "点一个身体部位", learnPlaceholderText: "英文、音标、中文和例句会显示在这里。",
    retryLabel: (word) => word.chinese + "（" + word.word + "）",
    instruction: (word) => "Touch Mario's " + word.id + ".",
    completePrompt: "完成！六个部位全部找对", completeTitle: "六个部位全部找对！",
    completeText: "你完成了身体 Body 的听音点击练习。"
  }),
  colors: Object.freeze({
    id: "colors", chineseTitle: "颜色", englishTitle: "Colors", words: COLOR_WORDS,
    sceneId: "colorsScene", sceneLabel: "马里奥风格颜色物体互动图",
    learnPrompt: "点击场景中的彩色物体", practicePrompt: "听指令，点击正确的彩色物体",
    learnPlaceholderTitle: "点一个彩色物体", learnPlaceholderText: "颜色、音标、中文和例句会显示在这里。",
    retryLabel: (word) => word.ariaLabel,
    instruction: (word) => word.instruction,
    completePrompt: "完成！六种颜色全部找对", completeTitle: "六种颜色全部找对！",
    completeText: "你完成了颜色 Colors 的听音点击练习。"
  })
});

export function shuffledIds(words = THEME_WORDS, random = Math.random) {
  if (typeof words === "function") {
    random = words;
    words = THEME_WORDS;
  }
  const ids = words.map((item) => item.id);
  for (let index = ids.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [ids[index], ids[other]] = [ids[other], ids[index]];
  }
  return ids;
}

export class ThemeSession {
  constructor(words, random = Math.random) {
    this.words = words;
    this.random = random;
    this.seen = new Set();
    this.startRound();
  }
  word(id) { return this.words.find((item) => item.id === id) || null; }
  learn(id) {
    const word = this.word(id);
    if (!word) throw new Error("Unknown theme target: " + id);
    this.seen.add(id);
    return word;
  }
  startRound() {
    this.questions = shuffledIds(this.words, this.random);
    this.questionIndex = 0;
    this.correctCount = 0;
    this.complete = false;
  }
  target() { return this.complete ? null : this.word(this.questions[this.questionIndex]); }
  answer(id) {
    if (this.complete) return { status: "complete", complete: true };
    const target = this.target();
    if (id !== target.id) return { status: "wrong", complete: false, target };
    this.correctCount += 1;
    this.questionIndex += 1;
    this.complete = this.questionIndex === this.questions.length;
    return { status: "correct", complete: this.complete, target, next: this.target() };
  }
}

export class BodyThemeSession extends ThemeSession {
  constructor(random = Math.random) { super(THEME_WORDS, random); }
}

export function speakEnglish(text, synthesis = globalThis.speechSynthesis, Utterance = globalThis.SpeechSynthesisUtterance) {
  try {
    if (!synthesis || typeof synthesis.speak !== "function" || typeof Utterance !== "function") return false;
    if (typeof synthesis.cancel === "function") synthesis.cancel();
    const utterance = new Utterance(text);
    utterance.lang = "en-GB";
    utterance.rate = 0.86;
    synthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

function initializePage() {
  const dom = Object.fromEntries([...document.querySelectorAll("[id]")].map((node) => [node.id, node]));
  const scenes = [...document.querySelectorAll(".theme-scene")];
  let activeThemeId = null;
  let session = null;
  let stage = "learn";
  let feedbackTimer = 0;
  let advanceTimer = 0;

  const activeConfig = () => THEME_CONFIGS[activeThemeId];
  const activeTargets = () => activeThemeId
    ? [...document.querySelectorAll('[data-theme="' + activeThemeId + '"] .scene-target')]
    : [];

  function speak(text) {
    const ok = speakEnglish(text);
    if (!ok) dom.ttsNotice.hidden = false;
    return ok;
  }
  function clearTargetStates() {
    document.querySelectorAll(".scene-target").forEach((target) => {
      target.classList.remove("is-selected", "is-correct", "is-wrong", "is-hint");
      target.setAttribute("aria-pressed", "false");
    });
  }
  function renderWord(word) {
    dom.wordCard.className = "word-detail";
    dom.wordCard.innerHTML = '<h3 class="word-en">' + word.word + '</h3><span class="phonetic">' + word.phonetic + '</span><span class="translation">' + word.chinese + '</span><p class="sentence">' + word.sentence + '</p><button class="repeat-button" id="repeatWord" type="button">🔊 再听一次</button>';
    dom.wordCard.querySelector("#repeatWord").addEventListener("click", () => speak(word.word + ". " + word.sentence));
  }
  function renderLearnPlaceholder(config) {
    dom.wordCard.className = "word-card-placeholder";
    dom.wordCard.innerHTML = '<span class="tap-icon" aria-hidden="true">☝</span><h3>' + config.learnPlaceholderTitle + '</h3><p>' + config.learnPlaceholderText + '</p>';
  }
  function renderQuestion() {
    const config = activeConfig();
    const target = session.target();
    dom.roundProgress.textContent = "第 " + (session.questionIndex + 1) + "/6 题";
    dom.practiceInstruction.textContent = config.instruction(target);
    dom.practiceFeedback.className = "practice-feedback";
    dom.practiceFeedback.textContent = config.practicePrompt + "。";
    dom.sessionProgress.textContent = "练习 " + session.correctCount + "/6";
  }
  function speakInstruction() {
    const target = session?.target();
    if (target) speak(activeConfig().instruction(target));
  }
  function finishRound() {
    const config = activeConfig();
    dom.practicePanel.hidden = true;
    dom.resultPanel.hidden = false;
    dom.resultTitle.textContent = config.completeTitle;
    dom.resultText.textContent = config.completeText;
    dom.resultScore.textContent = session.correctCount + "/6";
    dom.sessionProgress.textContent = "练习 6/6";
    dom.scenePrompt.textContent = config.completePrompt;
  }
  function setStage(next) {
    if (!session) return;
    stage = next;
    clearTimeout(feedbackTimer);
    clearTimeout(advanceTimer);
    clearTargetStates();
    const practice = next === "practice";
    const config = activeConfig();
    dom.learnPanel.hidden = practice;
    dom.practicePanel.hidden = !practice;
    dom.resultPanel.hidden = true;
    dom.learnStage.classList.toggle("is-active", !practice);
    dom.practiceStage.classList.toggle("is-active", practice);
    dom.learnStage.setAttribute("aria-pressed", String(!practice));
    dom.practiceStage.setAttribute("aria-pressed", String(practice));
    dom.stageTitle.textContent = practice ? "第二部分 · 互动练习" : "第一部分 · 认识单词";
    dom.scenePrompt.textContent = practice ? config.practicePrompt : config.learnPrompt;
    if (practice) {
      session.startRound();
      renderQuestion();
      speakInstruction();
    } else {
      dom.sessionProgress.textContent = "已认识 " + session.seen.size + "/6";
    }
  }
  function selectTarget(id) {
    if (!session) return;
    clearTimeout(feedbackTimer);
    clearTimeout(advanceTimer);
    clearTargetStates();
    const targets = activeTargets();
    const targetNode = targets.find((node) => node.dataset.target === id);
    if (!targetNode) return;
    if (stage === "learn") {
      const word = session.learn(id);
      targetNode.classList.add("is-selected");
      targetNode.setAttribute("aria-pressed", "true");
      renderWord(word);
      dom.scenePrompt.textContent = "已选择：" + (word.ariaLabel || word.chinese + " " + word.word);
      dom.sessionProgress.textContent = "已认识 " + session.seen.size + "/6";
      speak(word.word + ". " + word.sentence);
      return;
    }
    if (session.complete) return;
    const result = session.answer(id);
    if (result.status === "wrong") {
      targetNode.classList.add("is-wrong");
      const hintNode = targets.find((node) => node.dataset.target === result.target.id);
      hintNode.classList.add("is-hint");
      dom.practiceFeedback.className = "practice-feedback is-error";
      dom.practiceFeedback.textContent = "再试一次。提示：找 " + activeConfig().retryLabel(result.target) + "。";
      speak(activeConfig().instruction(result.target));
      feedbackTimer = setTimeout(clearTargetStates, 900);
      return;
    }
    targetNode.classList.add("is-correct");
    targetNode.setAttribute("aria-pressed", "true");
    dom.practiceFeedback.className = "practice-feedback is-success";
    dom.practiceFeedback.textContent = "答对了！" + result.target.sentence;
    dom.sessionProgress.textContent = "练习 " + session.correctCount + "/6";
    speak(result.target.sentence);
    advanceTimer = setTimeout(() => {
      clearTargetStates();
      if (result.complete) finishRound();
      else {
        renderQuestion();
        speakInstruction();
      }
    }, 900);
  }
  function enterTheme(themeId) {
    const config = THEME_CONFIGS[themeId];
    if (!config) return;
    clearTimeout(feedbackTimer);
    clearTimeout(advanceTimer);
    activeThemeId = themeId;
    session = new ThemeSession(config.words);
    dom.ttsNotice.hidden = true;
    dom.themePicker.hidden = true;
    dom.learningView.hidden = false;
    dom.activeThemeKicker.textContent = config.chineseTitle + " " + config.englishTitle;
    dom.characterPanel.setAttribute("aria-label", config.sceneLabel);
    scenes.forEach((scene) => { scene.hidden = scene.id !== config.sceneId; });
    renderLearnPlaceholder(config);
    setStage("learn");
    dom.learnStage.focus();
  }
  function returnToPicker() {
    clearTimeout(feedbackTimer);
    clearTimeout(advanceTimer);
    clearTargetStates();
    activeThemeId = null;
    session = null;
    dom.learningView.hidden = true;
    dom.themePicker.hidden = false;
    document.querySelector('[data-theme-id="body"]').focus();
  }

  document.querySelectorAll("[data-theme-id]").forEach((button) => {
    button.addEventListener("click", () => enterTheme(button.dataset.themeId));
  });
  document.querySelectorAll(".scene-target").forEach((target) => {
    target.setAttribute("aria-pressed", "false");
    target.addEventListener("click", () => selectTarget(target.dataset.target));
    target.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (!event.repeat) selectTarget(target.dataset.target);
    });
  });
  dom.backToThemes.addEventListener("click", returnToPicker);
  dom.learnStage.addEventListener("click", () => setStage("learn"));
  dom.practiceStage.addEventListener("click", () => setStage("practice"));
  dom.playInstruction.addEventListener("click", speakInstruction);
  dom.restartRound.addEventListener("click", () => setStage("practice"));

  const api = {
    get activeThemeId() { return activeThemeId; },
    get session() { return session; },
    enterTheme, returnToPicker, selectTarget, setStage, themes: THEME_CONFIGS
  };
  window.__THEME_LEARNING__ = api;
  window.__BODY_THEME__ = {
    get session() { return session; },
    selectPart: selectTarget,
    setStage,
    words: THEME_WORDS
  };
}

if (typeof document !== "undefined") initializePage();
