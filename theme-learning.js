import { PHONETIC_STRESS_MARKS, splitPhonetic } from "./src/phonetic-segmenter.js?v=1.0";
import { initializeThemeProgress } from "./src/theme-overview.js?v=1.1";

export { splitPhonetic };

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

export const ORDINAL_WORDS = Object.freeze([
  { id: "first", word: "first", phonetic: "/fɜːst/", chinese: "第一", sentence: "This is the first." },
  { id: "second", word: "second", phonetic: "/ˈsekənd/", chinese: "第二", sentence: "This is the second." },
  { id: "third", word: "third", phonetic: "/θɜːd/", chinese: "第三", sentence: "This is the third." },
  { id: "fourth", word: "fourth", phonetic: "/fɔːθ/", chinese: "第四", sentence: "This is the fourth." },
  { id: "fifth", word: "fifth", phonetic: "/fɪfθ/", chinese: "第五", sentence: "This is the fifth." },
  { id: "sixth", word: "sixth", phonetic: "/sɪksθ/", chinese: "第六", sentence: "This is the sixth." },
  { id: "seventh", word: "seventh", phonetic: "/ˈsevənθ/", chinese: "第七", sentence: "This is the seventh." },
  { id: "eighth", word: "eighth", phonetic: "/eɪtθ/", chinese: "第八", sentence: "This is the eighth." },
  { id: "ninth", word: "ninth", phonetic: "/naɪnθ/", chinese: "第九", sentence: "This is the ninth." },
  { id: "tenth", word: "tenth", phonetic: "/tenθ/", chinese: "第十", sentence: "This is the tenth." }
]);
export const CLASSIC_ITEMS_1_WORDS = Object.freeze([
  { id: "coin", word: "coin", phonetic: "/kɔɪn/", chinese: "金币", sentence: "The coin is gold.", instruction: "Touch the coin.", ariaLabel: "coin 金币" },
  { id: "key", word: "key", phonetic: "/kiː/", chinese: "钥匙", sentence: "This key opens the door.", instruction: "Touch the key.", ariaLabel: "key 钥匙" },
  { id: "crown", word: "crown", phonetic: "/kraʊn/", chinese: "王冠", sentence: "The crown is royal.", instruction: "Touch the crown.", ariaLabel: "crown 王冠" },
  { id: "treasure", word: "treasure", phonetic: "/ˈtreʒə/", chinese: "宝藏", sentence: "The treasure is in the chest.", instruction: "Touch the treasure chest.", ariaLabel: "treasure chest 宝箱" },
  { id: "star", word: "star", phonetic: "/stɑː/", chinese: "星星", sentence: "The star is bright.", instruction: "Touch the star.", ariaLabel: "star 星星" },
  { id: "moon", word: "moon", phonetic: "/muːn/", chinese: "月亮", sentence: "The moon shines at night.", instruction: "Touch the moon.", ariaLabel: "moon 月亮" }
]);
export const CLASSIC_ITEMS_2_WORDS = Object.freeze([
  { id: "mushroom", word: "mushroom", phonetic: "/ˈmʌʃruːm/", chinese: "蘑菇", sentence: "This is a mushroom.", instruction: "Touch the mushroom.", ariaLabel: "mushroom 蘑菇" },
  { id: "flower", word: "flower", phonetic: "/ˈflaʊə/", chinese: "花", sentence: "The flower is bright.", instruction: "Touch the flower.", ariaLabel: "flower 花" },
  { id: "leaf", word: "leaf", phonetic: "/liːf/", chinese: "叶子", sentence: "The leaf is green.", instruction: "Touch the leaf.", ariaLabel: "leaf 叶子" },
  { id: "feather", word: "feather", phonetic: "/ˈfeðə/", chinese: "羽毛", sentence: "The feather is light.", instruction: "Touch the feather.", ariaLabel: "feather 羽毛" },
  { id: "bell", word: "bell", phonetic: "/bel/", chinese: "铃铛", sentence: "The bell rings.", instruction: "Touch the bell.", ariaLabel: "bell 铃铛" },
  { id: "acorn", word: "acorn", phonetic: "/ˈeɪkɔːn/", chinese: "橡果", sentence: "The acorn is small.", instruction: "Touch the acorn.", ariaLabel: "acorn 橡果" }
]);

