import type { Look, Part } from '../data/creatures';
import { type Ctx, ellipse, glow, makeCanvas, poly, rgba, shade } from './draw';
import { creatureSpriteKey, drawPuppet, getSprite, monsterSpriteKey, spriteDataUrl } from './sprites';

const OUT = '#0a0d12';

export interface CreatureDrawOpts {
  t: number;
  facing: 1 | -1;
  star?: number;
  flash?: number;
  alpha?: number;
  lunge?: number;
  phase?: number;
}

interface Anchors {
  head: [number, number];
  headR: number;
  top: [number, number];
  tail: [number, number];
  back: [number, number];
  eye: [number, number, number, number];
}

function outline(ctx: Ctx, lw = 1.6) {
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  ctx.stroke();
}

function shaded(ctx: Ctx, x: number, y: number, r: number, col: string) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.1);
  g.addColorStop(0, shade(col, 0.28));
  g.addColorStop(0.6, col);
  g.addColorStop(1, shade(col, -0.35));
  return g;
}

function blobE(ctx: Ctx, x: number, y: number, rx: number, ry: number, col: string, lw = 1.6, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.fillStyle = shaded(ctx, x, y, Math.max(rx, ry), col);
  ctx.fill();
  outline(ctx, lw);
}

function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function eyes(ctx: Ctx, look: Look, ex: number, ey: number, r: number, gap: number, t: number) {
  const blink = Math.sin(t * 0.9 + ex) > 0.985 ? 0.15 : 1;
  for (const dx of [-gap / 2, gap / 2]) {
    const x = ex + dx;
    const near = dx > 0 ? 1 : 0.85;
    const rr = r * near;
    if (look.eye === 'glow') {
      glow(ctx, x, ey, rr * 3, look.c3, 0.7);
      ellipse(ctx, x, ey, rr * 0.9, rr * 0.55 * blink, look.c3);
      ellipse(ctx, x, ey, rr * 0.45, rr * 0.3 * blink, '#ffffff');
    } else if (look.eye === 'fierce') {
      ctx.beginPath();
      ctx.ellipse(x, ey, rr, rr * 0.7 * blink, -0.25, 0, Math.PI * 2);
      ctx.fillStyle = '#fff8e8';
      ctx.fill();
      outline(ctx, 1.1);
      ellipse(ctx, x + rr * 0.25, ey, rr * 0.22, rr * 0.55 * blink, '#1a0a05');
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - rr * 1.1, ey - rr * 1.1);
      ctx.lineTo(x + rr * 1.0, ey - rr * 0.55);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.ellipse(x, ey, rr * 0.8, rr * blink, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      outline(ctx, 1.1);
      ellipse(ctx, x + rr * 0.18, ey + rr * 0.1, rr * 0.55, rr * 0.7 * blink, '#15111c');
      ellipse(ctx, x + rr * 0.02, ey - rr * 0.25, rr * 0.22, rr * 0.22 * blink, '#ffffff');
    }
  }
}

function flame(ctx: Ctx, x: number, y: number, s: number, t: number, _look?: Look) {
  const f = 1 + Math.sin(t * 12 + x) * 0.08;
  glow(ctx, x, y - s * 0.4, s * 1.6, '#ffb040', 0.55);
  const layer = (sc: number, col: string) => {
    const h = s * sc * f;
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.15);
    ctx.bezierCurveTo(x - h * 0.55, y, x - h * 0.35, y - h * 0.6, x + Math.sin(t * 8) * h * 0.1, y - h * 1.15);
    ctx.bezierCurveTo(x + h * 0.4, y - h * 0.6, x + h * 0.55, y, x, y + h * 0.15);
    ctx.fillStyle = col;
    ctx.fill();
  };
  layer(1, '#ff5a1a');
  layer(0.72, '#ffa03a');
  layer(0.42, '#fff0a0');
}

