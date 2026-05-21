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
import { TILE, COLS, ROWS } from '@game/config';
import { TerritorySystem } from '@game/world/TerritorySystem';

export class BuildingRenderer {
  private static readonly BUILDING_DISPLAY_SIZE = {
    hall: 61,
    tower: 48,
    default: 52,
    buildSite: 50,
  } as const;

  private readonly scene:   Phaser.Scene;
  private readonly buildG:  Phaser.GameObjects.Graphics;
  private readonly shadowG: Phaser.GameObjects.Graphics;
  private readonly buildingSprites = new Map<number, Phaser.GameObjects.Image>();
  private readonly siteSprites = new Map<string, Phaser.GameObjects.Image>();
  private territorySystem: TerritorySystem | null = null;

  /** Alle bekannten Dörfer — werden für Territorium-Auren benötigt. */
  private villages: Partial<Record<FactionKey, Village>> = {};

  /**
   * Fix 4 — War territory pulse.
   * When true, territory auras are drawn brighter with a red/orange tint.
   * Set by GameScene each village-tick via setWarState().
   */
  isAtWar: boolean = false;

  constructor(
    scene:          Phaser.Scene,
    buildGraphics:  Phaser.GameObjects.Graphics,
    shadowGraphics: Phaser.GameObjects.Graphics,
  ) {
    this.scene   = scene;
    this.buildG  = buildGraphics;
    this.shadowG = shadowGraphics;
  }

  // ─── Öffentliche API ─────────────────────────────────────────────────────

  setVillages(villages: Partial<Record<FactionKey, Village>>): void {
    this.villages = villages;
  }

  setTerritorySystem(territorySystem: TerritorySystem): void {
    this.territorySystem = territorySystem;
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

    const liveBuildingIds = new Set<number>();
    for (const b of buildings) {
      if (b.dead) continue;
      liveBuildingIds.add(b.id);
      this.drawBuilding(b);
    }

    const liveSiteKeys = new Set<string>();
    // Draw all active BuildSites as scaffolding
    for (const key of FACTION_KEYS) {
      const v = this.villages[key];
      if (!v || v.buildSites.length === 0) continue;
      for (const site of v.buildSites) {
        liveSiteKeys.add(this.buildSiteKey(site));
        this.drawBuildSite(site);
      }
    }

    for (const [id, sprite] of this.buildingSprites) {
      if (!liveBuildingIds.has(id)) {
        sprite.destroy();
        this.buildingSprites.delete(id);
      }
    }
    for (const [key, sprite] of this.siteSprites) {
      if (!liveSiteKeys.has(key)) {
        sprite.destroy();
        this.siteSprites.delete(key);
      }
    }
  }

  // ─── Territorium-Auren ───────────────────────────────────────────────────

  private drawTerritoryAuras(): void {
    if (this.territorySystem) {
      this.drawClaimTerritoryAuras();
      return;
    }

    for (const key of FACTION_KEYS) {
      const v = this.villages[key];
      if (!v) continue;
      const f = FACTIONS[key];
      const t = v.territory;

      // Square tile-aligned territory border (WorldBox-style).
      // The rectangle covers all tiles within `territory` tiles of the village center,
      // clamped to the world grid bounds.
      const left   = Math.max(0,    v.x - t)     * TILE;
      const top    = Math.max(0,    v.y - t)     * TILE;
      const right  = Math.min(COLS, v.x + t + 1) * TILE;
      const bottom = Math.min(ROWS, v.y + t + 1) * TILE;
      const w = right  - left;
      const h = bottom - top;

      // Fix 4 — War territory pulse: stronger alpha + orange-red tint at war.
      // Normal: fill 0.06 alpha, faction color, thin 1.5px border at 0.4 alpha.
      // At war:  fill 0.18 alpha, orange-red (0xff4422), border at 0.7 alpha.
      const rectColor = this.isAtWar ? 0xff4422 : f.color;
      const fillAlpha = this.isAtWar ? 0.18     : 0.06;
      const lineAlpha = this.isAtWar ? 0.70     : 0.42;
      const lineWidth = this.isAtWar ? 2        : 1.5;

      // Subtle fill
      this.shadowG.fillStyle(rectColor, fillAlpha);
      this.shadowG.fillRect(left, top, w, h);

      // Crisp rectangular border — square corners, tile-aligned
      this.shadowG.lineStyle(lineWidth, rectColor, lineAlpha);
      this.shadowG.strokeRect(left, top, w, h);
    }
  }

