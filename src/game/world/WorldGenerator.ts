/**
 * WorldGenerator — Phase 2
 *
 * Erzeugt die Inselwelt in ein WorldGrid.
 * Algorithmus direkt aus dem Referenz-Prototyp portiert, aber sauber getrennt
 * von Phaser und Rendering.
 *
 * Kein Phaser, kein Rendering, keine Simulation.
 */

import { TileType } from './TileTypes';
import { WorldGrid } from './WorldGrid';
import { COLS, ROWS } from '@game/config';

export class WorldGenerator {
  /**
   * Erzeugt ein neues WorldGrid mit Insel-Terrain.
   * Identisch mit dem Referenz-Prototyp (noise + Ellipsen-Maske + Glättung).
   */
  static generate(cols: number = COLS, rows: number = ROWS): WorldGrid {
    const grid = new WorldGrid(cols, rows);
    WorldGenerator.fillTerrain(grid);
    WorldGenerator.smoothCoasts(grid);
    WorldGenerator.randomizeDecor(grid);
    return grid;
  }

  // ─── Terrain-Erstbefüllung ────────────────────────────────────────────────

  private static fillTerrain(grid: WorldGrid): void {
    const cx = (grid.cols - 1) / 2;
    const cy = (grid.rows - 1) / 2;
    const rx = grid.cols * 0.46;
    const ry = grid.rows * 0.44;

    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        const nx = (x - cx) / rx;
        const ny = (y - cy) / ry;
        const d  = Math.sqrt(nx * nx + ny * ny);

        // Leichtes Rauschen für organische Küstenlinien
        const n =
          Math.sin(x * 0.53 + y * 0.21) * 0.05 +
          Math.sin(x * 0.19 - y * 0.43) * 0.06 +
          Math.random() * 0.08;

        let t: TileType = TileType.Water;

        if (d + n < 0.94)  t = TileType.Grass;
        if (d + n > 0.82 && d + n < 0.99) t = TileType.Sand;
        if (t === TileType.Grass && Math.random() < 0.16) t = TileType.Forest;
        if (t === TileType.Grass  && Math.random() < 0.055) t = TileType.Mountain;
        if (t === TileType.Forest && Math.random() < 0.035) t = TileType.Mountain;

        const i = grid.idx(x, y);
        grid.tiles[i] = t;
        grid.meta[i].variant = Math.random();
        grid.meta[i].decor   = Math.random() < 0.05;
      }
    }
  }

  // ─── Küstenglättung ───────────────────────────────────────────────────────

  /**
   * Zwei Glättungs-Passes:
   * - Wasser-Kacheln, die von genug Land umgeben sind → Sand
   * - Land-Kacheln, die von genug Wasser umgeben sind → Wasser
   *
   * Erzeugt saubere Küstenlinien ohne isolierte Pixel.
   */
  private static smoothCoasts(grid: WorldGrid): void {
    for (let pass = 0; pass < 2; pass++) {
      // Snapshot anlegen, damit wir nicht in laufender Iteration schreiben
      const snapshot = [...grid.tiles];

      for (let y = 1; y < grid.rows - 1; y++) {
        for (let x = 1; x < grid.cols - 1; x++) {
          const current = snapshot[grid.idx(x, y)];
          let water = 0;
          let land  = 0;

          for (let oy = -1; oy <= 1; oy++) {
            for (let ox = -1; ox <= 1; ox++) {
              snapshot[grid.idx(x + ox, y + oy)] === TileType.Water
                ? water++
                : land++;
            }
          }

          if (current === TileType.Water && land >= 6) {
            grid.tiles[grid.idx(x, y)] = TileType.Sand;
          } else if (current !== TileType.Water && water >= 6) {
            grid.tiles[grid.idx(x, y)] = TileType.Water;
          }
        }
      }
    }
  }

  // ─── Dekor ────────────────────────────────────────────────────────────────

  private static randomizeDecor(grid: WorldGrid): void {
    for (let i = 0; i < grid.meta.length; i++) {
      grid.meta[i].decor = Math.random() < 0.05;
    }
  }

  // ─── Hilfsmethode: Land-Punkt in der Nähe suchen ─────────────────────────

  /**
   * Gibt den nächsten Gras- oder Sand-Punkt in der Nähe von (tx, ty) zurück.
   * Wird von GameScene genutzt, um Startpositionen für Dörfer zu finden.
   */
  static findLandNear(
    grid: WorldGrid,
    tx: number,
    ty: number,
    radius = 9,
  ): { x: number; y: number } {
    let best: { x: number; y: number } | null = null;
    let bestDist = Infinity;

    for (let y = 1; y < grid.rows - 1; y++) {
      for (let x = 1; x < grid.cols - 1; x++) {
        const t = grid.get(x, y);
        if (t !== TileType.Grass && t !== TileType.Sand) continue;
        const d = Math.hypot(x - tx, y - ty);
        if (d < radius && d < bestDist) {
          best = { x, y };
          bestDist = d;
        }
      }
    }

    return best ?? { x: Math.floor(grid.cols / 2), y: Math.floor(grid.rows / 2) };
  }
}
