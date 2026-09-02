(() => {
  'use strict';

  const STYLE_ID = 'arcade-portrait-lock-style';
  const OVERLAY_ID = 'arcade-portrait-lock';

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${OVERLAY_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: #060212f7;
        color: #ffffff;
        font-family: "Courier New", monospace;
        text-align: center;
        touch-action: none;
      }
      #${OVERLAY_ID} > div {
        width: min(520px, 92vw);
        padding: 24px;
        border: 3px solid #ff3e91;
        border-radius: 16px;
        background: #120722;
        box-shadow: 0 0 28px #ff3e9188;
        color: #ffea00;
        font-size: clamp(18px, 4vw, 28px);
        font-weight: 900;
        line-height: 1.35;
        text-shadow: 2px 2px 0 #7b176f;
      }
      @media (orientation: landscape) {
        #${OVERLAY_ID} { display: flex !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function installOverlay() {
    if (document.getElementById(OVERLAY_ID)) return;
    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.setAttribute('role', 'alert');
    overlay.innerHTML = '<div>RUOTA IL DISPOSITIVO IN VERTICALE PER CONTINUARE 📱</div>';
    document.body.appendChild(overlay);
  }

  function requestPortraitLock() {
    if (!screen.orientation?.lock) return;
    screen.orientation.lock('portrait').catch(() => {});
  }

  installStyle();
  if (document.body) installOverlay();
  else document.addEventListener('DOMContentLoaded', installOverlay, { once: true });
  document.addEventListener('pointerdown', requestPortraitLock, { once: true, passive: true });
})();
