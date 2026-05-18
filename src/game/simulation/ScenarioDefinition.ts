/**
 * ScenarioDefinition — Phase 20
 *
 * Datei-Definitionen für alle Szenarien.
 * Reine Daten — kein Phaser, kein State.
 */

import { WorldSetupConfig } from '@game/world/WorldSetupConfig';

export type ScenarioId =
  | 'survive30'
  | 'stopWildfire'
  | 'keepPeace'
  | 'humanLastStand'
  | 'orcRaid';

export type ScenarioWinCondition =
  | 'survive_days'    // Mindestens ein Dorf überlebt N Tage
  | 'no_fire_by_day'  // Kein Feuer aktiv nach Tag N
  | 'no_war_by_day'   // Kein Krieg vor Tag N
  | 'faction_survives'; // Bestimmte Fraktion überlebt N Tage

export interface ScenarioGoalDef {
  condition:    ScenarioWinCondition;
  targetDay:    number;
  /** Für faction_survives: welche Fraktion überleben muss. */
  factionKey?:  'human' | 'orc' | 'elf' | 'dwarf';
}

export interface ScenarioDefinition {
  id:          ScenarioId;
  title:       string;
  description: string;
  icon:        string;
  worldConfig: Partial<WorldSetupConfig>;
  goal:        ScenarioGoalDef;
}

export const SCENARIOS: Readonly<Record<ScenarioId, ScenarioDefinition>> = {

  survive30: {
    id:          'survive30',
    title:       '30 Tage überleben',
    description: 'Hilf der Welt, 30 Tage zu überstehen. Halte mindestens ein Dorf am Leben.',
    icon:        '⏳',
    worldConfig: {
      size:      'medium',
      worldType: 'island',
      startMode: 'balanced',
      factions:  ['human', 'orc'],
    },
    goal: {
      condition: 'survive_days',
      targetDay: 30,
    },
  },

  stopWildfire: {
    id:          'stopWildfire',
    title:       'Wildfeuer stoppen',
    description: 'Der Wald brennt! Lösche alle Feuer innerhalb von 20 Tagen.',
    icon:        '🔥',
    worldConfig: {
      size:      'medium',
      worldType: 'forest',
      startMode: 'peaceful',
      factions:  ['human', 'elf'],
    },
    goal: {
      condition: 'no_fire_by_day',
      targetDay: 20,
    },
  },

  keepPeace: {
    id:          'keepPeace',
    title:       'Den Frieden wahren',
    description: 'Verhindere, dass die Fraktionen in den Krieg ziehen. Halte bis Tag 25 Frieden.',
    icon:        '🕊',
    worldConfig: {
      size:      'small',
      worldType: 'island',
      startMode: 'warTorn',
      factions:  ['human', 'orc'],
    },
    goal: {
      condition: 'no_war_by_day',
      targetDay: 25,
    },
  },

  humanLastStand: {
    id:          'humanLastStand',
    title:       'Letztes Gefecht der Menschen',
    description: 'Die Menschen sind überwältigt. Schütze das Menschendorf, bis Tag 20 anbricht.',
    icon:        '🛡',
    worldConfig: {
      size:      'medium',
      worldType: 'island',
      startMode: 'chaos',
      factions:  ['human', 'orc'],
    },
    goal: {
      condition:  'faction_survives',
      targetDay:  20,
      factionKey: 'human',
    },
  },

  orcRaid: {
    id:          'orcRaid',
    title:       'Ork-Überfall',
    description: 'Die Orks greifen an! Überstehe die Angriffswellen bis Tag 15.',
    icon:        '⚔',
    worldConfig: {
      size:      'small',
      worldType: 'island',
      startMode: 'chaos',
      factions:  ['human', 'orc'],
    },
    goal: {
      condition:  'faction_survives',
      targetDay:  15,
      factionKey: 'human',
    },
  },
};

export const SCENARIO_ORDER: ScenarioId[] = [
  'survive30',
  'stopWildfire',
  'keepPeace',
  'humanLastStand',
  'orcRaid',
];
