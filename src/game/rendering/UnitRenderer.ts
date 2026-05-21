/**
 * UnitRenderer
 *
 * Uses generated unit sprites when available and keeps the lightweight
 * Graphics overlays for HP, state, carried resources and fallback rendering.
 */

import Phaser from 'phaser';
import { Unit }     from '@game/units/Unit';
import { FACTIONS } from '@game/factions/Faction';

export class UnitRenderer {
  private static readonly UNIT_DISPLAY_SIZE = {
    human: 19,
    elf: 19,
    dwarf: 20,
    orc: 22,
  } as const;

  private readonly scene: Phaser.Scene;
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly sprites = new Map<number, Phaser.GameObjects.Image>();

  constructor(scene: Phaser.Scene, graphics: Phaser.GameObjects.Graphics) {
    this.scene = scene;
    this.g = graphics;
    this.g.setDepth(50);
  }

  drawAll(units: Unit[]): void {
    const liveIds = new Set<number>();
    this.g.clear();

    for (const u of units) {
      if (u.dead) continue;
      liveIds.add(u.id);
      this.drawUnit(u);
    }

    for (const [id, sprite] of this.sprites) {
      if (!liveIds.has(id)) {
        sprite.destroy();
        this.sprites.delete(id);
      }
    }
  }

  private drawUnit(u: Unit): void {
    const g = this.g;
    const fc = FACTIONS[u.faction];
    const px = u.visualX;
    const py = u.visualY;

    const bodyRadius = u.role === 'gatherer' ? 4 : u.role === 'builder' ? 5 : 6;
    const spriteDrawn = this.updateSprite(u, px, py);

    if (!spriteDrawn) {
      this.drawFallbackBody(u, px, py, bodyRadius);
    }

    if (
      u.role === 'raider' &&
      (u.state === 'march' || u.state === 'raid' || u.state === 'siege')
    ) {
      g.fillStyle(0x4a3010, 1.0);
      g.fillRect(px - 0.5, py - 20, 1, 6);
      g.fillStyle(fc.color, 1.0);
      g.fillTriangle(px, py - 20, px + 5, py - 18, px, py - 16);
    }

    if (u.hp < u.maxHp) {
      g.fillStyle(0x1b1111, 0.8);
      g.fillRect(px - 7, py - 13, 14, 2);
      const ratio = u.hp / u.maxHp;
      g.fillStyle(ratio > 0.45 ? 0x7eff8a : 0xff4b4b, 1);
      g.fillRect(px - 7, py - 13, 14 * ratio, 2);
    }

    if (u.carryFood > 0) {
      g.fillStyle(0x99e040, 1.0);
      g.fillCircle(px, py - 18, 3);
    }
    if (u.carryWood > 0) {
      g.fillStyle(0x8b5a2b, 1.0);
      g.fillCircle(px + (u.carryFood > 0 ? 7 : 0), py - 18, 3);
    }

    if (u.isStarving) {
      g.fillStyle(0xff9944, 1.0);
      g.fillCircle(px - 6, py - 15, 2.5);
    }

    this.drawStateIcon(u, px, py);
  }

  private updateSprite(u: Unit, px: number, py: number): boolean {
    const key = `unit-${u.faction}`;
    if (!this.scene.textures.exists(key)) return false;

    let sprite = this.sprites.get(u.id);
    if (!sprite) {
      sprite = this.scene.add.image(px, py, key);
      sprite.setOrigin(0.5, 0.72);
      sprite.setDepth(49);
      sprite.setPipeline('TextureTintPipeline');
      this.sprites.set(u.id, sprite);
    }

    sprite.setTexture(key);
    sprite.setPosition(Math.round(px), Math.round(py + 3));
    const size = UnitRenderer.UNIT_DISPLAY_SIZE[u.faction];
    sprite.setDisplaySize(size, size);
    sprite.setVisible(true);
    sprite.setAlpha(1);
    sprite.setTint(u.hitFlash > 0 ? 0xffffaa : 0xffffff);
    return true;
  }

  private drawFallbackBody(u: Unit, px: number, py: number, bodyRadius: number): void {
    const g = this.g;
    const fc = FACTIONS[u.faction];
    const rawColor = u.role === 'guard'
      ? UnitRenderer.darkenColor(fc.color, 0.75)
      : fc.color;

    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(px, py + bodyRadius + 2, bodyRadius * 2 + 1, 5);

    g.fillStyle(u.hitFlash > 0 ? 0xffffa0 : rawColor, 1);
    g.fillCircle(px, py, bodyRadius);

    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(px - 2, py - 2, 1.2);

    g.fillStyle(fc.dark, 0.95);
    g.fillRect(px - 4, py + bodyRadius - 1, 8, 4);
  }

  private static darkenColor(color: number, factor: number): number {
    const r = Math.round(((color >> 16) & 0xff) * factor);
    const g = Math.round(((color >>  8) & 0xff) * factor);
    const b = Math.round(( color        & 0xff) * factor);
    return (r << 16) | (g << 8) | b;
  }

  private drawStateIcon(u: Unit, px: number, py: number): void {
    const g = this.g;
    const iy = py - 16;

    switch (u.state) {
      case 'chop':
      case 'forage':
        g.fillStyle(0xffe040, 0.95);
        g.fillCircle(px, iy, 3);
        break;
      case 'repair':
      case 'build':
        g.fillStyle(0xff8c00, 0.95);
        g.fillRect(px - 2.5, iy - 2.5, 5, 5);
        break;
      case 'march':
      case 'raid':
      case 'siege':
        g.fillStyle(0xff3333, 1.0);
        g.fillTriangle(px - 3.5, iy + 2.5, px + 3.5, iy + 2.5, px, iy - 3.5);
        break;
      case 'patrol':
      case 'defend':
        g.fillStyle(0xffffff, 0.9);
        g.fillTriangle(px - 3, iy, px, iy - 4, px + 3, iy);
        g.fillTriangle(px - 3, iy, px + 3, iy, px, iy + 4);
        break;
      case 'scout':
      case 'probe':
        g.fillStyle(0x88ddff, 0.9);
        g.fillTriangle(px - 3, iy, px, iy - 4, px + 3, iy);
        g.fillTriangle(px - 3, iy, px + 3, iy, px, iy + 4);
        break;
      case 'return':
        g.fillStyle(0xccffcc, 0.85);
        g.fillRect(px - 3.5, iy - 1, 3, 2);
        g.fillRect(px + 0.5, iy - 1, 3, 2);
        break;
      case 'fight':
        g.fillStyle(0xff2222, 1.0);
        g.fillRect(px - 3.5, iy - 1, 7, 2);
        g.fillRect(px - 1, iy - 3.5, 2, 7);
        break;
      case 'flee':
      case 'wounded':
        g.fillStyle(0xdd66ff, 0.9);
        g.fillCircle(px, iy, 2.5);
        break;
      default:
        break;
    }
  }
}
