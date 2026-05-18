/**
 * Creature — Phase 19
 *
 * Laufzeit-Zustand einer Wildkreatur (Wolf, Demon).
 * Kein Phaser, kein Rendering.
 */

import { TILE } from '@game/config';

export type CreatureType = 'wolf' | 'demon';

export type CreatureState =
  | 'wander'
  | 'hunt'
  | 'attack'
  | 'dead';

let nextCreatureId = 1;

export const CREATURE_DEFS: Readonly<Record<CreatureType, { maxHp: number; damage: number; speed: number }>> = {
  wolf:  { maxHp: 40,  damage: 6,  speed: 1 },
  demon: { maxHp: 120, damage: 14, speed: 1 },
};

export class Creature {
  readonly id:   number;
  readonly type: CreatureType;

  x:     number;
  y:     number;
  hp:    number;
  maxHp: number;
  dead:  boolean = false;
  state: CreatureState = 'wander';

  /** Angriffs-Cooldown (in AI-Ticks). */
  cd: number = 0;

  /** Denkpause — Kreatur wartet N Ticks vor neuem Wanderziel. */
  think: number = 0;

  /** Aktuelles Bewegungsziel. */
  target: { x: number; y: number } | null = null;

  // ─── Visuelle Interpolation ──────────────────────────────────────────────
  visualX: number;
  visualY: number;

  constructor(type: CreatureType, x: number, y: number) {
    this.id     = nextCreatureId++;
    this.type   = type;
    this.x      = x;
    this.y      = y;
    this.maxHp  = CREATURE_DEFS[type].maxHp;
    this.hp     = this.maxHp;
    this.visualX = x * TILE + TILE / 2;
    this.visualY = y * TILE + TILE / 2;
  }
}
