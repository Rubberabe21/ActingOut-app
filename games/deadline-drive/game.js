const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const COLS = 13, ROWS = 17, CELL_SIZE = 36, HUD_HEIGHT = 60, TRACK_HEADER_W = 50;
const CANVAS_W = COLS * CELL_SIZE; // 468px
const CANVAS_H = ROWS * CELL_SIZE + HUD_HEIGHT; // 672px

canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

let audioCtx = null;

function unlockAudio() {
  try {
    if (!audioCtx) {
      const A = window.AudioContext || window.webkitAudioContext;
      if (A) audioCtx = new A();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  } catch (e) {}
}

const unlockEvents = ['pointerdown', 'touchstart', 'mousedown', 'keydown', 'click'];
unlockEvents.forEach(evt => {
  window.addEventListener(evt, unlockAudio, { capture: true, passive: true });
  document.addEventListener(evt, unlockAudio, { capture: true, passive: true });
});

function getAC() {
  unlockAudio();
  return audioCtx;
}

const settingsModal = document.getElementById('settingsModal');
const btnOpenSettings = document.getElementById('btnOpenSettings');
const btnCloseSettings = document.getElementById('btnCloseSettings');
const btnMenuTop = document.getElementById('btnMenuTop');
const btnExitTop = document.getElementById('btnExitTop');
const btnToggleMusic = document.getElementById('btnToggleMusic');
const btnToggleSfx = document.getElementById('btnToggleSfx');
const btnModalRules = document.getElementById('btnModalRules');
const btnModalPowerups = document.getElementById('btnModalPowerups');

const renderOptionButtons = ArcadeGameShell.bindAudioOptions(
  btnToggleMusic,
  btnToggleSfx
);

btnOpenSettings.onclick = () => {
  if (gameState === 'playing') {
    gameState = 'PAUSE';
  }
  renderOptionButtons();
  ArcadeGameShell.showModal(settingsModal);
};

btnCloseSettings.onclick = () => {
  ArcadeGameShell.hideModal(settingsModal);
  getAC();
  if (gameState === 'PAUSE') {
    gameState = 'playing';
  }
};

btnMenuTop.onclick = () => {
  getAC();
  saveScore();
  gameState = 'COVER';
  if (settingsModal.style.display === 'flex') {
    ArcadeGameShell.hideModal(settingsModal);
  }
};

btnExitTop.onclick = () => {
  exitGame();
};

btnModalRules.onclick = () => {
  ArcadeGameShell.hideModal(settingsModal);
  getAC();
  gameState = 'RULES';
};

btnModalPowerups.onclick = () => {
  ArcadeGameShell.hideModal(settingsModal);
  getAC();
  gameState = 'POWERUPS_INFO';
};

const isSfxAllowed = ArcadeGameShell.isSfxAllowed;

function playSound(type) {
  if (!isSfxAllowed()) return;
  try {
    const ac = getAC();
    if (!ac) return;

    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);

    if (type === 'cross') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(580, ac.currentTime);
      osc.frequency.setValueAtTime(750, ac.currentTime + .06);
      gain.gain.setValueAtTime(.40, ac.currentTime);
      osc.start(); osc.stop(ac.currentTime + .12);
    } else if (type === 'crash') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(380, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ac.currentTime + .28);
      gain.gain.setValueAtTime(.60, ac.currentTime);
      osc.start(); osc.stop(ac.currentTime + .28);
    } else if (type === 'pickup') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, ac.currentTime);
      osc.frequency.setValueAtTime(1040, ac.currentTime + .1);
      gain.gain.setValueAtTime(.50, ac.currentTime);
      osc.start(); osc.stop(ac.currentTime + .20);
    } else if (type === 'malus') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ac.currentTime);
      osc.frequency.linearRampToValueAtTime(70, ac.currentTime + .22);
      gain.gain.setValueAtTime(.50, ac.currentTime);
      osc.start(); osc.stop(ac.currentTime + .22);
    } else if (type === 'fail') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, ac.currentTime);
      osc.frequency.linearRampToValueAtTime(40, ac.currentTime + .35);
      gain.gain.setValueAtTime(.65, ac.currentTime);
      osc.start(); osc.stop(ac.currentTime + .35);
    } else if (type === 'alarm') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, ac.currentTime);
      osc.frequency.setValueAtTime(400, ac.currentTime + .15);
      gain.gain.setValueAtTime(.65, ac.currentTime);
      osc.start(); osc.stop(ac.currentTime + .30);
    }
  } catch (e) {}
}

const imgCover = new Image(); imgCover.src = 'assets/copertina.png';
const imgGiulia = new Image(); imgGiulia.src = 'assets/giulia.png';
const imgTobi = new Image();   imgTobi.src = 'assets/tobi.png';
const imgDave = new Image();   imgDave.src = 'assets/dave.png';
const imgLuca = new Image();   imgLuca.src = 'assets/luca.png';

const pickupImages = {};
[
  ['AUTO_SAVE', 'autosave.png'],
  ['PROXY_ON', 'proxy2X.png'],
  ['CACHE_BOOST', 'chacheboost.png'],
  ['GUARD', 'render.png'],
  ['EXTRA_LIFE', 'Undolife.png'],
  ['DROP_FRAME', 'dropframe.png'],
  ['DISK_FULL', 'buffering.png']
].forEach(([key, file]) => {
  const image = new Image();
  image.src = `assets/potenziamenti/${file}`;
  pickupImages[key] = image;
});

const ASSETS = { COVER: imgCover };

const CHARACTERS = {
  GIULIA: {
    id: 'GIULIA', name: "GIULIA", subtitle: "Lead Video Editor",
    perkBonus: "BONUS: Precisione (+25% Punti)", perkMalus: "MALUS: Sensibile al Glitch",
    primary: "#00f3ff", img: imgGiulia, speed: 1.0, scoreMult: 1.25
  },
  TOBI: {
    id: 'TOBI', name: "TOBI", subtitle: "Assistant Video Editor",
    perkBonus: "BONUS: Agilità (+20% Velocità)", perkMalus: "MALUS: Punteggio Base (-10%)",
    primary: "#ffd700", img: imgTobi, speed: 1.15, scoreMult: 0.9
  },
  DAVE: {
    id: 'DAVE', name: "DAVE", subtitle: "Editor Senior (Il più anziano)",
    perkBonus: "BONUS: Esperienza (+30% Punteggio)", perkMalus: "MALUS: Passo Pesante (-15% Velocità)",
    primary: "#ff0055", img: imgDave, speed: 0.85, scoreMult: 1.3
  },
  LUCA: {
    id: 'LUCA', name: "LUCA", subtitle: "VFX Artist (Multitasking Pro)",
    perkBonus: "BONUS: Multitasking (+15% Punti)", perkMalus: "MALUS: Troppi Render Attivi",
    primary: "#ffaa00", img: imgLuca, speed: 1.05, scoreMult: 1.15
  }
};

const CHARACTER_LIST = ['GIULIA', 'TOBI', 'DAVE', 'LUCA'];
let selectedCharIndex = 0;
let currentTheme = CHARACTERS.GIULIA;

/* BLOCCHI DIVERSIFICATI (9 TIPI CON DIMENSIONI, COLORI E COMPORTAMENTI UNICI) */
const BLOCK_TYPES = {
  A_ROLL: {
    id: 'A_ROLL', label: 'A001_C004', bg: '#2b52a1', border: '#5682e8', textCol: '#ffffff', topBar: '#00ff66', wMult: 2.2
  },
  SPEED_RAMP: {
    id: 'SPEED_RAMP', label: 'SPEED ⚡', bg: '#7f22a7', border: '#b842df', textCol: '#ffffff', topBar: '#ff0055', wMult: 2.3
  },
  LUMETRI: {
    id: 'LUMETRI', label: 'LUMETRI 🎨', bg: '#a11b43', border: '#e64273', textCol: '#ffffff', topBar: '#ffee00', wMult: 2.1
  },
  PROXY_FADE: {
    id: 'PROXY_FADE', label: 'PROXY 🎬', bg: '#147b85', border: '#23b3be', textCol: '#ffffff', topBar: '#00ff66', wMult: 2.4
  },
  OFFLINE_CORRUPT: {
    id: 'OFFLINE_CORRUPT', label: 'OFFLINE 🔴', bg: '#8b0000', border: '#ff3333', textCol: '#ffffff', topBar: '#ff0000', wMult: 2.2
  },
  AUDIO_WAVE: {
    id: 'AUDIO_WAVE', label: 'WAVE 🎵', bg: '#005f73', border: '#0a9396', textCol: '#e0f2fe', topBar: '#94d2bd', wMult: 1.4
  },
  NESTED_SEQ: {
    id: 'NESTED_SEQ', label: 'NEST_SEQ 📦', bg: '#ca6702', border: '#ee9b00', textCol: '#ffffff', topBar: '#e9d8a6', wMult: 3.2
  },
  TITLER_CG: {
    id: 'TITLER_CG', label: 'TITLE 📝', bg: '#9d0208', border: '#dc2f02', textCol: '#ffffff', topBar: '#ffba08', wMult: 1.3
  },
  TRANSITION_X: {
    id: 'TRANSITION_X', label: 'DISSOLVE 🔀', bg: '#4a154b', border: '#7b2cbf', textCol: '#ffffff', topBar: '#00fff5', wMult: 1.7
  }
};

