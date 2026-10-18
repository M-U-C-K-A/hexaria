// Maths des hexagones "pointy-top" en coordonnées axiales + projection isométrique.
export interface Axial {
  q: number;
  r: number;
}

export const SQRT3 = Math.sqrt(3);

// Écrasement vertical qui donne l'effet isométrique (cf. plateau de l'arène).
export const ISO = 0.58;

export const DIRS: readonly Axial[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export const hkey = (q: number, r: number) => `${q},${r}`;

export function hexDistance(a: Axial, b: Axial): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

export function neighbors(h: Axial): Axial[] {
  return DIRS.map((d) => ({ q: h.q + d.q, r: h.r + d.r }));
}

export function hexRound(fq: number, fr: number): Axial {
  const fs = -fq - fr;
  let q = Math.round(fq);
  let r = Math.round(fr);
  const s = Math.round(fs);
  const dq = Math.abs(q - fq);
  const dr = Math.abs(r - fr);
  const ds = Math.abs(s - fs);
  if (dq > dr && dq > ds) q = -r - s;
  else if (dr > ds) r = -q - s;
  return { q, r };
}

// Centre d'un hexagone dans le plan "monde" (avant écrasement iso).
export function axialToWorld(q: number, r: number, size: number) {
  return { x: size * SQRT3 * (q + r / 2), y: size * 1.5 * r };
}

export function worldToAxial(x: number, y: number, size: number): Axial {
  const q = ((SQRT3 / 3) * x - (1 / 3) * y) / size;
  const r = ((2 / 3) * y) / size;
  return hexRound(q, r);
}

// Coins d'un hexagone écrasé : 0 = haut-droite, 1 = bas-droite, 2 = bas, 3 = bas-gauche, 4 = haut-gauche, 5 = haut.
export function hexCorners(cx: number, cy: number, size: number, squash = ISO) {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const a = ((60 * i - 30) * Math.PI) / 180;
    pts.push({ x: cx + size * Math.cos(a), y: cy + size * Math.sin(a) * squash });
  }
  return pts;
}

export function tracePoly(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

export function pointInPoly(px: number, py: number, pts: { x: number; y: number }[]) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x;
    const yi = pts[i].y;
    const xj = pts[j].x;
    const yj = pts[j].y;
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Plateau de l'arène en coordonnées "offset" (lignes impaires décalées) -> axial pour les distances.
export function offsetToAxial(col: number, row: number): Axial {
  return { q: col - (row - (row & 1)) / 2, r: row };
}

export function offsetDistance(c1: number, r1: number, c2: number, r2: number) {
  return hexDistance(offsetToAxial(c1, r1), offsetToAxial(c2, r2));
}

export function offsetNeighbors(col: number, row: number): { col: number; row: number }[] {
  const odd = row & 1;
  const deltas = odd
    ? [[1, 0], [-1, 0], [0, -1], [1, -1], [0, 1], [1, 1]]
    : [[1, 0], [-1, 0], [-1, -1], [0, -1], [-1, 1], [0, 1]];
  return deltas.map(([dc, dr]) => ({ col: col + dc, row: row + dr }));
}
