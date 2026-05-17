/**
 * Unit — Phase 5
 *
 * Laufzeit-Zustand einer einzelnen Einheit. Kein Phaser, kein Rendering.
 */

import { FactionKey }  from '@game/factions/Faction';
import { UnitRole }    from './UnitRoles';
import { UNIT_DEFS }   from '@game/data/unitDefs';

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

  /** Kachel-Position (ganzzahlig). */
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

  constructor(faction: FactionKey, role: UnitRole, x: number, y: number) {
    this.id      = nextUnitId++;
    this.faction = faction;
    this.role    = role;
    this.x       = x;
    this.y       = y;
    this.maxHp   = UNIT_DEFS[role].maxHp;
    this.hp      = this.maxHp;
  }
}
