const cvs = document.getElementById('game');
const ctx = cvs.getContext('2d');
cvs.width = 420;
cvs.height = 640;

function draw80sBox(c, x, y, w, h, borderColor, bgCol, borderWidth = 3) {
  c.fillStyle = bgCol;
  c.fillRect(x, y, w, h);
  c.lineWidth = borderWidth;
  c.strokeStyle = borderColor;
  c.strokeRect(x, y, w, h);

  c.fillStyle = 'rgba(255, 255, 255, 0.15)';
  c.fillRect(x, y, w, 2);
  c.fillRect(x, y, 2, h);
  c.fillStyle = 'rgba(0, 0, 0, 0.5)';
  c.fillRect(x, y + h - 2, w, 2);
  c.fillRect(x + w - 2, y, 2, h);
}

function drawImageCover(c, img, dx, dy, dWidth, dHeight) {
  if (!img || !img.complete || img.naturalWidth === 0) return;
  let imgRatio = img.naturalWidth / img.naturalHeight;
  let destRatio = dWidth / dHeight;
  let sx, sy, sWidth, sHeight;
  if (imgRatio > destRatio) {
    sHeight = img.naturalHeight;
    sWidth = sHeight * destRatio;
    sx = (img.naturalWidth - sWidth) / 2;
    sy = 0;
  } else {
    sWidth = img.naturalWidth;
    sHeight = sWidth / destRatio;
    sx = 0;
    sy = (img.naturalHeight - sHeight) / 2;
  }
  c.drawImage(img, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
}

const settingsModal = document.getElementById('settingsModal');
const btnOpenSettings = document.getElementById('btnOpenSettings');
const btnCloseSettings = document.getElementById('btnCloseSettings');
const btnExitTop = document.getElementById('btnExitTop');
const btnMenuTop = document.getElementById('btnMenuTop');
const btnToggleMusic = document.getElementById('btnToggleMusic');
const btnToggleSfx = document.getElementById('btnToggleSfx');

const btnOpenRules = document.getElementById('btnOpenRules');
const btnCloseRules = document.getElementById('btnCloseRules');
const rulesModal = document.getElementById('rulesModal');

const btnOpenPerks = document.getElementById('btnOpenPerks');
const btnClosePerks = document.getElementById('btnClosePerks');
const perksModal = document.getElementById('perksModal');

const renderOptionButtons = ArcadeGameShell.bindAudioOptions(
  btnToggleMusic,
  btnToggleSfx
);

btnOpenSettings.onclick = () => {
  if (state === 'PLAYING') {
    state = 'PAUSE';
  }
  renderOptionButtons();
  ArcadeGameShell.showModal(settingsModal);
};

btnCloseSettings.onclick = () => {
  ArcadeGameShell.hideModal(settingsModal);
  getAC();
  if (state === 'PAUSE') {
    state = 'PLAYING';
  }
};

ArcadeGameShell.bindModalTransition(btnOpenRules, settingsModal, rulesModal);
ArcadeGameShell.bindModalTransition(btnCloseRules, rulesModal, settingsModal);
ArcadeGameShell.bindModalTransition(btnOpenPerks, settingsModal, perksModal);
ArcadeGameShell.bindModalTransition(btnClosePerks, perksModal, settingsModal);

btnMenuTop.onclick = () => {
  getAC();
  if (gameTimerInterval) clearInterval(gameTimerInterval);
  gridPads.forEach(p => p.active = false);
  ferieActive = false;
  state = 'COVER';
};

btnExitTop.onclick = async () => {
  getAC();
  await exitGame();
};

const ASSETS = {
  COVER: new Image(),
  IRIS: new Image(),
  CRISTINA: new Image(),
  RACHELE: new Image(),
  BOMBA: new Image(),
  FUOCO: new Image(),
  SCARPA: new Image(),
  CAFFE: new Image()
};

ASSETS.COVER.src = 'assets/PixelPunch/copertina.png';
ASSETS.IRIS.src = 'assets/PixelPunch/Iris.png';
ASSETS.CRISTINA.src = 'assets/PixelPunch/tosatto.png';
ASSETS.RACHELE.src = 'assets/PixelPunch/rache.png';

ASSETS.BOMBA.src = 'assets/pacman/bomba.png';
ASSETS.FUOCO.src = 'assets/pacman/fuoco.png';
ASSETS.SCARPA.src = 'assets/pacman/scarpa.png';
ASSETS.CAFFE.src = 'assets/pacman/caffe.png';

const CHARACTERS = {
    IRIS: {
        id: 'IRIS',
        name: "IRIS",
        subtitle: "AI Producer Specialist",
        perkBonusTitle: "PERK: AUTO-FIX AI",
        perkBonusDesc: "Fix automatico & Ferie 7s",
        primary: "#00ffff",
        bg: "#060814",
        padBg: "#101026",
        img: ASSETS.IRIS,
        ferieSec: 7,
        scoreMult: 1.0
    },
    CRISTINA: {
        id: 'CRISTINA',
        name: "CRISTINA",
        subtitle: "Senior Producer Exec",
        perkBonusTitle: "PERK: DOUBLE ESPRESSO",
        perkBonusDesc: "Punti Caffè x2 & Ferie 10s",
        primary: "#ffea00",
        bg: "#100c02",
        padBg: "#221a04",
        img: ASSETS.CRISTINA,
        ferieSec: 10,
        scoreMult: 1.15
    },
    RACHELE: {
        id: 'RACHELE',
        name: "RACHELE",
        subtitle: "Lead Field Producer",
        perkBonusTitle: "PERK: VACATION RUSH",
        perkBonusDesc: "15s Super Relax & Combo Boost",
        primary: "#ff0055",
        bg: "#140410",
        padBg: "#280820",
        img: ASSETS.RACHELE,
        ferieSec: 15,
        scoreMult: 1.25
    }
};

const charList = ['IRIS', 'CRISTINA', 'RACHELE'];
let charSelectIndex = 0;
let currentTheme = CHARACTERS.IRIS;
let highScore = parseInt(localStorage.getItem('pixelPunch_highScore')) || 0;
let isNewRecord = false;
let scoreSavedForCurrentGame = false;

let audioCtx = null;
function getAC() {
    try {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) audioCtx = new AudioContextClass();
        }
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    } catch(e) {}
    return audioCtx;
}

