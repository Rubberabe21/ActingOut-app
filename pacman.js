const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const COLS = 13, ROWS = 15, CELL_SIZE = 26, HUD_HEIGHT = 44;
const CANVAS_W = COLS * CELL_SIZE;
const CANVAS_H = ROWS * CELL_SIZE + HUD_HEIGHT;
canvas.width = CANVAS_W; canvas.height = CANVAS_H;

let joySensitivity = parseFloat(localStorage.getItem('cyberRun_joySens')) || 1.0;

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
const vsRoomInput = document.getElementById('vsRoomInput');

vsRoomInput.addEventListener('input', () => {
  vsRoomInput.value = vsRoomInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  vsRoomCode = vsRoomInput.value;
});

window.addEventListener('beforeunload', () => {
  if (vsChannel && supabaseClient) supabaseClient.removeChannel(vsChannel);
});

sensSlider.value = joySensitivity;
sensValText.innerText = joySensitivity.toFixed(2) + 'x';
const renderOptionButtons = ArcadeGameShell.bindAudioOptions(btnToggleMusic, btnToggleSfx);

sensSlider.oninput = () => {
  joySensitivity = parseFloat(sensSlider.value);
  sensValText.innerText = joySensitivity.toFixed(2) + 'x';
  localStorage.setItem('cyberRun_joySens', joySensitivity);
};

btnOpenSettings.onclick = () => {
  if (state === 'playing') state = 'PAUSE';
  renderOptionButtons();
  ArcadeGameShell.showModal(settingsModal);
};

btnCloseSettings.onclick = () => {
  ArcadeGameShell.hideModal(settingsModal);
  getAC();
  if (state === 'PAUSE') state = 'playing';
};

ArcadeGameShell.bindModalTransition(btnOpenRules, settingsModal, rulesModal);
ArcadeGameShell.bindModalTransition(btnCloseRules, rulesModal, settingsModal);
ArcadeGameShell.bindModalTransition(btnOpenPerks, settingsModal, perksModal);
ArcadeGameShell.bindModalTransition(btnClosePerks, perksModal, settingsModal);

btnMenuTop.onclick = () => {
  getAC();
  if (gameMode === 'vs') leaveVSRoom();
  bombs = []; explosions = []; powerups = []; enemies = [];
  gameMode = 'story'; state = 'COVER';
};

btnExitTop.onclick = async () => {
  getAC();
  if (gameMode === 'vs') { await leaveVSRoom(); ArcadeGameShell.navigateToHub(); }
  else { await exitGame(score); }
};

// ASSETS PNG
const ASSETS = {
  COVER: new Image(), LAURA: new Image(), GUIDO: new Image(),
  MOV_LAURA: new Image(), MOV_GUIDO: new Image(),
  VS_SPRITES: { LAURA: {}, GUIDO: {} },
  BOMBA: new Image(), FUOCO: new Image(), SCARPA: new Image(), CAFFE: new Image(), CUORE: new Image(),
  MOSTRI: [], BOSSI: []
};

ASSETS.COVER.src = 'assets/pacman/copertina.png';
ASSETS.LAURA.src = 'assets/pacman/laura.png';
ASSETS.GUIDO.src = 'assets/pacman/guido.png';
ASSETS.MOV_LAURA.src = 'assets/pacman/mov-laura.png';
ASSETS.MOV_GUIDO.src = 'assets/pacman/mov-guido.png';

['red', 'yellow', 'blue', 'green'].forEach(color => {
  const lImg = new Image(); lImg.src = `assets/pacman/laura ${color}.png`;
  ASSETS.VS_SPRITES.LAURA[color] = lImg;
  const gImg = new Image(); gImg.src = `assets/pacman/guido ${color}.png`;
  ASSETS.VS_SPRITES.GUIDO[color] = gImg;
});

ASSETS.BOMBA.src = 'assets/pacman/bomba.png';
ASSETS.FUOCO.src = 'assets/pacman/fuoco.png';
ASSETS.SCARPA.src = 'assets/pacman/scarpa.png';
ASSETS.CAFFE.src = 'assets/pacman/caffe.png';
ASSETS.CUORE.src = 'assets/pacman/cuore.png';

for (let i = 1; i <= 5; i++) {
  const imgM = new Image(); imgM.src = `assets/pacman/mostro${i}.png`; ASSETS.MOSTRI[i] = imgM;
  const imgB = new Image(); imgB.src = `assets/pacman/boss${i}.png`; ASSETS.BOSSI[i] = imgB;
}

function drawCrispText(text, x, y, font, color, align = 'center', strokeColor = '#000000', strokeWidth = 3) {
  ctx.save();
  ctx.font = font; ctx.textAlign = align; ctx.textBaseline = 'middle';
  let rx = Math.round(x), ry = Math.round(y);
  if (strokeColor) { ctx.strokeStyle = strokeColor; ctx.lineWidth = strokeWidth; ctx.strokeText(text, rx, ry); }
  ctx.fillStyle = color; ctx.fillText(text, rx, ry);
  ctx.restore();
}

const ERAS_INFO = [
  { era: 1, name: "ERA 1: GLITCH .GIF", monster: "Glitch .GIF", boss: "MEGA GIF CORROTTO", colBase: "#ff007f", colTough: "#ffaa00", filterTough: "hue-rotate(60deg) saturate(200%)", storyEra: ["I vecchi raster animati sono impazziti!", "I file .GIF corrotti mutano nel server.", "Pulisci la cartella prima della consegna!"], storyBoss: ["Un Loop Infinito blocca il rendering!", "La bozza gigante resiste a 10 colpi.", "Patrolling lineare continuo ad alta stabilità!"] },
  { era: 2, name: "ERA 2: BUG 404", monster: "Bug 404", boss: "KERNEL PANIC 404", colBase: "#ff0033", colTough: "#aa00ff", filterTough: "hue-rotate(270deg) saturate(250%)", storyEra: ["I collegamenti dei layout si sono spezzati!", "I Bug 404 rimbalzano all'impazzata.", "Elimina le varianti viola corazzate!"], storyBoss: ["Kernel Panic! Schermata blu imminente.", "Spazza via i blocchi corrotti al suo passaggio!", "Supera ogni ostacolo per travolgerti!"] },
  { era: 3, name: "ERA 3: FONT MANCANTE", monster: "Font Mancante [?]", boss: "MUSEO TOFU SCOMPARSO", colBase: "#00f0ff", colTough: "#00ff66", filterTough: "hue-rotate(120deg) saturate(200%)", storyEra: ["I font del cliente sono scomparsi!", "Caratteri fantasma vagano tra i file.", "Elimina i Tofu verdi a doppio colpo!"], storyBoss: ["Il blocco Tofu vuoto e gigante è qui!", "Esegue scatti improvvisi e cariche rapide!", "Fallo saltare prima della stampa!"] },
  { era: 4, name: "ERA 4: RAM EATER", monster: "Ram Eater", boss: "SPINNING WHEEL OF DEATH", colBase: "#ffea00", colTough: "#ff0055", filterTough: "hue-rotate(300deg) saturate(220%)", storyEra: ["La RAM della workstation è al 99%!", "Le rotelline ti inseguono nel server.", "I Ram Eater rossi sono ultra-veloci!"], storyBoss: ["La Girandola congelante ti punta costantemente!", "Cerca la coordinata del grafico sul canvas.", "Non fermarti mai per non farti intrappolare!"] },
  { era: 5, name: "ERA 5: CRASH NON SALVATO", monster: "Crash Non Salvato", boss: "THE DEADLINE CRASH 00:00", colBase: "#00ff66", colTough: "#ff0000", filterTough: "hue-rotate(180deg) saturate(300%)", storyEra: ["Mancano pochi minuti alle 18:30!", "File non salvati corrono nel sistema.", "Cancella il caos pre-consegna!"], storyBoss: ["Il timer segna 00:00! Crash Finale Ultra!", "Velocità folle e inseguimento spietato.", "Usa ogni Command-Z e salva lo studio!"] }
];

const CHARACTERS = {
  LAURA: { id: 'LAURA', name: "LAURA", role: "Senior Graphic Designer", perkBonusTitle: "BONUS: Controllo Multi-Gomma", perkBonusDesc: "2 Bombe Simultanee (Frequenza +)", perkMalusTitle: "MALUS: Raggio Contenuto", perkMalusDesc: "Potenza Esplosione Base (Liv. 1)", primary: "#00ffcc", wallCol: "#00aaff", portrait: ASSETS.LAURA, movImg: ASSETS.MOV_LAURA, speed: 2.2, baseBombs: 2, baseRange: 1, scoreMult: 1.0 },
  GUIDO: { id: 'GUIDO', name: "GUIDO", role: "Junior Graphic Designer", perkBonusTitle: "BONUS: Super Warp Brush", perkBonusDesc: "Esplosione Potenziata (Raggio Liv. 2)", perkMalusTitle: "MALUS: Singola Bozza", perkMalusDesc: "1 Sola Gomma Simultanea", primary: "#ffd700", wallCol: "#ffaa00", portrait: ASSETS.GUIDO, movImg: ASSETS.MOV_GUIDO, speed: 2.5, baseBombs: 1, baseRange: 2, scoreMult: 1.15 }
};

const charList = ['LAURA', 'GUIDO'];
let charSelectIndex = 0;
let currentBoss = CHARACTERS.LAURA;
let scoreSavedForCurrentGame = false;

const FILE_BLOCK_TYPES = [
  { key: 'JPG', label: '.JPG', hp: 1, bg: '#1c2838', border: '#2a6090', textCol: '#88c0ff', pts: 20, dropChance: 0.18 },
  { key: 'PNG', label: '.PNG', hp: 1, bg: '#103028', border: '#108050', textCol: '#00ffaa', pts: 30, dropChance: 0.22 },
  { key: 'PSD', label: '.PSD', hp: 2, bg: '#141848', border: '#0055ff', textCol: '#3388ff', pts: 60, dropChance: 0.35 },
  { key: 'AI',  label: '.AI',  hp: 2, bg: '#381800', border: '#ff8800', textCol: '#ffaa00', pts: 80, dropChance: 0.40 },
  { key: 'PDF', label: '.PDF', hp: 3, bg: '#380008', border: '#ff0044', textCol: '#ff5577', pts: 120, dropChance: 0.55 }
];

const STORY_SAVE_KEY = 'cyberRun_storySave';

function getStorySave() {
  const rawSave = localStorage.getItem(STORY_SAVE_KEY);
  if (!rawSave) return null;
  try {
    const saved = JSON.parse(rawSave);
    if (!Number.isInteger(saved.level) || saved.level < 1 || saved.level > 50 ||
        !Number.isFinite(saved.score) || !Number.isInteger(saved.lives) || saved.lives <= 0 ||
        !Number.isInteger(saved.currentEraIndex) || !['LAURA', 'GUIDO'].includes(saved.currentBoss) ||
        !saved.playerStats) return null;
    return saved;
  } catch (_) { return null; }
}

function saveStoryProgress() {
  if (gameMode !== 'story' || lives <= 0 || level > 50) return;
  localStorage.setItem(STORY_SAVE_KEY, JSON.stringify({
    level, score, lives, currentBoss: currentBoss.id,
    playerStats: { maxBombs: player.maxBombs, bombRange: player.bombRange, speed: player.speed },
    currentEraIndex
  }));
}

function deleteStorySave() { localStorage.removeItem(STORY_SAVE_KEY); }

function getModeMenuOptions() {
  const options = getStorySave()
    ? [{ action: 'continue', label: 'CONTINUA STORIA', color: '#00ffcc' }, { action: 'new', label: 'NUOVA STORIA', color: '#ffea00' }]
    : [{ action: 'new', label: 'NUOVA STORIA', color: '#ffea00' }];
  options.push({ action: 'vs', label: 'MULTIPLAYER VS', color: '#ff0055' });
  return options;
}

