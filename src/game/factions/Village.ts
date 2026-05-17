/**
 * Village — Phase 4
 *
 * Laufzeit-Zustand eines Dorfes.
 * Kein Phaser, kein Rendering.
 */

import { FactionKey } from './Faction';
import { Building }   from './Building';

export class Village {
  readonly faction: FactionKey;

  /** Mittelpunkt-Kachel des Dorfes. */
  readonly x: number;
  readonly y: number;

  // ─── Ressourcen ───────────────────────────────────────────────────────────
  food:  number = 24;
  wood:  number = 18;

  // ─── Wachstum ─────────────────────────────────────────────────────────────
  level:     number = 1;
  expansion: number = 0;

  // ─── Hunger-Druck (steigt, wenn food < 0) ────────────────────────────────
  hunger: number = 0;

  // ─── Territorium-Radius (in Kacheln) ─────────────────────────────────────
  territory: number = 7;

  // ─── Gebäude-Liste ────────────────────────────────────────────────────────
  readonly buildings: Building[] = [];

  constructor(faction: FactionKey, x: number, y: number) {
    this.faction = faction;
    this.x       = x;
    this.y       = y;
  }
}
