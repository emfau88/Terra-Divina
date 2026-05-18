/**
 * Building — Phase 4
 *
 * Laufzeit-Zustand eines einzelnen Gebäudes.
 * Kein Phaser, kein Rendering.
 */

import { FactionKey }   from './Faction';
import { FACTION_TRAITS } from './FactionTraits';
import { BuildingType, BUILDING_DEFS } from '@game/data/buildingDefs';

let nextId = 0;

export class Building {
  readonly id:      number;
  readonly faction: FactionKey;
  readonly type:    BuildingType;
  readonly x:       number;
  readonly y:       number;

  hp:   number;
  dead: boolean = false;

  /** Treffer-Flash Timer in ms — Gebäude wird rot überlagert wenn > 0 (Phase 13E). */
  hitFlash: number = 0;

  constructor(faction: FactionKey, type: BuildingType, x: number, y: number) {
    this.id      = nextId++;
    this.faction = faction;
    this.type    = type;
    this.x       = x;
    this.y       = y;
    this.hp      = BUILDING_DEFS[type].maxHp + FACTION_TRAITS[faction].buildingHpBonus;
  }

  get maxHp(): number {
    return BUILDING_DEFS[this.type].maxHp + FACTION_TRAITS[this.faction].buildingHpBonus;
  }

  get isIndestructible(): boolean {
    return BUILDING_DEFS[this.type].indestructible;
  }
}
