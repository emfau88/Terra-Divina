/**
 * InspectPanel — Phase 10
 *
 * Persistentes DOM-Overlay-Panel für das Inspect-Tool.
 * Zeigt Daten zu Einheiten, Gebäuden, Dörfern und Kacheln.
 * Schließt sich wenn die inspizierte Einheit stirbt.
 *
 * Keine Phaser-Abhängigkeit.
 */

import { Unit }           from '@game/units/Unit';
import { Building }       from '@game/factions/Building';
import { Village }        from '@game/factions/Village';
import { VillageManager } from '@game/factions/VillageManager';
import { UnitManager }    from '@game/units/UnitManager';
import { WorldGrid }      from '@game/world/WorldGrid';
import { TILE_NAMES }     from '@game/world/TileTypes';
import { FACTIONS }       from '@game/factions/Faction';
import { BUILDING_DEFS }  from '@game/data/buildingDefs';

type InspectTarget =
  | { kind: 'unit';     id: number }
  | { kind: 'building'; id: number }
  | { kind: 'village';  faction: string }
  | { kind: 'tile';     x: number; y: number };

export class InspectPanel {
  private readonly panelEl:  HTMLElement;
  private readonly titleEl:  HTMLElement;
  private readonly bodyEl:   HTMLElement;
  private readonly closeBtn: HTMLButtonElement;

  private target: InspectTarget | null = null;

  private readonly villages: VillageManager;
  private readonly units:    UnitManager;
  private readonly grid:     WorldGrid;

