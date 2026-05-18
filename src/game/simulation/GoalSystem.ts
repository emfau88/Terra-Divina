/**
 * GoalSystem — Phase 13A
 *
 * Verfolgt das 30-Tage-Überlebensziel der Welt.
 * Unabhängig von Phaser; wird von GameScene orchestriert.
 */

import { VillageManager } from '@game/factions/VillageManager';
import { UnitManager }    from '@game/units/UnitManager';

/** Zielanzahl an Tagen, die die Welt überleben muss. */
export const GOAL_DAYS = 30;

/** Mögliche Ziel-Zustände. */
export type GoalState = 'playing' | 'won' | 'lost';

export class GoalSystem {
  /** Aktueller Spielzustand. */
  private _state: GoalState = 'playing';

  /** Aktueller Tageszähler. */
  private _day = 1;

  /**
   * Callback, der aufgerufen wird, wenn sich der Zustand ändert.
   * Wird von GameScene gesetzt.
   */
  onGoalChange: ((state: 'won' | 'lost') => void) | null = null;

  // ─── Getter ──────────────────────────────────────────────────────────────

  get state(): GoalState { return this._state; }
  get day(): number      { return this._day; }

  // ─── Tag hinzufügen ──────────────────────────────────────────────────────

  /**
   * Erhöht den Tageszähler um 1 und prüft anschließend Sieg/Niederlage.
   * Hat keinen Effekt, wenn das Spiel bereits entschieden ist.
   */
  addDay(villages: VillageManager, units: UnitManager): void {
    if (this._state !== 'playing') return;

    this._day++;

    if (this.checkWin(villages)) {
      this._state = 'won';
      this.onGoalChange?.('won');
      return;
    }

    if (this.checkLose(villages, units)) {
      this._state = 'lost';
      this.onGoalChange?.('lost');
    }
  }

  // ─── Siegbedingung ───────────────────────────────────────────────────────

  /**
   * Sieg: 30 Tage erreicht UND mindestens ein Dorf hat noch Gebäude.
   */
  checkWin(villages: VillageManager): boolean {
    if (this._day < GOAL_DAYS) return false;
    return villages.allVillages.some(v => v.buildings.length > 0);
  }

  // ─── Niederlage-Bedingung ────────────────────────────────────────────────

  /**
   * Niederlage: alle Dörfer haben keine Gebäude mehr UND
   * es gibt keine lebenden Einheiten.
   */
  checkLose(villages: VillageManager, units: UnitManager): boolean {
    const allEmpty = villages.allVillages.every(v => v.buildings.length === 0);
    const noneAlive = units.liveUnits.length === 0;
    return allEmpty && noneAlive;
  }
}
