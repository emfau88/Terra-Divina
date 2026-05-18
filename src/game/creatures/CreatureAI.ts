/**
 * CreatureAI — Phase 19
 *
 * KI für Wolves und Demons.
 *
 * Wolf:  wandert, greift Einheiten in Nähe an, kann von Einheiten getötet werden.
 * Demon: aggressiver, greift Einheiten und Gebäude an, zündet gelegentlich Feuer.
 *
 * Kein Phaser. Liest WorldGrid + VillageManager + Unit[], mutiert Creature-State.
 */

import { Creature, CREATURE_DEFS, CreatureType } from './Creature';
import { Unit }           from '@game/units/Unit';
import { VillageManager } from '@game/factions/VillageManager';
import { WorldGrid }      from '@game/world/WorldGrid';
import { FireSystem }     from '@game/simulation/FireSystem';
import { TILE }           from '@game/config';

function randi(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

export class CreatureAI {
  private readonly grid:     WorldGrid;
  private readonly villages: VillageManager;
  private readonly fire:     FireSystem;

  /** Callback: Treffer-Pixel-Koordinaten für EffectSystem. */
  onHit:   ((px: number, py: number) => void) | null = null;
  /** Callback: Kreatur gestorben. */
  onDeath: ((type: CreatureType) => void) | null = null;

  constructor(grid: WorldGrid, villages: VillageManager, fire: FireSystem) {
    this.grid     = grid;
    this.villages = villages;
    this.fire     = fire;
  }

  // ─── Haupt-Dispatch ───────────────────────────────────────────────────────

  tick(c: Creature, allUnits: Unit[], _allCreatures: Creature[]): void {
    if (c.dead) return;
    if (c.cd > 0) c.cd--;

    switch (c.type) {
      case 'wolf':  this.wolfAI(c, allUnits);  break;
      case 'demon': this.demonAI(c, allUnits); break;
    }
  }

  // ─── Wolf ─────────────────────────────────────────────────────────────────

  private wolfAI(c: Creature, allUnits: Unit[]): void {
    // Feind in Sichtweite (Radius 4)?
    const target = this.nearestUnit(c, allUnits, 4);
    if (target) {
      if (dist(c.x, c.y, target.x, target.y) <= 1.5) {
        this.attackUnit(c, target);
      } else {
        c.state = 'hunt';
        this.stepToward(c, target.x, target.y);
      }
      return;
    }

    // Wandern
    c.state = 'wander';
    this.wander(c, 12);
  }

  // ─── Demon ───────────────────────────────────────────────────────────────

  private demonAI(c: Creature, allUnits: Unit[]): void {
    // Feind in Sichtweite (Radius 8)?
    const target = this.nearestUnit(c, allUnits, 8);
    if (target) {
      if (dist(c.x, c.y, target.x, target.y) <= 1.5) {
        this.attackUnit(c, target);
        // Dämon kann beim Angreifen Feuer entfachen
        if (Math.random() < 0.12) {
          this.fire.ignite(c.x, c.y);
        }
      } else {
        c.state = 'hunt';
        this.stepToward(c, target.x, target.y);
      }
      return;
    }

    // Feindliches Gebäude in Nähe angreifen
    const building = this.villages.liveBuildings.find(
      b => dist(c.x, c.y, b.x, b.y) < 6,
    );
    if (building) {
      if (dist(c.x, c.y, building.x, building.y) <= 1.5) {
        if (c.cd <= 0) {
          const dmg = CREATURE_DEFS[c.type].damage;
          building.hp -= dmg;
          c.cd = 8;
          if (Math.random() < 0.18) this.fire.ignite(c.x, c.y);
          const px = c.x * TILE + TILE / 2;
          const py = c.y * TILE + TILE / 2;
          this.onHit?.(px, py);
          if (building.hp <= 0 && !building.isIndestructible) {
            this.villages.destroyBuilding(building);
          }
        }
      } else {
        c.state = 'hunt';
        this.stepToward(c, building.x, building.y);
      }
      return;
    }

    // Wandern — Daemon bleibt näher am letzten Ziel
    c.state = 'wander';
    this.wander(c, 20);
  }

  // ─── Kampf ───────────────────────────────────────────────────────────────

  private attackUnit(c: Creature, u: Unit): void {
    if (c.cd > 0) return;

    const dmg = CREATURE_DEFS[c.type].damage + randi(-2, 2);

    // Kreatur trifft Einheit
    u.hp -= dmg;
    c.cd  = c.type === 'wolf' ? 6 : 4;

    const px = c.x * TILE + TILE / 2;
    const py = c.y * TILE + TILE / 2;
    this.onHit?.(px, py);

    if (u.hp <= 0) {
      u.dead = true;
    }

    // Einheit schlägt zurück (wenn Guard/Raider)
    if (!u.dead && (u.role === 'guard' || u.role === 'raider') && u.cd <= 0) {
      const counterDmg = randi(3, 7);
      c.hp -= counterDmg;
      u.cd  = 5;
      if (c.hp <= 0) {
        c.dead = true;
        this.onDeath?.(c.type);
      }
    }

    c.state = 'attack';
  }

  // ─── Wandern ─────────────────────────────────────────────────────────────

  private wander(c: Creature, radius: number): void {
    if (!c.target || c.think <= 0 || (c.x === c.target.x && c.y === c.target.y)) {
      c.target = {
        x: c.x + randi(-radius, radius),
        y: c.y + randi(-radius, radius),
      };
      c.think = randi(4, 10);
    }
    c.think--;
    this.stepToward(c, c.target.x, c.target.y);
  }

  // ─── Hilfsmethoden ───────────────────────────────────────────────────────

  private nearestUnit(c: Creature, units: Unit[], radius: number): Unit | null {
    let best: Unit | null = null;
    let bestDist = Infinity;
    for (const u of units) {
      if (u.dead) continue;
      const d = dist(c.x, c.y, u.x, u.y);
      if (d < radius && d < bestDist) {
        best = u;
        bestDist = d;
      }
    }
    return best;
  }

  private stepToward(c: Creature, tx: number, ty: number): void {
    const dx = Math.sign(tx - c.x);
    const dy = Math.sign(ty - c.y);

    const opts: Array<[number, number]> = [];
    if (dx !== 0 && dy !== 0) opts.push([dx, dy]);
    if (dx !== 0) opts.push([dx, 0]);
    if (dy !== 0) opts.push([0, dy]);
    opts.push([randi(-1, 1), randi(-1, 1)]);

    let best: { x: number; y: number } | null = null;
    let bestScore = -Infinity;

    for (const [ox, oy] of opts) {
      const nx = c.x + ox;
      const ny = c.y + oy;
      if (!this.grid.isWalkable(nx, ny)) continue;
      const score = -Math.hypot(nx - tx, ny - ty);
      if (score > bestScore) { bestScore = score; best = { x: nx, y: ny }; }
    }

    if (best) { c.x = best.x; c.y = best.y; }
  }
}
