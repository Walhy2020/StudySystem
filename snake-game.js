import { GlyphTrail, turnTowards } from "./src/snake-trail.js?v=1.0";
import { SnakeLearning, SNAKE_PROGRESS_KEY, readObject } from "./src/snake-learning.js?v=1.0";

const $ = (id) => document.getElementById(id);
const canvas = $("game");
const ctx = canvas.getContext("2d");
const WORLD = { width: 1600, height: 1067, margin: 220 };
let storage;
try { storage = localStorage; } catch { /* Play remains available without storage. */ }
const words = window.MARIO_WORD_BANK || [];
const readings = word => window.MARIO_PINYIN_READINGS.getReadings(word, words);
let learning, demoCheckpoint = null, menuPaused = false, fullscreenPending = false;
const gamepad = window.createBombGamepadReader();
let lastSave = 0;
const trail = new GlyphTrail({ spacing: 45, leadGap: 80 });
let head, angle, desiredAngle, collected, foods, mode = "manual";
let paused = true, ready = false, pointer = null, viewWidth = 900, viewHeight = 550;
let zoom = 1, camera = { x: 800, y: 550 }, clock = 0, lastTime = 0, toastUntil = 6;
let assets, metadata, lastWrong = -10, growthFlash = -10;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function notify(text, duration = 3) {
  $("message").textContent = text;
  $("message").classList.remove("is-quiet");
  toastUntil = clock + duration;
}

function updateUI() {
  if (!learning) return;
  $("targetGlyph").textContent = learning.complete ? "完成" : learning.prompt;
  $("missionLabel").textContent = learning.isPinyin ? "看拼音，找汉字" : "看汉字，找拼音";
  $("batchCount").textContent = `第 ${learning.batch} 关 · ${learning.done.length}/${learning.targets.length}`;
  $("lengthCount").textContent = trail.glyphs.length;
  $("collectedCount").textContent = collected;
  $("glyphBag").replaceChildren(...trail.glyphs.map((glyph) => {
    const span = document.createElement("span");
    span.className = "bag-glyph";
    span.textContent = glyph;
    return span;
  }));
  $("modeLabel").textContent = mode === "auto" ? "自动演示" : "自由操控";
  $("autoButton").setAttribute("aria-pressed", String(mode === "auto"));
  $("startButton").textContent = learning.complete ? "下一关" : paused ? "开始 / 继续" : "暂停";
  $("resumeButton").textContent = learning.complete ? "下一关" : "继续出发";
  $("speakButton").disabled = !learning.current || window.STUDY_AUDIO?.isMuted();
  $("muteButton").textContent = window.STUDY_AUDIO?.isMuted() ? "已静音 · L1" : "声音开启 · L1";
  $("muteButton").setAttribute("aria-pressed", String(Boolean(window.STUDY_AUDIO?.isMuted())));
  $("startButton").disabled = $("resumeButton").disabled = !learning.targets.length;
  $("stageHint").textContent = mode === "auto"
    ? "按方向键，接过小飞星的方向盘" : "方向键转向 · 按住场地拖动 · 空格暂停";
}

