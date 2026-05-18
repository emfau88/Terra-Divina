/**
 * CreatureRenderer — Phase 19
 *
 * Zeichnet Wolves und Demons als farbige Formen mit HP-Balken.
 * Nutzt ein eigenes Graphics-Objekt (creatureG), das über unitG liegt.
 *
 * Wolf:  dunkelgrauer Kreis mit spitzen Ohren-Dreiecken, gelbe Augen
 * Demon: dunkelroter Rautenkreis mit orangenem Glühen, Hörner
 *
 * Kein Phaser-State — nur reine Zeichenoperationen.
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
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(graphics: Phaser.GameObjects.Graphics) {
    this.g = graphics;
  }

  drawAll(creatures: Creature[]): void {
    this.g.clear();
    for (const c of creatures) {
      if (c.dead) continue;
      switch (c.type) {
        case 'wolf':  this.drawWolf(c);  break;
        case 'demon': this.drawDemon(c); break;
      }
    }
  }

  // ─── Wolf ──────────────────────────────────────────────────────────────

  private drawWolf(c: Creature): void {
    const g  = this.g;
    const px = c.visualX;
    const py = c.visualY;

    // Schatten
    g.fillStyle(0x000000, 0.22);
    g.fillEllipse(px, py + 6, 14, 5);

    // Körper
    g.fillStyle(WOLF_COLOR, 1);
    g.fillCircle(px, py, 7);

    // Ohren (zwei kleine Dreiecke)
    g.fillStyle(WOLF_DARK, 1);
    g.fillTriangle(px - 5, py - 5, px - 2, py - 10, px, py - 5);
    g.fillTriangle(px + 5, py - 5, px + 2, py - 10, px, py - 5);

    // Augen (gelb)
    g.fillStyle(0xffee44, 1);
    g.fillCircle(px - 2, py - 1, 1.2);
    g.fillCircle(px + 2, py - 1, 1.2);

    // HP-Balken
    this.drawHpBar(c, px, py);
  }

  // ─── Demon ─────────────────────────────────────────────────────────────

  private drawDemon(c: Creature): void {
    const g  = this.g;
    const px = c.visualX;
    const py = c.visualY;

    // Glühen (orangener Kreis dahinter)
    g.fillStyle(DEMON_GLOW, 0.35);
    g.fillCircle(px, py, 11);

    // Schatten
    g.fillStyle(0x000000, 0.30);
    g.fillEllipse(px, py + 7, 16, 6);

    // Körper (Raute aus 2 Dreiecken)
    g.fillStyle(DEMON_COLOR, 1);
    g.fillTriangle(px, py - 9, px + 7, py, px, py + 9);
    g.fillTriangle(px, py - 9, px - 7, py, px, py + 9);

    // Hörner
    g.fillStyle(DEMON_DARK, 1);
    g.fillTriangle(px - 5, py - 7, px - 3, py - 14, px - 1, py - 7);
    g.fillTriangle(px + 5, py - 7, px + 3, py - 14, px + 1, py - 7);

    // Augen (weiß-rot)
    g.fillStyle(0xff4444, 1);
    g.fillCircle(px - 2, py - 1, 1.5);
    g.fillCircle(px + 2, py - 1, 1.5);

    // HP-Balken
    this.drawHpBar(c, px, py);
  }

  // ─── HP-Balken ────────────────────────────────────────────────────────

  private drawHpBar(c: Creature, px: number, py: number): void {
    const g      = this.g;
    const barW   = TILE - 2;
    const barH   = 2;
    const barX   = px - barW / 2;
    const barY   = py - 12;
    const ratio  = Math.max(0, c.hp / c.maxHp);

    // Hintergrund
    g.fillStyle(0x000000, 0.6);
    g.fillRect(barX, barY, barW, barH);

    // Füllung
    const barColor = c.type === 'wolf' ? 0xaaaaaa : 0xff4444;
    g.fillStyle(barColor, 1);
    g.fillRect(barX, barY, barW * ratio, barH);
  }
}
