const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const W = 480;
const H = 640;
canvas.width = W;
canvas.height = H;

let joySensitivity = parseFloat(localStorage.getItem('invaders_joySens')) || 1.0;

const settingsModal = document.getElementById('settingsModal');
const btnOpenSettings = document.getElementById('btnOpenSettings');
const btnCloseSettings = document.getElementById('btnCloseSettings');
const btnExitTop = document.getElementById('btnExitTop');
const btnMenuTop = document.getElementById('btnMenuTop');
const sensSlider = document.getElementById('sensSlider');
const sensValText = document.getElementById('sensValText');
const btnToggleMusic = document.getElementById('btnToggleMusic');
const btnToggleSfx = document.getElementById('btnToggleSfx');

const btnOpenRules = document.getElementById('btnOpenRules');
const btnCloseRules = document.getElementById('btnCloseRules');
const rulesModal = document.getElementById('rulesModal');

const btnOpenPerks = document.getElementById('btnOpenPerks');
const btnClosePerks = document.getElementById('btnClosePerks');
const perksModal = document.getElementById('perksModal');

sensSlider.value = joySensitivity;
sensValText.innerText = joySensitivity.toFixed(2) + 'x';

const renderOptionButtons = ArcadeGameShell.bindAudioOptions(
  btnToggleMusic,
  btnToggleSfx
);

sensSlider.oninput = () => {
  joySensitivity = parseFloat(sensSlider.value);
  sensValText.innerText = joySensitivity.toFixed(2) + 'x';
  localStorage.setItem('invaders_joySens', joySensitivity);
};

btnOpenSettings.onclick = () => {
  if (state === 'playing') {
    state = 'PAUSE';
  }
  renderOptionButtons();
  ArcadeGameShell.showModal(settingsModal);
};

btnCloseSettings.onclick = () => {
  ArcadeGameShell.hideModal(settingsModal);
  getAC();
  if (state === 'PAUSE') {
    state = 'playing';
  }
};

ArcadeGameShell.bindModalTransition(btnOpenRules, settingsModal, rulesModal);
ArcadeGameShell.bindModalTransition(btnCloseRules, rulesModal, settingsModal);
ArcadeGameShell.bindModalTransition(btnOpenPerks, settingsModal, perksModal);
ArcadeGameShell.bindModalTransition(btnClosePerks, perksModal, settingsModal);

btnMenuTop.onclick = () => {
  getAC();
  activeBoss = null;
  enemies = [];
  playerBullets = [];
  enemyBullets = [];
  drops = [];
  state = 'COVER';
};

btnExitTop.onclick = async () => {
  getAC();
  await exitGame(score);
};

// --- PRE-CARICAMENTO ASSETS PNG ---
const ASSETS = {
  COFFEE: new Image(), BOOST: new Image(), SHIELD: new Image(), LAG: new Image(), JAM: new Image(),
  "BRIEF CONFUSO": new Image(), "FEEDBACK EXTRA": new Image(), "LOGO PIÙ GRANDE": new Image(),
  "SCADENZA IERI": new Image(), "RENDER CRASH": new Image(), "FATTURA SCADUTA": new Image(),
  "CALL ALLE 18": new Image(), "BUDGET ZERO": new Image(), "MICRO-MANAGEMENT": new Image(),
  "PROMPT ERRORE": new Image(), "METEO AVVERSO": new Image(), "OVERTIME NOTTURNO": new Image(),
  "NOTIFICA SLACK": new Image(), "FINAL_V2_DEF.PDF": new Image(), "PREVENTIVO BASSISSIMO": new Image(),
  BOSS_1: new Image(), BOSS_2: new Image(), BOSS_3: new Image(), BOSS_4: new Image(), BOSS_5: new Image()
};

ASSETS.COFFEE.src = 'assets/invaders/caffe.png';
ASSETS.BOOST.src = 'assets/invaders/boost.png';
ASSETS.SHIELD.src = 'assets/invaders/scudo.png';
ASSETS.LAG.src = 'assets/invaders/lag.png';
ASSETS.JAM.src = 'assets/invaders/jam.png';

ASSETS["BRIEF CONFUSO"].src = 'assets/invaders/brief.png';
ASSETS["FEEDBACK EXTRA"].src = 'assets/invaders/feedback.png';
ASSETS["LOGO PIÙ GRANDE"].src = 'assets/invaders/logo.png';
ASSETS["SCADENZA IERI"].src = 'assets/invaders/scadenza.png';
ASSETS["RENDER CRASH"].src = 'assets/invaders/render.png';
ASSETS["FATTURA SCADUTA"].src = 'assets/invaders/fattura.png';
ASSETS["CALL ALLE 18"].src = 'assets/invaders/call.png';
ASSETS["BUDGET ZERO"].src = 'assets/invaders/budget.png';
ASSETS["MICRO-MANAGEMENT"].src = 'assets/invaders/micromanagement.png';

ASSETS["PROMPT ERRORE"].src = 'assets/invaders/prompt.png';
ASSETS["METEO AVVERSO"].src = 'assets/invaders/meteo.png';
ASSETS["OVERTIME NOTTURNO"].src = 'assets/invaders/overnight.png';
ASSETS["NOTIFICA SLACK"].src = 'assets/invaders/notifiche.png';
ASSETS["FINAL_V2_DEF.PDF"].src = 'assets/invaders/pdf.png';
ASSETS["PREVENTIVO BASSISSIMO"].src = 'assets/invaders/preventivo.png';

ASSETS.BOSS_1.src = 'assets/invaders/boss1.png';
ASSETS.BOSS_2.src = 'assets/invaders/boss2.png';
ASSETS.BOSS_3.src = 'assets/invaders/boss3.png';
ASSETS.BOSS_4.src = 'assets/invaders/boss4.png';
ASSETS.BOSS_5.src = 'assets/invaders/boss5.png';

const imgCover = new Image(); imgCover.src = 'assets/invaders/copertina.png';

const imgTommi = new Image(); imgTommi.src = 'assets/invaders/tommi.png';
const imgGiampa = new Image(); imgGiampa.src = 'assets/invaders/giampa.png';
const imgBretto = new Image(); imgBretto.src = 'assets/invaders/bretto.png';

const astTommi = new Image(); astTommi.src = 'assets/invaders/tommi-ast.png';
const astGiampa = new Image(); astGiampa.src = 'assets/invaders/giampa-ast.png';
const astBretto = new Image(); astBretto.src = 'assets/invaders/bretto-ast.png';

function drawCrispText(text, x, y, font, color, align = 'center', strokeColor = '#000000', strokeWidth = 3) {
  ctx.save();
  ctx.font = font; ctx.textAlign = align; ctx.textBaseline = 'middle';
  let rx = Math.round(x), ry = Math.round(y);
  if (strokeColor) { ctx.strokeStyle = strokeColor; ctx.lineWidth = strokeWidth; ctx.strokeText(text, rx, ry); }
  ctx.fillStyle = color; ctx.fillText(text, rx, ry);
  ctx.restore();
}

// --- PERSONAGGI E PERK ---
const CHARACTERS = {
  TOMMI: {
    id: 'TOMMI',
    name: "TOMMI",
    role: "Coordinatore Video & Set",
    perkBonus: "BONUS: Doppia Cam 4K (Doppio Laser)",
    perkMalus: "MALUS: Movimento iperattivo",
    primary: "#ff0055",
    portrait: imgTommi,
    astImg: astTommi,
    speed: 6.8,
    cooldown: 7,
    bulletWidth: 6,
    multiShot: false
  },
  GIAMPA: {
    id: 'GIAMPA',
    name: "GIAMPA",
    role: "Coordinatore Grafica",
    perkBonus: "BONUS: Canvas Vettoriale (Mega Laser 28px)",
    perkMalus: "MALUS: Movimento più pesante",
    primary: "#ffd700",
    portrait: imgGiampa,
    astImg: astGiampa,
    speed: 4.8,
    cooldown: 10,
    bulletWidth: 28,
    multiShot: false
  },
  BRETTO: {
    id: 'BRETTO',
    name: "BRETTO",
    role: "Regista degli Eventi",
    perkBonus: "BONUS: Regia Multi-Cam (Triplo Sparo)",
    perkMalus: "MALUS: Ricarica più lenta",
    primary: "#ff33aa",
    portrait: imgBretto,
    astImg: astBretto,
    speed: 5.4,
    cooldown: 16,
    bulletWidth: 6,
    multiShot: true
  }
};

