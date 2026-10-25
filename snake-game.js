import { GlyphTrail, samplePath } from "./src/snake-upstream-v029/trail.js";
import { StarMotion } from "./src/snake-upstream-v029/motion.js";
import { VirusField, VIRUS_COLORS, WORLD_BOUNDS, setWorldSize, headingInsideMap } from "./src/snake-upstream-v029/world.js";
import { RunRewards, VIRUS_TYPES } from "./src/snake-upstream-v029/rewards.js";
import { findEnclosure } from "./src/snake-upstream-v029/enclosure.js";
import { VirusSnakes } from "./src/snake-upstream-v029/virus-snakes.js";
import { normalizeConfig } from "./src/snake-config.js?v=1.0";
import { setupTuning } from "./src/snake-tuning.js?v=1.0";
import { HoldVacuum, PoisonState, VACUUM_SECONDS, speedForInput, pullViruses } from "./src/snake-actions.js?v=1.0";
import { DEFAULT_BINDINGS, normalizeBindings, bindingError, keyLabel, buttonLabel } from "./src/snake-bindings.js?v=1.0";
import { createPoisonSprites } from "./src/snake-render-assets.js?v=1.0";
import { SteeringInput, actionForKey } from "./src/snake-upstream-v029/steering.js";
import { Soundscape } from "./src/snake-upstream-v029/audio.js";
import { StarBursts } from "./src/snake-upstream-v029/star-burst.js";
import { saveEcosystem, restoreEcosystem } from "./src/snake-ecosystem.js?v=1.0";
import { SnakeLearning, SNAKE_PROGRESS_KEY, readObject } from "./src/snake-learning.js?v=1.0";

const $ = (id) => document.getElementById(id);
const canvas = $("game");
const ctx = canvas.getContext("2d");
let storage;
try { storage = localStorage; } catch { /* Play remains available without storage. */ }
const words = window.MARIO_WORD_BANK || [];
const readings = word => window.MARIO_PINYIN_READINGS.getReadings(word, words);
let learning, demoCheckpoint = null, fullscreenPending = false;
const gamepad = window.createBombGamepadReader();
let lastSave = 0;
let config = normalizeConfig(readObject(storage, SNAKE_PROGRESS_KEY)?.config);
let bindings = normalizeBindings(readObject(storage, SNAKE_PROGRESS_KEY)?.bindings), bindingCapture = null;
let previousBindingButtons = new Set();
setWorldSize(config.mapSize);
const trail = new GlyphTrail({ spacing: config.spacing, leadGap: config.leadGap });
const virusField = new VirusField(), virusSnakes = new VirusSnakes({ count: config.virusSnakeCount });
const rewards = new RunRewards(config.growthPerSegment), controls = new SteeringInput();
const sound = new Soundscape(), starBursts = new StarBursts();
const vacuum = new HoldVacuum();
const poison = new PoisonState(0, config);
let padVacuumDown = false, padAntidoteDown = false, touchSteeringAngle = null;
let motion, viruses = [], target, autoSeekingVirus = true, directPadAngle = null, padNeedsNeutral = true;
let previousCamera, floorPattern, fieldTimer = 0, enclosureTimer = 0, captureFlash = null, capturedSuper = 0;
let lastDamageAt = -10, damageFlashUntil = -10, damageHits = 0, lastDamageCause = null;
let head, angle, desiredAngle, collected, foods, mode = "manual";
let paused = true, ready = false, pointer = null, viewWidth = 900, viewHeight = 550;
let zoom = 1, camera = { x: 800, y: 550 }, clock = 0, lastTime = 0;
let assets, poisonedAssets, metadata, lastWrong = -10, growthFlash = -10;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function notify(text) {
  $("message").textContent = text;
}

function syncSound() {
  const enabled = ready && !paused && !document.hidden && document.hasFocus() && !window.STUDY_CONTROLLER_MOUSE?.isActive() && !window.STUDY_FULLSCREEN_SHELL?.isHosting() && !window.STUDY_AUDIO?.isMuted();
  if (!enabled || !sound.enabled || !sound.context) void sound.setEnabled(enabled).catch(() => {});
}

function applyConfig(patch) {
  if (!ready) return;
  const previous = config;
  config = normalizeConfig(patch, config); setWorldSize(config.mapSize);
  poison.configure(previous,config,clock);
  motion?.configure(config); trail.setLayout(config.spacing, config.leadGap);
  rewards.threshold = config.growthPerSegment;
  growBody(rewards.addGrowth(0));
  if (previous.virusSnakeCount !== config.virusSnakeCount) virusSnakes.setCount(config.virusSnakeCount, head);
  if (previous.mapSize !== config.mapSize) {
    head = { x: clamp(head.x, WORLD_BOUNDS.minX + 150, WORLD_BOUNDS.maxX - 150), y: clamp(head.y, WORLD_BOUNDS.minY + 150, WORLD_BOUNDS.maxY - 150) };
    motion.x = head.x; motion.y = head.y; trail.reset([head, {x:head.x-1000,y:head.y}], trail.glyphs);
    virusField.reset(); virusSnakes.reset(head); camera = { ...head }; fitCamera(); previousCamera = { ...camera }; spawnFoods();
  }
  resize(); updateUI();
  tuning.sync(config, save());
  syncConfigurationViews();
  if (mode === "auto") $("tuningStatus").textContent = "演示中，参数仅本次生效";
}

// All settings share the existing Snake save; do not use upstream storage keys.
const tuning = setupTuning({ values: config, apply: applyConfig });
$("help-gamepadDeadzone").textContent = "过滤左摇杆漂移，越小越灵敏；右摇杆仍控制网页鼠标。";
function syncBindings() {
  for (const action of ["vacuum","antidote"]) for (const device of ["key","button"]) {
    const button=$("bind-"+action+"-"+device), capturing=bindingCapture?.action===action&&bindingCapture.device===device;
    button.textContent=capturing?"请按键…":device==="key"?keyLabel(bindings[action][device]):buttonLabel(bindings[action][device]);
    button.setAttribute("aria-pressed",String(capturing));
  }
}
function syncConfigurationViews() { document.documentElement.style.setProperty("--target-scale",config.targetScale); syncBindings(); }
function cancelBindingCapture() { bindingCapture=null; syncBindings(); }
function captureBinding(value) {
  if (!bindingCapture) return;
  const {action,device}=bindingCapture, error=bindingError(bindings,action,device,value);
  if (error) { $("bindingStatus").textContent=error; return; }
  bindings[action][device]=value; cancelBindingCapture();
  $("bindingStatus").textContent=save()?"快捷键已保存。":"快捷键仅本次生效。";
}
for (const action of ["vacuum","antidote"]) for (const device of ["key","button"]) $("bind-"+action+"-"+device).addEventListener("click",()=>{
  bindingCapture={action,device}; syncBindings(); $("bindingStatus").textContent=device==="key"?"请按下键盘按键，Esc 取消。":"请按下手柄按键，Esc 取消。";
});
$("resetBindings").addEventListener("click",()=>{ bindings=structuredClone(DEFAULT_BINDINGS); cancelBindingCapture(); save(); $("bindingStatus").textContent="已恢复默认快捷键。"; });
document.addEventListener("keydown",event=>{
  if (!bindingCapture) return;
  if (event.code==="Escape") { event.preventDefault(); event.stopImmediatePropagation(); cancelBindingCapture(); return; }
  if (bindingCapture.device==="key") { event.preventDefault(); event.stopImmediatePropagation(); if (!event.repeat) captureBinding(event.code); }
},true);
$("tuningClose").addEventListener("click",cancelBindingCapture);
syncConfigurationViews();
function closeTuning(focus = false) {
  cancelBindingCapture();
  $("tuningPanel").hidden = true;
  $("tuningToggle").setAttribute("aria-expanded", "false");
  if (focus) $("tuningToggle").focus({ preventScroll: true });
}
$("tuningToggle").addEventListener("click", () => {
  if (!$("tuningPanel").hidden) { closeSettings(); setPaused(true); }
});

