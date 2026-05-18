/**
 * EffectTypes — Phase VFX
 *
 * Typen für alle transienten visuellen Effekte.
 * Kein Phaser, kein Spielzustand — nur Daten-Strukturen.
 */

let nextEffectId = 1;
export function newEffectId(): number { return nextEffectId++; }

// ─── Basis ────────────────────────────────────────────────────────────────────

interface BaseEffect {
  readonly id:       number;
  /** Pixelkoordinaten (Welt-Pixel, nicht Kacheln). */
  readonly px:       number;
  readonly py:       number;
  age:               number;   // ms seit Spawn
  readonly duration: number;   // ms Gesamtlaufzeit
}

/** t = 0..1, normalisierter Fortschritt des Effekts. */
export function effectT(e: BaseEffect): number {
  return Math.min(1, e.age / e.duration);
}

// ─── Konkrete Typen ───────────────────────────────────────────────────────────

export interface LightningEffect extends BaseEffect {
  readonly type: 'lightning';
  readonly seed: number;        // für jittered Linie reproduzierbar
  readonly targetPy: number;    // Endpunkt Y (Zielpixel)
  readonly impactR:  number;    // Impact-Ring Radius in Pixeln
}

export interface ImpactRingEffect extends BaseEffect {
  readonly type:  'ring';
  readonly color: number;
  readonly maxR:  number;
}

export interface SparkEffect extends BaseEffect {
  readonly type:  'spark';
  readonly color: number;
  vx: number;
  vy: number;
}

export interface RainEffect extends BaseEffect {
  readonly type:   'rain';
  readonly radius: number;  // Radius in Pixeln
  readonly seed:   number;
}

export interface MeteorEffect extends BaseEffect {
  readonly type:      'meteor';
  readonly fromPy:    number;   // Startpunkt Y (oben im Viewport)
  readonly impactR:   number;
  /** Optionaler Callback, der genau einmal beim Einschlag ausgelöst wird. */
  onImpact?:    () => void;
  /** Verhindert doppelten Callback-Aufruf. */
  impactFired:  boolean;
}

export interface HealEffect extends BaseEffect {
  readonly type:   'heal';
  readonly radius: number;
}

export type Effect =
  | LightningEffect
  | ImpactRingEffect
  | SparkEffect
  | RainEffect
  | MeteorEffect
  | HealEffect;