const isSfxAllowed = ArcadeGameShell.isSfxAllowed;

function playSound(type) {
    if (!isSfxAllowed()) return;
    try {
        const ac = getAC();
        if (!ac) return;
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain); gain.connect(ac.destination);

        if (type === 'hit') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(320, ac.currentTime);
            osc.frequency.exponentialRampToValueAtTime(120, ac.currentTime + 0.08);
            gain.gain.setValueAtTime(0.3, ac.currentTime);
            osc.start(); osc.stop(ac.currentTime + 0.08);
        } else if (type === 'hit_double') {
            osc.type = 'square';
            osc.frequency.setValueAtTime(580, ac.currentTime);
            osc.frequency.exponentialRampToValueAtTime(220, ac.currentTime + 0.12);
            gain.gain.setValueAtTime(0.35, ac.currentTime);
            osc.start(); osc.stop(ac.currentTime + 0.12);
        } else if (type === 'coffee') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, ac.currentTime);
            osc.frequency.setValueAtTime(554, ac.currentTime + 0.06);
            osc.frequency.setValueAtTime(659, ac.currentTime + 0.12);
            gain.gain.setValueAtTime(0.3, ac.currentTime);
            osc.start(); osc.stop(ac.currentTime + 0.2);
        } else if (type === 'golden') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(523, ac.currentTime);
            osc.frequency.setValueAtTime(659, ac.currentTime + 0.08);
            osc.frequency.setValueAtTime(783, ac.currentTime + 0.16);
            osc.frequency.setValueAtTime(1046, ac.currentTime + 0.24);
            gain.gain.setValueAtTime(0.35, ac.currentTime);
            osc.start(); osc.stop(ac.currentTime + 0.32);
        } else if (type === 'fail') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(180, ac.currentTime);
            osc.frequency.linearRampToValueAtTime(40, ac.currentTime + 0.25);
            gain.gain.setValueAtTime(0.35, ac.currentTime);
            osc.start(); osc.stop(ac.currentTime + 0.25);
        }
    } catch(e) {}
}

let state = 'COVER';
let score = 0;
let combo = 0;
let stress = 0;
let elapsedMatchTime = 0;
let frame = 0;
let shakeTime = 0;
let shakeMag = 0;

function triggerShake(time = 10, mag = 5) {
    shakeTime = time;
    shakeMag = mag;
}

let ferieActive = false;
let ferieTimer = 0;

let particles = [];
let floatingTexts = [];
let impactBursts = [];

const BAD_NOTIFS = [
    { line1: "LOGO PIÙ", line2: "GRANDE!" },
    { line1: "LAVORO PER", line2: "IERI!" },
    { line1: "CAMBIA", line2: "COLORE!" },
    { line1: "ASAP", line2: "URGENTE!" },
    { line1: "PROVA CON", line2: "VERDE!" },
    { line1: "FONTS PIÙ", line2: "LEGGIBILI!" }
];

const gridPads = [
    { id: 0, x: 10,  y: 86,  w: 128, h: 170, keyLabel: "1 / Q" },
    { id: 1, x: 146, y: 86,  w: 128, h: 170, keyLabel: "2 / W" },
    { id: 2, x: 282, y: 86,  w: 128, h: 170, keyLabel: "3 / E" },

    { id: 3, x: 10,  y: 266, w: 128, h: 170, keyLabel: "4 / A" },
    { id: 4, x: 146, y: 266, w: 128, h: 170, keyLabel: "5 / S" },
    { id: 5, x: 282, y: 266, w: 128, h: 170, keyLabel: "6 / D" },

    { id: 6, x: 10,  y: 446, w: 128, h: 170, keyLabel: "7 / Z" },
    { id: 7, x: 146, y: 446, w: 128, h: 170, keyLabel: "8 / X" },
    { id: 8, x: 282, y: 446, w: 128, h: 170, keyLabel: "9 / C" }
].map(p => ({
    ...p,
    active: false,
    type: 'BAD',
    hp: 1,
    line1: '',
    line2: '',
    timer: 0,
    maxTimer: 100,
    pressAnim: 0
}));

let lastSpawnTime = 0;
let gameTimerInterval = null;

function selectCharacter(charKey) {
    currentTheme = CHARACTERS[charKey];
    cvs.style.borderColor = currentTheme.primary;
    cvs.style.boxShadow = `0 0 20px ${currentTheme.primary}`;
    startMatch();
}