const charList = ['TOMMI', 'GIAMPA', 'BRETTO'];
let charSelectIndex = 0;
let currentBoss = CHARACTERS.TOMMI;
let scoreSavedForCurrentGame = false;

async function saveScore(finalScore) {
  if (scoreSavedForCurrentGame) return;
  scoreSavedForCurrentGame = true;

  if (finalScore > hiScore) {
    hiScore = finalScore;
    localStorage.setItem('invaders_highScore', hiScore.toString());
  }
  if (finalScore <= 0) return;

  let rawUser = localStorage.getItem('arcade_current_user');
  if (!rawUser) return;

  const curUser = JSON.parse(rawUser);
  await ArcadeScoreManager.saveGameScore({
    client: supabaseClient,
    currentUser: curUser,
    gameKey: 'feedbackInvaders',
    score: finalScore
  });
}

async function exitGame(finalScore) {
  try {
    await saveScore(finalScore);
  } catch (e) {
    console.warn("Errore durante il salvataggio score:", e);
  } finally {
    ArcadeGameShell.navigateToHub();
  }
}

let state = 'COVER';
let score = 0;
let hiScore = parseInt(localStorage.getItem('invaders_highScore')) || 0;
let lives = 3;
let wave = 1;
let currentTier = 1;
let frame = 0;
let deathTimer = 0;

let bossWarningTimer = 0;
let upcomingBossName = "";
let upcomingBossWave = 0;

let joyDX = 0, joyDY = 0, joyActive = false;
let touchFire = false;
let shakeTime = 0, shakeMag = 0;

function triggerShake(time = 12, mag = 6) { shakeTime = time; shakeMag = mag; }

let audioCtx = null;
function getAC() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// --- EFFETTI SONORI (COLLEGATI AD AUDIOMANAGER) ---
const isSfxAllowed = ArcadeGameShell.isSfxAllowed;

