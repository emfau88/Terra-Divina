/**
 * UnitAI — Phase 7 / Contact-Fix
 *
 * Vollständige Rollen-KI für alle vier Rollen: gatherer, builder, guard, raider.
 * Portiert und überarbeitet aus dem Referenz-Prototyp.
 *
 * Neu (Contact-Fix):
 * - Raider wandern im Frieden 13 Kacheln, bei Anspannung 20 Kacheln (war: 5).
 * - Sichtkontakt-Ereignisse: Einheiten erkennen Feinde in CONTACT_DETECTION_RANGE.
 * - Grenzvorfall-Ereignisse: Einheiten < CONTACT_BORDER_RANGE lösen extra Druck aus.
 * - onContactEvent-Callback für GameScene → EventFeed-Integration.
 *
 * Kein Phaser. Liest WorldGrid + VillageManager, mutiert nur Unit-State.
 */

import { Unit }           from './Unit';
import { CombatSystem }   from './CombatSystem';
import { VillageManager } from '@game/factions/VillageManager';
import { WorldGrid }      from '@game/world/WorldGrid';
import { TileType }       from '@game/world/TileTypes';
import { FactionKey, FACTION_KEYS } from '@game/factions/Faction';
import { FACTION_TRAITS } from '@game/factions/FactionTraits';
import { BALANCE }        from '@game/data/balance';

export type ContactEventKind = 'sighting' | 'border';

export interface ContactEvent {
  kind:    ContactEventKind;
  /** Fraktion, die den Feind gesichtet hat. */
  spotter: FactionKey;
  /** Gesichtete Fraktion. */
  spotted: FactionKey;
}

