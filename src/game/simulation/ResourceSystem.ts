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
import { TerritorySystem } from '@game/world/TerritorySystem';
import { FactionKey } from '@game/factions/Faction';
import { FACTION_TRAITS }  from '@game/factions/FactionTraits';
import { Unit }            from '@game/units/Unit';
import { BALANCE }         from '@game/data/balance';
import { BuildingType }    from '@game/data/buildingDefs';
import { BuildSite, Village } from '@game/factions/Village';

const MIN_BUILDING_SPACING_TILES = 3;

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
  private readonly territory: TerritorySystem | null;

  /** Callbacks die nach einem Dorf-Spawn / Gebäude-Bau aufgerufen werden,
   *  damit GameScene Renderer aktualisieren kann. */
  onSpawn:   ((faction: FactionKey) => void) | null = null;
  onBuild:   ((faction: FactionKey) => void) | null = null;
  onTerrainChanged: (() => void) | null = null;

  constructor(
    villages: VillageManager,
    units:    UnitManager,
    grid:     WorldGrid,
    territory?: TerritorySystem,
  ) {
    this.villages  = villages;
    this.units     = units;
    this.grid      = grid;
    this.territory = territory ?? null;
  }

  // ─── Haupt-Tick ──────────────────────────────────────────────────────────

  tick(steps: number): void {
    for (let s = 0; s < steps; s++) {
      for (const village of this.villages.allVillages) {
        this.passiveIncome(village);
      }
      this.unitResourceTick();
      for (const village of this.villages.allVillages) {
        this.trySpawn(village);
        this.tryBuild(village);
        this.tickBuildSites(village);
        this.tryLevelUp(village);
        this.tryFoundVillage(village);
      }
    }
  }

  // ─── Passives Einkommen ──────────────────────────────────────────────────

  private passiveIncome(v: Village): void {
    const farms  = v.buildings.filter(b => b.type === 'farm').length;
    const yards  = v.buildings.filter(b => b.type === 'wood').length;

    v.food += BALANCE.FOOD_PASSIVE_BASE + farms  * BALANCE.FOOD_PER_FARM;
    v.wood += BALANCE.WOOD_PASSIVE_BASE + yards  * BALANCE.WOOD_PER_YARD;
  }

  // ─── Einheiten-Ressourcen-Tick ───────────────────────────────────────────

  private unitResourceTick(): void {
    for (const u of this.units.units) {
      if (u.dead) continue;

      if (u.role === 'gatherer') this.gathererTick(u, u.faction);
      if (u.role === 'builder')  this.builderTick(u, u.faction);
    }
  }

  private gathererTick(u: Unit, faction: FactionKey): void {
    const v = this.homeVillage(u, faction);
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
      if (Math.random() < 0.08) {
        this.grid.set(u.x, u.y, TileType.Grass);
        this.onTerrainChanged?.();
      }
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
    const v = this.homeVillage(u, faction);
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
    const v = this.homeVillage(u, faction);
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

  private homeVillage(u: Unit, fallbackFaction: FactionKey): Village | undefined {
    return u.homeVillageId !== null
      ? this.villages.villageById(u.homeVillageId) ?? this.villages.primaryVillage(fallbackFaction)
      : this.villages.primaryVillage(fallbackFaction);
  }

  private trySpawn(v: Village): void {
    const faction = v.faction;
    const traits   = FACTION_TRAITS[faction];
    const spawnCost = Math.round(BALANCE.SPAWN_FOOD_COST * traits.spawnCostMult);

    const villagePop = this.units.liveCountForVillage(v.id);
    const factionPop = this.units.liveCount(faction);
    const cap = this.popCap(v);
    if (v.food < spawnCost || villagePop >= cap || factionPop >= BALANCE.MAX_UNITS_PER_FACTION) return;

    v.food -= spawnCost;
    const u = this.units.spawnUnit(faction, undefined, v.id);
    if (u) this.onSpawn?.(faction);
  }

  private tryBuild(v: Village): void {
    const maxBuildings = 5 + v.level * 5;
    // Count finished buildings + pending build sites toward cap
    const effectiveCount = v.buildings.length + v.buildSites.length;
    if (
      v.wood  < BALANCE.BUILD_WOOD_COST ||
      v.food  < BALANCE.BUILD_FOOD_COST ||
      effectiveCount >= maxBuildings
    ) return;

    const site = this.planBuildSite(v);
    if (!site) return;

    // Deduct resources and register site — building placed when site completes
    v.wood -= BALANCE.BUILD_WOOD_COST;
    v.food -= BALANCE.BUILD_FOOD_COST;
    v.buildSites.push(site);
    // Notify renderer that something has changed (scaffold needs drawing)
    this.onBuild?.(v.faction);
  }

  /**
   * Picks a building type + location (same logic as the old growVillage),
   * validates no existing building or BuildSite is already there,
   * and returns a new BuildSite ready to be pushed — WITHOUT placing the building.
   */
  private planBuildSite(v: Village): BuildSite | null {
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
        if (this.territory && !this.territory.ownsTile(v.id, xx, yy)) continue;
        if (this.villages.hasNearbyBuilding(xx, yy, MIN_BUILDING_SPACING_TILES)) continue;
        if (this.hasNearbyBuildSite(v.buildSites, xx, yy, MIN_BUILDING_SPACING_TILES)) continue;
        const d = dist(xx, yy, v.x, v.y);
        if (d > radius) continue;
        candidates.push({ x: xx, y: yy, d });
      }
    }
    candidates.sort((a, b) => a.d - b.d);

    if (candidates.length === 0) return null;

    const p = candidates[0];
    return {
      villageId:        v.id,
      x:              p.x,
      y:              p.y,
      type,
      faction:        v.faction,
      ticksRemaining: BALANCE.BUILD_SITE_TICKS,
      totalTicks:     BALANCE.BUILD_SITE_TICKS,
      assignedUnitId: null,
    };
  }

  private hasNearbyBuildSite(
    buildSites: BuildSite[],
    x: number,
    y: number,
    minSpacing: number,
  ): boolean {
    return buildSites.some(site =>
      Math.max(Math.abs(site.x - x), Math.abs(site.y - y)) < minSpacing,
    );
  }

  /**
   * Counts down all BuildSites for a faction.
   * When a site reaches 0, the building is placed and the site is removed.
   * This is the FALLBACK — buildings complete even without a builder present.
   */
  private tickBuildSites(v: Village): void {
    if (v.buildSites.length === 0) return;

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
      const b = this.villages.addBuilding(v.faction, site.type, site.x, site.y, site.villageId);
      if (b) {
        this.villages.makeRoadsForVillage(v.id);
        this.onBuild?.(v.faction);
      }
    }
  }

  private tryLevelUp(v: Village): void {
    if (v.level >= 8) return;
    if (v.wood < BALANCE.LEVEL_UP_WOOD_COST) return;
    v.wood -= BALANCE.LEVEL_UP_WOOD_COST;
    v.level++;
    // Territory grows with level: level 1 → radius 7, level 2 → 8, …, level 8 → 14.
    v.territory = 6 + v.level;
    this.territory?.expandVillage(v);
    this.onBuild?.(v.faction); // Neuzeichnen — redraws the expanded territory rectangle
  }

  // ─── Hilfsmethoden ───────────────────────────────────────────────────────

  private tryFoundVillage(v: Village): void {
    if (!this.territory) return;
    if (v.level < BALANCE.FOUND_VILLAGE_MIN_LEVEL) return;
    if (this.units.liveCountForVillage(v.id) < BALANCE.FOUND_VILLAGE_MIN_POP) return;
    if (this.villages.villagesForFaction(v.faction).length >= BALANCE.FOUND_VILLAGE_MAX_PER_FACTION) return;
    if (v.wood < BALANCE.FOUND_VILLAGE_WOOD_COST || v.food < BALANCE.FOUND_VILLAGE_FOOD_COST) return;

    const site = this.findVillageFoundingSite(v);
    if (!site) return;

    v.wood -= BALANCE.FOUND_VILLAGE_WOOD_COST;
    v.food -= BALANCE.FOUND_VILLAGE_FOOD_COST;

    const founded = this.villages.foundVillage(v.faction, site.x, site.y);
    if (!founded) {
      v.wood += BALANCE.FOUND_VILLAGE_WOOD_COST;
      v.food += BALANCE.FOUND_VILLAGE_FOOD_COST;
      return;
    }
    this.territory.ensureVillageClaims([founded]);
    this.onBuild?.(v.faction);
  }

  private findVillageFoundingSite(source: Village): { x: number; y: number } | null {
    if (!this.territory) return null;

    const candidates: Array<{ x: number; y: number; score: number }> = [];
    const existing = this.villages.allVillages;
    for (const claim of this.territory.claimsForFaction(source.faction)) {
      if (claim.villageId !== source.id) continue;
      for (let y = claim.y; y < claim.y + claim.h; y++) {
        for (let x = claim.x; x < claim.x + claim.w; x++) {
          if (!this.grid.isWalkable(x, y)) continue;
          if (this.villages.hasNearbyBuilding(x, y, MIN_BUILDING_SPACING_TILES + 2)) continue;
          const nearestVillage = Math.min(...existing.map(v => dist(x, y, v.x, v.y)));
          if (nearestVillage < BALANCE.FOUND_VILLAGE_MIN_DISTANCE) continue;
          const sourceDistance = dist(x, y, source.x, source.y);
          candidates.push({ x, y, score: sourceDistance + nearestVillage * 0.35 });
        }
      }
    }

    return candidates.sort((a, b) => b.score - a.score)[0] ?? null;
  }

  popCap(villageOrFaction: Village | FactionKey): number {
    const v = typeof villageOrFaction === 'string'
      ? this.villages.primaryVillage(villageOrFaction)
      : villageOrFaction;
    if (!v) return 22;
    const huts = v.buildings.filter(b => b.type === 'hut').length;
    return Math.min(BALANCE.MAX_UNITS_PER_FACTION, 22 + v.level * 8 + huts * 6);
  }
}
