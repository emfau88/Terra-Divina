import Phaser from 'phaser';
import '@styles/mobile.css';
import { CANVAS_W, CANVAS_H } from '@game/config';
import { BootScene } from '@game/scenes/BootScene';
import { MainMenuScene } from '@game/scenes/MainMenuScene';
import { GameScene } from '@game/scenes/GameScene';
import { UIScene } from '@game/scenes/UIScene';

// ─── --vh Fix ────────────────────────────────────────────────────────────────
function setVH(): void {
  const h = window.visualViewport?.height ?? window.innerHeight;
  document.documentElement.style.setProperty('--vh', `${h * 0.01}px`);
}
setVH();
window.visualViewport?.addEventListener('resize', setVH);
window.addEventListener('resize', setVH);
window.addEventListener('orientationchange', () => setTimeout(setVH, 160));

// ─── Fullscreen ───────────────────────────────────────────────────────────────
function setupFullscreen(): void {
  const btn = document.getElementById('btn-fullscreen');
  if (!btn) return;

  const enter = (): void => {
    const el = document.documentElement;
    if (el.requestFullscreen)                el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
  };

  const exit = (): void => {
    if (document.exitFullscreen)                document.exitFullscreen().catch(() => {});
    else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
  };

  btn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    const isFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement
    );
    if (isFullscreen) exit(); else enter();
  });

  // Icon wechseln je nach Zustand
  const onFullscreenChange = (): void => {
    const isFs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
    btn.textContent  = isFs ? '✕' : '⛶';
    btn.title        = isFs ? 'Vollbild beenden' : 'Vollbild';
    btn.style.display = isFs ? 'none' : 'flex';
    setVH(); // Viewport nach Fullscreen-Wechsel neu berechnen
  };

  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);
}

// ─── Phaser ───────────────────────────────────────────────────────────────────
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: CANVAS_W,
  height: CANVAS_H,
  backgroundColor: '#07101f',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: CANVAS_W,
    height: CANVAS_H,
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
  },
  input: {
    activePointers: 3,
  },
  scene: [BootScene, MainMenuScene, GameScene, UIScene],
};

window.addEventListener('load', () => {
  // --vh nach vollständigem Laden aktualisieren (safe area, toolbar-Höhe)
  setVH();
  new Phaser.Game(config);
  setupFullscreen();
});
