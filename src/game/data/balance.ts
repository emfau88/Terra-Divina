/**
 * balance.ts — Phase 5+
 *
 * Centralizes all tuning constants so they are never scattered as magic numbers
 * throughout simulation code.
 *
 * Values ported from the reference prototype during the relevant phase.
 */

// ─── Populated incrementally per phase ───────────────────────────────────

export const BALANCE = {
  // Phase 5+
  MAX_UNITS_PER_FACTION: 72,

  // Phase 6+
  FOOD_CONSUMPTION_PER_UNIT: 0.055,
  FOOD_PASSIVE_BASE: 0.45,
  FOOD_PER_FARM: 0.42,
  WOOD_PASSIVE_BASE: 0.24,
  WOOD_PER_YARD: 0.35,

  // Phase 6+
  SPAWN_FOOD_COST: 14,
  BUILD_WOOD_COST: 32,
  BUILD_FOOD_COST: 8,
  LEVEL_UP_WOOD_COST: 55,

  // Phase 7+
  ROLE_GUARD_MIN:   0.14,
  ROLE_BUILDER_MIN: 0.16,
  ROLE_RAIDER_MIN:  0.18,

  // Phase 8+
  TENSION_PEACE_DRIFT:       0.04,   // Spannung steigt langsam im Frieden
  TENSION_TENSION_DRIFT:     0.08,   // Spannung steigt schneller bei Anspannung
  TENSION_OVERLAP_RATE:      0.35,   // Druck durch Territorien-Überlap
  TENSION_IMBALANCE_RATE:    0.20,   // Druck durch Kräfte-Ungleichgewicht
  TENSION_TRUCE_DECAY:       0.30,   // Spannung sinkt pro Tick im Waffenstillstand
  TENSION_WAR_MIN:           55,     // Spannung sinkt im Krieg nicht unter diesen Wert
  TENSION_THRESHOLD_TENSION: 40,     // Frieden → Anspannung
  TENSION_THRESHOLD_WAR:     80,     // Anspannung → Krieg
  WAR_DURATION_TICKS:        120,    // Krieg dauert ~120 Village-Ticks
  TRUCE_DURATION_TICKS:      60,     // Waffenstillstand dauert ~60 Village-Ticks

  // Phase Hunger-Fix — starting food per faction
  STARTING_FOOD_DEFAULT: 24,
  STARTING_FOOD_ORC:     34,   // +42% — Orks wachsen schnell, brauchen mehr Startvorrat

  // Phase VFX — FireSystem
  FIRE_SPREAD_INTERVAL_MS: 700,    // ms zwischen Spread-Ticks
  FIRE_BURN_MIN:            7,     // min Burn-Ticks bevor → Asche
  FIRE_BURN_MAX:            13,    // max Burn-Ticks
  FIRE_SPREAD_FOREST:       0.42,  // Ausbreitungs-Chance auf Wald
  FIRE_SPREAD_GRASS:        0.16,  // Ausbreitungs-Chance auf Gras
  FIRE_SPREAD_SAND:         0.09,  // Ausbreitungs-Chance auf Sand/Weg
  RAIN_WET_TICKS:           7,     // wie lange Regen Kacheln nass hält
} as const;