function sfxShoot() {
  if (!isSfxAllowed()) return;
  const ac = getAC(), t = ac.currentTime;
  const osc = ac.createOscillator(), gain = ac.createGain();
  osc.connect(gain); gain.connect(ac.destination);
  osc.type = 'square';
  osc.frequency.setValueAtTime(850, t);
  osc.frequency.exponentialRampToValueAtTime(350, t + 0.07);
  gain.gain.setValueAtTime(0.28, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
  osc.start(t); osc.stop(t + 0.07);
}

function sfxPowerUp() {
  if (!isSfxAllowed()) return;
  const ac = getAC(), t = ac.currentTime;
  const osc = ac.createOscillator(), gain = ac.createGain();
  osc.connect(gain); gain.connect(ac.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(523, t);
  osc.frequency.setValueAtTime(659, t + 0.08);
  osc.frequency.setValueAtTime(783, t + 0.16);
  gain.gain.setValueAtTime(0.45, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
  osc.start(t); osc.stop(t + 0.24);
}

function sfxDebuff() {
  if (!isSfxAllowed()) return;
  const ac = getAC(), t = ac.currentTime;
  const osc = ac.createOscillator(), gain = ac.createGain();
  osc.connect(gain); gain.connect(ac.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.linearRampToValueAtTime(80, t + 0.2);
  gain.gain.setValueAtTime(0.45, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  osc.start(t); osc.stop(t + 0.2);
}

function sfxEnemyHit() {
  if (!isSfxAllowed()) return;
  const ac = getAC(), t = ac.currentTime, dur = 0.06;
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource(); src.buffer = buf;
  const filt = ac.createBiquadFilter(); filt.type = 'bandpass'; filt.frequency.value = 1200;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.35, t); gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(filt); filt.connect(gain); gain.connect(ac.destination);
  src.start(t);
}

function sfxEnemyExplode() {
  if (!isSfxAllowed()) return;
  const ac = getAC(), t = ac.currentTime, dur = 0.35;
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource(); src.buffer = buf;
  const filt = ac.createBiquadFilter(); filt.type = 'lowpass';
  filt.frequency.setValueAtTime(900, t); filt.frequency.exponentialRampToValueAtTime(70, t + dur);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.55, t); gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(filt); filt.connect(gain); gain.connect(ac.destination);
  src.start(t);
}

function sfxPlayerHit() {
  if (!isSfxAllowed()) return;
  const ac = getAC(), t = ac.currentTime;
  const osc = ac.createOscillator(), og = ac.createGain();
  osc.connect(og); og.connect(ac.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(380, t); osc.frequency.exponentialRampToValueAtTime(50, t + 0.4);
  og.gain.setValueAtTime(0.5, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  osc.start(t); osc.stop(t + 0.4);
  triggerShake(16, 10);
}

let lastMenuAdvanceTime = 0;
function advanceMenuState() {
  const now = Date.now();
  if (now - lastMenuAdvanceTime < 250) return;
  lastMenuAdvanceTime = now;

  getAC();
  if (state === 'COVER') {
    state = 'STORY';
  } else if (state === 'STORY') {
    state = 'RULES';
  } else if (state === 'RULES') {
    state = 'POWERUPS_INFO';
  } else if (state === 'POWERUPS_INFO') {
    state = 'CHAR_SELECT';
  } else if (state === 'CHAR_SELECT') {
    selectBoss(charList[charSelectIndex]);
  } else if (state === 'ERA_INTRO') {
    state = 'playing';
  } else if (state === 'gameover') {
    state = 'CHAR_SELECT';
  }
}

const keys = {};
document.addEventListener('keydown', e => {
  keys[e.code] = true;
  getAC();
  if (['COVER', 'STORY', 'RULES', 'POWERUPS_INFO'].includes(state)) {
    if (e.code === 'Space' || e.code === 'Enter') advanceMenuState();
  }
  else if (state === 'CHAR_SELECT') {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') charSelectIndex = (charSelectIndex - 1 + 3) % 3;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') charSelectIndex = (charSelectIndex + 1) % 3;
    if (e.code === 'Space' || e.code === 'Enter') advanceMenuState();
  }
  else if (state === 'ERA_INTRO' && (e.code === 'Space' || e.code === 'Enter')) {
    state = 'playing';
  }
  else if (state === 'gameover' && (e.code === 'Space' || e.code === 'Enter')) {
    state = 'CHAR_SELECT';
  }
  else if ((e.code === 'KeyP' || e.code === 'Escape') && (state === 'playing' || state === 'PAUSE')) {
    state = state === 'playing' ? 'PAUSE' : 'playing';
  }
});
document.addEventListener('keyup', e => { keys[e.code] = false; });
function keyPressed(code) { return !!keys[code]; }

const joyZone = document.getElementById('joyZone');
const joyKnob = document.getElementById('joyKnob');

function handleJoyMove(clientX, clientY) {
  const rect = joyZone.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  let dx = clientX - centerX;
  let dy = clientY - centerY;

  const dist = Math.hypot(dx, dy);
  const maxRadius = rect.width / 2 - 15;

  if (dist > maxRadius) {
    dx = (dx / dist) * maxRadius;
    dy = (dy / dist) * maxRadius;
  }

  joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

  joyDX = (dx / maxRadius) * joySensitivity;
  joyDY = (dy / maxRadius) * joySensitivity;
}

function resetJoy() {
  joyActive = false;
  joyDX = 0; joyDY = 0;
  joyKnob.style.transform = `translate(-50%, -50%)`;
}

joyZone.addEventListener('pointerdown', e => {
  joyActive = true;
  joyZone.setPointerCapture(e.pointerId);
  getAC();
  handleJoyMove(e.clientX, e.clientY);
});

joyZone.addEventListener('pointermove', e => {
  if (joyActive) handleJoyMove(e.clientX, e.clientY);
});

joyZone.addEventListener('pointerup', resetJoy);
joyZone.addEventListener('pointercancel', resetJoy);

function bindFireBtn(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const press = (e) => {
    if (e) e.preventDefault();
    getAC();
    if (['COVER', 'STORY', 'RULES', 'POWERUPS_INFO', 'CHAR_SELECT', 'ERA_INTRO'].includes(state)) {
      advanceMenuState();
      return;
    }
    touchFire = true;
  };
  const release = (e) => { if (e) e.preventDefault(); touchFire = false; };
  el.addEventListener('pointerdown', press);
  el.addEventListener('touchstart', press, { passive: false });
  el.addEventListener('pointerup', release);
  el.addEventListener('touchend', release);
}
bindFireBtn('btnFire');

function selectBoss(bossKey) {
  currentBoss = CHARACTERS[bossKey];
  startGame();
}

const stars = Array.from({ length: 80 }, () => ({
  x: Math.random() * W, y: Math.random() * H,
  speed: 0.3 + Math.random() * 1.2, size: Math.random() < 0.15 ? 2 : 1, bright: Math.random()
}));

function updateStars() {
  for (const s of stars) {
    s.y += s.speed;
    if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
  }
}
function drawStars() {
  for (const s of stars) {
    ctx.fillStyle = `rgba(200,220,255,${0.3 + 0.7 * s.bright})`;
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }
}

const player = {
  x: W / 2, y: H - 70,
  w: 56, h: 56,
  shootTimer: 0, invTimer: 0, alive: true,

  boostTimer: 0, shieldTimer: 0, lagTimer: 0, jamTimer: 0,

  reset() {
    this.x = W / 2; this.y = H - 70;
    this.invTimer = 120; this.alive = true; this.shootTimer = 0;
    this.boostTimer = 0; this.shieldTimer = 0; this.lagTimer = 0; this.jamTimer = 0;
  },

  update() {
    if (!this.alive) return;

    let spd = currentBoss.speed;
    if (this.lagTimer > 0) { spd *= 0.5; this.lagTimer--; }

    if (joyActive) {
      this.x += joyDX * spd;
      this.y += joyDY * spd;
    } else {
      if (keyPressed('ArrowLeft')  || keyPressed('KeyA')) this.x -= spd;
      if (keyPressed('ArrowRight') || keyPressed('KeyD')) this.x += spd;
      if (keyPressed('ArrowUp')    || keyPressed('KeyW')) this.y -= spd;
      if (keyPressed('ArrowDown')  || keyPressed('KeyS')) this.y += spd;
    }

    this.x = Math.max(this.w / 2, Math.min(W - this.w / 2, this.x));
    this.y = Math.max(this.h / 2, Math.min(H - this.h / 2, this.y));

    if (this.shootTimer > 0) this.shootTimer--;
    if (this.invTimer > 0)   this.invTimer--;

    if (this.boostTimer > 0)  this.boostTimer--;
    if (this.shieldTimer > 0) { this.shieldTimer--; this.invTimer = Math.max(this.invTimer, 2); }
    if (this.lagTimer > 0)    this.lagTimer--;
    if (this.jamTimer > 0)    this.jamTimer--;

    let wantsToShoot = keyPressed('Space') || keyPressed('KeyZ') || touchFire;
    if (this.jamTimer > 0) wantsToShoot = false;

    if (wantsToShoot && this.shootTimer === 0) {
      let bw = currentBoss.bulletWidth;
      let cd = this.boostTimer > 0 ? 5 : currentBoss.cooldown;

      if (this.boostTimer > 0) {
        playerBullets.push(new Bullet(this.x, this.y - 22, 0, -10, currentBoss.primary, bw, 16));
        playerBullets.push(new Bullet(this.x - 12, this.y - 14, -2, -9.5, currentBoss.primary, bw, 14));
        playerBullets.push(new Bullet(this.x + 12, this.y - 14, 2, -9.5, currentBoss.primary, bw, 14));
      } else if (currentBoss.id === 'TOMMI') {
        playerBullets.push(new Bullet(this.x - 10, this.y - 20, 0, -9.5, currentBoss.primary, bw, 14));
        playerBullets.push(new Bullet(this.x + 10, this.y - 20, 0, -9.5, currentBoss.primary, bw, 14));
      } else if (currentBoss.id === 'GIAMPA') {
        playerBullets.push(new Bullet(this.x, this.y - 24, 0, -9, currentBoss.primary, bw, 20));
      } else if (currentBoss.id === 'BRETTO') {
        playerBullets.push(new Bullet(this.x, this.y - 20, 0, -9, currentBoss.primary, bw, 14));
        playerBullets.push(new Bullet(this.x - 14, this.y - 12, -2.5, -8.5, currentBoss.primary, bw, 12));
        playerBullets.push(new Bullet(this.x + 14, this.y - 12, 2.5, -8.5, currentBoss.primary, bw, 12));
      }

      this.shootTimer = cd;
      sfxShoot();
    }
  },

  draw() {
    if (!this.alive) return;
    if (this.invTimer > 0 && this.shieldTimer === 0 && Math.floor(this.invTimer / 4) % 2 === 0) return;

    if (this.shieldTimer > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, 38, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 153, 255, 0.25)'; ctx.fill();
      ctx.strokeStyle = '#00ccff'; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    }

    if (this.jamTimer > 0 || this.lagTimer > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, 36, 0, Math.PI * 2);
      ctx.strokeStyle = this.jamTimer > 0 ? '#ff0055' : '#ff9900';
      ctx.lineWidth = 2; ctx.setLineDash([5, 5]); ctx.stroke();
      ctx.restore();
    }

    if (currentBoss.astImg && currentBoss.astImg.complete && currentBoss.astImg.naturalWidth !== 0) {
      ctx.drawImage(currentBoss.astImg, this.x - this.w/2, this.y - this.h/2, this.w, this.h);
    } else {
      ctx.fillStyle = currentBoss.primary;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - 26);
      ctx.lineTo(this.x + 24, this.y + 22);
      ctx.lineTo(this.x, this.y + 10);
      ctx.lineTo(this.x - 24, this.y + 22);
      ctx.closePath(); ctx.fill();
    }
  }
};

class Drop {
  constructor(x, y, type) {
    this.x = x; this.y = y; this.type = type;
    this.w = 40; this.h = 40; this.dead = false;
    this.speed = 1.8;
  }
  update() {
    this.y += this.speed;
    if (this.y > H + 40) this.dead = true;
  }
  draw() {
    ctx.save();
    let col = '#ff0055';

    if (this.type === 'COFFEE') col = '#ffcc00';
    else if (this.type === 'BOOST') col = '#ff0055';
    else if (this.type === 'SHIELD') col = '#00ccff';
    else if (this.type === 'LAG') col = '#ff9900';
    else if (this.type === 'JAM') col = '#ff0055';

    ctx.fillStyle = '#101228';
    ctx.beginPath();
    ctx.roundRect(this.x - 20, this.y - 20, 40, 40, 10);
    ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke();

    const dropImg = ASSETS[this.type];
    if (dropImg && dropImg.complete && dropImg.naturalWidth !== 0) {
      ctx.drawImage(dropImg, this.x - 15, this.y - 15, 30, 30);
    } else {
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      ctx.fillText(this.type.substring(0, 3), Math.round(this.x), Math.round(this.y + 1));
    }
    ctx.restore();
  }
}

let drops = [];

function spawnDrop(x, y) {
  let rand = Math.random();
  let type = 'BOOST';
  if (rand < 0.28) type = 'COFFEE';
  else if (rand < 0.52) type = 'BOOST';
  else if (rand < 0.75) type = 'SHIELD';
  else if (rand < 0.88) type = 'LAG';
  else type = 'JAM';

  drops.push(new Drop(x, y, type));
}

class Bullet {
  constructor(x, y, vx, vy, color, w, h) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.color = color; this.w = w; this.h = h; this.dead = false;
  }
  update() {
    this.x += this.vx; this.y += this.vy;
    if (this.x < -10 || this.x > W + 10 || this.y < -20 || this.y > H + 20) this.dead = true;
  }
  draw() {
    ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 6;
    ctx.fillRect(this.x - this.w / 2, this.y - this.h / 2, this.w, this.h);
    ctx.shadowBlur = 0;
  }
}

let playerBullets = [], enemyBullets = [], particles = [];

function spawnExplosion(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2, speed = 0.5 + Math.random() * 3.5;
    particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      life: 25 + Math.random() * 25, maxLife: 50, color, size: 1.5 + Math.random() * 3.5 });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.life--;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

