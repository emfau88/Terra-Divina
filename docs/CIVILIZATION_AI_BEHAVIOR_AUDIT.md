# Civilization AI Behavior Audit

Status: updated after code review on 2026-05-20.

This file supersedes the older AI audit. Several issues from the original audit have since been fixed.

## Current Verdict

Civilization AI is now more active than in the original audit:

- raiders scout beyond the village during peace
- raiders scout farther during tension
- contact events add diplomatic tension
- march targets persist longer during war
- raider group events exist
- territory grows with village level
- hunger feedback exists
- kill events and hit sparks exist
- build sites exist and builders can work with them

The remaining problem is less "AI does nothing" and more "the player still needs clearer readability and scenario tuning."

## Previously Reported Issues Now Addressed

### Earlier Finding: Territory Did Not Grow

Status: addressed.

`ResourceSystem.tryLevelUp()` updates `v.territory = 6 + v.level`.

### Raiders do nothing during peace

Status: addressed.

`UnitAI.raiderAI()` uses `BALANCE.RAIDER_WANDER_PEACE` and `BALANCE.RAIDER_WANDER_TENSION`.

### Hunger damage is silent

Status: addressed.

`HungerSystem` has `onFeedEvent`, starvation state, grace period, throttled feed messages, and inspect context.

### Raiders dither instead of commit

Status: mostly addressed.

March persistence is now controlled through `BALANCE.PERSIST_MARCH_MIN/MAX`.

### No unit death/combat feedback

Status: partially addressed.

`CombatSystem` exposes hit/kill callbacks; `GameScene` wires hit sparks and throttled kill feed messages.

### Builders do not visibly build

Status: partially addressed.

Build sites now exist and builders can be assigned to them. Construction still needs playtest tuning for readability.

## Current AI Risks

### 1. War Readability Still Needs HUD Support

The player sees feed messages and some unit markers, but there is still no compact tension meter. War buildup should be visible before the state flips.

### 2. Scenario Pacing Needs Verification

Scenario mode lowers thresholds and adjusts tension, but every scenario needs timed playtests to confirm that pressure appears early enough and remains fair.

### 3. Global War Model Is Still Simple

Diplomacy is effectively global, not bilateral. This is acceptable for the current compact sandbox but will become limiting with more than two active factions.

### 4. Role Readability Can Still Improve

The renderer has role/state markers, but at low zoom units can still be hard to distinguish. Stronger guard/raider read states would help.

### 5. Stub Files Remain

`src/game/factions/DiplomacySystem.ts` and `src/game/world/TerritorySystem.ts` are placeholder stubs. Active diplomacy is in `src/game/simulation/DiplomacySystem.ts`.

## Recommended Immediate Next Task

War/tension readability:

- add a HUD tension meter
- show tension level in village inspect
- improve raider/guard markers during tension and war
- improve village-under-attack feedback
- keep combat/death feed messages throttled

## Manual Test Checklist

- Start `survive30` and watch for tension/contact events.
- Start `keepPeace` and verify war pressure is understandable.
- Start `humanLastStand` and verify humans can be meaningfully protected.
- Inspect a starving unit and confirm hunger context.
- Inspect a village and verify economy/population data.
- Wait for war and verify raiders march rather than idle near home.
- Trigger combat and confirm sparks/death messages appear without feed spam.
- Confirm village territory increases after level-up.
