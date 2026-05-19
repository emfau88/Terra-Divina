/**
 * ResourceSystem — Phase 7
 *
 * Verarbeitet pro Simulations-Tick:
 * 1. Passive Ressourcen-Income (Farmen, Holzfäller-Häuser)
 * 2. Gatherer/Builder: Ressourcen aufnehmen und nach Hause bringen
 *    (Bewegung wird von UnitAI übernommen — hier nur die Übergabe)
 * 3. Dorf-Spawn: neue Einheit wenn genug Nahrung
 * 4. Dorf-Bau: neues Gebäude wenn genug Holz + Nahrung
 * 5. Level-Up: wenn genug Holz
 *
 * Kein Phaser. Mutiert nur Village-, Unit- und WorldGrid-State.
 */

import { VillageManager }  from '@game/factions/VillageManager';
import { UnitManager }     from '@game/units/UnitManager';
import { WorldGrid }       from '@game/world/WorldGrid';
import { TileType }        from '@game/world/TileTypes';
import { FACTION_KEYS, FactionKey } from '@game/factions/Faction';
import { FACTION_TRAITS }  from '@game/factions/FactionTraits';
import { Unit }            from '@game/units/Unit';
import { BALANCE }         from '@game/data/balance';
import { BuildingType }    from '@game/data/buildingDefs';
import { BuildSite }       from '@game/factions/Village';

function choice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

export class ResourceSystem {
  private readonly villages: VillageManager;
  private readonly units:    UnitManager;
  private readonly grid:     WorldGrid;

  /** Callbacks die nach einem Dorf-Spawn / Gebäude-Bau aufgerufen werden,
   *  damit GameScene Renderer aktualisieren kann. */
  onSpawn:   ((faction: FactionKey) => void) | null = null;
  onBuild:   ((faction: FactionKey) => void) | null = null;

  constructor(
    villages: VillageManager,
    units:    UnitManager,
    grid:     WorldGrid,
  ) {
    this.villages = villages;
    this.units    = units;
    this.grid     = grid;
  }

  // ─── Haupt-Tick ──────────────────────────────────────────────────────────

  tick(steps: number): void {
    for (let s = 0; s < steps; s++) {
      for (const key of FACTION_KEYS) {
        this.passiveIncome(key);
        this.unitResourceTick(key);
        this.trySpawn(key);
        this.tryBuild(key);
        this.tickBuildSites(key);
        this.tryLevelUp(key);
      }
    }
  }

  // ─── Passives Einkommen ──────────────────────────────────────────────────

  private passiveIncome(faction: FactionKey): void {
    const v = this.villages.villages[faction];
    if (!v) return;

    const farms  = v.buildings.filter(b => b.type === 'farm').length;
    const yards  = v.buildings.filter(b => b.type === 'wood').length;

    v.food += BALANCE.FOOD_PASSIVE_BASE + farms  * BALANCE.FOOD_PER_FARM;
    v.wood += BALANCE.WOOD_PASSIVE_BASE + yards  * BALANCE.WOOD_PER_YARD;
  }

  // ─── Einheiten-Ressourcen-Tick ───────────────────────────────────────────

  private unitResourceTick(faction: FactionKey): void {
    const v = this.villages.villages[faction];
    if (!v) return;

    for (const u of this.units.units) {
      if (u.dead || u.faction !== faction) continue;

      if (u.role === 'gatherer') this.gathererTick(u, faction);
      if (u.role === 'builder')  this.builderTick(u, faction);
    }
  }

