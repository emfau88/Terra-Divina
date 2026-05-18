import Phaser from 'phaser';
import { GameScene } from './GameScene';
import { SpeedIndex } from '@game/simulation/SimulationClock';
import { GOAL_DAYS } from '@game/simulation/GoalSystem';
import { FACTIONS } from '@game/factions/Faction';

/**
 * UIScene — Phase 17 (Terrain-Painting)
 *
 * Änderungen in Phase 17:
 * - Tab-Leiste im Dock: "Götter"-Tab (8 Werkzeuge) und "Terrain"-Tab (5 Werkzeuge)
 * - Terrain-Werkzeuge: terrain-grass, terrain-water, terrain-forest, terrain-mountain, terrain-sand
 * - selectTool() erkennt Terrain-Keys und aktiviert den korrekten Button
 *
 * Frühere Änderungen (Phase 13A):
 * - Standard-Tool geändert von 'inspect' auf 'heal'
 * - setupIntroOverlay: Uhr startet erst nach Klick auf "Welt starten"
 * - showResult: zeigt Sieg- oder Niederlage-Overlay
 * - setDay erhält total-Parameter für "Tag X / 30"-Anzeige
 */
export class UIScene extends Phaser.Scene {
  private hudEl!:  HTMLElement;
  private dockEl!: HTMLElement;

  /** Standard-Tool ist 'heal' (statt 'inspect'). */
  private activeToolKey = 'heal';

  private speedBtns: HTMLButtonElement[] = [];
  private pauseBtn!: HTMLButtonElement;

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

    const fHum   = FACTIONS.human;
    const fOrc   = FACTIONS.orc;
    const fElf   = FACTIONS.elf;
    const fDwarf = FACTIONS.dwarf;

    const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');