const PICKUP_TYPES = {
  AUTO_SAVE:   { id: 'AUTO_SAVE', label: 'AUTO-SAVE', detail: 'Checkpoint: riparti da qui', pts: 300, isMalus: false, icon: pickupImages.AUTO_SAVE },
  PROXY_ON:    { id: 'PROXY_ON', label: 'PROXY 2X', detail: 'Punti raddoppiati per 10s', pts: 400, isMalus: false, scoreBoost: 2, duration: 600, icon: pickupImages.PROXY_ON },
  CACHE_BOOST: { id: 'CACHE_BOOST', label: 'CACHE BOOST', detail: 'Velocità e +150 punti', pts: 150, isMalus: false, speedBoost: 1.2, duration: 480, icon: pickupImages.CACHE_BOOST },
  GUARD:       { id: 'GUARD', label: 'RENDER SHIELD', detail: 'Protezione crash per 5s', pts: 250, isMalus: false, shieldDuration: 300, duration: 300, icon: pickupImages.GUARD },
  EXTRA_LIFE:  { id: 'EXTRA_LIFE', label: 'UNDO LIFE', detail: 'Errore annullato: +1 vita', pts: 100, isMalus: false, extraLife: 1, icon: pickupImages.EXTRA_LIFE },
  DROP_FRAME:  { id: 'DROP_FRAME', label: 'DROP FRAME', detail: 'Sistema rallentato per 6s', pts: -100, isMalus: true, slowFactor: 0.7, duration: 360, icon: pickupImages.DROP_FRAME },
  DISK_FULL:   { id: 'DISK_FULL', label: 'BUFFERING', detail: 'Controlli invertiti per 5s', pts: -200, isMalus: true, invertControls: true, duration: 300, icon: pickupImages.DISK_FULL }
};

let gameState = 'COVER';
let score = 0;
let highScore = parseInt(localStorage.getItem('deadlineDrive_highScore')) || 0;
let scoreSavedForCurrentGame = false;
let lives = 3;
let currentLevel = 1;
let maxReachedLevel = 1;
let totalLanesGenerated = 0;
let frame = 0;
let visualScrollOffset = 0;
let activeLanes = [];
let particles = [];
let activePickupStatus = null;
let autosaveCheckpoint = null;
let saveBanner = null;

/* VAR PER GESTIONE ONDATE PANICO (AVVIA DA LIVELLO V15) */
let panicModeActive = false;
let hasSeenPanicPopup = false;
let panicWaveCount = 0;
let panicTimer = 0;
let panicCooldown = 0; // Cooldown lungo tra le ondate
let voidGy = ROWS + 3; // Riga rossa di cancellazione
let voidStepTimer = 0;

let player = {
  gx: Math.floor(COLS / 2),
  gy: ROWS - 2,
  w: 22, h: 22,
  facingLeft: false,
  invTimer: 0,
  guardTimer: 0,
  speedMult: 1,
  tempScoreMult: 1,
  glitchTimer: 0,
  speedTimer: 0,
  scoreBoostTimer: 0,
  speedEffectId: null
};

let moveState = { up: false, down: false, left: false, right: false };
let moveCooldown = 0;
let lastMenuAdvanceTime = 0;

function advanceMenuState() {
  const now = Date.now();
  if (now - lastMenuAdvanceTime < 250) return;
  lastMenuAdvanceTime = now;

  getAC();
  playSound('cross');
  if (gameState === 'COVER') {
    gameState = 'STORY';
  } else if (gameState === 'STORY') {
    gameState = 'RULES';
  } else if (gameState === 'RULES') {
    gameState = 'POWERUPS_INFO';
  } else if (gameState === 'POWERUPS_INFO') {
    gameState = 'CHAR_SELECT';
  } else if (gameState === 'CHAR_SELECT') {
    startGame();
  } else if (gameState === 'gameover') {
    gameState = 'CHAR_SELECT';
  }
}

function startPanicWave() {
  panicWaveCount++;
  let durationSec = 20 + (panicWaveCount - 1) * 5;
  panicTimer = durationSec * 60;
  panicModeActive = true;
  voidGy = ROWS + 2;
  voidStepTimer = 0;
  playSound('alarm');
}

function createNewLane(isInitialSetup = false, r = 0) {
  totalLanesGenerated++;

  let laneLevelIndex = Math.max(1, Math.floor(totalLanesGenerated / 5) + 1);
  let isSafe = (totalLanesGenerated % 5 === 0) || (isInitialSetup && (r === 0 || r === ROWS - 1 || r === ROWS - 2));

  let laneType = isSafe ? 'SAFE' : 'ROAD';
  let dir = Math.random() < 0.5 ? 1 : -1;
  let baseSpeed = 0.38 + Math.min((laneLevelIndex - 1) * 0.09, 0.85);

  let selectedBlockType = BLOCK_TYPES.A_ROLL;
  if (laneLevelIndex === 2) selectedBlockType = BLOCK_TYPES.SPEED_RAMP;
  else if (laneLevelIndex === 3) selectedBlockType = BLOCK_TYPES.LUMETRI;
  else if (laneLevelIndex === 4) selectedBlockType = BLOCK_TYPES.PROXY_FADE;
  else if (laneLevelIndex === 5) selectedBlockType = BLOCK_TYPES.AUDIO_WAVE;
  else if (laneLevelIndex === 6) selectedBlockType = BLOCK_TYPES.NESTED_SEQ;
  else if (laneLevelIndex === 7) selectedBlockType = BLOCK_TYPES.TITLER_CG;
  else if (laneLevelIndex === 8) selectedBlockType = BLOCK_TYPES.TRANSITION_X;
  else if (laneLevelIndex >= 9) {
    let types = Object.values(BLOCK_TYPES);
    selectedBlockType = types[Math.floor(Math.random() * types.length)];
  }

  let laneObj = {
    type: laneType,
    levelNumber: laneLevelIndex,
    trackLabel: isSafe ? "SAFE" : `V${laneLevelIndex}`,
    bg: isSafe ? '#1b2333' : '#141416',
    dir,
    baseSpeed,
    blockType: selectedBlockType,
    objects: [],
    pickups: []
  };

  if (laneType === 'ROAD') {
    let x = TRACK_HEADER_W - CELL_SIZE * 2;
    let minGap = CELL_SIZE * Math.max(3.5, 5.8 - Math.min((laneLevelIndex - 1) * 0.2, 1.8));

    do {
      x += CELL_SIZE * (1.1 + Math.random() * 1.3) + minGap;
      if (x < CANVAS_W + CELL_SIZE * 2) {
        let widthFactor = Math.min(3.2, selectedBlockType.wMult);
        laneObj.objects.push({
          x,
          type: selectedBlockType,
          w: widthFactor * CELL_SIZE
        });
      }
    } while (x < CANVAS_W + CELL_SIZE * 2);
  } else if (Math.random() < 0.40) {
    let keys = Object.keys(PICKUP_TYPES);
    let key = keys[Math.floor(Math.random() * keys.length)];
    laneObj.pickups.push({
      gx: Math.floor(Math.random() * (COLS - 3)) + 2,
      type: PICKUP_TYPES[key]
    });
  }

  return laneObj;
}

function startInfiniteScroll() {
  activeLanes = [];
  visualScrollOffset = 0;
  totalLanesGenerated = 0;
  currentLevel = 1;
  maxReachedLevel = 1;

  panicModeActive = false;
  hasSeenPanicPopup = false;
  panicWaveCount = 0;
  panicTimer = 0;
  panicCooldown = 0;
  voidGy = ROWS + 3;
  voidStepTimer = 0;

  for (let r = 0; r < ROWS; r++) {
    activeLanes.push(createNewLane(true, r));
  }
  resetPlayer();
}

function resetPlayer() {
  player.gx = Math.floor(COLS / 2);
  player.gy = ROWS - 2;
  player.invTimer = 120;
  player.guardTimer = 0;
  player.speedMult = 1;
  player.tempScoreMult = 1;
  player.glitchTimer = 0;
  player.speedTimer = 0;
  player.scoreBoostTimer = 0;
  player.speedEffectId = null;
  activePickupStatus = null;
  moveCooldown = 0;
}

