// Sprites peints (WebP transparents) + animation « marionnette » : chaque image est découpée en bandes
// horizontales déformées à chaque image (respiration, balancement, bond, élan d'attaque, etc.).
import manifestJson from '../assets/art/manifest.json';

interface Meta {
  w: number;
  h: number;
  ax: number;
  pad: number;
  rel: number;
  lazy?: boolean; // gros fonds : chargés à la demande (ensureSprite)
}

export interface Sprite {
  key: string;
  img: HTMLImageElement;
  w: number;
  h: number;
  ax: number;
  rel: number;
  white?: HTMLCanvasElement;
  shiny?: HTMLCanvasElement;
}

const manifest = manifestJson as Record<string, Meta>;
const urls = import.meta.glob('../assets/art/**/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
const sprites = new Map<string, Sprite>();

const pending = new Map<string, Promise<Sprite | null>>();

function loadOne(key: string): Promise<Sprite | null> {
  const have = sprites.get(key);
  if (have) return Promise.resolve(have);
  const meta = manifest[key];
  const url = urls[`../assets/art/${key}.webp`];
  if (!meta || !url) return Promise.resolve(null);
  let p = pending.get(key);
  if (!p) {
    p = new Promise<Sprite | null>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const sp: Sprite = { key, img, w: img.naturalWidth || meta.w, h: img.naturalHeight || meta.h, ax: meta.ax, rel: meta.rel };
        sprites.set(key, sp);
        resolve(sp);
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
    pending.set(key, p);
  }
  return p;
}

// Charge au démarrage tout sauf les gros fonds (arènes, événements, écran titre).
export function loadSprites(): Promise<void> {
  const keys = Object.entries(manifest).filter(([, m]) => !m.lazy).map(([k]) => k);
  return Promise.all(keys.map(loadOne)).then(() => undefined);
}

export function ensureSprite(key: string): Promise<Sprite | null> {
  return loadOne(key);
}

// Dessine l'image en remplissant tout le rectangle (recadrage centré sur le point d'intérêt fx, fy).
export function drawCover(ctx: CanvasRenderingContext2D, sp: Sprite, x: number, y: number, w: number, h: number, fx = 0.5, fy = 0.5) {
  const s = Math.max(w / sp.w, h / sp.h);
  const dw = sp.w * s;
  const dh = sp.h * s;
  ctx.drawImage(sp.img, x + (w - dw) * fx, y + (h - dh) * fy, dw, dh);
}

export function getSprite(key: string): Sprite | null {
  return sprites.get(key) ?? null;
}

export const creatureSpriteKey = (id: string, star: number) => `creatures/${id}_${star}`;
export const monsterSpriteKey = (id: string) => `monsters/${id}`;

export function hasPaintedCreature(id: string) {
  return sprites.has(creatureSpriteKey(id, 1));
}

function canvasOf(sp: Sprite) {
  const c = document.createElement('canvas');
  c.width = sp.w;
  c.height = sp.h;
  return c;
}

// Silhouette blanche (flash quand on reçoit un coup).
function whiteOf(sp: Sprite) {
  if (sp.white) return sp.white;
  const c = canvasOf(sp);
  const g = c.getContext('2d')!;
  g.drawImage(sp.img, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, c.width, c.height);
  sp.white = c;
  return c;
}

// Variante chromatique : rotation de teinte, mise en cache.
function shinyOf(sp: Sprite) {
  if (sp.shiny) return sp.shiny;
  const c = canvasOf(sp);
  const g = c.getContext('2d')!;
  g.drawImage(sp.img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height);
  const px = d.data;
  const rot = (150 * Math.PI) / 180;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  // rotation de teinte dans l'espace YIQ-like (matrice standard)
  const m = [
    0.213 + cos * 0.787 - sin * 0.213, 0.715 - cos * 0.715 - sin * 0.715, 0.072 - cos * 0.072 + sin * 0.928,
    0.213 - cos * 0.213 + sin * 0.143, 0.715 + cos * 0.285 + sin * 0.14, 0.072 - cos * 0.072 - sin * 0.283,
    0.213 - cos * 0.213 - sin * 0.787, 0.715 - cos * 0.715 + sin * 0.715, 0.072 + cos * 0.928 + sin * 0.072,
  ];
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i];
    const gg = px[i + 1];
    const b = px[i + 2];
    px[i] = Math.max(0, Math.min(255, r * m[0] + gg * m[1] + b * m[2]));
    px[i + 1] = Math.max(0, Math.min(255, r * m[3] + gg * m[4] + b * m[5]));
    px[i + 2] = Math.max(0, Math.min(255, r * m[6] + gg * m[7] + b * m[8]));
  }
  g.putImageData(d, 0, 0);
  sp.shiny = c;
  return c;
}

export interface Pose {
  t: number;
  facing: 1 | -1;
  phase?: number;
  lunge?: number; // 1 -> 0 juste après une attaque
  wind?: number; // 0 -> 1 juste avant une attaque (recul d'élan)
  flash?: number;
  cast?: number; // 0.6 -> 0 pendant un sort
  stun?: boolean;
  moving?: number; // progression 0..1 d'un déplacement, undefined si à l'arrêt
  dead?: number; // 0..1 progression de la mort
  alpha?: number;
  shiny?: boolean;
  pop?: number; // 1 -> 0 : impulsion d'apparition / d'évolution
  shadow?: boolean;
}

