import { ISO, hexCorners } from '../core/hex';
import { RNG } from '../core/rng';
import { TERRAINS } from '../data/terrain';
import type { Terrain } from '../data/types';
import type { Tile } from '../game/state';
import { type Ctx, ellipse, glow, mix, poly, rgba, shade } from './draw';
import { type Sprite, getSprite } from './sprites';

export const ELEV_PX = 12;
export const BASE_DEPTH = 34;

export function tileElev(t: Terrain) {
  return TERRAINS[t].elev * ELEV_PX;
}

// ——— Éléments de décor réutilisables ———

export function conifer(ctx: Ctx, x: number, y: number, h: number, col: string) {
  ellipse(ctx, x + h * 0.08, y + 1, h * 0.28, h * 0.1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = '#2a1d14';
  ctx.fillRect(x - h * 0.04, y - h * 0.18, h * 0.08, h * 0.2);
  const layers = 3;
  for (let i = 0; i < layers; i++) {
    const base = y - h * 0.12 - i * h * 0.24;
    const w = h * (0.34 - i * 0.07);
    const top = base - h * 0.42;
    poly(ctx, [x, top, x - w, base, x, base + w * 0.12], shade(col, 0.12 - i * 0.02));
    poly(ctx, [x, top, x + w, base, x, base + w * 0.12], shade(col, -0.32));
    ctx.strokeStyle = 'rgba(5,12,8,0.75)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - w, base);
    ctx.lineTo(x, top);
    ctx.lineTo(x + w, base);
    ctx.stroke();
  }
}

export function roundTree(ctx: Ctx, x: number, y: number, r: number, col: string) {
  ellipse(ctx, x + r * 0.2, y + 1, r * 0.9, r * 0.32, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = '#2a1d14';
  ctx.fillRect(x - r * 0.12, y - r * 0.9, r * 0.24, r * 0.9);
  const cy = y - r * 1.35;
  const blobs: [number, number, number][] = [
    [-0.45, 0.15, 0.62],
    [0.45, 0.18, 0.6],
    [0, -0.25, 0.75],
  ];
  ctx.strokeStyle = 'rgba(5,12,8,0.8)';
  ctx.lineWidth = 1.1;
  for (const [dx, dy, rr] of blobs) {
    ctx.beginPath();
    ctx.arc(x + dx * r, cy + dy * r, rr * r, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (const [dx, dy, rr] of blobs) {
    const g = ctx.createRadialGradient(x + dx * r - rr * r * 0.4, cy + dy * r - rr * r * 0.4, 1, x + dx * r, cy + dy * r, rr * r);
    g.addColorStop(0, shade(col, 0.25));
    g.addColorStop(1, shade(col, -0.35));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x + dx * r, cy + dy * r, rr * r, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function mushroom(ctx: Ctx, x: number, y: number, s: number, cap: string, glowCol: string) {
  glow(ctx, x, y - s * 1.1, s * 2.2, glowCol, 0.35);
  ellipse(ctx, x, y + 1, s * 0.5, s * 0.16, 'rgba(0,0,0,0.35)');
  const stem = ctx.createLinearGradient(x - s * 0.2, 0, x + s * 0.2, 0);
  stem.addColorStop(0, '#cfe8d8');
  stem.addColorStop(1, '#5f8a7a');
  ctx.fillStyle = stem;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.16, y);
  ctx.quadraticCurveTo(x - s * 0.24, y - s * 0.5, x - s * 0.12, y - s * 0.95);
  ctx.lineTo(x + s * 0.12, y - s * 0.95);
  ctx.quadraticCurveTo(x + s * 0.2, y - s * 0.5, x + s * 0.16, y);
  ctx.closePath();
  ctx.fill();
  const cy = y - s * 0.9;
  const g = ctx.createLinearGradient(0, cy - s * 0.7, 0, cy + s * 0.1);
  g.addColorStop(0, shade(cap, 0.25));
  g.addColorStop(1, shade(cap, -0.4));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, cy, s * 0.75, s * 0.62, 0, Math.PI, 0);
  ctx.quadraticCurveTo(x, cy + s * 0.22, x - s * 0.75, cy);
  ctx.fill();
  ctx.strokeStyle = 'rgba(4,14,12,0.85)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = rgba(glowCol, 0.95);
  for (let i = 0; i < 5; i++) {
    const a = Math.PI + (i + 0.5) * (Math.PI / 5);
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * s * 0.5, cy + Math.sin(a) * s * 0.36, s * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = rgba(glowCol, 0.8);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(x, cy, s * 0.72, s * 0.14, 0, 0, Math.PI);
  ctx.stroke();
}

export function crystalCluster(ctx: Ctx, x: number, y: number, s: number, col = '#f2b33a', rng?: RNG) {
  glow(ctx, x, y - s * 0.6, s * 2.4, col, 0.4);
  const shards = [
    [-0.45, 0.65, -0.35],
    [0.4, 0.7, 0.3],
    [0, 1.15, 0.05],
    [-0.15, 0.55, -0.6],
    [0.25, 0.5, 0.65],
  ];
  for (const [dx, hh, tilt] of shards) {
    const jitter = rng ? rng.range(0.85, 1.15) : 1;
    const bx = x + dx * s;
    const h = hh * s * 1.3 * jitter;
    const w = s * 0.2;
    const tx = bx + tilt * s * 0.4;
    const ty = y - h;
    poly(ctx, [bx - w, y, tx - w * 0.7, ty + w, tx, ty - w * 0.4, bx, y + w * 0.3], shade(col, 0.35));
    poly(ctx, [bx, y + w * 0.3, tx, ty - w * 0.4, tx + w * 0.7, ty + w, bx + w, y], shade(col, -0.3));
    ctx.strokeStyle = 'rgba(60,30,5,0.8)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(bx - w, y);
    ctx.lineTo(tx - w * 0.7, ty + w);
    ctx.lineTo(tx, ty - w * 0.4);
    ctx.lineTo(tx + w * 0.7, ty + w);
    ctx.lineTo(bx + w, y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,245,200,0.7)';
    ctx.beginPath();
    ctx.moveTo(bx - w * 0.4, y - h * 0.1);
    ctx.lineTo(tx - w * 0.25, ty + w * 0.6);
    ctx.stroke();
  }
}

function peak(ctx: Ctx, x: number, y: number, w: number, h: number, col: string, snow: boolean) {
  const tx = x + w * 0.08;
  const ty = y - h;
  poly(ctx, [x - w, y, tx, ty, x + w * 0.05, y + w * 0.12], shade(col, 0.18));
  poly(ctx, [x + w * 0.05, y + w * 0.12, tx, ty, x + w, y], shade(col, -0.35));
  // arêtes rocheuses
  ctx.strokeStyle = rgba('#000000', 0.25);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(tx - w * 0.3, ty + h * 0.45);
  ctx.lineTo(tx - w * 0.12, ty + h * 0.6);
  ctx.moveTo(tx + w * 0.25, ty + h * 0.4);
  ctx.lineTo(tx + w * 0.45, ty + h * 0.7);
  ctx.stroke();
  if (snow) {
    poly(ctx, [tx - w * 0.28, ty + h * 0.3, tx, ty, tx + w * 0.3, ty + h * 0.32, tx + w * 0.1, ty + h * 0.24, tx - w * 0.05, ty + h * 0.36], '#c9d6dc');
  }
  ctx.strokeStyle = 'rgba(8,10,14,0.85)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.lineTo(tx, ty);
  ctx.lineTo(x + w, y);
  ctx.stroke();
}

function mound(ctx: Ctx, x: number, y: number, w: number, h: number, col: string) {
  const g = ctx.createLinearGradient(x - w, y - h, x + w, y);
  g.addColorStop(0, shade(col, 0.2));
  g.addColorStop(1, shade(col, -0.35));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.bezierCurveTo(x - w * 0.6, y - h * 1.2, x + w * 0.5, y - h * 1.25, x + w, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(8,14,8,0.7)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function tuft(ctx: Ctx, x: number, y: number, s: number, col: string) {
  ctx.strokeStyle = col;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.5, y - s * 0.9);
  ctx.lineTo(x, y);
  ctx.lineTo(x + s * 0.1, y - s * 1.2);
  ctx.moveTo(x, y);
  ctx.lineTo(x + s * 0.6, y - s * 0.8);
  ctx.stroke();
}

function rock(ctx: Ctx, x: number, y: number, s: number, col: string) {
  poly(ctx, [x - s, y, x - s * 0.6, y - s * 0.8, x + s * 0.3, y - s, x + s, y - s * 0.2, x + s * 0.7, y + s * 0.3], shade(col, 0.05), 'rgba(0,0,0,0.6)', 0.8);
  poly(ctx, [x + s * 0.3, y - s, x + s, y - s * 0.2, x + s * 0.7, y + s * 0.3, x + s * 0.1, y], shade(col, -0.3));
}

// ——— Tuile ———

const EDGE_LIGHT = 'rgba(190,255,220,0.10)';

export function drawTileBase(ctx: Ctx, cx: number, cy: number, size: number, tile: Tile, foamEdges: boolean[]) {
  const info = TERRAINS[tile.terrain];
  const top = hexCorners(cx, cy, size);
  const depth = tileElev(tile.terrain) + BASE_DEPTH;
  const explored = tile.explored;
  const sideCol = explored ? info.side : '#070d0f';

  // Faces latérales (seules les deux faces avant sont visibles).
  const faces: [number, number, number][] = [
    [1, 2, -0.1],
    [2, 3, 0.15],
  ];
  for (const [a, b, l] of faces) {
    const g = ctx.createLinearGradient(0, top[a].y, 0, top[a].y + depth);
    g.addColorStop(0, shade(sideCol, l));
    g.addColorStop(1, shade(sideCol, -0.6));
    poly(ctx, [top[a].x, top[a].y, top[b].x, top[b].y, top[b].x, top[b].y + depth, top[a].x, top[a].y + depth], undefined);
    ctx.fillStyle = g;
    ctx.fill();
  }
  if (explored && info.land) {
    // strates de terre sur les falaises
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    for (let k = 1; k <= 2; k++) {
      const dy = (depth * k) / 3;
      ctx.beginPath();
      ctx.moveTo(top[1].x, top[1].y + dy);
      ctx.lineTo(top[2].x, top[2].y + dy);
      ctx.lineTo(top[3].x, top[3].y + dy);
      ctx.stroke();
    }
  }

  // Face supérieure
  const g = ctx.createLinearGradient(cx, cy - size * ISO, cx, cy + size * ISO);
  if (!explored) {
    g.addColorStop(0, '#0d1a1c');
    g.addColorStop(1, '#091315');
  } else {
    g.addColorStop(0, shade(info.top, 0.06));
    g.addColorStop(1, info.top2);
  }
  ctx.beginPath();
  ctx.moveTo(top[0].x, top[0].y);
  for (let i = 1; i < 6; i++) ctx.lineTo(top[i].x, top[i].y);
  ctx.closePath();
  ctx.fillStyle = g;
  ctx.fill();

  // Texture peinte (si fournie) : recadrage propre à chaque case, écrasée comme le sol isométrique, puis teinte et lumière.
  const tex = explored ? getSprite(`terrain/${tile.terrain}`) : null;
  if (tex) {
    const trng = new RNG(tile.variant * 31 + 5);
    const cs = Math.min(tex.w, tex.h) * 0.5;
    const sz = size * 2.15;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(top[0].x, top[0].y);
    for (let i = 1; i < 6; i++) ctx.lineTo(top[i].x, top[i].y);
    ctx.closePath();
    ctx.clip();
    ctx.translate(cx, cy);
    ctx.scale(1, ISO);
    ctx.drawImage(tex.img, trng.range(0, tex.w - cs), trng.range(0, tex.h - cs), cs, cs, -sz / 2, -sz / 2, sz, sz);
    ctx.restore();
    const tg = ctx.createLinearGradient(cx, cy - size * ISO, cx, cy + size * ISO);
    tg.addColorStop(0, rgba(shade(info.top, 0.18), 0.22));
    tg.addColorStop(1, rgba(info.top2, 0.34));
    ctx.beginPath();
    ctx.moveTo(top[0].x, top[0].y);
    for (let i = 1; i < 6; i++) ctx.lineTo(top[i].x, top[i].y);
    ctx.closePath();
    ctx.fillStyle = tg;
    ctx.fill();
  }

  const water = !info.land;
  ctx.strokeStyle = water ? 'rgba(120,220,220,0.06)' : explored ? 'rgba(4,12,10,0.9)' : 'rgba(30,60,60,0.25)';
  ctx.lineWidth = water ? 1 : 1.4;
  ctx.stroke();
  if (explored && !water) {
    ctx.strokeStyle = EDGE_LIGHT;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(top[3].x, top[3].y);
    ctx.lineTo(top[4].x, top[4].y);
    ctx.lineTo(top[5].x, top[5].y);
    ctx.lineTo(top[0].x, top[0].y);
    ctx.stroke();
  }
  // Écume le long des côtes
  if (explored && water) {
    for (let i = 0; i < 6; i++) {
      if (!foamEdges[i]) continue;
      const a = top[i];
      const b = top[(i + 1) % 6];
      ctx.strokeStyle = 'rgba(190,255,240,0.35)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(a.x + (cx - a.x) * 0.12, a.y + (cy - a.y) * 0.12);
      ctx.lineTo(b.x + (cx - b.x) * 0.12, b.y + (cy - b.y) * 0.12);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(190,255,240,0.12)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(a.x + (cx - a.x) * 0.3, a.y + (cy - a.y) * 0.3);
      ctx.lineTo(b.x + (cx - b.x) * 0.3, b.y + (cy - b.y) * 0.3);
      ctx.stroke();
    }
  }
  if (!explored) {
    // brume d'inconnu
    const rng = new RNG(tile.variant + 7);
    for (let i = 0; i < 3; i++) {
      ellipse(ctx, cx + rng.range(-size * 0.5, size * 0.5), cy + rng.range(-size * 0.2, size * 0.2), size * rng.range(0.3, 0.55), size * 0.14, 'rgba(60,110,110,0.06)');
    }
  }
}

// ——— Décor peint (planches « props » fournies par l'utilisateur), avec repli procédural par catégorie ———
function propList(prefix: string, max: number): Sprite[] {
  const out: Sprite[] = [];
  for (let i = 1; i <= max; i++) {
    const sp = getSprite(`props/${prefix}_${i}`);
    if (sp) out.push(sp);
  }
  return out;
}

function putProp(ctx: Ctx, sp: Sprite, x: number, y: number, H: number, flip: boolean) {
  const w = (sp.w * H) / sp.h;
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(0, -1, w * 0.3, Math.max(2, w * 0.08), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.drawImage(sp.img, -sp.ax * w, -H, w, H);
  ctx.restore();
}

function paintedProps(
  ctx: Ctx, cx: number, cy: number, size: number, tile: Tile, hasBuilding: boolean, rng: RNG,
  spot: () => { x: number; y: number },
): { terrain: boolean; feature: boolean } {
  const res = { terrain: false, feature: false };
  const pick = (list: Sprite[]) => list[Math.floor(rng.next() * list.length)];
  const scatter = (list: Sprite[], n: number, hMin: number, hMax: number) => {
    const pts = Array.from({ length: n }, spot).sort((a, b) => a.y - b.y);
    for (const p of pts) putProp(ctx, pick(list), p.x, p.y + size * 0.1, size * rng.range(hMin, hMax), rng.chance(0.5));
  };

  const trees = propList('tree', 6);
  const shrooms = propList('mushroom', 6);
  const hills = propList('hill', 3);
  const mounts = propList('mountain', 4);
  const bushes = [...propList('bush', 3), ...propList('flowers', 2)];
  const rocks = propList('rock', 2);

  switch (tile.terrain) {
    case 'forest':
      if (trees.length) {
        scatter(trees, hasBuilding ? 2 : 4 + rng.int(0, 1), 0.95, 1.5);
        res.terrain = true;
      }
      break;
    case 'grove':
      if (shrooms.length) {
        scatter(shrooms, hasBuilding ? 1 : 3, 0.55, 1.0);
        if (!hasBuilding && trees.length) scatter(trees, 1, 0.9, 1.3);
        res.terrain = true;
      }
      break;
    case 'hills':
      if (hills.length) {
        if (!hasBuilding) putProp(ctx, pick(hills), cx, cy + size * 0.35, size * rng.range(0.9, 1.15), rng.chance(0.5));
        else if (rocks.length) putProp(ctx, pick(rocks), cx - size * 0.5, cy + size * 0.1, size * 0.35, false);
        res.terrain = true;
      }
      break;
    case 'mountain':
      if (mounts.length) {
        if (!hasBuilding) {
          putProp(ctx, pick(mounts), cx + size * rng.range(-0.15, 0.15), cy + size * 0.3, size * rng.range(1.7, 2.2), rng.chance(0.5));
        } else putProp(ctx, pick(mounts), cx + size * 0.4, cy - size * 0.1, size * 1.0, false);
        res.terrain = true;
      }
      break;
    case 'plains':
      if (bushes.length) {
        scatter(bushes, hasBuilding ? 2 : 4, 0.3, 0.55);
        if (!hasBuilding && trees.length && rng.chance(0.3)) scatter(trees, 1, 0.8, 1.1);
        res.terrain = true;
      }
      break;
    default:
      break;
  }

  switch (tile.feature) {
    case 'crystals': {
      const c = propList('crystal', 3);
      if (c.length && !hasBuilding) {
        putProp(ctx, pick(c), cx - size * 0.1, cy + size * 0.25, size * 0.95, false);
        res.feature = true;
      }
      break;
    }
    case 'goldVein': {
      const o = propList('ore', 1);
      if (o.length && !hasBuilding) {
        putProp(ctx, o[0], cx + size * 0.1, cy + size * 0.25, size * 0.6, rng.chance(0.5));
        res.feature = true;
      }
      break;
    }
    case 'ruins': {
      const r = propList('ruins', 2);
      if (r.length) {
        putProp(ctx, pick(r), cx, cy + size * 0.3, size * 1.3, rng.chance(0.5));
        res.feature = true;
      }
      break;
    }
    case 'lair': {
      const l = propList('lair', 1);
      if (l.length) {
        putProp(ctx, l[0], cx, cy + size * 0.3, size * 1.15, false);
        res.feature = true;
      }
      break;
    }
    default:
      break;
  }
  return res;
}

export function drawTileDecor(ctx: Ctx, cx: number, cy: number, size: number, tile: Tile, hasBuilding: boolean) {
  if (!tile.explored) return;
  const rng = new RNG(tile.variant * 7919 + 13);
  const s = size;
  const spot = () => {
    const a = rng.range(0, Math.PI * 2);
    const d = Math.sqrt(rng.next()) * s * 0.55;
    return { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * ISO };
  };
  const spots = (n: number) => Array.from({ length: n }, spot).sort((a, b) => a.y - b.y);

  const painted = paintedProps(ctx, cx, cy, size, tile, hasBuilding, rng, spot);

  if (!painted.terrain) switch (tile.terrain) {
    case 'plains': {
      for (const p of spots(hasBuilding ? 3 : 8)) tuft(ctx, p.x, p.y, s * 0.09, rng.chance(0.5) ? '#4f9a5c' : '#3c7f4a');
      if (!hasBuilding) {
        for (let i = 0; i < 5; i++) {
          const p = spot();
          ellipse(ctx, p.x, p.y, 1.6, 1.2, rng.chance(0.6) ? 'rgba(170,220,255,0.85)' : 'rgba(255,240,170,0.8)');
        }
        if (rng.chance(0.35)) {
          const p = spot();
          roundTree(ctx, p.x, p.y, s * 0.12, '#2f6a3c');
        }
      }
      break;
    }
    case 'forest': {
      if (hasBuilding) {
        const p = spots(2);
        p.forEach((pp) => conifer(ctx, pp.x - s * 0.35, pp.y - s * 0.1, s * 0.5, '#1f5a3a'));
        break;
      }
      const n = 4 + rng.int(0, 2);
      for (const p of spots(n)) {
        if (rng.chance(0.65)) conifer(ctx, p.x, p.y, s * rng.range(0.55, 0.8), rng.chance(0.5) ? '#1f5a3a' : '#25634a');
        else roundTree(ctx, p.x, p.y, s * rng.range(0.16, 0.22), rng.chance(0.5) ? '#2d6b3e' : '#3a7a44');
      }
      break;
    }
    case 'grove': {
      const n = hasBuilding ? 1 : 3;
      const caps = ['#2fd3b0', '#3fe08a', '#5ae0d0'];
      for (const p of spots(n)) mushroom(ctx, p.x, p.y, s * rng.range(0.2, 0.32), rng.pick(caps), '#9dffd9');
      if (!hasBuilding) {
        for (const p of spots(2)) conifer(ctx, p.x, p.y, s * 0.55, '#1a4f45');
        for (let i = 0; i < 6; i++) {
          const p = spot();
          ellipse(ctx, p.x, p.y, 1.4, 1.4, 'rgba(160,255,220,0.8)');
        }
      }
      break;
    }
    case 'hills': {
      if (!hasBuilding) {
        mound(ctx, cx - s * 0.22, cy + s * 0.1, s * 0.38, s * 0.3, '#5a7448');
        mound(ctx, cx + s * 0.2, cy - s * 0.05, s * 0.34, s * 0.34, '#55703f');
        if (rng.chance(0.5)) rock(ctx, cx + s * 0.3, cy + s * 0.2, s * 0.08, '#7a7a6a');
      } else {
        rock(ctx, cx - s * 0.45, cy + s * 0.05, s * 0.08, '#7a7a6a');
      }
      break;
    }
    case 'mountain': {
      if (!hasBuilding) {
        peak(ctx, cx - s * 0.25, cy + s * 0.12, s * 0.4, s * 0.85, '#5d6878', rng.chance(0.4));
        peak(ctx, cx + s * 0.18, cy + s * 0.02, s * 0.48, s * 1.15, '#56616f', rng.chance(0.6));
      } else {
        peak(ctx, cx + s * 0.35, cy - s * 0.12, s * 0.3, s * 0.7, '#56616f', false);
      }
      break;
    }
    case 'beach': {
      for (let i = 0; i < 5; i++) {
        const p = spot();
        ellipse(ctx, p.x, p.y, rng.range(1.5, 3.5), rng.range(1, 2), rng.chance(0.5) ? '#8a8566' : '#5a5840');
      }
      break;
    }
    default:
      break;
  }

  if (!painted.feature) switch (tile.feature) {
    case 'goldVein': {
      if (hasBuilding) break;
      for (let i = 0; i < 4; i++) {
        const x = cx + rng.range(-s * 0.35, s * 0.35);
        const y = cy + rng.range(-s * 0.1, s * 0.25);
        glow(ctx, x, y, 7, '#ffd25a', 0.5);
        poly(ctx, [x - 3, y, x, y - 3, x + 3, y, x, y + 2], '#ffd25a', 'rgba(80,50,0,0.8)', 0.6);
      }
      break;
    }
    case 'crystals':
      if (!hasBuilding) crystalCluster(ctx, cx - s * 0.1, cy + s * 0.18, s * 0.28, '#f2b33a', rng);
      break;
    case 'ruins': {
      const col = '#7d8a86';
      const pillars: [number, number, number][] = [
        [-0.3, 0.05, 0.55],
        [0.05, -0.12, 0.85],
        [0.32, 0.1, 0.35],
      ];
      glow(ctx, cx, cy - s * 0.2, s * 0.9, '#8fffe0', 0.15);
      for (const [dx, dy, hh] of pillars) {
        const x = cx + dx * s;
        const y = cy + dy * s;
        const h = hh * s;
        const r = s * 0.09;
        ellipse(ctx, x + 2, y + 1, r * 1.6, r * 0.6, 'rgba(0,0,0,0.35)');
        const gr = ctx.createLinearGradient(x - r, 0, x + r, 0);
        gr.addColorStop(0, shade(col, 0.15));
        gr.addColorStop(1, shade(col, -0.45));
        ctx.fillStyle = gr;
        ctx.fillRect(x - r, y - h, r * 2, h);
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.strokeRect(x - r, y - h, r * 2, h);
        poly(ctx, [x - r * 1.3, y - h, x - r * 0.4, y - h - r * 0.8, x + r * 1.3, y - h - r * 0.2, x + r * 1.3, y - h], shade(col, 0.2), 'rgba(0,0,0,0.6)', 0.8);
        ctx.fillStyle = 'rgba(80,160,90,0.55)';
        ctx.fillRect(x - r, y - h * 0.35, r * 2, h * 0.12);
      }
      break;
    }
    case 'lair': {
      const x = cx;
      const y = cy + s * 0.1;
      mound(ctx, x, y, s * 0.5, s * 0.45, '#3a3f3a');
      ctx.fillStyle = '#05080a';
      ctx.beginPath();
      ctx.ellipse(x, y - s * 0.04, s * 0.2, s * 0.17, 0, Math.PI, 0);
      ctx.lineTo(x + s * 0.2, y);
      ctx.lineTo(x - s * 0.2, y);
      ctx.fill();
      glow(ctx, x, y - s * 0.12, s * 0.3, '#ff5a5a', 0.4);
      ellipse(ctx, x - s * 0.06, y - s * 0.1, 2.2, 1.6, '#ff6b5a');
      ellipse(ctx, x + s * 0.06, y - s * 0.1, 2.2, 1.6, '#ff6b5a');
      for (const dx of [-0.42, 0.4]) conifer(ctx, x + dx * s, y + s * 0.05, s * 0.45, '#1c4a35');
      break;
    }
    default:
      break;
  }
}

// Bordure de territoire dorée (arêtes dont le voisin est hors territoire).
export function drawBorder(ctx: Ctx, cx: number, cy: number, size: number, edges: boolean[]) {
  const top = hexCorners(cx, cy, size * 0.97);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    if (!edges[i]) continue;
    const a = top[i];
    const b = top[(i + 1) % 6];
    ctx.strokeStyle = 'rgba(255,205,110,0.18)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,214,130,0.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

export function waterTint(t: Terrain) {
  return t === 'shallow' ? mix('#17565a', '#2a8a86', 0.3) : '#0b2f3a';
}
