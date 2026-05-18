import Phaser from 'phaser';
import { GameScene } from './GameScene';
import { SpeedIndex } from '@game/simulation/SimulationClock';
import { GOAL_DAYS } from '@game/simulation/GoalSystem';
import { FACTIONS } from '@game/factions/Faction';

/**
 * UIScene — Phase 21-UX
 *
 * Kategorisierter God-Toolbox-Dock:
 *   Zerstörung | Natur | Völker | Kreaturen | Terrain | Mehr
 *
 * Nur die Werkzeuge der aktiven Kategorie werden angezeigt.
 * Beim Tab-Wechsel erscheint kurz ein Hinweis-Toast (#category-hint).
 * Pause/Speed befinden sich in der "Mehr"-Kategorie.
 */

type CategoryKey = 'destruction' | 'nature' | 'civilizations' | 'creatures' | 'terrain' | 'more';

interface ToolEntry {
  key: string;
  icon: string;
  label: string;
}

interface CategoryDef {
  key: CategoryKey;
  icon: string;
  label: string;
  hint: string;
  tools: ToolEntry[];
}

const CATEGORIES: CategoryDef[] = [
  {
    key: 'destruction',
    icon: '💥',
    label: 'Zerstörung',
    hint: 'Blitz, Feuer und Meteor verändern die Welt mit Gewalt.',
    tools: [
      { key: 'lightning', icon: 'ϟ',  label: 'Blitz'  },
      { key: 'fire',      icon: '🔥', label: 'Feuer'  },
      { key: 'meteor',    icon: '☄',  label: 'Meteor' },
    ],
  },
  {
    key: 'nature',
    icon: '🌿',
    label: 'Natur',
    hint: 'Bringe Regen oder heile das Land.',
    tools: [
      { key: 'rain', icon: '☔', label: 'Regen'  },
      { key: 'heal', icon: '✚', label: 'Heilen' },
    ],
  },
  {
    key: 'civilizations',
    icon: '🏘',
    label: 'Völker',
    hint: 'Erschaffe Zivilisationen und beobachte, wie sie wachsen.',
    tools: [
      { key: 'human', icon: '👤', label: 'Mensch' },
      { key: 'orc',   icon: '👹', label: 'Ork'    },
      { key: 'elf',   icon: '🧝', label: 'Elfe'   },
      { key: 'dwarf', icon: '⛏',  label: 'Zwerg'  },
    ],
  },
  {
    key: 'creatures',
    icon: '🐾',
    label: 'Kreaturen',
    hint: 'Setze wilde Kreaturen in die Welt.',
    tools: [
      { key: 'wolf',  icon: '🐺', label: 'Wolf'  },
      { key: 'demon', icon: '👿', label: 'Dämon' },
    ],
  },
  {
    key: 'terrain',
    icon: '🗺',
    label: 'Terrain',
    hint: 'Male das Land neu: Gras, Wasser, Wald, Berge.',
    tools: [
      { key: 'terrain-grass',    icon: '🟩', label: 'Gras'   },
      { key: 'terrain-water',    icon: '🟦', label: 'Wasser' },
      { key: 'terrain-forest',   icon: '🌲', label: 'Wald'   },
      { key: 'terrain-mountain', icon: '⛰',  label: 'Berg'   },
      { key: 'terrain-sand',     icon: '🟨', label: 'Sand'   },
    ],
  },
  {
    key: 'more',
    icon: '⋯',
    label: 'Mehr',
    hint: 'Inspizieren, pausieren und Geschwindigkeit anpassen.',
    tools: [
      { key: 'inspect', icon: 'ⓘ', label: 'Info' },
    ],
  },
];

export class UIScene extends Phaser.Scene {
  private hudEl!:  HTMLElement;
  private dockEl!: HTMLElement;

  private activeToolKey    = 'rain';
  private activeCategoryKey: CategoryKey = 'nature';

  private speedBtns: HTMLButtonElement[] = [];
  private pauseBtn!: HTMLButtonElement;

  /** Per-category tool grid containers, keyed by CategoryKey */
  private toolGrids = new Map<CategoryKey, HTMLElement>();
  /** Per-category tab buttons */
  private tabBtns   = new Map<CategoryKey, HTMLButtonElement>();

