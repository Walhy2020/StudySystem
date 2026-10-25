export const VACUUM_SECONDS = 3, VACUUM_RANGE = 260;
export class HoldVacuum {
  constructor() { this.reset(); }
  reset() { this.sources = new Set(); this.startedAt = -Infinity; }
  press(source, time) {
    if (!this.sources.size) this.startedAt = time;
    this.sources.add(source);
  }
  release(source) { this.sources.delete(source); }
  remaining(time) { return this.sources.size ? Math.max(0, VACUUM_SECONDS - (time - this.startedAt)) : 0; }
  active(time) { return this.remaining(time) > 0; }
}
export function speedForInput(config, angle, requestedAngle, poisoned = false) {
  const speed = config.speed * (poisoned ? config.poisonSpeedPercent / 100 : 1);
  if (!Number.isFinite(requestedAngle)) return speed;
  const delta = Math.atan2(Math.sin(requestedAngle - angle), Math.cos(requestedAngle - angle));
  return speed * (Math.abs(delta) <= .2 ? 1 + config.alignedSpeedBoost / 100 : 1);
}
export function pullViruses(viruses, head, angle, dt, range = VACUUM_RANGE) {
  for (const virus of viruses) {
    if (!["small", "medium"].includes(virus.tier)) continue;
    const dx = virus.x - head.x, dy = virus.y - head.y, distance = Math.hypot(dx, dy);
    const delta = Math.atan2(Math.sin(Math.atan2(dy, dx) - angle), Math.cos(Math.atan2(dy, dx) - angle));
    if (distance < 1 || distance > range || Math.abs(delta) > Math.PI / 3) continue;
    const step = Math.min(distance, (280 + distance * 2) * dt);
    virus.x -= dx / distance * step; virus.y -= dy / distance * step;
  }
}
export class PoisonState {
  constructor(time, config) { this.reset(time,config); }
  reset(time,config) { this.active=false; this.nextPoisonAt=time+config.poisonInterval; this.nextDamageAt=time+config.poisonTickInterval; this.poisonings=0; }
  snapshot() { return {active:this.active,nextPoisonAt:this.nextPoisonAt,nextDamageAt:this.nextDamageAt,poisonings:this.poisonings}; }
  restore(saved,time,config) {
    this.reset(time,config);
    if (!saved || typeof saved.active!=="boolean" || ![saved.nextPoisonAt,saved.nextDamageAt].every(Number.isFinite)) return;
    this.active=saved.active; this.nextPoisonAt=Math.max(time,saved.nextPoisonAt); this.nextDamageAt=Math.max(time,saved.nextDamageAt);
    this.poisonings=Number.isSafeInteger(saved.poisonings)&&saved.poisonings>=0?saved.poisonings:0;
  }
  configure(previous,next,time) {
    if (!this.active && previous.poisonInterval!==next.poisonInterval) this.nextPoisonAt=time+next.poisonInterval;
    if (this.active && previous.poisonTickInterval!==next.poisonTickInterval) this.nextDamageAt=time+next.poisonTickInterval;
  }
  update(time,config,damage) {
    if (!this.active && time>=this.nextPoisonAt) { this.active=true; this.nextDamageAt=time+config.poisonTickInterval; this.poisonings++; }
    if (this.active && time>=this.nextDamageAt) {
      const ticks=Math.min(100,1+Math.floor((time-this.nextDamageAt)/config.poisonTickInterval));
      damage(ticks*config.poisonTailLoss); this.nextDamageAt=time+config.poisonTickInterval;
    }
  }
  cure(stars,config,time) {
    if (!this.active || stars<config.antidoteCost) return {cured:false,stars};
    this.active=false; this.nextPoisonAt=time+config.poisonInterval; this.nextDamageAt=time+config.poisonTickInterval;
    return {cured:true,stars:stars-config.antidoteCost};
  }
}
