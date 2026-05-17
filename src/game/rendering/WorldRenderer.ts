/**
 * WorldRenderer — Phase VFX
 *
 * Zeichnet alle Kacheln. Feuer-Kacheln flackern pro Frame
 * via time-Parameter (ms seit Spielstart).
 */

import Phaser from 'phaser';
import { WorldGrid } from '@game/world/WorldGrid';
import { TileType } from '@game/world/TileTypes';
import { TILE, COLS, ROWS } from '@game/config';

export class WorldRenderer {
  private readonly g:    Phaser.GameObjects.Graphics;
  private readonly grid: WorldGrid;

  /** Wird in update() von GameScene gesetzt, damit Feuer flackert. */
  time: number = 0;

  constructor(graphics: Phaser.GameObjects.Graphics, grid: WorldGrid) {
    this.g    = graphics;
    this.grid = grid;
  }

  // ─── Vollständige Neuzeichnung ────────────────────────────────────────────

  drawAll(): void {
    const g = this.g;
    g.clear();
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        this.drawTile(x, y);
      }
    }
  }

  // ─── Einzelne Kachel ─────────────────────────────────────────────────────

  drawTile(x: number, y: number): void {
    const g  = this.g;
    const t  = this.grid.get(x, y);
    const m  = this.grid.getMeta(x, y);
    const px = x * TILE;
    const py = y * TILE;

    g.fillStyle(WorldRenderer.tileColor(t, m.variant), 1);
    g.fillRect(px, py, TILE, TILE);

    // ─── Dekor ──────────────────────────────────────────────────────────────

    if (t === TileType.Water && m.variant > 0.78) {
      g.fillStyle(0x65a7d8, 0.18);
      g.fillRoundedRect(px + 4, py + 5, 8, 3, 2);
    }

    if (t === TileType.Forest) {
      g.fillStyle(0x145a2e, 0.82);
      g.fillCircle(px + 9, py + 8, 6);
      g.fillStyle(0x0e3b22, 0.75);
      g.fillCircle(px + 6, py + 11, 4);
    }

    if (t === TileType.Mountain) {
      g.fillStyle(0xb9b9b0, 0.75);
      g.fillTriangle(px + 9, py + 3, px + 3, py + 15, px + 15, py + 15);
      g.fillStyle(0xffffff, 0.52);
      g.fillTriangle(px + 9, py + 3, px + 7, py + 8, px + 11, py + 8);
    }

    if (t === TileType.Fire) {
      this.drawFireTile(px, py, x, y);
    }
  }

  // ─── Feuer-Flacker-Rendering ──────────────────────────────────────────────

  private drawFireTile(px: number, py: number, tx: number, ty: number): void {
    const g = this.g;

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