  private gathererTick(u: Unit, faction: FactionKey): void {
    const v = this.villages.villages[faction];
    if (!v) return;

    const traits = FACTION_TRAITS[faction];

    // Voll beladen → nach Hause
    if (u.carryFood + u.carryWood >= 3) {
      this.returnHome(u, faction);
      return;
    }

    const here = this.grid.get(u.x, u.y);

    // Wald → Holz hacken (Elfen sammeln mehr, Zwerge weniger)
    if (here === TileType.Forest && Math.random() < 0.58 * traits.woodGatherMult) {
      u.state = 'chop';
      u.carryWood++;
      if (Math.random() < 0.08) this.grid.set(u.x, u.y, TileType.Grass);
      // Elfen: passives Heilen im Wald
      if (traits.forestHealPerTick > 0) {
        u.hp = Math.min(u.maxHp, u.hp + traits.forestHealPerTick);
      }
      return;
    }

    // Im Wald stehend: Elfen heilen auch ohne Holz-Tick
    if (here === TileType.Forest && traits.forestHealPerTick > 0) {
      u.hp = Math.min(u.maxHp, u.hp + traits.forestHealPerTick);
    }

    // Gras / Sand / Weg → Nahrung sammeln
    if (
      (here === TileType.Grass || here === TileType.Sand || here === TileType.Road)
      && Math.random() < 0.24 * traits.foodGatherMult
    ) {
      u.state = 'forage';
      u.carryFood++;
      return;
    }

    u.state = 'wander';
  }

  private builderTick(u: Unit, faction: FactionKey): void {
    const v = this.villages.villages[faction];
    if (!v) return;

    if (u.carryFood + u.carryWood >= 2) {
      this.returnHome(u, faction);
      return;
    }

    // Beschädigtes Gebäude in Nähe reparieren
    const damaged = this.villages.buildings.find(b =>
      !b.dead &&
      b.faction === faction &&
      b.hp < b.maxHp &&
      dist(u.x, u.y, b.x, b.y) < 8,
    );
    if (damaged && dist(u.x, u.y, damaged.x, damaged.y) <= 1) {
      u.state = 'repair';
      damaged.hp = Math.min(damaged.maxHp, damaged.hp + 4);
      return;
    }

    // Holz hacken
    if (this.grid.get(u.x, u.y) === TileType.Forest && Math.random() < 0.5) {
      u.state = 'chop';
      u.carryWood++;
      return;
    }

    u.state = 'wander';
  }

  private returnHome(u: Unit, faction: FactionKey): void {
    const v = this.villages.villages[faction];
    if (!v) return;

    u.state = 'return';

    if (Math.abs(u.x - v.x) <= 1 && Math.abs(u.y - v.y) <= 1) {
      v.food      += u.carryFood;
      v.wood      += u.carryWood;
      u.carryFood  = 0;
      u.carryWood  = 0;
      u.hp = Math.min(u.maxHp, u.hp + 2); // kleines Heimheil
    }
  }

  // ─── Dorf-Aktionen ───────────────────────────────────────────────────────

  private trySpawn(faction: FactionKey): void {
    const v = this.villages.villages[faction];
    if (!v) return;

    const traits   = FACTION_TRAITS[faction];
    const spawnCost = Math.round(BALANCE.SPAWN_FOOD_COST * traits.spawnCostMult);

    const pop = this.units.liveCount(faction);
    const cap = this.popCap(faction);
    if (v.food < spawnCost || pop >= cap) return;

    v.food -= spawnCost;
    const u = this.units.spawnUnit(faction);
    if (u) this.onSpawn?.(faction);
  }

  private tryBuild(faction: FactionKey): void {
    const v = this.villages.villages[faction];
    if (!v) return;

    const maxBuildings = 5 + v.level * 5;
    // Count finished buildings + pending build sites toward cap
    const effectiveCount = v.buildings.length + v.buildSites.length;
    if (
      v.wood  < BALANCE.BUILD_WOOD_COST ||
      v.food  < BALANCE.BUILD_FOOD_COST ||
      effectiveCount >= maxBuildings
    ) return;

    const site = this.planBuildSite(faction);
    if (!site) return;

    // Deduct resources and register site — building placed when site completes
    v.wood -= BALANCE.BUILD_WOOD_COST;
    v.food -= BALANCE.BUILD_FOOD_COST;
    v.buildSites.push(site);
    // Notify renderer that something has changed (scaffold needs drawing)
    this.onBuild?.(faction);
  }