function spawnFoods() {
  if (!learning.active) { foods = []; return; }
  const mobile = viewWidth < 500;
  const radius = mobile ? 145 : 215;
  const halfW = viewWidth / zoom / 2 - 45, halfH = viewHeight / zoom / 2 - 45;
  const bounds = mobile ? { left: Math.max(250, camera.x - halfW), right: Math.min(1350, camera.x + halfW),
    top: Math.max(240, camera.y - halfH), bottom: Math.min(815, camera.y + halfH) } : { left: 250, right: 1350, top: 240, bottom: 815 };
  const fit = point => ({ x: clamp(point.x, bounds.left, bounds.right), y: clamp(point.y, bounds.top, bounds.bottom) });
  const turn = collected % 4 < 2 ? 0.85 : -0.85;
  let destination = {
    x: head.x + Math.cos(angle + turn) * radius,
    y: head.y + Math.sin(angle + turn) * radius,
  };
  destination.x = clamp(destination.x, WORLD.margin + 40, WORLD.width - WORLD.margin - 40);
  destination.y = clamp(destination.y, WORLD.margin + 20, WORLD.height - WORLD.margin - 20);
  if (distance(head, destination) < (mobile ? 90 : 130)) {
    const towardCenter = Math.atan2(WORLD.height / 2 - head.y, WORLD.width / 2 - head.x);
    destination = { x: head.x + Math.cos(towardCenter) * 200, y: head.y + Math.sin(towardCenter) * 200 };
  }
  const correct = learning.options.find(o => o.correct);
  foods = [{ ...fit(destination), ...correct }];
  learning.options.filter(o => !o.correct).forEach((option, index) => {
    const dir = angle + (index === 0 ? -1.2 : 2.1);
    const point = fit({ x: head.x + Math.cos(dir) * (mobile ? 145 : 205 + index * 25),
      y: head.y + Math.sin(dir) * (mobile ? 145 : 205 + index * 25) });
    // Keep choices separated at boundaries, including wide polyphonic labels.
    const alternatives = [point, { x: bounds.left, y: bounds.top }, { x: bounds.right, y: bounds.top },
      { x: bounds.left, y: bounds.bottom }, { x: bounds.right, y: bounds.bottom }];
    const spot = alternatives.find(p => distance(p, head) > (mobile ? 80 : 120) && foods.every(f => distance(p, f) > (mobile ? 110 : 180))) || point;
    foods.push({ ...spot, ...option });
  });
}

function reset() {
  learning = new SnakeLearning(words, storage, readings, Math.random, learning ?
    { counts: learning.counts, seen: learning.seen, history: learning.history } : {});
  head = { x: 850, y: 550 };
  angle = -0.35;
  desiredAngle = angle;
  collected = 0;
  pointer = null;
  growthFlash = -10;
  // Seed actual route history so the assembled body has a curve immediately.
  const history = [];
  for (let d = 0; d <= 1000; d += 4) {
    history.push({ x: head.x - d * 0.81, y: head.y + Math.sin(d / 135) * 96 });
  }
  // Keep upstream's eight-segment silhouette, using this game's eligible pool.
  trail.reset(history, learning.runIds.slice(0, 8).map(id => learning.byId.get(id).char));
  camera = { x: 780, y: 560 };
  paused = true;
  $("pauseTitle").textContent = "小飞星 · 汉字长龙";
  $("pauseOverlay").hidden = false;
  spawnFoods();
  updateUI();
  notify("找到上方目标，吃对一个字，队伍长一节", 5);
}

function setMode(next) {
  if (!ready) return;
  if (next !== mode) {
    if (next === "auto") { save(); demoCheckpoint = JSON.parse(JSON.stringify(snapshot())); }
    else if (demoCheckpoint) { restore(demoCheckpoint); demoCheckpoint = null; }
  }
  mode = next;
  if (mode === "auto" && learning.complete) { learning.nextBatch(); spawnFoods(); }
  pointer = null;
  paused = !learning.active;
  $("pauseOverlay").hidden = paused;
  desiredAngle = angle;
  updateUI();
  notify(mode === "auto" ? "小飞星带你看：吃字，转弯，再长一节" : "轮到你啦！找到上面的目标字");
}

function setPaused(value, title = "休息一下") {
  if (!ready) return;
  paused = value;
  pointer = null;
  $("pauseTitle").textContent = learning.complete ? "五个目标完成！" : !learning.targets.length ? "所有汉字已掌握，暂无可学目标" : title;
  $("pauseOverlay").hidden = !value;
  gamepad.reset();
  updateUI();
  save();
}

