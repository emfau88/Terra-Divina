/**
 * Unit — Phase 13C
 *
 * Laufzeit-Zustand einer einzelnen Einheit. Kein Phaser, kein Rendering.
 * Neu: Visuelle Interpolationsfelder für sanfte Bewegung zwischen Kacheln.
 */

import { FactionKey }    from '@game/factions/Faction';
import { FACTION_TRAITS } from '@game/factions/FactionTraits';
import { UnitRole }       from './UnitRoles';
import { UNIT_DEFS }      from '@game/data/unitDefs';
import { TILE }           from '@game/config';

let nextUnitId = 1;

export type UnitState =
  | 'born'
  | 'idle'
  | 'wander'
  | 'chop'
  | 'forage'
  | 'return'
  | 'repair'
  | 'build'
  | 'patrol'
  | 'defend'
  | 'scout'
  | 'probe'
  | 'march'
  | 'raid'
  | 'siege'
  | 'fight'
  | 'flee'
  | 'wounded'
  | 'starving';

export class Unit {
  readonly id:      number;
  readonly faction: FactionKey;
  homeVillageId:    number | null;
  role:             UnitRole;

  /** Kachel-Position (ganzzahlig) — wird von der KI verwendet. */
  x: number;
  y: number;

  hp:    number;
  maxHp: number;

  state: UnitState = 'born';

  /** Aktuelles Bewegungsziel (Kachel-Koordinaten). */
  target: { x: number; y: number } | null = null;

  /** Ressourcen, die diese Einheit gerade trägt. */
  carryFood: number = 0;
  carryWood: number = 0;

  /** Angriffs-Cooldown-Zähler (in AI-Ticks). */
  cd: number = 0;

  /** Denkpause — Einheit wartet N Ticks vor neuem Ziel. */
  think: number = 0;

  dead: boolean = false;

  // ─── Hunger-Status (Fix 2) ────────────────────────────────────────────────

  /** true wenn diese Einheit gerade Hungeschaden erhält (kein Essen in Dorf). */
  isStarving: boolean = false;

  // ─── Visuelle Bewegungsinterpolation (Phase 13C) ─────────────────────────

  /** Aktueller Pixel-X für die Darstellung (interpoliert). */
  visualX: number;

  /** Aktueller Pixel-Y für die Darstellung (interpoliert). */
  visualY: number;

  // ─── Treffer-Flash (Phase 13D) ────────────────────────────────────────────

  /** Treffer-Flash Timer in ms — Einheit wird weiß/gelb dargestellt wenn > 0. */
  hitFlash: number = 0;

  // ─── Ziel-Persistenz (Phase AI-Fix) ──────────────────────────────────────

  /** Persistentes Bewegungsziel (Kachel-Koordinaten) für wandernde Einheiten. */
  targetX: number = 0;
  targetY: number = 0;

  /**
   * Verbleibende Ticks für das aktuelle Ziel.
   * > 0 → Einheit hält das aktuelle Ziel und nimmt kein neues an.
   * = 0 → Einheit wählt beim nächsten Wandern ein neues Ziel.
   */
  persistTicks: number = 0;

  constructor(faction: FactionKey, role: UnitRole, x: number, y: number, homeVillageId: number | null = null) {
    this.id      = nextUnitId++;
    this.faction = faction;
    this.homeVillageId = homeVillageId;
    this.role    = role;
    this.x       = x;
    this.y       = y;
    this.maxHp   = Math.round(UNIT_DEFS[role].maxHp * FACTION_TRAITS[faction].unitHpMult);
    this.hp      = this.maxHp;

    // Visuelle Position direkt auf Kachelmittelpunkt initialisieren
    this.visualX = x * TILE + TILE / 2;
    this.visualY = y * TILE + TILE / 2;
  }
}
