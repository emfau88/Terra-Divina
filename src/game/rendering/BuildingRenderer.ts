/**
 * BuildingRenderer — Phase 4
 *
 * Zeichnet prozedurale Gebäude-Silhouetten und Territorium-Auren.
 *
 * Regeln:
 * - Mutiert keinen Spielzustand.
 * - Zwei Graphics-Objekte: shadowG (Auren + Schatten) und buildG (Gebäude).
 *   shadowG liegt unter buildG, damit Auren nicht Gebäude überdecken.
 */

import Phaser from 'phaser';
import { Building } from '@game/factions/Building';
import { Village }  from '@game/factions/Village';
import { FACTIONS, FactionKey, FACTION_KEYS } from '@game/factions/Faction';
import { TILE } from '@game/config';

export class BuildingRenderer {
  private readonly buildG:  Phaser.GameObjects.Graphics;
  private readonly shadowG: Phaser.GameObjects.Graphics;

  /** Alle bekannten Dörfer — werden für Territorium-Auren benötigt. */
  private villages: Partial<Record<FactionKey, Village>> = {};

  constructor(
    buildGraphics:  Phaser.GameObjects.Graphics,
    shadowGraphics: Phaser.GameObjects.Graphics,
  ) {
    this.buildG  = buildGraphics;
    this.shadowG = shadowGraphics;
  }

  // ─── Öffentliche API ─────────────────────────────────────────────────────

  setVillages(villages: Partial<Record<FactionKey, Village>>): void {
    this.villages = villages;
  }

  /** Vollständiges Neuzeichnen aller Gebäude und Auren. */
  drawAll(buildings: Building[]): void {
    this.buildG.clear();
    this.shadowG.clear();

    this.drawTerritoryAuras();

    for (const b of buildings) {
      if (b.dead) continue;
      this.drawBuilding(b);
    }
  }

  // ─── Territorium-Auren ───────────────────────────────────────────────────

  private drawTerritoryAuras(): void {
    for (const key of FACTION_KEYS) {
      const v = this.villages[key];
      if (!v) continue;
      const f  = FACTIONS[key];
      const cx = v.x * TILE + TILE / 2;
      const cy = v.y * TILE + TILE / 2;
      const r  = v.territory * TILE;

      // Weicher Füll-Kreis
      this.shadowG.fillStyle(f.color, 0.055);
      this.shadowG.fillCircle(cx, cy, r);

      // Subtile Umriss-Linie
      this.shadowG.lineStyle(2, f.color, 0.14);
      this.shadowG.strokeCircle(cx, cy, r);
    }
  }

  // ─── Einzelnes Gebäude ───────────────────────────────────────────────────

  private drawBuilding(b: Building): void {
    const g  = this.buildG;
    const px = b.x * TILE;
    const py = b.y * TILE;
    const f  = FACTIONS[b.faction];
    const c  = f.villageColor;

    // Boden-Schatten
    this.shadowG.fillStyle(0x000000, 0.24);
    this.shadowG.fillEllipse(px + 9, py + 15, 18, 7);

    // Schadensindikator: Gebäude werden dunkler je beschädigter
    const dmgAlpha = 0.5 + 0.5 * (b.hp / b.maxHp);

    switch (b.type) {
      case 'hall':     this.drawHall(g, px, py, c, dmgAlpha);     break;
      case 'hut':      this.drawHut(g, px, py, c, dmgAlpha);      break;
      case 'farm':     this.drawFarm(g, px, py, dmgAlpha);         break;
      case 'wood':     this.drawWood(g, px, py, dmgAlpha);         break;
      case 'tower':    this.drawTower(g, px, py, c, dmgAlpha);    break;
      case 'outpost':  this.drawOutpost(g, px, py, c, dmgAlpha);  break;
      case 'barracks': this.drawBarracks(g, px, py, c, dmgAlpha); break;
    }
  }

  // ─── Gebäude-Silhouetten (aus Referenz-Prototyp portiert) ────────────────

  private drawHall(
    g: Phaser.GameObjects.Graphics,
    px: number, py: number,
    c: number, a: number,
  ): void {
    g.fillStyle(0x3b261a, a);
    g.fillRoundedRect(px + 2, py + 7, 14, 9, 3);
    g.fillStyle(c, a);
    g.fillTriangle(px + 1, py + 8, px + 9, py + 1, px + 17, py + 8);
    g.fillStyle(0xffe6ad, a * 0.9);
    g.fillRect(px + 7, py + 10, 4, 6);
  }

  private drawHut(
    g: Phaser.GameObjects.Graphics,
    px: number, py: number,
    c: number, a: number,
  ): void {
    g.fillStyle(0x62422c, a);
    g.fillRoundedRect(px + 4, py + 8, 11, 8, 3);
    g.fillStyle(c, a * 0.95);
    g.fillTriangle(px + 3, py + 9, px + 9, py + 3, px + 16, py + 9);
  }

  private drawFarm(
    g: Phaser.GameObjects.Graphics,
    px: number, py: number,
    a: number,
  ): void {
    g.fillStyle(0x7b5f2e, a);
    g.fillRoundedRect(px + 2, py + 4, 14, 12, 3);
    g.lineStyle(1, 0xd6c36a, a * 0.75);
    for (let i = 0; i < 3; i++) {
      g.lineBetween(px + 4, py + 6 + i * 4, px + 15, py + 6 + i * 4);
    }
  }

  private drawWood(
    g: Phaser.GameObjects.Graphics,
    px: number, py: number,
    a: number,
  ): void {
    g.fillStyle(0x6d492e, a);
    g.fillRoundedRect(px + 3, py + 9, 13, 7, 2);
    g.fillStyle(0xc38b52, a);
    g.fillCircle(px + 6,  py + 9, 3);
    g.fillCircle(px + 11, py + 8, 3);
  }

  private drawTower(
    g: Phaser.GameObjects.Graphics,
    px: number, py: number,
    c: number, a: number,
  ): void {
    g.fillStyle(0x4e5963, a);
    g.fillRect(px + 5, py + 5, 9, 12);
    g.fillStyle(c, a);
    g.fillTriangle(px + 3, py + 6, px + 9, py + 1, px + 15, py + 6);
  }

  private drawOutpost(
    g: Phaser.GameObjects.Graphics,
    px: number, py: number,
    c: number, a: number,
  ): void {
    g.fillStyle(0x3a3025, a);
    g.fillRoundedRect(px + 4, py + 8, 10, 8, 2);
    g.fillStyle(c, a * 0.95);
    g.fillTriangle(px + 9, py + 2, px + 9, py + 12, px + 16, py + 5);
    g.lineStyle(2, 0x2b211a, a * 0.95);
    g.lineBetween(px + 9, py + 4, px + 9, py + 16);
  }

  private drawBarracks(
    g: Phaser.GameObjects.Graphics,
    px: number, py: number,
    c: number, a: number,
  ): void {
    g.fillStyle(0x51372f, a);
    g.fillRoundedRect(px + 3, py + 7, 13, 9, 2);
    g.fillStyle(c, a * 0.95);
    g.fillRect(px + 4, py + 4, 11, 4);
    g.fillStyle(0x171717, a * 0.8);
    g.fillRect(px + 7, py + 11, 4, 5);
  }
}
