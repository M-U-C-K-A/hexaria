import { ISO } from '../core/hex';
import type { BuildingId } from '../data/types';
import { getSprite, spriteDataUrl } from './sprites';
import { type Ctx, ellipse, flag, gableRoof, glow, hipRoof, isoBox, makeCanvas, poly, rgba, shade, tower, windowGlow } from './draw';

const WARM = '#ffc76a';

// Rhombe iso au sol (champs, quais, enclos).
function rhombus(cx: number, cy: number, a: number) {
  const b = a * ISO;
  return { L: [cx - a, cy], B: [cx, cy + b], R: [cx + a, cy], T: [cx, cy - b] };
}

function field(ctx: Ctx, cx: number, cy: number, a: number, soil: string, crop: string) {
  const { L, B, R, T } = rhombus(cx, cy, a);
  poly(ctx, [...L, ...B, ...R, ...T], soil, 'rgba(20,14,4,0.8)', 1);
  ctx.strokeStyle = crop;
  ctx.lineWidth = 2.2;
  const n = 6;
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const p1 = [L[0] + (B[0] - L[0]) * t, L[1] + (B[1] - L[1]) * t];
    const p2 = [T[0] + (R[0] - T[0]) * t, T[1] + (R[1] - T[1]) * t];
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();
  }
}

function log(ctx: Ctx, x: number, y: number, len: number, r: number) {
  ctx.fillStyle = '#6b4a2a';
  ctx.fillRect(x - len / 2, y - r, len, r * 2);
  ctx.strokeStyle = 'rgba(20,10,4,0.8)';
  ctx.lineWidth = 0.8;
  ctx.strokeRect(x - len / 2, y - r, len, r * 2);
  ellipse(ctx, x + len / 2, y, r * 0.6, r, '#c49a62');
  ctx.beginPath();
  ctx.ellipse(x + len / 2, y, r * 0.6, r, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function lantern(ctx: Ctx, x: number, y: number, s: number) {
  glow(ctx, x, y, s * 0.35, WARM, 0.55);
  ellipse(ctx, x, y, 2.2, 2.6, '#ffdd8a');
}

function fence(ctx: Ctx, cx: number, cy: number, rx: number, front: boolean) {
  const ry = rx * ISO;
  ctx.strokeStyle = '#7a5a36';
  ctx.lineWidth = 1.6;
  const start = front ? 0 : Math.PI;
  const end = front ? Math.PI : Math.PI * 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy - 5, rx, ry, 0, start, end);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy - 9, rx, ry, 0, start, end);
  ctx.stroke();
  for (let i = 0; i <= 8; i++) {
    const a = start + ((end - start) * i) / 8;
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    ctx.strokeStyle = '#5a3f22';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 12);
    ctx.stroke();
  }
}

export interface BuildingDrawOpts {
  done: boolean;
  progress?: number;
  waterDir?: number;
  t?: number;
  part?: 'all' | 'house' | 'dock';
}

// Points d'émission de fumée (en unités de taille d'hexagone, relatifs au centre de tuile).
export const CHIMNEYS: Partial<Record<BuildingId, [number, number][]>> = {
  house: [[-0.08, -0.62], [0.3, -0.42]],
  tavern: [[0.18, -0.78]],
  forge: [[0.2, -0.95]],
  townhall: [[-0.25, -0.86]],
};

// Largeur d'affichage (en tailles d'hexagone) d'un bâtiment peint ; ajustable par bâtiment.
const SPRITE_WIDTH: Partial<Record<BuildingId, number>> = {
  townhall: 2.0, colosseum: 2.0, farm: 2.0, port: 2.3, auction: 2.0, academy: 1.7, house: 1.6, tavern: 1.7,
};

