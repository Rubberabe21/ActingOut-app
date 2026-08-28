/* Pixel Punch V2 - motore isolato 512x512 / Phaser 3 con AudioManager integrato */
(() => {
  'use strict';

  // Usa il mixer condiviso: BGM 0,35 e SFX 0,85, come negli altri giochi.
  const AudioManager = window.AudioManager;

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
  `;
  document.head.appendChild(style);

  if (!window.Phaser) {
    document.getElementById('boot-error').style.display = 'block';
    return;
  }

  const W = 512;
  const H = 512;
  const NATIVE_BACKGROUND_HEIGHT = 640;
  const BACKGROUND_SCALE = H / NATIVE_BACKGROUND_HEIGHT;
  const WORLD_W = 3200 * BACKGROUND_SCALE;
  const WORLD_VIEW_TOP = 64;
  const WORLD_VIEW_BOTTOM = H;
  const WORLD_VIEW_HEIGHT = WORLD_VIEW_BOTTOM - WORLD_VIEW_TOP;
  const WORLD_SCALE_Y = BACKGROUND_SCALE;
  const WORLD_RENDER_TOP = 0;
  const MOVEMENT_HEIGHT = H * (190 / 640);
  const MOVEMENT_VERTICAL_OFFSET = H * (30 / 640);
  const MOVEMENT_BOTTOM = H + MOVEMENT_VERTICAL_OFFSET;
  const MOVEMENT_TOP = H - MOVEMENT_HEIGHT + H * (60 / 640);
  const SPECIAL_COOLDOWN = 5000;
  
  const ENTITY_SCALE = 2;
  const ENEMY_SCALE = ENTITY_SCALE * 0.9;
  const BOSS_SCALE = 2.2;
  const OBJECT_SCALE = 2.5;
  const ROOT = 'assets/PixelPunch/GameV2/';

  const PLAYERS = [
    { 
      key: 'cristina', file: 'cri.png', label: 'CRISTINA', select: 'cri_select.png', color: 0xff3e91,
      role: 'LEADER AGILE',
      bio: 'Focalizzata sulla velocità. Sfreccia tra i nemici e ricarica le speciali a tempo record.',
      bonus: '⚡ +20% Velocità di movimento\n⏱️ -20% Ricarica Speciale', 
      malus: '💥 -15% Danno Attacco Base',
      speedMult: 1.20, dmgMult: 0.85, dmgTakenMult: 1.0, cdMult: 0.80, healMult: 1.0 
    },
    { 
      key: 'iris', file: 'iris.png', label: 'IRIS', select: 'iris_select.png', color: 0x39dfff,
      role: 'BRAWLER HEAVY',
      bio: 'Potenza pura. Assorbe i colpi senza piegarsi e infligge danni devastanti.',
      bonus: '🥊 +25% Danno Attacco Base\n🛡️ -20% Danni Subiti', 
      malus: '🐢 -15% Velocità di movimento',
      speedMult: 0.85, dmgMult: 1.25, dmgTakenMult: 0.80, cdMult: 1.0, healMult: 1.0 
    },
    { 
      key: 'rache', file: 'rache.png', label: 'RACHE', select: 'rache_select.png', color: 0xffd43b,
      role: 'TACTICAL PRODUCER',
      bio: 'Maestra del recupero. Sfrutta ogni snack per mantenere al massimo l’energia.',
      bonus: '🍕 +50% Vita dal Cibo\n⚡ +10% Danno Attacco Base', 
      malus: '⚠️ +20% Danni Subiti se colpita',
      speedMult: 1.05, dmgMult: 1.10, dmgTakenMult: 1.20, cdMult: 1.0, healMult: 1.50 
    }
  ];

  function getPlayerScale(character) {
    return character === 'iris' ? ENTITY_SCALE : ENTITY_SCALE * 0.8;
  }

  const ENEMY_FILES = [
    '1_stagista.png', '2_manager.png', '3_copywriter.png', '4_designer.png',
    '5_influencer.png', '6_fonico.png', '7_cavi.png', '8_stylist.png',
    '9_rider.png', '10_monopattino.png', '11_turisti.png', '12_controllore.png',
    '13_guardia.png', '14_avvocato.png', '15_hr.png', '16_account.png',
    '17_consulente.png', '18_investor.png', '19_techbro.png', '20_brand.png'
  ];
  const BOSS_FILES = ['21_boss_creative.png', '22_boss_regista.png', '23_boss_tassista.png', '24_boss_client.png', '25_boss_ceo.png'];
  const ARENA_X = [520, 1100, 1680, 2260, 2840].map(x => x * BACKGROUND_SCALE);
  
  const STORY_PAGES = [
    {
      title: 'CAPITOLO 1 — LA SCADENZA',
      subtitle: 'VENERDÌ ORE 19:00',
      text: 'È venerdì sera a Torino e mancano solo 5 ore alla scadenza improrogabile del pitch della vita.\n\nLa campagna da un milione di euro che salverà la piccola agenzia indipendente dal fallimento e dalla vendita alla multinazionale "Corporate Global" è pronta per l\'esportazione.'
    },
    {
      title: 'CAPITOLO 2 — IL SABOTAGGIO',
      subtitle: 'ATTACCO SU TUTTI I FRONTI',
      text: 'Qualcuno ha piazzato trappole e ostacoli lungo l\'intera filiera!\n\nAccount spietati, troupe impazzite, controllori e rider spericolati hanno sbarrato le strade di Torino per impedire che l\'Hard Drive con il master finale arrivi a destinazione.'
    },
    {
      title: 'CAPITOLO 3 — LA MISSIONE',
      subtitle: 'PITCH OR DIE',
      text: 'Le tre Producer Cristina, Iris e Rache devono farsi strada a colpi di tastiera, ciak e caffè bollente.\n\nSgombera ogni area, sconfiggi i Boss di settore e consegna il pitch entro la mezzanotte!'
    }
  ];

  const SCENARIO_STORIES = [
    { title: 'SCENARIO 1 — OPEN SPACE AGENZIA', subtitle: 'INTERNAL CHAOS', text: 'Il cliente manda i suoi Account e Manager a requisire i computer dell’ufficio per fermare l’esportazione del video. Le Producer devono farsi strada a colpi di tastiera e caffè bollente per portare via l’Hard Drive.' },
    { title: 'SCENARIO 2 — SET DOCKS DORA', subtitle: 'IL SET FUORI CONTROLLO', text: 'Bisogna recuperare gli ultimi girati B-roll sul set. Il Regista Capriccioso e la sua troupe sono impazziti e hanno bloccato le uscite: occorre sgomberare l’area tra faretti e cavi scoppiettanti.' },
    { title: 'SCENARIO 3 — TORINO CENTRO', subtitle: 'LA CORSA SU VIA PO', text: 'Attraversamento rapido della città verso il grattacielo. Controllori GTT, Rider spericolati e Turisti col selfie-stick cercano di far cadere la borsa con l’Hard Drive lungo il pavè torinese.' },
    { title: 'SCENARIO 4 — CORPORATE TOWER', subtitle: 'LA BUROCRAZIA', text: 'Infiltrazione nell’edificio del cliente. Bisogna farsi strada tra Guardie di sicurezza, Avvocati armati di contratti e HR spietati per prendere l’ascensore panoramico.' },
    { title: 'SCENARIO 5 — PENTHOUSE VIP', subtitle: 'IL PITCH FINALE', text: 'L’ultimo scontro nel salone barocco. Il CEO e il Client Boss tentano di bocciare il progetto con attacchi finanziari devastanti. La vittoria sblocca PITCH DELIVERED a un secondo dalla mezzanotte.' }
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

  // ANIMAZIONI RALLENTATE: framerate ridotto su walk (5 fps)
  const FRAME_MAP = {
    idle: [0, 1, 7], block: [2, 2, 1], walk: [3, 6, 5], atk: [7, 9, 6],
    atk_spec: [10, 12, 6], hurt: [13, 14, 10], ko: [15, 17, 7]
  };
  const ENEMY_FRAME_MAP = {
    idle: [0, 1, 5], walk: [2, 5, 5], atk: [6, 7, 5], hurt: [8, 8, 10], ko: [9, 11, 7]
  };

  function loadImage(scene, key, path) {
    scene.load.image(key, ROOT + path);
  }

  function worldY(nativeY) {
    return WORLD_RENDER_TOP + nativeY * WORLD_SCALE_Y;
  }

  function randomMovementY() {
    return Phaser.Math.Between(Math.ceil(MOVEMENT_TOP + 10), Math.floor(MOVEMENT_BOTTOM - 10));
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

    clearPage() { this.pageObjects.removeAll(true); }
    
    addTitle(title, color = '#ffea00') { 
      this.pageObjects.add(this.add.text(W / 2, 28, title, { 
        fontFamily: 'monospace', fontSize: '24px', color, fontStyle: 'bold', stroke: '#000000', strokeThickness: 5 
      }).setOrigin(0.5)); 
    }

    addContinue(label = 'PREMI A PER CONTINUARE ►') {
      const text = this.add.text(W / 2, H - 22, label, { 
        fontFamily: 'monospace', fontSize: '15px', color: '#00ffcc', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4 
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
      this.pageObjects.add(this.add.rectangle(W / 2, H - 58, W, 116, 0x05020d, 0.72)); 
      this.addContinue('PREMI A PER INIZIARE ►');
    }

    showStory(index = 0) {
      this.page = 'story'; 
      this.storyPageIndex = index;
      this.clearPage(); 
      playSfx('assets/audio/sfx_select.mp3');
      
      const s = STORY_PAGES[this.storyPageIndex];
      this.addTitle(s.title);

      const panel = this.add.rectangle(W / 2, 250, W - 40, 360, 0x140a28, 0.98).setStrokeStyle(3, 0xff3e91);
      const subtitle = this.add.text(W / 2, 100, s.subtitle, { fontFamily: 'monospace', fontSize: '16px', color: '#00f0ff', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
      const copy = this.add.text(W / 2, 240, s.text, { fontFamily: 'sans-serif', fontSize: '15px', color: '#ffffff', align: 'center', lineSpacing: 8, wordWrap: { width: W - 80 } }).setOrigin(0.5);
      
      const pageIndicator = this.add.text(W / 2, 400, `PAGINA ${this.storyPageIndex + 1} DI ${STORY_PAGES.length}`, { fontFamily: 'monospace', fontSize: '13px', color: '#ffea00', fontStyle: 'bold' }).setOrigin(0.5);

      this.pageObjects.add([panel, subtitle, copy, pageIndicator]); 
      this.addContinue(this.storyPageIndex < STORY_PAGES.length - 1 ? 'PREMI A PER PAGINA SUCCESSIVA ►' : 'PREMI A PER REGOLE DI GIOCO ►');
    }

    showRules() {
      this.page = 'rules'; 
      this.clearPage(); 
      playSfx('assets/audio/sfx_select.mp3');
      this.addTitle('REGOLE DI GIOCO', '#00f0ff');
      
      const rules = [
        ['01. MUOVITI','Joystick o WASD: cammina in 8 direzioni.'],
        ['02. COMBO','A o J: attacco normale concatenabile.'],
        ['03. SPECIALE E PARATA','B/K: speciale. Tocca P/L per parata.'],
        ['04. LOCK & PAUSA','Completa le ondate. Tocca PAUSA per fermare.'],
        ['05. SOPRAVVIVI','Raccogli punti e cibo per recuperare HP.']
      ];
      
      rules.forEach((rule, i) => { 
        const y = 78 + i * 72, color = ['#ffea00','#ff3e91','#a260ff','#00f0ff','#00ff99'][i];
        const box = this.add.rectangle(W / 2, y, W - 40, 60, 0x111027, 1).setStrokeStyle(2, Phaser.Display.Color.HexStringToColor(color).color);
        const title = this.add.text(32, y - 18, rule[0], { fontFamily: 'monospace', fontSize: '13px', color, fontStyle: 'bold' });
        const copy = this.add.text(32, y + 2, rule[1], { fontFamily: 'sans-serif', fontSize: '12px', color: '#ffffff', wordWrap: { width: W - 64 } });
        this.pageObjects.add([box, title, copy]); 
      });

      this.addContinue('PREMI A PER SCEGLIERE FIGHTER ►');
    }

    // PAGINA SELEZIONE MIGLIORATA: Immagini e testi ingranditi e ridisegnati
    showSelection(charIndex = 0) {
      this.page = 'select';
      this.charSelectIndex = (charIndex + PLAYERS.length) % PLAYERS.length;
      this.clearPage();
      playSfx('assets/audio/sfx_select.mp3');

      const p = PLAYERS[this.charSelectIndex];

      const selectTitle = fitImage(this.add.image(W / 2, 28, 'select_text'), W * 0.75, 48);
      this.pageObjects.add(selectTitle);

      // Card contenitore principale
      const cardBg = this.add.rectangle(W / 2, 245, W - 28, 375, 0x0f0821, 0.98).setStrokeStyle(3, p.color);

      // Glow + Ritratto grandissimo del personaggio (ingrandito a 220px max)
      const glow = this.add.ellipse(135, 175, 180, 200, p.color, 0.3);
      const portrait = fitImage(this.add.image(135, 175, `${p.key}_select`), 190, 220);
      this.tweens.add({ targets: glow, alpha: 0.6, scaleX: 1.15, scaleY: 1.15, duration: 800, yoyo: true, repeat: -1 });

      // Intestazione personaggio (Testi grandi)
      const nameText = this.add.text(240, 68, p.label, { fontFamily: 'monospace', fontSize: '28px', color: '#ffffff', fontStyle: 'bold', stroke: '#000', strokeThickness: 5 });
      const roleText = this.add.text(240, 102, p.role, { fontFamily: 'monospace', fontSize: '14px', color: '#ffea00', fontStyle: 'bold' });

      // Bio del personaggio
      const bioText = this.add.text(240, 126, p.bio, { fontFamily: 'sans-serif', fontSize: '12px', color: '#dddddd', wordWrap: { width: 245 }, lineSpacing: 3 });

      // Box Bonus con testo ingrandito
      const bonusBox = this.add.rectangle(W / 2, 280, W - 48, 54, 0x0a2416, 0.95).setStrokeStyle(2, 0x00ff88);
      const bonusTitle = this.add.text(38, 258, 'BONUS', { fontFamily: 'monospace', fontSize: '13px', color: '#00ff88', fontStyle: 'bold' });
      const bonusDetail = this.add.text(38, 276, p.bonus, { fontFamily: 'sans-serif', fontSize: '12px', color: '#ffffff', fontStyle: 'bold', lineSpacing: 2 });

      // Box Malus con testo ingrandito
      const malusBox = this.add.rectangle(W / 2, 350, W - 48, 50, 0x2b0d14, 0.95).setStrokeStyle(2, 0xff4466);
      const malusTitle = this.add.text(38, 330, 'MALUS', { fontFamily: 'monospace', fontSize: '13px', color: '#ff4466', fontStyle: 'bold' });
      const malusDetail = this.add.text(38, 347, p.malus, { fontFamily: 'sans-serif', fontSize: '12px', color: '#ffffff', fontStyle: 'bold', lineSpacing: 2 });

      // Frecce tattili grandi di selezione laterale
      const prevBtn = this.add.text(22, 175, '◀', { fontFamily: 'monospace', fontSize: '42px', color: '#00f0ff', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      prevBtn.on('pointerdown', () => this.showSelection(this.charSelectIndex - 1));

      const nextBtn = this.add.text(W - 22, 175, '▶', { fontFamily: 'monospace', fontSize: '42px', color: '#00f0ff', fontStyle: 'bold', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      nextBtn.on('pointerdown', () => this.showSelection(this.charSelectIndex + 1));

      // Indicatori a pallino
      const dotsText = PLAYERS.map((_, i) => i === this.charSelectIndex ? '●' : '○').join('   ');
      const dots = this.add.text(W / 2, 396, dotsText, { fontFamily: 'monospace', fontSize: '20px', color: '#00ffcc' }).setOrigin(0.5);

      // Bottone Conferma Ingrandito
      const selectBtn = this.add.rectangle(W / 2, H - 32, W - 48, 44, 0x7028aa, 1).setStrokeStyle(3, 0xffea00).setInteractive({ useHandCursor: true });
      const selectBtnText = this.add.text(W / 2, H - 32, `SCEGLI ${p.label} (PREMI A) ►`, { fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
      
      selectBtn.on('pointerdown', () => {
        playSfx('assets/audio/sfx_select.mp3');
        this.scene.start('ScenarioIntroScene', { character: p.key, stage: 1, score: 0 });
      });

      this.pageObjects.add([
        cardBg, glow, portrait, nameText, roleText, bioText,
        bonusBox, bonusTitle, bonusDetail,
        malusBox, malusTitle, malusDetail,
        prevBtn, nextBtn, dots, selectBtn, selectBtnText
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
      this.add.rectangle(W / 2, H / 2, W - 34, H - 34, 0x120923, 1).setStrokeStyle(3, 0xff3e91);
      this.add.text(W / 2, 48, `THE FINAL PITCH  •  ${this.stage}/5`, { fontFamily: 'monospace', fontSize: '15px', color: '#ffea00', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
      this.add.text(W / 2, 100, story.title, { fontFamily: 'monospace', fontSize: '18px', color: '#00f0ff', fontStyle: 'bold', align: 'center', wordWrap: { width: W - 70 }, stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
      this.add.text(W / 2, 148, story.subtitle, { fontFamily: 'monospace', fontSize: '14px', color: '#ff3e91', fontStyle: 'bold' }).setOrigin(0.5);
      this.add.text(W / 2, 280, story.text, { fontFamily: 'sans-serif', fontSize: '14px', color: '#ffffff', align: 'center', lineSpacing: 6, wordWrap: { width: W - 80 } }).setOrigin(0.5);
      const prompt = this.add.text(W / 2, H - 44, 'PREMI A — INIZIA SCENARIO ►', { fontFamily: 'monospace', fontSize: '14px', color: '#00ffcc', fontStyle: 'bold', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5);
      this.tweens.add({ targets: prompt, alpha: 0.35, duration: 520, yoyo: true, repeat: -1 });
      this.started = false;
      this.actionHandler = event => {
        if (event.detail === 'menu') this.scene.start('SelectScene');
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
      this.stageEnded = false;
      this.attackBusy = false;
      this.isGuarding = false;
      this.isPausedState = false;
      this.comboStep = 0;
      this.comboExpires = 0;
      this.specialReadyAt = 0;
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
      PLAYERS.forEach(p => this.load.spritesheet(p.key, ROOT + `player/${p.file}`, { frameWidth: 128, frameHeight: 128 }));
      
      for (let i = 0; i < 4; i++) {
        const enemyNumber = (s - 1) * 4 + i;
        this.load.spritesheet(`enemy_${enemyNumber + 1}`, ROOT + `cattivi/${ENEMY_FILES[enemyNumber]}`, { frameWidth: 128, frameHeight: 128 });
      }
      this.load.spritesheet(`boss_${s}`, ROOT + `boss/${BOSS_FILES[s - 1]}`, { frameWidth: 128, frameHeight: 128 });

      CRATES[s - 1].forEach((name, i) => {
        const base = `oggettidistruttibili/Scenario${s}/${name}_crate_`;
        loadImage(this, `crate_${i}_whole`, base + 'whole.png');
        const separator = s === 1 ? '' : '_';
        loadImage(this, `crate_${i}_broken1`, base + `broken${separator}1.png`);
        loadImage(this, `crate_${i}_broken2`, base + `broken${separator}2.png`);
      });
      PICKUPS[s - 1].forEach((file, i) => loadImage(this, `point_${i}`, `raccoglibili/Scenario${s}/${file}`));
      LIVES[s - 1].forEach((file, i) => loadImage(this, `life_${i}`, `vite/Scenario${s}/${file}`));
    }

    create() {
      this.createFallbacks();
      this.createAnimations();
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
      ensureImage(this, `bg_${this.stage}`, 1920, 640, 0x24123c);
      ensureImage(this, `floor_${this.stage}`, 3200, 640, 0x321b47);
      ensureImage(this, 'gameover', 280, 100, 0xc71950);
      ensureImage(this, 'go', 150, 70, 0x25d987);
      ensureImage(this, 'lock_warning', 240, 80, 0xff8b19);
      ensureImage(this, 'overhead_player', 38, 24, 0xffffff);
      ensureImage(this, 'stageclear', 285, 100, 0x25b7ff);
      
      PLAYERS.forEach(p => ensureActorSheet(this, p.key, 18, p.color));
      
      const startEnemy = (this.stage - 1) * 4 + 1;
      for (let i = startEnemy; i < startEnemy + 4; i++) {
        ensureActorSheet(this, `enemy_${i}`, 12, 0xd13757 + i * 1200);
      }
      ensureActorSheet(this, `boss_${this.stage}`, 18, 0x8c2cff + this.stage * 1600);

      CRATES[this.stage - 1].forEach((_, i) => {
        ensureImage(this, `crate_${i}_whole`, 66, 66, 0xa3612c);
        ensureImage(this, `crate_${i}_broken1`, 66, 66, 0x81512e);
        ensureImage(this, `crate_${i}_broken2`, 66, 66, 0x4f3429);
      });
      [0x56f7ff, 0xffdb42, 0xff54b3].forEach((color, i) => ensureImage(this, `point_${i}`, 40, 40, color));
      [0x5cff72, 0x39ffbc].forEach((color, i) => ensureImage(this, `life_${i}`, 40, 40, color));
    }

    createAnimations() {
      PLAYERS.forEach(p => addAnimations(this, p.key));
      const startEnemy = (this.stage - 1) * 4 + 1;
      for (let i = startEnemy; i < startEnemy + 4; i++) {
        addAnimations(this, `enemy_${i}`, ENEMY_FRAME_MAP);
      }
      addAnimations(this, `boss_${this.stage}`);
    }

    createWorld() {
      this.farBg = this.add.tileSprite(0, WORLD_RENDER_TOP, WORLD_W, H, `bg_${this.stage}`)
        .setOrigin(0)
        .setTileScale(BACKGROUND_SCALE, BACKGROUND_SCALE)
        .setScrollFactor(0.4)
        .setDepth(-20);
      this.floor = this.add.image(0, WORLD_RENDER_TOP, `floor_${this.stage}`).setOrigin(0).setScale(BACKGROUND_SCALE).setDepth(-10);
      ARENA_X.forEach((x, i) => {
        this.add.text(x, MOVEMENT_TOP + 12, i === 4 ? 'BOSS' : `LOCK ${i + 1}`, {
          fontFamily: 'monospace', fontSize: '11px', color: '#ffffff66'
        }).setOrigin(0.5).setDepth(MOVEMENT_TOP + 12);
      });
    }

    createPlayer() {
      const startY = Phaser.Math.Clamp(worldY(520), MOVEMENT_TOP, MOVEMENT_BOTTOM);
      this.player = this.physics.add.sprite(100, startY, this.character, 0)
        .setOrigin(0.5, 1)
        .setScale(getPlayerScale(this.character))
        .setVisible(true)
        .setActive(true)
        .setAlpha(1);
      this.player.setDepth(this.player.y);
      this.player.clearTint();
      // Hitbox ingrandita per facilitare l'overlap con gli oggetti
      this.player.body.setSize(50, 32).setOffset(39, 96).setAllowGravity(false);
      this.player.body.enable = true;
      this.player.body.reset(100, startY);
      this.player.speed = 150 * (this.playerStats.speedMult || 1.0);
      this.player.facing = 1;
      this.player.invulnerableUntil = 0;
      this.bindActorAnimationEvents(this.player, this.character, 17, true);
      this.player.play(`${this.character}_idle`);
    }

    createObjects() {
      this.enemies = this.physics.add.group();
      this.crates = this.physics.add.group({ immovable: true });
      this.pickupGroup = this.physics.add.group({ allowGravity: false });
      const positions = [350, 780, 1320, 1900, 2470, 3050].map(x => x * BACKGROUND_SCALE);
      positions.forEach((x, i) => {
        const variant = i % 2;
        const crate = this.crates.create(x, randomMovementY(), `crate_${variant}_whole`).setOrigin(0.5, 1).setDisplaySize(54 * OBJECT_SCALE, 54 * OBJECT_SCALE);
        crate.hp = 3; crate.variant = variant;
        crate.body.setSize(crate.width * 0.7, crate.height * 0.25).setOffset(crate.width * 0.15, crate.height * 0.75);
      });
      this.physics.add.collider(this.player, this.crates);
      
      // Overlap migliorato: funzione di controllo personalizzata con tolleranza verticale/orizzontale amplificata
      this.physics.add.overlap(this.player, this.pickupGroup, this.collectPickup, (player, pickup) => {
        const dx = Math.abs(player.x - pickup.x);
        const dy = Math.abs(player.y - pickup.y);
        return dx < 50 && dy < 45; // Generosa finestra di interazione
      }, this);
    }

    createHud() {
      this.hud = this.add.container(0, 0).setScrollFactor(0).setDepth(10000);
      this.hud.add(this.add.rectangle(W / 2, WORLD_VIEW_TOP / 2, W, WORLD_VIEW_TOP, 0x020105, 1));
      this.hpBack = this.add.rectangle(17, 20, 152, 14, 0x280c20).setOrigin(0, 0.5);
      this.hpBar = this.add.rectangle(19, 20, 148, 10, 0xff336c).setOrigin(0, 0.5);
      this.scoreText = this.add.text(W - 110, 13, '', { fontFamily: 'monospace', fontSize: '12px', color: '#ffeb4d', fontStyle: 'bold' }).setOrigin(1, 0);
      this.stageText = this.add.text(18, 35, `STAGE ${this.stage}/5`, { fontFamily: 'monospace', fontSize: '11px', color: '#65f6ff' });
      this.specialBack = this.add.rectangle(W - 110, 41, 90, 7, 0x241638).setOrigin(1, 0.5);
      this.specialBar = this.add.rectangle(W - 200, 41, 88, 5, 0x33f5c0).setOrigin(0, 0.5);
      
      this.pauseBtn = this.add.text(W - 10, 8, '⏸ PAUSA', { 
        fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', backgroundColor: '#5c1d8d', padding: { x: 10, y: 7 } 
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(20000).setInteractive({ useHandCursor: true });
      
      this.pauseBtn.on('pointerdown', () => {
        this.togglePause();
      });

      this.hud.add([this.hpBack, this.hpBar, this.scoreText, this.stageText, this.specialBack, this.specialBar]);
      this.refreshHud();
    }

    bindControls() {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = this.input.keyboard.addKeys('W,A,S,D,J,K,L,P');
      this.input.keyboard.on('keydown-J', () => this.normalAttack());
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
      const sub = this.add.text(W / 2, H / 2 + 25, 'TOCCA PER RIPRENDERE ►', { fontFamily: 'monospace', fontSize: '14px', color: '#00ffcc', fontStyle: 'bold' }).setOrigin(0.5);
      
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
      if (action === 'attack') this.normalAttack();
      else if (action === 'special') this.specialAttack();
      else if (action === 'guard-toggle') this.toggleGuard();
      else if (action === 'pause') this.pauseGame();
      else if (action === 'resume') this.resumeGame();
      else if (action === 'menu') { this.stopGuard(); this.scene.start('SelectScene'); }
      else if (action === 'story' || action === 'rules') {
        this.registry.set('pixelPunchMenuPage', action);
        this.scene.start('SelectScene');
      }
    }

    update(time) {
      if (this.stageEnded || this.isPausedState) return;
      this.updatePlayerMovement();
      this.updateArena();
      this.updateEnemies(time);
      this.updateDepths();
      this.updateCooldown(time);
      this.refreshHud();
      this.farBg.tilePositionX = this.cameras.main.scrollX * 0.4;
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
      this.player.setVelocity(v.x * this.player.speed, v.y * this.player.speed * 0.72);
      this.player.y = Phaser.Math.Clamp(this.player.y, MOVEMENT_TOP, MOVEMENT_BOTTOM);
      if (this.arenaLocked) {
        const center = ARENA_X[this.arenaIndex];
        this.player.x = Phaser.Math.Clamp(this.player.x, center - 160, center + 160);
      }
      if (v.x !== 0) { this.player.facing = Math.sign(v.x); this.player.setFlipX(v.x < 0); }
      const desired = v.lengthSq() ? `${this.character}_walk` : `${this.character}_idle`;
      if (this.player.anims.currentAnim?.key !== desired) this.player.play(desired, true);
    }

    updateArena() {
      if (this.arenaLocked || this.arenaIndex >= ARENA_X.length) return;
      if (this.player.x >= ARENA_X[this.arenaIndex] - 105) this.lockArena();
    }

    lockArena() {
      this.arenaLocked = true;
      this.arenaQuota = Math.min(3 + (this.stage - 1) * 2, 10);
      this.arenaSpawned = 0;
      this.arenaDefeated = 0;
      this.bossSpawned = false;
      const center = ARENA_X[this.arenaIndex];
      this.cameras.main.stopFollow();
      this.cameras.main.pan(Phaser.Math.Clamp(center, W / 2, WORLD_W - W / 2), H / 2, 300, 'Sine.easeInOut');
      this.showBanner('lock_warning', 720);
      this.scheduleArenaSpawn(1500);
    }

    scheduleArenaSpawn(delay = Phaser.Math.Between(1500, 2500)) {
      this.time.delayedCall(delay, () => {
        if (!this.arenaLocked || this.stageEnded || this.arenaSpawned >= this.arenaQuota) return;
        const activeMinions = this.enemies.getChildren().filter(enemy => enemy.active && !enemy.isBoss).length;
        const maxSimultaneous = Math.min(1 + Math.floor((this.stage - 1) / 2) + 1, 3);
        if (activeMinions >= maxSimultaneous) {
          this.scheduleArenaSpawn(700);
          return;
        }
        this.spawnEnemy(this.arenaSpawned % 4);
        this.arenaSpawned++;
        if (this.arenaSpawned < this.arenaQuota) this.scheduleArenaSpawn();
      });
    }

    getSpawnLaneY() {
      const occupied = this.enemies.getChildren().filter(enemy => enemy.active).map(enemy => enemy.y);
      for (let attempt = 0; attempt < 14; attempt++) {
        const y = randomMovementY();
        if (occupied.every(otherY => Math.abs(otherY - y) >= 44)) return y;
      }
      const lanes = [0.16, 0.5, 0.84].map(t => Phaser.Math.Linear(MOVEMENT_TOP, MOVEMENT_BOTTOM, t));
      return lanes.sort((a, b) => Math.min(...occupied.map(y => Math.abs(a - y)), Infinity) - Math.min(...occupied.map(y => Math.abs(b - y)), Infinity)).pop();
    }

    spawnEnemy(variant) {
      const number = (this.stage - 1) * 4 + variant + 1;
      const useOppositeSide = Math.random() < 0.78;
      const side = useOppositeSide ? (this.lastSpawnSide === 'left' ? 'right' : 'left') : (Math.random() < 0.5 ? 'left' : 'right');
      this.lastSpawnSide = side;
      const cameraLeft = this.cameras.main.scrollX;
      const spawnX = side === 'left' ? cameraLeft - 60 : cameraLeft + W + 60;
      
      const enemy = this.physics.add.sprite(spawnX, this.getSpawnLaneY(), `enemy_${number}`, 0).setOrigin(0.5, 1).setScale(ENEMY_SCALE).setVisible(true);
      enemy.setDepth(enemy.y);
      
      enemy.hp = 30 + this.stage * 10; 
      enemy.maxHp = enemy.hp; 
      enemy.damage = 3 + this.stage * 2; 
      enemy.speed = 36 + this.stage * 4; 
      enemy.nextAttack = 0; enemy.isBoss = false; enemy.facing = -1;
      enemy.body.setSize(40, 20).setOffset(44, 108);
      this.bindActorAnimationEvents(enemy, `enemy_${number}`, 11);
      enemy.play(`enemy_${number}_idle`);
      this.enemies.add(enemy);
    }

    spawnBoss(center) {
      const cameraLeft = this.cameras.main.scrollX;
      const side = Math.random() < 0.5 ? 'left' : 'right';
      const spawnX = side === 'left' ? cameraLeft - 70 : cameraLeft + W + 70;

      const boss = this.physics.add.sprite(spawnX, Phaser.Math.Clamp(worldY(535), MOVEMENT_TOP, MOVEMENT_BOTTOM), `boss_${this.stage}`, 0)
        .setOrigin(0.5, 1)
        .setScale(BOSS_SCALE)
        .setVisible(true);
      
      boss.setDepth(boss.y);
      boss.hp = 200 + this.stage * 50; boss.maxHp = boss.hp; boss.damage = 18 + this.stage * 3;
      boss.speed = 35 + this.stage * 2;
      boss.nextAttack = 0; boss.isBoss = true; boss.facing = side === 'left' ? 1 : -1;
      boss.body.setSize(40, 20).setOffset(44, 108);
      this.bindActorAnimationEvents(boss, `boss_${this.stage}`, 17);
      boss.play(`boss_${this.stage}_idle`);
      this.enemies.add(boss);
      
      this.bossBarBack = this.add.rectangle(W / 2, 74, W * 0.72, 12, 0x25091b).setScrollFactor(0).setDepth(10001);
      this.bossBar = this.add.rectangle(W * 0.14, 74, W * 0.72 - 4, 8, 0xc53cff).setOrigin(0, 0.5).setScrollFactor(0).setDepth(10002);
    }

    updateEnemies(time) {
      this.enemies.getChildren().forEach(enemy => {
        if (!enemy.active || enemy.stateLocked) return;
        const dx = this.player.x - enemy.x, dy = this.player.y - enemy.y;
        const sameLane = Math.abs(dy) < 34;
        const distance = Math.abs(dx);
        enemy.facing = dx < 0 ? -1 : 1; enemy.setFlipX(enemy.facing < 0);
        if (sameLane && distance < 116) {
          enemy.setVelocity(0);
          if (time >= enemy.nextAttack) this.enemyAttack(enemy, time);
          else this.playActorAnim(enemy, 'idle', true);
        } else {
          const v = new Phaser.Math.Vector2(dx, dy * 1.25).normalize();
          enemy.setVelocity(v.x * enemy.speed, v.y * enemy.speed * 0.7);
          this.playActorAnim(enemy, 'walk', true);
        }
        if (enemy.isBoss && this.bossBar) this.bossBar.width = (W * 0.72 - 4) * Math.max(0, enemy.hp / enemy.maxHp);
      });
    }

    enemyAttack(enemy, time) {
      enemy.nextAttack = time + (enemy.isBoss ? 2600 : Math.max(1400, 2200 - this.stage * 150));
      enemy.stateLocked = true; enemy.setVelocity(0); this.playActorAnim(enemy, 'atk');
      this.time.delayedCall(enemy.isBoss ? 550 : 220, () => {
        if (!enemy.active || this.stageEnded) return;
        if (Math.abs(this.player.x - enemy.x) < (enemy.isBoss ? 155 : 118) && Math.abs(this.player.y - enemy.y) < 54) this.damagePlayer(enemy.damage);
      });
    }

    normalAttack() {
      if (this.isGuarding) this.stopGuard();
      if (this.attackBusy || this.stageEnded || this.isPausedState) return;
      playSfx('assets/audio/sfx_punch.mp3');
      const now = this.time.now;
      this.comboStep = now <= this.comboExpires ? (this.comboStep % 3) + 1 : 1;
      this.comboExpires = now + 650;
      this.performAttack('atk', 18 + this.comboStep * 4, 125, 55, 250);
    }

    specialAttack() {
      if (this.isGuarding) this.stopGuard();
      const cd = SPECIAL_COOLDOWN * (this.playerStats.cdMult || 1.0);
      if (this.attackBusy || this.stageEnded || this.isPausedState || this.time.now < this.specialReadyAt) return;
      playSfx('assets/audio/sfx_special.mp3');
      this.specialReadyAt = this.time.now + cd;
      this.performAttack('atk_spec', 58, 190, 90, 250);
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
          const inFront = this.player.facing > 0 ? enemy.x >= this.player.x - 8 : enemy.x <= this.player.x + 8;
          if (inFront && Math.abs(enemy.x - hitX) <= reach * 0.65 && Math.abs(enemy.y - this.player.y) <= lane) this.damageEnemy(enemy, totalDmg);
        });
        this.crates.getChildren().slice().forEach(crate => {
          const inFront = this.player.facing > 0 ? crate.x >= this.player.x - 8 : crate.x <= this.player.x + 8;
          if (crate.active && inFront && Math.abs(crate.x - hitX) <= reach * 0.7 && Math.abs(crate.y - this.player.y) <= lane + 10) this.damageCrate(crate, totalDmg);
        });
      });
    }

    damageEnemy(enemy, damage) {
      if (enemy.stateLocked === 'ko') return;
      playSfx('assets/audio/sfx_hit.mp3');
      enemy.hp -= damage; enemy.setVelocity(0); enemy.stateLocked = true;
      if (enemy.hp <= 0) {
        enemy.stateLocked = 'ko'; this.playActorAnim(enemy, 'ko');
        this.score += enemy.isBoss ? 2500 : 250;
        this.time.delayedCall(520, () => {
          if (!enemy.active) return;
          const x = enemy.x, y = enemy.y, wasBoss = enemy.isBoss;
          enemy.destroy();
          if (!wasBoss) this.arenaDefeated++;
          this.maybeDropPickup(x, y, wasBoss);
          this.checkArenaClear();
        });
      } else {
        this.playActorAnim(enemy, 'hurt');
      }
    }

    damageCrate(crate, damage) {
      if (!crate.active || crate.hitLock) return;
      playSfx('assets/audio/sfx_crate.mp3');
      crate.hitLock = true; crate.hp -= damage >= 50 ? 2 : 1;
      if (crate.hp <= 0) {
        const x = crate.x, y = crate.y; crate.setTexture(`crate_${crate.variant}_broken2`);
        this.time.delayedCall(180, () => { crate.destroy(); this.maybeDropPickup(x, y, false, true); });
      } else {
        crate.setTexture(`crate_${crate.variant}_broken1`);
        this.time.delayedCall(140, () => { if (crate.active) crate.hitLock = false; });
      }
    }

    // GESTIONE PICKUP E BORDI SCHERMO MIGLIORATA
    maybeDropPickup(x, y, boss = false, guaranteed = false) {
      if (!boss && !guaranteed && Math.random() > 0.45) return;
      let key, value, kind;
      if (boss || Math.random() < 0.3) {
        const big = boss || Math.random() < 0.35; key = `life_${big ? 1 : 0}`; value = big ? 100 : 25; kind = 'life';
      } else {
        const roll = Math.random(); const tier = roll < 0.55 ? 0 : roll < 0.86 ? 1 : 2;
        key = `point_${tier}`; value = [100, 300, 500][tier]; kind = 'points';
      }

      // Evita che lo spawn finisca oltre i bordi invalicabili mantenendo una distanza minima di sicurezza
      const minCamX = this.cameras.main.scrollX + 60;
      const maxCamX = this.cameras.main.scrollX + W - 60;
      const safeX = Phaser.Math.Clamp(x, Math.max(minCamX, 60), Math.min(maxCamX, WORLD_W - 60));
      const safeY = Phaser.Math.Clamp(y, MOVEMENT_TOP + 20, MOVEMENT_BOTTOM - 20);

      const pickup = this.pickupGroup.create(safeX, safeY, key).setOrigin(0.5, 1).setDisplaySize(38 * OBJECT_SCALE, 38 * OBJECT_SCALE);
      pickup.kind = kind; pickup.value = value;
      
      // Hitbox aumentata (64x54) per garantire una presa immediata ed estesa
      pickup.body.setSize(64, 54).setOffset(-12, -10);
      this.tweens.add({ targets: pickup, y: safeY - 8, duration: 430, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    collectPickup(_player, pickup) {
      if (!pickup.active) return;
      playSfx('assets/audio/sfx_pickup.mp3');
      if (pickup.kind === 'life') {
        const healValue = pickup.value * (this.playerStats.healMult || 1.0);
        this.hp = Math.min(100, this.hp + healValue);
      } else {
        this.score += pickup.value;
      }
      pickup.destroy(); this.refreshHud();
    }

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
      if (this.arenaIndex === ARENA_X.length - 1) {
        if (!this.bossSpawned) {
          this.bossSpawned = true;
          this.showBanner('lock_warning', 500);
          this.time.delayedCall(650, () => {
            if (this.arenaLocked && !this.stageEnded) this.spawnBoss(ARENA_X[this.arenaIndex]);
          });
        } else {
          this.stageClear();
        }
      } else {
        this.showBanner('go', 900);
        this.arenaLocked = false; this.arenaIndex++;
        this.cameras.main.startFollow(this.player, true, 0.12, 0.12, -55, 0);
      }
    }

    showBanner(key, duration) {
      const image = fitImage(this.add.image(W / 2, 142, key), W * 0.7, H * 0.22).setScrollFactor(0).setDepth(12000).setAlpha(0);
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
      playSfx('assets/audio/sfx_gameover.mp3');
      const shade = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.72).setScrollFactor(0).setDepth(12500);
      const over = fitImage(this.add.image(W / 2, 210, 'gameover'), W * 0.7, H * 0.24).setScrollFactor(0).setDepth(12501);
      const retry = this.add.text(W / 2, 370, 'RIPROVA', { fontFamily: 'monospace', fontSize: '20px', color: '#ffffff', backgroundColor: '#c71950', padding: { x: 32, y: 13 } }).setOrigin(0.5).setScrollFactor(0).setDepth(12502).setInteractive({ useHandCursor: true });
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
      this.enemies.getChildren().forEach(e => e.setDepth(Math.round(e.y)));
      this.crates.getChildren().forEach(o => o.setDepth(Math.round(o.y)));
      this.pickupGroup.getChildren().forEach(o => o.setDepth(Math.round(o.y)));
    }

    updateCooldown(time) {
      const cd = SPECIAL_COOLDOWN * (this.playerStats.cdMult || 1.0);
      const progress = Phaser.Math.Clamp(1 - (this.specialReadyAt - time) / cd, 0, 1);
      this.specialBar.width = 88 * progress;
      const fill = document.getElementById('specialFill');
      if (fill) fill.style.height = `${Math.round(progress * 100)}%`;
    }

    refreshHud() {
      if (!this.hpBar) return;
      this.hpBar.width = 148 * (this.hp / 100);
      this.scoreText.setText(`PTS ${this.score}`);
      this.stageText.setText(this.arenaLocked ? `STAGE ${this.stage}/5  LOCK ${Math.min(this.arenaDefeated, this.arenaQuota)}/${this.arenaQuota}` : `STAGE ${this.stage}/5`);
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
    scene: [SelectScene, ScenarioIntroScene, GameScene]
  };

  window.PixelPunchV2 = { config, PLAYERS, ENEMY_FILES, BOSS_FILES };
  window.pixelPunchV2Game = new Phaser.Game(config);
})();
