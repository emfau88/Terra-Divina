# Visual Direction & Procedural Asset Strategy

Status: updated after code review on 2026-05-20.

## Current Visual Direction

Terra Divina should feel like a readable miniature living world viewed from above.

Priorities:

1. mobile readability
2. faction/role readability
3. clear god-tool feedback
4. consistent UI style
5. procedural charm without external asset dependency

## Current Implemented Visual Systems

- Procedural terrain rendering in `WorldRenderer`.
- Dedicated fire flicker layer (`fireG`).
- Procedural unit rendering with role/state markers in `UnitRenderer`.
- Procedural building rendering in `BuildingRenderer`.
- Creature rendering in `CreatureRenderer`.
- VFX in `EffectSystem`.
- DOM HUD/dock/menu styling in `mobile.css`.
- SVG icon registry exists in `src/game/ui/toolIcons.ts`.

## Important Current Gap

`toolIcons.ts` exists, but `UIScene.ts` currently still builds dock buttons from glyph/emoji strings. If the goal is Visual Phase V1, the next concrete step is wiring the SVG registry into `UIScene`.

## Visual Pillars

### Readability First

At small mobile sizes, every important object must be readable by shape, color, or marker:

- faction identity
- unit role/state
- building ownership
- active fire
- war/tension state
- selected/active tool

### Consistent Palette

Renderer colors are still scattered across files. A future visual pass should introduce a shared palette module and gradually move renderers to named color tokens.

### Strong Tool Feedback

Current tools already have VFX, but future polish should focus on:

- stronger rain impact/ripple
- stronger heal target feedback
- clearer invalid terrain/spawn feedback
- better low-zoom readability for meteor/lightning consequences

### UI As Toolbox

The dock should feel like a compact divine toolbox, not a generic web form:

- active category state
- active tool state
- consistent icon style
- readable labels
- safe-area-aware layout

## Recommended Visual Phase Order

### Visual Phase V1 — Wire SVG Icons 🟡

Status: partially implemented.

Done:

- `src/game/ui/toolIcons.ts` exists.

Remaining:

- import `getToolIcon` or `TOOL_ICONS` in `UIScene.ts`
- render SVG in category/tool buttons
- keep emoji/glyph fallback if an icon is missing
- verify mobile sizing

### Visual Phase V2 — Shared Palette ⬜

Create `src/game/rendering/palette.ts` and migrate terrain/entity/VFX colors gradually.

### Visual Phase V3 — Map Readability ⬜

Improve terrain detail without adding per-tile objects:

- shore variation
- grass/sand texture
- forest depth
- mountain face detail

### Visual Phase V4 — Units, Buildings, Creatures 🟡

Some readability markers exist. Future work:

- stronger faction silhouettes
- clearer guard/raider states
- better damaged building states
- creature polish

### Visual Phase V5 — VFX Polish 🟡

Current VFX are functional. Future work:

- rain ripples
- meteor debris tuning
- heal target pulses
- lightning branch variation

## Current Recommended Visual Task

Wire the existing SVG icon registry into `UIScene`.

Acceptance:

- dock category icons use SVG where available
- tool icons use SVG where available
- existing labels remain readable
- build passes
- mobile dock layout does not grow or clip
