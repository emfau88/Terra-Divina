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
import { TILE }      from '@game/config';

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
    const px = u.x * TILE + TILE / 2;
    const py = u.y * TILE + TILE / 2;

    // Boden-Schatten
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(px, py + 6, 13, 5);

    // Körper
    g.fillStyle(fc.color, 1);
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
        // Schwarzes Dreieck oben = Angriffsspitze
        g.fillStyle(0x111111, 0.9);
        g.fillTriangle(px - 3, py - 8, px + 3, py - 8, px, py - 12);
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
  }
}
