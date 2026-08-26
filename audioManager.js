const AudioManager = (function () {
  const audioMap = {
    'start.html': 'assets/audio/music_hub.mp3',
    'index.html': 'assets/audio/music_hub.mp3',
    'frogger.html': 'assets/audio/music_frogger.mp3',
    'pacman.html': 'assets/audio/music_pacman.mp3',
    'invaders.html': 'assets/audio/music_invaders.mp3',
    'PixelPunch.html': 'assets/audio/music_punch.mp3'
  };

  const VOLUMES = { bgm: 0.35, sfx: 0.85 };

  let audioCtx = null;
  let bgmGainNode = null;
  let sfxGainNode = null;
  let bgmSourceNode = null;
  let bgmBuffer = null;
  let isUnlocked = false;
  const sfxBuffers = {};

  let musicMuted = localStorage.getItem('audio_music_muted') === 'true';
  let sfxMuted = localStorage.getItem('audio_sfx_muted') === 'true';

  // Crea l'UNICO motore audio per tutto
  function getContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && !bgmGainNode) {
      bgmGainNode = audioCtx.createGain();
      bgmGainNode.gain.value = musicMuted ? 0 : VOLUMES.bgm;
      bgmGainNode.connect(audioCtx.destination);
    }
    if (audioCtx && !sfxGainNode) {
      sfxGainNode = audioCtx.createGain();
      sfxGainNode.gain.value = sfxMuted ? 0 : VOLUMES.sfx;
      sfxGainNode.connect(audioCtx.destination);
    }
    return audioCtx;
  }

  // SBLOCCO AGGRESSIVO (Forzatura Motore Audio iOS)
  async function forceUnlock() {
    if (isUnlocked) return;
    const ctx = getContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch (e) {}
    }

    if (ctx.state === 'running') {
      try {
        // Buffer silenzioso che inganna l'iPhone e accende lo speaker
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        isUnlocked = true;
      } catch (e) {}

      // Se il file audio è già scaricato, fallo partire ORA
      if (bgmBuffer && !bgmSourceNode && !musicMuted) {
        playBGM();
      }
    }
  }

  // Intercetta QUALUNQUE azione sullo schermo
  const unlockEvents = ['touchstart', 'touchend', 'pointerdown', 'pointerup', 'click', 'scroll', 'keydown'];
  unlockEvents.forEach(evt => {
    window.addEventListener(evt, () => {
      if (!isUnlocked || (audioCtx && audioCtx.state === 'suspended')) forceUnlock();
    }, { capture: true, passive: true });
  });

  // AUTO-PINGER: Tenta di forzare l'avvio ogni mezzo secondo in background
  setInterval(() => {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  }, 500);

  async function loadBGM() {
    const path = window.location.pathname;
    const page = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    const bgmFile = audioMap[page];

    if (!bgmFile) return;

    try {
      const res = await fetch(bgmFile);
      const data = await res.arrayBuffer();
      const ctx = getContext();
      bgmBuffer = await ctx.decodeAudioData(data);

      // Tenta di avviare immediatamente non appena finisce il download
      if ((isUnlocked || ctx.state === 'running') && !musicMuted) {
        playBGM();
      }
    } catch (e) {
      console.warn("Errore caricamento BGM:", e);
    }
  }

  function playBGM() {
    const ctx = getContext();
    if (!ctx || !bgmBuffer || musicMuted) return;
    
    // Evita sovrapposizioni
    if (bgmSourceNode) return; 

    try {
      bgmSourceNode = ctx.createBufferSource();
      bgmSourceNode.buffer = bgmBuffer;
      bgmSourceNode.loop = true;
      bgmSourceNode.connect(bgmGainNode);

      // FORZA il resume prima di fare start
      if (ctx.state === 'suspended') ctx.resume();
      bgmSourceNode.start(0);
    } catch (e) {
      bgmSourceNode = null;
    }
  }

  function stopBGM() {
    if (bgmSourceNode) {
      try {
        bgmSourceNode.stop();
        bgmSourceNode.disconnect();
      } catch (e) {}
      bgmSourceNode = null;
    }
  }

  async function playSFX(sfxFilePath) {
    if (sfxMuted) return;
    const ctx = getContext();
    if (!ctx) return;

    try {
      if (!sfxBuffers[sfxFilePath]) {
        const res = await fetch(sfxFilePath);
        const data = await res.arrayBuffer();
        sfxBuffers[sfxFilePath] = await ctx.decodeAudioData(data);
      }

      const sfxSource = ctx.createBufferSource();
      sfxSource.buffer = sfxBuffers[sfxFilePath];
      sfxSource.connect(sfxGainNode);

      if (ctx.state === 'suspended') ctx.resume();
      sfxSource.start(0);
    } catch (e) {}
  }

  // Caricamento immediato al caricamento del DOM
  window.addEventListener('DOMContentLoaded', loadBGM);

  const stopAll = () => {
    stopBGM();
    if (audioCtx && audioCtx.state !== 'closed') audioCtx.suspend();
  };

  window.addEventListener('pagehide', stopAll);
  window.addEventListener('beforeunload', stopAll);
  
  // Riavvia automaticamente la musica se l'app viene messa in background e poi riaperta
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAll();
    } else {
      if (audioCtx && isUnlocked) {
        audioCtx.resume();
        if (!musicMuted && bgmBuffer && !bgmSourceNode) playBGM();
      }
    }
  });

  return {
    getContext,
    forceUnlock,
    playSFX,
    getSfxDestination: () => { getContext(); return sfxGainNode; },
    toggleMusic: (force) => {
      musicMuted = force !== undefined ? force : !musicMuted;
      localStorage.setItem('audio_music_muted', musicMuted);
      if (bgmGainNode && audioCtx) {
        bgmGainNode.gain.setValueAtTime(musicMuted ? 0 : VOLUMES.bgm, audioCtx.currentTime);
      }
      if (!musicMuted && !bgmSourceNode && bgmBuffer) playBGM();
      if (musicMuted && bgmSourceNode) stopBGM();
      return musicMuted;
    },
    toggleSFX: (force) => {
      sfxMuted = force !== undefined ? force : !sfxMuted;
      localStorage.setItem('audio_sfx_muted', sfxMuted);
      if (sfxGainNode && audioCtx) {
        sfxGainNode.gain.setValueAtTime(sfxMuted ? 0 : VOLUMES.sfx, audioCtx.currentTime);
      }
      return sfxMuted;
    },
    isMusicMuted: () => musicMuted,
    isSFXMuted: () => sfxMuted
  };
})();

window.AudioManager = AudioManager;