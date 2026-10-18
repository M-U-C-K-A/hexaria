// Décor d'arène procédural en couches : muraille en ruines, dallage circulaire, grands arbres, lanternes,
// cristaux, champignons, premier plan sombre. Quatre ambiances selon l'arène (marais violet, grotte, bord de mer, antre).
import { RNG } from '../core/rng';
import { type Ctx, ellipse, glow, makeCanvas, mix, poly, rgba, shade } from './draw';
import { type Sprite, drawCover } from './sprites';
import { conifer, crystalCluster, mushroom, roundTree } from './terrainArt';

export type ArenaTheme = 'marsh' | 'cave' | 'sea' | 'lair';
export const ARENA_THEMES: ArenaTheme[] = ['marsh', 'cave', 'sea', 'lair'];

interface Pal {
  skyTop: string;
  skyBot: string;
  wall: string;
  floor: string;
  floorRim: string;
  fog: string;
  accent: string;
  light: string;
  leaf: string;
  leafRim: string;
  rune: string;
}

const PAL: Record<ArenaTheme, Pal> = {
  marsh: { skyTop: '#0a1820', skyBot: '#1d3d44', wall: '#434850', floor: '#4a5459', floorRim: '#6d7a78', fog: '#7affc8', accent: '#2fd3a0', light: '#ffb050', leaf: '#4a2a66', leafRim: '#d070ff', rune: '#7affc0' },
  cave: { skyTop: '#07050f', skyBot: '#1b1030', wall: '#2c2442', floor: '#3b3652', floorRim: '#5a5478', fog: '#a070ff', accent: '#ffbf4a', light: '#ffcf70', leaf: '#201838', leafRim: '#8a6aff', rune: '#ffcf70' },
  sea: { skyTop: '#040a18', skyBot: '#103048', wall: '#3a4654', floor: '#3f4d5c', floorRim: '#667a8a', fog: '#6ae0ff', accent: '#6ae0ff', light: '#7ae8ff', leaf: '#143a4a', leafRim: '#5affd0', rune: '#6ae0ff' },
  lair: { skyTop: '#080a06', skyBot: '#26301c', wall: '#363a2c', floor: '#33382c', floorRim: '#566048', fog: '#b4ff5a', accent: '#b4ff5a', light: '#ff7a3a', leaf: '#16220f', leafRim: '#8aff4a', rune: '#ff5a2a' },
};

export interface Light {
  x: number;
  y: number;
  r: number;
  color: string;
  phase: number;
}

export interface Backdrop {
  img: HTMLCanvasElement;
  lights: Light[];
  theme: ArenaTheme;
  pal: Pal;
  W: number;
  H: number;
  cx: number;
  cy: number;
  hs: number;
}

function jitter(c: string, rng: RNG, amt: number) {
  return shade(c, rng.range(-amt, amt));
}

function bricks(ctx: Ctx, x0: number, y0: number, w: number, h: number, bw: number, bh: number, col: string, rng: RNG) {
  for (let r = 0; r * bh < h; r++) {
    const off = (r % 2) * bw * 0.5;
    for (let x = x0 - off; x < x0 + w; x += bw) {
      const x1 = Math.max(x0, x);
      const x2 = Math.min(x0 + w, x + bw);
      if (x2 <= x1) continue;
      const y = y0 + r * bh;
      ctx.fillStyle = jitter(col, rng, 0.1);
      ctx.fillRect(x1 + 0.5, y + 0.5, x2 - x1 - 1, Math.min(bh, y0 + h - y) - 1);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(x1 + 0.5, y + 0.5, x2 - x1 - 1, 2);
    }
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1;
  for (let r = 0; r * bh < h; r++) {
    ctx.beginPath();
    ctx.moveTo(x0, y0 + r * bh);
    ctx.lineTo(x0 + w, y0 + r * bh);
    ctx.stroke();
  }
}

function pillar(ctx: Ctx, x: number, yBase: number, w: number, h: number, col: string) {
  const g = ctx.createLinearGradient(x - w, 0, x + w, 0);
  g.addColorStop(0, shade(col, 0.12));
  g.addColorStop(0.5, shade(col, 0.22));
  g.addColorStop(1, shade(col, -0.45));
  ctx.fillStyle = g;
  ctx.fillRect(x - w / 2, yBase - h, w, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x - w / 2, yBase - h, w, h);
  ctx.fillStyle = shade(col, 0.1);
  ctx.fillRect(x - w * 0.72, yBase - h - w * 0.28, w * 1.44, w * 0.3);
  ctx.fillRect(x - w * 0.7, yBase - w * 0.2, w * 1.4, w * 0.22);
  ctx.strokeRect(x - w * 0.72, yBase - h - w * 0.28, w * 1.44, w * 0.3);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + (w * i) / 4, yBase - h);
    ctx.lineTo(x - w / 2 + (w * i) / 4, yBase);
    ctx.stroke();
  }
}