class Enemy {
  constructor(x, y, type) {
    this.x = x; this.y = y; this.type = type; this.dead = false;
    this.shootTimer = Math.floor(Math.random() * 60);
    this.t = 0;

    this.tier = wave <= 10 ? 1 : wave <= 20 ? 2 : wave <= 30 ? 3 : wave <= 40 ? 4 : 5;

    switch (type) {
      case 'grunt':
        this.hp = 1 + Math.floor(this.tier / 3); this.maxHp = this.hp; this.w = 38; this.h = 38; this.points = 100 * this.tier;
        this.canShoot = false;
        break;
      case 'shooter':
        this.hp = 2 + (this.tier > 1 ? Math.floor(this.tier / 2) : 0); this.maxHp = this.hp; this.w = 42; this.h = 42; this.points = 200 * this.tier;
        this.canShoot = true;
        break;
      case 'tank':
        this.hp = 4 + (this.tier * 2); this.maxHp = this.hp; this.w = 50; this.h = 50; this.points = 500 * this.tier;
        this.canShoot = true;
        break;
    }

    this.setupTheme();
  }

  setupTheme() {
    if (this.tier === 1) {
      if (this.type === 'grunt')        { this.name = "BRIEF CONFUSO"; this.color = "#ff0055"; }
      else if (this.type === 'shooter'){ this.name = "FEEDBACK EXTRA"; this.color = "#ffaa00"; }
      else if (this.type === 'tank')   { this.name = "LOGO PIÙ GRANDE"; this.color = "#aa00ff"; }
    } else if (this.tier === 2) {
      if (this.type === 'grunt')        { this.name = "SCADENZA IERI"; this.color = "#00ffcc"; }
      else if (this.type === 'shooter'){ this.name = "RENDER CRASH"; this.color = "#ff3300"; }
      else if (this.type === 'tank')   { this.name = "FATTURA SCADUTA"; this.color = "#e60000"; }
    } else if (this.tier === 3) {
      if (this.type === 'grunt')        { this.name = "CALL ALLE 18"; this.color = "#ffff00"; }
      else if (this.type === 'shooter'){ this.name = "BUDGET ZERO"; this.color = "#ff00aa"; }
      else if (this.type === 'tank')   { this.name = "MICRO-MANAGEMENT"; this.color = "#00ff00"; }
    } else if (this.tier === 4) {
      if (this.type === 'grunt')        { this.name = "PROMPT ERRORE"; this.color = "#00ff66"; }
      else if (this.type === 'shooter'){ this.name = "METEO AVVERSO"; this.color = "#ffea00"; }
      else if (this.type === 'tank')   { this.name = "OVERTIME NOTTURNO"; this.color = "#9900ff"; }
    } else {
      if (this.type === 'grunt')        { this.name = "NOTIFICA SLACK"; this.color = "#ff0055"; }
      else if (this.type === 'shooter'){ this.name = "FINAL_V2_DEF.PDF"; this.color = "#e60055"; }
      else if (this.type === 'tank')   { this.name = "PREVENTIVO BASSISSIMO"; this.color = "#ff6600"; }
    }
  }

  update() {
    this.t++;
    const speed = 0.8 + wave * 0.04;
    if (this.type === 'grunt')        { this.y += speed;       this.x += Math.sin(this.t * 0.04) * 1.5; }
    else if (this.type === 'shooter') { this.y += speed * 0.6;  this.x += Math.sin(this.t * 0.03 + this.x) * 1.8; }
    else if (this.type === 'tank')    { this.y += speed * 0.4;  this.x += Math.cos(this.t * 0.02) * 1.2; }

    this.x = Math.max(this.w / 2, Math.min(W - this.w / 2, this.x));
    if (this.y > H + 50) this.dead = true;

    if (this.canShoot) {
      this.shootTimer--;
      if (this.shootTimer <= 0) {
        this.shootTimer = Math.max(45, 120 - wave * 1.5);
        const dx = player.x - this.x, dy = player.y - this.y;
        const dist = Math.hypot(dx, dy) || 1, spd = 2.5 + wave * 0.05;
        enemyBullets.push(new Bullet(this.x, this.y + this.h / 2, (dx/dist)*spd, (dy/dist)*spd, this.color, 6, 6));
      }
    }
  }

  hit() {
    this.hp--;
    spawnExplosion(this.x, this.y, '#ffff00', 5);
    if (this.hp <= 0) {
      this.dead = true; score += this.points;
      spawnExplosion(this.x, this.y, this.color, 18);
      sfxEnemyExplode();
      if (Math.random() < 0.15) spawnDrop(this.x, this.y);
    } else { sfxEnemyHit(); }
  }

  draw() {
    const x = this.x, y = this.y;
    ctx.save();

    const enemyImg = ASSETS[this.name];
    if (enemyImg && enemyImg.complete && enemyImg.naturalWidth !== 0) {
      ctx.drawImage(enemyImg, x - this.w / 2, y - this.h / 2, this.w, this.h);
    } else {
      ctx.fillStyle = '#101228';
      ctx.beginPath(); ctx.roundRect(x - this.w/2, y - this.h/2, this.w, this.h, 8); ctx.fill();
      ctx.strokeStyle = this.color; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 10px Courier New'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(this.name.substring(0, 4), x, y);
    }

    if (this.type === 'tank') {
      ctx.fillStyle = '#111'; ctx.fillRect(x - 18, y - this.h/2 - 4, 36, 4);
      ctx.fillStyle = this.color; ctx.fillRect(x - 18, y - this.h/2 - 4, 36 * (this.hp/this.maxHp), 4);
    }

    ctx.restore();
  }
}

class Boss {
  constructor(waveNum) {
    this.w = 110;
    this.h = 110;
    this.x = W / 2;
    this.y = -120;
    this.targetY = 150;

    this.maxHp = 45 + waveNum * 4;
    this.hp = this.maxHp;
    this.damageSinceLastDrop = 0;
    this.dropThreshold = Math.max(10, Math.floor(this.maxHp / 4));
    this.dead = false;
    this.timer = 0;
    this.attackCooldown = 50;

    this.bossIndex = ((Math.floor(waveNum / 10) - 1) % 5) + 1;

    if (this.bossIndex === 1) {
      this.name = "LOOP REVISIONI INFINITE";
      this.color = "#25D366";
    } else if (this.bossIndex === 2) {
      this.name = "IL CLIENTE IMPOSSIBILE";
      this.color = "#ff0055";
    } else if (this.bossIndex === 3) {
      this.name = "LE TASSE & F24 KILLER";
      this.color = "#00ffcc";
    } else if (this.bossIndex === 4) {
      this.name = "CALL MARATONA DELLE 18:00";
      this.color = "#ffaa00";
    } else {
      this.name = "SERVER CRASH 500";
      this.color = "#e60000";
    }
  }

  update() {
    this.timer++;
    if (this.y < this.targetY) { this.y += 2; return; }

    this.x += Math.sin(this.timer * 0.03) * 2.8;

    if (--this.attackCooldown <= 0) {
      if (this.bossIndex === 1) {
        this.attackCooldown = Math.max(50, 80 - wave * 0.8);
        const count = 8;
        const offset = (this.timer * 0.15);
        for (let i = 0; i < count; i++) {
          let angle = (Math.PI * 2 / count) * i + offset;
          enemyBullets.push(new Bullet(this.x, this.y + 20, Math.cos(angle) * 2.8, Math.sin(angle) * 2.8, this.color, 8, 8));
        }
      } else if (this.bossIndex === 2) {
        this.attackCooldown = Math.max(45, 75 - wave * 0.8);
        let dx = player.x - this.x, dy = player.y - this.y, d = Math.hypot(dx, dy) || 1;
        enemyBullets.push(new Bullet(this.x, this.y + 40, (dx / d) * 4.2, (dy / d) * 4.2, '#ff0055', 10, 10));
        let baseAngle = Math.atan2(dy, dx);
        [-0.30, 0.30].forEach(off => {
          enemyBullets.push(new Bullet(this.x, this.y + 40, Math.cos(baseAngle + off) * 3.5, Math.sin(baseAngle + off) * 3.5, '#ffea00', 7, 7));
        });
      } else if (this.bossIndex === 3) {
        this.attackCooldown = Math.max(50, 85 - wave * 1.0);
        for (let bx = 50; bx <= W - 50; bx += 70) {
          if (Math.abs(bx - player.x) > 45 || Math.random() < 0.20) {
            enemyBullets.push(new Bullet(bx, this.y + 30, 0, 3.8, '#00ffcc', 10, 14));
          }
        }
      } else if (this.bossIndex === 4) {
        this.attackCooldown = Math.max(16, 26 - Math.floor(wave * 0.15));
        let sweepAngle = Math.sin(this.timer * 0.10) * 0.65 + (Math.PI / 2);
        enemyBullets.push(new Bullet(this.x, this.y + 45, Math.cos(sweepAngle) * 4.2, Math.sin(sweepAngle) * 4.2, '#ffaa00', 6, 12));
      } else if (this.bossIndex === 5) {
        this.attackCooldown = Math.max(45, 75 - wave * 1.0);
        for (let i = 0; i < 8; i++) {
          let a = (Math.PI * 2 / 8) * i + (Math.random() * 0.15);
          let spd = 2.5 + Math.random() * 1.5;
          enemyBullets.push(new Bullet(this.x, this.y + 40, Math.cos(a) * spd, Math.sin(a) * spd, '#e60000', 8, 8));
        }
        enemyBullets.push(new Bullet(this.x, this.y + 50, 0, 4.8, '#ffff00', 16, 16));
      }
    }
  }