  constructor(villages: VillageManager, units: UnitManager, grid: WorldGrid) {
    this.villages = villages;
    this.units    = units;
    this.grid     = grid;

    // Panel-DOM aufbauen
    this.panelEl  = document.createElement('div');
    this.panelEl.id = 'inspect-panel';

    const inner   = document.createElement('div');
    inner.id      = 'inspect-inner';

    this.closeBtn = document.createElement('button');
    this.closeBtn.id        = 'inspect-close';
    this.closeBtn.textContent = '✕';
    this.closeBtn.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.close(); });

    this.titleEl  = document.createElement('div');
    this.titleEl.id = 'inspect-title';

    this.bodyEl   = document.createElement('pre');
    this.bodyEl.id  = 'inspect-body';

    inner.appendChild(this.closeBtn);
    inner.appendChild(this.titleEl);
    inner.appendChild(this.bodyEl);
    this.panelEl.appendChild(inner);
    document.body.appendChild(this.panelEl);
  }

  // ─── Öffnen ───────────────────────────────────────────────────────────────

  inspectTile(tx: number, ty: number): void {
    // Einheit auf Kachel?
    const unit = this.units.liveUnits.find(u => u.x === tx && u.y === ty);
    if (unit) { this.openUnit(unit); return; }

    // Gebäude auf Kachel?
    const building = this.villages.buildingAt(tx, ty);
    if (building) { this.openBuilding(building); return; }

    // Dorf-Mittelpunkt?
    for (const v of this.villages.allVillages) {
      if (v.x === tx && v.y === ty) { this.openVillage(v); return; }
    }

    // Kachel selbst
    this.openTile(tx, ty);
  }

  private openUnit(u: Unit): void {
    this.target = { kind: 'unit', id: u.id };
    const fc = FACTIONS[u.faction];
    this.show(`${fc.name} — ${this.roleName(u.role)}`, this.unitBody(u));
  }

  private openBuilding(b: Building): void {
    this.target = { kind: 'building', id: b.id };
    const fc = FACTIONS[b.faction];
    this.show(`${fc.name} — ${BUILDING_DEFS[b.type].type}`, this.buildingBody(b));
  }

  private openVillage(v: Village): void {
    this.target = { kind: 'village', faction: v.faction };
    const fc = FACTIONS[v.faction];
    this.show(`${fc.name} — Dorf`, this.villageBody(v));
  }

  private openTile(tx: number, ty: number): void {
    this.target = { kind: 'tile', x: tx, y: ty };
    const t    = this.grid.get(tx, ty);
    const name = TILE_NAMES[t] ?? '?';
    this.show(`Kachel (${tx}, ${ty})`, `Typ: ${name}`);
  }

  // ─── Live-Refresh ────────────────────────────────────────────────────────

  /** Aufgerufen vom Game-Loop — aktualisiert nur den Text, kein DOM-Rebuild. */
  refresh(): void {
    if (!this.target) return;

    switch (this.target.kind) {
      case 'unit': {
        const found = this.units.units.find(u => u.id === (this.target as { kind: 'unit'; id: number }).id);
        if (!found || found.dead) { this.close(); return; }
        this.bodyEl.textContent = this.unitBody(found);
        break;
      }
      case 'building': {
        const b = this.villages.buildings.find(b => b.id === (this.target as { kind: 'building'; id: number }).id);
        if (!b || b.dead) { this.close(); return; }
        this.bodyEl.textContent = this.buildingBody(b);
        break;
      }
      case 'village': {
        const v = this.villages.villages[(this.target as { kind: 'village'; faction: string }).faction as 'human' | 'orc'];
        if (!v) { this.close(); return; }
        this.bodyEl.textContent = this.villageBody(v);
        break;
      }
      case 'tile': {
        const { x, y } = this.target as { kind: 'tile'; x: number; y: number };
        const t = this.grid.get(x, y);
        this.bodyEl.textContent = `Typ: ${TILE_NAMES[t] ?? '?'}`;
        break;
      }
    }
  }

  // ─── Schließen ───────────────────────────────────────────────────────────

  close(): void {
    this.target = null;
    this.panelEl.classList.remove('visible');
  }

  get isOpen(): boolean {
    return this.target !== null;
  }

  destroy(): void {
    this.panelEl.remove();
  }

  // ─── Inhalts-Helfer ──────────────────────────────────────────────────────

  private show(title: string, body: string): void {
    this.titleEl.textContent = title;
    this.bodyEl.textContent  = body;
    this.panelEl.classList.add('visible');
  }

  private unitBody(u: Unit): string {
    const hpBar = this.bar(u.hp, u.maxHp, 14);
    return [
      `HP    ${u.hp}/${u.maxHp}  ${hpBar}`,
      `Rolle ${this.roleName(u.role)}`,
      `Staat ${u.state}`,
      `Pos   (${u.x}, ${u.y})`,
      u.carryFood + u.carryWood > 0
        ? `Trägt F${u.carryFood}  H${u.carryWood}`
        : '',
    ].filter(Boolean).join('\n');
  }

  private buildingBody(b: Building): string {
    const hpBar = this.bar(b.hp, b.maxHp, 14);
    return [
      `HP    ${b.hp}/${b.maxHp}  ${hpBar}`,
      `Typ   ${BUILDING_DEFS[b.type].effectText}`,
      `Pos   (${b.x}, ${b.y})`,
    ].join('\n');
  }

  private villageBody(v: Village): string {
    const pop = this.units.liveCount(v.faction as 'human' | 'orc');
    return [
      `Level    ${v.level}`,
      `Pop      ${pop}`,
      `Nahrung  ${Math.floor(v.food)}`,
      `Holz     ${Math.floor(v.wood)}`,
      `Hunger   ${v.hunger.toFixed(1)}`,
      `Gebäude  ${v.buildings.length}`,
    ].join('\n');
  }

  private roleName(role: string): string {
    const map: Record<string, string> = {
      gatherer: 'Sammler', builder: 'Baumeister',
      guard:    'Wache',   raider:  'Räuber',
    };
    return map[role] ?? role;
  }

  private bar(val: number, max: number, len: number): string {
    const filled = Math.round((val / max) * len);
    return '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, len - filled));
  }
}
