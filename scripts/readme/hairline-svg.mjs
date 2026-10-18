// Convertit les figures Hairline de docs/hairline/ en SVG animés (SMIL) pour le README : clair et sombre, sans fond.
// Chaque figure est jouée dans Chrome avec une horloge simulée : un « pointeur » suit une chorégraphie, on capture
// le dessin toutes les 50 ms, puis chaque tracé devient une animation <animate> (valeurs identiques fusionnées).
// Usage : node scripts/readme/hairline-svg.mjs [realm plateau oeuf codex]
// Prérequis : les pages construites docs/hairline/hairline-<nom>.html (node <skill>/build.mjs <nom>.js)
//             et playwright-core (installé par le skill hairline dans ~/Library/Caches/hairline-look).
import { existsSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ROOT = process.cwd();
const require = createRequire(join(homedir(), 'Library', 'Caches', 'hairline-look', 'x.js'));
const { chromium } = require('playwright-core');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DT = 50; // ms entre deux captures (par défaut ; une figure lourde peut en prendre plus)

// Palette du README : gris-vert de Hexaria, et l'or pour le trait vif. `plate` = fond de GitHub (clair / sombre).
const PALETTE = {
  light: { plate: '#ffffff', edge: '#33423c', mid: '#7d8a85', lo: '#c3ccc8', hi: '#b8790c' },
  dark: { plate: '#0d1117', edge: '#c8d5cf', mid: '#7a8883', lo: '#3a4642', hi: '#ffc95e' },
};

// Chorégraphies : [action, durée en ms]. action = [x, y] (point du viewBox 400 × 320), 'leave' ou null (attendre).
const FIGURES = {
  realm: {
    label: "Figure Hairline : un royaume sur sa tuile hexagonale ; la tour, le cristal puis le colisée s'élèvent tour à tour",
    steps: [[null, 1400], [[182, 144], 1900], ['leave', 900], [[275, 172], 1900], ['leave', 900], [[169, 225], 1900], ['leave', 1500]],
  },
  plateau: {
    label: "Figure Hairline : le plateau hexagonal de l'arène, dont les cases se soulèvent sous le pointeur",
    dt: 100,
    steps: [[null, 1300], [[168, 200], 1800], [[244, 160], 1800], ['leave', 1900]],
  },
  oeuf: {
    label: "Figure Hairline : un œuf mystérieux dans son nid, qui éclot quand le pointeur approche",
    steps: [[null, 1300], [[300, 205], 700], [[248, 178], 700], [[204, 152], 2200], ['leave', 2000]],
  },
  codex: {
    label: 'Figure Hairline : le Codex ouvert, dont les pages se dressent sous le pointeur',
    steps: [[null, 1400], [[232, 200], 1700], [[158, 176], 1700], [[201, 188], 1700], ['leave', 1800]],
  },
};

const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(FIGURES);
const browser = await chromium.launch({ executablePath: existsSync(CHROME) ? CHROME : undefined });

/** Joue la chorégraphie et renvoie les images capturées : { t, els: [{ k, tag, geo, cls }] } dans l'ordre du document. */
async function capture(name, steps, dt = DT) {
  const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
  await page.clock.install({ time: 0 });
  await page.goto('file://' + join(ROOT, 'docs', 'hairline', `hairline-${name}.html`) + '?theme=light');
  await page.clock.runFor(2500);
  await page.evaluate(() => {
    let k = 0;
    document.querySelectorAll('[data-hairline] svg :is(path,circle,ellipse,line,polygon)').forEach((el) => (el.dataset.k = k++));
  });
  const snap = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('[data-hairline] svg :is(path,circle,ellipse,line,polygon)')].map((el) => {
        const a = (n) => el.getAttribute(n);
        const tag = el.tagName.toLowerCase();
        const geo = tag === 'path' ? { d: a('d') || '' } : tag === 'circle' ? { cx: a('cx'), cy: a('cy'), r: a('r') } : { cx: a('cx'), cy: a('cy'), rx: a('rx'), ry: a('ry') };
        return { k: +el.dataset.k, tag, geo, cls: el.getAttribute('class') || '' };
      }),
    );
  const point = (action) =>
    page.evaluate((action) => {
      const stage = document.querySelector('[data-hairline]');
      const r = stage.getBoundingClientRect();
      if (action === 'leave') return stage.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse', pointerId: 1 }));
      stage.dispatchEvent(new PointerEvent('pointermove', {
        pointerType: 'mouse', pointerId: 1, bubbles: true,
        clientX: r.left + (action[0] / 400) * r.width, clientY: r.top + (action[1] / 320) * r.height,
      }));
    }, action);
  const frames = [];
  let t = 0;
  frames.push({ t, els: await snap() });
  for (const [action, ms] of steps) {
    if (action) await point(action);
    for (let s = dt; s <= ms; s += dt) {
      await page.clock.runFor(dt);
      t += dt;
      frames.push({ t, els: await snap() });
    }
  }
  await page.close();
  return { frames, dur: t, dt };
}

