import Phaser from 'phaser';
import { GameScene } from './GameScene';
import { SpeedIndex } from '@game/simulation/SimulationClock';
import { GOAL_DAYS } from '@game/simulation/GoalSystem';
import { FACTIONS } from '@game/factions/Faction';

type CategoryKey = 'destruction' | 'nature' | 'civilizations' | 'creatures' | 'terrain' | 'more';

interface ToolEntry {
  key: string;
  glyph: string;
  label: string;
}

interface CategoryDef {
  key: CategoryKey;
  glyph: string;
  label: string;
  hint: string;
  tools: ToolEntry[];
}

const CATEGORIES: CategoryDef[] = [
  {
    key: 'destruction',
    glyph: '\u{1F4A5}',
    label: 'Zerst\u00f6rung',
    hint: 'Blitz, Feuer und Meteor ver\u00e4ndern die Welt mit Gewalt.',
    tools: [
      { key: 'lightning', glyph: '\u26a1', label: 'Blitz'  },
      { key: 'fire',      glyph: '\u{1F525}', label: 'Feuer'  },
      { key: 'meteor',    glyph: '\u2604\ufe0f',  label: 'Meteor' },
    ],
  },
  {
    key: 'nature',
    glyph: '\u{1F33F}',
    label: 'Natur',
    hint: 'Bringe Regen oder heile das Land.',
    tools: [
      { key: 'rain', glyph: '\u{1F327}\ufe0f', label: 'Regen'  },
      { key: 'heal', glyph: '\u271a',  label: 'Heilen' },
    ],
  },
  {
    key: 'civilizations',
    glyph: '\u{1F3D8}\ufe0f',
    label: 'V\u00f6lker',
    hint: 'Erschaffe Zivilisationen und beobachte, wie sie wachsen.',
    tools: [
      { key: 'human', glyph: '\u{1F464}', label: 'Mensch' },
      { key: 'orc',   glyph: '\u{1F479}', label: 'Ork'    },
      { key: 'elf',   glyph: '\u{1F9DD}', label: 'Elfe'   },
      { key: 'dwarf', glyph: '\u26cf\ufe0f',  label: 'Zwerg'  },
    ],
  },
  {
    key: 'creatures',
    glyph: '\u{1F43E}',
    label: 'Kreaturen',
    hint: 'Setze wilde Kreaturen in die Welt.',
    tools: [
      { key: 'wolf',  glyph: '\u{1F43A}', label: 'Wolf'  },
      { key: 'demon', glyph: '\u{1F47F}', label: 'D\u00e4mon' },
    ],
  },
  {
    key: 'terrain',
    glyph: '\u{1F5FA}\ufe0f',
    label: 'Terrain',
    hint: 'Male das Land neu: Gras, Wasser, Wald, Berge.',
    tools: [
      { key: 'terrain-grass',    glyph: '\u{1F7E9}', label: 'Gras'   },
      { key: 'terrain-water',    glyph: '\u{1F7E6}', label: 'Wasser' },
      { key: 'terrain-forest',   glyph: '\u{1F332}', label: 'Wald'   },
      { key: 'terrain-mountain', glyph: '\u26f0\ufe0f',  label: 'Berg'   },
      { key: 'terrain-sand',     glyph: '\u{1F7E8}', label: 'Sand'   },
    ],
  },
  {
    key: 'more',
    glyph: '\u22ef',
    label: 'Mehr',
    hint: 'Inspizieren, pausieren und Geschwindigkeit anpassen.',
    tools: [
      { key: 'inspect', glyph: '\u24d8', label: 'Info' },
    ],
  },
];

// â”€â”€â”€ Category accent colors (used as CSS custom property on each tab) â”€â”€â”€â”€â”€â”€â”€â”€
const CAT_ACCENT: Record<CategoryKey, string> = {
  destruction:    'var(--accent-danger)',
  nature:         'var(--accent-nature)',
  civilizations:  'var(--accent-gold)',
  creatures:      '#a05080',
  terrain:        'var(--accent-earth)',
  more:           'var(--muted)',
};

const TOOL_ASSET_ALIASES: Record<string, string> = {
  'cat-destruction': 'meteor',
  'cat-nature': 'heal',
  'cat-civilizations': 'human',
  'cat-creatures': 'wolf',
  'cat-terrain': 'terrain-grass',
  'cat-more': 'inspect',
};