function startGame() {
  scoreSavedForCurrentGame = false;
  currentTheme = CHARACTERS[CHARACTER_LIST[selectedCharIndex]];
  score = 0;
  autosaveCheckpoint = null;
  saveBanner = null;
  lives = 3;
  startInfiniteScroll();
  gameState = 'playing';
  playSound('pickup');
}

function executePlayerStep(dx, dy) {
  let ngx = player.gx + dx;
  let ngy = player.gy + dy;

  if (ngx >= 2 && ngx < COLS && ngy >= 0 && ngy < ROWS) {
    player.gx = ngx;
    player.gy = ngy;

    if (dy < 0 && player.gy < 6) scrollWorldDown();
    else if (dy < 0) score += Math.floor(12 * currentLevel * currentTheme.scoreMult * player.tempScoreMult);

    playSound('cross');
  }
}

function updatePlayer() {
  if (player.glitchTimer > 0) player.glitchTimer--;
  if (player.invTimer > 0) player.invTimer--;
  if (player.guardTimer > 0) player.guardTimer--;
  if (player.speedTimer > 0 && --player.speedTimer === 0) {
    player.speedMult = 1;
    player.speedEffectId = null;
  }
  if (player.scoreBoostTimer > 0 && --player.scoreBoostTimer === 0) player.tempScoreMult = 1;
  if (activePickupStatus && activePickupStatus.timer > 0) {
    activePickupStatus.timer--;
    if (activePickupStatus.timer <= 0) activePickupStatus = null;
  }
  if (!activePickupStatus) {
    const activeType = player.guardTimer > 0 ? PICKUP_TYPES.GUARD
      : player.glitchTimer > 0 ? PICKUP_TYPES.DISK_FULL
      : player.scoreBoostTimer > 0 ? PICKUP_TYPES.PROXY_ON
      : player.speedTimer > 0 ? PICKUP_TYPES[player.speedEffectId]
      : null;
    const remaining = activeType?.id === 'GUARD' ? player.guardTimer
      : activeType?.id === 'DISK_FULL' ? player.glitchTimer
      : activeType?.id === 'PROXY_ON' ? player.scoreBoostTimer
      : activeType ? player.speedTimer
      : 0;
    if (activeType && remaining > 0) {
      activePickupStatus = { type: activeType, timer: remaining, total: activeType.duration };
    }
  }

  if (moveCooldown > 0) {
    moveCooldown--;
  } else {
    let inLeft = keyPressed('ArrowLeft') || keyPressed('KeyA') || moveState.left;
    let inRight = keyPressed('ArrowRight') || keyPressed('KeyD') || moveState.right;
    let inUp = keyPressed('ArrowUp') || keyPressed('KeyW') || moveState.up;
    let inDown = keyPressed('ArrowDown') || keyPressed('KeyS') || moveState.down;

    if (player.glitchTimer > 0) {
      let tL = inLeft, tR = inRight, tU = inUp, tD = inDown;
      inLeft = tR; inRight = tL; inUp = tD; inDown = tU;
    }

    let dx = 0, dy = 0;
    if (inLeft) { dx--; player.facingLeft = true; }
    else if (inRight) { dx++; player.facingLeft = false; }

    if (inUp) dy--;
    else if (inDown) dy++;

    if (dx !== 0 || dy !== 0) {
      executePlayerStep(dx, dy);
      moveCooldown = Math.max(9, Math.floor(12 / (currentTheme.speed * player.speedMult)));
    }
  }

  checkPickups();
  checkCollisions();
}

function scrollWorldDown() {
  activeLanes.pop();
  let newLane = createNewLane(false);
  activeLanes.unshift(newLane);
  player.gy++;
  visualScrollOffset -= CELL_SIZE;

  if (voidGy < ROWS + 3) {
    voidGy++;
  }

  score += Math.floor(18 * currentLevel * currentTheme.scoreMult * player.tempScoreMult);

  if (newLane.levelNumber > maxReachedLevel) {
    maxReachedLevel = newLane.levelNumber;
    currentLevel = maxReachedLevel;
  }

  if (maxReachedLevel >= 15 && !panicModeActive && panicCooldown <= 0) {
    if (!hasSeenPanicPopup) {
      hasSeenPanicPopup = true;
      gameState = 'PANIC_POPUP';
    } else {
      startPanicWave();
    }
  }
}

function updateVehicles() {
  visualScrollOffset += (0 - visualScrollOffset) * 0.25;
  if (Math.abs(visualScrollOffset) < 0.1) visualScrollOffset = 0;

  if (panicModeActive && gameState === 'playing') {
    panicTimer--;

    let voidStepDelay = Math.max(25, 42 - Math.min(panicWaveCount * 3, 17));
    voidStepTimer++;
    if (voidStepTimer >= voidStepDelay) {
      voidStepTimer = 0;
      if (voidGy > 1) voidGy--;
    }

    if (player.gy >= voidGy) {
      hitPlayer();
    }

    if (panicTimer <= 0) {
      panicModeActive = false;
      panicCooldown = 35 * 60;
      voidGy = ROWS + 3;
    }
  } else if (panicCooldown > 0 && gameState === 'playing') {
    panicCooldown--;
    if (panicCooldown <= 0 && maxReachedLevel >= 15) {
      startPanicWave();
    }
  }

  activeLanes.forEach(lane => {
    if (lane.type === 'ROAD') {
      let currentSpeed = lane.baseSpeed;

      if (lane.blockType.id === 'SPEED_RAMP') {
        currentSpeed *= (0.6 + 0.8 * (Math.sin(frame * 0.06) + 1) / 2);
      } else if (lane.blockType.id === 'OFFLINE_CORRUPT') {
        if (Math.floor(frame / 20) % 3 === 0) currentSpeed = 0;
      } else if (lane.blockType.id === 'AUDIO_WAVE') {
        currentSpeed *= (0.8 + 0.5 * Math.sin(frame * 0.12));
      } else if (lane.blockType.id === 'TITLER_CG') {
        if (Math.floor(frame / 15) % 4 === 0) currentSpeed *= 1.6;
      }

      if (panicModeActive) {
        let speedMultiplier = 1.3 + (panicWaveCount * 0.15);
        currentSpeed *= speedMultiplier;

        let glitchChance = Math.min(0.18, 0.04 + (panicWaveCount * 0.03));
        if (Math.random() < glitchChance) {
          let crazyFactor = -0.6 - (panicWaveCount * 0.12);
          currentSpeed *= crazyFactor;
        }
      }

      lane.objects.forEach(obj => {
        obj.x += currentSpeed * lane.dir;
        if (lane.dir > 0 && obj.x > CANVAS_W + obj.w) obj.x = TRACK_HEADER_W - obj.w;
        else if (lane.dir < 0 && obj.x < TRACK_HEADER_W - obj.w) obj.x = CANVAS_W + obj.w;
      });
    }
  });

  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.x += p.vx; p.y += p.vy; p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function addParticles(x, y, color, count = 8) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - .5) * 6,
      vy: (Math.random() - .5) * 6,
      life: 16, color
    });
  }
}

function checkPickups() {
  let currentLane = activeLanes[player.gy];
  if (!currentLane || !currentLane.pickups.length) return;

  for (let i = currentLane.pickups.length - 1; i >= 0; i--) {
    let p = currentLane.pickups[i];
    if (p.gx === player.gx) {
      score += Math.floor(p.type.pts * currentTheme.scoreMult);
      if (p.type.isMalus) {
        playSound('malus');
        if (p.type.slowFactor) {
          player.speedMult = p.type.slowFactor;
          player.speedTimer = p.type.duration;
          player.speedEffectId = p.type.id;
        }
        if (p.type.invertControls) player.glitchTimer = p.type.duration;
      } else {
        playSound('pickup');
        if (p.type.speedBoost) {
          player.speedMult = p.type.speedBoost;
          player.speedTimer = p.type.duration;
          player.speedEffectId = p.type.id;
        }
        if (p.type.scoreBoost) {
          player.tempScoreMult = p.type.scoreBoost;
          player.scoreBoostTimer = p.type.duration;
        }
        if (p.type.shieldDuration) {
          player.guardTimer = p.type.shieldDuration;
        }
        if (p.type.extraLife) {
          lives = Math.min(5, lives + p.type.extraLife);
        }
      }
      const statusDuration = p.type.duration || 120;
      activePickupStatus = { type: p.type, timer: statusDuration, total: statusDuration };
      const pickupColor = p.type.extraLife ? '#ff3e91' : (p.type.isMalus ? '#ff0055' : '#00f3ff');
      addParticles(player.gx * CELL_SIZE + CELL_SIZE / 2, player.gy * CELL_SIZE + HUD_HEIGHT, pickupColor, 10);
      currentLane.pickups.splice(i, 1);
      if (p.type.id === 'AUTO_SAVE') {
        captureAutosaveCheckpoint();
        showSaveBanner('AUTOSAVE');
        activePickupStatus = null;
      }
    }
  }
}

