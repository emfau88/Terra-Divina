/**
 * MainMenuScene — Phase 15
 *
 * Verwaltet das Hauptmenü und das Setup-Panel vollständig über DOM-Manipulation.
 * Kein Phaser-Rendering — nur DOM-Elemente werden gesteuert.
 *
 * Ablauf:
 *   BootScene → MainMenuScene (zeigt Menü) → GameScene (Welt generieren + spielen)
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
  /** Aktuelle Welteinstellungen, die der Spieler konfiguriert. */
  private cfg: WorldSetupConfig = defaultConfig();

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const menu = document.getElementById('main-menu');
    menu?.classList.remove('hidden');

    this.wireMainButtons();
    this.wireSetupPanel();
    this.wireScenarioPanel();
    this.wireOptionsPanel();
  }

  // ─── Haupt-Schaltflächen ──────────────────────────────────────────────────

  /** Verdrahtet die vier Hauptmenü-Buttons. */
  private wireMainButtons(): void {
    const setupPanel = document.getElementById('setup-panel');

    // Fortsetzen: nur aktivieren wenn ein Spielstand vorhanden ist
    const btnContinue = document.getElementById('btn-continue') as HTMLButtonElement | null;
    if (btnContinue) {
      if (SaveSystem.hasSave()) {
        // Disabled-Klasse entfernen und Button aktivieren
        btnContinue.classList.remove('menu-btn--disabled');
        btnContinue.disabled = false;
        // Untertext aktualisieren
        const subEl = btnContinue.querySelector('.menu-btn-sub');
        if (subEl) subEl.textContent = 'Spielstand fortsetzen';
        // Klick-Handler: Spielstand laden und GameScene starten
        btnContinue.addEventListener('click', () => {
          const save = SaveSystem.load();
          if (save) {
            const menu = document.getElementById('main-menu');
            menu?.classList.add('hidden');
            this.scene.start('GameScene', { _restore: save, ...save.config });
          }
        });
      }
    }

    // Neue Welt: Setup-Panel öffnen, Spielmodus auf Sandbox setzen
    document.getElementById('btn-new-world')?.addEventListener('click', () => {
      this.cfg = defaultConfig();
      this.cfg.gameMode = 'sandbox';
      this.openSetupPanel();
    });

    // Szenario: Szenario-Auswahl-Panel öffnen
    document.getElementById('btn-scenario')?.addEventListener('click', () => {
      document.getElementById('scenario-panel')?.classList.remove('hidden');
    });

    // Optionen: wird separat in wireOptionsPanel() verdrahtet
    void setupPanel; // Referenz vorhanden, aber nicht direkt benötigt
  }

  // ─── Setup-Panel ─────────────────────────────────────────────────────────

  /** Öffnet das Setup-Panel und aktualisiert alle Anzeigen. */
  private openSetupPanel(): void {
    const setupPanel = document.getElementById('setup-panel');
    setupPanel?.classList.remove('hidden');
    this.refreshSeedDisplay();
    this.syncButtonGroup('setup-size',  this.cfg.size);
    this.syncButtonGroup('setup-type',  this.cfg.worldType);
    this.syncButtonGroup('setup-mode',  this.cfg.startMode);
    this.syncFactionButtons();
  }

  /** Aktualisiert den aktiven Zustand der Fraktions-Toggle-Buttons. */
  private syncFactionButtons(): void {
    const factionRow = document.getElementById('setup-factions');
    if (!factionRow) return;
    factionRow.querySelectorAll<HTMLButtonElement>('.setup-btn--faction').forEach((btn) => {
      const faction = btn.dataset['faction'] as FactionKey | undefined;
      if (faction) {
        btn.classList.toggle('active', this.cfg.factions.includes(faction));
      }
    });
  }

  /** Verdrahtet alle interaktiven Elemente des Setup-Panels. */
  private wireSetupPanel(): void {
    // Größe-Auswahl
    this.wireButtonGroup('setup-size', (val) => {
      this.cfg.size = val as WorldSize;
    });

    // Welttyp-Auswahl
    this.wireButtonGroup('setup-type', (val) => {
      this.cfg.worldType = val as WorldType;
    });

    // Startmodus-Auswahl
    this.wireButtonGroup('setup-mode', (val) => {
      this.cfg.startMode = val as StartMode;
    });

    // Fraktions-Auswahl: Toggle-Buttons (mehrere gleichzeitig aktiv möglich)
    const factionRow = document.getElementById('setup-factions');
    if (factionRow) {
      factionRow.querySelectorAll<HTMLButtonElement>('.setup-btn--faction').forEach((btn) => {
        btn.addEventListener('click', () => {
          const faction = btn.dataset['faction'] as FactionKey | undefined;
          if (!faction) return;

          const isActive = btn.classList.contains('active');
          // Mindestens zwei Fraktionen müssen aktiv bleiben
          if (isActive && this.cfg.factions.length <= 2) return;

          if (isActive) {
            btn.classList.remove('active');
            this.cfg.factions = this.cfg.factions.filter(f => f !== faction);
          } else {
            btn.classList.add('active');
            if (!this.cfg.factions.includes(faction)) {
              this.cfg.factions = [...this.cfg.factions, faction];
            }
          }
        });
      });
    }

    // Seed neu würfeln
    document.getElementById('btn-reseed')?.addEventListener('click', () => {
      this.cfg.seed = Math.floor(Math.random() * 999999);
      this.refreshSeedDisplay();
    });

    // Spiel starten
    document.getElementById('btn-start-game')?.addEventListener('click', () => {
      this.launchGame();
    });
  }

  /**
   * Verdrahtet eine Schaltflächen-Gruppe: Klick setzt aktiven Zustand
   * und ruft den Callback mit dem data-value des geklickten Buttons auf.
   */
  private wireButtonGroup(rowId: string, onChange: (val: string) => void): void {
    const row = document.getElementById(rowId);
    if (!row) return;

    row.querySelectorAll<HTMLButtonElement>('.setup-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        // Aktiven Zustand innerhalb der Gruppe verschieben
        row.querySelectorAll<HTMLButtonElement>('.setup-btn').forEach(b => {
          b.classList.remove('active');
        });
        btn.classList.add('active');
        const val = btn.dataset['value'];
        if (val !== undefined) onChange(val);
      });
    });
  }

  /**
   * Setzt den aktiven Button in einer Gruppe anhand eines Wertes.
   * Wird verwendet, wenn cfg neu gesetzt wird und die UI synchronisiert werden muss.
   */
  private syncButtonGroup(rowId: string, activeValue: string): void {
    const row = document.getElementById(rowId);
    if (!row) return;

    row.querySelectorAll<HTMLButtonElement>('.setup-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset['value'] === activeValue);
    });
  }

  /** Aktualisiert die Seed-Anzeige im Panel. */
  private refreshSeedDisplay(): void {
    const el = document.getElementById('setup-seed-display');
    if (el) el.textContent = String(this.cfg.seed);
  }

  // ─── Szenario-Panel ──────────────────────────────────────────────────────

  /** Baut die Szenario-Liste und verdrahtet die Buttons. */
  private wireScenarioPanel(): void {
    const list = document.getElementById('scenario-list');
    if (list) {
      for (const id of SCENARIO_ORDER) {
        const s   = SCENARIOS[id];
        const btn = document.createElement('button');
        btn.className = 'menu-btn';
        btn.innerHTML = `
          <span class="menu-btn-icon">${s.icon}</span>
          <span class="menu-btn-label">${s.title}</span>
          <span class="menu-btn-sub">${s.description}</span>
        `;
        btn.addEventListener('click', () => {
          this.startScenario(id);
        });
        list.appendChild(btn);
      }
    }

    document.getElementById('btn-scenario-back')?.addEventListener('click', () => {
      document.getElementById('scenario-panel')?.classList.add('hidden');
    });
  }

  /** Startet ein Szenario direkt ohne weiteres Setup-Panel. */
  private startScenario(id: import('@game/simulation/ScenarioDefinition').ScenarioId): void {
    const s   = SCENARIOS[id];
    const base = defaultConfig();

    const cfg: WorldSetupConfig = {
      ...base,
      ...s.worldConfig,
      gameMode:   'scenario',
      scenarioId: id,
      seed:       base.seed,           // zufälliger Seed für jeden Lauf
      factions:   (s.worldConfig.factions as import('@game/factions/Faction').FactionKey[]) ?? base.factions,
    };

    const menu = document.getElementById('main-menu');
    menu?.classList.add('hidden');

    this.scene.start('GameScene', cfg);
  }

  // ─── Optionen-Panel ───────────────────────────────────────────────────────

  /** Verdrahtet den Optionen-Button und das Vollbild-Element im Menü. */
  private wireOptionsPanel(): void {
    const optPanel = document.getElementById('options-panel');

    document.getElementById('btn-options')?.addEventListener('click', () => {
      optPanel?.classList.toggle('hidden');
    });

    document.getElementById('btn-menu-fullscreen')?.addEventListener('click', () => {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
      } else {
        const webkitEl = el as unknown as { webkitRequestFullscreen?: () => void };
        webkitEl.webkitRequestFullscreen?.();
      }
    });
  }

  // ─── Spiel starten ────────────────────────────────────────────────────────

  /** Versteckt das Menü und übergibt die Konfiguration an GameScene. */
  private launchGame(): void {
    const menu = document.getElementById('main-menu');
    menu?.classList.add('hidden');

    // Spielmodus-Anzeige aus dem gameMode des Setup-Panels lesen
    const gameModeEl = document.querySelector<HTMLButtonElement>(
      '#setup-panel [data-game-mode].active',
    );
    // Falls ein separater gameMode-Toggle existiert, verwenden; sonst cfg.gameMode beibehalten
    if (gameModeEl?.dataset['gameMode']) {
      this.cfg.gameMode = gameModeEl.dataset['gameMode'] as GameMode;
    }

    // GameScene starten und Konfiguration übergeben
    this.scene.start('GameScene', this.cfg);
  }
}
