/**
 * EventFeed — Phase 10
 *
 * Zeigt eine scrollende Liste von Spielereignissen als DOM-Overlay an.
 * Nachrichten verschwinden nach MAX_AGE_MS automatisch.
 *
 * Keine Phaser-Abhängigkeit. Wird von GameScene über push() befüllt.
 */

export interface FeedEvent {
  text:    string;
  color?:  string;   // CSS-Farbe, z.B. '#5ec8ff'
  ts:      number;   // performance.now()-Zeitstempel
}

const MAX_EVENTS   = 6;
const MAX_AGE_MS   = 8000;
const FADE_MS      = 1200;

export class EventFeed {
  private readonly el: HTMLElement;
  private events: FeedEvent[] = [];

  constructor() {
    this.el = document.createElement('div');
    this.el.id = 'event-feed';
    document.body.appendChild(this.el);
  }

  push(text: string, color?: string): void {
    this.events.push({ text, color, ts: performance.now() });
    if (this.events.length > MAX_EVENTS) this.events.shift();
    this.render();
  }

  /** Aufgerufen vom Game-Loop — entfernt alte Einträge und aktualisiert Fades. */
  update(): void {
    const now = performance.now();
    const before = this.events.length;
    this.events = this.events.filter(e => now - e.ts < MAX_AGE_MS);
    if (this.events.length !== before) this.render();
  }

  private render(): void {
    const now = performance.now();
    this.el.innerHTML = this.events.map(e => {
      const age      = now - e.ts;
      const fadeIn   = Math.min(1, age / 250);
      const fadeOut  = age > MAX_AGE_MS - FADE_MS
        ? 1 - (age - (MAX_AGE_MS - FADE_MS)) / FADE_MS
        : 1;
      const opacity  = (fadeIn * fadeOut).toFixed(2);
      const color    = e.color ?? '#eef6ff';
      return `<div class="feed-item" style="opacity:${opacity};color:${color}">${e.text}</div>`;
    }).join('');
  }

  destroy(): void {
    this.el.remove();
  }
}
