import { Soundscape as UpstreamSoundscape } from "./snake-upstream-v029/audio.js";

// Match the learning system's audible output without modifying upstream audio.
export class Soundscape extends UpstreamSoundscape {
  async unlock() {
    const active = await super.unlock();
    if (active) {
      this.master.gain.value = 1;
      this.music.gain.value = 0.9;
      this.effects.gain.value = 1.6;
    }
    return active;
  }
}