function drawBuildingSprite(ctx: Ctx, id: BuildingId, cx: number, cy: number, s: number, o: BuildingDrawOpts): boolean {
  const sp = getSprite(`buildings/${id}`);
  if (!sp) return false;
  // Les ports regardent vers l'eau : on retourne l'image selon le côté du rivage.
  const flip = id === 'port' && (o.waterDir === 2 || o.waterDir === 3 || o.waterDir === 4) ? -1 : 1;
  if (id === 'port' && o.part === 'dock') return true;
  const w = s * (SPRITE_WIDTH[id] ?? 1.8);
  const h = (sp.h * w) / sp.w;
  const bottom = cy + s * 0.5;
  const x = cx;
  const prog = o.done ? 1 : Math.max(0.08, Math.min(1, o.progress ?? 0));
  ctx.save();
  ctx.translate(x, 0);
  ctx.scale(flip, 1);
  // ombre portée au sol
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, bottom - s * 0.06, w * 0.38, w * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!o.done) {
    ctx.globalAlpha = 0.25;
    ctx.drawImage(sp.img, -w / 2, bottom - h, w, h);
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.rect(-w, bottom - h * prog, w * 2, h * prog + 2);
    ctx.clip();
  }
  ctx.drawImage(sp.img, -w / 2, bottom - h, w, h);
  ctx.restore();
  if (!o.done) drawScaffold(ctx, cx, cy, s, o.progress ?? 0);
  return true;
}