function startNewStoryFlow() {
  if (getStorySave() && !window.confirm('Vuoi iniziare una nuova storia? Il salvataggio attuale verrà cancellato.')) return;
  deleteStorySave(); gameMode = 'story'; state = 'STORY';
}

function continueStory() {
  const saved = getStorySave();
  if (!saved) { modeMenuIndex = 0; return; }
  gameMode = 'story'; currentBoss = CHARACTERS[saved.currentBoss];
  charSelectIndex = charList.indexOf(saved.currentBoss);
  level = saved.level; score = saved.score; lives = saved.lives; currentEraIndex = saved.currentEraIndex;
  loadLevel({ skipStorySave: true });
  player.maxBombs = saved.playerStats.maxBombs;
  player.bombRange = saved.playerStats.bombRange;
  player.speed = saved.playerStats.speed;
  canvas.style.borderColor = currentBoss.primary;
  saveStoryProgress(); state = 'ERA_INTRO';
}

function saveStoryAndExit() {
  saveStoryProgress(); bombs = []; explosions = []; powerups = []; enemies = [];
  modeMenuIndex = 0; state = 'MODE_SELECT';
}

// MULTIPLAYER VS
const VS_SLOTS = [
  { color: 'red', label: 'ROSSO', corner: 'ALTO SX', gx: 1, gy: 1, hex: '#ff3344' },
  { color: 'yellow', label: 'GIALLO', corner: 'ALTO DX', gx: COLS - 2, gy: 1, hex: '#ffea00' },
  { color: 'blue', label: 'BASSO SX', gx: 1, gy: ROWS - 2, hex: '#3399ff' },
  { color: 'green', label: 'VERDE', corner: 'BASSO DX', gx: COLS - 2, gy: ROWS - 2, hex: '#20dd77' }
];

const VS_MENU_STATES = ['MODE_SELECT', 'VS_MENU', 'VS_JOIN', 'VS_LOBBY', 'VS_WINNER'];
let gameMode = 'story', modeMenuIndex = 0, vsMenuIndex = 0, vsCharacterIndex = 0;
let vsRoomCode = '', vsChannel = null;
let vsClientId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
let vsHostId = null, vsIsHost = false, vsPlayers = {}, vsLocalSlot = null, vsWinnerId = null;
let vsStatusMessage = '', vsLastMoveBroadcast = 0, vsJoinTimeout = null;

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(bytes, value => chars[value % chars.length]).join('');
}

function getArcadeUsername() {
  try {
    return JSON.parse(localStorage.getItem('arcade_current_user'))?.username || `PLAYER-${vsClientId.slice(0, 4)}`;
  } catch (_) { return `PLAYER-${vsClientId.slice(0, 4)}`; }
}

function getVSCharacterKey() { return charList[vsCharacterIndex] || 'LAURA'; }

function showVSRoomInput(show) {
  vsRoomInput.style.display = show ? 'block' : 'none';
  if (show) { vsRoomInput.value = vsRoomCode; requestAnimationFrame(() => vsRoomInput.focus()); }
  else { vsRoomInput.blur(); }
}

async function leaveVSRoom() {
  clearTimeout(vsJoinTimeout); vsJoinTimeout = null; showVSRoomInput(false);
  if (vsChannel && supabaseClient) await supabaseClient.removeChannel(vsChannel);
  vsChannel = null; vsRoomCode = ''; vsHostId = null; vsIsHost = false;
  vsPlayers = {}; vsLocalSlot = null; vsWinnerId = null; vsStatusMessage = '';
}

function sendVSEvent(event, payload) {
  if (!vsChannel) return Promise.resolve('no-channel');
  return vsChannel.send({ type: 'broadcast', event, payload: { ...payload, senderId: vsClientId } });
}

function makeVSPlayer(id, slotIndex, character, username) {
  const slot = VS_SLOTS[slotIndex];
  return {
    id, slotIndex, username, character, color: slot.color,
    x: slot.gx * CELL_SIZE + CELL_SIZE / 2, y: slot.gy * CELL_SIZE + CELL_SIZE / 2,
    facingLeft: slotIndex === 1 || slotIndex === 3, moving: false, alive: true, ready: false
  };
}

function nextAvailableVSSlot() {
  const occupied = new Set(Object.values(vsPlayers).map(i => i.slotIndex));
  return VS_SLOTS.findIndex((_, index) => !occupied.has(index));
}

function syncVSLocalPlayerFromRoster() {
  const local = vsPlayers[vsClientId]; if (!local) return;
  vsLocalSlot = local.slotIndex;
  const character = CHARACTERS[local.character] || CHARACTERS.LAURA;
  player.x = local.x; player.y = local.y; player.speed = character.speed;
  player.maxBombs = character.baseBombs; player.bombRange = character.baseRange;
  player.facingLeft = local.facingLeft; player.invTimer = 90;
}

function assignVSPlayer(request) {
  if (!vsIsHost || vsPlayers[request.senderId]) return;
  const slotIndex = nextAvailableVSSlot();
  if (slotIndex < 0) { sendVSEvent('room_full', { targetId: request.senderId }); return; }
  vsPlayers[request.senderId] = makeVSPlayer(
    request.senderId, slotIndex, request.character === 'GUIDO' ? 'GUIDO' : 'LAURA',
    String(request.username || 'PLAYER').slice(0, 12)
  );
  sendVSEvent('lobby_sync', { targetId: request.senderId, hostId: vsHostId, players: vsPlayers });
  sendVSEvent('roster_update', { hostId: vsHostId, players: vsPlayers });
}

function handleVSEvent(event, payload) {
  if (!payload || payload.senderId === vsClientId) return;
  if (event === 'join_request') assignVSPlayer(payload);
  else if (event === 'room_full' && payload.targetId === vsClientId) {
    vsStatusMessage = 'STANZA PIENA'; leaveVSRoom(); state = 'VS_JOIN'; showVSRoomInput(true);
  } else if (event === 'lobby_sync' && payload.targetId === vsClientId) {
    clearTimeout(vsJoinTimeout); vsHostId = payload.hostId; vsPlayers = payload.players || {};
    syncVSLocalPlayerFromRoster(); state = 'VS_LOBBY'; vsStatusMessage = 'CONNESSO';
  } else if (event === 'roster_update') {
    vsHostId = payload.hostId; vsPlayers = payload.players || vsPlayers; syncVSLocalPlayerFromRoster();
  } else if (event === 'player_ready') {
    const remote = vsPlayers[payload.senderId];
    if (remote) {
      remote.character = payload.character === 'GUIDO' ? 'GUIDO' : 'LAURA'; remote.ready = !!payload.ready;
      if (vsIsHost) sendVSEvent('roster_update', { hostId: vsHostId, players: vsPlayers });
    }
  } else if (event === 'game_start') applyVSGameStart(payload);
  else if (event === 'player_move' && state === 'VS_PLAYING') {
    const remote = vsPlayers[payload.senderId];
    if (remote?.alive) { remote.x = Number(payload.x); remote.y = Number(payload.y); remote.facingLeft = !!payload.facingLeft; remote.moving = !!payload.moving; }
  } else if (event === 'place_bomb' && state === 'VS_PLAYING') addVSBomb(payload);
  else if (event === 'bomb_explode' && state === 'VS_PLAYING') explodeVSBomb(payload.bombId, payload.cells);
  else if (event === 'player_hit') eliminateVSPlayer(payload.playerId, payload.attackerId);
  else if (event === 'winner') finishVSGame(payload.winnerId || null);
}

async function connectVSRoom(code, host) {
  if (!supabaseClient) { vsStatusMessage = 'SUPABASE NON DISPONIBILE'; return; }
  await leaveVSRoom();
  vsRoomCode = code.toUpperCase(); vsIsHost = host; vsHostId = host ? vsClientId : null;
  vsChannel = supabaseClient.channel(`room_${vsRoomCode}`, { config: { broadcast: { self: false }, presence: { key: vsClientId } } });

  ['join_request', 'room_full', 'lobby_sync', 'roster_update', 'player_ready', 'game_start', 'player_move', 'place_bomb', 'bomb_explode', 'player_hit', 'winner']
    .forEach(ev => vsChannel.on('broadcast', { event: ev }, ({ payload }) => handleVSEvent(ev, payload)));

  vsChannel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
    leftPresences.forEach(presence => {
      if (presence.clientId && vsPlayers[presence.clientId]) {
        vsPlayers[presence.clientId].alive = false;
        if (state === 'VS_PLAYING') checkVSWinner();
      }
    });
  });

  vsChannel.subscribe(async status => {
    if (status !== 'SUBSCRIBED') return;
    await vsChannel.track({ clientId: vsClientId, username: getArcadeUsername() });
    if (host) {
      vsPlayers = { [vsClientId]: makeVSPlayer(vsClientId, 0, getVSCharacterKey(), getArcadeUsername()) };
      vsLocalSlot = 0; state = 'VS_LOBBY'; vsStatusMessage = 'STANZA CREATA';
    } else {
      vsStatusMessage = 'CONNESSIONE...';
      let attempts = 0;
      const requestJoin = () => {
        if (vsPlayers[vsClientId] || attempts >= 5) {
          if (!vsPlayers[vsClientId]) vsStatusMessage = 'STANZA NON TROVATA';
          return;
        }
        attempts++;
        sendVSEvent('join_request', { character: getVSCharacterKey(), username: getArcadeUsername() });
        vsJoinTimeout = setTimeout(requestJoin, 1000);
      };
      requestJoin();
    }
  });
}

function createVSRoom() { connectVSRoom(generateRoomCode(), true); }
function joinVSRoom() {
  const code = vsRoomInput.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 4) { vsStatusMessage = 'INSERISCI 4 CARATTERI'; return; }
  showVSRoomInput(false); connectVSRoom(code, false);
}

function toggleVSReady() {
  const local = vsPlayers[vsClientId]; if (!local) return;
  local.character = getVSCharacterKey(); local.ready = !local.ready;
  syncVSLocalPlayerFromRoster();
  sendVSEvent('player_ready', { character: local.character, ready: local.ready });
  if (vsIsHost) sendVSEvent('roster_update', { hostId: vsHostId, players: vsPlayers });
}

// MAPPA MULTIPLAYER IDENTICA ALLA STORIA
function generateVSMap() {
  const nextMap = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
  const nextBlocks = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  
  // Zone sicure nei 4 angoli di spawn dei giocatori
  const isVSSafe = (r, c) => (
    (r <= 2 && c <= 2) ||
    (r <= 2 && c >= COLS - 3) ||
    (r >= ROWS - 3 && c <= 2) ||
    (r >= ROWS - 3 && c >= COLS - 3)
  );

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1 || (r % 2 === 0 && c % 2 === 0)) {
        nextMap[r][c] = 1; // Muro indistruttibile classico della storia
      } else if (isVSSafe(r, c)) {
        nextMap[r][c] = 0; // Spazio vuoto sicuro
      } else if (Math.random() < 0.55) {
        const type = FILE_BLOCK_TYPES[Math.floor(Math.random() * FILE_BLOCK_TYPES.length)];
        nextMap[r][c] = 2; // Blocco file distruttibile
        nextBlocks[r][c] = { ...type, currentHp: type.hp };
      }
    }
  }
  return { map: nextMap, blockData: nextBlocks };
}

