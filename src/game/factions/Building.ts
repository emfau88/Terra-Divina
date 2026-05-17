/**
 * Building — Phase 4
 *
 * Laufzeit-Zustand eines einzelnen Gebäudes.
 * Kein Phaser, kein Rendering.
 */

import { FactionKey }   from './Faction';
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

  constructor(faction: FactionKey, type: BuildingType, x: number, y: number) {
    this.id      = nextId++;
    this.faction = faction;
    this.type    = type;
    this.x       = x;
    this.y       = y;
    this.hp      = BUILDING_DEFS[type].maxHp;
  }

  get maxHp(): number {
    return BUILDING_DEFS[this.type].maxHp;
  }

  get isIndestructible(): boolean {
    return BUILDING_DEFS[this.type].indestructible;
  }
}