// ——— géométrie : arrondi à 0,1 et chemins compacts ———
const r1 = (n) => {
  const v = Math.round(Number(n) * 10) / 10;
  return Object.is(v, -0) ? '0' : String(v);
};
const compactD = (d) =>
  d.replace(/-?\d*\.?\d+(?:e-?\d+)?/g, (m) => r1(m)).replace(/\s*([MLZ])\s*/gi, '$1').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
const geoKey = (g) => (g.d !== undefined ? compactD(g.d) : Object.entries(g).map(([k, v]) => `${k}=${r1(v)}`).join(';'));

/** Couleur de trait (ou de remplissage, pour les points) d'un élément selon ses classes. */
function look(tag, cls, P) {
  const c = cls.split(/\s+/);
  if (c.includes('dot')) return { fill: c.includes('off') ? P.lo : c.includes('m') ? P.edge : P.hi, stroke: 'none' };
  const fill = c.includes('nf') ? 'none' : P.plate;
  const stroke = c.includes('fo') ? 'none' : c.includes('hi') ? P.hi : c.includes('lo') ? P.lo : c.includes('sil') ? P.edge : P.mid;
  return { fill, stroke, dash: c.includes('dash') };
}

/**
 * Construit le SVG. Les « cases » sont les positions dans l'ordre de peinture : si une figure réordonne ses groupes
 * (le Codex), chaque case montre l'élément qui s'y trouve à cet instant, avec un saut au changement.
 * Si la suite des balises change d'une image à l'autre (la marque du plateau qui change de place), on garde l'ordre
 * de la première image et les éléments qui bougent dans l'ordre sont peints en dernier.
 */
