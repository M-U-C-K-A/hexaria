import { RNG } from '../core/rng';
import type { ArtTheme } from '../data/events';
import { type Ctx, ellipse, glow, poly, rgba, shade } from './draw';
import { conifer, crystalCluster, mushroom, roundTree } from './terrainArt';
import { isoBox, gableRoof, windowGlow } from './draw';
import { type UnitRef, drawUnit } from './creatureArt';
import { drawCover, getSprite } from './sprites';

export type EventCreature = UnitRef & { shiny?: boolean };

const PALETTES: Partial<Record<ArtTheme, { sky: [string, string]; fog: string; ground: string; accent: string }>> = {
  mushrooms: { sky: ['#04110e', '#0f3a2c'], fog: '#2fd3a0', ground: '#0d2a1e', accent: '#7affc0' },
  caravan: { sky: ['#120c10', '#3a2418'], fog: '#ff9a4a', ground: '#21160f', accent: '#ffc76a' },
  shipwreck: { sky: ['#060c18', '#16304a'], fog: '#6ab8ff', ground: '#1a1a14', accent: '#bfe8ff' },
  egg: { sky: ['#07110f', '#1d3a30'], fog: '#c8ff8a', ground: '#132617', accent: '#fff0a0' },
  stars: { sky: ['#03050f', '#141a3a'], fog: '#8a8aff', ground: '#10141a', accent: '#ffd25a' },
  altar: { sky: ['#0a0612', '#2a1440'], fog: '#a070ff', ground: '#120c18', accent: '#d2b8ff' },
  village: { sky: ['#0a0c14', '#2a2a40'], fog: '#ffc76a', ground: '#16201a', accent: '#ffc76a' },
  camp: { sky: ['#0a0e0c', '#2c2a1a'], fog: '#ff8a3a', ground: '#18170f', accent: '#ffb35c' },
  ruins: { sky: ['#050b10', '#1a3038'], fog: '#8fffe0', ground: '#101a18', accent: '#bfffe6' },
  lair: { sky: ['#070a08', '#1c2a1c'], fog: '#ff5a5a', ground: '#101610', accent: '#ff6b5a' },
  victory: { sky: ['#140c06', '#4a2a10'], fog: '#ffd25a', ground: '#2a1c0e', accent: '#ffe08a' },
  defeat: { sky: ['#0c0606', '#2a1012'], fog: '#ff5a5a', ground: '#160c0c', accent: '#ff8a7a' },
};

function backdrop(ctx: Ctx, W: number, H: number, theme: ArtTheme, rng: RNG) {
  const p = PALETTES[theme]!;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, p.sky[0]);
  g.addColorStop(1, p.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  glow(ctx, W * 0.5, H * 0.45, W * 0.6, p.fog, 0.18);
  // silhouettes lointaines
  for (let layer = 0; layer < 2; layer++) {
    const col = layer === 0 ? shade(p.sky[1], -0.2) : shade(p.sky[0], 0.05);
    for (let i = 0; i < 9; i++) {
      const x = rng.range(-20, W + 20);
      const h = rng.range(H * 0.3, H * 0.6) * (layer ? 1.2 : 0.9);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x - h * 0.25, H * 0.75);
      ctx.lineTo(x, H * 0.75 - h);
      ctx.lineTo(x + h * 0.25, H * 0.75);
      ctx.fill();
    }
    ctx.fillStyle = rgba(p.fog, 0.05);
    ctx.fillRect(0, H * 0.4, W, H * 0.4);
  }
}

function shafts(ctx: Ctx, W: number, H: number, col: string, rng: RNG) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const x = rng.range(W * 0.1, W * 0.9);
    const w = rng.range(18, 50);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, rgba(col, 0.12));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + w, 0);
    ctx.lineTo(x + w * 2.2 + 60, H);
    ctx.lineTo(x + w * 1.2 + 60, H);
    ctx.fill();
  }
  ctx.restore();
}

function ground(ctx: Ctx, W: number, H: number, col: string) {
  const g = ctx.createLinearGradient(0, H * 0.6, 0, H);
  g.addColorStop(0, shade(col, 0.15));
  g.addColorStop(1, shade(col, -0.4));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, H * 0.72);
  ctx.quadraticCurveTo(W * 0.5, H * 0.6, W, H * 0.72);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.fill();
}

