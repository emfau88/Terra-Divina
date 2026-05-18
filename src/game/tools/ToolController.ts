/**
 * ToolController — Phase 17 (Terrain-Painting)
 *
 * Neu in Phase 17:
 *   - useTerrain(): setzt Kachel-Typ direkt im Grid und zeichnet Welt neu
 *   - Terrain-Cases im switch: terrain-grass, terrain-water, terrain-forest,
 *     terrain-mountain, terrain-sand
 *   - Wasser-Terrain löscht automatisch Feuer auf der Zielkachel
 *
 * Verbindet Tool-Aktivierung mit Simulation (GodTools) und VFX (EffectSystem).
 * Trennung klar:
 *   - GodTools     → Spielzustand ändern (deterministisch)
 *   - EffectSystem → Visuelle Effekte spawnen (rein visuell)
 *   - Renderer     → Nach Zustandsänderung neu zeichnen
 */

import { WorldGrid }        from '@game/world/WorldGrid';
import { TileType }         from '@game/world/TileTypes';
import { VillageManager }   from '@game/factions/VillageManager';
import { UnitManager }      from '@game/units/UnitManager';
import { FactionKey }       from '@game/factions/Faction';
import { FireSystem }       from '@game/simulation/FireSystem';
import { EffectSystem }     from '@game/effects/EffectSystem';
import { WorldRenderer }    from '@game/rendering/WorldRenderer';
import { BuildingRenderer } from '@game/rendering/BuildingRenderer';
import { UnitRenderer }     from '@game/rendering/UnitRenderer';
import { CreatureManager }  from '@game/creatures/CreatureManager';
import { CreatureRenderer } from '@game/rendering/CreatureRenderer';
import { EventFeed }        from '@game/ui/EventFeed';
import { TILE }             from '@game/config';
import {
  applyLightning,
  applyFire,
  applyRain,
  applyMeteor,
  applyHeal,
  applySpawnUnit,
} from './GodTools';

export type ToolResult = 'ok' | 'no-target' | 'cap-reached';

export class ToolController {
  private readonly grid:     WorldGrid;
  private readonly villages: VillageManager;
  private readonly units:    UnitManager;
  private readonly fire:     FireSystem;
  private readonly effects:  EffectSystem;
  private readonly feed:     EventFeed;

  private readonly worldRenderer:    WorldRenderer;
  private readonly buildingRenderer: BuildingRenderer;
  private readonly unitRenderer:     UnitRenderer;
  private readonly creatureManager:  CreatureManager;
  private readonly creatureRenderer: CreatureRenderer;

  /** Kamera-Oberkante in Weltpixeln — für Blitz-Start-Y. */
  getCamTop: () => number = () => 0;

  constructor(
    grid:             WorldGrid,
    villages:         VillageManager,
    units:            UnitManager,
    fire:             FireSystem,
    effects:          EffectSystem,
    worldRenderer:    WorldRenderer,
    buildingRenderer: BuildingRenderer,
    unitRenderer:     UnitRenderer,
    feed:             EventFeed,
    creatureManager:  CreatureManager,
    creatureRenderer: CreatureRenderer,
  ) {
    this.grid             = grid;
    this.villages         = villages;
    this.units            = units;
    this.fire             = fire;
    this.effects          = effects;
    this.feed             = feed;
    this.worldRenderer    = worldRenderer;
    this.buildingRenderer = buildingRenderer;
    this.unitRenderer     = unitRenderer;
    this.creatureManager  = creatureManager;
    this.creatureRenderer = creatureRenderer;
  }

  // ─── Haupt-Dispatch ───────────────────────────────────────────────────────