function startVSMatch() {
  if (!vsIsHost) return;
  const roster = Object.values(vsPlayers);
  if (roster.length < 2 || roster.some(item => !item.ready)) {
    vsStatusMessage = roster.length < 2 ? 'SERVONO ALMENO 2 GIOCATORI' : 'TUTTI DEVONO ESSERE PRONTI';
    return;
  }
  const layout = generateVSMap();
  sendVSEvent('game_start', { players: vsPlayers, ...layout });
  applyVSGameStart({ players: vsPlayers, ...layout });
}

function applyVSGameStart(payload) {
  gameMode = 'vs'; vsPlayers = payload.players || vsPlayers;
  map = payload.map; blockData = payload.blockData;
  bombs = []; explosions = []; powerups = []; enemies = []; vsWinnerId = null;
  Object.values(vsPlayers).forEach(i => { i.alive = true; i.moving = false; });
  syncVSLocalPlayerFromRoster(); state = 'VS_PLAYING';
}

function addVSBomb(data) {
  if (!data?.bombId || bombs.some(i => i.id === data.bombId)) return;
  bombs.push({ id: data.bombId, ownerId: data.senderId, gx: data.gx, gy: data.gy, timer: 130, range: data.range, exploded: false });
}

function placeVSBomb() {
  const local = vsPlayers[vsClientId]; if (state !== 'VS_PLAYING' || !local?.alive) return;
  const gx = Math.floor(player.x / CELL_SIZE), gy = Math.floor(player.y / CELL_SIZE);
  const owned = bombs.filter(b => b.ownerId === vsClientId && !b.exploded).length;
  if (owned >= player.maxBombs || bombs.some(b => b.gx === gx && b.gy === gy && !b.exploded)) return;
  const bombId = `${vsClientId}-${Date.now()}-${Math.random()}`;
  const payload = { bombId, gx, gy, range: player.bombRange, senderId: vsClientId };
  addVSBomb(payload); sendVSEvent('place_bomb', payload); playSound('bomb');
}

function computeVSExplosionCells(bomb) {
  const cells = [{ gx: bomb.gx, gy: bomb.gy }];
  const directions = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  directions.forEach(([dx, dy]) => {
    for (let step = 1; step <= bomb.range; step++) {
      const gx = bomb.gx + dx * step, gy = bomb.gy + dy * step;
      if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS || map[gy][gx] === 1) break;
      cells.push({ gx, gy });
      if (map[gy][gx] === 2) break;
    }
  });
  return cells;
}

function explodeVSBomb(bombId, suppliedCells) {
  const bomb = bombs.find(i => i.id === bombId);
  if (!bomb || bomb.exploded) return;
  bomb.exploded = true;
  const cells = suppliedCells || computeVSExplosionCells(bomb);
  cells.forEach(c => {
    if (map[c.gy]?.[c.gx] === 2) { map[c.gy][c.gx] = 0; blockData[c.gy][c.gx] = null; }
  });
  explosions.push({ cells, timer: 20, ownerId: bomb.ownerId });
  playSound('explode'); triggerShake(8, 4);

  const local = vsPlayers[vsClientId];
  if (local?.alive && player.invTimer <= 0) {
    const pgx = Math.floor(player.x / CELL_SIZE), pgy = Math.floor(player.y / CELL_SIZE);
    if (cells.some(c => c.gx === pgx && c.gy === pgy)) {
      sendVSEvent('player_hit', { playerId: vsClientId, attackerId: bomb.ownerId });
      eliminateVSPlayer(vsClientId, bomb.ownerId);
    }
  }
}

function eliminateVSPlayer(playerId) {
  const target = vsPlayers[playerId]; if (!target || !target.alive) return;
  target.alive = false;
  if (playerId === vsClientId) playSound('fail');
  checkVSWinner();
}

function checkVSWinner() {
  const alive = Object.values(vsPlayers).filter(i => i.alive);
  if (alive.length <= 1 && Object.keys(vsPlayers).length >= 2) {
    const winnerId = alive[0]?.id || null;
    if (vsIsHost) sendVSEvent('winner', { winnerId });
    finishVSGame(winnerId);
  }
}

function finishVSGame(winnerId) { if (state === 'VS_WINNER') return; vsWinnerId = winnerId; state = 'VS_WINNER'; }

function updateVSPlayer() {
  const local = vsPlayers[vsClientId]; if (!local?.alive) return;
  updatePlayer();
  local.x = player.x; local.y = player.y; local.facingLeft = player.facingLeft; local.moving = player.isMoving;
  const now = performance.now();
  if (now - vsLastMoveBroadcast > 50) {
    vsLastMoveBroadcast = now;
    sendVSEvent('player_move', { x: player.x, y: player.y, facingLeft: player.facingLeft, moving: player.isMoving });
  }
}

function updateVSGame() {
  updateVSPlayer();
  bombs.forEach(bomb => {
    if (!bomb.exploded && bomb.ownerId === vsClientId) {
      bomb.timer--;
      if (bomb.timer <= 0) {
        const cells = computeVSExplosionCells(bomb);
        sendVSEvent('bomb_explode', { bombId: bomb.id, cells });
        explodeVSBomb(bomb.id, cells);
      }
    }
  });
  bombs = bombs.filter(b => !b.exploded);
  explosions.forEach(ex => ex.timer--);
  explosions = explosions.filter(ex => ex.timer > 0);
}

async function saveScore(finalScore) {
  if (scoreSavedForCurrentGame) return;
  scoreSavedForCurrentGame = true;
  if (finalScore > hiScore) { hiScore = finalScore; localStorage.setItem('cyberRun_highScore', hiScore.toString()); }
  if (finalScore <= 0) return;
  let rawUser = localStorage.getItem('arcade_current_user');
  if (!rawUser) return;
  await ArcadeScoreManager.saveGameScore({ client: supabaseClient, currentUser: JSON.parse(rawUser), gameKey: 'cyberRun', score: finalScore });
}

async function exitGame(finalScore) {
  try { await saveScore(finalScore); } catch (e) { console.warn("Errore salvataggio score:", e); }
  finally { ArcadeGameShell.navigateToHub(); }
}

let state = 'COVER', score = 0, hiScore = parseInt(localStorage.getItem('cyberRun_highScore')) || 0;
let lives = 3, level = 1, currentEraIndex = 1, frame = 0, animTimer = 0;
let moveUp = false, moveDown = false, moveLeft = false, moveRight = false, joyActive = false;
let shakeTime = 0, shakeMag = 0;

function triggerShake(time = 10, mag = 4) { shakeTime = time; shakeMag = mag; }

let audioCtx = null, noiseBuffer = null;

function getAC() {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
        const bufferSize = Math.floor(audioCtx.sampleRate * 0.25);
        noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  } catch(e) {}
  return audioCtx;
}

const isSfxAllowed = ArcadeGameShell.isSfxAllowed;

function playSound(type) {
  if (!isSfxAllowed()) return;
  try {
    const ac = getAC(); if (!ac) return;
    const t = ac.currentTime;
    if (type === 'explode') {
      if (!noiseBuffer) return;
      const src = ac.createBufferSource(); src.buffer = noiseBuffer;
      const filt = ac.createBiquadFilter(); filt.type = 'lowpass';
      filt.frequency.setValueAtTime(800, t); filt.frequency.exponentialRampToValueAtTime(50, t + 0.22);
      const g = ac.createGain(); g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      src.connect(filt); filt.connect(g); g.connect(ac.destination);
      src.start(t); src.stop(t + 0.22); return;
    }
    const osc = ac.createOscillator(), gain = ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    const soundProfiles = {
      bomb: { type: 'sine', f0: 320, f1: 110, dur: 0.12, gain: 0.2 },
      hit_block: { type: 'triangle', f0: 200, f1: 350, dur: 0.08, gain: 0.2 },
      fail: { type: 'sawtooth', f0: 240, f1: 50, dur: 0.35, gain: 0.25 }
    };
    if (soundProfiles[type]) {
      const p = soundProfiles[type]; osc.type = p.type;
      osc.frequency.setValueAtTime(p.f0, t);
      osc.frequency[type === 'hit_block' ? 'linearRampToValueAtTime' : 'exponentialRampToValueAtTime'](Math.max(1, p.f1), t + p.dur);
      gain.gain.setValueAtTime(p.gain, t); gain.gain.exponentialRampToValueAtTime(0.0001, t + p.dur);
      osc.start(t); osc.stop(t + p.dur);
    } else if (type === 'powerup') {
      osc.type = 'sine'; [523, 659, 783].forEach((f, i) => osc.frequency.setValueAtTime(f, t + i * 0.08));
      gain.gain.setValueAtTime(0.18, t); gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      osc.start(t); osc.stop(t + 0.24);
    }
  } catch(e) {}
}

let lastMenuAdvanceTime = 0;
function advanceMenuState() {
  const now = Date.now(); if (now - lastMenuAdvanceTime < 250) return;
  lastMenuAdvanceTime = now; getAC();
  if (state === 'COVER') state = 'MODE_SELECT';
  else if (state === 'MODE_SELECT') {
    const sel = getModeMenuOptions()[modeMenuIndex];
    if (sel?.action === 'continue') continueStory();
    else if (sel?.action === 'new') startNewStoryFlow();
    else if (sel?.action === 'vs') { gameMode = 'vs'; state = 'VS_MENU'; }
  } else if (state === 'VS_MENU') {
    if (vsMenuIndex === 0) createVSRoom(); else { state = 'VS_JOIN'; showVSRoomInput(true); }
  } else if (state === 'VS_JOIN') joinVSRoom();
  else if (state === 'VS_LOBBY') {
    if (vsIsHost && Object.values(vsPlayers).every(i => i.ready)) startVSMatch(); else toggleVSReady();
  } else if (state === 'VS_WINNER') { leaveVSRoom(); gameMode = 'story'; state = 'COVER'; }
  else if (state === 'STORY') state = 'RULES';
  else if (state === 'RULES') state = 'POWERUPS_INFO';
  else if (state === 'POWERUPS_INFO') state = 'CHAR_SELECT';
  else if (state === 'CHAR_SELECT') selectBoss(charList[charSelectIndex]);
  else if (state === 'ERA_INTRO') state = 'playing';
  else if (state === 'gameover') state = 'CHAR_SELECT';
}

const keys = {};
document.addEventListener('keydown', e => {
  keys[e.code] = true; getAC();
  if (state === 'MODE_SELECT') {
    const opts = getModeMenuOptions();
    if (['ArrowLeft', 'ArrowUp', 'KeyA', 'KeyW'].includes(e.code)) modeMenuIndex = (modeMenuIndex - 1 + opts.length) % opts.length;
    if (['ArrowRight', 'ArrowDown', 'KeyD', 'KeyS'].includes(e.code)) modeMenuIndex = (modeMenuIndex + 1) % opts.length;
    if (e.code === 'Space' || e.code === 'Enter') advanceMenuState();
  } else if (state === 'VS_MENU') {
    if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) vsMenuIndex = 1 - vsMenuIndex;
    if (e.code === 'Space' || e.code === 'Enter') advanceMenuState();
  } else if (state === 'VS_JOIN') {
    if (e.code === 'Enter') advanceMenuState();
    if (e.code === 'Escape') { showVSRoomInput(false); state = 'VS_MENU'; }
  } else if (state === 'VS_LOBBY') {
    if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD'].includes(e.code)) {
      vsCharacterIndex = 1 - vsCharacterIndex;
      const local = vsPlayers[vsClientId]; if (local) { local.character = getVSCharacterKey(); local.ready = false; }
    }
    if (e.code === 'Space') toggleVSReady();
    if (e.code === 'Enter' && vsIsHost) startVSMatch();
  } else if (['COVER', 'STORY', 'RULES', 'POWERUPS_INFO', 'VS_WINNER'].includes(state)) {
    if (e.code === 'Space' || e.code === 'Enter') advanceMenuState();
  } else if (state === 'CHAR_SELECT') {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') charSelectIndex = (charSelectIndex - 1 + 2) % 2;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') charSelectIndex = (charSelectIndex + 1) % 2;
    if (e.code === 'Space' || e.code === 'Enter') advanceMenuState();
  } else if ((state === 'ERA_INTRO' || state === 'gameover') && (e.code === 'Space' || e.code === 'Enter')) {
    state = state === 'ERA_INTRO' ? 'playing' : 'CHAR_SELECT';
  } else if ((e.code === 'KeyP' || e.code === 'Escape') && (state === 'playing' || state === 'PAUSE')) {
    state = state === 'playing' ? 'PAUSE' : 'playing';
  } else if (state === 'PAUSE' && e.code === 'Enter') saveStoryAndExit();
  else if (state === 'playing' && (e.code === 'Space' || e.code === 'KeyZ')) placeBomb();
  else if (state === 'VS_PLAYING' && (e.code === 'Space' || e.code === 'KeyZ')) placeVSBomb();
});
document.addEventListener('keyup', e => { keys[e.code] = false; });
function keyPressed(code) { return !!keys[code]; }

