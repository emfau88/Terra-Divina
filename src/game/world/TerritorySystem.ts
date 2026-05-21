/**
 * TerritorySystem
 *
 * Keeps village territory as coarse tile sections. Initial claims are seeded
 * from the existing village radius; later growth adds adjacent sections.
 */

import { Village } from '@game/factions/Village';
import { FactionKey } from '@game/factions/Faction';
import { WorldGrid } from './WorldGrid';
import { TileType } from './TileTypes';

export const CLAIM_SIZE = 6;

export interface TerritoryClaim {
  readonly sx: number;
  readonly sy: number;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly faction: FactionKey;
  readonly villageId: number;
}

export interface SerializedTerritoryClaim {
  sx: number;
  sy: number;
  faction: FactionKey;
  villageId: number;
}

interface StoredClaim extends TerritoryClaim {
  score: number;
}

export class TerritorySystem {
  private readonly grid: WorldGrid;
  private readonly claims = new Map<string, StoredClaim>();

  constructor(grid: WorldGrid) {
    this.grid = grid;
  }

  rebuildFromVillages(villages: Village[]): void {
    this.claims.clear();
    for (const village of villages) {
      this.seedVillageClaims(village);
    }
  }

  ensureVillageClaims(villages: Village[]): void {
    for (const village of villages) {
      if (!this.hasClaimsForVillage(village.id)) {
        this.seedVillageClaims(village);
      }
    }
  }

  expandVillage(village: Village): boolean {
    if (!this.hasClaimsForVillage(village.id)) {
      this.seedVillageClaims(village);
    }

    const owned = Array.from(this.claims.values())
      .filter(claim => claim.villageId === village.id);
    const candidates = new Map<string, StoredClaim>();

    for (const claim of owned) {
      for (const [sx, sy] of [
        [claim.sx + 1, claim.sy],
        [claim.sx - 1, claim.sy],
        [claim.sx, claim.sy + 1],
        [claim.sx, claim.sy - 1],
      ] as Array<[number, number]>) {
        if (!this.inSectionBounds(sx, sy)) continue;
        if (this.claims.has(this.key(sx, sy))) continue;
        if (!this.sectionHasClaimableLand(sx, sy)) continue;

        const bounds = this.sectionBounds(sx, sy);
        const cx = bounds.x + bounds.w / 2;
        const cy = bounds.y + bounds.h / 2;
        const d = Math.hypot(cx - village.x, cy - village.y);
        candidates.set(this.key(sx, sy), {
          ...bounds,
          sx,
          sy,
          faction: village.faction,
          villageId: village.id,
          score: d,
        });
      }
    }

    const next = Array.from(candidates.values()).sort((a, b) => a.score - b.score)[0];
    if (!next) return false;
    this.claims.set(this.key(next.sx, next.sy), next);
    return true;
  }

  loadClaims(claims: SerializedTerritoryClaim[]): void {
    this.claims.clear();
    for (const claim of claims) {
      if (!this.inSectionBounds(claim.sx, claim.sy)) continue;
      const bounds = this.sectionBounds(claim.sx, claim.sy);
      this.claims.set(this.key(claim.sx, claim.sy), {
        ...bounds,
        ...claim,
        score: 0,
      });
    }
  }

  serialize(): SerializedTerritoryClaim[] {
    return Array.from(this.claims.values())
      .sort((a, b) => a.sy - b.sy || a.sx - b.sx)
      .map(claim => ({
        sx: claim.sx,
        sy: claim.sy,
        faction: claim.faction,
        villageId: claim.villageId,
      }));
  }

  claimsForFaction(faction: FactionKey): TerritoryClaim[] {
    return Array.from(this.claims.values())
      .filter(claim => claim.faction === faction)
      .sort((a, b) => a.sy - b.sy || a.sx - b.sx);
  }

  ownerAt(x: number, y: number): TerritoryClaim | null {
    const sx = Math.floor(x / CLAIM_SIZE);
    const sy = Math.floor(y / CLAIM_SIZE);
    return this.claims.get(this.key(sx, sy)) ?? null;
  }

  ownsTile(villageId: number, x: number, y: number): boolean {
    return this.ownerAt(x, y)?.villageId === villageId;
  }

  private seedVillageClaims(village: Village): void {
    const minSx = Math.floor(Math.max(0, village.x - village.territory) / CLAIM_SIZE);
    const maxSx = Math.floor(Math.min(this.grid.cols - 1, village.x + village.territory) / CLAIM_SIZE);
    const minSy = Math.floor(Math.max(0, village.y - village.territory) / CLAIM_SIZE);
    const maxSy = Math.floor(Math.min(this.grid.rows - 1, village.y + village.territory) / CLAIM_SIZE);

    for (let sy = minSy; sy <= maxSy; sy++) {
      for (let sx = minSx; sx <= maxSx; sx++) {
        if (!this.sectionHasClaimableLand(sx, sy)) continue;
        const bounds = this.sectionBounds(sx, sy);
        const cx = bounds.x + bounds.w / 2;
        const cy = bounds.y + bounds.h / 2;
        const d = Math.hypot(cx - village.x, cy - village.y);
        if (d > village.territory + CLAIM_SIZE * 0.6) continue;

        const key = this.key(sx, sy);
        const next: StoredClaim = {
          ...bounds,
          sx,
          sy,
          faction: village.faction,
          villageId: village.id,
          score: d,
        };
        const current = this.claims.get(key);
        if (!current || next.score < current.score) {
          this.claims.set(key, next);
        }
      }
    }
  }

  private hasClaimsForVillage(villageId: number): boolean {
    return Array.from(this.claims.values()).some(claim => claim.villageId === villageId);
  }

  private inSectionBounds(sx: number, sy: number): boolean {
    return sx >= 0 && sy >= 0 && sx * CLAIM_SIZE < this.grid.cols && sy * CLAIM_SIZE < this.grid.rows;
  }

  private sectionHasClaimableLand(sx: number, sy: number): boolean {
    const bounds = this.sectionBounds(sx, sy);
    for (let y = bounds.y; y < bounds.y + bounds.h; y++) {
      for (let x = bounds.x; x < bounds.x + bounds.w; x++) {
        const tile = this.grid.get(x, y);
        if (tile !== TileType.Water && tile !== TileType.Mountain) return true;
      }
    }
    return false;
  }

  private sectionBounds(sx: number, sy: number): { x: number; y: number; w: number; h: number } {
    const x = sx * CLAIM_SIZE;
    const y = sy * CLAIM_SIZE;
    return {
      x,
      y,
      w: Math.min(CLAIM_SIZE, this.grid.cols - x),
      h: Math.min(CLAIM_SIZE, this.grid.rows - y),
    };
  }

  private key(sx: number, sy: number): string {
    return `${sx}:${sy}`;
  }
}
