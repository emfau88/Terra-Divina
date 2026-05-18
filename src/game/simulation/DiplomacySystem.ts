/**
 * DiplomacySystem — Phase 8
 *
 * Zustandsautomat: peace → tension → war → truce → peace
 *
 * Druckpunkte (erhöhen Spannung):
 * - Territorien überlappen sich (Dörfer nah beieinander)
 * - Eine Fraktion hat viel mehr Einheiten als die andere
 * - Gebäude wurden zerstört (wird extern per addTension() gemeldet)
 *
 * Entspannungspunkte (senken Spannung):
 * - Waffenstillstand-Timer läuft ab
 * - Ausgeglichene Kräfteverhältnisse im Frieden
 *
 * Kein Phaser. Liest nur VillageManager + UnitManager.
 */

import { VillageManager } from '@game/factions/VillageManager';
import { UnitManager }    from '@game/units/UnitManager';
import { FACTION_KEYS }   from '@game/factions/Faction';
import { BALANCE }        from '@game/data/balance';

export type DiplomaticState = 'peace' | 'tension' | 'war' | 'truce';

export class DiplomacySystem {
  private readonly villages: VillageManager;
  private readonly units:    UnitManager;

  state:   DiplomaticState = 'peace';
  tension: number = 0;          // 0–100
  truceTicks: number = 0;       // Verbleibende Waffenstillstand-Ticks

  /** Callback wenn sich der Zustand ändert — GameScene nutzt ihn fürs HUD. */
  onStateChange: ((state: DiplomaticState) => void) | null = null;

  constructor(villages: VillageManager, units: UnitManager) {
    this.villages = villages;
    this.units    = units;
  }

  // ─── Haupt-Tick ──────────────────────────────────────────────────────────

  tick(): void {
    this.updateTension();
    this.transition();
  }

  /** Externe Systeme können Spannung direkt hinzufügen (z.B. nach Angriff). */
  addTension(amount: number): void {
    this.tension = Math.min(100, this.tension + amount);
  }

  // ─── Spannung berechnen ──────────────────────────────────────────────────

  private updateTension(): void {
    // Collect all active villages
    const activeVillages = FACTION_KEYS
      .map(k => this.villages.villages[k])
      .filter((v): v is NonNullable<typeof v> => v !== undefined);

    if (activeVillages.length < 2) return;

    // Territorium-Überlap: maximaler Druck über alle Paare
    let overlapPressure = 0;
    for (let i = 0; i < activeVillages.length; i++) {
      for (let j = i + 1; j < activeVillages.length; j++) {
        const av = activeVillages[i];
        const bv = activeVillages[j];
        const dist    = Math.hypot(av.x - bv.x, av.y - bv.y);
        const overlapR = av.territory + bv.territory;
        if (dist < overlapR) {
          overlapPressure = Math.max(
            overlapPressure,
            BALANCE.TENSION_OVERLAP_RATE * (1 - dist / overlapR),
          );
        }
      }
    }

    // Kräfte-Ungleichgewicht: stärkstes Ungleichgewicht über alle Fraktionen
    const pops = FACTION_KEYS.map(k => this.units.liveCount(k));
    const maxPop = Math.max(1, ...pops);
    const minPop = Math.min(...pops.filter(p => p > 0), maxPop);
    const imbalance = (maxPop - minPop) / maxPop;
    const imbalancePressure = imbalance > 0.3 ? BALANCE.TENSION_IMBALANCE_RATE * imbalance : 0;

    // Im Frieden / Anspannung: natürlicher Anstieg
    const baseDrift = this.state === 'peace'
      ? BALANCE.TENSION_PEACE_DRIFT
      : this.state === 'tension'
        ? BALANCE.TENSION_TENSION_DRIFT
        : 0;

    // Im Krieg: Spannung sinkt nicht weiter durch Drift
    if (this.state === 'war') {
      // Spannung bleibt hoch, leichte Abnutzung
      this.tension = Math.max(BALANCE.TENSION_WAR_MIN, this.tension - 0.1);
      return;
    }

    // Waffenstillstand: Spannung aktiv abbauen
    if (this.state === 'truce') {
      this.tension = Math.max(0, this.tension - BALANCE.TENSION_TRUCE_DECAY);
      return;
    }

    this.tension = Math.min(100,
      this.tension + baseDrift + overlapPressure + imbalancePressure,
    );
  }

  // ─── Zustandsübergänge ───────────────────────────────────────────────────

  private transition(): void {
    const prev = this.state;

    switch (this.state) {
      case 'peace':
        if (this.tension >= BALANCE.TENSION_THRESHOLD_TENSION) {
          this.state = 'tension';
        }
        break;

      case 'tension':
        if (this.tension >= BALANCE.TENSION_THRESHOLD_WAR) {
          this.state = 'war';
        } else if (this.tension < BALANCE.TENSION_THRESHOLD_TENSION * 0.6) {
          this.state = 'peace';
        }
        break;

      case 'war':
        // Krieg endet nach langer Zeit oder wenn eine Seite fast ausgelöscht ist
        this.truceTicks--;
        if (this.truceTicks <= 0) {
          this.state      = 'truce';
          this.truceTicks = BALANCE.TRUCE_DURATION_TICKS;
          this.tension    = BALANCE.TENSION_THRESHOLD_TENSION; // Spannung bleibt erhöht
        }
        break;

      case 'truce':
        this.truceTicks--;
        if (this.truceTicks <= 0) {
          this.state = 'peace';
        }
        break;
    }

    // Kriegs-Timer setzen wenn wir in den Krieg eintreten
    if (prev !== 'war' && this.state === 'war') {
      this.truceTicks = BALANCE.WAR_DURATION_TICKS;
    }

    if (prev !== this.state) {
      this.onStateChange?.(this.state);
    }
  }

  // ─── Hilfsmethoden ───────────────────────────────────────────────────────

  get isWar():     boolean { return this.state === 'war'; }
  get isTension(): boolean { return this.state === 'tension' || this.state === 'war'; }

  /** Gibt den lokalisierten Statustext für das HUD zurück. */
  get statusText(): string {
    switch (this.state) {
      case 'peace':   return 'FRIEDEN';
      case 'tension': return 'ANSPANNUNG';
      case 'war':     return 'KRIEG';
      case 'truce':   return 'WAFFENSTILLSTAND';
    }
  }
}
