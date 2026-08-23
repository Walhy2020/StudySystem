let voices = [];

export function refreshVoices() {
  voices = "speechSynthesis" in window ? window.speechSynthesis.getVoices() : [];
  return voices;
}

export function preferredChineseVoice() {
  if (!voices.length) refreshVoices();
  const chinese = voices.filter((voice) => /^zh/i.test(voice.lang) || /Chinese|Mandarin|中文|普通话|Xiaoxiao|Xiaoyi|Huihui|Yaoyao|Ting-Ting|Mei-Jia/i.test(voice.name));
  return chinese.find((voice) => /female|女|Xiaoxiao|Xiaoyi|Huihui|Yaoyao|Hanhan|Ting-Ting|Tingting|Mei-Jia/i.test(voice.name)) || chinese[0] || null;
}

export function speakChineseCharacter(character) {
  if (!character || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return false;
  const utterance = new SpeechSynthesisUtterance(character);
  const voice = preferredChineseVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = "zh-CN";
  utterance.rate = 0.72;
  utterance.pitch = 1.08;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  return true;
}

if ("speechSynthesis" in window) {
  refreshVoices();
  window.speechSynthesis.addEventListener?.("voiceschanged", refreshVoices);
}
