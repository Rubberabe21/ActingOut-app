import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameEngine } from '../services/GameEngine';
import { GameState } from '../types';
import { COLOR_PALETTE } from '../constants';
import { spriteManager } from '../services/SpriteManager';
import { effectsManager } from '../services/EffectsManager';
import { particleSystem } from '../services/ParticleSystem';
import { audioManager } from '../services/AudioManager';
import VirtualJoystick from './VirtualJoystick';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  onStatsUpdate: (stats: any) => void;
  engineRef: React.MutableRefObject<GameEngine | null>;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, setGameState, onStatsUpdate, engineRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const laserImageRef = useRef<HTMLImageElement | null>(null);
  const magicCircleImageRef = useRef<HTMLImageElement | null>(null);
  const axeChopImageRef = useRef<HTMLImageElement | null>(null);

  // Level up golden burst state
  const levelUpBurstRef = useRef<{ active: boolean; frame: number; x: number; y: number }>({
    active: false, frame: 0, x: 0, y: 0
  });

  // Joystick Input Handler
  const handleJoystickMove = useCallback((vector: { x: number; y: number }) => {
    // Reset movement keys
    keysRef.current['w'] = false;
    keysRef.current['s'] = false;
    keysRef.current['a'] = false;
    keysRef.current['d'] = false;
    keysRef.current['ArrowUp'] = false;
    keysRef.current['ArrowDown'] = false;
    keysRef.current['ArrowLeft'] = false;
    keysRef.current['ArrowRight'] = false;

    // Threshold for activation (deadzone handled in component, but good to have logic here)
    const threshold = 0.3;

    if (vector.y < -threshold) keysRef.current['w'] = true;
    if (vector.y > threshold) keysRef.current['s'] = true;
    if (vector.x < -threshold) keysRef.current['a'] = true;
    if (vector.x > threshold) keysRef.current['d'] = true;
  }, []);

  const togglePause = () => {
    if (gameState === GameState.PLAYING) setGameState(GameState.PAUSED);
    else if (gameState === GameState.PAUSED) setGameState(GameState.PLAYING);
  };

  const toggleMute = () => {
    const newMuted = audioManager.toggleMute();
    setIsMuted(newMuted);
  };

  // Preload assets
  useEffect(() => {
    // Load background
    const bgImg = new Image();
    bgImg.src = './sprites/background.png';
    bgImg.onload = () => { backgroundImageRef.current = bgImg; };

    // Load laser
    const laserImg = new Image();
    laserImg.src = './sprites/laser.png';
    laserImg.onload = () => { laserImageRef.current = laserImg; };

    // Load magic circle
    const circleImg = new Image();
    circleImg.src = './sprites/magic_circle.png';
    circleImg.onload = () => { magicCircleImageRef.current = circleImg; };

    // Load axe chop effect
    const axeImg = new Image();
    axeImg.src = './sprites/axe_chop.png';
    axeImg.onload = () => { axeChopImageRef.current = axeImg; };

    Promise.all([
      spriteManager.preload(),
      audioManager.preload()
    ]).then(() => {
      setAssetsLoaded(true);
    });
  }, []);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true;
      if (e.key === 'Escape' || e.key === 'p') {
        togglePause();
      }
      // Mute toggle
      if (e.key === 'm') {
        audioManager.toggleMute();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, setGameState]);

  // Detect mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || ('ontouchstart' in window);

  // Window Resize Handling with DPI support
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && engineRef.current) {
        const dpr = window.devicePixelRatio || 1;
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Set canvas internal resolution for crisp rendering on high-DPI screens
        canvasRef.current.width = width * dpr;
        canvasRef.current.height = height * dpr;

        // Scale canvas CSS size to match viewport
        canvasRef.current.style.width = `${width}px`;
        canvasRef.current.style.height = `${height}px`;

        // Scale context to match DPI
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
        }

        engineRef.current.resize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    // Initial call
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // BGM Control
  useEffect(() => {
    if (!assetsLoaded) return;

    if (gameState === GameState.PLAYING) {
      audioManager.playBGM('gameplay');
    } else if (gameState === GameState.MENU) {
      audioManager.playBGM('menu');
    } else if (gameState === GameState.GAME_OVER) {
      audioManager.stopBGM();
      audioManager.playSFX('game_over');
    }
  }, [gameState, assetsLoaded]);

  // Main Loop
  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = new GameEngine();
    }
    const engine = engineRef.current;

    // Initial size sync with DPI support
    if (canvasRef.current) {
      const dpr = window.devicePixelRatio || 1;
      const width = window.innerWidth;
      const height = window.innerHeight;

      canvasRef.current.width = width * dpr;
      canvasRef.current.height = height * dpr;
      canvasRef.current.style.width = `${width}px`;
      canvasRef.current.style.height = `${height}px`;

      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      engine.resize(width, height);
    }

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Update effects
      effectsManager.update();
      particleSystem.update();

      // 1. Update Physics (if playing)
      if (gameState === GameState.PLAYING) {
        const timeScale = effectsManager.getTimeScale();

        // Only update if not in hit stop
        if (timeScale > 0) {
          engine.handleInput(keysRef.current);
          engine.update();

          if (engine.player.hp <= 0) {
            setGameState(GameState.GAME_OVER);
          }
          if (engine.isVictory) {
            setGameState(GameState.VICTORY);
          }
          if (engine.player.checkLevelUp()) {
            setGameState(GameState.LEVEL_UP);
            effectsManager.onLevelUp();
            particleSystem.emitPreset('levelup', engine.player.x, engine.player.y);
            audioManager.playSFX('level_up');
            // Trigger golden burst
            levelUpBurstRef.current = {
              active: true,
              frame: 0,
              x: engine.player.x,
              y: engine.player.y
            };
          }

          // Throttle stats updates
          if (engine.frame % 10 === 0) {
            onStatsUpdate(engine.getStats());
          }
        }
      }

      // 2. Clear Screen
      ctx.fillStyle = COLOR_PALETTE.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Apply screen shake
      const shakeX = effectsManager.shakeOffsetX;
      const shakeY = effectsManager.shakeOffsetY;

      // Camera Transform with shake and zoom
      ctx.save();
      ctx.scale(engine.zoom, engine.zoom);
      ctx.translate(-engine.cameraX + shakeX / engine.zoom, -engine.cameraY + shakeY / engine.zoom);

      // Draw Background (tiled) or Grid fallback - use viewport size (world units)
      if (backgroundImageRef.current) {
        drawTiledBackground(ctx, engine.cameraX, engine.cameraY, engine.viewportWidth, engine.viewportHeight, backgroundImageRef.current);
      } else {
        drawGrid(ctx, engine.cameraX, engine.cameraY, engine.viewportWidth, engine.viewportHeight);
      }

      // Draw Gems - Distinct visuals for each type
      engine.gems.forEach(gem => {
        if (gem.life < 180 && (Math.floor(engine.frame / 5) % 2 === 0)) {
          return;
        }

        const rotation = engine.frame * 0.05;
        ctx.save();
        ctx.translate(gem.x, gem.y);

        if (gem.type === 'XP') {
          // XP Gem: Blue diamond with glow
          ctx.rotate(rotation);
          ctx.shadowColor = '#00ffff';
          ctx.shadowBlur = 12;
          ctx.fillStyle = '#00aaff';
          ctx.beginPath();
          ctx.moveTo(0, -gem.radius * 1.2);
          ctx.lineTo(gem.radius, 0);
          ctx.lineTo(0, gem.radius * 1.2);
          ctx.lineTo(-gem.radius, 0);
          ctx.closePath();
          ctx.fill();
          // Inner highlight
          ctx.fillStyle = '#aaffff';
          ctx.beginPath();
          ctx.moveTo(0, -gem.radius * 0.5);
          ctx.lineTo(gem.radius * 0.4, 0);
          ctx.lineTo(0, gem.radius * 0.5);
          ctx.lineTo(-gem.radius * 0.4, 0);
          ctx.closePath();
          ctx.fill();
        } else if (gem.type === 'HEALTH') {
          // Health: Red heart/cross with pulse
          const pulse = 1 + Math.sin(engine.frame * 0.2) * 0.15;
          ctx.scale(pulse, pulse);
          ctx.shadowColor = '#ff0000';
          ctx.shadowBlur = 15;
          ctx.fillStyle = '#ff4444';
          // Draw heart shape
          ctx.beginPath();
          ctx.moveTo(0, gem.radius * 0.3);
          ctx.bezierCurveTo(-gem.radius, -gem.radius * 0.5, -gem.radius, gem.radius * 0.5, 0, gem.radius);
          ctx.bezierCurveTo(gem.radius, gem.radius * 0.5, gem.radius, -gem.radius * 0.5, 0, gem.radius * 0.3);
          ctx.fill();
          // Cross highlight
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-gem.radius * 0.15, -gem.radius * 0.4, gem.radius * 0.3, gem.radius * 0.8);
          ctx.fillRect(-gem.radius * 0.4, -gem.radius * 0.15, gem.radius * 0.8, gem.radius * 0.3);
        } else if (gem.type === 'GOLD') {
          // Gold: Spinning coin
          ctx.rotate(rotation * 2);
          ctx.shadowColor = '#ffd700';
          ctx.shadowBlur = 10;
          // Coin body
          ctx.fillStyle = '#ffd700';
          ctx.beginPath();
          ctx.arc(0, 0, gem.radius, 0, Math.PI * 2);
          ctx.fill();
          // Coin detail
          ctx.strokeStyle = '#aa8800';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, gem.radius * 0.7, 0, Math.PI * 2);
          ctx.stroke();
          // $ symbol
          ctx.fillStyle = '#aa8800';
          ctx.font = `bold ${gem.radius}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('$', 0, 0);
        }

        ctx.shadowBlur = 0;
        ctx.restore();
      });

      // Draw Projectiles with sprites
      engine.projectiles.forEach(p => {
        // Determine sprite based on color (wand=blue, axe=orange, knife=gray)
        const isAxe = p.color === '#ffaa44';
        const isKnife = p.color === '#cccccc';
        const spriteName = isAxe ? 'axe' : (isKnife ? 'knife' : 'wand_bolt');
        const size = isAxe ? p.radius * 3 : (isKnife ? p.radius * 3 : p.radius * 4);

        // Calculate rotation based on velocity
        const rotation = Math.atan2(p.vy, p.vx) + (isAxe ? engine.frame * 0.3 : 0);

        const spriteDrawn = spriteManager.draw(
          ctx,
          spriteName,
          p.x,
          p.y,
          size,
          size,
          { rotation }
        );

        if (!spriteDrawn) {
          // Fallback: glowing circle
          ctx.fillStyle = p.color || '#ffffaa';
          ctx.shadowColor = p.color || '#ffffaa';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      // Draw Orbiting Projectiles (bibles, death spiral)

      // Check for Vespera bibles and draw orbit ring
      const vesperaBibles = engine.orbitingProjectiles.filter(op => op.color === '#aaaaff' && op.life === -1);
      if (vesperaBibles.length > 0) {
        // Calculate orbit radius from first bible
        const firstBible = vesperaBibles[0];
        const orbitRadius = Math.sqrt(
          Math.pow(firstBible.x - engine.player.x, 2) +
          Math.pow(firstBible.y - engine.player.y, 2)
        );

        // Draw rotating orbit ring
        ctx.save();
        ctx.translate(engine.player.x, engine.player.y);
        ctx.rotate(engine.frame * 0.01); // Slow rotation

        // Outer glow ring
        const gradient = ctx.createRadialGradient(0, 0, orbitRadius - 15, 0, 0, orbitRadius + 15);
        gradient.addColorStop(0, 'rgba(170, 170, 255, 0)');
        gradient.addColorStop(0.4, 'rgba(170, 170, 255, 0.15)');
        gradient.addColorStop(0.5, 'rgba(200, 200, 255, 0.3)');
        gradient.addColorStop(0.6, 'rgba(170, 170, 255, 0.15)');
        gradient.addColorStop(1, 'rgba(170, 170, 255, 0)');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 30;
        ctx.beginPath();
        ctx.arc(0, 0, orbitRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner bright ring
        ctx.strokeStyle = 'rgba(220, 220, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 20]);
        ctx.lineDashOffset = -engine.frame * 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, orbitRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.restore();
      }

      engine.orbitingProjectiles.forEach(op => {
        const isVespera = op.color === '#aaaaff' && op.life === -1;
        const isBible = op.color === '#ffff88';
        const isAxe = op.color === '#ffaa44';
        const rotation = op.angle + (isAxe ? engine.frame * 0.2 : engine.frame * 0.1);

        // Vespera: Draw moon trail behind each bible
        if (isVespera) {
          const trailLength = 8;
          for (let i = trailLength; i >= 1; i--) {
            const trailAngle = op.angle - (i * 0.08);
            const trailX = engine.player.x + Math.cos(trailAngle) * op.orbitRadius;
            const trailY = engine.player.y + Math.sin(trailAngle) * op.orbitRadius;
            const trailAlpha = (1 - i / trailLength) * 0.4;
            const trailSize = op.radius * (1 - i / trailLength * 0.5);

            ctx.save();
            ctx.translate(trailX, trailY);
            ctx.rotate(trailAngle + Math.PI / 2);

            // Crescent moon trail
            ctx.fillStyle = `rgba(200, 200, 255, ${trailAlpha})`;
            ctx.beginPath();
            ctx.arc(0, 0, trailSize * 0.8, 0.3, Math.PI - 0.3);
            ctx.arc(trailSize * 0.3, 0, trailSize * 0.5, Math.PI - 0.5, 0.5, true);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
          }
        }

        ctx.save();
        ctx.translate(op.x, op.y);
        ctx.rotate(rotation);

        if (isAxe) {
          // Death Spiral axe
          ctx.fillStyle = '#ffaa44';
          ctx.shadowColor = '#ffaa44';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(-op.radius, 0);
          ctx.lineTo(0, -op.radius * 0.6);
          ctx.lineTo(op.radius, 0);
          ctx.lineTo(0, op.radius * 0.6);
          ctx.closePath();
          ctx.fill();
        } else if (isVespera) {
          // Vespera: Enhanced glowing moon bible
          const pulse = Math.sin(engine.frame * 0.1) * 0.3 + 1;

          // Outer glow layers (pulsing)
          ctx.shadowColor = '#aaaaff';
          ctx.shadowBlur = 25 * pulse;

          // Third layer glow
          ctx.fillStyle = 'rgba(150, 150, 255, 0.1)';
          ctx.beginPath();
          ctx.arc(0, 0, op.radius * 1.8 * pulse, 0, Math.PI * 2);
          ctx.fill();

          // Second layer glow
          ctx.fillStyle = 'rgba(180, 180, 255, 0.2)';
          ctx.beginPath();
          ctx.arc(0, 0, op.radius * 1.3 * pulse, 0, Math.PI * 2);
          ctx.fill();

          // Core bible shape
          ctx.shadowBlur = 15;
          ctx.fillStyle = '#c8c8ff';
          ctx.fillRect(-op.radius * 0.6, -op.radius * 0.8, op.radius * 1.2, op.radius * 1.6);

          // Moon crescent overlay
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.beginPath();
          ctx.arc(op.radius * 0.1, 0, op.radius * 0.5, 0, Math.PI * 2);
          ctx.arc(op.radius * 0.35, 0, op.radius * 0.35, 0, Math.PI * 2, true);
          ctx.fill();

          // Sparkle effect
          const sparkleAngle = engine.frame * 0.15;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          for (let i = 0; i < 4; i++) {
            const angle = sparkleAngle + (Math.PI / 2) * i;
            const dist = op.radius * 1.2 + Math.sin(engine.frame * 0.2 + i) * 3;
            ctx.beginPath();
            ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (isBible) {
          // Regular Bible
          ctx.fillStyle = op.color;
          ctx.shadowColor = op.color;
          ctx.shadowBlur = 12;
          ctx.fillRect(-op.radius * 0.6, -op.radius * 0.8, op.radius * 1.2, op.radius * 1.6);
          // Book detail
          ctx.fillStyle = '#ffffff44';
          ctx.fillRect(-op.radius * 0.3, -op.radius * 0.6, op.radius * 0.6, op.radius * 1.2);
        }

        ctx.shadowBlur = 0;
        ctx.restore();
      });

      // Draw Laser Effects (Holy Wand)
      engine.laserEffects.forEach(laser => {
        const alpha = laser.life / laser.maxLife;
        const angle = Math.atan2(laser.dirY, laser.dirX);

        ctx.save();
        ctx.translate(laser.startX, laser.startY);
        ctx.rotate(angle);

        // Use laser image if available, otherwise draw procedurally
        if (laserImageRef.current) {
          ctx.globalAlpha = alpha;
          const imgWidth = laser.length;
          const imgHeight = laser.width * 2;
          ctx.drawImage(laserImageRef.current, 0, -imgHeight / 2, imgWidth, imgHeight);
        } else {
          // Procedural laser beam
          // Outer glow
          const glowGradient = ctx.createLinearGradient(0, -laser.width, 0, laser.width);
          glowGradient.addColorStop(0, `rgba(100, 200, 255, 0)`);
          glowGradient.addColorStop(0.3, `rgba(100, 200, 255, ${alpha * 0.3})`);
          glowGradient.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.8})`);
          glowGradient.addColorStop(0.7, `rgba(100, 200, 255, ${alpha * 0.3})`);
          glowGradient.addColorStop(1, `rgba(100, 200, 255, 0)`);

          ctx.fillStyle = glowGradient;
          ctx.fillRect(0, -laser.width, laser.length, laser.width * 2);

          // Core beam
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.fillRect(0, -laser.width * 0.3, laser.length, laser.width * 0.6);
        }

        ctx.globalAlpha = 1;
        ctx.restore();

        // Emit particles along the beam
        if (laser.life === laser.maxLife) {
          for (let i = 0; i < 15; i++) {
            const t = Math.random() * laser.length;
            particleSystem.emitPreset('spark',
              laser.startX + laser.dirX * t,
              laser.startY + laser.dirY * t,
              '#aaddff'
            );
          }
        }
      });

      // Draw Enemy Projectiles
      engine.enemyProjectiles.forEach(ep => {
        const rotation = Math.atan2(ep.vy, ep.vx);

        ctx.save();
        ctx.translate(ep.x, ep.y);
        ctx.rotate(rotation);

        // Arrow shape
        ctx.fillStyle = ep.color;
        ctx.shadowColor = ep.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(ep.radius, 0);
        ctx.lineTo(-ep.radius, -ep.radius * 0.5);
        ctx.lineTo(-ep.radius * 0.5, 0);
        ctx.lineTo(-ep.radius, ep.radius * 0.5);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.restore();
      });

      // Draw Chop Effects (Guillotine) - Big axe dropping on enemy
      engine.chopEffects.forEach(chop => {
        const progress = 1 - chop.life / chop.maxLife;

        // Animation: axe drops from above
        const dropOffset = (1 - progress) * 80; // Starts 80px above, drops down
        const alpha = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3; // Fade out at end
        const size = 100 * chop.scale;

        ctx.save();
        ctx.translate(chop.x, chop.y - dropOffset);
        ctx.globalAlpha = alpha;

        // Red glow for execute
        if (chop.isExecute) {
          ctx.shadowColor = '#ff0000';
          ctx.shadowBlur = 40;
        } else {
          ctx.shadowColor = '#ff4444';
          ctx.shadowBlur = 20;
        }

        if (axeChopImageRef.current) {
          ctx.drawImage(axeChopImageRef.current, -size / 2, -size, size, size * 2);
        } else {
          // Fallback: procedural axe
          ctx.fillStyle = chop.isExecute ? '#ff0000' : '#aa2222';
          ctx.beginPath();
          // Axe blade shape
          ctx.moveTo(-size * 0.4, 0);
          ctx.lineTo(-size * 0.1, -size * 0.8);
          ctx.lineTo(size * 0.1, -size * 0.8);
          ctx.lineTo(size * 0.4, 0);
          ctx.lineTo(size * 0.1, size * 0.3);
          ctx.lineTo(-size * 0.1, size * 0.3);
          ctx.closePath();
          ctx.fill();
          // Handle
          ctx.fillStyle = '#442200';
          ctx.fillRect(-size * 0.05, size * 0.3, size * 0.1, size * 0.5);
        }

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.restore();

        // Impact particles when axe lands
        if (chop.life === Math.floor(chop.maxLife * 0.6)) {
          const particleCount = chop.isExecute ? 15 : 8;
          for (let i = 0; i < particleCount; i++) {
            particleSystem.emitPreset('spark',
              chop.x + (Math.random() - 0.5) * 40,
              chop.y + (Math.random() - 0.5) * 20,
              chop.isExecute ? '#ff0000' : '#ff4444'
            );
          }
        }
      });

      // Draw Magic Circle (Soul Eater)
      if (engine.magicCircleEffect) {
        const mc = engine.magicCircleEffect;
        ctx.save();
        ctx.translate(mc.x, mc.y);
        ctx.rotate(mc.rotation);

        // Pulsing effect
        const pulse = 1 + Math.sin(engine.frame * 0.08) * 0.1;
        const size = mc.radius * 2 * pulse;

        if (magicCircleImageRef.current) {
          // Use image
          ctx.globalAlpha = mc.alpha * 0.7;
          ctx.shadowColor = '#aa44ff';
          ctx.shadowBlur = 30;
          ctx.drawImage(magicCircleImageRef.current, -size / 2, -size / 2, size, size);
        } else {
          // Fallback procedural
          ctx.globalAlpha = mc.alpha * 0.5;
          ctx.strokeStyle = '#aa44ff';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#aa44ff';
          ctx.shadowBlur = 20;
          ctx.beginPath();
          ctx.arc(0, 0, mc.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, 0, mc.radius * 0.7, 0, Math.PI * 2);
          ctx.stroke();
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 / 6) * i;
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle) * mc.radius * 0.85, Math.sin(angle) * mc.radius * 0.85);
            ctx.lineTo(Math.cos(angle + Math.PI) * mc.radius * 0.85, Math.sin(angle + Math.PI) * mc.radius * 0.85);
            ctx.stroke();
          }
        }

        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      // Draw Enemies
      engine.enemies.forEach(enemy => {
        const spriteName = enemy.type.name.toLowerCase();
        const size = enemy.radius * 3;
        const flashIntensity = enemy.damageFlash > 0 ? enemy.damageFlash / 5 : 0;

        // Ghost phasing effect - semi-transparent
        const isPhasing = enemy.isPhasing;
        const isCharging = enemy.isCharging;
        const alpha = isPhasing ? 0.3 : 1;

        // Charging effect - slight scale increase
        const scale = isCharging ? 1.2 : 1;
        const actualSize = size * scale;

        // Try sprite first, fallback to shape
        const spriteDrawn = spriteManager.drawWithFlash(
          ctx,
          spriteName,
          enemy.x,
          enemy.y,
          actualSize,
          actualSize,
          flashIntensity,
          { alpha }
        );

        if (!spriteDrawn) {
          // Fallback: colored square
          ctx.globalAlpha = alpha;
          ctx.fillStyle = enemy.damageFlash > 0 ? '#ffffff' : enemy.type.color;
          ctx.fillRect(enemy.x - enemy.radius * scale, enemy.y - enemy.radius * scale, enemy.radius * 2 * scale, enemy.radius * 2 * scale);
          ctx.globalAlpha = 1;
        }

        // Charging indicator
        if (isCharging) {
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, enemy.radius * 1.5, 0, Math.PI * 2);
          ctx.stroke();
        }

        // HP bar for bosses
        if (enemy.maxHp > 50 && enemy.hp < enemy.maxHp) {
          ctx.fillStyle = '#333333';
          ctx.fillRect(enemy.x - 12, enemy.y - enemy.radius - 8, 24, 5);
          ctx.fillStyle = '#ff4444';
          ctx.fillRect(enemy.x - 11, enemy.y - enemy.radius - 7, 22, 3);
          ctx.fillStyle = '#44ff44';
          ctx.fillRect(enemy.x - 11, enemy.y - enemy.radius - 7, 22 * (enemy.hp / enemy.maxHp), 3);
        }
      });

      // Draw Player
      const playerAlpha = engine.player.invulnTimer > 0 && Math.floor(Date.now() / 50) % 2 === 0 ? 0.5 : 1;
      const playerSize = engine.player.radius * 4;

      const playerDrawn = spriteManager.draw(
        ctx,
        'player',
        engine.player.x,
        engine.player.y,
        playerSize,
        playerSize,
        {
          flipX: engine.player.facingDirection < 0,
          alpha: playerAlpha
        }
      );

      if (!playerDrawn) {
        // Fallback: blue circle
        ctx.fillStyle = COLOR_PALETTE.player;
        ctx.globalAlpha = playerAlpha;
        ctx.beginPath();
        ctx.arc(engine.player.x, engine.player.y, engine.player.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
      }

      // Draw HP Bar above player
      const hpBarWidth = 40;
      const hpBarHeight = 6;
      const hpBarY = engine.player.y - engine.player.radius - 18;
      const hpPercent = engine.player.hp / engine.player.maxHp;

      // Background
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(engine.player.x - hpBarWidth / 2 - 1, hpBarY - 1, hpBarWidth + 2, hpBarHeight + 2);

      // Border
      ctx.strokeStyle = '#444444';
      ctx.lineWidth = 1;
      ctx.strokeRect(engine.player.x - hpBarWidth / 2 - 1, hpBarY - 1, hpBarWidth + 2, hpBarHeight + 2);

      // HP fill with gradient
      if (hpPercent > 0) {
        const hpGradient = ctx.createLinearGradient(
          engine.player.x - hpBarWidth / 2, hpBarY,
          engine.player.x - hpBarWidth / 2, hpBarY + hpBarHeight
        );
        if (hpPercent > 0.5) {
          hpGradient.addColorStop(0, '#44ff44');
          hpGradient.addColorStop(1, '#22aa22');
        } else if (hpPercent > 0.25) {
          hpGradient.addColorStop(0, '#ffff44');
          hpGradient.addColorStop(1, '#aaaa22');
        } else {
          hpGradient.addColorStop(0, '#ff4444');
          hpGradient.addColorStop(1, '#aa2222');
        }
        ctx.fillStyle = hpGradient;
        ctx.fillRect(engine.player.x - hpBarWidth / 2, hpBarY, hpBarWidth * hpPercent, hpBarHeight);

        // Shine effect
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(engine.player.x - hpBarWidth / 2, hpBarY, hpBarWidth * hpPercent, hpBarHeight / 3);
      }

      // Draw Golden Burst effect for level up
      if (levelUpBurstRef.current.active) {
        const burst = levelUpBurstRef.current;
        burst.frame++;
        const progress = burst.frame / 60; // 1 second animation

        if (progress < 1) {
          const numRays = 12;
          const maxRadius = 200 * progress;
          const alpha = 1 - progress;

          ctx.save();
          ctx.translate(burst.x, burst.y);

          // Golden rays
          for (let i = 0; i < numRays; i++) {
            const angle = (Math.PI * 2 / numRays) * i + burst.frame * 0.02;
            const rayLength = maxRadius * (0.6 + Math.sin(burst.frame * 0.3 + i) * 0.4);

            ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
            ctx.lineWidth = 4 - progress * 3;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(angle) * rayLength, Math.sin(angle) * rayLength);
            ctx.stroke();
          }

          // Central glow
          const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, maxRadius * 0.5);
          glowGradient.addColorStop(0, `rgba(255, 255, 200, ${alpha * 0.8})`);
          glowGradient.addColorStop(0.5, `rgba(255, 215, 0, ${alpha * 0.4})`);
          glowGradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
          ctx.fillStyle = glowGradient;
          ctx.beginPath();
          ctx.arc(0, 0, maxRadius * 0.5, 0, Math.PI * 2);
          ctx.fill();

          // Sparkle particles
          for (let i = 0; i < 8; i++) {
            const sparkAngle = (Math.PI * 2 / 8) * i + burst.frame * 0.05;
            const sparkDist = maxRadius * 0.7;
            const sparkX = Math.cos(sparkAngle) * sparkDist;
            const sparkY = Math.sin(sparkAngle) * sparkDist;

            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(sparkX, sparkY, 3 * (1 - progress), 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();
        } else {
          levelUpBurstRef.current.active = false;
        }
      }

      // Draw Garlic Aura
      const garlic = engine.player.weapons.find(w => w.id === "GARLIC");
      if (garlic) {
        const r = (garlic as any).radius * engine.player.stats.area;
        const pulseAlpha = 0.15 + Math.sin(engine.frame * 0.1) * 0.1;
        ctx.strokeStyle = `rgba(255, 255, 255, ${pulseAlpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(engine.player.x, engine.player.y, r, 0, Math.PI * 2);
        ctx.stroke();

        // Inner glow
        const gradient = ctx.createRadialGradient(
          engine.player.x, engine.player.y, r * 0.7,
          engine.player.x, engine.player.y, r
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(1, `rgba(255, 255, 255, ${pulseAlpha * 0.3})`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(engine.player.x, engine.player.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Soul Eater Aura (evolved garlic)
      const soulEater = engine.player.weapons.find(w => w.id === "SOUL_EATER");
      if (soulEater) {
        const r = (soulEater as any).radius * engine.player.stats.area;
        const pulseAlpha = 0.2 + Math.sin(engine.frame * 0.15) * 0.15;

        // Outer ring - purple/ghost color
        ctx.strokeStyle = `rgba(170, 85, 255, ${pulseAlpha})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(engine.player.x, engine.player.y, r, 0, Math.PI * 2);
        ctx.stroke();

        // Inner gradient - ghostly purple
        const gradient = ctx.createRadialGradient(
          engine.player.x, engine.player.y, r * 0.5,
          engine.player.x, engine.player.y, r
        );
        gradient.addColorStop(0, 'rgba(170, 85, 255, 0)');
        gradient.addColorStop(0.7, `rgba(170, 85, 255, ${pulseAlpha * 0.2})`);
        gradient.addColorStop(1, `rgba(100, 255, 100, ${pulseAlpha * 0.3})`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(engine.player.x, engine.player.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Particles
      particleSystem.render(ctx);

      // Draw Floating Texts with better styling
      ctx.textAlign = 'center';
      engine.texts.forEach(t => {
        const scale = 1 + (1 - t.life / 60) * 0.3;
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.scale(scale, scale);

        ctx.font = 'bold 14px "Press Start 2P"';
        ctx.fillStyle = t.color;
        ctx.globalAlpha = Math.max(0, t.life / 60);

        // Outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(t.text, 0, 0);
        ctx.fillText(t.text, 0, 0);

        ctx.restore();
      });

      ctx.restore(); // Restore camera transform

      // Draw screen effects (vignette, flashes)
      effectsManager.render(ctx, canvas.width, canvas.height);

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, setGameState, onStatsUpdate, assetsLoaded]);

  const drawGrid = (ctx: CanvasRenderingContext2D, camX: number, camY: number, width: number, height: number) => {
    const gridSize = 100;
    const startX = Math.floor(camX / gridSize) * gridSize;
    const startY = Math.floor(camY / gridSize) * gridSize;

    ctx.strokeStyle = COLOR_PALETTE.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = startX; x < camX + width + gridSize; x += gridSize) {
      ctx.moveTo(x, camY);
      ctx.lineTo(x, camY + height);
    }
    for (let y = startY; y < camY + height + gridSize; y += gridSize) {
      ctx.moveTo(camX, y);
      ctx.lineTo(camX + width, y);
    }
    ctx.stroke();
  };

  const drawTiledBackground = (ctx: CanvasRenderingContext2D, camX: number, camY: number, width: number, height: number, img: HTMLImageElement) => {
    const tileSize = img.width; // Assuming square tiles
    const startX = Math.floor(camX / tileSize) * tileSize;
    const startY = Math.floor(camY / tileSize) * tileSize;

    for (let x = startX; x < camX + width + tileSize; x += tileSize) {
      for (let y = startY; y < camY + height + tileSize; y += tileSize) {
        ctx.drawImage(img, x, y, tileSize, tileSize);
      }
    }
  };

  return (
    <div className="relative w-full h-full">
        <canvas
            ref={canvasRef}
            className="block bg-black w-full h-full touch-none"
        />
        {/* Virtual Joystick - Only visible when playing on mobile */}
        {gameState === GameState.PLAYING && isMobile && (
            <VirtualJoystick onMove={handleJoystickMove} />
        )}

        {/* Mobile Control Buttons - Top Right, with Safe Area support */}
        {isMobile && (
            <div
                className="absolute z-50 flex gap-2"
                style={{
                    top: 'max(1rem, env(safe-area-inset-top, 0px))',
                    right: 'max(1rem, env(safe-area-inset-right, 0px))'
                }}
            >
                {/* Mute Button */}
                <button
                    onClick={toggleMute}
                    className="w-12 h-12 bg-gray-800/80 rounded-full border border-gray-600 flex items-center justify-center text-white active:bg-gray-700 text-lg"
                >
                    {isMuted ? '🔇' : '🔊'}
                </button>
                {/* Pause Button */}
                <button
                    onClick={togglePause}
                    className="w-12 h-12 bg-gray-800/80 rounded-full border border-gray-600 flex items-center justify-center text-white active:bg-gray-700"
                >
                    {gameState === GameState.PAUSED ? '▶' : '⏸'}
                </button>
            </div>
        )}
    </div>
  );
};

export default GameCanvas;