function foliage(ctx: Ctx, W: number, H: number, rng: RNG, col = '#06140e') {
  for (let i = 0; i < 14; i++) {
    const left = i % 2 === 0;
    const x = left ? rng.range(-30, W * 0.15) : rng.range(W * 0.85, W + 30);
    const y = rng.range(H * 0.65, H + 20);
    const r = rng.range(25, 60);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.5, rng.range(-0.8, 0.8), 0, Math.PI * 2);
    ctx.fill();
  }
}

function motes(ctx: Ctx, W: number, H: number, col: string, rng: RNG, n = 40) {
  for (let i = 0; i < n; i++) {
    const x = rng.range(0, W);
    const y = rng.range(H * 0.15, H * 0.95);
    glow(ctx, x, y, rng.range(3, 8), col, 0.7);
  }
}

function vignette(ctx: Ctx, W: number, H: number) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.75)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function campfire(ctx: Ctx, x: number, y: number, s: number) {
  glow(ctx, x, y - s * 0.4, s * 4, '#ff8a3a', 0.45);
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = '#4a2e1a';
    ctx.lineWidth = s * 0.18;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.6, y + s * 0.1 - i * 2);
    ctx.lineTo(x + s * 0.6, y - s * 0.1 + i * 2);
    ctx.stroke();
  }
  const layer = (sc: number, col: string) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.5 * sc, y);
    ctx.quadraticCurveTo(x - s * 0.3 * sc, y - s * 1.2 * sc, x, y - s * 1.6 * sc);
    ctx.quadraticCurveTo(x + s * 0.3 * sc, y - s * 1.0 * sc, x + s * 0.5 * sc, y);
    ctx.fill();
  };
  layer(1, '#ff5a1a');
  layer(0.7, '#ffa03a');
  layer(0.4, '#fff0a0');
}