export const CLASSIC_ITEMS_3_WORDS = Object.freeze([
  { id: "banana", word: "banana", phonetic: "/bəˈnɑːnə/", chinese: "香蕉", sentence: "This is a banana.", instruction: "Touch the banana.", ariaLabel: "banana 香蕉" },
  { id: "shell", word: "shell", phonetic: "/ʃel/", chinese: "龟壳", sentence: "The shell is green.", instruction: "Touch the shell.", ariaLabel: "shell 龟壳" },
  { id: "bomb", word: "bomb", phonetic: "/bɒm/", chinese: "炸弹", sentence: "The bomb is black.", instruction: "Touch the bomb.", ariaLabel: "bomb 炸弹" },
  { id: "lightning", word: "lightning", phonetic: "/ˈlaɪtnɪŋ/", chinese: "闪电", sentence: "Lightning is fast.", instruction: "Touch the lightning.", ariaLabel: "lightning 闪电" },
  { id: "horn", word: "horn", phonetic: "/hɔːn/", chinese: "喇叭", sentence: "The horn is loud.", instruction: "Touch the horn.", ariaLabel: "horn 喇叭" },
  { id: "ink", word: "ink", phonetic: "/ɪŋk/", chinese: "墨水", sentence: "The ink is black.", instruction: "Touch the ink.", ariaLabel: "ink 墨水" }
]);

