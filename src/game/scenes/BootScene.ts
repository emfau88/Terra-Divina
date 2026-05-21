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
    for (const tile of ['grass', 'water', 'sand', 'ash', 'stone']) {
      this.load.image(`terrain-base-${tile}`, `assets/terrain/base/18px/${tile}.png`);
    }

    for (const overlay of [
      'coast-n', 'coast-e', 'coast-s', 'coast-w',
      'grass-sand-n', 'grass-sand-e', 'grass-sand-s', 'grass-sand-w',
    ]) {
      this.load.image(`terrain-overlay-${overlay}`, `assets/terrain/overlays/18px/${overlay}.png`);
    }

    for (const decor of ['tree-01', 'tree-cluster-01', 'rock-01', 'mountain-01', 'bush-01', 'flower-01']) {
      this.load.image(`terrain-decor-${decor}`, `assets/terrain/decor/18px/${decor}.png`);
    }

    for (const unit of ['human', 'orc', 'elf', 'dwarf']) {
      this.load.image(`unit-${unit}`, `assets/units/${unit}.png`);
    }

    for (const creature of ['wolf', 'demon']) {
      this.load.image(`creature-${creature}`, `assets/units/${creature}.png`);
    }

    for (const building of ['hall', 'hut', 'farm', 'wood', 'tower', 'outpost', 'barracks', 'buildsite', 'ruin']) {
      this.load.image(`building-${building}`, `assets/buildings/${building}.png`);
    }
  }

  create(): void {
    // Phase 15: Zuerst das Hauptmenü anzeigen, nicht direkt die Spielszene starten
    this.scene.start('MainMenuScene');
  }
}
