/**
 * WorldRenderer — Phase VFX (Performance-Fix)
 *
 * Zwei separate Graphics-Ebenen:
 *   mapG  — statisches Terrain; wird nur neu gezeichnet wenn Kacheln ihren
 *            Typ wechseln (z. B. Feuer-Ausbreitung, Löschung). Feuer-Kacheln
 *            werden hier als verkohlter Boden (Asche-Farbe) gezeichnet.
 *   fireG — nur Feuer-Flackern; wird ~12× pro Sekunde geleert und neu
 *            gezeichnet, enthält aber NUR Feuer-Kacheln, nicht das gesamte
 *            Terrain. Dadurch werden bei 80 ms Flacker-Takt maximal so viele
 *            Kacheln gezeichnet wie aktuell brennen — nicht alle 3920.
 */

import Phaser from 'phaser';
import { WorldGrid } from '@game/world/WorldGrid';
import { TileType } from '@game/world/TileTypes';
import { TILE, COLS, ROWS } from '@game/config';

export class WorldRenderer {
  /** Statische Terrain-Ebene — nur bei Kachel-Typwechseln neu gezeichnet. */
  private readonly mapG:  Phaser.GameObjects.RenderTexture;
  /** Feuer-Flacker-Ebene — wird unabhängig vom Terrain animiert. */
  private readonly fireG: Phaser.GameObjects.Graphics;
  private readonly grid:  WorldGrid;

  /** Wird in update() von GameScene gesetzt, damit Feuer flackert. */
  time: number = 0;

  constructor(mapGraphics: Phaser.GameObjects.RenderTexture, grid: WorldGrid, fireGraphics: Phaser.GameObjects.Graphics) {
    this.mapG  = mapGraphics;
    this.fireG = fireGraphics;
    this.grid  = grid;
  }

  // ─── Vollständige Neuzeichnung (Terrain) ─────────────────────────────────

