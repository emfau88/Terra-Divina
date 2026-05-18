/**
 * Unit — Phase 13C
 *
 * Laufzeit-Zustand einer einzelnen Einheit. Kein Phaser, kein Rendering.
 * Neu: Visuelle Interpolationsfelder für sanfte Bewegung zwischen Kacheln.
 */

import { FactionKey }  from '@game/factions/Faction';
import { UnitRole }    from './UnitRoles';
import { UNIT_DEFS }   from '@game/data/unitDefs';
import { TILE }        from '@game/config';

let nextUnitId = 1;

export type UnitState =
  | 'born'
  | 'idle'
  | 'wander'
  | 'chop'
  | 'forage'
  | 'return'
  | 'repair'
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

  // ─── Visuelle Bewegungsinterpolation (Phase 13C) ─────────────────────────

  /** Aktueller Pixel-X für die Darstellung (interpoliert). */
  visualX: number;

  /** Aktueller Pixel-Y für die Darstellung (interpoliert). */
  visualY: number;

  // ─── Treffer-Flash (Phase 13D) ────────────────────────────────────────────

  /** Treffer-Flash Timer in ms — Einheit wird weiß/gelb dargestellt wenn > 0. */
  hitFlash: number = 0;

  constructor(faction: FactionKey, role: UnitRole, x: number, y: number) {
    this.id      = nextUnitId++;
    this.faction = faction;
    this.role    = role;
    this.x       = x;
    this.y       = y;
    this.maxHp   = UNIT_DEFS[role].maxHp;
    this.hp      = this.maxHp;

    // Visuelle Position direkt auf Kachelmittelpunkt initialisieren
    this.visualX = x * TILE + TILE / 2;
    this.visualY = y * TILE + TILE / 2;
  }
}
