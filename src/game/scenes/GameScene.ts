import Phaser from 'phaser';
import { CANVAS_W, WORLD_Y, WORLD_H, TILE, COLS, ROWS, ZOOM_DEFAULT } from '@game/config';
// Geschwindigkeit der visuellen Interpolation in Pixel pro Millisekunde (Phase 13C)
const VISUAL_SPEED_PX_PER_MS = 150 / 1000;
import { WorldGrid }          from '@game/world/WorldGrid';
import { WorldGenerator }     from '@game/world/WorldGenerator';
import { WorldRenderer }      from '@game/rendering/WorldRenderer';
import { BuildingRenderer }   from '@game/rendering/BuildingRenderer';
import { UnitRenderer }       from '@game/rendering/UnitRenderer';
import { CameraController }   from '@game/rendering/CameraController';
import { VillageManager }     from '@game/factions/VillageManager';
import { UnitManager }        from '@game/units/UnitManager';
import { SimulationClock }    from '@game/simulation/SimulationClock';
import { ResourceSystem }     from '@game/simulation/ResourceSystem';
import { HungerSystem }       from '@game/simulation/HungerSystem';
import { DiplomacySystem }    from '@game/simulation/DiplomacySystem';
import { FireSystem }         from '@game/simulation/FireSystem';
import { EffectSystem }       from '@game/effects/EffectSystem';
import { ToolController }     from '@game/tools/ToolController';
import { InspectPanel }       from '@game/ui/InspectPanel';
import { EventFeed }          from '@game/ui/EventFeed';
import { FACTIONS }           from '@game/factions/Faction';
import { GoalSystem }         from '@game/simulation/GoalSystem';
import { UIScene }            from './UIScene';

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
  private cameraController!: CameraController;

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

  create(): void {
    // 1. Welt
    this.grid = WorldGenerator.generate();

    // 2. Dörfer + Gebäude
    this.villageManager = new VillageManager(this.grid);
    this.villageManager.placeStartVillages();

    // 3. Einheiten
    this.unitManager = new UnitManager(this.grid, this.villageManager);
    this.unitManager.spawnInitial();

    // 4. Simulations-Systeme
    this.clock          = new SimulationClock();
    this.resourceSystem = new ResourceSystem(this.villageManager, this.unitManager, this.grid);
    this.hungerSystem   = new HungerSystem(this.villageManager, this.unitManager);
    this.diplomacy      = new DiplomacySystem(this.villageManager, this.unitManager);
    this.fireSystem     = new FireSystem(this.grid, this.unitManager);

    // 5. UI-Systeme
    this.eventFeed    = new EventFeed();
    this.inspectPanel = new InspectPanel(this.villageManager, this.unitManager, this.grid);

    // 5b. Ziel-System
    this.goalSystem = new GoalSystem();
    this.goalSystem.onGoalChange = (state) => {
      const ui = this.scene.get('UIScene') as UIScene | null;
      ui?.showResult(state === 'won');
    };

    // 6. Callbacks
    this.resourceSystem.onSpawn = (faction) => {
      this.unitRenderer.drawAll(this.unitManager.liveUnits);
      const fc = FACTIONS[faction];
      this.eventFeed.push(`${fc.short} spawnt Einheit`, fc.color === 0x5ec8ff ? '#5ec8ff' : '#ff5d63');
    };
    this.resourceSystem.onBuild = (faction) => {
      this.worldRenderer.drawAll();
      this.buildingRenderer.drawAll(this.villageManager.liveBuildings);
      const fc = FACTIONS[faction];
      this.eventFeed.push(`${fc.short} baut Gebäude (L${this.villageManager.villages[faction]?.level ?? 1})`, fc.color === 0x5ec8ff ? '#5ec8ff' : '#ff5d63');
    };
    this.villageManager.onBuildingDestroyed = () => {
      this.diplomacy.addTension(12);
      this.worldRenderer.drawAll();
      this.buildingRenderer.drawAll(this.villageManager.liveBuildings);
      this.eventFeed.push('Gebäude zerstört!', '#ff9944');
    };
    this.diplomacy.onStateChange = () => {
      const ui = this.scene.get('UIScene') as UIScene | null;
      ui?.setStatus(this.diplomacy.statusText);
      const colorMap: Record<string, string> = {
        peace: '#77d7ff', tension: '#ffca45', war: '#ff4b4b', truce: '#aaffaa',
      };
      this.eventFeed.push(`Status: ${this.diplomacy.statusText}`, colorMap[this.diplomacy.state]);
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

    this.effectSystem = new EffectSystem(effectsG);

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

    // 11. UI starten und Intro-Overlay verdrahten sobald UIScene bereit ist
    this.scene.launch('UIScene');

    // UIScene ist async — warten bis 'create' der UIScene abgeschlossen ist
    this.scene.get('UIScene').events.once(Phaser.Scenes.Events.CREATE, () => {
      const ui = this.scene.get('UIScene') as UIScene | null;
      ui?.setupIntroOverlay(this.clock, this.eventFeed);
    });
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

      const cam = this.cameras.main;
      const wx  = pointer.x + cam.scrollX;
      const wy  = pointer.y + cam.scrollY - WORLD_Y;
      const tx  = Math.floor(wx / TILE);
      const ty  = Math.floor(wy / TILE);

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

    // AI + Hunger
    if (this.aiAccum >= this.AI_INTERVAL_MS) {
      this.aiAccum = 0;
      this.clock.tick();
      this.unitManager.tick(1);
      this.hungerSystem.tick(1);
      // Einheitenpositionen haben sich geändert — sofort neu zeichnen
      this.unitRenderer.drawAll(this.unitManager.liveUnits);
      this.inspectPanel.refresh();
      this.eventFeed.update();
      this.pushHudUpdate();
    }

    // Ressourcen + Dorf + Diplomatie
    if (this.villageAccum >= this.VILLAGE_INTERVAL_MS) {
      this.villageAccum = 0;
      this.resourceSystem.tick(1);
      this.diplomacy.tick();
      this.unitManager.setWarState(this.diplomacy.isWar);
      this.pushHudUpdate();
    }
  }

  private pushHudUpdate(): void {
    const ui = this.scene.get('UIScene') as UIScene | null;
    if (!ui) return;

    const h = this.villageManager.villages.human;
    const o = this.villageManager.villages.orc;

    // GoalSystem-Tag für HUD verwenden (zeigt Fortschritt zum Ziel)
    ui.setDay(this.goalSystem.day);
    ui.setStatus(this.diplomacy.statusText);

    ui.setHumanSummary(
      h ? `${this.unitManager.liveCount('human')}  F${Math.floor(h.food)}  W${Math.floor(h.wood)}  L${h.level}` : '—',
    );
    ui.setOrcSummary(
      o ? `${this.unitManager.liveCount('orc')}  F${Math.floor(o.food)}  W${Math.floor(o.wood)}  L${o.level}` : '—',
    );
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
