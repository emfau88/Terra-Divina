import Phaser from 'phaser';

/**
 * BootScene
 *
 * Runs first. Responsible only for:
 * - setting up any global Phaser configuration that must happen before the
 *   main scene starts (currently none — placeholder for future asset preload)
 * - immediately handing off to GameScene
 *
 * Do NOT add gameplay logic here.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Phase 1: nothing to load yet.
    // Future phases will preload generated textures or audio here.
  }

  create(): void {
    // Phase 15: Zuerst das Hauptmenü anzeigen, nicht direkt die Spielszene starten
    this.scene.start('MainMenuScene');
  }
}