  use(tool: string, tx: number, ty: number): ToolResult {
    switch (tool) {
      case 'lightning':        return this.useLightning(tx, ty);
      case 'fire':             return this.useFire(tx, ty);
      case 'rain':             return this.useRain(tx, ty);
      case 'meteor':           return this.useMeteor(tx, ty);
      case 'heal':             return this.useHeal(tx, ty);
      case 'human':            return this.useSpawn(tx, ty, 'human');
      case 'orc':              return this.useSpawn(tx, ty, 'orc');
      case 'elf':              return this.useSpawn(tx, ty, 'elf');
      case 'dwarf':            return this.useSpawn(tx, ty, 'dwarf');
      case 'wolf':             return this.useSpawnCreature(tx, ty, 'wolf');
      case 'demon':            return this.useSpawnCreature(tx, ty, 'demon');
      // ─── Terrain-Werkzeuge ─────────────────────────────────────────────────
      case 'terrain-grass':    return this.useTerrain(tx, ty, TileType.Grass);
      case 'terrain-water':    return this.useTerrain(tx, ty, TileType.Water);
      case 'terrain-forest':   return this.useTerrain(tx, ty, TileType.Forest);
      case 'terrain-mountain': return this.useTerrain(tx, ty, TileType.Mountain);
      case 'terrain-sand':     return this.useTerrain(tx, ty, TileType.Sand);
      default:                 return 'no-target';
    }
  }

  // ─── Tool-Implementierungen ───────────────────────────────────────────────

  private useLightning(tx: number, ty: number): ToolResult {
    // 1. Simulation
    applyLightning(tx, ty, this.grid, this.units);

    // 2. VFX — Bolt startet von Kamera-Oberkante
    const px     = tx * TILE + TILE / 2;
    const py     = ty * TILE + TILE / 2;
    const camTop = this.getCamTop();
    this.effects.spawnLightning(px, py, camTop);

    // 3. Treffer-Flash auf nächster Einheit im Radius 3 setzen
    const hitUnit = this.units.liveUnits
      .filter(u => Math.abs(u.x - tx) <= 3 && Math.abs(u.y - ty) <= 3)
      .sort((a, b) => Math.hypot(a.x - tx, a.y - ty) - Math.hypot(b.x - tx, b.y - ty))[0];
    if (hitUnit) hitUnit.hitFlash = 180;

    // 4. EventFeed-Meldung
    this.feed.push('⚡ Blitz schlägt ein', '#b6f3ff');

    // 5. Renderer
    this.worldRenderer.drawAll();
    this.unitRenderer.drawAll(this.units.liveUnits);
    return 'ok';
  }

  private useFire(tx: number, ty: number): ToolResult {
    // 1. Simulation — nur 1 Kachel
    const ignited = applyFire(tx, ty, this.fire);
    if (!ignited) return 'no-target';

    // 2. VFX — kleiner Impact-Ring
    const px = tx * TILE + TILE / 2;
    const py = ty * TILE + TILE / 2;
    this.effects.spawnImpactRing(px, py, 0xff6622, TILE * 1.8);

    // 3. EventFeed-Meldung
    this.feed.push('🔥 Feuer bricht aus', '#ff9944');

    // 4. Renderer
    this.worldRenderer.drawAll();
    return 'ok';
  }

  private useRain(tx: number, ty: number): ToolResult {
    // 1. Simulation
    applyRain(tx, ty, this.fire, this.units);

    // 2. VFX
    const px = tx * TILE + TILE / 2;
    const py = ty * TILE + TILE / 2;
    this.effects.spawnRain(px, py, 5 * TILE);

    // 3. EventFeed-Meldung
    this.feed.push('🌧 Regen löscht das Feuer', '#89c7ff');

    // 4. Renderer
    this.worldRenderer.drawAll();
    this.unitRenderer.drawAll(this.units.liveUnits);
    return 'ok';
  }