function cloneLaneForCheckpoint(lane) {
  return {
    ...lane,
    objects: lane.objects.map(obj => ({ ...obj })),
    pickups: lane.pickups.map(pickup => ({ ...pickup }))
  };
}

function captureAutosaveCheckpoint() {
  autosaveCheckpoint = {
    score,
    currentLevel,
    maxReachedLevel,
    totalLanesGenerated,
    visualScrollOffset,
    activeLanes: activeLanes.map(cloneLaneForCheckpoint),
    gx: player.gx,
    gy: player.gy,
    facingLeft: player.facingLeft,
    panicModeActive,
    panicWaveCount,
    panicTimer,
    panicCooldown,
    voidGy,
    voidStepTimer
  };
}

function restoreAutosaveCheckpoint() {
  if (!autosaveCheckpoint) return false;
  score = autosaveCheckpoint.score;
  currentLevel = autosaveCheckpoint.currentLevel;
  maxReachedLevel = autosaveCheckpoint.maxReachedLevel;
  totalLanesGenerated = autosaveCheckpoint.totalLanesGenerated;
  visualScrollOffset = autosaveCheckpoint.visualScrollOffset;
  activeLanes = autosaveCheckpoint.activeLanes.map(cloneLaneForCheckpoint);
  player.gx = autosaveCheckpoint.gx;
  player.gy = autosaveCheckpoint.gy;
  player.facingLeft = autosaveCheckpoint.facingLeft;
  panicModeActive = autosaveCheckpoint.panicModeActive;
  panicWaveCount = autosaveCheckpoint.panicWaveCount;
  panicTimer = autosaveCheckpoint.panicTimer;
  panicCooldown = autosaveCheckpoint.panicCooldown;
  voidGy = autosaveCheckpoint.voidGy;
  voidStepTimer = autosaveCheckpoint.voidStepTimer;
  showSaveBanner('RECOVERY SAVE');
  return true;
}

function showSaveBanner(label) {
  saveBanner = { label, timer: 112, elapsed: 0, fillDuration: 100 };
}

function checkCollisions() {
  if (gameState !== 'playing' || player.invTimer > 0 || player.guardTimer > 0) return;
  let playerX = player.gx * CELL_SIZE + CELL_SIZE / 2;
  let lane = activeLanes[player.gy];

  if (lane && lane.type === 'ROAD') {
    if (lane.blockType.id === 'PROXY_FADE' && Math.floor(frame / 30) % 2 === 0) {
      return;
    }

    for (const obj of lane.objects) {
      let oLeft = obj.x, oRight = obj.x + obj.w;
      let pLeft = playerX - player.w / 2, pRight = playerX + player.w / 2;
      if (pLeft < oRight && pRight > oLeft) {
        hitPlayer();
        break;
      }
    }
  }
}

function hitPlayer() {
  lives--;
  playSound('crash');
  addParticles(player.gx * CELL_SIZE + CELL_SIZE / 2, player.gy * CELL_SIZE + HUD_HEIGHT, '#ff0055', 20);

  if (lives <= 0) {
    gameState = 'gameover';
    playSound('fail');
    saveScore();
    ArcadeGameShell.showEndActions({ onRetry: () => { gameState = 'CHAR_SELECT'; }, onExit: () => exitGame() });
  } else {
    const recovered = restoreAutosaveCheckpoint();
    if (!recovered) {
      let respawnGy = ROWS - 2;
      for (let r = player.gy; r < ROWS; r++) {
        if (activeLanes[r] && activeLanes[r].type === 'SAFE' && r < voidGy) {
          respawnGy = r;
          break;
        }
      }
      player.gx = Math.floor(COLS / 2);
      player.gy = respawnGy;
    }
    player.invTimer = 120;
    player.glitchTimer = 0;
    player.speedMult = 1;
    player.tempScoreMult = 1;
    player.speedTimer = 0;
    player.scoreBoostTimer = 0;
    player.speedEffectId = null;
    activePickupStatus = null;
  }
}