// Pièces dessinées derrière le corps.
function backParts(ctx: Ctx, look: Look, a: Anchors, S: number, t: number) {
  const has = (p: Part) => look.parts.includes(p);
  if (has('wings')) {
    const flap = Math.sin(t * 6) * 0.25;
    for (const side of [-1, 1]) {
      const [bx, by] = a.back;
      const sc = side === -1 ? 0.85 : 1;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(-0.5 + flap * side * 0.5 - (side === -1 ? 0.35 : 0));
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-S * 0.2 * sc, -S * 0.75 * sc, -S * 0.7 * sc, -S * 0.65 * sc);
      ctx.quadraticCurveTo(-S * 0.55 * sc, -S * 0.4 * sc, -S * 0.75 * sc, -S * 0.25 * sc);
      ctx.quadraticCurveTo(-S * 0.45 * sc, -S * 0.15 * sc, -S * 0.55 * sc, S * 0.05 * sc);
      ctx.quadraticCurveTo(-S * 0.25 * sc, 0, 0, 0);
      const g = ctx.createLinearGradient(0, 0, -S * 0.7, -S * 0.6);
      g.addColorStop(0, side === -1 ? shade(look.c1, -0.35) : look.c1);
      g.addColorStop(1, side === -1 ? shade(look.c2, -0.3) : look.c2);
      ctx.fillStyle = g;
      ctx.fill();
      outline(ctx, 1.4);
      ctx.restore();
    }
  }
  if (has('tail')) {
    const [tx, ty] = a.tail;
    const sw = Math.sin(t * 4) * S * 0.05;
    ctx.beginPath();
    ctx.moveTo(tx + S * 0.08, ty + S * 0.08);
    ctx.quadraticCurveTo(tx - S * 0.35, ty + S * 0.05, tx - S * 0.42 + sw, ty - S * 0.35);
    ctx.quadraticCurveTo(tx - S * 0.25, ty - S * 0.05, tx + S * 0.05, ty - S * 0.08);
    ctx.fillStyle = shaded(ctx, tx, ty, S * 0.3, look.c1);
    ctx.fill();
    outline(ctx, 1.4);
    if (has('flame')) flame(ctx, tx - S * 0.42 + sw, ty - S * 0.36, S * 0.28, t, look);
    if (has('bolt')) poly(ctx, [tx - S * 0.42 + sw, ty - S * 0.36, tx - S * 0.62, ty - S * 0.55, tx - S * 0.5, ty - S * 0.58, tx - S * 0.66, ty - S * 0.82, tx - S * 0.38, ty - S * 0.5, tx - S * 0.48, ty - S * 0.48], look.c3, OUT, 1.2);
  }
  if (has('mane')) {
    const [hx, hy] = a.head;
    const r = a.headR * 1.35;
    ctx.beginPath();
    for (let i = 0; i <= 14; i++) {
      const ang = Math.PI * 0.55 + (i / 14) * Math.PI * 1.5;
      const rr = i % 2 ? r * 1.15 : r * 0.85;
      const x = hx - S * 0.05 + Math.cos(ang) * rr;
      const y = hy + Math.sin(ang) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = shaded(ctx, hx, hy, r, look.c2);
    ctx.fill();
    outline(ctx, 1.3);
  }
  if (has('heads')) {
    for (const [ox, oy, sc] of [[-0.32, -0.15, 0.75], [-0.12, -0.32, 0.85]] as const) {
      const hx = a.head[0] + ox * S;
      const hy = a.head[1] + oy * S;
      ctx.strokeStyle = OUT;
      ctx.lineWidth = S * 0.16 * sc + 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(a.back[0], a.back[1] + S * 0.1);
      ctx.quadraticCurveTo(hx - S * 0.1, hy + S * 0.3, hx, hy);
      ctx.stroke();
      ctx.strokeStyle = shade(look.c1, -0.15);
      ctx.lineWidth = S * 0.16 * sc;
      ctx.stroke();
      blobE(ctx, hx, hy, a.headR * 0.8 * sc, a.headR * 0.65 * sc, shade(look.c1, -0.1), 1.3);
      glow(ctx, hx + S * 0.08, hy - S * 0.03, S * 0.1, look.c3, 0.8);
      ellipse(ctx, hx + S * 0.08, hy - S * 0.03, S * 0.03, S * 0.02, look.c3);
    }
  }
  if (has('spikes')) {
    const [bx, by] = a.back;
    for (let i = 0; i < 4; i++) {
      const x = bx - S * 0.3 + i * S * 0.16;
      const y = by + Math.abs(i - 1.5) * S * 0.04;
      poly(ctx, [x - S * 0.07, y + S * 0.06, x, y - S * 0.16, x + S * 0.07, y + S * 0.06], shade(look.c2, -0.1), OUT, 1.1);
    }
  }
  if (has('leaves')) {
    const [bx, by] = a.back;
    for (const [dx, rot, sc] of [[-0.15, -0.9, 1], [0.08, -0.3, 0.85]] as const) {
      ctx.save();
      ctx.translate(bx + dx * S, by + S * 0.05);
      ctx.rotate(rot + Math.sin(t * 2 + dx) * 0.08);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(S * 0.18 * sc, -S * 0.2 * sc, 0, -S * 0.45 * sc);
      ctx.quadraticCurveTo(-S * 0.18 * sc, -S * 0.2 * sc, 0, 0);
      ctx.fillStyle = shaded(ctx, 0, -S * 0.2, S * 0.3, '#5fcf5a');
      ctx.fill();
      outline(ctx, 1.2);
      ctx.strokeStyle = 'rgba(20,60,20,0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -S * 0.4 * sc);
      ctx.stroke();
      ctx.restore();
    }
  }
}