function build(name, { frames, dur, dt }, theme, label) {
  const P = PALETTE[theme];
  const sig = (f) => f.els.map((e) => e.tag).join(',');
  const slotMode = frames.every((f) => sig(f) === sig(frames[0]));
  const byK = frames.map((f) => new Map(f.els.map((e) => [e.k, e])));
  let slots;
  if (slotMode) {
    slots = frames[0].els.map((_, i) => frames.map((f) => f.els[i].k));
  } else {
    const first = frames[0].els.map((e) => e.k);
    const moving = new Set();
    frames.forEach((f) => f.els.forEach((e, i) => { if (e.k !== first[i]) moving.add(e.k); }));
    const order = first.filter((k) => !moving.has(k)).concat(first.filter((k) => moving.has(k)));
    slots = order.map((k) => frames.map(() => k));
  }
  const kt = (t) => (t / dur).toFixed(4);
  const out = [];
  for (const ks of slots) {
    const e0 = byK[0].get(ks[0]);
    // suites (instant, valeur) pour la géométrie et la couleur, avec un saut quand la case change d'élément
    const geo = [], col = [];
    ks.forEach((k, f) => {
      const t = frames[f].t;
      if (f > 0 && k !== ks[f - 1]) {
        geo.push([t, geoKey(byK[f].get(ks[f - 1]).geo)]);
        col.push([t, look(e0.tag, byK[f].get(ks[f - 1]).cls, P)]);
      }
      geo.push([t, geoKey(byK[f].get(k).geo)]);
      col.push([t, look(e0.tag, byK[f].get(k).cls, P)]);
    });
    const attrs = e0.tag === 'path' ? ['d'] : Object.keys(e0.geo);
    const parse = (v) => (e0.tag === 'path' ? { d: v } : Object.fromEntries(v.split(';').map((s) => s.split('='))));
    const init = parse(geo[0][1]);
    const L0 = col[0][1];
    const anim = [];
    // géométrie : on fusionne les valeurs répétées (on ne garde que les bords des paliers)
    const squeeze = (seq) => seq.filter((p, i) => i === 0 || i === seq.length - 1 || !(p[1] === seq[i - 1][1] && p[1] === seq[i + 1][1]));
    if (new Set(geo.map((g) => g[1])).size > 1) {
      const sq = squeeze(geo);
      for (const a of attrs) {
        const vals = sq.map(([, v]) => parse(v)[a]);
        if (new Set(vals).size === 1) continue;
        anim.push(`<animate attributeName="${a}" dur="${dur / 1000}s" repeatCount="indefinite" keyTimes="${sq.map(([t]) => kt(t)).join(';')}" values="${vals.join(';')}"/>`);
      }
    }
    // couleur : chaque changement s'étale sur 260 ms, comme la transition du moteur
    for (const prop of ['stroke', 'fill']) {
      const seq = col.map(([t, L]) => [t, L[prop]]);
      if (new Set(seq.map((s) => s[1])).size === 1) continue;
      const pts = [[0, seq[0][1]]];
      for (let i = 1; i < seq.length; i++) {
        if (seq[i][1] === seq[i - 1][1]) continue;
        const t0 = seq[i][0] - dt, t1 = Math.min(dur, t0 + 260);
        pts.push([t0, seq[i - 1][1]], [t1, seq[i][1]]);
      }
      pts.push([dur, seq[seq.length - 1][1]]);
      const clean = pts.filter((p, i) => i === 0 || p[0] > pts[i - 1][0] || p[1] !== pts[i - 1][1]);
      anim.push(`<animate attributeName="${prop}" dur="${dur / 1000}s" repeatCount="indefinite" keyTimes="${clean.map(([t]) => kt(t)).join(';')}" values="${clean.map(([, c]) => c).join(';')}"/>`);
    }
    const geoAttr = attrs.map((a) => `${a}="${init[a]}"`).join(' ');
    const style = `fill="${L0.fill}" stroke="${L0.stroke}"${L0.dash ? ' stroke-dasharray="1.2 3.4"' : ''}`;
    const tag = e0.tag === 'circle' || e0.tag === 'ellipse' ? e0.tag : 'path';
    out.push(anim.length ? `<${tag} ${geoAttr} ${style}>${anim.join('')}</${tag}>` : `<${tag} ${geoAttr} ${style}/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320" width="400" height="320" role="img" aria-label="${label}">
<style>path,circle,ellipse{stroke-width:1.2;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}@media (prefers-reduced-motion: reduce){animate{display:none}}</style>
${out.join('\n')}
</svg>
`;
}

for (const name of wanted) {
  const fig = FIGURES[name];
  const cap = await capture(name, fig.steps, fig.dt);
  for (const theme of ['light', 'dark']) {
    const svg = build(name, cap, theme, fig.label);
    writeFileSync(join(ROOT, 'docs', 'assets', `hairline-${name}-${theme}.svg`), svg);
    console.log(`✓ hairline-${name}-${theme}.svg`, (svg.length / 1024).toFixed(0) + ' Ko', cap.frames.length, 'images');
  }
}
await browser.close();