function archOpening(ctx: Ctx, x: number, yBase: number, w: number, h: number, pal: Pal, lights: Light[], rng: RNG) {
  const g = ctx.createLinearGradient(0, yBase - h, 0, yBase);
  g.addColorStop(0, '#05080a');
  g.addColorStop(1, mix('#05080a', pal.skyBot, 0.5));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, yBase);
  ctx.lineTo(x - w / 2, yBase - h + w / 2);
  ctx.arc(x, yBase - h + w / 2, w / 2, Math.PI, 0);
  ctx.lineTo(x + w / 2, yBase);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = shade(pal.wall, 0.18);
  ctx.lineWidth = Math.max(3, w * 0.1);
  ctx.stroke();
  glow(ctx, x, yBase - h * 0.35, w * 0.9, pal.fog, 0.18);
  if (rng.chance(0.5)) lights.push({ x, y: yBase - h * 0.3, r: w * 1.4, color: pal.light, phase: rng.range(0, 6) });
}

function banner(ctx: Ctx, x: number, y: number, w: number, h: number, col: string) {
  ctx.strokeStyle = '#2a1e14';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.62, y);
  ctx.lineTo(x + w * 0.62, y);
  ctx.stroke();
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  g.addColorStop(0, shade(col, 0.15));
  g.addColorStop(1, shade(col, -0.4));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y);
  ctx.lineTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h * 0.92);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x - w / 2, y + h * 0.92);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,214,130,0.85)';
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.22);
  ctx.lineTo(x + w * 0.22, y + h * 0.42);
  ctx.lineTo(x, y + h * 0.64);
  ctx.lineTo(x - w * 0.22, y + h * 0.42);
  ctx.closePath();
  ctx.fill();
}

function lanternPost(ctx: Ctx, x: number, y: number, h: number, pal: Pal, lights: Light[], rng: RNG) {
  ellipse(ctx, x, y + 2, h * 0.14, h * 0.045, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = '#1e1a18';
  ctx.fillRect(x - h * 0.03, y - h, h * 0.06, h);
  ctx.fillRect(x - h * 0.07, y - h * 0.1, h * 0.14, h * 0.1);
  const ly = y - h - h * 0.12;
  ctx.fillStyle = '#2a2220';
  ctx.fillRect(x - h * 0.1, ly - h * 0.03, h * 0.2, h * 0.04);
  glow(ctx, x, ly + h * 0.06, h * 0.9, pal.light, 0.5);
  const lg = ctx.createLinearGradient(0, ly, 0, ly + h * 0.2);
  lg.addColorStop(0, '#fff3c0');
  lg.addColorStop(1, mix(pal.light, '#ff7a20', 0.5));
  ctx.fillStyle = lg;
  ctx.fillRect(x - h * 0.07, ly, h * 0.14, h * 0.2);
  ctx.strokeStyle = '#1a1410';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x - h * 0.07, ly, h * 0.14, h * 0.2);
  poly(ctx, [x - h * 0.1, ly, x, ly - h * 0.1, x + h * 0.1, ly], '#2a2220');
  lights.push({ x, y: ly + h * 0.1, r: h * 2.2, color: pal.light, phase: rng.range(0, 6) });
}