function snapshot() {
  return { version: 1, learning: learning.snapshot(), head: { ...head }, angle, desiredAngle,
    collected, glyphs: trail.glyphs.slice(), points: trail.points.map(p => ({ ...p })), foods,
    camera: { ...camera } };
}
function save() {
  if (!ready || mode === "auto" || window.STUDY_FULLSCREEN_SHELL?.isHosting()) return;
  try { storage?.setItem(SNAKE_PROGRESS_KEY, JSON.stringify(snapshot())); } catch { /* Storage can be unavailable. */ }
}
function restore(saved) {
  const point = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= -2000 && p.x <= 4000 && p.y >= -2000 && p.y <= 4000;
  if (saved.version !== 1 || !point(saved.head) || !Number.isFinite(saved.angle) ||
      !Array.isArray(saved.points) || !saved.points.length || saved.points.length > 100000 || !saved.points.every(point) ||
      !Array.isArray(saved.glyphs) || !saved.glyphs.every(g => typeof g === "string" && [...g].length === 1)) return false;
  learning = new SnakeLearning(words, storage, readings, Math.random, saved.learning);
  head = { ...saved.head }; angle = saved.angle;
  desiredAngle = Number.isFinite(saved.desiredAngle) ? saved.desiredAngle : angle;
  collected = Number.isSafeInteger(saved.collected) && saved.collected >= 0 ? saved.collected : 0;
  trail.reset(saved.points, saved.glyphs);
  camera = point(saved.camera) ? { ...saved.camera } : { ...head };
  // Restore exact option positions only while they still match the sanitized question.
  const matches = Array.isArray(saved.foods) && saved.foods.length === learning.options.length &&
    saved.foods.every(f => point(f) && learning.options.some(o => o.wordId === f.wordId && o.glyph === f.glyph && o.correct === f.correct)) &&
    new Set(saved.foods.map(f => f.wordId)).size === saved.foods.length;
  if (matches) foods = saved.foods.map(f => ({ ...f })); else spawnFoods();
  paused = true; pointer = null;
  return true;
}
function resume() {
  if (!ready || window.STUDY_CONTROLLER_MOUSE?.isActive()) return;
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
  zoom = viewWidth < 500 ? 0.77 : Math.min(1.1, viewWidth / 820);
}

function update(dt) {
  clock += dt;
  if (clock > toastUntil) $("message").classList.add("is-quiet");
  if (mode === "auto" && foods[0]) desiredAngle = Math.atan2(foods[0].y - head.y, foods[0].x - head.x);
  else if (pointer) {
    const destination = { x: (pointer.x - viewWidth / 2) / zoom + camera.x,
      y: (pointer.y - viewHeight / 2) / zoom + camera.y };
    if (distance(head, destination) > 12) desiredAngle = Math.atan2(destination.y - head.y, destination.x - head.x);
  }
  // Preserve upstream's gentle boundary steering and non-colliding body.
  if (mode === "manual" && (head.x < 220 || head.x > 1380 || head.y < 210 || head.y > 857)) {
    desiredAngle = Math.atan2(WORLD.height / 2 - head.y, WORLD.width / 2 - head.x);
  }
  angle = turnTowards(angle, desiredAngle, 3.3 * dt);
  head.x += Math.cos(angle) * 116 * dt;
  head.y += Math.sin(angle) * 116 * dt;
  trail.moveTo(head);
  const food = foods.find((item) => distance(head, item) < 31);
  if (food?.correct) {
    const result = learning.answer(food.wordId);
    trail.grow(result.word.char);
    collected += 1;
    growthFlash = clock;
    notify(`找到「${result.word.char}」啦，队伍又长一节`);
    spawnFoods();
    updateUI();
    if (result.complete) {
      if (mode === "auto") { learning.nextBatch(); spawnFoods(); updateUI(); }
      else setPaused(true, "五个目标完成！");
    }
    save();
  } else if (food && clock - lastWrong > 2.5) {
    lastWrong = clock;
    learning.answer(food.wordId);
    notify(`再找找看，目标是「${learning.prompt}」`, 2);
    save();
  }
  const follow = 1 - Math.exp(-dt * 3);
  const aim = { x: head.x - Math.cos(angle) * 78, y: head.y - Math.sin(angle) * 40 };
  const halfW = viewWidth / zoom / 2, halfH = viewHeight / zoom / 2;
  camera.x += (clamp(aim.x, halfW, WORLD.width - halfW) - camera.x) * follow;
  camera.y += (clamp(aim.y, halfH, WORLD.height - halfH) - camera.y) * follow;
}

