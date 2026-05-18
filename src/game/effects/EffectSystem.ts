/**
 * EffectSystem — Phase VFX
 *
 * Zentrales System für transiente visuelle Effekte.
 * Verantwortlichkeiten:
 *   - Effekte hinzufügen
 *   - Ages per delta-time aktualisieren
 *   - Abgelaufene Effekte entfernen
 *   - Alle aktiven Effekte zeichnen (Phaser Graphics)
 *
 * Simulation bleibt unberührt — VFX ist rein visuell.
 */

import Phaser from 'phaser';
import { TILE } from '@game/config';
import {
  Effect, effectT, newEffectId,
  LightningEffect, ImpactRingEffect, SparkEffect,
  RainEffect, MeteorEffect, HealEffect, SpawnEffect,
} from './EffectTypes';

function rnd(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randi(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

// seeded jitter für reproduzierbare Blitzlinien
function seededJitter(seed: number, i: number, range: number): number {
  const s = Math.sin(seed * 9301 + i * 49297 + 233) * 46899;
  return (s - Math.floor(s) - 0.5) * range * 2;
}

export class EffectSystem {
  private readonly g: Phaser.GameObjects.Graphics;
  private effects: Effect[] = [];

  constructor(graphics: Phaser.GameObjects.Graphics) {
    this.g = graphics;
  }

  // ─── Effekte hinzufügen ──────────────────────────────────────────────────

  spawnLightning(px: number, py: number, camTop: number): void {
    const effect: LightningEffect = {
      id: newEffectId(), type: 'lightning',
      px, py, targetPy: py,
      age: 0, duration: 280,
      seed: Math.random() * 1000,
      impactR: TILE * 2.2,
      // Bolt startet von Kamera-Oberkante
    };
    // Startpunkt ist die Kamera-Oberkante (in Welt-Pixeln)
    (effect as unknown as Record<string, number>)['fromPy'] = camTop;
    this.effects.push(effect);
    // Impact-Ring
    this.effects.push({
      id: newEffectId(), type: 'ring',
      px, py, age: 0, duration: 320,
      color: 0xb6f3ff, maxR: TILE * 2.8,
    } as ImpactRingEffect);
    // Funken
    for (let i = 0; i < 14; i++) {
      this.effects.push({
        id: newEffectId(), type: 'spark',
        px, py, age: 0, duration: randi(180, 340),
        color: i % 3 === 0 ? 0xffffff : 0xb6f3ff,
        vx: rnd(-2.4, 2.4), vy: rnd(-2.8, 0.8),
      } as SparkEffect);
    }
  }

  spawnRain(px: number, py: number, radiusPx: number): void {
    this.effects.push({
      id: newEffectId(), type: 'rain',
      px, py, age: 0, duration: 900,
      radius: radiusPx, seed: Math.random() * 1000,
    } as RainEffect);
    this.effects.push({
      id: newEffectId(), type: 'ring',
      px, py, age: 0, duration: 600,
      color: 0x89c7ff, maxR: radiusPx,
    } as ImpactRingEffect);
  }

  spawnMeteor(px: number, py: number, fromPy: number, radiusPx: number, onImpact?: () => void): void {
    // Meteor-Effekt mit optionalem Einschlag-Callback
    this.effects.push({
      id: newEffectId(), type: 'meteor',
      px, py, fromPy, age: 0, duration: 550,
      impactR: radiusPx,
      onImpact,
      impactFired: false,
    } as MeteorEffect);
    // Impact-Ring nach Einschlag
    this.effects.push({
      id: newEffectId(), type: 'ring',
      px, py, age: 180, duration: 550,
      color: 0xff9d41, maxR: radiusPx * 1.3,
    } as ImpactRingEffect);
    // Trümmer-Funken
    for (let i = 0; i < 28; i++) {
      this.effects.push({
        id: newEffectId(), type: 'spark',
        px, py, age: 160, duration: randi(280, 500),
        color: i % 4 === 0 ? 0xffd38a : (i % 4 === 1 ? 0xff6622 : 0xff3a22),
        vx: rnd(-3.2, 3.2), vy: rnd(-4.0, 0.5),
      } as SparkEffect);
    }
  }

  spawnHeal(px: number, py: number, radiusPx: number): void {
    this.effects.push({
      id: newEffectId(), type: 'heal',
      px, py, age: 0, duration: 700,
      radius: radiusPx,
    } as HealEffect);
    // Sanfte grüne Funken
    for (let i = 0; i < 12; i++) {
      this.effects.push({
        id: newEffectId(), type: 'spark',
        px, py: py - rnd(0, radiusPx * 0.6),
        age: randi(0, 200), duration: randi(350, 650),
        color: i % 2 === 0 ? 0x80ffb2 : 0xaaffcc,
        vx: rnd(-1.0, 1.0), vy: rnd(-2.2, -0.4),
      } as SparkEffect);
    }
  }

  spawnImpactRing(px: number, py: number, color: number, maxR: number): void {
    this.effects.push({
      id: newEffectId(), type: 'ring',
      px, py, age: 0, duration: 280,
      color, maxR,
    } as ImpactRingEffect);
  }

  /** Spawn-VFX: expandierender Ring + 8 Kreisfunken um den Spawn-Punkt. */
  spawnSpawnEffect(px: number, py: number, radiusPx: number): void {
    // Haupt-Spawn-Effekt (expandierender Ring + Mittelpunkt-Schimmer)
    this.effects.push({
      id: newEffectId(), type: 'spawn',
      px, py, age: 0, duration: 500,
      radiusPx,
    } as SpawnEffect);

    // 8 Funken gleichmäßig um den Kreis verteilt
    for (let i = 0; i < 8; i++) {
      const angle    = i * Math.PI / 4;
      const speed    = radiusPx * 1.2;
      const color    = i % 2 === 0 ? 0xffffff : 0xaaffcc;
      // Gestaffelte Dauer: 300–450 ms
      const duration = 300 + i * (150 / 7);
      this.effects.push({
        id: newEffectId(), type: 'spark',
        px, py, age: 0, duration,
        color,
        vx: Math.cos(angle) * speed / 60,
        vy: Math.sin(angle) * speed / 60,
      } as SparkEffect);
    }
  }

  // ─── Update ──────────────────────────────────────────────────────────────

  update(deltaMs: number): void {
    for (const e of this.effects) {
      e.age += deltaMs;
      // Funken-Physik
      if (e.type === 'spark') {
        const sp = e as SparkEffect;
        sp.vx *= 0.94;
        sp.vy += 0.12;   // Gravitation
        void sp.px;      // px ist readonly — Bewegung nur visuell beim Zeichnen
      }
      // Meteor-Einschlag-Callback genau einmal bei t >= 0.55 auslösen
      if (e.type === 'meteor') {
        const me = e as MeteorEffect;
        if (!me.impactFired && effectT(me) >= 0.55) {
          me.impactFired = true;
          me.onImpact?.();
        }
      }
    }
    this.effects = this.effects.filter(e => e.age < e.duration);
  }

  // ─── Rendering ───────────────────────────────────────────────────────────

  drawAll(_camScrollX: number, _camScrollY: number, camTop: number): void {
    const g = this.g;
    g.clear();

    for (const e of this.effects) {
      if (e.age < 0) continue;  // verzögerte Effekte
      const t = effectT(e);

      switch (e.type) {
        case 'lightning': this.drawLightning(e as LightningEffect, t, camTop); break;
        case 'ring':      this.drawRing(e as ImpactRingEffect, t); break;
        case 'spark':     this.drawSpark(e as SparkEffect, t); break;
        case 'rain':      this.drawRain(e as RainEffect, t); break;
        case 'meteor':    this.drawMeteor(e as MeteorEffect, t, camTop); break;
        case 'heal':      this.drawHeal(e as HealEffect, t); break;
        case 'spawn':     this.drawSpawnEffect(e as SpawnEffect, this.g); break;
      }
    }
  }

  get hasActive(): boolean { return this.effects.length > 0; }

  // ─── Einzelne Renderer ───────────────────────────────────────────────────

  private drawLightning(e: LightningEffect, t: number, camTop: number): void {
    const g = this.g;
    // Bolt erscheint schnell, blendet dann aus
    const alpha = t < 0.4 ? t / 0.4 : 1 - (t - 0.4) / 0.6;
    const fromY = camTop;
    const toY   = e.py;

    const segments = 7;
    const points: Array<{ x: number; y: number }> = [];
    for (let i = 0; i <= segments; i++) {
      const frac = i / segments;
      const jx = i === 0 || i === segments
        ? 0
        : seededJitter(e.seed, i, TILE * 1.1);
      points.push({ x: e.px + jx, y: fromY + (toY - fromY) * frac });
    }

    // Äußeres Leuchten
    g.lineStyle(7, 0x6aeaff, alpha * 0.35);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
    g.strokePath();

    // Kern
    g.lineStyle(2.5, 0xeef8ff, alpha * 0.95);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) g.lineTo(points[i].x, points[i].y);
    g.strokePath();

    // Impact-Flash
    if (t < 0.35) {
      const flashA = (1 - t / 0.35) * 0.75;
      g.fillStyle(0xeef8ff, flashA);
      g.fillCircle(e.px, e.py, TILE * 1.4 * (1 - t));
    }

    // Kleine Äste vom unteren Drittel
    const branchStart = Math.floor(segments * 0.6);
    for (let b = 0; b < 3; b++) {
      const bp = points[branchStart + b] ?? points[points.length - 1];
      const bx2 = bp.x + seededJitter(e.seed + b * 7, b, TILE * 1.8);
      const by2 = bp.y + TILE * (0.8 + b * 0.4);
      g.lineStyle(1.5, 0x99deff, alpha * 0.6);
      g.lineBetween(bp.x, bp.y, bx2, by2);
    }
  }

  private drawRing(e: ImpactRingEffect, t: number): void {
    const alpha = 1 - t;
    const r     = e.maxR * (0.2 + t * 0.8);
    this.g.lineStyle(3, e.color, alpha * 0.9);
    this.g.strokeCircle(e.px, e.py, r);
  }

  private drawSpark(e: SparkEffect, t: number): void {
    const alpha = 1 - t;
    // Bewegung akkumulieren (px/py sind readonly, wir rechnen visuell)
    const elapsed = e.age / 1000;
    const vx0 = (e as unknown as Record<string, number>)['_vx0'] ?? e.vx;
    const vy0 = (e as unknown as Record<string, number>)['_vy0'] ?? e.vy;
    // Speichere Initialgeschwindigkeit beim ersten Draw
    if (!((e as unknown as Record<string, number>)['_vx0'])) {
      (e as unknown as Record<string, number>)['_vx0'] = e.vx;
      (e as unknown as Record<string, number>)['_vy0'] = e.vy;
    }
    const sx = e.px + vx0 * elapsed * 60;
    const sy = e.py + vy0 * elapsed * 60 + 0.5 * 0.12 * 60 * 60 * elapsed * elapsed;
    this.g.fillStyle(e.color, alpha);
    this.g.fillCircle(sx, sy, 2.2);
  }

  private drawRain(e: RainEffect, t: number): void {
    const g = this.g;
    const alpha = t < 0.8 ? 1 : 1 - (t - 0.8) / 0.2;
    const count = 32;
    // Regen-Streifen: seed-basiert reproduzierbar pro Frame variiert durch age
    for (let i = 0; i < count; i++) {
      const s = Math.sin(e.seed * 317 + i * 1731) * 46899;
      const f = s - Math.floor(s);
      const angle = -Math.PI * 0.5 + (f - 0.5) * 0.3;
      const dist  = (Math.sin(e.seed * 73 + i * 97) * 46899 % 1 + 1) % 1 * e.radius;
      const phase = (e.age * 0.003 + f) % 1;
      const startX = e.px + Math.cos(angle + Math.PI / 2) * dist;
      const startY = e.py - e.radius * 0.8 + phase * e.radius * 1.6;
      const len    = 8 + f * 6;
      g.lineStyle(1.2, 0x89c7ff, alpha * 0.65);
      g.lineBetween(startX, startY, startX + Math.sin(angle) * len, startY + Math.cos(angle) * len);
    }
    // Radius-Kreis Hint
    g.lineStyle(2, 0x89c7ff, alpha * 0.25);
    g.strokeCircle(e.px, e.py, e.radius);
  }

  private drawMeteor(e: MeteorEffect, t: number, _camTop: number): void {
    const g      = this.g;
    // fromPy ist jetzt direkt im Typen verfügbar
    const fromPy = e.fromPy;

    if (t < 0.55) {
      // Einflug: Feuerball fällt herab
      const flyT  = t / 0.55;
      const curX  = e.px;
      const curY  = fromPy + (e.py - fromPy) * flyT;
      const size  = TILE * 1.1;
      // Schweif
      const tailLen = TILE * 6 * (1 - flyT * 0.5);
      g.lineStyle(TILE * 1.4, 0xff6622, 0.22);
      g.lineBetween(curX, curY - tailLen, curX, curY);
      g.lineStyle(TILE * 0.7, 0xffd38a, 0.4);
      g.lineBetween(curX, curY - tailLen * 0.6, curX, curY);
      // Ball
      g.fillStyle(0xffd38a, 0.95);
      g.fillCircle(curX, curY, size);
      g.fillStyle(0xff6622, 0.85);
      g.fillCircle(curX, curY, size * 0.65);
    } else {
      // Einschlag
      const blastT = (t - 0.55) / 0.45;
      const alpha  = 1 - blastT;
      // Schockwelle
      g.lineStyle(5, 0xff9d41, alpha * 0.8);
      g.strokeCircle(e.px, e.py, e.impactR * blastT);
      // Innerer Blitz
      if (blastT < 0.4) {
        g.fillStyle(0xfff8e0, (1 - blastT / 0.4) * 0.7);
        g.fillCircle(e.px, e.py, e.impactR * 0.45 * (1 - blastT / 0.4));
      }
    }
  }

  private drawHeal(e: HealEffect, t: number): void {
    const g     = this.g;
    const alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
    // Zwei pulsierende Ringe
    const r1 = e.radius * (0.3 + t * 0.7);
    const r2 = e.radius * t * 0.55;
    g.lineStyle(2.5, 0x80ffb2, alpha * 0.6);
    g.strokeCircle(e.px, e.py, r1);
    if (t > 0.15) {
      g.lineStyle(1.5, 0xaaffcc, alpha * 0.4);
      g.strokeCircle(e.px, e.py, r2);
    }
    // Sanfter grüner Schimmer
    if (t < 0.4) {
      g.fillStyle(0x80ffb2, (1 - t / 0.4) * 0.18);
      g.fillCircle(e.px, e.py, e.radius);
    }
  }

  /** Spawn-Ring: expandierender weißer Kreis-Ring der ausblendet
   *  + heller weißer Füllkreis in der Mitte der nur im ersten Drittel sichtbar ist. */
  private drawSpawnEffect(e: SpawnEffect, g: Phaser.GameObjects.Graphics): void {
    const t = effectT(e);

    // Expandierender Ring: von 0 bis radiusPx, blendet aus
    const ringAlpha = 1 - t;
    const ringR     = e.radiusPx * t;
    g.lineStyle(3, 0xffffff, ringAlpha * 0.9);
    g.strokeCircle(e.px, e.py, ringR);

    // Heller Füllkreis in der Mitte: schrumpft von radiusPx*0.4 zu 0,
    // nur während der ersten 30% der Laufzeit sichtbar
    if (t < 0.3) {
      const innerT     = t / 0.3;                          // 0→1 in den ersten 30%
      const innerAlpha = 1 - innerT;
      const innerR     = e.radiusPx * 0.4 * (1 - innerT);
      g.fillStyle(0xffffff, innerAlpha * 0.85);
      g.fillCircle(e.px, e.py, innerR);
    }
  }
}