function startMatch() {
    scoreSavedForCurrentGame = false;
    state = 'PLAYING';
    score = 0;
    stress = 0;
    combo = 0;
    elapsedMatchTime = 0;

    ferieActive = false;
    ferieTimer = 0;

    isNewRecord = false;
    gridPads.forEach(p => p.active = false);

    if (gameTimerInterval) clearInterval(gameTimerInterval);
    gameTimerInterval = setInterval(() => {
        if (state === 'PLAYING') {
            elapsedMatchTime++;

            if (ferieActive) {
                ferieTimer--;
                stress = Math.max(0, stress - 1.8);
                if (ferieTimer <= 0) {
                    ferieActive = false;
                }
            } else {
                stress = Math.min(100, stress + 0.35 + (elapsedMatchTime * 0.012));
            }

            if (stress >= 100) {
                state = 'GAMEOVER';
                playSound('fail');
                triggerShake(20, 10);
                saveScore();
                clearInterval(gameTimerInterval);
            }
        }
    }, 1000);
}

function spawnTicket() {
    if (ferieActive) return;

    let inactive = gridPads.filter(p => !p.active);
    if (inactive.length === 0) return;

    let activeCount = gridPads.filter(p => p.active).length;
    let maxAllowed = 1;
    if (elapsedMatchTime > 12) maxAllowed = 2;
    if (elapsedMatchTime > 30) maxAllowed = 3;
    if (elapsedMatchTime > 55) maxAllowed = 4;

    if (activeCount >= maxAllowed) return;

    let target = inactive[Math.floor(Math.random() * inactive.length)];
    target.active = true;

    let rand = Math.random();
    let duration = Math.max(55, 145 - Math.floor(elapsedMatchTime * 1.5));

    if (currentTheme.id === 'IRIS' && rand < 0.20 && rand >= 0.05) {
        score += 100;
        stress = Math.max(0, stress - 2);
        addParticles(target.x + target.w/2, target.y + target.h/2, currentTheme.primary, 12);
        addFloatText(target.x + target.w/2, target.y + target.h/2, "AI AUTO-FIX!", currentTheme.primary);
        addImpactBurst(target.x + target.w/2, target.y + target.h/2, "AUTO-FIX!", currentTheme.primary);
        target.active = false;
        return;
    }

    if (rand < 0.03) {
        target.type = 'FERIE';
        target.hp = 1;
        target.line1 = "FERIE 🌴";
        target.line2 = "RELAX!";
    } else if (rand < 0.16) {
        target.type = 'COFFEE';
        target.hp = 1;
        target.line1 = "CAFFÈ ☕";
        target.line2 = "BONUS";
    } else if (rand < 0.27) {
        target.type = 'GOLDEN';
        target.hp = 1;
        target.line1 = "VIP 🌟";
        target.line2 = "SPECIALE";
    } else if (rand < 0.42) {
        target.type = 'TRAP';
        target.hp = 1;
        target.line1 = "FEEDBACK";
        target.line2 = "APPROVATO";
    } else if (rand < 0.54) {
        target.type = 'GLITCH';
        target.hp = 1;
        target.line1 = "FILE";
        target.line2 = "CORROTTO";
    } else if (rand < 0.72) {
        target.type = 'DOUBLE';
        target.hp = 2;
        target.line1 = "REVISIONE";
        target.line2 = "DOPPIA 2X";
    } else {
        target.type = 'BAD';
        target.hp = 1;
        let b = BAD_NOTIFS[Math.floor(Math.random() * BAD_NOTIFS.length)];
        target.line1 = b.line1;
        target.line2 = b.line2;
    }

    target.timer = duration;
    target.maxTimer = duration;
}

function hitPad(pad) {
    pad.pressAnim = 6;
    let cx = pad.x + pad.w / 2;
    let cy = pad.y + pad.h / 2;

    if (!pad.active) {
        triggerShake(3, 2);
        return;
    }

    if (pad.type === 'FERIE') {
        pad.active = false;
        ferieActive = true;
        ferieTimer = currentTheme.ferieSec;
        stress = Math.max(0, stress - 20);
        playSound('golden');
        triggerShake(12, 6);

        gridPads.forEach(p => p.active = false);
        addParticles(cx, cy, '#00ffff', 22);
        addFloatText(cx, cy, `🌴 VACATION! (${currentTheme.ferieSec}s)`, "#00ffff");
        addImpactBurst(cx, cy, "RELAX!", "#00ffff");
    }
    else if (pad.type === 'TRAP') {
        pad.active = false;
        combo = 0;
        let pen = (currentTheme.id === 'CRISTINA') ? 0 : 50;
        score = Math.max(0, score - pen);
        if (currentTheme.id !== 'CRISTINA') stress = Math.min(100, stress + 8);
        playSound('fail');
        triggerShake(10, 6);
        addParticles(cx, cy, '#00ff66', 12);
        addFloatText(cx, cy, (pen === 0 ? "NO PENALTY!" : "-50 PTS"), "#00ff66");
        addImpactBurst(cx, cy, "TRAP!", "#00ff66");
    }
    else if (pad.type === 'GLITCH') {
        pad.active = false;
        combo = 0;
        score = Math.max(0, score - 100);
        stress = Math.min(100, stress + 12);
        playSound('fail');
        triggerShake(14, 8);
        addParticles(cx, cy, '#ff0055', 16);
        addFloatText(cx, cy, "GLITCH! +12% STRESS", "#ff0055");
        addImpactBurst(cx, cy, "ERROR!", "#ff0055");
    }
    else if (pad.type === 'COFFEE') {
        pad.active = false;
        combo++;
        let pts = (currentTheme.id === 'CRISTINA') ? 600 : 300;
        score += pts;
        stress = Math.max(0, stress - (currentTheme.id === 'CRISTINA' ? 12 : 8));
        playSound('coffee');
        triggerShake(6, 4);
        addParticles(cx, cy, '#ffea00', 14);
        addFloatText(cx, cy, `+${pts} CAFFÈ!`, "#ffea00");
        addImpactBurst(cx, cy, "BOOST!", "#ffea00");
    }
    else if (pad.type === 'GOLDEN') {
        pad.active = false;
        combo++;
        score += 500;
        stress = Math.max(0, stress - 15);
        playSound('golden');
        triggerShake(12, 7);
        addParticles(cx, cy, '#ffea00', 20);
        addFloatText(cx, cy, "+500 PTS VIP!", "#ffea00");
        addImpactBurst(cx, cy, "VIP K.O.!", "#ffea00");
    }
    else if (pad.type === 'DOUBLE') {
        pad.hp--;
        playSound('hit_double');
        triggerShake(6, 4);
        if (pad.hp <= 0) {
            pad.active = false;
            combo++;
            let pts = 250;
            score += pts;
            stress = Math.max(0, stress - 4);
            addParticles(cx, cy, '#d000ff', 16);
            addFloatText(cx, cy, `+${pts} RISOLTA!`, "#d000ff");
            addImpactBurst(cx, cy, "SMASH!", "#d000ff");
        } else {
            addParticles(cx, cy, '#ff8800', 8);
            addFloatText(cx, cy, "1 ANCORA!", "#ff8800");
            addImpactBurst(cx, cy, "HIT!", "#ff8800");
        }
    }
    else { // BAD
        pad.active = false;
        combo++;
        let comboBonus = (currentTheme.id === 'RACHELE') ? (combo * 25) : (combo > 3 ? 50 : 0);
        let pts = 100 + comboBonus;
        score += pts;
        stress = Math.max(0, stress - 2);
        playSound('hit');
        triggerShake(7, 5);
        addParticles(cx, cy, currentTheme.primary, 14);
        addFloatText(cx, cy, `+${pts}`, "#ffea00");
        addImpactBurst(cx, cy, combo > 3 ? "CRITICAL!" : "PUNCH!", currentTheme.primary);
    }
}

