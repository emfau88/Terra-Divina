import Phaser from 'phaser';
import { CANVAS_W, WORLD_Y, WORLD_H, TILE, COLS, ROWS, ZOOM_DEFAULT } from '@game/config';
// Geschwindigkeit der visuellen Interpolation in Pixel pro Millisekunde (Phase 13C)
const VISUAL_SPEED_PX_PER_MS = 150 / 1000;
import { WorldGrid }          from '@game/world/WorldGrid';
import { WorldGenerator }     from '@game/world/WorldGenerator';
import { WorldSetupConfig, defaultConfig } from '@game/world/WorldSetupConfig';
import { WorldRenderer }      from '@game/rendering/WorldRenderer';
import { BuildingRenderer }   from '@game/rendering/BuildingRenderer';
import { UnitRenderer }       from '@game/rendering/UnitRenderer';
import { CameraController }   from '@game/rendering/CameraController';
import { VillageManager }     from '@game/factions/VillageManager';
import { Village }            from '@game/factions/Village';
import { Building }           from '@game/factions/Building';
import { UnitManager }        from '@game/units/UnitManager';
import { Unit }               from '@game/units/Unit';
import { SimulationClock, SpeedIndex } from '@game/simulation/SimulationClock';
import { ResourceSystem }     from '@game/simulation/ResourceSystem';
import { HungerSystem }       from '@game/simulation/HungerSystem';
import { DiplomacySystem, DiplomaticState } from '@game/simulation/DiplomacySystem';
import { FireSystem }         from '@game/simulation/FireSystem';
import { EffectSystem }       from '@game/effects/EffectSystem';
import { ToolController }     from '@game/tools/ToolController';
import { InspectPanel }       from '@game/ui/InspectPanel';
import { EventFeed }          from '@game/ui/EventFeed';
import { FACTIONS, FACTION_KEYS } from '@game/factions/Faction';
import { FactionKey }             from '@game/factions/Faction';
import { GoalSystem, GoalState } from '@game/simulation/GoalSystem';
import { UIScene }            from './UIScene';
import { SaveGame }           from '@game/simulation/SaveGame';
import { SaveSystem, SAVE_VERSION } from '@game/simulation/SaveSystem';
import { BuildingType }       from '@game/data/buildingDefs';
import { UnitRole }           from '@game/units/UnitRoles';
import { UnitState }          from '@game/units/Unit';
import { ContactEvent }       from '@game/units/UnitAI';
import { BALANCE }            from '@game/data/balance';
import { TileType }           from '@game/world/TileTypes';
import { CreatureManager }    from '@game/creatures/CreatureManager';
import { CreatureRenderer }   from '@game/rendering/CreatureRenderer';
import { SCENARIOS }          from '@game/simulation/ScenarioDefinition';

/**
 * GameScene — Phase 13A
 *
 * Neu gegenüber Phase VFX:
 * - GoalSystem: 30-Tage-Überlebensziel
 * - Tages-Akkumulator: alle 8000 ms (skaliert) = 1 Tag
 * - Intro-Overlay wird nach Scene-Start verdrahtet
 * - UIScene.showResult() bei Sieg/Niederlage aufgerufen
 */
export class GameScene extends Phaser.Scene {
  /** Gespeicherte Weltkonfiguration — wird für Autosave benötigt. */
  private worldConfig: WorldSetupConfig = defaultConfig();

  private grid!:             WorldGrid;
  private villageManager!:   VillageManager;
  private unitManager!:      UnitManager;
  private clock!:            SimulationClock;
  private resourceSystem!:   ResourceSystem;
  private hungerSystem!:     HungerSystem;
  private diplomacy!:        DiplomacySystem;
  private fireSystem!:       FireSystem;
  private effectSystem!:     EffectSystem;
  private toolController!:   ToolController;
  private inspectPanel!:     InspectPanel;
  private eventFeed!:        EventFeed;
  private goalSystem!:       GoalSystem;

  private worldRenderer!:    WorldRenderer;
  private buildingRenderer!: BuildingRenderer;
  private unitRenderer!:     UnitRenderer;
  private creatureRenderer!: CreatureRenderer;
  private cameraController!: CameraController;
  private creatureManager!:  CreatureManager;

