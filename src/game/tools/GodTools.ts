/**
 * GodTools — Phase VFX
 *
 * Reine Simulations-Funktionen für alle Gott-Tools.
 * Kein Phaser, kein Rendering, keine VFX.
 *
 * Änderungen in Phase VFX:
 * - applyFire: zündet nur EINE Kachel an (Ausbreitung → FireSystem)
 * - applyRain:  delegiert Löschung + Nässe an FireSystem
 * - applyLightning: lässt keine Feuer-Kacheln zurück
 * - applyMeteor: Kern → Asche, kein sofortiger Feuer-Kreis (FireSystem übernimmt Spread)
 */

import { WorldGrid }      from '@game/world/WorldGrid';
import { VillageManager } from '@game/factions/VillageManager';
import { UnitManager }    from '@game/units/UnitManager';
import { FireSystem }     from '@game/simulation/FireSystem';
import { FactionKey }     from '@game/factions/Faction';
import { TileType }       from '@game/world/TileTypes';

function randi(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function tilesInRadius(cx: number, cy: number, r: number): Array<{ x: number; y: number }> {
  const out: Array<{ x: number; y: number }> = [];
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (Math.hypot(dx, dy) <= r) out.push({ x: cx + dx, y: cy + dy });
    }
  }
  return out;
}

// ─── Blitz ────────────────────────────────────────────────────────────────────

/**
 * Schaden-Teil des Blitz-Tools. VFX wird separat von EffectSystem gehandhabt.
 * Trifft die nächste Einheit in Radius 3 oder verbrennt die Kachel zu Asche.
 */
export function applyLightning(
  cx: number, cy: number,
  grid: WorldGrid,
  units: UnitManager,
): { x: number; y: number } {
  const radius = 3;
  let closest: (typeof units.liveUnits)[0] | null = null;
  let minD = Infinity;
  for (const u of units.liveUnits) {
    const d = Math.hypot(u.x - cx, u.y - cy);
    if (d <= radius && d < minD) { minD = d; closest = u; }
  }

  if (closest) {
    closest.hp -= randi(30, 55);
    if (closest.hp <= 0) { closest.hp = 0; closest.dead = true; }
    closest.state = 'wounded';
    return { x: closest.x, y: closest.y };
  }

  // Kein Ziel → zentrale Kachel zu Asche (kein Feuerradius!)
  if (grid.inBounds(cx, cy) && grid.get(cx, cy) !== TileType.Water) {
    grid.set(cx, cy, TileType.Ash);
  }
  return { x: cx, y: cy };
}

// ─── Feuer ────────────────────────────────────────────────────────────────────

/**
 * Zündet EINE Kachel an. Ausbreitung übernimmt FireSystem organisch.
 * Gibt true zurück wenn die Kachel zündbar war.
 */
export function applyFire(
  cx: number, cy: number,
  fire: FireSystem,
): boolean {
  return fire.ignite(cx, cy);
}

// ─── Regen ────────────────────────────────────────────────────────────────────

/**
 * Löscht Feuer in Radius und macht Kacheln nass.
 * Heilt Einheiten leicht.
 */
export function applyRain(
  cx: number, cy: number,
  fire: FireSystem,
  units: UnitManager,
): void {
  const radius = 5;
  fire.extinguishRadius(cx, cy, radius);

  for (const u of units.liveUnits) {
    if (Math.hypot(u.x - cx, u.y - cy) <= radius) {
      u.hp = Math.min(u.maxHp, u.hp + randi(4, 8));
    }
  }
}

// ─── Meteor ───────────────────────────────────────────────────────────────────

/**
 * Schwerer Einschlag: Kern → Asche, Rand → Feuer (via FireSystem).
 * Schaden passiert beim Impact (VFX-Timing: ~55% der Effektdauer).
 */
export function applyMeteor(
  cx: number, cy: number,
  grid: WorldGrid,
  fire: FireSystem,
  villages: VillageManager,
  units: UnitManager,
): void {
  const coreR  = 2;
  const outerR = 4;

  for (const p of tilesInRadius(cx, cy, outerR)) {
    if (!grid.inBounds(p.x, p.y)) continue;
    const t = grid.get(p.x, p.y);
    if (t === TileType.Water || t === TileType.Mountain) continue;
    const d = Math.hypot(p.x - cx, p.y - cy);
    if (d <= coreR) {
      grid.set(p.x, p.y, TileType.Ash);
    } else {
      // Rand: über FireSystem anzünden damit Ausbreitung funktioniert
      fire.ignite(p.x, p.y);
    }
  }

  for (const b of villages.buildings) {
    if (b.dead) continue;
    const d = Math.hypot(b.x - cx, b.y - cy);
    if (d <= outerR) {
      const dmg = d <= coreR ? randi(60, 100) : randi(20, 40);
      b.hp = Math.max(b.isIndestructible ? 1 : 0, b.hp - dmg);
      if (b.hp <= 0) villages.destroyBuilding(b);
    }
  }

  for (const u of units.liveUnits) {
    const d = Math.hypot(u.x - cx, u.y - cy);
    if (d <= outerR) {
      const dmg = d <= coreR ? randi(40, 80) : randi(10, 25);
      u.hp -= dmg;
      u.state = 'wounded';
      if (u.hp <= 0) { u.hp = 0; u.dead = true; }
    }
  }
}

// ─── Heilen ───────────────────────────────────────────────────────────────────

export function applyHeal(
  cx: number, cy: number,
  villages: VillageManager,
  units: UnitManager,
): void {
  const radius = 3;

  for (const u of units.liveUnits) {
    if (Math.hypot(u.x - cx, u.y - cy) <= radius) {
      u.hp = u.maxHp;
      u.state = 'idle';
    }
  }

  for (const b of villages.buildings) {
    if (b.dead) continue;
    if (Math.hypot(b.x - cx, b.y - cy) <= radius) {
      b.hp = Math.min(b.maxHp, b.hp + randi(15, 30));
    }
  }
}

// ─── Einheit spawnen ──────────────────────────────────────────────────────────

export function applySpawnUnit(
  cx: number, cy: number,
  faction: FactionKey,
  grid: WorldGrid,
  units: UnitManager,
): boolean {
  const pos = grid.nearestWalkable(cx, cy, 3);
  if (!pos) return false;
  const u = units.spawnUnit(faction);
  if (!u) return false;
  u.x = pos.x;
  u.y = pos.y;
  return true;
}