function addParticles(x, y, color, count = 12) {
    for (let i = 0; i < count; i++) {
        let angle = Math.random() * Math.PI * 2;
        let spd = 2 + Math.random() * 6;
        particles.push({
            x, y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            life: 18 + Math.random() * 10,
            maxLife: 28,
            color,
            size: 3 + Math.random() * 3
        });
    }
}

function addFloatText(x, y, text, color) {
    floatingTexts.push({ x, y, text, color, alpha: 1, vy: -2.0 });
}

function addImpactBurst(x, y, label, color) {
    impactBursts.push({
        x, y,
        label,
        color,
        radius: 8,
        maxRadius: 40,
        alpha: 1
    });
}

function update() {
    if (shakeTime > 0) shakeTime--;

    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
    });
    particles = particles.filter(p => p.life > 0);

    floatingTexts.forEach(ft => { ft.y += ft.vy; ft.alpha -= 0.028; });
    floatingTexts = floatingTexts.filter(ft => ft.alpha > 0);

    impactBursts.forEach(ib => {
        ib.radius += 3.8;
        ib.alpha -= 0.045;
    });
    impactBursts = impactBursts.filter(ib => ib.alpha > 0);

    gridPads.forEach(p => { if (p.pressAnim > 0) p.pressAnim--; });

    if (state !== 'PLAYING') return;

    let spawnDelay = Math.max(400, 1150 - Math.floor(elapsedMatchTime * 12));
    if (Date.now() - lastSpawnTime > spawnDelay) {
        spawnTicket();
        lastSpawnTime = Date.now();
    }

    gridPads.forEach(p => {
        if (p.active) {
            p.timer--;
            if (p.timer <= 0) {
                p.active = false;
                if (p.type === 'BAD' || p.type === 'DOUBLE') {
                    combo = 0;
                    stress = Math.min(100, stress + 7);
                    triggerShake(8, 4);
                }
            }
        }
    });
}

function drawCRTOverlay() {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  for (let y = 0; y < cvs.height; y += 3) {
    ctx.fillRect(0, y, cvs.width, 1);
  }
  ctx.restore();
}

