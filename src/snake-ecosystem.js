// Persistence adapter around unmodified Snake v0.2.9 runtime classes.
import { GlyphTrail } from "./snake-upstream-v029/trail.js";
const point = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && Math.abs(p.x) <= 30000 && Math.abs(p.y) <= 30000;
const finiteTree = value => value === null || typeof value === "boolean" || typeof value === "string" ||
  typeof value === "number" && Number.isFinite(value) || Array.isArray(value) && value.every(finiteTree) ||
  typeof value === "object" && value !== null && Object.values(value).every(finiteTree);

export function saveEcosystem(field, enemies) {
  return { field: { seed: field.seed, animationTime: field.animationTime, dropSerial: field.dropSerial,
    cells: [...field.cells], drops: field.drops }, enemies: { seed: enemies.seed, defeated: enemies.defeated,
    respawns: enemies.respawns, snakes: enemies.snakes.map(s => ({ ...s, trail: {
      points: s.trail.points, glyphs: s.trail.glyphs, spacing: s.trail.spacing, leadGap: s.trail.leadGap } })) } };
}

export function restoreEcosystem(saved, field, enemies) {
  if (!saved || !finiteTree(saved)) return false;
  const { field: f, enemies: e } = saved;
  const virus = v => point(v) && typeof v.id === "string" && ["small", "medium", "large", "super"].includes(v.tier) &&
    ["violet", "sky", "mint", "coral"].includes(v.color) &&
    ["swayPhase", "swayRate", "swayAmplitude", "pulsePhase", "pulseRate"].every(k => Number.isFinite(v[k]));
  if (!f || !e || !Number.isInteger(f.seed) || !Number.isFinite(f.animationTime) || f.animationTime < 0 ||
      !Number.isInteger(f.dropSerial) || f.dropSerial < 0 || !Array.isArray(f.cells) || f.cells.length > 2000 ||
      !f.cells.every(c => Array.isArray(c) && c.length === 2 && /^-?\d+,-?\d+$/.test(c[0]) && Array.isArray(c[1]) && c[1].length <= 20 && c[1].every(virus)) ||
      !Array.isArray(f.drops) || f.drops.length > 100 || !f.drops.every(virus) ||
      !Number.isInteger(e.seed) || !Number.isInteger(e.defeated) || e.defeated < 0 ||
      !Array.isArray(e.respawns) || e.respawns.length > 20 || !e.respawns.every(r => Number.isInteger(r.index) && r.index >= 0 && r.index < enemies.count && r.remaining >= 0 && r.remaining <= 10) ||
      !Array.isArray(e.snakes) || e.snakes.length > enemies.count || !e.snakes.every(s => point(s.head) && point(s.previousHead) &&
        /^virus-snake-\d+$/.test(s.id) && Number.isFinite(s.angle) && Number.isFinite(s.desiredAngle) && Number.isFinite(s.decisionIn) &&
        Number.isFinite(s.eaten) && ["violet", "sky", "mint", "coral"].includes(s.color) && s.trail &&
        Array.isArray(s.trail.points) && s.trail.points.length > 0 && s.trail.points.length < 10000 && s.trail.points.every(point) &&
        Array.isArray(s.trail.glyphs) && s.trail.glyphs.length <= 1000 && s.trail.glyphs.every(g => typeof g === "string" && [...g].length === 1) &&
        s.trail.spacing >= 16 && s.trail.spacing <= 200 && s.trail.leadGap >= 20 && s.trail.leadGap <= 260)) return false;
  field.reset(f.seed);
  field.cells = new Map(f.cells); field.drops = f.drops; field.dropSerial = f.dropSerial; field.animationTime = f.animationTime;
  enemies.reset({ x: 0, y: 0 }, e.seed);
  enemies.defeated = e.defeated; enemies.respawns = e.respawns;
  enemies.snakes = e.snakes.map(s => {
    const trail = new GlyphTrail(s.trail); trail.reset(s.trail.points, s.trail.glyphs);
    return { ...s, trail };
  });
  return true;
}
