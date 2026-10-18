import type { Scene } from '../app';
import { hexCorners, tracePoly } from '../core/hex';
import { CREATURE_BY_ID } from '../data/creatures';
import { drawCreature } from '../render/creatureArt';
import { glow, makeCanvas } from '../render/draw';
import { crystalCluster, mushroom } from '../render/terrainArt';

// Génère l'icône 1024×1024 de l'app macOS (ouvrir ?icon pendant `npm run dev`).
export class IconScene implements Scene {
  private canvas = makeCanvas(1024, 1024);

  enter() {
    const ctx = this.canvas.getContext('2d')!;
    const S = 1024;
    const r = 186;
    const m = 100;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(m, m, S - m * 2, S - m * 2, r);
    ctx.clip();
    const bg = ctx.createRadialGradient(S / 2, S * 0.55, 40, S / 2, S / 2, S * 0.6);
    bg.addColorStop(0, '#1d5a46');
    bg.addColorStop(1, '#03100c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 3; i++) {
      const g = ctx.createLinearGradient(0, m, 0, S);
      g.addColorStop(0, 'rgba(160,255,220,0.12)');
      g.addColorStop(1, 'rgba(160,255,220,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(250 + i * 190, m);
      ctx.lineTo(310 + i * 190, m);
      ctx.lineTo(420 + i * 190, S);
      ctx.lineTo(330 + i * 190, S);
      ctx.fill();
    }
    // tuile hexagonale
    const cx = S / 2;
    const cy = 640;
    const hs = 300;
    const top = hexCorners(cx, cy, hs, 0.58);
    const depth = 90;
    ctx.fillStyle = '#12301f';
    ctx.beginPath();
    ctx.moveTo(top[1].x, top[1].y);
    ctx.lineTo(top[2].x, top[2].y);
    ctx.lineTo(top[3].x, top[3].y);
    ctx.lineTo(top[3].x, top[3].y + depth);
    ctx.lineTo(top[2].x, top[2].y + depth);
    ctx.lineTo(top[1].x, top[1].y + depth);
    ctx.closePath();
    ctx.fill();
    tracePoly(ctx, top);
    const tg = ctx.createLinearGradient(0, cy - hs * 0.6, 0, cy + hs * 0.6);
    tg.addColorStop(0, '#3a8050');
    tg.addColorStop(1, '#245a38');
    ctx.fillStyle = tg;
    ctx.fill();
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#ffd98a';
    ctx.stroke();
    glow(ctx, cx, cy - 60, 360, '#7affc0', 0.35);
    crystalCluster(ctx, cx - 210, cy + 40, 70, '#f2b33a');
    mushroom(ctx, cx + 215, cy + 30, 95, '#2fd3a0', '#9dffd9');
    const c = CREATURE_BY_ID.flammeche;
    drawCreature(ctx, c.look, cx - 10, cy + 40, 300 / 1.3, { t: 0.6, facing: 1, star: 3 });
    ctx.restore();
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#c8913a';
    ctx.beginPath();
    ctx.roundRect(m + 7, m + 7, S - m * 2 - 14, S - m * 2 - 14, r - 6);
    ctx.stroke();
    fetch('/__icon', { method: 'POST', body: this.canvas.toDataURL('image/png') }).then(() => (document.title = 'icon-ok'));
  }

  exit() {}

  update() {}

  render(ctx: CanvasRenderingContext2D, W: number, H: number) {
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, W, H);
    const s = Math.min(W, H) * 0.9;
    ctx.drawImage(this.canvas, (W - s) / 2, (H - s) / 2, s, s);
  }
}