export function paintEventArt(canvas: HTMLCanvasElement, theme: ArtTheme, seed = 1, creature?: EventCreature) {
  const ctx = canvas.getContext('2d')!;
  const W = canvas.width;
  const H = canvas.height;
  const rng = new RNG(seed * 31 + theme.length * 977);
  ctx.clearRect(0, 0, W, H);

  // Illustration peinte fournie (art/event_<thème>.png) : elle remplace le dessin procédural.
  const painted = getSprite(`events/${creature && theme === 'egg' ? 'hatch' : theme}`);
  if (painted) {
    drawCover(ctx, painted, 0, 0, W, H);
    if (creature) {
      const hatch = theme === 'egg';
      glow(ctx, W * 0.5, H * (hatch ? 0.6 : 0.7), H * 0.5, creature.shiny ? '#ffe27a' : hatch ? '#c8ff8a' : '#ffe0a0', hatch ? 0.5 : 0.3);
      drawUnit(ctx, creature, W * 0.5, H * (hatch ? 0.84 : 0.88), H * (hatch ? 0.36 : 0.3), { t: 0.4, facing: 1, shiny: creature.shiny });
    }
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
    return;
  }
  backdrop(ctx, W, H, theme, rng);
  const p = PALETTES[theme]!;
  shafts(ctx, W, H, p.fog, rng);
  ground(ctx, W, H, p.ground);

  switch (theme) {
    case 'mushrooms': {
      const beamX = W * 0.36;
      const bg = ctx.createLinearGradient(0, 0, 0, H * 0.75);
      bg.addColorStop(0, 'rgba(122,255,220,0)');
      bg.addColorStop(1, 'rgba(122,255,220,0.5)');
      ctx.fillStyle = bg;
      ctx.fillRect(beamX - 8, 0, 16, H * 0.75);
      glow(ctx, beamX, H * 0.68, 90, '#7affdc', 0.6);
      poly(ctx, [beamX - 10, H * 0.72, beamX, H * 0.12, beamX + 12, H * 0.72], '#c8fff0', 'rgba(0,80,60,0.8)', 1.5);
      poly(ctx, [beamX, H * 0.12, beamX + 12, H * 0.72, beamX + 2, H * 0.74], '#5ae0b8');
      const shrooms: [number, number, number, string][] = [
        [0.62, 0.78, 150, '#1f8a5a'],
        [0.14, 0.8, 95, '#2fa080'],
        [0.84, 0.72, 80, '#2fd3a0'],
        [0.48, 0.74, 60, '#3fe08a'],
        [0.25, 0.7, 50, '#2fd3b0'],
      ];
      shrooms.sort((a, b) => a[1] - b[1]);
      for (const [fx, fy, s, c] of shrooms) mushroom(ctx, W * fx, H * fy, s, c, '#9dffd9');
      crystalCluster(ctx, W * 0.42, H * 0.92, 34, '#f2b33a', rng);
      crystalCluster(ctx, W * 0.08, H * 0.86, 26, '#f2b33a', rng);
      glow(ctx, beamX + 10, H * 0.74, 40, '#ffd25a', 0.5);
      break;
    }
    case 'caravan': {
      const x = W * 0.55;
      const y = H * 0.8;
      for (const wx of [-70, 60]) {
        ellipse(ctx, x + wx, y, 22, 22, '#3a2414');
        ctx.strokeStyle = '#8a6a3a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x + wx, y, 18, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#5a3a20';
      ctx.fillRect(x - 110, y - 50, 220, 40);
      const cg = ctx.createLinearGradient(0, y - 150, 0, y - 50);
      cg.addColorStop(0, '#e8d8b0');
      cg.addColorStop(1, '#a08a60');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(x - 105, y - 50);
      ctx.bezierCurveTo(x - 105, y - 170, x + 105, y - 170, x + 105, y - 50);
      ctx.fill();
      ctx.strokeStyle = 'rgba(60,40,20,0.7)';
      ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * 40, y - 50);
        ctx.quadraticCurveTo(x + i * 32, y - 140, x + i * 20, y - 138);
        ctx.stroke();
      }
      glow(ctx, x - 115, y - 70, 50, '#ffc76a', 0.6);
      ellipse(ctx, x - 115, y - 70, 6, 8, '#ffe08a');
      glow(ctx, x + 115, y - 70, 50, '#ffc76a', 0.6);
      ellipse(ctx, x + 115, y - 70, 6, 8, '#ffe08a');
      campfire(ctx, W * 0.18, H * 0.86, 26);
      break;
    }
    case 'shipwreck': {
      ctx.fillStyle = '#0a1a2a';
      ctx.fillRect(0, H * 0.62, W, H * 0.12);
      ctx.strokeStyle = 'rgba(160,220,255,0.25)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 8; i++) {
        const y = H * 0.64 + i * 7;
        ctx.beginPath();
        for (let x = 0; x <= W; x += 20) ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 2);
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(W * 0.5, H * 0.78);
      ctx.rotate(-0.18);
      ctx.fillStyle = '#3a2414';
      ctx.beginPath();
      ctx.moveTo(-170, -30);
      ctx.quadraticCurveTo(-10, 90, 170, -60);
      ctx.lineTo(120, -40);
      ctx.lineTo(60, -10);
      ctx.lineTo(0, -40);
      ctx.lineTo(-60, -5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#6a4a2a';
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-150 + i * 10, -20 + i * 14);
        ctx.quadraticCurveTo(0, 60 - i * 6 + i * 10, 150 - i * 15, -45 + i * 12);
        ctx.stroke();
      }
      ctx.strokeStyle = '#2a1a0e';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.lineTo(60, -230);
      ctx.stroke();
      poly(ctx, [55, -215, 140, -140, 50, -120], 'rgba(220,210,180,0.6)');
      ctx.restore();
      glow(ctx, W * 0.82, H * 0.18, 70, '#dff2ff', 0.5);
      ellipse(ctx, W * 0.82, H * 0.18, 24, 24, '#eef8ff');
      for (let i = 0; i < 4; i++) isoBox(ctx, W * (0.18 + i * 0.05), H * (0.86 + (i % 2) * 0.04), 14, 16, '#6a4a2a');
      break;
    }
    case 'egg': {
      const x = W * 0.5;
      const y = H * 0.76;
      if (creature) {
        // Éclosion : la créature émerge d'une coquille brisée dans un éclat de lumière.
        glow(ctx, x, y - 90, 260, creature.shiny ? '#ffe27a' : '#c8ff8a', 0.7);
        for (let i = 0; i < 40; i++) glow(ctx, x + rng.range(-200, 200), y - rng.range(10, 280), rng.range(3, 8), creature.shiny ? '#fff0a0' : '#eaffc0', 0.8);
        drawUnit(ctx, creature, x, y + 10, H * 0.36, { t: 0.4, facing: 1, shiny: creature.shiny });
        for (const [dx, rot] of [[-70, -0.4], [78, 0.5], [-20, 0.1]] as const) {
          ctx.save();
          ctx.translate(x + dx, y + 8);
          ctx.rotate(rot);
          ctx.fillStyle = '#e9f0c0';
          ctx.strokeStyle = '#4a5a2a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-30, 0);
          ctx.lineTo(-18, -22);
          ctx.lineTo(-6, -8);
          ctx.lineTo(6, -26);
          ctx.lineTo(18, -10);
          ctx.lineTo(30, 0);
          ctx.quadraticCurveTo(0, 18, -30, 0);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
        break;
      }
      ctx.strokeStyle = '#5a3a1a';
      for (let i = 0; i < 30; i++) {
        ctx.lineWidth = rng.range(2, 4);
        ctx.beginPath();
        const a0 = rng.range(0, Math.PI);
        ctx.ellipse(x, y, rng.range(80, 110), rng.range(25, 38), 0, a0, a0 + rng.range(0.8, 2));
        ctx.stroke();
      }
      glow(ctx, x, y - 60, 160, '#c8ff8a', 0.55);
      const eg = ctx.createRadialGradient(x - 20, y - 100, 5, x, y - 60, 75);
      eg.addColorStop(0, '#fffde0');
      eg.addColorStop(0.5, '#d8f0a0');
      eg.addColorStop(1, '#5a8a40');
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.ellipse(x, y - 60, 55, 72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(160,255,120,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 30, y - 100);
      ctx.lineTo(x - 10, y - 80);
      ctx.lineTo(x - 22, y - 60);
      ctx.lineTo(x + 5, y - 40);
      ctx.moveTo(x + 25, y - 110);
      ctx.lineTo(x + 15, y - 85);
      ctx.lineTo(x + 32, y - 70);
      ctx.stroke();
      for (const fx of [0.15, 0.82]) roundTree(ctx, W * fx, H * 0.8, 50, '#2d5a3a');
      break;
    }
    case 'stars': {
      for (let i = 0; i < 120; i++) ellipse(ctx, rng.range(0, W), rng.range(0, H * 0.6), rng.range(0.5, 1.5), rng.range(0.5, 1.5), `rgba(255,255,255,${rng.range(0.3, 0.9)})`);
      for (let i = 0; i < 6; i++) {
        const x = rng.range(W * 0.2, W);
        const y = rng.range(0, H * 0.4);
        const g = ctx.createLinearGradient(x, y, x - 140, y - 70);
        g.addColorStop(0, 'rgba(255,220,120,0.95)');
        g.addColorStop(1, 'rgba(255,220,120,0)');
        ctx.strokeStyle = g;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 140, y - 70);
        ctx.stroke();
        glow(ctx, x, y, 12, '#ffe08a', 0.9);
      }
      for (let i = 0; i < 5; i++) crystalCluster(ctx, rng.range(W * 0.1, W * 0.9), rng.range(H * 0.78, H * 0.95), rng.range(14, 26), '#f2b33a', rng);
      break;
    }
    case 'altar': {
      const x = W * 0.5;
      const y = H * 0.8;
      glow(ctx, x, y - 120, 200, '#a070ff', 0.5);
      isoBox(ctx, x, y, 110, 70, '#2a2430');
      isoBox(ctx, x, y - 70, 80, 14, '#3a3242');
      ctx.fillStyle = 'rgba(200,160,255,0.9)';
      ctx.font = '22px serif';
      ctx.fillText('ᚱ ᚦ ᛟ', x - 70, y - 20);
      const layer = (sc: number, col: string) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(x - 40 * sc, y - 92);
        ctx.quadraticCurveTo(x - 30 * sc, y - 92 - 120 * sc, x, y - 92 - 170 * sc);
        ctx.quadraticCurveTo(x + 25 * sc, y - 92 - 100 * sc, x + 40 * sc, y - 92);
        ctx.fill();
      };
      layer(1, '#5a2aa0');
      layer(0.7, '#a070ff');
      layer(0.4, '#ead8ff');
      for (const fx of [0.12, 0.88]) {
        ctx.strokeStyle = '#1a1420';
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.moveTo(W * fx, H);
        ctx.quadraticCurveTo(W * fx + 20, H * 0.5, W * fx - 30, H * 0.2);
        ctx.stroke();
      }
      break;
    }
    case 'village': {
      const houses: [number, number, number][] = [[0.2, 0.74, 44], [0.42, 0.7, 36], [0.66, 0.74, 48], [0.86, 0.71, 34]];
      for (const [fx, fy, s] of houses) {
        isoBox(ctx, W * fx, H * fy, s, s * 0.9, '#5a4a3a');
        gableRoof(ctx, W * fx, H * fy, s, s * 0.9, s * 0.7, '#5a2e22');
        windowGlow(ctx, W * fx - s * 0.7, H * fy - s * 0.25, s * 0.22, s * 0.3, 'L', '#ffc76a');
      }
      ctx.strokeStyle = 'rgba(60,40,20,0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, H * 0.3);
      ctx.quadraticCurveTo(W * 0.5, H * 0.48, W, H * 0.28);
      ctx.stroke();
      for (let i = 1; i < 12; i++) {
        const u = i / 12;
        const x = u * W;
        const y = H * 0.3 + Math.sin(u * Math.PI) * H * 0.16 - u * H * 0.02;
        glow(ctx, x, y + 6, 16, i % 2 ? '#ffc76a' : '#ff8a5a', 0.7);
        ellipse(ctx, x, y + 6, 4, 5, i % 2 ? '#ffe08a' : '#ffb08a');
      }
      for (let i = 0; i < 7; i++) {
        const x = rng.range(W * 0.1, W * 0.9);
        const y = H * 0.9;
        ellipse(ctx, x, y - 22, 7, 7, '#0c0a08');
        ctx.fillStyle = '#0c0a08';
        ctx.fillRect(x - 6, y - 16, 12, 22);
      }
      break;
    }
    case 'camp': {
      poly(ctx, [W * 0.55, H * 0.82, W * 0.7, H * 0.42, W * 0.86, H * 0.82], '#7a5a3a', '#2a1a0e', 2);
      poly(ctx, [W * 0.66, H * 0.82, W * 0.7, H * 0.42, W * 0.74, H * 0.82], '#1a100a');
      campfire(ctx, W * 0.38, H * 0.85, 28);
      ctx.fillStyle = '#2a2a2e';
      ctx.fillRect(W * 0.18, H * 0.8, 60, 16);
      ctx.fillRect(W * 0.18 + 18, H * 0.8 + 16, 22, 20);
      ellipse(ctx, W * 0.5, H * 0.7, 14, 16, '#0c0a08');
      ctx.fillStyle = '#0c0a08';
      ctx.beginPath();
      ctx.moveTo(W * 0.5 - 22, H * 0.9);
      ctx.lineTo(W * 0.5 - 12, H * 0.72);
      ctx.lineTo(W * 0.5 + 12, H * 0.72);
      ctx.lineTo(W * 0.5 + 22, H * 0.9);
      ctx.fill();
      break;
    }
    case 'ruins': {
      const col = '#5a6a66';
      const cols: [number, number, number][] = [[0.18, 0.82, 0.55], [0.34, 0.78, 0.38], [0.66, 0.78, 0.6], [0.82, 0.82, 0.3]];
      for (const [fx, fy, hh] of cols) {
        const x = W * fx;
        const y = H * fy;
        const h = H * hh;
        const g = ctx.createLinearGradient(x - 22, 0, x + 22, 0);
        g.addColorStop(0, shade(col, 0.2));
        g.addColorStop(1, shade(col, -0.5));
        ctx.fillStyle = g;
        ctx.fillRect(x - 22, y - h, 44, h);
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        for (let k = 1; k < 4; k++) {
          ctx.beginPath();
          ctx.moveTo(x - 22 + k * 11, y - h);
          ctx.lineTo(x - 22 + k * 11, y);
          ctx.stroke();
        }
        poly(ctx, [x - 30, y - h, x - 10, y - h - 14, x + 30, y - h - 6, x + 30, y - h], shade(col, 0.1));
        ctx.fillStyle = 'rgba(80,160,90,0.5)';
        ctx.fillRect(x - 22, y - h * 0.4, 44, 10);
      }
      ctx.strokeStyle = shade(col, -0.1);
      ctx.lineWidth = 26;
      ctx.beginPath();
      ctx.arc(W * 0.5, H * 0.62, W * 0.14, Math.PI, Math.PI * 1.75);
      ctx.stroke();
      glow(ctx, W * 0.5, H * 0.6, 120, '#8fffe0', 0.3);
      break;
    }
    case 'lair': {
      ctx.fillStyle = '#20261f';
      ctx.beginPath();
      ctx.moveTo(W * 0.1, H * 0.85);
      ctx.bezierCurveTo(W * 0.15, H * 0.1, W * 0.85, H * 0.1, W * 0.9, H * 0.85);
      ctx.fill();
      ctx.fillStyle = '#020403';
      ctx.beginPath();
      ctx.moveTo(W * 0.32, H * 0.85);
      ctx.bezierCurveTo(W * 0.32, H * 0.38, W * 0.68, H * 0.38, W * 0.68, H * 0.85);
      ctx.fill();
      if (creature) {
        glow(ctx, W * 0.5, H * 0.7, 180, '#ffe0a0', 0.35);
        drawUnit(ctx, creature, W * 0.5, H * 0.86, H * 0.3, { t: 0.4, facing: 1, shiny: creature.shiny });
        for (const fx of [0.08, 0.2, 0.8, 0.93]) conifer(ctx, W * fx, H * 0.92, 140, '#123a28');
        break;
      }
      for (const dx of [-28, 28]) {
        glow(ctx, W * 0.5 + dx, H * 0.6, 40, '#ff5a5a', 0.7);
        ctx.fillStyle = '#ffd0a0';
        ctx.beginPath();
        ctx.ellipse(W * 0.5 + dx, H * 0.6, 12, 6, dx < 0 ? 0.25 : -0.25, 0, Math.PI * 2);
        ctx.fill();
        ellipse(ctx, W * 0.5 + dx, H * 0.6, 3, 6, '#200505');
      }
      for (const fx of [0.08, 0.2, 0.8, 0.93]) conifer(ctx, W * fx, H * 0.92, 140, '#123a28');
      break;
    }
    case 'defeat': {
      ctx.fillStyle = '#1c1010';
      ctx.beginPath();
      ctx.ellipse(W * 0.5, H * 0.95, W * 0.7, H * 0.35, 0, Math.PI, 0);
      ctx.fill();
      for (let i = 0; i < 5; i++) {
        const x = W * (0.1 + i * 0.2);
        ctx.save();
        ctx.translate(x, H * 0.08);
        ctx.rotate((i % 2 ? 1 : -1) * 0.12);
        ctx.fillStyle = '#4a1a14';
        ctx.beginPath();
        ctx.moveTo(-12, 0);
        ctx.lineTo(12, 0);
        ctx.lineTo(12, 50);
        ctx.lineTo(4, 38);
        ctx.lineTo(-2, 62);
        ctx.lineTo(-12, 44);
        ctx.fill();
        ctx.restore();
      }
      for (let i = 0; i < 4; i++) {
        const x = W * (0.25 + i * 0.17);
        ctx.strokeStyle = '#3a3030';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x - 20, H * 0.86);
        ctx.lineTo(x + 25, H * 0.8 - (i % 2) * 14);
        ctx.stroke();
      }
      glow(ctx, W * 0.5, H * 0.75, 140, '#ff5a3a', 0.25);
      ctx.strokeStyle = 'rgba(180,190,210,0.18)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 70; i++) {
        const x = rng.range(0, W);
        const y = rng.range(0, H);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 6, y + 18);
        ctx.stroke();
      }
      break;
    }
    case 'victory': {
      ctx.fillStyle = '#3a2a18';
      ctx.beginPath();
      ctx.ellipse(W * 0.5, H * 0.95, W * 0.7, H * 0.35, 0, Math.PI, 0);
      ctx.fill();
      for (let i = 0; i < 60; i++) {
        const x = rng.range(0, W);
        const y = rng.range(H * 0.35, H * 0.6);
        ellipse(ctx, x, y, 6, 7, '#140c06');
        ctx.fillStyle = '#140c06';
        ctx.fillRect(x - 6, y + 3, 12, 14);
      }
      for (let i = 0; i < 5; i++) {
        const x = W * (0.1 + i * 0.2);
        ctx.fillStyle = '#8a2a1a';
        ctx.fillRect(x - 12, H * 0.08, 24, 70);
        poly(ctx, [x - 12, H * 0.08 + 70, x, H * 0.08 + 82, x + 12, H * 0.08 + 70], '#8a2a1a');
        ellipse(ctx, x, H * 0.08 + 30, 7, 7, '#e0b048');
      }
      glow(ctx, W * 0.5, H * 0.72, 160, '#ffd25a', 0.6);
      crystalCluster(ctx, W * 0.5, H * 0.86, 40, '#f2b33a', rng);
      break;
    }
  }
  motes(ctx, W, H, p.accent, rng, 36);
  foliage(ctx, W, H, rng);
  vignette(ctx, W, H);
}