function draw() {
    ctx.save();
    if (shakeTime > 0) {
        let sx = (Math.random() - 0.5) * shakeMag;
        let sy = (Math.random() - 0.5) * shakeMag;
        ctx.translate(sx, sy);
    }

    ctx.clearRect(0, 0, cvs.width, cvs.height);

    ctx.fillStyle = currentTheme.bg;
    ctx.fillRect(0, 0, cvs.width, cvs.height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx < cvs.width; gx += 16) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, cvs.height); ctx.stroke();
    }
    for (let gy = 0; gy < cvs.height; gy += 16) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(cvs.width, gy); ctx.stroke();
    }

    const W = cvs.width, H = cvs.height;

    // --- COPERTINA ---
    if (state === 'COVER') {
        if (ASSETS.COVER && ASSETS.COVER.complete && ASSETS.COVER.naturalWidth !== 0) {
            ctx.drawImage(ASSETS.COVER, 0, 0, W, H);
        } else {
            ctx.fillStyle = '#080810'; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = '#ffea00'; ctx.font = '900 32px Courier New'; ctx.textAlign = 'center';
            ctx.fillText('PIXEL PUNCH', W / 2, 200);
            ctx.fillStyle = '#ff0055'; ctx.font = '900 18px Courier New';
            ctx.fillText('REVISION KILLER', W / 2, 235);
        }

        draw80sBox(ctx, 20, H - 75, W - 40, 48, '#ffea00', '#101020', 3);
        if (Math.floor(frame / 35) % 2 === 0) {
            ctx.fillStyle = '#ffea00'; ctx.font = '900 16px Courier New'; ctx.textAlign = 'center';
            ctx.fillText('★ PRESS START TO PLAY ★', W / 2, H - 46);
        }
        drawCRTOverlay();
        ctx.restore();
        return;
    }

    // --- STORIA (MISSION BRIEFING ESTESO A TUTTO SCHERMO) ---
    if (state === 'STORY') {
        draw80sBox(ctx, 6, 6, W - 12, H - 12, '#00ffff', '#0b0b1e', 3);

        ctx.fillStyle = '#ffea00'; ctx.font = '900 24px Courier New'; ctx.textAlign = 'center';
        ctx.fillText('★ MISSION BRIEFING ★', W / 2, 42);

        ctx.fillStyle = '#ff0055'; ctx.font = '900 16px Courier New'; ctx.textAlign = 'center';
        ctx.fillText('IRIS, CRISTINA & RACHELE:', W / 2, 74);
        ctx.fillText('LE INARRESTABILI PRODUCER', W / 2, 96);

        draw80sBox(ctx, 16, 116, W - 32, 210, '#00ffff', '#0e1630', 3);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 15px Courier New'; ctx.textAlign = 'center';
        ctx.fillText('⚡ L\'Agenzia è sotto attacco!', W / 2, 145);
        ctx.font = 'bold 14px Courier New';
        ctx.fillText('I clienti inviano mail furiose:', W / 2, 172);
        ctx.fillText('"Logo più grande!", "Lavoro ieri!"', W / 2, 196);
        ctx.fillText('"Fallo verde!", "Urgente ASAP!"', W / 2, 220);
        ctx.fillStyle = '#ffea00'; ctx.font = '900 14px Courier New';
        ctx.fillText('Lo stress sta per raggiungere', W / 2, 256);
        ctx.fillText('il 100% di BURNOUT FATALE!', W / 2, 280);

        draw80sBox(ctx, 16, 340, W - 32, 210, '#ff0055', '#1e0818', 3);
        ctx.fillStyle = '#00ffff'; ctx.font = '900 16px Courier New'; ctx.textAlign = 'center';
        ctx.fillText('🎯 IL TUO COMPITO:', W / 2, 370);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px Courier New';
        ctx.fillText('Distruggi i ticket pendenti,', W / 2, 405);
        ctx.fillText('schiva le trappole dei clienti', W / 2, 435);
        ctx.fillText('e salva la consegna dal crash!', W / 2, 465);

        draw80sBox(ctx, 20, H - 68, W - 40, 50, '#ffea00', '#181028', 3);
        if (Math.floor(frame / 35) % 2 === 0) {
            ctx.fillStyle = '#ffea00'; ctx.font = '900 16px Courier New'; ctx.textAlign = 'center';
            ctx.fillText('PREMI PER CONTINUARE ►', W / 2, H - 38);
        }
        drawCRTOverlay();
        ctx.restore();
        return;
    }

    // --- REGOLE (PERFETTAMENTE CENTRATE E SENZA EMOJI NEI TITOLI) ---
    if (state === 'RULES') {
        draw80sBox(ctx, 6, 6, W - 12, H - 12, '#ffea00', '#0c0c1a', 3);

        ctx.fillStyle = '#ffea00'; ctx.font = '900 24px Courier New'; ctx.textAlign = 'center';
        ctx.fillText('★ HOW TO PLAY ★', W / 2, 42);

        // BOX 1: EVITA IL BURNOUT
        draw80sBox(ctx, 16, 58, W - 32, 95, '#ff0055', '#180a18', 2);
        ctx.fillStyle = '#ff0055'; ctx.font = '900 15px Courier New'; ctx.textAlign = 'center';
        ctx.fillText('1. EVITA IL BURNOUT!', W / 2, 80);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px Courier New'; ctx.textAlign = 'center';
        ctx.fillText('Colpisci i ticket prima che scadano.', W / 2, 104);
        ctx.fillStyle = '#ffea00'; ctx.font = '900 13px Courier New'; ctx.textAlign = 'center';
        ctx.fillText('STRESS al 100% = GAME OVER!', W / 2, 128);

        // BOX 2: TICKET & POTENZIAMENTI
        draw80sBox(ctx, 16, 162, W - 32, 220, '#00ffff', '#0a1628', 2);
        ctx.fillStyle = '#00ffff'; ctx.font = '900 15px Courier New'; ctx.textAlign = 'center';
        ctx.fillText('2. TIPOLOGIE DI TICKET', W / 2, 186);

        let items = [
            { label: '🔴 ROSSI (1 Tap)', desc: '+100 PTS', col: '#ff0055' },
            { label: '🟣 VIOLA (2 Tap)', desc: '+250 PTS', col: '#d000ff' },
            { label: '☕ CAFFÈ', desc: '+300 PTS & -STRESS', col: '#ffea00' },
            { label: '🌟 VIP', desc: '+500 PTS & -STRESS', col: '#ffaa00' },
            { label: '🌴 FERIE', desc: 'Pausa & -20% STRESS', col: '#00ffff' }
        ];

        let lineY = 216;
        items.forEach(it => {
            ctx.fillStyle = it.col; ctx.font = '900 12px Courier New'; ctx.textAlign = 'center';
            ctx.fillText(`${it.label} ► ${it.desc}`, W / 2, lineY);
            lineY += 28;
        });

        // BOX 3: TRAPPOLE
        draw80sBox(ctx, 16, 392, W - 32, 160, '#ff0055', '#1a0810', 2);
        ctx.fillStyle = '#ff0055'; ctx.font = '900 15px Courier New'; ctx.textAlign = 'center';
        ctx.fillText('3. TRAPPOLE DA EVITARE!', W / 2, 416);

        ctx.fillStyle = '#00ff66'; ctx.font = '900 13px Courier New'; ctx.textAlign = 'center';
        ctx.fillText('🟢 VERDE (APPROVATO)', W / 2, 444);
        ctx.fillStyle = '#ff5577'; ctx.font = '900 13px Courier New'; ctx.textAlign = 'center';
        ctx.fillText('🖤 NERO (FILE CORROTTO)', W / 2, 472);

        ctx.fillStyle = '#ff0055'; ctx.font = '900 12px Courier New'; ctx.textAlign = 'center';
        ctx.fillText('NON TOCARLI: +12% STRESS!', W / 2, 502);

        // PULSANTE AZIONE INFERIORE
        draw80sBox(ctx, 20, H - 68, W - 40, 50, '#ffea00', '#101020', 3);
        if (Math.floor(frame / 35) % 2 === 0) {
            ctx.fillStyle = '#ffea00'; ctx.font = '900 16px Courier New'; ctx.textAlign = 'center';
            ctx.fillText('PREMI PER CONTINUARE ►', W / 2, H - 38);
        }
        drawCRTOverlay();
        ctx.restore();
        return;
    }

    // --- SELEZIONE PERSONAGGIO (CREATIVO: "SCEGLI PRODUCER") ---
    if (state === 'CHAR_SELECT') {
        let key = charList[charSelectIndex];
        let c = CHARACTERS[key];

        draw80sBox(ctx, 6, 6, W - 12, H - 12, c.primary, '#0c0c1a', 4);

        ctx.fillStyle = '#ffea00'; ctx.font = '900 22px Courier New'; ctx.textAlign = 'center';
        ctx.fillText('★ SCEGLI PRODUCER ★', W / 2, 42);

        let frameX = W / 2 - 85;
        let frameY = 62;
        let frameW = 170;
        let frameH = 170;

        draw80sBox(ctx, frameX, frameY, frameW, frameH, c.primary, '#101020', 3);

        if (c.img && c.img.complete && c.img.naturalWidth > 0) {
            ctx.save();
            ctx.beginPath();
            ctx.rect(frameX + 3, frameY + 3, frameW - 6, frameH - 6);
            ctx.clip();
            drawImageCover(ctx, c.img, frameX + 3, frameY + 3, frameW - 6, frameH - 6);
            ctx.restore();
        }

        ctx.fillStyle = c.primary; ctx.font = '900 28px Courier New'; ctx.textAlign = 'center';
        ctx.fillText(c.name, W / 2, 255);

        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 15px Courier New'; ctx.textAlign = 'center';
        ctx.fillText(c.subtitle, W / 2, 280);

        draw80sBox(ctx, 16, 302, W - 32, 240, '#333355', '#141428', 3);

        ctx.fillStyle = '#ffea00'; ctx.font = '900 18px Courier New'; ctx.textAlign = 'center';
        ctx.fillText(c.perkBonusTitle, W / 2, 335);

        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 14px Courier New'; ctx.textAlign = 'center';
        ctx.fillText(c.perkBonusDesc, W / 2, 365);

        ctx.fillStyle = '#00ffff'; ctx.font = 'bold 14px Courier New'; ctx.textAlign = 'center';
        ctx.fillText(`Ferie Speciali: ${c.ferieSec}s Relax`, W / 2, 400);

        ctx.fillStyle = '#ffea00'; ctx.font = 'bold 14px Courier New'; ctx.textAlign = 'center';
        ctx.fillText(`Moltiplicatore Punti: x${c.scoreMult || 1.0}`, W / 2, 430);

        ctx.fillStyle = '#ffea00'; ctx.font = '900 42px Courier New'; ctx.textAlign = 'center';
        ctx.fillText('◄', 30, 145);
        ctx.fillText('►', W - 30, 145);

        draw80sBox(ctx, 20, H - 68, W - 40, 50, c.primary, '#101020', 3);
        if (Math.floor(frame / 35) % 2 === 0) {
            ctx.fillStyle = c.primary; ctx.font = '900 16px Courier New'; ctx.textAlign = 'center';
            ctx.fillText('INIZIA PARTITA ►', W / 2, H - 38);
        }
        drawCRTOverlay();
        ctx.restore();
        return;
    }

    // --- GRIGLIA GIOCO 3x3 INGRANDITA ---
    gridPads.forEach(p => {
        let padX = p.x;
        let padY = p.y + (p.pressAnim > 0 ? 4 : 0);

        draw80sBox(ctx, padX, padY, p.w, p.h, p.active ? '#ffffff' : '#28283c', currentTheme.padBg, 3);

        ctx.fillStyle = '#00ffff';
        ctx.font = '900 12px Courier New'; ctx.textAlign = 'left';
        ctx.fillText(p.keyLabel, padX + 8, padY + 18);

        if (p.active) {
            let bgCol = '#ff0055';

            if (p.type === 'FERIE') { bgCol = '#00ffff'; }
            else if (p.type === 'TRAP') { bgCol = '#00ff66'; }
            else if (p.type === 'GLITCH') { bgCol = '#1a0008'; }
            else if (p.type === 'COFFEE') { bgCol = '#ffea00'; }
            else if (p.type === 'GOLDEN') { bgCol = '#ffaa00'; }
            else if (p.type === 'DOUBLE') { bgCol = '#d000ff'; }

            draw80sBox(ctx, padX + 4, padY + 24, p.w - 8, p.h - 28, '#ffffff', bgCol, 2);

            let timerPct = p.timer / p.maxTimer;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(padX + 5, padY + p.h - 8, (p.w - 10) * (1 - timerPct), 4);

            // Scritte BIANCHE ingrandite a 16px con bordo leggero per massima visibilità
            ctx.save();
            ctx.font = '900 16px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2.5;
            ctx.fillStyle = '#ffffff';

            ctx.strokeText(p.line1, padX + p.w / 2, padY + 75);
            ctx.fillText(p.line1, padX + p.w / 2, padY + 75);

            ctx.strokeText(p.line2, padX + p.w / 2, padY + 102);
            ctx.fillText(p.line2, padX + p.w / 2, padY + 102);
            ctx.restore();
        }
    });

    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
    });

    impactBursts.forEach(ib => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ib.alpha);
        ctx.strokeStyle = ib.color;
        ctx.lineWidth = 3;
        ctx.strokeRect(ib.x - ib.radius, ib.y - ib.radius, ib.radius * 2, ib.radius * 2);

        ctx.fillStyle = ib.color;
        ctx.font = '900 14px Courier New'; ctx.textAlign = 'center';
        ctx.fillText(ib.label, ib.x, ib.y - ib.radius - 4);
        ctx.restore();
    });

    floatingTexts.forEach(ft => {
        ctx.save(); ctx.globalAlpha = Math.max(0, ft.alpha); ctx.fillStyle = ft.color;
        ctx.font = '900 14px Courier New'; ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y); ctx.restore();
    });

    if (ferieActive) {
        draw80sBox(ctx, 30, 240, 360, 75, '#ffffff', '#00ffff', 3);
        ctx.fillStyle = '#000000'; ctx.font = '900 18px Courier New'; ctx.textAlign = 'center';
        ctx.fillText('🌴 VACATION RELAX! 🌴', cvs.width / 2, 272);
        ctx.font = 'bold 14px Courier New';
        ctx.fillText(`PAUSA REVISIONI (${ferieTimer}s)`, cvs.width / 2, 296);
    }

    draw80sBox(ctx, 0, 0, cvs.width, 80, currentTheme.primary, '#080816', 3);

    ctx.fillStyle = currentTheme.primary; ctx.font = '900 14px Courier New'; ctx.textAlign = 'left';
    ctx.fillText(`1P: ${currentTheme.name}`, 10, 20);
    ctx.fillStyle = '#ffea00'; ctx.font = '900 14px Courier New';
    ctx.fillText(`SCORE: ${score}`, 10, 38);
    ctx.fillStyle = '#00ffff'; ctx.font = 'bold 11px Courier New';
    ctx.fillText(`HIGH: ${highScore}`, 10, 52);

    if (combo > 1) {
        ctx.fillStyle = '#00ffff'; ctx.font = '900 14px Courier New'; ctx.textAlign = 'right';
        ctx.fillText(`COMBO x${combo}!`, cvs.width - 10, 20);
    }

    let stressWidth = 400;
    let stressX = 10;
    let stressY = 56;
    ctx.fillStyle = '#04040a';
    ctx.fillRect(stressX, stressY, stressWidth, 18);

    let currentStressPct = Math.min(100, Math.max(0, stress)) / 100;

    let totalSegments = 20;
    let filledSegments = Math.floor(totalSegments * currentStressPct);
    let segWidth = (stressWidth - 4) / totalSegments;

    for (let s = 0; s < totalSegments; s++) {
        if (s < filledSegments) {
            ctx.fillStyle = s > 15 ? '#ff0055' : (s > 8 ? '#ffea00' : '#00ff66');
            if (currentStressPct >= 0.75 && Math.floor(frame / 12) % 2 === 0) ctx.fillStyle = '#ffffff';
            ctx.fillRect(stressX + 2 + (s * segWidth), stressY + 2, segWidth - 2, 14);
        } else {
            ctx.fillStyle = '#141424';
            ctx.fillRect(stressX + 2 + (s * segWidth), stressY + 2, segWidth - 2, 14);
        }
    }

    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
    ctx.strokeRect(stressX, stressY, stressWidth, 18);

    ctx.fillStyle = '#ffffff'; ctx.font = '900 11px Courier New'; ctx.textAlign = 'center';
    let stressStatusLabel = currentStressPct >= 0.75 ? '⚠️ WARNING: OVERHEAT!' : `STRESS GAUGE: ${Math.floor(stress)}%`;
    ctx.fillText(stressStatusLabel, cvs.width / 2, stressY + 13);

    if (state === 'PAUSE') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'; ctx.fillRect(0, 0, cvs.width, cvs.height);
        draw80sBox(ctx, 40, cvs.height / 2 - 40, cvs.width - 80, 80, '#ffea00', '#0c0c18', 3);
        ctx.fillStyle = '#ffea00'; ctx.font = '900 24px Courier New'; ctx.textAlign = 'center';
        ctx.fillText('PAUSE', cvs.width / 2, cvs.height / 2 - 10);
        ctx.fillStyle = '#00ffff'; ctx.font = 'bold 12px Courier New';
        ctx.fillText('TOCCA PER RIPRENDERE', cvs.width / 2, cvs.height / 2 + 15);
    }

    if (state === 'GAMEOVER') {
        ctx.fillStyle = 'rgba(4, 4, 12, 0.95)'; ctx.fillRect(0, 0, cvs.width, cvs.height);

        draw80sBox(ctx, 20, cvs.height / 2 - 110, cvs.width - 40, 220, '#ff0055', '#0c0c18', 4);

        ctx.fillStyle = '#ff0055'; ctx.font = '900 28px Courier New'; ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', cvs.width / 2, cvs.height / 2 - 70);

        ctx.fillStyle = '#ffea00'; ctx.font = '900 18px Courier New';
        ctx.fillText(`SCORE: ${score}`, cvs.width / 2, cvs.height / 2 - 25);

        if (isNewRecord) {
            ctx.fillStyle = '#00ff66'; ctx.font = '900 16px Courier New';
            ctx.fillText('★ NEW HIGH SCORE! ★', cvs.width / 2, cvs.height / 2 + 10);
        } else {
            ctx.fillStyle = '#8888aa'; ctx.font = 'bold 13px Courier New';
            ctx.fillText(`BEST RECORD: ${highScore}`, cvs.width / 2, cvs.height / 2 + 10);
        }

        if (Math.floor(frame / 30) % 2 === 0) {
            ctx.fillStyle = '#ffffff'; ctx.font = '900 15px Courier New';
            ctx.fillText('PRESS TO CONTINUE', cvs.width / 2, cvs.height / 2 + 65);
        }
    }

    drawCRTOverlay();
    ctx.restore();
}

