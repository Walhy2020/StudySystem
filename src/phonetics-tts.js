export const SPEECH_RESTART_DELAY_MS = 60;

let voices = [];
let pendingSpeech = null;

function speechApi() {
  return typeof window !== "undefined" ? window.speechSynthesis : null;
}

function utteranceConstructor() {
  if (typeof window !== "undefined" && typeof window.SpeechSynthesisUtterance === "function") {
    return window.SpeechSynthesisUtterance;
  }
  return typeof SpeechSynthesisUtterance === "function" ? SpeechSynthesisUtterance : null;
}

export function refreshEnglishVoices() {
  const synthesis = speechApi();
  if (!synthesis || typeof synthesis.getVoices !== "function") {
    voices = [];
    return voices;
  }
  try {
    voices = synthesis.getVoices() || [];
  } catch {
    voices = [];
  }
  return voices;
}

export function preferredEnglishVoice() {
  if (!voices.length) refreshEnglishVoices();
  const english = voices.filter((voice) => /^en(?:-|_)/i.test(voice?.lang || ""));
  return english.find((voice) => voice.localService && /^en(?:-|_)GB/i.test(voice.lang)) ||
    english.find((voice) => /^en(?:-|_)GB/i.test(voice.lang)) ||
    english.find((voice) => voice.localService) || english[0] || null;
}

function supersedePendingSpeech() {
  if (!pendingSpeech) return;
  clearTimeout(pendingSpeech.timer);
  const resolve = pendingSpeech.resolve;
  const example = pendingSpeech.example;
  pendingSpeech = null;
  resolve({ ok: false, reason: "superseded", example });
}

export function cancelPhoneticSpeech() {
  supersedePendingSpeech();
  const synthesis = speechApi();
  if (!synthesis || typeof synthesis.cancel !== "function") return false;
  try {
    synthesis.cancel();
    return true;
  } catch {
    return false;
  }
}

export function speakPhoneticExample(item, options = {}) {
  const example = String(item?.examples?.[0] || "").trim();
  const synthesis = speechApi();
  const Utterance = utteranceConstructor();
  if (!example || !synthesis || typeof synthesis.speak !== "function" || !Utterance) {
    return Promise.resolve({ ok: false, reason: "unavailable", example });
  }

  cancelPhoneticSpeech();
  const delayMs = Math.max(0, Number(options.delayMs ?? SPEECH_RESTART_DELAY_MS) || 0);
  return new Promise((resolve) => {
    const job = { timer: 0, resolve, example };
    pendingSpeech = job;
    job.timer = setTimeout(() => {
      if (pendingSpeech !== job) return;
      pendingSpeech = null;
      try {
        const utterance = new Utterance(example);
        const voice = preferredEnglishVoice();
        if (voice) utterance.voice = voice;
        utterance.lang = "en-GB";
        utterance.rate = 0.72;
        utterance.pitch = 1.02;
        synthesis.resume?.();
        synthesis.speak(utterance);
        resolve({ ok: true, reason: "spoken", example, utterance, voice: voice || null });
      } catch {
        resolve({ ok: false, reason: "failed", example });
      }
    }, delayMs);
  });
}

const synthesis = speechApi();
if (synthesis) {
  refreshEnglishVoices();
  synthesis.addEventListener?.("voiceschanged", refreshEnglishVoices);
}