const joyZone = document.getElementById('joyZone');
const joyKnob = document.getElementById('joyKnob');

function handleJoyMove(clientX, clientY) {
  const rect = joyZone.getBoundingClientRect();
  let dx = clientX - (rect.left + rect.width / 2), dy = clientY - (rect.top + rect.height / 2);
  const dist = Math.hypot(dx, dy), maxR = rect.width / 2 - 12;
  if (dist > maxR) { dx = (dx / dist) * maxR; dy = (dy / dist) * maxR; }
  joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  moveUp = false; moveDown = false; moveLeft = false; moveRight = false;
  if (dist > (10 / joySensitivity)) {
    if (Math.abs(dx) > Math.abs(dy)) { if (dx < 0) moveLeft = true; else moveRight = true; }
    else { if (dy < 0) moveUp = true; else moveDown = true; }
  }
}

function resetJoy() {
  joyActive = false; moveUp = false; moveDown = false; moveLeft = false; moveRight = false;
  joyKnob.style.transform = `translate(-50%, -50%)`;
}

joyZone.addEventListener('pointerdown', e => { joyActive = true; joyZone.setPointerCapture(e.pointerId); getAC(); handleJoyMove(e.clientX, e.clientY); });
joyZone.addEventListener('pointermove', e => { if (joyActive) handleJoyMove(e.clientX, e.clientY); });
joyZone.addEventListener('pointerup', resetJoy);
joyZone.addEventListener('pointercancel', resetJoy);

function bindFireBtn(id) {
  const el = document.getElementById(id); if (!el) return;
  el.addEventListener('pointerdown', e => {
    if (e) e.preventDefault(); getAC();
    if (['COVER', 'MODE_SELECT', 'VS_MENU', 'VS_LOBBY', 'VS_WINNER', 'STORY', 'RULES', 'POWERUPS_INFO', 'CHAR_SELECT', 'ERA_INTRO'].includes(state)) advanceMenuState();
    else if (state === 'playing') placeBomb();
    else if (state === 'VS_PLAYING') placeVSBomb();
  });
}
bindFireBtn('btnBomb');

function selectBoss(bossKey) {
  currentBoss = CHARACTERS[bossKey]; canvas.style.borderColor = currentBoss.primary; startGame();
}

let map = [], blockData = [], bombs = [], explosions = [], powerups = [], enemies = [];
let player = { x: 1.5 * CELL_SIZE, y: 1.5 * CELL_SIZE, w: 12, h: 12, maxBombs: 1, bombRange: 1, speed: 2.1, isMoving: false, facingLeft: false, invTimer: 0 };

function startGame() {
  deleteStorySave(); scoreSavedForCurrentGame = false; score = 0; lives = 3; level = 1; currentEraIndex = 1;
  loadLevel(); state = 'ERA_INTRO';
}

function loadLevel(options = {}) {
  currentEraIndex = Math.min(5, Math.floor((level - 1) / 10) + 1);
  const isBossLevel = (level % 10 === 0);
  player.maxBombs = currentBoss.baseBombs; player.bombRange = currentBoss.baseRange; player.speed = currentBoss.speed;
  player.x = 1.5 * CELL_SIZE; player.y = 1.5 * CELL_SIZE; player.invTimer = 60; player.isMoving = false; player.facingLeft = false;

  bombs = []; explosions = []; powerups = []; enemies = []; map = []; blockData = [];

  for (let r = 0; r < ROWS; r++) {
    map[r] = []; blockData[r] = [];
    for (let c = 0; c < COLS; c++) {
      if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1 || (!isBossLevel && r % 2 === 0 && c % 2 === 0)) {
        map[r][c] = 1; blockData[r][c] = null;
      } else if ((r <= 2 && c <= 2) || (r >= ROWS - 3 && c >= COLS - 3)) {
        map[r][c] = 0; blockData[r][c] = null;
      } else {
        let spawnChance = isBossLevel ? 0.25 : (0.50 + Math.min(level * 0.005, 0.20));
        if (Math.random() < spawnChance) {
          map[r][c] = 2;
          let pool = level <= 10 ? FILE_BLOCK_TYPES.slice(0, 2) : level <= 20 ? FILE_BLOCK_TYPES.slice(0, 3) : level <= 30 ? FILE_BLOCK_TYPES.slice(0, 4) : FILE_BLOCK_TYPES;
          let selectedType = pool[Math.floor(Math.random() * pool.length)];
          blockData[r][c] = { ...selectedType, currentHp: selectedType.hp };
        } else { map[r][c] = 0; blockData[r][c] = null; }
      }
    }
  }

  if (isBossLevel) {
    let bossEra = Math.min(5, Math.floor(level / 10)), bossHp = 10 + (bossEra - 1) * 5;
    for (let br = 5; br <= 8; br++) for (let bc = 5; bc <= 8; bc++) { map[br][bc] = 0; blockData[br][bc] = null; }
    enemies.push({ isBoss: true, era: bossEra, name: ERAS_INFO[bossEra - 1].boss, gx: 5, gy: 6, x: 6 * CELL_SIZE, y: 7 * CELL_SIZE, dirX: 1, dirY: 0, hp: bossHp, maxHp: bossHp, speed: 0.9 + bossEra * 0.12, hitTimer: 0, burstTimer: 0 });
  } else {
    let emptyCells = [];
    for (let r = 1; r < ROWS - 1; r++) for (let c = 1; c < COLS - 1; c++) if (map[r][c] === 0 && !(r <= 3 && c <= 3)) emptyCells.push({ r, c });
    let enemyCount = Math.min(2 + Math.floor(((level - 1) % 10) / 2) + Math.floor(level / 10), 7);
    for (let i = 0; i < enemyCount; i++) {
      let er, ec;
      if (emptyCells.length > 0) { let idx = Math.floor(Math.random() * emptyCells.length); er = emptyCells[idx].r; ec = emptyCells[idx].c; emptyCells.splice(idx, 1); }
      else { er = ROWS - 2; ec = COLS - 2; map[er][ec] = 0; blockData[er][ec] = null; }
      let mType = Math.random() < 0.7 ? currentEraIndex : (Math.floor(Math.random() * currentEraIndex) + 1);
      let enemyHp = (Math.random() < (0.20 + Math.min(level * 0.012, 0.50))) ? 2 : 1;
      enemies.push({ isBoss: false, era: mType, gx: ec, gy: er, x: ec * CELL_SIZE + CELL_SIZE / 2, y: er * CELL_SIZE + CELL_SIZE / 2, dirX: Math.random() < 0.5 ? 1 : -1, dirY: 0, hp: enemyHp, maxHp: enemyHp, hitTimer: 0, speed: 1.0 + mType * 0.12 + Math.min(level * 0.012, 0.45) });
    }
  }
  if (gameMode === 'story' && !options.skipStorySave) saveStoryProgress();
}

function placeBomb() {
  if (state !== 'playing') return;
  let gx = Math.floor(player.x / CELL_SIZE), gy = Math.floor(player.y / CELL_SIZE);
  if (gx < 0 || gx >= COLS || gy < 0 || gy >= ROWS) return;
  if (bombs.filter(b => b && !b.exploded).length >= player.maxBombs) return;
  if (bombs.some(b => b && b.gx === gx && b.gy === gy && !b.exploded)) return;
  bombs.push({ id: Date.now() + Math.random(), gx, gy, timer: 130, range: player.bombRange, exploded: false });
  playSound('bomb');
}

function triggerExplosion(b) {
  if (!b || b.exploded) return;
  b.exploded = true; playSound('explode'); triggerShake(8, 4);
  let fireCells = [{ gx: b.gx, gy: b.gy }], dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
  dirs.forEach(d => {
    for (let step = 1; step <= b.range; step++) {
      let cgx = b.gx + d.x * step, cgy = b.gy + d.y * step;
      if (cgx < 0 || cgx >= COLS || cgy < 0 || cgy >= ROWS || map[cgy][cgx] === 1) break;
      fireCells.push({ gx: cgx, gy: cgy });
      let otherBomb = bombs.find(ob => ob && !ob.exploded && ob.gx === cgx && ob.gy === cgy);
      if (otherBomb) triggerExplosion(otherBomb);
      if (map[cgy][cgx] === 2) {
        let blk = blockData[cgy][cgx];
        if (blk) {
          blk.currentHp--;
          if (blk.currentHp <= 0) {
            map[cgy][cgx] = 0; blockData[cgy][cgx] = null; score += Math.floor(blk.pts * currentBoss.scoreMult);
            if (Math.random() < blk.dropChance) {
              let types = ['BOMB_UP', 'FIRE_UP', 'SPEED_UP', 'COFFEE', 'COMMAND_Z'], weights = [0.25, 0.25, 0.20, 0.20, 0.10];
              let rand = Math.random(), sum = 0, picked = types[0];
              for (let t = 0; t < types.length; t++) { sum += weights[t]; if (rand < sum) { picked = types[t]; break; } }
              powerups.push({ gx: cgx, gy: cgy, type: picked });
            }
          } else playSound('hit_block');
        }
        break;
      }
    }
  });
  explosions.push({ cells: fireCells, timer: 20 });
}

function overlapsTile(px, py, pw, ph, gx, gy) {
  return (px - pw / 2 < (gx + 1) * CELL_SIZE && px + pw / 2 > gx * CELL_SIZE &&
          py - ph / 2 < (gy + 1) * CELL_SIZE && py + ph / 2 > gy * CELL_SIZE);
}

function isBlocked(nx, ny) {
  let eps = 0.5, left = nx - player.w / 2 + eps, right = nx + player.w / 2 - eps, top = ny - player.h / 2 + eps, bottom = ny + player.h / 2 - eps;
  let c1 = Math.floor(left / CELL_SIZE), c2 = Math.floor(right / CELL_SIZE), r1 = Math.floor(top / CELL_SIZE), r2 = Math.floor(bottom / CELL_SIZE);
  for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS || map[r][c] !== 0) return true;
    for (let b of bombs) if (b && !b.exploded && b.gx === c && b.gy === r && !overlapsTile(player.x, player.y, player.w, player.h, b.gx, b.gy)) return true;
  }
  return false;
}