function advanceMenuState() {
    getAC();
    if (state === 'COVER') {
        state = 'STORY';
    } else if (state === 'STORY') {
        state = 'RULES';
    } else if (state === 'RULES') {
        state = 'CHAR_SELECT';
    } else if (state === 'CHAR_SELECT') {
        selectCharacter(charList[charSelectIndex || 0]);
    } else if (state === 'GAMEOVER') {
        state = 'CHAR_SELECT';
    }
}

cvs.addEventListener('pointerdown', (e) => {
    getAC();
    let rect = cvs.getBoundingClientRect();
    let x = (e.clientX - rect.left) * (cvs.width / rect.width);
    let y = (e.clientY - rect.top) * (cvs.height / rect.height);

    if (['COVER', 'STORY', 'RULES'].includes(state)) {
        advanceMenuState();
        return;
    }

    if (state === 'CHAR_SELECT') {
        if (x < 60) {
            charSelectIndex = (charSelectIndex - 1 + 3) % 3;
            return;
        }
        if (x > cvs.width - 60) {
            charSelectIndex = (charSelectIndex + 1) % 3;
            return;
        }
        advanceMenuState();
        return;
    }

    if (state === 'PLAYING') {
        let hitAny = false;
        gridPads.forEach(p => {
            if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) {
                hitPad(p);
                hitAny = true;
            }
        });
        if (!hitAny && y < 80) {
            state = 'PAUSE';
        }
        return;
    }

    if (state === 'PAUSE') {
        state = 'PLAYING';
        return;
    }

    if (state === 'GAMEOVER') {
        state = 'CHAR_SELECT';
        return;
    }
});

