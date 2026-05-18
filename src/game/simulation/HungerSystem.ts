/**
 * HungerSystem — Phase 6 + Hunger-Visibility Fix
 *
 * Änderungen gegenüber Phase 6:
 * - Schaden: 1–2 HP alle 2000 ms (statt 2–5 HP alle 250 ms)
 * - Gnadenfrist: erste 3 In-Game-Tage kein Hungeschaden
 * - unit.isStarving wird gesetzt / zurückgesetzt
 * - EventFeed-Callbacks für "kein Vorrat", "verhungernd", "Vorrat erholt"
 *   mit 15-Sekunden-Cooldown pro Fraktion
 *
 * Kein Phaser. Mutiert nur Village- und Unit-State.
 */

import { VillageManager }  from '@game/factions/VillageManager';
import { UnitManager }     from '@game/units/UnitManager';
import { FACTION_KEYS, FactionKey } from '@game/factions/Faction';
import { BALANCE }         from '@game/data/balance';

function choice<T>(arr: T[]): T | undefined {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined;
}

function randi(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

/** Minimale echte Millisekunden zwischen EventFeed-Meldungen pro Fraktion. */
const FEED_COOLDOWN_MS = 15_000;

/** Wie viele AI-Ticks (à 250 ms) zwischen Hungeschaden-Ticks. */
const STARVE_TICK_INTERVAL = 8;   // 8 × 250 ms = 2000 ms

/** Erst nach diesem In-Game-Tag wird Hungeschaden angewendet. */
const GRACE_PERIOD_DAYS = 3;

export interface HungerFeedEvent {
  kind:    'empty' | 'starving' | 'recovered';
  faction: FactionKey;
}

export class HungerSystem {
  private readonly villages: VillageManager;
  private readonly units:    UnitManager;

  /** Callback für EventFeed-Meldungen — wird von GameScene verdrahtet. */
  onFeedEvent: ((evt: HungerFeedEvent) => void) | null = null;

  /** Aktueller In-Game-Tag — wird von GameScene gesetzt. */
  currentDay: number = 1;

  /** Zähler pro Fraktion für verzögerte Schadens-Ticks. */
  private readonly starveTick: Partial<Record<FactionKey, number>> = {};

  /** Zeitstempel (performance.now()) der letzten Feed-Meldung pro Fraktion. */
  private readonly lastFeedMs: Partial<Record<FactionKey, number>> = {};

  /** Merkt ob Fraktion zuletzt bereits ohne Essen war (um Recovery zu erkennen). */
  private readonly wasEmpty: Partial<Record<FactionKey, boolean>> = {};

  constructor(villages: VillageManager, units: UnitManager) {
    this.villages = villages;
    this.units    = units;
  }

  tick(steps: number): void {
    for (let s = 0; s < steps; s++) {
      for (const key of FACTION_KEYS) {
        this.applyHunger(key);
      }
    }
  }

  private applyHunger(faction: FactionKey): void {
    const v   = this.villages.villages[faction];
    if (!v)  return;
    const pop = this.units.liveCount(faction);
    if (pop === 0) return;

    const consumption = pop * BALANCE.FOOD_CONSUMPTION_PER_UNIT;
    v.food -= consumption;

    if (v.food >= 0) {
      // Versorgt — Hunger abbauen, verletzte Einheiten heilen
      v.hunger = Math.max(0, v.hunger - 0.25);

      // isStarving zurücksetzen für alle Einheiten dieser Fraktion
      for (const u of this.units.units) {
        if (u.faction === faction && !u.dead && u.isStarving) {
          u.isStarving = false;
          if (u.state === 'starving') u.state = 'idle';
        }
      }

      // Recovery-Meldung ausgeben wenn Fraktion zuletzt leer war
      if (this.wasEmpty[faction]) {
        this.wasEmpty[faction] = false;
        this.pushFeed(faction, 'recovered');
      }

      if (v.food > 18 && Math.random() < 0.18) {
        const wounded = this.units.units.find(
          u => u.faction === faction && !u.dead && u.hp < u.maxHp,
        );
        if (wounded) wounded.hp = Math.min(wounded.maxHp, wounded.hp + 2);
      }
      return;
    }

    // Kein Essen
    v.food   = 0;
    v.hunger += 0.8;

    // "Kein Vorrat" melden (einmalig beim ersten Leer-Werden)
    if (!this.wasEmpty[faction]) {
      this.wasEmpty[faction] = true;
      this.pushFeed(faction, 'empty');
    }

    // Gnadenfrist: erste 3 Tage kein Hungeschaden
    if (this.currentDay <= GRACE_PERIOD_DAYS) return;

    // Verzögerter Schadens-Tick: alle STARVE_TICK_INTERVAL AI-Ticks
    const tick = (this.starveTick[faction] ?? 0) + 1;
    this.starveTick[faction] = tick;
    if (tick < STARVE_TICK_INTERVAL) return;
    this.starveTick[faction] = 0;

    if (Math.random() < Math.min(0.85, v.hunger * 0.12)) {
      const victims = this.units.units.filter(
        u => u.faction === faction && !u.dead,
      );
      const u = choice(victims);
      if (u) {
        u.hp       -= randi(1, 2);
        u.isStarving = true;
        u.state      = 'starving';
        if (u.hp <= 0) u.dead = true;

        // "Verhungernd" melden
        this.pushFeed(faction, 'starving');
      }
    }
  }

  /** Gibt ein Feed-Event aus, respektiert Cooldown pro Fraktion. */
  private pushFeed(faction: FactionKey, kind: HungerFeedEvent['kind']): void {
    if (!this.onFeedEvent) return;
    const now  = performance.now();
    const last = this.lastFeedMs[faction] ?? 0;
    if (now - last < FEED_COOLDOWN_MS) return;
    this.lastFeedMs[faction] = now;
    this.onFeedEvent({ kind, faction });
  }
}
