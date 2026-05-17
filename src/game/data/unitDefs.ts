/**
 * unitDefs — Phase 5
 *
 * Basis-Stats pro Rolle. Kein Phaser, keine Laufzeit-State.
 */

import { UnitRole } from '@game/units/UnitRoles';

export interface UnitDef {
  readonly role:    UnitRole;
  readonly maxHp:   number;
  readonly dmgMin:  number;
  readonly dmgMax:  number;
  readonly cooldown: number; // Angriffs-Cooldown in AI-Ticks
}

export const UNIT_DEFS: Readonly<Record<UnitRole, UnitDef>> = {
  gatherer: { role: 'gatherer', maxHp: 32, dmgMin: 1, dmgMax: 4,  cooldown: 3 },
  builder:  { role: 'builder',  maxHp: 32, dmgMin: 1, dmgMax: 4,  cooldown: 3 },
  guard:    { role: 'guard',    maxHp: 42, dmgMin: 3, dmgMax: 6,  cooldown: 3 },
  raider:   { role: 'raider',   maxHp: 38, dmgMin: 3, dmgMax: 7,  cooldown: 2 },
};