const KEY_MAP = {
    '1': 0, 'q': 0, 'Q': 0, 'Numpad7': 0,
    '2': 1, 'w': 1, 'W': 1, 'Numpad8': 1,
    '3': 2, 'e': 2, 'E': 2, 'Numpad9': 2,

    '4': 3, 'a': 3, 'A': 3, 'Numpad4': 3,
    '5': 4, 's': 4, 'S': 4, 'Numpad5': 4,
    '6': 5, 'd': 5, 'D': 5, 'Numpad6': 5,

    '7': 6, 'z': 6, 'Z': 6, 'Numpad1': 6,
    '8': 7, 'x': 7, 'X': 7, 'Numpad2': 7,
    '9': 8, 'c': 8, 'C': 8, 'Numpad3': 8
};

window.addEventListener('keydown', (e) => {
    getAC();
    if (['COVER', 'STORY', 'RULES'].includes(state)) {
        if (e.code === 'Space' || e.code === 'Enter') advanceMenuState();
        return;
    }

    if (state === 'CHAR_SELECT') {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') charSelectIndex = (charSelectIndex - 1 + 3) % 3;
        if (e.code === 'ArrowRight' || e.code === 'KeyD') charSelectIndex = (charSelectIndex + 1) % 3;
        if (e.code === 'Space' || e.code === 'Enter') advanceMenuState();
        return;
    }

    if (state === 'GAMEOVER') {
        if (e.code === 'Space' || e.code === 'Enter') state = 'CHAR_SELECT';
        return;
    }

    let padIndex = KEY_MAP[e.key] !== undefined ? KEY_MAP[e.key] : KEY_MAP[e.code];
    if (padIndex !== undefined && gridPads[padIndex] && state === 'PLAYING') {
        hitPad(gridPads[padIndex]);
    }
});

async function saveScore() {
    if (scoreSavedForCurrentGame) return;
    scoreSavedForCurrentGame = true;

    try {
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('pixelPunch_highScore', highScore.toString());
            isNewRecord = true;
        } else {
            isNewRecord = false;
        }

        if (score <= 0) return;
        let rawUser = localStorage.getItem('arcade_current_user');
        if (!rawUser) return;
        const u = JSON.parse(rawUser);
        await ArcadeScoreManager.saveGameScore({
            client: supabaseClient,
            currentUser: u,
            gameKey: 'pixelPunch',
            score
        });
    } catch(e) {
        console.warn("Errore salvataggio punteggio:", e);
    }
}

async function exitGame() {
    if (gameTimerInterval) clearInterval(gameTimerInterval);
    try {
        await saveScore();
    } catch (e) {
        console.warn("Errore durante il salvataggio score:", e);
    } finally {
        ArcadeGameShell.navigateToHub();
    }
}

function loop() {
    frame++;
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