  private drawClaimTerritoryAuras(): void {
    for (const key of FACTION_KEYS) {
      const f = FACTIONS[key];
      const claims = this.territorySystem?.claimsForFaction(key) ?? [];
      if (claims.length === 0) continue;

      const rectColor = this.isAtWar ? 0xff4422 : f.color;
      const fillAlpha = this.isAtWar ? 0.16     : 0.055;
      const lineAlpha = this.isAtWar ? 0.66     : 0.32;
      const lineWidth = this.isAtWar ? 2        : 1.25;

      this.shadowG.fillStyle(rectColor, fillAlpha);
      for (const claim of claims) {
        this.shadowG.fillRect(claim.x * TILE, claim.y * TILE, claim.w * TILE, claim.h * TILE);
      }

      this.shadowG.lineStyle(lineWidth, rectColor, lineAlpha);
      for (const claim of claims) {
        this.shadowG.strokeRect(claim.x * TILE, claim.y * TILE, claim.w * TILE, claim.h * TILE);
      }
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
    this.shadowG.fillEllipse(px + 9, py + 15, 24, 9);

    // Schadensindikator: Gebäude werden dunkler je beschädigter
    const dmgAlpha = 0.5 + 0.5 * (b.hp / b.maxHp);

    const key = b.hp < b.maxHp * 0.22 && !b.isIndestructible ? 'building-ruin' : `building-${b.type}`;
    if (this.updateBuildingSprite(b, key, px, py, dmgAlpha)) {
      this.drawFactionMark(px, py, f.color);
    } else {
      switch (b.type) {
        case 'hall':     this.drawHall(g, px, py, c, dmgAlpha);     break;
        case 'hut':      this.drawHut(g, px, py, c, dmgAlpha);      break;
        case 'farm':     this.drawFarm(g, px, py, dmgAlpha);        break;
        case 'wood':     this.drawWood(g, px, py, dmgAlpha);        break;
        case 'tower':    this.drawTower(g, px, py, c, dmgAlpha);    break;
        case 'outpost':  this.drawOutpost(g, px, py, c, dmgAlpha);  break;
        case 'barracks': this.drawBarracks(g, px, py, c, dmgAlpha); break;
      }
    }

    // Treffer-Flash: rote halbtransparente Überlagerung über der Kachel (Phase 13E)
    if (b.hitFlash > 0) {
      g.fillStyle(0xff3333, 0.35);
      g.fillRect(px, py, TILE, TILE);
    }
  }

  private drawFactionMark(px: number, py: number, color: number): void {
    this.buildG.fillStyle(color, 0.92);
    this.buildG.fillCircle(px + 14, py + 4, 2);
  }

  private updateBuildingSprite(
    b: Building,
    key: string,
    px: number,
    py: number,
    dmgAlpha: number,
  ): boolean {
    if (!this.scene.textures.exists(key)) return false;

    let sprite = this.buildingSprites.get(b.id);
    if (!sprite) {
      sprite = this.scene.add.image(px, py, key);
      sprite.setDepth(39);
      sprite.setOrigin(0.5, 1);
      this.buildingSprites.set(b.id, sprite);
    }

    const size = b.type === 'hall'
      ? BuildingRenderer.BUILDING_DISPLAY_SIZE.hall
      : b.type === 'tower'
        ? BuildingRenderer.BUILDING_DISPLAY_SIZE.tower
        : BuildingRenderer.BUILDING_DISPLAY_SIZE.default;
    sprite.setTexture(key);
    sprite.setPosition(Math.round(px + TILE / 2), Math.round(py + TILE + 2));
    sprite.setDisplaySize(size, size);
    sprite.setAlpha(1);
    sprite.setTint(dmgAlpha < 0.82 ? 0xbfa082 : 0xffffff);
    sprite.setVisible(true);
    return true;
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
    this.shadowG.fillEllipse(px + 9, py + 14, 22, 8);

    // Dark fill — 30% alpha
    if (!this.updateBuildSiteSprite(site, px, py)) {
      g.fillStyle(0x111111, 0.3);
      g.fillRect(px + ox, py + ox, size, size);

    // Scaffold border — faction color at 60% alpha
    g.lineStyle(1.5, f.color, 0.6);
    g.strokeRect(px + ox, py + ox, size, size);

    // Diagonal scaffold lines (give it a construction-site feel)
    g.lineStyle(1, f.color, 0.25);
    g.lineBetween(px + ox,        py + ox,        px + ox + size, py + ox + size);
      g.lineBetween(px + ox + size, py + ox,        px + ox,        py + ox + size);
    }

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

  private updateBuildSiteSprite(site: BuildSite, px: number, py: number): boolean {
    if (!this.scene.textures.exists('building-buildsite')) return false;

    const key = this.buildSiteKey(site);
    let sprite = this.siteSprites.get(key);
    if (!sprite) {
      sprite = this.scene.add.image(px, py, 'building-buildsite');
      sprite.setDepth(38);
      sprite.setOrigin(0.5, 1);
      this.siteSprites.set(key, sprite);
    }

    sprite.setPosition(Math.round(px + TILE / 2), Math.round(py + TILE + 1));
    sprite.setDisplaySize(
      BuildingRenderer.BUILDING_DISPLAY_SIZE.buildSite,
      BuildingRenderer.BUILDING_DISPLAY_SIZE.buildSite,
    );
    sprite.setVisible(true);
    return true;
  }

  private buildSiteKey(site: BuildSite): string {
    return `${site.faction}:${site.type}:${site.x}:${site.y}`;
  }
}
