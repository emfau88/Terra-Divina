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
import { Building }  from '@game/factions/Building';
import { Village }   from '@game/factions/Village';
import { BuildSite } from '@game/factions/Village';
import { FACTIONS, FactionKey, FACTION_KEYS } from '@game/factions/Faction';
import { TILE } from '@game/config';

export class BuildingRenderer {
  private readonly buildG:  Phaser.GameObjects.Graphics;
  private readonly shadowG: Phaser.GameObjects.Graphics;

  /** Alle bekannten Dörfer — werden für Territorium-Auren benötigt. */
  private villages: Partial<Record<FactionKey, Village>> = {};

  /**
   * Fix 4 — War territory pulse.
   * When true, territory auras are drawn brighter with a red/orange tint.
   * Set by GameScene each village-tick via setWarState().
   */
  isAtWar: boolean = false;

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

  /** Fix 4 — called by GameScene each village-tick to sync war state. */
  setWarState(atWar: boolean): void {
    this.isAtWar = atWar;
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

    // Draw all active BuildSites as scaffolding
    for (const key of FACTION_KEYS) {
      const v = this.villages[key];
      if (!v || v.buildSites.length === 0) continue;
      for (const site of v.buildSites) {
        this.drawBuildSite(site);
      }
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

      // Fix 4 — War territory pulse: brighter fill + orange-red tint when at war.
      // Normal: fill 0.055 alpha, faction color.
      // At war:  fill 0.22 alpha, blended toward red/orange (0xff4422).
      const fillColor  = this.isAtWar ? 0xff4422 : f.color;
      const fillAlpha  = this.isAtWar ? 0.22     : 0.055;
      const lineAlpha  = this.isAtWar ? 0.38     : 0.14;

      // Weicher Füll-Kreis
      this.shadowG.fillStyle(fillColor, fillAlpha);
      this.shadowG.fillCircle(cx, cy, r);

      // Subtile Umriss-Linie
      this.shadowG.lineStyle(2, fillColor, lineAlpha);
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

    // Treffer-Flash: rote halbtransparente Überlagerung über der Kachel (Phase 13E)
    if (b.hitFlash > 0) {
      g.fillStyle(0xff3333, 0.35);
      g.fillRect(px, py, TILE, TILE);
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

  // ─── BuildSite Scaffold ──────────────────────────────────────────────────

  /**
   * Renders an in-progress BuildSite as a scaffold outline with a progress bar.
   * Scaffold feel: thin border in faction color, very dark fill, small progress bar at top.
   */
  private drawBuildSite(site: BuildSite): void {
    const g    = this.buildG;
    const f    = FACTIONS[site.faction];
    const px   = site.x * TILE;
    const py   = site.y * TILE;
    const size = 12; // slightly smaller than a tile
    const ox   = (TILE - size) / 2; // center within tile

    // Ground shadow (subtle)
    this.shadowG.fillStyle(0x000000, 0.15);
    this.shadowG.fillEllipse(px + 9, py + 14, 14, 5);

    // Dark fill — 30% alpha
    g.fillStyle(0x111111, 0.3);
    g.fillRect(px + ox, py + ox, size, size);

    // Scaffold border — faction color at 60% alpha
    g.lineStyle(1.5, f.color, 0.6);
    g.strokeRect(px + ox, py + ox, size, size);

    // Diagonal scaffold lines (give it a construction-site feel)
    g.lineStyle(1, f.color, 0.25);
    g.lineBetween(px + ox,        py + ox,        px + ox + size, py + ox + size);
    g.lineBetween(px + ox + size, py + ox,        px + ox,        py + ox + size);

    // Progress bar (top of tile, above scaffold box)
    const barW    = size;
    const barH    = 3;
    const barX    = px + ox;
    const barY    = py + ox - barH - 1;
    const progress = (site.totalTicks - site.ticksRemaining) / site.totalTicks;

    // Bar background
    g.fillStyle(0x222222, 0.8);
    g.fillRect(barX, barY, barW, barH);

    // Bar fill — faction color
    g.fillStyle(f.color, 0.9);
    g.fillRect(barX, barY, Math.floor(barW * progress), barH);
  }
}