function updateUI() {
  if (!learning) return;
  $("starScore").textContent = rewards.stars;
  $("starScore").parentElement.title=poison.active?`已中毒，解毒需要 ${config.antidoteCost} 颗星星`:"星星";
  $("antidoteButton").title=`解毒需要 ${config.antidoteCost} 颗星星`;
  $("antidoteButton").disabled=!poison.active || rewards.stars<config.antidoteCost;
  $("growthCount").textContent = `${rewards.growthPoints}/${rewards.threshold}`;
  $("growthCount").setAttribute("aria-label", `成长 ${rewards.growthPoints}，满 ${rewards.threshold} 长一节`);
  $("targetGlyph").textContent = $("fullscreenTarget").textContent = learning.prompt;
  $("missionLabel").textContent = learning.isPinyin ? "找汉字" : "找拼音";
  $("batchCount").textContent = `本批 ${learning.done.length}/${learning.targets.length}`;
  $("autoButton").setAttribute("aria-pressed", String(mode === "auto"));
  $("startButton").textContent = paused ? "继续" : mode === "auto" ? "接手" : "暂停";
  $("resumeButton").textContent = "继续出发";
  $("speakButton").disabled = !learning.current || window.STUDY_AUDIO?.isMuted();
  $("muteButton").textContent = window.STUDY_AUDIO?.isMuted() ? "已静音 · L1" : "声音开启 · L1";
  $("muteButton").setAttribute("aria-pressed", String(Boolean(window.STUDY_AUDIO?.isMuted())));
  $("startButton").disabled = $("resumeButton").disabled = !learning.targets.length;
}

function closeSettings(focus = false) {
  $("settingsMenu").hidden = true;
  $("settingsButton").setAttribute("aria-expanded", "false");
  if (focus) $("settingsButton").focus({ preventScroll: true });
}
$("settingsButton").addEventListener("click", () => {
  if (!$("settingsMenu").hidden) { closeSettings(true); return; }
  closeTuning();
  setPaused(true);
  $("settingsMenu").hidden = false;
  $("settingsButton").setAttribute("aria-expanded", "true");
});
$("closeSettings").addEventListener("click", () => closeSettings(true));
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !$("settingsMenu").hidden) { event.preventDefault(); closeSettings(true); }
});
window.addEventListener("studysystem:gamepad-back", event => {
  if (!$("tuningPanel").hidden) { event.preventDefault(); closeTuning(true); return; }
  if (!$("settingsMenu").hidden) { event.preventDefault(); closeSettings(true); }
});

function spawnFoods() {
  if (!learning.active) { foods = []; target = null; return; }
  virusField.sync(head, Math.max(850, Math.hypot(viewWidth, viewHeight) / zoom / 2 + 300));
  const halfW = viewWidth / zoom / 2 - 60, halfH = viewHeight / zoom / 2 - 65;
  const bounds = { left: Math.max(WORLD_BOUNDS.minX + 150, camera.x - halfW), right: Math.min(WORLD_BOUNDS.maxX - 150, camera.x + halfW),
    top: Math.max(WORLD_BOUNDS.minY + 150, camera.y - halfH), bottom: Math.min(WORLD_BOUNDS.maxY - 150, camera.y + halfH) };
  const bosses = virusField.nearby().filter(v => v.tier === "super");
  foods = [];
  for (const [index, option] of learning.options.entries()) {
    const candidates = Array.from({length: 48}, (_, i) => {
      const direction = angle + (index === 0 ? .85 : index === 1 ? -1.2 : 2.1) + i * 2.399963;
      const radius = Math.min(230 + Math.floor(i / 12) * 70, halfW * .85, halfH * .85);
      return { x: clamp(head.x + Math.cos(direction) * radius, bounds.left, bounds.right),
        y: clamp(head.y + Math.sin(direction) * radius, bounds.top, bounds.bottom) };
    });
    const safe = p => bosses.every(v => distance(v,p) > 288 / 2 + 65);
    const spot = candidates.find(p => safe(p) && distance(p,head) > 95 && foods.every(f => distance(p,f) > 125)) ||
      candidates.find(p => safe(p) && foods.every(f => distance(p,f) > 95));
    // Never force a learning choice into a super-virus hitbox; relocate the
    // obstructing world spawn instead when a narrow viewport has no safe space.
    const fallback = candidates.find(p => foods.every(f => distance(p,f) > 95)) || candidates[0];
    if (!spot) bosses.filter(v => distance(v,fallback) <= 209).forEach(v => virusField.consume(v.id));
    foods.push({ ...(spot || fallback), ...option });
  }
  target = foods.find(f => f.correct);
  refreshField();
}

function refreshField() {
  const radius = Math.max(850, Math.hypot(viewWidth, viewHeight) / zoom / 2 + 300);
  virusField.sync(head, radius);
  viruses = virusField.nearby().filter((virus) => {
    const type = VIRUS_TYPES.find((entry) => entry.tier === virus.tier);
    return type.encircle || foods.every(food => distance(virus, food) > type.size / 2 + 65);
  });
  const mapX = (head.x - WORLD_BOUNDS.minX) / WORLD_BOUNDS.size * 100;
  const mapY = (head.y - WORLD_BOUNDS.minY) / WORLD_BOUNDS.size * 100;
  $("mapDot").style.left = `${mapX}%`;
  $("mapDot").style.top = `${mapY}%`;
  $("mapView").style.left = `${mapX}%`;
  $("mapView").style.top = `${mapY}%`;
  $("mapView").style.width = `${viewWidth / zoom / WORLD_BOUNDS.size * 100}%`;
  $("mapView").style.height = `${viewHeight / zoom / WORLD_BOUNDS.size * 100}%`;
  fieldTimer = 0;
}

