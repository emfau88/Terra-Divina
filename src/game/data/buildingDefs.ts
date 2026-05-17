/**
 * buildingDefs — Phase 4
 *
 * Statische Definitionen für jeden Gebäude-Typ.
 * Kein Phaser, kein Spielzustand — nur Konstanten.
 */

export type BuildingType =
  | 'hall'
  | 'hut'
  | 'farm'
  | 'wood'
  | 'tower'
  | 'outpost'
  | 'barracks';

export interface BuildingDef {
  readonly type:       BuildingType;
  readonly maxHp:      number;
  /** Kurzer Effekt-Text für den Inspect-Panel. */
  readonly effectText: string;
  /** Ob dieses Gebäude unzerstörbar ist (HP sinkt auf Min statt 0). */
  readonly indestructible: boolean;
}

export const BUILDING_DEFS: Readonly<Record<BuildingType, BuildingDef>> = {
  hall: {
    type:            'hall',
    maxHp:           240,
    effectText:      'Fraktions-HQ, kann nicht zerstört werden',
    indestructible:  true,
  },
  hut: {
    type:            'hut',
    maxHp:           80,
    effectText:      'Erhöht Bevölkerungsobergrenze',
    indestructible:  false,
  },
  farm: {
    type:            'farm',
    maxHp:           80,
    effectText:      'Erzeugt passiv Nahrung',
    indestructible:  false,
  },
  wood: {
    type:            'wood',
    maxHp:           80,
    effectText:      'Erzeugt passiv Holz',
    indestructible:  false,
  },
  tower: {
    type:            'tower',
    maxHp:           130,
    effectText:      'Defensivbauwerk, hohe Trefferpunkte',
    indestructible:  false,
  },
  outpost: {
    type:            'outpost',
    maxHp:           80,
    effectText:      'Grenzposten, Wachen patrouillieren hier',
    indestructible:  false,
  },
  barracks: {
    type:            'barracks',
    maxHp:           80,
    effectText:      'Erhöht Räuber-Spawn-Rate',
    indestructible:  false,
  },
};
