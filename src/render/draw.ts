import { ISO } from '../core/hex';

export type Ctx = CanvasRenderingContext2D;

// ——— Couleurs ———
function parseHex(c: string): [number, number, number] {
  if (c.startsWith('rgb')) {
    const m = c.match(/[\d.]+/g) ?? ['0', '0', '0'];
    return [Math.round(+m[0]), Math.round(+m[1]), Math.round(+m[2])];
  }
  const h = c.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(c: string, a: number) {
  const [r, g, b] = parseHex(c);
  return `rgba(${r},${g},${b},${a})`;
}

export function shade(c: string, amt: number) {
  const [r, g, b] = parseHex(c);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

export function mix(a: string, b: string, t: number) {
  const A = parseHex(a);
  const B = parseHex(b);
  const m = (i: number) => Math.round(A[i] + (B[i] - A[i]) * t);
  return `rgb(${m(0)},${m(1)},${m(2)})`;
}

// ——— Primitives ———
export function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
  ctx.fill();
}

export function glow(ctx: Ctx, x: number, y: number, r: number, color: string, alpha = 0.6) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.4, rgba(color, alpha * 0.35));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function poly(ctx: Ctx, pts: number[], fill?: string, stroke?: string, lw = 1) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

const OUT = 'rgba(6,14,12,0.85)';

// Pavé isométrique dont (cx, cy) est le centre de l'emprise au sol ; a = demi-largeur, h = hauteur.
export function isoBox(ctx: Ctx, cx: number, cy: number, a: number, h: number, col: string, opts: { top?: string; k?: number; outline?: boolean } = {}) {
  const k = opts.k ?? ISO;
  const b = a * k;
  const L = [cx - a, cy];
  const B = [cx, cy + b];
  const R = [cx + a, cy];
  const T = [cx, cy - b];
  poly(ctx, [L[0], L[1], B[0], B[1], B[0], B[1] - h, L[0], L[1] - h], shade(col, -0.18));
  poly(ctx, [B[0], B[1], R[0], R[1], R[0], R[1] - h, B[0], B[1] - h], shade(col, -0.42));
  poly(ctx, [L[0], L[1] - h, B[0], B[1] - h, R[0], R[1] - h, T[0], T[1] - h], opts.top ?? shade(col, 0.08));
  if (opts.outline !== false) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(L[0], L[1]);
    ctx.lineTo(B[0], B[1]);
    ctx.lineTo(R[0], R[1]);
    ctx.lineTo(R[0], R[1] - h);
    ctx.lineTo(T[0], T[1] - h);
    ctx.lineTo(L[0], L[1] - h);
    ctx.closePath();
    ctx.moveTo(L[0], L[1] - h);
    ctx.lineTo(B[0], B[1] - h);
    ctx.lineTo(R[0], R[1] - h);
    ctx.moveTo(B[0], B[1] - h);
    ctx.lineTo(B[0], B[1]);
    ctx.stroke();
  }
}

// Toit en pyramide au-dessus d'un pavé (cy = base de l'emprise, h = hauteur des murs).
export function hipRoof(ctx: Ctx, cx: number, cy: number, a: number, h: number, rh: number, col: string, over = 1.12) {
  const k = ISO;
  const A = a * over;
  const b = A * k;
  const y = cy - h;
  const apex = [cx, y - rh];
  const L = [cx - A, y];
  const B = [cx, y + b];
  const R = [cx + A, y];
  const T = [cx, y - b];
  poly(ctx, [T[0], T[1], L[0], L[1], apex[0], apex[1]], shade(col, 0.12));
  poly(ctx, [T[0], T[1], R[0], R[1], apex[0], apex[1]], shade(col, -0.2));
  poly(ctx, [L[0], L[1], B[0], B[1], apex[0], apex[1]], shade(col, -0.05), OUT, 1.1);
  poly(ctx, [B[0], B[1], R[0], R[1], apex[0], apex[1]], shade(col, -0.38), OUT, 1.1);
}

// Toit à deux pans, faîtage orienté gauche-droite.
export function gableRoof(ctx: Ctx, cx: number, cy: number, a: number, h: number, rh: number, col: string) {
  const k = ISO;
  const A = a * 1.12;
  const b = A * k;
  const y = cy - h;
  const L = [cx - A, y];
  const B = [cx, y + b];
  const R = [cx + A, y];
  const T = [cx, y - b];
  const r1 = [(L[0] + T[0]) / 2, (L[1] + T[1]) / 2 - rh];
  const r2 = [(B[0] + R[0]) / 2, (B[1] + R[1]) / 2 - rh];
  poly(ctx, [T[0], T[1], R[0], R[1], r2[0], r2[1], r1[0], r1[1]], shade(col, -0.25), OUT, 1);
  poly(ctx, [L[0], L[1], B[0], B[1], r2[0], r2[1], r1[0], r1[1]], shade(col, 0.02), OUT, 1.1);
  poly(ctx, [B[0], B[1], R[0], R[1], r2[0], r2[1]], shade(col, -0.45), OUT, 1.1);
}

// Tour cylindrique avec toit conique.
export function tower(ctx: Ctx, cx: number, cy: number, r: number, h: number, col: string, roof: string, rh: number) {
  const ry = r * ISO;
  const g = ctx.createLinearGradient(cx - r, 0, cx + r, 0);
  g.addColorStop(0, shade(col, -0.1));
  g.addColorStop(0.45, shade(col, 0.12));
  g.addColorStop(1, shade(col, -0.5));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - r, cy - h);
  ctx.lineTo(cx - r, cy);
  ctx.ellipse(cx, cy, r, ry, 0, Math.PI, 0, true);
  ctx.lineTo(cx + r, cy - h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.1;
  ctx.stroke();
  ellipse(ctx, cx, cy - h, r, ry, shade(col, 0.05));
  if (rh > 0) {
    const R = r * 1.25;
    const rg = ctx.createLinearGradient(cx - R, 0, cx + R, 0);
    rg.addColorStop(0, shade(roof, 0.1));
    rg.addColorStop(0.5, shade(roof, 0.2));
    rg.addColorStop(1, shade(roof, -0.45));
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.moveTo(cx, cy - h - rh);
    ctx.lineTo(cx - R, cy - h);
    ctx.ellipse(cx, cy - h, R, R * ISO, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

// Fenêtre lumineuse sur une face (gauche ou droite) d'un pavé.
export function windowGlow(ctx: Ctx, x: number, y: number, w: number, h: number, face: 'L' | 'R', color = '#ffc76a') {
  const skew = (face === 'L' ? 1 : -1) * w * ISO;
  glow(ctx, x + w / 2, y - h / 2 + skew / 2, w * 2.2, color, 0.35);
  poly(ctx, [x, y, x + w, y + skew, x + w, y + skew - h, x, y - h], color, 'rgba(40,20,5,0.8)', 0.8);
}

export function flag(ctx: Ctx, x: number, y: number, h: number, color: string, t = 0) {
  ctx.strokeStyle = '#2b2118';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - h);
  ctx.stroke();
  const w = h * 0.55;
  const wave = Math.sin(t * 3) * 2;
  poly(ctx, [x, y - h, x + w, y - h + 3 + wave, x, y - h + h * 0.38], color, 'rgba(0,0,0,0.5)', 0.8);
}

// Petit canvas hors écran pour mettre en cache des sprites.
export function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w);
  c.height = Math.ceil(h);
  return c;
}
