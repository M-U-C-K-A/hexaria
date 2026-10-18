import { type Ctx, glow, rgba } from './draw';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: 'spark' | 'smoke' | 'mote' | 'ring' | 'ember';
  grow?: number;
}

export interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  max: number;
  size: number;
  vy: number;
}

export class FX {
  parts: Particle[] = [];
  texts: FloatText[] = [];

  spark(x: number, y: number, color: string, n = 8, speed = 90) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.4 + Math.random() * 0.8);
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7 - 30, life: 0, max: 0.35 + Math.random() * 0.3, size: 2 + Math.random() * 2.5, color, kind: 'spark' });
    }
  }

  ring(x: number, y: number, color: string, radius: number) {
    this.parts.push({ x, y, vx: 0, vy: 0, life: 0, max: 0.5, size: radius, color, kind: 'ring' });
  }

  smoke(x: number, y: number) {
    this.parts.push({ x: x + (Math.random() - 0.5) * 3, y, vx: 6 + Math.random() * 6, vy: -14 - Math.random() * 8, life: 0, max: 2.6, size: 3, color: '#9aa3a0', kind: 'smoke', grow: 5 });
  }

  ember(x: number, y: number, color: string) {
    this.parts.push({ x, y, vx: (Math.random() - 0.5) * 10, vy: -12 - Math.random() * 14, life: 0, max: 1.6 + Math.random(), size: 1.6 + Math.random() * 1.4, color, kind: 'ember' });
  }

  text(x: number, y: number, text: string, color: string, size = 18) {
    this.texts.push({ x: x + (Math.random() - 0.5) * 16, y, text, color, life: 0, max: 1.0, size, vy: -46 });
  }

  update(dt: number) {
    for (const p of this.parts) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'spark') {
        p.vy += 220 * dt;
        p.vx *= 0.96;
      }
      if (p.kind === 'smoke' && p.grow) p.size += p.grow * dt;
      if (p.kind === 'ember') p.vx += Math.sin(p.life * 4 + p.y) * 8 * dt;
    }
    this.parts = this.parts.filter((p) => p.life < p.max);
    for (const t of this.texts) {
      t.life += dt;
      if (t.life < 0) continue;
      t.y += t.vy * dt;
      t.vy *= 0.93;
    }
    this.texts = this.texts.filter((t) => t.life < t.max);
  }

  draw(ctx: Ctx) {
    for (const p of this.parts) {
      const k = 1 - p.life / p.max;
      if (p.kind === 'ring') {
        ctx.strokeStyle = rgba(p.color, k * 0.9);
        ctx.lineWidth = 3 * k + 1;
        ctx.beginPath();
        const r = p.size * (0.3 + 0.7 * (1 - k));
        ctx.ellipse(p.x, p.y, r, r * 0.58, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === 'smoke') {
        ctx.fillStyle = rgba(p.color, 0.22 * k);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'ember' || p.kind === 'mote') {
        glow(ctx, p.x, p.y, p.size * 4, p.color, 0.5 * Math.sin(Math.PI * (p.life / p.max)));
      } else {
        ctx.fillStyle = rgba(p.color, k);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * k + 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawTexts(ctx: Ctx) {
    for (const t of this.texts) {
      if (t.life < 0) continue;
      const k = t.life / t.max;
      const pop = k < 0.15 ? 0.7 + (k / 0.15) * 0.5 : 1.2 - Math.min(0.2, (k - 0.15) * 0.4);
      ctx.save();
      ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
      ctx.font = `800 ${Math.round(t.size * pop)}px "Alegreya Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(10,6,4,0.9)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
      ctx.restore();
    }
  }
}