  hit() {
    this.hp--;
    this.damageSinceLastDrop++;
    triggerShake(4, 3);

    if (this.damageSinceLastDrop >= this.dropThreshold) {
      this.damageSinceLastDrop = 0;
      spawnDrop(this.x + (Math.random() - 0.5) * 60, this.y + 20);
      sfxPowerUp();
    }

    if (this.hp <= 0) {
      this.dead = true;
      score += 3000 + wave * 300;
      spawnExplosion(this.x, this.y, this.color, 60);
      triggerShake(25, 12);
      sfxEnemyExplode();
      spawnDrop(this.x - 30, this.y);
      spawnDrop(this.x + 30, this.y);
      spawnDrop(this.x, this.y + 20);
    } else {
      spawnExplosion(this.x + (Math.random() - 0.5) * 60, this.y + (Math.random() - 0.5) * 40, '#ffff00', 4);
      sfxEnemyHit();
    }
  }

  draw() {
    let x = this.x, y = this.y;
    ctx.save();

    ctx.fillStyle = 'rgba(10, 6, 26, 0.9)';
    ctx.fillRect(W / 2 - 140, 45, 280, 40);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(W / 2 - 140, 45, 280, 40);

    ctx.fillStyle = '#ffea00';
    ctx.font = '900 13px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, W / 2, 60);

    ctx.fillStyle = '#222';
    ctx.fillRect(W / 2 - 120, 65, 240, 12);
    ctx.fillStyle = this.color;
    ctx.fillRect(W / 2 - 120, 65, (240) * Math.max(0, this.hp / this.maxHp), 12);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(W / 2 - 120, 65, 240, 12);

    const bossImg = ASSETS[`BOSS_${this.bossIndex}`];
    if (bossImg && bossImg.complete && bossImg.naturalWidth !== 0) {
      ctx.drawImage(bossImg, x - this.w / 2, y - this.h / 2, this.w, this.h);
    } else {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.roundRect(x - this.w / 2, y - this.h / 2, this.w, this.h, 12);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#000000';
      ctx.fillRect(x - 35, y - 15, 22, 16);
      ctx.fillRect(x + 13, y - 15, 22, 16);
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(x - 28 + Math.sin(this.timer * 0.1) * 4, y - 11, 8, 8);
      ctx.fillRect(x + 20 + Math.sin(this.timer * 0.1) * 4, y - 11, 8, 8);

      ctx.fillStyle = (Math.floor(this.timer / 5) % 2 === 0) ? '#ffff00' : '#ff0055';
      ctx.fillRect(x - 15, y + 10, 30, 20);
    }

    ctx.restore();
  }
}

let enemies = [];
let activeBoss = null;
let spawnQueue = [];

function getBossNameByWave(w) {
  let idx = ((Math.floor(w / 10) - 1) % 5) + 1;
  if (idx === 1) return "LOOP REVISIONI INFINITE";
  if (idx === 2) return "IL CLIENTE IMPOSSIBILE";
  if (idx === 3) return "LE TASSE & F24 KILLER";
  if (idx === 4) return "CALL MARATONA DELLE 18:00";
  return "SERVER CRASH 500";
}

function buildWave(w) {
  let newTier = w <= 10 ? 1 : w <= 20 ? 2 : w <= 30 ? 3 : w <= 40 ? 4 : 5;
  if (w === 1 || newTier !== currentTier) {
    currentTier = newTier;
    state = 'ERA_INTRO';
  }

  if (w % 10 === 0) {
    bossWarningTimer = 180;
    upcomingBossName = getBossNameByWave(w);
    upcomingBossWave = w;
    activeBoss = null;
    return [];
  }

  activeBoss = null;
  const queue = [];
  const patternType = (w - 1) % 5;

  if (patternType === 0) {
    const rows = 2 + Math.min(w % 10, 3);
    const cols = 5;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let type = (r === 0 && w >= 2) ? 'shooter' : 'grunt';
        if (r === 0 && c === 2 && w >= 3) type = 'tank';
        queue.push({ x: 60 + c * (W - 120) / (cols - 1), y: -40 - r * 55, type, delay: r * 16 + c * 3 });
      }
    }
  } else if (patternType === 1) {
    const total = 10 + Math.min(w, 6);
    for (let i = 0; i < total; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const step = Math.floor(i / 2);
      const x = W / 2 + side * step * 38;
      const y = -40 - step * 45;
      let type = (step === 0) ? (w >= 3 ? 'tank' : 'shooter') : (step % 2 === 1 ? 'shooter' : 'grunt');
      queue.push({ x, y, type, delay: i * 6 });
    }
  } else if (patternType === 2) {
    const count = 6 + Math.min(w, 6);
    for (let i = 0; i < count; i++) {
      let typeL = (i === 0 && w >= 2) ? 'shooter' : 'grunt';
      let typeR = (i === 0 && w >= 3) ? 'tank' : 'grunt';
      queue.push({ x: 60, y: -40 - i * 50, type: typeL, delay: i * 10 });
      queue.push({ x: W - 60, y: -40 - i * 50, type: typeR, delay: i * 10 });
    }
  } else if (patternType === 3) {
    const cols = 5;
    for (let c = 0; c < cols; c++) {
      let type = (c % 2 === 0) ? 'tank' : 'grunt';
      queue.push({ x: 60 + c * (W - 120) / (cols - 1), y: -40, type, delay: c * 4 });
    }
    for (let c = 0; c < cols; c++) {
      queue.push({ x: 60 + c * (W - 120) / (cols - 1), y: -100, type: 'shooter', delay: 20 + c * 4 });
    }
  } else if (patternType === 4) {
    const centerPoints = [
      { dx: 0, dy: 0, type: 'tank' },
      { dx: -50, dy: -40, type: 'shooter' }, { dx: 50, dy: -40, type: 'shooter' },
      { dx: -100, dy: -80, type: 'grunt' },  { dx: 100, dy: -80, type: 'grunt' },
      { dx: -50, dy: -120, type: 'grunt' },  { dx: 50, dy: -120, type: 'grunt' },
      { dx: 0, dy: -160, type: 'shooter' }
    ];
    centerPoints.forEach((pt, i) => {
      queue.push({ x: W / 2 + pt.dx, y: -40 + pt.dy, type: pt.type, delay: i * 5 });
    });
  }

  return queue;
}

function spawnWaveEnemies() {
  if (bossWarningTimer > 0) return;

  if (spawnQueue.length === 0 && enemies.length === 0 && (!activeBoss || activeBoss.dead)) {
    if (activeBoss && activeBoss.dead) activeBoss = null;
    wave++;
    spawnQueue = buildWave(wave);
  }
  for (let i = spawnQueue.length - 1; i >= 0; i--) {
    const e = spawnQueue[i]; e.delay--;
    if (e.delay <= 0) { enemies.push(new Enemy(e.x, e.y, e.type)); spawnQueue.splice(i, 1); }
  }
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return Math.abs(ax - bx) < (aw + bw) / 2 && Math.abs(ay - by) < (ah + bh) / 2;
}