  private readonly worldPixelW = COLS * TILE;
  private readonly worldPixelH = ROWS * TILE;

  private aiAccum      = 0;
  private villageAccum = 0;
  /** Für Feuer-Flackern: Neu-Zeichnung nur wenn Feuer aktiv */
  private fireRedrawAccum = 0;
  /** Akkumulator für den Tages-Zähler des GoalSystem (skalierte ms). */
  private dayAccum     = 0;
  private readonly AI_INTERVAL_MS       = 250;
  private readonly VILLAGE_INTERVAL_MS  = 650;
  private readonly FIRE_REDRAW_MS       = 80;   // ~12 fps Flacker-Rate
  /** 8000 skalierte ms = 1 Tag im Ziel-System. */
  private readonly DAY_INTERVAL_MS      = 8000;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(data?: WorldSetupConfig): void {
    // Restore-Payload aus Phaser-Scene-Data extrahieren (_restore ist nur beim Laden gesetzt)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const restoreSave = (data as any)?._restore as SaveGame | undefined;

    // Konfiguration aus Phaser-Data-Mechanismus oder Standardwert verwenden
    const cfg: WorldSetupConfig = restoreSave?.config ?? data ?? defaultConfig();

    // Weltkonfiguration merken für spätere Autosaves
    this.worldConfig = cfg;

    // 1. Welt
    this.grid = WorldGenerator.generate(cfg);

    // 2. Dörfer + Gebäude
    this.villageManager = new VillageManager(this.grid);
    this.villageManager.placeStartVillages(cfg.factions, cfg.gameMode);

    // 3. Einheiten
    this.unitManager = new UnitManager(this.grid, this.villageManager);
    this.unitManager.spawnInitial(cfg.factions);

    // 4. Simulations-Systeme
    this.clock          = new SimulationClock();
    this.resourceSystem = new ResourceSystem(this.villageManager, this.unitManager, this.grid);
    this.hungerSystem   = new HungerSystem(this.villageManager, this.unitManager);
    this.diplomacy      = new DiplomacySystem(this.villageManager, this.unitManager);
    this.fireSystem     = new FireSystem(this.grid, this.unitManager);
    this.creatureManager = new CreatureManager(this.grid, this.villageManager, this.fireSystem);

    // Startspannung je nach gewähltem Startmodus setzen
    switch (cfg.startMode) {
      case 'peaceful': this.diplomacy.tension =  0;  break;
      case 'balanced': this.diplomacy.tension = 10;  break;
      case 'warTorn':  this.diplomacy.tension = 50;  break;
      case 'chaos':    this.diplomacy.tension = 75;  break;
    }

    // Szenario-Modus: beschleunigte Spannungsdynamik aktivieren
    if (cfg.gameMode === 'scenario') {
      this.diplomacy.scenarioMode = true;
    }

    // 5. UI-Systeme
    this.eventFeed    = new EventFeed();
    this.inspectPanel = new InspectPanel(this.villageManager, this.unitManager, this.grid);

    // 5b. Ziel-System
    this.goalSystem = new GoalSystem();
    this.goalSystem.mode       = cfg.gameMode;
    this.goalSystem.fireSystem = this.fireSystem;
    this.goalSystem.diplomacy  = this.diplomacy;
    // Szenario-Ziel aus Definition laden
    if (cfg.gameMode === 'scenario' && cfg.scenarioId) {
      this.goalSystem.scenarioGoal = SCENARIOS[cfg.scenarioId].goal;
    }
    this.goalSystem.onGoalChange = (state) => {
      const ui = this.scene.get('UIScene') as UIScene | null;
      ui?.showResult(state === 'won');
    };

    // 5c. HungerSystem — EventFeed-Callback und Tages-Synchronisation
    this.hungerSystem.onFeedEvent = (evt) => {
      const fc = FACTIONS[evt.faction];
      switch (evt.kind) {
        case 'empty':
          this.eventFeed.push(`${fc.name} Dorf hat keinen Vorrat mehr`, '#ff9944');
          break;
        case 'starving':
          this.eventFeed.push(`${fc.name} Einheiten verhungern`, '#ff9944');
          break;
        case 'recovered':
          this.eventFeed.push(`${fc.name} Vorrat erholt`, '#64d987');
          break;
      }
    };

    // 6. Callbacks
    this.resourceSystem.onSpawn = (faction) => {
      this.unitRenderer.drawAll(this.unitManager.liveUnits);
      const fc  = FACTIONS[faction];
      const css = '#' + fc.color.toString(16).padStart(6, '0');
      this.eventFeed.push(`${fc.short} spawnt Einheit`, css);
    };
    this.resourceSystem.onBuild = (faction) => {
      this.worldRenderer.drawAll();
      this.buildingRenderer.drawAll(this.villageManager.liveBuildings);
      const fc  = FACTIONS[faction];
      const css = '#' + fc.color.toString(16).padStart(6, '0');
      this.eventFeed.push(`${fc.short} baut Gebäude (L${this.villageManager.villages[faction]?.level ?? 1})`, css);
    };
    this.villageManager.onBuildingDestroyed = () => {
      this.diplomacy.addTension(12);
      this.worldRenderer.drawAll();
      this.buildingRenderer.drawAll(this.villageManager.liveBuildings);
      this.eventFeed.push('Ein Gebäude wurde zerstört!', '#ff9944');
    };
    this.diplomacy.onStateChange = (state: DiplomaticState) => {
      const ui = this.scene.get('UIScene') as UIScene | null;
      ui?.setStatus(this.diplomacy.statusText);
      // Zustandsspezifische Nachrichten für den EventFeed (Phase 13E)
      const msgMap: Record<DiplomaticState, string> = {
        tension: '⚔ Spannung steigt an der Grenze',
        war:     '🔴 KRIEG — Feinde greifen an!',
        truce:   '🤝 Waffenstillstand vereinbart',
        peace:   '☮ Frieden kehrt zurück',
      };
      const colorMap: Record<DiplomaticState, string> = {
        tension: '#ffca45',
        war:     '#ff4b4b',
        truce:   '#aaffaa',
        peace:   '#77d7ff',
      };
      this.eventFeed.push(msgMap[state], colorMap[state]);
    };

    // 7. Kamera
    this.setupCamera();

    // 8. Renderer — Reihenfolge: map → fireG → shadow → build → unit → effects
    // fireG liegt direkt über mapG damit Feuer-Flackern das Terrain überlagert
    const mapG     = this.add.graphics();
    const fireG    = this.add.graphics();   // Feuer-Flacker-Ebene (nur brennende Kacheln)
    const shadowG  = this.add.graphics();
    const buildG   = this.add.graphics();
    const unitG    = this.add.graphics();
    const effectsG = this.add.graphics();   // ganz oben

    this.worldRenderer = new WorldRenderer(mapG, this.grid, fireG);
    this.worldRenderer.drawAll();

    this.buildingRenderer = new BuildingRenderer(buildG, shadowG);
    this.buildingRenderer.setVillages(this.villageManager.villages);
    this.buildingRenderer.drawAll(this.villageManager.liveBuildings);

    this.unitRenderer = new UnitRenderer(unitG);
    this.unitRenderer.drawAll(this.unitManager.liveUnits);

    const creatureG    = this.add.graphics();
    this.creatureRenderer = new CreatureRenderer(creatureG);
    this.creatureRenderer.drawAll(this.creatureManager.liveCreatures);

    this.effectSystem = new EffectSystem(effectsG);

    // Treffer-Funken: CombatSystem → EffectSystem verdrahten (Phase 13E)
    this.unitManager.getAI().combat.onHit = (px: number, py: number) => {
      this.effectSystem.spawnHitSpark(px, py);
    };

    // Kampftod-Meldungen: CombatSystem → EventFeed (AI-Fix)
    // Globaler Cooldown verhindert Spam in großen Schlachten.
    let lastDeathEventMs = 0;
    this.unitManager.getAI().combat.onKill = (attacker, defender) => {
      // Nur bei aktiver Spannung oder Krieg relevant
      if (!this.diplomacy.isWar && !this.diplomacy.isTension) return;
      // Nur Fraktion-vs-Fraktion-Kills (nicht Hunger/Feuer)
      if (attacker.faction === defender.faction) return;
      // Globaler Cooldown — max 1 Todesmeldung alle DEATH_EVENT_COOLDOWN_MS
      const now = performance.now();
      if (now - lastDeathEventMs < BALANCE.DEATH_EVENT_COOLDOWN_MS) return;
      lastDeathEventMs = now;

      const aFac  = FACTIONS[attacker.faction];
      const color = '#' + aFac.color.toString(16).padStart(6, '0');
      const roleLabel: Record<string, string> = {
        gatherer: 'Sammler',
        builder:  'Baumeister',
        guard:    'Wache',
        raider:   'Krieger',
      };
      const defRole = roleLabel[defender.role] ?? defender.role;
      this.eventFeed.push(`${aFac.short} tötet ${defRole}`, color);
    };

    // Sichtkontakt-Events: UnitAI → EventFeed + DiplomacySystem (Contact-Fix)
    this.unitManager.getAI().onContactEvent = (evt: ContactEvent) => {
      const spotter = FACTIONS[evt.spotter];
      const spotted = FACTIONS[evt.spotted];
      if (evt.kind === 'border') {
        // Grenzvorfall — Einheiten sehr nah
        this.eventFeed.push(
          `⚠ ${spotter.short}-Einheit an ${spotted.short}-Grenze`,
          '#ffca45',
        );
        this.diplomacy.addTension(BALANCE.CONTACT_TENSION_BORDER);
      } else {
        // Erstsichtung / Annäherung
        this.eventFeed.push(
          `👁 ${spotter.name} entdeckt ${spotted.name}`,
          '#ffaa22',
        );
        this.diplomacy.addTension(BALANCE.CONTACT_TENSION_SIGHTING);
      }
    };

    // Kreatur-Callbacks: Treffer-Funken + EventFeed bei Tod
    this.creatureManager.onHit = (px: number, py: number) => {
      this.effectSystem.spawnHitSpark(px, py);
    };
    this.creatureManager.onDeath = (type) => {
      const label = type === 'wolf' ? '🐺 Wolf besiegt' : '👿 Dämon vernichtet!';
      const color = type === 'wolf' ? '#aaaaaa' : '#ff6600';
      this.eventFeed.push(label, color);
    };

    // 9. Tool-Controller
    this.toolController = new ToolController(
      this.grid,
      this.villageManager,
      this.unitManager,
      this.fireSystem,
      this.effectSystem,
      this.worldRenderer,
      this.buildingRenderer,
      this.unitRenderer,
      this.eventFeed,
      this.creatureManager,
      this.creatureRenderer,
    );
    // Kamera-Oberkante für Blitz-/Meteor-Startpunkt
    this.toolController.getCamTop = () => {
      const cam = this.cameras.main;
      return cam.scrollY;
    };

    // 10. Eingabe
    this.input.addPointer(2);
    this.cameraController = new CameraController(this, this.cameras.main);
    this.setupTapHandling();

    // 11. In-Game-HUD starten (UIScene verwaltet nur die In-Game-UI)
    this.scene.launch('UIScene');

    // EventFeed: Startnachricht je nach Spielmodus ausgeben sobald UIScene bereit ist
    this.scene.get('UIScene').events.once(Phaser.Scenes.Events.CREATE, () => {
      if (restoreSave) {
        this.eventFeed.push('Spielstand geladen.', '#aaffaa');
      } else {
        this.eventFeed.push('Eine neue Welt erwacht.', '#77d7ff');
      }
      if (cfg.gameMode === 'scenario' && cfg.scenarioId) {
        const scn = SCENARIOS[cfg.scenarioId];
        this.eventFeed.push(`${scn.icon} Szenario: ${scn.title}`, '#ffdd88');
      } else if (cfg.gameMode === 'scenario') {
        this.eventFeed.push('Ziel: 30 Tage überleben.', '#aaffaa');
      } else {
        this.eventFeed.push('Sandbox-Modus — keine Zeitbegrenzung.', '#9fb3c8');
      }
    });

    // Szenario-Start-Events: besondere Startzustände je nach Szenario
    if (!restoreSave && cfg.gameMode === 'scenario' && cfg.scenarioId === 'stopWildfire') {
      // Wildfeuer-Szenario: mehrere Feuer im Wald entzünden
      const cols = this.grid.cols;
      const rows = this.grid.rows;
      for (let attempt = 0; attempt < 20; attempt++) {
        const fx = Math.floor(cols * 0.2 + Math.random() * cols * 0.6);
        const fy = Math.floor(rows * 0.2 + Math.random() * rows * 0.6);
        this.fireSystem.ignite(fx, fy);
      }
      this.worldRenderer.drawAll();
    }

    // Spielstand wiederherstellen wenn ein Restore-Payload vorhanden ist
    if (restoreSave) {
      this.restoreFromSave(restoreSave);
    }
  }

