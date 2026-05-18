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

    // Boden-Schatten
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(px, py + 6, 13, 5);

    // Körper — bei aktivem Treffer-Flash in hellem Weiß-Gelb zeichnen
    const bodyColor = u.hitFlash > 0 ? 0xffffa0 : fc.color;
    g.fillStyle(bodyColor, 1);
    g.fillCircle(px, py, 6);

    // Glanzpunkt
    g.fillStyle(0xffffff, 0.85);
    g.fillCircle(px - 2, py - 2, 1.2);

    // Beine / Basis
    g.fillStyle(fc.dark, 0.95);
    g.fillRect(px - 4, py + 4, 8, 4);

    // Rollenindikator
    switch (u.role) {
      case 'guard':
        // Weißer Ring
        g.lineStyle(2, 0xffffff, 0.75);
        g.strokeCircle(px, py, 7.2);
        break;
      case 'raider':
        // Rot-oranges Dreieck oben = gut sichtbare Angriffsspitze (Phase 13E)
        g.fillStyle(0xff6633, 1.0);
        g.fillTriangle(px - 4, py - 8, px + 4, py - 8, px, py - 14);
        break;
      case 'builder':
        // Kleines gelbes Quadrat = Werkzeug
        g.fillStyle(0xffd36c, 0.95);
        g.fillRect(px + 4, py - 8, 5, 5);
        break;
      // gatherer: kein extra Indikator
    }

    // HP-Balken (nur wenn beschädigt)
    if (u.hp < u.maxHp) {
      g.fillStyle(0x1b1111, 0.8);
      g.fillRect(px - 7, py - 11, 14, 2);
      const ratio = u.hp / u.maxHp;
      g.fillStyle(ratio > 0.45 ? 0x7eff8a : 0xff4b4b, 1);
      g.fillRect(px - 7, py - 11, 14 * ratio, 2);
    }

    // Ressourcen-Indikator (trägt etwas)
    if (u.carryFood + u.carryWood > 0) {
      g.fillStyle(0xffe28a, 0.9);
      g.fillCircle(px + 6, py - 6, 2.5);
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
