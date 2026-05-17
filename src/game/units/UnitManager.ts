/**
 * UnitManager — Phase 7
 *
 * Verwaltet alle Einheiten: Spawn, KI-Tick, Tod, Rollen-Rebalancing.
 * Nutzt jetzt UnitAI für vollständiges Rollen-Verhalten.
 */

import { Unit }           from './Unit';
import { UnitRole }       from './UnitRoles';
import { UnitAI }         from './UnitAI';
import { FactionKey }     from '@game/factions/Faction';
import { VillageManager } from '@game/factions/VillageManager';
import { WorldGrid }      from '@game/world/WorldGrid';
import { BALANCE }        from '@game/data/balance';

function randi(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export class UnitManager {
  readonly units: Unit[] = [];

  private readonly grid:    WorldGrid;
  private readonly villages: VillageManager;
  private readonly ai:       UnitAI;

  constructor(grid: WorldGrid, villages: VillageManager) {
    this.grid     = grid;
    this.villages = villages;
    this.ai       = new UnitAI(grid, villages);
  }

  // ─── Spawn ───────────────────────────────────────────────────────────────

  spawnInitial(): void {
    for (let i = 0; i < 8; i++) {
      this.spawnUnit('human');
      this.spawnUnit('orc');
    }
  }

  spawnUnit(faction: FactionKey, role?: UnitRole): Unit | null {
    const alive = this.units.filter(u => u.faction === faction && !u.dead);
    if (alive.length >= BALANCE.MAX_UNITS_PER_FACTION) return null;

    const v = this.villages.villages[faction];
    if (!v) return null;

    const chosenRole = role ?? this.chooseRole(faction);
    const pos = this.grid.nearestWalkable(
      v.x + randi(-2, 2),
      v.y + randi(-2, 2),
      4,
    );
    if (!pos) return null;

    const u = new Unit(faction, chosenRole, pos.x, pos.y);
    u.state = 'idle';
    this.units.push(u);
    return u;
  }

  // ─── Tick ────────────────────────────────────────────────────────────────

  tick(steps: number): void {
    for (let s = 0; s < steps; s++) {
      for (const u of this.units) {
        if (u.dead) continue;
        this.ai.tick(u, this.units);
      }
      this.removeDeadUnits();
      this.rebalanceRoles();
    }
  }

  // ─── Rollen-Rebalancing ──────────────────────────────────────────────────

  /**
   * Korrigiert Rollenverhältnisse wenn eine Fraktion zu viele/wenige
   * einer bestimmten Rolle hat. Wird nach jedem Tick aufgerufen.
   */
  private rebalanceRoles(): void {
    for (const faction of ['human', 'orc'] as FactionKey[]) {
      const alive   = this.units.filter(u => u.faction === faction && !u.dead);
      const n       = alive.length;
      if (n < 4) continue;

      const guards  = alive.filter(u => u.role === 'guard').length;
      const raiders = alive.filter(u => u.role === 'raider').length;
      const builders= alive.filter(u => u.role === 'builder').length;

      // Zu wenige Guards → einen Gatherer umschulen
      if (guards / n < BALANCE.ROLE_GUARD_MIN) {
        const g = alive.find(u => u.role === 'gatherer' && u.state !== 'fight');
        if (g) { g.role = 'guard'; continue; }
      }

      // Zu wenige Raider → einen Gatherer umschulen
      if (raiders / n < BALANCE.ROLE_RAIDER_MIN && n >= 10) {
        const g = alive.find(u => u.role === 'gatherer' && u.state !== 'fight');
        if (g) { g.role = 'raider'; continue; }
      }

      // Zu wenige Builder → einen Gatherer umschulen
      if (builders / n < BALANCE.ROLE_BUILDER_MIN) {
        const g = alive.find(u => u.role === 'gatherer');
        if (g) { g.role = 'builder'; continue; }
      }
    }
  }

  // ─── Hilfsmethoden ───────────────────────────────────────────────────────

  private chooseRole(faction: FactionKey): UnitRole {
    const alive    = this.units.filter(u => u.faction === faction && !u.dead);
    const n        = Math.max(1, alive.length);
    const guards   = alive.filter(u => u.role === 'guard').length;
    const builders = alive.filter(u => u.role === 'builder').length;
    const raiders  = alive.filter(u => u.role === 'raider').length;

    if (guards  / n < BALANCE.ROLE_GUARD_MIN)   return 'guard';
    if (builders/ n < BALANCE.ROLE_BUILDER_MIN) return 'builder';
    if (n >= 10 && raiders / n < BALANCE.ROLE_RAIDER_MIN) return 'raider';
    return Math.random() < 0.62 ? 'gatherer' : 'builder';
  }

  private removeDeadUnits(): void {
    for (let i = this.units.length - 1; i >= 0; i--) {
      if (this.units[i].dead) this.units.splice(i, 1);
    }
  }

  /** Setzt den Kriegszustand für die KI (von GameScene nach Diplomatie-Tick). */
  setWarState(isWar: boolean): void {
    this.ai.isWar = isWar;
  }

  getAI(): UnitAI { return this.ai; }

  get liveUnits(): Unit[] {
    return this.units.filter(u => !u.dead);
  }

  liveCount(faction: FactionKey): number {
    return this.units.filter(u => u.faction === faction && !u.dead).length;
  }
}
