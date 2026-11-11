// Local respawn and poison-giant policy; keep upstream generation unchanged.
import { VirusField as UpstreamVirusField, WORLD_BOUNDS } from "./snake-upstream-v029/world.js";
import { GIANT_VIRUS_SIZE, virusType } from "./snake-virus-types.js?v=1.0";
export const VIRUS_RESPAWN_SECONDS = 10;
export class VirusField extends UpstreamVirusField {
  constructor(options) {
    super(options);
    this.giants = [];
    this.giantPoisonings = 0;
  }
  reset(seed) {
    super.reset(seed);
    this.giants = [];
    this.giantPoisonings = 0;
  }
  placeGiant(giant, player, blockers = [], heading = -Math.PI / 2) {
    const radius = GIANT_VIRUS_SIZE / 2;
    const obstacles = [...blockers, ...[...super.nearby(), ...this.giants].filter(v => !v.consumed && v.id !== giant.id && virusType(v).encircle)
      .map(v => ({ ...v, radius: virusType(v).size / 2 }))];
    const safe = p => p.x >= WORLD_BOUNDS.minX + radius + 60 && p.x <= WORLD_BOUNDS.maxX - radius - 60
      && p.y >= WORLD_BOUNDS.minY + radius + 60 && p.y <= WORLD_BOUNDS.maxY - radius - 60
      && Math.hypot(p.x-player.x,p.y-player.y) >= radius + 220
      && obstacles.every(b => Math.hypot(p.x-b.x,p.y-b.y) >= radius + (b.radius ?? 65) + 35);
    // Search nearby first, then the map. Never spawn on the player or choices.
    let spot;
    for (let ring = 0; ring < 8 && !spot; ring++) for (let i = 0; i < 32; i++) {
      const angle = heading + i * Math.PI / 16, distance = radius + 220 + ring * 180;
      const p = { x: player.x + Math.cos(angle)*distance, y: player.y + Math.sin(angle)*distance };
      if (safe(p)) { spot = p; break; }
    }
    if (!spot) for (let x = WORLD_BOUNDS.minX+radius+60; x <= WORLD_BOUNDS.maxX-radius-60 && !spot; x += radius) {
      for (let y = WORLD_BOUNDS.minY+radius+60; y <= WORLD_BOUNDS.maxY-radius-60; y += radius) {
        if (safe({x,y})) { spot = {x,y}; break; }
      }
    }
    if (!spot) return false;
    Object.assign(giant, spot, { homeX: spot.x, homeY: spot.y });
    return true;
  }
  spawnPoisonGiant(cycle, player, blockers = []) {
    if (!Number.isSafeInteger(cycle) || cycle <= this.giantPoisonings) return false;
    const giant = this.makeAnimated({ id: `poison-giant:${cycle}`, kind: "virus", tier: "giant",
      x: player.x, y: player.y, consumed: false }, () => 0.5);
    giant.color = "violet";
    giant.swayAmplitude = 0.04;
    if (!this.placeGiant(giant, player, blockers)) return false;
    this.giants.push(giant);
    this.giantPoisonings = cycle;
    return true;
  }
  nearby() {
    return [...super.nearby(), ...this.giants.filter(v => !v.consumed &&
      Math.hypot(v.x-this.center.x,v.y-this.center.y) < this.viewRadius + GIANT_VIRUS_SIZE/2)];
  }
  consume(id) {
    // The cycle marker prevents captured giants from returning on reload.
    const index = this.giants.findIndex(v => v.id === id);
    if (index >= 0) { this.giants.splice(index, 1); return; }
    super.consume(id);
  }
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
