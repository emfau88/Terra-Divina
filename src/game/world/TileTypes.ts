/**
 * TileTypes — Phase 2
 *
 * Enum und Hilfsdaten für alle Kachel-Typen der Spielwelt.
 */

export const enum TileType {
  Water    = 0,
  Sand     = 1,
  Grass    = 2,
  Forest   = 3,
  Mountain = 4,
  Fire     = 5,
  Ash      = 6,
  Road     = 7,
}

export const TILE_TYPE_COUNT = 8;

export const TILE_NAMES: Readonly<Record<TileType, string>> = {
  [TileType.Water]:    'water',
  [TileType.Sand]:     'sand',
  [TileType.Grass]:    'grass',
  [TileType.Forest]:   'forest',
  [TileType.Mountain]: 'mountain',
  [TileType.Fire]:     'fire',
  [TileType.Ash]:      'ash',
  [TileType.Road]:     'road',
};

/** Kacheln, die von Einheiten begehbar sind. */
export const WALKABLE: Readonly<Set<TileType>> = new Set([
  TileType.Sand,
  TileType.Grass,
  TileType.Forest,
  TileType.Road,
  TileType.Ash,
]);

export function isWalkable(t: TileType): boolean {
  return WALKABLE.has(t);
}

/** Kacheln, auf denen Feuer sich ausbreiten kann. */
export const BURNABLE: Readonly<Set<TileType>> = new Set([
  TileType.Grass,
  TileType.Forest,
  TileType.Sand,
  TileType.Road,
]);

export function isBurnable(t: TileType): boolean {
  return BURNABLE.has(t);
}
