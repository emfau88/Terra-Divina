/**
 * SaveGame — Phase 16
 *
 * Datenstruktur für einen gespeicherten Spielstand.
 * Enthält ausschließlich serialisierbare Rohdaten — keine Phaser-Objekte,
 * keine DOM-Referenzen, keine Klassen-Instanzen.
 */

import { WorldSetupConfig } from '@game/world/WorldSetupConfig';

export interface SaveGame {
  /** Schema-Version — wird beim Laden geprüft. */
  version: number;

  /** Unix-Timestamp des Speicherzeitpunkts. */
  savedAt: number;

  /** Weltgenerierungs-Konfiguration (Seed, Größe, Typ, Modus). */
  config: WorldSetupConfig;

  /** Weltkarte: Kachel-Typen und Metadaten. */
  world: {
    cols: number;
    rows: number;
    /** Kachel-Typen als Zahlen (TileType-Enum-Werte). */
    tiles: number[];
    /** Metadaten parallel zu tiles. */
    meta: Array<{ variant: number; burn: number; wet: number; decor: boolean }>;
  };

  /** Zustand aller Dörfer. */
  villages: Array<{
    faction: string;
    x: number;
    y: number;
    food: number;
    wood: number;
    level: number;
    expansion: number;
    hunger: number;
    territory: number;
  }>;

  /** Zustand aller Gebäude. */
  buildings: Array<{
    id: number;
    faction: string;
    type: string;
    x: number;
    y: number;
    hp: number;
    dead: boolean;
  }>;

  /** Zustand aller Einheiten. */
  units: Array<{
    id: number;
    faction: string;
    role: string;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    state: string;
    carryFood: number;
    carryWood: number;
    cd: number;
    dead: boolean;
  }>;

  /** Diplomatischer Zustand. */
  diplomacy: {
    state: string;
    tension: number;
    truceTicks: number;
  };

  /** Ziel-System-Zustand. */
  goal: {
    day: number;
    mode: string;
    goalState: string;
  };

  /** Uhr-Zustand. */
  clock: {
    speedIndex: number;
    paused: boolean;
  };
}