const STRIPS = 18;

function strips(
  ctx: CanvasRenderingContext2D, src: CanvasImageSource, sw: number, sh: number,
  dw: number, dh: number, sx: number, sy: number, sway: number, lean: number, t: number, ax: number, waveAmp: number, alpha: number,
) {
  ctx.globalAlpha = alpha;
  const stripH = dh * sy / STRIPS;
  const top = -dh * sy;
  const left = -ax * dw * sx;
  for (let i = 0; i < STRIPS; i++) {
    const k = (STRIPS - 1 - i) / (STRIPS - 1); // 1 en haut, 0 aux pieds
    const off = sway * Math.pow(k, 1.4) + lean * Math.pow(k, 1.15) + Math.sin(t * 3.4 + i * 0.5) * waveAmp * k;
    ctx.drawImage(src, 0, (i * sh) / STRIPS, sw, sh / STRIPS + 0.5, left + off, top + i * stripH, dw * sx, stripH + 1);
  }
}

// (x, y) = point d'appui au sol, H = hauteur affichée du sprite en pixels.
export function drawPuppet(ctx: CanvasRenderingContext2D, sp: Sprite, x: number, y: number, H: number, pose: Pose) {
  const s = H / sp.h;
  const dw = sp.w * s;
  const dh = sp.h * s;
  const t = pose.t + (pose.phase ?? 0);
  const breath = Math.sin(t * 2.4);
  let sx = 1 - 0.012 * breath;
  let sy = 1 + 0.024 * breath;
  let sway = Math.sin(t * 1.6) * 0.012 * dh;
  let lean = 0;
  let dx = 0;
  let dy = 0;
  let tilt = 0;
  let flash = pose.flash ?? 0;
  let alpha = pose.alpha ?? 1;
  const lunge = pose.lunge ?? 0;
  const wind = pose.wind ?? 0;

  dx += (lunge * 0.17 - wind * 0.06) * dh;
  lean += (lunge * 0.2 - wind * 0.1) * dh;
  sy *= 1 - 0.06 * lunge + 0.04 * wind;
  sx *= 1 + 0.08 * lunge - 0.02 * wind;

  if (pose.moving !== undefined) {
    const k = pose.moving;
    dy -= Math.abs(Math.sin(k * Math.PI)) * 0.075 * dh;
    tilt += Math.sin(k * Math.PI * 2) * 0.05;
    sy *= 1 + 0.045 * Math.sin(k * Math.PI * 2);
    sx *= 1 - 0.03 * Math.sin(k * Math.PI * 2);
  }
  if (pose.cast && pose.cast > 0) {
    const q = Math.min(1, pose.cast / 0.6);
    sy *= 1 + 0.09 * q;
    sx *= 1 - 0.03 * q;
    dy -= 0.05 * dh * q;
  }
  if (pose.stun) tilt += Math.sin(t * 14) * 0.07;
  if (flash > 0) dx -= Math.sin(t * 70) * flash * 0.02 * dh;
  if (pose.pop && pose.pop > 0) {
    const q = pose.pop;
    sx *= 1 + 0.25 * q;
    sy *= 1 + 0.25 * q;
  }
  if (pose.dead && pose.dead > 0) {
    const p = pose.dead;
    sy *= 1 - 0.55 * p;
    sx *= 1 + 0.25 * p;
    alpha *= 1 - p;
    flash = Math.max(flash, 1 - p * 2.2);
  }

  ctx.save();
  ctx.translate(x, y);
  if (pose.shadow !== false) {
    ctx.globalAlpha = alpha * 0.55;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 0, Math.max(dw, dh) * 0.3 * sx, Math.max(dw, dh) * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.scale(pose.facing, 1);
  ctx.translate(dx, dy);
  ctx.rotate(tilt);
  const src = pose.shiny ? shinyOf(sp) : sp.img;
  strips(ctx, src, sp.w, sp.h, dw, dh, sx, sy, sway, lean, t, sp.ax, 0.004 * dh, alpha);
  if (flash > 0.02) strips(ctx, whiteOf(sp), sp.w, sp.h, dw, dh, sx, sy, sway, lean, t, sp.ax, 0.004 * dh, alpha * Math.min(1, flash) * 0.85);
  ctx.restore();
  ctx.globalAlpha = 1;
}

// Image statique (cartes de boutique, listes) : le sprite tient dans une boîte carrée.
export function spriteDataUrl(sp: Sprite, size: number, shiny = false): string {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d')!;
  const k = Math.min((size * 0.94) / sp.w, (size * 0.94) / sp.h);
  const w = sp.w * k;
  const h = sp.h * k;
  g.drawImage(shiny ? shinyOf(sp) : sp.img, (size - w) / 2, size - h - size * 0.03, w, h);
  return c.toDataURL();
}
