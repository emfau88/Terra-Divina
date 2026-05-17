/**
 * SimulationClock — Phase 11
 *
 * 4-stufige Spielgeschwindigkeit: 1×, 2×, 3×, 4×
 * Pause, Tages-Zähler.
 */

export type TickCallback = (steps: number) => void;

const SPEEDS = [1, 2, 3, 4] as const;
export type SpeedIndex = 0 | 1 | 2 | 3;

export class SimulationClock {
  private speedIndex: SpeedIndex = 0;
  private _paused   = false;
  private _day      = 1;
  private dayClock  = 0;

  private readonly callbacks: TickCallback[] = [];

  // ─── Steuerung ────────────────────────────────────────────────────────────

  togglePause(): void   { this._paused = !this._paused; }
  get paused(): boolean { return this._paused; }

  cycleSpeed(): void {
    this.speedIndex = ((this.speedIndex + 1) % SPEEDS.length) as SpeedIndex;
  }

  setSpeed(index: SpeedIndex): void {
    this.speedIndex = index;
  }

  get speed(): number       { return SPEEDS[this.speedIndex]; }
  get speedIndex0(): SpeedIndex { return this.speedIndex; }

  get day(): number { return this._day; }

  // ─── Callbacks ───────────────────────────────────────────────────────────

  register(cb: TickCallback): void {
    this.callbacks.push(cb);
  }

  // ─── Tick ────────────────────────────────────────────────────────────────

  tick(): void {
    if (this._paused) return;
    const steps = SPEEDS[this.speedIndex];

    for (const cb of this.callbacks) {
      cb(steps);
    }

    this.dayClock += steps;
    if (this.dayClock >= 6) {
      this._day++;
      this.dayClock = 0;
    }
  }
}
