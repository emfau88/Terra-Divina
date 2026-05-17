/**
 * HungerSystem — Phase 6
 *
 * Pro Tick:
 * - Nahrungsverbrauch basierend auf Bevölkerung
 * - Hunger-Counter steigt wenn food < 0
 * - Einheiten verlieren HP bei starkem Hunger
 * - Einheiten heilen wenn Nahrung vorhanden
 *
 * Kein Phaser. Mutiert nur Village- und Unit-State.
 */

import { VillageManager }  from '@game/factions/VillageManager';
import { UnitManager }     from '@game/units/UnitManager';
import { FACTION_KEYS, FactionKey } from '@game/factions/Faction';
import { BALANCE }         from '@game/data/balance';

function choice<T>(arr: T[]): T | undefined {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined;
}

function randi(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export class HungerSystem {
  private readonly villages: VillageManager;
  private readonly units:    UnitManager;

  constructor(villages: VillageManager, units: UnitManager) {
    this.villages = villages;
    this.units    = units;
  }

  tick(steps: number): void {
    for (let s = 0; s < steps; s++) {
      for (const key of FACTION_KEYS) {
        this.applyHunger(key);
      }
    }
  }

  private applyHunger(faction: FactionKey): void {
    const v   = this.villages.villages[faction];
    if (!v)  return;
    const pop = this.units.liveCount(faction);
    if (pop === 0) return;

    const consumption = pop * BALANCE.FOOD_CONSUMPTION_PER_UNIT;
    v.food -= consumption;

    if (v.food >= 0) {
      // Versorgt — Hunger abbauen, verletzte Einheiten heilen
      v.hunger = Math.max(0, v.hunger - 0.25);

      if (v.food > 18 && Math.random() < 0.18) {
        const wounded = this.units.units.find(
          u => u.faction === faction && !u.dead && u.hp < u.maxHp,
        );
        if (wounded) wounded.hp = Math.min(wounded.maxHp, wounded.hp + 2);
      }
      return;
    }

    // Kein Essen
    v.food   = 0;
    v.hunger += 0.8;

    if (Math.random() < Math.min(0.85, v.hunger * 0.12)) {
      const victims = this.units.units.filter(
        u => u.faction === faction && !u.dead,
      );
      const u = choice(victims);
      if (u) {
        u.hp    -= randi(2, 5);
        u.state  = 'starving';
        if (u.hp <= 0) u.dead = true;
      }
    }
  }
}
