const AudioManager = (function () {
  const audioMap = {
    'start.html': 'assets/audio/music_hub.mp3',
    'index.html': 'assets/audio/music_hub.mp3',
    'frogger.html': 'assets/audio/music_frogger.mp3',
    'pacman.html': 'assets/audio/music_pacman.mp3',
    'invaders.html': 'assets/audio/music_invaders.mp3',
    'PixelPunch.html': 'assets/audio/music_punch.mp3'
  };

  const VOLUMES = {
    bgm: 0.35,
    sfx: 0.85
  };

  const AudioContext = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null;
  let bgmGainNode = null;
  let sfxGainNode = null;
  let bgmSourceNode = null;
  let bgmBuffer = null;
  let isUnlocked = false;
  const sfxBuffers = {};

  let musicMuted = localStorage.getItem('audio_music_muted') === 'true';
  let sfxMuted = localStorage.getItem('audio_sfx_muted') === 'true';

  function initContext() {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    if (!bgmGainNode && audioCtx) {
      bgmGainNode = audioCtx.createGain();
      bgmGainNode.gain.value = musicMuted ? 0 : VOLUMES.bgm;
      bgmGainNode.connect(audioCtx.destination);
    }
    if (!sfxGainNode && audioCtx) {
      sfxGainNode = audioCtx.createGain();
      sfxGainNode.gain.value = sfxMuted ? 0 : VOLUMES.sfx;
      sfxGainNode.connect(audioCtx.destination);
    }
  }

  // Sblocco specifico per iOS / iPhone
  function unlockiOSAudio() {
    initContext();

    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    // Riproduzione di un micro-buffer silenzioso per attivare il motore audio iOS
    if (audioCtx && !isUnlocked) {
      try {
        const buffer = audioCtx.createBuffer(1, 1, 22050);
        const source = audioCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtx.destination);
        source.start(0);
        isUnlocked = true;
      } catch (e) {}
    }

    // Se la musica era già stata caricata, la avvia ora che l'audio è sbloccato
    if (bgmBuffer && !bgmSourceNode) {
      playBGM();
    }

    // Rimuove i listener di sblocco una volta attivato
    if (isUnlocked) {
      ['touchstart', 'touchend', 'click', 'pointerdown', 'keydown'].forEach(evt => {
        document.removeEventListener(evt, unlockiOSAudio, true);
      });
    }
  }

  async function loadBGM() {
    const path = window.location.pathname;
    const page = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    const bgmFile = audioMap[page];

    if (!bgmFile) return;

    try {
      const res = await fetch(bgmFile);
      const data = await res.arrayBuffer();
      
      initContext();
      bgmBuffer = await audioCtx.decodeAudioData(data);
      
      if (isUnlocked || (audioCtx && audioCtx.state === 'running')) {
        playBGM();
      }
    } catch (e) {
      console.warn("Errore caricamento BGM:", e);
    }
  }

  function playBGM() {
    if (!audioCtx || !bgmBuffer || musicMuted) return;
    stopBGM();

    try {
      bgmSourceNode = audioCtx.createBufferSource();
      bgmSourceNode.buffer = bgmBuffer;
      bgmSourceNode.loop = true;
      bgmSourceNode.connect(bgmGainNode);

      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      bgmSourceNode.start(0);
    } catch (e) {
      console.warn("Riproduzione BGM bloccata:", e);
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
    initContext();

    try {
      if (!sfxBuffers[sfxFilePath]) {
        const res = await fetch(sfxFilePath);
        const data = await res.arrayBuffer();
        sfxBuffers[sfxFilePath] = await audioCtx.decodeAudioData(data);
      }

      const sfxSource = audioCtx.createBufferSource();
      sfxSource.buffer = sfxBuffers[sfxFilePath];
      sfxSource.connect(sfxGainNode);

      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      sfxSource.start(0);
    } catch (e) {
      console.warn("Errore riproduzione SFX:", e);
    }
  }

  function toggleMusic(forceState) {
    musicMuted = forceState !== undefined ? forceState : !musicMuted;
    localStorage.setItem('audio_music_muted', musicMuted);
    if (bgmGainNode && audioCtx) {
      bgmGainNode.gain.setValueAtTime(musicMuted ? 0 : VOLUMES.bgm, audioCtx.currentTime);
    }
    if (!musicMuted && !bgmSourceNode && bgmBuffer) {
      playBGM();
    }
    return musicMuted;
  }

  function toggleSFX(forceState) {
    sfxMuted = forceState !== undefined ? forceState : !sfxMuted;
    localStorage.setItem('audio_sfx_muted', sfxMuted);
    if (sfxGainNode && audioCtx) {
      sfxGainNode.gain.setValueAtTime(sfxMuted ? 0 : VOLUMES.sfx, audioCtx.currentTime);
    }
    return sfxMuted;
  }

  // Registrazione listener sblocco al caricamento
  window.addEventListener('DOMContentLoaded', () => {
    loadBGM();

    // Listener multipli per garantire lo sblocco su iOS Safari/PWA al primissimo tocco
    ['touchstart', 'touchend', 'click', 'pointerdown', 'keydown'].forEach(evt => {
      document.addEventListener(evt, unlockiOSAudio, { capture: true, passive: true });
    });
  });

  const stopAll = () => {
    stopBGM();
    if (audioCtx && audioCtx.state !== 'closed') {
      audioCtx.suspend();
    }
  };

  window.addEventListener('pagehide', stopAll);
  window.addEventListener('beforeunload', stopAll);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopAll();
    } else if (audioCtx && audioCtx.state === 'suspended' && isUnlocked) {
      audioCtx.resume();
      if (!musicMuted && bgmBuffer && !bgmSourceNode) playBGM();
    }
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