    this.hudEl.innerHTML = `
      <div class="hud-row">
        <span class="hud-label">Tag</span>
        <span class="hud-value" id="hud-day">1 / ${GOAL_DAYS}</span>
        <span class="hud-label" style="margin-left:12px">Status</span>
        <span class="hud-value hud-status" id="hud-status">FRIEDEN</span>
        <span class="hud-label" style="margin-left:12px">Tool</span>
        <span class="hud-value" id="hud-tool">heal</span>
      </div>
      <div class="hud-row" style="margin-top:4px">
        <span style="color:${hex(fHum.color)};font-size:11px;font-weight:700;letter-spacing:.04em">${fHum.short}</span>
        <span class="hud-value" id="hud-human" style="color:${hex(fHum.color)};font-size:12px">—</span>
        <span style="color:${hex(fOrc.color)};font-size:11px;font-weight:700;letter-spacing:.04em;margin-left:8px">${fOrc.short}</span>
        <span class="hud-value" id="hud-orc" style="color:${hex(fOrc.color)};font-size:12px">—</span>
        <span style="color:${hex(fElf.color)};font-size:11px;font-weight:700;letter-spacing:.04em;margin-left:8px">${fElf.short}</span>
        <span class="hud-value" id="hud-elf" style="color:${hex(fElf.color)};font-size:12px">—</span>
        <span style="color:${hex(fDwarf.color)};font-size:11px;font-weight:700;letter-spacing:.04em;margin-left:8px">${fDwarf.short}</span>
        <span class="hud-value" id="hud-dwarf" style="color:${hex(fDwarf.color)};font-size:12px">—</span>
      </div>
    `;
    document.body.appendChild(this.hudEl);
  }

  // ─── Tool-Dock ───────────────────────────────────────────────────────────

  private buildToolDock(): void {
    this.dockEl = document.createElement('div');
    this.dockEl.id = 'tool-dock';

    // ─── Tab-Leiste ──────────────────────────────────────────────────────────
    const tabBar = document.createElement('div');
    tabBar.className = 'dock-tabs';

    const tabGoetter  = document.createElement('button');
    tabGoetter.className = 'dock-tab active';
    tabGoetter.textContent = '⚡ Götter';
    tabGoetter.setAttribute('aria-label', 'Götterwerkzeuge');

    const tabTerrain  = document.createElement('button');
    tabTerrain.className = 'dock-tab';
    tabTerrain.textContent = '🌍 Terrain';
    tabTerrain.setAttribute('aria-label', 'Terrain-Werkzeuge');

    tabBar.appendChild(tabGoetter);
    tabBar.appendChild(tabTerrain);

    // ─── Götter-Tab: 8 Werkzeuge in zwei Reihen ──────────────────────────────
    const goetterGroup = document.createElement('div');
    goetterGroup.className = 'tool-rows-group';

    const goetterTools = [
      { key: 'inspect',   icon: 'ⓘ',  label: 'Info'    },
      { key: 'lightning', icon: 'ϟ',   label: 'Blitz'   },
      { key: 'fire',      icon: '🔥',  label: 'Feuer'   },
      { key: 'rain',      icon: '☔',  label: 'Regen'   },
      { key: 'meteor',    icon: '●',   label: 'Meteor'  },
      { key: 'heal',      icon: '✚',   label: 'Heilen'  },
      { key: 'human',     icon: '＋',  label: 'Mensch'  },
      { key: 'orc',       icon: '＋',  label: 'Ork'     },
      { key: 'elf',       icon: '＋',  label: 'Elfe'    },
      { key: 'dwarf',     icon: '＋',  label: 'Zwerg'   },
      { key: 'wolf',      icon: '🐺',  label: 'Wolf'    },
      { key: 'demon',     icon: '👿',  label: 'Dämon'   },
    ];

    const goetterRow1 = document.createElement('div');
    goetterRow1.className = 'tool-row';
    const goetterRow2 = document.createElement('div');
    goetterRow2.className = 'tool-row';
    const goetterRow3 = document.createElement('div');
    goetterRow3.className = 'tool-row';

    goetterTools.forEach((t, i) => {
      const btn = document.createElement('button');
      btn.className = 'tool-btn';
      btn.dataset['toolKey'] = t.key;
      btn.setAttribute('aria-label', t.label);
      btn.innerHTML = `<span class="tool-icon">${t.icon}</span><span class="tool-label">${t.label}</span>`;
      if (t.key === this.activeToolKey) btn.classList.add('active');
      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.selectTool(t.key);
      });
      if (i < 4)      goetterRow1.appendChild(btn);
      else if (i < 8) goetterRow2.appendChild(btn);
      else            goetterRow3.appendChild(btn);
    });

    goetterGroup.appendChild(goetterRow1);
    goetterGroup.appendChild(goetterRow2);
    goetterGroup.appendChild(goetterRow3);

    // ─── Terrain-Tab: 5 Werkzeuge in einer Reihe ────────────────────────────
    const terrainGroup = document.createElement('div');
    terrainGroup.className = 'tool-rows-group hidden';

    const terrainTools = [
      { key: 'terrain-grass',    icon: '🟩', label: 'Gras'    },
      { key: 'terrain-water',    icon: '🟦', label: 'Wasser'  },
      { key: 'terrain-forest',   icon: '🌲', label: 'Wald'    },
      { key: 'terrain-mountain', icon: '⛰',  label: 'Berg'    },
      { key: 'terrain-sand',     icon: '🟨', label: 'Sand'    },
    ];

    const terrainRow = document.createElement('div');
    terrainRow.className = 'tool-row';

    terrainTools.forEach((t) => {
      const btn = document.createElement('button');
      btn.className = 'tool-btn';
      btn.dataset['toolKey'] = t.key;
      btn.setAttribute('aria-label', t.label);
      btn.innerHTML = `<span class="tool-icon">${t.icon}</span><span class="tool-label">${t.label}</span>`;
      btn.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.selectTool(t.key);
      });
      terrainRow.appendChild(btn);
    });

    terrainGroup.appendChild(terrainRow);

    // ─── Tab-Wechsel-Logik ───────────────────────────────────────────────────
    tabGoetter.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      // Tab umschalten
      tabGoetter.classList.add('active');
      tabTerrain.classList.remove('active');
      goetterGroup.classList.remove('hidden');
      terrainGroup.classList.add('hidden');
      // Standard-Tool des Götter-Tabs auswählen
      this.selectTool('heal');
    });

    tabTerrain.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      // Tab umschalten
      tabTerrain.classList.add('active');
      tabGoetter.classList.remove('active');
      terrainGroup.classList.remove('hidden');
      goetterGroup.classList.add('hidden');
      // Standard-Tool des Terrain-Tabs auswählen
      this.selectTool('terrain-grass');
    });

    // ─── Steuerungs-Reihe (immer sichtbar) ──────────────────────────────────
    const controls = document.createElement('div');
    controls.className = 'dock-controls';

    // Pause-Button
    this.pauseBtn = document.createElement('button');
    this.pauseBtn.className = 'dock-btn dock-btn--pause';
    this.pauseBtn.id = 'btn-pause';
    this.pauseBtn.textContent = '⏸ Pause';
    this.pauseBtn.setAttribute('aria-label', 'Simulation pausieren');
    this.pauseBtn.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      const gs = this.scene.get('GameScene') as GameScene | null;
      if (!gs) return;
      gs.getClock().togglePause();
      this.syncPauseBtn(gs.getClock().paused);
    });

    // Speed-Gruppe: ×1 ×2 ×3 ×4
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

    controls.appendChild(this.pauseBtn);
    controls.appendChild(speedGroup);

    // ─── Dock zusammenbauen ──────────────────────────────────────────────────
    this.dockEl.appendChild(tabBar);
    this.dockEl.appendChild(goetterGroup);
    this.dockEl.appendChild(terrainGroup);
    this.dockEl.appendChild(controls);
    document.body.appendChild(this.dockEl);
  }

  // ─── Sync-Hilfsmethoden ──────────────────────────────────────────────────

  private syncPauseBtn(paused: boolean): void {
    this.pauseBtn.textContent = paused ? '▶ Weiter' : '⏸ Pause';
    this.pauseBtn.classList.toggle('paused', paused);
    this.pauseBtn.setAttribute('aria-pressed', String(paused));
  }

  private syncSpeedBtns(activeIndex: number): void {
    this.speedBtns.forEach((btn, i) => {
      btn.classList.toggle('active', i === activeIndex);
    });
  }

  // ─── Tool-Auswahl ────────────────────────────────────────────────────────

  private selectTool(key: string): void {
    this.activeToolKey = key;
    this.dockEl.querySelectorAll<HTMLButtonElement>('.tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset['toolKey'] === key);
    });
    const el = document.getElementById('hud-tool');
    if (el) el.textContent = key;
  }

  // ─── Ergebnis-Overlay ────────────────────────────────────────────────────

  /**
   * Zeigt das Sieg- oder Niederlage-Overlay.
   */
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

    // Overlay beim Klick auf den Button ausblenden
    actionBtn.addEventListener('click', () => {
      overlay.classList.add('hidden');
    }, { once: true });
  }

  // ─── Öffentliche API ─────────────────────────────────────────────────────

  /**
   * Aktualisiert die Tag-Anzeige im HUD.
   * Mit total: "Tag X / 30" (Szenario-Modus).
   * Ohne total: "Tag X" (Sandbox-Modus).
   */
  setDay(day: number, total?: number): void {
    const el = document.getElementById('hud-day');
    if (!el) return;
    el.textContent = total !== undefined ? `${day} / ${total}` : `${day}`;
  }

  setStatus(status: string): void {
    const el = document.getElementById('hud-status') as HTMLElement | null;
    if (!el) return;
    el.textContent = status;
    // Farbe je nach Diplomatie-Zustand
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