  /**
   * Picks a building type + location (same logic as the old growVillage),
   * validates no existing building or BuildSite is already there,
   * and returns a new BuildSite ready to be pushed — WITHOUT placing the building.
   */
  private planBuildSite(faction: FactionKey): BuildSite | null {
    const v = this.villages.villages[faction];
    if (!v) return null;

    const pool: BuildingType[] = [
      'hut', 'farm', 'wood', 'hut', 'farm',
      v.level >= 3 ? 'tower'    : 'hut',
      v.level >= 2 ? 'outpost'  : 'hut',
      v.level >= 4 ? 'barracks' : 'hut',
    ];
    const type   = choice(pool);
    const radius = 4 + v.level;

    const candidates: Array<{ x: number; y: number; d: number }> = [];
    for (let yy = v.y - radius; yy <= v.y + radius; yy++) {
      for (let xx = v.x - radius; xx <= v.x + radius; xx++) {
        if (!this.grid.isWalkable(xx, yy)) continue;
        if (this.villages.buildingAt(xx, yy))  continue;
        // Also block tiles already claimed by another BuildSite
        if (v.buildSites.some(s => s.x === xx && s.y === yy)) continue;
        const d = dist(xx, yy, v.x, v.y);
        if (d > radius) continue;
        candidates.push({ x: xx, y: yy, d });
      }
    }
    candidates.sort((a, b) => a.d - b.d);

    if (candidates.length === 0) return null;

    const p = candidates[0];
    return {
      x:              p.x,
      y:              p.y,
      type,
      faction,
      ticksRemaining: BALANCE.BUILD_SITE_TICKS,
      totalTicks:     BALANCE.BUILD_SITE_TICKS,
      assignedUnitId: null,
    };
  }

  /**
   * Counts down all BuildSites for a faction.
   * When a site reaches 0, the building is placed and the site is removed.
   * This is the FALLBACK — buildings complete even without a builder present.
   */
  private tickBuildSites(faction: FactionKey): void {
    const v = this.villages.villages[faction];
    if (!v || v.buildSites.length === 0) return;

    const completed: BuildSite[] = [];

    for (const site of v.buildSites) {
      site.ticksRemaining--;
      if (site.ticksRemaining <= 0) {
        completed.push(site);
      }
    }

    for (const site of completed) {
      // Remove from buildSites array
      const idx = v.buildSites.indexOf(site);
      if (idx !== -1) v.buildSites.splice(idx, 1);

      // Place the finished building (same as old growVillage path)
      const b = this.villages.addBuilding(faction, site.type, site.x, site.y);
      if (b) {
        this.villages.makeRoads(faction);
        this.onBuild?.(faction);
      }
    }
  }

  private tryLevelUp(faction: FactionKey): void {
    const v = this.villages.villages[faction];
    if (!v || v.level >= 8) return;
    if (v.wood < BALANCE.LEVEL_UP_WOOD_COST) return;
    v.wood -= BALANCE.LEVEL_UP_WOOD_COST;
    v.level++;
    // Territory grows with level: level 1 → radius 7, level 2 → 8, …, level 8 → 14.
    v.territory = 6 + v.level;
    this.onBuild?.(faction); // Neuzeichnen — redraws the expanded territory rectangle
  }

  // ─── Hilfsmethoden ───────────────────────────────────────────────────────

  popCap(faction: FactionKey): number {
    const v = this.villages.villages[faction];
    if (!v) return 22;
    const huts = v.buildings.filter(b => b.type === 'hut').length;
    return Math.min(BALANCE.MAX_UNITS_PER_FACTION, 22 + v.level * 8 + huts * 6);
  }
}
