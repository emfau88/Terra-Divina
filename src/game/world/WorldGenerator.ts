/**
 * WorldGenerator — Phase 15
 *
 * Erzeugt die Spielwelt in ein WorldGrid.
 * Algorithmus aus Phase 2, erweitert um:
 * - Deterministischen Seed-basierten RNG (SeededRng)
 * - Weltkonfiguration: Größe, Typ, Startmodus
 *
 * Kein Phaser, kein Rendering, keine Simulation.
 */

import { TileType } from './TileTypes';
import { WorldGrid } from './WorldGrid';
import { COLS, ROWS } from '@game/config';
import { WorldSetupConfig } from './WorldSetupConfig';
import { SeededRng } from './SeededRng';

export class WorldGenerator {
  /**
   * Erzeugt ein neues WorldGrid gemäß der übergebenen Konfiguration.
   * Ohne Konfiguration: Standardgröße, Insel-Typ, zufälliger Seed.
   */
  static generate(cfg?: Partial<WorldSetupConfig>): WorldGrid {
    // Seed aus Konfiguration oder zufällig
    const seed = cfg?.seed ?? Math.floor(Math.random() * 999999);
    const rng  = new SeededRng(seed);

    // Weltgröße: 'small' → 36×62, 'medium' → COLS×ROWS (Standardwerte aus config)
    const cols = cfg?.size === 'small' ? 36 : COLS;
    const rows = cfg?.size === 'small' ? 62 : ROWS;

    const grid = new WorldGrid(cols, rows);
    WorldGenerator.fillTerrain(grid, rng, cfg);
    WorldGenerator.smoothCoasts(grid);
    WorldGenerator.randomizeDecor(grid, rng);
    return grid;
  }

  // ─── Terrain-Erstbefüllung ────────────────────────────────────────────────

  /**
   * Befüllt das Grid mit Terrain-Kacheln.
   * Die Terrain-Zusammensetzung richtet sich nach cfg.worldType.
   */
  private static fillTerrain(
    grid: WorldGrid,
    rng:  SeededRng,
    cfg?: Partial<WorldSetupConfig>,
  ): void {
    const worldType = cfg?.worldType ?? 'island';

    // Ellipsen-Radien je nach Welttyp
    let rx = grid.cols * 0.46;
    let ry = grid.rows * 0.44;

    if (worldType === 'archipelago') {
      // Kleinere Hauptinsel für Archipel-Modus
      rx = grid.cols * 0.20;
      ry = grid.rows * 0.19;
    } else if (worldType === 'forest') {
      rx = grid.cols * 0.52;
      ry = grid.rows * 0.49;
    } else if (worldType === 'mountain') {
      rx = grid.cols * 0.50;
      ry = grid.rows * 0.46;
    }

    const cx = (grid.cols - 1) / 2;
    const cy = (grid.rows - 1) / 2;

    // Wald- und Bergchancen je nach Welttyp anpassen
    const forestChance   = worldType === 'forest'   ? 0.32 : 0.16;
    const mountainGrass  = worldType === 'mountain' ? 0.13 : 0.055;
    const mountainForest = worldType === 'mountain' ? 0.08 : 0.035;

    // Zweite Insel-Verschiebung für Archipel-Modus
    const archipelagoBlobs = [
      { cx: grid.cols * 0.28, cy: grid.rows * 0.28, rx: grid.cols * 0.20, ry: grid.rows * 0.18 },
      { cx: grid.cols * 0.62, cy: grid.rows * 0.34, rx: grid.cols * 0.22, ry: grid.rows * 0.20 },
      { cx: grid.cols * 0.40, cy: grid.rows * 0.66, rx: grid.cols * 0.18, ry: grid.rows * 0.17 },
      { cx: grid.cols * 0.75, cy: grid.rows * 0.70, rx: grid.cols * 0.16, ry: grid.rows * 0.15 },
    ];

    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        // Ellipsen-Abstand vom Mittelpunkt (Hauptinsel)
        const nx = (x - cx) / rx;
        const ny = (y - cy) / ry;
        const d  = Math.sqrt(nx * nx + ny * ny);

        // Organisches Rauschen für Küstenlinien (deterministisch durch rng)
        const n =
          Math.sin(x * 0.53 + y * 0.21) * 0.05 +
          Math.sin(x * 0.19 - y * 0.43) * 0.06 +
          rng.next() * 0.08;

        let t: TileType = TileType.Water;

        if (worldType !== 'archipelago') {
          if (d + n < 0.94) t = TileType.Grass;
          if (d + n > 0.82 && d + n < 0.99) t = TileType.Sand;
        }

        // Archipel: zweite Insel-Blob mit versetztem Mittelpunkt prüfen
        if (worldType === 'archipelago' && t === TileType.Water) {
          for (const blob of archipelagoBlobs) {
            const nx2 = (x - blob.cx) / blob.rx;
            const ny2 = (y - blob.cy) / blob.ry;
            const d2  = Math.sqrt(nx2 * nx2 + ny2 * ny2);
            const n2  =
              Math.sin(x * 0.47 + y * 0.31) * 0.05 +
              Math.sin(x * 0.23 - y * 0.39) * 0.06 +
              rng.next() * 0.08;
            if (d2 + n2 < 0.94) t = TileType.Grass;
            if (d2 + n2 > 0.82 && d2 + n2 < 0.99) t = TileType.Sand;
            if (t !== TileType.Water) break;
          }
        }

        // Wald- und Bergverteilung
        if (t === TileType.Grass && rng.next() < forestChance)   t = TileType.Forest;
        if (t === TileType.Grass && rng.next() < mountainGrass)  t = TileType.Mountain;
        if (t === TileType.Forest && rng.next() < mountainForest) t = TileType.Mountain;
        if (worldType === 'mountain' && (t === TileType.Grass || t === TileType.Forest)) {
          const ridge =
            Math.abs((x / grid.cols) * 0.95 - (y / grid.rows) + 0.12) +
            Math.sin((x + y) * 0.31) * 0.035;
          if (ridge < 0.115 && rng.next() < 0.55) t = TileType.Mountain;
        }

        const i = grid.idx(x, y);
        grid.tiles[i] = t;
        grid.meta[i].variant = rng.next();
        grid.meta[i].decor   = rng.next() < 0.05;
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
   * Kein RNG nötig — rein deterministisch.
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

  /** Verteilt Dekor-Flags zufällig über alle Kacheln. */
  private static randomizeDecor(grid: WorldGrid, rng: SeededRng): void {
    for (let i = 0; i < grid.meta.length; i++) {
      grid.meta[i].decor = rng.next() < 0.05;
    }
  }

  // ─── Hilfsmethode: Land-Punkt in der Nähe suchen ─────────────────────────

  /**
   * Gibt den nächsten Gras- oder Sand-Punkt in der Nähe von (tx, ty) zurück.
   * Wird von GameScene genutzt, um Startpositionen für Dörfer zu finden.
   */
  static findLandNear(
    grid:   WorldGrid,
    tx:     number,
    ty:     number,
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
