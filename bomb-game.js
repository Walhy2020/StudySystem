(function () {
  const WORDS = window.MARIO_WORD_BANK || [];
  const HANZI_STORE_KEY = "mario-hanzi-refactor-v1";
  const LEGACY_STORE_KEY = "mario-literacy-desktop-mvp-v1";
  const BOMB_PROGRESS_KEY = "mario-bomb-game-progress-v1";
  const BOMB_PROGRESS_VERSION = 1;
  const canvas = document.getElementById("bombCanvas");
  const ctx = canvas.getContext("2d");
  const appNode = document.querySelector(".bomb-game-app");
  const topbarNode = document.querySelector(".bomb-topbar");
  const stageNode = document.querySelector(".bomb-stage");
  const hpNode = document.getElementById("bombHp");
  const ammoNode = document.getElementById("bombAmmo");
  const mushroomNode = document.getElementById("mushroomLeft");
  const levelNode = document.getElementById("bombLevel");
  const powerNode = document.getElementById("bombPower");
  const moonNode = document.getElementById("bombMoonCount");
  const moonIconNode = document.getElementById("bombMoonHudIcon");
  const scoreNode = document.getElementById("bombScore");
  const messageNode = document.getElementById("bombMessage");
  const startButton = document.getElementById("startBombGame");
  const restartButton = document.getElementById("restartBombGame");
  const soundToggle = document.getElementById("bombSoundToggle");
  const sounds = window.createBombSoundPlayer();
  const openAllBricksButton = document.getElementById("openAllBricks");
  const startLayer = document.getElementById("bombStartLayer");
  const startTitle = document.getElementById("bombStartTitle");
  const overlayStartButton = document.getElementById("overlayStartBombGame");

  let bombViewportFrame = 0;

  function calculateBombViewportLayout(availableWidth, availableHeight) {
    const safeWidth = Math.max(1, Number(availableWidth) || 1);
    const safeHeight = Math.max(1, Number(availableHeight) || 1);
    const canvasWidth = Math.min(safeWidth, safeHeight * (16 / 9));
    return {
      canvasWidth,
      canvasHeight: canvasWidth * (9 / 16),
    };
  }

  function fitBombViewport() {
    if (!appNode || !topbarNode || !stageNode) return;
    const visualViewport = window.visualViewport;
    const frameElement = window.frameElement;
    const viewportHeights = [
      visualViewport?.height,
      window.innerHeight,
      document.documentElement.clientHeight,
      frameElement?.clientHeight,
    ].filter((value) => Number(value) > 0);
    const viewportHeight = Math.min(...viewportHeights);
    appNode.style.setProperty("--bomb-viewport-height", `${viewportHeight}px`);

    const stageRect = stageNode.getBoundingClientRect();
    const stageWidth = Math.min(stageNode.clientWidth || Infinity, stageRect.width);
    const stageHeight = Math.min(stageNode.clientHeight || Infinity, stageRect.height);
    const layout = calculateBombViewportLayout(stageWidth, stageHeight);
    canvas.style.setProperty("--bomb-canvas-width", `${layout.canvasWidth}px`);
    canvas.style.setProperty("--bomb-canvas-height", `${layout.canvasHeight}px`);
  }

  function scheduleBombViewportFit() {
    if (bombViewportFrame) return;
    bombViewportFrame = window.requestAnimationFrame(() => {
      bombViewportFrame = 0;
      fitBombViewport();
    });
  }

  const BASE_COLS = 15;
  const WORLDS_PER_RUN = 2;
  const LEVELS_PER_WORLD = 5;
  const COLS_PER_LEVEL = 2;
  let COLS = BASE_COLS;
  const ROWS = 11;
  const TILE = 48;
  let BOARD_W = COLS * TILE;
  const BOARD_H = ROWS * TILE;
  let BOARD_X = Math.floor((canvas.width - BOARD_W) / 2);
  const BOARD_Y = 108;
  const BOMB_TIMER = 2;
  const FLAME_TIME = 0.5;
  const PLAYER_MOVE_TIME = 0.18;
  const ENEMY_MOVE_TIME = 0.55;
  const ENEMY_MOVE_RANDOM_TIME = 0.125;
  const MUSHROOM_SPEED_FACTOR = 0.9;
  const KOOPA_MOVE_TIME = 1.0;
  const SHELL_MOVE_TIME = 0.075;
  // 80% of the previous speed: 0.225 / 0.8 seconds per cell.
  const BULLET_BILL_MOVE_TIME = 0.28125;
  const BULLET_BILL_HIDDEN_COUNT_PER_LEVEL = 1;
  const ENEMY_CHASE_TIME = 2.6;
  const ENEMY_SIGHT_RANGE = 8 / 3;
  const ENEMY_VISION_HALF_ANGLE = Math.PI / 3;
  const TOUGH_ENEMY_STUN_TIME = 3;
  const ENEMY_HIT_COOLDOWN = FLAME_TIME + 0.18;
  const DAY_DURATION = 60;
  const NIGHT_DURATION = 30;
  const MAX_HP = 3;
  const DAILY_NEW_LIMIT = 3;
  const BOMB_MOONS_PER_LEVEL = 5;
  const FIRE_FLOWERS_PER_LEVEL = 2;
  const BOMB_WORDS_PER_RUN = WORLDS_PER_RUN * LEVELS_PER_WORLD * BOMB_MOONS_PER_LEVEL;
  const DIFFICULTY_LABELS = ["A", "B", "C", "D", "E", "F"];
  const START_DIFFICULTY_INDEX = 2;
  const LEARNING_MODES = {
    pinyin: "pinyin",
    hanzi: "hanzi",
  };
  const PINYIN_INITIALS = [
    "zh", "ch", "sh",
    "b", "p", "m", "f", "d", "t", "n", "l",
    "g", "k", "h", "j", "q", "x", "r", "z", "c", "s", "y", "w",
  ];
  const PINYIN_FINALS = [
    "a", "o", "e", "i", "u", "ü",
    "ai", "ei", "ui", "ao", "ou", "iu", "ie", "üe", "er",
    "an", "en", "in", "un", "ün", "ang", "eng", "ing", "ong",
  ];
  const PINYIN_MEDIALS = ["i", "u", "ü"];
  const PINYIN_TONE_MAP = {
    ā: "a", á: "a", ǎ: "a", à: "a",
    ō: "o", ó: "o", ǒ: "o", ò: "o",
    ē: "e", é: "e", ě: "e", è: "e",
    ī: "i", í: "i", ǐ: "i", ì: "i",
    ū: "u", ú: "u", ǔ: "u", ù: "u",
    ǖ: "ü", ǘ: "ü", ǚ: "ü", ǜ: "ü",
  };

  const TILE_FLOOR = 0;
  const TILE_HARD = 1;
  const TILE_CRATE = 2;

  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  const DIRECTION_ANGLES = {
    right: 0,
    down: Math.PI / 2,
    left: Math.PI,
    up: -Math.PI / 2,
  };
  const KEY_DIRS = {
    ArrowUp: "up",
    KeyW: "up",
    ArrowDown: "down",
    KeyS: "down",
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
  };

  const enemySprite = new Image();
  enemySprite.src = "./assets/sprites/enemies-bosses.png";
  const MUSHROOM_FRAMES = [
    { sx: 0, sy: 16, sw: 16, sh: 16 },
    { sx: 16, sy: 16, sw: 16, sh: 16 },
  ];
  const BOWSER_FRAMES = [
    { sx: 656, sy: 0, sw: 32, sh: 32 },
    { sx: 688, sy: 0, sw: 32, sh: 32 },
    { sx: 720, sy: 0, sw: 32, sh: 32 },
    { sx: 752, sy: 0, sw: 32, sh: 32 },
  ];
  const KOOPA_GREEN_FRAMES = [
    { sx: 320, sy: 0, sw: 16, sh: 32 },
    { sx: 336, sy: 0, sw: 16, sh: 32 },
  ];
  const SHELL_GREEN_FRAMES = [
    { sx: 160, sy: 0, sw: 16, sh: 32 },
    { sx: 176, sy: 0, sw: 16, sh: 32 },
  ];
  const BULLET_BILL_FRAME = { sx: 560, sy: 48, sw: 16, sh: 16 };


  const crateBrickImage = new Image();
  crateBrickImage.src = "./其他素材/P305/Mario SVG Bundle/PNG/109.png";
  const greenMushroomImage = new Image();
  greenMushroomImage.src = "./其他素材/P305/Mario SVG Bundle/PNG/11.png";
  const fireFlowerImage = new Image();
  fireFlowerImage.src = "./其他素材/P305/Mario SVG Bundle/PNG/253.png";
  const FLY_STAR_BOUNDS = { minX: 192, minY: 92, width: 2440, height: 1872 };
  const FLY_STAR_PARTS = [
    { file: "Part_06.png", x: 752, y: -709.5, width: 1120, height: 1235, pivotX: 1180, pivotY: 880, amplitude: 0.15 },
    { file: "Part_05.png", x: 2117.5, y: -808, width: 1029, height: 1298, pivotX: 1840, pivotY: 900, amplitude: -0.15 },
    { file: "Part_04.png", x: 1323, y: -1680, width: 406, height: 568, pivotX: 1450, pivotY: 1470, amplitude: -0.11 },
    { file: "Part_03.png", x: 1847.5, y: -1671.5, width: 481, height: 521, pivotX: 1720, pivotY: 1470, amplitude: 0.11 },
    { file: "Part_02.png", x: 1497.5, y: -918, width: 1281, height: 1266 },
    { file: "Part_01.png", x: 1583.5, y: -950, width: 381, height: 470 },
  ].map((part) => ({ ...part, image: new Image() }));

  let flyStarLayers = null;

  let lastTime = performance.now();
  let animationClock = 0;
  let lastDirection = "right";
  let messageTimer = 0;
  let progressSavePending = false;
  let lastRenderedLearningCardCount = 0;
  const heldDirections = new Set();

  const state = {
    status: "ready",
    map: [],
    bombs: [],
    explosions: [],
    particles: [],
    powerUps: [],
    enemies: [],
    shells: [],
    player: null,
    score: 0,
    hp: MAX_HP,
    bombLimit: 3,
    flameRange: 1,
    fireFlowersSpawned: 0,
    hiddenPowerUps: new Map(),
    hiddenWordCrates: new Map(),
    todayNewWords: [],
    bombRunWordIds: [],
    bombWordCursor: 0,
    retryWordIds: [],
    moonWordIds: [],
    bombTargetRoundCounts: {},
    bombSeenWordIds: [],
    bombAppearanceHistory: [],
    activePinyinWordId: null,
    activeHanziWordId: null,
    activePinyinStep: 0,
    activePinyinTotal: 0,
    playSource: null,
    dayClock: 0,
    enemyClearOpenedBricks: false,
    world: 1,
    subLevel: 1,
    round: 1,
  };

  function plainArray(value) {
    return Array.isArray(value) ? JSON.parse(JSON.stringify(value)) : [];
  }

  function plainObject(value) {
    return value && typeof value === "object" && !Array.isArray(value)
      ? JSON.parse(JSON.stringify(value))
      : {};
  }

  function mapEntries(value) {
    return value instanceof Map ? Array.from(value.entries()) : [];
  }

  function isValidSavedMap(map) {
    return (
      Array.isArray(map) &&
      map.length === ROWS &&
      map.every((row) => Array.isArray(row) && row.length === COLS)
    );
  }

  function serializeBombProgress() {
    return {
      version: BOMB_PROGRESS_VERSION,
      progressSessionId,
      targetRevealPolicy: 1,
      savedAt: Date.now(),
      status: state.status,
      world: state.world,
      subLevel: state.subLevel,
      round: state.round,
      score: state.score,
      hp: state.hp,
      bombLimit: state.bombLimit,
      flameRange: state.flameRange,
      fireFlowersSpawned: state.fireFlowersSpawned,
      dayClock: state.dayClock,
      enemyClearOpenedBricks: state.enemyClearOpenedBricks,
      playSource: state.playSource,
      map: plainArray(state.map),
      bombs: plainArray(state.bombs),
      explosions: plainArray(state.explosions),
      particles: plainArray(state.particles),
      powerUps: plainArray(state.powerUps),
      enemies: plainArray(state.enemies),
      shells: plainArray(state.shells),
      player: plainObject(state.player),
      hiddenPowerUps: mapEntries(state.hiddenPowerUps),
      hiddenWordCrates: mapEntries(state.hiddenWordCrates),
      todayNewWords: plainArray(state.todayNewWords),
      bombRunWordIds: plainArray(state.bombRunWordIds),
      bombWordCursor: state.bombWordCursor,
      retryWordIds: plainArray(state.retryWordIds),
      moonWordIds: plainArray(state.moonWordIds),
      bombTargetRoundCounts: plainObject(state.bombTargetRoundCounts),
      bombSeenWordIds: plainArray(state.bombSeenWordIds),
      bombAppearanceHistory: plainArray(state.bombAppearanceHistory),
      activePinyinWordId: state.activePinyinWordId,
      activeHanziWordId: state.activeHanziWordId,
      activePinyinStep: state.activePinyinStep,
      activePinyinTotal: state.activePinyinTotal,
      lastDirection,
      messageText: messageNode.textContent,
      messageTimer,
      startLayerHidden: startLayer.classList.contains("hidden"),
      startTitleText: startTitle.textContent,
      overlayStartText: overlayStartButton.textContent,
    };
  }

  // Compare the exact snapshot last read/written, so an older tab cannot overwrite a newer one.
  let lastStoredProgress = null;
  const progressSessionId = crypto.randomUUID();
  let ownsProgress = true;
  let awaitingContinue = false;

  function syncBombProgress() {
    try {
      if (localStorage.getItem(BOMB_PROGRESS_KEY) === lastStoredProgress) return;
      ownsProgress = false;
      clearInputState();
      if (!restoreBombProgress()) resetGame();
    } catch (error) {
      console.warn("Unable to synchronize bomb progress", error);
    }
  }

  function claimBombProgress() {
    syncBombProgress();
    if (ownsProgress) return;
    ownsProgress = true;
    saveBombProgress();
  }

  function saveBombProgress() {
    if (!ownsProgress) return;
    try {
      const latest = localStorage.getItem(BOMB_PROGRESS_KEY);
      if (latest !== lastStoredProgress) {
        syncBombProgress();
        return;
      }
      const next = JSON.stringify(serializeBombProgress());
      localStorage.setItem(BOMB_PROGRESS_KEY, next);
      lastStoredProgress = next;
    } catch (error) {
      console.warn("Unable to save bomb progress", error);
    }
  }

  function scheduleBombProgressSave() {
    if (progressSavePending) return;
    progressSavePending = true;
    window.setTimeout(() => {
      progressSavePending = false;
      saveBombProgress();
    }, 400);
  }

  function restoreBombProgress() {
    let saved = null;
    try {
      lastStoredProgress = localStorage.getItem(BOMB_PROGRESS_KEY);
      saved = JSON.parse(lastStoredProgress || "null");
    } catch (error) {
      localStorage.removeItem(BOMB_PROGRESS_KEY);
      lastStoredProgress = null;
      return false;
    }
    if (!saved || saved.version !== BOMB_PROGRESS_VERSION) {
      return false;
    }
    const savedWorld = Math.max(1, Math.min(WORLDS_PER_RUN, Number(saved.world) || 1));
    const savedSubLevel = Math.max(1, Math.min(LEVELS_PER_WORLD, Number(saved.subLevel) || 1));
    setLevelDimensions(savedSubLevel);
    if (!isValidSavedMap(saved.map)) {
      localStorage.removeItem(BOMB_PROGRESS_KEY);
      lastStoredProgress = null;
      return false;
    }

    state.status = ["ready", "playing", "gameover", "win"].includes(saved.status) ? saved.status : "ready";
    state.world = savedWorld;
    state.subLevel = savedSubLevel;
    state.round = Number(saved.round) || 1;
    state.score = Number(saved.score) || 0;
    state.hp = Math.max(0, Math.min(MAX_HP + 20, Number(saved.hp) || MAX_HP));
    state.bombLimit = Math.max(1, Math.min(10, Number(saved.bombLimit) || 3));
    state.flameRange = Math.max(1, Math.min(99, Number(saved.flameRange) || 1));
    state.fireFlowersSpawned = Math.max(0, Number(saved.fireFlowersSpawned) || 0);
    state.dayClock = Math.max(0, Number(saved.dayClock) || 0);
    state.enemyClearOpenedBricks = Boolean(saved.enemyClearOpenedBricks);
    state.playSource = saved.playSource || null;
    state.map = saved.map;
    state.bombs = plainArray(saved.bombs);
    state.explosions = plainArray(saved.explosions);
    state.particles = plainArray(saved.particles);
    state.powerUps = plainArray(saved.powerUps);
    state.enemies = plainArray(saved.enemies);
    state.enemies.forEach(normalizeBulletBillMotion);
    state.shells = plainArray(saved.shells);
    state.player = saved.player && typeof saved.player === "object" ? saved.player : makePlayer();
    state.hiddenPowerUps = new Map(Array.isArray(saved.hiddenPowerUps) ? saved.hiddenPowerUps : []);
    state.hiddenWordCrates = new Map(Array.isArray(saved.hiddenWordCrates) ? saved.hiddenWordCrates : []);
    state.todayNewWords = plainArray(saved.todayNewWords).map((word) => wordById(word.id)).filter(Boolean);
    state.bombRunWordIds = plainArray(saved.bombRunWordIds);
    state.bombWordCursor = Math.max(0, Number(saved.bombWordCursor) || 0);
    state.retryWordIds = plainArray(saved.retryWordIds);
    state.moonWordIds = plainArray(saved.moonWordIds);
    state.bombTargetRoundCounts = plainObject(saved.bombTargetRoundCounts);
    state.bombSeenWordIds = plainArray(saved.bombSeenWordIds).filter((id) => wordById(id));
    state.bombAppearanceHistory = plainArray(saved.bombAppearanceHistory).slice(-5000);
    hydrateLegacyBombMetadataIfEmpty();
    state.activePinyinWordId = saved.activePinyinWordId || null;
    state.activeHanziWordId = saved.activeHanziWordId || null;
    state.activePinyinStep = Math.max(0, Number(saved.activePinyinStep) || 0);
    state.activePinyinTotal = Math.max(0, Number(saved.activePinyinTotal) || 0);
    normalizeRestoredLevelTargets(saved.targetRevealPolicy === 1 && state.status !== "ready");
    lastDirection = saved.lastDirection || "right";
    messageNode.textContent = saved.messageText || "";
    messageTimer = Math.max(0, Number(saved.messageTimer) || 0);
    startTitle.textContent = saved.startTitleText || `第 ${state.world}-${state.subLevel} / ${LEVELS_PER_WORLD} 小关 · 难度 ${difficultyLabelForSubLevel()}`;
    awaitingContinue = state.status === "playing";
    overlayStartButton.textContent = awaitingContinue ? "继续" : saved.overlayStartText || "开始";
    startButton.textContent = awaitingContinue ? "继续" : "开始";
    startLayer.classList.toggle("hidden", !awaitingContinue && Boolean(saved.startLayerHidden));
    clearInputState();
    updateHud();
    return true;
  }

  function difficultyIndexForSubLevel(subLevel = state.subLevel) {
    return clamp(START_DIFFICULTY_INDEX + subLevel - 1, 1, DIFFICULTY_LABELS.length);
  }

  function difficultyLabelForSubLevel(subLevel = state.subLevel) {
    return DIFFICULTY_LABELS[difficultyIndexForSubLevel(subLevel) - 1] || "A";
  }

  function setLevelDimensions(subLevel) {
    COLS = BASE_COLS + (difficultyIndexForSubLevel(subLevel) - 1) * COLS_PER_LEVEL;
    BOARD_W = COLS * TILE;
    BOARD_X = Math.floor((canvas.width - BOARD_W) / 2);
  }

  function maxFireFlowersForLevel() {
    return FIRE_FLOWERS_PER_LEVEL;
  }

  function bulletBillBrickCapacityForLevel() {
    return BULLET_BILL_HIDDEN_COUNT_PER_LEVEL;
  }

  function makePlayer() {
    return {
      gx: 1,
      gy: 1,
      move: null,
      invulnerable: 0,
      trail: [{ gx: 1, gy: 1 }],
    };
  }

  function clearInputState() {
    heldDirections.clear();
  }

  function coordKey(gx, gy) {
    return `${gx},${gy}`;
  }

  function cellCenter(gx, gy) {
    return {
      x: BOARD_X + gx * TILE + TILE / 2,
      y: BOARD_Y + gy * TILE + TILE / 2,
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function today() {
    const date = new Date();
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
    return localDate.toISOString().slice(0, 10);
  }

  function uniqueIds(ids) {
    return ids.filter((id, index) => ids.indexOf(id) === index);
  }

  function wordById(id) {
    return WORDS.find((word) => word.id === id) || null;
  }

  function pinyinReadings(word) {
    if (window.MARIO_PINYIN_READINGS && typeof window.MARIO_PINYIN_READINGS.getReadings === "function") {
      const readings = window.MARIO_PINYIN_READINGS.getReadings(word, WORDS);
      if (readings.length) return readings;
    }
    return [String(word?.pinyin || "").replace(/[.。．]+$/u, "")].filter(Boolean);
  }

  function pinyinReadingsLabel(word) {
    return pinyinReadings(word).join(" / ");
  }

  function currentLearningMode() {
    return state.subLevel % 2 === 1 ? LEARNING_MODES.pinyin : LEARNING_MODES.hanzi;
  }

  function currentLearningModeLabel() {
    return currentLearningMode() === LEARNING_MODES.pinyin ? "找汉字" : "找拼音";
  }

  function resetActiveLearningTask() {
    state.activePinyinWordId = null;
    state.activeHanziWordId = null;
    state.activePinyinStep = 0;
    state.activePinyinTotal = 0;
  }

  function uniqueWordIdsByCharacter(ids) {
    const seenIds = new Set();
    const seenCharacters = new Set();
    return ids.filter((id) => {
      const word = wordById(id);
      if (!word || seenIds.has(id) || seenCharacters.has(word.char)) return false;
      seenIds.add(id);
      seenCharacters.add(word.char);
      return true;
    });
  }

  function isLevelTarget(wordId) {
    return state.todayNewWords.some((word) => word.id === wordId);
  }

  function isLevelWordComplete(wordId) {
    return isLevelTarget(wordId) && state.moonWordIds.includes(wordId);
  }

  function completeLearningTarget(wordId) {
    if (!isLevelTarget(wordId) || isLevelWordComplete(wordId) || state.moonWordIds.length >= BOMB_MOONS_PER_LEVEL) {
      return false;
    }
    state.moonWordIds.push(wordId);
    return true;
  }

  function pendingLevelWords() {
    return state.todayNewWords.filter((word) => !state.moonWordIds.includes(word.id));
  }

  function isLearningPowerUp(powerUp) {
    return ["pinyin", "hanziPrompt", "pinyinChoice", "pinyinPart", "wordChoice"].includes(powerUp?.type);
  }

  function plainPinyinText(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/[āáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜ]/g, (char) => PINYIN_TONE_MAP[char] || char)
      .replace(/u:/g, "ü")
      .replace(/v/g, "ü")
      .replace(/[^a-zü]/g, "");
  }

  function primaryPlainPinyin(word) {
    return plainPinyinText(pinyinReadings(word)[0] || word?.pinyin || "");
  }

  function splitPinyinPieces(word) {
    const pinyin = primaryPlainPinyin(word);
    if (!pinyin) return [];
    const initial = PINYIN_INITIALS.find((item) => pinyin.startsWith(item)) || "";
    const rest = pinyin.slice(initial.length);
    const pieces = initial ? [initial] : [];
    if (!rest) return pieces;
    if (PINYIN_FINALS.includes(rest) || rest.length <= 1) {
      pieces.push(rest);
      return pieces;
    }
    const medial = PINYIN_MEDIALS.includes(rest[0]) ? rest[0] : "";
    if (medial && rest.length > 1) {
      pieces.push(medial, rest.slice(1));
      return pieces;
    }
    pieces.push(rest);
    return pieces;
  }

  function randomDistractorPinyin(exclude = []) {
    const excluded = new Set(exclude);
    const pool = PINYIN_FINALS.concat(PINYIN_INITIALS).filter((item) => !excluded.has(item));
    return randomItem(pool.length ? pool : PINYIN_FINALS);
  }

  function pinyinChallengePieces(word) {
    const correctPieces = splitPinyinPieces(word).slice(0, 3);
    const pieces = correctPieces.map((text, index) => ({
      text,
      order: index,
      correct: true,
    }));
    while (pieces.length < 3) {
      pieces.push({
        text: randomDistractorPinyin(pieces.map((piece) => piece.text)),
        order: -1,
        correct: false,
      });
    }
    return pieces.sort(() => Math.random() - 0.5);
  }

  let lastLearningSource = "none";

  function readStoredObject(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value && typeof value === "object" && !Array.isArray(value) ? value : null;
    } catch {
      return null;
    }
  }

  function hasLearningEvidenceState(learning) {
    if (!learning || typeof learning !== "object") return false;
    const records = learning.records && typeof learning.records === "object" ? learning.records : {};
    const recordEvidence = Object.values(records).some((record) => (
      record && typeof record === "object" && (
        Number(record.correctCount) > 0 ||
        Number(record.errorCount ?? record.wrongCount) > 0 ||
        Number(record.studyAppearanceCount) > 0 ||
        (Array.isArray(record.studyAppearanceKeys) && record.studyAppearanceKeys.length > 0) ||
        Boolean(record.lastSeen) ||
        ["learning", "known", "wrong", "mastered"].includes(record.status)
      )
    ));
    if (recordEvidence) return true;
    return [
      learning.dailyReviewIds,
      learning.dailyReviewDoneIds,
      learning.reviewWrongIds,
      learning.recentWrongIds,
      learning.masteredIds,
    ].some((ids) => Array.isArray(ids) && ids.some((id) => wordById(id)));
  }

  function loadLearningState() {
    const hanzi = readStoredObject(HANZI_STORE_KEY);
    if (hasLearningEvidenceState(hanzi)) {
      lastLearningSource = "hanzi";
      return hanzi;
    }
    const legacy = readStoredObject(LEGACY_STORE_KEY);
    if (hasLearningEvidenceState(legacy)) {
      lastLearningSource = "legacy";
      return legacy;
    }
    lastLearningSource = hanzi ? "hanzi-empty" : "none";
    return hanzi || {};
  }

  function hydrateLegacyBombMetadataIfEmpty() {
    const legacy = readStoredObject(LEGACY_STORE_KEY);
    if (!legacy) return;
    if (!state.bombSeenWordIds.length) {
      state.bombSeenWordIds = uniqueIds(
        (Array.isArray(legacy.bombSeenWordIds) ? legacy.bombSeenWordIds : []).filter((id) => wordById(id))
      );
    }
    if (!state.bombAppearanceHistory.length) {
      state.bombAppearanceHistory = (
        Array.isArray(legacy.bombAppearanceHistory) ? legacy.bombAppearanceHistory : []
      ).filter((entry) => entry && typeof entry === "object").slice(-5000);
    }
    if (!Object.keys(state.bombTargetRoundCounts).length) {
      const source = legacy.bombTargetRoundCounts;
      if (source && typeof source === "object" && !Array.isArray(source)) {
        Object.entries(source).forEach(([id, value]) => {
          const count = Math.max(0, Math.floor(Number(value) || 0));
          if (count > 0 && wordById(id)) state.bombTargetRoundCounts[id] = count;
        });
      }
    }
  }

  function masteredIdSet(learning) {
    const mastered = new Set(Array.isArray(learning?.masteredIds) ? uniqueIds(learning.masteredIds) : []);
    const records = learning?.records && typeof learning.records === "object" ? learning.records : {};
    Object.entries(records).forEach(([id, record]) => {
      if (record?.status === "mastered" && wordById(id)) mastered.add(id);
    });
    return mastered;
  }

  function bombSeenIdSet() {
    return new Set(uniqueIds(state.bombSeenWordIds).filter((id) => wordById(id)));
  }

  function learnedIdSet(learning) {
    const learnedIds = new Set();
    const records = learning?.records && typeof learning.records === "object"
      ? learning.records
      : {};
    Object.entries(records).forEach(([id, record]) => {
      if (!wordById(id) || !record || typeof record !== "object") return;
      const hasLearningEvidence =
        Number(record.correctCount) > 0 ||
        Number(record.errorCount ?? record.wrongCount) > 0 ||
        Number(record.studyAppearanceCount) > 0 ||
        (Array.isArray(record.studyAppearanceKeys) && record.studyAppearanceKeys.length > 0) ||
        Boolean(record.lastSeen) ||
        ["learning", "known", "wrong", "mastered"].includes(record.status);
      if (hasLearningEvidence) learnedIds.add(id);
    });
    [
      learning?.dailyReviewIds,
      learning?.dailyReviewDoneIds,
      learning?.reviewWrongIds,
      learning?.recentWrongIds,
      learning?.masteredIds,
    ].forEach((ids) => {
      if (!Array.isArray(ids)) return;
      ids.forEach((id) => {
        if (wordById(id)) learnedIds.add(id);
      });
    });
    return learnedIds;
  }

  function bombTargetRoundCounts() {
    const source = state.bombTargetRoundCounts;
    if (!source || typeof source !== "object" || Array.isArray(source)) return {};
    const counts = {};
    Object.entries(source).forEach(([id, value]) => {
      const count = Math.max(0, Math.floor(Number(value) || 0));
      if (count > 0 && wordById(id)) counts[id] = count;
    });
    return counts;
  }

  function bombTargetRoundForId(id) {
    return Math.max(0, Math.floor(Number(state.bombTargetRoundCounts?.[id]) || 0));
  }

  function rememberBombSeenWords(ids) {
    const validIds = uniqueIds(ids).filter((id) => wordById(id));
    if (!validIds.length) return;
    state.bombSeenWordIds = uniqueIds(state.bombSeenWordIds.concat(validIds));
    scheduleBombProgressSave();
  }

  function rememberBombSeenWord(id) {
    rememberBombSeenWords([id]);
  }

  function rememberBombTargetShown(id) {
    if (!wordById(id)) return 0;
    const counts = bombTargetRoundCounts();
    counts[id] = Math.max(0, Number(counts[id]) || 0) + 1;
    state.bombTargetRoundCounts = counts;
    state.bombSeenWordIds = uniqueIds(state.bombSeenWordIds.concat(id));
    scheduleBombProgressSave();
    return counts[id];
  }

  function rememberBombAppearance(type, data = {}) {
    if (!["pinyin", "hanziPrompt", "pinyinChoice", "pinyinPart", "wordChoice"].includes(type)) return;
    const isChoice = type === "wordChoice" || type === "pinyinChoice";
    const wordId = isChoice ? data.wordId : (data.wordId || data.targetWordId);
    const word = wordById(wordId);
    if (!word) return;
    const targetWordId = data.targetWordId || data.wordId || "";
    const targetWord = wordById(targetWordId);
    const kind = type === "hanziPrompt" || type === "wordChoice" ? "hanzi" : "pinyin";
    const value = type === "hanziPrompt" || type === "wordChoice"
      ? word.char
      : (type === "pinyinPart" ? String(data.text || "") : pinyinReadingsLabel(word));
    if (!value) return;
    const history = state.bombAppearanceHistory;
    history.push({
      sequence: history.length + 1,
      timestamp: new Date().toISOString(),
      date: today(),
      world: state.world,
      subLevel: state.subLevel,
      level: state.world + "-" + state.subLevel,
      learningMode: currentLearningMode(),
      appearanceType: type,
      kind,
      value,
      wordId: word.id,
      char: word.char,
      pinyin: pinyinReadingsLabel(word),
      targetWordId: targetWord?.id || "",
      targetChar: targetWord?.char || "",
      targetPinyin: targetWord ? pinyinReadingsLabel(targetWord) : "",
      role: isChoice || type === "pinyinPart"
        ? (data.correct ? "target" : "distractor")
        : "target",
      pinyinOrder: type === "pinyinPart" ? Number(data.order) : null,
      correct: isChoice || type === "pinyinPart" ? data.correct === true : true,
    });
    if (history.length > 5000) history.splice(0, history.length - 5000);
    scheduleBombProgressSave();
  }

  function bombWordsFromLearning(learning) {
    const masteredIds = masteredIdSet(learning);
    const learnedIds = learnedIdSet(learning);
    const todayNewIds = new Set(
      (Array.isArray(learning.dailyNewIds) ? uniqueIds(learning.dailyNewIds) : [])
        .filter((id) => learnedIds.has(id))
    );
    const targetRoundCounts = bombTargetRoundCounts();
    return WORDS
      .filter((word) => learnedIds.has(word.id) && !masteredIds.has(word.id))
      .sort((a, b) => {
        const roundDifference = (Number(targetRoundCounts[a.id]) || 0) - (Number(targetRoundCounts[b.id]) || 0);
        if (roundDifference !== 0) return roundDifference;
        return Number(todayNewIds.has(b.id)) - Number(todayNewIds.has(a.id));
      })
      .slice(0, BOMB_WORDS_PER_RUN);
  }

  function bombRunWordsFromLearning(learning) {
    const masteredIds = masteredIdSet(learning);
    const evidenceWords = bombWordsFromLearning(learning);
    const selectedIds = new Set();
    const selectedCharacters = new Set();
    const words = [];
    const addWord = (word) => {
      if (
        !word ||
        masteredIds.has(word.id) ||
        selectedIds.has(word.id) ||
        selectedCharacters.has(word.char) ||
        words.length >= BOMB_WORDS_PER_RUN
      ) {
        return;
      }
      selectedIds.add(word.id);
      selectedCharacters.add(word.char);
      words.push(word);
    };
    evidenceWords.forEach(addWord);
    WORDS.forEach(addWord);
    return words;
  }

  function bombPlayAccess() {
    const learning = loadLearningState();
    return {
      learning,
      currentDate: today(),
      sources: ["unlimited"],
      used: [],
      available: ["unlimited"],
      words: bombRunWordsFromLearning(learning),
    };
  }

  function dailyNewReady() {
    const access = bombPlayAccess();
    return {
      unlocked: true,
      words: access.words,
      access,
    };
  }

  function refreshDailyNewWords() {
    const result = dailyNewReady();
    const availableIds = result.words.map((word) => word.id);
    if (!state.bombRunWordIds.length) {
      state.bombRunWordIds = availableIds;
      state.bombWordCursor = 0;
    } else {
      const masteredIds = masteredIdSet(result.access.learning);
      const restoredIds = uniqueWordIdsByCharacter(state.bombRunWordIds)
        .filter((id) => !masteredIds.has(id));
      state.bombRunWordIds = uniqueWordIdsByCharacter(restoredIds.concat(availableIds))
        .slice(0, BOMB_WORDS_PER_RUN);
      state.bombWordCursor = state.bombRunWordIds.length
        ? state.bombWordCursor % state.bombRunWordIds.length
        : 0;
    }
    return result.unlocked;
  }

  function fillLevelTargetIds(levelIds) {
    const runIds = uniqueWordIdsByCharacter(state.bombRunWordIds);
    if (!runIds.length) return levelIds;
    const runSet = new Set(runIds);
    const normalizedLevelIds = uniqueWordIdsByCharacter(levelIds).filter((id) => runSet.has(id));
    levelIds.splice(0, levelIds.length, ...normalizedLevelIds);
    const selectedCharacters = new Set(levelIds.map((id) => wordById(id)?.char).filter(Boolean));
    let inspected = 0;
    while (levelIds.length < BOMB_MOONS_PER_LEVEL && inspected < runIds.length) {
      if (state.bombWordCursor >= runIds.length) {
        state.bombWordCursor = 0;
      }
      const id = runIds[state.bombWordCursor];
      state.bombWordCursor += 1;
      inspected += 1;
      const character = wordById(id)?.char;
      if (!character || selectedCharacters.has(character)) continue;
      levelIds.push(id);
      selectedCharacters.add(character);
    }
    return levelIds;
  }

  function nextBombLevelWords() {
    const levelIds = [];
    const runSet = new Set(state.bombRunWordIds);
    const selectedCharacters = new Set();
    const addId = (id) => {
      const word = wordById(id);
      if (!word || !runSet.has(id) || selectedCharacters.has(word.char) || levelIds.length >= BOMB_MOONS_PER_LEVEL) return;
      levelIds.push(id);
      selectedCharacters.add(word.char);
    };
    uniqueIds(state.retryWordIds).forEach(addId);
    state.retryWordIds = uniqueIds(state.retryWordIds)
      .filter((id) => runSet.has(id) && !levelIds.includes(id));
    fillLevelTargetIds(levelIds);
    state.todayNewWords = levelIds.map(wordById).filter(Boolean);
  }

  function retryWordNextLevel(wordId) {
    if (!wordById(wordId) || state.retryWordIds.includes(wordId)) {
      return;
    }
    state.retryWordIds.push(wordId);
  }

  function consumeBombPlayCredit() {
    return "unlimited";
  }

  function createMap() {
    const map = Array.from({ length: ROWS }, () => Array(COLS).fill(TILE_FLOOR));
    const right = COLS - 2;
    const rightInner = COLS - 3;
    const center = Math.floor(COLS / 2);
    const middle = Math.floor(ROWS / 2);
    const protectedCells = new Set([
      "1,1", "1,2", "2,1",
      `${right},${ROWS - 2}`, `${rightInner},${ROWS - 2}`, `${right},${ROWS - 3}`,
      `${right},1`, `${rightInner},1`, `${right},2`,
      `1,${ROWS - 2}`, `1,${ROWS - 3}`, `2,${ROWS - 2}`,
      `${center},${middle}`, `${center},${middle - 1}`, `${center},${middle + 1}`,
      `${center - 1},${middle}`, `${center + 1},${middle}`,
    ]);

    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1 || (x % 2 === 0 && y % 2 === 0)) {
          map[y][x] = TILE_HARD;
          continue;
        }
        if (!protectedCells.has(coordKey(x, y)) && Math.random() < 0.43) {
          map[y][x] = TILE_CRATE;
        }
      }
    }
    // Even the sparsest random board must have room for five hidden questions and rewards.
    let crates = map.flat().filter((tile) => tile === TILE_CRATE).length;
    const minimumCrates = BOMB_MOONS_PER_LEVEL + maxFireFlowersForLevel() + 1 + bulletBillBrickCapacityForLevel();
    for (let y = 1; y < ROWS - 1 && crates < minimumCrates; y += 1) {
      for (let x = 1; x < COLS - 1 && crates < minimumCrates; x += 1) {
        if (map[y][x] === TILE_FLOOR && !protectedCells.has(coordKey(x, y))) {
          map[y][x] = TILE_CRATE;
          crates += 1;
        }
      }
    }
    return map;
  }

  function makeBulletBillEnemy(id, gx, gy, dir = "") {
    return {
      id,
      type: "bullet-bill",
      hp: 1,
      gx,
      gy,
      dir,
      move: null,
      stepsTravelled: 0,
      straightSteps: 0,
      turnPause: 0,
      turnResetPending: false,
      chaseTimer: 0,
      stunTimer: 0,
      hitCooldown: 0,
      lastSeen: null,
      seed: Math.random() * 10,
      alive: true,
    };
  }

  function createEnemies() {
    const right = COLS - 2;
    const center = Math.floor(COLS / 2);
    const middle = Math.floor(ROWS / 2);
    const starts = [
      { gx: right, gy: ROWS - 2 },
      { gx: right, gy: 1 },
      { gx: 1, gy: ROWS - 2 },
      { gx: center, gy: middle },
      { gx: Math.max(3, center - 3), gy: 1 },
      { gx: Math.min(COLS - 4, center + 3), gy: ROWS - 2 },
      { gx: 1, gy: middle },
      { gx: right, gy: middle },
    ];
    const difficultyIndex = difficultyIndexForSubLevel();
    const enemyCount = Math.min(starts.length, Math.max(0, difficultyIndex - 1));
    const enemies = starts.slice(0, enemyCount).map((start, index) => ({
      id: index + 1,
      type: index === 1 ? "bowser" : "mushroom",
      hp: index === 1 ? 2 : 1,
      gx: start.gx,
      gy: start.gy,
      dir: index % 2 ? "left" : "up",
      move: null,
      chaseTimer: 0,
      stunTimer: 0,
      hitCooldown: 0,
      lastSeen: null,
      seed: Math.random() * 10,
      alive: true,
    }));
    if (difficultyIndex >= 2) {
      enemies.push({
        id: enemies.length + 1,
        type: "koopa-green",
        hp: 1,
        gx: Math.min(COLS - 4, Math.max(3, center - 1)),
        gy: middle,
        dir: "right",
        route: ["right", "down", "left", "up"],
        routeIndex: 0,
        move: null,
        chaseTimer: 0,
        stunTimer: 0,
        hitCooldown: 0,
        lastSeen: null,
        seed: Math.random() * 10,
        alive: true,
      });
    }
    return enemies;
  }

  function seedHiddenPowerUps() {
    state.hiddenPowerUps = new Map();
    state.hiddenWordCrates = new Map();
    const candidates = [];
    for (let y = 1; y < ROWS - 1; y += 1) {
      for (let x = 1; x < COLS - 1; x += 1) {
        if (state.map[y][x] === TILE_CRATE) {
          candidates.push({ x, y });
        }
      }
    }

    candidates.sort(() => Math.random() - 0.5);
    pendingLevelWords().forEach((word) => {
      const cell = candidates.shift();
      if (cell) state.hiddenWordCrates.set(coordKey(cell.x, cell.y), word.id);
    });
    const greenMushroomCell = candidates.shift();
    if (greenMushroomCell) {
      state.hiddenPowerUps.set(coordKey(greenMushroomCell.x, greenMushroomCell.y), "greenMushroom");
    }

    const count = Math.min(maxFireFlowersForLevel(), candidates.length);
    for (let index = 0; index < count; index += 1) {
      const cell = candidates.shift();
      state.hiddenPowerUps.set(coordKey(cell.x, cell.y), "fireFlower");
    }
    for (let index = 0; index < bulletBillBrickCapacityForLevel(); index += 1) {
      const cell = candidates.shift();
      if (cell) state.hiddenPowerUps.set(coordKey(cell.x, cell.y), "bulletBill");
    }
  }

  function spawnVisibleLevelTargets(words = pendingLevelWords()) {
    const targetWords = words.filter(Boolean);
    const cells = randomOpenRewardCells(targetWords.length, true);
    const type = currentLearningMode() === LEARNING_MODES.hanzi ? "hanziPrompt" : "pinyin";
    targetWords.forEach((word, index) => {
      const cell = cells[index];
      if (cell) spawnPowerUp(type, cell.x, cell.y, { wordId: word.id });
    });
    return Math.min(targetWords.length, cells.length);
  }

  function hideMissingLevelTargets(words) {
    const cells = [];
    for (let y = 1; y < ROWS - 1; y += 1) {
      for (let x = 1; x < COLS - 1; x += 1) {
        const key = coordKey(x, y);
        if (state.map[y][x] === TILE_CRATE && !state.hiddenWordCrates.has(key) &&
            !state.hiddenPowerUps.has(key) && !powerUpAt(x, y)) cells.push({ x, y });
      }
    }
    cells.sort(() => Math.random() - 0.5);
    const revealed = [];
    words.forEach((word) => {
      const cell = cells.shift();
      if (cell) state.hiddenWordCrates.set(coordKey(cell.x, cell.y), word.id);
      else revealed.push(word); // A cleared saved board must never lose its remaining questions.
    });
    spawnVisibleLevelTargets(revealed);
  }

  function normalizeRestoredLevelTargets(preserveRevealed = true) {
    refreshDailyNewWords();
    const targetIds = uniqueWordIdsByCharacter(state.todayNewWords.map((word) => word.id));
    fillLevelTargetIds(targetIds);
    state.todayNewWords = targetIds.slice(0, BOMB_MOONS_PER_LEVEL).map(wordById).filter(Boolean);

    const targetSet = new Set(state.todayNewWords.map((word) => word.id));
    state.moonWordIds = uniqueWordIdsByCharacter(state.moonWordIds)
      .filter((id) => targetSet.has(id))
      .slice(0, BOMB_MOONS_PER_LEVEL);
    const pendingSet = new Set(pendingLevelWords().map((word) => word.id));
    if (!pendingSet.has(state.activePinyinWordId) && !pendingSet.has(state.activeHanziWordId)) {
      resetActiveLearningTask();
    }

    const mode = currentLearningMode();
    const legacyPinyinTargetId = mode === LEARNING_MODES.hanzi
      ? state.powerUps.find((powerUp) => powerUp.type === "pinyinPart")?.wordId || null
      : null;
    state.powerUps = state.powerUps.filter((powerUp) => {
      if (!isLearningPowerUp(powerUp)) return true;
      const targetId = powerUp.type === "wordChoice" || powerUp.type === "pinyinChoice"
        ? powerUp.targetWordId
        : powerUp.wordId;
      if (!pendingSet.has(targetId) || powerUp.type === "pinyinPart") return false;
      if (mode === LEARNING_MODES.pinyin) {
        return powerUp.type !== "hanziPrompt" && powerUp.type !== "pinyinChoice";
      }
      return powerUp.type !== "pinyin" && powerUp.type !== "wordChoice";
    });

    if (mode === LEARNING_MODES.pinyin) {
      state.activeHanziWordId = null;
    } else {
      state.activePinyinWordId = null;
    }
    if (legacyPinyinTargetId && pendingSet.has(legacyPinyinTargetId)) {
      state.activeHanziWordId = legacyPinyinTargetId;
      state.activePinyinStep = 0;
      state.activePinyinTotal = 0;
      spawnPinyinChoices(legacyPinyinTargetId);
    }

    const representedIds = new Set();
    uniqueIds(state.powerUps.filter((powerUp) => powerUp.type === "wordChoice").map((powerUp) => powerUp.targetWordId)).forEach((id) => representedIds.add(id));
    uniqueIds(state.powerUps.filter((powerUp) => powerUp.type === "pinyinChoice").map((powerUp) => powerUp.targetWordId)).forEach((id) => representedIds.add(id));

    state.powerUps = state.powerUps.filter((powerUp) => {
      if (powerUp.type !== "pinyin" && powerUp.type !== "hanziPrompt") return true;
      if (!preserveRevealed && !state.enemyClearOpenedBricks && crateCount() > 0) return false;
      const expectedType = mode === LEARNING_MODES.hanzi ? "hanziPrompt" : "pinyin";
      if (powerUp.type !== expectedType) return false;
      if (!pendingSet.has(powerUp.wordId) || representedIds.has(powerUp.wordId)) return false;
      representedIds.add(powerUp.wordId);
      return true;
    });

    const openedWords = [];
    state.hiddenWordCrates = new Map([...state.hiddenWordCrates].filter(([key, id]) => {
      if (!pendingSet.has(id) || representedIds.has(id)) return false;
      const [gx, gy] = key.split(",").map(Number);
      if (!Number.isInteger(gx) || !Number.isInteger(gy) || gx < 1 || gx >= COLS - 1 || gy < 1 || gy >= ROWS - 1) return false;
      representedIds.add(id);
      if (state.map[gy][gx] === TILE_CRATE) return true;
      openedWords.push(wordById(id));
      return false;
    }));
    spawnVisibleLevelTargets(openedWords);
    const missingWords = pendingLevelWords().filter((word) => !representedIds.has(word.id));
    hideMissingLevelTargets(missingWords);
  }

  function setupSubLevel() {
    awaitingContinue = false;
    startButton.textContent = "开始";
    refreshDailyNewWords();
    setLevelDimensions(state.subLevel);
    state.status = "ready";
    state.map = createMap();
    state.bombs = [];
    state.explosions = [];
    state.particles = [];
    state.powerUps = [];
    state.shells = [];
    state.enemies = createEnemies();
    state.player = makePlayer();
    state.fireFlowersSpawned = 0;
    state.hiddenPowerUps = new Map();
    state.hiddenWordCrates = new Map();
    state.moonWordIds = [];
    state.enemyClearOpenedBricks = false;
    nextBombLevelWords();
    resetActiveLearningTask();
    state.dayClock = 0;
    clearInputState();
    seedHiddenPowerUps();
    startTitle.textContent = `第 ${state.world}-${state.subLevel} / ${LEVELS_PER_WORLD} 小关 · 难度 ${difficultyLabelForSubLevel()}`;
    overlayStartButton.textContent = state.subLevel === 1 ? "开始" : "继续";
    startLayer.classList.remove("hidden");
    setMessage(`第 ${state.world}-${state.subLevel} 小关 · 难度 ${difficultyLabelForSubLevel()}：${currentLearningModeLabel()}`);
    updateHud();
    saveBombProgress();
  }

  function resetGame() {
    state.bombRunWordIds = [];
    state.bombWordCursor = 0;
    state.retryWordIds = [];
    state.todayNewWords = [];
    hydrateLegacyBombMetadataIfEmpty();
    state.bombTargetRoundCounts = bombTargetRoundCounts();
    refreshDailyNewWords();
    state.playSource = null;
    state.world = 1;
    state.subLevel = 1;
    state.score = 0;
    state.hp = MAX_HP;
    state.bombLimit = 3;
    state.flameRange = 1;
    state.shells = [];
    state.moonWordIds = [];
    state.enemyClearOpenedBricks = false;
    resetActiveLearningTask();
    state.dayClock = 0;
    clearInputState();
    setupSubLevel();
  }

  function startGame() {
    sounds.unlock();
    claimBombProgress();
    const resuming = awaitingContinue;
    awaitingContinue = false;
    startButton.textContent = "开始";
    if (state.status === "locked") {
      resetGame();
    }
    if (state.status === "win" || state.status === "gameover") {
      resetGame();
    }
    refreshDailyNewWords();
    if (!state.playSource) {
      state.playSource = consumeBombPlayCredit();
    }
    clearInputState();
    state.status = "playing";
    startLayer.classList.add("hidden");
    sounds.setMusic(state.world);
    setMessage(resuming ? "继续" : "开始");
    canvas.focus();
    updateHud();
    saveBombProgress();
  }

  function restartGame() {
    claimBombProgress();
    resetGame();
    startGame();
  }

  function setMessage(text, seconds = 1.4) {
    messageNode.textContent = text;
    messageTimer = seconds;
  }

  function isNightTime() {
    return false;
  }

  function updateHud() {
    hpNode.textContent = state.hp;
    ammoNode.textContent = Math.max(0, state.bombLimit - state.bombs.length);
    mushroomNode.textContent = state.enemies.filter((enemy) => enemy.alive).length;
    if (levelNode) levelNode.textContent = `${state.world}-${state.subLevel}/${LEVELS_PER_WORLD} ${difficultyLabelForSubLevel()}`;
    if (powerNode) powerNode.textContent = state.flameRange;
    if (moonNode) moonNode.textContent = `${state.moonWordIds.length}/${BOMB_MOONS_PER_LEVEL}`;
    moonIconNode?.classList.toggle("is-lit", state.moonWordIds.length > 0);
    if (scoreNode) scoreNode.textContent = state.score;
  }

  function crateCount() {
    return state.map.reduce((total, row) => total + row.filter((tile) => tile === TILE_CRATE).length, 0);
  }

  function livingEnemyCount() {
    return state.enemies.filter((enemy) => enemy.alive).length;
  }

  function isAvailableLearningPowerUp(powerUp) {
    if (!isLearningPowerUp(powerUp)) return false;
    if (powerUp.type === "wordChoice" || powerUp.type === "pinyinChoice") {
      return !isLevelWordComplete(powerUp.targetWordId);
    }
    return !isLevelWordComplete(powerUp.wordId);
  }

  function hasVisibleLearningPowerUp() {
    return state.powerUps.some(isAvailableLearningPowerUp);
  }

  function autoOpenBricksAfterEnemyClear() {
    if (state.enemyClearOpenedBricks || state.enemies.length === 0 || livingEnemyCount() > 0 || state.bombs.some(bomb => bomb.isRed && !bomb.exploded)) {
      return;
    }
    state.enemyClearOpenedBricks = true;
    const shouldGuideFirstLearningPowerUp = !hasVisibleLearningPowerUp();
    const powerUpStartIndex = state.powerUps.length;
    let opened = 0;

    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (state.map[y][x] !== TILE_CRATE) continue;
        // Hidden missiles must be revealed by the player, never by enemy-clear cleanup.
        if (state.hiddenPowerUps.get(coordKey(x, y)) === "bulletBill") continue;
        state.map[y][x] = TILE_FLOOR;
        maybeSpawnBrickPowerUp(x, y);
        spawnParticles("crate", x, y);
        opened += 1;
      }
    }

    if (opened > 0) {
      state.score += opened * 5;
      if (shouldGuideFirstLearningPowerUp) {
        const guidedPowerUp = state.powerUps.slice(powerUpStartIndex).find(isAvailableLearningPowerUp);
        if (guidedPowerUp) {
          guidedPowerUp.guided = true;
        }
      }
      setMessage(`怪物清空，自动打开 ${opened} 个砖块${hasHiddenBulletBillBrick() ? "，剩余导弹砖块请手动炸开" : ""}`, 2);
      updateHud();
    }
  }

  function advanceSubLevel() {
    if (state.subLevel < LEVELS_PER_WORLD) {
      state.subLevel += 1;
      setupSubLevel();
      setMessage(`进入第 ${state.world}-${state.subLevel} 小关 · 难度 ${difficultyLabelForSubLevel()}，威力 ${state.flameRange} 格`, 2.2);
      return;
    }
    if (state.world < WORLDS_PER_RUN) {
      state.world += 1;
      state.subLevel = 1;
      setupSubLevel();
      setMessage(`进入第 ${state.world}-${state.subLevel} 小关 · 难度 ${difficultyLabelForSubLevel()}，威力 ${state.flameRange} 格`, 2.2);
      return;
    }
    state.status = "win";
    startTitle.textContent = "全部关卡完成";
    overlayStartButton.textContent = "再来一局";
    startLayer.classList.remove("hidden");
    setMessage("全部关卡完成", 3);
  }

  function hasHiddenBulletBillBrick() {
    return [...state.hiddenPowerUps].some(([key, type]) => {
      if (type !== "bulletBill") return false;
      const [x, y] = key.split(",").map(Number);
      return state.map[y]?.[x] === TILE_CRATE;
    });
  }

  function checkLevelComplete() {
    if (state.status !== "playing" && state.status !== "ready") return;
    const learningDone = state.moonWordIds.length >= BOMB_MOONS_PER_LEVEL;
    if (learningDone && livingEnemyCount() === 0 && !hasHiddenBulletBillBrick() && !state.bombs.some(bomb => bomb.isRed && !bomb.exploded) && (state.enemies.length > 0 || crateCount() === 0)) {
      advanceSubLevel();
    }
  }

  function isInside(gx, gy) {
    return gx >= 0 && gy >= 0 && gx < COLS && gy < ROWS;
  }

  function bombAt(gx, gy) {
    return state.bombs.find((bomb) => !bomb.exploded && bomb.gx === gx && bomb.gy === gy);
  }

  function shellAt(gx, gy) {
    return state.shells.find((shell) => shell.alive && Math.round(shell.gx) === gx && Math.round(shell.gy) === gy);
  }

  function isCellOpen(gx, gy, actor) {
    const cellX = Math.round(gx);
    const cellY = Math.round(gy);
    if (!isInside(cellX, cellY)) return false;
    if (state.map[cellY]?.[cellX] !== TILE_FLOOR) return false;
    if (shellAt(cellX, cellY)) return false;
    const blockingBomb = bombAt(cellX, cellY);
    if (!blockingBomb) return true;
    if (actor === "player" && blockingBomb.ownerInside && Math.round(state.player.gx) === cellX && Math.round(state.player.gy) === cellY) {
      return true;
    }
    return false;
  }

  function preferredDirection() {
    if (heldDirections.has(lastDirection)) return lastDirection;
    return Array.from(heldDirections)[0] || "";
  }

  function startMove(actor, direction, duration) {
    if (actor === state.player) rememberPlayerCell(Math.round(actor.gx), Math.round(actor.gy));
    const dir = DIRS[direction];
    const targetX = Math.round(actor.gx) + dir.x;
    const targetY = Math.round(actor.gy) + dir.y;
    actor.move = {
      direction,
      fromX: Math.round(actor.gx),
      fromY: Math.round(actor.gy),
      toX: targetX,
      toY: targetY,
      time: 0,
      duration,
    };
  }

  function advanceMove(actor, dt, linear = false) {
    if (!actor.move) return false;
    actor.move.time += dt;
    const ratio = clamp(actor.move.time / actor.move.duration, 0, 1);
    const ease = linear ? ratio : ratio < 0.5 ? 2 * ratio * ratio : 1 - Math.pow(-2 * ratio + 2, 2) / 2;
    actor.gx = actor.move.fromX + (actor.move.toX - actor.move.fromX) * ease;
    actor.gy = actor.move.fromY + (actor.move.toY - actor.move.fromY) * ease;
    if (ratio >= 1) {
      actor.gx = actor.move.toX;
      actor.gy = actor.move.toY;
      if (actor === state.player) rememberPlayerCell(actor.gx, actor.gy);
      actor.move = null;
      return true;
    }
    return false;
  }

  function stopEnemyMoveBeforeBomb(enemy) {
    if (enemy.type === "bullet-bill") return false;
    if (!enemy.move) return false;
    if (!bombAt(enemy.move.toX, enemy.move.toY)) return false;
    enemy.gx = enemy.move.fromX;
    enemy.gy = enemy.move.fromY;
    enemy.move = null;
    enemy.chaseTimer = 0;
    return true;
  }

  function stopEnemiesMovingIntoBombs() {
    state.enemies.forEach((enemy) => {
      if (enemy.alive) {
        stopEnemyMoveBeforeBomb(enemy);
      }
    });
  }

  function updatePlayer(dt) {
    const player = state.player;
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    state.bombs.forEach((bomb) => {
      if (bomb.ownerInside && (Math.round(player.gx) !== bomb.gx || Math.round(player.gy) !== bomb.gy)) {
        bomb.ownerInside = false;
      }
    });

    if (advanceMove(player, dt) || player.move) return;
    const direction = preferredDirection();
    if (!direction) return;
    const dir = DIRS[direction];
    const targetX = Math.round(player.gx) + dir.x;
    const targetY = Math.round(player.gy) + dir.y;
    const shell = shellAt(targetX, targetY);
    if (shell) {
      pushShell(shell, direction);
      return;
    }
    if (isCellOpen(targetX, targetY, "player")) {
      startMove(player, direction, PLAYER_MOVE_TIME);
    }
  }

  function placeBomb() {
    if (state.status !== "playing" || state.bombs.length >= state.bombLimit || state.player.move) return;
    const gx = Math.round(state.player.gx);
    const gy = Math.round(state.player.gy);
    if (bombAt(gx, gy)) return;
    state.bombs.push({
      gx,
      gy,
      time: 0,
      range: state.flameRange,
      ownerInside: true,
      exploded: false,
    });
    sounds.play("place");
    stopEnemiesMovingIntoBombs();
    updateHud();
    saveBombProgress();
  }

  function blocksEnemySight(gx, gy) {
    return !isInside(gx, gy) || state.map[gy][gx] !== TILE_FLOOR || Boolean(bombAt(gx, gy));
  }

  function hasLineOfSight(ex, ey, px, py) {
    let x = ex;
    let y = ey;
    const dx = Math.abs(px - ex);
    const dy = Math.abs(py - ey);
    const sx = ex < px ? 1 : -1;
    const sy = ey < py ? 1 : -1;
    let err = dx - dy;

    while (!(x === px && y === py)) {
      const twiceErr = err * 2;
      if (twiceErr > -dy) {
        err -= dy;
        x += sx;
      }
      if (twiceErr < dx) {
        err += dx;
        y += sy;
      }
      if (x === px && y === py) {
        return true;
      }
      if (blocksEnemySight(x, y)) {
        return false;
      }
    }
    return true;
  }

  function canEnemySeePlayer(enemy) {
    const ex = Math.round(enemy.gx);
    const ey = Math.round(enemy.gy);
    const px = Math.round(state.player.gx);
    const py = Math.round(state.player.gy);
    if (ex === px && ey === py) {
      return true;
    }
    const vectorX = px - ex;
    const vectorY = py - ey;
    const distance = Math.hypot(vectorX, vectorY);
    if (distance > ENEMY_SIGHT_RANGE) {
      return false;
    }

    const forward = DIRS[enemy.dir] || DIRS.left;
    const facingRatio = (vectorX * forward.x + vectorY * forward.y) / distance;
    if (facingRatio < Math.cos(ENEMY_VISION_HALF_ANGLE)) {
      return false;
    }

    return hasLineOfSight(ex, ey, px, py);
  }

  function directionsTowardPlayer(enemy, options) {
    const px = Math.round(state.player.gx);
    const py = Math.round(state.player.gy);
    const ex = Math.round(enemy.gx);
    const ey = Math.round(enemy.gy);
    const currentDistance = Math.abs(px - ex) + Math.abs(py - ey);
    return options
      .map((direction) => {
        const dir = DIRS[direction];
        const nextDistance = Math.abs(px - (ex + dir.x)) + Math.abs(py - (ey + dir.y));
        return { direction, nextDistance };
      })
      .filter((entry) => entry.nextDistance <= currentDistance)
      .sort((a, b) => a.nextDistance - b.nextDistance)
      .map((entry) => entry.direction);
  }

  function chooseEnemyDirection(enemy, options) {
    if (canEnemySeePlayer(enemy)) {
      enemy.chaseTimer = ENEMY_CHASE_TIME;
      const chaseOptions = directionsTowardPlayer(enemy, options);
      if (chaseOptions.length) {
        return chaseOptions[0];
      }
    } else {
      enemy.chaseTimer = 0;
      enemy.lastSeen = null;
    }

    const currentDir = options.includes(enemy.dir) && Math.random() < 0.56 ? enemy.dir : "";
    return currentDir || randomItem(options);
  }

  function chooseKoopaDirection(enemy) {
    const route = Array.isArray(enemy.route) && enemy.route.length ? enemy.route : ["right", "down", "left", "up"];
    for (let offset = 0; offset < route.length; offset += 1) {
      const routeIndex = (enemy.routeIndex + offset) % route.length;
      const direction = route[routeIndex];
      const dir = DIRS[direction];
      if (dir && isCellOpen(enemy.gx + dir.x, enemy.gy + dir.y, "enemy")) {
        enemy.routeIndex = routeIndex;
        return direction;
      }
    }
    return "";
  }

  function isBulletBillCellOpen(gx, gy) {
    const cellX = Math.round(gx);
    const cellY = Math.round(gy);
    return isInside(cellX, cellY) && state.map[cellY]?.[cellX] === TILE_FLOOR && !shellAt(cellX, cellY);
  }

  function chooseBulletBillDirection(enemy) {
    const startX = Math.round(enemy.gx);
    const startY = Math.round(enemy.gy);
    const targetX = Math.round(state.player.gx);
    const targetY = Math.round(state.player.gy);
    if (startX === targetX && startY === targetY) return "";

    const directionNames = Object.keys(DIRS).sort((left, right) => {
      if (left === enemy.dir) return -1;
      if (right === enemy.dir) return 1;
      const leftDir = DIRS[left];
      const rightDir = DIRS[right];
      const leftDistance = Math.abs(targetX - (startX + leftDir.x)) + Math.abs(targetY - (startY + leftDir.y));
      const rightDistance = Math.abs(targetX - (startX + rightDir.x)) + Math.abs(targetY - (startY + rightDir.y));
      return leftDistance - rightDistance;
    });
    const queue = [{ gx: startX, gy: startY, firstDirection: "" }];
    const visited = new Set([coordKey(startX, startY)]);
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      for (const direction of directionNames) {
        const dir = DIRS[direction];
        const gx = current.gx + dir.x;
        const gy = current.gy + dir.y;
        const key = coordKey(gx, gy);
        if (visited.has(key) || !isBulletBillCellOpen(gx, gy)) continue;
        const firstDirection = current.firstDirection || direction;
        if (gx === targetX && gy === targetY) return firstDirection;
        visited.add(key);
        queue.push({ gx, gy, firstDirection });
      }
    }
    return directionNames.find((direction) => {
      const dir = DIRS[direction];
      return isBulletBillCellOpen(startX + dir.x, startY + dir.y);
    }) || "";
  }

  function normalizeBulletBillMotion(enemy) {
    if (enemy.type !== "bullet-bill") return;
    enemy.straightSteps = 0;
    enemy.turnPause = 0;
    enemy.turnResetPending = false;
    if (enemy.move) {
      const progress = enemy.move.duration > 0 ? clamp(enemy.move.time / enemy.move.duration, 0, 1) : 0;
      enemy.move.duration = BULLET_BILL_MOVE_TIME;
      enemy.move.time = progress * BULLET_BILL_MOVE_TIME;
    }
  }

  function convertBombTouchedByBulletBill(enemy) {
    if (!enemy.alive) return false;
    const touchedBomb = bombAt(Math.round(enemy.gx), Math.round(enemy.gy));
    if (!touchedBomb) return false;
    enemy.alive = false;
    enemy.move = null;
    // Reuse the player's bomb, including its range and escape permission; only recolor it.
    if (!touchedBomb.isRed) {
      touchedBomb.isRed = true;
      touchedBomb.time = 0;
    }
    setMessage("导弹变成红色炸弹，威力不变", 1.4);
    updateHud();
    saveBombProgress();
    return true;
  }

  function updateBulletBill(enemy, dt) {
    enemy.stepsTravelled = Math.max(0, Number(enemy.stepsTravelled) || 0);
    if (convertBombTouchedByBulletBill(enemy)) return;

    if (enemy.move) {
      if (!advanceMove(enemy, dt, true)) return;
      enemy.stepsTravelled += 1;
      if (convertBombTouchedByBulletBill(enemy)) return;
    }
    const nextDirection = chooseBulletBillDirection(enemy);
    if (!nextDirection) return;
    enemy.dir = nextDirection;
    startMove(enemy, nextDirection, BULLET_BILL_MOVE_TIME);
  }

  function updateEnemies(dt) {
    state.enemies.forEach((enemy) => {
      if (!enemy.alive) return;
      if (enemy.type === "bullet-bill") {
        updateBulletBill(enemy, dt);
        return;
      }
      enemy.chaseTimer = Math.max(0, enemy.chaseTimer - dt);
      enemy.hitCooldown = Math.max(0, enemy.hitCooldown - dt);
      enemy.stunTimer = Math.max(0, enemy.stunTimer - dt);
      if (isNightTime() && enemy.type !== "koopa-green") {
        enemy.gx = Math.round(enemy.gx);
        enemy.gy = Math.round(enemy.gy);
        enemy.move = null;
        enemy.chaseTimer = 0;
        return;
      }
      if (enemy.stunTimer > 0) {
        enemy.move = null;
        return;
      }
      if (stopEnemyMoveBeforeBomb(enemy)) return;
      // Scale displacement, including a move already in progress in a restored save.
      if (advanceMove(enemy, enemy.type === "mushroom" ? dt * MUSHROOM_SPEED_FACTOR : dt) || enemy.move) return;

      if (enemy.type === "koopa-green") {
        const nextDir = chooseKoopaDirection(enemy);
        if (!nextDir) return;
        enemy.dir = nextDir;
        startMove(enemy, nextDir, KOOPA_MOVE_TIME);
        enemy.routeIndex = (enemy.routeIndex + 1) % enemy.route.length;
        return;
      }

      const options = Object.keys(DIRS).filter((direction) => {
        const dir = DIRS[direction];
        return isCellOpen(enemy.gx + dir.x, enemy.gy + dir.y, "enemy");
      });
      if (!options.length) return;

      const nextDir = chooseEnemyDirection(enemy, options);
      enemy.dir = nextDir;
      const moveTime = ENEMY_MOVE_TIME + Math.random() * ENEMY_MOVE_RANDOM_TIME;
      startMove(enemy, nextDir, moveTime);
    });
  }

  function updateBombs(dt) {
    state.bombs.forEach((bomb) => {
      bomb.time += dt;
      if (bomb.time >= BOMB_TIMER) {
        explodeBomb(bomb);
      }
    });
    const redBombExploded = state.bombs.some(bomb => bomb.isRed && bomb.exploded);
    state.bombs = state.bombs.filter((bomb) => !bomb.exploded);
    if (redBombExploded) {
      autoOpenBricksAfterEnemyClear();
      checkLevelComplete();
    }
  }

  function openCrateCell(gx, gy) {
    if (!isInside(gx, gy) || state.map[gy][gx] !== TILE_CRATE) return false;
    state.map[gy][gx] = TILE_FLOOR;
    maybeSpawnBrickPowerUp(gx, gy);
    spawnParticles("crate", gx, gy);
    state.score += 5;
    return true;
  }

  function spawnBulletBill(gx, gy) {
    const id = state.enemies.reduce((maximum, enemy) => Math.max(maximum, Number(enemy.id) || 0), 0) + 1;
    state.enemies.push(makeBulletBillEnemy(id, gx, gy));
    spawnParticles("enemy", gx, gy);
    setMessage("导弹出现，已锁定小飞星", 1.8);
    updateHud();
  }

  function spawnShell(gx, gy, direction = "") {
    state.shells = state.shells.filter((shell) => shell.alive && (Math.round(shell.gx) !== gx || Math.round(shell.gy) !== gy));
    state.shells.push({
      type: "shell-green",
      gx,
      gy,
      dir: direction,
      move: null,
      active: Boolean(direction),
      seed: Math.random() * 10,
      alive: true,
    });
    spawnParticles("shell", gx, gy);
  }

  function removeShell(shell) {
    shell.alive = false;
    shell.move = null;
    spawnParticles("shell", Math.round(shell.gx), Math.round(shell.gy));
  }

  function enemyAt(gx, gy) {
    return state.enemies.find((enemy) => enemy.alive && Math.round(enemy.gx) === gx && Math.round(enemy.gy) === gy);
  }

  function continueShellRun(shell) {
    const dir = DIRS[shell.dir];
    if (!dir || !shell.alive) return;
    const fromX = Math.round(shell.gx);
    const fromY = Math.round(shell.gy);
    const nextX = fromX + dir.x;
    const nextY = fromY + dir.y;
    if (!isInside(nextX, nextY) || state.map[nextY][nextX] === TILE_HARD) {
      removeShell(shell);
      return;
    }

    const blockingBomb = bombAt(nextX, nextY);
    if (blockingBomb) {
      blockingBomb.time = BOMB_TIMER;
      removeShell(shell);
      return;
    }

    if (state.map[nextY][nextX] === TILE_CRATE) {
      openCrateCell(nextX, nextY);
      updateHud();
    }

    const enemy = enemyAt(nextX, nextY);
    if (enemy) {
      damageEnemy(enemy);
    }

    startMove(shell, shell.dir, SHELL_MOVE_TIME);
  }

  function pushShell(shell, direction) {
    if (!shell.alive || shell.move) return;
    shell.dir = direction;
    shell.active = true;
    continueShellRun(shell);
  }

  function updateShells(dt) {
    let openedBrick = false;
    state.shells.forEach((shell) => {
      if (!shell.alive) return;
      if (advanceMove(shell, dt) && shell.active) {
        const beforeScore = state.score;
        continueShellRun(shell);
        if (state.score !== beforeScore) openedBrick = true;
      }
    });
    state.shells = state.shells.filter((shell) => shell.alive);
    if (openedBrick) {
      checkLevelComplete();
    }
  }

  function powerUpAt(gx, gy) {
    return state.powerUps.find((powerUp) => powerUp.gx === gx && powerUp.gy === gy);
  }

  function isCellOccupiedForReward(gx, gy) {
    if (Math.round(state.player.gx) === gx && Math.round(state.player.gy) === gy) return true;
    if (powerUpAt(gx, gy)) return true;
    if (bombAt(gx, gy)) return true;
    if (shellAt(gx, gy)) return true;
    return state.enemies.some((enemy) => enemy.alive && Math.round(enemy.gx) === gx && Math.round(enemy.gy) === gy);
  }

  function randomOpenRewardCells(count, ensureCount = false) {
    const cells = [];
    for (let y = 1; y < ROWS - 1; y += 1) {
      for (let x = 1; x < COLS - 1; x += 1) {
        if (state.map[y][x] === TILE_FLOOR && !isCellOccupiedForReward(x, y)) {
          cells.push({ x, y });
        }
      }
    }
    cells.sort(() => Math.random() - 0.5);
    if (!ensureCount || cells.length >= count) {
      return cells.slice(0, count);
    }
    while (cells.length < count) {
      const crateCandidates = [];
      for (let y = 1; y < ROWS - 1; y += 1) {
        for (let x = 1; x < COLS - 1; x += 1) {
          const key = coordKey(x, y);
          if (
            state.map[y][x] !== TILE_CRATE ||
            isCellOccupiedForReward(x, y) ||
            state.hiddenWordCrates.has(key) ||
            state.hiddenPowerUps.has(key)
          ) {
            continue;
          }
          const besideOpenFloor = Object.values(DIRS).some((dir) => state.map[y + dir.y]?.[x + dir.x] === TILE_FLOOR);
          crateCandidates.push({
            x,
            y,
            besideOpenFloor,
            distance: Math.abs(x - state.player.gx) + Math.abs(y - state.player.gy),
          });
        }
      }
      crateCandidates.sort((a, b) => (
        Number(b.besideOpenFloor) - Number(a.besideOpenFloor) ||
        a.distance - b.distance ||
        Math.random() - 0.5
      ));
      const cell = crateCandidates[0];
      if (!cell) break;
      state.map[cell.y][cell.x] = TILE_FLOOR;
      spawnParticles("crate", cell.x, cell.y);
      cells.push({ x: cell.x, y: cell.y });
    }
    return cells.slice(0, count);
  }

  function activeWordChoiceTargetId() {
    const choice = state.powerUps.find((powerUp) => (
      powerUp.type === "wordChoice" && !isLevelWordComplete(powerUp.targetWordId)
    ));
    return choice ? choice.targetWordId : null;
  }

  function activePinyinChoiceTargetId() {
    const choice = state.powerUps.find((powerUp) => (
      powerUp.type === "pinyinChoice" && !isLevelWordComplete(powerUp.targetWordId)
    ));
    return choice ? choice.targetWordId : null;
  }

  function activeLearningTargetId() {
    return activeWordChoiceTargetId() || activePinyinChoiceTargetId() || state.activePinyinWordId || state.activeHanziWordId;
  }

  function bombRunWords() {
    return uniqueIds(state.bombRunWordIds).map(wordById).filter(Boolean);
  }

  function bombDistractorWordsForTarget(targetWordId) {
    const learning = loadLearningState();
    const seenIds = bombSeenIdSet(learning);
    const candidates = bombRunWords().filter((word) => word.id !== targetWordId);
    const previousTargets = candidates
      .filter((word) => seenIds.has(word.id) || bombTargetRoundForId(word.id) > 0)
      .sort(() => Math.random() - 0.5);
    const upcomingTargets = candidates
      .filter((word) => !previousTargets.some((item) => item.id === word.id))
      .sort(() => Math.random() - 0.5);
    return previousTargets.concat(upcomingTargets);
  }

  function spawnWordChoices(targetWordId) {
    const targetWord = wordById(targetWordId);
    if (!targetWord) return;
    const distractors = bombDistractorWordsForTarget(targetWordId).slice(0, 2);
    const choices = [targetWord].concat(distractors).sort(() => Math.random() - 0.5);
    const cells = randomOpenRewardCells(choices.length, true);
    choices.forEach((word, index) => {
      const cell = cells[index];
      if (!cell) return;
      spawnPowerUp("wordChoice", cell.x, cell.y, {
        wordId: word.id,
        targetWordId,
        correct: word.id === targetWordId,
      });
    });
  }

  function pinyinChoiceWordsForTarget(targetWordId) {
    const targetWord = wordById(targetWordId);
    if (!targetWord) return [];
    const labels = new Set([pinyinReadingsLabel(targetWord)]);
    const distractors = [];
    bombDistractorWordsForTarget(targetWordId).forEach((word) => {
      const label = pinyinReadingsLabel(word);
      if (!label || labels.has(label) || distractors.length >= 2) return;
      labels.add(label);
      distractors.push(word);
    });
    return [targetWord].concat(distractors).sort(() => Math.random() - 0.5);
  }

  function spawnPinyinChoices(targetWordId) {
    const targetWord = wordById(targetWordId);
    if (!targetWord) return;
    const choices = pinyinChoiceWordsForTarget(targetWordId);
    const cells = randomOpenRewardCells(choices.length, true);
    state.activeHanziWordId = targetWordId;
    state.activePinyinStep = 0;
    state.activePinyinTotal = 0;
    choices.forEach((word, index) => {
      const cell = cells[index];
      if (!cell) return;
      spawnPowerUp("pinyinChoice", cell.x, cell.y, {
        wordId: word.id,
        targetWordId,
        correct: word.id === targetWordId,
      });
    });
  }

  function clearPinyinChoices(targetWordId) {
    state.powerUps = state.powerUps.filter((powerUp) => (
      powerUp.type !== "pinyinChoice" || powerUp.targetWordId !== targetWordId
    ));
  }

  function respawnHanziPrompt(targetWordId) {
    const cell = randomOpenRewardCells(1)[0];
    if (cell) {
      spawnPowerUp("hanziPrompt", cell.x, cell.y, { wordId: targetWordId, skipTargetRound: true });
    }
  }

  function spawnPowerUp(type, gx, gy, data = {}) {
    if ((type === "pinyin" || type === "hanziPrompt") && data.wordId && data.skipTargetRound !== true) {
      rememberBombTargetShown(data.wordId);
    }
    rememberBombAppearance(type, data);
    state.powerUps.push({
      type,
      gx,
      gy,
      seed: Math.random() * 10,
      ...data,
    });
  }

  function maybeSpawnBrickPowerUp(gx, gy) {
    if (powerUpAt(gx, gy)) return;
    const key = coordKey(gx, gy);
    const wordId = state.hiddenWordCrates.get(key);
    if (wordId) {
      state.hiddenWordCrates.delete(key);
      spawnPowerUp(currentLearningMode() === LEARNING_MODES.hanzi ? "hanziPrompt" : "pinyin", gx, gy, { wordId });
      return;
    }
    const hiddenType = state.hiddenPowerUps.get(key);
    if (hiddenType) {
      state.hiddenPowerUps.delete(key);
      if (hiddenType === "bulletBill") {
        spawnBulletBill(gx, gy);
        return;
      }
      if (hiddenType === "fireFlower") {
        state.fireFlowersSpawned += 1;
      }
      spawnPowerUp(hiddenType, gx, gy);
      return;
    }
  }

  function destroyFireFlowersInCells(cells, eligibleKeys) {
    const hitKeys = new Set(cells.map((cell) => coordKey(cell.gx, cell.gy)));
    let destroyed = 0;
    state.powerUps = state.powerUps.filter((powerUp) => {
      if (powerUp.type !== "fireFlower") {
        return true;
      }
      const key = coordKey(powerUp.gx, powerUp.gy);
      if (!hitKeys.has(key) || (eligibleKeys && !eligibleKeys.has(key))) {
        return true;
      }
      destroyed += 1;
      spawnParticles("blast", powerUp.gx, powerUp.gy);
      return false;
    });
    if (destroyed > 0) {
      setMessage("火焰花被炸掉", 1.2);
    }
    return destroyed;
  }

  function collectPowerUps() {
    const px = Math.round(state.player.gx);
    const py = Math.round(state.player.gy);
    state.powerUps.forEach((powerUp) => {
      if (powerUp.wrongLock && (powerUp.gx !== px || powerUp.gy !== py)) {
        powerUp.wrongLock = false;
      }
    });
    let extraLives = 0;
    let flameBoosts = 0;
    let collectedPinyin = null;
    let collectedHanziPrompt = null;
    let collectedCorrectPinyin = null;
    let collectedWrongPinyin = null;
    let collectedCorrectWord = null;
    let collectedWrongWord = null;
    let wrongWordTargetId = "";
    let wrongPinyinWordId = null;
    let wrongPinyinText = "";
    let blockedLearning = false;
    const lockedTargetId = activeLearningTargetId();

    state.powerUps = state.powerUps.filter((powerUp) => {
      if (powerUp.gx !== px || powerUp.gy !== py) {
        return true;
      }
      if (powerUp.type === "pinyin") {
        if (isLevelWordComplete(powerUp.wordId)) {
          return false;
        }
        if (lockedTargetId) {
          blockedLearning = true;
          return true;
        }
        collectedPinyin = wordById(powerUp.wordId);
        spawnParticles("pinyin", powerUp.gx, powerUp.gy);
        return false;
      }
      if (powerUp.type === "hanziPrompt") {
        if (isLevelWordComplete(powerUp.wordId)) {
          return false;
        }
        if (lockedTargetId) {
          blockedLearning = true;
          return true;
        }
        collectedHanziPrompt = wordById(powerUp.wordId);
        spawnParticles("pinyin", powerUp.gx, powerUp.gy);
        return false;
      }
      if (powerUp.type === "pinyinChoice") {
        if (isLevelWordComplete(powerUp.targetWordId)) {
          return false;
        }
        if (powerUp.wrongLock) {
          return true;
        }
        const optionWord = wordById(powerUp.wordId);
        if (powerUp.correct && state.activeHanziWordId === powerUp.targetWordId) {
          collectedCorrectPinyin = { ...powerUp, optionWord };
          completeLearningTarget(powerUp.targetWordId);
          spawnParticles("moon", powerUp.gx, powerUp.gy);
          return false;
        }
        collectedWrongPinyin = { ...powerUp, optionWord };
        wrongPinyinWordId = state.activeHanziWordId || powerUp.targetWordId;
        wrongPinyinText = optionWord ? pinyinReadingsLabel(optionWord) : "";
        powerUp.wrongLock = true;
        spawnParticles("wrong", powerUp.gx, powerUp.gy);
        return true;
      }
      if (powerUp.type === "wordChoice") {
        if (isLevelWordComplete(powerUp.targetWordId)) {
          return false;
        }
        if (powerUp.wrongLock) {
          return true;
        }
        const word = wordById(powerUp.wordId);
        if (powerUp.correct) {
          collectedCorrectWord = word;
          completeLearningTarget(powerUp.targetWordId);
          spawnParticles("moon", powerUp.gx, powerUp.gy);
          return false;
        }
        collectedWrongWord = word;
        wrongWordTargetId = powerUp.targetWordId;
        powerUp.wrongLock = true;
        spawnParticles("wrong", powerUp.gx, powerUp.gy);
        return true;
      }
      if (powerUp.type === "greenMushroom") {
        extraLives += 1;
        spawnParticles("life", powerUp.gx, powerUp.gy);
      }
      if (powerUp.type === "fireFlower") {
        flameBoosts += 1;
        spawnParticles("blast", powerUp.gx, powerUp.gy);
      }
      return false;
    });

    if (collectedPinyin) {
      state.activePinyinWordId = collectedPinyin.id;
      spawnWordChoices(collectedPinyin.id);
      setMessage(`拼音 ${pinyinReadingsLabel(collectedPinyin)}：找到对应的字`);
    } else if (collectedHanziPrompt) {
      spawnPinyinChoices(collectedHanziPrompt.id);
      if (activePinyinChoiceTargetId()) {
        setMessage(`汉字 ${collectedHanziPrompt.char}：找到对应的拼音`);
      } else {
        resetActiveLearningTask();
        respawnHanziPrompt(collectedHanziPrompt.id);
        setMessage("空位不够，重新投放汉字", 1.2);
      }
    } else if (blockedLearning && messageTimer <= 0) {
      setMessage("先完成上一个学习任务", 1.2);
    }
    if (collectedCorrectPinyin) {
      sounds.play("correct");
      const targetWord = wordById(collectedCorrectPinyin.targetWordId);
      state.retryWordIds = state.retryWordIds.filter((id) => id !== collectedCorrectPinyin.targetWordId);
      clearPinyinChoices(collectedCorrectPinyin.targetWordId);
      resetActiveLearningTask();
      state.score += 20;
      setMessage(targetWord ? pinyinReadingsLabel(targetWord) + "，获得月亮" : "答对了，获得月亮");
    }
    if (wrongPinyinWordId) {
      retryWordNextLevel(wrongPinyinWordId);
      damagePlayerForWrongPinyin(wrongPinyinText);
    }
    if (collectedCorrectWord) {
      sounds.play("correct");
      state.retryWordIds = state.retryWordIds.filter((id) => id !== collectedCorrectWord.id);
      state.powerUps = state.powerUps.filter((powerUp) => powerUp.type !== "wordChoice" || powerUp.targetWordId !== collectedCorrectWord.id);
      resetActiveLearningTask();
      state.score += 20;
      setMessage(`找到 ${collectedCorrectWord.char}，获得月亮`);
    } else if (collectedWrongWord) {
      retryWordNextLevel(wrongWordTargetId);
      damagePlayerForWrongWord(collectedWrongWord);
    }
    if (extraLives > 0 || flameBoosts > 0) {
      sounds.play("pickup");
      state.hp += extraLives;
      state.flameRange += flameBoosts;
      const messages = [];
      if (extraLives > 0) messages.push(`+${extraLives} 命`);
      if (flameBoosts > 0) messages.push(`威力 +${flameBoosts}`);
      setMessage(messages.join("  "));
      updateHud();
    }
    if (collectedPinyin || collectedHanziPrompt || collectedCorrectPinyin || collectedWrongPinyin || wrongPinyinWordId || collectedCorrectWord || collectedWrongWord) {
      updateHud();
      checkLevelComplete();
    }
  }

  function openAllBricks() {
    claimBombProgress();
    if (state.status === "locked") {
      resetGame();
      if (state.status === "locked") {
        return;
      }
    }
    if (!state.map.length) return;
    let opened = 0;
    const powerUpCountBefore = state.powerUps.length;
    startLayer.classList.add("hidden");
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (state.map[y][x] !== TILE_CRATE) continue;
        state.map[y][x] = TILE_FLOOR;
        maybeSpawnBrickPowerUp(x, y);
        spawnParticles("crate", x, y);
        opened += 1;
      }
    }
    if (!opened) {
      setMessage("砖块已经全部开启");
      checkLevelComplete();
      return;
    }
    state.score += opened * 5;
    setMessage(`开启 ${opened} 个砖块，发现 ${state.powerUps.length - powerUpCountBefore} 个道具`);
    updateHud();
    checkLevelComplete();
    saveBombProgress();
  }

  function explodeBomb(bomb) {
    if (bomb.exploded) return;
    bomb.exploded = true;
    sounds.play("explode");
    const visibleFireFlowerKeys = new Set(
      state.powerUps
        .filter((powerUp) => powerUp.type === "fireFlower")
        .map((powerUp) => coordKey(powerUp.gx, powerUp.gy))
    );
    const cells = [{ gx: bomb.gx, gy: bomb.gy }];
    const blockedCells = [];

    Object.values(DIRS).forEach((dir) => {
      for (let step = 1; step <= bomb.range; step += 1) {
        const gx = bomb.gx + dir.x * step;
        const gy = bomb.gy + dir.y * step;
        if (!isInside(gx, gy) || state.map[gy][gx] === TILE_HARD) break;
        cells.push({ gx, gy });
        const recentlyDestroyedCrate = state.explosions.some((explosion) => (
          Array.isArray(explosion.blockedCells) &&
          explosion.blockedCells.some((cell) => cell.gx === gx && cell.gy === gy)
        ));
        if (recentlyDestroyedCrate) break;
        if (state.map[gy][gx] === TILE_CRATE) {
          blockedCells.push({ gx, gy });
          state.map[gy][gx] = TILE_FLOOR;
          maybeSpawnBrickPowerUp(gx, gy);
          spawnParticles("crate", gx, gy);
          state.score += 5;
          break;
        }
      }
    });

    state.explosions.push({ cells, blockedCells, life: FLAME_TIME, maxLife: FLAME_TIME });
    destroyFireFlowersInCells(cells, visibleFireFlowerKeys);
    state.bombs.forEach((other) => {
      if (!other.exploded && cells.some((cell) => cell.gx === other.gx && cell.gy === other.gy)) {
        other.time = BOMB_TIMER;
      }
    });
    spawnParticles("blast", bomb.gx, bomb.gy);
    updateHud();
    checkLevelComplete();
  }

  function updateExplosions(dt) {
    state.explosions.forEach((explosion) => {
      explosion.life -= dt;
    });
    state.explosions = state.explosions.filter((explosion) => explosion.life > 0);
  }

  function isCellBurning(gx, gy) {
    return state.explosions.some((explosion) => explosion.cells.some((cell) => cell.gx === gx && cell.gy === gy));
  }

  function rememberPlayerCell(gx, gy) {
    const player = state.player;
    const trail = Array.isArray(player.trail) ? player.trail.slice(-16) : [];
    const last = trail.at(-1);
    if (last?.gx === gx && last?.gy === gy) return;
    if (last && Math.abs(last.gx - gx) + Math.abs(last.gy - gy) !== 1) trail.length = 0;
    trail.push({ gx, gy });
    player.trail = trail.slice(-16);
  }

  function retreatPlayer(move) {
    const player = state.player;
    const origin = move ? { gx: move.fromX, gy: move.fromY } : { gx: Math.round(player.gx), gy: Math.round(player.gy) };
    // During a partial step the impact cell is its destination; returning to its origin is step one.
    let anchor = move ? { gx: move.toX, gy: move.toY } : origin;
    rememberPlayerCell(origin.gx, origin.gy);
    const trail = player.trail.slice();
    if (trail.at(-1)?.gx === anchor.gx && trail.at(-1)?.gy === anchor.gy) trail.pop();
    let destination = { gx: Math.round(player.gx), gy: Math.round(player.gy) };
    for (let step = 0; step < 2 && trail.length; step += 1) {
      const cell = trail.at(-1);
      if (Math.abs(cell.gx - anchor.gx) + Math.abs(cell.gy - anchor.gy) !== 1 || !isCellOpen(cell.gx, cell.gy, "player")) break;
      destination = cell;
      anchor = cell;
      trail.pop();
    }
    player.gx = destination.gx;
    player.gy = destination.gy;
    // Keep only the route up to the landing cell; a second hit must not follow abandoned forward steps.
    const landing = trail.at(-1);
    if (landing?.gx !== destination.gx || landing?.gy !== destination.gy) trail.push(destination);
    player.trail = trail.slice(-16);
  }

  function damagePlayer(source = "hazard") {
    const player = state.player;
    if (player.invulnerable > 0 || state.status !== "playing") return;
    const interruptedMove = player.move;
    clearInputState();
    player.move = null;
    state.hp -= 1;
    updateHud();
    if (state.hp <= 0) {
      state.status = "gameover";
      startTitle.textContent = "失败";
      overlayStartButton.textContent = "再来一局";
      startLayer.classList.remove("hidden");
      setMessage("失败", 3);
      return;
    }
    if (source === "monster") {
      retreatPlayer(interruptedMove);
      player.invulnerable = 1;
    } else {
      player.gx = 1;
      player.gy = 1;
      player.trail = [{ gx: 1, gy: 1 }];
      player.invulnerable = 1.2;
    }
    setMessage("受伤");
  }

  function damagePlayerForWrongWord(word) {
    if (state.status !== "playing") return;
    state.hp = Math.max(0, state.hp - 1);
    updateHud();
    if (state.hp <= 0) {
      state.status = "gameover";
      startTitle.textContent = "失败";
      overlayStartButton.textContent = "再来一局";
      startLayer.classList.remove("hidden");
      setMessage("选错汉字，失败", 3);
      return;
    }
    state.player.invulnerable = Math.max(state.player.invulnerable, 0.45);
    setMessage(`${word ? word.char : "这个字"} 不对，扣 1 滴血`, 1.8);
  }

  function damagePlayerForWrongPinyin(text) {
    if (state.status !== "playing") return;
    state.hp = Math.max(0, state.hp - 1);
    updateHud();
    if (state.hp <= 0) {
      state.status = "gameover";
      startTitle.textContent = "失败";
      overlayStartButton.textContent = "再来一局";
      startLayer.classList.remove("hidden");
      setMessage("选错拼音，失败", 3);
      return;
    }
    state.player.invulnerable = Math.max(state.player.invulnerable, 0.45);
    setMessage(`${text || "拼音"} 不对，扣 1 滴血`, 1.8);
  }

  function defeatEnemy(enemy) {
    if (!enemy.alive) return;
    enemy.alive = false;
    state.score += 100;
    spawnParticles("enemy", enemy.gx, enemy.gy);
    setMessage("+100");
    autoOpenBricksAfterEnemyClear();
    updateHud();
    checkLevelComplete();
  }

  function damageEnemy(enemy) {
    if (enemy.type === "bullet-bill") return;
    if (!enemy.alive || enemy.hitCooldown > 0) return;
    enemy.hitCooldown = ENEMY_HIT_COOLDOWN;
    enemy.hp -= 1;
    if (enemy.hp <= 0) {
      if (enemy.type === "koopa-green") {
        const gx = Math.round(enemy.gx);
        const gy = Math.round(enemy.gy);
        defeatEnemy(enemy);
        spawnShell(gx, gy);
        return;
      }
      defeatEnemy(enemy);
      return;
    }

    enemy.gx = Math.round(enemy.gx);
    enemy.gy = Math.round(enemy.gy);
    enemy.move = null;
    enemy.stunTimer = TOUGH_ENEMY_STUN_TIME;
    spawnParticles("stun", enemy.gx, enemy.gy);
    setMessage(enemy.type === "bowser" ? "库巴眩晕" : "敌人眩晕");
  }

  function checkDamage() {
    const playerCellX = Math.round(state.player.gx);
    const playerCellY = Math.round(state.player.gy);
    if (isCellBurning(playerCellX, playerCellY)) {
      damagePlayer();
    }

    state.enemies.forEach((enemy) => {
      if (!enemy.alive) return;
      const gx = Math.round(enemy.gx);
      const gy = Math.round(enemy.gy);
      if (enemy.type !== "bullet-bill" && isCellBurning(gx, gy)) {
        damageEnemy(enemy);
        return;
      }
      if (enemy.stunTimer > 0) return;
      const dx = enemy.gx - state.player.gx;
      const dy = enemy.gy - state.player.gy;
      if (Math.hypot(dx, dy) < 0.58) {
        damagePlayer("monster");
      }
    });

    state.shells.forEach((shell) => {
      if (!shell.alive || !shell.active) return;
      const dx = shell.gx - state.player.gx;
      const dy = shell.gy - state.player.gy;
      if (Math.hypot(dx, dy) < 0.58) {
        damagePlayer("monster");
      }
    });
  }

  function spawnParticles(type, gx, gy) {
    const center = cellCenter(gx, gy);
    const palette = {
      crate: ["#f59e0b", "#92400e", "#fde68a"],
      blast: ["#f97316", "#fde047", "#ef4444"],
      enemy: ["#facc15", "#22c55e", "#f97316"],
      shell: ["#22c55e", "#bbf7d0", "#facc15"],
      life: ["#22c55e", "#86efac", "#ffffff"],
      stun: ["#fde047", "#facc15", "#ffffff"],
      pinyin: ["#60a5fa", "#ffffff", "#93c5fd"],
      moon: ["#f9a8d4", "#ffffff", "#fde68a"],
      wrong: ["#ef4444", "#fecaca", "#ffffff"],
    }[type] || ["#f8fafc"];
    for (let i = 0; i < 16; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 150;
      state.particles.push({
        x: center.x,
        y: center.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.42 + Math.random() * 0.28,
        maxLife: 0.7,
        size: 3 + Math.random() * 5,
        color: randomItem(palette),
      });
    }
  }

  function updateParticles(dt) {
    state.particles.forEach((particle) => {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 180 * dt;
      particle.life -= dt;
    });
    state.particles = state.particles.filter((particle) => particle.life > 0);
  }

  function update(dt) {
    if (awaitingContinue) return;
    if (messageTimer > 0) {
      messageTimer -= dt;
      if (messageTimer <= 0 && state.status === "playing") {
        messageNode.textContent = "";
      }
    }
    updateParticles(dt);
    updateExplosions(dt);
    if (state.status !== "playing") return;
    state.dayClock += dt;
    updatePlayer(dt);
    updateShells(dt);
    collectPowerUps();
    updateEnemies(dt);
    updateBombs(dt);
    checkDamage();
    scheduleBombProgressSave();
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#243b58");
    gradient.addColorStop(0.52, "#172637");
    gradient.addColorStop(1, "#111827");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    for (let i = 0; i < 22; i += 1) {
      const x = (i * 97 + animationClock * 12) % (canvas.width + 80) - 40;
      const y = 38 + (i % 4) * 18;
      ctx.beginPath();
      ctx.ellipse(x, y, 28, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBoard() {
    ctx.save();
    ctx.fillStyle = "#0f172a";
    ctx.shadowColor = "rgba(0, 0, 0, 0.42)";
    ctx.shadowBlur = 24;
    ctx.fillRect(BOARD_X - 14, BOARD_Y - 14, BOARD_W + 28, BOARD_H + 28);
    ctx.restore();

    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        drawTile(x, y, state.map[y][x]);
      }
    }
  }

  function drawTile(gx, gy, tile) {
    const x = BOARD_X + gx * TILE;
    const y = BOARD_Y + gy * TILE;
    if (tile === TILE_FLOOR) {
      ctx.fillStyle = (gx + gy) % 2 ? "#208b61" : "#249b6b";
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
      ctx.fillRect(x + 3, y + 3, TILE - 6, 2);
      return;
    }

    if (tile === TILE_HARD) {
      const blockGradient = ctx.createLinearGradient(x, y, x, y + TILE);
      blockGradient.addColorStop(0, "#7893ad");
      blockGradient.addColorStop(1, "#3f546b");
      ctx.fillStyle = blockGradient;
      ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
      ctx.fillStyle = "rgba(255, 255, 255, 0.24)";
      ctx.fillRect(x + 6, y + 6, TILE - 12, 4);
      ctx.strokeStyle = "rgba(15, 23, 42, 0.32)";
      ctx.strokeRect(x + 2.5, y + 2.5, TILE - 5, TILE - 5);
      return;
    }

    if (crateBrickImage.complete && crateBrickImage.naturalWidth) {
      const sourceW = crateBrickImage.naturalWidth;
      const sourceH = crateBrickImage.naturalHeight;
      const crop = {
        x: Math.floor(sourceW * 0.035),
        y: Math.floor(sourceH * 0.035),
        w: Math.floor(sourceW * 0.93),
        h: Math.floor(sourceH * 0.93),
      };
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(crateBrickImage, crop.x, crop.y, crop.w, crop.h, x + 3, y + 3, TILE - 6, TILE - 6);
      ctx.restore();
      return;
    }

    const crateGradient = ctx.createLinearGradient(x, y, x, y + TILE);
    crateGradient.addColorStop(0, "#d99a45");
    crateGradient.addColorStop(1, "#8b4d22");
    ctx.fillStyle = crateGradient;
    ctx.fillRect(x + 5, y + 5, TILE - 10, TILE - 10);
    ctx.strokeStyle = "#5f3217";
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 7, y + 7, TILE - 14, TILE - 14);
    ctx.beginPath();
    ctx.moveTo(x + 9, y + 9);
    ctx.lineTo(x + TILE - 9, y + TILE - 9);
    ctx.moveTo(x + TILE - 9, y + 9);
    ctx.lineTo(x + 9, y + TILE - 9);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  function drawPowerUps() {
    lastRenderedLearningCardCount = 0;
    state.powerUps.forEach((powerUp) => {
      if (isLearningPowerUp(powerUp)) lastRenderedLearningCardCount += 1;
      const center = cellCenter(powerUp.gx, powerUp.gy);
      const bob = Math.sin(animationClock * 5.8 + powerUp.seed) * 2;
      if (powerUp.guided && isAvailableLearningPowerUp(powerUp)) {
        drawGuidedPowerUpGlow(center, bob);
      }
      if (powerUp.type === "pinyin") {
        drawPinyinReward(center, powerUp, bob, Boolean(activeLearningTargetId()));
        return;
      }
      if (powerUp.type === "hanziPrompt") {
        drawWordChoice(center, powerUp, bob, Boolean(activeLearningTargetId()));
        return;
      }
      if (powerUp.type === "pinyinChoice") {
        drawPinyinReward(center, powerUp, bob);
        return;
      }
      if (powerUp.type === "wordChoice") {
        drawWordChoice(center, powerUp, bob);
        return;
      }
      const isFireFlower = powerUp.type === "fireFlower";
      const image = isFireFlower ? fireFlowerImage : greenMushroomImage;
      const size = isFireFlower ? 42 : 38;

      ctx.save();
      ctx.shadowColor = isFireFlower ? "rgba(251, 191, 36, 0.75)" : "rgba(34, 197, 94, 0.72)";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
      ctx.beginPath();
      ctx.ellipse(center.x, center.y + 16, 14, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      if (image.complete && image.naturalWidth) {
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(image, center.x - size / 2, center.y - size / 2 - 2 + bob, size, size);
      } else if (isFireFlower) {
        ctx.fillStyle = "#dc2626";
        ctx.beginPath();
        ctx.arc(center.x, center.y - 8 + bob, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fde047";
        ctx.beginPath();
        ctx.arc(center.x, center.y - 8 + bob, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(center.x, center.y + 2 + bob);
        ctx.lineTo(center.x, center.y + 14 + bob);
        ctx.stroke();
      } else {
        ctx.fillStyle = "#16a34a";
        ctx.beginPath();
        ctx.arc(center.x, center.y - 4 + bob, 14, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = "#f5e2be";
        ctx.fillRect(center.x - 10, center.y - 5 + bob, 20, 16);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(center.x, center.y - 12 + bob, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  function drawGuidedPowerUpGlow(center, bob) {
    const pulse = 1 + Math.sin(animationClock * 8) * 0.12;
    ctx.save();
    ctx.translate(center.x, center.y + bob);
    ctx.fillStyle = "rgba(250, 204, 21, 0.14)";
    ctx.strokeStyle = "rgba(250, 204, 21, 0.92)";
    ctx.lineWidth = 4;
    ctx.shadowColor = "rgba(250, 204, 21, 0.9)";
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(0, -2, 34 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function roundRectPath(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function drawPinyinReward(center, powerUp, bob, locked = false) {
    const word = wordById(powerUp.wordId);
    const text = word ? pinyinReadingsLabel(word) : "";
    ctx.save();
    ctx.translate(center.x, center.y + bob);
    ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
    ctx.beginPath();
    ctx.ellipse(0, 18, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = locked ? 0.68 : 1;
    ctx.fillStyle = locked ? "#e5e7eb" : "#eff6ff";
    ctx.strokeStyle = locked ? "#9ca3af" : "#2563eb";
    ctx.lineWidth = 3;
    roundRectPath(-36, -22, 72, 42, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = locked ? "#6b7280" : "#1d4ed8";
    ctx.font = "bold 20px Microsoft YaHei";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(text, 0, -1, 66, 18, 11);
    ctx.restore();
  }

  function drawPinyinPart(center, powerUp, bob) {
    const text = powerUp.text || "";
    ctx.save();
    ctx.translate(center.x, center.y + bob);
    ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
    ctx.beginPath();
    ctx.ellipse(0, 18, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fefce8";
    ctx.strokeStyle = "#eab308";
    ctx.lineWidth = 3;
    roundRectPath(-31, -23, 62, 43, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#713f12";
    ctx.font = "bold 24px Microsoft YaHei";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(text, 0, -1, 54, 24, 13);
    ctx.restore();
  }

  function drawWordChoice(center, powerUp, bob, locked = false) {
    const word = wordById(powerUp.wordId);
    if (!word) return;
    ctx.save();
    ctx.translate(center.x, center.y + bob);
    ctx.fillStyle = "rgba(0, 0, 0, 0.24)";
    ctx.beginPath();
    ctx.ellipse(0, 20, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = locked ? 0.68 : 1;
    ctx.fillStyle = locked ? "#e5e7eb" : "#fff7d6";
    ctx.strokeStyle = locked ? "#9ca3af" : "#f59e0b";
    ctx.lineWidth = 3;
    roundRectPath(-23, -28, 46, 50, 9);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = locked ? "#6b7280" : "#172033";
    ctx.font = "bold 34px Microsoft YaHei";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(word.char, 0, -2);
    ctx.restore();
  }

  function fitText(text, x, y, maxWidth, startSize, minSize) {
    let size = startSize;
    ctx.font = `bold ${size}px Microsoft YaHei`;
    while (size > minSize && ctx.measureText(text).width > maxWidth) {
      size -= 1;
      ctx.font = `bold ${size}px Microsoft YaHei`;
    }
    ctx.fillText(text, x, y);
  }

  function drawBombs() {
    state.bombs.forEach((bomb) => {
      const center = cellCenter(bomb.gx, bomb.gy);
      const pulse = 1 + Math.sin(animationClock * 12 + bomb.time * 8) * 0.08;
      ctx.save();
      ctx.translate(center.x, center.y + 3);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
      ctx.beginPath();
      ctx.ellipse(0, 18, 17, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = bomb.isRed ? "#dc2626" : "#101827";
      ctx.beginPath();
      ctx.arc(0, 2, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = bomb.isRed ? "#f87171" : "#29364c";
      ctx.beginPath();
      ctx.arc(-6, -5, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#facc15";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(7, -15);
      ctx.quadraticCurveTo(16, -24, 10, -32);
      ctx.stroke();
      ctx.fillStyle = "#f97316";
      ctx.beginPath();
      ctx.arc(10, -32, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function drawExplosions() {
    state.explosions.forEach((explosion) => {
      const ratio = clamp(explosion.life / explosion.maxLife, 0, 1);
      explosion.cells.forEach((cell) => {
        const center = cellCenter(cell.gx, cell.gy);
        const radius = TILE * (0.42 + (1 - ratio) * 0.18);
        const gradient = ctx.createRadialGradient(center.x, center.y, 4, center.x, center.y, radius);
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.95)");
        gradient.addColorStop(0.28, "rgba(253, 224, 71, 0.9)");
        gradient.addColorStop(0.72, "rgba(249, 115, 22, 0.78)");
        gradient.addColorStop(1, "rgba(239, 68, 68, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  }

  function drawStarShape(x, y, radius) {
    ctx.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const angle = -Math.PI / 2 + i * Math.PI / 5;
      const pointRadius = i % 2 === 0 ? radius : radius * 0.45;
      const px = x + Math.cos(angle) * pointRadius;
      const py = y + Math.sin(angle) * pointRadius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function drawStunStars(center, enemy) {
    if (enemy.stunTimer <= 0) return;
    const orbit = 18;
    const baseY = center.y - 42;
    ctx.save();
    for (let i = 0; i < 3; i += 1) {
      const angle = animationClock * 5 + i * Math.PI * 2 / 3;
      const x = center.x + Math.cos(angle) * orbit;
      const y = baseY + Math.sin(angle) * 5;
      ctx.fillStyle = "#fde047";
      ctx.strokeStyle = "#92400e";
      ctx.lineWidth = 2;
      drawStarShape(x, y, 7);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawEnemySpriteFrame(frame, center, bob, width, height, flipX = false) {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (flipX) {
      ctx.translate(center.x, center.y);
      ctx.scale(-1, 1);
      ctx.drawImage(enemySprite, frame.sx, frame.sy, frame.sw, frame.sh, -width / 2, -height + 22 + bob, width, height);
    } else {
      ctx.drawImage(enemySprite, frame.sx, frame.sy, frame.sw, frame.sh, center.x - width / 2, center.y - height + 22 + bob, width, height);
    }
    ctx.restore();
  }

  function drawMushroom(center, bob, enemy) {
    const frame = MUSHROOM_FRAMES[Math.floor(animationClock * 6 + enemy.seed) % MUSHROOM_FRAMES.length];
    drawEnemySpriteFrame(frame, center, bob, 50, 50, false);
    drawStunStars(center, enemy);
  }

  function drawBowser(center, bob, enemy) {
    const frame = BOWSER_FRAMES[Math.floor(animationClock * 5 + enemy.seed) % BOWSER_FRAMES.length];
    drawEnemySpriteFrame(frame, center, bob, 72, 72, false);
    drawStunStars(center, enemy);
  }

  function drawKoopa(center, bob, enemy) {
    const frame = KOOPA_GREEN_FRAMES[Math.floor(animationClock * 6 + enemy.seed) % KOOPA_GREEN_FRAMES.length];
    drawEnemySpriteFrame(frame, center, bob, 40, 64, enemy.dir === "right");
    drawStunStars(center, enemy);
  }

  function drawBulletBill(center, bob, enemy) {
    const rotation = {
      left: 0,
      right: Math.PI,
      up: Math.PI / 2,
      down: -Math.PI / 2,
    }[enemy.dir] || 0;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(center.x, center.y - 2 + bob);
    ctx.rotate(rotation);
    ctx.drawImage(
      enemySprite,
      BULLET_BILL_FRAME.sx,
      BULLET_BILL_FRAME.sy,
      BULLET_BILL_FRAME.sw,
      BULLET_BILL_FRAME.sh,
      -27,
      -24,
      54,
      54
    );
    ctx.restore();
  }

  function drawShell(center, shell) {
    const frame = SHELL_GREEN_FRAMES[Math.floor(animationClock * (shell.active ? 14 : 5) + shell.seed) % SHELL_GREEN_FRAMES.length];
    const spin = shell.active ? Math.sin(animationClock * 18) * 3 : 0;
    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    ctx.beginPath();
    ctx.ellipse(center.x, center.y + 17, 19, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    drawEnemySpriteFrame(frame, center, spin, 42, 42, false);
  }

  function drawSleepMarks(center, enemy) {
    if (!isNightTime() || enemy.type === "koopa-green" || enemy.type === "bullet-bill") return;
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < 4; i += 1) {
      const t = (animationClock * 0.82 + enemy.seed * 0.17 + i * 0.26) % 1;
      const x = center.x + 10 + t * 28;
      const y = center.y - 44 - t * 42;
      ctx.globalAlpha = 1 - t;
      ctx.font = `${16 + i * 3}px Arial, sans-serif`;
      ctx.fillStyle = i % 2 === 0 ? "#f8fafc" : "#bfdbfe";
      ctx.strokeStyle = "rgba(15, 23, 42, 0.75)";
      ctx.lineWidth = 3;
      const text = i % 2 === 0 ? "z" : "Z";
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
    }
    ctx.restore();
  }

  function drawEnemyVisions() {
    if (state.status !== "playing" || isNightTime()) return;
    state.enemies.forEach((enemy) => {
      if (!enemy.alive || enemy.stunTimer > 0 || enemy.type === "koopa-green" || enemy.type === "bullet-bill") return;
      const center = cellCenter(enemy.gx, enemy.gy);
      const angle = DIRECTION_ANGLES[enemy.dir] ?? 0;
      const radius = ENEMY_SIGHT_RANGE * TILE;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.arc(center.x, center.y, radius, angle - ENEMY_VISION_HALF_ANGLE, angle + ENEMY_VISION_HALF_ANGLE);
      ctx.closePath();
      ctx.fillStyle = "rgba(250, 204, 21, 0.08)";
      ctx.fill();
      ctx.strokeStyle = "rgba(250, 204, 21, 0.18)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawEnemies() {
    state.enemies.forEach((enemy) => {
      if (!enemy.alive) return;
      const center = cellCenter(enemy.gx, enemy.gy);
      const bob = Math.sin(animationClock * 8 + enemy.seed) * 2;
      ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
      ctx.beginPath();
      ctx.ellipse(center.x, center.y + 18, 20, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      if (enemySprite.complete && enemySprite.naturalWidth) {
        if (enemy.type === "bowser") {
          drawBowser(center, bob, enemy);
        } else if (enemy.type === "koopa-green") {
          drawKoopa(center, bob, enemy);
        } else if (enemy.type === "bullet-bill") {
          drawBulletBill(center, bob, enemy);
        } else {
          drawMushroom(center, bob, enemy);
        }
        drawSleepMarks(center, enemy);
        return;
      }

      ctx.fillStyle = "#8b451d";
      ctx.beginPath();
      ctx.ellipse(center.x, center.y - 5 + bob, 22, 16, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#f5deb3";
      ctx.fillRect(center.x - 15, center.y - 6 + bob, 30, 24);
      drawSleepMarks(center, enemy);
    });
  }

  function drawShells() {
    state.shells.forEach((shell) => {
      if (!shell.alive) return;
      const center = cellCenter(shell.gx, shell.gy);
      if (enemySprite.complete && enemySprite.naturalWidth) {
        drawShell(center, shell);
        return;
      }
      ctx.save();
      ctx.fillStyle = "#16a34a";
      ctx.beginPath();
      ctx.ellipse(center.x, center.y, 18, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#bbf7d0";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    });
  }

  function isPlayerBlinkHidden() {
    return state.player.invulnerable > 0 && Math.floor(state.player.invulnerable * 16) % 2 === 0;
  }

  function drawPlayer() {
    const player = state.player;
    const center = cellCenter(player.gx, player.gy);
    if (isPlayerBlinkHidden()) return;

    ctx.fillStyle = "rgba(0, 0, 0, 0.32)";
    ctx.beginPath();
    ctx.ellipse(center.x, center.y + 20, 19, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (flyStarLayers) {
      drawFlyStar(center);
      return;
    }

    drawFallbackFlyStar(center);
  }

  function drawFlyStar(center) {
    const player = state.player;
    const moving = state.status === "playing" && Boolean(player.move || heldDirections.size);
    const hover = Math.sin(animationClock * (moving ? 7 : 4)) * (moving ? 1.4 : 2.2);
    const directionLean = moving
      ? (lastDirection === "left" ? -0.09 : lastDirection === "right" ? 0.09 : 0)
      : 0;
    const tilt = directionLean + Math.sin(animationClock * 2.2) * 0.025;
    const width = moving ? 75 : 72;
    const height = width * (flyStarLayers.height / flyStarLayers.width);
    const flap = Math.sin(animationClock * (moving ? 9 : 5.5));

    ctx.save();
    ctx.translate(center.x, center.y - 9 + hover);
    ctx.rotate(tilt);
    ctx.scale(width / flyStarLayers.width, height / flyStarLayers.height);
    ctx.translate(-flyStarLayers.width / 2, -flyStarLayers.height / 2);
    ctx.imageSmoothingEnabled = true;
    ctx.shadowColor = "rgba(255, 224, 92, 0.62)";
    ctx.shadowBlur = moving ? 11 : 15;
    flyStarLayers.wings.forEach((wing) => {
      ctx.save();
      ctx.translate(wing.pivotX, wing.pivotY);
      ctx.rotate(flap * wing.amplitude);
      ctx.translate(-wing.pivotX, -wing.pivotY);
      ctx.drawImage(wing.canvas, 0, 0);
      ctx.restore();
    });
    ctx.drawImage(flyStarLayers.body, 0, 0);
    ctx.restore();
  }

  function drawFallbackFlyStar(center) {
    const outerRadius = 29;
    const innerRadius = 13;
    ctx.save();
    ctx.translate(center.x, center.y - 9 + Math.sin(animationClock * 4) * 2);
    ctx.rotate(-Math.PI / 2 + Math.sin(animationClock * 2.2) * 0.03);
    ctx.beginPath();
    for (let index = 0; index < 10; index += 1) {
      const radius = index % 2 === 0 ? outerRadius : innerRadius;
      const angle = index * Math.PI / 5;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    const gradient = ctx.createRadialGradient(-8, -10, 2, 0, 0, outerRadius);
    gradient.addColorStop(0, "#fff7a8");
    gradient.addColorStop(0.55, "#ffd43b");
    gradient.addColorStop(1, "#f59f00");
    ctx.fillStyle = gradient;
    ctx.shadowColor = "rgba(255, 212, 59, 0.75)";
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.restore();
  }

  function drawParticles() {
    state.particles.forEach((particle) => {
      const ratio = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.globalAlpha = ratio;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size * ratio, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  function drawOverlayFrame() {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
    ctx.lineWidth = 4;
    ctx.strokeRect(BOARD_X - 14, BOARD_Y - 14, BOARD_W + 28, BOARD_H + 28);
    ctx.lineWidth = 1;
  }

  function drawDayNightOverlay() {
  }

  function drawActivePinyinPanel() {
    const pinyinWord = wordById(state.activePinyinWordId);
    const hanziWord = wordById(state.activeHanziWordId);
    const word = pinyinWord || hanziWord;
    if (!word) return;
    const isHanziMode = Boolean(hanziWord);
    const targetRound = Math.max(1, bombTargetRoundForId(word.id));
    const panelWidth = Math.min(112, Math.max(70, BOARD_X - 22));
    const panelHeight = 128;
    const x = Math.max(8, BOARD_X - panelWidth - 12);
    const y = BOARD_Y + BOARD_H / 2 - panelHeight / 2;

    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.strokeStyle = "rgba(147, 197, 253, 0.72)";
    ctx.lineWidth = 3;
    ctx.shadowColor = "rgba(37, 99, 235, 0.38)";
    ctx.shadowBlur = 16;
    roundRectPath(x, y, panelWidth, panelHeight, 10);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();

    const roundLabel = `${targetRound}\u8f6e`;
    ctx.fillStyle = "#fef3c7";
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2;
    roundRectPath(x + panelWidth - 44, y + 8, 36, 23, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#92400e";
    ctx.font = "bold 13px Microsoft YaHei";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(roundLabel, x + panelWidth - 26, y + 19.5, 30, 13, 10);

    ctx.fillStyle = "#bfdbfe";
    ctx.font = "bold 18px Microsoft YaHei";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fitText(isHanziMode ? "考察字" : "考察拼音", x + panelWidth / 2, y + 26, panelWidth - 16, 18, 11);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 34px Microsoft YaHei";
    fitText(isHanziMode ? word.char : pinyinReadingsLabel(word), x + panelWidth / 2, y + 68, panelWidth - 14, isHanziMode ? 38 : 28, 13);

    if (isHanziMode && state.activePinyinTotal > 0) {
      ctx.fillStyle = "#bfdbfe";
      ctx.font = "bold 17px Microsoft YaHei";
      fitText(`${Math.min(state.activePinyinStep + 1, state.activePinyinTotal)}/${state.activePinyinTotal}`, x + panelWidth / 2, y + 98, panelWidth - 16, 17, 12);
    }

    ctx.fillStyle = "#93c5fd";
    ctx.beginPath();
    ctx.moveTo(x + panelWidth + 4, y + panelHeight / 2 - 10);
    ctx.lineTo(x + panelWidth + 16, y + panelHeight / 2);
    ctx.lineTo(x + panelWidth + 4, y + panelHeight / 2 + 10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawLearningMoons() {
    const total = BOMB_MOONS_PER_LEVEL;
    const startX = canvas.width / 2 - (total - 1) * 34;
    ctx.save();
    for (let index = 0; index < total; index += 1) {
      drawStatusMoon(startX + index * 68, 68, index < state.moonWordIds.length);
    }
    ctx.restore();
  }

  function drawStatusMoon(cx, cy, lit) {
    const radius = 23;
    ctx.save();
    ctx.shadowBlur = lit ? 18 : 0;
    ctx.shadowColor = "rgba(255, 224, 78, 0.9)";
    ctx.fillStyle = lit ? "#ffe04e" : "#9ca3af";
    ctx.strokeStyle = lit ? "#fff5b7" : "#4b5563";
    ctx.lineWidth = lit ? 3 : 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, Math.PI * 0.24, Math.PI * 1.76, false);
    ctx.arc(cx + radius * 0.42, cy, radius * 0.78, Math.PI * 1.68, Math.PI * 0.32, true);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.stroke();
    if (lit) {
      ctx.fillStyle = "#fff7bf";
      ctx.beginPath();
      ctx.arc(cx - 6, cy - 10, 3.5, 0, Math.PI * 2);
      ctx.arc(cx - 10, cy + 6, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function render() {
    drawBackground();
    drawBoard();
    drawDayNightOverlay();
    drawEnemyVisions();
    drawBombs();
    drawExplosions();
    drawPowerUps();
    drawShells();
    drawEnemies();
    drawPlayer();
    drawParticles();
    drawOverlayFrame();
    drawActivePinyinPanel();
    drawLearningMoons();
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000 || 0);
    lastTime = now;
    animationClock += dt;
    sounds.setMusic(state.status === "playing" && !awaitingContinue && ownsProgress &&
      !document.hidden && document.hasFocus() ? state.world : null);
    if (!document.hidden && ownsProgress) update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function makeFlyStarSprite() {
    if (!FLY_STAR_PARTS.every((part) => part.image.complete && part.image.naturalWidth)) return;
    const width = 320;
    const height = Math.ceil(width * FLY_STAR_BOUNDS.height / FLY_STAR_BOUNDS.width);
    const padding = 16;
    const scale = (width - padding * 2) / FLY_STAR_BOUNDS.width;
    const contentHeight = FLY_STAR_BOUNDS.height * scale;
    const offsetY = (height - contentHeight) / 2;

    function makeLayer(parts) {
      const layer = document.createElement("canvas");
      layer.width = width;
      layer.height = height;
      const layerCtx = layer.getContext("2d");
      layerCtx.imageSmoothingEnabled = true;
      parts.forEach((part) => {
        const x = padding + (part.x - part.width / 2 - FLY_STAR_BOUNDS.minX) * scale;
        const y = offsetY + (-part.y - part.height / 2 - FLY_STAR_BOUNDS.minY) * scale;
        layerCtx.drawImage(part.image, x, y, part.width * scale, part.height * scale);
      });
      return layer;
    }

    const wingParts = FLY_STAR_PARTS.filter((part) => Number.isFinite(part.amplitude));
    const bodyParts = FLY_STAR_PARTS.filter((part) => !Number.isFinite(part.amplitude));
    flyStarLayers = {
      width,
      height,
      body: makeLayer(bodyParts),
      wings: wingParts.map((part) => ({
        canvas: makeLayer([part]),
        pivotX: padding + (part.pivotX - FLY_STAR_BOUNDS.minX) * scale,
        pivotY: offsetY + (part.pivotY - FLY_STAR_BOUNDS.minY) * scale,
        amplitude: part.amplitude,
      })),
    };
  }

  window.__BOMB_GAME__ = Object.freeze({
    isProgressOwner: () => ownsProgress,
    isAwaitingContinue: () => awaitingContinue,
    getPlayerVisualState: () => ({ invulnerable: state.player.invulnerable > 0, hidden: isPlayerBlinkHidden() }),
    getState: () => serializeBombProgress(),
    getLearningWordIds: () => bombWordsFromLearning(loadLearningState()).map((word) => word.id),
    getLearningSource: () => {
      loadLearningState();
      return lastLearningSource;
    },
    getBoardTargetSummary: () => {
      const initialTargets = state.powerUps.filter((powerUp) => (
        (powerUp.type === "pinyin" || powerUp.type === "hanziPrompt") && isAvailableLearningPowerUp(powerUp)
      ));
      const activeTargetIds = uniqueIds(state.powerUps
        .filter((powerUp) => powerUp.type === "wordChoice" || powerUp.type === "pinyinChoice")
        .map((powerUp) => powerUp.targetWordId || powerUp.wordId)
        .filter(Boolean));
      return {
        levelTargetIds: state.todayNewWords.map((word) => word.id),
        completedTargetIds: state.moonWordIds.slice(),
        visibleInitialTargetIds: initialTargets.map((powerUp) => powerUp.wordId),
        hiddenTargetIds: [...state.hiddenWordCrates.values()],
        activeTargetIds,
        targetEntityCount: state.moonWordIds.length + state.hiddenWordCrates.size + initialTargets.length + activeTargetIds.length,
        renderedLearningCardCount: lastRenderedLearningCardCount,
      };
    },
    getActiveLearningQuestion: () => {
      const pinyinWord = wordById(state.activePinyinWordId);
      const hanziWord = wordById(state.activeHanziWordId);
      const word = pinyinWord || hanziWord;
      if (!word) return null;
      const type = hanziWord ? "hanzi-to-pinyin" : "pinyin-to-hanzi";
      const optionType = hanziWord ? "pinyinChoice" : "wordChoice";
      const options = state.powerUps
        .filter((powerUp) => powerUp.type === optionType)
        .map((powerUp) => {
          const optionWord = wordById(powerUp.wordId);
          return {
            value: hanziWord ? pinyinReadingsLabel(optionWord) : optionWord?.char || "",
            correct: powerUp.correct === true,
          };
        });
      return {
        type,
        prompt: hanziWord ? word.char : pinyinReadingsLabel(word),
        options,
      };
    },

    getConstants: () => ({
      progressKey: BOMB_PROGRESS_KEY,
      progressVersion: BOMB_PROGRESS_VERSION,
      hanziKey: HANZI_STORE_KEY,
      legacyKey: LEGACY_STORE_KEY,
      worlds: WORLDS_PER_RUN,
      levelsPerWorld: LEVELS_PER_WORLD,
      rows: ROWS,
      bombTimer: BOMB_TIMER,
      flameTime: FLAME_TIME,
      moonsPerLevel: BOMB_MOONS_PER_LEVEL,
      wordsPerRun: BOMB_WORDS_PER_RUN,
      mushroomSpeedFactor: MUSHROOM_SPEED_FACTOR,
      koopaMoveTime: KOOPA_MOVE_TIME,
      bulletBill: {
        frame: { ...BULLET_BILL_FRAME },
        moveTime: BULLET_BILL_MOVE_TIME,
        hiddenCountPerLevel: BULLET_BILL_HIDDEN_COUNT_PER_LEVEL,
      },
      nightTime: isNightTime(),
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    }),
  });

  function hasNativeKeyboardTarget(target) {
    if (!(target instanceof Element) || target === canvas) return false;
    return Boolean(target.closest([
      "a",
      "button",
      "input",
      "select",
      "textarea",
      "summary",
      '[contenteditable]:not([contenteditable="false"])',
      '[role="button"]',
      '[role="link"]',
      '[role="checkbox"]',
      '[role="radio"]',
      '[role="switch"]',
      '[role="tab"]',
      '[role="menuitem"]',
      '[role="option"]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(", ")));
  }

  window.addEventListener("keydown", (event) => {
    if (hasNativeKeyboardTarget(event.target)) return;
    const direction = KEY_DIRS[event.code];
    if (direction) {
      event.preventDefault();
      // After damage/focus loss, auto-repeat is not a new press. Require release and press again.
      if (event.repeat && !heldDirections.has(direction)) return;
      syncBombProgress();
      if (awaitingContinue) return;
      claimBombProgress();
      if (state.status !== "playing") {
        clearInputState();
        return;
      }
      heldDirections.add(direction);
      lastDirection = direction;
      return;
    }
    if (event.code === "Space") {
      event.preventDefault();
      if (event.repeat) return;
      syncBombProgress();
      if (awaitingContinue) return;
      claimBombProgress();
      placeBomb();
      return;
    }
    if (event.code === "Enter") {
      event.preventDefault();
      syncBombProgress();
      if (awaitingContinue) {
        overlayStartButton.focus();
        return;
      }
      startGame();
    }
  });

  window.addEventListener("keyup", (event) => {
    const direction = KEY_DIRS[event.code];
    if (direction) {
      heldDirections.delete(direction);
      if (!hasNativeKeyboardTarget(event.target)) event.preventDefault();
    }
  });

  window.addEventListener("blur", () => { sounds.setMusic(null); clearInputState(); saveBombProgress(); });
  window.addEventListener("storage", (event) => {
    if (event.key === BOMB_PROGRESS_KEY || event.key === null) syncBombProgress();
  });
  window.addEventListener("focus", syncBombProgress);
  window.addEventListener("resize", scheduleBombViewportFit);
  window.addEventListener("pageshow", scheduleBombViewportFit);
  window.visualViewport?.addEventListener("resize", scheduleBombViewportFit);
  if ("ResizeObserver" in window && topbarNode) {
    const viewportObserver = new ResizeObserver(scheduleBombViewportFit);
    viewportObserver.observe(topbarNode);
    viewportObserver.observe(stageNode);
  }
  document.fonts?.ready.then(scheduleBombViewportFit);
  canvas.addEventListener("blur", clearInputState);
  canvas.addEventListener("pointerdown", () => {
    syncBombProgress();
    if (!awaitingContinue) claimBombProgress();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      sounds.setMusic(null);
      clearInputState();
      saveBombProgress();
    } else {
      syncBombProgress();
    }
  });
  window.addEventListener("pagehide", () => { sounds.setMusic(null); saveBombProgress(); });
  window.addEventListener("studysystem:update-prompt", () => { sounds.setMusic(null); clearInputState(); saveBombProgress(); });

  startButton.addEventListener("click", startGame);
  overlayStartButton.addEventListener("click", () => {
    if (state.status === "locked") {
      resetGame();
      startGame();
      return;
    }
    startGame();
  });
  restartButton.addEventListener("click", restartGame);
  if (!sounds.supported) {
    soundToggle.disabled = true;
    soundToggle.textContent = "🔇";
    soundToggle.setAttribute("aria-label", "浏览器不支持音效");
    soundToggle.title = "浏览器不支持音效";
  } else {
    soundToggle.addEventListener("click", () => {
      const enabled = !sounds.isEnabled();
      sounds.setEnabled(enabled);
      soundToggle.textContent = enabled ? "🔊" : "🔇";
      soundToggle.setAttribute("aria-label", enabled ? "关闭音效" : "开启音效");
      soundToggle.setAttribute("aria-pressed", String(enabled));
      soundToggle.title = enabled ? "关闭音效" : "开启音效";
    });
  }
  openAllBricksButton?.addEventListener("click", openAllBricks);
  FLY_STAR_PARTS.forEach((part) => {
    part.image.addEventListener("load", makeFlyStarSprite);
    part.image.src = `./其他素材/FlyStar/images/${part.file}`;
  });

  if (!restoreBombProgress()) {
    resetGame();
  }
  // The new window owns the snapshot, but restored gameplay waits for Continue.
  saveBombProgress();
  fitBombViewport();
  requestAnimationFrame(loop);
}());
