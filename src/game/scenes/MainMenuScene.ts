/**
 * MainMenuScene — Phase 21-UX
 *
 * Hauptmenü als vollständiger Viewport-Screen.
 * Setup und Szenario öffnen eigenständige Overlay-Screens (#setup-screen, #scenario-screen).
 *
 * Ablauf:
 *   BootScene → MainMenuScene (zeigt Menü) → GameScene
 */

import Phaser from 'phaser';
import {
  WorldSetupConfig,
  WorldSize,
  WorldType,
  StartMode,
  GameMode,
  defaultConfig,
} from '@game/world/WorldSetupConfig';
import { FactionKey } from '@game/factions/Faction';
import { SaveSystem }        from '@game/simulation/SaveSystem';
import { SCENARIOS, SCENARIO_ORDER } from '@game/simulation/ScenarioDefinition';

export class MainMenuScene extends Phaser.Scene {
  private cfg: WorldSetupConfig = defaultConfig();

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    document.getElementById('main-menu')?.classList.remove('hidden');
    this.wireMainButtons();
    this.wireSetupScreen();
    this.wireScenarioScreen();
    this.wireOptionsPanel();
    this.wireMenuFullscreenHint();
  }

  // ─── Haupt-Schaltflächen ──────────────────────────────────────────────────

  private wireMainButtons(): void {
    const btnContinue = document.getElementById('btn-continue') as HTMLButtonElement | null;
    if (btnContinue && SaveSystem.hasSave()) {
      btnContinue.classList.remove('menu-btn--disabled');
      btnContinue.disabled = false;
      const subEl = btnContinue.querySelector('.menu-btn-sub');
      if (subEl) subEl.textContent = 'Spielstand fortsetzen';
      btnContinue.addEventListener('click', () => {
        const save = SaveSystem.load();
        if (save) {
          document.getElementById('main-menu')?.classList.add('hidden');
          this.scene.start('GameScene', { _restore: save, ...save.config });
        }
      });
    }

    document.getElementById('btn-new-world')?.addEventListener('click', () => {
      this.cfg = defaultConfig();
      this.cfg.gameMode = 'sandbox';
      this.openSetupScreen();
    });

    document.getElementById('btn-scenario')?.addEventListener('click', () => {
      this.openScenarioScreen();
    });
  }

  // ─── Setup-Screen ─────────────────────────────────────────────────────────

  private openSetupScreen(): void {
    document.getElementById('setup-screen')?.classList.remove('hidden');
    this.refreshSeedDisplay();
    this.syncButtonGroup('setup-size',  this.cfg.size);
    this.syncButtonGroup('setup-type',  this.cfg.worldType);
    this.syncButtonGroup('setup-mode',  this.cfg.startMode);
    this.syncFactionButtons();
  }

  private closeSetupScreen(): void {
    document.getElementById('setup-screen')?.classList.add('hidden');
  }

  private syncFactionButtons(): void {
    const factionRow = document.getElementById('setup-factions');
    if (!factionRow) return;
    factionRow.querySelectorAll<HTMLButtonElement>('.setup-btn--faction').forEach((btn) => {
      const faction = btn.dataset['faction'] as FactionKey | undefined;
      if (!faction) return;
      const isActive = this.cfg.factions.includes(faction);
      btn.classList.toggle('active', isActive);
      const fc = btn.dataset['fc'];
      if (fc) btn.style.setProperty('--faction-color', fc);
    });
  }

  private wireSetupScreen(): void {
    document.getElementById('btn-setup-back')?.addEventListener('click', () => {
      this.closeSetupScreen();
    });

    this.wireButtonGroup('setup-size', (val) => { this.cfg.size = val as WorldSize; });
    this.wireButtonGroup('setup-type', (val) => { this.cfg.worldType = val as WorldType; });
    this.wireButtonGroup('setup-mode', (val) => { this.cfg.startMode = val as StartMode; });

    const factionRow = document.getElementById('setup-factions');
    if (factionRow) {
      factionRow.querySelectorAll<HTMLButtonElement>('.setup-btn--faction').forEach((btn) => {
        const fc = btn.dataset['fc'];
        if (fc) btn.style.setProperty('--faction-color', fc);
        btn.addEventListener('click', () => {
          const faction = btn.dataset['faction'] as FactionKey | undefined;
          if (!faction) return;
          const isActive = btn.classList.contains('active');
          if (isActive && this.cfg.factions.length <= 2) return;
          if (isActive) {
            btn.classList.remove('active');
            this.cfg.factions = this.cfg.factions.filter(f => f !== faction);
          } else {
            btn.classList.add('active');
            if (!this.cfg.factions.includes(faction)) this.cfg.factions = [...this.cfg.factions, faction];
          }
        });
      });
    }

    document.getElementById('btn-reseed')?.addEventListener('click', () => {
      this.cfg.seed = Math.floor(Math.random() * 999999);
      this.refreshSeedDisplay();
    });

    document.getElementById('btn-start-game')?.addEventListener('click', () => {
      this.launchGame();
    });
  }

  private wireButtonGroup(rowId: string, onChange: (val: string) => void): void {
    const row = document.getElementById(rowId);
    if (!row) return;
    row.querySelectorAll<HTMLButtonElement>('.setup-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        row.querySelectorAll<HTMLButtonElement>('.setup-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const val = btn.dataset['value'];
        if (val !== undefined) onChange(val);
      });
    });
  }

  private syncButtonGroup(rowId: string, activeValue: string): void {
    const row = document.getElementById(rowId);
    if (!row) return;
    row.querySelectorAll<HTMLButtonElement>('.setup-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset['value'] === activeValue);
    });
  }

  private refreshSeedDisplay(): void {
    const el = document.getElementById('setup-seed-display');
    if (el) el.textContent = String(this.cfg.seed);
  }

  // ─── Szenario-Screen ──────────────────────────────────────────────────────

  private openScenarioScreen(): void {
    document.getElementById('scenario-screen')?.classList.remove('hidden');
  }

  private closeScenarioScreen(): void {
    document.getElementById('scenario-screen')?.classList.add('hidden');
  }

  private wireScenarioScreen(): void {
    const list = document.getElementById('scenario-list');
    if (list) {
      for (const id of SCENARIO_ORDER) {
        const s   = SCENARIOS[id];
        const btn = document.createElement('button');
        btn.className = 'menu-btn';
        btn.innerHTML = `
          <span class="menu-btn-icon">${s.icon}</span>
          <div class="menu-btn-text">
            <span class="menu-btn-label">${s.title}</span>
            <span class="menu-btn-sub">${s.description}</span>
          </div>
        `;
        btn.addEventListener('click', () => { this.startScenario(id); });
        list.appendChild(btn);
      }
    }

    document.getElementById('btn-scenario-back')?.addEventListener('click', () => {
      this.closeScenarioScreen();
    });
  }

  private startScenario(id: import('@game/simulation/ScenarioDefinition').ScenarioId): void {
    const s   = SCENARIOS[id];
    const base = defaultConfig();
    const cfg: WorldSetupConfig = {
      ...base,
      ...s.worldConfig,
      gameMode:   'scenario',
      scenarioId: id,
      seed:       base.seed,
      factions:   (s.worldConfig.factions as import('@game/factions/Faction').FactionKey[]) ?? base.factions,
    };
    document.getElementById('main-menu')?.classList.add('hidden');
    this.scene.start('GameScene', cfg);
  }

  // ─── Optionen-Panel ───────────────────────────────────────────────────────

  private wireOptionsPanel(): void {
    const optPanel = document.getElementById('options-panel');
    document.getElementById('btn-options')?.addEventListener('click', () => {
      optPanel?.classList.toggle('hidden');
    });

    document.getElementById('btn-menu-fullscreen')?.addEventListener('click', () => {
      this.requestFullscreen();
    });
  }

  // ─── Vollbild-Fußzeilen-Hinweis ───────────────────────────────────────────

  private wireMenuFullscreenHint(): void {
    document.getElementById('btn-menu-fs-hint')?.addEventListener('click', () => {
      this.requestFullscreen();
    });
  }

  private requestFullscreen(): void {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    } else {
      const webkitEl = el as unknown as { webkitRequestFullscreen?: () => void };
      webkitEl.webkitRequestFullscreen?.();
    }
  }

  // ─── Spiel starten ────────────────────────────────────────────────────────

  private launchGame(): void {
    document.getElementById('main-menu')?.classList.add('hidden');
    document.getElementById('setup-screen')?.classList.add('hidden');

    const gameModeEl = document.querySelector<HTMLButtonElement>(
      '#setup-screen [data-game-mode].active',
    );
    if (gameModeEl?.dataset['gameMode']) {
      this.cfg.gameMode = gameModeEl.dataset['gameMode'] as GameMode;
    }

    this.scene.start('GameScene', this.cfg);
  }
}