// Pièces dessinées devant le corps.
function frontParts(ctx: Ctx, look: Look, a: Anchors, S: number, t: number) {
  const has = (p: Part) => look.parts.includes(p);
  const [hx, hy] = a.top;
  if (has('ears')) {
    for (const [dx, rot] of [[-0.12, -0.35], [0.1, 0.25]] as const) {
      ctx.save();
      ctx.translate(hx + dx * S, hy + S * 0.06);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.moveTo(-S * 0.08, 0);
      ctx.quadraticCurveTo(-S * 0.06, -S * 0.3, 0, -S * 0.4);
      ctx.quadraticCurveTo(S * 0.08, -S * 0.25, S * 0.08, 0);
      ctx.closePath();
      ctx.fillStyle = shaded(ctx, 0, -S * 0.2, S * 0.25, look.c1);
      ctx.fill();
      outline(ctx, 1.3);
      poly(ctx, [-S * 0.035, -S * 0.27, 0, -S * 0.4, S * 0.035, -S * 0.27], '#1a1410');
      ctx.restore();
    }
  }
  if (has('horns')) {
    for (const [dx, dir] of [[-0.08, -1], [0.1, 1]] as const) {
      const x = hx + dx * S;
      const y = hy + S * 0.05;
      ctx.beginPath();
      ctx.moveTo(x - S * 0.04, y);
      ctx.quadraticCurveTo(x + dir * S * 0.02, y - S * 0.25, x - S * 0.12, y - S * 0.38);
      ctx.quadraticCurveTo(x + S * 0.05, y - S * 0.22, x + S * 0.05, y);
      ctx.fillStyle = '#e8dcc0';
      ctx.fill();
      outline(ctx, 1.2);
    }
  }
  if (has('sprout')) {
    ctx.strokeStyle = '#2f6a2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx, hy + S * 0.04);
    ctx.lineTo(hx, hy - S * 0.15);
    ctx.stroke();
    for (const dir of [-1, 1]) {
      ctx.save();
      ctx.translate(hx, hy - S * 0.14);
      ctx.rotate(dir * (0.9 + Math.sin(t * 2.5) * 0.12));
      ctx.beginPath();
      ctx.ellipse(0, -S * 0.11, S * 0.07, S * 0.13, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#7ae06a';
      ctx.fill();
      outline(ctx, 1.1);
      ctx.restore();
    }
  }
  if (has('fins')) {
    poly(ctx, [hx - S * 0.12, hy + S * 0.08, hx - S * 0.05, hy - S * 0.22, hx + S * 0.12, hy + S * 0.06], shade(look.c2, -0.05), OUT, 1.2);
    const [ex, ey] = a.back;
    poly(ctx, [ex - S * 0.1, ey + S * 0.2, ex - S * 0.35, ey + S * 0.1, ex - S * 0.15, ey + S * 0.32], shade(look.c2, -0.1), OUT, 1.1);
  }
  if (has('antenna')) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(hx + S * 0.02, hy + S * 0.04);
    ctx.quadraticCurveTo(hx + S * 0.12, hy - S * 0.15, hx + S * 0.2, hy - S * 0.22);
    ctx.stroke();
    glow(ctx, hx + S * 0.2, hy - S * 0.24, S * 0.18, look.c3, 0.8);
    ellipse(ctx, hx + S * 0.2, hy - S * 0.24, S * 0.05, S * 0.05, look.c3);
  }
  if (has('flame') && !has('tail')) flame(ctx, hx, hy + S * 0.06, S * 0.32, t, look);
  if (has('crystals')) {
    const [bx, by] = a.back;
    for (const [dx, h, tilt] of [[-0.18, 0.35, -0.3], [0.02, 0.5, 0.05], [0.2, 0.3, 0.35]] as const) {
      const x = bx + dx * S;
      const y = by + S * 0.08;
      const tx = x + tilt * S * 0.2;
      const ty = y - h * S;
      glow(ctx, tx, ty + h * S * 0.4, S * 0.2, look.c3, 0.35);
      poly(ctx, [x - S * 0.06, y, tx, ty, x + S * 0.06, y], look.c3, OUT, 1.1);
      poly(ctx, [x, y, tx, ty, x + S * 0.06, y], shade(look.c3, -0.3));
    }
  }
  if (has('shell')) {
    const [bx, by] = a.back;
    ctx.strokeStyle = rgba(look.c3, 0.7);
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(bx, by + S * 0.28, S * (0.12 + i * 0.1), Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  }
  if (has('bolt') && !has('tail')) {
    const [bx, by] = a.back;
    poly(ctx, [bx, by + S * 0.05, bx - S * 0.08, by + S * 0.22, bx + S * 0.0, by + S * 0.2, bx - S * 0.06, by + S * 0.38, bx + S * 0.1, by + S * 0.14, bx + S * 0.02, by + S * 0.16], look.c3, OUT, 1);
  }
  if (has('hood')) {
    const [cx, cy] = a.head;
    const r = a.headR * 1.25;
    ctx.beginPath();
    ctx.moveTo(cx - r * 1.05, cy + r * 0.5);
    ctx.quadraticCurveTo(cx - r * 1.1, cy - r * 1.3, cx - r * 0.1, cy - r * 1.45);
    ctx.quadraticCurveTo(cx + r * 0.9, cy - r * 1.1, cx + r * 1.0, cy + r * 0.2);
    ctx.quadraticCurveTo(cx + r * 0.4, cy - r * 0.55, cx - r * 0.2, cy - r * 0.35);
    ctx.quadraticCurveTo(cx - r * 0.65, cy - r * 0.1, cx - r * 1.05, cy + r * 0.5);
    ctx.fillStyle = shaded(ctx, cx, cy - r * 0.5, r, shade(look.c1, -0.25));
    ctx.fill();
    outline(ctx, 1.3);
  }
  if (has('halo')) {
    const [cx, cy] = a.top;
    glow(ctx, cx, cy - S * 0.18, S * 0.35, look.c3, 0.5);
    ctx.strokeStyle = rgba(look.c3, 0.95);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy - S * 0.18, S * 0.2, S * 0.06, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function anchorsFor(look: Look, S: number): Anchors {
  switch (look.body) {
    case 'quad':
      return { head: [S * 0.36, -S * 0.7], headR: S * 0.26, top: [S * 0.34, -S * 0.94], tail: [-S * 0.42, -S * 0.5], back: [-S * 0.05, -S * 0.66], eye: [S * 0.42, -S * 0.73, S * 0.075, S * 0.14] };
    case 'biped':
      return { head: [S * 0.03, -S * 1.02], headR: S * 0.24, top: [S * 0.02, -S * 1.26], tail: [-S * 0.22, -S * 0.4], back: [-S * 0.12, -S * 0.78], eye: [S * 0.1, -S * 1.04, S * 0.07, S * 0.13] };
    case 'bird':
      return { head: [S * 0.28, -S * 0.92], headR: S * 0.2, top: [S * 0.26, -S * 1.12], tail: [-S * 0.3, -S * 0.5], back: [-S * 0.05, -S * 0.72], eye: [S * 0.33, -S * 0.95, S * 0.065, S * 0.1] };
    case 'serpent':
      return { head: [S * 0.32, -S * 0.86], headR: S * 0.22, top: [S * 0.3, -S * 1.08], tail: [-S * 0.42, -S * 0.25], back: [-S * 0.05, -S * 0.62], eye: [S * 0.38, -S * 0.9, S * 0.07, S * 0.11] };
    case 'golem':
      return { head: [S * 0.02, -S * 1.03], headR: S * 0.17, top: [S * 0.02, -S * 1.18], tail: [-S * 0.3, -S * 0.4], back: [0, -S * 0.95], eye: [S * 0.06, -S * 1.03, S * 0.05, S * 0.12] };
    case 'mushroom':
      return { head: [0, -S * 0.42], headR: S * 0.25, top: [0, -S * 1.0], tail: [-S * 0.3, -S * 0.3], back: [0, -S * 0.95], eye: [S * 0.06, -S * 0.38, S * 0.075, S * 0.16] };
    case 'crab':
      return { head: [S * 0.15, -S * 0.5], headR: S * 0.2, top: [S * 0.18, -S * 0.72], tail: [-S * 0.4, -S * 0.3], back: [0, -S * 0.6], eye: [S * 0.18, -S * 0.82, S * 0.06, S * 0.14] };
    case 'spider':
      return { head: [S * 0.24, -S * 0.42], headR: S * 0.2, top: [S * 0.22, -S * 0.6], tail: [-S * 0.4, -S * 0.5], back: [-S * 0.2, -S * 0.78], eye: [S * 0.3, -S * 0.46, S * 0.045, S * 0.1] };
    case 'dragon':
      return { head: [S * 0.52, -S * 1.05], headR: S * 0.22, top: [S * 0.48, -S * 1.25], tail: [-S * 0.45, -S * 0.48], back: [-S * 0.05, -S * 0.75], eye: [S * 0.56, -S * 1.1, S * 0.06, S * 0.1] };
    case 'wisp':
      return { head: [0, -S * 0.72], headR: S * 0.3, top: [0, -S * 1.02], tail: [-S * 0.2, -S * 0.3], back: [-S * 0.1, -S * 0.8], eye: [S * 0.08, -S * 0.72, S * 0.07, S * 0.15] };
    case 'blob':
    default:
      return { head: [0, -S * 0.5], headR: S * 0.42, top: [0, -S * 0.86], tail: [-S * 0.38, -S * 0.25], back: [-S * 0.15, -S * 0.75], eye: [S * 0.1, -S * 0.56, S * 0.1, S * 0.2] };
  }
}

function drawBody(ctx: Ctx, look: Look, a: Anchors, S: number, t: number) {
  const { c1, c2 } = look;
  switch (look.body) {
    case 'blob': {
      for (const dx of [-0.2, 0.2]) blobE(ctx, dx * S, -S * 0.05, S * 0.13, S * 0.08, shade(c1, -0.2), 1.3);
      blobE(ctx, 0, -S * 0.44, S * 0.44, S * 0.41, c1);
      ellipse(ctx, S * 0.08, -S * 0.32, S * 0.26, S * 0.22, rgba(c2, 0.85));
      blobE(ctx, S * 0.36, -S * 0.36, S * 0.09, S * 0.07, c1, 1.2);
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(S * 0.14, -S * 0.43, S * 0.05, 0.2, Math.PI - 0.2);
      ctx.stroke();
      break;
    }
    case 'quad':
    case 'dragon': {
      const big = look.body === 'dragon';
      const legs = [-0.3, -0.12, 0.12, 0.28];
      legs.forEach((lx, i) => {
        const back = i % 2 === 0;
        const step = Math.sin(t * 5 + i * 1.7) * S * 0.015;
        rrect(ctx, lx * S - S * 0.07, -S * 0.42 + step, S * (big ? 0.16 : 0.13), S * 0.42 - step, S * 0.05);
        ctx.fillStyle = back ? shade(c1, -0.35) : shade(c1, -0.05);
        ctx.fill();
        outline(ctx, 1.3);
      });
      blobE(ctx, -S * 0.05, -S * (big ? 0.52 : 0.45), S * (big ? 0.46 : 0.42), S * (big ? 0.3 : 0.25), c1);
      ellipse(ctx, S * 0.02, -S * (big ? 0.42 : 0.37), S * 0.3, S * 0.11, rgba(c2, 0.75));
      if (big) {
        ctx.strokeStyle = OUT;
        ctx.lineCap = 'round';
        ctx.lineWidth = S * 0.2 + 3;
        ctx.beginPath();
        ctx.moveTo(S * 0.25, -S * 0.6);
        ctx.quadraticCurveTo(S * 0.48, -S * 0.7, a.head[0] - S * 0.05, a.head[1] + S * 0.05);
        ctx.stroke();
        ctx.strokeStyle = c1;
        ctx.lineWidth = S * 0.2;
        ctx.stroke();
        blobE(ctx, a.head[0], a.head[1], a.headR * 1.2, a.headR * 0.85, c1);
        ellipse(ctx, a.head[0] + S * 0.18, a.head[1] + S * 0.06, S * 0.12, S * 0.07, shade(c2, -0.1));
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(a.head[0] + S * 0.05, a.head[1] + S * 0.1);
        ctx.lineTo(a.head[0] + S * 0.3, a.head[1] + S * 0.08);
        ctx.stroke();
      } else {
        blobE(ctx, a.head[0], a.head[1], a.headR, a.headR * 0.92, c1);
        blobE(ctx, a.head[0] + S * 0.19, a.head[1] + S * 0.08, S * 0.12, S * 0.085, c2, 1.2);
        ellipse(ctx, a.head[0] + S * 0.29, a.head[1] + S * 0.05, S * 0.035, S * 0.025, OUT);
      }
      break;
    }
    case 'biped': {
      for (const dx of [-0.1, 0.1]) {
        rrect(ctx, dx * S - S * 0.07, -S * 0.38, S * 0.14, S * 0.38, S * 0.05);
        ctx.fillStyle = shade(c1, dx < 0 ? -0.35 : -0.15);
        ctx.fill();
        outline(ctx, 1.3);
      }
      blobE(ctx, -S * 0.27, -S * 0.6, S * 0.08, S * 0.2, shade(c1, -0.3), 1.3, 0.3);
      ctx.beginPath();
      ctx.moveTo(-S * 0.25, -S * 0.3);
      ctx.quadraticCurveTo(-S * 0.32, -S * 0.75, 0, -S * 0.85);
      ctx.quadraticCurveTo(S * 0.32, -S * 0.75, S * 0.25, -S * 0.3);
      ctx.quadraticCurveTo(0, -S * 0.22, -S * 0.25, -S * 0.3);
      ctx.fillStyle = shaded(ctx, 0, -S * 0.6, S * 0.35, c1);
      ctx.fill();
      outline(ctx);
      ellipse(ctx, S * 0.04, -S * 0.52, S * 0.13, S * 0.2, rgba(c2, 0.7));
      blobE(ctx, a.head[0], a.head[1], a.headR, a.headR, c2);
      blobE(ctx, S * 0.28, -S * 0.58, S * 0.08, S * 0.2, c1, 1.3, -0.3);
      break;
    }
    case 'bird': {
      ctx.strokeStyle = '#3a2a10';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-S * 0.05, -S * 0.3);
      ctx.lineTo(-S * 0.08, 0);
      ctx.moveTo(S * 0.08, -S * 0.3);
      ctx.lineTo(S * 0.1, 0);
      ctx.stroke();
      poly(ctx, [-S * 0.25, -S * 0.5, -S * 0.6, -S * 0.42, -S * 0.55, -S * 0.32, -S * 0.25, -S * 0.42], shade(c1, -0.2), OUT, 1.2);
      blobE(ctx, 0, -S * 0.55, S * 0.34, S * 0.28, c1, 1.6, -0.35);
      ellipse(ctx, S * 0.1, -S * 0.48, S * 0.18, S * 0.15, rgba(c2, 0.8));
      blobE(ctx, a.head[0], a.head[1], a.headR, a.headR, c1);
      poly(ctx, [a.head[0] + S * 0.15, a.head[1] - S * 0.03, a.head[0] + S * 0.36, a.head[1] + S * 0.04, a.head[0] + S * 0.15, a.head[1] + S * 0.1], '#f0b030', OUT, 1.2);
      break;
    }
    case 'serpent': {
      const segs = 7;
      for (let i = 0; i < segs; i++) {
        const u = i / (segs - 1);
        const x = -S * 0.42 + u * S * 0.7;
        const y = -S * 0.18 - Math.sin(u * Math.PI * 1.2 + t * 2) * S * 0.08 - u * S * 0.42;
        const r = S * (0.2 - u * 0.04);
        blobE(ctx, x, y, r, r * 0.9, i % 2 ? c1 : shade(c1, -0.06), 1.4);
        ellipse(ctx, x + r * 0.25, y + r * 0.25, r * 0.55, r * 0.4, rgba(c2, 0.65));
      }
      blobE(ctx, a.head[0], a.head[1], a.headR * 1.1, a.headR * 0.85, c1);
      ellipse(ctx, a.head[0] + S * 0.12, a.head[1] + S * 0.08, S * 0.14, S * 0.07, rgba(c2, 0.9));
      break;
    }
    case 'golem': {
      for (const dx of [-0.15, 0.15]) {
        rrect(ctx, dx * S - S * 0.1, -S * 0.32, S * 0.2, S * 0.32, S * 0.05);
        ctx.fillStyle = shade(c1, dx < 0 ? -0.35 : -0.15);
        ctx.fill();
        outline(ctx, 1.4);
      }
      rrect(ctx, -S * 0.52, -S * 0.82, S * 0.2, S * 0.62, S * 0.08);
      ctx.fillStyle = shade(c1, -0.35);
      ctx.fill();
      outline(ctx, 1.4);
      rrect(ctx, -S * 0.34, -S * 0.95, S * 0.68, S * 0.66, S * 0.14);
      ctx.fillStyle = shaded(ctx, 0, -S * 0.65, S * 0.45, c1);
      ctx.fill();
      outline(ctx, 1.8);
      ctx.strokeStyle = rgba(look.c3, 0.55);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-S * 0.1, -S * 0.85);
      ctx.lineTo(0, -S * 0.65);
      ctx.lineTo(-S * 0.06, -S * 0.5);
      ctx.moveTo(S * 0.15, -S * 0.75);
      ctx.lineTo(S * 0.22, -S * 0.55);
      ctx.stroke();
      rrect(ctx, -S * 0.17, -S * 1.18, S * 0.36, S * 0.28, S * 0.08);
      ctx.fillStyle = shaded(ctx, 0, -S * 1.05, S * 0.2, shade(c1, 0.05));
      ctx.fill();
      outline(ctx, 1.4);
      rrect(ctx, S * 0.32, -S * 0.82, S * 0.2, S * 0.62, S * 0.08);
      ctx.fillStyle = shaded(ctx, S * 0.42, -S * 0.5, S * 0.3, c1);
      ctx.fill();
      outline(ctx, 1.4);
      break;
    }
    case 'mushroom': {
      for (const dx of [-0.14, 0.14]) blobE(ctx, dx * S, -S * 0.04, S * 0.1, S * 0.06, shade(c2, -0.25), 1.2);
      ctx.beginPath();
      ctx.moveTo(-S * 0.24, -S * 0.05);
      ctx.quadraticCurveTo(-S * 0.3, -S * 0.4, -S * 0.2, -S * 0.66);
      ctx.lineTo(S * 0.2, -S * 0.66);
      ctx.quadraticCurveTo(S * 0.3, -S * 0.4, S * 0.24, -S * 0.05);
      ctx.closePath();
      ctx.fillStyle = shaded(ctx, 0, -S * 0.35, S * 0.3, c2);
      ctx.fill();
      outline(ctx);
      const cy = -S * 0.66;
      glow(ctx, 0, cy - S * 0.15, S * 0.8, look.c3, 0.3);
      ctx.beginPath();
      ctx.ellipse(0, cy, S * 0.52, S * 0.44, 0, Math.PI, 0);
      ctx.quadraticCurveTo(0, cy + S * 0.16, -S * 0.52, cy);
      ctx.fillStyle = shaded(ctx, 0, cy - S * 0.2, S * 0.5, c1);
      ctx.fill();
      outline(ctx);
      for (let i = 0; i < 5; i++) {
        const ang = Math.PI + (i + 0.5) * (Math.PI / 5);
        const x = Math.cos(ang) * S * 0.32;
        const y = cy + Math.sin(ang) * S * 0.24;
        glow(ctx, x, y, S * 0.1, look.c3, 0.6);
        ellipse(ctx, x, y, S * 0.05, S * 0.04, rgba(look.c3, 0.95));
      }
      break;
    }
    case 'crab': {
      ctx.strokeStyle = shade(c1, -0.3);
      ctx.lineWidth = 2.4;
      for (let i = 0; i < 3; i++) {
        for (const dir of [-1, 1]) {
          const bx = dir * S * 0.22 - S * 0.05 + i * S * 0.08 * dir;
          ctx.beginPath();
          ctx.moveTo(bx, -S * 0.3);
          ctx.lineTo(bx + dir * S * 0.18, -S * 0.25);
          ctx.lineTo(bx + dir * S * 0.24, 0);
          ctx.stroke();
        }
      }
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.4;
      for (const ex of [0.12, 0.25]) {
        ctx.beginPath();
        ctx.moveTo(ex * S, -S * 0.5);
        ctx.lineTo(ex * S, -S * 0.78);
        ctx.stroke();
      }
      blobE(ctx, 0, -S * 0.38, S * 0.46, S * 0.27, c1);
      ellipse(ctx, S * 0.05, -S * 0.27, S * 0.3, S * 0.1, rgba(c2, 0.7));
      for (const [cx, cy, sc] of [[0.42, -0.42, 1], [0.32, -0.24, 0.8]] as const) {
        const x = cx * S;
        const y = cy * S;
        const snap = Math.sin(t * 4) * 0.15;
        blobE(ctx, x, y, S * 0.17 * sc, S * 0.12 * sc, shade(c1, 0.05), 1.4);
        ctx.save();
        ctx.translate(x + S * 0.12 * sc, y);
        ctx.rotate(-0.3 - snap);
        poly(ctx, [0, 0, S * 0.18 * sc, -S * 0.05, S * 0.05, -S * 0.12 * sc], shade(c2, -0.1), OUT, 1.1);
        ctx.restore();
      }
      break;
    }
    case 'spider': {
      ctx.lineCap = 'round';
      for (let i = 0; i < 4; i++) {
        for (const side of [0, 1]) {
          const bx = -S * 0.05 + i * S * 0.1;
          const kneeX = bx + (i - 1.5) * S * 0.22 + (side ? S * 0.05 : -S * 0.05);
          const kneeY = -S * 0.75 + Math.sin(t * 6 + i + side) * S * 0.03;
          const footX = bx + (i - 1.5) * S * 0.36;
          ctx.strokeStyle = side ? OUT : shade(OUT, 0.1);
          ctx.lineWidth = side ? 3.2 : 2.6;
          ctx.beginPath();
          ctx.moveTo(bx, -S * 0.45);
          ctx.lineTo(kneeX, kneeY);
          ctx.lineTo(footX, 0);
          ctx.stroke();
          ctx.strokeStyle = side ? c2 : shade(c2, -0.3);
          ctx.lineWidth = side ? 1.6 : 1.2;
          ctx.stroke();
        }
      }
      blobE(ctx, -S * 0.22, -S * 0.52, S * 0.34, S * 0.3, c1);
      ctx.strokeStyle = rgba(look.c3, 0.8);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-S * 0.3, -S * 0.72);
      ctx.lineTo(-S * 0.2, -S * 0.55);
      ctx.lineTo(-S * 0.3, -S * 0.5);
      ctx.lineTo(-S * 0.18, -S * 0.32);
      ctx.stroke();
      blobE(ctx, a.head[0], a.head[1], a.headR, a.headR * 0.85, shade(c1, 0.1));
      break;
    }
    case 'wisp': {
      const [hx, hy] = a.head;
      const r = a.headR;
      ctx.beginPath();
      ctx.moveTo(hx - r, hy);
      ctx.arc(hx, hy, r, Math.PI, 0);
      const w = Math.sin(t * 5) * S * 0.05;
      ctx.quadraticCurveTo(hx + r * 0.9, hy + r * 1.2, hx + r * 0.3 + w, hy + r * 1.6);
      ctx.quadraticCurveTo(hx, hy + r * 1.1, hx - r * 0.3 - w, hy + r * 1.75);
      ctx.quadraticCurveTo(hx - r * 0.8, hy + r * 1.1, hx - r, hy);
      const g = ctx.createLinearGradient(0, hy - r, 0, hy + r * 1.8);
      g.addColorStop(0, shade(c1, 0.2));
      g.addColorStop(0.6, c1);
      g.addColorStop(1, rgba(c1, 0.1));
      ctx.fillStyle = g;
      ctx.fill();
      outline(ctx, 1.4);
      ellipse(ctx, hx + S * 0.05, hy + r * 0.45, r * 0.45, r * 0.4, rgba(c2, 0.35));
      break;
    }
  }
}

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  const d = mx - mn;
  if (d === 0) return [0, 0, l];
  const sat = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60;
  return [h, sat, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

const shinyLooks = new WeakMap<Look, Look>();

// Variante chromatique d'un rendu procédural : rotation de teinte des couleurs de base.
function shinyLook(look: Look): Look {
  let v = shinyLooks.get(look);
  if (!v) {
    const rot = (c: string) => {
      const [h, sat, l] = hexToHsl(c);
      return hslToHex((h + 150) % 360, Math.min(1, sat * 1.1), l);
    };
    v = { ...look, c1: rot(look.c1), c2: rot(look.c2), c3: rot(look.c3) };
    shinyLooks.set(look, v);
  }
  return v;
}

export interface UnitRef {
  key: string;
  monster: boolean;
  star: number;
  look: Look;
}

export interface UnitDrawOpts extends CreatureDrawOpts {
  wind?: number;
  cast?: number;
  stun?: boolean;
  moving?: number;
  dead?: number;
  pop?: number;
  shiny?: boolean;
}

export function spriteFor(ref: Pick<UnitRef, 'key' | 'monster' | 'star'>) {
  return getSprite(ref.monster ? monsterSpriteKey(ref.key) : creatureSpriteKey(ref.key, ref.star));
}

// Dessine une unité : sprite peint animé s'il existe, sinon le rendu procédural d'origine.
export function drawUnit(ctx: Ctx, ref: UnitRef, x: number, y: number, S: number, o: UnitDrawOpts) {
  const sp = spriteFor(ref);
  if (!sp) {
    drawCreature(ctx, o.shiny ? shinyLook(ref.look) : ref.look, x, y, S, { ...o, star: ref.star });
    return;
  }
  const H = ref.monster ? S * 1.3 : S * (0.95 + 0.9 * sp.rel);
  if (!ref.monster && ref.star >= 3) glow(ctx, x, y - H * 0.45, H * 0.8, '#ffd25a', 0.18);
  drawPuppet(ctx, sp, x, y, H, {
    t: o.t, facing: o.facing, phase: o.phase, lunge: o.lunge, wind: o.wind, flash: o.flash, cast: o.cast, stun: o.stun,
    moving: o.moving, dead: o.dead, alpha: o.alpha, shiny: o.shiny, pop: o.pop,
  });
  if (o.shiny) {
    const tt = o.t * 3 + (o.phase ?? 0);
    for (let i = 0; i < 3; i++) {
      const a = tt + i * 2.1;
      const k = (Math.sin(a) + 1) / 2;
      glow(ctx, x + Math.cos(a * 0.8 + i) * H * 0.28, y - H * (0.25 + 0.5 * ((i * 0.37 + tt * 0.1) % 1)), 4 + k * 5, '#fff6b0', 0.8 * k);
    }
  }
}

// Hauteur affichée d'un sprite pour une taille de case donnée (utile pour placer barres de vie et textes).
export function unitHeight(ref: Pick<UnitRef, 'key' | 'monster' | 'star'>, S: number) {
  const sp = spriteFor(ref);
  if (!sp) return S * 1.15;
  return ref.monster ? S * 1.3 : S * (0.95 + 0.9 * sp.rel);
}

export function drawCreature(ctx: Ctx, look: Look, x: number, y: number, S: number, o: CreatureDrawOpts) {
  const star = o.star ?? 1;
  const sc = star === 3 ? 1.3 : star === 2 ? 1.14 : 1;
  S *= sc;
  const t = o.t + (o.phase ?? 0);
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  ctx.translate(x, y);
  const floating = look.body === 'wisp' || look.body === 'bird';
  ellipse(ctx, 0, 0, S * 0.42, S * 0.12, 'rgba(0,0,0,0.38)');
  if (star >= 2) glow(ctx, 0, -S * 0.5, S * (star === 3 ? 1.1 : 0.8), star === 3 ? '#ffd25a' : look.c3, star === 3 ? 0.35 : 0.18);
  const bob = Math.sin(t * 3) * S * (floating ? 0.06 : 0.025) - (floating ? S * 0.12 : 0);
  ctx.translate((o.lunge ?? 0) * S * 0.3 * o.facing, bob);
  ctx.scale(o.facing, 1);
  const breathe = 1 + Math.sin(t * 3) * 0.02;
  ctx.scale(1 / breathe, breathe);
  if (look.evo && star > 1) {
    const extra = star >= 3 ? [...look.evo[0], ...look.evo[1]] : look.evo[0];
    look = { ...look, parts: [...look.parts, ...extra.filter((p) => !look.parts.includes(p))] };
  }
  const a = anchorsFor(look, S);
  backParts(ctx, look, a, S, t);
  drawBody(ctx, look, a, S, t);
  frontParts(ctx, look, a, S, t);
  const [ex, ey, er, eg] = a.eye;
  const hooded = look.parts.includes('hood');
  if (hooded) eyes(ctx, { ...look, eye: 'glow' }, ex, ey, er, eg, t);
  else eyes(ctx, look, ex, ey, er, eg, t);
  if (o.flash && o.flash > 0) {
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, 0, -S * 0.5, S * 0.7, '#ffffff', 0.7 * o.flash);
  }
  ctx.restore();
}

// Portrait de créature mis en cache (cartes de boutique, panneaux).
const portraitCache = new Map<string, string>();

export function creaturePortrait(key: string, look: Look, star = 1, size = 96, shiny = false): string {
  const k = `${key}:${star}:${size}:${shiny ? 1 : 0}`;
  const hit = portraitCache.get(k);
  if (hit) return hit;
  const sp = key.startsWith('m-') ? getSprite(monsterSpriteKey(key.slice(2))) : getSprite(creatureSpriteKey(key, star));
  if (sp) {
    const url = spriteDataUrl(sp, size, shiny);
    portraitCache.set(k, url);
    return url;
  }
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d')!;
  const S = size * (look.body === 'dragon' ? 0.48 : look.body === 'golem' ? 0.56 : 0.62);
  drawCreature(ctx, shiny ? shinyLook(look) : look, size * (look.body === 'dragon' ? 0.4 : 0.48), size * 0.9, S / (star === 3 ? 1.3 : star === 2 ? 1.14 : 1), { t: 0.6, facing: 1, star });
  const url = c.toDataURL();
  portraitCache.set(k, url);
  return url;
}
