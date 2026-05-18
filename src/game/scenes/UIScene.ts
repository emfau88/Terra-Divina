import Phaser from 'phaser';
import { GameScene } from './GameScene';
import { SpeedIndex } from '@game/simulation/SimulationClock';
import { SimulationClock } from '@game/simulation/SimulationClock';
import { EventFeed } from '@game/ui/EventFeed';
import { GOAL_DAYS } from '@game/simulation/GoalSystem';

/**
 * UIScene — Phase 13A
 *
 * Änderungen in Phase 13A:
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
      // Standard-Tool 'heal' wird als aktiv markiert
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

  // ─── Intro-Overlay ───────────────────────────────────────────────────────

  /**
   * Verknüpft das Intro-Overlay mit der Uhr und dem EventFeed.
   * Uhr läuft erst nach Klick auf "Welt starten".
   */
  setupIntroOverlay(clock: SimulationClock, feed: EventFeed): void {
    // Uhr beim Start pausieren, bis der Spieler bestätigt
    if (!clock.paused) clock.togglePause();
    this.syncPauseBtn(clock.paused);

    const overlay = document.getElementById('intro-overlay');
    const startBtn = document.getElementById('btn-start-world');
    if (!overlay || !startBtn) return;

    startBtn.addEventListener('click', () => {
      // Overlay ausblenden
      overlay.classList.add('hidden');

      // Uhr starten, falls noch pausiert
      if (clock.paused) {
        clock.togglePause();
        this.syncPauseBtn(clock.paused);
      }

      // Willkommens-Nachrichten ins EventFeed einspeisen
      feed.push('Eine neue Welt erwacht.', '#77d7ff');
      feed.push(`Ziel: ${GOAL_DAYS} Tage überleben.`, '#ffca45');
    }, { once: true });
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
   * Aktualisiert die Tag-Anzeige im HUD ("Tag X / 30").
   */
  setDay(day: number, total: number = GOAL_DAYS): void {
    const el = document.getElementById('hud-day');
    if (el) el.textContent = `${day} / ${total}`;
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
