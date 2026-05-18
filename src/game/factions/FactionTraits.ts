/**
 * FactionTraits — Phase 18
 *
 * Stat-Modifikatoren pro Fraktion.
 * Alle Werte sind Multiplikatoren (1.0 = kein Effekt) oder absolute Boni.
 *
 * Elfen: Wald-Affinität, passives Heilen im Wald, geringere Aggression
 * Zwerge: Berg-Affinität, härtere Gebäude, langsameres Wachstum
 */

import { FactionKey } from './Faction';

export interface FactionTraits {
  /** Multiplikator auf Holz-Sammelrate im Wald (1.0 = normal). */
  woodGatherMult:    number;
  /** Multiplikator auf Nahrungs-Sammelrate auf Gras/Sand (1.0 = normal). */
  foodGatherMult:    number;
  /** HP-Bonus auf alle Gebäude dieser Fraktion (absolut). */
  buildingHpBonus:   number;
  /** Multiplikator auf Spawn-Kosten (1.0 = normal, > 1 = teurer = langsameres Wachstum). */
  spawnCostMult:     number;
  /** Passives HP-Heilen pro ResourceSystem-Tick wenn Einheit auf Wald-Tile steht. */
  forestHealPerTick: number;
  /** Multiplikator auf Raider-Aggressions-Radius (1.0 = normal, < 1 = weniger aggressiv). */
  raiderAggrMult:    number;
  /** Multiplikator auf Einheiten-MaxHP (1.0 = normal). */
  unitHpMult:        number;
}

const DEFAULT: FactionTraits = {
  woodGatherMult:    1.0,
  foodGatherMult:    1.0,
  buildingHpBonus:   0,
  spawnCostMult:     1.0,
  forestHealPerTick: 0,
  raiderAggrMult:    1.0,
  unitHpMult:        1.0,
};

export const FACTION_TRAITS: Readonly<Record<FactionKey, FactionTraits>> = {
  human: { ...DEFAULT },

  orc: {
    ...DEFAULT,
    unitHpMult:     1.15,   // Orks sind robuster
    raiderAggrMult: 1.3,    // aggressiver
    spawnCostMult:  0.9,    // schnelleres Wachstum
  },

  elf: {
    ...DEFAULT,
    woodGatherMult:    1.5,   // Elfen sammeln mehr Holz im Wald
    foodGatherMult:    0.85,  // aber weniger Nahrung auf offenem Land
    forestHealPerTick: 1,     // passives Heilen im Wald
    raiderAggrMult:    0.6,   // viel weniger aggressiv
    spawnCostMult:     1.15,  // langsameres Wachstum
  },

  dwarf: {
    ...DEFAULT,
    buildingHpBonus:  20,    // härtere Gebäude
    unitHpMult:       1.2,   // zähere Einheiten
    spawnCostMult:    1.25,  // sehr langsames Wachstum
    woodGatherMult:   0.8,   // weniger effizient im Wald
    foodGatherMult:   1.1,   // gut im Sammeln auf Stein/Sand
    raiderAggrMult:   0.85,  // eher defensiv
  },
};