function bigTree(ctx: Ctx, x: number, yBase: number, h: number, pal: Pal, flip: number, rng: RNG) {
  // tronc noueux + racines
  const w = h * 0.1;
  const g = ctx.createLinearGradient(x - w * 2, 0, x + w * 2, 0);
  g.addColorStop(0, '#2a1d2a');
  g.addColorStop(0.45, '#4a3446');
  g.addColorStop(1, '#120c14');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - w * 2.2, yBase);
  ctx.quadraticCurveTo(x - w * 0.9, yBase - h * 0.1, x - w, yBase - h * 0.3);
  ctx.quadraticCurveTo(x - w * 1.3 * flip, yBase - h * 0.7, x - w * 0.7, yBase - h);
  ctx.lineTo(x + w * 0.9, yBase - h);
  ctx.quadraticCurveTo(x + w * 1.2 * flip, yBase - h * 0.65, x + w * 1.1, yBase - h * 0.3);
  ctx.quadraticCurveTo(x + w * 1.0, yBase - h * 0.08, x + w * 2.4, yBase);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 9; i++) {
    const xx = x + rng.range(-w * 0.8, w * 0.8);
    ctx.beginPath();
    ctx.moveTo(xx, yBase - h * rng.range(0.05, 0.2));
    ctx.quadraticCurveTo(xx + rng.range(-8, 8), yBase - h * 0.5, xx + rng.range(-6, 6), yBase - h * rng.range(0.7, 0.98));
    ctx.stroke();
  }
  // feuillage en amas avec lumière de contre-jour
  const blobs = 16;
  for (let i = 0; i < blobs; i++) {
    const a = (i / blobs) * Math.PI * 2;
    const bx = x + Math.cos(a) * h * 0.34 * rng.range(0.6, 1.1) + flip * h * 0.08;
    const by = yBase - h * 1.05 + Math.sin(a) * h * 0.22 * rng.range(0.5, 1.1);
    const r = h * rng.range(0.16, 0.26);
    const gr = ctx.createRadialGradient(bx - r * 0.3, by - r * 0.4, 2, bx, by, r);
    gr.addColorStop(0, mix(pal.leaf, pal.leafRim, 0.25));
    gr.addColorStop(0.6, pal.leaf);
    gr.addColorStop(1, shade(pal.leaf, -0.55));
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(pal.leafRim, 0.35);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bx, by, r, Math.PI * 1.15, Math.PI * 1.75);
    ctx.stroke();
  }
  for (let i = 0; i < 26; i++) {
    const a = rng.range(0, Math.PI * 2);
    glow(ctx, x + Math.cos(a) * h * 0.4 * rng.next(), yBase - h * 1.05 + Math.sin(a) * h * 0.25 * rng.next(), rng.range(3, 7), pal.leafRim, 0.35);
  }
}

function rubble(ctx: Ctx, x: number, y: number, s: number, col: string, rng: RNG) {
  for (let i = 0; i < 5; i++) {
    const rx = x + rng.range(-s, s);
    const ry = y + rng.range(-s * 0.2, s * 0.25);
    const r = s * rng.range(0.2, 0.42);
    poly(ctx, [rx - r, ry, rx - r * 0.5, ry - r * 0.9, rx + r * 0.6, ry - r * 0.8, rx + r, ry, rx + r * 0.3, ry + r * 0.3], shade(col, rng.range(-0.1, 0.15)), 'rgba(0,0,0,0.6)', 1);
  }
}