export function drawBuilding(ctx: Ctx, id: BuildingId, cx: number, cy: number, s: number, o: BuildingDrawOpts) {
  if (drawBuildingSprite(ctx, id, cx, cy, s, o)) return;
  ctx.save();
  if (!o.done) ctx.globalAlpha = 0.5;
  const t = o.t ?? 0;
  switch (id) {
    case 'townhall': {
      isoBox(ctx, cx, cy + s * 0.14, s * 0.58, 5, '#5d625c');
      tower(ctx, cx + s * 0.12, cy - s * 0.2, s * 0.14, s * 0.85, '#9a8a70', '#2c5c6c', s * 0.38);
      glow(ctx, cx + s * 0.12, cy - s * 0.2 - s * 1.0, s * 0.3, '#ffd27a', 0.3);
      isoBox(ctx, cx - s * 0.08, cy + s * 0.1, s * 0.4, s * 0.38, '#8d7c62');
      hipRoof(ctx, cx - s * 0.08, cy + s * 0.1, s * 0.4, s * 0.38, s * 0.3, '#2f6273');
      windowGlow(ctx, cx - s * 0.36, cy + s * 0.02 - s * 0.08, s * 0.08, s * 0.12, 'L', WARM);
      windowGlow(ctx, cx - s * 0.2, cy + s * 0.11 - s * 0.08, s * 0.08, s * 0.12, 'L', WARM);
      windowGlow(ctx, cx + s * 0.06, cy + s * 0.15 - s * 0.08, s * 0.08, s * 0.12, 'R', WARM);
      flag(ctx, cx + s * 0.12, cy - s * 0.2 - s * 1.2, s * 0.3, '#e0b048', t);
      lantern(ctx, cx - s * 0.5, cy + s * 0.2, s);
      lantern(ctx, cx + s * 0.38, cy + s * 0.28, s);
      break;
    }
    case 'colosseum': {
      const rx = s * 0.62;
      const ry = rx * ISO;
      const h = s * 0.32;
      const wall = '#9c8a6e';
      // mur arrière
      ctx.fillStyle = shade(wall, -0.35);
      ctx.beginPath();
      ctx.ellipse(cx, cy - h, rx, ry, 0, Math.PI, 0);
      ctx.lineTo(cx + rx, cy);
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI, true);
      ctx.closePath();
      ctx.fill();
      // arène de sable
      ellipse(ctx, cx, cy - h * 0.1, rx * 0.72, ry * 0.72, '#5d4d34');
      glow(ctx, cx, cy - h * 0.1, rx * 0.7, '#7affc0', 0.25);
      ctx.strokeStyle = 'rgba(122,255,192,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy - h * 0.1, rx * 0.45, ry * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
      // mur avant avec arches
      const g = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
      g.addColorStop(0, shade(wall, 0.05));
      g.addColorStop(0.5, shade(wall, 0.15));
      g.addColorStop(1, shade(wall, -0.4));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx, cy + ry * 0.05, rx, ry, 0, 0, Math.PI);
      ctx.lineTo(cx - rx, cy - h * 0.55);
      ctx.ellipse(cx, cy - h * 0.55 + ry * 0.05, rx, ry, 0, Math.PI, 0, true);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(10,8,4,0.85)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      for (let i = 1; i < 8; i++) {
        const a = (Math.PI * i) / 8;
        const x = cx + Math.cos(a) * rx * 0.98;
        const y = cy + Math.sin(a) * ry;
        ctx.fillStyle = 'rgba(15,10,6,0.85)';
        ctx.beginPath();
        ctx.ellipse(x, y - h * 0.22, s * 0.035, s * 0.07, 0, Math.PI, 0);
        ctx.lineTo(x + s * 0.035, y - h * 0.05);
        ctx.lineTo(x - s * 0.035, y - h * 0.05);
        ctx.fill();
      }
      flag(ctx, cx - rx * 0.8, cy - h * 0.6, s * 0.35, '#c0392b', t);
      flag(ctx, cx + rx * 0.8, cy - h * 0.6, s * 0.35, '#c0392b', t + 1);
      lantern(ctx, cx, cy + ry * 0.9, s);
      break;
    }
    case 'house': {
      const draw = (x: number, y: number, a: number, roof: string) => {
        isoBox(ctx, x, y, a, a * 0.85, '#8b7355');
        gableRoof(ctx, x, y, a, a * 0.85, a * 0.7, roof);
        windowGlow(ctx, x - a * 0.65, y - a * 0.2, a * 0.22, a * 0.32, 'L', WARM);
      };
      isoBox(ctx, cx - s * 0.08, cy - s * 0.42, s * 0.04, s * 0.5, '#5a4a3a', { outline: false });
      draw(cx - s * 0.12, cy - s * 0.1, s * 0.26, '#8a3b2a');
      draw(cx + s * 0.24, cy + s * 0.14, s * 0.2, '#6e3326');
      break;
    }
    case 'farm': {
      field(ctx, cx - s * 0.12, cy + s * 0.12, s * 0.42, '#4a3d1a', '#d9b44a');
      isoBox(ctx, cx + s * 0.32, cy - s * 0.18, s * 0.17, s * 0.2, '#7a3b2a');
      gableRoof(ctx, cx + s * 0.32, cy - s * 0.18, s * 0.17, s * 0.2, s * 0.14, '#4a3626');
      ellipse(ctx, cx + s * 0.42, cy + s * 0.1, s * 0.09, s * 0.05, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = '#d8b450';
      ctx.beginPath();
      ctx.ellipse(cx + s * 0.42, cy + s * 0.06, s * 0.08, s * 0.1, 0, Math.PI, 0);
      ctx.fill();
      break;
    }
    case 'lumber': {
      isoBox(ctx, cx + s * 0.15, cy - s * 0.12, s * 0.2, s * 0.22, '#6b5236');
      gableRoof(ctx, cx + s * 0.15, cy - s * 0.12, s * 0.2, s * 0.22, s * 0.15, '#3f5a3a');
      for (let row = 0; row < 3; row++) {
        for (let i = 0; i < 3 - row; i++) {
          log(ctx, cx - s * 0.2 + i * s * 0.03 + row * s * 0.02, cy + s * 0.18 - row * s * 0.1 + i * s * 0.02, s * 0.4, s * 0.05);
        }
      }
      ellipse(ctx, cx + s * 0.35, cy + s * 0.25, s * 0.08, s * 0.05, '#c49a62');
      break;
    }
    case 'quarry': {
      poly(ctx, [cx - s * 0.4, cy + s * 0.05, cx - s * 0.05, cy + s * 0.28, cx + s * 0.3, cy + s * 0.08, cx - s * 0.05, cy - s * 0.12], '#2a2b2e', 'rgba(0,0,0,0.6)');
      isoBox(ctx, cx + s * 0.25, cy - s * 0.15, s * 0.14, s * 0.14, '#9a9a92');
      isoBox(ctx, cx + s * 0.38, cy + s * 0.05, s * 0.1, s * 0.1, '#8a8a82');
      isoBox(ctx, cx - s * 0.32, cy - s * 0.12, s * 0.12, s * 0.2, '#a3a39a');
      ctx.strokeStyle = '#6b4a2a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.05, cy - s * 0.05);
      ctx.lineTo(cx - s * 0.05, cy - s * 0.75);
      ctx.lineTo(cx + s * 0.3, cy - s * 0.6);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(200,200,200,0.6)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.3, cy - s * 0.6);
      ctx.lineTo(cx + s * 0.3, cy - s * 0.35);
      ctx.stroke();
      break;
    }
    case 'mine': {
      ctx.fillStyle = '#4a4f57';
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.5, cy + s * 0.05);
      ctx.bezierCurveTo(cx - s * 0.4, cy - s * 0.75, cx + s * 0.35, cy - s * 0.8, cx + s * 0.48, cy + s * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.stroke();
      ctx.fillStyle = '#07080a';
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.14, cy);
      ctx.lineTo(cx - s * 0.14, cy - s * 0.24);
      ctx.quadraticCurveTo(cx, cy - s * 0.36, cx + s * 0.14, cy - s * 0.24);
      ctx.lineTo(cx + s * 0.14, cy);
      ctx.fill();
      ctx.strokeStyle = '#7a5530';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.16, cy);
      ctx.lineTo(cx - s * 0.16, cy - s * 0.28);
      ctx.lineTo(cx + s * 0.16, cy - s * 0.28);
      ctx.lineTo(cx + s * 0.16, cy);
      ctx.stroke();
      ctx.strokeStyle = '#5a4a3a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.06, cy);
      ctx.lineTo(cx - s * 0.18, cy + s * 0.3);
      ctx.moveTo(cx + s * 0.06, cy);
      ctx.lineTo(cx + s * 0.1, cy + s * 0.3);
      ctx.stroke();
      isoBox(ctx, cx - s * 0.04, cy + s * 0.2, s * 0.1, s * 0.07, '#5a4030');
      glow(ctx, cx - s * 0.04, cy + s * 0.12, s * 0.2, '#ffd25a', 0.5);
      for (let i = 0; i < 4; i++) ellipse(ctx, cx - s * 0.08 + i * s * 0.03, cy + s * 0.13 - (i % 2) * 2, 2.4, 2, '#ffd25a');
      lantern(ctx, cx + s * 0.22, cy - s * 0.22, s);
      break;
    }
    case 'port': {
      const dir = o.waterDir ?? 1;
      const ang = (dir * 60 * Math.PI) / 180;
      const dx = Math.cos(ang);
      const dy = Math.sin(ang) * ISO;
      const len = s * 1.0;
      const w = s * 0.12;
      const nx = -dy;
      const ny = dx;
      const nl = Math.hypot(nx, ny);
      const px = (nx / nl) * w;
      const py = (ny / nl) * w;
      const x0 = cx + dx * s * 0.1;
      const y0 = cy + dy * s * 0.1;
      const x1 = cx + dx * len;
      const y1 = cy + dy * len + 6;
      const part = o.part ?? 'all';
      if (part !== 'house') {
      poly(ctx, [x0 + px, y0 + py, x1 + px, y1 + py, x1 - px, y1 - py, x0 - px, y0 - py], '#7a5a36', 'rgba(20,10,4,0.9)', 1);
      ctx.strokeStyle = 'rgba(30,18,8,0.7)';
      ctx.lineWidth = 0.8;
      for (let i = 1; i < 7; i++) {
        const t2 = i / 7;
        const x = x0 + (x1 - x0) * t2;
        const y = y0 + (y1 - y0) * t2;
        ctx.beginPath();
        ctx.moveTo(x + px, y + py);
        ctx.lineTo(x - px, y - py);
        ctx.stroke();
      }
      // navire
      const bx = x1 + px * 2.6;
      const by = y1 + py * 2.6 + 4;
      ctx.fillStyle = '#4a2e1a';
      ctx.beginPath();
      ctx.moveTo(bx - s * 0.28, by - s * 0.08);
      ctx.quadraticCurveTo(bx, by + s * 0.12, bx + s * 0.28, by - s * 0.08);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#2a1a0e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx, by - s * 0.05);
      ctx.lineTo(bx, by - s * 0.65);
      ctx.stroke();
      poly(ctx, [bx + 2, by - s * 0.62, bx + s * 0.25, by - s * 0.18, bx + 2, by - s * 0.14], '#e8dcc0', 'rgba(0,0,0,0.4)', 0.8);
      poly(ctx, [bx - 2, by - s * 0.55, bx - s * 0.2, by - s * 0.16, bx - 2, by - s * 0.14], '#d6c8a8', 'rgba(0,0,0,0.4)', 0.8);
      lantern(ctx, x1, y1 - 8, s);
      }
      if (part !== 'dock') {
        isoBox(ctx, cx - dx * s * 0.2, cy - dy * s * 0.2 - 2, s * 0.22, s * 0.24, '#7d6a52');
        gableRoof(ctx, cx - dx * s * 0.2, cy - dy * s * 0.2 - 2, s * 0.22, s * 0.24, s * 0.16, '#2f5866');
      }
      break;
    }
    case 'market': {
      const stall = (x: number, y: number, c1: string, c2: string) => {
        isoBox(ctx, x, y, s * 0.13, s * 0.1, '#6b4f30');
        const a = s * 0.17;
        const yy = y - s * 0.3;
        const b = a * ISO;
        poly(ctx, [x - a, yy, x, yy + b, x + a, yy, x, yy - b - 6], c1, 'rgba(0,0,0,0.7)', 1);
        poly(ctx, [x - a * 0.5, yy + b * 0.5 - 1, x, yy + b, x, yy - b - 6, x - a * 0.5, yy - b * 0.5 - 4], c2);
        ctx.strokeStyle = '#3a2a1a';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x - a * 0.9, yy + 2);
        ctx.lineTo(x - a * 0.9, y - 2);
        ctx.moveTo(x + a * 0.9, yy + 2);
        ctx.lineTo(x + a * 0.9, y - 2);
        ctx.stroke();
      };
      stall(cx - s * 0.18, cy - s * 0.18, '#b8322a', '#f0e0c0');
      stall(cx + s * 0.25, cy - s * 0.05, '#2a6ab8', '#f0e0c0');
      stall(cx - s * 0.05, cy + s * 0.2, '#d9a43a', '#f6ecd0');
      lantern(ctx, cx + s * 0.05, cy - s * 0.3, s);
      for (let i = 0; i < 3; i++) ellipse(ctx, cx + s * 0.3 + i * 4, cy + s * 0.28, 3, 3, '#8a5a2a');
      break;
    }
    case 'auction': {
      isoBox(ctx, cx, cy + s * 0.12, s * 0.56, 5, '#8a8478');
      isoBox(ctx, cx, cy + s * 0.08, s * 0.42, s * 0.36, '#cbbf9f');
      // colonnes
      for (let i = 0; i < 4; i++) {
        const x = cx - s * 0.38 + i * s * 0.11;
        const y = cy + s * 0.08 + (x - (cx - s * 0.42)) * ISO;
        ctx.fillStyle = '#efe6cc';
        ctx.fillRect(x, y - s * 0.34, s * 0.04, s * 0.3);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.strokeRect(x, y - s * 0.34, s * 0.04, s * 0.3);
      }
      const dy = cy + s * 0.08 - s * 0.36;
      const dg = ctx.createRadialGradient(cx - s * 0.1, dy - s * 0.35, 2, cx, dy - s * 0.1, s * 0.35);
      dg.addColorStop(0, '#fff0b0');
      dg.addColorStop(0.5, '#e0a832');
      dg.addColorStop(1, '#7a4f10');
      ctx.fillStyle = dg;
      ctx.beginPath();
      ctx.ellipse(cx, dy, s * 0.26, s * 0.3, 0, Math.PI, 0);
      ctx.fill();
      ctx.strokeStyle = 'rgba(60,30,5,0.9)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ellipse(ctx, cx, dy, s * 0.26, s * 0.26 * ISO * 0.5, '#b58424');
      glow(ctx, cx, dy - s * 0.3, s * 0.5, '#ffd25a', 0.35);
      flag(ctx, cx, dy - s * 0.28, s * 0.25, '#e0b048', t);
      glow(ctx, cx, cy, s * 0.7, '#ffd25a', 0.12);
      break;
    }
    case 'tavern': {
      isoBox(ctx, cx, cy + s * 0.05, s * 0.34, s * 0.3, '#7b5d3e');
      gableRoof(ctx, cx, cy + s * 0.05, s * 0.34, s * 0.3, s * 0.24, '#5a2e22');
      isoBox(ctx, cx + s * 0.18, cy - s * 0.5, s * 0.04, s * 0.3, '#5a4a3a', { outline: false });
      windowGlow(ctx, cx - s * 0.3, cy - s * 0.08, s * 0.09, s * 0.12, 'L', WARM);
      windowGlow(ctx, cx - s * 0.12, cy + s * 0.02, s * 0.09, s * 0.12, 'L', WARM);
      ctx.strokeStyle = '#3a2a1a';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.38, cy - s * 0.15);
      ctx.lineTo(cx + s * 0.52, cy - s * 0.15);
      ctx.stroke();
      poly(ctx, [cx + s * 0.44, cy - s * 0.14, cx + s * 0.56, cy - s * 0.1, cx + s * 0.56, cy + s * 0.0, cx + s * 0.44, cy - s * 0.04], '#c08a3a', 'rgba(0,0,0,0.7)');
      for (let i = 0; i < 2; i++) {
        ellipse(ctx, cx - s * 0.42 + i * s * 0.12, cy + s * 0.26, s * 0.05, s * 0.07, '#7a4f2a');
      }
      lantern(ctx, cx + s * 0.3, cy + s * 0.15, s);
      break;
    }
    case 'barracks': {
      isoBox(ctx, cx, cy + s * 0.08, s * 0.5, s * 0.18, '#6d6a62');
      tower(ctx, cx - s * 0.3, cy - s * 0.05, s * 0.12, s * 0.48, '#7a766c', '#7a2a22', s * 0.22);
      isoBox(ctx, cx + s * 0.12, cy - s * 0.05, s * 0.26, s * 0.3, '#857f72');
      hipRoof(ctx, cx + s * 0.12, cy - s * 0.05, s * 0.26, s * 0.3, s * 0.18, '#7a2a22');
      flag(ctx, cx + s * 0.45, cy + s * 0.05, s * 0.55, '#c0392b', t);
      flag(ctx, cx - s * 0.3, cy - s * 0.75, s * 0.25, '#c0392b', t + 2);
      // mannequin
      ctx.strokeStyle = '#8a6a3a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.05, cy + s * 0.32);
      ctx.lineTo(cx + s * 0.05, cy + s * 0.12);
      ctx.moveTo(cx - s * 0.03, cy + s * 0.18);
      ctx.lineTo(cx + s * 0.13, cy + s * 0.18);
      ctx.stroke();
      ellipse(ctx, cx + s * 0.05, cy + s * 0.09, 3, 3, '#c8a86a');
      break;
    }
    case 'forge': {
      isoBox(ctx, cx, cy + s * 0.05, s * 0.36, s * 0.3, '#56524c');
      hipRoof(ctx, cx, cy + s * 0.05, s * 0.36, s * 0.3, s * 0.18, '#3a3634');
      isoBox(ctx, cx + s * 0.2, cy - s * 0.32, s * 0.07, s * 0.5, '#4a4642');
      glow(ctx, cx + s * 0.05, cy + s * 0.05, s * 0.55, '#ff7a2a', 0.55);
      poly(ctx, [cx + s * 0.02, cy + s * 0.22, cx + s * 0.18, cy + s * 0.14, cx + s * 0.18, cy - s * 0.02, cx + s * 0.02, cy + s * 0.06], '#ff9a3a', 'rgba(0,0,0,0.8)');
      ctx.fillStyle = '#2a2a2e';
      ctx.fillRect(cx - s * 0.42, cy + s * 0.18, s * 0.14, s * 0.05);
      ctx.fillRect(cx - s * 0.38, cy + s * 0.22, s * 0.06, s * 0.08);
      break;
    }
    case 'shrine': {
      const rx = s * 0.42;
      const ry = rx * ISO;
      const stones: [number, number][] = [];
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + 0.3;
        stones.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
      }
      stones.sort((a, b) => a[1] - b[1]);
      const back = stones.filter((p) => p[1] <= cy);
      const front = stones.filter((p) => p[1] > cy);
      const stone = (x: number, y: number) => {
        poly(ctx, [x - 3.5, y, x - 3, y - 12, x + 1, y - 15, x + 3.5, y - 10, x + 3.5, y], '#7a8a84', 'rgba(0,0,0,0.6)', 0.8);
        ctx.fillStyle = rgba('#7affc0', 0.7);
        ctx.fillRect(x - 1, y - 9, 2, 3);
      };
      back.forEach(([x, y]) => stone(x, y));
      ellipse(ctx, cx, cy, rx * 0.6, ry * 0.6, 'rgba(122,255,192,0.18)');
      // faisceau lumineux
      const beam = ctx.createLinearGradient(0, cy - s * 2.2, 0, cy);
      beam.addColorStop(0, 'rgba(122,255,192,0)');
      beam.addColorStop(1, 'rgba(122,255,192,0.35)');
      ctx.fillStyle = beam;
      ctx.fillRect(cx - s * 0.06, cy - s * 2.2, s * 0.12, s * 2.2);
      glow(ctx, cx, cy - s * 0.4, s * 0.7, '#7affc0', 0.5);
      const ob = (sc: number, ox: number) => {
        poly(ctx, [cx + ox - s * 0.07 * sc, cy, cx + ox, cy - s * 0.8 * sc, cx + ox + s * 0.07 * sc, cy, cx + ox, cy + s * 0.04], '#bfffe6', 'rgba(0,60,40,0.8)', 1);
        poly(ctx, [cx + ox, cy - s * 0.8 * sc, cx + ox + s * 0.07 * sc, cy, cx + ox, cy + s * 0.04], '#4fd9a0');
      };
      ob(1, 0);
      ob(0.55, -s * 0.12);
      front.forEach(([x, y]) => stone(x, y));
      break;
    }
    case 'academy': {
      isoBox(ctx, cx - s * 0.18, cy + s * 0.12, s * 0.24, s * 0.22, '#7c7f8f');
      hipRoof(ctx, cx - s * 0.18, cy + s * 0.12, s * 0.24, s * 0.22, s * 0.14, '#3a3f78');
      tower(ctx, cx + s * 0.14, cy - s * 0.05, s * 0.16, s * 0.95, '#8c8fa0', '#3a3f78', s * 0.4);
      const oy = cy - s * 0.05 - s * 1.5;
      glow(ctx, cx + s * 0.14, oy, s * 0.6, '#6ab8ff', 0.6);
      ellipse(ctx, cx + s * 0.14, oy, s * 0.08, s * 0.08, '#d6f0ff');
      windowGlow(ctx, cx + s * 0.06, cy - s * 0.45, s * 0.06, s * 0.12, 'L', '#8fd0ff');
      windowGlow(ctx, cx - s * 0.36, cy + s * 0.02, s * 0.07, s * 0.1, 'L', '#8fd0ff');
      break;
    }
    case 'warehouse': {
      isoBox(ctx, cx - s * 0.1, cy + s * 0.1, s * 0.4, s * 0.26, '#8a6a46');
      gableRoof(ctx, cx - s * 0.1, cy + s * 0.1, s * 0.4, s * 0.26, s * 0.2, '#5b4636');
      windowGlow(ctx, cx - s * 0.32, cy - s * 0.02, s * 0.09, s * 0.1, 'L', WARM);
      poly(ctx, [cx - s * 0.08, cy + s * 0.28, cx + s * 0.05, cy + s * 0.34, cx + s * 0.05, cy + s * 0.12, cx - s * 0.08, cy + s * 0.06], '#4a3426', 'rgba(0,0,0,0.7)');
      isoBox(ctx, cx + s * 0.38, cy + s * 0.2, s * 0.1, s * 0.1, '#b08a52');
      isoBox(ctx, cx + s * 0.5, cy + s * 0.08, s * 0.08, s * 0.1, '#c49a5a');
      isoBox(ctx, cx + s * 0.44, cy + s * 0.04, s * 0.07, s * 0.08, '#d6b06a');
      ellipse(ctx, cx - s * 0.5, cy + s * 0.3, s * 0.06, s * 0.08, '#7a4f2a');
      ellipse(ctx, cx - s * 0.4, cy + s * 0.36, s * 0.06, s * 0.08, '#6a4222');
      lantern(ctx, cx + s * 0.26, cy + s * 0.12, s);
      break;
    }
    case 'observatory': {
      isoBox(ctx, cx, cy + s * 0.14, s * 0.4, s * 0.14, '#6a6e84');
      tower(ctx, cx, cy + s * 0.04, s * 0.2, s * 0.62, '#8d90a6', '#2c3566', 0);
      const top = cy + s * 0.04 - s * 0.62;
      // coupole et fente de visée
      ellipse(ctx, cx, top, s * 0.24, s * 0.18, '#35458c');
      ellipse(ctx, cx, top - s * 0.06, s * 0.2, s * 0.13, '#4a5cb0');
      poly(ctx, [cx + s * 0.02, top - s * 0.18, cx + s * 0.08, top - s * 0.16, cx + s * 0.06, top + s * 0.02, cx + s * 0.0, top + s * 0.0], '#0d1330');
      ctx.strokeStyle = '#d6e4ff';
      ctx.lineWidth = Math.max(2, s * 0.045);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.03, top - s * 0.08);
      ctx.lineTo(cx + s * 0.22, top - s * 0.3);
      ctx.stroke();
      glow(ctx, cx + s * 0.2, top - s * 0.3, s * 0.5, '#7ab8ff', 0.55);
      windowGlow(ctx, cx - s * 0.12, cy - s * 0.08, s * 0.06, s * 0.12, 'L', '#8fd0ff');
      windowGlow(ctx, cx + s * 0.06, cy - s * 0.2, s * 0.05, s * 0.1, 'R', '#8fd0ff');
      break;
    }
    case 'menagerie': {
      const rx = s * 0.48;
      fence(ctx, cx, cy, rx, false);
      ellipse(ctx, cx, cy, rx * 0.95, rx * ISO * 0.95, 'rgba(120,90,40,0.35)');
      // créature
      const x = cx + s * 0.05;
      const y = cy + s * 0.05;
      ellipse(ctx, x, y + 2, s * 0.14, s * 0.05, 'rgba(0,0,0,0.35)');
      ellipse(ctx, x, y - s * 0.1, s * 0.15, s * 0.13, '#5ad16a');
      ellipse(ctx, x - s * 0.04, y - s * 0.13, 2.5, 3, '#fff');
      ellipse(ctx, x + s * 0.05, y - s * 0.13, 2.5, 3, '#fff');
      ellipse(ctx, x - s * 0.04, y - s * 0.12, 1.3, 1.8, '#111');
      ellipse(ctx, x + s * 0.05, y - s * 0.12, 1.3, 1.8, '#111');
      poly(ctx, [x - s * 0.05, y - s * 0.22, x - s * 0.12, y - s * 0.36, x, y - s * 0.24], '#7aff8a');
      isoBox(ctx, cx - s * 0.28, cy - s * 0.08, s * 0.1, s * 0.12, '#c8a050');
      fence(ctx, cx, cy, rx, true);
      break;
    }
  }
  ctx.restore();
  if (!o.done) drawScaffold(ctx, cx, cy, s, o.progress ?? 0);
}

