import Phaser from 'phaser';
import { GameScene } from './GameScene';
import { SpeedIndex } from '@game/simulation/SimulationClock';

/**
 * UIScene — Phase 11
 *
 * Änderungen in Phase 11:
 * - Speed-Buttons: 4 separate Tasten (×1 ×2 ×3 ×4) statt Cycle-Button
 * - Pause-Button zeigt aktiven Zustand deutlicher
 * - Touch-Feedback verbessert (active-Klassen, aria-labels)
 * - HUD-Status-Farbe reagiert auf Diplomatie-Zustand
 */
export class UIScene extends Phaser.Scene {
  private hudEl!:  HTMLElement;
  private dockEl!: HTMLElement;
  private activeToolKey = 'inspect';

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
    this.hudEl.innerHTML = `
      <div class="hud-row">
        <span class="hud-label">Tag</span>
        <span class="hud-value" id="hud-day">1</span>
        <span class="hud-label" style="margin-left:12px">Status</span>
        <span class="hud-value hud-status" id="hud-status">FRIEDEN</span>
        <span class="hud-label" style="margin-left:12px">Tool</span>
        <span class="hud-value" id="hud-tool">inspect</span>
      </div>
      <div class="hud-row" style="margin-top:4px">
        <span style="color:#5ec8ff;font-size:11px;font-weight:700;letter-spacing:.04em">HUM</span>
        <span class="hud-value" id="hud-humans" style="color:#5ec8ff;font-size:12px">—</span>
        <span style="color:#ff5d63;font-size:11px;font-weight:700;letter-spacing:.04em;margin-left:10px">ORC</span>
        <span class="hud-value" id="hud-orcs" style="color:#ff5d63;font-size:12px">—</span>
      </div>
    `;
    document.body.appendChild(this.hudEl);
  }

  // ─── Tool-Dock ───────────────────────────────────────────────────────────

  private buildToolDock(): void {
    this.dockEl = document.createElement('div');
    this.dockEl.id = 'tool-dock';

    const tools = [
      { key: 'inspect',   icon: 'ⓘ',  label: 'Info'    },
      { key: 'human',     icon: '＋',  label: 'Mensch'  },
      { key: 'orc',       icon: '＋',  label: 'Ork'     },
      { key: 'lightning', icon: 'ϟ',   label: 'Blitz'   },
      { key: 'fire',      icon: '🔥',  label: 'Feuer'   },
      { key: 'rain',      icon: '☔',  label: 'Regen'   },
      { key: 'meteor',    icon: '●',   label: 'Meteor'  },
      { key: 'heal',      icon: '✚',   label: 'Heilen'  },
    ];

    const row1 = document.createElement('div');
    row1.className = 'tool-row';
    const row2 = document.createElement('div');
    row2.className = 'tool-row';

    tools.forEach((t, i) => {
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
      (i < 4 ? row1 : row2).appendChild(btn);
    });

    // ─── Steuerungs-Reihe ────────────────────────────────────────────────────
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

    this.dockEl.appendChild(row1);
    this.dockEl.appendChild(row2);
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

  // ─── Öffentliche API ─────────────────────────────────────────────────────

  setDay(day: number): void {
    const el = document.getElementById('hud-day');
    if (el) el.textContent = String(day);
  }

  setStatus(status: string): void {
    const el = document.getElementById('hud-status') as HTMLElement | null;
    if (!el) return;
    el.textContent = status;
    // Farbe je nach Zustand
    const colorMap: Record<string, string> = {
      FRIEDEN:          'var(--accent)',
      ANSPANNUNG:       '#ffca45',
      KRIEG:            '#ff4b4b',
      WAFFENSTILLSTAND: '#aaffaa',
    };
    el.style.color = colorMap[status] ?? 'var(--accent)';
  }

  setHumanSummary(text: string): void {
    const el = document.getElementById('hud-humans');
    if (el) el.textContent = text;
  }

  setOrcSummary(text: string): void {
    const el = document.getElementById('hud-orcs');
    if (el) el.textContent = text;
  }

  getActiveTool(): string { return this.activeToolKey; }

  shutdown(): void {
    this.hudEl?.remove();
    this.dockEl?.remove();
  }
}
