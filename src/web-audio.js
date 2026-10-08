(function () {
  function createController({ read = () => false, write = () => {}, notify = () => {}, cancelSpeech = () => {} } = {}) {
    let muted = false;
    try { muted = read() === true; } catch {}
    function apply(value) {
      if (muted === Boolean(value)) return false;
      muted = Boolean(value); notify(muted);
      if (muted) cancelSpeech();
      return true;
    }
    return Object.freeze({
      isMuted: () => muted,
      receiveMuted: apply,
      setMuted(value) { apply(value); try { write(muted); } catch {} return muted; },
      prepareSpeech(utterance) { if (muted) utterance.volume = 0; return utterance; },
    });
  }
  globalThis.StudyWebAudioTools = Object.freeze({ createController });
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const source = document.currentScript?.src;
  if (!source) return;
  const key = `mario-web-audio-muted-v1:${new URL("../", source).pathname}`;
  let storage;
  try { storage = window.sessionStorage; } catch {}
  const controller = createController({
    read: () => storage?.getItem(key) === "true",
    write: muted => storage?.setItem(key, String(muted)),
    notify: muted => {
      document.documentElement.dataset.studyMuted = String(muted);
      window.dispatchEvent(new CustomEvent("studysystem:audiochange", { detail: { muted } }));
    },
    cancelSpeech: () => { try { window.speechSynthesis?.cancel?.(); } catch {} },
  });
  function synchronize(muted) {
    controller.setMuted(muted);
    function visit(target) {
      try {
        if (target.STUDY_AUDIO?.key === key) target.STUDY_AUDIO.receiveMuted(muted);
        for (let i = 0; i < target.frames.length; i++) visit(target.frames[i]);
      } catch { /* Never access or modify an unrelated cross-origin frame. */ }
    }
    try { visit(window.top); } catch { visit(window); }
    return controller.isMuted();
  }
  window.STUDY_AUDIO = Object.freeze({ ...controller, key,
    setMuted: synchronize, toggle: () => synchronize(!controller.isMuted()) });
  document.documentElement.dataset.studyMuted = String(controller.isMuted());
  window.addEventListener("storage", event => {
    if (event.storageArea === storage && event.key === key) controller.receiveMuted(event.newValue === "true");
  });
}());