function drawScaffold(ctx: Ctx, cx: number, cy: number, s: number, p: number) {
  const a = s * 0.42;
  const b = a * ISO;
  const h = s * 0.6;
  ctx.save();
  ctx.strokeStyle = '#a5773f';
  ctx.lineWidth = 1.6;
  const pts = [
    [cx - a, cy],
    [cx, cy + b],
    [cx + a, cy],
  ];
  for (const [x, y] of pts) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - h);
    ctx.stroke();
  }
  for (const k of [0.45, 0.9]) {
    ctx.beginPath();
    ctx.moveTo(cx - a, cy - h * k);
    ctx.lineTo(cx, cy + b - h * k);
    ctx.lineTo(cx + a, cy - h * k);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx - a, cy);
  ctx.lineTo(cx, cy + b - h * 0.45);
  ctx.moveTo(cx, cy + b);
  ctx.lineTo(cx + a, cy - h * 0.45);
  ctx.stroke();
  // jauge d'avancement
  const w = s * 0.7;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(cx - w / 2, cy - h - 12, w, 5);
  ctx.fillStyle = '#ffcf6a';
  ctx.fillRect(cx - w / 2 + 1, cy - h - 11, (w - 2) * Math.min(1, p), 3);
  ctx.restore();
}

// Icône de bâtiment pour l'interface (mise en cache en data URL).
const iconCache = new Map<string, string>();
const TALL = new Set<BuildingId>(['townhall', 'academy', 'shrine', 'port', 'observatory']);

export function buildingIcon(id: BuildingId, size = 96): string {
  const k = `${id}:${size}`;
  const hit = iconCache.get(k);
  if (hit) return hit;
  const painted = getSprite(`buildings/${id}`);
  if (painted) {
    const url = spriteDataUrl(painted, size);
    iconCache.set(k, url);
    return url;
  }
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d')!;
  const tall = TALL.has(id);
  const s = size * (tall ? 0.5 : 0.66);
  const cx = size / 2;
  const cy = size * (tall ? 0.8 : 0.7);
  drawBuilding(ctx, id, cx, cy, s, { done: true, waterDir: 1 });
  const url = c.toDataURL();
  iconCache.set(k, url);
  return url;
}