function reset() {
  learning = new SnakeLearning(words, storage, readings, Math.random, learning ?
    { counts: learning.counts, seen: learning.seen, history: learning.history } : {});
  head = { x: 0, y: 0 };
  angle = -0.35;
  motion = new StarMotion({ ...head, angle, ...config });
  desiredAngle = angle;
  collected = 0;
  pointer = null;
  controls.clear(); directPadAngle = null;
  vacuum.reset(); touchSteeringAngle = null;
  poison.reset(clock,config);
  rewards.reset(config.growthPerSegment); collected = 0;
  virusField.reset(); virusSnakes.setCount(config.virusSnakeCount, head); virusSnakes.reset(head);
  starBursts.clear(); capturedSuper = 0; captureFlash = null; enclosureTimer = fieldTimer = 0;
  lastDamageAt = damageFlashUntil = -10; damageHits = 0; lastDamageCause = null;
  growthFlash = -10;
  // Seed actual route history so the assembled body has a curve immediately.
  const history = [];
  for (let d = 0; d <= 1500; d += 3) {
    history.push({ x: head.x - d * 0.81, y: head.y + Math.sin(d / 135) * 96 });
  }
  // v0.2.9 uses a continuous star body; characters remain learning choices.
  trail.setLayout(config.spacing, config.leadGap);
  trail.reset(history, Array(8).fill("★"));
  camera = { x: 0, y: 0 };
  previousCamera = { ...camera };
  fitCamera();
  paused = true;
  $("pauseTitle").textContent = "小飞星 · 汉字长龙";
  $("pauseOverlay").hidden = false;
  spawnFoods();
  updateUI();
  notify("认字得星星，吃病毒攒成长", 5);
}

function setMode(next) {
  if (!ready) return;
  if (next !== mode) {
    if (next === "auto") { save(); demoCheckpoint = JSON.parse(JSON.stringify(snapshot())); }
    else if (demoCheckpoint) { restore(demoCheckpoint); demoCheckpoint = null; }
  }
  mode = next;
  vacuum.reset(); touchSteeringAngle = null;
  if (mode === "auto" && learning.complete) { learning.nextBatch(); spawnFoods(); }
  pointer = null;
  paused = !learning.active;
  $("pauseOverlay").hidden = paused;
  desiredAngle = angle;
  updateUI();
  syncSound();
  notify(mode === "auto" ? "自动演示" : "轮到你啦！找到上面的目标字");
}

function setPaused(value, title = "休息一下") {
  if (!ready) return;
  paused = value;
  pointer = null;
  controls.clear(); directPadAngle = null;
  padNeedsNeutral = true;
  vacuum.reset(); touchSteeringAngle = null; if (motion) motion.speed = config.speed;
  $("pauseTitle").textContent = !learning.targets.length ? "所有汉字已掌握，暂无可学目标" : title;
  $("pauseOverlay").hidden = !value;
  gamepad.reset();
  syncSound();
  updateUI();
  save();
}

function snapshot() {
  return { version: 2, upstream: "0.2.9", config: { ...config }, learning: learning.snapshot(), head: { ...head }, angle, desiredAngle,
    collected, glyphs: trail.glyphs.slice(), points: trail.points.map(p => ({ ...p })), foods,
    camera: { ...camera }, ecosystem: saveEcosystem(virusField, virusSnakes), clock,
    rewards: { stars: rewards.stars, growthPoints: rewards.growthPoints, glyphs: [...rewards.glyphs] },
    damageHits, lastDamageAt, damageFlashUntil, capturedSuper, bindings:structuredClone(bindings), poison:poison.snapshot() };
}
function save() {
  if (!ready || mode === "auto" || window.STUDY_FULLSCREEN_SHELL?.isHosting() || !storage) return false;
  try { storage.setItem(SNAKE_PROGRESS_KEY, JSON.stringify(snapshot())); return true; }
  catch { return false; }
}
function restore(saved) {
  const point = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && Math.abs(p.x) <= 30000 && Math.abs(p.y) <= 30000;
  if (![1, 2].includes(saved.version) || !point(saved.head) || !Number.isFinite(saved.angle) ||
      !Array.isArray(saved.points) || !saved.points.length || saved.points.length > 100000 || !saved.points.every(point) ||
      !Array.isArray(saved.glyphs) || saved.glyphs.length > 5000 || !saved.glyphs.every(g => typeof g === "string" && [...g].length === 1)) return false;
  config = normalizeConfig(saved.config); setWorldSize(config.mapSize);
  bindings=normalizeBindings(saved.bindings);
  trail.setLayout(config.spacing, config.leadGap);
  learning = new SnakeLearning(words, storage, readings, Math.random, saved.learning);
  if (learning.complete) learning.nextBatch();
  head = { ...saved.head }; angle = saved.angle;
  motion = new StarMotion({ ...head, angle, ...config });
  desiredAngle = Number.isFinite(saved.desiredAngle) ? saved.desiredAngle : angle;
  collected = Number.isSafeInteger(saved.collected) && saved.collected >= 0 ? saved.collected : 0;
  trail.reset(saved.points, saved.version === 1 ? saved.glyphs.map(() => "★") : saved.glyphs);
  rewards.reset(config.growthPerSegment); rewards.stars = collected;
  if (saved.version === 2 && saved.rewards) {
    const r = saved.rewards;
    rewards.growthPoints = Number.isSafeInteger(r.growthPoints) && r.growthPoints >= 0 && r.growthPoints < rewards.threshold ? r.growthPoints : 0;
    rewards.glyphs = new Set(Array.isArray(r.glyphs) ? r.glyphs.filter(g => typeof g === "string" && [...g].length === 1) : []);
  }
  virusField.reset(); virusSnakes.setCount(config.virusSnakeCount, head); virusSnakes.reset(head);
  restoreEcosystem(saved.ecosystem, virusField, virusSnakes);
  clock = Number.isFinite(saved.clock) && saved.clock >= 0 ? saved.clock : 0;
  poison.restore(saved.poison,clock,config);
  damageHits = Number.isSafeInteger(saved.damageHits) && saved.damageHits >= 0 ? saved.damageHits : 0;
  lastDamageAt = Number.isFinite(saved.lastDamageAt) ? saved.lastDamageAt : -10;
  damageFlashUntil = Number.isFinite(saved.damageFlashUntil) ? saved.damageFlashUntil : -10;
  capturedSuper = Number.isSafeInteger(saved.capturedSuper) && saved.capturedSuper >= 0 ? saved.capturedSuper : 0;
  captureFlash = null; starBursts.clear();
  camera = point(saved.camera) ? { ...saved.camera } : { ...head };
  fitCamera();
  previousCamera = { ...camera };
  // Restore exact option positions only while they still match the sanitized question.
  const matches = Array.isArray(saved.foods) && saved.foods.length === learning.options.length &&
    saved.foods.every(f => point(f) && learning.options.some(o => o.wordId === f.wordId && o.glyph === f.glyph && o.correct === f.correct)) &&
    new Set(saved.foods.map(f => f.wordId)).size === saved.foods.length;
  if (matches) foods = saved.foods.map(f => ({ ...f })); else spawnFoods();
  target = foods.find(f => f.correct); refreshField();
  paused = true; pointer = null; controls.clear(); directPadAngle = null;
  vacuum.reset(); touchSteeringAngle = null;
  tuning.sync(config);
  syncConfigurationViews();
  return true;
}
function resume() {
  if (!ready || window.STUDY_CONTROLLER_MOUSE?.isActive()) return;
  closeTuning();
  closeSettings();
  if (mode === "auto") setMode("manual");
  if (learning.complete) { learning.nextBatch(); spawnFoods(); }
  if (!learning.active) return;
  window.STUDY_GAMEPAD_CURSOR?.leaveMenu();
  setPaused(false); canvas.focus({ preventScroll: true });
}

