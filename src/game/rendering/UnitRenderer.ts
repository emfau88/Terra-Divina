/**
 * UnitRenderer — Phase 5
 *
 * Zeichnet alle Einheiten als farbige Kreise mit Rollenindikator und HP-Balken.
 * Portiert aus dem Referenz-Prototyp.
 *
 * Regeln:
 * - Mutiert keinen Spielzustand.
 * - Bekommt ein Graphics-Objekt übergeben, kennt keine Phaser.Scene.
 */

import Phaser from 'phaser';
import { Unit }      from '@game/units/Unit';
import { FACTIONS }  from '@game/factions/Faction';

export class UnitRenderer {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(graphics: Phaser.GameObjects.Graphics) {
    this.g = graphics;
  }

  drawAll(units: Unit[]): void {
    const g = this.g;
    g.clear();

    for (const u of units) {
      if (u.dead) continue;
      this.drawUnit(u);
    }
  }

  private drawUnit(u: Unit): void {
    const g  = this.g;
    const fc = FACTIONS[u.faction];
    // Visuelle Pixel-Position verwenden (interpoliert) statt Kachel-Umrechnung
    const px = u.visualX;
    const py = u.visualY;

    // ─── Role-specific body parameters ──────────────────────────────────────
    // Each role gets a distinct silhouette radius and color treatment.
    let bodyRadius: number;
    let rawColor: number;

    switch (u.role) {
      case 'gatherer':
        // Slightly smaller — lighter/desaturated feel via alpha blend trick
        bodyRadius = 4;
        rawColor   = fc.color;
        break;
      case 'builder':
        bodyRadius = 5;
        rawColor   = fc.color;
        break;
      case 'guard':
        // Larger body, darkened shade (multiply each channel by 0.75)
        bodyRadius = 6;
        rawColor   = UnitRenderer.darkenColor(fc.color, 0.75);
        break;
      case 'raider':
      default:
        bodyRadius = 6;
        rawColor   = fc.color;
        break;
    }

    // Boden-Schatten — scale ellipse width with body size
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(px, py + bodyRadius + 2, bodyRadius * 2 + 1, 5);

    // Körper — bei aktivem Treffer-Flash in hellem Weiß-Gelb zeichnen
    const bodyColor = u.hitFlash > 0 ? 0xffffa0 : rawColor;
    g.fillStyle(bodyColor, 1);
    g.fillCircle(px, py, bodyRadius);

    // Glanzpunkt
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(px - 2, py - 2, 1.2);

    // Beine / Basis
    g.fillStyle(fc.dark, 0.95);
    g.fillRect(px - 4, py + bodyRadius - 1, 8, 4);

    // ─── Role-specific shape indicators ──────────────────────────────────────
    switch (u.role) {
      case 'gatherer':
        // No extra indicator — carry dots already distinguish gatherers
        break;

      case 'builder':
        // Small square "tool" offset to the right
        g.fillStyle(0xffd36c, 0.95);
        g.fillRect(px + 5, py - 2, 3, 3);
        break;

      case 'guard':
        // Small vertical bar above = spear silhouette
        g.fillStyle(fc.dark, 1.0);
        g.fillRect(px - 1, py - 9, 2, 5);
        break;

      case 'raider':
        // Horizontal bar through center = sword belt silhouette
        g.fillStyle(0xff6633, 1.0);
        g.fillRect(px - 3, py - 1, 6, 2);
        // Keep original attack-triangle indicator
        g.fillStyle(0xff6633, 1.0);
        g.fillTriangle(px - 4, py - 8, px + 4, py - 8, px, py - 14);
        break;
    }

    // Fix 2 — War banner: faction-colored flagpole + flag triangle above raider
    // when in an active war-march state. Geometry only, no Text/Sprite.
    // Drawn here (before HP bar) so the banner sits below the HP bar visually.
    if (
      u.role === 'raider' &&
      (u.state === 'march' || u.state === 'raid' || u.state === 'siege')
    ) {
      // Flagpole: thin vertical line, 6px tall, starting just above the unit top
      g.fillStyle(0x4a3010, 1.0);
      g.fillRect(px - 0.5, py - 20, 1, 6);
      // Flag: small filled triangle at the top of the pole, faction color
      g.fillStyle(fc.color, 1.0);
      g.fillTriangle(px, py - 20, px + 5, py - 18, px, py - 16);
    }

    // HP-Balken (nur wenn beschädigt)
    if (u.hp < u.maxHp) {
      g.fillStyle(0x1b1111, 0.8);
      g.fillRect(px - 7, py - 11, 14, 2);
      const ratio = u.hp / u.maxHp;
      g.fillStyle(ratio > 0.45 ? 0x7eff8a : 0xff4b4b, 1);
      g.fillRect(px - 7, py - 11, 14 * ratio, 2);
    }

    // Gatherer carry visual — distinct dots above unit at py-16.
    // Yellow-green dot = carrying food; brown dot = carrying wood.
    // Disappears automatically when carryFood/carryWood return to 0 after delivery.
    if (u.carryFood > 0) {
      // Yellow-green: food/crop colour
      g.fillStyle(0x99e040, 1.0);
      g.fillCircle(px, py - 16, 3);
    }
    if (u.carryWood > 0) {
      // Warm brown: wood colour
      g.fillStyle(0x8b5a2b, 1.0);
      g.fillCircle(px + (u.carryFood > 0 ? 7 : 0), py - 16, 3);
    }

    // Hunger-Indikator: oranges Ausrufezeichen-Punkt über der Einheit
    if (u.isStarving) {
      g.fillStyle(0xff9944, 1.0);
      g.fillCircle(px - 6, py - 13, 2.5);
    }

    // ─── Zustands-Icon (AI-Fix) ─────────────────────────────────────────────
    // Kleines geometrisches Symbol über der Einheit — zeigt lesbar was sie tut.
    // Kein per-Unit Text-Objekt (zu teuer bei 50+ Einheiten) — reine Graphics-Shapes.
    this.drawStateIcon(u, px, py);
  }

