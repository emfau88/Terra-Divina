/**
 * Shared layout and canvas constants.
 *
 * These mirror the values used in the reference prototype so future phases
 * can port simulation logic without adjusting coordinates.
 */

/** Logical canvas width (Phaser virtual resolution). */
export const CANVAS_W = 720;

/** Logical canvas height (Phaser virtual resolution). */
export const CANVAS_H = 1280;

/**
 * Height of the top HUD DOM overlay in CSS pixels.
 * Must match --hud-h in mobile.css.
 */
export const HUD_H_CSS = 88;

/**
 * Height of the bottom tool dock DOM overlay in CSS pixels.
 * Must match --dock-h in mobile.css.
 */
export const DOCK_H_CSS = 152;

/**
 * The fraction of CANVAS_H reserved for the top HUD in Phaser units.
 * Used to position the world camera so it never renders under the HUD.
 *
 * Computed proportionally from the CSS values so the Phaser world viewport
 * stays aligned with the DOM overlays when Phaser FIT-scales the canvas.
 */
export const HUD_H = Math.round((HUD_H_CSS / 926) * CANVAS_H);   // ~122

/**
 * The fraction of CANVAS_H reserved for the bottom dock in Phaser units.
 */
export const DOCK_H = Math.round((DOCK_H_CSS / 926) * CANVAS_H); // ~188

/** Y offset where the world viewport begins (below HUD). */
export const WORLD_Y = HUD_H;

/** Height of the world viewport (between HUD and dock). */
export const WORLD_H = CANVAS_H - HUD_H - DOCK_H;

// ─── Tile / world grid constants (kept for future phases) ─────────────────

/** Tile size in Phaser world units. */
export const TILE = 18;

/** World grid columns. */
export const COLS = 48;

/** World grid rows. */
export const ROWS = 82;

// ─── Camera zoom limits ───────────────────────────────────────────────────

export const ZOOM_MIN = 0.72;
export const ZOOM_MAX = 1.85;
export const ZOOM_DEFAULT = 1.05;
