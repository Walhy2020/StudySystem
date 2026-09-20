import { collectScenarioVocabulary, knownScenarioWords, normalizeWord } from "./scenario-vocabulary.js?v=1.8";

const el = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
};
const button = (text, action, label) => {
  const node = el("button", text);
  node.type = "button";
  if (label) node.setAttribute("aria-label", label);
  node.addEventListener("click", action);
  return node;
};

// Authoring and imagegen happen in the conversation; this view only learns the active scenario's words.
export function initializeScenarioWords({ store, speaker, getScenario }) {
  const dom = Object.fromEntries([...document.querySelectorAll("[id]")].map((node) => [node.id, node]));
  const suffix = store.key.slice("mario-scenario-learning-v1".length);
  function markLearned(word, learned) {
    try {
      const source = JSON.parse(localStorage.getItem(store.key) || "{}");
      const values = new Set(Array.isArray(source.learnedWords) ? source.learnedWords : []);
      if (learned) values.add(normalizeWord(word)); else values.delete(normalizeWord(word));
      store.patch({ learnedWords: [...values] });
      renderWords();
    } catch { dom.scenarioWordsStatus.textContent = "保存学习状态失败，请检查浏览器存储权限后重试。"; }
  }
  function renderWords() {
    const scenario = getScenario();
    const words = collectScenarioVocabulary([scenario], knownScenarioWords(window.localStorage, store.state.learnedWords, suffix));
    const pending = words.filter((word) => !word.learned);
    dom.scenarioWordCount.textContent = pending.length;
    dom.scenarioWordsTitle.textContent = `${scenario.chineseTitle} · 新单词`;
    dom.scenarioWordsIntro.textContent = `这里只显示“${scenario.chineseTitle}”当前情景中的单词，不与其他情景合并。`;
    dom.scenarioWordsStatus.textContent = pending.length ? `${pending.length} 个新单词 · ${words.length - pending.length} 个已学` : "当前情景的单词都已经学过了。";
    dom.scenarioWordCards.replaceChildren();
    for (const word of dom.showLearnedScenarioWords.checked ? words : pending) {
      const card = el("article", undefined, "scenario-word-card");
      card.dataset.word = word.word;
      card.append(el("h3", word.word), el("p", word.phonetic, "word-ipa"), el("p", word.chinese));
      for (const source of word.sources) card.append(el("p", `${source.title}：${source.text}`, "word-source"));
      const actions = el("div", undefined, "word-actions");
      actions.append(button("🔊", () => speaker.speak(word.word), `朗读单词 ${word.word}`));
      if (!word.learned) actions.append(button("学会了", () => markLearned(word.word, true)));
      else if (store.state.learnedWords.includes(word.word)) actions.append(button("重新学习", () => markLearned(word.word, false)));
      else actions.append(el("span", "其他模块已学"));
      card.append(actions);
      dom.scenarioWordCards.append(card);
    }
  }
  dom.showLearnedScenarioWords.addEventListener("change", renderWords);
  window.addEventListener("storage", () => {
    try {
      const words = JSON.parse(localStorage.getItem(store.key) || "{}").learnedWords;
      store.state.learnedWords = Array.isArray(words) ? words : [];
    } catch {}
    renderWords();
  });
  renderWords();
  return { render: renderWords };
}
