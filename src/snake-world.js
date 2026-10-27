// StudySystem respawn policy; keep the imported world implementation unchanged.
import { VirusField as UpstreamVirusField } from "./snake-upstream-v029/world.js";
export const VIRUS_RESPAWN_SECONDS = 10;
export class VirusField extends UpstreamVirusField {
  advance(dt, speed, player = this.center, clearance = 160) {
    super.advance(dt, speed);
    if (!(dt > 0)) return;
    for (const cell of this.cells.values()) for (const virus of cell) {
      // Defeated-snake drops are one-time loot, not renewable world spawns.
      if (!virus.consumed || (virus.tier !== "small" && virus.tier !== "medium")) continue;
      const remaining = Number.isFinite(virus.respawnRemaining) ? virus.respawnRemaining : VIRUS_RESPAWN_SECONDS;
      virus.respawnRemaining = Math.max(0, remaining - dt);
      const x = virus.homeX ?? virus.x, y = virus.homeY ?? virus.y;
      if (virus.respawnRemaining > 1e-6 || Math.hypot(x-player.x,y-player.y) < clearance) continue;
      virus.x = x; virus.y = y; virus.consumed = false;
      delete virus.respawnRemaining;
    }
  }
}