  drawAll(): void {
    const g = this.mapG;
    g.clear();
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        this.drawTile(x, y);
      }
    }
  }

  redrawPatch(cx: number, cy: number, radius = 1): void {
    const tiles: Array<{ x: number; y: number }> = [];
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        tiles.push({ x, y });
      }
    }
    this.redrawTiles(tiles);
  }

  redrawTiles(tiles: Array<{ x: number; y: number }>): void {
    const seen = new Set<number>();
    for (const tile of tiles) {
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const x = tile.x + ox;
          const y = tile.y + oy;
          if (x < 0 || x >= COLS || y < 0 || y >= ROWS) continue;
          const idx = y * COLS + x;
          if (seen.has(idx)) continue;
          seen.add(idx);
          this.drawTile(x, y);
        }
      }
    }
  }

  // ─── Einzelne Kachel auf mapG ─────────────────────────────────────────────

  drawTile(x: number, y: number): void {
    const g  = this.mapG;
    const t  = this.grid.get(x, y);
    const m  = this.grid.getMeta(x, y);
    const px = x * TILE;
    const py = y * TILE;

    // Feuer-Kacheln werden auf mapG als verkohlter Boden dargestellt.
    // Das Flackern übernimmt ausschließlich fireG via drawFireLayer().
    const renderType = t === TileType.Fire ? TileType.Ash : t;
    const textureKey = this.baseTextureKeyFor(renderType);

    if (textureKey && this.mapG.scene.textures.exists(textureKey)) {
      g.stamp(textureKey, undefined, px, py, { originX: 0, originY: 0 });
    } else {
      g.fill(WorldRenderer.tileColor(renderType, m.variant), 1, px, py, TILE, TILE);
    }

    this.drawTerrainOverlays(x, y, renderType, px, py);
    this.drawTerrainDecor(x, y, renderType, m.variant, m.decor, px, py);

    // ─── Dekor ──────────────────────────────────────────────────────────────

    // Feuer wird NICHT hier gezeichnet — nur auf fireG via drawFireLayer()
  }

  // ─── Feuer-Flacker-Layer (nur fireG, nicht mapG) ─────────────────────────

  private baseTextureKeyFor(t: TileType): string {
    switch (t) {
      case TileType.Water:
        return 'terrain-base-water';
      case TileType.Sand:
        return 'terrain-base-sand';
      case TileType.Grass:
      case TileType.Forest:
        return 'terrain-base-grass';
      case TileType.Mountain:
        return 'terrain-base-stone';
      case TileType.Ash:
      case TileType.Fire:
        return 'terrain-base-ash';
      default:
        return '';
    }
  }

  private drawTerrainOverlays(x: number, y: number, t: TileType, px: number, py: number): void {
    if (t === TileType.Water || t === TileType.Ash || t === TileType.Fire) return;

    this.stampOverlayIfNeighbor(x, y, TileType.Water, 'coast-n', 0, -1, px, py);
    this.stampOverlayIfNeighbor(x, y, TileType.Water, 'coast-e', 1, 0, px, py);
    this.stampOverlayIfNeighbor(x, y, TileType.Water, 'coast-s', 0, 1, px, py);
    this.stampOverlayIfNeighbor(x, y, TileType.Water, 'coast-w', -1, 0, px, py);

    if (t === TileType.Grass || t === TileType.Forest || t === TileType.Mountain) {
      this.stampOverlayIfNeighbor(x, y, TileType.Sand, 'grass-sand-n', 0, -1, px, py);
      this.stampOverlayIfNeighbor(x, y, TileType.Sand, 'grass-sand-e', 1, 0, px, py);
      this.stampOverlayIfNeighbor(x, y, TileType.Sand, 'grass-sand-s', 0, 1, px, py);
      this.stampOverlayIfNeighbor(x, y, TileType.Sand, 'grass-sand-w', -1, 0, px, py);
    }
  }

  private drawTerrainDecor(
    x: number,
    y: number,
    t: TileType,
    variant: number,
    decor: boolean,
    px: number,
    py: number,
  ): void {
    let key = '';
    if (t === TileType.Forest) {
      if (variant > 0.78) key = 'terrain-decor-tree-cluster-02';
      else if (variant > 0.56) key = 'terrain-decor-tree-cluster-01';
      else if (variant > 0.36) key = 'terrain-decor-tree-02';
      else if (variant > 0.16) key = 'terrain-decor-tree-03';
      else key = 'terrain-decor-tree-01';
    } else if (t === TileType.Mountain) {
      if (variant > 0.76) key = 'terrain-decor-mountain-01';
      else if (variant > 0.50) key = 'terrain-decor-rock-03';
      else if (variant > 0.25) key = 'terrain-decor-rock-02';
      else key = 'terrain-decor-rock-01';
    } else if (decor && t === TileType.Grass) {
      if (variant > 0.86) key = 'terrain-decor-stump-01';
      else if (variant > 0.64) key = 'terrain-decor-bush-01';
      else if (variant > 0.42) key = 'terrain-decor-grass-tuft-01';
      else if (variant > 0.22) key = 'terrain-decor-flower-02';
      else key = 'terrain-decor-flower-01';
    } else if (decor && t === TileType.Sand) {
      key = variant > 0.55 ? 'terrain-decor-rock-02' : 'terrain-decor-rock-01';
    } else if (decor && t === TileType.Ash) {
      if (variant > 0.76) key = 'terrain-decor-dead-tree-01';
      else if (variant > 0.50) key = 'terrain-decor-crater-small-01';
      else if (variant > 0.28) key = 'terrain-decor-stump-01';
      else key = 'terrain-decor-rock-03';
    } else if (decor && t === TileType.Water) {
      key = variant > 0.82 ? 'terrain-decor-reed-01' : '';
    }

    if (key && this.mapG.scene.textures.exists(key)) {
      const jitterX = ((x * 5 + y * 3) % 3) - 1;
      const jitterY = ((x * 2 + y * 7) % 3) - 1;
      this.mapG.stamp(key, undefined, px + jitterX, py + jitterY, { originX: 0, originY: 0 });
    }
  }

  private stampOverlayIfNeighbor(
    x: number,
    y: number,
    type: TileType,
    overlay: string,
    dx: number,
    dy: number,
    px: number,
    py: number,
  ): void {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS || this.grid.get(nx, ny) !== type) return;

    const key = `terrain-overlay-${overlay}`;
    if (this.mapG.scene.textures.exists(key)) {
      this.mapG.stamp(key, undefined, px, py, { originX: 0, originY: 0 });
    }
  }

  /**
   * Löscht fireG und zeichnet nur die aktuell brennenden Kacheln neu.
   * Terrain (mapG) bleibt komplett unberührt.
   * Wird von GameScene alle ~80 ms aufgerufen statt drawAll().
   */
  drawFireLayer(time: number): void {
    this.time = time;
    const g   = this.fireG;
    g.clear();

    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (this.grid.get(x, y) === TileType.Fire) {
          this.drawFireTile(x * TILE, y * TILE, x, y);
        }
      }
    }
  }

  // ─── Feuer-Flacker-Rendering ──────────────────────────────────────────────

  private drawFireTile(px: number, py: number, tx: number, ty: number): void {
    const g = this.fireG;

    // Flacker-Phasen: jede Kachel hat eigene Phase basierend auf Position + Zeit
    const phase  = (this.time * 0.006 + tx * 3.7 + ty * 5.3) % (Math.PI * 2);
    const phase2 = (this.time * 0.009 + tx * 2.1 + ty * 4.1) % (Math.PI * 2);

    const flicker  = 0.75 + 0.25 * Math.sin(phase);
    const flicker2 = 0.70 + 0.30 * Math.sin(phase2);

    // Glut-Boden
    g.fillStyle(0x3a1610, 0.3);
    g.fillCircle(px + 9, py + 12, 6.5);

    // Äußere Flamme (wackelt)
    const h1 = 10 + 3 * Math.sin(phase);
    const w1 = 5 + 1.5 * Math.cos(phase2);
    g.fillStyle(0xff3a22, 0.92 * flicker);
    g.fillTriangle(
      px + 9 - w1,  py + 15,
      px + 9,        py + 15 - h1,
      px + 9 + w1,  py + 15,
    );

    // Innere Flamme (heller, schmaler)
    const h2 = 7 + 2 * Math.sin(phase2 + 1);
    g.fillStyle(0xffa820, 0.88 * flicker2);
    g.fillTriangle(
      px + 9 - 2.5, py + 14,
      px + 9,        py + 14 - h2,
      px + 9 + 2.5, py + 14,
    );

    // Kern-Glühen
    g.fillStyle(0xfff176, 0.75 * flicker);
    g.fillTriangle(
      px + 9 - 1.5, py + 13,
      px + 9,        py + 9 + 2 * Math.sin(phase),
      px + 9 + 1.5, py + 13,
    );

    // Kleines aufsteigendes Partikel (wechselt Position per Phase)
    if (Math.sin(phase * 2.3) > 0.3) {
      const px2 = px + 7 + 4 * ((Math.sin(phase * 1.7) + 1) * 0.5);
      const py2 = py + 6 - 3 * Math.abs(Math.sin(phase * 2));
      g.fillStyle(0xffe28a, 0.55 * flicker);
      g.fillCircle(px2, py2, 1.4);
    }
  }

  // ─── Farb-Mapping ─────────────────────────────────────────────────────────

  static tileColor(t: TileType, variant: number): number {
    switch (t) {
      case TileType.Water: {
        const r = 19  + Math.floor(variant * 10);
        const g = 64  + Math.floor(variant * 16);
        const b = 110 + Math.floor(variant * 22);
        return Phaser.Display.Color.GetColor(r, g, b);
      }
      case TileType.Sand:     return 0xb8a365;
      case TileType.Grass: {
        const g = 137 + Math.floor(variant * 20);
        const r = 56  + Math.floor(variant * 14);
        return Phaser.Display.Color.GetColor(r, g, 60);
      }
      case TileType.Forest:   return 0x2f7f3e;
      case TileType.Mountain: return 0x8b8e88;
      case TileType.Fire:     return variant > 0.5 ? 0xff7628 : 0xffca45;
      case TileType.Ash:      return 0x464b4f;
      case TileType.Road:     return 0x92734f;
      default:                return 0x000000;
    }
  }
}
