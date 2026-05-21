/**
 * UnitManager — Phase 7
 *
 * Verwaltet alle Einheiten: Spawn, KI-Tick, Tod, Rollen-Rebalancing.
 * Nutzt jetzt UnitAI für vollständiges Rollen-Verhalten.
 */

import { Unit }           from './Unit';
import { UnitRole }       from './UnitRoles';
import { UnitAI }         from './UnitAI';
import { FactionKey, FACTION_KEYS } from '@game/factions/Faction';
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

  spawnInitial(factions?: FactionKey[]): void {
    const active = factions ?? FACTION_KEYS.filter(k => this.villages.villages[k] !== undefined);
    for (let i = 0; i < 8; i++) {
      for (const faction of active) {
        this.spawnUnit(faction);
      }
    }
  }

  spawnUnit(faction: FactionKey, role?: UnitRole, villageId?: number): Unit | null {
    const alive = this.units.filter(u => u.faction === faction && !u.dead);
    if (alive.length >= BALANCE.MAX_UNITS_PER_FACTION) return null;

    const v = villageId !== undefined
      ? this.villages.villageById(villageId)
      : this.villages.primaryVillage(faction);
    if (!v) return null;

    const chosenRole = role ?? this.chooseRole(faction);
    const pos = this.grid.nearestWalkable(
      v.x + randi(-2, 2),
      v.y + randi(-2, 2),
      4,
    );
    if (!pos) return null;

    const u = new Unit(faction, chosenRole, pos.x, pos.y, v.id);
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
      // Fix 4 — last-survivor rescue: prevent silent faction death
      this.rescueSingleSurvivor();
    }
  }

  // ─── Rollen-Rebalancing ──────────────────────────────────────────────────

  /**
   * Korrigiert Rollenverhältnisse wenn eine Fraktion zu viele/wenige
   * einer bestimmten Rolle hat. Wird nach jedem Tick aufgerufen.
   */
  private rebalanceRoles(): void {
    for (const faction of FACTION_KEYS) {
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

      // Fix 5 — Builder surplus: if there are no active buildSites AND more builders
      // than the minimum ratio requires, demote one idle builder to gatherer so
      // food production doesn't stall while the village has nothing to build.
      const v = this.villages.villages[faction];
      const noBuildWork = !v || v.buildSites.length === 0;
      const builderMin  = Math.ceil(n * BALANCE.ROLE_BUILDER_MIN);
      if (noBuildWork && builders > builderMin + 1) {
        const idleBuilder = alive.find(
          u => u.role === 'builder' && u.state === 'wander',
        );
        if (idleBuilder) { idleBuilder.role = 'gatherer'; continue; }
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

  /**
   * Fix 4 — Last-Survivor Rescue.
   *
   * If a faction has fewer than 3 live units AND the village has enough food,
   * force-spawn a gatherer to prevent the faction from collapsing silently.
   * This bypasses normal role-ratio logic — it's purely a recovery mechanism.
   * Only triggers once per tick check (not repeatedly in a loop) to avoid
   * overpowering the food economy on first startup.
   */
  private rescueSingleSurvivor(): void {
    for (const faction of FACTION_KEYS) {
      const v = this.villages.villages[faction];
      if (!v) continue;
      const alive = this.units.filter(u => u.faction === faction && !u.dead);
      if (alive.length >= 3) continue;
      if (alive.length === 0) continue;  // Village already destroyed — don't spawn
      if (v.food < BALANCE.SPAWN_FOOD_COST) continue;

      v.food -= BALANCE.SPAWN_FOOD_COST;
      this.spawnUnit(faction, 'gatherer');
    }
  }

  /** Setzt den Kriegs- und Spannungszustand für die KI (von GameScene nach Diplomatie-Tick). */
  setWarState(isWar: boolean, isTension?: boolean): void {
    this.ai.isWar     = isWar;
    this.ai.isTension = isTension ?? isWar;
  }

  getAI(): UnitAI { return this.ai; }

  get liveUnits(): Unit[] {
    return this.units.filter(u => !u.dead);
  }

  liveCount(faction: FactionKey): number {
    return this.units.filter(u => u.faction === faction && !u.dead).length;
  }

  liveCountForVillage(villageId: number): number {
    return this.units.filter(u => u.homeVillageId === villageId && !u.dead).length;
  }
}
