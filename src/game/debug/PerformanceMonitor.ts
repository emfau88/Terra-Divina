type PerfArea = 'effects' | 'render' | 'ai' | 'village' | 'save';
type RedrawKind = 'world' | 'buildings' | 'units' | 'creatures' | 'fire';

export interface PerfCounts {
  units: number;
  creatures: number;
  buildings: number;
  buildSites: number;
  villages: number;
  day: number;
  speed: number;
  paused: boolean;
}

const AREAS: PerfArea[] = ['effects', 'render', 'ai', 'village', 'save'];
const REDRAWS: RedrawKind[] = ['world', 'buildings', 'units', 'creatures', 'fire'];

function emptyRecord<T extends string>(keys: readonly T[]): Record<T, number> {
  return Object.fromEntries(keys.map(key => [key, 0])) as Record<T, number>;
}

function fmt(ms: number): string {
  return ms >= 10 ? ms.toFixed(1) : ms.toFixed(2);
}

export class PerformanceMonitor {
  private readonly el: HTMLDivElement;
  private visible = true;
  private frames = 0;
  private windowMs = 0;
  private deltaSum = 0;
  private deltaMax = 0;
  private updateSum = 0;
  private updateMax = 0;
  private areaSums = emptyRecord(AREAS);
  private areaMax = emptyRecord(AREAS);
  private redraws = emptyRecord(REDRAWS);
  private counts: PerfCounts | null = null;

  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'perf-monitor';
    this.el.innerHTML = 'Profiling startet...';
    document.body.appendChild(this.el);
    window.addEventListener('keydown', this.onKeyDown);
  }

  beginFrame(delta: number): void {
    this.frames++;
    this.windowMs += delta;
    this.deltaSum += delta;
    this.deltaMax = Math.max(this.deltaMax, delta);
  }

  measure<T>(area: PerfArea, fn: () => T): T {
    const startedAt = performance.now();
    try {
      return fn();
    } finally {
      const elapsed = performance.now() - startedAt;
      this.areaSums[area] += elapsed;
      this.areaMax[area] = Math.max(this.areaMax[area], elapsed);
    }
  }

  countRedraw(kind: RedrawKind): void {
    this.redraws[kind]++;
  }

  endFrame(updateMs: number, counts: PerfCounts): void {
    this.updateSum += updateMs;
    this.updateMax = Math.max(this.updateMax, updateMs);
    this.counts = counts;

    if (this.windowMs >= 1000) {
      this.render();
      this.resetWindow();
    }
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    this.el.remove();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'F3') return;
    event.preventDefault();
    this.visible = !this.visible;
    this.el.classList.toggle('perf-monitor--hidden', !this.visible);
  };

  private render(): void {
    const fps = this.frames / (this.windowMs / 1000);
    const avgDelta = this.deltaSum / Math.max(1, this.frames);
    const avgUpdate = this.updateSum / Math.max(1, this.frames);
    const saveClass = this.areaMax.save > 8 ? 'bad' : this.areaMax.save > 3 ? 'warn' : '';
    const updateClass = this.updateMax > 28 ? 'bad' : this.updateMax > 18 ? 'warn' : '';
    const fpsClass = fps < 45 ? 'bad' : fps < 55 ? 'warn' : '';
    const c = this.counts;

    this.el.innerHTML = `
      <div class="perf-title">PERF <span>F3</span></div>
      <div><b>FPS</b><span class="${fpsClass}">${fps.toFixed(0)}</span></div>
      <div><b>Frame avg/max</b><span>${fmt(avgDelta)} / ${fmt(this.deltaMax)} ms</span></div>
      <div><b>Update avg/max</b><span class="${updateClass}">${fmt(avgUpdate)} / ${fmt(this.updateMax)} ms</span></div>
      <hr>
      <div><b>Render max</b><span>${fmt(this.areaMax.render)} ms</span></div>
      <div><b>AI max</b><span>${fmt(this.areaMax.ai)} ms</span></div>
      <div><b>Village max</b><span>${fmt(this.areaMax.village)} ms</span></div>
      <div><b>Save max</b><span class="${saveClass}">${fmt(this.areaMax.save)} ms</span></div>
      <div><b>Effects max</b><span>${fmt(this.areaMax.effects)} ms</span></div>
      <hr>
      <div><b>Redraw/s</b><span>W${this.redraws.world} B${this.redraws.buildings} U${this.redraws.units} C${this.redraws.creatures} F${this.redraws.fire}</span></div>
      <div><b>Objects</b><span>U${c?.units ?? 0} C${c?.creatures ?? 0} B${c?.buildings ?? 0} S${c?.buildSites ?? 0}</span></div>
      <div><b>World</b><span>D${c?.day ?? 0} V${c?.villages ?? 0} x${c?.speed ?? 1}${c?.paused ? ' P' : ''}</span></div>
    `;
  }

  private resetWindow(): void {
    this.frames = 0;
    this.windowMs = 0;
    this.deltaSum = 0;
    this.deltaMax = 0;
    this.updateSum = 0;
    this.updateMax = 0;
    this.areaSums = emptyRecord(AREAS);
    this.areaMax = emptyRecord(AREAS);
    this.redraws = emptyRecord(REDRAWS);
  }
}