export const CLASSIC_ITEMS_4_WORDS = Object.freeze([
  { id: "cap", word: "cap", phonetic: "/kæp/", chinese: "帽子", sentence: "The cap is red.", instruction: "Touch the cap.", ariaLabel: "cap 帽子" },
  { id: "suit", word: "suit", phonetic: "/suːt/", chinese: "套装", sentence: "This is a suit.", instruction: "Touch the suit.", ariaLabel: "suit 套装" },
  { id: "hammer", word: "hammer", phonetic: "/ˈhæmə/", chinese: "锤子", sentence: "The hammer is heavy.", instruction: "Touch the hammer.", ariaLabel: "hammer 锤子" },
  { id: "boomerang", word: "boomerang", phonetic: "/ˈbuːməræŋ/", chinese: "回旋镖", sentence: "The boomerang comes back.", instruction: "Touch the boomerang.", ariaLabel: "boomerang 回旋镖" },
  { id: "spring", word: "spring", phonetic: "/sprɪŋ/", chinese: "弹簧", sentence: "The spring can bounce.", instruction: "Touch the spring.", ariaLabel: "spring 弹簧" },
  { id: "egg", word: "egg", phonetic: "/eɡ/", chinese: "蛋", sentence: "This is an egg.", instruction: "Touch the egg.", ariaLabel: "egg 蛋" }
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
  }),
  ordinals: Object.freeze({
    id: "ordinals", chineseTitle: "第一到第十", englishTitle: "First–Tenth", words: ORDINAL_WORDS,
    sceneId: "ordinalsScene", sceneLabel: "第一到第十序数词互动卡",
    learnPrompt: "点击序号卡，认识 first 到 tenth", practicePrompt: "听指令，点击正确序号",
    learnPlaceholderTitle: "点一个序号卡", learnPlaceholderText: "序数词、音标、中文和例句会显示在这里。",
    retryLabel: (word) => word.chinese + "（" + word.word + "）",
    instruction: (word) => "Touch the " + word.word + ".",
    completePrompt: "完成！十个序数词全部找对", completeTitle: "十个序数词全部找对！",
    completeText: "你完成了第一到第十 First–Tenth 的听音点击练习。"
  }),
  items1: Object.freeze({
    id: "items1", chineseTitle: "经典道具 I", englishTitle: "Classic Items I", words: CLASSIC_ITEMS_1_WORDS,
    sceneId: "items1Scene", sceneLabel: "经典道具第一系列互动图",
    learnPrompt: "点击场景中的经典道具", practicePrompt: "听指令，点击正确道具",
    learnPlaceholderTitle: "点一个经典道具", learnPlaceholderText: "单词、音标、中文和例句会显示在这里。",
    retryLabel: (word) => word.ariaLabel,
    instruction: (word) => word.instruction,
    completePrompt: "完成！六个经典道具全部找对", completeTitle: "六个经典道具全部找对！",
    completeText: "你完成了经典道具 I Classic Items I 的听音点击练习。"
  }),
  items2: Object.freeze({
    id: "items2", chineseTitle: "经典道具 II", englishTitle: "Classic Items II", words: CLASSIC_ITEMS_2_WORDS,
    sceneId: "items2Scene", sceneLabel: "经典道具第二系列互动图",
    learnPrompt: "点击场景中的能力道具", practicePrompt: "听指令，点击正确能力道具",
    learnPlaceholderTitle: "点一个能力道具", learnPlaceholderText: "单词、音标、中文和例句会显示在这里。",
    retryLabel: (word) => word.ariaLabel, instruction: (word) => word.instruction,
    completePrompt: "完成！六个能力道具全部找对", completeTitle: "六个能力道具全部找对！",
    completeText: "你完成了经典道具 II Classic Items II 的听音点击练习。"
  }),
  items3: Object.freeze({
    id: "items3", chineseTitle: "经典道具 III", englishTitle: "Classic Items III", words: CLASSIC_ITEMS_3_WORDS,
    sceneId: "items3Scene", sceneLabel: "经典道具第三系列互动图",
    learnPrompt: "点击场景中的赛车道具", practicePrompt: "听指令，点击正确赛车道具",
    learnPlaceholderTitle: "点一个赛车道具", learnPlaceholderText: "单词、音标、中文和例句会显示在这里。",
    retryLabel: (word) => word.ariaLabel, instruction: (word) => word.instruction,
    completePrompt: "完成！六个赛车道具全部找对", completeTitle: "六个赛车道具全部找对！",
    completeText: "你完成了经典道具 III Classic Items III 的听音点击练习。"
  }),
  items4: Object.freeze({
    id: "items4", chineseTitle: "经典道具 IV", englishTitle: "Classic Items IV", words: CLASSIC_ITEMS_4_WORDS,
    sceneId: "items4Scene", sceneLabel: "经典道具第四系列互动图",
    learnPrompt: "点击场景中的特殊装备", practicePrompt: "听指令，点击正确特殊装备",
    learnPlaceholderTitle: "点一个特殊装备", learnPlaceholderText: "单词、音标、中文和例句会显示在这里。",
    retryLabel: (word) => word.ariaLabel, instruction: (word) => word.instruction,
    completePrompt: "完成！六个特殊装备全部找对", completeTitle: "六个特殊装备全部找对！",
    completeText: "你完成了经典道具 IV Classic Items IV 的听音点击练习。"
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
  function toggleCurrentPhonetic() {
    if (stage !== "learn") return false;
    const toggle = dom.wordCard.querySelector("#phoneticToggle");
    const breakdown = dom.wordCard.querySelector("#phonemeBreakdown");
    if (!toggle || !breakdown) return false;
    const expanded = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(expanded));
    breakdown.hidden = !expanded;
    return true;
  }  function renderWord(word) {
    const phonemes = splitPhonetic(word.phonetic);
    const wordIndex = session.words.findIndex(({ id }) => id === word.id);
    const previousDisabled = wordIndex <= 0 ? " disabled" : "";
    const nextDisabled = wordIndex >= session.words.length - 1 ? " disabled" : "";
    const phonemeMarkup = phonemes.map((symbol) => {
      const stressLabel = PHONETIC_STRESS_MARKS[symbol];
      if (stressLabel) return '<span class="phoneme-chip phoneme-stress" data-symbol="' + symbol + '" aria-label="' + stressLabel + '" title="' + stressLabel + '">' + symbol + '</span>';
      return '<span class="phoneme-chip" data-symbol="' + symbol + '">' + symbol + '</span>';
    }).join("");
    dom.wordCard.className = "word-detail";
    dom.wordCard.innerHTML = '<h3 class="word-en">' + word.word + '</h3><button class="phonetic phonetic-toggle" id="phoneticToggle" type="button" aria-expanded="false" aria-controls="phonemeBreakdown" aria-label="拆分 ' + word.word + ' 的音标 ' + word.phonetic + '">' + word.phonetic + '</button><div class="phoneme-breakdown" id="phonemeBreakdown" aria-label="' + word.word + ' 音素拆解" hidden>' + phonemeMarkup + '</div><span class="translation">' + word.chinese + '</span><p class="sentence">' + word.sentence + '</p><div class="word-navigation"><button class="primary-button icon-action sound-action theme-sound-button" id="repeatWord" type="button" aria-label="朗读 ' + word.word + ' 和例句" title="朗读 ' + word.word + ' 和例句"><span aria-hidden="true">🔊</span></button><button class="word-nav-button" id="previousWord" type="button" aria-label="Previous word"' + previousDisabled + '>Previous</button><button class="word-nav-button" id="nextWord" type="button" aria-label="Next word"' + nextDisabled + '>Next</button></div>';
    dom.wordCard.querySelector("#phoneticToggle").addEventListener("click", toggleCurrentPhonetic);
    dom.wordCard.querySelector("#previousWord").addEventListener("click", () => {
      const previousWord = session.words[wordIndex - 1];
      if (previousWord) selectTarget(previousWord.id);
    });
    dom.wordCard.querySelector("#repeatWord").addEventListener("click", () => speak(word.word + ". " + word.sentence));
    dom.wordCard.querySelector("#nextWord").addEventListener("click", () => {
      const nextWord = session.words[wordIndex + 1];
      if (nextWord) selectTarget(nextWord.id);
    });
  }
  function renderLearnPlaceholder(config) {
    dom.wordCard.className = "word-card-placeholder";
    dom.wordCard.innerHTML = '<span class="tap-icon" aria-hidden="true">☝</span><h3>' + config.learnPlaceholderTitle + '</h3><p>' + config.learnPlaceholderText + '</p>';
  }
  function renderQuestion() {
    const config = activeConfig();
    const target = session.target();
    dom.roundProgress.textContent = "第 " + (session.questionIndex + 1) + "/" + session.questions.length + " 题";
    dom.practiceInstruction.textContent = config.instruction(target);
    dom.practiceFeedback.className = "practice-feedback";
    dom.practiceFeedback.textContent = config.practicePrompt + "。";
    dom.sessionProgress.textContent = "练习 " + session.correctCount + "/" + session.questions.length;
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
    dom.resultScore.textContent = session.correctCount + "/" + session.questions.length;
    dom.sessionProgress.textContent = "练习 " + session.questions.length + "/" + session.questions.length;
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
      dom.sessionProgress.textContent = "已认识 " + session.seen.size + "/" + session.words.length;
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
      window.dispatchEvent(new CustomEvent("theme-word-learned", { detail: { themeId: activeThemeId, wordId: word.id } }));
      targetNode.classList.add("is-selected");
      targetNode.setAttribute("aria-pressed", "true");
      renderWord(word);
      dom.scenePrompt.textContent = "已选择：" + (word.ariaLabel || word.chinese + " " + word.word);
      dom.sessionProgress.textContent = "已认识 " + session.seen.size + "/" + session.words.length;

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
    window.dispatchEvent(new CustomEvent("theme-word-learned", { detail: { themeId: activeThemeId, wordId: result.target.id } }));
    targetNode.classList.add("is-correct");
    targetNode.setAttribute("aria-pressed", "true");
    dom.practiceFeedback.className = "practice-feedback is-success";
    dom.practiceFeedback.textContent = "答对了！" + result.target.sentence;
    dom.sessionProgress.textContent = "练习 " + session.correctCount + "/" + session.questions.length;
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
      if (event.key === " " && stage === "learn" && dom.wordCard.querySelector("#phoneticToggle")) {
        event.preventDefault();
        if (!event.repeat) toggleCurrentPhonetic();
        return;
      }
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (!event.repeat) selectTarget(target.dataset.target);
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || event.key !== " " || event.repeat || stage !== "learn" || !session || dom.learningView.hidden) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("button,a,input,select,textarea,[contenteditable='true']")) return;
    if (toggleCurrentPhonetic()) event.preventDefault();
  });  dom.backToThemes.addEventListener("click", returnToPicker);
  dom.learnStage.addEventListener("click", () => setStage("learn"));
  dom.practiceStage.addEventListener("click", () => setStage("practice"));
  dom.playInstruction.addEventListener("click", speakInstruction);
  dom.restartRound.addEventListener("click", () => setStage("practice"));

  const progress = initializeThemeProgress({ configs: THEME_CONFIGS });
  const api = {
    get activeThemeId() { return activeThemeId; },
    get session() { return session; },
    enterTheme, returnToPicker, selectTarget, setStage, themes: THEME_CONFIGS, progress
  };
  window.__THEME_LEARNING__ = api;
  window.__BODY_THEME__ = {
    get session() { return session; },
    selectPart: selectTarget,
    setStage,
    words: THEME_WORDS
  };
}

if (typeof document !== "undefined" && document.querySelector("#themePicker")) initializePage();