function randi(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

export class UnitAI {
  private readonly grid:     WorldGrid;
  private readonly villages: VillageManager;
  readonly combat:           CombatSystem;

  /** Wird von GameScene nach jedem Diplomatie-Tick gesetzt. */
  isWar: boolean = false;

  /**
   * Diplomatischer Zustand — wird von UnitManager nach Diplomatie-Tick gesetzt.
   * Steuert den Raider-Wanderradius.
   */
  isTension: boolean = false;

  /**
   * Callback für Kontakt-/Sichtungsereignisse.
   * Wird von GameScene an EventFeed + DiplomacySystem weitergeleitet.
   */
  onContactEvent: ((evt: ContactEvent) => void) | null = null;

  /**
   * Cooldown-Zähler pro Fraktionspaar für Sichtungs-Events.
   * Key: `${spotterKey}:${spottedKey}` — Ticks bis nächstes Event erlaubt.
   */
  private readonly contactCooldowns = new Map<string, number>();

  constructor(grid: WorldGrid, villages: VillageManager) {
    this.grid     = grid;
    this.villages = villages;
    this.combat   = new CombatSystem(villages);
  }

  // ─── Haupt-Dispatch ──────────────────────────────────────────────────────

  tick(u: Unit, allUnits: Unit[]): void {
    if (u.dead) return;

    // Cooldown-Schritt
    if (u.cd > 0) u.cd--;

    // Contact-Cooldowns herunterzählen
    for (const [key, val] of this.contactCooldowns) {
      if (val > 0) this.contactCooldowns.set(key, val - 1);
    }

    // Beim Fliehen: immer nach Hause bewegen
    if (u.state === 'flee') {
      this.retreatHome(u);
      if (u.hp > u.maxHp * 0.55) u.state = 'idle';
      return;
    }

    // Schwer verwundet → fliehen
    if (u.hp < u.maxHp * 0.25) {
      u.state = 'flee';
      this.retreatHome(u);
      return;
    }

    // Sichtkontakt-Prüfung: nur für Raider und Guards (Kosten-Nutzen)
    if (u.role === 'raider' || u.role === 'guard') {
      this.checkContactSighting(u, allUnits);
    }

    switch (u.role) {
      case 'gatherer': this.gathererAI(u, allUnits); break;
      case 'builder':  this.builderAI(u, allUnits);  break;
      case 'guard':    this.guardAI(u, allUnits);    break;
      case 'raider':   this.raiderAI(u, allUnits);   break;
    }
  }

  // ─── Sichtkontakt-Erkennung ──────────────────────────────────────────────

  /**
   * Prüft ob eine Einheit Feinde in Sichtweite hat und feuert Contact-Events.
   * Nur außerhalb des Kriegszustands aktiv — im Krieg ist Kontakt normal.
   */
  private checkContactSighting(u: Unit, allUnits: Unit[]): void {
    if (this.isWar) return;
    if (!this.onContactEvent) return;

    for (const other of allUnits) {
      if (other.dead || other.faction === u.faction) continue;

      const d = dist(u.x, u.y, other.x, other.y);
      if (d > BALANCE.CONTACT_DETECTION_RANGE) continue;

      // Cooldown-Key: Spotter-Fraktion → Spotted-Fraktion
      const cdKey = `${u.faction}:${other.faction}`;
      const cooldown = this.contactCooldowns.get(cdKey) ?? 0;
      if (cooldown > 0) continue;

      // Art des Ereignisses bestimmen
      const kind: ContactEventKind = d <= BALANCE.CONTACT_BORDER_RANGE
        ? 'border'
        : 'sighting';

      this.contactCooldowns.set(cdKey, BALANCE.CONTACT_SIGHTING_COOLDOWN);
      this.onContactEvent({ kind, spotter: u.faction, spotted: other.faction });
      // Nur ein Event pro Tick pro Einheit
      return;
    }
  }

  // ─── Gatherer ────────────────────────────────────────────────────────────

  private gathererAI(u: Unit, allUnits: Unit[]): void {
    // Nahkampf-Selbstverteidigung
    const threat = this.combat.nearestEnemy(u, allUnits, 2);
    if (threat) {
      if (dist(u.x, u.y, threat.x, threat.y) <= 1.5) {
        this.combat.fight(u, threat);
      } else {
        this.stepToward(u, threat.x, threat.y);
      }
      return;
    }

    // Voll beladen → nach Hause
    if (u.carryFood + u.carryWood >= 3) {
      this.returnHome(u);
      return;
    }

    u.state = 'wander';
    // ResourceSystem übernimmt das eigentliche Sammeln
    this.wanderNearHome(u, 8);
  }

  // ─── Builder ─────────────────────────────────────────────────────────────

  private builderAI(u: Unit, allUnits: Unit[]): void {
    // Nicht kämpfen — Gefahr → fliehen
    const threat = this.combat.nearestEnemy(u, allUnits, 4);
    if (threat) {
      u.state = 'flee';
      this.retreatHome(u);
      return;
    }

    if (u.carryFood + u.carryWood >= 2) {
      this.returnHome(u);
      return;
    }

    // Beschädigtes Gebäude reparieren
    const damaged = this.combat.nearestDamagedFriendly(u, 10);
    if (damaged) {
      if (dist(u.x, u.y, damaged.x, damaged.y) <= 1.5) {
        u.state  = 'repair';
        damaged.hp = Math.min(damaged.maxHp, damaged.hp + 4);
      } else {
        u.state = 'repair';
        this.stepToward(u, damaged.x, damaged.y);
      }
      return;
    }

    u.state = 'wander';
    this.wanderNearHome(u, 7);
  }

  // ─── Guard ───────────────────────────────────────────────────────────────

  private guardAI(u: Unit, allUnits: Unit[]): void {
    const v = this.villages.villages[u.faction];
    if (!v) return;

    // Feind in der Nähe? → angreifen
    const enemy = this.combat.nearestEnemy(u, allUnits, 9);
    if (enemy) {
      if (dist(u.x, u.y, enemy.x, enemy.y) <= 1.5) {
        this.combat.fight(u, enemy);
      } else {
        u.state = 'defend';
        this.stepToward(u, enemy.x, enemy.y);
      }
      return;
    }

    // Patrouille: zwischen Outpost und Dorfmitte
    const outpost = this.villages.buildings.find(
      b => !b.dead && b.faction === u.faction && b.type === 'outpost',
    );
    const patrol = outpost ?? v;

    if (!u.target || (u.x === u.target.x && u.y === u.target.y) || u.think <= 0) {
      // Abwechselnd Dorfmitte ↔ Outpost/Patrol
      const goToVillage = Math.random() < 0.5 || !outpost;
      u.target = goToVillage
        ? { x: v.x + randi(-2, 2), y: v.y + randi(-2, 2) }
        : { x: patrol.x + randi(-3, 3), y: patrol.y + randi(-3, 3) };
      u.think  = randi(6, 14);
      u.state  = 'patrol';
    }
    u.think--;
    this.stepToward(u, u.target.x, u.target.y);
  }

  // ─── Raider ──────────────────────────────────────────────────────────────

  private raiderAI(u: Unit, allUnits: Unit[]): void {
    const v = this.villages.villages[u.faction];
    if (!v) return;

    // Im Frieden / bei Anspannung: Raider erkunden in größerem Radius
    // Peace:   13 Kacheln (war: 5) — macht Raider sichtbar aktiv
    // Tension: 20 Kacheln — nähert sich feindlichem Gebiet
    if (!this.isWar) {
      const threat = this.combat.nearestEnemy(u, allUnits, 3);
      if (threat && dist(u.x, u.y, threat.x, threat.y) <= 1.5) {
        this.combat.fight(u, threat);
        return;
      }
      const wanderRadius = this.isTension
        ? BALANCE.RAIDER_WANDER_TENSION   // 20 Kacheln bei Anspannung
        : BALANCE.RAIDER_WANDER_PEACE;    // 13 Kacheln im Frieden
      u.state = 'scout';
      this.wanderNearHome(u, wanderRadius);
      return;
    }

    const aggrRadius = Math.round(6 * FACTION_TRAITS[u.faction].raiderAggrMult);
    const enemy = this.combat.nearestEnemy(u, allUnits, aggrRadius);

    // Nahkampf: feindliche Einheit
    if (enemy && dist(u.x, u.y, enemy.x, enemy.y) <= 1.5) {
      this.combat.fight(u, enemy);
      return;
    }

    // Feind in Sichtweite verfolgen
    if (enemy) {
      u.state = 'march';
      this.stepToward(u, enemy.x, enemy.y);
      return;
    }

    // Kein Feind in Nähe → zum feindlichen Dorf marschieren
    // Wählt eine zufällige feindliche Fraktion, die noch ein Dorf hat
    const enemyFactions = FACTION_KEYS.filter(
      k => k !== u.faction && this.villages.villages[k] !== undefined,
    );
    if (enemyFactions.length === 0) return;
    const enemyFaction: FactionKey = enemyFactions[Math.floor(Math.random() * enemyFactions.length)];
    const ev = this.villages.villages[enemyFaction];
    if (!ev) return;

    // Feindliches Gebäude in Reichweite angreifen
    const targetBuilding = this.combat.nearestEnemyBuilding(u, 3);
    if (targetBuilding) {
      if (dist(u.x, u.y, targetBuilding.x, targetBuilding.y) <= 1.5) {
        this.combat.attackBuilding(u, targetBuilding);
      } else {
        u.state = 'siege';
        this.stepToward(u, targetBuilding.x, targetBuilding.y);
      }
      return;
    }

    // Zum feindlichen Dorf marschieren
    u.state = 'march';
    const tx = ev.x + randi(-3, 3);
    const ty = ev.y + randi(-3, 3);
    if (!u.target || u.think <= 0) {
      u.target = { x: tx, y: ty };
      u.think  = randi(8, 18);
    }
    u.think--;
    this.stepToward(u, u.target.x, u.target.y);
  }

  // ─── Hilfsbewegungen ────────────────────────────────────────────────────

  private returnHome(u: Unit): void {
    const v = this.villages.villages[u.faction];
    if (!v) return;
    u.state = 'return';
    this.stepToward(u, v.x, v.y);
  }

  private retreatHome(u: Unit): void {
    const v = this.villages.villages[u.faction];
    if (!v) return;
    this.stepToward(u, v.x, v.y);
  }

  private wanderNearHome(u: Unit, radius: number): void {
    const v = this.villages.villages[u.faction];
    if (!v) return;

    if (!u.target || u.think <= 0 || (u.x === u.target.x && u.y === u.target.y)) {
      u.target = {
        x: v.x + randi(-radius, radius),
        y: v.y + randi(-radius, radius),
      };
      u.think = randi(3, 8);
    }
    u.think--;
    this.stepToward(u, u.target.x, u.target.y);
  }

  // ─── Bewegungs-Kernel ────────────────────────────────────────────────────

  stepToward(u: Unit, tx: number, ty: number): void {
    const dx = Math.sign(tx - u.x);
    const dy = Math.sign(ty - u.y);

    const opts: Array<[number, number]> = [];
    if (dx !== 0 && dy !== 0) opts.push([dx, dy]);
    if (dx !== 0) opts.push([dx, 0]);
    if (dy !== 0) opts.push([0, dy]);
    opts.push([randi(-1, 1), randi(-1, 1)]);

    let best: { x: number; y: number } | null = null;
    let bestScore = -Infinity;

    for (const [ox, oy] of opts) {
      const nx = u.x + ox;
      const ny = u.y + oy;
      if (!this.grid.isWalkable(nx, ny)) continue;
      const roadBonus = this.grid.get(nx, ny) === TileType.Road ? 0.9 : 0;
      const score = -Math.hypot(nx - tx, ny - ty) + roadBonus;
      if (score > bestScore) { bestScore = score; best = { x: nx, y: ny }; }
    }

    if (best) { u.x = best.x; u.y = best.y; }
  }
}
