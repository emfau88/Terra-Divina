/**
 * WorldGrid — Phase 2
 *
 * Hält den flachen Kachel-Array und die Kachel-Metadaten.
 * Stellt Queries und Bounds-Checks bereit.
 *
 * Enthält kein Phaser, kein Rendering, keine Simulation.
 * Ist reines Datenmodell.
 */

import { TileType, isWalkable } from './TileTypes';
import { COLS, ROWS } from '@game/config';

/** Metadaten pro Kachel — ergänzt den Basis-Typ. */
export interface TileMeta {
  /** Zufällige Variante für visuelle Abwechslung (0..1). */
  variant: number;
  /** Verbleibende Brand-Ticks, wenn die Kachel brennt. */
  burn: number;
  /** Verbleibende Nass-Ticks nach Regen. */
  wet: number;
  /** Ob auf dieser Kachel ein Dekorelement steht. */
  decor: boolean;
}

function defaultMeta(): TileMeta {
  return { variant: 0, burn: 0, wet: 0, decor: false };
}

export class WorldGrid {
  /** Flacher Kachel-Typ-Array, Länge = COLS * ROWS. */
  readonly tiles: TileType[];
  /** Metadaten parallel zu `tiles`. */
  readonly meta: TileMeta[];

  readonly cols: number;
  readonly rows: number;

  constructor(cols: number = COLS, rows: number = ROWS) {
    this.cols = cols;
    this.rows = rows;
    const size = cols * rows;
    this.tiles = new Array<TileType>(size).fill(TileType.Water);
    this.meta  = Array.from({ length: size }, defaultMeta);
  }

  // ─── Indexierung ──────────────────────────────────────────────────────────

  idx(x: number, y: number): number {
    return y * this.cols + x;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows;
  }

  // ─── Lesen ────────────────────────────────────────────────────────────────

  get(x: number, y: number): TileType {
    if (!this.inBounds(x, y)) return TileType.Water;
    return this.tiles[this.idx(x, y)];
  }

  getMeta(x: number, y: number): TileMeta {
    // Außerhalb der Grenzen: schreibgeschütztes Default-Objekt zurückgeben
    if (!this.inBounds(x, y)) return defaultMeta();
    return this.meta[this.idx(x, y)];
  }

  isWalkable(x: number, y: number): boolean {
    return isWalkable(this.get(x, y));
  }

  // ─── Schreiben ────────────────────────────────────────────────────────────

  set(x: number, y: number, type: TileType): void {
    if (!this.inBounds(x, y)) return;
    const i = this.idx(x, y);
    this.tiles[i] = type;
    this.meta[i].variant = Math.random();
  }

  setMeta(x: number, y: number, patch: Partial<TileMeta>): void {
    if (!this.inBounds(x, y)) return;
    Object.assign(this.meta[this.idx(x, y)], patch);
  }

  // ─── Hilfsmethoden ───────────────────────────────────────────────────────

  /** Gibt die Anzahl der Nachbarn zurück, die einen bestimmten Typ haben. */
  countNeighbors(x: number, y: number, type: TileType): number {
    let count = 0;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (ox === 0 && oy === 0) continue;
        if (this.get(x + ox, y + oy) === type) count++;
      }
    }
    return count;
  }

  /**
   * Sucht den nächsten begehbaren Punkt in der Nähe von (tx, ty).
   * Gibt null zurück, wenn kein Punkt in Reichweite gefunden wurde.
   */
  nearestWalkable(tx: number, ty: number, radius = 5): { x: number; y: number } | null {
    for (let r = 0; r <= radius; r++) {
      const pts: Array<{ x: number; y: number }> = [];
      for (let oy = -r; oy <= r; oy++) {
        for (let ox = -r; ox <= r; ox++) {
          if (Math.abs(ox) + Math.abs(oy) !== r) continue;
          pts.push({ x: tx + ox, y: ty + oy });
        }
      }
      // Zufällige Reihenfolge für faire Auswahl
      for (let i = pts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pts[i], pts[j]] = [pts[j], pts[i]];
      }
      for (const p of pts) {
        if (this.isWalkable(p.x, p.y)) return p;
      }
    }
    return null;
  }
}