  // ─── Color helpers ───────────────────────────────────────────────────────

  /**
   * Multiplies each RGB channel of a packed hex color by `factor` (0–1).
   * Used to produce role-specific shading without requiring extra assets.
   */
  private static darkenColor(color: number, factor: number): number {
    const r = Math.round(((color >> 16) & 0xff) * factor);
    const g = Math.round(((color >>  8) & 0xff) * factor);
    const b = Math.round(( color        & 0xff) * factor);
    return (r << 16) | (g << 8) | b;
  }

  /**
   * Zeichnet ein kleines geometrisches Zustands-Icon über der Einheit.
   *
   * State → Farbe + Form:
   *   gather/chop/forage  → gelbes Rund-Punkt   (Ressource)
   *   build/repair        → oranger kleiner Rect  (Werkzeug)
   *   march/raid/siege    → rotes Dreieck          (Angriff)
   *   patrol/defend       → weißes Diamant         (Schutz)
   *   scout/probe         → hell-blaues Diamant     (Erkundung)
   *   return              → kleines weißes Pfeil-V  (Heimkehren)
   *   fight               → rotes ×-Kreuz           (Kampf — 2 Rects)
   *   flee                → lila Punkt              (Fliehen)
   *   idle/wander/born    → kein Icon
   */
  private drawStateIcon(u: Unit, px: number, py: number): void {
    const g  = this.g;
    const iy = py - 14;   // Icon-Y: 14 px über Einheitenmittelpunkt

    switch (u.state) {
      // ── Ressource ── kleiner gelber Kreis
      case 'chop':
      case 'forage':
        g.fillStyle(0xffe040, 0.95);
        g.fillCircle(px, iy, 3);
        break;

      // ── Bau / Reparatur ── kleines oranges Quadrat
      case 'repair':
        g.fillStyle(0xff8c00, 0.95);
        g.fillRect(px - 2.5, iy - 2.5, 5, 5);
        break;

      // ── Marsch / Belagerung / Plünderung ── rotes Dreieck (Spitze oben)
      case 'march':
      case 'raid':
      case 'siege':
        g.fillStyle(0xff3333, 1.0);
        g.fillTriangle(px - 3.5, iy + 2.5, px + 3.5, iy + 2.5, px, iy - 3.5);
        break;

      // ── Patrouille / Verteidigung ── weißes Diamant
      case 'patrol':
      case 'defend':
        g.fillStyle(0xffffff, 0.9);
        g.fillTriangle(px - 3, iy, px, iy - 4, px + 3, iy);
        g.fillTriangle(px - 3, iy, px + 3, iy, px, iy + 4);
        break;

      // ── Erkundung ── hell-blaues Diamant
      case 'scout':
      case 'probe':
        g.fillStyle(0x88ddff, 0.9);
        g.fillTriangle(px - 3, iy, px, iy - 4, px + 3, iy);
        g.fillTriangle(px - 3, iy, px + 3, iy, px, iy + 4);
        break;

      // ── Heimkehren ── kleines weißes V (zwei dünne Rechtecke)
      case 'return':
        g.fillStyle(0xccffcc, 0.85);
        g.fillRect(px - 3.5, iy - 1, 3, 2);
        g.fillRect(px + 0.5, iy - 1, 3, 2);
        break;

      // ── Kampf ── rotes ×-Kreuz (zwei kurze diagonale Rechtecke)
      case 'fight':
        g.fillStyle(0xff2222, 1.0);
        g.fillRect(px - 3.5, iy - 1, 7, 2);
        g.fillRect(px - 1, iy - 3.5, 2, 7);
        break;

      // ── Fliehen ── lila Punkt
      case 'flee':
      case 'wounded':
        g.fillStyle(0xdd66ff, 0.9);
        g.fillCircle(px, iy, 2.5);
        break;

      // ── Kein Icon ── idle / wander / born / starving
      default:
        break;
    }
  }
}
