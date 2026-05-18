/**
 * WorldSetupConfig — Phase 18
 *
 * Konfigurationstypen und Standardwerte für die Weltgenerierung.
 * Wird beim Start einer neuen Welt aus dem MainMenuScene übergeben.
 */

import { FactionKey } from '@game/factions/Faction';
import { ScenarioId } from '@game/simulation/ScenarioDefinition';

/** Größe der Welt in Kacheln. */
export type WorldSize = 'small' | 'medium';

/** Terrain-Typ der Welt. */
export type WorldType = 'island' | 'archipelago' | 'forest' | 'mountain';

/** Startmodus: bestimmt initiale Diplomatie-Spannung. */
export type StartMode = 'peaceful' | 'balanced' | 'warTorn' | 'chaos';

/** Spielmodus: Sandbox ohne Ziel oder Szenario mit 30-Tage-Ziel. */
export type GameMode = 'sandbox' | 'scenario';

/** Vollständige Konfiguration für eine neue Weltinstanz. */
export interface WorldSetupConfig {
  seed:        number;
  size:        WorldSize;
  worldType:   WorldType;
  startMode:   StartMode;
  gameMode:    GameMode;
  /** Aktive Fraktionen — Standard: alle vier. */
  factions:    FactionKey[];
  /** Aktives Szenario (nur wenn gameMode === 'scenario'). */
  scenarioId?: ScenarioId;
}

/** Erzeugt eine Standardkonfiguration mit zufälligem Seed. */
export function defaultConfig(): WorldSetupConfig {
  return {
    seed:      Math.floor(Math.random() * 999999),
    size:      'medium',
    worldType: 'island',
    startMode: 'balanced',
    gameMode:  'sandbox',
    factions:  ['human', 'orc', 'elf', 'dwarf'],
  };
}
