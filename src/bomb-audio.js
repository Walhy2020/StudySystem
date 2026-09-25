(function () {
  const MUSIC_TRACKS = [
    { beat: 0.27, melody: [72, 76, 79, 76, 74, 77, 81, 77, 76, 79, 84, 79, 74, 76, 79, null,
      72, 76, 79, 76, 74, 77, 81, 77, 79, 81, 84, 81, 79, 76, 72, null], bass: [48, 53, 55, 48] },
    { beat: 0.3, melody: [67, 71, 74, 79, 76, 74, 71, 74, 69, 72, 76, 81, 79, 76, 74, null,
      67, 71, 74, 79, 81, 79, 76, 74, 72, 76, 79, 76, 74, 71, 67, null], bass: [43, 48, 50, 43] },
  ];

  function createBombSoundPlayer(AudioContextClass = window.AudioContext || window.webkitAudioContext) {
    let context = null;
    let master = null;
    let musicBus = null;
    let musicWorld = null;
    let musicTimer = null;
    let musicStep = 0;
    let nextNoteTime = 0;
    let musicAvailable = true;
    let enabled = true;

    function unlock() {
      if (!enabled || !AudioContextClass) return false;
      try {
        if (!context) {
          context = new AudioContextClass();
          master = context.createGain();
          master.gain.value = 0.16;
          master.connect(context.destination);
          musicBus = context.createGain();
          musicBus.gain.value = 0;
          musicBus.connect(context.destination);
        }
        if (context.state === "suspended") context.resume()?.catch?.(() => {});
        return true;
      } catch {
        return false;
      }
    }

    function tone(frequency, endFrequency, delay, duration, volume, shape = "sine", destination = master) {
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
      envelope.connect(destination);
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
      filter.frequency.setValueAtTime(4000, start);
      filter.frequency.exponentialRampToValueAtTime(800, start + duration);
      envelope.gain.setValueAtTime(0.0001, start);
      envelope.gain.exponentialRampToValueAtTime(0.35, start + 0.01);
      envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      noise.connect(filter);
      filter.connect(envelope);
      envelope.connect(master);
      noise.start(start);
      noise.stop(start + duration);
      tone(170, 60, 0, 0.28, 0.28, "triangle");
      tone(500, 120, 0, 0.09, 0.14, "sawtooth");
    }

    function musicFrequency(note) {
      return 440 * 2 ** ((note - 69) / 12);
    }

    function scheduleMusic() {
      if (!musicWorld || context.state !== "running") return;
      try {
        const track = MUSIC_TRACKS[(musicWorld - 1) % MUSIC_TRACKS.length];
        while (nextNoteTime < context.currentTime + 0.18) {
          const step = musicStep % track.melody.length;
          const delay = Math.max(0, nextNoteTime - context.currentTime);
          const note = track.melody[step];
          if (note !== null) {
            const frequency = musicFrequency(note);
            tone(frequency, frequency, delay, track.beat * 0.78, 0.3, "sine", musicBus);
          }
          if (step % 8 === 0) {
            const bass = musicFrequency(track.bass[Math.floor(step / 8)]);
            tone(bass, bass, delay, track.beat * 2.2, 0.2, "triangle", musicBus);
          }
          musicStep += 1;
          nextNoteTime += track.beat;
        }
      } catch {
        musicAvailable = false;
        musicWorld = null;
        if (musicTimer !== null) window.clearInterval(musicTimer);
        musicTimer = null;
        musicBus.gain.value = 0;
      }
    }

    function setMusic(world) {
      const nextWorld = enabled && musicAvailable && Number.isInteger(world) && world > 0 ? world : null;
      if (nextWorld === musicWorld) return;
      if (musicTimer !== null) {
        window.clearInterval(musicTimer);
        musicTimer = null;
      }
      musicWorld = nextWorld;
      if (musicBus && context) musicBus.gain.setValueAtTime(0, context.currentTime);
      if (!nextWorld) return;
      if (!unlock()) {
        musicAvailable = false;
        musicWorld = null;
        return;
      }
      musicStep = 0;
      nextNoteTime = context.currentTime + 0.05;
      musicBus.gain.setTargetAtTime(0.055, context.currentTime, 0.04);
      scheduleMusic();
      musicTimer = window.setInterval(scheduleMusic, 60);
    }

    function play(effect) {
      if (!enabled || !context || context.state !== "running") return false;
      try {
        if (effect === "place") tone(300, 170, 0, 0.11, 0.54, "triangle");
        else if (effect === "explode") blast();
        else if (effect === "pickup") {
          tone(620, 700, 0, 0.12, 0.42);
          tone(900, 1040, 0.09, 0.18, 0.38);
        } else if (effect === "correct") {
          tone(523, 540, 0, 0.13, 0.28);
          tone(659, 680, 0.1, 0.13, 0.28);
          tone(784, 810, 0.2, 0.22, 0.31);
        } else return false;
        return true;
      } catch {
        return false;
      }
    }

    function setEnabled(value) {
      enabled = Boolean(value);
      if (master && context) master.gain.setValueAtTime(enabled ? 0.16 : 0, context.currentTime);
      if (!enabled) setMusic(null);
      else unlock();
    }

    return { unlock, play, setEnabled, setMusic, isEnabled: () => enabled,
      getMusicWorld: () => musicWorld, supported: Boolean(AudioContextClass) };
  }

  window.createBombSoundPlayer = createBombSoundPlayer;
}());
