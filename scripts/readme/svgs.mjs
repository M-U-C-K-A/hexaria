// Génère les SVG animés du README (versions claire et sombre, sans fond) dans docs/assets/.
// Usage : node scripts/readme/svgs.mjs   (voir aussi scripts/readme/hairline-svg.mjs pour la figure Hairline)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const OUT = join(ROOT, 'docs', 'assets');
mkdirSync(OUT, { recursive: true });
const art = (p) => join(ROOT, 'src', 'assets', 'art', p);

const THEMES = {
  light: { ink: '#1b2823', muted: '#566761', line: '#31423b', gold1: '#d39a2c', gold2: '#8d5c0a', teal: '#0b8a73', glow: '#d9a33a', soft: 'rgba(40,70,60,0.07)', edge: 'rgba(40,70,60,0.30)' },
  dark: { ink: '#ece7d8', muted: '#9fb0a8', line: '#cfe0d8', gold1: '#ffe6a8', gold2: '#e2a93e', teal: '#7affc0', glow: '#ffd98a', soft: 'rgba(255,255,255,0.05)', edge: 'rgba(255,255,255,0.22)' },
};
const EL = { feu: '#ff7a3d', eau: '#3fa9f5', plante: '#4fc760', foudre: '#f0cc2e', roche: '#c49a6c', ombre: '#a070ff' };

