/**
 * VillageManager — Phase 4
 *
 * Erstellt und verwaltet alle Dörfer und Gebäude.
 * Kennt das WorldGrid (um Wege zu legen), aber kein Phaser.
 *
 * Einzelne Verantwortlichkeiten:
 * - Startdörfer platzieren
 * - Startgebäude anlegen
 * - Wege (Roads) zwischen Gebäuden und Dorfmitte ziehen
 * - Gebäude hinzufügen / zerstören
 */

import { Village }           from './Village';
import { Building }          from './Building';
import { FACTION_KEYS, FactionKey } from './Faction';
import { WorldGrid }         from '@game/world/WorldGrid';
import { WorldGenerator }    from '@game/world/WorldGenerator';
import { TileType }          from '@game/world/TileTypes';
import { COLS, ROWS }        from '@game/config';
import { BuildingType }      from '@game/data/buildingDefs';
import { BALANCE }           from '@game/data/balance';

export class VillageManager {
  readonly villages: Partial<Record<FactionKey, Village>> = {};
  readonly buildings: Building[] = [];

  /** Wird nach jeder Gebäudezerstörung aufgerufen (z.B. für Diplomatie + Renderer). */
  onBuildingDestroyed: (() => void) | null = null;

  private readonly grid: WorldGrid;

  constructor(grid: WorldGrid) {
    this.grid = grid;
  }

  // ─── Initialisierung ─────────────────────────────────────────────────────

  /**
   * Platziert die Startdörfer für alle aktiven Fraktionen.
   * Ohne factions-Liste: alle vier Fraktionen (human, orc, elf, dwarf).
   * Mit Liste: nur die genannten Fraktionen.
   *
   * Verteilung:
   * - human: oben-mitte
   * - orc:   unten-mitte
   * - elf:   oben-links (Wald-Bereich)
   * - dwarf: unten-rechts (Berg-Bereich)
   */
  placeStartVillages(factions?: FactionKey[]): void {
    const active = factions ?? (['human', 'orc', 'elf', 'dwarf'] as FactionKey[]);

    const positions: Record<FactionKey, { x: number; y: number }> = {
      human: { x: COLS * 0.5,  y: ROWS * 0.25 },
      orc:   { x: COLS * 0.5,  y: ROWS * 0.74 },
      elf:   { x: COLS * 0.25, y: ROWS * 0.35 },
      dwarf: { x: COLS * 0.75, y: ROWS * 0.65 },
    };

    for (const faction of active) {
      const pos = positions[faction];
      const land = WorldGenerator.findLandNear(this.grid, pos.x, pos.y, 20);
      this.createVillage(faction, land.x, land.y);
    }
  }

  // ─── Dorf anlegen ────────────────────────────────────────────────────────

  private createVillage(faction: FactionKey, x: number, y: number): void {
    const v = new Village(faction, x, y);
    // Fraktions-spezifischer Startvorrat (Orks wachsen schnell → mehr Startnahrung)
    v.food = faction === 'orc' ? BALANCE.STARTING_FOOD_ORC : BALANCE.STARTING_FOOD_DEFAULT;
    this.villages[faction] = v;

    this.addBuilding(faction, 'hall',  x,     y);
    this.addBuilding(faction, 'hut',   x - 1, y + 1);
    this.addBuilding(faction, 'farm',  x + 1, y + 1);
    this.makeRoads(faction);
  }

  // ─── Gebäude hinzufügen ──────────────────────────────────────────────────

  addBuilding(
    faction: FactionKey,
    type: BuildingType,
    x: number,
    y: number,
  ): Building | null {
    if (!this.grid.inBounds(x, y)) return null;
    const t = this.grid.get(x, y);
    if (t === TileType.Water || t === TileType.Mountain) return null;

    // Kein Gebäude auf einem belegten Feld (außer Hall)
    if (type !== 'hall' && this.buildingAt(x, y)) return null;

    const b = new Building(faction, type, x, y);
    this.buildings.push(b);
    this.villages[faction]?.buildings.push(b);

    // Gebäude-Kachel → Road (außer Farm bleibt Gras/Sand)
    if (type !== 'farm') {
      this.grid.set(x, y, TileType.Road);
    }

    return b;
  }

  // ─── Gebäude zerstören ───────────────────────────────────────────────────

  destroyBuilding(b: Building): void {
    b.dead = true;
    const v = this.villages[b.faction];
    if (v) {
      const idx = v.buildings.indexOf(b);
      if (idx !== -1) v.buildings.splice(idx, 1);
    }
    this.grid.set(b.x, b.y, TileType.Ash);
    this.onBuildingDestroyed?.();
  }

  // ─── Wege ziehen ─────────────────────────────────────────────────────────

  makeRoads(faction: FactionKey): void {
    const v = this.villages[faction];
    if (!v) return;

    for (const b of v.buildings) {
      let x = b.x;
      let y = b.y;

      // Horizontaler Weg
      while (x !== v.x) {
        const t = this.grid.get(x, y);
        if (t === TileType.Grass || t === TileType.Sand) {
          this.grid.set(x, y, TileType.Road);
        }
        x += x < v.x ? 1 : -1;
      }
      // Vertikaler Weg
      while (y !== v.y) {
        const t = this.grid.get(x, y);
        if (t === TileType.Grass || t === TileType.Sand) {
          this.grid.set(x, y, TileType.Road);
        }
        y += y < v.y ? 1 : -1;
      }
    }
  }

  // ─── Hilfsmethoden ───────────────────────────────────────────────────────

  buildingAt(x: number, y: number): Building | undefined {
    return this.buildings.find(b => !b.dead && b.x === x && b.y === y);
  }

  /** Mittelpunkt aller Dörfer — für Kamera-Start. */
  centerPoint(): { x: number; y: number } {
    const all = this.allVillages;
    if (all.length === 0) return { x: COLS / 2, y: ROWS / 2 };
    const sx = all.reduce((s, v) => s + v.x, 0);
    const sy = all.reduce((s, v) => s + v.y, 0);
    return { x: sx / all.length, y: sy / all.length };
  }

  /** Alle lebenden Gebäude (ohne tote). */
  get liveBuildings(): Building[] {
    return this.buildings.filter(b => !b.dead);
  }

  /** Alle Dörfer als Array. */
  get allVillages(): Village[] {
    return FACTION_KEYS.map(k => this.villages[k]).filter((v): v is Village => v !== undefined);
  }
}