function drawGameWorld() {
  ctx.fillStyle = '#181818';
  ctx.fillRect(0, HUD_HEIGHT, CANVAS_W, CANVAS_H - HUD_HEIGHT);

  activeLanes.forEach((lane, r) => {
    let y = r * CELL_SIZE + HUD_HEIGHT + visualScrollOffset;
    ctx.fillStyle = lane.bg;
    ctx.fillRect(0, y, CANVAS_W, CELL_SIZE);
    ctx.strokeStyle = '#222226';
    ctx.strokeRect(0, y, CANVAS_W, CELL_SIZE);
  });

  activeLanes.forEach((lane, r) => {
    if (lane.type === 'SAFE') {
      let y = r * CELL_SIZE + HUD_HEIGHT + visualScrollOffset;
      lane.pickups.forEach(p => {
        let px = p.gx * CELL_SIZE + CELL_SIZE / 2;
        let py = y + CELL_SIZE / 2;
        if (p.type.icon?.complete && p.type.icon.naturalWidth > 0) {
          ctx.save();
          ctx.imageSmoothingEnabled = false;
          ctx.shadowColor = p.type.isMalus ? '#ff0055' : '#00f3ff';
          ctx.shadowBlur = 8;
          ctx.drawImage(p.type.icon, px - 16, py - 16, 32, 32);
          ctx.restore();
        } else {
          ctx.fillStyle = p.type.isMalus ? '#ff0055' : '#ffff00';
          ctx.fillRect(px - 10, py - 10, 20, 20);
        }
      });
    }
  });

  /* RENDER BLOCCHI CLIP CON DIMENSIONI E TESTI DINAMICI */
  activeLanes.forEach((lane, r) => {
    if (lane.type === 'ROAD') {
      let y = r * CELL_SIZE + HUD_HEIGHT + visualScrollOffset;

      lane.objects.forEach(obj => {
        let x = obj.x;
        let blockW = obj.w;
        let blockH = CELL_SIZE - 2;

        if (x + blockW < TRACK_HEADER_W) return;

        ctx.save();

        if (lane.blockType.id === 'PROXY_FADE' && Math.floor(frame / 30) % 2 === 0) {
          ctx.globalAlpha = 0.25;
        }

        ctx.beginPath();
        ctx.rect(x + 1, y + 1, blockW - 2, blockH);
        ctx.clip();

        if (panicModeActive) {
          let flashRate = Math.max(3, 10 - panicWaveCount);
          ctx.fillStyle = (Math.floor(frame / flashRate) % 2 === 0) ? '#5a0000' : '#800030';
        } else {
          ctx.fillStyle = obj.type.bg;
        }
        ctx.fillRect(x + 1, y + 1, blockW - 2, blockH);

        let topBarCol = obj.type.topBar || '#00ff66';
        if (panicModeActive) {
          topBarCol = (Math.floor(frame / 4) % 2 === 0) ? '#ff0055' : '#ffea00';
        } else if (lane.blockType.id === 'LUMETRI' && Math.floor(frame / 12) % 2 === 0) {
          topBarCol = '#00f3ff';
        }
        ctx.fillStyle = topBarCol;
        ctx.fillRect(x + 1, y + 1, blockW - 2, 3);

        ctx.strokeStyle = panicModeActive ? '#ff00ff' : obj.type.border;
        ctx.lineWidth = panicModeActive ? 2 : 1.5;
        ctx.strokeRect(x + 1, y + 1, blockW - 2, blockH);

        if (blockW >= CELL_SIZE * 1.5) {
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(x + 4, y + 6, 16, 14);
          ctx.fillStyle = panicModeActive ? '#ff0055' : '#00f3ff';
          ctx.font = '900 9px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(panicModeActive ? 'ERR' : 'FX', x + 12, y + 13);
        }

        ctx.fillStyle = obj.type.textCol || '#ffffff';
        let fontSize = blockW < CELL_SIZE * 1.6 ? 9 : 11;
        ctx.font = `900 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        let textXOffset = blockW >= CELL_SIZE * 1.5 ? 24 : 6;
        let maxTextW = blockW - textXOffset - 4;
        if (maxTextW > 8) {
          let labelText = panicModeActive ? '⚠️ERR' : obj.type.label;
          ctx.fillText(labelText, x + textXOffset, y + blockH / 2 + 1, maxTextW);
        }

        ctx.restore();
      });
    }
  });

  /* CANCELLAZIONE TIMELINE ROSSA VELOCE DAL BASSO */
  activeLanes.forEach((lane, r) => {
    let y = r * CELL_SIZE + HUD_HEIGHT + visualScrollOffset;
    if (r >= voidGy) {
      ctx.fillStyle = 'rgba(255, 0, 85, 0.90)';
      ctx.fillRect(0, y, CANVAS_W, CELL_SIZE);
      ctx.strokeStyle = '#ffea00';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, y, CANVAS_W, CELL_SIZE);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('░░░ TIMELINE CANCELLATA ✖ ░░░', CANVAS_W / 2 + 20, y + CELL_SIZE / 2);
    }
  });

  // SIDEBAR TRACK HEADER CON LIVELLI V1, V2, V3...
  activeLanes.forEach((lane, r) => {
    let y = r * CELL_SIZE + HUD_HEIGHT + visualScrollOffset;
    ctx.fillStyle = r >= voidGy ? '#8b0000' : '#1c1c24';
    ctx.fillRect(0, y, TRACK_HEADER_W, CELL_SIZE);
    ctx.strokeStyle = '#2a2a38';
    ctx.strokeRect(0, y, TRACK_HEADER_W, CELL_SIZE);

    ctx.fillStyle = r >= voidGy ? '#ffffff' : (lane.type === 'SAFE' ? '#00ff66' : '#00f3ff');
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lane.trackLabel, TRACK_HEADER_W / 2, y + CELL_SIZE / 2);
  });

  particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 4, 4);
  });

  let playheadX = player.gx * CELL_SIZE + CELL_SIZE / 2;
  ctx.strokeStyle = 'rgba(0,243,255,0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(playheadX, HUD_HEIGHT);
  ctx.lineTo(playheadX, CANVAS_H);
  ctx.stroke();

  drawSinglePlayer();

  if (activePickupStatus) drawActivePickupStatus();
  if (saveBanner) drawSaveBanner();

  if (panicModeActive) {
    let secLeft = Math.ceil(panicTimer / 60);
    ctx.fillStyle = 'rgba(255, 0, 85, 0.95)';
    ctx.fillRect(TRACK_HEADER_W, HUD_HEIGHT, CANVAS_W - TRACK_HEADER_W, 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`⚡ ONDATA #${panicWaveCount} (INTENSITÀ x${panicWaveCount}) - ${secLeft}s`, (CANVAS_W + TRACK_HEADER_W) / 2, HUD_HEIGHT + 10);
  }
}

function drawSinglePlayer() {
  let playerY = player.gy * CELL_SIZE + HUD_HEIGHT + CELL_SIZE / 2 + visualScrollOffset;
  let playerX = player.gx * CELL_SIZE + CELL_SIZE / 2;

  if (player.invTimer > 0 && Math.floor(player.invTimer / 4) % 2 === 0) return;

  ctx.save();
  ctx.translate(playerX, playerY);
  if (player.facingLeft) ctx.scale(-1, 1);

  ctx.shadowColor = '#00f3ff';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#00f3ff';
  ctx.beginPath();
  ctx.moveTo(0, -14); ctx.lineTo(12, 0); ctx.lineTo(0, 14); ctx.lineTo(-12, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (player.glitchTimer > 0) {
    ctx.fillStyle = '#ff0055';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('⚠', 0, -18);
  }

  if (player.guardTimer > 0) {
    ctx.shadowColor = '#00bfff';
    ctx.strokeStyle = '#3ddcff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawActivePickupStatus() {
  const status = activePickupStatus;
  const type = status.type;
  const x = 58, y = HUD_HEIGHT + 8, w = CANVAS_W - 72, h = 50;
  const progress = Math.max(0, Math.min(1, status.timer / status.total));

  ctx.save();
  ctx.fillStyle = 'rgba(8, 5, 20, 0.94)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = type.isMalus ? '#ff0055' : '#00f3ff';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  if (type.icon?.complete && type.icon.naturalWidth > 0) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(type.icon, x + 7, y + 5, 36, 36);
  }

  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = type.isMalus ? '#ff668f' : '#ffea00';
  ctx.font = '900 12px monospace';
  const seconds = type.duration ? `  ${Math.ceil(status.timer / 60)}s` : '';
  ctx.fillText(`${type.label}${seconds}`, x + 51, y + 14);
  ctx.fillStyle = '#ffffff';
  ctx.font = '11px sans-serif';
  ctx.fillText(type.detail, x + 51, y + 29);

  ctx.fillStyle = '#242234';
  ctx.fillRect(x + 51, y + 39, w - 60, 5);
  ctx.fillStyle = type.isMalus ? '#ff0055' : '#00ff99';
  ctx.fillRect(x + 51, y + 39, (w - 60) * progress, 5);
  ctx.restore();
}

function drawSaveBanner() {
  const x = 42, y = HUD_HEIGHT + 92, w = CANVAS_W - 84, h = 104;
  const progress = Math.max(0, Math.min(1, saveBanner.elapsed / saveBanner.fillDuration));

  ctx.save();
  ctx.fillStyle = 'rgba(34, 34, 38, 0.98)';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill();
  ctx.strokeStyle = '#77777d'; ctx.lineWidth = 2; ctx.stroke();

  ctx.fillStyle = '#6e6e72';
  ctx.fillRect(x + 2, y + 2, w - 4, 34);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 17px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(saveBanner.label, x + 16, y + 19);

  ctx.fillStyle = '#18181c';
  ctx.beginPath(); ctx.roundRect(x + 18, y + 57, w - 36, 24, 8); ctx.fill();
  if (progress > 0) {
    ctx.fillStyle = '#349bea';
    ctx.beginPath(); ctx.roundRect(x + 18, y + 57, (w - 36) * progress, 24, 8); ctx.fill();
  }
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#121218';
  ctx.fillRect(0, 0, CANVAS_W, HUD_HEIGHT);
  ctx.strokeStyle = '#00f3ff44';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0, 0, CANVAS_W, HUD_HEIGHT);

  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#00f3ff';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`${currentTheme.name}`, 14, 18);

  ctx.fillStyle = '#ffea00';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(`PTS: ${score}`, 14, 40);

  ctx.textAlign = 'right';

  ctx.fillStyle = '#00ffcc';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(`TRACCIA: V${currentLevel} | REC: ${highScore}`, CANVAS_W - 12, 18);

  ctx.fillStyle = '#ff0055';
  ctx.font = 'bold 14px monospace';
  let hearts = '';
  for (let i = 0; i < Math.max(0, lives); i++) {
    hearts += '♥ ';
  }
  ctx.fillText(`VITE: ${hearts.trim()}`, CANVAS_W - 12, 40);
}

function drawMenuBackground() {
  ctx.fillStyle = '#08080d';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.strokeStyle = 'rgba(0, 243, 255, 0.06)';
  ctx.lineWidth = 1;
  let gridStep = 24;
  let offsetY = (frame * 0.5) % gridStep;

  for (let x = 0; x <= CANVAS_W; x += gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H);
    ctx.stroke();
  }
  for (let y = offsetY; y <= CANVAS_H; y += gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(0, 243, 255, 0.18)';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  let tcSec = Math.floor(frame / 60) % 60;
  let tcFrame = frame % 60;
  ctx.fillText(`TC: 00:14:${tcSec < 10 ? '0' + tcSec : tcSec}:${tcFrame < 10 ? '0' + tcFrame : tcFrame}`, 12, 24);
  ctx.fillText(`SEQ: TIMELINE_RUSH_2026`, 12, 38);
  ctx.textAlign = 'right';
  ctx.fillText(`PROXIES: ACTIVE`, CANVAS_W - 12, 24);
  ctx.fillText(`GPU_ACCEL: ON`, CANVAS_W - 12, 38);
}

function drawCyberPanel(x, y, w, h, borderColor = '#00f3ff', bgColor = 'rgba(16, 16, 26, 0.94)') {
  ctx.save();
  ctx.fillStyle = bgColor;
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  ctx.shadowColor = borderColor;
  ctx.shadowBlur = 10;
  ctx.strokeRect(x, y, w, h);
  ctx.shadowBlur = 0;

  let cLen = 10;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y + cLen); ctx.lineTo(x, y); ctx.lineTo(x + cLen, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + w, y + h - cLen); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - cLen, y + h); ctx.stroke();

  ctx.restore();
}

function drawPickupInfoIcon(type, x, y, size = 32) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (type.icon?.complete && type.icon.naturalWidth > 0) {
    ctx.drawImage(type.icon, x, y, size, size);
  } else {
    ctx.fillStyle = type.isMalus ? '#ff0055' : '#00f3ff';
    ctx.fillRect(x + 3, y + 3, size - 6, size - 6);
  }
  ctx.restore();
}

function drawPickupInfoRow(type, x, y, text, iconSize = 32) {
  drawPickupInfoIcon(type, x, y - iconSize / 2, iconSize);
  ctx.fillStyle = '#ffffff';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + iconSize + 12, y, 330);
}

function drawClipInfoPreview(type, x, y, w = 110) {
  ctx.save();
  ctx.fillStyle = type.bg;
  ctx.fillRect(x, y, w, 42);
  ctx.fillStyle = type.topBar;
  ctx.fillRect(x, y, w, 5);
  ctx.strokeStyle = type.border;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, 42);
  ctx.fillStyle = type.textCol;
  ctx.font = '900 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(type.label, x + w / 2, y + 23, w - 8);
  ctx.restore();
}