function updatePlayer() {
  let dx = 0, dy = 0;
  if (keyPressed('ArrowLeft') || keyPressed('KeyA') || moveLeft) { dx = -player.speed; player.facingLeft = true; }
  else if (keyPressed('ArrowRight') || keyPressed('KeyD') || moveRight) { dx = player.speed; player.facingLeft = false; }
  else if (keyPressed('ArrowUp') || keyPressed('KeyW') || moveUp) { dy = -player.speed; }
  else if (keyPressed('ArrowDown') || keyPressed('KeyS') || moveDown) { dy = player.speed; }

  player.isMoving = (dx !== 0 || dy !== 0);
  if (player.isMoving) animTimer++;

  if (dx !== 0) {
    let centerY = (Math.floor(player.y / CELL_SIZE) + 0.5) * CELL_SIZE, diffY = centerY - player.y;
    let targetY = Math.abs(diffY) > 0.1 ? player.y + Math.sign(diffY) * Math.min(Math.abs(diffY), player.speed) : centerY;
    if (!isBlocked(player.x + dx, targetY)) { player.x += dx; player.y = targetY; }
  } else if (dy !== 0) {
    let centerX = (Math.floor(player.x / CELL_SIZE) + 0.5) * CELL_SIZE, diffX = centerX - player.x;
    let targetX = Math.abs(diffX) > 0.1 ? player.x + Math.sign(diffX) * Math.min(Math.abs(diffX), player.speed) : centerX;
    if (!isBlocked(targetX, player.y + dy)) { player.x = targetX; player.y += dy; }
  }

  if (player.invTimer > 0) player.invTimer--;
  let pGx = Math.floor(player.x / CELL_SIZE), pGy = Math.floor(player.y / CELL_SIZE);

  for (let i = powerups.length - 1; i >= 0; i--) {
    let pw = powerups[i];
    if (pw && pw.gx === pGx && pw.gy === pGy) {
      playSound('powerup');
      if (pw.type === 'BOMB_UP') player.maxBombs++;
      else if (pw.type === 'FIRE_UP') player.bombRange++;
      else if (pw.type === 'SPEED_UP') player.speed += 0.35;
      else if (pw.type === 'COFFEE') score += Math.floor(300 * currentBoss.scoreMult);
      else if (pw.type === 'COMMAND_Z') lives = Math.min(5, lives + 1);
      powerups.splice(i, 1);
    }
  }
}

function updateEnemies() {
  enemies.forEach(e => {
    if (e.hitTimer && e.hitTimer > 0) e.hitTimer--;
    let moveSpeed = e.speed;
    if (e.isBoss) {
      if (e.era === 3) { e.burstTimer = (e.burstTimer || 0) + 1; if (e.burstTimer > 100) { moveSpeed *= 2.0; if (e.burstTimer > 130) e.burstTimer = 0; } }
      else if (e.era >= 4 && Math.random() < 0.05) {
        let pGx = Math.floor(player.x / CELL_SIZE), pGy = Math.floor(player.y / CELL_SIZE);
        if (pGx > e.gx) e.dirX = 1; else if (pGx < e.gx) e.dirX = -1;
        if (pGy > e.gy) e.dirY = 1; else if (pGy < e.gy) e.dirY = -1;
      }
    }
    let targetX = (e.gx + (e.isBoss ? 1 : 0.5)) * CELL_SIZE, targetY = (e.gy + (e.isBoss ? 1 : 0.5)) * CELL_SIZE;
    if (Math.hypot(targetX - e.x, targetY - e.y) <= moveSpeed) {
      e.x = targetX; e.y = targetY;
      let dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
      let valid = dirs.filter(d => {
        let ngx = e.gx + d.x, ngy = e.gy + d.y;
        if (e.isBoss) {
          for (let dr = 0; dr < 2; dr++) for (let dc = 0; dc < 2; dc++) {
            let checkC = ngx + dc, checkR = ngy + dr;
            if (checkC < 0 || checkC >= COLS || checkR < 0 || checkR >= ROWS || map[checkR][checkC] === 1) return false;
            if (e.era === 2 && map[checkR][checkC] === 2) { map[checkR][checkC] = 0; blockData[checkR][checkC] = null; playSound('hit_block'); }
            else if (map[checkR][checkC] !== 0) return false;
          }
          return true;
        } else {
          return ngx >= 0 && ngx < COLS && ngy >= 0 && ngy < ROWS && map[ngy][ngx] === 0 && !bombs.some(b => b && !b.exploded && b.gx === ngx && b.gy === ngy);
        }
      });
      let fValid = valid.filter(d => !(d.x === -e.dirX && d.y === -e.dirY));
      let chosen = fValid.length > 0 ? fValid[Math.floor(Math.random() * fValid.length)] : valid.length > 0 ? valid[Math.floor(Math.random() * valid.length)] : { x: 0, y: 0 };
      e.dirX = chosen.x; e.dirY = chosen.y; e.gx += e.dirX; e.gy += e.dirY;
    } else { e.x += e.dirX * moveSpeed; e.y += e.dirY * moveSpeed; }

    if (player.invTimer <= 0 && state === 'playing' && Math.hypot(player.x - e.x, player.y - e.y) < (e.isBoss ? CELL_SIZE + 4 : 12)) hitPlayer();
  });
}

function updateBombsAndExplosions() {
  bombs.forEach(b => { if (b && !b.exploded && --b.timer <= 0) triggerExplosion(b); });
  bombs = bombs.filter(b => b && !b.exploded);

  for (let i = explosions.length - 1; i >= 0; i--) {
    let ex = explosions[i]; if (!ex) continue;
    ex.timer--;
    for (let cell of ex.cells) {
      for (let eIdx = enemies.length - 1; eIdx >= 0; eIdx--) {
        let e = enemies[eIdx]; if (!e) continue;
        let isHit = e.isBoss ? (cell.gx * CELL_SIZE + CELL_SIZE / 2 >= e.x - CELL_SIZE && cell.gx * CELL_SIZE + CELL_SIZE / 2 <= e.x + CELL_SIZE && cell.gy * CELL_SIZE + CELL_SIZE / 2 >= e.y - CELL_SIZE && cell.gy * CELL_SIZE + CELL_SIZE / 2 <= e.y + CELL_SIZE) : (Math.floor(e.x / CELL_SIZE) === cell.gx && Math.floor(e.y / CELL_SIZE) === cell.gy);
        if (isHit && (!e.hitTimer || e.hitTimer <= 0)) {
          e.hp--; e.hitTimer = e.isBoss ? 22 : 18;
          if (e.hp > 0) { playSound('hit_block'); triggerShake(e.isBoss ? 12 : 6, e.isBoss ? 6 : 3); }
          else {
            score += Math.floor((e.isBoss ? 2500 * e.era : e.maxHp > 1 ? 350 : 200) * currentBoss.scoreMult);
            if (e.isBoss) { powerups.push({ gx: cell.gx, gy: cell.gy, type: 'COMMAND_Z' }); powerups.push({ gx: Math.max(1, cell.gx - 1), gy: cell.gy, type: 'FIRE_UP' }); }
            enemies.splice(eIdx, 1);
          }
        }
      }
      if (state === 'playing' && player.invTimer <= 0 && Math.floor(player.x / CELL_SIZE) === cell.gx && Math.floor(player.y / CELL_SIZE) === cell.gy) { hitPlayer(); break; }
    }
    if (ex.timer <= 0) explosions.splice(i, 1);
  }

  if (enemies.length === 0 && state === 'playing') {
    let prevEra = currentEraIndex; score += Math.floor(1000 * level * currentBoss.scoreMult); level++;
    if (level > 50) { deleteStorySave(); state = 'gameover'; saveScore(score); }
    else {
      let nextEra = Math.min(5, Math.floor((level - 1) / 10) + 1);
      loadLevel(); state = (nextEra !== prevEra || level % 10 === 0) ? 'ERA_INTRO' : 'playing';
      playSound('powerup');
    }
  }
}

function hitPlayer() {
  if (state !== 'playing' || player.invTimer > 0) return;
  lives--; player.invTimer = 90; triggerShake(15, 8); playSound('fail');
  if (lives <= 0) { deleteStorySave(); state = 'gameover'; saveScore(score); }
  else { player.x = 1.5 * CELL_SIZE; player.y = 1.5 * CELL_SIZE; }
}

function drawGameWorld() {
  ctx.strokeStyle = '#0d0d22'; ctx.lineWidth = 1;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) ctx.strokeRect(c * CELL_SIZE, r * CELL_SIZE + HUD_HEIGHT, CELL_SIZE, CELL_SIZE);
  powerups.forEach(drawSinglePowerup);
  explosions.forEach(ex => ex?.cells?.forEach(drawSingleExplosionCell));
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) if (map[r][c] !== 0) drawSingleBlock(r, c);
    bombs.forEach(b => { if (b && !b.exploded && b.gy === r) drawSingleBomb(b); });
    enemies.forEach(e => { if (e && Math.floor(e.y / CELL_SIZE) === r) drawSingleEnemy(e); });
    if (Math.floor(player.y / CELL_SIZE) === r) drawSinglePlayer();
  }
}

function drawSingleBlock(r, c) {
  let x = c * CELL_SIZE, y = r * CELL_SIZE + HUD_HEIGHT;
  if (map[r][c] === 1) {
    ctx.fillStyle = '#080820'; ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
    ctx.strokeStyle = currentBoss?.wallCol || '#00aaff'; ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, 3);
  } else if (map[r][c] === 2) {
    let blk = blockData[r][c];
    if (blk) {
      ctx.fillStyle = blk.bg; ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
      ctx.strokeStyle = blk.border; ctx.lineWidth = 1.5; ctx.strokeRect(x + 1.5, y + 1.5, CELL_SIZE - 3, CELL_SIZE - 3);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, 3);
      drawCrispText(blk.label, x + CELL_SIZE / 2, y + CELL_SIZE / 2 - (blk.hp > 1 ? 1 : -3), '900 10px monospace', blk.textCol, 'center', '#000000', 2);
      if (blk.hp > 1) {
        let barW = CELL_SIZE - 6, barH = 3, barX = x + 3, barY = y + CELL_SIZE - 5;
        ctx.fillStyle = '#080814'; ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = blk.currentHp === blk.hp ? '#00ffcc' : (blk.currentHp > 1 ? '#ffcc00' : '#ff0055');
        ctx.fillRect(barX, barY, barW * (blk.currentHp / blk.hp), barH);
      }
    }
  }
}

function drawSinglePowerup(pw) {
  if (!pw) return;
  let px = pw.gx * CELL_SIZE + CELL_SIZE / 2, py = pw.gy * CELL_SIZE + HUD_HEIGHT + CELL_SIZE / 2, size = 20;
  let assets = { BOMB_UP: [ASSETS.BOMBA, '💣'], FIRE_UP: [ASSETS.FUOCO, '🔥'], SPEED_UP: [ASSETS.SCARPA, '👟'], COFFEE: [ASSETS.CAFFE, '☕'], COMMAND_Z: [ASSETS.CUORE, '❤️'] };
  let [imgAsset, emoji] = assets[pw.type] || [null, '⚡'];
  if (imgAsset?.complete && imgAsset.naturalWidth !== 0) ctx.drawImage(imgAsset, px - size / 2, py - size / 2, size, size);
  else drawCrispText(emoji, px, py + 1, '14px sans-serif', '#ffcc00', 'center', null, 0);
}

function drawSingleBomb(b) {
  if (!b) return;
  let bx = b.gx * CELL_SIZE + CELL_SIZE / 2, by = b.gy * CELL_SIZE + HUD_HEIGHT + CELL_SIZE / 2, pulse = Math.sin(Date.now() / 70) * 1.5;
  ctx.save();
  if (ASSETS.BOMBA?.complete && ASSETS.BOMBA.naturalWidth !== 0) {
    let size = 22 + pulse; ctx.drawImage(ASSETS.BOMBA, bx - size / 2, by - size / 2, size, size);
  } else {
    ctx.beginPath(); ctx.arc(bx, by, 9 + pulse, 0, Math.PI * 2); ctx.fillStyle = '#ff0055'; ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke();
    drawCrispText('💣', bx, by + 1, `${16 + pulse}px sans-serif`, '#ffffff', 'center', null, 0);
  }
  ctx.restore();
}