function tile(x, y, size, glyph, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(assets.segment, x - size / 2, y - size / 2, size, size);
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

function draw() {
  ctx.clearRect(0, 0, viewWidth, viewHeight);
  ctx.save();
  ctx.translate(viewWidth / 2, viewHeight / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-camera.x, -camera.y);
  ctx.drawImage(assets.meadow, 0, 0, WORLD.width, WORLD.height);
  // Independent image sprites, not a stretched full-character illustration.
  for (const food of foods) {
    const bob = Math.sin(clock * 2.4 + food.x) * 3;
    ctx.save();
    ctx.shadowColor = "#4a64393b";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 5;
    tile(food.x, food.y + bob, 61, food.glyph);
    ctx.restore();
  }
  const segments = trail.positions();
  for (let i = segments.length - 1; i >= 0; i--) {
    const item = segments[i];
    const newlyGrown = i === segments.length - 1 && clock - growthFlash < 0.65;
    const size = newlyGrown ? 55 + Math.sin((clock - growthFlash) / 0.65 * Math.PI) * 12 : 55;
    tile(item.x, item.y, size, item.glyph);
  }
  const neck = trail.neck();
  tile(neck.x, neck.y, 47, "");
  ctx.save();
  ctx.translate(head.x, head.y - 4 + Math.sin(clock * 4) * 2);
  ctx.rotate(Math.sin(angle) * 0.07);
  ctx.shadowColor = "#4a57362b";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 7;
  const scale = 128 / metadata.head.width;
  ctx.drawImage(assets.head, -metadata.head.anchor.x * scale, -metadata.head.anchor.y * scale,
    metadata.head.width * scale, metadata.head.height * scale);
  ctx.restore();
  ctx.restore();
}

function frame(time) {
  let remaining = Math.min((time - lastTime) / 1000 || 0, 0.25);
  lastTime = time;
  if (window.STUDY_FULLSCREEN_SHELL?.isHosting()) { requestAnimationFrame(frame); return; }
  pollGamepad(time);
  if (ready) {
    // Substeps preserve collision checks and smooth route samples on slower devices.
    while (!paused && remaining > 0) {
      const step = Math.min(remaining, 1 / 60);
      update(step);
      remaining -= step;
    }
    draw();
    if (time - lastSave > 1000) { lastSave = time; save(); }
  }
  requestAnimationFrame(frame);
}

function steer(direction) {
  if (!ready || paused || window.STUDY_CONTROLLER_MOUSE?.isActive()) return;
  if (mode !== "manual") setMode("manual");
  pointer = null;
  desiredAngle = { up: -Math.PI / 2, right: 0, down: Math.PI / 2, left: Math.PI }[direction];
}

const keys = { ArrowUp: "up", w: "up", ArrowLeft: "left", a: "left", ArrowDown: "down", s: "down", ArrowRight: "right", d: "right" };
document.addEventListener("keydown", (event) => {
  if (window.STUDY_FULLSCREEN_SHELL?.isHosting() || nativeTarget(event.target) || window.STUDY_CONTROLLER_MOUSE?.isActive()) return;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (keys[key]) { event.preventDefault(); steer(keys[key]); }
  if (event.code === "Space") { event.preventDefault(); if (!event.repeat) { if (paused) resume(); else setPaused(true); } }
});
function nativeTarget(target) {
  return target instanceof Element && target !== canvas && Boolean(target.closest('a,button,input,textarea,select,summary,[contenteditable]:not([contenteditable="false"]),[role="button"],[role="link"],[role="checkbox"],[role="radio"],[role="switch"],[role="slider"],[role="tab"],[role="menuitem"],[role="option"],[role="combobox"],[tabindex]'));
}
$("startButton").addEventListener("click", () => { if (paused || mode === "auto") resume(); else setPaused(true); });
$("autoButton").addEventListener("click", () => setMode("auto"));
$("resetButton").addEventListener("click", () => {
  if (!ready) return;
  if (demoCheckpoint) restore(demoCheckpoint);
  mode = "manual"; demoCheckpoint = null; menuPaused = false;
  reset(); save();
});
$("resumeButton").addEventListener("click", resume);
document.querySelectorAll("[data-direction]").forEach((button) => {
  button.addEventListener("click", () => { steer(button.dataset.direction); canvas.focus({ preventScroll: true }); });
});
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
  pointerPosition(event);
});
canvas.addEventListener("pointermove", (event) => { if (pointer) pointerPosition(event); });
for (const name of ["pointerup", "pointercancel", "lostpointercapture"]) canvas.addEventListener(name, () => { pointer = null; });
window.addEventListener("blur", () => { pointer = null; setPaused(true); });
document.addEventListener("visibilitychange", () => { if (document.hidden) setPaused(true); });
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
window.addEventListener("studysystem:audiochange", updateUI);
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
window.addEventListener("studysystem:gamepad-menu", event => {
  if (event.detail.active) { menuPaused = !paused; setPaused(true, "菜单"); }
  else if (menuPaused) { menuPaused = false; setPaused(false); }
});
window.addEventListener("studysystem:controller-mouse", () => {
  if (window.STUDY_CONTROLLER_MOUSE?.isActive()) { menuPaused = false; setPaused(true); }
  gamepad.reset();
});
for (const name of ["pagehide", "studysystem:fullscreen-navigation", "studysystem:update-prompt"]) {
  window.addEventListener(name, () => { menuPaused = false; setPaused(true); window.speechSynthesis?.cancel(); });
}
window.addEventListener("gamepaddisconnected", () => { menuPaused = false; setPaused(true); });
function pollGamepad(time) {
  window.STUDY_GAMEPAD_CURSOR?.poll(time);
  const enabled = ready && !document.hidden && document.hasFocus() && !window.STUDY_CONTROLLER_MOUSE?.isActive() &&
    !window.STUDY_GAMEPAD_CURSOR?.isMenuActive() && !window.STUDY_FULLSCREEN_SHELL?.isHosting();
  const input = gamepad.poll(enabled);
  if (!enabled) return;
  if ((input.confirm || input.mushroom) && (paused || !nativeTarget(document.activeElement))) {
    if (paused) resume(); else if (input.confirm) setPaused(true);
    return;
  }
  if (input.direction || input.aim) steer(input.direction || input.aim);
}
new ResizeObserver(resize).observe($("stage"));

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
  segments: trail.positions(), target: foods?.[0] && { ...foods[0] }, foods: foods?.map(f => ({ ...f })),
  learning: learning && { ...learning.snapshot(), type: learning.type, prompt: learning.prompt, source: learning.source },
  viewport: { width: viewWidth, height: viewHeight, zoom, camera: { ...camera } },
}) }) });

try {
  const response = await fetch("./assets/snake/sprites.json?v=1.0");
  if (!response.ok) throw new Error("素材配置加载失败");
  metadata = await response.json();
  const [headImage, segment, meadow] = await Promise.all([
    loadImage("./assets/snake/flystar-head-v1.png?v=1.0"), loadImage("./assets/snake/hanzi-segment-v1.png?v=1.0"), loadImage("./assets/snake/meadow-v1.jpg?v=1.0"),
  ]);
  assets = { head: headImage, segment, meadow };
  resize();
  reset();
  const restored = restore(readObject(storage, SNAKE_PROGRESS_KEY));
  ready = true;
  setPaused(true, learning.complete ? "五个目标完成！" : restored ? "继续上次的汉字长龙" : "准备出发");
  $("loading").hidden = true;
  requestAnimationFrame(frame);
} catch (error) {
  $("loading").textContent = `${error.message}。请通过本地服务打开此页面。`;
  console.error(error);
}
