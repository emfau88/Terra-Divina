import Phaser from 'phaser';
import { CANVAS_W, WORLD_Y, WORLD_H, TILE, COLS, ROWS, ZOOM_DEFAULT } from '@game/config';
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
import { UIScene }            from './UIScene';

/**
 * GameScene — Phase VFX
 *
 * Neu:
 * - FireSystem: organische Ausbreitung mit burn-Countdown
 * - EffectSystem: transiente VFX (Blitz, Regen, Meteor, Heilung)
 * - WorldRenderer.time: flackernde Feuer-Kacheln
 * - EffectSystem-Graphics-Layer über allen anderen
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
  private readonly AI_INTERVAL_MS       = 250;
  private readonly VILLAGE_INTERVAL_MS  = 650;
  private readonly FIRE_REDRAW_MS       = 80;   // ~12 fps Flacker-Rate

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

    // 8. Renderer — Reihenfolge: map → shadow → build → unit → effects
    const mapG     = this.add.graphics();
    const shadowG  = this.add.graphics();
    const buildG   = this.add.graphics();
    const unitG    = this.add.graphics();
    const effectsG = this.add.graphics();   // ganz oben

    this.worldRenderer = new WorldRenderer(mapG, this.grid);
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

    // 11. UI
    this.scene.launch('UIScene');
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
      if (result === 'ok') {
        this.eventFeed.push(`${this.toolLabel(tool)} angewendet`, '#ffe28a');
      } else if (result === 'cap-reached') {
        this.eventFeed.push('Bevölkerungsobergrenze erreicht!', '#ff9944');
      } else if (result === 'no-target') {
        this.eventFeed.push('Kein gültiges Ziel', '#888');
      }
      this.pushHudUpdate();
    });
  }

  // ─── Update ──────────────────────────────────────────────────────────────

  update(time: number, delta: number): void {
    // WorldRenderer bekommt aktuelle Zeit für Feuer-Flackern
    this.worldRenderer.time = time;

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
          this.worldRenderer.drawAll();
        }
      }
      return;
    }

    const scaledDelta = delta * this.clock.speed;
    this.aiAccum      += scaledDelta;
    this.villageAccum += scaledDelta;

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
      this.worldRenderer.drawAll();
      this.buildingRenderer.drawAll(this.villageManager.liveBuildings);
      this.unitRenderer.drawAll(this.unitManager.liveUnits);
    } else if (this.fireSystem.hasFire) {
      // Flacker-Neuzeichnung auch ohne Spread-Tick
      this.fireRedrawAccum += delta;
      if (this.fireRedrawAccum >= this.FIRE_REDRAW_MS) {
        this.fireRedrawAccum = 0;
        this.worldRenderer.drawAll();
      }
    }

    // AI + Hunger
    if (this.aiAccum >= this.AI_INTERVAL_MS) {
      this.aiAccum = 0;
      this.clock.tick();
      this.unitManager.tick(1);
      this.hungerSystem.tick(1);
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

    ui.setDay(this.clock.day);
    ui.setStatus(this.diplomacy.statusText);

    ui.setHumanSummary(
      h ? `${this.unitManager.liveCount('human')}  F${Math.floor(h.food)}  W${Math.floor(h.wood)}  L${h.level}` : '—',
    );
    ui.setOrcSummary(
      o ? `${this.unitManager.liveCount('orc')}  F${Math.floor(o.food)}  W${Math.floor(o.wood)}  L${o.level}` : '—',
    );
  }

  private toolLabel(tool: string): string {
    const map: Record<string, string> = {
      lightning: 'Blitz', fire: 'Feuer', rain: 'Regen',
      meteor: 'Meteor', heal: 'Heilung', human: 'Mensch', orc: 'Ork',
    };
    return map[tool] ?? tool;
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
