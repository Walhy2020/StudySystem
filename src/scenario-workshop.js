import { collectScenarioVocabulary, knownScenarioWords, normalizeWord } from "./scenario-vocabulary.js?v=1.0";

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
const safeImage = (path) => /^\/api\/scenarios\/images\/[a-zA-Z0-9-]{8,64}\.png$/.test(path);

export function initializeScenarioWorkshop({ store, speaker, scenarios, onOpen }) {
  const dom = Object.fromEntries([...document.querySelectorAll("[id]")].map((node) => [node.id, node]));
  let lessons = [];
  let config = null;
  let preview = null;
  let busy = false;
  const suffix = store.key.slice("mario-scenario-learning-v1".length);

  async function api(path, body) {
    const response = await fetch(path, body ? { method: "POST", headers: { "Content-Type": "application/json", "X-Scenario-Token": config?.token || "" }, body: JSON.stringify(body) } : { cache: "no-store" });
    let value;
    try { value = await response.json(); } catch { throw new Error("本地服务尚未升级，请重新启动 server.py 后刷新页面。"); }
    if (!response.ok) throw new Error(value.error || "生成服务请求失败。");
    return value;
  }
  function vocabulary() {
    return collectScenarioVocabulary([...scenarios, ...lessons], knownScenarioWords(window.localStorage, store.state.learnedWords, suffix));
  }
  function markLearned(word, learned) {
    try {
      // Merge freshest scenario state to avoid discarding another tab's progress.
      const source = JSON.parse(localStorage.getItem(store.key) || "{}");
      const values = new Set(Array.isArray(source.learnedWords) ? source.learnedWords : []);
      if (learned) values.add(normalizeWord(word)); else values.delete(normalizeWord(word));
      store.patch({ ...source, learnedWords: [...values] });
      renderWords();
    } catch { dom.scenarioWordsStatus.textContent = "保存学习状态失败，请检查浏览器存储权限后重试。"; }
  }
  function renderWords() {
    const words = vocabulary();
    const pending = words.filter((word) => !word.learned);
    dom.scenarioWordCount.textContent = pending.length;
    dom.scenarioWordsStatus.textContent = pending.length ? `${pending.length} 个新单词 · ${words.length - pending.length} 个已学` : "目前没有新单词。保存新情景后会自动检查。";
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
  function open(mode) {
    onOpen();
    dom.scenarioPicker.hidden = true;
    dom.scenarioWorkshop.hidden = false;
    dom.scenarioCreator.hidden = mode !== "creator";
    dom.scenarioWordsView.hidden = mode !== "words";
    dom.customScenarioLesson.hidden = mode !== "lesson";
    dom.workshopTitle.textContent = mode === "creator" ? "创建情景" : mode === "words" ? "新单词" : "我的情景";
    if (mode === "words") renderWords();
  }
  function renderLesson(target, lesson) {
    target.replaceChildren(el("h3", lesson.title));
    if (safeImage(lesson.image)) {
      const image = el("img", undefined, "generated-scene-image");
      image.src = lesson.image;
      image.alt = `${lesson.title}：两个对话时刻的情景配图`;
      image.width = 1536; image.height = 1024;
      image.addEventListener("error", () => { image.replaceWith(el("p", "配图加载失败，请检查本地情景文件。")); });
      target.append(image);
    }
    const lines = el("div", undefined, "generated-dialogue-lines");
    for (const line of lesson.lines) {
      const card = el("article", undefined, "generated-dialogue-line");
      card.append(el("strong", line.speaker), el("p", line.text, "custom-english"), el("p", line.phonetic, "word-ipa"), el("p", line.chinese));
      card.append(button("🔊", () => speaker.speak(line.text), `朗读：${line.text}`));
      lines.append(card);
    }
    target.append(lines, el("h3", "对话单词拆解"));
    const words = el("div", undefined, "lesson-word-breakdown");
    for (const word of lesson.vocabulary) {
      const card = el("div");
      card.append(el("strong", word.word), el("span", word.phonetic, "word-ipa"), el("span", word.chinese));
      words.append(card);
    }
    target.append(words);
  }
  function renderSaved() {
    dom.customScenarioList.replaceChildren();
    for (const lesson of lessons) {
      const card = el("article", undefined, "custom-scenario-card");
      if (safeImage(lesson.image)) {
        const image = el("img"); image.src = lesson.image; image.alt = lesson.title; image.loading = "lazy";
        card.append(image);
      }
      card.append(el("h3", lesson.title), el("p", `${lesson.lines.length} 句对话 · ${lesson.vocabulary.length} 个单词`), button("学习情景", () => { open("lesson"); renderLesson(dom.customScenarioLesson, lesson); }));
      dom.customScenarioList.append(card);
    }
    renderWords();
  }
  async function followJob(id) {
    busy = true;
    dom.generateScenario.disabled = true;
    try {
      for (let count = 0; count < 300; count += 1) {
        const job = await api(`/api/scenarios/jobs/${encodeURIComponent(id)}`);
        dom.generationStatus.textContent = job.message;
        if (job.state === "failed") throw new Error(job.message);
        if (job.state === "ready") {
          preview = job.lesson;
          renderLesson(dom.generatedPreview, preview);
          dom.generatedPreview.hidden = false;
          dom.saveGeneratedScenario.hidden = false;
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
      throw new Error("生成等待时间较长。刷新页面可查询原任务，请勿重复生成。");
    } catch (error) { dom.generationStatus.textContent = error.message; }
    finally { busy = false; dom.generateScenario.disabled = !config?.configured; }
  }
  dom.openScenarioCreator.addEventListener("click", () => open("creator"));
  dom.openScenarioWords.addEventListener("click", () => open("words"));
  dom.closeWorkshop.addEventListener("click", () => { speaker.cancel(); dom.scenarioWorkshop.hidden = true; dom.scenarioPicker.hidden = false; });
  dom.showLearnedScenarioWords.addEventListener("change", renderWords);
  dom.scenarioGenerateForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (busy || !config?.configured) return;
    busy = true; dom.generateScenario.disabled = true;
    preview = null; dom.generatedPreview.hidden = true; dom.saveGeneratedScenario.hidden = true;
    dom.generationStatus.textContent = "正在提交生成请求…";
    const requestId = crypto.randomUUID();
    try {
      const result = await api("/api/scenarios/generate", { dialogue: dom.scenarioDialogueInput.value.trim(), requestId });
      history.replaceState(null, "", `#generation=${result.id}`);
      await followJob(result.id);
    } catch (error) { dom.generationStatus.textContent = error.message; }
    finally { busy = false; dom.generateScenario.disabled = !config?.configured; }
  });
  dom.saveGeneratedScenario.addEventListener("click", async () => {
    if (!preview) return;
    dom.saveGeneratedScenario.disabled = true;
    try {
      const { lesson } = await api("/api/scenarios/save", { id: preview.id });
      lessons = [...lessons.filter((item) => item.id !== lesson.id), lesson];
      renderSaved();
      dom.generationStatus.textContent = "已保存到本机，未学过的单词已收录到新单词模块。";
      dom.saveGeneratedScenario.hidden = true;
      history.replaceState(null, "", location.pathname + location.search);
    } catch (error) { dom.generationStatus.textContent = error.message; }
    finally { dom.saveGeneratedScenario.disabled = false; }
  });
  window.addEventListener("storage", () => {
    try { store.state.learnedWords = JSON.parse(localStorage.getItem(store.key) || "{}").learnedWords || []; } catch {}
    renderWords();
  });
  renderWords();
  (async () => {
    try {
      config = await api("/api/scenarios/config");
      dom.generateScenario.disabled = !config.configured;
      dom.generationStatus.textContent = config.configured ? "生成服务就绪。配图可能需要几分钟，请勿重复提交。" : "请配置 OPENAI_API_KEY 后重新启动本地服务；新单词仍可使用。";
      lessons = (await api("/api/scenarios")).lessons;
      renderSaved();
      const id = new URLSearchParams(location.hash.slice(1)).get("generation");
      if (id && /^[a-zA-Z0-9-]{8,64}$/.test(id)) { open("creator"); await followJob(id); }
    } catch (error) { dom.generationStatus.textContent = error.message; }
  })();
}
