/**
 * GoalSystem — Phase 20
 *
 * Verfolgt Sieg/Niederlage-Bedingungen für Sandbox + Szenarien.
 *
 * Szenario-Bedingungen:
 *   survive_days:    Mindestens ein Dorf überlebt N Tage
 *   no_fire_by_day:  Kein Feuer aktiv nach Tag N
 *   no_war_by_day:   Kein Krieg vor Tag N
 *   faction_survives: Bestimmte Fraktion überlebt N Tage
 */

import { VillageManager }   from '@game/factions/VillageManager';
import { UnitManager }      from '@game/units/UnitManager';
import { FireSystem }       from '@game/simulation/FireSystem';
import { DiplomacySystem }  from '@game/simulation/DiplomacySystem';
import { ScenarioGoalDef }  from '@game/simulation/ScenarioDefinition';

/** Zielanzahl an Tagen — Standard für survive30-Szenario. */
export const GOAL_DAYS = 30;

/** Mögliche Ziel-Zustände. */
export type GoalState = 'playing' | 'won' | 'lost';

export class GoalSystem {
  private _state: GoalState = 'playing';
  private _day = 1;

  /** Spielmodus. */
  mode: 'sandbox' | 'scenario' = 'scenario';

  /** Szenario-Ziel-Definition (wird von GameScene gesetzt). */
  scenarioGoal: ScenarioGoalDef | null = null;

  /** Externe Systeme die GoalSystem für Fire/Diplomacy-Checks braucht. */
  fireSystem:   FireSystem | null       = null;
  diplomacy:    DiplomacySystem | null  = null;

  /** Callback, der aufgerufen wird, wenn sich der Zustand ändert. */
  onGoalChange: ((state: 'won' | 'lost') => void) | null = null;

  // ─── Getter ──────────────────────────────────────────────────────────────

  get state(): GoalState { return this._state; }
  get day(): number      { return this._day; }

  setDay(n: number): void { this._day = n; }
  setState(s: GoalState): void { this._state = s; }

  // ─── Tag hinzufügen ──────────────────────────────────────────────────────

  addDay(villages: VillageManager, units: UnitManager): void {
    if (this._state !== 'playing') return;

    this._day++;

    if (this.mode !== 'scenario') return;

    if (this.checkWin(villages, units)) {
      this._state = 'won';
      this.onGoalChange?.('won');
      return;
    }

    if (this.checkLose(villages, units)) {
      this._state = 'lost';
      this.onGoalChange?.('lost');
    }
  }

  // ─── Sieg-Bedingung ──────────────────────────────────────────────────────

  checkWin(villages: VillageManager, units: UnitManager): boolean {
    const goal      = this.scenarioGoal;
    const targetDay = goal?.targetDay ?? GOAL_DAYS;

    if (this._day < targetDay) return false;

    if (!goal) {
      // Default: mindestens ein Dorf hat noch Gebäude
      return villages.allVillages.some(v => v.buildings.length > 0);
    }

    switch (goal.condition) {
      case 'survive_days':
        return villages.allVillages.some(v => v.buildings.length > 0);

      case 'no_fire_by_day':
        // Sieg: Tag erreicht UND kein Feuer aktiv UND mindestens ein Dorf lebt
        return (
          !(this.fireSystem?.hasFire ?? false) &&
          villages.allVillages.some(v => v.buildings.length > 0)
        );

      case 'no_war_by_day':
        // Win: Tag erreicht ohne Krieg (Zustand jetzt peace/truce)
        return this.diplomacy?.state !== 'war';

      case 'faction_survives': {
        if (!goal.factionKey) return false;
        const fv = villages.villages[goal.factionKey];
        return fv !== undefined && fv.buildings.length > 0 && units.liveCount(goal.factionKey) > 0;
      }
    }
  }

  // ─── Niederlage-Bedingung ────────────────────────────────────────────────

  checkLose(villages: VillageManager, units: UnitManager): boolean {
    const goal = this.scenarioGoal;

    // Generelle Niederlage: alle Dörfer tot
    const allDead = villages.allVillages.every(v => v.buildings.length === 0);
    const noneAlive = units.liveUnits.length === 0;

    if (!goal) return allDead && noneAlive;

    switch (goal.condition) {
      case 'survive_days':
        return allDead && noneAlive;

      case 'no_fire_by_day':
        // Niederlage: zu viele Gebäude vernichtet (> 60% der Ausgangspopulation verloren)
        // Oder alle Dörfer tot
        return allDead && noneAlive;

      case 'no_war_by_day':
        // Niederlage: Krieg ausgebrochen
        return this.diplomacy?.state === 'war';

      case 'faction_survives': {
        if (!goal.factionKey) return false;
        const fv = villages.villages[goal.factionKey];
        // Niederlage: Fraktion hat keine Gebäude mehr und keine Einheiten
        return (fv === undefined || fv.buildings.length === 0) && units.liveCount(goal.factionKey) === 0;
      }
    }
  }
}
