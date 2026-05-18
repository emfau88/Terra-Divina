/**
 * SaveSystem — Phase 16
 *
 * Liest und schreibt den Spielstand im localStorage.
 * Unterstützt nur einen einzigen Speicherslot.
 */

import { SaveGame } from './SaveGame';

/** localStorage-Schlüssel für den Spielstand. */
export const SAVE_KEY = 'terra-divina-save';

/** Aktuelle Schema-Version — inkompatible Stände werden verworfen. */
export const SAVE_VERSION = 1;

export class SaveSystem {
  /** Gibt zurück ob ein Spielstand vorhanden ist. */
  static hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  /** Schreibt den Spielstand als JSON in den localStorage. */
  static save(data: SaveGame): void {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }

  /**
   * Lädt den Spielstand aus dem localStorage.
   * Gibt null zurück wenn kein Stand vorhanden oder die Version nicht passt.
   */
  static load(): SaveGame | null {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as SaveGame;
      if (parsed.version !== SAVE_VERSION) return null; // inkompatible Version
      return parsed;
    } catch {
      return null;
    }
  }

  /** Löscht den Spielstand aus dem localStorage. */
  static deleteSave(): void {
    localStorage.removeItem(SAVE_KEY);
  }
}