function drawScreens() {
  if (gameState === 'COVER') {
    if (ASSETS.COVER && ASSETS.COVER.complete && ASSETS.COVER.naturalWidth !== 0) {
      ctx.drawImage(ASSETS.COVER, 0, 0, CANVAS_W, CANVAS_H);
    } else {
      drawMenuBackground();
      ctx.fillStyle = '#ffea00';
      ctx.font = '900 36px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#ffea00';
      ctx.shadowBlur = 16;
      ctx.fillText('DEADLINE', CANVAS_W / 2, 190);
      ctx.fillText('DRIVE', CANVAS_W / 2, 232);
      ctx.shadowBlur = 0;
    }

    if (Math.floor(frame / 34) % 2 === 0) {
      const promptY = CANVAS_H - 54;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillRect(28, promptY - 24, CANVAS_W - 56, 48);
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 2;
      ctx.strokeRect(28, promptY - 24, CANVAS_W - 56, 48);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 15px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PREMI UN TASTO PER COMINCIARE', CANVAS_W / 2, promptY);
    }
    return;
  }

  drawMenuBackground();

  if (gameState === 'STORY') {
    let boxW = CANVAS_W - 28, boxH = 610;
    let boxX = (CANVAS_W - boxW) / 2, boxY = 30;

    drawCyberPanel(boxX, boxY, boxW, boxH, '#ffea00');

    ctx.fillStyle = '#ffea00';
    ctx.font = '900 22px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ffea00';
    ctx.shadowBlur = 10;
    ctx.fillText('🎬 MISSIONE: LA STORIA', CANVAS_W / 2, boxY + 38);
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(0, 243, 255, 0.15)';
    ctx.fillRect(boxX + 20, boxY + 54, boxW - 40, 24);
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX + 20, boxY + 54, boxW - 40, 24);

    ctx.fillStyle = '#00f3ff';
    ctx.font = '900 12px monospace';
    ctx.fillText('⚡ PROJECT: DEADLINE_RUSH_2026', CANVAS_W / 2, boxY + 70);

    ctx.fillStyle = '#101018';
    ctx.fillRect(boxX + 20, boxY + 90, boxW - 40, 420);
    ctx.strokeStyle = '#ffea00aa';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX + 20, boxY + 90, boxW - 40, 420);

    let contentX = boxX + 35;
    ctx.textAlign = 'left';

    ctx.fillStyle = '#ff0055';
    ctx.font = '900 14px monospace';
    ctx.fillText('⚠️ SITUAZIONE CRITICA IN AGENZIA', contentX, boxY + 120);

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.fillText('• Il cliente pretende la consegna finale!', contentX, boxY + 148);
    ctx.fillText('• Manca pochissimo all\'ora di scadenza.', contentX, boxY + 172);

    ctx.fillStyle = '#ffea00';
    ctx.fillRect(contentX, boxY + 195, boxW - 70, 2);

    ctx.fillStyle = '#00f3ff';
    ctx.font = '900 14px monospace';
    ctx.fillText('🔴 CHAOS IN TIMELINE', contentX, boxY + 225);

    ctx.fillStyle = '#e0e0e0';
    ctx.font = '14px sans-serif';
    ctx.fillText('• La sequenza video è sommersa da clip', contentX, boxY + 253);
    ctx.fillText('  corrotte, Lumetri sfasati e Drop Frame!', contentX, boxY + 277);
    ctx.fillText('• I blocchi sfrecciano a velocità folle.', contentX, boxY + 301);

    ctx.fillStyle = '#00f3ff';
    ctx.fillRect(contentX, boxY + 325, boxW - 70, 2);

    ctx.fillStyle = '#00ff66';
    ctx.font = '900 14px monospace';
    ctx.fillText('🎯 OBIETTIVO DEL VIDEOMAKER', contentX, boxY + 355);

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.fillText('• Risali le tracce V1, V2, V3, V4...', contentX, boxY + 383);
    ctx.fillText('• Raccogli Auto-Save, Proxy 2X e Scudi!', contentX, boxY + 407);
    ctx.fillText('• Salva il progetto e fai l\'export finale!', contentX, boxY + 431);

    ctx.fillStyle = '#ffea00';
    ctx.fillRect(boxX + 25, boxY + 530, boxW - 50, 56);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX + 25, boxY + 530, boxW - 50, 56);

    ctx.fillStyle = '#000000';
    ctx.font = '900 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('AVANTI: REGOLE DI GIOCO ►', CANVAS_W / 2, boxY + 563);
    return;
  }

  if (gameState === 'RULES') {
    let boxW = CANVAS_W - 28, boxH = 610;
    let boxX = (CANVAS_W - boxW) / 2, boxY = 30;

    drawCyberPanel(boxX, boxY, boxW, boxH, '#ff0055');

    ctx.fillStyle = '#ff0055';
    ctx.font = '900 22px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 10;
    ctx.fillText('📋 TIMELINE PROTOCOLS', CANVAS_W / 2, boxY + 38);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#101018'; ctx.fillRect(boxX + 18, boxY + 60, boxW - 36, 125);
    ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 2; ctx.strokeRect(boxX + 18, boxY + 60, boxW - 36, 125);

    ctx.fillStyle = '#00f3ff'; ctx.font = '900 14px monospace'; ctx.textAlign = 'left';
    ctx.fillText('1. SCHIVA LE CLIP E I RENDER', boxX + 30, boxY + 83);
    drawClipInfoPreview(BLOCK_TYPES.A_ROLL, boxX + 30, boxY + 98, 110);
    drawClipInfoPreview(BLOCK_TYPES.SPEED_RAMP, boxX + 148, boxY + 98, 110);
    drawClipInfoPreview(BLOCK_TYPES.LUMETRI, boxX + 266, boxY + 98, 110);
    ctx.fillStyle = '#ffffff'; ctx.font = '13px sans-serif';
    ctx.fillText('Schiva ogni blocco ostacolo in movimento sulle tracce!', boxX + 30, boxY + 168);

    ctx.fillStyle = '#101018'; ctx.fillRect(boxX + 18, boxY + 198, boxW - 36, 140);
    ctx.strokeStyle = '#00ff66'; ctx.lineWidth = 2; ctx.strokeRect(boxX + 18, boxY + 198, boxW - 36, 140);

    ctx.fillStyle = '#00ff66'; ctx.font = '900 14px monospace';
    ctx.fillText('2. POWERUPS & BONUS', boxX + 30, boxY + 221);
    drawPickupInfoIcon(PICKUP_TYPES.AUTO_SAVE, boxX + 30, boxY + 236, 32);
    drawPickupInfoIcon(PICKUP_TYPES.PROXY_ON, boxX + 78, boxY + 236, 32);
    drawPickupInfoIcon(PICKUP_TYPES.CACHE_BOOST, boxX + 126, boxY + 236, 32);
    drawPickupInfoIcon(PICKUP_TYPES.GUARD, boxX + 174, boxY + 236, 32);
    drawPickupInfoIcon(PICKUP_TYPES.EXTRA_LIFE, boxX + 222, boxY + 236, 32);
    ctx.fillStyle = '#ffffff'; ctx.font = '13px sans-serif';
    ctx.fillText('Raccogli i moduli per ottenere Checkpoint, Punti 2X,', boxX + 30, boxY + 295);
    ctx.fillText('Sprint, Scudo protettivo e Vite extra!', boxX + 30, boxY + 317);

    ctx.fillStyle = '#101018'; ctx.fillRect(boxX + 18, boxY + 350, boxW - 36, 105);
    ctx.strokeStyle = '#ff0055'; ctx.lineWidth = 2; ctx.strokeRect(boxX + 18, boxY + 350, boxW - 36, 105);

    ctx.fillStyle = '#ff0055'; ctx.font = '900 14px monospace';
    ctx.fillText('3. MALUS TRAPPOLA', boxX + 30, boxY + 373);
    drawPickupInfoIcon(PICKUP_TYPES.DROP_FRAME, boxX + 30, boxY + 388, 32);
    drawPickupInfoIcon(PICKUP_TYPES.DISK_FULL, boxX + 78, boxY + 388, 32);
    ctx.fillStyle = '#ffffff'; ctx.font = '13px sans-serif';
    ctx.fillText('ATTENZIONE: Drop Frame ti rallenta,', boxX + 124, boxY + 398);
    ctx.fillText('Buffering inverte i comandi di guida!', boxX + 124, boxY + 420);

    ctx.fillStyle = '#ff0055';
    ctx.fillRect(boxX + 25, boxY + 530, boxW - 50, 56);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.strokeRect(boxX + 25, boxY + 530, boxW - 50, 56);
    ctx.fillStyle = '#ffffff'; ctx.font = '900 16px monospace'; ctx.textAlign = 'center';
    ctx.fillText('SCHEDA BONUS & MALUS ►', CANVAS_W / 2, boxY + 563);
    return;
  }

  if (gameState === 'POWERUPS_INFO') {
    let boxW = CANVAS_W - 28, boxH = 610;
    let boxX = (CANVAS_W - boxW) / 2, boxY = 30;

    drawCyberPanel(boxX, boxY, boxW, boxH, '#00ff66');

    ctx.fillStyle = '#00ff66';
    ctx.font = '900 22px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#00ff66';
    ctx.shadowBlur = 10;
    ctx.fillText('BONUS & MALUS DETTAGLIO', CANVAS_W / 2, boxY + 38);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#101018'; ctx.fillRect(boxX + 18, boxY + 60, boxW - 36, 440);
    ctx.strokeStyle = '#00ff6644'; ctx.strokeRect(boxX + 18, boxY + 60, boxW - 36, 440);

    const infoX = boxX + 28;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = '900 14px monospace';

    ctx.fillStyle = '#00ff66';
    ctx.fillText('POTENZIAMENTI BONUS', infoX, boxY + 84);
    drawPickupInfoRow(PICKUP_TYPES.AUTO_SAVE, infoX, boxY + 116, 'AUTO-SAVE · checkpoint: riparti da qui');
    drawPickupInfoRow(PICKUP_TYPES.PROXY_ON, infoX, boxY + 158, 'PROXY 2X · punti raddoppiati per 10s');
    drawPickupInfoRow(PICKUP_TYPES.CACHE_BOOST, infoX, boxY + 200, 'CACHE BOOST · +150 punti e sprint per 8s');
    drawPickupInfoRow(PICKUP_TYPES.GUARD, infoX, boxY + 242, 'RENDER SHIELD · protezione dai crash per 5s');
    drawPickupInfoRow(PICKUP_TYPES.EXTRA_LIFE, infoX, boxY + 284, 'UNDO LIFE · +1 vita, massimo 5');

    ctx.fillStyle = '#ff0055';
    ctx.font = '900 14px monospace';
    ctx.fillText('MALUS TRAPPOLA', infoX, boxY + 326);
    drawPickupInfoRow(PICKUP_TYPES.DROP_FRAME, infoX, boxY + 358, 'DROP FRAME · -100 punti e rallenta per 6s');
    drawPickupInfoRow(PICKUP_TYPES.DISK_FULL, infoX, boxY + 400, 'BUFFERING · -200 punti, comandi invertiti 5s');

    ctx.fillStyle = '#ffea00'; ctx.font = 'bold 13px monospace';
    ctx.fillText('Mantieni i riflessi pronti sulla timeline!', infoX, boxY + 452);

    ctx.fillStyle = '#00ff66';
    ctx.fillRect(boxX + 25, boxY + 530, boxW - 50, 56);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.strokeRect(boxX + 25, boxY + 530, boxW - 50, 56);
    ctx.fillStyle = '#000'; ctx.font = '900 16px monospace'; ctx.textAlign = 'center';
    ctx.fillText('SCEGLI VIDEOMAKER ►', CANVAS_W / 2, boxY + 563);
    return;
  }

  if (gameState === 'CHAR_SELECT') {
    let boxW = CANVAS_W - 28, boxH = 610;
    let boxX = (CANVAS_W - boxW) / 2, boxY = 30;

    let c = CHARACTERS[CHARACTER_LIST[selectedCharIndex]];

    drawCyberPanel(boxX, boxY, boxW, boxH, c.primary);

    ctx.fillStyle = c.primary;
    ctx.font = '900 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🎬 SELEZIONA VIDEOMAKER', CANVAS_W / 2, boxY + 38);

    let imgW = 180, imgH = 180;
    let imgX = (CANVAS_W - imgW) / 2, imgY = boxY + 60;

    ctx.fillStyle = '#181824';
    ctx.fillRect(boxX + 16, imgY + 60, 48, 60);
    ctx.strokeStyle = c.primary;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(boxX + 16, imgY + 60, 48, 60);
    ctx.fillStyle = c.primary;
    ctx.font = '900 26px monospace';
    ctx.fillText('◄', boxX + 40, imgY + 95);

    ctx.fillStyle = '#181824';
    ctx.fillRect(boxX + boxW - 64, imgY + 60, 48, 60);
    ctx.strokeStyle = c.primary;
    ctx.strokeRect(boxX + boxW - 64, imgY + 60, 48, 60);
    ctx.fillStyle = c.primary;
    ctx.fillText('►', boxX + boxW - 40, imgY + 95);

    ctx.fillStyle = '#0a0a10';
    ctx.fillRect(imgX, imgY, imgW, imgH);

    if (c.img && c.img.complete && c.img.naturalWidth > 0) {
      ctx.drawImage(c.img, imgX, imgY, imgW, imgH);
    } else {
      ctx.fillStyle = c.primary;
      ctx.font = '900 64px monospace';
      ctx.fillText(c.name[0], CANVAS_W / 2, imgY + 110);
    }

    ctx.strokeStyle = c.primary;
    ctx.lineWidth = 2;
    ctx.strokeRect(imgX, imgY, imgW, imgH);

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(imgX + 6, imgY + 6, 68, 18);
    ctx.fillStyle = '#00ff66';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('● REC 4K', imgX + 40, imgY + 18);

    ctx.fillStyle = c.primary;
    ctx.font = '900 24px -apple-system, sans-serif';
    ctx.fillText(c.name, CANVAS_W / 2, boxY + 270);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(c.subtitle, CANVAS_W / 2, boxY + 295);

    ctx.fillStyle = '#0a0a10';
    ctx.fillRect(boxX + 20, boxY + 315, boxW - 40, 100);
    ctx.strokeStyle = '#2a2a38';
    ctx.strokeRect(boxX + 20, boxY + 315, boxW - 40, 100);

    ctx.fillStyle = '#ffea00';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(c.perkBonus, CANVAS_W / 2, boxY + 350);

    ctx.fillStyle = '#ff0055';
    ctx.fillText(c.perkMalus, CANVAS_W / 2, boxY + 385);

    let dotSpacing = 18;
    let startX = CANVAS_W / 2 - ((CHARACTER_LIST.length - 1) * dotSpacing) / 2;
    for (let i = 0; i < CHARACTER_LIST.length; i++) {
      ctx.beginPath();
      ctx.arc(startX + i * dotSpacing, boxY + 438, 5, 0, Math.PI * 2);
      ctx.fillStyle = (i === selectedCharIndex) ? c.primary : '#333344';
      ctx.fill();
    }

    ctx.fillStyle = c.primary;
    ctx.fillRect(boxX + 25, boxY + 530, boxW - 50, 56);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX + 25, boxY + 530, boxW - 50, 56);
    ctx.fillStyle = '#000000';
    ctx.font = '900 16px monospace';
    ctx.fillText(`GIOCA CON ${c.name} ►`, CANVAS_W / 2, boxY + 563);
    return;
  }

  /* POP-UP SPIEGAZIONE PRIMA ONDATA A V15 */
  if (gameState === 'PANIC_POPUP') {
    drawGameWorld();
    drawHUD();

    let boxW = CANVAS_W - 28, boxH = 360;
    let boxX = (CANVAS_W - boxW) / 2, boxY = (CANVAS_H - boxH) / 2 - 20;

    drawCyberPanel(boxX, boxY, boxW, boxH, '#ff0055');

    ctx.fillStyle = '#ff0055';
    ctx.font = '900 20px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 10;
    ctx.fillText('⚠️ TRACCIA V15: PANICO! ⚠️', CANVAS_W / 2, boxY + 40);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('LA TIMELINE ENTRA IN OVERHEAT!', CANVAS_W / 2, boxY + 74);

    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(boxX + 20, boxY + 98, boxW - 40, 160);
    ctx.strokeStyle = '#ffea00';
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX + 20, boxY + 98, boxW - 40, 160);

    ctx.fillStyle = '#ffea00';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('ONDATE DI CANCELLAZIONE TEMPORIZZATE:', CANVAS_W / 2, boxY + 124);

    ctx.fillStyle = '#ffffff';
    ctx.font = '13px sans-serif';
    ctx.fillText('1. La prima ondata durerà 20 SECONDI.', CANVAS_W / 2, boxY + 152);
    ctx.fillText('2. La sequenza si CANCELLA VELOCE!', CANVAS_W / 2, boxY + 176);
    ctx.fillText('3. I blocchi aumentano follia ogni ondata.', CANVAS_W / 2, boxY + 200);

    ctx.fillStyle = '#00ff66';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('RESISTI FINO ALLA FINE DELL\'ONDATA!', CANVAS_W / 2, boxY + 232);

    ctx.fillStyle = '#ff0055';
    ctx.fillRect(boxX + 25, boxY + 280, boxW - 50, 54);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX + 25, boxY + 280, boxW - 50, 54);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 16px monospace';
    ctx.fillText('INIZIA PRIMA ONDATA ►', CANVAS_W / 2, boxY + 312);
    return;
  }

  if (gameState === 'PAUSE') {
    let boxW = CANVAS_W - 40, boxH = 240;
    let boxX = (CANVAS_W - boxW) / 2, boxY = (CANVAS_H - boxH) / 2;

    drawCyberPanel(boxX, boxY, boxW, boxH, '#ffea00');

    ctx.fillStyle = '#ffea00';
    ctx.font = '900 28px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⏸️ IN PAUSA', CANVAS_W / 2, boxY + 80);

    ctx.fillStyle = '#00f3ff';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('TIMELINE SOSPESA', CANVAS_W / 2, boxY + 125);

    ctx.fillStyle = '#ffffff';
    ctx.font = '13px monospace';
    ctx.fillText('TOCCA PER RIPRENDERE IL MONTAGGIO', CANVAS_W / 2, boxY + 170);
    return;
  }

  if (gameState === 'gameover') {
    let boxW = CANVAS_W - 28, boxH = 410;
    let boxX = (CANVAS_W - boxW) / 2, boxY = (CANVAS_H - boxH) / 2;

    drawCyberPanel(boxX, boxY, boxW, boxH, '#ff0055');

    ctx.fillStyle = '#ff0055';
    ctx.font = '900 26px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 10;
    ctx.fillText('DEADLINE MISSED! 💀', CANVAS_W / 2, boxY + 65);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.font = '15px monospace';
    ctx.fillText('CRASH DEL SISTEMA DI EXPORT', CANVAS_W / 2, boxY + 105);

    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(boxX + 25, boxY + 135, boxW - 50, 140);
    ctx.strokeStyle = '#ffea00';
    ctx.strokeRect(boxX + 25, boxY + 135, boxW - 50, 140);

    ctx.fillStyle = '#ffea00';
    ctx.font = '900 22px monospace';
    ctx.fillText(`PUNTEGGIO: ${score}`, CANVAS_W / 2, boxY + 185);

    ctx.fillStyle = '#00f3ff';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`TRACCIA MASSIMA: V${maxReachedLevel} | REC: ${highScore}`, CANVAS_W / 2, boxY + 230);

  }
}

