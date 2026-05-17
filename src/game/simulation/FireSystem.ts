/**
 * FireSystem — Phase VFX
 *
 * Verwaltet organische Feuer-Ausbreitung mit burn-Countdown pro Kachel.
 * Portiert vom Referenz-Prototyp, sauber modularisiert.
 *
 * Zuständigkeiten:
 *   - Brennende Kacheln verfolgen
 *   - Burn-Countdown dekrementieren
 *   - Ausbreitung auf Nachbarn (cardinal, nicht diagonal)
 *   - Wet-Blocking (Regen verhindert Ausbreitung)
 *   - Einheiten-Schaden durch Feuer
 *   - Kachel → Asche wenn burn abgelaufen
 *
 * KEINE Render-Logik. KEIN Phaser.
 */

import { WorldGrid }      from '@game/world/WorldGrid';
import { UnitManager }    from '@game/units/UnitManager';
import { TileType }       from '@game/world/TileTypes';
import { BALANCE }        from '@game/data/balance';

function randi(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

/** Alle 4 Himmelsrichtungen. */
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

export class FireSystem {
  private readonly grid:  WorldGrid;
  private readonly units: UnitManager;

  /** Akkumulator für spread-Ticks (in ms). */
  private spreadAccum = 0;

  constructor(grid: WorldGrid, units: UnitManager) {
    this.grid  = grid;
    this.units = units;
  }

  // ─── Öffentliche API ─────────────────────────────────────────────────────

  /**
   * Zündet eine einzelne Kachel an (Tool-Einsatz).
   * Schlägt still fehl wenn die Kachel nicht brennbar ist.
   */
  ignite(x: number, y: number): boolean {
    if (!this.grid.inBounds(x, y)) return false;
    const t = this.grid.get(x, y);
    if (t === TileType.Water || t === TileType.Mountain ||
        t === TileType.Fire  || t === TileType.Ash) return false;

    this.grid.set(x, y, TileType.Fire);
    this.grid.setMeta(x, y, { burn: randi(BALANCE.FIRE_BURN_MIN, BALANCE.FIRE_BURN_MAX) });
    return true;
  }

  /**
   * Löscht alle Feuer-Kacheln in einem Radius (Regen-Tool).
   * Setzt wet-Meta damit neue Feuer nicht sofort wieder zünden.
   */
  extinguishRadius(cx: number, cy: number, radius: number): void {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.hypot(dx, dy) > radius) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (!this.grid.inBounds(nx, ny)) continue;
        if (this.grid.get(nx, ny) === TileType.Fire) {
          this.grid.set(nx, ny, TileType.Ash);
        }
        // Regen hinterlässt Nässe — blockiert Ausbreitung für ~7 Ticks
        this.grid.setMeta(nx, ny, { wet: BALANCE.RAIN_WET_TICKS });
      }
    }
  }

  // ─── Tick (von GameScene aufgerufen) ─────────────────────────────────────

  tick(deltaMs: number): boolean {
    this.spreadAccum += deltaMs;
    if (this.spreadAccum < BALANCE.FIRE_SPREAD_INTERVAL_MS) return false;
    this.spreadAccum = 0;

    this.doSpreadTick();
    return true;  // true = Karte muss neu gezeichnet werden
  }

  private doSpreadTick(): void {
    // Snapshot der aktuell brennenden Kacheln
    const fires: Array<{ x: number; y: number }> = [];
    for (let y = 0; y < this.grid.rows; y++) {
      for (let x = 0; x < this.grid.cols; x++) {
        if (this.grid.get(x, y) === TileType.Fire) {
          fires.push({ x, y });
        }
      }
    }
    if (fires.length === 0) return;

    for (const f of fires) {
      const m = this.grid.getMeta(f.x, f.y);

      // Burn-Countdown
      m.burn--;
      if (m.burn <= 0) {
        this.grid.set(f.x, f.y, TileType.Ash);
        continue;
      }

      // Einheiten auf dieser Kachel schädigen
      for (const u of this.units.units) {
        if (u.dead) continue;
        if (u.x === f.x && u.y === f.y) {
          u.hp -= 3;
          u.state = 'wounded';
          if (u.hp <= 0) u.dead = true;
        }
      }

      // Ausbreitung auf Nachbarn
      for (const [dx, dy] of DIRS) {
        const nx = f.x + dx;
        const ny = f.y + dy;
        if (!this.grid.inBounds(nx, ny)) continue;

        const nm  = this.grid.getMeta(nx, ny);
        if (nm.wet > 0) {
          nm.wet--;
          continue;
        }

        const nt = this.grid.get(nx, ny);
        if (nt !== TileType.Grass && nt !== TileType.Forest &&
            nt !== TileType.Sand  && nt !== TileType.Road) continue;

        const chance = nt === TileType.Forest
          ? BALANCE.FIRE_SPREAD_FOREST
          : nt === TileType.Grass
            ? BALANCE.FIRE_SPREAD_GRASS
            : BALANCE.FIRE_SPREAD_SAND;

        if (Math.random() < chance) {
          this.grid.set(nx, ny, TileType.Fire);
          this.grid.setMeta(nx, ny, { burn: randi(BALANCE.FIRE_BURN_MIN, BALANCE.FIRE_BURN_MAX) });
        }
      }
    }
  }

  /** Gibt zurück ob irgendwo Feuer brennt. */
  get hasFire(): boolean {
    for (let i = 0; i < this.grid.tiles.length; i++) {
      if (this.grid.tiles[i] === TileType.Fire) return true;
    }
    return false;
  }
}