function checkCollisions() {
  for (const b of playerBullets) {
    if (b.dead) continue;
    if (activeBoss && !activeBoss.dead && rectsOverlap(b.x, b.y, b.w, b.h, activeBoss.x, activeBoss.y, activeBoss.w, activeBoss.h)) {
      b.dead = true;
      activeBoss.hit();
      continue;
    }
    for (const e of enemies) {
      if (e.dead) continue;
      if (rectsOverlap(b.x, b.y, b.w, b.h, e.x, e.y, e.w, e.h)) { b.dead = true; e.hit(); break; }
    }
  }

  for (const d of drops) {
    if (d.dead) continue;
    if (rectsOverlap(player.x, player.y, player.w, player.h, d.x, d.y, d.w, d.h)) {
      d.dead = true;
      if (d.type === 'COFFEE') {
        lives = Math.min(5, lives + 1);
        sfxPowerUp();
      } else if (d.type === 'BOOST') {
        player.boostTimer = 300;
        sfxPowerUp();
      } else if (d.type === 'SHIELD') {
        player.shieldTimer = 300;
        sfxPowerUp();
      } else if (d.type === 'LAG') {
        player.lagTimer = 240;
        sfxDebuff();
      } else if (d.type === 'JAM') {
        player.jamTimer = 150;
        sfxDebuff();
      }
    }
  }

  if (player.alive && player.invTimer === 0) {
    for (const b of enemyBullets) {
      if (b.dead) continue;
      if (rectsOverlap(b.x, b.y, b.w, b.h, player.x, player.y, player.w - 10, player.h - 10)) { b.dead = true; hitPlayer(); }
    }
    for (const e of enemies) {
      if (e.dead) continue;
      if (rectsOverlap(player.x, player.y, player.w - 6, player.h - 6, e.x, e.y, e.w - 6, e.h - 6)) {
        e.dead = true; spawnExplosion(e.x, e.y, e.color, 20); hitPlayer();
      }
    }
    if (activeBoss && !activeBoss.dead && rectsOverlap(player.x, player.y, player.w - 6, player.h - 6, activeBoss.x, activeBoss.y, activeBoss.w - 10, activeBoss.h - 10)) {
      hitPlayer();
    }
  }
}

function hitPlayer() {
  lives--;
  spawnExplosion(player.x, player.y, currentBoss.primary, 25);
  sfxPlayerHit();
  if (lives <= 0) {
    player.alive = false; state = 'dead'; deathTimer = 100;
  } else { player.invTimer = 120; }
}

function drawHUD() {
  ctx.fillStyle = currentBoss.primary; ctx.font = 'bold 15px Courier New';
  ctx.textAlign = 'left';   ctx.fillText(`${currentBoss.name}`, 10, 24);
  ctx.fillStyle = '#ffff00'; ctx.fillText(`PTS ${score}`, 10, 44);

  if (!activeBoss && bossWarningTimer <= 0) {
    ctx.textAlign = 'center'; ctx.font = 'bold 16px Courier New'; ctx.fillText(`STAGE ${wave}`, W / 2, 26);
  }

  ctx.textAlign = 'right';  ctx.font = 'bold 14px Courier New'; ctx.fillText(`REC ${hiScore}`, W - 10, 26);

  for (let i = 0; i < lives; i++) {
    ctx.fillStyle = currentBoss.primary;
    ctx.fillRect(W - 22 - (i * 20), 38, 14, 14);
  }

  if (bossWarningTimer > 0) {
    bossWarningTimer--;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 0, 85, 0.92)';
    ctx.fillRect(0, H / 2 - 60, W, 120);
    ctx.strokeStyle = '#ffea00';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, H / 2 - 60, W, 120);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 18px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('WARNING // MEGA BOSS', W / 2, H / 2 - 24);

    ctx.fillStyle = '#ffea00';
    ctx.font = '900 20px Courier New';
    ctx.fillText(upcomingBossName, W / 2, H / 2 + 14);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Courier New';
    ctx.fillText('PREPARATI ALLA BATTAGLIA...', W / 2, H / 2 + 42);
    ctx.restore();

    if (bossWarningTimer === 0) {
      activeBoss = new Boss(upcomingBossWave);
      triggerShake(20, 8);
    }
  }
}

function drawEraLegend() {
  if (state !== 'ERA_INTRO') return;

  ctx.save();
  ctx.fillStyle = 'rgba(6, 2, 18, 0.94)';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#0e051b';
  ctx.beginPath();
  ctx.roundRect(16, 70, 448, 520, 16);
  ctx.fill();
  ctx.strokeStyle = '#ffea00';
  ctx.lineWidth = 3;
  ctx.stroke();

  let title = currentTier === 1 ? "ERA 1: BRIEF & FEEDBACK" :
              currentTier === 2 ? "ERA 2: RENDER & SCADENZE" :
              currentTier === 3 ? "ERA 3: CAOS CORPORATE" :
              currentTier === 4 ? "ERA 4: CAOS TECH & SOFTWARE" :
              "ERA 5: APOCALISSE CONSEGNA";

  ctx.fillStyle = '#ffea00';
  ctx.font = '900 20px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(title, W / 2, 110);

  ctx.fillStyle = '#ff0055';
  ctx.font = 'bold 15px "Courier New", monospace';
  ctx.fillText("ATTENZIONE! NUOVI INCUBI RILEVATI:", W / 2, 140);

  const legendList = currentTier === 1 ? [
    { code: "[BASE]", name: "BRIEF CONFUSO", desc: "Movimento rapido e imprevedibile", col: "#ff0055" },
    { code: "[ATK]",  name: "FEEDBACK EXTRA", desc: "Spara laser a raffica continua", col: "#ffaa00" },
    { code: "[TANK]", name: "LOGO PIÙ GRANDE", desc: "Corazzato con alta resistenza", col: "#aa00ff" }
  ] : currentTier === 2 ? [
    { code: "[BASE]", name: "SCADENZA IERI", desc: "Velocità di discesa aumentata", col: "#00ffcc" },
    { code: "[ATK]",  name: "RENDER CRASH", desc: "Sparo diretto a puntamento mirato", col: "#ff3300" },
    { code: "[TANK]", name: "FATTURA SCADUTA", desc: "Super barriera protettiva heavy", col: "#e60000" }
  ] : currentTier === 3 ? [
    { code: "[BASE]", name: "CALL ALLE 18", desc: "Traiettoria a zig-zag serrata", col: "#ffff00" },
    { code: "[ATK]",  name: "BUDGET ZERO", desc: "Sparo rapido ad alto impatto", col: "#ff00aa" },
    { code: "[TANK]", name: "MICRO-MANAGEMENT", desc: "Ultra resistenza & controllo area", col: "#00ff00" }
  ] : currentTier === 4 ? [
    { code: "[BASE]", name: "PROMPT ERRORE", desc: "Avanzata rapida in linea retta", col: "#00ff66" },
    { code: "[ATK]",  name: "METEO AVVERSO", desc: "Scarica proiettili elettrici", col: "#ffea00" },
    { code: "[TANK]", name: "OVERTIME NOTTURNO", desc: "Alto assorbimento colpi su ore piccole", col: "#9900ff" }
  ] : [
    { code: "[BASE]", name: "NOTIFICA SLACK", desc: "Sciami veloci per sopraffare il campo", col: "#ff0055" },
    { code: "[ATK]",  name: "FINAL_V2_DEF.PDF", desc: "Rilascia glitch letali a distanza", col: "#e60055" },
    { code: "[TANK]", name: "PREVENTIVO BASSISSIMO", desc: "Crea barriere e rallenta la flotta", col: "#ff6600" }
  ];

  legendList.forEach((item, idx) => {
    let boxY = 170 + (idx * 115);

    ctx.fillStyle = '#160a2c';
    ctx.beginPath();
    ctx.roundRect(30, boxY, 420, 100, 12);
    ctx.fill();
    ctx.strokeStyle = item.col;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    const enemyImg = ASSETS[item.name];
    if (enemyImg && enemyImg.complete && enemyImg.naturalWidth !== 0) {
      ctx.drawImage(enemyImg, 45, boxY + 25, 50, 50);
    } else {
      ctx.fillStyle = item.col;
      ctx.font = 'bold 15px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.code, 68, boxY + 50);
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = item.col;
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillText(item.name, 110, boxY + 38);

    ctx.fillStyle = '#ffffff';
    ctx.font = '13px "Courier New", monospace';
    ctx.fillText(item.desc, 110, boxY + 68);
  });

  if (Math.floor(frame / 40) % 2 === 0) {
    ctx.fillStyle = '#ffea00';
    ctx.font = '900 18px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CONTINUA ►', W / 2, 562);
  }

  ctx.restore();
}