function iconAssetMarkup(key: string, fallback: string, label: string): string {
  const assetKey = TOOL_ASSET_ALIASES[key] ?? key;
  const src = `assets/ui/tools/${assetKey}.png`;
  return `<img class="dock-icon-img" src="${src}" alt="" aria-hidden="true" data-fallback="${fallback}" data-label="${label}">`;
}

export class UIScene extends Phaser.Scene {
  private hudEl!:  HTMLElement;
  private dockEl!: HTMLElement;

  private activeToolKey    = 'rain';
  private activeCategoryKey: CategoryKey = 'nature';

  private speedBtns: HTMLButtonElement[] = [];
  private pauseBtn!: HTMLButtonElement;

  private toolGrids = new Map<CategoryKey, HTMLElement>();
  private tabBtns   = new Map<CategoryKey, HTMLButtonElement>();

  private hintTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    this.buildHud();
    this.buildToolDock();
  }

  // â”€â”€â”€ HUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
        <div class="hud-chip hud-chip--day">
          <span class="hud-chip-label">Tag</span>
          <span class="hud-chip-value" id="hud-day">1</span>
        </div>
        <div class="hud-chip hud-chip--status">
          <span class="hud-chip-label">Status</span>
          <span class="hud-chip-value hud-status" id="hud-status">FRIEDEN</span>
        </div>
      </div>
      <div class="hud-row hud-row--factions">
        <div class="hud-faction-chip" style="--fc:${hex(fHum.color)}">
          <span class="hud-faction-name">${fHum.short}</span>
          <span class="hud-faction-val" id="hud-human">-</span>
        </div>
        <div class="hud-faction-chip" style="--fc:${hex(fOrc.color)}">
          <span class="hud-faction-name">${fOrc.short}</span>
          <span class="hud-faction-val" id="hud-orc">-</span>
        </div>
        <div class="hud-faction-chip" style="--fc:${hex(fElf.color)}">
          <span class="hud-faction-name">${fElf.short}</span>
          <span class="hud-faction-val" id="hud-elf">-</span>
        </div>
        <div class="hud-faction-chip" style="--fc:${hex(fDwarf.color)}">
          <span class="hud-faction-name">${fDwarf.short}</span>
          <span class="hud-faction-val" id="hud-dwarf">-</span>
        </div>
      </div>
    `;
    document.body.appendChild(this.hudEl);
  }

  // â”€â”€â”€ Tool-Dock â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private buildToolDock(): void {
    this.dockEl = document.createElement('div');
    this.dockEl.id = 'tool-dock';

    // â”€â”€ Category Tab Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const tabRow = document.createElement('div');
    tabRow.className = 'dock-cat-row';

    for (const cat of CATEGORIES) {
      const tab = document.createElement('button');
      const isActive = cat.key === this.activeCategoryKey;
      tab.className = 'dock-cat-btn' + (isActive ? ' active' : '');
      tab.setAttribute('aria-label', cat.label);
      tab.style.setProperty('--cat-accent', CAT_ACCENT[cat.key]);

      tab.innerHTML = `<span class="cat-icon">${iconAssetMarkup(`cat-${cat.key}`, cat.glyph, cat.label)}</span><span class="cat-label">${cat.label}</span>`;
      tab.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.switchCategory(cat.key);
      });
      this.tabBtns.set(cat.key, tab);
      tabRow.appendChild(tab);
    }

    // â”€â”€ Tool Grids â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const toolArea = document.createElement('div');
    toolArea.className = 'dock-tool-area';

    for (const cat of CATEGORIES) {
      const grid = document.createElement('div');
      grid.className = 'dock-tool-grid' + (cat.key === this.activeCategoryKey ? '' : ' hidden');
      grid.dataset['category'] = cat.key;

      for (const t of cat.tools) {
        const btn = this.makeToolBtn(t.key, t.label, t.glyph, cat.key);
        if (t.key === this.activeToolKey) btn.classList.add('active');
        grid.appendChild(btn);
      }

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

  private makeToolBtn(
    key: string,
    label: string,
    glyph: string,
    catKey: CategoryKey,
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'tool-btn';
    btn.dataset['toolKey'] = key;
    btn.dataset['category'] = catKey;
    btn.setAttribute('aria-label', label);
    btn.style.setProperty('--cat-accent', CAT_ACCENT[catKey]);

    btn.innerHTML = `<span class="tool-glyph">${iconAssetMarkup(key, glyph, label)}</span><span class="tool-label">${label}</span>`;
    btn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.selectTool(key);
    });
    return btn;
  }

  /** Builds pause + speed controls for the Mehr grid. */
  private buildControlsInGrid(): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'dock-controls-inline';

    // Pause button
    this.pauseBtn = document.createElement('button');
    this.pauseBtn.className = 'tool-btn tool-btn--wide tool-btn--control';
    this.pauseBtn.id = 'btn-pause';
    this.pauseBtn.setAttribute('aria-label', 'Simulation pausieren');
    this.pauseBtn.style.setProperty('--cat-accent', CAT_ACCENT.more);
    this.setPauseContent(false);
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

    const speedLabels = ['\u00d71', '\u00d72', '\u00d73', '\u00d74'];
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

  // â”€â”€â”€ Category Switching â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private switchCategory(key: CategoryKey): void {
    if (key === this.activeCategoryKey) return;

    this.tabBtns.forEach((btn, k) => btn.classList.toggle('active', k === key));
    this.toolGrids.forEach((grid, k) => grid.classList.toggle('hidden', k !== key));
    this.activeCategoryKey = key;

    const cat = CATEGORIES.find(c => c.key === key);
    if (cat && cat.tools.length > 0 && key !== 'more') {
      this.selectTool(cat.tools[0].key);
    }
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
      setTimeout(() => el.classList.add('hidden'), 350);
      this.hintTimeout = null;
    }, 2500);
  }

  // â”€â”€â”€ Sync helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private setPauseContent(paused: boolean): void {
    const label = paused ? 'Weiter' : 'Pause';
    this.pauseBtn.innerHTML = `<span class="tool-glyph">${iconAssetMarkup('pause', label, label)}</span><span class="tool-label">${label}</span>`;
  }

  private syncPauseBtn(paused: boolean): void {
    this.setPauseContent(paused);
    this.pauseBtn.classList.toggle('paused', paused);
    this.pauseBtn.setAttribute('aria-pressed', String(paused));
  }

  private syncSpeedBtns(activeIndex: number): void {
    this.speedBtns.forEach((btn, i) => btn.classList.toggle('active', i === activeIndex));
  }

  // â”€â”€â”€ Tool Selection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private selectTool(key: string): void {
    this.activeToolKey = key;
    this.dockEl.querySelectorAll<HTMLButtonElement>('.tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset['toolKey'] === key);
    });
    const el = document.getElementById('hud-tool');
    if (el) el.textContent = key;
  }

  // â”€â”€â”€ Result Overlay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  showResult(won: boolean): void {
    const overlay   = document.getElementById('result-overlay');
    const titleEl   = document.getElementById('result-title');
    const messageEl = document.getElementById('result-message');
    const actionBtn = document.getElementById('btn-result-action') as HTMLButtonElement | null;
    if (!overlay || !titleEl || !messageEl || !actionBtn) return;

    if (won) {
      titleEl.textContent   = '\u{1F31F} Sieg!';
      messageEl.textContent = `Die Welt hat ${GOAL_DAYS} Tage \u00fcberlebt. Gut gemacht, Gottheit!`;
      actionBtn.textContent = 'Weiter beobachten';
    } else {
      titleEl.textContent   = '\u{1F480} Niederlage';
      messageEl.textContent = 'Alle D\u00f6rfer und Einheiten sind untergegangen. Die Welt ist verloren.';
      actionBtn.textContent = 'Schlie\u00dfen';
    }

    overlay.classList.remove('hidden');
    actionBtn.addEventListener('click', () => overlay.classList.add('hidden'), { once: true });
  }

  // â”€â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      FRIEDEN:          'var(--accent-nature)',
      ANSPANNUNG:       'var(--accent-gold)',
      KRIEG:            'var(--accent-danger)',
      WAFFENSTILLSTAND: 'var(--accent-nature)',
    };
    el.style.color = colorMap[status] ?? 'var(--muted)';
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
