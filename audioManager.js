const AudioManager = (function () {
  const audioMap = {
    'start.html': 'assets/audio/music_hub.mp3',
    'index.html': 'assets/audio/music_hub.mp3',
    'frogger.html': 'assets/audio/music_frogger.mp3',
    'pacman.html': 'assets/audio/music_pacman.mp3',
    'invaders.html': 'assets/audio/music_invaders.mp3',
    'PixelPunch.html': 'assets/audio/music_punch.mp3'
  };

  // Impostazioni Volumi (SFX più alto della musica)
  const VOLUMES = {
    bgm: 0.35, // Volume musica di sottofondo (35%)
    sfx: 0.85  // Volume effetti sonori (85%)
  };

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  let bgmGainNode = null;
  let sfxGainNode = null;
  let bgmSourceNode = null;
  let bgmBuffer = null;
  const sfxBuffers = {};

  // Recupero stato Mute salvato (default: attivo)
  let musicMuted = localStorage.getItem('audio_music_muted') === 'true';
  let sfxMuted = localStorage.getItem('audio_sfx_muted') === 'true';

  function initContext() {
    if (!audioCtx) {
      audioCtx = new AudioContext();

      bgmGainNode = audioCtx.createGain();
      bgmGainNode.gain.value = musicMuted ? 0 : VOLUMES.bgm;
      bgmGainNode.connect(audioCtx.destination);

      sfxGainNode = audioCtx.createGain();
      sfxGainNode.gain.value = sfxMuted ? 0 : VOLUMES.sfx;
      sfxGainNode.connect(audioCtx.destination);
    }
  }

  async function loadBGM() {
    const path = window.location.pathname;
    const page = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    const bgmFile = audioMap[page];

    if (!bgmFile) return;
    initContext();

    try {
      const res = await fetch(bgmFile);
      const data = await res.arrayBuffer();
      bgmBuffer = await audioCtx.decodeAudioData(data);
      playBGM();
    } catch (e) {
      console.warn("Autoplay BGM limitato dal browser:", e);
    }
  }

  function playBGM() {
    if (!audioCtx || !bgmBuffer) return;
    stopBGM();

    bgmSourceNode = audioCtx.createBufferSource();
    bgmSourceNode.buffer = bgmBuffer;
    bgmSourceNode.loop = true;
    bgmSourceNode.connect(bgmGainNode);

    if (audioCtx.state === 'suspended') audioCtx.resume();
    bgmSourceNode.start(0);
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

  // Caricamento e riproduzione dinamica degli effetti sonori
  async function playSFX(sfxFilePath) {
    initContext();
    if (sfxMuted) return;

    try {
      if (!sfxBuffers[sfxFilePath]) {
        const res = await fetch(sfxFilePath);
        const data = await res.arrayBuffer();
        sfxBuffers[sfxFilePath] = await audioCtx.decodeAudioData(data);
      }

      const sfxSource = audioCtx.createBufferSource();
      sfxSource.buffer = sfxBuffers[sfxFilePath];
      sfxSource.connect(sfxGainNode);

      if (audioCtx.state === 'suspended') audioCtx.resume();
      sfxSource.start(0);
    } catch (e) {
      console.warn("Errore durante la riproduzione dello SFX:", e);
    }
  }

  // Gestione Mute Musica
  function toggleMusic(forceState) {
    musicMuted = forceState !== undefined ? forceState : !musicMuted;
    localStorage.setItem('audio_music_muted', musicMuted);
    if (bgmGainNode && audioCtx) {
      bgmGainNode.gain.setValueAtTime(musicMuted ? 0 : VOLUMES.bgm, audioCtx.currentTime);
    }
    return musicMuted;
  }

  // Gestione Mute Effetti Sonori
  function toggleSFX(forceState) {
    sfxMuted = forceState !== undefined ? forceState : !sfxMuted;
    localStorage.setItem('audio_sfx_muted', sfxMuted);
    if (sfxGainNode && audioCtx) {
      sfxGainNode.gain.setValueAtTime(sfxMuted ? 0 : VOLUMES.sfx, audioCtx.currentTime);
    }
    return sfxMuted;
  }

  // Inizializzazione automatica
  window.addEventListener('DOMContentLoaded', () => {
    loadBGM();

    const unlock = () => {
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);
  });

  // Stop immediato all'uscita dalla pagina o cambio scheda
  const stopAll = () => {
    stopBGM();
    if (audioCtx && audioCtx.state !== 'closed') audioCtx.suspend();
  };

  window.addEventListener('pagehide', stopAll);
  window.addEventListener('beforeunload', stopAll);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAll();
    else if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  });

  return {
    playSFX,
    toggleMusic,
    toggleSFX,
    isMusicMuted: () => musicMuted,
    isSFXMuted: () => sfxMuted
  };
})();

window.AudioManager = AudioManager;