function drawScreens() {
  if (state === 'COVER') {
    if (imgCover && imgCover.complete && imgCover.naturalWidth !== 0) {
      ctx.drawImage(imgCover, 0, 0, W, H);
    } else {
      ctx.fillStyle = '#060212'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#ff0055';
      ctx.font = '900 34px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText('FEEDBACK INVADERS', W / 2, 240);
      ctx.fillStyle = '#ffea00';
      ctx.font = 'bold 20px Courier New';
      ctx.fillText('AGENCY ARCADE', W / 2, 280);
    }

    if (Math.floor(frame / 45) % 2 === 0) {
      ctx.fillStyle = '#00ccff';
      ctx.font = '900 18px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText('PREMI SPARO PER COMINCIARE ►', W / 2, H - 35);
    }
    return;
  }

  if (state === 'STORY') {
    ctx.fillStyle = 'rgba(6, 6, 20, 0.98)'; ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#ffea00'; ctx.font = '900 32px Courier New'; ctx.textAlign = 'center';
    ctx.fillText('LA STORIA', W/2, 85);

    ctx.beginPath(); ctx.fillStyle = '#120a28'; ctx.roundRect(20, 115, 440, 440, 16); ctx.fill();
    ctx.strokeStyle = '#ff0055'; ctx.lineWidth = 3; ctx.stroke();

    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 20px Courier New'; ctx.textAlign = 'center';
    ctx.fillText('Tre coordinatori d\'agenzia.', W/2, 170);
    ctx.fillText('Un\'unica grande missione.', W/2, 210);

    ctx.fillStyle = '#ffea00';
    ctx.fillText('Un\'invasione incessante di', W/2, 275);
    ctx.fillText('brief assurdi, feedback tossici', W/2, 315);
    ctx.fillText('e scadenze da incubo!', W/2, 355);

    ctx.fillStyle = '#ffffff';
    ctx.fillText('Pilota il tuo capo e salva', W/2, 420);
    ctx.fillText('lo studio dal caos totale!', W/2, 460);

    if (Math.floor(frame / 40) % 2 === 0) {
      ctx.fillStyle = '#ffea00';
      ctx.font = '900 20px Courier New';
      ctx.fillText('CONTINUA ►', W/2, H - 35);
    }
    return;
  }

  if (state === 'RULES') {
    ctx.fillStyle = '#060614'; ctx.fillRect(0, 0, W, H);

    const drawRuleCard = (y, color, title, action, drawVisual) => {
      ctx.save();
      ctx.fillStyle = '#101228';
      ctx.beginPath(); ctx.roundRect(16, y, W - 32, 110, 12); ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke();
      ctx.fillStyle = color; ctx.fillRect(16, y, 8, 110);

      // Immagini/Icone a sinistra
      drawVisual(75, y + 55);

      // Testi ingranditi a destra
      drawCrispText(title, 145, y + 40, '900 18px Courier New', color, 'left');
      drawCrispText(action, 145, y + 70, '900 13px Courier New', '#ffffff', 'left');
      ctx.restore();
    };

    drawCrispText('COME SI GIOCA', W / 2, 26, '900 27px Courier New', '#00f0ff');
    drawCrispText('3 COSE DA RICORDARE', W / 2, 50, '900 13px Courier New', '#ffffff');

    // Card 1: Nemici
    drawRuleCard(68, '#ffea00', 'DISTRUGGI GLI INCUBI', 'SPARA AI NEMICI PRIMA CHE SCENDANO', (x, y) => {
      ctx.imageSmoothingEnabled = false;
      const enemiesList = [
        { img: ASSETS["BRIEF CONFUSO"], x: x - 22, y: y - 14 },
        { img: ASSETS["FEEDBACK EXTRA"], x: x + 22, y: y - 14 },
        { img: ASSETS["LOGO PIÙ GRANDE"], x: x, y: y + 16 }
      ];
      enemiesList.forEach((item) => {
        if (item.img?.complete && item.img.naturalWidth) {
          ctx.drawImage(item.img, item.x - 18, item.y - 18, 36, 36);
        } else {
          ctx.fillStyle = '#ff0055'; ctx.fillRect(item.x - 15, item.y - 15, 30, 30);
        }
      });
    });

    // Card 2: Boss
    drawRuleCard(192, '#ff0055', 'AFFRONTA I BOSS', 'BATTI I MEGA BOSS OGNI 10 ONDATE', (x, y) => {
      ctx.imageSmoothingEnabled = false;
      if (ASSETS.BOSS_1?.complete && ASSETS.BOSS_1.naturalWidth) {
        ctx.drawImage(ASSETS.BOSS_1, x - 30, y - 30, 60, 60);
      } else {
        ctx.fillStyle = '#ff0055'; ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.fill();
      }
    });

    // Card 3: Powerup
    drawRuleCard(316, '#00ffcc', 'RACCOGLI I BONUS', 'POTENZIA ARME, SCUDI ED ENERGIA', (x, y) => {
      ctx.imageSmoothingEnabled = false;
      const bonusLayout = [
        { img: ASSETS.BOOST, x: x - 22, y: y - 14 },
        { img: ASSETS.SHIELD, x: x + 22, y: y - 14 },
        { img: ASSETS.COFFEE, x: x, y: y + 16 }
      ];
      bonusLayout.forEach(item => {
        if (item.img?.complete && item.img.naturalWidth) {
          ctx.drawImage(item.img, item.x - 18, item.y - 18, 36, 36);
        }
      });
    });

    // Riquadro Comandi
    ctx.save();
    ctx.fillStyle = '#17102d';
    ctx.beginPath(); ctx.roundRect(16, 440, W - 32, 110, 12); ctx.fill();
    ctx.strokeStyle = '#9d5cff'; ctx.lineWidth = 2.5; ctx.stroke();

    const controlsY = 485;
    ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 3;
    ctx.fillStyle = '#0a0318';
    ctx.beginPath(); ctx.arc(110, controlsY, 28, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff007f';
    ctx.beginPath(); ctx.arc(104, controlsY - 5, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
    drawCrispText('MUOVITI', 110, controlsY + 42, '900 14px Courier New', '#ffffff');

    ctx.fillStyle = '#ff0055';
    ctx.beginPath(); ctx.arc(370, controlsY, 32, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ff8aac'; ctx.lineWidth = 2.5; ctx.stroke();
    drawCrispText('ATTACCA', 370, controlsY + 42, '900 14px Courier New', '#ffffff');
    ctx.restore();

    if (Math.floor(frame / 40) % 2 === 0) {
      drawCrispText('TOCCA PER CONTINUARE', W / 2, H - 25, '900 15px Courier New', '#ffea00');
    }
    return;
  }

  if (state === 'POWERUPS_INFO') {
    ctx.fillStyle = 'rgba(6, 6, 20, 0.98)'; ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#ffea00'; ctx.font = '900 30px Courier New'; ctx.textAlign = 'center';
    ctx.fillText('MODULI & POTENZIAMENTI', W/2, 82);

    const items = [
      { key: 'COFFEE', tag: '[+ VITA]', title: 'MODULO CAFFÈ', desc: 'Ripristina +1 Unità Energia', col: '#ffcc00' },
      { key: 'BOOST',  tag: '[+ SPARO]', title: 'CITRONELLA BOOST', desc: 'Frequenza Firing Ultra-Rapida', col: '#ff0055' },
      { key: 'SHIELD', tag: '[+ SCUDO]', title: 'SCUDO TERMICO', desc: 'Barriera Invulnerabilità', col: '#00ccff' },
      { key: 'LAG',    tag: '[- LAG]',   title: 'ANOMALIA LAG', desc: 'Rallentamento Motori (Malus)', col: '#ff9900' },
      { key: 'JAM',    tag: '[- BLOCCO]', title: 'BLOCCO TASTIERA', desc: 'Disattiva Sistemi Arma (Malus)', col: '#ff0055' }
    ];

    items.forEach((item, idx) => {
      let boxY = 112 + (idx * 84);

      ctx.fillStyle = '#101228';
      ctx.beginPath();
      ctx.roundRect(20, boxY, 440, 74, 12);
      ctx.fill();
      ctx.strokeStyle = item.col;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      const dropImg = ASSETS[item.key];
      if (dropImg && dropImg.complete && dropImg.naturalWidth !== 0) {
        ctx.drawImage(dropImg, 32, boxY + 17, 40, 40);
      } else {
        ctx.fillStyle = item.col;
        ctx.font = 'bold 12px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(item.tag, 52, boxY + 41);
      }

      ctx.fillStyle = item.col; ctx.font = 'bold 18px Courier New'; ctx.textAlign = 'left';
      ctx.fillText(item.title, 100, boxY + 30);

      ctx.fillStyle = '#ffffff'; ctx.font = '14px Courier New';
      ctx.fillText(item.desc, 100, boxY + 54);
    });

    if (Math.floor(frame / 40) % 2 === 0) {
      ctx.fillStyle = '#ffea00';
      ctx.font = '900 20px Courier New'; ctx.textAlign = 'center';
      ctx.fillText('CONTINUA ►', W/2, H - 35);
    }
    return;
  }

  if (state === 'CHAR_SELECT') {
    ctx.fillStyle = 'rgba(6, 6, 20, 0.98)'; ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#ffff00'; ctx.font = '900 28px Courier New'; ctx.textAlign = 'center';
    ctx.fillText('SCEGLI IL TUO CAPO 🚀', W/2, 75);

    let key = charList[charSelectIndex];
    let c = CHARACTERS[key];

    ctx.beginPath(); ctx.fillStyle = '#101228'; ctx.roundRect(20, 98, 440, 435, 16); ctx.fill();
    ctx.strokeStyle = c.primary; ctx.lineWidth = 3.5; ctx.stroke();

    if (c.portrait && c.portrait.complete && c.portrait.naturalWidth !== 0) {
      ctx.save();
      ctx.beginPath(); ctx.roundRect(W/2 - 95, 118, 190, 180, 14); ctx.clip();
      ctx.drawImage(c.portrait, W/2 - 95, 118, 190, 180);
      ctx.restore();
      ctx.beginPath(); ctx.roundRect(W/2 - 95, 118, 190, 180, 14);
      ctx.strokeStyle = c.primary; ctx.lineWidth = 2.5; ctx.stroke();
    }

    ctx.fillStyle = c.primary; ctx.font = '900 30px Courier New'; ctx.textAlign = 'center';
    ctx.fillText(c.name, W/2, 330);

    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 18px Courier New';
    ctx.fillText(c.role, W/2, 362);

    ctx.fillStyle = '#ffff00'; ctx.font = 'bold 15px Courier New';
    ctx.fillText(c.perkBonus, W/2, 405);

    ctx.fillStyle = '#ff0055'; ctx.font = 'bold 15px Courier New';
    ctx.fillText(c.perkMalus, W/2, 440);

    ctx.fillStyle = '#ffea00'; ctx.font = '900 36px Courier New';
    ctx.fillText('◄', 45, 305);
    ctx.fillText('►', W - 45, 305);

    if (Math.floor(frame / 40) % 2 === 0) {
      ctx.fillStyle = c.primary;
      ctx.font = '900 20px Courier New';
      ctx.fillText('CONTINUA ►', W/2, H - 35);
    }
    return;
  }

  if (state === 'PAUSE') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffea00'; ctx.font = '900 36px Courier New'; ctx.textAlign = 'center';
    ctx.fillText('IN PAUSA', W/2, H/2 - 20);
    ctx.fillStyle = '#ff0055'; ctx.font = 'bold 18px Courier New';
    ctx.fillText('TOCCA IL GIOCO PER RIPRENDERE', W/2, H/2 + 25);
    return;
  }

  if (state === 'dead' || state === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.88)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = currentBoss.primary; ctx.font = '900 38px Courier New'; ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', W/2, H/2 - 50);
    ctx.fillStyle = '#ffff00'; ctx.font = 'bold 22px Courier New'; ctx.fillText(`SCORE: ${score}`, W/2, H/2 + 10);
    ctx.fillStyle = '#ff0055'; ctx.font = '16px Courier New'; ctx.fillText(`RECORD: ${hiScore}`, W/2, H/2 + 45);
    ctx.fillStyle = Math.floor(frame/30)%2===0 ? '#fff' : currentBoss.primary;
    ctx.font = '900 18px Courier New'; ctx.fillText('TOCCA PER RIPROVARE', W/2, H/2 + 110);
  }
}

canvas.addEventListener('pointerdown', e => {
  getAC();
  let rect = canvas.getBoundingClientRect();
  let x = (e.clientX - rect.left) * (W / rect.width);
  let y = (e.clientY - rect.top) * (H / rect.height);

  if (['COVER', 'STORY', 'RULES', 'POWERUPS_INFO'].includes(state)) {
    advanceMenuState();
    return;
  }

  if (state === 'CHAR_SELECT') {
    if (x < 80) {
      charSelectIndex = (charSelectIndex - 1 + 3) % 3;
      return;
    }
    if (x > W - 80) {
      charSelectIndex = (charSelectIndex + 1) % 3;
      return;
    }
    advanceMenuState();
    return;
  }

  if (state === 'ERA_INTRO') {
    state = 'playing';
    return;
  }

  if (state === 'playing') {
    state = 'PAUSE';
    return;
  }

  if (state === 'PAUSE') {
    state = 'playing';
    return;
  }

  if (state === 'gameover') {
    state = 'CHAR_SELECT';
    return;
  }
});

function startGame() {
  scoreSavedForCurrentGame = false;
  score = 0; lives = 3; wave = 1; currentTier = 1;
  enemies = []; activeBoss = null; playerBullets = []; enemyBullets = []; drops = [];
  particles.length = 0; spawnQueue = buildWave(1);
  player.reset();
}

function update() {
  frame++;
  updateStars();

  if (shakeTime > 0) shakeTime--;

  if (['COVER', 'STORY', 'RULES', 'POWERUPS_INFO', 'CHAR_SELECT', 'PAUSE', 'ERA_INTRO'].includes(state)) return;

  if (state === 'dead') {
    deathTimer--; updateParticles();
    if (deathTimer <= 0) {
      state = 'gameover';
      saveScore(score);
    }
    return;
  }

  if (state === 'gameover') return;

  player.update();
  spawnWaveEnemies();
  if (activeBoss) activeBoss.update();

  for (const b of playerBullets) b.update();
  for (const b of enemyBullets)  b.update();
  for (const e of enemies)       e.update();
  for (const d of drops)         d.update();

  playerBullets = playerBullets.filter(b => !b.dead);
  enemyBullets  = enemyBullets.filter(b => !b.dead);
  enemies       = enemies.filter(e => !e.dead);
  drops         = drops.filter(d => !d.dead);

  checkCollisions();
  updateParticles();
}

function draw() {
  ctx.save();
  if (shakeTime > 0) {
    let sx = (Math.random() - 0.5) * shakeMag;
    let sy = (Math.random() - 0.5) * shakeMag;
    ctx.translate(sx, sy);
  }

  ctx.fillStyle = '#060212'; ctx.fillRect(0, 0, W, H);
  drawStars();

  if (['COVER', 'STORY', 'RULES', 'POWERUPS_INFO', 'CHAR_SELECT'].includes(state)) {
    drawScreens();
    ctx.restore();
    return;
  }

  for (const d of drops)         d.draw();
  for (const b of enemyBullets)  b.draw();
  for (const b of playerBullets) b.draw();
  for (const e of enemies)       e.draw();

  if (activeBoss) activeBoss.draw();

  player.draw();
  drawParticles();
  drawHUD();

  if (state === 'ERA_INTRO') drawEraLegend();
  if (state === 'PAUSE' || state === 'dead' || state === 'gameover') drawScreens();
  ctx.restore();
}

// --- FIXED TIMESTEP LOOP (60 FPS UNIFORMI SU TUTTI I DISPOSITIVI) ---
let lastTime = 0;
const FIXED_STEP = 1000 / 60;
let accumulator = 0;

function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  let deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  if (deltaTime > 250) deltaTime = 250;

  accumulator += deltaTime;

  while (accumulator >= FIXED_STEP) {
    update();
    accumulator -= FIXED_STEP;
  }

  draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);