/**
 * CreatureManager — Phase 19
 *
 * Verwaltet alle Wildkreaturen: Spawn, AI-Tick, Tod.
 * Kein Phaser, kein Rendering.
 */

import { Creature, CreatureType } from './Creature';
import { CreatureAI }             from './CreatureAI';
import { Unit }                   from '@game/units/Unit';
import { VillageManager }         from '@game/factions/VillageManager';
import { WorldGrid }              from '@game/world/WorldGrid';
import { FireSystem }             from '@game/simulation/FireSystem';

export class CreatureManager {
  readonly creatures: Creature[] = [];

  private readonly ai: CreatureAI;

  /** Callback: wird nach einem Treffer-Hit mit Pixel-Koordinaten gerufen. */
  onHit: ((px: number, py: number) => void) | null = null;

  /** Callback: wird nach einem Kreatur-Tod aufgerufen (für EventFeed). */
  onDeath: ((type: CreatureType) => void) | null = null;

  constructor(grid: WorldGrid, villages: VillageManager, fire: FireSystem) {
    this.ai = new CreatureAI(grid, villages, fire);
    this.ai.onHit   = (px, py) => this.onHit?.(px, py);
    this.ai.onDeath = (type)   => this.onDeath?.(type);
  }

  // ─── Spawn ───────────────────────────────────────────────────────────────

  spawn(type: CreatureType, x: number, y: number): Creature {
    const c = new Creature(type, x, y);
    this.creatures.push(c);
    return c;
  }

  // ─── Tick ────────────────────────────────────────────────────────────────

  tick(units: Unit[]): void {
    for (const c of this.creatures) {
      if (c.dead) continue;
      this.ai.tick(c, units, this.creatures);
    }
    this.removeDead();
  }

  // ─── Hilfsmethoden ───────────────────────────────────────────────────────

  private removeDead(): void {
    for (let i = this.creatures.length - 1; i >= 0; i--) {
      if (this.creatures[i].dead) this.creatures.splice(i, 1);
    }
  }

  get liveCreatures(): Creature[] {
    return this.creatures.filter(c => !c.dead);
  }
}