// ——— sprites embarqués (WebP en base64) ———
async function sprite(name, h, hue) {
  let img = sharp(art(`creatures/${name}.webp`)).resize({ height: h * 2, withoutEnlargement: true });
  if (hue) img = img.modulate({ hue });
  const buf = await img.webp({ quality: 80, effort: 5 }).toBuffer();
  const meta = await sharp(buf).metadata();
  return { uri: `data:image/webp;base64,${buf.toString('base64')}`, w: meta.width / 2, h: meta.height / 2 };
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const wrap = (T, w, h, label, defs, body, css = '') =>
  `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">
<defs>${defs}</defs>
<style>
text{font-family:'Cinzel','Palatino Linotype','Book Antiqua',Georgia,serif}
.s{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif}
.c{text-anchor:middle}
${css}
@media (prefers-reduced-motion: reduce){*{animation:none!important}animate,animateMotion,animateTransform{display:none}}
</style>
${body}
</svg>
`;

const hexPath = (cx, cy, r, sy = 1) => 'M' + [0, 1, 2, 3, 4, 5].map((k) => `${(cx + r * Math.cos(((30 + 60 * k) * Math.PI) / 180)).toFixed(1)} ${(cy + r * sy * Math.sin(((30 + 60 * k) * Math.PI) / 180)).toFixed(1)}`).join('L') + 'Z';
const rnd = (seed) => {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
};
const star4 = (cx, cy, r) => `M${cx} ${cy - r}L${cx + r * 0.28} ${cy - r * 0.28}L${cx + r} ${cy}L${cx + r * 0.28} ${cy + r * 0.28}L${cx} ${cy + r}L${cx - r * 0.28} ${cy + r * 0.28}L${cx - r} ${cy}L${cx - r * 0.28} ${cy - r * 0.28}Z`;

// ——— bannière ———
async function hero(T, name, sp) {
  const W = 1200, H = 430, R = 30;
  const r = rnd(7);
  let hexes = '';
  for (let row = 0; row < 15; row++) {
    for (let col = 0; col < 24; col++) {
      const cx = col * R * 1.732 + (row % 2) * R * 0.866 - 10, cy = row * R * 1.5 + 10;
      if (cx > W + 20) continue;
      const lit = r() < 0.09;
      hexes += `<path d="${hexPath(cx, cy, R - 2.5)}" fill="${lit ? T.glow : 'none'}" ${lit ? `class="lit" style="animation-delay:${(r() * 7).toFixed(1)}s"` : ''} stroke="${T.line}" stroke-opacity="0.11" stroke-width="1"/>`;
    }
  }
  const sparks = [[700, 60, 7], [1110, 70, 9], [980, 40, 6], [840, 40, 6], [1160, 250, 7], [660, 130, 5]]
    .map(([x, y, s], i) => `<path d="${star4(x, y, s)}" fill="${T.glow}" class="tw" style="animation-delay:${i * 0.7}s"/>`)
    .join('');
  const place = (s, x, base, delay) =>
    `<g class="bob" style="animation-delay:${delay}s"><ellipse cx="${x}" cy="${base + 2}" rx="${s.w * 0.32}" ry="9" fill="${T.ink}" opacity="0.13"/><image href="${s.uri}" x="${x - s.w / 2}" y="${base - s.h}" width="${s.w}" height="${s.h}"/></g>`;
  const pills = [['macOS natif', 112], ['TypeScript + Canvas', 170], ['Sprites peints animés', 184], ['100 % solo', 100]];
  let px = 70;
  const pillSvg = pills.map(([t, w]) => {
    const s = `<rect x="${px}" y="346" width="${w}" height="30" rx="15" fill="${T.soft}" stroke="${T.edge}"/><text class="s c" x="${px + w / 2}" y="366" font-size="13.5" fill="${T.ink}">${esc(t)}</text>`;
    px += w + 12;
    return s;
  }).join('');
  const defs = `<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.gold1}"/><stop offset="1" stop-color="${T.gold2}"/></linearGradient>`;
  const css = `.bob{animation:bob 5s ease-in-out infinite}@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
.lit{animation:lit 7s ease-in-out infinite;fill-opacity:0}@keyframes lit{0%,100%{fill-opacity:0}50%{fill-opacity:.2}}
.tw{animation:tw 3.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center;opacity:0}@keyframes tw{0%,100%{opacity:0;transform:scale(.4)}50%{opacity:.95;transform:scale(1.15)}}
.rise{animation:rise 1.2s cubic-bezier(.2,.8,.2,1) both}@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`;
  const body = `${hexes}
<text class="rise" x="70" y="186" font-size="100" font-weight="700" textLength="570" lengthAdjust="spacingAndGlyphs" fill="url(#g)">HEXARIA</text>
<text class="rise" x="72" y="236" font-size="23" font-weight="700" textLength="566" lengthAdjust="spacing" fill="${T.teal}" style="animation-delay:.15s">ROYAUMES &amp; ARÈNES</text>
<text class="s rise" x="72" y="284" font-size="17.5" fill="${T.muted}" style="animation-delay:.3s">Un roguelike solo pour macOS : bâtissez un royaume hexagonal,</text>
<text class="s rise" x="72" y="310" font-size="17.5" fill="${T.muted}" style="animation-delay:.4s">capturez des créatures et lancez-les dans des arènes d'auto-battler.</text>
<g class="rise" style="animation-delay:.55s">${pillSvg}</g>
${place(sp.stag, 748, 372, 0.9)}${place(sp.fox, 910, 376, 0)}${place(sp.lev, 1062, 372, 1.7)}
${sparks}`;
  writeFileSync(join(OUT, `hero-${name}.svg`), wrap(T, W, H, 'Hexaria — Royaumes & Arènes', defs, body, css));
}

// ——— séparateur ———
function divider(T, name) {
  const css = `.p{animation:p 2.4s ease-in-out infinite}@keyframes p{0%,100%{opacity:.25}50%{opacity:1}}`;
  const hx = [570, 600, 630].map((x, i) => `<path class="p" style="animation-delay:${i * 0.35}s" d="${hexPath(x, 17, 9)}" fill="none" stroke="${T.gold2}" stroke-width="1.6"/>`).join('');
  const body = `<line x1="40" y1="17" x2="545" y2="17" stroke="${T.edge}" stroke-width="1.2"/><line x1="655" y1="17" x2="1160" y2="17" stroke="${T.edge}" stroke-width="1.2"/>${hx}`;
  writeFileSync(join(OUT, `divider-${name}.svg`), wrap(T, 1200, 34, '', '', body, css));
}

// ——— cartes de présentation ———
function features(T, name) {
  const cards = [
    ['Bâtissez', ["Une île hexagonale, 16 bâtiments et des", "bonus d'adjacence : Port + Hôtel des", "ventes = +5 or."]],
    ['Combattez', ["Auto-battler façon TFT : boutique,", "relances, placement sur les hexagones,", "évolutions ★ 1 à 3."]],
    ['Capturez', ["Repaires, œufs mystérieux et créatures", "chromatiques ✦ : chaque partie", "réserve sa surprise."]],
    ['Dominez les types', ["6 éléments, un cycle d'ascendants :", "un type dominant inflige ×1,5.", "Choisissez bien vos duels."]],
  ];
  const W = 1200, cw = 276, gap = 24, x0 = 12;
  const css = `.draw{stroke-dasharray:1;stroke-dashoffset:1;animation:draw 6s ease-in-out infinite}@keyframes draw{0%{stroke-dashoffset:1}35%,80%{stroke-dashoffset:0}100%{stroke-dashoffset:-1}}
.up{animation:up 3.2s ease-in-out infinite}@keyframes up{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.a{animation:a 2.6s ease-in-out infinite}@keyframes a{0%,100%{transform:translateX(-14px)}50%{transform:translateX(4px)}}
.b{animation:b 2.6s ease-in-out infinite}@keyframes b{0%,100%{transform:translateX(14px)}50%{transform:translateX(-4px)}}
.fl{animation:fl 2.6s ease-in-out infinite;transform-box:fill-box;transform-origin:center}@keyframes fl{0%,40%,100%{opacity:0;transform:scale(.3)}55%{opacity:1;transform:scale(1.2)}}
.wob{animation:wob 3.4s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}@keyframes wob{0%,60%,100%{transform:rotate(0)}66%{transform:rotate(-7deg)}74%{transform:rotate(6deg)}82%{transform:rotate(-4deg)}90%{transform:rotate(2deg)}}
.spin{animation:spin 14s linear infinite;transform-box:fill-box;transform-origin:center}@keyframes spin{to{transform:rotate(360deg)}}
.tw{animation:tw 2.2s ease-in-out infinite;transform-box:fill-box;transform-origin:center}@keyframes tw{0%,100%{opacity:.2;transform:scale(.6)}50%{opacity:1;transform:scale(1.2)}}`;
  const st = `fill="none" stroke="${T.ink}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"`;
  const gold = `fill="none" stroke="${T.gold2}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"`;
  const icons = [
    (cx) => `<path d="${hexPath(cx, 118, 66, 0.5)}" ${st} opacity=".55"/><path d="${hexPath(cx, 126, 66, 0.5)}" ${st} opacity=".3"/>
      <g class="up"><path pathLength="1" class="draw" d="M${cx - 30} 108v-42l12-8 12 8v42" ${st}/><path pathLength="1" class="draw" d="M${cx - 34} 66l16-24 16 24" ${gold}/></g>
      <path pathLength="1" class="draw" d="M${cx + 14} 118v-18l10-7 10 7v18z" ${st} style="animation-delay:.5s"/><path pathLength="1" class="draw" d="M${cx + 24} 130v-12l8-6 8 6v12z" ${st} style="animation-delay:.9s"/>`,
    (cx) => `<path d="${hexPath(cx - 32, 118, 40, 0.5)}" ${st} opacity=".5"/><path d="${hexPath(cx + 32, 118, 40, 0.5)}" ${st} opacity=".5"/><path d="${hexPath(cx, 96, 40, 0.5)}" ${st} opacity=".35"/>
      <g class="a"><circle cx="${cx - 40}" cy="100" r="13" ${st}/><path d="M${cx - 48} 96l5 5 8-9" ${gold}/></g>
      <g class="b"><circle cx="${cx + 40}" cy="100" r="13" ${st}/><path d="M${cx + 34} 96l12 8m0-8l-12 8" fill="none" stroke="#e0524a" stroke-width="1.8" stroke-linecap="round"/></g>
      <path class="fl" d="${star4(cx, 78, 11)}" fill="${T.glow}"/>`,
    (cx) => `<ellipse cx="${cx}" cy="140" rx="46" ry="11" ${st} opacity=".35"/>
      <g class="wob"><path d="M${cx} 44c-28 0-44 36-44 64 0 26 20 38 44 38s44-12 44-38c0-28-16-64-44-64z" ${st}/>
      <path pathLength="1" class="draw" d="M${cx - 26} 84l12 10-9 12 14 9-5 13" ${gold}/><path pathLength="1" class="draw" d="M${cx + 20} 70l-9 11 10 6" ${gold} style="animation-delay:.6s"/></g>
      <path class="tw" d="${star4(cx + 58, 58, 8)}" fill="${T.glow}"/><path class="tw" style="animation-delay:.8s" d="${star4(cx - 62, 78, 6)}" fill="${T.glow}"/>`,
    (cx) => {
      const keys = ['feu', 'plante', 'eau', 'foudre', 'roche', 'ombre'];
      const dots = keys.map((k, i) => `<circle cx="${(cx + 58 * Math.cos(((-90 + 60 * i) * Math.PI) / 180)).toFixed(1)}" cy="${(112 + 58 * Math.sin(((-90 + 60 * i) * Math.PI) / 180)).toFixed(1)}" r="11" fill="${EL[k]}" fill-opacity=".9" stroke="${T.ink}" stroke-width="1.2"/>`).join('');
      return `<circle class="spin" cx="${cx}" cy="112" r="58" fill="none" stroke="${T.teal}" stroke-width="1.6" stroke-dasharray="5 7"/>${dots}<path d="M${cx - 16} 112h32m-10-10l10 10-10 10" ${st}/>`;
    },
  ];
  const body = cards
    .map(([title, lines], i) => {
      const x = x0 + i * (cw + gap), cx = x + cw / 2;
      return `<g><rect x="${x}" y="10" width="${cw}" height="298" rx="16" fill="${T.soft}" stroke="${T.edge}"/>
${icons[i](cx)}
<text class="c" x="${cx}" y="196" font-size="22" font-weight="700" fill="${T.gold2}">${esc(title)}</text>
${lines.map((l, j) => `<text class="s c" x="${cx}" y="${226 + j * 22}" font-size="14" fill="${T.muted}">${esc(l)}</text>`).join('')}</g>`;
    })
    .join('\n');
  writeFileSync(join(OUT, `features-${name}.svg`), wrap(T, W, 318, 'Bâtissez, combattez, capturez, dominez les types', '', body, css));
}

// ——— boucle de jeu ———
function loop(T, name) {
  const nodes = [
    ['Tour de gestion', 'bâtir · récolter · loger'],
    ['Événement ?', 'un choix, une surprise'],
    ['Arène', 'auto-battler hexagonal'],
    ['Récompense', 'relique · compagnon · œuf'],
    ['Boss final', 'Vermithrax, dragon des marais'],
  ];
  const xs = [130, 365, 600, 835, 1070];
  const css = `.flow{stroke-dasharray:6 8;animation:flow 1.4s linear infinite}@keyframes flow{to{stroke-dashoffset:-14}}
.pulse{animation:pulse 3s ease-in-out infinite;transform-box:fill-box;transform-origin:center}@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}`;
  const defs = `<marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="${T.teal}" stroke-width="1.6" stroke-linecap="round"/></marker>`;
  let body = '';
  xs.forEach((x, i) => {
    body += `<g class="pulse" style="animation-delay:${i * 0.5}s"><path d="${hexPath(x, 100, 52)}" fill="${T.soft}" stroke="${i === 4 ? '#e0524a' : T.gold2}" stroke-width="2"/><text class="c" x="${x}" y="108" font-size="26" font-weight="700" fill="${i === 4 ? '#e0524a' : T.gold2}">${i + 1}</text></g>
<text class="c" x="${x}" y="188" font-size="17" font-weight="700" fill="${T.ink}">${esc(nodes[i][0])}</text><text class="s c" x="${x}" y="210" font-size="12.5" fill="${T.muted}">${esc(nodes[i][1])}</text>`;
    if (i < 4) body += `<path class="flow" d="M${x + 62} 100H${xs[i + 1] - 62}" fill="none" stroke="${T.teal}" stroke-width="2" marker-end="url(#ar)"/>`;
  });
  body += `<path class="flow" d="M${xs[3]} 232q-340 44 -${xs[3] - xs[0]} 0" fill="none" stroke="${T.edge}" stroke-width="1.6" marker-end="url(#ar)" style="animation-direction:normal"/>
<text class="s c" x="${(xs[0] + xs[3]) / 2}" y="268" font-size="13" fill="${T.muted}">3 arènes, puis le boss : 22 tours en 4 actes. Une défaite coûte un cœur ♥ (3 au départ).</text>
<circle r="7" fill="${T.glow}"><animateMotion dur="10s" repeatCount="indefinite" path="M130 100H1070"/></circle>`;
  writeFileSync(join(OUT, `loop-${name}.svg`), wrap(T, 1200, 292, 'Boucle de jeu : tour de gestion, événement, arène, récompense, boss', defs, body, css));
}

// ——— cycle des types ———
function types(T, name) {
  const W = 1040, H = 560, cx = 330, cy = 285, R = 200;
  const ring = ['feu', 'plante', 'roche', 'foudre', 'eau'];
  const label = { feu: 'Feu', plante: 'Plante', roche: 'Roche', foudre: 'Foudre', eau: 'Eau', ombre: 'Ombre' };
  const pos = {};
  ring.forEach((k, i) => (pos[k] = [cx + R * Math.cos(((-90 + 72 * i) * Math.PI) / 180), cy + R * Math.sin(((-90 + 72 * i) * Math.PI) / 180)]));
  pos.ombre = [cx, cy];
  const edges = [['feu', 'plante'], ['plante', 'roche'], ['roche', 'foudre'], ['foudre', 'eau'], ['eau', 'feu'], ['plante', 'eau'], ['eau', 'roche'], ['roche', 'feu']];
  const css = `.flow{stroke-dasharray:6 8;animation:flow 1.6s linear infinite}@keyframes flow{to{stroke-dashoffset:-14}}
.pulse{animation:pulse 3.2s ease-in-out infinite;transform-box:fill-box;transform-origin:center}@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}`;
  const defs = `<marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M1 1L9 5L1 9" fill="none" stroke="${T.teal}" stroke-width="1.7" stroke-linecap="round"/></marker>`;
  let body = '';
  for (const [a, b] of edges) {
    const [x1, y1] = pos[a], [x2, y2] = pos[b];
    const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
    const sx = x1 + ux * 44, sy = y1 + uy * 44, ex = x2 - ux * 50, ey = y2 - uy * 50;
    const mx = (sx + ex) / 2 + (cx - (sx + ex) / 2) * 0.18, my = (sy + ey) / 2 + (cy - (sy + ey) / 2) * 0.18;
    body += `<path class="flow" d="M${sx.toFixed(1)} ${sy.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none" stroke="${T.teal}" stroke-width="2.1" marker-end="url(#ar)" opacity=".85"/>`;
  }
  // l'Ombre ne domine que l'Ombre : boucle sur elle-même
  body += `<path class="flow" d="M${cx - 30} ${cy + 40}c-34 44 74 44 40 0" fill="none" stroke="${T.teal}" stroke-width="2.1" marker-end="url(#ar)"/>`;
  Object.entries(pos).forEach(([k, [x, y]], i) => {
    body += `<g class="pulse" style="animation-delay:${i * 0.45}s"><circle cx="${x}" cy="${y}" r="40" fill="${EL[k]}" fill-opacity=".22" stroke="${EL[k]}" stroke-width="3"/><text class="c" x="${x}" y="${y + 6}" font-size="17" font-weight="700" fill="${T.ink}">${label[k]}</text></g>`;
  });
  const lx = 640;
  body += `<text x="${lx}" y="120" font-size="24" font-weight="700" fill="${T.gold2}">Qui domine qui ?</text>
<text class="s" x="${lx}" y="156" font-size="15" fill="${T.ink}">Une flèche A → B : A domine B.</text>
<text class="s" x="${lx}" y="190" font-size="15" fill="${T.teal}" font-weight="700">▲ ×1,5  super efficace</text>
<text class="s" x="${lx}" y="216" font-size="15" fill="#e0524a" font-weight="700">▼ ×0,7  peu efficace</text>
<text class="s" x="${lx}" y="262" font-size="14" fill="${T.muted}">Plante domine Eau et Roche · Eau domine Feu</text>
<text class="s" x="${lx}" y="284" font-size="14" fill="${T.muted}">et Roche · Feu domine Plante · Foudre domine</text>
<text class="s" x="${lx}" y="306" font-size="14" fill="${T.muted}">Eau · Roche domine Feu et Foudre · Ombre ne</text>
<text class="s" x="${lx}" y="328" font-size="14" fill="${T.muted}">domine que l'Ombre.</text>
<text class="s" x="${lx}" y="376" font-size="14" fill="${T.muted}">2 ou 4 créatures différentes du même type sur</text>
<text class="s" x="${lx}" y="398" font-size="14" fill="${T.muted}">le plateau activent une synergie d'équipe.</text>`;
  writeFileSync(join(OUT, `types-${name}.svg`), wrap(T, W, H, 'Cycle des types élémentaires', defs, body, css));
}

// ——— évolutions (sprites peints) ———
async function evolution(T, name, sp) {
  const W = 1200, H = 690;
  const css = `.bob{animation:bob 4.6s ease-in-out infinite}@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
.tw{animation:tw 2.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}@keyframes tw{0%,100%{opacity:.1;transform:scale(.5)}50%{opacity:1;transform:scale(1.2)}}
.flow{stroke-dasharray:5 7;animation:flow 1.3s linear infinite}@keyframes flow{to{stroke-dashoffset:-12}}`;
  const defs = `<marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M1 1L9 5L1 9" fill="none" stroke="${T.teal}" stroke-width="1.7" stroke-linecap="round"/></marker>`;
  const rows = [
    { y: 300, items: [sp.f1, sp.f2, sp.f3, sp.f3s], names: ['Flammèche', 'Pyrolis', 'Infernyx', 'Infernyx'], el: 'feu' },
    { y: 612, items: [sp.w1, sp.w2, sp.w3, sp.w3s], names: ['Goutelle', 'Marélis', 'Léviathys', 'Léviathys'], el: 'eau' },
  ];
  const cxs = [150, 415, 715, 1030];
  const starTxt = ['★', '★★', '★★★', '✦ chromatique'];
  let body = '';
  rows.forEach((row, r) => {
    row.items.forEach((s, i) => {
      const cx = cxs[i];
      body += `<g class="bob" style="animation-delay:${(i * 0.6 + r * 0.9).toFixed(1)}s"><ellipse cx="${cx}" cy="${row.y + 3}" rx="${Math.min(s.w * 0.34, 110)}" ry="9" fill="${T.ink}" opacity=".12"/><image href="${s.uri}" x="${cx - s.w / 2}" y="${row.y - s.h}" width="${s.w}" height="${s.h}"/></g>
<text class="c" x="${cx}" y="${row.y + 30}" font-size="19" font-weight="700" fill="${T.ink}">${row.names[i]}</text>
<text class="s c" x="${cx}" y="${row.y + 50}" font-size="14.5" fill="${i === 3 ? T.gold2 : T.muted}" font-weight="${i === 3 ? 700 : 400}">${starTxt[i]}</text>`;
      if (i < 2) body += `<path class="flow" d="M${cx + Math.max(60, s.w / 2) + 14} ${row.y - 70}H${cxs[i + 1] - Math.max(60, row.items[i + 1].w / 2) - 16}" fill="none" stroke="${T.teal}" stroke-width="2" marker-end="url(#ar)"/>`;
    });
    body += [0, 1, 2].map((k) => `<path class="tw" style="animation-delay:${(k * 0.8 + r * 0.4).toFixed(1)}s" d="${star4(cxs[3] + (k - 1) * 70, row.y - row.items[3].h - 6 - (k % 2) * 14, 8)}" fill="${T.glow}"/>`).join('');
  });
  body += `<text class="s" x="${W / 2}" y="20" font-size="14.5" text-anchor="middle" fill="${T.muted}">3 copies identiques fusionnent en une forme évoluée (stats ×1,8 puis ×3,24). Les créatures chromatiques ✦ ont +20 % de PV et d'attaque.</text>`;
  writeFileSync(join(OUT, `evolution-${name}.svg`), wrap(T, W, H, 'Lignées d\'évolution Flammèche et Goutelle, avec leur variante chromatique', defs, body, css));
}

// ——— courbe de difficulté ———
function chart(T, name) {
  const data = [
    ['Les Crocs de la Lisière', [18, 91, 100], '18 · 30 · 45 or'],
    ['Le Nid de Cristal', [29, 74, 100], '35 · 55 · 80 or'],
    ['Les Marées Noires', [28, 68, 87], '55 · 85 · 120 or'],
    ['Vermithrax (boss)', [37, 64, 71], '80 · 120 · 170 or'],
  ];
  const W = 1000, H = 440, x0 = 90, y0 = 360, ph = 270, gw = 205;
  const cols = ['#e0524a', T.teal, T.gold2];
  const css = `.grow{transform-box:fill-box;transform-origin:50% 100%;animation:grow 1.4s cubic-bezier(.2,.8,.2,1) both}@keyframes grow{from{transform:scaleY(0)}to{transform:scaleY(1)}}`;
  let body = `<text class="s" x="${W / 2}" y="26" text-anchor="middle" font-size="15" fill="${T.muted}">Taux de victoire d'un joueur-robot selon son budget d'or (faible · normal · confortable)</text>`;
  for (const v of [0, 25, 50, 75, 100]) {
    const y = y0 - (ph * v) / 100;
    body += `<line x1="${x0 - 8}" x2="${W - 30}" y1="${y}" y2="${y}" stroke="${T.edge}" stroke-width="1" stroke-dasharray="3 5"/><text class="s" x="${x0 - 16}" y="${y + 4}" font-size="12.5" text-anchor="end" fill="${T.muted}">${v} %</text>`;
  }
  data.forEach(([title, vals, gold], g) => {
    const gx = x0 + 20 + g * (gw + 22);
    vals.forEach((v, i) => {
      const h = (ph * v) / 100, bx = gx + i * 62;
      body += `<rect class="grow" style="animation-delay:${(g * 0.25 + i * 0.1).toFixed(2)}s" x="${bx}" y="${y0 - h}" width="52" height="${h}" rx="6" fill="${cols[i]}" fill-opacity=".85"/><text class="s c" x="${bx + 26}" y="${y0 - h - 8}" font-size="13.5" font-weight="700" fill="${T.ink}">${v} %</text>`;
    });
    body += `<text class="c" x="${gx + 88}" y="${y0 + 28}" font-size="14.5" font-weight="700" fill="${T.ink}">${esc(title)}</text><text class="s c" x="${gx + 88}" y="${y0 + 48}" font-size="12" fill="${T.muted}">${gold}</text>`;
  });
  [['faible', 0], ['normal', 1], ['confortable', 2]].forEach(([t, i]) => {
    body += `<rect x="${W - 330 + i * 110}" y="46" width="14" height="14" rx="3" fill="${cols[i]}"/><text class="s" x="${W - 311 + i * 110}" y="58" font-size="13" fill="${T.ink}">${t}</text>`;
  });
  writeFileSync(join(OUT, `balance-${name}.svg`), wrap(T, W, H, 'Courbe de difficulté des quatre arènes', '', body, css));
}

const sp = {
  stag: await sprite('bourgeon_3', 195),
  fox: await sprite('flammeche_3', 190),
  lev: await sprite('goutelle_3', 165),
};
const ev = {
  f1: await sprite('flammeche_1', 118), f2: await sprite('flammeche_2', 190), f3: await sprite('flammeche_3', 215), f3s: await sprite('flammeche_3', 215, 150),
  w1: await sprite('goutelle_1', 118), w2: await sprite('goutelle_2', 175), w3: await sprite('goutelle_3', 185), w3s: await sprite('goutelle_3', 185, 150),
};
for (const [name, T] of Object.entries(THEMES)) {
  await hero(T, name, sp);
  divider(T, name);
  features(T, name);
  loop(T, name);
  types(T, name);
  await evolution(T, name, ev);
  chart(T, name);
  console.log('✓', name);
}
