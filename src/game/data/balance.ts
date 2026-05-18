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

  // ─── Szenario-Kontakt-Fix ──────────────────────────────────────────────
  // Spawn-Distanz für Zwei-Fraktions-Szenarien (survive30, orcRaid, humanLastStand)
  // Ziel: 20–34 Kacheln Abstand statt ~40 Kacheln.
  SCENARIO_SPAWN_NEAR_DISTANCE: 26,   // Abstand in Kacheln für Human↔Orc im Szenario

  // Raider-Wanderradius je nach diplomatischem Zustand
  RAIDER_WANDER_PEACE:    13,   // war: 5 → fix: 13 (Erkundung)
  RAIDER_WANDER_TENSION:  20,   // Anspannung: weiter, nähert sich feindlichem Gebiet
  // Krieg: bestehende Aggression beibehalten (kein eigener Wert nötig)

  // Sichtkontakt-Ereignisse (Contact/Sighting)
  CONTACT_DETECTION_RANGE:     7,    // Kacheln — Einheit sieht Feind in dieser Reichweite
  CONTACT_BORDER_RANGE:        4,    // Kacheln — "Grenzvorfall" (näher als detection)
  CONTACT_SIGHTING_COOLDOWN:   30,   // Ticks pro Fraktionspaar — Mindestabstand zwischen Events
  CONTACT_TENSION_SIGHTING:    4,    // Spannungsanstieg bei erstmaligem Sichtkontakt
  CONTACT_TENSION_BORDER:      3,    // Spannungsanstieg bei Grenzvorfall (< 4 Kacheln)

  // Szenario-spezifischer Spannungsmultiplikator
  SCENARIO_TENSION_MULT:       2.0,  // Nur in gameMode === 'scenario' aktiv
  SCENARIO_WAR_THRESHOLD:      55,   // Niedrigere Kriegsschwelle im Szenario (statt 80)

  // ─── Ziel-Persistenz (AI-Fix) ─────────────────────────────────────────────
  // Wie viele AI-Ticks eine Einheit ihr Ziel beibehält, bevor sie ein neues wählt.
  PERSIST_GATHERER_MIN:  20,   // Sammler: 20–30 Ticks
  PERSIST_GATHERER_MAX:  30,
  PERSIST_BUILDER_MIN:   25,   // Baumeister: 25–35 Ticks
  PERSIST_BUILDER_MAX:   35,
  PERSIST_GUARD_MIN:     15,   // Wache: 15–20 Ticks (reaktiver)
  PERSIST_GUARD_MAX:     20,
  PERSIST_SCOUT_MIN:     25,   // Raider (Frieden/Erkundung): 25–40 Ticks
  PERSIST_SCOUT_MAX:     40,
  PERSIST_MARCH_MIN:     40,   // Raider (Krieg/Marsch): 40–60 Ticks (sehr ausdauernd)
  PERSIST_MARCH_MAX:     60,

  // ─── Raider-Gruppen-Koordination (AI-Fix) ─────────────────────────────────
  RAIDER_GROUP_RADIUS:   8,    // Kacheln — Raider in diesem Radius werden in die Gruppe gezogen
  RAIDER_GROUP_MAX:      3,    // Maximale Gruppengröße (zieht max. 2 weitere Raider)
  RAIDER_GROUP_PERSIST:  45,   // Persistenz-Ticks für mitgezogene Gruppen-Raider

  // ─── Kampftod-EventFeed (AI-Fix) ──────────────────────────────────────────
  DEATH_EVENT_COOLDOWN_MS: 5000,  // Globaler Mindestabstand zwischen Todesmeldungen in ms

  // Phase VFX — FireSystem
  FIRE_SPREAD_INTERVAL_MS: 700,    // ms zwischen Spread-Ticks
  FIRE_BURN_MIN:            7,     // min Burn-Ticks bevor → Asche
  FIRE_BURN_MAX:            13,    // max Burn-Ticks
  FIRE_SPREAD_FOREST:       0.42,  // Ausbreitungs-Chance auf Wald
  FIRE_SPREAD_GRASS:        0.16,  // Ausbreitungs-Chance auf Gras
  FIRE_SPREAD_SAND:         0.09,  // Ausbreitungs-Chance auf Sand/Weg
  RAIN_WET_TICKS:           7,     // wie lange Regen Kacheln nass hält
} as const;