  private hintTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    this.buildHud();
    this.buildToolDock();
  }

  // ─── HUD ─────────────────────────────────────────────────────────────────

  private buildHud(): void {
    this.hudEl = document.createElement('div');
    this.hudEl.id = 'hud';

    const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');
    const fHum   = FACTIONS.human;
    const fOrc   = FACTIONS.orc;
    const fElf   = FACTIONS.elf;
    const fDwarf = FACTIONS.dwarf;

    this.hudEl.innerHTML = `
      <div class="hud-row hud-row--primary">
        <span class="hud-label">Tag</span>
        <span class="hud-value" id="hud-day">1 / ${GOAL_DAYS}</span>
        <span class="hud-sep"></span>
        <span class="hud-label">Status</span>
        <span class="hud-value hud-status" id="hud-status">FRIEDEN</span>
      </div>
      <div class="hud-row hud-row--factions">
        <span style="color:${hex(fHum.color)}"  class="hud-faction-label">${fHum.short}</span>
        <span class="hud-value hud-faction-val" id="hud-human" style="color:${hex(fHum.color)}">—</span>
        <span style="color:${hex(fOrc.color)}"  class="hud-faction-label">${fOrc.short}</span>
        <span class="hud-value hud-faction-val" id="hud-orc"   style="color:${hex(fOrc.color)}">—</span>
        <span style="color:${hex(fElf.color)}"  class="hud-faction-label">${fElf.short}</span>
        <span class="hud-value hud-faction-val" id="hud-elf"   style="color:${hex(fElf.color)}">—</span>
        <span style="color:${hex(fDwarf.color)}" class="hud-faction-label">${fDwarf.short}</span>
        <span class="hud-value hud-faction-val" id="hud-dwarf" style="color:${hex(fDwarf.color)}">—</span>
      </div>
    `;
    document.body.appendChild(this.hudEl);
  }

  // ─── Tool-Dock ───────────────────────────────────────────────────────────

  private buildToolDock(): void {
    this.dockEl = document.createElement('div');
    this.dockEl.id = 'tool-dock';

    // ── Category Tab Row ────────────────────────────────────────────────────
    const tabRow = document.createElement('div');
    tabRow.className = 'dock-cat-row';

    for (const cat of CATEGORIES) {
      const tab = document.createElement('button');
      tab.className = 'dock-cat-btn' + (cat.key === this.activeCategoryKey ? ' active' : '');
      tab.setAttribute('aria-label', cat.label);
      tab.innerHTML = `<span class="cat-icon">${cat.icon}</span><span class="cat-label">${cat.label}</span>`;
      tab.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.switchCategory(cat.key);
      });
      this.tabBtns.set(cat.key, tab);
      tabRow.appendChild(tab);
    }

    // ── Tool Grids (one per category, only active is shown) ─────────────────
    const toolArea = document.createElement('div');
    toolArea.className = 'dock-tool-area';

    for (const cat of CATEGORIES) {
      const grid = document.createElement('div');
      grid.className = 'dock-tool-grid' + (cat.key === this.activeCategoryKey ? '' : ' hidden');

      for (const t of cat.tools) {
        const btn = document.createElement('button');
        btn.className = 'tool-btn' + (t.key === this.activeToolKey ? ' active' : '');
        btn.dataset['toolKey'] = t.key;
        btn.setAttribute('aria-label', t.label);
        btn.innerHTML = `<span class="tool-icon">${t.icon}</span><span class="tool-label">${t.label}</span>`;
        btn.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          this.selectTool(t.key);
        });
        grid.appendChild(btn);
      }

      // "Mehr" category appends pause + speed controls inline in the grid
      if (cat.key === 'more') {
        grid.appendChild(this.buildControlsInGrid());
      }

      this.toolGrids.set(cat.key, grid);
      toolArea.appendChild(grid);
    }

    this.dockEl.appendChild(tabRow);
    this.dockEl.appendChild(toolArea);
    document.body.appendChild(this.dockEl);
  }

  /** Builds pause + speed as pseudo-tool buttons for use inside the Mehr grid. */
  private buildControlsInGrid(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'dock-controls-inline';

    // Pause button
    this.pauseBtn = document.createElement('button');
    this.pauseBtn.className = 'tool-btn tool-btn--wide';
    this.pauseBtn.id = 'btn-pause';
    this.pauseBtn.setAttribute('aria-label', 'Simulation pausieren');
    this.pauseBtn.innerHTML = `<span class="tool-icon">⏸</span><span class="tool-label">Pause</span>`;
    this.pauseBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      const gs = this.scene.get('GameScene') as GameScene | null;
      if (!gs) return;
      gs.getClock().togglePause();
      this.syncPauseBtn(gs.getClock().paused);
    });

    // Speed group
    const speedGroup = document.createElement('div');
    speedGroup.className = 'speed-group';
    speedGroup.setAttribute('role', 'group');
    speedGroup.setAttribute('aria-label', 'Spielgeschwindigkeit');

    const speedLabels = ['×1', '×2', '×3', '×4'];
    this.speedBtns = speedLabels.map((label, i) => {
      const btn = document.createElement('button');
      btn.className = 'speed-btn' + (i === 0 ? ' active' : '');
      btn.textContent = label;
      btn.setAttribute('aria-label', `${label} Geschwindigkeit`);
      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        const gs = this.scene.get('GameScene') as GameScene | null;
        if (!gs) return;
        gs.getClock().setSpeed(i as SpeedIndex);
        this.syncSpeedBtns(i);
      });
      speedGroup.appendChild(btn);
      return btn;
    });

    wrap.appendChild(this.pauseBtn);
    wrap.appendChild(speedGroup);
    return wrap;
  }

  // ─── Category Switching ──────────────────────────────────────────────────

  private switchCategory(key: CategoryKey): void {
    if (key === this.activeCategoryKey) return;

    // Update tab highlight
    this.tabBtns.forEach((btn, k) => btn.classList.toggle('active', k === key));

    // Swap visible grid
    this.toolGrids.forEach((grid, k) => grid.classList.toggle('hidden', k !== key));

    this.activeCategoryKey = key;

    // Select first tool in the new category (unless it's "more")
    const cat = CATEGORIES.find(c => c.key === key);
    if (cat && cat.tools.length > 0 && key !== 'more') {
      this.selectTool(cat.tools[0].key);
    }

    // Show hint toast
    if (cat) this.showCategoryHint(cat.hint);
  }

  private showCategoryHint(text: string): void {
    const el = document.getElementById('category-hint');
    if (!el) return;
    if (this.hintTimeout !== null) clearTimeout(this.hintTimeout);
    el.textContent = text;
    el.classList.remove('hidden');
    el.classList.add('visible');
    this.hintTimeout = setTimeout(() => {
      el.classList.remove('visible');
      // Wait for fade-out transition before hiding
      setTimeout(() => el.classList.add('hidden'), 350);
      this.hintTimeout = null;
    }, 2500);
  }

  // ─── Sync-Hilfsmethoden ──────────────────────────────────────────────────

  private syncPauseBtn(paused: boolean): void {
    this.pauseBtn.innerHTML = paused
      ? `<span class="tool-icon">▶</span><span class="tool-label">Weiter</span>`
      : `<span class="tool-icon">⏸</span><span class="tool-label">Pause</span>`;
    this.pauseBtn.classList.toggle('paused', paused);
    this.pauseBtn.setAttribute('aria-pressed', String(paused));
  }

  private syncSpeedBtns(activeIndex: number): void {
    this.speedBtns.forEach((btn, i) => btn.classList.toggle('active', i === activeIndex));
  }

  // ─── Tool Selection ──────────────────────────────────────────────────────

  private selectTool(key: string): void {
    this.activeToolKey = key;
    this.dockEl.querySelectorAll<HTMLButtonElement>('.tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset['toolKey'] === key);
    });
    const el = document.getElementById('hud-tool');
    if (el) el.textContent = key;
  }

  // ─── Result Overlay ──────────────────────────────────────────────────────

  showResult(won: boolean): void {
    const overlay   = document.getElementById('result-overlay');
    const titleEl   = document.getElementById('result-title');
    const messageEl = document.getElementById('result-message');
    const actionBtn = document.getElementById('btn-result-action') as HTMLButtonElement | null;
    if (!overlay || !titleEl || !messageEl || !actionBtn) return;

    if (won) {
      titleEl.textContent   = '🌟 Sieg!';
      messageEl.textContent = `Die Welt hat ${GOAL_DAYS} Tage überlebt. Gut gemacht, Gottheit!`;
      actionBtn.textContent = 'Weiter beobachten';
    } else {
      titleEl.textContent   = '💀 Niederlage';
      messageEl.textContent = 'Alle Dörfer und Einheiten sind untergegangen. Die Welt ist verloren.';
      actionBtn.textContent = 'Schließen';
    }

    overlay.classList.remove('hidden');
    actionBtn.addEventListener('click', () => overlay.classList.add('hidden'), { once: true });
  }

  // ─── Public API ──────────────────────────────────────────────────────────

  setDay(day: number, total?: number): void {
    const el = document.getElementById('hud-day');
    if (!el) return;
    el.textContent = total !== undefined ? `${day} / ${total}` : `${day}`;
  }

  setStatus(status: string): void {
    const el = document.getElementById('hud-status') as HTMLElement | null;
    if (!el) return;
    el.textContent = status;
    const colorMap: Record<string, string> = {
      FRIEDEN:          'var(--accent)',
      ANSPANNUNG:       '#ffca45',
      KRIEG:            '#ff4b4b',
      WAFFENSTILLSTAND: '#aaffaa',
    };
    el.style.color = colorMap[status] ?? 'var(--accent)';
  }

  setFactionSummary(faction: string, text: string): void {
    const el = document.getElementById(`hud-${faction}`);
    if (el) el.textContent = text;
  }

  getActiveTool(): string { return this.activeToolKey; }

  shutdown(): void {
    this.hudEl?.remove();
    this.dockEl?.remove();
  }
}