function drawSingleExplosionCell(cell) {
  if (!cell) return;
  let fx = cell.gx * CELL_SIZE, fy = cell.gy * CELL_SIZE + HUD_HEIGHT;
  ctx.fillStyle = 'rgba(255, 0, 85, 0.85)'; ctx.fillRect(fx + 2, fy + 2, CELL_SIZE - 4, CELL_SIZE - 4);
  ctx.fillStyle = '#ffff00'; ctx.fillRect(fx + 5, fy + 5, CELL_SIZE - 10, CELL_SIZE - 10);
}

function drawSinglePlayer() {
  let py = player.y + HUD_HEIGHT;
  if (player.invTimer > 0 && Math.floor(player.invTimer / 4) % 2 === 0) return;
  ctx.save();
  if (player.facingLeft) { ctx.translate(player.x, py); ctx.scale(-1, 1); ctx.translate(-player.x, -py); }
  let img = currentBoss.movImg;
  if (img?.complete && img.naturalWidth !== 0) {
    let frameW = img.naturalWidth / 5, frameH = img.naturalHeight;
    let currentFrame = player.isMoving ? (Math.floor(animTimer / 5) % 5) : 0;
    ctx.drawImage(img, currentFrame * frameW, 0, frameW, frameH, player.x - 15, py - 17, 30, 30);
  } else {
    ctx.fillStyle = currentBoss.primary; ctx.beginPath(); ctx.arc(player.x, py, 12, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawSingleEnemy(e) {
  if (!e) return;
  let ex = e.x, ey = e.y + HUD_HEIGHT, eraData = ERAS_INFO[e.era - 1];
  ctx.save();
  if (e.hitTimer && Math.floor(e.hitTimer / 3) % 2 === 0) ctx.globalAlpha = 0.5;

  if (e.isBoss) {
    let bossSize = CELL_SIZE * 2 - 4, bImg = ASSETS.BOSSI[e.era];
    if (bImg?.complete && bImg.naturalWidth !== 0) ctx.drawImage(bImg, ex - bossSize / 2, ey - bossSize / 2, bossSize, bossSize);
    else {
      ctx.fillStyle = eraData.colBase; ctx.beginPath(); ctx.roundRect(ex - bossSize / 2, ey - bossSize / 2, bossSize, bossSize, 8); ctx.fill();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
      drawCrispText(`BOSS ${e.era}`, ex, ey + 4, '900 12px Courier New', '#ffffff', 'center', '#000000', 2);
    }
    ctx.fillStyle = '#080814'; ctx.fillRect(ex - 22, ey - bossSize / 2 - 8, 44, 5);
    ctx.fillStyle = '#ff0055'; ctx.fillRect(ex - 22, ey - bossSize / 2 - 8, 44 * (e.hp / e.maxHp), 5);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.5; ctx.strokeRect(ex - 22, ey - bossSize / 2 - 8, 44, 5);
  } else {
    let r = 11, mImg = ASSETS.MOSTRI[e.era];
    if (mImg?.complete && mImg.naturalWidth !== 0) {
      if (e.maxHp > 1) ctx.filter = eraData.filterTough;
      ctx.drawImage(mImg, ex - r - 2, ey - r - 2, r * 2 + 4, r * 2 + 4);
      ctx.filter = 'none';
    } else {
      ctx.beginPath(); ctx.fillStyle = (e.maxHp > 1) ? eraData.colTough : eraData.colBase;
      ctx.arc(ex, ey - 2, r, Math.PI, 0, false); ctx.lineTo(ex + r, ey + r); ctx.lineTo(ex + r / 2, ey + r - 3);
      ctx.lineTo(ex, ey + r); ctx.lineTo(ex - r / 2, ey + r - 3); ctx.lineTo(ex - r, ey + r); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.fillStyle = '#ffffff'; ctx.arc(ex - 3.5, ey - 3, 2.5, 0, Math.PI * 2); ctx.arc(ex + 3.5, ey - 3, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.fillStyle = '#000000'; ctx.arc(ex - 3.5 + (e.dirX || 0) * 1.2, ey - 3 + (e.dirY || 0) * 1.2, 1.2, 0, Math.PI * 2); ctx.arc(ex + 3.5 + (e.dirX || 0) * 1.2, ey - 3 + (e.dirY || 0) * 1.2, 1.2, 0, Math.PI * 2); ctx.fill();
    }
    if (e.maxHp > 1) {
      ctx.fillStyle = '#080814'; ctx.fillRect(ex - 10, ey - r - 6, 20, 3);
      ctx.fillStyle = (e.hp === 2) ? eraData.colTough : '#ff0055'; ctx.fillRect(ex - 10, ey - r - 6, 20 * (e.hp / e.maxHp), 3);
    }
  }
  ctx.restore();
}

function drawHeart(c, x, y, size) {
  c.save();
  if (ASSETS.CUORE?.complete && ASSETS.CUORE.naturalWidth !== 0) c.drawImage(ASSETS.CUORE, x - size / 2, y, size, size);
  else {
    c.fillStyle = '#ff0055'; c.shadowColor = '#ff0055'; c.shadowBlur = 6; c.beginPath();
    let topH = size * 0.35; c.moveTo(x, y + topH);
    c.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topH);
    c.bezierCurveTo(x - size / 2, y + (size + topH) / 2, x, y + size, x, y + size);
    c.bezierCurveTo(x, y + size, x + size / 2, y + (size + topH) / 2, x + size / 2, y + topH);
    c.bezierCurveTo(x + size / 2, y, x, y, x, y + topH); c.closePath(); c.fill();
    c.strokeStyle = '#ffffff'; c.lineWidth = 1; c.stroke();
  }
  c.restore();
}

function drawHUD() {
  ctx.fillStyle = '#0a0a22'; ctx.fillRect(0, 0, CANVAS_W, HUD_HEIGHT);
  ctx.strokeStyle = currentBoss.primary; ctx.lineWidth = 1.5; ctx.strokeRect(0, 0, CANVAS_W, HUD_HEIGHT);
  drawCrispText(`${currentBoss.name}`, 10, 16, '900 12px Courier New', currentBoss.primary, 'left', '#000000', 2);
  drawCrispText(`PTS: ${score}`, 10, 32, '900 12px Courier New', '#ffff00', 'left', '#000000', 2);
  drawCrispText(`STAGE ${level}/50`, CANVAS_W / 2, 26, '900 12px Courier New', '#ffffff', 'center', '#000000', 2);
  drawCrispText(`REC: ${hiScore}`, CANVAS_W - 10, 16, '900 11px Courier New', '#00ffcc', 'right', '#000000', 2);

  let availLives = Math.max(0, lives), textRightX = CANVAS_W - 10 - (availLives * 14);
  drawCrispText(`VITE:`, textRightX, 33, '900 11px Courier New', '#ff0055', 'right', '#000000', 2);
  for (let i = 0; i < availLives; i++) drawHeart(ctx, CANVAS_W - 12 - (i * 14), 23, 10);
}

function drawVSButton(x, y, width, height, label, selected, color) {
  ctx.fillStyle = selected ? color : '#101228'; ctx.beginPath(); ctx.roundRect(x, y, width, height, 8); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = selected ? 3 : 1.5; ctx.stroke();
  drawCrispText(label, x + width / 2, y + height / 2, '900 12px Courier New', selected ? '#050510' : color, 'center', null, 0);
}

function drawModeSelect() {
  ctx.fillStyle = '#060212'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  drawCrispText('SCEGLI MODALITÀ', CANVAS_W / 2, 52, '900 23px Courier New', '#00f0ff');
  drawCrispText('STORIA O SFIDA REALTIME', CANVAS_W / 2, 82, 'bold 11px Courier New', '#ffffff');
  const options = getModeMenuOptions();
  if (modeMenuIndex >= options.length) modeMenuIndex = 0;
  const bH = options.length === 3 ? 62 : 74, startY = options.length === 3 ? 112 : 140;
  options.forEach((opt, idx) => drawVSButton(42, startY + idx * (bH + 14), CANVAS_W - 84, bH, opt.label, modeMenuIndex === idx, opt.color));
  drawCrispText('▲ ▼ SCEGLI  •  BOMBA CONFERMA', CANVAS_W / 2, 370, '900 10px Courier New', '#00ffcc');
  if (getStorySave()) drawCrispText('SALVATAGGIO STORIA DISPONIBILE', CANVAS_W / 2, 405, '900 10px Courier New', '#ffea00');
}

function drawVSMenu() {
  ctx.fillStyle = '#060212'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  drawCrispText('MULTIPLAYER VS', CANVAS_W / 2, 62, '900 25px Courier New', '#ff0055');
  drawCrispText('SUPABASE REALTIME ARENA', CANVAS_W / 2, 92, '900 11px Courier New', '#00f0ff');
  drawVSButton(28, 150, 130, 74, 'CREA PARTITA', vsMenuIndex === 0, '#00ffcc');
  drawVSButton(180, 150, 130, 74, 'UNISCITI', vsMenuIndex === 1, '#ffea00');
  drawCrispText('Il creatore avvia quando tutti', CANVAS_W / 2, 270, 'bold 11px Courier New', '#ffffff');
  drawCrispText('hanno scelto e sono pronti.', CANVAS_W / 2, 288, 'bold 11px Courier New', '#ffffff');
  if (vsStatusMessage) drawCrispText(vsStatusMessage, CANVAS_W / 2, 338, '900 12px Courier New', '#ff5577');
}

function drawVSJoin() {
  ctx.fillStyle = '#060212'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  drawCrispText('UNISCITI ALLA STANZA', CANVAS_W / 2, 82, '900 19px Courier New', '#00f0ff');
  drawCrispText('INSERISCI IL CODICE DI 4 CARATTERI', CANVAS_W / 2, 132, '900 10px Courier New', '#ffffff');
  drawVSButton(82, 260, 174, 48, 'ENTRA ►', true, '#ffea00');
  drawCrispText('ESC PER TORNARE', CANVAS_W / 2, 338, 'bold 10px Courier New', '#ff5577');
  if (vsStatusMessage) drawCrispText(vsStatusMessage, CANVAS_W / 2, 365, '900 10px Courier New', '#ff5577');
}

function drawVSLobby() {
  ctx.fillStyle = '#060212'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  drawCrispText(`STANZA ${vsRoomCode}`, CANVAS_W / 2, 25, '900 21px Courier New', '#00f0ff');
  drawCrispText('CONDIVIDI QUESTO CODICE', CANVAS_W / 2, 48, '900 9px Courier New', '#ffffff');

  const local = vsPlayers[vsClientId];
  if (!local) { drawCrispText(vsStatusMessage || 'CONNESSIONE...', CANVAS_W / 2, 210, '900 15px Courier New', '#ffea00'); return; }
  const slot = VS_SLOTS[local.slotIndex];
  drawCrispText(`TU SEI ${slot.label}`, CANVAS_W / 2, 73, '900 18px Courier New', slot.hex);
  drawCrispText(`SPAWN: ${slot.corner}`, CANVAS_W / 2, 94, '900 12px Courier New', '#ffffff');

  const character = CHARACTERS[getVSCharacterKey()];
  if (character.portrait?.complete && character.portrait.naturalWidth) {
    ctx.save(); ctx.beginPath(); ctx.roundRect(CANVAS_W / 2 - 48, 108, 96, 90, 9); ctx.clip();
    ctx.drawImage(character.portrait, CANVAS_W / 2 - 48, 108, 96, 90); ctx.restore();
    ctx.strokeStyle = slot.hex; ctx.lineWidth = 3; ctx.strokeRect(CANVAS_W / 2 - 48, 108, 96, 90);
  }
  drawCrispText(`◄ ${character.name} ►`, CANVAS_W / 2, 216, '900 17px Courier New', slot.hex);

  Object.values(vsPlayers).sort((a, b) => a.slotIndex - b.slotIndex).forEach((item, index) => {
    const itemSlot = VS_SLOTS[item.slotIndex];
    drawCrispText(`${itemSlot.label}: ${item.username} / ${item.character} ${item.ready ? '✓' : '...'}`, 18, 250 + index * 22, '900 10px Courier New', itemSlot.hex, 'left', '#000000', 2);
  });
  drawCrispText(vsIsHost ? 'SPAZIO: PRONTO  •  INVIO: AVVIA' : 'SPAZIO: PRONTO', CANVAS_W / 2, 360, '900 10px Courier New', '#ffea00');
  drawCrispText(local.ready ? 'SEI PRONTO ✓' : 'SCEGLI E CONFERMA', CANVAS_W / 2, 386, '900 12px Courier New', local.ready ? '#00ff66' : '#ffffff');
  if (vsStatusMessage) drawCrispText(vsStatusMessage, CANVAS_W / 2, 410, '900 9px Courier New', '#ff5577');
}

function drawVSPlayer(item) {
  if (!item.alive) return;
  const image = ASSETS.VS_SPRITES[item.character]?.[item.color], py = item.y + HUD_HEIGHT;
  ctx.save();
  if (item.facingLeft) { ctx.translate(item.x, py); ctx.scale(-1, 1); ctx.translate(-item.x, -py); }
  if (image?.complete && image.naturalWidth) {
    const frameW = image.naturalWidth / 5, activeFrame = item.moving ? Math.floor(animTimer / 5) % 5 : 0;
    ctx.drawImage(image, activeFrame * frameW, 0, frameW, image.naturalHeight, item.x - 15, py - 17, 30, 30);
  } else {
    ctx.fillStyle = VS_SLOTS[item.slotIndex].hex; ctx.beginPath(); ctx.arc(item.x, py, 11, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  drawCrispText(item.username, item.x, py - 21, '900 7px Courier New', VS_SLOTS[item.slotIndex].hex, 'center', '#000000', 2);
}

// RENDERING GIOCO MULTIPLAYER IDENTICO ALLA STORIA
function drawVSGame() {
  drawGameWorld(); // Stesso motore di rendering della mappa storia
  ctx.fillStyle = '#0a0a22'; ctx.fillRect(0, 0, CANVAS_W, HUD_HEIGHT);
  ctx.strokeStyle = VS_SLOTS[vsLocalSlot || 0].hex; ctx.strokeRect(0, 0, CANVAS_W, HUD_HEIGHT);
  drawCrispText(`VS ${vsRoomCode}`, 8, 14, '900 11px Courier New', '#ffffff', 'left');
  drawCrispText(`VIVI ${Object.values(vsPlayers).filter(i => i.alive).length}`, 8, 31, '900 11px Courier New', '#00ffcc', 'left');
  const local = vsPlayers[vsClientId];
  if (local) drawCrispText(`${VS_SLOTS[local.slotIndex].label} / ${local.character}`, CANVAS_W - 8, 23, '900 10px Courier New', VS_SLOTS[local.slotIndex].hex, 'right');
  Object.values(vsPlayers).forEach(drawVSPlayer);
}

function drawVSWinner() {
  ctx.fillStyle = '#060212'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  const winner = vsWinnerId ? vsPlayers[vsWinnerId] : null, winnerSlot = winner ? VS_SLOTS[winner.slotIndex] : null;
  drawCrispText('PARTITA TERMINATA', CANVAS_W / 2, 92, '900 20px Courier New', '#ffffff');
  drawCrispText(winner ? 'VINCITORE!' : 'PAREGGIO!', CANVAS_W / 2, 145, '900 30px Courier New', winnerSlot?.hex || '#ffea00');
  if (winner) {
    drawCrispText(winner.username, CANVAS_W / 2, 195, '900 24px Courier New', winnerSlot.hex);
    drawCrispText(`${winnerSlot.label} • ${winner.character}`, CANVAS_W / 2, 229, '900 13px Courier New', '#ffffff');
  }
  drawCrispText('BOMBA PER TORNARE AL MENU', CANVAS_W / 2, 330, '900 12px Courier New', '#00f0ff');
}

function drawScreens() {
  const W = CANVAS_W, H = CANVAS_H;
  if (state === 'MODE_SELECT') { drawModeSelect(); return; }
  if (state === 'VS_MENU') { drawVSMenu(); return; }
  if (state === 'VS_JOIN') { drawVSJoin(); return; }
  if (state === 'VS_LOBBY') { drawVSLobby(); return; }
  if (state === 'VS_WINNER') { drawVSWinner(); return; }

  if (state === 'COVER') {
    if (ASSETS.COVER?.complete && ASSETS.COVER.naturalWidth !== 0) ctx.drawImage(ASSETS.COVER, 0, 0, W, H);
    else {
      ctx.fillStyle = '#060212'; ctx.fillRect(0, 0, W, H);
      drawCrispText('CYBER RUN: BOMBER', W / 2, 180, '900 24px Courier New', '#00f0ff');
      drawCrispText('AGENCY ARCADE', W / 2, 220, '900 16px Courier New', '#ffea00');
    }
    if (Math.floor(frame / 45) % 2 === 0) drawCrispText('PREMI BOMBA PER INIZIARE ►', W / 2, H - 25, '900 14px Courier New', '#00ffcc');
    return;
  }

  if (state === 'STORY') {
    ctx.fillStyle = 'rgba(6, 6, 20, 0.98)'; ctx.fillRect(0, 0, W, H);
    drawCrispText('LA STORIA', W / 2, 42, '900 24px Courier New', '#ffea00');
    ctx.beginPath(); ctx.fillStyle = '#120a28'; ctx.roundRect(14, 62, W - 28, H - 105, 12); ctx.fill();
    ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 2.5; ctx.stroke();
    drawCrispText('Laura e Guido sono nei guai!', W / 2, 88, '900 15px Courier New', '#ff0055');
    ['Un’ondata di file corrotti', 'ha invaso il server:', 'grafiche rovinate, export', 'sbagliati e bozze inutilizzabili', 'stanno per compromettere', 'la consegna!']
      .forEach((l, idx) => drawCrispText(l, W / 2, 122 + idx * 18, 'bold 12px Courier New', '#ffffff'));
    ['Piazza le bombe di Cleanup,', 'fai saltare i file spazzatura', 'e salva più grafiche possibile', 'prima delle 18:30!']
      .forEach((l, idx) => drawCrispText(l, W / 2, 252 + idx * 20, '900 13px Courier New', '#00ffcc'));
    if (Math.floor(frame / 40) % 2 === 0) drawCrispText('CONTINUA ►', W / 2, H - 20, '900 15px Courier New', '#ffea00');
    return;
  }

  if (state === 'RULES') {
    ctx.fillStyle = 'rgba(6, 6, 20, 0.98)'; ctx.fillRect(0, 0, W, H);
    drawCrispText('REGOLE DI GIOCO', W / 2, 38, '900 22px Courier New', '#00f0ff');
    ctx.beginPath(); ctx.fillStyle = '#101228'; ctx.roundRect(14, 58, W - 28, H - 100, 12); ctx.fill();
    ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2.5; ctx.stroke();
    drawCrispText('01. PULISCI FILE CORROTTI', W / 2, 82, '900 14px Courier New', '#ffea00');
    drawCrispText('Fai esplodere .JPG, .PNG, .PSD, .AI e .PDF', W / 2, 102, 'bold 12px Courier New', '#ffffff');
    drawCrispText('02. DISTRUGGI I BUG', W / 2, 150, '900 14px Courier New', '#00ffcc');
    drawCrispText('Elimina i bug vaganti e i Mega Boss', W / 2, 170, 'bold 12px Courier New', '#ffffff');
    drawCrispText('03. RACCOGLI POTENZIAMENTI', W / 2, 218, '900 14px Courier New', '#ff00ff');
    drawCrispText('Aumenta raggio, bombe e velocità', W / 2, 238, 'bold 12px Courier New', '#ffffff');
    drawCrispText('04. CONTROLLI GUIDA', W / 2, 286, '900 14px Courier New', '#ffd700');
    drawCrispText('Joystick Touch / WASD + Tasto BOMBA', W / 2, 306, 'bold 12px Courier New', '#ffffff');
    if (Math.floor(frame / 40) % 2 === 0) drawCrispText('CONTINUA ►', W / 2, H - 20, '900 15px Courier New', '#ffea00');
    return;
  }

  if (state === 'POWERUPS_INFO') {
    ctx.fillStyle = 'rgba(6, 6, 20, 0.98)'; ctx.fillRect(0, 0, W, H);
    drawCrispText('MODULI & POTENZIAMENTI', W / 2, 32, '900 18px Courier New', '#ffea00');
    [
      { key: 'BOMBA', title: 'GOMMA VETTORIALE', desc: '+1 Gomma (Cancella Blocchi)', col: '#ff0055', emoji: '💣' },
      { key: 'FUOCO', title: 'WARP BRUSH', desc: '+1 Raggio Esplosione', col: '#ffaa00', emoji: '🔥' },
      { key: 'SCARPA', title: 'ACCELERATORE ITERAZIONE', desc: '+20% Vel. Elaborazione', col: '#00ffcc', emoji: '👟' },
      { key: 'CAFFE', title: 'CACHE PUNTI LAYERS', desc: '+300 Punti Extra Layers', col: '#ffd700', emoji: '☕' },
      { key: 'CUORE', title: 'COMMAND - Z', desc: 'Cuore del Tempo (+1 Vita)', col: '#ff007f', emoji: '❤️' }
    ].forEach((item, idx) => {
      let boxY = 48 + idx * 56;
      ctx.fillStyle = '#101228'; ctx.beginPath(); ctx.roundRect(14, boxY, W - 28, 50, 8); ctx.fill();
      ctx.strokeStyle = item.col; ctx.lineWidth = 1.5; ctx.stroke();
      if (ASSETS[item.key]?.complete && ASSETS[item.key].naturalWidth !== 0) ctx.drawImage(ASSETS[item.key], 24, boxY + 11, 28, 28);
      else drawCrispText(item.emoji, 38, boxY + 25, '20px sans-serif', '#ffffff', 'center', null, 0);
      drawCrispText(item.title, 62, boxY + 18, '900 12px Courier New', item.col, 'left');
      drawCrispText(item.desc, 62, boxY + 35, 'bold 11px Courier New', '#ffffff', 'left');
    });
    if (Math.floor(frame / 40) % 2 === 0) drawCrispText('CONTINUA ►', W / 2, H - 15, '900 15px Courier New', '#ffea00');
    return;
  }

  if (state === 'CHAR_SELECT') {
    ctx.fillStyle = 'rgba(6, 6, 20, 0.98)'; ctx.fillRect(0, 0, W, H);
    drawCrispText('SCEGLI IL TUO GRAFICO 🎨', W / 2, 34, '900 20px Courier New', '#ffff00');
    let c = CHARACTERS[charList[charSelectIndex]];
    ctx.beginPath(); ctx.fillStyle = '#101228'; ctx.roundRect(14, 52, W - 28, H - 90, 14); ctx.fill();
    ctx.strokeStyle = c.primary; ctx.lineWidth = 3; ctx.stroke();
    if (c.portrait?.complete && c.portrait.naturalWidth !== 0) {
      ctx.save(); ctx.beginPath(); ctx.roundRect(W / 2 - 60, 64, 120, 110, 10); ctx.clip();
      ctx.drawImage(c.portrait, W / 2 - 60, 64, 120, 110); ctx.restore();
      ctx.strokeStyle = c.primary; ctx.lineWidth = 2; ctx.strokeRect(W / 2 - 60, 64, 120, 110);
    }
    drawCrispText(c.name, W / 2, 200, '900 24px Courier New', c.primary);
    drawCrispText(c.role, W / 2, 224, '900 13px Courier New', '#ffffff');
    drawCrispText(c.perkBonusTitle, W / 2, 256, '900 13px Courier New', '#ffff00');
    drawCrispText(c.perkBonusDesc, W / 2, 274, 'bold 12px Courier New', '#ffffff');
    drawCrispText(c.perkMalusTitle, W / 2, 298, '900 13px Courier New', '#ff0055');
    drawCrispText(c.perkMalusDesc, W / 2, 316, 'bold 12px Courier New', '#ffffff');
    drawCrispText('◄', 32, 175, '900 30px Courier New', '#ffea00');
    drawCrispText('►', W - 32, 175, '900 30px Courier New', '#ffea00');
    if (Math.floor(frame / 40) % 2 === 0) drawCrispText('CONTINUA ►', W / 2, H - 20, '900 16px Courier New', c.primary);
    return;
  }

  if (state === 'ERA_INTRO') {
    ctx.save(); ctx.fillStyle = 'rgba(6, 2, 18, 0.96)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#0e051b'; ctx.beginPath(); ctx.roundRect(10, 10, W - 20, H - 20, 14); ctx.fill();
    ctx.strokeStyle = '#ffea00'; ctx.lineWidth = 2.5; ctx.stroke();
    let eraData = ERAS_INFO[currentEraIndex - 1], isBossLvl = (level % 10 === 0);
    drawCrispText(`STAGE ${level}/50`, W / 2, 30, '900 16px Courier New', '#ffea00');
    drawCrispText(eraData.name, W / 2, 48, '900 13px Courier New', eraData.colBase);
    ctx.fillStyle = '#140a28'; ctx.beginPath(); ctx.roundRect(20, 62, W - 40, 60, 8); ctx.fill();
    ctx.strokeStyle = eraData.colBase; ctx.lineWidth = 1.5; ctx.stroke();
    let lines = isBossLvl ? eraData.storyBoss : eraData.storyEra;
    lines.forEach((l, idx) => drawCrispText(l, W / 2, 78 + idx * 16, 'bold 11px Courier New', '#ffffff'));

    if (isBossLvl) {
      let bossEra = Math.min(5, Math.floor(level / 10));
      ctx.fillStyle = '#160a2c'; ctx.beginPath(); ctx.roundRect(20, 132, W - 40, 168, 10); ctx.fill();
      ctx.strokeStyle = '#ff0055'; ctx.lineWidth = 2; ctx.stroke();
      drawCrispText('⚠️ ALLERTA MEGA BOSS (2x2) ⚠️', W / 2, 150, '900 12px Courier New', '#ff0055');
      let bImg = ASSETS.BOSSI[bossEra], bx = W / 2 - 24, by = 164;
      ctx.fillStyle = '#080818'; ctx.fillRect(bx - 3, by - 3, 54, 54);
      ctx.strokeStyle = '#ff0055'; ctx.lineWidth = 1.5; ctx.strokeRect(bx - 3, by - 3, 54, 54);
      if (bImg?.complete && bImg.naturalWidth !== 0) ctx.drawImage(bImg, bx, by, 48, 48);
      else drawCrispText(`BOSS ${bossEra}`, W / 2, by + 24, '900 12px Courier New', eraData.colBase);
      drawCrispText(eraData.boss, W / 2, 234, '900 13px Courier New', '#ffea00');
      drawCrispText(`RESISTENZA: ${10 + (bossEra - 1) * 5} COLPI`, W / 2, 254, 'bold 11px Courier New', '#ffffff');
    } else {
      let cardW = 142, cardH = 168, mImg = ASSETS.MOSTRI[currentEraIndex];
      // Card 1
      ctx.fillStyle = '#160a2c'; ctx.beginPath(); ctx.roundRect(20, 132, cardW, cardH, 10); ctx.fill();
      ctx.strokeStyle = eraData.colBase; ctx.lineWidth = 2; ctx.stroke();
      drawCrispText("MOSTRO BASE", 20 + cardW / 2, 148, '900 11px Courier New', '#ffffff');
      drawCrispText(eraData.monster, 20 + cardW / 2, 164, '900 11px Courier New', eraData.colBase);
      if (mImg?.complete && mImg.naturalWidth !== 0) ctx.drawImage(mImg, 20 + cardW / 2 - 20, 178, 40, 40);
      drawCrispText("RESISTENZA: 1 HP", 20 + cardW / 2, 244, 'bold 10px Courier New', '#ffffff');
      drawCrispText("+200 PUNTI", 20 + cardW / 2, 260, '900 11px Courier New', '#00ffcc');

      // Card 2
      ctx.fillStyle = '#160a2c'; ctx.beginPath(); ctx.roundRect(W - 20 - cardW, 132, cardW, cardH, 10); ctx.fill();
      ctx.strokeStyle = eraData.colTough; ctx.lineWidth = 2; ctx.stroke();
      drawCrispText("CORAZZATO", W - 20 - cardW / 2, 148, '900 11px Courier New', '#ffffff');
      drawCrispText(eraData.monster, W - 20 - cardW / 2, 164, '900 11px Courier New', eraData.colTough);
      if (mImg?.complete && mImg.naturalWidth !== 0) {
        ctx.save(); ctx.filter = eraData.filterTough; ctx.drawImage(mImg, W - 20 - cardW / 2 - 20, 178, 40, 40); ctx.restore();
      }
      drawCrispText("RESISTENZA: 2 HP", W - 20 - cardW / 2, 244, 'bold 10px Courier New', '#ffffff');
      drawCrispText("+350 PUNTI", W - 20 - cardW / 2, 260, '900 11px Courier New', '#ffaa00');
    }
    drawCrispText(`MOLTIPLICATORE: x${currentBoss.scoreMult}`, W / 2, 312, '900 12px Courier New', '#00ffcc');
    drawCrispText('Pulisci il server dai file corrotti!', W / 2, 328, 'bold 11px Courier New', '#ffea00');
    ctx.fillStyle = (Math.floor(frame / 30) % 2 === 0) ? '#ffea00' : '#ffd700';
    ctx.beginPath(); ctx.roundRect((W - 200) / 2, 352, 200, 36, 8); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
    drawCrispText('INIZIA STAGE ►', W / 2, 370, '900 13px Courier New', '#000000', 'center', null, 0);
    ctx.restore(); return;
  }

  if (state === 'PAUSE') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'; ctx.fillRect(0, 0, W, H);
    drawCrispText('IN PAUSA', W / 2, 135, '900 30px Courier New', '#ffea00');
    drawCrispText('TOCCA SOPRA PER RIPRENDERE', W / 2, 188, '900 12px Courier New', '#00f0ff');
    drawVSButton(62, 245, W - 124, 58, 'SALVA ED ESCI', true, '#00ffcc');
    drawCrispText('OPPURE PREMI INVIO', W / 2, 326, '900 10px Courier New', '#ffffff');
    return;
  }

  if (state === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.88)'; ctx.fillRect(0, 0, W, H);
    drawCrispText('GAME OVER 💀', W / 2, H / 2 - 35, '900 34px Courier New', currentBoss.primary);
    drawCrispText(`SCORE: ${score}`, W / 2, H / 2 + 10, '900 20px Courier New', '#ffff00');
    drawCrispText(`RECORD: ${hiScore}`, W / 2, H / 2 + 40, '900 15px Courier New', '#ff0055');
    drawCrispText('TOCCA PER RIPROVARE', W / 2, H / 2 + 90, '900 16px Courier New', Math.floor(frame / 30) % 2 === 0 ? '#ffffff' : currentBoss.primary);
  }
}

canvas.addEventListener('pointerdown', e => {
  getAC();
  let rect = canvas.getBoundingClientRect();
  let x = (e.clientX - rect.left) * (CANVAS_W / rect.width), y = (e.clientY - rect.top) * (CANVAS_H / rect.height);
  if (['COVER', 'STORY', 'RULES', 'POWERUPS_INFO', 'VS_WINNER'].includes(state)) { advanceMenuState(); return; }
  if (state === 'MODE_SELECT') {
    const opts = getModeMenuOptions(), bH = opts.length === 3 ? 62 : 74, startY = opts.length === 3 ? 112 : 140;
    const idx = Math.floor((y - startY) / (bH + 14));
    if (idx >= 0 && idx < opts.length && y <= startY + idx * (bH + 14) + bH) { modeMenuIndex = idx; advanceMenuState(); }
    return;
  }
  if (state === 'VS_MENU') { vsMenuIndex = x < CANVAS_W / 2 ? 0 : 1; advanceMenuState(); return; }
  if (state === 'VS_JOIN') { if (y >= 240 && y <= 330) advanceMenuState(); return; }
  if (state === 'VS_LOBBY') {
    if (y >= 105 && y <= 235) {
      vsCharacterIndex = x < CANVAS_W / 2 ? 0 : 1;
      const local = vsPlayers[vsClientId]; if (local) { local.character = getVSCharacterKey(); local.ready = false; }
    } else toggleVSReady();
    return;
  }
  if (state === 'CHAR_SELECT') {
    if (x < 60) charSelectIndex = (charSelectIndex - 1 + 2) % 2;
    else if (x > CANVAS_W - 60) charSelectIndex = (charSelectIndex + 1) % 2;
    else advanceMenuState();
    return;
  }
  if (state === 'ERA_INTRO') { state = 'playing'; return; }
  if (state === 'playing') { state = 'PAUSE'; return; }
  if (state === 'PAUSE') { if (y >= 235 && y <= 315) saveStoryAndExit(); else state = 'playing'; }
  if (state === 'gameover') { state = 'CHAR_SELECT'; return; }
});

function update() {
  frame++;
  if (shakeTime > 0) shakeTime--;
  if (state === 'VS_PLAYING') { updateVSGame(); return; }
  if (VS_MENU_STATES.includes(state) || ['COVER', 'STORY', 'RULES', 'POWERUPS_INFO', 'CHAR_SELECT', 'PAUSE', 'ERA_INTRO', 'gameover'].includes(state)) return;
  updatePlayer(); updateEnemies(); updateBombsAndExplosions();
}

function draw() {
  ctx.save();
  if (shakeTime > 0) ctx.translate((Math.random() - 0.5) * shakeMag, (Math.random() - 0.5) * shakeMag);
  ctx.fillStyle = '#060212'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  if (VS_MENU_STATES.includes(state) || ['COVER', 'STORY', 'RULES', 'POWERUPS_INFO', 'CHAR_SELECT'].includes(state)) {
    drawScreens(); ctx.restore(); return;
  }
  if (state === 'VS_PLAYING') { drawVSGame(); ctx.restore(); return; }

  drawGameWorld(); drawHUD();
  if (['ERA_INTRO', 'PAUSE', 'gameover'].includes(state)) drawScreens();
  ctx.restore();
}

let lastTime = 0;
const FIXED_STEP = 1000 / 60;
let accumulator = 0;

function loop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  let deltaTime = timestamp - lastTime;
  lastTime = timestamp;
  if (deltaTime > 250) deltaTime = 250;
  accumulator += deltaTime;
  while (accumulator >= FIXED_STEP) { update(); accumulator -= FIXED_STEP; }
  draw();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);