function stalactite(ctx: Ctx, x: number, len: number, w: number, col: string) {
  const g = ctx.createLinearGradient(0, 0, 0, len);
  g.addColorStop(0, shade(col, -0.3));
  g.addColorStop(1, shade(col, 0.05));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - w, 0);
  ctx.lineTo(x + w, 0);
  ctx.lineTo(x + w * 0.1, len);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function buildBackdrop(theme: ArenaTheme, W: number, H: number, dpr: number, L: { cx: number; cy: number; hs: number }, painted: Sprite | null = null): Backdrop {
  const pal = PAL[theme];
  const rng = new RNG(theme.length * 7919 + 17);
  const c = makeCanvas(W * dpr, H * dpr);
  const ctx = c.getContext('2d')!;
  ctx.scale(dpr, dpr);
  const { cx, cy, hs } = L;
  const lights: Light[] = [];

  if (painted) {
    // Fond peint fourni : on le centre sur le plateau, puis un vignettage léger ; le jeu dessine ses propres dalles par-dessus.
    const fy = cy + hs * 0.55;
    const s = Math.max(W / painted.w, (2 * Math.max(fy, H - fy)) / painted.h, 1e-3);
    ctx.fillStyle = pal.skyTop;
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(painted.img, cx - (painted.w * s) / 2, fy - (painted.h * s) / 2, painted.w * s, painted.h * s);
    const v = ctx.createRadialGradient(W / 2, H * 0.48, Math.min(W, H) * 0.4, W / 2, H / 2, Math.max(W, H) * 0.8);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
    return { img: c, lights, theme, pal, W, H, cx, cy, hs };
  }

  // ——— ciel / fond ———
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, pal.skyTop);
  sky.addColorStop(0.55, pal.skyBot);
  sky.addColorStop(1, shade(pal.skyTop, -0.3));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  glow(ctx, cx, cy - hs * 3.2, Math.max(W, H) * 0.55, pal.fog, 0.2);

  const wallBase = cy - hs * 3.55;
  if (theme === 'cave') {
    // voûte de grotte : roche, stalactites, cristaux au plafond
    const rock = ctx.createLinearGradient(0, 0, 0, wallBase);
    rock.addColorStop(0, '#05030a');
    rock.addColorStop(1, pal.wall);
    ctx.fillStyle = rock;
    ctx.fillRect(0, 0, W, wallBase + hs * 0.2);
    for (let i = 0; i < 34; i++) stalactite(ctx, rng.range(-10, W + 10), rng.range(hs * 0.8, hs * 3.2), rng.range(hs * 0.15, hs * 0.45), pal.wall);
    for (let i = 0; i < 7; i++) crystalCluster(ctx, rng.range(W * 0.1, W * 0.9), wallBase + hs * 0.1, hs * rng.range(0.45, 0.8), pal.accent, rng);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, wallBase, W, hs * 0.18);
  } else if (theme === 'sea') {
    // horizon marin, lune, vagues
    const horizon = wallBase - hs * 0.6;
    const sea = ctx.createLinearGradient(0, horizon, 0, wallBase + hs * 0.3);
    sea.addColorStop(0, '#0a2438');
    sea.addColorStop(1, '#16445e');
    ctx.fillStyle = sea;
    ctx.fillRect(0, horizon, W, wallBase - horizon + hs * 0.3);
    glow(ctx, W * 0.72, horizon - hs * 1.6, hs * 3.2, '#dff4ff', 0.35);
    ellipse(ctx, W * 0.72, horizon - hs * 1.6, hs * 0.45, hs * 0.45, '#eaf8ff');
    ctx.strokeStyle = 'rgba(160,230,255,0.18)';
    ctx.lineWidth = 2;
    for (let k = 0; k < 14; k++) {
      const yy = horizon + 6 + k * (hs * 0.1);
      ctx.beginPath();
      for (let xx = 0; xx <= W; xx += 18) ctx.lineTo(xx, yy + Math.sin(xx * 0.03 + k) * 2.4);
      ctx.stroke();
    }
    glow(ctx, W * 0.72, horizon + hs * 0.5, hs * 2.4, '#bfeaff', 0.16);
    for (const fx of [0.12, 0.3, 0.55, 0.88]) {
      const px = W * fx;
      pillar(ctx, px, horizon + hs * 0.9, hs * 0.5, hs * rng.range(1.2, 2.2), pal.wall);
    }
  } else {
    // bandes de silhouettes d'arbres lointains
    for (let layer = 0; layer < 3; layer++) {
      const col = mix(pal.skyBot, pal.skyTop, 0.35 + layer * 0.25);
      const baseY = wallBase - hs * (1.5 - layer * 0.5);
      for (let i = 0; i < 22; i++) {
        const x = (i / 21) * (W + 60) - 30 + rng.range(-20, 20);
        const h = hs * rng.range(1.6, 3.4) * (1 - layer * 0.18);
        ctx.fillStyle = col;
        if (theme === 'lair') {
          ctx.strokeStyle = col;
          ctx.lineWidth = hs * 0.09;
          ctx.beginPath();
          ctx.moveTo(x, baseY);
          ctx.lineTo(x + rng.range(-10, 10), baseY - h);
          ctx.moveTo(x, baseY - h * 0.5);
          ctx.lineTo(x + rng.range(20, 40), baseY - h * 0.8);
          ctx.moveTo(x, baseY - h * 0.4);
          ctx.lineTo(x - rng.range(20, 40), baseY - h * 0.7);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(x - h * 0.22, baseY);
          ctx.lineTo(x, baseY - h);
          ctx.lineTo(x + h * 0.22, baseY);
          ctx.fill();
        }
      }
      ctx.fillStyle = rgba(pal.fog, 0.06);
      ctx.fillRect(0, baseY - hs * 2, W, hs * 2.6);
    }
    if (theme === 'lair') {
      glow(ctx, cx, wallBase - hs * 0.3, W * 0.5, '#ff5a2a', 0.22);
    }
  }

  // ——— muraille en ruines ———
  if (theme !== 'cave' && theme !== 'sea') {
    const wallH = hs * 1.9;
    const bw = hs * 0.62;
    const bh = hs * 0.26;
    ctx.fillStyle = shade(pal.wall, -0.5);
    ctx.fillRect(0, wallBase - wallH, W, wallH);
    bricks(ctx, 0, wallBase - wallH, W, wallH, bw, bh, shade(pal.wall, -0.25), rng);
    // brèches (ruines) : dentelures dans le haut du mur
    for (let i = 0; i < 16; i++) {
      const x = (i / 15) * W;
      const notch = rng.range(0, hs * 0.9);
      ctx.fillStyle = mix(pal.skyBot, pal.skyTop, 0.5);
      ctx.fillRect(x - hs * 0.2, wallBase - wallH, hs * rng.range(0.3, 0.7), notch);
    }
    const arches = 5;
    for (let i = 0; i < arches; i++) {
      const x = ((i + 0.5) / arches) * W;
      archOpening(ctx, x, wallBase, hs * 1.05, hs * 1.55, pal, lights, rng);
    }
    for (let i = 0; i <= arches; i++) pillar(ctx, (i / arches) * W, wallBase + hs * 0.05, hs * 0.52, wallH + hs * 0.2, pal.wall);
    ctx.fillStyle = 'rgba(70,130,60,0.45)';
    for (let i = 0; i < 22; i++) {
      const x = rng.range(0, W);
      ctx.beginPath();
      ctx.ellipse(x, wallBase - rng.range(0, hs * 0.5), rng.range(8, 26), rng.range(4, 12), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const fx of [0.16, 0.5, 0.84]) banner(ctx, W * fx, wallBase - wallH * 0.92, hs * 0.55, hs * 1.3, theme === 'lair' ? '#6a1a14' : theme === 'marsh' ? '#7a1f4a' : '#7a2a1a');
    // ombre au pied du mur
    const sh = ctx.createLinearGradient(0, wallBase - hs * 0.3, 0, wallBase + hs * 0.9);
    sh.addColorStop(0, 'rgba(0,0,0,0.55)');
    sh.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sh;
    ctx.fillRect(0, wallBase - hs * 0.3, W, hs * 1.2);
  }

  // ——— sol : terre sombre autour + plateforme circulaire pavée ———
  const ground = ctx.createLinearGradient(0, wallBase, 0, H);
  ground.addColorStop(0, shade(pal.skyBot, -0.35));
  ground.addColorStop(1, shade(pal.skyTop, -0.2));
  ctx.fillStyle = ground;
  ctx.fillRect(0, wallBase, W, H - wallBase);

  const fy = cy + hs * 0.55;
  const rx = hs * 7.6;
  const ry = hs * 4.55;
  // épaisseur de la plateforme (cylindre)
  const thick = hs * 0.55;
  ctx.fillStyle = shade(pal.floor, -0.6);
  ctx.beginPath();
  ctx.ellipse(cx, fy + thick, rx * 1.04, ry * 1.04, 0, 0, Math.PI * 2);
  ctx.fill();
  const side = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
  side.addColorStop(0, shade(pal.floor, -0.25));
  side.addColorStop(0.5, shade(pal.floor, -0.45));
  side.addColorStop(1, shade(pal.floor, -0.7));
  ctx.fillStyle = side;
  ctx.beginPath();
  ctx.ellipse(cx, fy + thick * 0.5, rx * 1.04, ry * 1.04, 0, 0, Math.PI);
  ctx.lineTo(cx - rx * 1.04, fy);
  ctx.fill();
  // dalles : anneaux × segments
  const rings = 6;
  for (let k = 0; k < rings; k++) {
    const r0 = k / rings;
    const r1 = (k + 1) / rings;
    const segs = 8 + k * 6;
    for (let j = 0; j < segs; j++) {
      const a0 = (j / segs) * Math.PI * 2 + k * 0.17;
      const a1 = ((j + 1) / segs) * Math.PI * 2 + k * 0.17;
      ctx.beginPath();
      const steps = 4;
      for (let s = 0; s <= steps; s++) {
        const a = a0 + ((a1 - a0) * s) / steps;
        ctx.lineTo(cx + Math.cos(a) * rx * r1 * 0.995, fy + Math.sin(a) * ry * r1 * 0.995);
      }
      for (let s = steps; s >= 0; s--) {
        const a = a0 + ((a1 - a0) * s) / steps;
        ctx.lineTo(cx + Math.cos(a) * rx * r0 * 1.005, fy + Math.sin(a) * ry * r0 * 1.005);
      }
      ctx.closePath();
      const lit = 0.5 + 0.5 * Math.sin(a0 - 1.2);
      ctx.fillStyle = shade(pal.floor, rng.range(-0.08, 0.08) + (lit - 0.5) * 0.12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(8,12,14,0.55)';
      ctx.lineWidth = 1.3;
      ctx.stroke();
      if (rng.chance(0.28)) {
        const mx = cx + Math.cos((a0 + a1) / 2) * rx * (r0 + r1) * 0.5;
        const my = fy + Math.sin((a0 + a1) / 2) * ry * (r0 + r1) * 0.5;
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(mx - 6, my - 3);
        ctx.lineTo(mx + 2, my + 2);
        ctx.lineTo(mx + 9, my - 1);
        ctx.stroke();
      }
    }
  }
  // lueur centrale et anneaux de runes
  glow(ctx, cx, fy, rx * 0.95, pal.rune, 0.12);
  ctx.setLineDash([hs * 0.35, hs * 0.22]);
  for (const k of [0.9, 0.66]) {
    ctx.strokeStyle = rgba(pal.rune, 0.45);
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(cx, fy, rx * k, ry * k, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // rebord de pierres
  const blocks = 46;
  for (let j = 0; j < blocks; j++) {
    const a0 = (j / blocks) * Math.PI * 2;
    const a1 = ((j + 0.92) / blocks) * Math.PI * 2;
    ctx.beginPath();
    for (let s = 0; s <= 3; s++) {
      const a = a0 + ((a1 - a0) * s) / 3;
      ctx.lineTo(cx + Math.cos(a) * rx * 1.06, fy + Math.sin(a) * ry * 1.06);
    }
    for (let s = 3; s >= 0; s--) {
      const a = a0 + ((a1 - a0) * s) / 3;
      ctx.lineTo(cx + Math.cos(a) * rx * 0.99, fy + Math.sin(a) * ry * 0.99);
    }
    ctx.closePath();
    ctx.fillStyle = shade(pal.floorRim, rng.range(-0.12, 0.1));
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  // ——— décors autour de la plateforme ———
  const around = (a: number, k = 1.18) => ({ x: cx + Math.cos(a) * rx * k, y: fy + Math.sin(a) * ry * k });
  // lanternes
  for (const a of [-0.55, Math.PI + 0.55, 0.45, Math.PI - 0.45, -1.2, Math.PI + 1.2]) {
    const p = around(a, 1.13);
    if (p.y > H - 150) continue;
    lanternPost(ctx, p.x, p.y, hs * 1.25, pal, lights, rng);
  }
  // gravats et pierres
  for (const a of [0.15, Math.PI - 0.2, -0.2, Math.PI + 0.1, 0.9, Math.PI - 0.85]) {
    const p = around(a, 1.2 + rng.range(0, 0.12));
    rubble(ctx, p.x, p.y, hs * rng.range(0.4, 0.7), pal.wall, rng);
  }
  // spécifique à l'ambiance
  const side2 = (f: (x: number, y: number, flip: number) => void) => {
    f(cx - rx * 1.32, fy + ry * 0.1, -1);
    f(cx + rx * 1.32, fy + ry * 0.05, 1);
  };
  if (theme === 'marsh') {
    side2((x, y, flip) => bigTree(ctx, x + flip * hs * 0.8, y + hs * 0.9, hs * 7.2, pal, flip, rng));
    for (const a of [Math.PI + 0.25, -0.25, Math.PI - 0.55, 0.55]) {
      const p = around(a, 1.28);
      mushroom(ctx, p.x, p.y, hs * rng.range(0.7, 1.15), rng.chance(0.5) ? '#2fd3a0' : '#3fe08a', '#9dffd9');
    }
    for (const a of [0.7, Math.PI - 0.7]) {
      const p = around(a, 1.22);
      crystalCluster(ctx, p.x, p.y, hs * 0.7, '#f2b33a', rng);
    }
  } else if (theme === 'cave') {
    for (const a of [0.35, Math.PI - 0.35, -0.5, Math.PI + 0.5, 0.95, Math.PI - 0.95, 0.05, Math.PI - 0.05]) {
      const p = around(a, 1.22 + rng.range(0, 0.18));
      crystalCluster(ctx, p.x, p.y, hs * rng.range(0.7, 1.35), rng.chance(0.7) ? '#f2b33a' : '#b08aff', rng);
    }
    for (const a of [Math.PI + 0.2, -0.2]) {
      const p = around(a, 1.3);
      mushroom(ctx, p.x, p.y, hs * 0.8, '#b070ff', '#e0b8ff');
    }
  } else if (theme === 'sea') {
    for (const a of [0.1, Math.PI - 0.1, 0.7, Math.PI - 0.7]) {
      const p = around(a, 1.22);
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = shade('#2a5a5a', rng.range(-0.1, 0.2));
        ctx.beginPath();
        ctx.ellipse(p.x + i * hs * 0.5 - hs * 0.5, p.y + rng.range(-3, 5), hs * 0.32, hs * 0.2, 0, Math.PI, 0);
        ctx.fill();
      }
      crystalCluster(ctx, p.x, p.y, hs * 0.6, '#5ae0ff', rng);
    }
    side2((x, y, flip) => conifer(ctx, x + flip * hs * 1.6, y + hs * 0.8, hs * 4.6, '#12404a'));
  } else {
    side2((x, y, flip) => {
      ctx.strokeStyle = '#0c1208';
      ctx.lineWidth = hs * 0.32;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + flip * hs * 1.2, y + hs * 0.9);
      ctx.quadraticCurveTo(x + flip * hs * 0.4, y - hs * 3, x - flip * hs * 0.4, y - hs * 5.5);
      ctx.stroke();
      ctx.lineWidth = hs * 0.14;
      ctx.beginPath();
      ctx.moveTo(x + flip * hs * 0.6, y - hs * 2.2);
      ctx.quadraticCurveTo(x - flip * hs * 1.2, y - hs * 3.2, x - flip * hs * 2, y - hs * 3.1);
      ctx.moveTo(x + flip * hs * 0.5, y - hs * 3.6);
      ctx.quadraticCurveTo(x + flip * hs * 1.6, y - hs * 4.4, x + flip * hs * 2.2, y - hs * 4.2);
      ctx.stroke();
    });
    // côtes monumentales d'un squelette + fissures de lave
    const rp = around(Math.PI + 0.35, 1.3);
    ctx.strokeStyle = '#cfc8b0';
    ctx.lineWidth = hs * 0.11;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(rp.x + i * hs * 0.34, rp.y, hs * (0.9 - Math.abs(i - 2) * 0.1), Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,90,40,0.8)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 6; i++) {
      const p = around(rng.range(0, Math.PI * 2), 0.55 + rng.range(0, 0.35));
      ctx.beginPath();
      ctx.moveTo(p.x - 14, p.y);
      ctx.lineTo(p.x, p.y + 3);
      ctx.lineTo(p.x + 10, p.y - 2);
      ctx.lineTo(p.x + 22, p.y + 4);
      ctx.stroke();
      glow(ctx, p.x, p.y, 22, '#ff5a2a', 0.4);
    }
  }

  // ——— premier plan sombre (feuillages dans les angles) ———
  for (let i = 0; i < 22; i++) {
    const left = i % 2 === 0;
    const x = left ? rng.range(-hs, hs * 2.4) : rng.range(W - hs * 2.4, W + hs);
    const y = rng.range(H * 0.45, H + hs);
    ctx.fillStyle = shade(pal.skyTop, -0.4);
    ctx.beginPath();
    ctx.ellipse(x, y, rng.range(hs * 0.5, hs * 1.4), rng.range(hs * 0.3, hs * 0.7), rng.range(-0.9, 0.9), 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 12; i++) {
    const x = rng.range(0, W);
    ctx.fillStyle = shade(pal.skyTop, -0.45);
    ctx.beginPath();
    ctx.ellipse(x, -hs * 0.2 + rng.range(-8, 8), rng.range(hs * 0.8, hs * 1.8), rng.range(hs * 0.4, hs * 0.9), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // vignettage
  const v = ctx.createRadialGradient(W / 2, H * 0.48, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.78);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.72)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);

  return { img: c, lights, theme, pal, W, H, cx, cy, hs };
}

interface Fly {
  x: number;
  y: number;
  a: number;
  s: number;
}

let flies: Fly[] = [];

// Animation par-dessus le décor : lanternes qui vacillent, luciole, brume qui dérive, rayons de lumière.
export function drawBackdropFx(ctx: Ctx, bd: Backdrop, t: number) {
  const { W, H, pal } = bd;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const l of bd.lights) {
    const f = 0.75 + 0.25 * Math.sin(t * 7 + l.phase) * Math.sin(t * 3.1 + l.phase * 2);
    glow(ctx, l.x, l.y, l.r * (0.9 + 0.1 * f), l.color, 0.22 * f);
  }
  if (flies.length === 0) {
    for (let i = 0; i < 36; i++) flies.push({ x: Math.random() * W, y: H * (0.2 + Math.random() * 0.7), a: Math.random() * 6.28, s: 0.4 + Math.random() });
  }
  for (const f of flies) {
    f.a += 0.012 * f.s;
    f.x += Math.cos(f.a) * 0.3 * f.s;
    f.y += Math.sin(f.a * 1.3) * 0.22 * f.s - 0.02;
    if (f.x < -10) f.x = W + 10;
    if (f.x > W + 10) f.x = -10;
    if (f.y < H * 0.1) f.y = H * 0.95;
    glow(ctx, f.x, f.y, 5 + 3 * Math.sin(t * 3 * f.s + f.a), pal.fog, 0.55);
  }
  for (let i = 0; i < 3; i++) {
    const x = ((t * (8 + i * 5) + i * W * 0.4) % (W + 500)) - 250;
    const g = ctx.createLinearGradient(x, 0, x + 500, 0);
    g.addColorStop(0, rgba(pal.fog, 0));
    g.addColorStop(0.5, rgba(pal.fog, 0.05));
    g.addColorStop(1, rgba(pal.fog, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x, H * (0.28 + i * 0.16), 500, H * 0.2);
  }
  for (let i = 0; i < 3; i++) {
    const x = W * (0.2 + i * 0.28) + Math.sin(t * 0.15 + i) * 40;
    const g = ctx.createLinearGradient(0, 0, 0, H * 0.8);
    g.addColorStop(0, rgba(pal.fog, 0.07));
    g.addColorStop(1, rgba(pal.fog, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 60, 0);
    ctx.lineTo(x + 220, H * 0.8);
    ctx.lineTo(x + 100, H * 0.8);
    ctx.fill();
  }
  ctx.restore();
}

export function themeForArena(idx: number): ArenaTheme {
  return ARENA_THEMES[Math.max(0, Math.min(ARENA_THEMES.length - 1, idx))];
}
