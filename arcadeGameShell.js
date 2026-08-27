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
    window.location.href = 'index.html';
  }

  return {
    bindAudioOptions,
    bindModalTransition,
    hideModal,
    isSfxAllowed,
    navigateToHub,
    showModal
  };
})();

window.ArcadeGameShell = ArcadeGameShell;
