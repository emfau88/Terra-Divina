/**
 * Village — Phase 4 / BuildSite
 *
 * Laufzeit-Zustand eines Dorfes.
 * Kein Phaser, kein Rendering.
 */

import { FactionKey }    from './Faction';
import { Building }      from './Building';
import { BuildingType }  from '@game/data/buildingDefs';

// ─── BuildSite ───────────────────────────────────────────────────────────────

/**
 * Represents an in-progress construction site.
 * Created by ResourceSystem.tryBuild(); completed by ResourceSystem.tickBuildSites().
 * Builder units walk to the site and set state = 'build' while waiting.
 */
export interface BuildSite {
  x: number;
  y: number;
  type: BuildingType;
  faction: FactionKey;
  ticksRemaining: number;
  totalTicks: number;
  /** Prevents multiple builders rushing the same site. null = unassigned. */
  assignedUnitId: number | null;
}

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

  // ─── Bau-Stellen (BuildSite-System) ──────────────────────────────────────
  buildSites: BuildSite[] = [];

  constructor(faction: FactionKey, x: number, y: number) {
    this.faction = faction;
    this.x       = x;
    this.y       = y;
  }
}