canvas.addEventListener('pointerdown', e => {
  getAC();
  let rect = canvas.getBoundingClientRect();
  let x = (e.clientX - rect.left) * (CANVAS_W / rect.width);
  let y = (e.clientY - rect.top) * (CANVAS_H / rect.height);

  if (['COVER', 'STORY', 'RULES', 'POWERUPS_INFO'].includes(gameState)) {
    advanceMenuState();
    return;
  }

  if (gameState === 'PANIC_POPUP') {
    const boxW = CANVAS_W - 28, boxH = 360;
    const boxX = (CANVAS_W - boxW) / 2;
    const boxY = (CANVAS_H - boxH) / 2 - 20;
    const buttonX = boxX + 25;
    const buttonY = boxY + 280;
    if (x >= buttonX && x <= buttonX + boxW - 50 && y >= buttonY && y <= buttonY + 54) {
      gameState = 'playing';
      startPanicWave();
    }
    return;
  }

  if (gameState === 'CHAR_SELECT') {
    let boxW = CANVAS_W - 28;
    let boxX = (CANVAS_W - boxW) / 2;
    let imgY = 90;

    if (x >= boxX + 16 && x <= boxX + 64 && y >= imgY + 60 && y <= imgY + 120) {
      selectedCharIndex = (selectedCharIndex - 1 + CHARACTER_LIST.length) % CHARACTER_LIST.length;
      playSound('cross');
      return;
    }
    if (x >= boxX + boxW - 64 && x <= boxX + boxW - 16 && y >= imgY + 60 && y <= imgY + 120) {
      selectedCharIndex = (selectedCharIndex + 1) % CHARACTER_LIST.length;
      playSound('cross');
      return;
    }
    if (y >= 520) {
      startGame();
      return;
    }
    return;
  }

  if (gameState === 'playing') {
    if (y < HUD_HEIGHT) {
      gameState = 'PAUSE';
    }
    return;
  }

  if (gameState === 'PAUSE') {
    gameState = 'playing';
    return;
  }

  if (gameState === 'gameover') {
    gameState = 'CHAR_SELECT';
  }
});

