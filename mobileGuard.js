(() => {
  'use strict';

  const landscapeQuery = window.matchMedia('(orientation: landscape)');
  const pausedPhaserGames = new Set();
  let locked = false;

  function ensureOverlay() {
    let overlay = document.getElementById('portrait-lock-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'portrait-lock-overlay';
    overlay.setAttribute('role', 'alert');
    overlay.setAttribute('aria-live', 'assertive');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
      <div class="portrait-lock-card">
        <span class="portrait-lock-icon" aria-hidden="true">📱</span>
        <div class="portrait-lock-title">RUOTA IL DISPOSITIVO IN VERTICALE PER GIOCARE 📱</div>
        <div class="portrait-lock-subtitle">MODALITÀ PORTRAIT RICHIESTA</div>
      </div>`;
    document.body.appendChild(overlay);
    return overlay;
  }

  function knownPhaserGames() {
    return [window.pixelPunchV2Game, window.hubGame].filter(Boolean);
  }

  function pausePhaserGame(game) {
    if (!game?.loop?.sleep || pausedPhaserGames.has(game)) return;
    game.loop.sleep();
    pausedPhaserGames.add(game);
  }

  function resumeGuardPausedGames() {
    pausedPhaserGames.forEach(game => {
      if (game?.loop?.wake) game.loop.wake();
    });
    pausedPhaserGames.clear();
  }

  function syncOrientation() {
    const overlay = ensureOverlay();
    locked = landscapeQuery.matches || window.innerWidth > window.innerHeight;
    document.documentElement.classList.toggle('orientation-locked', locked);
    document.body.classList.toggle('orientation-locked', locked);
    overlay.setAttribute('aria-hidden', String(!locked));

    if (locked) knownPhaserGames().forEach(pausePhaserGame);
    else resumeGuardPausedGames();

    window.dispatchEvent(new CustomEvent('arcade-orientation-lock', {
      detail: { locked }
    }));
  }

  function registerPhaserGame(game) {
    if (locked) pausePhaserGame(game);
  }

  function requestNativePortraitLock() {
    if (!screen.orientation?.lock) return;
    screen.orientation.lock('portrait').catch(() => {});
  }

  function preventGameScroll(event) {
    if (!event.cancelable) return;
    if (event.target.closest('canvas, .control-deck, .joystick-zone, .action-buttons')) {
      event.preventDefault();
    }
  }

  window.MobilePortraitGuard = {
    isLocked: () => locked,
    registerPhaserGame,
    sync: syncOrientation
  };

  document.addEventListener('DOMContentLoaded', syncOrientation, { once: true });
  document.addEventListener('pointerdown', requestNativePortraitLock, { once: true, passive: true });
  document.addEventListener('touchmove', preventGameScroll, { passive: false });
  window.addEventListener('orientationchange', syncOrientation);
  window.addEventListener('resize', syncOrientation, { passive: true });
  landscapeQuery.addEventListener?.('change', syncOrientation);
})();
