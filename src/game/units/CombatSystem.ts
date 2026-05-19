/**
 * CombatSystem — Phase 7
 *
 * Verarbeitet Nahkampf zwischen Einheiten und Angriffe auf Gebäude.
 * Kein Phaser. Mutiert nur Unit- und Building-State.
 */

import { Unit }           from './Unit';
import { Building }       from '@game/factions/Building';
import { VillageManager } from '@game/factions/VillageManager';

function randi(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

export class CombatSystem {
  private readonly villages: VillageManager;

  /** Callback der nach jedem Treffer im Einheit-vs-Einheit-Kampf ausgelöst wird (Phase 13E). */
  onHit: ((px: number, py: number) => void) | null = null;

  /**
   * Callback der ausgelöst wird wenn eine Einheit durch eine andere Einheit getötet wird.
   * Nur für Einheit-vs-Einheit-Kämpfe — nicht für Hunger/Feuer-Tode.
   * Parameter: (attacker, defender) — beide noch nicht aus dem Array entfernt.
   */
  onKill: ((attacker: Unit, defender: Unit) => void) | null = null;

  /**
   * Fix 5 — Callback für Raider-Angriff auf Gebäude.
   * Wird ausgelöst wenn eine Einheit ein feindliches Gebäude trifft (nicht bei Feuer/Meteor).
   * Parameter: (attacker, building) — building noch nicht zerstört.
   */
  onBuildingHit: ((attacker: Unit, building: Building) => void) | null = null;

  constructor(villages: VillageManager) {
    this.villages = villages;
  }

  // ─── Einheit vs. Einheit ─────────────────────────────────────────────────

  fight(attacker: Unit, defender: Unit): boolean {
    if (attacker.cd > 0) return false;
    const dmg = randi(3, 7);
    defender.hp -= dmg;
    // Treffer-Callback für visuellen Funken-Effekt auslösen (Phase 13E)
    this.onHit?.(defender.visualX, defender.visualY);
    if (defender.hp <= 0) {
      defender.hp    = 0;
      defender.dead  = true;
      defender.state = 'wounded';
      // onKill-Callback für EventFeed-Todesmeldungen auslösen (AI-Fix)
      this.onKill?.(attacker, defender);
    } else {
      defender.state = 'fight';
    }
    attacker.state = 'fight';
    attacker.cd    = 3;
    return true;
  }

  // ─── Einheit vs. Gebäude ─────────────────────────────────────────────────

  attackBuilding(attacker: Unit, building: Building): boolean {
    if (attacker.cd > 0) return false;
    if (building.dead)   return false;

    const minHp = building.isIndestructible ? 1 : 0;
    const dmg   = randi(2, 5);
    building.hp = Math.max(minHp, building.hp - dmg);
    // Gebäude-Flash auslösen damit der Renderer eine rote Überlagerung zeigt (Phase 13E)
    building.hitFlash = 400;

    // Fix 5 — fire onBuildingHit for Village Under Attack EventFeed
    this.onBuildingHit?.(attacker, building);

    if (building.hp <= 0) {
      this.villages.destroyBuilding(building);
      // Plünderer bekommen Holz
      const loot = this.villages.villages[attacker.faction];
      if (loot) loot.wood += 4;
    }

    attacker.state = 'raid';
    attacker.cd    = 4;
    return true;
  }

  // ─── Nachbarn finden ─────────────────────────────────────────────────────

  nearestEnemy(u: Unit, allUnits: Unit[], radius: number): Unit | null {
    let closest: Unit | null = null;
    let minD = Infinity;
    for (const other of allUnits) {
      if (other.dead || other.faction === u.faction) continue;
      const d = dist(u.x, u.y, other.x, other.y);
      if (d < radius && d < minD) { minD = d; closest = other; }
    }
    return closest;
  }

  nearestEnemyBuilding(u: Unit, radius: number): Building | null {
    let closest: Building | null = null;
    let minD = Infinity;
    for (const b of this.villages.buildings) {
      if (b.dead || b.faction === u.faction) continue;
      const d = dist(u.x, u.y, b.x, b.y);
      if (d < radius && d < minD) { minD = d; closest = b; }
    }
    return closest;
  }

  nearestDamagedFriendly(u: Unit, radius: number): Building | null {
    let closest: Building | null = null;
    let minD = Infinity;
    for (const b of this.villages.buildings) {
      if (b.dead || b.faction !== u.faction || b.hp >= b.maxHp) continue;
      const d = dist(u.x, u.y, b.x, b.y);
      if (d < radius && d < minD) { minD = d; closest = b; }
    }
    return closest;
  }
}