function resize() {
  const box = canvas.getBoundingClientRect();
  viewWidth = box.width;
  viewHeight = box.height;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(viewWidth * dpr);
  canvas.height = Math.round(viewHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Keep world-space scale consistent across tall phones and wide screens.
  zoom = (viewWidth < 500 ? 0.77 : Math.min(1.1, viewWidth / 820)) * config.zoom;
  fitCamera();
  if (ready) refreshField();
}

function fitCamera() {
  camera.x = clamp(camera.x, WORLD_BOUNDS.minX + viewWidth / zoom / 2, WORLD_BOUNDS.maxX - viewWidth / zoom / 2);
  camera.y = clamp(camera.y, WORLD_BOUNDS.minY + viewHeight / zoom / 2, WORLD_BOUNDS.maxY - viewHeight / zoom / 2);
}

function growBody(count) {
  for (let index = 0; index < count; index++) trail.grow("★");
  if (count > 0) {
    trail.setLayout(config.spacing, config.leadGap);
    growthFlash = clock;
  }
}

function takeDamage(cause) {
  if (clock - lastDamageAt < config.damageCooldown) return false;
  const lost = trail.shrink(2);
  lastDamageAt = clock;
  damageFlashUntil = clock + 0.8;
  damageHits += 1;
  lastDamageCause = cause;
  sound.play("damage");
  updateUI();
  notify(lost ? `${cause}！尾巴掉了 ${lost} 节，快转向避开！`
    : `${cause}！尾巴已经掉光，快转向避开！`, 1.2);
  return true;
}

function update(dt) {
  clock += dt;
  const wasPoisoned=poison.active;
  poison.update(clock,config,loss=>{ trail.shrink(loss); damageHits++; lastDamageCause="中毒"; sound.play("damage"); });
  if (wasPoisoned!==poison.active) updateUI();
  let directTurnRate = null, movementRequest = null;
  if (mode === "auto") {
    const nearestVirus = autoSeekingVirus && viruses.filter(virus => virus.tier !== "super").reduce((nearest, virus) =>
      !nearest || distance(head, virus) < distance(head, nearest) ? virus : nearest, null);
    const destination = nearestVirus || target;
    if (destination) desiredAngle = Math.atan2(destination.y - head.y, destination.x - head.x);
  }
  else if (pointer) {
    const destination = { x: (pointer.x - viewWidth / 2) / zoom + camera.x,
      y: (pointer.y - viewHeight / 2) / zoom + camera.y };
    if (distance(head, destination) > config.pointerDeadzone) movementRequest = desiredAngle = Math.atan2(destination.y - head.y, destination.x - head.x);
  } else if (directPadAngle !== null) {
    movementRequest = desiredAngle = directPadAngle;
  } else if (touchSteeringAngle !== null) {
    movementRequest = desiredAngle = touchSteeringAngle;
  } else {
    const input = controls.read();
    if (input.turn !== null) {
      desiredAngle = angle;
      directTurnRate = input.turn * config.keyboardTurnSpeed * Math.PI / 180;
    } else if (input.angle !== null) movementRequest = desiredAngle = input.angle;
  }
  motion.speed = speedForInput(config, angle, movementRequest);
  const boundedAngle = mode === "auto" ? headingInsideMap(head, desiredAngle) : desiredAngle;
  motion.advance(boundedAngle, dt, boundedAngle === desiredAngle ? directTurnRate : null);
  const hitBoundary = mode !== "auto" && (motion.x < WORLD_BOUNDS.minX + 65 || motion.x > WORLD_BOUNDS.maxX - 65
    || motion.y < WORLD_BOUNDS.minY + 65 || motion.y > WORLD_BOUNDS.maxY - 65);
  motion.x = clamp(motion.x, WORLD_BOUNDS.minX + 65, WORLD_BOUNDS.maxX - 65);
  motion.y = clamp(motion.y, WORLD_BOUNDS.minY + 65, WORLD_BOUNDS.maxY - 65);
  head = { x: motion.x, y: motion.y };
  angle = motion.angle;
  trail.moveTo(head);
  if (hitBoundary) takeDamage("撞到边界");
  virusField.advance(dt, config.virusDriftSpeed);
  fieldTimer += dt;
  if (target && distance(head, target) > 650) spawnFoods();
  else if (fieldTimer >= 0.3) refreshField();
  const npcEaten = virusSnakes.advance(dt, { speed:config.virusSnakeSpeed, player:head, foods:viruses,
    recycleDistance:Math.max(2400,Math.hypot(viewWidth,viewHeight)/zoom/2+500),
    consume:id=>virusField.consume(id) });
  if (npcEaten.length) {
    const ids=new Set(npcEaten);
    viruses=viruses.filter(virus=>!ids.has(virus.id));
  }
  const defeated = virusSnakes.defeatOnBody(head, trail.positions(), config.bodySize / 2 + 18);
  if (defeated.length) {
    let dropped = 0;
    for (const snake of defeated) dropped += virusField.spill(snake.head, snake.length).length;
    refreshField();
    notify(`病毒蛇撞上星星身体，散成 ${dropped} 颗可吃的病毒！`, 3);
  }
  const food = foods.find(item => distance(head,item) < 31);
  if (food?.correct) {
    const result = learning.answer(food.wordId);
    rewards.collectGlyph(result.word.char); collected = rewards.stars;
    starBursts.add(food.x, food.y, clock); sound.play("glyph");
    if (result.complete) learning.nextBatch();
    autoSeekingVirus = true; spawnFoods(); updateUI();
    save();
  } else if (food && clock - lastWrong > 2.5) {
    lastWrong = clock; learning.answer(food.wordId); takeDamage("认错目标"); spawnFoods(); save();
  }
  if (vacuum.active(clock)) pullViruses(viruses, head, angle, dt, config.vacuumRange);
  const virus = viruses.find((item) => {
    const type = VIRUS_TYPES.find((entry) => entry.tier === item.tier);
    return !type.encircle && distance(head, item) < type.size / 2 + 12;
  });
  if (virus) {
    const type = VIRUS_TYPES.find((entry) => entry.tier === virus.tier);
    const value = config[type.valueKey];
    const grown = rewards.addGrowth(value);
    growBody(grown);
    sound.play(grown ? "growth" : "virus");
    virusField.consume(virus.id);
    viruses = viruses.filter((item) => item.id !== virus.id);
    autoSeekingVirus = false;
    notify(`${type.label} +${value} 成长${grown ? `，长了 ${grown} 节！` : `，还差 ${rewards.threshold - rewards.growthPoints} 点长一节`}`);
    updateUI();
  }
  enclosureTimer += dt;
  if (enclosureTimer >= Math.min(0.08, config.enclosureGap / Math.max(1, motion.speed))) {
    enclosureTimer = 0;
    const superType = VIRUS_TYPES.find(type => type.encircle);
    const bosses = viruses.filter(item => item.tier === "super");
    const enclosure = findEnclosure(trail.points, {
      bodyLength: trail.leadGap + (trail.glyphs.length - 1) * trail.spacing,
      bodyRadius: config.bodySize * 0.35, closureGap: config.enclosureGap,
    }, bosses.map(boss => ({ ...boss, radius: superType.size / 2 })));
    if (enclosure) {
      const ids = new Set(enclosure.enclosed.map(boss => boss.id));
      for (const id of ids) virusField.consume(id);
      viruses = viruses.filter(item => !ids.has(item.id));
      const value = ids.size * config.superVirusValue;
      const grown = rewards.addGrowth(value);
      growBody(grown);
      sound.play("capture");
      capturedSuper += ids.size;
      captureFlash = { polygon: enclosure.polygon, until: clock + 1 };
      notify(`圈住超级病毒啦！成长 +${value}${grown ? `，长了 ${grown} 节！` : ""}`, 4);
      updateUI();
    }
  }
  const superType = VIRUS_TYPES.find(type => type.encircle);
  const hitSuper = viruses.some(virus => virus.tier === "super" && distance(head, virus) < superType.size / 2 + 20);
  const hitSnake = virusSnakes.snakes.some(snake => distance(head, snake.head) < 44
    || snake.trail.positions().some(segment => distance(head, segment) < 32));
  if (hitSuper) takeDamage("碰到超级病毒");
  else if (hitSnake) takeDamage("碰到病毒蛇");
  previousCamera = { ...camera };
  const follow = 1 - Math.exp(-dt * config.cameraFollow);
  const halfWidth = viewWidth / zoom / 2, halfHeight = viewHeight / zoom / 2;
  camera.x += (clamp(head.x, WORLD_BOUNDS.minX + halfWidth, WORLD_BOUNDS.maxX - halfWidth) - camera.x) * follow;
  camera.y += (clamp(head.y, WORLD_BOUNDS.minY + halfHeight, WORLD_BOUNDS.maxY - halfHeight) - camera.y) * follow;
}

function tile(x, y, size, glyph, alpha = 1, sprite = assets.segment) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
  if (glyph) {
    ctx.font = `700 ${Math.round(size * 0.49)}px "Microsoft YaHei", "PingFang SC", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#685035";
    if ([...glyph].length > 1) {
      const rows = glyph.split(" / ");
      ctx.font = `700 ${Math.min(21, 45 / Math.max(...rows.map(r => r.length)) * 1.5)}px "Microsoft YaHei", sans-serif`;
      rows.forEach((row, i) => ctx.fillText(row, x, y + (i - (rows.length - 1) / 2) * 17, size - 10));
    } else ctx.fillText(glyph, x, y + size * 0.018);
  }
  ctx.restore();
}

function choiceTile(x, y, glyph) {
  ctx.save();
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const direction = i * Math.PI / 3;
    const px = x + Math.cos(direction) * 38, py = y + Math.sin(direction) * 38;
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = "#fff5d9";
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.lineJoin = "round"; ctx.lineWidth = 3; ctx.strokeStyle = "#b68b3e"; ctx.stroke();
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = "#5e452c";
  const rows = glyph.split(" / ");
  const chinese = /^[\p{Script=Han}]$/u.test(glyph);
  const fontSize = chinese ? 35 : Math.min(24, 76 / Math.max(...rows.map(row => row.length)) * 1.5);
  ctx.font = `700 ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
  rows.forEach((row, i) => ctx.fillText(row, x, y + (i - (rows.length - 1) / 2) * 18 + 1, 61));
  ctx.restore();
}

function draw(alpha) {
  const lag = paused ? 0 : motion.speed / config.physicsHz * (1 - alpha);
  const renderHead = samplePath(trail.points, [lag])[0];
  const renderCamera = paused ? camera : {
    x: previousCamera.x + (camera.x - previousCamera.x) * alpha,
    y: previousCamera.y + (camera.y - previousCamera.y) * alpha,
  };
  ctx.clearRect(0, 0, viewWidth, viewHeight);
  ctx.save();
  ctx.translate(viewWidth / 2, viewHeight / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-renderCamera.x, -renderCamera.y);
  const left = renderCamera.x - viewWidth / zoom / 2 - 2, top = renderCamera.y - viewHeight / zoom / 2 - 2;
  ctx.fillStyle = "#508a94";
  ctx.fillRect(left, top, viewWidth / zoom + 4, viewHeight / zoom + 4);
  ctx.fillStyle = floorPattern;
  const floorLeft = Math.max(left, WORLD_BOUNDS.minX), floorTop = Math.max(top, WORLD_BOUNDS.minY);
  ctx.fillRect(floorLeft, floorTop, Math.min(left + viewWidth / zoom + 4, WORLD_BOUNDS.maxX) - floorLeft,
    Math.min(top + viewHeight / zoom + 4, WORLD_BOUNDS.maxY) - floorTop);
  ctx.strokeStyle = "#d9f3ed";
  ctx.lineWidth = 10;
  ctx.strokeRect(WORLD_BOUNDS.minX, WORLD_BOUNDS.minY, WORLD_BOUNDS.size, WORLD_BOUNDS.size);
  if (vacuum.active(clock)) {
    ctx.save(); ctx.translate(renderHead.x, renderHead.y); ctx.rotate(angle);
    const glow = ctx.createRadialGradient(0,0,15,0,0,config.vacuumRange);
    glow.addColorStop(0,"#cfffff88"); glow.addColorStop(1,"#bcffff0a");
    ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,config.vacuumRange,-Math.PI/3,Math.PI/3); ctx.closePath();
    ctx.fillStyle = glow; ctx.fill(); ctx.strokeStyle = "#d3ffffaa"; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const direction = (i - 2) * Math.PI / 8, reach = config.vacuumRange * (1 - (clock * 1.7 + i * .17) % 1);
      ctx.beginPath(); ctx.arc(0,0,Math.max(20,reach),direction-.13,direction+.13); ctx.stroke();
    }
    ctx.lineWidth = 4; ctx.strokeStyle = "#a5ffff"; ctx.beginPath();
    ctx.arc(0,0,68,-Math.PI/2,-Math.PI/2+Math.PI*2*vacuum.remaining(clock)/VACUUM_SECONDS); ctx.stroke();
    ctx.restore();
  }
  if (captureFlash && clock < captureFlash.until) {
    ctx.save();
    ctx.globalAlpha = (captureFlash.until - clock) * 0.4;
    ctx.beginPath();
    captureFlash.polygon.forEach((point, i) => i ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.closePath();
    ctx.fillStyle = "#ffe39a";
    ctx.fill();
    ctx.restore();
  }
  for (const virus of viruses) {
    const type = VIRUS_TYPES.find((entry) => entry.tier === virus.tier);
    const { rotation, scale } = virusField.pose(virus);
    const visibleMargin = type.size * Math.max(1, scale) / 2 + 25;
    if (Math.abs(virus.x - renderCamera.x) > viewWidth / zoom / 2 + visibleMargin
      || Math.abs(virus.y - renderCamera.y) > viewHeight / zoom / 2 + visibleMargin) continue;
    ctx.save();
    ctx.translate(virus.x, virus.y);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);
    ctx.drawImage(assets.virusPalettes[virus.tier][virus.color] || assets[type.asset] || assets.virus,
      -type.size / 2, -type.size / 2, type.size, type.size);
    ctx.restore();
    ctx.font = `${type.encircle ? "800 17" : virus.tier === "small" ? "600 12" : "700 14"}px "Microsoft YaHei", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.lineWidth = type.encircle ? 5 : 3;
    ctx.strokeStyle = "#fffdf4";
    const label = `${type.encircle ? "圈住吃 " : ""}+${config[type.valueKey]}`;
    ctx.strokeText(label, virus.x, virus.y + type.size / 2 + 3);
    ctx.fillStyle = type.encircle ? "#87541f" : "#806e92";
    ctx.fillText(label, virus.x, virus.y + type.size / 2 + 3);
  }
  for (const snake of virusSnakes.snakes) {
    if (Math.abs(snake.head.x-renderCamera.x)>viewWidth/zoom/2+450
      ||Math.abs(snake.head.y-renderCamera.y)>viewHeight/zoom/2+450) continue;
    const body=snake.trail.positions();
    for (let index=body.length-1;index>=0;index--) {
      const point=body[index],size=20+4*(1-index/Math.max(1,body.length-1));
      ctx.drawImage(assets.virusPalettes.small[snake.color],point.x-size/2,point.y-size/2,size,size);
    }
    ctx.drawImage(assets.virusPalettes.large[snake.color],snake.head.x-24,snake.head.y-24,48,48);
  }
  // Independent image sprites, not a stretched full-character illustration.
  for (const food of foods) {
    if (Math.abs(food.x - renderCamera.x) > viewWidth / zoom / 2 + 75
      || Math.abs(food.y - renderCamera.y) > viewHeight / zoom / 2 + 75) continue;
    const bob = Math.sin(clock * 2 + food.x) * 2;
    ctx.save();
    ctx.shadowColor = "#326e7540";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 5;
    choiceTile(food.x, food.y + bob, food.glyph);
    ctx.restore();
  }
  const segments = trail.positions(lag);
  ctx.save();
  const bodyAssets = poison.active ? poisonedAssets : assets;
  if (clock < damageFlashUntil && Math.floor(clock * 22) % 2 === 0) ctx.globalAlpha = 0.2;
  // Small stars bridge the tips, so the body reads as one continuous star chain.
  const links = samplePath(trail.points, segments.map((_, i) => lag + trail.leadGap + (i - 0.5) * trail.spacing));
  for (const link of links) tile(link.x, link.y, config.bodySize * 0.54, "", 1, bodyAssets.segment);
  for (let i = segments.length - 1; i >= 0; i--) {
    const item = segments[i];
    const newlyGrown = i === segments.length - 1 && clock - growthFlash < 0.65;
    const size = newlyGrown ? config.bodySize * (1 + Math.sin((clock - growthFlash) / 0.65 * Math.PI) * 0.135) : config.bodySize;
    tile(item.x, item.y, size, "", 1, bodyAssets.segment);
  }
  if (segments.length) {
    const neck = trail.neck(lag);
    tile(neck.x, neck.y, config.bodySize * 0.69, "", 1, bodyAssets.segment);
  }
  ctx.save();
  ctx.translate(renderHead.x, renderHead.y - 4 + Math.sin(clock * 3) * config.hover);
  ctx.rotate(clamp(motion.turnRate / motion.maxTurnRate, -1, 1) * config.headBank * Math.PI / 180);
  ctx.shadowColor = "#4a57362b";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 7;
  const scale = config.headSize / metadata.head.width;
  ctx.drawImage(bodyAssets.head, -metadata.head.anchor.x * scale, -metadata.head.anchor.y * scale,
    metadata.head.width * scale, metadata.head.height * scale);
  ctx.restore();
  for (const star of starBursts.active(clock)) {
    ctx.save();
    ctx.translate(star.x, star.y);
    ctx.rotate(star.rotation);
    ctx.globalAlpha *= star.opacity;
    ctx.shadowColor = "#fff1a2";
    ctx.shadowBlur = 9;
    ctx.drawImage(assets.segment, -star.size / 2, -star.size / 2, star.size, star.size);
    ctx.restore();
  }
  if (poison.active) {
    ctx.fillStyle="#72e76088"; ctx.strokeStyle="#337d2fbb"; ctx.lineWidth=1.5;
    for (let i=0;i<9;i++) {
      const phase=(clock*.7+i*.173)%1, px=renderHead.x+Math.sin(i*2.4+clock)*55, py=renderHead.y-15-phase*95;
      ctx.beginPath(); ctx.arc(px,py,3+(i%3)*2,0,Math.PI*2); ctx.fill(); ctx.stroke();
    }
  }
  ctx.restore();
  ctx.restore();
}

function syncFullscreenState() {
  const active = Boolean(window.STUDY_FULLSCREEN_SHELL?.isFullscreen() || document.fullscreenElement);
  if (document.body.classList.contains("snake-fullscreen") === active) return;
  document.body.classList.toggle("snake-fullscreen", active);
  $("fullscreenTarget").hidden = !active;
  if (active) { closeSettings(); closeTuning(); }
}
document.addEventListener("fullscreenchange", syncFullscreenState);

function frame(time) {
  let remaining = Math.min((time - lastTime) / 1000 || 0, 0.25);
  lastTime = time;
  if (window.STUDY_FULLSCREEN_SHELL?.isHosting()) { requestAnimationFrame(frame); return; }
  syncFullscreenState();
  pollGamepad(time);
  if (ready) {
    // Substeps preserve collision checks and smooth route samples on slower devices.
    while (!paused && !document.hidden && document.hasFocus() && !window.STUDY_CONTROLLER_MOUSE?.isActive() && remaining > 0) {
      const step = Math.min(remaining, 1 / config.physicsHz);
      update(step);
      remaining -= step;
    }
    draw(1);
    if (time - lastSave > 1000) { lastSave = time; save(); }
  }
  requestAnimationFrame(frame);
}

function steer(direction) {
  if (!ready || paused || window.STUDY_CONTROLLER_MOUSE?.isActive()) return;
  if (mode !== "manual") setMode("manual");
  pointer = null; controls.clear(); directPadAngle = null;
  desiredAngle = { up: -Math.PI / 2, right: 0, down: Math.PI / 2, left: Math.PI }[direction];
}

document.addEventListener("keydown", (event) => {
  if (window.STUDY_FULLSCREEN_SHELL?.isHosting() || nativeTarget(event.target) || window.STUDY_CONTROLLER_MOUSE?.isActive()) return;
  const action = actionForKey(event.key);
  if (event.code === bindings.vacuum.key && !paused) { event.preventDefault(); if (!event.repeat) startVacuum("keyboard"); }
  if (event.code === bindings.antidote.key && !paused) { event.preventDefault(); if (!event.repeat) attemptAntidote(); }
  if (action && !paused) { event.preventDefault(); controls.press(event.code, action); directPadAngle = null; pointer = null; }
  if (event.code === "Space") { event.preventDefault(); if (!event.repeat) { if (paused) resume(); else setPaused(true); } }
});
document.addEventListener("keyup", event => { controls.release(event.code); if (event.code === bindings.vacuum.key) vacuum.release("keyboard"); });
function startVacuum(source) { if (ready && !paused && mode === "manual") vacuum.press(source, clock); }
function attemptAntidote() {
  if (!ready || paused || mode!=="manual") return;
  const result=poison.cure(rewards.stars,config,clock);
  if (result.cured) { rewards.stars=collected=result.stars; sound.play("growth"); updateUI(); save(); }
  else if (poison.active) notify(`解毒需要 ${config.antidoteCost} 颗星星`);
}
function nativeTarget(target) {
  return target instanceof Element && target !== canvas && Boolean(target.closest('a,button,input,textarea,select,summary,[contenteditable]:not([contenteditable="false"]),[role="button"],[role="link"],[role="checkbox"],[role="radio"],[role="switch"],[role="slider"],[role="tab"],[role="menuitem"],[role="option"],[role="combobox"],[tabindex]'));
}
$("startButton").addEventListener("click", () => { if (paused || mode === "auto") resume(); else setPaused(true); });
$("autoButton").addEventListener("click", () => { closeSettings(); setMode("auto"); window.STUDY_GAMEPAD_CURSOR?.leaveMenu(); canvas.focus({ preventScroll: true }); });
$("resetButton").addEventListener("click", () => {
  if (!ready) return;
  if (demoCheckpoint) restore(demoCheckpoint);
  mode = "manual"; demoCheckpoint = null;
  closeSettings(); closeTuning();
  reset(); save();
});
$("resumeButton").addEventListener("click", resume);
document.querySelectorAll("[data-direction]").forEach((button) => {
  button.addEventListener("pointerdown", event => {
    if (paused) return;
    steer(button.dataset.direction); touchSteeringAngle = desiredAngle; button.setPointerCapture(event.pointerId);
  });
  for (const name of ["pointerup","pointercancel","lostpointercapture"]) button.addEventListener(name, () => { touchSteeringAngle = null; });
  button.addEventListener("click", () => { steer(button.dataset.direction); canvas.focus({ preventScroll: true }); });
});
$("vacuumButton").addEventListener("pointerdown", event => { event.preventDefault(); startVacuum("touch"); event.currentTarget.setPointerCapture(event.pointerId); });
for (const name of ["pointerup","pointercancel","lostpointercapture"]) $("vacuumButton").addEventListener(name, () => vacuum.release("touch"));
$("antidoteButton").addEventListener("click",attemptAntidote);
function pointerPosition(event) {
  const rect = canvas.getBoundingClientRect();
  pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
}
canvas.addEventListener("pointerdown", (event) => {
  if (!ready || paused) return;
  event.preventDefault();
  if (mode !== "manual") setMode("manual");
  canvas.focus({ preventScroll: true });
  canvas.setPointerCapture(event.pointerId);
  controls.clear(); directPadAngle = null;
  pointerPosition(event);
});
canvas.addEventListener("pointermove", (event) => { if (pointer) pointerPosition(event); });
for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) canvas.addEventListener(name, () => { pointer = null; });
function releaseInput() {
  pointer = null; controls.clear(); directPadAngle = touchSteeringAngle = null;
  vacuum.reset(); gamepad.reset(); padNeedsNeutral = true;
  save(); syncSound();
}
window.addEventListener("blur", releaseInput);
window.addEventListener("focus", syncSound);
document.addEventListener("visibilitychange", releaseInput);
$("speakButton").addEventListener("click", () => {
  if (!("speechSynthesis" in window)) { notify("这台浏览器暂时没有朗读功能"); return; }
  if (!learning.current || window.STUDY_AUDIO?.isMuted()) return;
  const speech = new SpeechSynthesisUtterance(learning.current.char);
  speech.lang = "zh-CN";
  speech.rate = 0.8;
  speech.onerror = () => notify("朗读暂时不可用，可以先看字继续玩");
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(window.STUDY_AUDIO?.prepareSpeech(speech) || speech);
});
window.addEventListener("studysystem:audiochange", () => { syncSound(); updateUI(); });
$("muteButton").addEventListener("click", () => { window.STUDY_AUDIO?.toggle(); });
async function fullscreen() {
  if (fullscreenPending) return;
  fullscreenPending = true;
  try { await window.STUDY_FULLSCREEN_SHELL.toggleFullscreen(); }
  catch (error) { console.warn("浏览器未允许全屏切换", error); }
  finally { fullscreenPending = false; }
}
$("fullscreenButton").addEventListener("click", fullscreen);
window.addEventListener("studysystem:gamepad-fullscreen", fullscreen);
window.addEventListener("studysystem:controller-mouse", releaseInput);
for (const name of ["pagehide", "studysystem:fullscreen-navigation", "studysystem:update-prompt"]) {
  window.addEventListener(name, () => { releaseInput(); window.speechSynthesis?.cancel(); });
}
window.addEventListener("gamepaddisconnected", releaseInput);
function pollGamepad(time) {
  window.STUDY_GAMEPAD_CURSOR?.poll(time);
  const enabled = ready && !document.hidden && document.hasFocus() && !window.STUDY_CONTROLLER_MOUSE?.isActive() &&
    $("settingsMenu").hidden && $("tuningPanel").hidden && !window.STUDY_FULLSCREEN_SHELL?.isHosting();
  const input = gamepad.poll(enabled);
  const freshButtons=input.pressedButtons.filter(button=>!previousBindingButtons.has(button));
  previousBindingButtons=new Set(input.pressedButtons);
  if (bindingCapture?.device==="button" && freshButtons.length) captureBinding(freshButtons[0]);
  const vacuumPressed = input.pressedButtons.includes(bindings.vacuum.button);
  if (enabled && !paused && vacuumPressed && !padVacuumDown) startVacuum("pad");
  if (!enabled || paused || !vacuumPressed) vacuum.release("pad");
  padVacuumDown = vacuumPressed;
  const antidotePressed=input.pressedButtons.includes(bindings.antidote.button);
  if (enabled&&!paused&&antidotePressed&&!padAntidoteDown) attemptAntidote();
  padAntidoteDown=antidotePressed;
  if (!enabled) { directPadAngle = null; padNeedsNeutral = true; return; }
  if ((input.confirm || input.mushroom && !window.STUDY_GAMEPAD_CURSOR?.isMenuActive()) && (input.confirm || paused || !nativeTarget(document.activeElement))) {
    if (paused) resume(); else if (input.confirm) setPaused(true);
    return;
  }
  // Sample Snake directions separately so its configurable deadzone and diagonal
  // D-pad input do not change the bomb game's reader. The right stick stays a cursor.
  const pads = Array.from(navigator.getGamepads?.() || []).filter(p => p?.connected && p.mapping === "standard");
  const pad = pads[0], x = pad?.axes?.[0] || 0, y = pad?.axes?.[1] || 0;
  const pressed = index => Boolean(pad?.buttons?.[index]?.pressed || pad?.buttons?.[index]?.value > .5);
  const dx = Number(pressed(15)) - Number(pressed(14)), dy = Number(pressed(13)) - Number(pressed(12));
  const analog = Math.hypot(x,y) > config.gamepadDeadzone;
  if (!pad || paused) { padNeedsNeutral = true; directPadAngle = null; return; }
  if (padNeedsNeutral) { if (!analog && !dx && !dy) padNeedsNeutral = false; return; }
  if (analog || dx || dy) {
    pointer = null; controls.clear(); directPadAngle = analog ? Math.atan2(y,x) : Math.atan2(dy,dx);
  } else directPadAngle = null;
}
new ResizeObserver(resize).observe($("stage"));
new ResizeObserver(()=>document.documentElement.style.setProperty("--snake-panel-top",`${Math.round(document.querySelector(".game-topbar").getBoundingClientRect().bottom+8)}px`)).observe(document.querySelector(".game-topbar"));

function loadImage(path) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`素材加载失败：${path}`));
    img.src = path;
  });
}

// Read-only inspection for browser checks; input and growth still use the actual game loop.
Object.defineProperty(window, "__snakeDemo", { value: Object.freeze({ getState: () => ({
  ready, paused, mode, collected, length: trail.glyphs.length, head: head && { ...head }, angle,
  speed: motion?.speed, vacuum: { active:vacuum.active(clock), remaining:vacuum.remaining(clock), range:config.vacuumRange },
  bindings:structuredClone(bindings), poison:poison.snapshot(),
  segments: trail.positions(), target: foods?.[0] && { ...foods[0] }, foods: foods?.map(f => ({ ...f })),
  learning: learning && { ...learning.snapshot(), type: learning.type, prompt: learning.prompt, source: learning.source },
  upstream: "0.2.9", config: { ...config }, rewards: { stars: rewards.stars, growthPoints: rewards.growthPoints, threshold: rewards.threshold },
  viruses: viruses.map(v => ({ ...v, pose: virusField.pose(v) })), virusSnakes: virusSnakes.getState(),
  enemyDefeats: virusSnakes.defeated, damage: { hits: damageHits, lastCause: lastDamageCause, flashing: clock < damageFlashUntil },
  enclosure: { capturedSuper }, world: { ...WORLD_BOUNDS }, starParticles: starBursts.active(clock).length,
  viewport: { width: viewWidth, height: viewHeight, zoom, camera: { ...camera } },
}) }) });

try {
  const response = await fetch("./assets/snake/sprites.json?v=1.0");
  if (!response.ok) throw new Error("素材配置加载失败");
  metadata = await response.json();
  const variants = VIRUS_TYPES.flatMap(type => VIRUS_COLORS.slice(1).map(color => ({ tier: type.tier, color })));
  const [headImage, segment, floor, virus, virusSmall, virusMedium, virusSuper, ...variantImages] = await Promise.all([
    loadImage("./assets/snake/flystar-head-v1.png?v=0.2.9"), loadImage("./assets/snake/hanzi-star-v2.png?v=0.2.9"), loadImage("./assets/snake/arena-floor-v2.jpg?v=0.2.9"),
    loadImage("./assets/snake/virus-purple-v1.png?v=0.2.9"),
    loadImage("./assets/snake/virus-small-v4.png?v=0.2.9"), loadImage("./assets/snake/virus-medium-v4.png?v=0.2.9"), loadImage("./assets/snake/virus-super-v2.png?v=0.2.9"),
    ...variants.map(({ tier, color }) => loadImage(`./assets/snake/virus-${tier}-${color}-v1.png?v=0.2.9`)),
  ]);
  const baseViruses = { small: virusSmall, medium: virusMedium, large: virus, super: virusSuper };
  const virusPalettes = Object.fromEntries(VIRUS_TYPES.map(type => [type.tier, { violet: baseViruses[type.tier] }]));
  variants.forEach(({ tier, color }, index) => { virusPalettes[tier][color] = variantImages[index]; });
  assets = { head: headImage, segment, floor, virus, virusSmall, virusMedium, virusSuper, virusPalettes };
  poisonedAssets = createPoisonSprites({ head: headImage, segment });
  floorPattern = ctx.createPattern(assets.floor, "repeat");
  resize();
  reset();
  const restored = restore(readObject(storage, SNAKE_PROGRESS_KEY));
  ready = true;
  setPaused(true, restored ? "继续上次的汉字长龙" : "准备出发");
  $("loading").hidden = true;
  requestAnimationFrame(frame);
} catch (error) {
  $("loading").textContent = `${error.message}。请通过本地服务打开此页面。`;
  console.error(error);
}