  private useMeteor(tx: number, ty: number): ToolResult {
    const px     = tx * TILE + TILE / 2;
    const py     = ty * TILE + TILE / 2;
    const camTop = this.getCamTop();

    // VFX starten — Simulation wird erst beim Einschlag (t >= 0.55) ausgelöst
    this.effects.spawnMeteor(px, py, camTop, 4 * TILE, () => {
      // Einschlag-Callback: Simulation und Renderer werden zeitverzögert ausgeführt
      applyMeteor(tx, ty, this.grid, this.fire, this.villages, this.units);
      // EventFeed-Meldung beim Einschlag
      this.feed.push('☄ Meteor schlägt ein!', '#ff9d41');
      this.worldRenderer.drawAll();
      this.buildingRenderer.drawAll(this.villages.liveBuildings);
      this.unitRenderer.drawAll(this.units.liveUnits);
    });
    return 'ok';
  }

  private useHeal(tx: number, ty: number): ToolResult {
    // 1. Simulation
    applyHeal(tx, ty, this.villages, this.units);

    // 2. VFX
    const px = tx * TILE + TILE / 2;
    const py = ty * TILE + TILE / 2;
    this.effects.spawnHeal(px, py, 3 * TILE);

    // 3. EventFeed-Meldung
    this.feed.push('✨ Heilung wirkt', '#80ffb2');

    // 4. Renderer
    this.buildingRenderer.drawAll(this.villages.liveBuildings);
    this.unitRenderer.drawAll(this.units.liveUnits);
    return 'ok';
  }

  private useSpawn(tx: number, ty: number, faction: FactionKey): ToolResult {
    const ok = applySpawnUnit(tx, ty, faction, this.grid, this.units);
    if (!ok) return 'cap-reached';

    // VFX — Spawn-Ring und Kreisfunken
    const px = tx * TILE + TILE / 2;
    const py = ty * TILE + TILE / 2;
    this.effects.spawnSpawnEffect(px, py, 2 * TILE);

    // EventFeed-Meldung
    this.feed.push('＋ Neue Einheit erscheint', '#aaffcc');

    this.unitRenderer.drawAll(this.units.liveUnits);
    return 'ok';
  }

  private useSpawnCreature(tx: number, ty: number, type: 'wolf' | 'demon'): ToolResult {
    if (!this.grid.isWalkable(tx, ty)) return 'no-target';

    this.creatureManager.spawn(type, tx, ty);

    // VFX — kleiner Spawn-Ring
    const px = tx * TILE + TILE / 2;
    const py = ty * TILE + TILE / 2;
    this.effects.spawnSpawnEffect(px, py, 2 * TILE);

    // EventFeed-Meldung
    const label = type === 'wolf' ? '🐺 Wolf erscheint' : '👿 Dämon erscheint!';
    const color = type === 'wolf' ? '#aaaaaa' : '#ff4444';
    this.feed.push(label, color);

    this.creatureRenderer.drawAll(this.creatureManager.liveCreatures);
    return 'ok';
  }

  // ─── Terrain-Malwerkzeug ─────────────────────────────────────────────────

  /**
   * Setzt den Kachel-Typ an (tx, ty) direkt und zeichnet die Welt neu.
   * Wasser-Terrain löscht zusätzlich Feuer auf der Zielkachel (Radius 0).
   */
  private useTerrain(tx: number, ty: number, type: TileType): ToolResult {
    if (!this.grid.inBounds(tx, ty)) return 'no-target';

    // Wasser löscht Feuer auf dem Tile
    if (type === TileType.Water) {
      this.fire.extinguishRadius(tx, ty, 0);
    }

    this.grid.set(tx, ty, type);
    this.worldRenderer.drawAll();
    this.feed.push(`🌍 Terrain geändert: ${this.terrainLabel(type)}`, '#9fb3c8');
    return 'ok';
  }

  /**
   * Gibt den deutschen Anzeigenamen für einen Kachel-Typ zurück.
   */
  private terrainLabel(type: TileType): string {
    const map: Partial<Record<TileType, string>> = {
      [TileType.Grass]:    'Gras',
      [TileType.Water]:    'Wasser',
      [TileType.Forest]:   'Wald',
      [TileType.Mountain]: 'Berg',
      [TileType.Sand]:     'Sand',
    };
    return map[type] ?? 'Unbekannt';
  }
}
