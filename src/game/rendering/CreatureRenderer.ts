/**
 * CreatureRenderer
 *
 * Uses generated creature sprites when available and keeps Graphics HP bars
 * plus shape fallbacks.
 */

import Phaser from 'phaser';
import { Creature } from '@game/creatures/Creature';
import { TILE }     from '@game/config';

const WOLF_COLOR  = 0x8a8a8a;
const WOLF_DARK   = 0x444444;
const DEMON_COLOR = 0xcc2222;
const DEMON_DARK  = 0x880000;
const DEMON_GLOW  = 0xff6600;

export class CreatureRenderer {
  private static readonly CREATURE_DISPLAY_SIZE = {
    wolf: 22,
    demon: 27,
  } as const;

  private readonly scene: Phaser.Scene;
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly sprites = new Map<number, Phaser.GameObjects.Image>();

  constructor(scene: Phaser.Scene, graphics: Phaser.GameObjects.Graphics) {
    this.scene = scene;
    this.g = graphics;
    this.g.setDepth(70);
  }

  drawAll(creatures: Creature[]): void {
    const liveIds = new Set<number>();
    this.g.clear();

    for (const c of creatures) {
      if (c.dead) continue;
      liveIds.add(c.id);
      this.drawCreature(c);
    }

    for (const [id, sprite] of this.sprites) {
      if (!liveIds.has(id)) {
        sprite.destroy();
        this.sprites.delete(id);
      }
    }
  }

  private drawCreature(c: Creature): void {
    const px = c.visualX;
    const py = c.visualY;
    const spriteDrawn = this.updateSprite(c, px, py);

    if (!spriteDrawn) {
      if (c.type === 'wolf') this.drawWolfFallback(px, py);
      else this.drawDemonFallback(px, py);
    }

    this.drawHpBar(c, px, py);
  }

  private updateSprite(c: Creature, px: number, py: number): boolean {
    const key = `creature-${c.type}`;
    if (!this.scene.textures.exists(key)) return false;

    let sprite = this.sprites.get(c.id);
    if (!sprite) {
      sprite = this.scene.add.image(px, py, key);
      sprite.setOrigin(0.5, 0.72);
      sprite.setDepth(69);
      this.sprites.set(c.id, sprite);
    }

    sprite.setTexture(key);
    sprite.setPosition(Math.round(px), Math.round(py + 4));
    const size = CreatureRenderer.CREATURE_DISPLAY_SIZE[c.type];
    sprite.setDisplaySize(size, size);
    sprite.setVisible(true);
    return true;
  }

  private drawWolfFallback(px: number, py: number): void {
    const g = this.g;
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(px, py + 6, 14, 5);
    g.fillStyle(WOLF_COLOR, 1);
    g.fillCircle(px, py, 7);
    g.fillStyle(WOLF_DARK, 1);
    g.fillTriangle(px - 5, py - 5, px - 2, py - 10, px, py - 5);
    g.fillTriangle(px + 5, py - 5, px + 2, py - 10, px, py - 5);
    g.fillStyle(0xffee44, 1);
    g.fillCircle(px - 2, py - 1, 1.2);
    g.fillCircle(px + 2, py - 1, 1.2);
  }

  private drawDemonFallback(px: number, py: number): void {
    const g = this.g;
    g.fillStyle(DEMON_GLOW, 0.35);
    g.fillCircle(px, py, 11);
    g.fillStyle(0x000000, 0.30);
    g.fillEllipse(px, py + 7, 16, 6);
    g.fillStyle(DEMON_COLOR, 1);
    g.fillTriangle(px, py - 9, px + 7, py, px, py + 9);
    g.fillTriangle(px, py - 9, px - 7, py, px, py + 9);
    g.fillStyle(DEMON_DARK, 1);
    g.fillTriangle(px - 5, py - 7, px - 3, py - 14, px - 1, py - 7);
    g.fillTriangle(px + 5, py - 7, px + 3, py - 14, px + 1, py - 7);
    g.fillStyle(0xff4444, 1);
    g.fillCircle(px - 2, py - 1, 1.5);
    g.fillCircle(px + 2, py - 1, 1.5);
  }

  private drawHpBar(c: Creature, px: number, py: number): void {
    const g = this.g;
    const barW = TILE - 2;
    const barH = 2;
    const barX = px - barW / 2;
    const barY = py - 14;
    const ratio = Math.max(0, c.hp / c.maxHp);

    if (ratio >= 1) return;

    g.fillStyle(0x000000, 0.6);
    g.fillRect(barX, barY, barW, barH);
    g.fillStyle(c.type === 'wolf' ? 0xaaaaaa : 0xff4444, 1);
    g.fillRect(barX, barY, barW * ratio, barH);
  }
}
