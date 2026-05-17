/**
 * CameraController — Phase 3
 *
 * Kapselt die gesamte Kamera-Eingabe:
 * - Drag-to-Pan (1 Finger / Maus)
 * - Pinch-to-Zoom (2 Finger)
 * - Mausrad-Zoom
 *
 * Regeln:
 * - Kennt keine Spielzustände außer Kamera + Zeiger.
 * - GameScene delegiert nur noch; kein Eingabe-Code in GameScene mehr.
 * - Drag und Tap werden sauber getrennt: hasMoved-Flag verhindert, dass ein
 *   Pan-Ende als Tap interpretiert wird.
 */

import Phaser from 'phaser';
import { ZOOM_MIN, ZOOM_MAX } from '@game/config';

export class CameraController {
  private readonly scene: Phaser.Scene;
  private readonly cam: Phaser.Cameras.Scene2D.Camera;

  // ─── Drag-State ──────────────────────────────────────────────────────────
  private dragActive    = false;
  private dragStartX    = 0;
  private dragStartY    = 0;
  private camScrollX    = 0;
  private camScrollY    = 0;

  /** true, wenn der Zeiger nach pointerdown genug bewegt wurde. */
  private _hasMoved = false;

  // ─── Pinch-State ─────────────────────────────────────────────────────────
  private pinchActive   = false;
  private pinchLastDist = 0;

  constructor(scene: Phaser.Scene, camera: Phaser.Cameras.Scene2D.Camera) {
    this.scene = scene;
    this.cam   = camera;
    this.register();
  }

  // ─── Öffentliche API ─────────────────────────────────────────────────────

  /**
   * Gibt an, ob der letzte pointerdown-Zyklus als Bewegung endete.
   * GameScene nutzt dies, um Taps von Pans zu unterscheiden.
   */
  get hasMoved(): boolean {
    return this._hasMoved;
  }

  // ─── Event-Registrierung ─────────────────────────────────────────────────

  private register(): void {
    const input = this.scene.input;

    input.on(Phaser.Input.Events.POINTER_DOWN,  this.onDown,  this);
    input.on(Phaser.Input.Events.POINTER_MOVE,  this.onMove,  this);
    input.on(Phaser.Input.Events.POINTER_UP,    this.onUp,    this);
    input.on('wheel', this.onWheel, this);
  }

  destroy(): void {
    const input = this.scene.input;
    input.off(Phaser.Input.Events.POINTER_DOWN,  this.onDown,  this);
    input.off(Phaser.Input.Events.POINTER_MOVE,  this.onMove,  this);
    input.off(Phaser.Input.Events.POINTER_UP,    this.onUp,    this);
    input.off('wheel', this.onWheel, this);
  }

  // ─── Handler ─────────────────────────────────────────────────────────────

  private onDown(p: Phaser.Input.Pointer): void {
    // Pinch-Start: sobald ein zweiter Finger aufgesetzt wird
    const active = this.activePointers();
    if (active.length >= 2) {
      this.startPinch(active);
      return;
    }
    this.dragActive  = true;
    this._hasMoved   = false;
    this.dragStartX  = p.x;
    this.dragStartY  = p.y;
    this.camScrollX  = this.cam.scrollX;
    this.camScrollY  = this.cam.scrollY;
  }

  private onMove(_p: Phaser.Input.Pointer): void {
    const active = this.activePointers();

    // ─── Pinch ─────────────────────────────────────────────────────────────
    if (active.length >= 2) {
      if (!this.pinchActive) {
        this.startPinch(active);
      } else {
        this.updatePinch(active);
      }
      return;
    }

    // Pinch beendet (ein Finger weg) → zurück zu Drag
    if (this.pinchActive) {
      this.pinchActive = false;
    }

    // ─── Drag-Pan ──────────────────────────────────────────────────────────
    if (!this.dragActive) return;
    const p0 = active[0];
    if (!p0 || !p0.isDown) return;

    const dx = p0.x - this.dragStartX;
    const dy = p0.y - this.dragStartY;

    if (Math.abs(dx) + Math.abs(dy) > 8) this._hasMoved = true;
    if (!this._hasMoved) return;

    this.cam.setScroll(
      this.camScrollX - dx / this.cam.zoom,
      this.camScrollY - dy / this.cam.zoom,
    );
  }

  private onUp(): void {
    this.dragActive  = false;
    this.pinchActive = false;
  }

  private onWheel(
    _p: Phaser.Input.Pointer,
    _go: unknown,
    _dx: number,
    dy: number,
  ): void {
    this.applyZoom(this.cam.zoom + (dy > 0 ? -0.1 : 0.1));
  }

  // ─── Pinch-Hilfsmethoden ─────────────────────────────────────────────────

  private startPinch(active: Phaser.Input.Pointer[]): void {
    this.pinchActive   = true;
    this.pinchLastDist = Phaser.Math.Distance.Between(
      active[0].x, active[0].y,
      active[1].x, active[1].y,
    );
  }

  private updatePinch(active: Phaser.Input.Pointer[]): void {
    const dist = Phaser.Math.Distance.Between(
      active[0].x, active[0].y,
      active[1].x, active[1].y,
    );
    const ratio = dist / Math.max(1, this.pinchLastDist);
    this.applyZoom(this.cam.zoom * ratio);
    this.pinchLastDist = dist;
    this._hasMoved = true;
  }

  private applyZoom(newZoom: number): void {
    this.cam.setZoom(Phaser.Math.Clamp(newZoom, ZOOM_MIN, ZOOM_MAX));
  }

  // ─── Hilfsmethode ────────────────────────────────────────────────────────

  private activePointers(): Phaser.Input.Pointer[] {
    return this.scene.input.manager.pointers.filter(p => p.isDown);
  }
}
