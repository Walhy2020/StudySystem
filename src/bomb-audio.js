(function () {
  function createBombSoundPlayer(AudioContextClass = window.AudioContext || window.webkitAudioContext) {
    let context = null;
    let master = null;
    let enabled = true;

    function unlock() {
      if (!enabled || !AudioContextClass) return false;
      try {
        if (!context) {
          context = new AudioContextClass();
          master = context.createGain();
          master.gain.value = 0.16;
          master.connect(context.destination);
        }
        if (context.state === "suspended") context.resume()?.catch?.(() => {});
        return true;
      } catch {
        return false;
      }
    }

    function tone(frequency, endFrequency, delay, duration, volume, shape = "sine") {
      const start = context.currentTime + delay;
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = shape;
      oscillator.frequency.setValueAtTime(frequency, start);
      oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.exponentialRampToValueAtTime(volume, start + 0.008);
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(envelope);
      envelope.connect(master);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.01);
    }

    function blast() {
      const start = context.currentTime;
      const duration = 0.36;
      const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
      const samples = buffer.getChannelData(0);
      for (let index = 0; index < samples.length; index += 1) samples[index] = Math.random() * 2 - 1;
      const noise = context.createBufferSource();
      const filter = context.createBiquadFilter();
      const envelope = context.createGain();
      noise.buffer = buffer;
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(700, start);
      filter.frequency.exponentialRampToValueAtTime(130, start + duration);
      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.exponentialRampToValueAtTime(0.65, start + 0.01);
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      noise.connect(filter);
      filter.connect(envelope);
      envelope.connect(master);
      noise.start(start);
      noise.stop(start + duration);
      tone(110, 48, 0, 0.3, 0.4, "triangle");
    }

    function play(effect) {
      if (!enabled || !context || context.state !== "running") return false;
      try {
        if (effect === "place") tone(300, 170, 0, 0.11, 0.42, "triangle");
        else if (effect === "explode") blast();
        else if (effect === "pickup") {
          tone(620, 700, 0, 0.12, 0.35);
          tone(900, 1040, 0.09, 0.18, 0.32);
        } else if (effect === "correct") {
          tone(523, 540, 0, 0.13, 0.36);
          tone(659, 680, 0.1, 0.13, 0.36);
          tone(784, 810, 0.2, 0.22, 0.4);
        } else return false;
        return true;
      } catch {
        return false;
      }
    }

    function setEnabled(value) {
      enabled = Boolean(value);
      if (master && context) master.gain.setValueAtTime(enabled ? 0.16 : 0, context.currentTime);
      if (enabled) unlock();
    }

    return { unlock, play, setEnabled, isEnabled: () => enabled, supported: Boolean(AudioContextClass) };
  }

  window.createBombSoundPlayer = createBombSoundPlayer;
}());
