/**
 * SeededRng — Phase 15
 *
 * Einfacher deterministischer Pseudozufallsgenerator (Mulberry32-Algorithmus).
 * Ermöglicht reproduzierbare Weltgenerierung anhand eines Seed-Werts.
 */
export class SeededRng {
  /** Interner Zustand des PRNG (32-Bit-Ganzzahl ohne Vorzeichen). */
  private s: number;

  constructor(seed: number) {
    // Sicherstellen, dass der Seed als vorzeichenlose 32-Bit-Ganzzahl behandelt wird
    this.s = seed >>> 0;
  }

  /**
   * Gibt die nächste Pseudozufallszahl im Bereich [0, 1) zurück.
   * Mulberry32-Implementierung — sehr schnell, gute statistische Eigenschaften.
   */
  next(): number {
    this.s += 0x6D2B79F5;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}
