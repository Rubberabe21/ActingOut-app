/* Pixel Punch V2 - motore isolato 512x512 / Phaser 3 con AudioManager integrato */
(() => {
  'use strict';

  // Usa il mixer condiviso: BGM 0,35 e SFX 0,85, come negli altri giochi.
  const AudioManager = window.AudioManager;

  async function savePixelPunchScore(score) {
    if (!window.ArcadeScoreManager || score <= 0) return;
    try {
      const currentUser = JSON.parse(localStorage.getItem('arcade_current_user'));
      if (!currentUser) return;
      await ArcadeScoreManager.saveGameScore({
        client: typeof supabaseClient === 'undefined' ? null : supabaseClient,
        currentUser,
        gameKey: 'pixelPunch',
        score
      });
    } catch (error) {
      console.warn('[PixelPunch] Salvataggio punteggio non riuscito:', error);
    }
  }

  function playSfx(path) {
    if (!AudioManager || AudioManager.isSFXMuted()) return;
    const context = AudioManager.getContext();
    const destination = AudioManager.getSfxDestination();
    if (!context || !destination) return;
    if (context.state === 'suspended') context.resume().catch(() => {});

    const name = path.split('/').pop().replace('sfx_', '').replace('.mp3', '');
    const profiles = {
      punch:   { type: 'square', start: 320, end: 120, duration: 0.08, volume: 0.32 },
      hit:     { type: 'square', start: 520, end: 170, duration: 0.11, volume: 0.36 },
      crate:   { type: 'square', start: 210, end: 70,  duration: 0.13, volume: 0.34 },
      block:   { type: 'triangle', start: 260, end: 420, duration: 0.10, volume: 0.28 },
      hurt:    { type: 'sawtooth', start: 180, end: 45,  duration: 0.25, volume: 0.38 },
      gameover:{ type: 'sawtooth', start: 170, end: 38,  duration: 0.35, volume: 0.40 },
      special: { type: 'triangle', start: 300, end: 900, duration: 0.22, volume: 0.40 },
      pickup:  { type: 'triangle', start: 523, end: 1046,duration: 0.24, volume: 0.34 },
      win:     { type: 'triangle', start: 440, end: 880, duration: 0.30, volume: 0.36 },
      select:  { type: 'sine', start: 440, end: 660, duration: 0.08, volume: 0.24 }
    };
    const profile = profiles[name] || profiles.select;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = profile.type;
    oscillator.frequency.setValueAtTime(profile.start, now);
    oscillator.frequency.exponentialRampToValueAtTime(profile.end, now + profile.duration);
    gain.gain.setValueAtTime(profile.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + profile.duration);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(now);
    oscillator.stop(now + profile.duration);
  }

  // --- STILE CSS PER TASTI E JOYSTICK ---
  const style = document.createElement('style');
  style.innerHTML = `
    .top-header {
      display: grid !important;
      grid-template-columns: 112px minmax(0, 1fr) 112px !important;
      align-items: center;
      gap: 4px !important;
    }
    .top-header .header-title {
      display: flex;
      justify-content: center;
      align-items: baseline;
      gap: 4px;
      min-width: 0;
      text-align: center;
      font-size: 15px;
    }
    .top-header .header-title span:first-child { color: #ffea00; transform: skew(-8deg); text-shadow: 2px 2px 0 #ff0055; }
    .top-header .header-title span:last-child { color: #ff3e91; transform: skew(8deg); text-shadow: 2px 2px 0 #7b176f, 0 0 8px #ff3e91; }
    .top-header .header-btns-right { justify-content: flex-end; gap: 4px; }
    .top-header .options-btn { width: 76px; }
    .top-header .restart-btn { width: 72px; }
    .top-header .options-btn,
    .top-header .restart-btn,
    .top-header .exit-x-btn {
      height: 34px;
      padding-top: 0;
      padding-bottom: 0;
      display: inline-grid;
      place-items: center;
      font-size: 11px;
      font-weight: 900;
    }
    .top-header .exit-x-btn { width: 34px; min-width: 34px; font-size: 16px; line-height: 34px; }
    @media (max-width: 390px) {
      .top-header { grid-template-columns: 82px minmax(0, 1fr) 108px !important; }
      .top-header .options-btn { width: 72px; }
      .top-header .restart-btn { width: 68px; }
    }
    .virtual-btn, #btn-a, #btn-b, #btn-p, .action-btn, [data-action="attack"], [data-action="special"], [data-action="pause"] {
      width: 72px !important;
      height: 72px !important;
      font-size: 22px !important;
      line-height: 72px !important;
      border-radius: 50% !important;
    }
    #btn-p, .pause-btn, [data-action="pause"] {
      width: 64px !important;
      height: 64px !important;
      font-size: 18px !important;
    }
    #joystick, .joystick-container, .touch-joystick {
      left: 25px !important;
      bottom: 25px !important;
      transform: none !important;
    }
    .action-buttons {
      grid-template-columns: repeat(2, minmax(76px, 88px)) !important;
      grid-template-rows: repeat(2, minmax(76px, 88px)) !important;
      gap: 4px 8px !important;
      transform: rotate(7deg) !important;
      transform-origin: center !important;
    }
    .control-deck {
      position: relative !important;
    }
    .deck-pause-btn {
      position: absolute;
      top: 10px;
      left: 50%;
      z-index: 6;
      width: 88px;
      height: 38px;
      transform: translateX(-50%);
      border: 2px solid #00f0ff;
      border-radius: 9px;
      background: linear-gradient(145deg, #7a2bb1, #3a105f);
      color: #ffffff;
      box-shadow: 0 4px 0 #230638, 0 0 13px #00f0ff77;
      font: 900 12px "Courier New", monospace;
      touch-action: none;
    }
    .deck-pause-btn:active {
      transform: translateX(-50%) translateY(3px);
      box-shadow: 0 1px 0 #230638, 0 0 16px #00f0ffaa;
    }
    @media (max-width: 600px) {
      .deck-pause-btn {
        left: 38%;
      }
    }
    .action-buttons .action-btn {
      grid-column: auto !important;
      margin: 0 !important;
      line-height: normal !important;
    }
    .action-buttons .btn-label {
      display: grid;
      place-items: center;
      width: 100%;
      height: 100%;
      transform: rotate(-7deg);
      font: 900 30px "Courier New", monospace;
      line-height: 1;
      text-shadow: 0 2px 0 #0008, 0 0 6px currentColor;
    }
    #btnGuard, #btnAttack, #btnSpecial, #btnRun {
      width: 82px !important;
      height: 82px !important;
      border-width: 4px !important;
      border-radius: 50% !important;
    }
    #btnAttack {
      background: radial-gradient(circle at 32% 28%, #ff86bd, #e31368 55%, #79002f) !important;
      box-shadow: 0 6px 0 #570022, 0 0 20px #ff3e91aa !important;
    }
    #btnSpecial {
      clip-path: none;
      background: linear-gradient(145deg, #c698ff, #7b32d5 58%, #381069) !important;
      box-shadow: 0 5px 0 #260746, 0 0 15px #a260ffbb !important;
    }
    #btnSpecial .btn-label { font-size: 30px; }
    #btnRun {
      background: linear-gradient(145deg, #fff27a, #ff9d19 58%, #b93b00) !important;
      color: #291000 !important;
      box-shadow: 0 5px 0 #6d2500, 0 0 15px #ffb00099 !important;
    }
    #btnRun .btn-label {
      font-size: 30px;
      text-shadow: 0 1px 0 #fff7;
    }
    #btnRun.active {
      transform: translateY(3px) scale(.95);
      box-shadow: 0 2px 0 #6d2500, 0 0 22px #ffea00 !important;
    }
  `;
  document.head.appendChild(style);

  if (!window.Phaser) {
    document.getElementById('boot-error').style.display = 'block';
    return;
  }

  const W = 512;
  const H = 512;
  const NATIVE_BACKGROUND_WIDTH = 1920;
  const NATIVE_FLOOR_WIDTH = 6800;
  const NATIVE_BACKGROUND_HEIGHT = 1000;
  const BACKGROUND_SCALE = H / NATIVE_BACKGROUND_HEIGHT;
  const WORLD_W = NATIVE_FLOOR_WIDTH * BACKGROUND_SCALE;
  const BACKGROUND_DISPLAY_W = NATIVE_BACKGROUND_WIDTH * BACKGROUND_SCALE;
  const BACKGROUND_SCROLL_FACTOR = (BACKGROUND_DISPLAY_W - W) / (WORLD_W - W);
  const WORLD_VIEW_TOP = 64;
  const WORLD_VIEW_BOTTOM = H;
  const WORLD_VIEW_HEIGHT = WORLD_VIEW_BOTTOM - WORLD_VIEW_TOP;
  const WORLD_SCALE_Y = BACKGROUND_SCALE;
  const WORLD_RENDER_TOP = 0;
  const MOVEMENT_BOTTOM = H;
  const MOVEMENT_TOP = H - 345 * BACKGROUND_SCALE;
  const LOWER_LANE_TOP = Phaser.Math.Linear(MOVEMENT_TOP, MOVEMENT_BOTTOM, 0.24);
  const BOSS_GRID_COLUMNS = 5;
  const BOSS_GRID_ROWS = 4;
  const SPECIAL_COOLDOWN = 5000;
  const ENTITY_SIZE_MULTIPLIER = 1.2 * 1.15;
  
  // Gli enti mantengono le proporzioni relative esistenti, ma seguono la
  // stessa scala 0,512 dell'ambiente 3200x1000.
  const ENTITY_SCALE = 2 * BACKGROUND_SCALE * ENTITY_SIZE_MULTIPLIER;
  const ENEMY_SCALE = ENTITY_SCALE * 0.9;
  const BOSS_SCALE = 2.2 * BACKGROUND_SCALE * ENTITY_SIZE_MULTIPLIER;
  const OBJECT_SCALE = 2.5 * BACKGROUND_SCALE * ENTITY_SIZE_MULTIPLIER;
  const COMBAT_SCALE = BACKGROUND_SCALE * ENTITY_SIZE_MULTIPLIER;
  const RACHE_DISPLAY_HEIGHT = 128 * ENTITY_SCALE * 0.8;
  const TAXI_DISPLAY_HEIGHT = RACHE_DISPLAY_HEIGHT * (160 / 170);
  const TAXI_DISPLAY_WIDTH = TAXI_DISPLAY_HEIGHT * (2478 / 1728);
  const ROOT = 'assets/PixelPunch/GameV2/';

  const PLAYERS = [
    { 
      key: 'cristina', file: 'cri.png', label: 'CRISTINA', select: 'cri_select.png', color: 0xff3e91,
      role: 'THE FIXER',
      bio: 'Focalizzata sulla velocità. Sfreccia tra i nemici e ricarica le speciali a tempo record.',
      bonus: '⚡ +20% Velocità di movimento\n⏱️ -20% Ricarica Speciale', 
      malus: '💥 -15% Danno Attacco Base',
      speedMult: 1.20, dmgMult: 0.85, dmgTakenMult: 1.0, cdMult: 0.80, healMult: 1.0 
    },
    { 
      key: 'iris', file: 'iris.png', label: 'IRIS', select: 'iris_select.png', color: 0x39dfff,
      role: 'PROMPT PADAWAN',
      bio: 'Potenza pura. Assorbe i colpi senza piegarsi e infligge danni devastanti.',
      bonus: '🥊 +25% Danno Attacco Base\n🛡️ -20% Danni Subiti', 
      malus: '🐢 -15% Velocità di movimento',
      speedMult: 0.85, dmgMult: 1.25, dmgTakenMult: 0.80, cdMult: 1.0, healMult: 1.0 
    },
    { 
      key: 'rache', file: 'rache.png', label: 'RACHELE', select: 'rache_select.png', color: 0xffd43b,
      role: 'WORK MACHINE',
      bio: 'Maestra del recupero. Resiste alla pressione grazie a cure potenziate e speciali frequenti.',
      bonus: '🍕 +50% Recupero salute\n⚡ +20% Danno Attacco Base',
      malus: '🛡️ Danni subiti normali',
      speedMult: 1.15, dmgMult: 1.20, dmgTakenMult: 1.0, cdMult: 0.70, healMult: 1.50
    }
  ];

  function getPlayerScale(character) {
    return character === 'iris' ? ENTITY_SCALE * 0.75 : ENTITY_SCALE * 0.8;
  }

  const ENEMY_FILES = [
    '1_stagista.png', '2_manager.png', '3_copywriter.png', '4_designer.png',
    '5_influencer.png', '6_fonico.png', '7_cavi.png', '8_stylist.png',
    '9_rider.png', '10_monopattino.png', '11_turisti.png', '12_controllore.png',
    '13_guardia.png', '14_avvocato.png', '15_hr.png', '16_account.png',
    '17_consulente.png', '18_investor.png', '19_techbro.png', '20_brand.png'
  ];
  const ENEMY_DOSSIERS = [
    [
      { name: 'LO STAGISTA ETERNO', text: 'Ha un badge provvisorio dal 2019 e combatte per conquistare una scrivania.' },
      { name: 'IL MANAGER URGENTE', text: 'Trasforma ogni richiesta in una priorità assoluta, soprattutto alle 18:29.' },
      { name: 'COPY TERMINATOR', text: 'Corregge headline inesistenti e colpisce con revisioni chilometriche.' },
      { name: 'PIXEL DESIGNER', text: 'Difende font e margini come fossero l’ultima campagna sulla Terra.' }
    ],
    [
      { name: 'INFLUENCER TAKE 99', text: 'Non lascia il set finché la luce non valorizza perfettamente il suo profilo.' },
      { name: 'IL FONICO PERMALOSO', text: 'Sente ogni rumore, tranne quando gli chiedono di abbassare il volume.' },
      { name: 'DOMATORE DI CAVI', text: 'Ha trasformato il pavimento del set in una trappola elettrica.' },
      { name: 'STYLIST DA GUERRA', text: 'Attacca chiunque osi spiegazzare un outfit già approvato.' }
    ],
    [
      { name: 'RIDER TURBO', text: 'Attraversa Via Po senza frenare e considera i pedoni semplici ostacoli.' },
      { name: 'MONOPATTINO MAD', text: 'Sbuca dal nulla sul pavè con traiettorie impossibili da prevedere.' },
      { name: 'TURISTA SELFIE', text: 'Blocca ogni passaggio pur di inquadrare la Mole nel formato giusto.' },
      { name: 'IL CONTROLLORE', text: 'Chiede il biglietto anche a chi sta salvando un progetto milionario.' }
    ],
    [
      { name: 'GUARDIA CORPORATE', text: 'Protegge l’ascensore panoramico e non accetta appuntamenti fuori agenda.' },
      { name: 'AVVOCATO COMMA 12', text: 'Lancia contratti, postille e clausole scritte troppo in piccolo.' },
      { name: 'HR SORRISO FREDDO', text: 'Ti invita a un confronto sereno mentre prepara il downsizing.' },
      { name: 'ACCOUNT ESCALATION', text: 'Rimbalza responsabilità e richieste finché la deadline non esplode.' }
    ],
    [
      { name: 'CONSULENTE PREMIUM', text: 'Presenta soluzioni costosissime a problemi che prima non esistevano.' },
      { name: 'INVESTOR SHARK', text: 'Fiuta l’incertezza e trasforma ogni esitazione in un taglio al budget.' },
      { name: 'TECHBRO DISRUPTOR', text: 'Vuole rivoluzionare il pitch con una piattaforma ancora in beta.' },
      { name: 'BRAND GUARDIAN', text: 'Boccia ogni idea che non usa esattamente il tono di voce del manuale.' }
    ]
  ];
  const BOSS_FILES = ['21_boss_creative.png', '22_boss_regista.png', '23_boss_tassista.png', '24_boss_client.png', '25_boss_ceo.png'];
  const BOSS_NAMES = ['IL CREATIVO', 'LA REGISTA VIP', 'IL TAXISTA ARRABBIATO', 'LADY DOWNSIZE', 'IL CEO'];
  // Cinque combattimenti normali, seguiti da un'arena dedicata al boss.
  const ARENA_X = [900, 1900, 2900, 3900, 4900, 5900].map(x => x * BACKGROUND_SCALE);
  const BOSS_ARENA_INDEX = ARENA_X.length - 1;
  
  const STORY_PAGES = [
    {
      title: 'LA SCADENZA',
      subtitle: 'VENERDÌ ORE 19:00',
      text: 'È venerdì sera a Torino e mancano solo 5 ore alla scadenza improrogabile del progetto della vita.\n\nLa campagna da un milione di euro che salverà ActingOut dal fallimento e dalla vendita alla multinazionale "RAI" è pronta per l\'esportazione.'
    },
    {
      title: 'IL SABOTAGGIO',
      subtitle: 'ATTACCO SU TUTTI I FRONTI',
      text: 'Qualcuno ha piazzato trappole e ostacoli lungo l\'intera filiera!\n\nAccount spietati, troupe impazzite, controllori e rider spericolati hanno sbarrato le strade di Torino per impedire che l\'Hard Drive con il master finale arrivi a destinazione.'
    },
    {
      title: 'LA MISSIONE',
      subtitle: 'PITCH OR DIE',
      text: 'Le tre Producers Cristina, Iris e Rachele devono farsi strada a colpi di tastiera, ciak e caffè bollente.\n\nSgombera ogni area, sconfiggi i Boss di settore e consegna il .def entro la mezzanotte!'
    }
  ];

  const SCENARIO_STORIES = [
    { title: 'OPEN SPACE AGENZIA', subtitle: 'INTERNAL CHAOS', text: 'Il cliente manda i suoi Account e Manager a requisire i computer dell’ufficio per fermare l’esportazione del video. Le Producer devono farsi strada a colpi di tastiera e caffè bollente per portare via l’Hard Drive.' },
    { title: 'SET DOCKS DORA', subtitle: 'IL SET FUORI CONTROLLO', text: 'Bisogna recuperare gli ultimi girati B-roll sul set. Il Regista Capriccioso e la sua troupe sono impazziti e hanno bloccato le uscite: occorre sgomberare l’area tra faretti e cavi scoppiettanti.' },
    { title: 'TORINO CENTRO', subtitle: 'LA CORSA SU VIA PO', text: 'Attraversamento rapido della città verso il grattacielo. Controllori GTT, Rider spericolati e Turisti col selfie-stick cercano di far cadere la borsa con l’Hard Drive lungo il pavè torinese.' },
    { title: 'CORPORATE TOWER', subtitle: 'LA BUROCRAZIA', text: 'Infiltrazione nell’edificio del cliente. Bisogna farsi strada tra Guardie di sicurezza, Avvocati armati di contratti e HR spietati per prendere l’ascensore panoramico.' },
    { title: 'PENTHOUSE VIP', subtitle: 'IL PITCH FINALE', text: 'L’ultimo scontro nel salone barocco. Il CEO e il Client Boss tentano di bocciare il progetto con attacchi finanziari devastanti. La vittoria sblocca PITCH DELIVERED a un secondo dalla mezzanotte.' }
  ];

  const CRATES = [
    ['macchinetta', 'progetti'], ['luce', 'scatola'], ['prope', 'trash'],
    ['acqua', 'cestino'], ['tavolo', 'vaso']
  ];
  const PICKUPS = [
    ['pennetta_littlepoint.png', 'ssd_midpoint.png', 'tavoletta_bigpoint.png'],
    ['ciak_littlepoint.png', 'roll_midpoint.png', 'oscar_bigpoint.png'],
    ['gtt_littlepoint.png', 'portafoglio_midpoint.png', 'mole_bigpoint.png'],
    ['USB_littlepoint.png', 'memory_midpoint.png', 'hd_bigpoint.png'],
    ['orologio_littlepoint.png', 'soldi_midpoint.png', 'contratto_bigpoint.png']
  ];
  const LIVES = [
    ['coffe_littlelife.png', 'sandwich_biglife.png'], ['lattina_littlelife.png', 'pizza_biglife.png'],
    ['gelato_littlelife.png', 'toast_biglife.png'], ['water_littlelife.png', 'sushi_biglife.png'],
    ['wine_littlelife.png', 'dolci_biglife.png']
  ];

  const FRAME_MAP = {
    idle: [0, 1, 7], block: [2, 2, 1], walk: [3, 6, 7], atk: [7, 9, 6],
    atk_spec: [10, 12, 6], hurt: [13, 14, 10], ko: [15, 17, 7]
  };
  const ENEMY_FRAME_MAP = {
    idle: [0, 1, 5], walk: [2, 5, 7], atk: [6, 7, 5], hurt: [8, 8, 10], ko: [9, 11, 7]
  };

  function loadImage(scene, key, path) {
    scene.load.image(key, ROOT + path);
  }

  function worldY(nativeY) {
    return WORLD_RENDER_TOP + nativeY * WORLD_SCALE_Y;
  }

  function randomMovementY() {
    const margin = 10 * BACKGROUND_SCALE;
    return Phaser.Math.Between(Math.ceil(LOWER_LANE_TOP + margin), Math.floor(MOVEMENT_BOTTOM - margin));
  }

  function makeRectTexture(scene, key, width, height, color, label = '') {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x090617, 1).fillRect(0, 0, width, height);
    g.fillStyle(color, 1).fillRoundedRect(3, 3, width - 6, height - 6, 8);
    g.lineStyle(3, 0xffffff, 0.8).strokeRoundedRect(3, 3, width - 6, height - 6, 8);
    g.generateTexture(key, width, height);
    g.destroy();
  }

  function makeSheetTexture(scene, key, frameCount, color) {
    if (scene.textures.exists(key)) return;
    const canvas = document.createElement('canvas');
    canvas.width = 128 * frameCount;
    canvas.height = 128;
    const c = canvas.getContext('2d');
    for (let i = 0; i < frameCount; i++) {
      const x = i * 128;
      c.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
      c.fillRect(x + 34, 24 + (i % 3) * 2, 60, 86);
      c.fillStyle = '#ffffff'; c.fillRect(x + 48, 43, 9, 9); c.fillRect(x + 71, 43, 9, 9);
      c.fillStyle = '#111111'; c.fillRect(x + 52, 47, 4, 4); c.fillRect(x + 72, 47, 4, 4);
      c.fillStyle = '#ffffff'; c.font = 'bold 13px monospace'; c.textAlign = 'center'; c.fillText(String(i), x + 64, 104);
    }
    scene.textures.addSpriteSheet(key, canvas, { frameWidth: 128, frameHeight: 128 });
  }

  function ensureActorSheet(scene, key, frameCount, color) {
    const texture = scene.textures.get(key);
    const source = texture?.getSourceImage?.();
    const valid = source && source.width === frameCount * 128 && source.height === 128;
    if (valid) return;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    makeSheetTexture(scene, key, frameCount, color);
  }

  function ensureShotSheet(scene, key, color) {
    const texture = scene.textures.get(key);
    const source = texture?.getSourceImage?.();
    if (source && source.width === 1024 && source.height === 256) return;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 256;
    const c = canvas.getContext('2d');
    for (let frame = 0; frame < 4; frame++) {
      c.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
      c.beginPath(); c.arc(frame * 256 + 128, 128, 48 + frame * 4, 0, Math.PI * 2); c.fill();
    }
    scene.textures.addSpriteSheet(key, canvas, { frameWidth: 256, frameHeight: 256 });
  }

  function fitImage(image, maxWidth, maxHeight) {
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height);
    return image.setScale(scale);
  }

  function ensureImage(scene, key, width, height, color) {
    if (!scene.textures.exists(key)) makeRectTexture(scene, key, width, height, color, key);
  }

  function addAnimations(scene, key, map = FRAME_MAP) {
    Object.entries(map).forEach(([name, [start, end, rate]]) => {
      const animKey = `${key}_${name}`;
      if (!scene.anims.exists(animKey)) {
        scene.anims.create({
          key: animKey,
          frames: scene.anims.generateFrameNumbers(key, { start, end }),
          frameRate: rate,
          repeat: ['idle', 'walk'].includes(name) ? -1 : 0
        });
      }
    });
  }

  class SelectScene extends Phaser.Scene {
    constructor() { 
      super('SelectScene'); 
      this.storyPageIndex = 0;
      this.charSelectIndex = 0;
    }

    preload() {
      this.load.on('loaderror', file => console.info(`[PixelPunchV2] asset assente, uso fallback: ${file.key}`));
      this.load.image('cover', 'assets/PixelPunch/copertina.png');
      loadImage(this, 'select_text', 'selezionepersonaggi/select_text.png');
      PLAYERS.forEach(p => loadImage(this, `${p.key}_select`, `selezionepersonaggi/${p.select}`));
    }

    create() {
      ensureImage(this, 'cover', W, H, 0x341052);
      ensureImage(this, 'select_text', 300, 66, 0x7d1dff);
      PLAYERS.forEach(p => ensureImage(this, `${p.key}_select`, 104, 190, p.color));
      this.cameras.main.setBackgroundColor('#080412');
      this.page = 'cover'; 
      this.pageObjects = this.add.container();
      
      this.actionHandler = event => this.handleAction(event.detail);
      window.addEventListener('pixelpunch-action', this.actionHandler);
      this.events.once('shutdown', () => window.removeEventListener('pixelpunch-action', this.actionHandler));
      
      this.input.keyboard.on('keydown-SPACE', () => this.advance());
      this.input.keyboard.on('keydown-ENTER', () => this.advance());
      this.input.keyboard.on('keydown-LEFT', () => this.navigateChar(-1));
      this.input.keyboard.on('keydown-RIGHT', () => this.navigateChar(1));
      this.input.keyboard.on('keydown-A', () => this.navigateChar(-1));
      this.input.keyboard.on('keydown-D', () => this.navigateChar(1));

      const requestedPage = this.registry.get('pixelPunchMenuPage');
      this.registry.remove('pixelPunchMenuPage');
      if (requestedPage === 'story') this.showStory(0);
      else if (requestedPage === 'rules') this.showRules();
      else this.showCover();
    }

    clearPage() {
      if (this.coverBlinkEvent) {
        this.coverBlinkEvent.remove(false);
        this.coverBlinkEvent = null;
      }
      this.pageObjects.removeAll(true);
    }
    
    addTitle(title, color = '#ffea00') { 
      this.pageObjects.add(this.add.text(W / 2, 28, title, { 
        fontFamily: 'monospace', fontSize: '34px', color, fontStyle: 'bold', stroke: '#000000', strokeThickness: 5
      }).setOrigin(0.5)); 
    }

    addContinue(label = 'PREMI A PER CONTINUARE ►') {
      const text = this.add.text(W / 2, H - 22, label, { 
        fontFamily: 'monospace', fontSize: '20px', color: '#00ffcc', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4
      }).setOrigin(0.5);
      this.tweens.add({ targets: text, alpha: 0.35, duration: 520, yoyo: true, repeat: -1 }); 
      this.pageObjects.add(text);
    }

    showCover() {
      this.page = 'cover'; 
      this.clearPage();
      const cover = this.add.image(W / 2, H / 2, 'cover');
      cover.setScale(Math.max(W / cover.width, H / cover.height));
      this.pageObjects.add(cover);
      const startGlow = this.add.rectangle(W / 2, H - 70, 286, 58, 0xff3e91, 0.16)
        .setStrokeStyle(5, 0xff3e91, 0.35);
      const startFrame = this.add.rectangle(W / 2, H - 70, 270, 50, 0x10051f, 0.96)
        .setStrokeStyle(3, 0x00f0ff, 1);
      const startText = this.add.text(W / 2, H - 70, '▶  PRESS A  ◀', {
        fontFamily: 'monospace', fontSize: '24px', color: '#ffea00', fontStyle: 'bold',
        stroke: '#7b176f', strokeThickness: 5
      }).setOrigin(0.5);
      this.tweens.add({ targets: startGlow, alpha: 0.52, scaleX: 1.045, scaleY: 1.12, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      let blinkStep = 0;
      this.coverBlinkEvent = this.time.addEvent({
        delay: 210,
        loop: true,
        callback: () => {
          if (!startText.active) return;
          startText.setAlpha([1, 1, 0.18, 1][blinkStep % 4]);
          blinkStep++;
        }
      });
      this.pageObjects.add([startGlow, startFrame, startText]);
    }

    showStory(index = 0) {
      this.page = 'story'; 
      this.storyPageIndex = index;
      this.clearPage(); 
      playSfx('assets/audio/sfx_select.mp3');
      
      const s = STORY_PAGES[this.storyPageIndex];
      this.addTitle(s.title);

      const panel = this.add.rectangle(W / 2, 250, W - 30, 386, 0x140a28, 0.98).setStrokeStyle(4, 0xff3e91);
      const subtitle = this.add.text(W / 2, 100, s.subtitle, { fontFamily: 'monospace', fontSize: '20px', color: '#00f0ff', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
      const copy = this.add.text(W / 2, 240, s.text, { fontFamily: 'sans-serif', fontSize: '18px', color: '#ffffff', align: 'center', lineSpacing: 9, wordWrap: { width: W - 68 } }).setOrigin(0.5);
      
      const pageIndicator = this.add.text(W / 2, 420, `PAGINA ${this.storyPageIndex + 1} DI ${STORY_PAGES.length}`, { fontFamily: 'monospace', fontSize: '16px', color: '#ffea00', fontStyle: 'bold' }).setOrigin(0.5);

      this.pageObjects.add([panel, subtitle, copy, pageIndicator]); 
      this.addContinue(this.storyPageIndex < STORY_PAGES.length - 1 ? 'PREMI A PER PAGINA SUCCESSIVA ►' : 'PREMI A PER REGOLE DI GIOCO ►');
    }

    showRules() {
      this.page = 'rules'; 
      this.clearPage(); 
      playSfx('assets/audio/sfx_select.mp3');
      this.addTitle('REGOLE DI GIOCO', '#00f0ff');
      
      const rules = [
        ['JOYSTICK','Muovi la Producer in tutte le direzioni.'],
        ['RUN / SHIFT','Tieni premuto RUN per correre.'],
        ['PULSANTE A','Attacco base e combo.'],
        ['PULSANTE B','Attacco speciale ad area'],
        ['PULSANTE P','Attiva o disattiva la parata'],
        ['PAUSA','Usa PAUSA in alto nel gioco.']
      ];
      
      rules.forEach((rule, i) => { 
        const y = 78 + i * 61, color = ['#ffea00','#ff8b19','#ff3e91','#a260ff','#00f0ff','#00ff99'][i];
        const box = this.add.rectangle(W / 2, y, W - 34, 52, 0x111027, 1).setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(color).color);
        const title = this.add.text(32, y - 20, rule[0], { fontFamily: 'monospace', fontSize: '15px', color, fontStyle: 'bold' });
        const copy = this.add.text(32, y, rule[1], { fontFamily: 'sans-serif', fontSize: '13px', color: '#ffffff', wordWrap: { width: W - 64 } });
        this.pageObjects.add([box, title, copy]); 
      });

      this.addContinue('PREMI A PER SCEGLIERE FIGHTER ►');
    }

    showSelection(charIndex = 0) {
      this.page = 'select';
      this.charSelectIndex = (charIndex + PLAYERS.length) % PLAYERS.length;
      this.clearPage();
      playSfx('assets/audio/sfx_select.mp3');

      const p = PLAYERS[this.charSelectIndex];

      const backdrop = this.add.rectangle(W / 2, H / 2, W, H, 0x080412);
      const header = this.add.text(24, 20, 'SCEGLI LA TUA PRODUCER', { fontFamily: 'monospace', fontSize: '22px', color: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 });
      const counter = this.add.text(W - 24, 24, `${this.charSelectIndex + 1} / ${PLAYERS.length}`, { fontFamily: 'monospace', fontSize: '14px', color: '#00ffcc', fontStyle: 'bold' }).setOrigin(1, 0);
      const portrait = fitImage(this.add.image(132, 208, `${p.key}_select`), 218, 300).setOrigin(0.5);
      const infoPanel = this.add.rectangle(371, 214, 232, 306, 0x0f0b21, 0.98).setStrokeStyle(2, p.color, 0.7);
      const nameText = this.add.text(270, 76, p.label, { fontFamily: 'monospace', fontSize: '29px', color: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 5 });
      const roleText = this.add.text(270, 112, p.role, { fontFamily: 'monospace', fontSize: '13px', color: '#ffea00', fontStyle: 'bold', wordWrap: { width: 205 } });
      const divider = this.add.rectangle(371, 151, 194, 2, p.color, 0.65);
      const bonusTitle = this.add.text(270, 170, '▲ BONUS', { fontFamily: 'monospace', fontSize: '15px', color: '#00ff88', fontStyle: 'bold' });
      const bonusDetail = this.add.text(270, 200, p.bonus, { fontFamily: 'sans-serif', fontSize: '14px', color: '#ffffff', fontStyle: 'bold', lineSpacing: 7, wordWrap: { width: 202 } });
      const malusTitle = this.add.text(270, 296, '▼ MALUS', { fontFamily: 'monospace', fontSize: '15px', color: '#ff5577', fontStyle: 'bold' });
      const malusDetail = this.add.text(270, 326, p.malus, { fontFamily: 'sans-serif', fontSize: '14px', color: '#ffffff', fontStyle: 'bold', lineSpacing: 5, wordWrap: { width: 202 } });

      const prevBtn = this.add.text(28, 202, '‹', { fontFamily: 'monospace', fontSize: '58px', color: '#00f0ff', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      prevBtn.on('pointerdown', () => this.showSelection(this.charSelectIndex - 1));
      const nextBtn = this.add.text(236, 202, '›', { fontFamily: 'monospace', fontSize: '58px', color: '#00f0ff', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      nextBtn.on('pointerdown', () => this.showSelection(this.charSelectIndex + 1));
      const dotsText = PLAYERS.map((_, i) => i === this.charSelectIndex ? '●' : '○').join('   ');
      const dots = this.add.text(132, 363, dotsText, { fontFamily: 'monospace', fontSize: '17px', color: '#00ffcc' }).setOrigin(0.5);
      const selectBtn = this.add.rectangle(W / 2, 466, W - 48, 58, p.color, 0.92).setStrokeStyle(3, 0xffffff).setInteractive({ useHandCursor: true });
      const selectBtnText = this.add.text(W / 2, 466, `GIOCA CON ${p.label}  ►`, { fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
      
      selectBtn.on('pointerdown', () => {
        playSfx('assets/audio/sfx_select.mp3');
        this.scene.start('ScenarioIntroScene', { character: p.key, stage: 1, score: 0 });
      });

      this.pageObjects.add([
        backdrop, header, counter, portrait, infoPanel,
        nameText, roleText, divider, bonusTitle, bonusDetail,
        malusTitle, malusDetail, prevBtn, nextBtn, dots, selectBtn, selectBtnText
      ]);
    }

    navigateChar(dir) {
      if (this.page === 'select') {
        this.showSelection(this.charSelectIndex + dir);
      }
    }

    advance() { 
      if (this.page === 'cover') this.showStory(0); 
      else if (this.page === 'story') {
        if (this.storyPageIndex < STORY_PAGES.length - 1) this.showStory(this.storyPageIndex + 1);
        else this.showRules();
      }
      else if (this.page === 'rules') this.showSelection(0); 
      else if (this.page === 'select') {
        playSfx('assets/audio/sfx_select.mp3');
        const p = PLAYERS[this.charSelectIndex];
        this.scene.start('ScenarioIntroScene', { character: p.key, stage: 1, score: 0 });
      }
    }

    handleAction(action) { 
      if (action === 'menu') this.showCover(); 
      else if (action === 'exit') window.location.href = 'index.html';
      else if (action === 'story') this.showStory(0); 
      else if (action === 'rules') this.showRules(); 
      else if (action === 'attack' || action === 'special') this.advance(); 
    }
  }

  class ScenarioIntroScene extends Phaser.Scene {
    constructor() { super('ScenarioIntroScene'); }

    init(data) {
      this.character = data.character || 'cristina';
      this.stage = Phaser.Math.Clamp(data.stage || 1, 1, 5);
      this.score = data.score || 0;
    }

    create() {
      const story = SCENARIO_STORIES[this.stage - 1];
      this.cameras.main.setBackgroundColor('#080412');
      this.add.rectangle(W / 2, H / 2, W, H, 0x04010b, 0.88);
      const glow = this.add.rectangle(W / 2, H / 2, W - 38, H - 54, 0x35115b, 0.26).setStrokeStyle(5, 0xff3e91);
      this.tweens.add({ targets: glow, alpha: 0.5, duration: 720, yoyo: true, repeat: -1 });
      this.add.text(W / 2, 58, `SCENARIO ${this.stage} DI 5`, { fontFamily: 'monospace', fontSize: '23px', color: '#ffea00', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
      this.add.text(W / 2, 118, story.title, { fontFamily: 'monospace', fontSize: '27px', color: '#00f0ff', fontStyle: 'bold', align: 'center', wordWrap: { width: W - 64 }, stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
      this.add.text(W / 2, 174, story.subtitle, { fontFamily: 'monospace', fontSize: '19px', color: '#ff3e91', fontStyle: 'bold', align: 'center', wordWrap: { width: W - 72 } }).setOrigin(0.5);
      this.add.text(W / 2, 300, story.text, { fontFamily: 'sans-serif', fontSize: '18px', color: '#ffffff', align: 'center', lineSpacing: 8, wordWrap: { width: W - 76 } }).setOrigin(0.5);
      const prompt = this.add.text(W / 2, H - 48, 'TOCCA A O B PER INIZIARE ►', { fontFamily: 'monospace', fontSize: '19px', color: '#00ffcc', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
      this.tweens.add({ targets: prompt, alpha: 0.35, duration: 520, yoyo: true, repeat: -1 });
      this.started = false;
      this.actionHandler = event => {
        if (event.detail === 'menu') this.scene.start('SelectScene');
        else if (event.detail === 'exit') window.location.href = 'index.html';
        else if (event.detail === 'attack' || event.detail === 'special') this.startScenario();
      };
      window.addEventListener('pixelpunch-action', this.actionHandler);
      this.events.once('shutdown', () => window.removeEventListener('pixelpunch-action', this.actionHandler));
      this.input.keyboard.on('keydown-SPACE', () => this.startScenario());
      this.input.keyboard.on('keydown-ENTER', () => this.startScenario());
    }

    startScenario() {
      if (this.started) return;
      this.started = true;
      playSfx('assets/audio/sfx_select.mp3');
      this.scene.start('EnemyBriefingScene', { character: this.character, stage: this.stage, score: this.score });
    }
  }

  class EnemyBriefingScene extends Phaser.Scene {
    constructor() { super('EnemyBriefingScene'); }

    init(data) {
      this.character = data.character || 'cristina';
      this.stage = Phaser.Math.Clamp(data.stage || 1, 1, 5);
      this.score = data.score || 0;
      this.started = false;
    }

    preload() {
      const firstEnemy = (this.stage - 1) * 4;
      for (let i = 0; i < 4; i++) {
        this.load.spritesheet(`brief_enemy_${i}`, ROOT + `cattivi/${ENEMY_FILES[firstEnemy + i]}`, {
          frameWidth: 128, frameHeight: 128
        });
      }
    }

    create() {
      const dossier = ENEMY_DOSSIERS[this.stage - 1];
      this.cameras.main.setBackgroundColor('#07030f');
      this.add.rectangle(W / 2, H / 2, W - 20, H - 20, 0x130822, 0.98).setStrokeStyle(4, 0xff3e91);
      this.add.text(W / 2, 25, 'DOSSIER MINACCE', {
        fontFamily: 'monospace', fontSize: '27px', color: '#ffea00', fontStyle: 'bold',
        stroke: '#7b176f', strokeThickness: 5
      }).setOrigin(0.5);
      this.add.text(W / 2, 55, `SCENARIO ${this.stage} — NEMICI AVVISTATI`, {
        fontFamily: 'monospace', fontSize: '13px', color: '#00f0ff', fontStyle: 'bold'
      }).setOrigin(0.5);

      dossier.forEach((enemyInfo, index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);
        const x = 132 + column * 248;
        const y = 154 + row * 166;
        this.add.rectangle(x, y, 226, 150, 0x211035, 0.98)
          .setStrokeStyle(2, index % 2 ? 0xa260ff : 0xff3e91, 0.9);
        this.add.rectangle(x - 68, y + 19, 82, 88, 0x090617, 0.8)
          .setStrokeStyle(1, 0xffffff, 0.2);
        this.add.rectangle(x, y - 43, 204, 1, index % 2 ? 0xa260ff : 0xff3e91, 0.55);
        ensureActorSheet(this, `brief_enemy_${index}`, 12, 0xd13757 + (index + 1) * 1600);
        this.add.sprite(x - 68, y + 19, `brief_enemy_${index}`, 0)
          .setOrigin(0.5)
          .setDisplaySize(96, 96);
        this.add.text(x, y - 58, enemyInfo.name, {
          fontFamily: 'monospace', fontSize: '12px', color: '#ffffff', fontStyle: 'bold',
          wordWrap: { width: 206 }, align: 'center'
        }).setOrigin(0.5, 0);
        this.add.text(x - 17, y - 29, enemyInfo.text, {
          fontFamily: 'sans-serif', fontSize: '12px', color: '#e9ddff',
          lineSpacing: 3, wordWrap: { width: 112 }, align: 'left'
        }).setOrigin(0, 0);
      });

      const promptBack = this.add.rectangle(W / 2, 466, W - 48, 54, 0x35115b, 0.96)
        .setStrokeStyle(3, 0x00f0ff, 0.9);
      const prompt = this.add.text(W / 2, 466, 'PREMI A O B  •  ENTRA IN AZIONE', {
        fontFamily: 'monospace', fontSize: '15px', color: '#00ffcc', fontStyle: 'bold',
        align: 'center',
        stroke: '#000000', strokeThickness: 4
      }).setOrigin(0.5);
      this.tweens.add({ targets: [promptBack, prompt], alpha: 0.55, duration: 520, yoyo: true, repeat: -1 });

      this.actionHandler = event => {
        if (event.detail === 'menu') this.scene.start('SelectScene');
        else if (event.detail === 'exit') window.location.href = 'index.html';
        else if (event.detail === 'attack' || event.detail === 'special') this.startGame();
      };
      window.addEventListener('pixelpunch-action', this.actionHandler);
      this.events.once('shutdown', () => window.removeEventListener('pixelpunch-action', this.actionHandler));
      this.input.keyboard.on('keydown-SPACE', () => this.startGame());
      this.input.keyboard.on('keydown-ENTER', () => this.startGame());
    }

    startGame() {
      if (this.started) return;
      this.started = true;
      playSfx('assets/audio/sfx_select.mp3');
      this.scene.start('GameScene', { character: this.character, stage: this.stage, score: this.score });
    }
  }

  class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }

    init(data) {
      this.character = data.character || 'cristina';
      this.playerStats = PLAYERS.find(p => p.key === this.character) || PLAYERS[0];
      this.stage = Phaser.Math.Clamp(data.stage || 1, 1, 5);
      this.score = data.score || 0;
      this.hp = 100;
      this.arenaIndex = 0;
      this.arenaLocked = false;
      this.arenaQuota = 0;
      this.arenaSpawned = 0;
      this.arenaDefeated = 0;
      this.lastSpawnSide = Phaser.Math.Between(0, 1) ? 'left' : 'right';
      this.bossSpawned = false;
      this.arenaRunId = 0;
      this.stageEnded = false;
      this.attackBusy = false;
      this.isGuarding = false;
      this.isPausedState = false;
      this.comboStep = 0;
      this.comboExpires = 0;
      this.specialReadyAt = 0;
      this.scoreSaved = false;
      this.bossHazards = [];
    }

    preload() {
      this.load.on('loaderror', file => console.info(`[PixelPunchV2] asset assente, uso fallback: ${file.key}`));
      const s = this.stage;

      [`bg_${s}`, `floor_${s}`, `boss_${s}`].forEach(key => {
        if (this.textures.exists(key)) this.textures.remove(key);
      });
      for (let i = 0; i < 2; i++) {
        if (this.textures.exists(`crate_${i}_whole`)) this.textures.remove(`crate_${i}_whole`);
        if (this.textures.exists(`crate_${i}_broken1`)) this.textures.remove(`crate_${i}_broken1`);
        if (this.textures.exists(`crate_${i}_broken2`)) this.textures.remove(`crate_${i}_broken2`);
        if (this.textures.exists(`life_${i}`)) this.textures.remove(`life_${i}`);
      }
      for (let i = 0; i < 3; i++) {
        if (this.textures.exists(`point_${i}`)) this.textures.remove(`point_${i}`);
      }
      for (let i = 1; i <= 20; i++) {
        if (this.textures.exists(`enemy_${i}`)) this.textures.remove(`enemy_${i}`);
      }

      loadImage(this, `bg_${s}`, `sfondi/scenario_${s}_BG.png`);
      loadImage(this, `floor_${s}`, `sfondi/scenario_${s}_strada.png`);
      ['gameover', 'go', 'lock_warning', 'overhead_player', 'stageclear'].forEach(key => loadImage(this, key, `grafichegioco/${key}.png`));
      ['aurea', 'dustcloud', 'hitspark'].forEach(effect => {
        for (let frame = 1; frame <= 3; frame++) {
          const key = `${effect}_${frame}`;
          if (!this.textures.exists(key)) loadImage(this, key, `colpi/${effect}${frame}.png`);
        }
      });
      PLAYERS.forEach(p => this.load.spritesheet(p.key, ROOT + `player/${p.file}`, { frameWidth: 128, frameHeight: 128 }));
      
      for (let i = 0; i < 4; i++) {
        const enemyNumber = (s - 1) * 4 + i;
        this.load.spritesheet(`enemy_${enemyNumber + 1}`, ROOT + `cattivi/${ENEMY_FILES[enemyNumber]}`, { frameWidth: 128, frameHeight: 128 });
      }
      this.load.spritesheet(`boss_${s}`, ROOT + `boss/${BOSS_FILES[s - 1]}`, { frameWidth: 128, frameHeight: 128 });
      if (s !== 3) this.load.spritesheet(`boss_shot_${s}`, ROOT + `shot/boss${s}.png`, { frameWidth: 256, frameHeight: 256 });

      CRATES[s - 1].forEach((name, i) => {
        const base = `oggettidistruttibili/Scenario${s}/${name}_crate_`;
        loadImage(this, `crate_${i}_whole`, base + 'whole.png');
        const separator = s === 1 ? '' : '_';
        loadImage(this, `crate_${i}_broken1`, base + `broken${separator}1.png`);
        loadImage(this, `crate_${i}_broken2`, base + `broken${separator}2.png`);
      });
      PICKUPS[s - 1].forEach((file, i) => loadImage(this, `point_${i}`, `raccoglibili/Scenario${s}/${file}`));
      LIVES[s - 1].forEach((file, i) => loadImage(this, `life_${i}`, `vite/Scenario${s}/${file}`));

      if (s === 3) {
        loadImage(this, 'taxi_vehicle', 'cattivi/taxi.png');
      }
    }

    create() {
      this.createFallbacks();
      this.createAnimations();
      
      // IMPOSTAZIONE MONDO E BOUNDS DI SICUREZZA PER IMPEDIRE AL GIOCATORE DI USCIRE DALLA MAPPA
      this.physics.world.setBounds(0, MOVEMENT_TOP, WORLD_W, MOVEMENT_BOTTOM - MOVEMENT_TOP);
      
      this.createWorld();
      this.createPlayer();
      this.createObjects();
      this.createHud();
      this.bindControls();

      this.cameras.main.setBounds(0, 0, WORLD_W, H);
      this.cameras.main.startFollow(this.player, true, 0.12, 0.12, -55, 0);
      this.cameras.main.setDeadzone(115, 250);
      this.cameras.main.fadeIn(250);
      
      this.actionHandler = event => this.handleExternalAction(event.detail);
      window.addEventListener('pixelpunch-action', this.actionHandler);
      this.events.once('shutdown', () => window.removeEventListener('pixelpunch-action', this.actionHandler));
    }

    createFallbacks() {
      ensureImage(this, `bg_${this.stage}`, NATIVE_BACKGROUND_WIDTH, NATIVE_BACKGROUND_HEIGHT, 0x24123c);
      ensureImage(this, `floor_${this.stage}`, NATIVE_FLOOR_WIDTH, NATIVE_BACKGROUND_HEIGHT, 0x321b47);
      ensureImage(this, 'gameover', 280, 100, 0xc71950);
      ensureImage(this, 'go', 150, 70, 0x25d987);
      ensureImage(this, 'lock_warning', 240, 80, 0xff8b19);
      ensureImage(this, 'overhead_player', 38, 24, 0xffffff);
      ensureImage(this, 'stageclear', 285, 100, 0x25b7ff);
      ['aurea', 'dustcloud', 'hitspark'].forEach((effect, effectIndex) => {
        for (let frame = 1; frame <= 3; frame++) {
          ensureImage(this, `${effect}_${frame}`, 243, 256, [0x8f52ff, 0xc9a27a, 0xffea00][effectIndex]);
        }
      });
      
      PLAYERS.forEach(p => ensureActorSheet(this, p.key, 18, p.color));
      
      const startEnemy = (this.stage - 1) * 4 + 1;
      for (let i = startEnemy; i < startEnemy + 4; i++) {
        ensureActorSheet(this, `enemy_${i}`, 12, 0xd13757 + i * 1200);
      }
      ensureActorSheet(this, `boss_${this.stage}`, 18, 0x8c2cff + this.stage * 1600);
      if (this.stage !== 3) ensureShotSheet(this, `boss_shot_${this.stage}`, 0xff4b85 + this.stage * 1200);

      CRATES[this.stage - 1].forEach((_, i) => {
        ensureImage(this, `crate_${i}_whole`, 66, 66, 0xa3612c);
        ensureImage(this, `crate_${i}_broken1`, 66, 66, 0x81512e);
        ensureImage(this, `crate_${i}_broken2`, 66, 66, 0x4f3429);
      });
      [0x56f7ff, 0xffdb42, 0xff54b3].forEach((color, i) => ensureImage(this, `point_${i}`, 40, 40, color));
      [0x5cff72, 0x39ffbc].forEach((color, i) => ensureImage(this, `life_${i}`, 40, 40, color));
      if (this.stage === 3) ensureImage(this, 'taxi_vehicle', 120, 50, 0xffea00);
    }

    createAnimations() {
      PLAYERS.forEach(p => addAnimations(this, p.key));
      const startEnemy = (this.stage - 1) * 4 + 1;
      for (let i = startEnemy; i < startEnemy + 4; i++) {
        addAnimations(this, `enemy_${i}`, ENEMY_FRAME_MAP);
      }
      addAnimations(this, `boss_${this.stage}`);
      if (this.stage !== 3) {
        const shotAnim = `boss_shot_${this.stage}_fly`;
        if (!this.anims.exists(shotAnim)) {
          this.anims.create({ key: shotAnim, frames: this.anims.generateFrameNumbers(`boss_shot_${this.stage}`, { start: 0, end: 3 }), frameRate: 9, repeat: -1 });
        }
      }
    }

    createWorld() {
      // Il fondale 1920x1000 viene disegnato una sola volta e resta fisso
      // dietro all'azione per l'intero scenario: nessun tiling visibile.
      this.farBg = this.add.image(0, WORLD_RENDER_TOP, `bg_${this.stage}`)
        .setOrigin(0, 0)
        .setScale(BACKGROUND_SCALE)
        .setScrollFactor(BACKGROUND_SCROLL_FACTOR)
        .setDepth(-20);
      // La strada 6800x1000 coincide con il mondo fisico: una sola immagine,
      // nessun tile e nessuna ripetizione lungo il livello.
      this.floor = this.add.image(0, WORLD_RENDER_TOP, `floor_${this.stage}`)
        .setOrigin(0)
        .setScale(BACKGROUND_SCALE)
        .setDepth(-10);
      ARENA_X.forEach((x, i) => {
        this.add.text(x, MOVEMENT_TOP + 12, i === BOSS_ARENA_INDEX ? 'BOSS' : `LOCK ${i + 1}`, {
          fontFamily: 'monospace', fontSize: '11px', color: '#ffffff66'
        }).setOrigin(0.5).setDepth(MOVEMENT_TOP + 12);
      });
    }

    createPlayer() {
      const startY = Phaser.Math.Linear(MOVEMENT_TOP, MOVEMENT_BOTTOM, 0.65);
      this.player = this.physics.add.sprite(100, startY, this.character, 0)
        .setOrigin(0.5, 1)
        .setScale(getPlayerScale(this.character))
        .setVisible(true)
        .setActive(true)
        .setAlpha(1);
      this.player.setDepth(this.player.y);
      this.player.clearTint();
      
      // BLOCCA IL GIOCATORE NEI CONFINI DEL MONDO DI GIOCO PER EVITARE USCE FUORI MAPPA SULLA SINISTRA
      this.player.setCollideWorldBounds(true);
      this.player.body.onWorldBounds = true;
      
      this.player.body.setSize(50, 32).setOffset(39, 96).setAllowGravity(false);
      this.player.body.enable = true;
      this.player.body.reset(100, startY);
      this.player.speed = 210 * BACKGROUND_SCALE * (this.playerStats.speedMult || 1.0);
      this.player.facing = 1;
      this.player.invulnerableUntil = 0;
      this.bindActorAnimationEvents(this.player, this.character, 17, true);
      this.player.play(`${this.character}_idle`);

      this.playerOverhead = this.add.image(this.player.x, this.player.y - this.player.displayHeight - 8, 'overhead_player')
        .setDisplaySize(34, 36)
        .setTint(this.playerStats.color)
        .setDepth(this.player.y + 1);
      this.tweens.add({
        targets: this.playerOverhead,
        scaleX: this.playerOverhead.scaleX * 1.08,
        scaleY: this.playerOverhead.scaleY * 1.08,
        duration: 340,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      this.time.delayedCall(3000, () => {
        if (!this.playerOverhead?.active) return;
        this.tweens.killTweensOf(this.playerOverhead);
        this.tweens.add({
          targets: this.playerOverhead,
          alpha: 0,
          duration: 220,
          onComplete: () => {
            this.playerOverhead?.destroy();
            this.playerOverhead = null;
          }
        });
      });
    }

    createObjects() {
      this.enemies = this.physics.add.group();
      this.crates = this.physics.add.group({ immovable: true });
      this.pickupGroup = this.physics.add.group({ allowGravity: false });
      const positions = [500, 1050, 1550, 2150, 2700, 3300, 3850, 4450, 5000, 5550, 6150, 6550]
        .map(x => x * BACKGROUND_SCALE);
      positions.forEach((x, i) => {
        const variant = i % 2;
        const crate = this.crates.create(x, randomMovementY(), `crate_${variant}_whole`).setOrigin(0.5, 1);
        crate.hp = 3; crate.variant = variant;
        crate.assetName = CRATES[this.stage - 1][variant];
        crate.isCoffeeMachine = this.stage === 1 && variant === 0;
        this.resizeCrate(crate, `crate_${variant}_whole`);
      });
      this.physics.add.collider(this.player, this.crates);
      
      this.physics.add.overlap(this.player, this.pickupGroup, this.collectPickup, undefined, this);
    }

    resizeCrate(crate, textureKey) {
      const frame = this.textures.getFrame(textureKey);
      let multiplier = crate.isCoffeeMachine ? 1.15 : 1;
      if (this.stage === 2 && crate.variant === 0) {
        multiplier *= 2;
      }
      if (crate.assetName === 'cestino') multiplier *= 0.7;
      if (crate.assetName === 'acqua') multiplier *= 1.3;
      const maxDimension = 54 * OBJECT_SCALE * multiplier;
      const scale = maxDimension / Math.max(frame.width, frame.height);
      const width = frame.width * scale;
      const height = frame.height * scale;
      crate.setDisplaySize(width, height);
      crate.body.setSize(frame.width * 0.7, frame.height * 0.25);
      crate.body.setOffset(frame.width * 0.15, frame.height * 0.75);
    }

    createHud() {
      this.hud = this.add.container(0, 0).setScrollFactor(0).setDepth(10000);
      const playerColor = this.playerStats.color;
      this.hudBack = this.add.rectangle(0, 0, W, 62, 0x05030b, 0.92)
        .setOrigin(0, 0)
        .setStrokeStyle(2, playerColor, 0.75);

      this.leftHudPanel = this.add.rectangle(101, 31, 190, 48, 0x160b24, 0.96)
        .setStrokeStyle(2, playerColor, 0.8);
      this.centerHudPanel = this.add.rectangle(W / 2, 31, 104, 48, 0x081925, 0.96)
        .setStrokeStyle(2, 0x00f0ff, 0.75);
      this.rightHudPanel = this.add.rectangle(W - 101, 31, 190, 48, 0x1c1022, 0.96)
        .setStrokeStyle(2, 0xffd43b, 0.72);

      this.hpLabel = this.add.text(13, 8, `♥ ${this.playerStats.label}`, {
        fontFamily: 'monospace', fontSize: '10px', color: '#ffffff', fontStyle: 'bold'
      });
      this.hpBack = this.add.rectangle(13, 31, 176, 15, 0x260817).setOrigin(0, 0.5)
        .setStrokeStyle(1, 0xffffff, 0.25);
      this.hpBar = this.add.rectangle(15, 31, 172, 11, playerColor).setOrigin(0, 0.5);
      this.hpShine = this.add.rectangle(16, 28, 168, 2, 0xffffff, 0.38).setOrigin(0, 0.5);
      this.hpValueText = this.add.text(101, 48, '100 HP', {
        fontFamily: 'monospace', fontSize: '9px', color: '#ffea00', fontStyle: 'bold'
      }).setOrigin(0.5);

      this.stageText = this.add.text(W / 2, 31, `STAGE ${this.stage}/5\nFIGHT 1/5`, {
        fontFamily: 'monospace', fontSize: '10px', color: '#65f6ff', fontStyle: 'bold',
        align: 'center', lineSpacing: 2
      }).setOrigin(0.5);

      this.scoreText = this.add.text(W - 13, 8, '', {
        fontFamily: 'monospace', fontSize: '12px', color: '#ffeb4d', fontStyle: 'bold'
      }).setOrigin(1, 0);
      this.specialLabel = this.add.text(W - 13, 27, 'SPECIAL', {
        fontFamily: 'monospace', fontSize: '9px', color: '#b9fff2', fontStyle: 'bold'
      }).setOrigin(1, 0.5);
      this.specialBack = this.add.rectangle(W - 13, 43, 112, 11, 0x132d32).setOrigin(1, 0.5)
        .setStrokeStyle(1, 0x33f5c0, 0.45);
      this.specialBar = this.add.rectangle(W - 123, 43, 108, 7, 0x33f5c0).setOrigin(0, 0.5);

      this.hud.add([
        this.hudBack, this.leftHudPanel, this.centerHudPanel, this.rightHudPanel,
        this.hpLabel, this.hpBack, this.hpBar, this.hpShine, this.hpValueText,
        this.stageText, this.scoreText, this.specialLabel, this.specialBack, this.specialBar
      ]);
      this.refreshHud();
    }

    bindControls() {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys('W,A,S,D,J,K,L,P');
      this.runKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
      this.input.keyboard.on('keydown-J', () => {
        if (this.isPausedState) this.resumeGame();
        else this.normalAttack();
      });
      this.input.keyboard.on('keydown-K', () => this.specialAttack());
      this.input.keyboard.on('keydown-L', () => this.toggleGuard());
      this.input.keyboard.on('keydown-P', () => this.togglePause());
    }

    togglePause() {
      if (this.stageEnded) return;
      if (this.isPausedState) {
        this.resumeGame();
      } else {
        this.pauseGame();
      }
    }

    pauseGame() {
      if (this.isPausedState) return;
      this.isPausedState = true;
      this.stopGuard();
      this.physics.pause();
      playSfx('assets/audio/sfx_select.mp3');
      
      this.pauseOverlay = this.add.container(0, 0).setScrollFactor(0).setDepth(30000);
      const bg = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.8).setInteractive();
      const text = this.add.text(W / 2, H / 2 - 20, 'GIOCO IN PAUSA', { fontFamily: 'monospace', fontSize: '26px', color: '#ffea00', fontStyle: 'bold' }).setOrigin(0.5);
      const sub = this.add.text(W / 2, H / 2 + 25, 'PREMI A O TOCCA PER RIPRENDERE ►', { fontFamily: 'monospace', fontSize: '13px', color: '#00ffcc', fontStyle: 'bold' }).setOrigin(0.5);
      
      this.tweens.add({ targets: sub, alpha: 0.4, duration: 500, yoyo: true, repeat: -1 });
      
      this.time.delayedCall(200, () => {
        if (this.isPausedState && bg.active) {
          bg.on('pointerdown', () => this.resumeGame());
        }
      });
      
      this.pauseOverlay.add([bg, text, sub]);
    }

    resumeGame() {
      if (!this.isPausedState) return;
      this.isPausedState = false;
      this.physics.resume();
      playSfx('assets/audio/sfx_select.mp3');
      if (this.pauseOverlay) {
        this.pauseOverlay.destroy();
        this.pauseOverlay = null;
      }
    }

    handleExternalAction(action) {
      if (action === 'attack') {
        if (this.isPausedState) this.resumeGame();
        else this.normalAttack();
      }
      else if (action === 'special') this.specialAttack();
      else if (action === 'guard-toggle') this.toggleGuard();
      else if (action === 'pause-toggle') this.togglePause();
      else if (action === 'pause') this.pauseGame();
      else if (action === 'resume') this.resumeGame();
      else if (action === 'menu') this.returnToMenu();
      else if (action === 'exit') this.exitToHub();
      else if (action === 'story' || action === 'rules') {
        this.registry.set('pixelPunchMenuPage', action);
        this.scene.start('SelectScene');
      }
    }

    async saveScore() {
      if (this.scoreSaved) return;
      this.scoreSaved = true;
      await savePixelPunchScore(this.score);
    }

    returnToMenu() {
      this.stopGuard();
      this.saveScore().finally(() => this.scene.start('SelectScene'));
    }

    exitToHub() {
      this.stopGuard();
      this.saveScore().finally(() => { window.location.href = 'index.html'; });
    }

    update(time, delta) {
      if (this.stageEnded || this.isPausedState) return;
      this.updatePlayerMovement();
      this.collectNearbyPickups();
      this.updateArena();
      this.updateEnemies(time);
      this.updateBossHazards(time, delta);
      this.updateDepths();
      this.updateCooldown(time);
      this.refreshHud();
    }

    updatePlayerMovement() {
      if (!this.player.active || this.attackBusy || this.isGuarding) { this.player.setVelocity(0); return; }
      const externalInput = window.PixelPunchInput || { x: 0, y: 0 };
      let x = externalInput.x || 0, y = externalInput.y || 0;
      if (this.cursors.left.isDown || this.wasd.A.isDown) x -= 1;
      if (this.cursors.right.isDown || this.wasd.D.isDown) x += 1;
      if (this.cursors.up.isDown || this.wasd.W.isDown) y -= 1;
      if (this.cursors.down.isDown || this.wasd.S.isDown) y += 1;
      const v = new Phaser.Math.Vector2(x, y);
      if (v.lengthSq() > 1) v.normalize();
      const running = Boolean(externalInput.running || this.runKey?.isDown);
      const speedMultiplier = running ? 1.65 : 1;
      this.player.setVelocity(v.x * this.player.speed * speedMultiplier, v.y * this.player.speed * 0.72 * speedMultiplier);
      this.player.y = Phaser.Math.Clamp(this.player.y, MOVEMENT_TOP, MOVEMENT_BOTTOM);
      if (this.arenaLocked) {
        const center = ARENA_X[this.arenaIndex];
        this.player.x = Phaser.Math.Clamp(this.player.x, center - W * 0.42, center + W * 0.42);
      }
      if (v.x !== 0) { this.player.facing = Math.sign(v.x); this.player.setFlipX(v.x < 0); }
      const desired = v.lengthSq() ? `${this.character}_walk` : `${this.character}_idle`;
      if (this.player.anims.currentAnim?.key !== desired) this.player.play(desired, true);
    }

    updateArena() {
      if (this.arenaLocked || this.arenaIndex >= ARENA_X.length) return;
      if (this.player.x >= ARENA_X[this.arenaIndex] - 105 * BACKGROUND_SCALE) this.lockArena();
    }

    lockArena() {
      this.arenaLocked = true;
      this.arenaRunId++;
      this.arenaQuota = this.arenaIndex === BOSS_ARENA_INDEX
        ? 0
        : Math.min(3 + (this.stage - 1) * 2 + Math.floor(this.arenaIndex / 2), 10);
      this.arenaSpawned = 0;
      this.arenaDefeated = 0;
      this.bossSpawned = false;
      const center = ARENA_X[this.arenaIndex];
      this.cameras.main.stopFollow();
      this.cameras.main.pan(Phaser.Math.Clamp(center, W / 2, WORLD_W - W / 2), H / 2, 300, 'Sine.easeInOut');
      this.showBanner('lock_warning', 720);
      if (this.arenaIndex === BOSS_ARENA_INDEX) {
        // L'arena del boss deve restare completamente libera da casse.
        this.crates.getChildren().slice().forEach(crate => {
          if (crate.active && Math.abs(crate.x - center) <= W * 0.55) crate.destroy();
        });
        this.bossSpawned = true;
        const runId = this.arenaRunId;
        this.time.delayedCall(900, () => {
          if (this.arenaLocked && !this.stageEnded && this.arenaRunId === runId) this.spawnBoss(center);
        });
      } else {
        this.scheduleArenaSpawn(1500, this.arenaRunId);
      }
    }

    scheduleArenaSpawn(delay = Phaser.Math.Between(1500, 2500), runId = this.arenaRunId) {
      this.time.delayedCall(delay, () => {
        if (!this.arenaLocked || this.stageEnded || runId !== this.arenaRunId || this.arenaSpawned >= this.arenaQuota) return;
        const activeMinions = this.enemies.getChildren().filter(enemy => enemy.active && !enemy.isBoss).length;
        const maxSimultaneous = Math.min(1 + Math.floor((this.stage - 1) / 2) + 1, 3);
        if (activeMinions >= maxSimultaneous) {
          this.scheduleArenaSpawn(700, runId);
          return;
        }
        this.spawnEnemy((this.arenaIndex + this.arenaSpawned) % 4);
        this.arenaSpawned++;
        if (this.arenaSpawned < this.arenaQuota) this.scheduleArenaSpawn(Phaser.Math.Between(1500, 2500), runId);
      });
    }

    getSpawnLaneY() {
      const occupied = this.enemies.getChildren().filter(enemy => enemy.active).map(enemy => enemy.y);
      for (let attempt = 0; attempt < 14; attempt++) {
        const y = randomMovementY();
        if (occupied.every(otherY => Math.abs(otherY - y) >= 44 * BACKGROUND_SCALE)) return y;
      }
      const lanes = [0.18, 0.52, 0.86].map(t => Phaser.Math.Linear(LOWER_LANE_TOP, MOVEMENT_BOTTOM, t));
      return lanes.sort((a, b) => Math.min(...occupied.map(y => Math.abs(a - y)), Infinity) - Math.min(...occupied.map(y => Math.abs(b - y)), Infinity)).pop();
    }

    spawnEnemy(variant) {
      const number = (this.stage - 1) * 4 + variant + 1;
      const useOppositeSide = Math.random() < 0.78;
      const side = useOppositeSide ? (this.lastSpawnSide === 'left' ? 'right' : 'left') : (Math.random() < 0.5 ? 'left' : 'right');
      this.lastSpawnSide = side;
      const cameraLeft = this.cameras.main.scrollX;
      const spawnMargin = 60 * BACKGROUND_SCALE;
      const spawnX = side === 'left' ? cameraLeft - spawnMargin : cameraLeft + W + spawnMargin;
      
      const enemy = this.physics.add.sprite(spawnX, this.getSpawnLaneY(), `enemy_${number}`, 0).setOrigin(0.5, 1).setScale(ENEMY_SCALE).setVisible(true);
      enemy.setDepth(enemy.y);
      
      enemy.hp = 30 + this.stage * 10; 
      enemy.maxHp = enemy.hp; 
      enemy.damage = 3 + this.stage * 2; 
      enemy.speed = (60 + this.stage * 6) * BACKGROUND_SCALE;
      enemy.nextAttack = 0; enemy.isBoss = false; enemy.facing = -1;
      enemy.setCollideWorldBounds(true);
      enemy.body.setSize(40, 20).setOffset(44, 108);
      this.bindActorAnimationEvents(enemy, `enemy_${number}`, 11);
      enemy.play(`enemy_${number}_idle`);
      this.enemies.add(enemy);
    }

    spawnBoss(center) {
      const cameraLeft = this.cameras.main.scrollX;
      const side = Math.random() < 0.5 ? 'left' : 'right';
      const spawnMargin = 64 * BOSS_SCALE + 6;
      const spawnX = side === 'left' ? cameraLeft + spawnMargin : cameraLeft + W - spawnMargin;

      const boss = this.physics.add.sprite(spawnX, Phaser.Math.Linear(MOVEMENT_TOP, MOVEMENT_BOTTOM, 0.72), `boss_${this.stage}`, 0)
        .setOrigin(0.5, 1)
        .setScale(BOSS_SCALE)
        .setVisible(true);
      
      boss.setDepth(boss.y);
      boss.hp = 200 + this.stage * 50; boss.maxHp = boss.hp; boss.damage = 18 + this.stage * 3;
      boss.speed = (70 + this.stage * 4) * BACKGROUND_SCALE * 1.05;
      boss.nextAttack = this.time.now + 1900; boss.isBoss = true; boss.facing = side === 'left' ? 1 : -1;
      boss.pattern = this.stage;
      boss.shotKey = this.stage === 3 ? null : `boss_shot_${this.stage}`;
      
      boss.mode = 'cast'; 
      boss.castWavesDone = 0;
      boss.castQuota = 5;
      boss.rushTimeEnd = 0;

      boss.body.setSize(40, 20).setOffset(44, 108);
      boss.setCollideWorldBounds(true);
      this.bindActorAnimationEvents(boss, `boss_${this.stage}`, 17);
      boss.play(`boss_${this.stage}_idle`);
      this.enemies.add(boss);
      
      this.bossBarBack = this.add.rectangle(W / 2, 74, W * 0.72, 12, 0x25091b).setScrollFactor(0).setDepth(10001);
      this.bossBar = this.add.rectangle(W * 0.14, 74, W * 0.72 - 4, 8, 0xc53cff).setOrigin(0, 0.5).setScrollFactor(0).setDepth(10002);
      this.bossNameText = this.add.text(W / 2, 88, BOSS_NAMES[this.stage - 1], {
        fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
        stroke: '#000000', strokeThickness: 4
      }).setOrigin(0.5).setScrollFactor(0).setDepth(10002);
      this.showBossCallout(['BRIEF BOMB', 'CIACK! CAMBIO CORSIA', 'TAXI DRIFT', 'REVISIONE', 'FINAL PITCH'][this.stage - 1]);
    }

    updateEnemies(time) {
      this.enemies.getChildren().forEach(enemy => {
        if (!enemy.active || enemy.stateLocked) return;
        enemy.y = Phaser.Math.Clamp(enemy.y, MOVEMENT_TOP, MOVEMENT_BOTTOM);
        if (enemy.isBoss) {
          this.updateBoss(enemy, time);
          if (this.bossBar) this.bossBar.width = (W * 0.72 - 4) * Math.max(0, enemy.hp / enemy.maxHp);
          return;
        }
        const dx = this.player.x - enemy.x, dy = this.player.y - enemy.y;
        const sameLane = Math.abs(dy) < 34 * COMBAT_SCALE;
        const distance = Math.abs(dx);
        enemy.facing = dx < 0 ? -1 : 1; enemy.setFlipX(enemy.facing < 0);
        if (sameLane && distance < 116 * COMBAT_SCALE) {
          enemy.setVelocity(0);
          if (time >= enemy.nextAttack) this.enemyAttack(enemy, time);
          else this.playActorAnim(enemy, 'idle', true);
        } else {
          const v = new Phaser.Math.Vector2(dx, dy * 1.25).normalize();
          enemy.setVelocity(v.x * enemy.speed, v.y * enemy.speed * 0.7);
          this.playActorAnim(enemy, 'walk', true);
        }
      });
    }

    updateBoss(boss, time) {
      const cameraLeft = this.cameras.main.scrollX;

      if (boss.mode === 'cast') {
        const bossMargin = 64 * BOSS_SCALE + 6;
        const sideTargetX = boss.facing < 0 ? cameraLeft + W - bossMargin : cameraLeft + bossMargin;
        const dxSide = sideTargetX - boss.x;

        if (Math.abs(dxSide) > 12) {
          boss.setVelocityX(Math.sign(dxSide) * boss.speed * 1.2);
          this.playActorAnim(boss, 'walk', true);
        } else {
          boss.setVelocity(0);
          this.playActorAnim(boss, 'idle', true);
        }

        if (time >= boss.nextAttack) {
          this.triggerBossPattern(boss, time);
        }
        return;
      }

      if (boss.mode === 'rush') {
        if (time >= boss.rushTimeEnd) {
          boss.mode = 'cast';
          boss.castWavesDone = 0;
          boss.castQuota = Math.min(12, boss.castQuota + 3);
          boss.nextAttack = time + 1900;
          return;
        }

        const dx = this.player.x - boss.x;
        const dy = this.player.y - boss.y;
        boss.facing = dx < 0 ? -1 : 1;
        boss.setFlipX(boss.facing < 0);

        if (Math.abs(dx) > 85 * COMBAT_SCALE || Math.abs(dy) > 24 * COMBAT_SCALE) {
          const v = new Phaser.Math.Vector2(dx, dy * 1.25).normalize();
          boss.setVelocity(v.x * boss.speed * 0.88, v.y * boss.speed * 0.7);
          this.playActorAnim(boss, 'walk', true);
        } else {
          boss.setVelocity(0);
          if (time >= boss.nextAttack) {
            this.enemyAttack(boss, time);
          } else {
            this.playActorAnim(boss, 'idle', true);
          }
        }
      }
    }

    showBossCallout(label) {
      const text = this.add.text(W / 2, 108, label, {
        fontFamily: 'monospace', fontSize: '20px', color: '#ffea00', fontStyle: 'bold',
        backgroundColor: '#21072f', padding: { x: 14, y: 8 }, stroke: '#000', strokeThickness: 4
      }).setOrigin(0.5).setScrollFactor(0).setDepth(14000);
      this.tweens.add({ targets: text, alpha: 0, y: 88, delay: 900, duration: 500, onComplete: () => text.destroy() });
    }

    playFrameEffect(type, x, y, options = {}) {
      const frames = [`${type}_1`, `${type}_2`, `${type}_3`];
      const effect = this.add.image(x, y, frames[0])
        .setOrigin(0.5)
        .setDepth(options.depth || 9500)
        .setScale(options.scale || 0.28 * ENTITY_SIZE_MULTIPLIER)
        .setAlpha(options.alpha ?? 1);
      if (options.tint) effect.setTint(options.tint);
      if (options.rotation) effect.setRotation(options.rotation);

      let frameIndex = 0;
      this.time.addEvent({
        delay: options.frameDelay || 55,
        repeat: 2,
        callback: () => {
          frameIndex = Math.min(frameIndex + 1, frames.length - 1);
          if (effect.active) effect.setTexture(frames[frameIndex]);
        }
      });
      this.tweens.add({
        targets: effect,
        x: x + (options.dx || 0),
        y: y + (options.dy || 0),
        scaleX: effect.scaleX * (options.grow || 1.15),
        scaleY: effect.scaleY * (options.grow || 1.15),
        alpha: 0,
        angle: effect.angle + (options.spin || 0),
        duration: options.duration || 230,
        ease: options.ease || 'Quad.easeOut',
        onComplete: () => effect.destroy()
      });
      return effect;
    }

    playSpecialAura() {
      const tint = { cristina: 0x3ffcff, iris: 0xb86cff, rache: 0xff4f91 }[this.character];
      const baseY = this.player.y - 42 * COMBAT_SCALE;

      if (this.character === 'cristina') {
        [-1, 0, 1].forEach((lane, index) => this.playFrameEffect('aurea', this.player.x, baseY + lane * 18, {
          tint, scale: (0.22 + index * 0.035) * 1.55, dx: this.player.facing * (92 + index * 30),
          spin: this.player.facing * (35 + index * 20), duration: 260 + index * 45, grow: 0.75
        }));
      } else if (this.character === 'iris') {
        [0.38, 0.53, 0.7].forEach((scale, index) => this.time.delayedCall(index * 65, () => {
          if (this.player.active) this.playFrameEffect('aurea', this.player.x, baseY, {
            tint, scale, duration: 360, grow: 1.9, spin: index % 2 ? -50 : 50, alpha: 0.88
          });
        }));
      } else {
        [-1, 1].forEach(direction => this.playFrameEffect('aurea', this.player.x + direction * 22, baseY, {
          tint, scale: 0.48, dx: direction * 78, dy: -38, spin: direction * 210,
          duration: 430, grow: 1.35, ease: 'Sine.easeOut'
        }));
        this.playFrameEffect('aurea', this.player.x, baseY, { tint, scale: 0.68, spin: 120, duration: 500, grow: 1.65 });
      }
    }

    addBossHazard({ x, y, width, height, delay = 850, duration = 350, color = 0xff0055, vx = 0, circle = false, spriteKey = null, spriteWidth = width, spriteHeight = height }) {
      delay *= 1.55;
      duration *= 1.2;
      const cameraLeft = this.cameras.main.scrollX;
      const halfWidth = width / 2;
      const halfHeight = height / 2;
      x = Phaser.Math.Clamp(x, cameraLeft + halfWidth, cameraLeft + W - halfWidth);
      y = Phaser.Math.Clamp(y, MOVEMENT_TOP + halfHeight, MOVEMENT_BOTTOM - halfHeight);
      const graphics = this.add.graphics().setDepth(8999);
      let sprite = null;

      if (spriteKey) {
        sprite = this.physics.add.sprite(x, y, spriteKey)
          // Sempre dietro a player e boss, che usano la coordinata Y come depth.
          .setDepth(MOVEMENT_TOP - 1)
          .setVisible(true)
          .setAlpha(1);
        fitImage(sprite, spriteWidth, spriteHeight);
        if (spriteKey === 'boss_shot_1') sprite.setTint(0x35eaff);
        const shotAnim = `${spriteKey}_fly`;
        if (this.anims.exists(shotAnim)) sprite.play(shotAnim);
      }

      this.bossHazards.push({
        x, y, width, height,
        delayEnds: this.time.now + delay,
        ends: this.time.now + delay + duration,
        color, vx, circle, graphics, sprite,
        totalDelay: delay,
        hasHit: false
      });
    }

    updateBossHazards(time, delta) {
      this.bossHazards = this.bossHazards.filter(hazard => {
        if (hazard.vx && time >= hazard.delayEnds) {
          hazard.x += hazard.vx * delta / 1000;
          if (hazard.sprite) {
            hazard.sprite.x = hazard.x;
          }
        }

        hazard.graphics.clear();

        if (time < hazard.delayEnds) {
          // Le icone PNG fungono già da telegrafo: restano nitide e opache,
          // senza il vecchio rettangolo di caricamento sovrapposto.
          if (hazard.sprite) return true;

          const progress = 1 - ((hazard.delayEnds - time) / hazard.totalDelay);
          const pulse = Math.floor(time / 60) % 2 === 0;

          if (hazard.circle) {
            hazard.graphics.fillStyle(hazard.color, pulse ? 0.38 : 0.15);
            hazard.graphics.fillCircle(hazard.x, hazard.y, hazard.width / 2);
            hazard.graphics.lineStyle(4, 0xffffff, pulse ? 0.9 : 0.4);
            hazard.graphics.strokeCircle(hazard.x, hazard.y, hazard.width / 2);
            
            hazard.graphics.lineStyle(3, 0xffea00, 0.9);
            hazard.graphics.strokeCircle(hazard.x, hazard.y, (hazard.width / 2) * progress);
          } else {
            hazard.graphics.fillStyle(hazard.color, pulse ? 0.32 : 0.14);
            hazard.graphics.fillRect(hazard.x - hazard.width / 2, hazard.y - hazard.height / 2, hazard.width, hazard.height);
            hazard.graphics.lineStyle(4, 0xffffff, pulse ? 0.9 : 0.4);
            hazard.graphics.strokeRect(hazard.x - hazard.width / 2, hazard.y - hazard.height / 2, hazard.width, hazard.height);

            hazard.graphics.fillStyle(0xffea00, 0.5);
            hazard.graphics.fillRect(hazard.x - hazard.width / 2, hazard.y - hazard.height / 2, hazard.width * progress, hazard.height);
          }
          return true;
        }

        if (!hazard.sprite) {
          hazard.graphics.fillStyle(hazard.color, 0.78);
          hazard.graphics.lineStyle(4, 0xffffff, 1);

          if (hazard.circle) {
            hazard.graphics.fillCircle(hazard.x, hazard.y, hazard.width / 2);
            hazard.graphics.strokeCircle(hazard.x, hazard.y, hazard.width / 2);
          } else {
            hazard.graphics.fillRect(hazard.x - hazard.width / 2, hazard.y - hazard.height / 2, hazard.width, hazard.height);
            hazard.graphics.strokeRect(hazard.x - hazard.width / 2, hazard.y - hazard.height / 2, hazard.width, hazard.height);
          }
        }

        if (!hazard.hasHit) {
          const hit = hazard.circle
            ? Phaser.Math.Distance.Between(this.player.x, this.player.y, hazard.x, hazard.y) < (hazard.width / 2 + 15 * COMBAT_SCALE)
            : Math.abs(this.player.x - hazard.x) < (hazard.width / 2 + 15 * COMBAT_SCALE) && Math.abs(this.player.y - hazard.y) < (hazard.height / 2 + 15 * COMBAT_SCALE);

          if (hit) {
            this.damagePlayer(15 + this.stage * 3);
            hazard.hasHit = true;
          }
        }

        if (time < hazard.ends) return true;

        hazard.graphics.destroy();
        if (hazard.sprite) {
          this.playFrameEffect('dustcloud', hazard.x, hazard.y, {
            depth: MOVEMENT_TOP - 0.5,
            scale: 0.42,
            grow: 1.55,
            duration: 380,
            alpha: 0.95
          });
          hazard.sprite.destroy();
        }
        return false;
      });
    }

    triggerBossPattern(boss, time) {
      this.playActorAnim(boss, 'atk');
      const cameraLeft = this.cameras.main.scrollX;
      const grid = this.getBossGrid(cameraLeft);
      const enraged = boss.hp <= boss.maxHp * 0.5;
      const addCells = (indices, color, delay = 720, duration = 300) => {
        [...new Set(indices)].forEach(index => {
          const cell = grid.cells[index];
          if (!cell) return;
          this.addBossHazard({
            x: cell.x, y: cell.y, width: grid.cellW * 0.76, height: grid.cellH * 0.72,
            delay, duration, color, spriteKey: boss.shotKey,
            spriteWidth: grid.cellW * 1.28, spriteHeight: grid.cellH * 1.58
          });
        });
      };

      if (boss.pattern === 1) {
        // Brief bomb: celle sparse, con una cella sempre lasciata libera attorno al player.
        const playerCell = this.getBossGridIndex(grid, this.player.x, this.player.y);
        const pool = Phaser.Utils.Array.Shuffle([...Array(BOSS_GRID_COLUMNS * BOSS_GRID_ROWS).keys()].filter(index => index !== playerCell));
        addCells(pool.slice(0, enraged ? 9 : 6), 0xff3e91, 760, 310);
      } else if (boss.pattern === 2) {
        // Ciak: due colonne chiuse, mai adiacenti, quindi restano corridoi leggibili.
        const first = Phaser.Math.Between(0, BOSS_GRID_COLUMNS - 1);
        const second = (first + 2) % BOSS_GRID_COLUMNS;
        const columns = enraged ? [first, second, (first + 4) % BOSS_GRID_COLUMNS] : [first, second];
        addCells(columns.flatMap(column => Array.from({ length: BOSS_GRID_ROWS }, (_, row) => row * BOSS_GRID_COLUMNS + column)), 0xffea00, 820, 340);
      } else if (boss.pattern === 3) {
        // Taxi: attraversa una delle quattro righe precise della griglia.
        const targetRow = Phaser.Math.Clamp(Math.floor((this.player.y - MOVEMENT_TOP) / grid.cellH), 0, 3);
        const fromLeft = boss.x < cameraLeft + W / 2;
        this.addBossHazard({
          x: fromLeft ? cameraLeft + 70 : cameraLeft + W - 70,
          y: grid.rows[targetRow], width: 140, height: grid.cellH * 0.72,
          delay: 750, duration: 1100, color: 0x00f0ff,
          vx: (fromLeft ? 560 : -560) * BACKGROUND_SCALE,
          spriteKey: 'taxi_vehicle', spriteWidth: TAXI_DISPLAY_WIDTH * 1.18, spriteHeight: TAXI_DISPLAY_HEIGHT * 1.18
        });
      } else if (boss.pattern === 4) {
        // Revisione: scacchiera alternata, con celle piccole e distinte.
        const parity = boss.castWavesDone % 2;
        const checker = grid.cells.map((_, index) => index).filter(index => ((index % BOSS_GRID_COLUMNS) + Math.floor(index / BOSS_GRID_COLUMNS)) % 2 === parity);
        addCells(checker.filter((_, index) => !enraged && index % 3 === 0 ? false : true), 0xa260ff, 900, 330);
      } else {
        // Final pitch: una diagonale avanza nella griglia come un'onda.
        const reverse = boss.castWavesDone % 2 === 1;
        const diagonal = Array.from({ length: BOSS_GRID_ROWS }, (_, row) => row).flatMap(row => {
          const column = reverse ? BOSS_GRID_COLUMNS - 1 - row : row;
          return enraged
            ? [row * BOSS_GRID_COLUMNS + column, row * BOSS_GRID_COLUMNS + Phaser.Math.Clamp(column + (reverse ? -1 : 1), 0, BOSS_GRID_COLUMNS - 1)]
            : [row * BOSS_GRID_COLUMNS + column];
        });
        addCells(diagonal, 0xff0055, 620, 280);
      }

      boss.castWavesDone++;

      if (boss.castWavesDone >= boss.castQuota) {
        boss.mode = 'rush';
        boss.rushTimeEnd = time + 9000;
        boss.nextAttack = time + 350;
        this.showBossCallout('ATTACCO DIRETTO!');
      } else {
        boss.nextAttack = time + 2400;
      }
    }

    getBossGrid(cameraLeft) {
      const paddingX = 12;
      const cellW = (W - paddingX * 2) / BOSS_GRID_COLUMNS;
      const cellH = (MOVEMENT_BOTTOM - MOVEMENT_TOP) / BOSS_GRID_ROWS;
      const columns = Array.from({ length: BOSS_GRID_COLUMNS }, (_, column) => cameraLeft + paddingX + cellW * (column + 0.5));
      const rows = Array.from({ length: BOSS_GRID_ROWS }, (_, row) => MOVEMENT_TOP + cellH * (row + 0.5));
      return { cellW, cellH, columns, rows, cells: rows.flatMap(y => columns.map(x => ({ x, y }))) };
    }

    getBossGridIndex(grid, x, y) {
      const column = Phaser.Math.Clamp(Math.floor((x - this.cameras.main.scrollX - 12) / grid.cellW), 0, BOSS_GRID_COLUMNS - 1);
      const row = Phaser.Math.Clamp(Math.floor((y - MOVEMENT_TOP) / grid.cellH), 0, BOSS_GRID_ROWS - 1);
      return row * BOSS_GRID_COLUMNS + column;
    }

    enemyAttack(enemy, time) {
      enemy.nextAttack = time + (enemy.isBoss ? 1100 : Math.max(1400, 2200 - this.stage * 150));
      enemy.stateLocked = true; enemy.setVelocity(0); this.playActorAnim(enemy, 'atk');
      this.time.delayedCall(enemy.isBoss ? 450 : 220, () => {
        if (!enemy.active || this.stageEnded) return;
        if (Math.abs(this.player.x - enemy.x) < (enemy.isBoss ? 155 : 118) * COMBAT_SCALE && Math.abs(this.player.y - enemy.y) < 54 * COMBAT_SCALE) {
          this.playFrameEffect('hitspark', this.player.x, this.player.y - 38 * COMBAT_SCALE, { tint: 0xff6a4d, scale: 0.25, spin: 35 });
          this.damagePlayer(enemy.damage);
        }
      });
    }

    normalAttack() {
      if (this.isGuarding) this.stopGuard();
      if (this.attackBusy || this.stageEnded || this.isPausedState) return;
      playSfx('assets/audio/sfx_punch.mp3');
      const now = this.time.now;
      this.comboStep = now <= this.comboExpires ? (this.comboStep % 3) + 1 : 1;
      this.comboExpires = now + 650;
      this.performAttack('atk', 18 + this.comboStep * 4, 125 * COMBAT_SCALE, 55 * COMBAT_SCALE, 250);
    }

    specialAttack() {
      if (this.isGuarding) this.stopGuard();
      const cd = SPECIAL_COOLDOWN * (this.playerStats.cdMult || 1.0);
      if (this.attackBusy || this.stageEnded || this.isPausedState || this.time.now < this.specialReadyAt) return;
      playSfx('assets/audio/sfx_special.mp3');
      this.specialReadyAt = this.time.now + cd;
      this.playSpecialAura();
      this.performAttack('atk_spec', 58, 190 * COMBAT_SCALE, 90 * COMBAT_SCALE, 250);
      this.cameras.main.shake(180, 0.006);
    }

    startGuard() {
      if (!this.player?.active || this.attackBusy || this.stageEnded || this.isPausedState || this.isGuarding) return;
      if (this.player.anims.currentAnim?.key === `${this.character}_hurt`) return;
      playSfx('assets/audio/sfx_block.mp3');
      this.isGuarding = true;
      this.player.setVelocity(0);
      this.player.anims.stop();
      this.player.setFrame(2);
      window.dispatchEvent(new CustomEvent('pixelpunch-guard-state', { detail: true }));
    }

    toggleGuard() {
      if (this.isGuarding) this.stopGuard();
      else this.startGuard();
    }

    stopGuard() {
      if (!this.isGuarding) return;
      this.isGuarding = false;
      window.dispatchEvent(new CustomEvent('pixelpunch-guard-state', { detail: false }));
      if (this.player?.active && !this.stageEnded) this.player.play(`${this.character}_idle`, true);
    }

    performAttack(anim, damage, reach, lane, impactDelay) {
      this.attackBusy = true; this.player.setVelocity(0); this.player.play(`${this.character}_${anim}`, true);
      const totalDmg = damage * (this.playerStats.dmgMult || 1.0);

      this.time.delayedCall(impactDelay, () => {
        if (!this.player.active) return;
        const hitX = this.player.x + this.player.facing * reach * 0.55;
        this.enemies.getChildren().slice().forEach(enemy => {
          if (!enemy.active) return;
          const inFront = this.player.facing > 0 ? enemy.x >= this.player.x - 8 * COMBAT_SCALE : enemy.x <= this.player.x + 8 * COMBAT_SCALE;
          if (inFront && Math.abs(enemy.x - hitX) <= reach * 0.65 && Math.abs(enemy.y - this.player.y) <= lane) this.damageEnemy(enemy, totalDmg);
        });
        this.crates.getChildren().slice().forEach(crate => {
          const inFront = this.player.facing > 0 ? crate.x >= this.player.x - 8 * COMBAT_SCALE : crate.x <= this.player.x + 8 * COMBAT_SCALE;
          if (crate.active && inFront && Math.abs(crate.x - hitX) <= reach * 0.7 && Math.abs(crate.y - this.player.y) <= lane + 10 * COMBAT_SCALE) this.damageCrate(crate, totalDmg);
        });
      });
    }

    damageEnemy(enemy, damage) {
      if (enemy.stateLocked === 'ko') return;
      if (enemy.isBoss && enemy.mode !== 'rush') {
        playSfx('assets/audio/sfx_block.mp3');
        enemy.setTint(0x66eaff);
        this.time.delayedCall(90, () => { if (enemy.active) enemy.clearTint(); });
        return;
      }
      playSfx('assets/audio/sfx_hit.mp3');
      this.playFrameEffect('hitspark', enemy.x, enemy.y - 42 * COMBAT_SCALE, {
        tint: enemy.isBoss ? 0xffd43b : 0xffffff,
        scale: enemy.isBoss ? 0.34 : 0.25,
        dx: this.player.facing * 12,
        spin: this.player.facing * 45
      });
      enemy.hp -= damage; enemy.setVelocity(0); enemy.stateLocked = true;
      if (enemy.hp <= 0) {
        enemy.stateLocked = 'ko'; this.playActorAnim(enemy, 'ko');
        this.playFrameEffect('dustcloud', enemy.x, enemy.y - 12 * COMBAT_SCALE, {
          scale: enemy.isBoss ? 0.52 : 0.34, grow: 1.6, duration: 420, alpha: 0.9
        });
        this.score += enemy.isBoss ? 5000 : 250; // Punti diretti (5.000 per il Boss)
        this.time.delayedCall(520, () => {
          if (!enemy.active) return;
          const x = enemy.x, y = enemy.y, wasBoss = enemy.isBoss;
          enemy.destroy();
          if (!wasBoss) {
            this.arenaDefeated++;
            this.maybeDropPickup(x, y, false);
          }
          this.checkArenaClear();
        });
      } else {
        this.playActorAnim(enemy, 'hurt');
      }
    }

    damageCrate(crate, damage) {
      if (!crate.active || crate.hitLock) return;
      playSfx('assets/audio/sfx_crate.mp3');
      this.playFrameEffect('hitspark', crate.x, crate.y - 22 * COMBAT_SCALE, { tint: 0xffd089, scale: 0.22, spin: 70 });
      crate.hitLock = true; crate.hp -= damage >= 50 ? 2 : 1;
      if (crate.hp <= 0) {
        const x = crate.x, y = crate.y; const textureKey = `crate_${crate.variant}_broken2`;
        this.playFrameEffect('dustcloud', x, y - 8 * COMBAT_SCALE, { scale: 0.3, grow: 1.5, duration: 360 });
        crate.setTexture(textureKey); this.resizeCrate(crate, textureKey);
        this.time.delayedCall(180, () => { crate.destroy(); this.maybeDropPickup(x, y, false, true); });
      } else {
        const textureKey = `crate_${crate.variant}_broken1`;
        crate.setTexture(textureKey); this.resizeCrate(crate, textureKey);
        this.time.delayedCall(140, () => { if (crate.active) crate.hitLock = false; });
      }
    }

    maybeDropPickup(x, y, boss = false, guaranteed = false) {
      if (boss) return; // NESSUN DROP DAGLI SCONTRI BOSS
      if (!guaranteed && Math.random() > 0.45) return;
      
      let key, value, kind;
      if (Math.random() < 0.3) {
        const big = Math.random() < 0.35; key = `life_${big ? 1 : 0}`; value = big ? 100 : 25; kind = 'life';
      } else {
        const roll = Math.random(); const tier = roll < 0.55 ? 0 : roll < 0.86 ? 1 : 2;
        key = `point_${tier}`; value = [100, 300, 500][tier]; kind = 'points';
      }

      const minCamX = this.cameras.main.scrollX + 60;
      const maxCamX = this.cameras.main.scrollX + W - 60;
      const safeX = Phaser.Math.Clamp(x, Math.max(minCamX, 60), Math.min(maxCamX, WORLD_W - 60));
      const safeY = Phaser.Math.Clamp(y, LOWER_LANE_TOP + 20 * BACKGROUND_SCALE, MOVEMENT_BOTTOM - 20 * BACKGROUND_SCALE);

      const pickup = this.pickupGroup.create(safeX, safeY, key).setOrigin(0.5, 1).setDisplaySize(38 * OBJECT_SCALE, 38 * OBJECT_SCALE);
      pickup.kind = kind; pickup.value = value;
      
      const pickupFrame = pickup.frame;
      pickup.body.setSize(pickupFrame.width * 0.8, pickupFrame.height * 0.8);
      pickup.body.setOffset(pickupFrame.width * 0.1, pickupFrame.height * 0.1);
      this.tweens.add({ targets: pickup, y: safeY - 8 * BACKGROUND_SCALE, duration: 430, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    collectNearbyPickups() {
      this.pickupGroup.getChildren().forEach(pickup => {
        if (!pickup.active || pickup.collecting) return;
        if (Math.abs(this.player.x - pickup.x) <= 90 * COMBAT_SCALE && Math.abs(this.player.y - pickup.y) <= 72 * COMBAT_SCALE) {
          this.collectPickup(this.player, pickup);
        }
      });
    }

    collectPickup(_player, pickup) {
      if (!pickup.active) return;
      pickup.collecting = true;
      playSfx('assets/audio/sfx_pickup.mp3');
      let feedback;
      if (pickup.kind === 'life') {
        const healValue = pickup.value * (this.playerStats.healMult || 1.0);
        this.hp = Math.min(100, this.hp + healValue);
        feedback = `+${Math.round(healValue)} HP`;
      } else {
        this.score += pickup.value;
        feedback = `+${pickup.value}`;
      }
      const text = this.add.text(pickup.x, pickup.y - 38, feedback, { fontFamily: 'monospace', fontSize: '16px', color: pickup.kind === 'life' ? '#55ff88' : '#ffea00', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(12000);
      this.tweens.add({ targets: text, y: text.y - 24, alpha: 0, duration: 420, onComplete: () => text.destroy() });
      pickup.destroy(); this.refreshHud();
    }

    // GESTIONE DANNO PLAYER
    damagePlayer(damage) {
      if (this.time.now < this.player.invulnerableUntil || this.stageEnded) return;

      if (this.isGuarding) {
        playSfx('assets/audio/sfx_block.mp3');
        this.player.setTint(0x66eaff);
        this.cameras.main.shake(70, 0.002);
        this.time.delayedCall(90, () => { if (this.player.active) this.player.clearTint(); });
        return;
      }

      playSfx('assets/audio/sfx_hurt.mp3');
      const actualDmg = damage * (this.playerStats.dmgTakenMult || 1.0);
      this.hp = Math.max(0, this.hp - actualDmg); this.player.invulnerableUntil = this.time.now + 700;
      this.player.setTintFill(0xffffff); this.player.play(`${this.character}_hurt`, true);
      this.cameras.main.shake(130, 0.008);
      this.time.delayedCall(120, () => { if (this.player.active) this.player.clearTint(); });
      if (this.hp <= 0) this.gameOver();
    }

    checkArenaClear() {
      if (!this.arenaLocked || this.enemies.countActive(true) > 0) return;
      const quotaComplete = this.arenaSpawned >= this.arenaQuota && this.arenaDefeated >= this.arenaQuota;
      if (!quotaComplete) return;
      if (this.arenaIndex === BOSS_ARENA_INDEX) {
        if (this.bossSpawned) this.stageClear();
      } else {
        this.showBanner('go', 900);
        this.arenaLocked = false;
        this.arenaRunId++;
        this.arenaIndex++;
        this.cameras.main.startFollow(this.player, true, 0.12, 0.12, -55, 0);
      }
    }

    // BANNER INGRANDITI (3x) E CENTRATI AL MEZZO
    showBanner(key, duration) {
      const image = fitImage(this.add.image(W / 2, H / 2, key), W * 0.9, H * 0.35).setScrollFactor(0).setDepth(12000).setAlpha(0);
      const targetScale = image.scaleX;
      image.setScale(targetScale * 0.62);
      this.tweens.add({ targets: image, alpha: 1, scale: targetScale, duration: 180, yoyo: true, hold: duration, onComplete: () => image.destroy() });
    }

    stageClear() {
      this.stageEnded = true; this.player.setVelocity(0); this.showBanner('stageclear', 1250);
      playSfx('assets/audio/sfx_win.mp3');
      this.time.delayedCall(1750, () => {
        if (this.stage < 5) this.scene.start('ScenarioIntroScene', { character: this.character, stage: this.stage + 1, score: this.score });
        else this.showFinalVictory();
      });
    }

    showFinalVictory() {
      this.saveScore();
      playSfx('assets/audio/sfx_win.mp3');
      this.cameras.main.setScroll(0, 0);
      const panel = this.add.rectangle(W / 2, H / 2, 320, 250, 0x080412, 0.96).setScrollFactor(0).setDepth(13001).setStrokeStyle(3, 0xffd43b);
      const title = this.add.text(W / 2, 260, 'PIXEL PUNCH\nCOMPLETATO!', { align: 'center', fontFamily: 'monospace', fontSize: '26px', color: '#ffdc4d', fontStyle: 'bold' }).setOrigin(0.5).setScrollFactor(0).setDepth(13001);
      const button = this.add.text(W / 2, 390, 'TORNA ALLA SELEZIONE', { fontFamily: 'monospace', fontSize: '14px', backgroundColor: '#7028aa', padding: { x: 15, y: 11 } }).setOrigin(0.5).setScrollFactor(0).setDepth(13001).setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => this.scene.start('SelectScene'));
      void panel; void title;
    }

    gameOver() {
      this.stageEnded = true; this.player.setVelocity(0); this.player.play(`${this.character}_ko`, true);
      this.playFrameEffect('dustcloud', this.player.x, this.player.y - 10 * COMBAT_SCALE, { scale: 0.38, grow: 1.7, duration: 460 });
      this.saveScore();
      playSfx('assets/audio/sfx_gameover.mp3');
      const shade = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.72).setScrollFactor(0).setDepth(12500);
      const over = fitImage(this.add.image(W / 2, H / 2, 'gameover'), W * 0.9, H * 0.35).setScrollFactor(0).setDepth(12501);
      const retry = this.add.text(W / 2, 380, 'RIPROVA', { fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', backgroundColor: '#c71950', padding: { x: 32, y: 13 } }).setOrigin(0.5).setScrollFactor(0).setDepth(12502).setInteractive({ useHandCursor: true });
      retry.on('pointerdown', () => this.scene.restart({ character: this.character, stage: this.stage, score: this.score }));
      void shade; void over;
    }

    playActorAnim(actor, name, ignoreIfPlaying = false) {
      const key = actor.texture.key;
      const anim = `${key}_${name}`;
      if (!ignoreIfPlaying || actor.anims.currentAnim?.key !== anim) actor.play(anim, true);
    }

    bindActorAnimationEvents(actor, textureKey, koFrame, isPlayer = false) {
      const restoreIdle = () => {
        if (!actor.active || actor.stateLocked === 'ko' || (isPlayer && this.stageEnded)) return;
        actor.stateLocked = false;
        if (isPlayer) this.attackBusy = false;
        actor.play(`${textureKey}_idle`, true);
      };

      actor.on(`animationcomplete-${textureKey}_atk`, restoreIdle);
      actor.on(`animationcomplete-${textureKey}_atk_spec`, restoreIdle);
      actor.on(`animationcomplete-${textureKey}_hurt`, restoreIdle);
      actor.on(`animationcomplete-${textureKey}_ko`, () => {
        if (!actor.active) return;
        actor.anims.stop();
        actor.setFrame(koFrame);
      });
    }

    updateDepths() {
      this.player.setDepth(Math.round(this.player.y));
      if (this.playerOverhead?.active) {
        this.playerOverhead.x = this.player.x;
        this.playerOverhead.y = this.player.y - this.player.displayHeight - 8;
        this.playerOverhead.setDepth(Math.round(this.player.y) + 1);
      }
      this.enemies.getChildren().forEach(e => e.setDepth(Math.round(e.y)));
      this.crates.getChildren().forEach(o => o.setDepth(Math.round(o.y)));
      this.pickupGroup.getChildren().forEach(o => o.setDepth(Math.round(o.y)));
    }

    updateCooldown(time) {
      const cd = SPECIAL_COOLDOWN * (this.playerStats.cdMult || 1.0);
      const progress = Phaser.Math.Clamp(1 - (this.specialReadyAt - time) / cd, 0, 1);
      this.specialBar.width = 108 * progress;
      const fill = document.getElementById('specialFill');
      if (fill) fill.style.height = `${Math.round(progress * 100)}%`;
    }

    refreshHud() {
      if (!this.hpBar) return;
      this.hpBar.width = 172 * (this.hp / 100);
      this.hpShine.width = 168 * (this.hp / 100);
      this.hpValueText.setText(`${Math.ceil(this.hp)} HP`);
      this.scoreText.setText(`★ ${this.score.toString().padStart(6, '0')}`);
      if (!this.arenaLocked) {
        this.stageText.setText(`STAGE ${this.stage}/5\nFIGHT ${Math.min(this.arenaIndex + 1, 5)}/5`);
      } else if (this.arenaIndex === BOSS_ARENA_INDEX) {
        this.stageText.setText(`STAGE ${this.stage}/5\n⚠ BOSS ⚠`);
      } else {
        this.stageText.setText(`FIGHT ${this.arenaIndex + 1}/5\nKO ${Math.min(this.arenaDefeated, this.arenaQuota)}/${this.arenaQuota}`);
      }
    }
  }

  const config = {
    type: Phaser.AUTO,
    parent: 'pixel-punch-v2',
    width: W,
    height: H,
    backgroundColor: '#080412',
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: 0 }, debug: false }
    },
    input: { activePointers: 4 },
    scene: [SelectScene, ScenarioIntroScene, EnemyBriefingScene, GameScene]
  };

  window.PixelPunchV2 = { config, PLAYERS, ENEMY_FILES, BOSS_FILES };
  window.pixelPunchV2Game = new Phaser.Game(config);
})();
