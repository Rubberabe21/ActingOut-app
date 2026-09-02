const ArcadeGameShell = (() => {
  function renderAudioOptions(musicButton, sfxButton) {
    const musicMuted = window.AudioManager
      ? AudioManager.isMusicMuted()
      : false;
    const sfxMuted = window.AudioManager
      ? AudioManager.isSFXMuted()
      : false;

    musicButton.className = `toggle-btn ${!musicMuted ? 'active' : ''}`;
    musicButton.innerText = !musicMuted ? 'ON 🎵' : 'OFF 🔇';

    sfxButton.className = `toggle-btn ${!sfxMuted ? 'active' : ''}`;
    sfxButton.innerText = !sfxMuted ? 'ON 🔊' : 'OFF 🔇';
  }

  function bindAudioOptions(musicButton, sfxButton) {
    const render = () => renderAudioOptions(musicButton, sfxButton);

    musicButton.onclick = () => {
      if (window.AudioManager) AudioManager.toggleMusic();
      render();
    };

    sfxButton.onclick = () => {
      if (window.AudioManager) AudioManager.toggleSFX();
      render();
    };

    render();
    return render;
  }

  function showModal(modal) {
    modal.style.display = 'flex';
  }

  function hideModal(modal) {
    modal.style.display = 'none';
  }

  function bindModalTransition(button, fromModal, toModal) {
    button.onclick = () => {
      hideModal(fromModal);
      showModal(toModal);
    };
  }

  function isSfxAllowed() {
    return window.AudioManager ? !AudioManager.isSFXMuted() : true;
  }

  function navigateToHub() {
    window.location.href = '../../hub/index.html';
  }

  function showEndActions({ onRetry, onExit } = {}) {
    const previousOverlay = document.getElementById('arcade-end-actions');
    if (previousOverlay) {
      previousOverlay._cleanup?.();
      previousOverlay.remove();
    }

    const host = document.getElementById('canvas-container') || document.body;
    const overlay = document.createElement('div');
    overlay.id = 'arcade-end-actions';
    overlay.innerHTML = `<div class="arcade-end-card"><div class="arcade-end-tabs"><button data-action="retry">↻ RIPROVA</button><button data-action="exit">↗ ESCI</button></div></div>`;
    const style = document.createElement('style');
    style.textContent = `#arcade-end-actions{position:absolute;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;box-sizing:border-box;padding:18px;pointer-events:auto;touch-action:none}.arcade-end-card{width:min(88%,350px);transform:translateY(118px);pointer-events:auto}.arcade-end-tabs{display:grid;grid-template-columns:1fr 1fr;gap:12px}.arcade-end-tabs button{min-height:54px;border:3px solid #fff;border-radius:2px;font:900 15px 'Courier New';letter-spacing:.5px;box-shadow:5px 5px 0 #000,0 0 16px currentColor;touch-action:manipulation}.arcade-end-tabs button:active{transform:translate(3px,3px);box-shadow:2px 2px 0 #000}.arcade-end-tabs button:first-child{background:#ff0055;color:#fff}.arcade-end-tabs button:last-child{background:#09182a;color:#00f3ff;border-color:#00f3ff}`;
    overlay.append(style);
    host.append(overlay);

    const lockedElements = [...document.querySelectorAll('.top-header, .control-deck, canvas, #pixel-punch-v2')]
      .filter(element => !overlay.contains(element))
      .map(element => ({ element, inert: element.inert, pointerEvents: element.style.pointerEvents }));
    lockedElements.forEach(({ element }) => {
      element.inert = true;
      element.style.pointerEvents = 'none';
    });

    const blockKeyboard = event => {
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    window.addEventListener('keydown', blockKeyboard, true);
    window.addEventListener('keyup', blockKeyboard, true);

    const cleanup = () => {
      window.removeEventListener('keydown', blockKeyboard, true);
      window.removeEventListener('keyup', blockKeyboard, true);
      lockedElements.forEach(({ element, inert, pointerEvents }) => {
        element.inert = inert;
        element.style.pointerEvents = pointerEvents;
      });
    };
    overlay._cleanup = cleanup;

    overlay.querySelector('[data-action="retry"]').onclick = () => {
      cleanup();
      overlay.remove();
      onRetry?.();
    };
    overlay.querySelector('[data-action="exit"]').onclick = async event => { event.currentTarget.disabled = true; if (onExit) await onExit(); else navigateToHub(); };
  }

  return {
    bindAudioOptions,
    bindModalTransition,
    hideModal,
    isSfxAllowed,
    navigateToHub,
    showEndActions,
    showModal
  };
})();

window.ArcadeGameShell = ArcadeGameShell;
