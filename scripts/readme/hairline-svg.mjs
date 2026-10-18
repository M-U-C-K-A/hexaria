// Convertit la figure Hairline « realm » en SVG animé (SMIL), clair et sombre, sans fond :
// on photographie ses poses (repos, tour, cristal, colisée) dans Chrome, puis on anime les tracés d'une pose à l'autre.
// Usage : node scripts/readme/hairline-svg.mjs
import { existsSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';

const ROOT = process.cwd();
const require = createRequire(join(homedir(), 'Library', 'Caches', 'hairline-look', 'x.js'));
const { chromium } = require('playwright-core');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PAGE = 'file://' + join(ROOT, 'docs', 'hairline', 'hairline-realm.html');

// Même caméra que la figure (Cam(45, .5, 2.0) + fit) pour retrouver les points écran des bâtisses.
const S = 2.0, k = 0.5, az = (45 * Math.PI) / 180, zf = Math.sqrt(1 - k * k);
const projRaw = (x, y, z) => [S * (x * Math.cos(az) - y * Math.sin(az)), S * ((x * Math.sin(az) + y * Math.cos(az)) * k - z * zf)];
const pts = [[-64, -64, -7], [64, 64, -7], [64, -64, -7], [-64, 64, -7], [-27, -14, 96], [31, -22, 84]].map((p) => projRaw(...p));
const ox = 200 - (Math.min(...pts.map((p) => p[0])) + Math.max(...pts.map((p) => p[0]))) / 2;
const oy = 168 - (Math.min(...pts.map((p) => p[1])) + Math.max(...pts.map((p) => p[1]))) / 2;
const P = (x, y, z) => {
  const q = projRaw(x, y, z);
  return [Math.round(q[0] + ox), Math.round(q[1] + oy)];
};
const poses = { rest: null, tower: P(-27, -14, 24), crystal: P(31, -22, 28), arena: P(6, 28, 8) };

const browser = await chromium.launch({ executablePath: existsSync(CHROME) ? CHROME : undefined });
const out = {};
for (const theme of ['light', 'dark']) {
  out[theme] = {};
  for (const [name, at] of Object.entries(poses)) {
    const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
    await page.goto(`${PAGE}?theme=${theme}${at ? `&at=${at.join(',')}` : ''}`);
    await page.waitForTimeout(2600);
    out[theme][name] = await page.evaluate(() => {
      const svg = document.querySelector('[data-hairline] svg');
      return [...svg.querySelectorAll('path,polygon,ellipse,line')].map((el) => {
        const cs = getComputedStyle(el);
        return {
          tag: el.tagName.toLowerCase(), d: el.getAttribute('d'), cx: el.getAttribute('cx'), cy: el.getAttribute('cy'),
          rx: el.getAttribute('rx'), ry: el.getAttribute('ry'), stroke: cs.stroke, fill: cs.fill, dash: cs.strokeDasharray,
        };
      });
    });
    await page.close();
  }
}
await browser.close();

// ligne du temps : [pose, instant]
const T = 12;
const line = [['rest', 0], ['tower', 0.9], ['tower', 2.4], ['rest', 3.3], ['rest', 3.9], ['crystal', 4.8], ['crystal', 6.3], ['rest', 7.2], ['rest', 7.8], ['arena', 8.7], ['arena', 10.2], ['rest', 11.1], ['rest', T]];
const keyTimes = line.map(([, t]) => (t / T).toFixed(4)).join(';');
const splines = line.slice(1).map(([pose], i) => (pose === line[i][0] ? '0 0 1 1' : '0.32 0.72 0 1')).join(';');

for (const theme of ['light', 'dark']) {
  const bg = theme === 'light' ? '#ffffff' : '#0d1117';
  const rest = out[theme].rest;
  const anim = (attr, vals) => {
    const uniq = new Set(vals);
    if (uniq.size === 1) return '';
    return `<animate attributeName="${attr}" values="${vals.join(';')}" keyTimes="${keyTimes}" calcMode="spline" keySplines="${splines}" dur="${T}s" repeatCount="indefinite"/>`;
  };
  const seq = (get) => line.map(([pose]) => get(out[theme][pose]));
  const body = rest.map((el, i) => {
    const nf = el.fill === 'none';
    const isDot = el.stroke === 'none' || el.stroke === 'rgba(0, 0, 0, 0)';
    const fill = nf ? 'none' : isDot ? el.fill : bg;
    const common = `fill="${fill}" ${isDot ? '' : `stroke="${el.stroke}" stroke-width="1.35" stroke-linejoin="round" stroke-linecap="round"`}${el.dash && el.dash !== 'none' ? ` stroke-dasharray="1.6 4"` : ''}`;
    const frames = line.map(([pose]) => out[theme][pose][i]);
    const inner = [];
    if (el.tag === 'path') {
      const lens = new Set(frames.map((f) => (f.d.match(/[ML]/g) || []).length));
      if (lens.size === 1) inner.push(anim('d', frames.map((f) => f.d)));
    } else {
      inner.push(anim('cx', frames.map((f) => f.cx)), anim('cy', frames.map((f) => f.cy)));
    }
    if (isDot) inner.push(anim('fill', frames.map((f) => f.fill)));
    else inner.push(anim('stroke', frames.map((f) => f.stroke)));
    const attrs = el.tag === 'path' ? `d="${el.d}"` : `cx="${el.cx}" cy="${el.cy}" rx="${el.rx}" ry="${el.ry}"`;
    return `<${el.tag} ${attrs} ${common}>${inner.join('')}</${el.tag}>`;
  }).join('\n');
  writeFileSync(join(ROOT, 'docs', 'assets', `hairline-realm-${theme}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320" width="400" height="320" role="img" aria-label="Figure Hairline : une tuile hexagonale avec une tour, un colisée et un cristal qui s'élèvent tour à tour"><style>@media (prefers-reduced-motion: reduce){animate{display:none}}</style>\n${body}\n</svg>\n`);
  console.log('✓ hairline-realm-' + theme + '.svg', rest.length, 'éléments');
}