function bindDirBtn(id, dirKey) {
  let el = document.getElementById(id);
  if (!el) return;

  let activePointerId = null;

  const press = (e) => {
    if (e.cancelable) e.preventDefault();
    getAC();

    if (['COVER', 'STORY', 'RULES', 'POWERUPS_INFO'].includes(gameState)) {
      advanceMenuState();
      return;
    }

    if (gameState === 'PANIC_POPUP') {
      return;
    }

    if (gameState === 'CHAR_SELECT') {
      if (dirKey === 'left') {
        selectedCharIndex = (selectedCharIndex - 1 + CHARACTER_LIST.length) % CHARACTER_LIST.length;
        playSound('cross');
      } else if (dirKey === 'right') {
        selectedCharIndex = (selectedCharIndex + 1) % CHARACTER_LIST.length;
        playSound('cross');
      } else {
        startGame();
      }
      return;
    }

    if (gameState === 'gameover') {
      gameState = 'CHAR_SELECT';
      return;
    }

    activePointerId = e.pointerId;
    if (el.setPointerCapture) {
      try { el.setPointerCapture(e.pointerId); } catch (error) {}
    }
    moveState[dirKey] = true;
    el.classList.add('is-pressed');
  };

  const release = (e) => {
    if (e.cancelable) e.preventDefault();
    if (activePointerId !== null && e.pointerId !== undefined && e.pointerId !== activePointerId) return;
    moveState[dirKey] = false;
    activePointerId = null;
    el.classList.remove('is-pressed');
  };

  el.addEventListener('pointerdown', press);
  el.addEventListener('pointerup', release);
  el.addEventListener('pointercancel', release);
  el.addEventListener('lostpointercapture', release);
}

bindDirBtn('btnUp', 'up');
bindDirBtn('btnDown', 'down');
bindDirBtn('btnLeft', 'left');
bindDirBtn('btnRight', 'right');

const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  getAC();

  if (['COVER', 'STORY', 'RULES', 'POWERUPS_INFO'].includes(gameState)) {
    if (e.code === 'Space' || e.code === 'Enter') advanceMenuState();
  } else if (gameState === 'PANIC_POPUP') {
    return;
  } else if (gameState === 'CHAR_SELECT') {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      selectedCharIndex = (selectedCharIndex - 1 + CHARACTER_LIST.length) % CHARACTER_LIST.length;
      playSound('cross');
    }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      selectedCharIndex = (selectedCharIndex + 1) % CHARACTER_LIST.length;
      playSound('cross');
    }
    if (e.code === 'Space' || e.code === 'Enter') startGame();
  } else if (gameState === 'gameover' && (e.code === 'Space' || e.code === 'Enter')) {
    gameState = 'CHAR_SELECT';
  } else if ((e.code === 'KeyP' || e.code === 'Escape') && (gameState === 'playing' || gameState === 'PAUSE')) {
    gameState = gameState === 'playing' ? 'PAUSE' : 'playing';
  }
});

window.addEventListener('keyup', e => {
  keys[e.code] = false;
});

function keyPressed(code) {
  return !!keys[code];
}

async function saveScore() {
  if (scoreSavedForCurrentGame) return;
  scoreSavedForCurrentGame = true;

  try {
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('deadlineDrive_highScore', highScore.toString());
    }

    if (score <= 0) return;
    let rawUser = localStorage.getItem('arcade_current_user');
    if (!rawUser) return;

    const curUser = JSON.parse(rawUser);
    await ArcadeScoreManager.saveGameScore({
      client: supabaseClient,
      currentUser: curUser,
      gameKey: 'deadlineDrive',
      score
    });
  } catch (e) {
    console.warn("Errore durante il salvataggio score:", e);
  }
}

async function exitGame() {
  try {
    await saveScore();
  } catch (e) {
    console.warn("Errore durante il salvataggio score:", e);
  } finally {
    ArcadeGameShell.navigateToHub();
  }
}

function update() {
  frame++;
  if (gameState === 'playing') {
    if (saveBanner) {
      saveBanner.elapsed++;
      if (--saveBanner.timer <= 0) saveBanner = null;
    }
    updateVehicles();
    updatePlayer();
  }
}

function draw() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  if (gameState === 'playing') {
    drawGameWorld();
    drawHUD();
  } else {
    drawScreens();
  }
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