  private setupCamera(): void {
    const cam    = this.cameras.main;
    const center = this.villageManager.centerPoint();
    cam.setViewport(0, WORLD_Y, CANVAS_W, WORLD_H);
    cam.setZoom(ZOOM_DEFAULT);
    cam.setBounds(0, 0, this.worldPixelW, this.worldPixelH);
    cam.centerOn(center.x * TILE, center.y * TILE);
  }

  private setupTapHandling(): void {
    this.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
      if (this.cameraController.hasMoved) return;

      const ui = this.scene.get('UIScene') as UIScene | null;
      if (!ui) return;
      const tool = ui.getActiveTool();

      // Use Phaser's pointer.worldX/worldY which correctly applies zoom,
      // camera scroll, and viewport offset. Manual reconstruction with
      // pointer.x + cam.scrollX was wrong at zoom != 1.0.
      const tx = Math.floor(pointer.worldX / TILE);
      const ty = Math.floor(pointer.worldY / TILE);

      if (!this.grid.inBounds(tx, ty)) return;

      if (tool === 'inspect') {
        this.inspectPanel.inspectTile(tx, ty);
        return;
      }

      const result = this.toolController.use(tool, tx, ty);
      if (result === 'cap-reached') {
        this.eventFeed.push('Bevölkerungsobergrenze erreicht!', '#ff9944');
      } else if (result === 'no-target') {
        this.eventFeed.push('Kein gültiges Ziel', '#888');
      }
      this.pushHudUpdate();
    });
  }

  // ─── Update ──────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    // Zeit wird direkt in drawFireLayer(time) übergeben — kein separates Setzen nötig

    if (this.clock.paused) {
      // Auch im Pause Effekte und Feuer animieren
      this.effectSystem.update(delta);
      this.effectSystem.drawAll(
        this.cameras.main.scrollX,
        this.cameras.main.scrollY,
        this.cameras.main.scrollY,
      );
      if (this.fireSystem.hasFire) {
        this.fireRedrawAccum += delta;
        if (this.fireRedrawAccum >= this.FIRE_REDRAW_MS) {
          this.fireRedrawAccum = 0;
          // Nur fireG neu zeichnen — mapG bleibt unberührt
          this.worldRenderer.drawFireLayer(time);
        }
      }
      return;
    }

    const scaledDelta = delta * this.clock.speed;
    this.aiAccum      += scaledDelta;
    this.villageAccum += scaledDelta;

    // Tages-Akkumulator: alle DAY_INTERVAL_MS skalierte ms = 1 Tag
    this.dayAccum += scaledDelta;
    if (this.dayAccum >= this.DAY_INTERVAL_MS) {
      this.dayAccum = 0;
      this.goalSystem.addDay(this.villageManager, this.unitManager);
      // Tages-Zähler an HungerSystem weitergeben (Gnadenfrist-Tracking)
      this.hungerSystem.currentDay = this.goalSystem.day;
      this.pushHudUpdate();
    }

    // EffectSystem läuft immer mit echtem delta (nicht skaliert)
    this.effectSystem.update(delta);
    this.effectSystem.drawAll(
      this.cameras.main.scrollX,
      this.cameras.main.scrollY,
      this.cameras.main.scrollY,
    );

    // Feuer-Ausbreitung (eigener Akkumulator im FireSystem)
    const fireTicked = this.fireSystem.tick(scaledDelta);
    if (fireTicked) {
      // Spread-Tick: mapG neu zeichnen (Kachel-Typwechsel), fireG folgt beim nächsten Flacker-Tick
      this.worldRenderer.drawAll();
      this.buildingRenderer.drawAll(this.villageManager.liveBuildings);
      this.unitRenderer.drawAll(this.unitManager.liveUnits);
    } else if (this.fireSystem.hasFire) {
      // Flacker-Tick: nur fireG neu zeichnen — mapG bleibt unberührt
      this.fireRedrawAccum += delta;
      if (this.fireRedrawAccum >= this.FIRE_REDRAW_MS) {
        this.fireRedrawAccum = 0;
        this.worldRenderer.drawFireLayer(time);
      }
    }

    // ─── Visuelle Einheiten-Interpolation (Phase 13C) ──────────────────────
    // Jeden Frame: visuelle Position sanft zum logischen Kachel-Mittelpunkt bewegen.
    // Kein Eingriff in UnitAI — die KI kann beliebig viele Ticks vorausschreiten.
    {
      const maxStep = VISUAL_SPEED_PX_PER_MS * delta;
      let anyMoving = false;
      for (const u of this.unitManager.liveUnits) {
        // Treffer-Flash-Timer herunterzählen (Phase 13D)
        if (u.hitFlash > 0) {
          u.hitFlash = Math.max(0, u.hitFlash - delta);
          anyMoving = true;   // Neuzeichnung erzwingen solange Flash aktiv
        }

        // Logischer Zielpixel dieser Einheit
        const targetX = u.x * TILE + TILE / 2;
        const targetY = u.y * TILE + TILE / 2;
        const dx = targetX - u.visualX;
        const dy = targetY - u.visualY;
        const distPx = Math.hypot(dx, dy);
        if (distPx > 0.5) {
          anyMoving = true;
          // Einheit noch nicht am Ziel — interpolieren
          if (distPx <= maxStep) {
            // Ziel in diesem Frame erreichbar — einrasten
            u.visualX = targetX;
            u.visualY = targetY;
          } else {
            // Einen Schritt in Richtung Ziel bewegen
            const ratio = maxStep / distPx;
            u.visualX += dx * ratio;
            u.visualY += dy * ratio;
          }
        }
      }
      // Einheiten-Grafik neu zeichnen wenn sich mindestens eine Einheit bewegt
      if (anyMoving) {
        this.unitRenderer.drawAll(this.unitManager.liveUnits);
      }
    }

    // ─── Kreatur-Interpolation ─────────────────────────────────────────────
    {
      const maxStep = VISUAL_SPEED_PX_PER_MS * delta;
      let anyMoving = false;
      for (const c of this.creatureManager.liveCreatures) {
        const targetX = c.x * TILE + TILE / 2;
        const targetY = c.y * TILE + TILE / 2;
        const dx = targetX - c.visualX;
        const dy = targetY - c.visualY;
        const distPx = Math.hypot(dx, dy);
        if (distPx > 0.5) {
          anyMoving = true;
          if (distPx <= maxStep) {
            c.visualX = targetX;
            c.visualY = targetY;
          } else {
            const ratio = maxStep / distPx;
            c.visualX += dx * ratio;
            c.visualY += dy * ratio;
          }
        }
      }
      if (anyMoving) {
        this.creatureRenderer.drawAll(this.creatureManager.liveCreatures);
      }
    }

    // ─── Gebäude-Treffer-Flash-Timer herunterzählen (Phase 13E) ───────────────
    {
      let needBuildingRedraw = false;
      for (const b of this.villageManager.buildings) {
        if (b.hitFlash > 0) {
          b.hitFlash = Math.max(0, b.hitFlash - delta);
          needBuildingRedraw = true;
        }
      }
      if (needBuildingRedraw) {
        this.buildingRenderer.drawAll(this.villageManager.liveBuildings);
      }
    }

    // AI + Hunger
    if (this.aiAccum >= this.AI_INTERVAL_MS) {
      this.aiAccum = 0;
      this.clock.tick();
      this.unitManager.tick(1);
      this.hungerSystem.tick(1);
      this.creatureManager.tick(this.unitManager.liveUnits);
      // Positionen haben sich geändert — neu zeichnen
      this.unitRenderer.drawAll(this.unitManager.liveUnits);
      this.creatureRenderer.drawAll(this.creatureManager.liveCreatures);
      this.inspectPanel.refresh();
      this.eventFeed.update();
      this.pushHudUpdate();
    }

    // Ressourcen + Dorf + Diplomatie
    if (this.villageAccum >= this.VILLAGE_INTERVAL_MS) {
      this.villageAccum = 0;
      this.resourceSystem.tick(1);
      this.diplomacy.tick();
      this.unitManager.setWarState(this.diplomacy.isWar, this.diplomacy.isTension);
      this.pushHudUpdate();
      // Autosave bei jedem Dorf-Tick (~650 ms Spielzeit)
      this.saveGame();
    }
  }

  private pushHudUpdate(): void {
    const ui = this.scene.get('UIScene') as UIScene | null;
    if (!ui) return;

    // GoalSystem-Tag für HUD verwenden — im Szenario-Modus mit Zielanzeige
    if (this.goalSystem.mode === 'scenario') {
      ui.setDay(this.goalSystem.day, 30);
    } else {
      ui.setDay(this.goalSystem.day);
    }
    ui.setStatus(this.diplomacy.statusText);

    // Alle Fraktionen dynamisch — zeigt '—' wenn Fraktion nicht aktiv
    for (const faction of FACTION_KEYS) {
      const v = this.villageManager.villages[faction];
      ui.setFactionSummary(
        faction,
        v
          ? `${this.unitManager.liveCount(faction)} F${Math.floor(v.food)} W${Math.floor(v.wood)} L${v.level}`
          : '—',
      );
    }
  }

  // ─── Speichern / Laden ───────────────────────────────────────────────────

  /** Baut SaveGame aus aktuellem Spielzustand und schreibt in localStorage. */
  saveGame(): void {
    const data: SaveGame = {
      version:  SAVE_VERSION,
      savedAt:  Date.now(),
      config:   this.worldConfig,
      world: {
        cols:  this.grid.cols,
        rows:  this.grid.rows,
        tiles: Array.from(this.grid.tiles),
        meta:  this.grid.meta.map(m => ({
          variant: m.variant,
          burn:    m.burn,
          wet:     m.wet,
          decor:   m.decor,
        })),
      },
      villages: Object.values(this.villageManager.villages)
        .filter((v): v is Village => v !== undefined)
        .map(v => ({
          faction:   v.faction,
          x:         v.x,
          y:         v.y,
          food:      v.food,
          wood:      v.wood,
          level:     v.level,
          expansion: v.expansion,
          hunger:    v.hunger,
          territory: v.territory,
        })),
      buildings: this.villageManager.buildings.map(b => ({
        id:      b.id,
        faction: b.faction,
        type:    b.type,
        x:       b.x,
        y:       b.y,
        hp:      b.hp,
        dead:    b.dead,
      })),
      units: this.unitManager.units.map(u => ({
        id:        u.id,
        faction:   u.faction,
        role:      u.role,
        x:         u.x,
        y:         u.y,
        hp:        u.hp,
        maxHp:     u.maxHp,
        state:     u.state,
        carryFood: u.carryFood,
        carryWood: u.carryWood,
        cd:        u.cd,
        dead:      u.dead,
      })),
      diplomacy: {
        state:      this.diplomacy.state,
        tension:    this.diplomacy.tension,
        truceTicks: this.diplomacy.truceTicks,
      },
      goal: {
        day:       this.goalSystem.day,
        mode:      this.goalSystem.mode,
        goalState: this.goalSystem.state,
      },
      clock: {
        speedIndex: this.clock.speedIndex0,
        paused:     this.clock.paused,
      },
    };
    SaveSystem.save(data);
  }

  /**
   * Stellt den Spielzustand aus einem SaveGame-Objekt wieder her.
   * Wird nach dem normalen create()-Durchlauf aufgerufen.
   */
  restoreFromSave(save: SaveGame): void {
    // ── Weltgitter: Kacheln und Metadaten überschreiben ──────────────────────
    for (let i = 0; i < save.world.tiles.length; i++) {
      this.grid.tiles[i] = save.world.tiles[i] as TileType;
    }
    for (let i = 0; i < save.world.meta.length; i++) {
      const m = save.world.meta[i];
      if (m) {
        this.grid.meta[i].variant = m.variant;
        this.grid.meta[i].burn    = m.burn;
        this.grid.meta[i].wet     = m.wet;
        this.grid.meta[i].decor   = m.decor;
      }
    }

    // ── Dorf-Felder wiederherstellen ─────────────────────────────────────────
    for (const sv of save.villages) {
      const v = this.villageManager.villages[sv.faction as FactionKey];
      if (!v) continue;
      v.food      = sv.food;
      v.wood      = sv.wood;
      v.level     = sv.level;
      v.expansion = sv.expansion;
      v.hunger    = sv.hunger;
      v.territory = sv.territory;
    }

    // ── Gebäude wiederherstellen ─────────────────────────────────────────────
    // Vorhandene Arrays leeren
    this.villageManager.buildings.length = 0;
    for (const v of this.villageManager.allVillages) {
      v.buildings.length = 0;
    }

    for (const sb of save.buildings) {
      const b = new Building(
        sb.faction as FactionKey,
        sb.type    as BuildingType,
        sb.x,
        sb.y,
      );
      b.hp   = sb.hp;
      b.dead = sb.dead;
      this.villageManager.buildings.push(b);
      if (!sb.dead) {
        this.villageManager.villages[sb.faction as FactionKey]?.buildings.push(b);
      }
    }

    // ── Einheiten wiederherstellen ───────────────────────────────────────────
    // Vorhandenes Array leeren
    this.unitManager.units.length = 0;

    for (const su of save.units) {
      const u = new Unit(
        su.faction as FactionKey,
        su.role    as UnitRole,
        su.x,
        su.y,
      );
      u.hp        = su.hp;
      u.maxHp     = su.maxHp;
      u.state     = su.state    as UnitState;
      u.carryFood = su.carryFood;
      u.carryWood = su.carryWood;
      u.cd        = su.cd;
      u.dead      = su.dead;
      this.unitManager.units.push(u);
    }

    // ── Diplomatie wiederherstellen ──────────────────────────────────────────
    this.diplomacy.state      = save.diplomacy.state      as typeof this.diplomacy.state;
    this.diplomacy.tension    = save.diplomacy.tension;
    this.diplomacy.truceTicks = save.diplomacy.truceTicks;

    // ── Ziel-System wiederherstellen ─────────────────────────────────────────
    this.goalSystem.setDay(save.goal.day);
    this.goalSystem.mode = save.goal.mode as typeof this.goalSystem.mode;
    this.goalSystem.setState(save.goal.goalState as GoalState);

    // ── Uhr wiederherstellen ─────────────────────────────────────────────────
    this.clock.setSpeed(save.clock.speedIndex as SpeedIndex);
    if (save.clock.paused && !this.clock.paused) {
      this.clock.togglePause();
    } else if (!save.clock.paused && this.clock.paused) {
      this.clock.togglePause();
    }

    // ── Renderer neu zeichnen ────────────────────────────────────────────────
    this.worldRenderer.drawAll();
    this.buildingRenderer.drawAll(this.villageManager.liveBuildings);
    this.unitRenderer.drawAll(this.unitManager.liveUnits);
  }

  /** Gibt zurück ob ein Spielstand im localStorage existiert. */
  static hasSave(): boolean {
    return SaveSystem.hasSave();
  }

  // ─── Öffentliche API ─────────────────────────────────────────────────────

  getClock():            SimulationClock  { return this.clock; }
  getGrid():             WorldGrid        { return this.grid; }
  getVillageManager():   VillageManager   { return this.villageManager; }
  getUnitManager():      UnitManager      { return this.unitManager; }
  getResourceSystem():   ResourceSystem   { return this.resourceSystem; }
  getDiplomacy():        DiplomacySystem  { return this.diplomacy; }
  getFireSystem():       FireSystem       { return this.fireSystem; }
  getEffectSystem():     EffectSystem     { return this.effectSystem; }
  getToolController():   ToolController   { return this.toolController; }
  getInspectPanel():     InspectPanel     { return this.inspectPanel; }
  getEventFeed():        EventFeed        { return this.eventFeed; }
  getWorldRenderer():    WorldRenderer    { return this.worldRenderer; }
  getBuildingRenderer(): BuildingRenderer { return this.buildingRenderer; }
  getUnitRenderer():     UnitRenderer     { return this.unitRenderer; }
  getCameraController(): CameraController { return this.cameraController; }
}
