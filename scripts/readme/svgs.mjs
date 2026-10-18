// Génère les SVG animés du README dans docs/assets/ : versions claire et sombre (fond transparent),
// en français (<nom>-<thème>.svg) et en anglais (<nom>-<thème>-en.svg) quand le SVG contient du texte.
// Usage : node scripts/readme/svgs.mjs
// Voir aussi scripts/readme/hairline-svg.mjs (figures Hairline) et scripts/readme/clips.mjs (clips de jeu).
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const OUT = join(ROOT, 'docs', 'assets');
mkdirSync(OUT, { recursive: true });
const ART = (p) => join(ROOT, 'src', 'assets', 'art', p);
const VERSION = JSON.parse((await import('node:fs')).readFileSync(join(ROOT, 'package.json'), 'utf8')).version;

const THEMES = {
  light: { ink: '#1b2823', muted: '#566761', line: '#31423b', gold1: '#e0a73a', gold2: '#8d5c0a', gold3: '#b8790c', teal: '#0b8a73', red: '#d0443c', glow: '#d9a33a', soft: 'rgba(40,70,60,0.06)', soft2: 'rgba(40,70,60,0.11)', edge: 'rgba(40,70,60,0.28)', btnInk: '#2a1b02' },
  dark: { ink: '#ece7d8', muted: '#9fb0a8', line: '#cfe0d8', gold1: '#ffe6a8', gold2: '#e2a93e', gold3: '#ffc95e', teal: '#7affc0', red: '#ff7b72', glow: '#ffd98a', soft: 'rgba(255,255,255,0.045)', soft2: 'rgba(255,255,255,0.085)', edge: 'rgba(255,255,255,0.2)', btnInk: '#231600' },
};
const EL = { feu: '#ff7a3d', eau: '#3fa9f5', plante: '#4fc760', foudre: '#f0cc2e', roche: '#c49a6c', ombre: '#a070ff' };

// ——— textes ———
const TX = {
  fr: {
    title: 'Hexaria — Royaumes & Arènes',
    sub: 'ROYAUMES & ARÈNES',
    tag1: 'Un roguelike solo pour macOS : bâtissez un royaume hexagonal,',
    tag2: "capturez des créatures et lancez-les dans des arènes d'auto-battler.",
    pills: ['macOS natif', 'Auto-battler', '15 lignées', 'Sprites peints'],
    stats: [[15, 'lignées de créatures'], [45, 'formes à faire évoluer'], [8, 'monstres, dont 1 boss'], [16, 'bâtiments'], [16, 'reliques'], [15, 'événements'], [6, 'éléments']],
    feat: [
      ['Bâtissez', ['Une île hexagonale, 16 bâtiments', "et des bonus d'adjacence : Port +", 'Hôtel des ventes = +5 or.']],
      ['Combattez', ['Auto-battler façon TFT : boutique,', 'relances, placement, évolutions', 'de ★ à ★★★.']],
      ['Capturez', ['Repaires, œufs mystérieux et', 'créatures chromatiques ✦ :', 'chaque partie a sa surprise.']],
      ['Dominez les types', ['6 éléments et un cycle', "d'ascendants : un type dominant", 'inflige ×1,5.']],
    ],
    loop: [['Tour de gestion', 'bâtir · récolter · loger'], ['Événement ?', 'un choix, une surprise'], ['Arène', 'auto-battler hexagonal'], ['Récompense', 'relique · compagnon · œuf'], ['Boss final', 'Vermithrax, dragon des marais']],
    loopFoot: '3 arènes, puis le boss : 22 tours en 4 actes. Une défaite coûte un cœur ♥ (3 au départ).',
    adjTitle: 'Bâtir, c’est placer',
    adjSub: 'Chaque bâtiment regarde ses six voisins.',
    adj: [['Port + Hôtel des ventes', '+5 or par tour', '+5 or'], ['Ferme à côté d’une ferme', '+1 nourriture (max +2)', '+1 🌾'], ['Scierie au bord de la forêt', '+1 bois par forêt (max +3)', '+2 bois']],
    adjFoot: 'Les bâtiments de combat (Taverne, Caserne, Forge…) se paient aussi en or :',
    adjFoot2: 'développer l’économie ou préparer l’arène, voilà le dilemme.',
    eco: [['Votre or', 'devient votre budget'], ['1 min 30 d’achat', 'boutique de 5, relance à 2 or'], ['Combat automatique', 'placement, sorts, synergies'], ['Tout est rendu', '+ la récompense de victoire']],
    ecoFoot: "Acheter n'est jamais un sacrifice : c'est un pari sur votre composition.",
    pipe: [['Prompt prêt à copier', 'art/prompts.html · 72 fiches'], ["Votre IA d'images", 'fond blanc, nom de fichier imposé'], ['npm run art', 'détourage, découpe, WebP'], ['Sprite animé en jeu', 'respiration, élan, coup, flash']],
    copy: 'Copier',
    arch: {
      data: ['src/data', 'contenu pur'], core: ['src/core', 'hexagones · RNG'], game: ['src/game', 'logique sans rendu'], render: ['src/render', 'Canvas 2D · sprites'], ui: ['src/ui', 'Codex · modales'],
      scenes: ['src/scenes', 'titre · carte · arène'], app: ['src/app.ts', 'boucle · entrées'], mac: ['mac/HexariaApp.swift', 'Cocoa + WKWebView'], scripts: ['scripts/', 'équilibrage · art · README'],
      sim: 'simulé en Node', web: 'build web (Vite)',
    },
    road: [['v0.1.0', 'Prototype', 'carte, arènes, évolutions'], ['v0.2.0', 'Sprites peints', 'Codex, œufs, chromatiques'], ['v0.3', 'Mode aventure', 'plus de monstres par rencontre'], ['v0.4', 'Objets & traits', 'équipement, classes'], ['v1.0', 'Âges & technologies', 'une progression façon Civ']],
    here: 'vous êtes ici',
    btnMac: ['Télécharger pour macOS', `v${VERSION} · Apple silicon & Intel`],
    btnWeb: ['Version web', 'zip statique, tout navigateur'],
    btnSrc: ['Toutes les versions', 'notes de version & historique'],
    footer: 'Bonne partie, et que vos œufs soient chromatiques ✦',
    typesTitle: 'Qui domine qui ?',
    typesRule: 'Une flèche A → B : A domine B.',
    typesUp: '▲ ×1,5  super efficace', typesDown: '▼ ×0,7  peu efficace',
    typesLines: ['Plante domine Eau et Roche · Eau domine Feu', 'et Roche · Feu domine Plante · Foudre domine', 'Eau · Roche domine Feu et Foudre · Ombre ne', "domine que l'Ombre."],
    typesSyn: ['2 ou 4 créatures différentes du même type sur', "le plateau activent une synergie d'équipe."],
    el: { feu: 'Feu', plante: 'Plante', roche: 'Roche', foudre: 'Foudre', eau: 'Eau', ombre: 'Ombre' },
    chartTitle: "Taux de victoire d'un joueur-robot selon son budget d'or (faible · normal · confortable)",
    chartArenas: ['Les Crocs de la Lisière', 'Le Nid de Cristal', 'Les Marées Noires', 'Vermithrax (boss)'],
    chartLeg: ['faible', 'normal', 'confortable'], gold: 'or',
  },
  en: {
    title: 'Hexaria — Kingdoms & Arenas',
    sub: 'KINGDOMS & ARENAS',
    tag1: 'A single-player roguelike for macOS: build a hexagonal kingdom,',
    tag2: 'capture creatures and send them into auto-battler arenas.',
    pills: ['Native macOS', 'Auto-battler', '15 creature lines', 'Painted sprites'],
    stats: [[15, 'creature lines'], [45, 'forms to evolve'], [8, 'monsters, 1 boss'], [16, 'buildings'], [16, 'relics'], [15, 'events'], [6, 'elements']],
    feat: [
      ['Build', ['A hexagonal island, 16 buildings', 'and adjacency bonuses: Port +', 'Auction house = +5 gold.']],
      ['Fight', ['A TFT-style auto-battler: shop,', 'rerolls, placement, evolutions', 'from ★ to ★★★.']],
      ['Capture', ['Lairs, mystery eggs and shiny', 'creatures ✦: every run', 'hides its own surprise.']],
      ['Master the types', ['6 elements and a cycle of', 'advantages: a dominant type', 'deals ×1.5 damage.']],
    ],
    loop: [['Management turn', 'build · harvest · house'], ['Event ?', 'one choice, one surprise'], ['Arena', 'hexagonal auto-battler'], ['Reward', 'relic · companion · egg'], ['Final boss', 'Vermithrax, the marsh dragon']],
    loopFoot: '3 arenas, then the boss: 22 turns in 4 acts. A defeat costs a heart ♥ (you start with 3).',
    adjTitle: 'Building is placing',
    adjSub: 'Every building looks at its six neighbours.',
    adj: [['Port + Auction house', '+5 gold per turn', '+5 gold'], ['Farm next to a farm', '+1 food (up to +2)', '+1 🌾'], ['Sawmill by the forest', '+1 wood per forest (up to +3)', '+2 wood']],
    adjFoot: 'Combat buildings (Tavern, Barracks, Forge…) cost gold too:',
    adjFoot2: 'grow the economy or prepare for the arena, that is the dilemma.',
    eco: [['Your gold', 'becomes your budget'], ['90 s of shopping', '5-card shop, reroll for 2 gold'], ['Automatic battle', 'placement, spells, synergies'], ['All of it comes back', '+ the victory reward']],
    ecoFoot: 'Buying is never a sacrifice: it is a bet on your team composition.',
    pipe: [['Ready-to-copy prompt', 'art/prompts.html · 72 cards'], ['Your own image AI', 'white background, fixed file name'], ['npm run art', 'cut-out, slicing, WebP'], ['Animated in-game sprite', 'breathing, wind-up, hit, flash']],
    copy: 'Copy',
    arch: {
      data: ['src/data', 'pure content'], core: ['src/core', 'hex maths · RNG'], game: ['src/game', 'logic, no rendering'], render: ['src/render', 'Canvas 2D · sprites'], ui: ['src/ui', 'Codex · dialogs'],
      scenes: ['src/scenes', 'title · map · arena'], app: ['src/app.ts', 'loop · input'], mac: ['mac/HexariaApp.swift', 'Cocoa + WKWebView'], scripts: ['scripts/', 'balancing · art · README'],
      sim: 'simulated in Node', web: 'web build (Vite)',
    },
    road: [['v0.1.0', 'Prototype', 'map, arenas, evolutions'], ['v0.2.0', 'Painted sprites', 'Codex, eggs, shinies'], ['v0.3', 'Adventure mode', 'more monsters per encounter'], ['v0.4', 'Items & traits', 'equipment, classes'], ['v1.0', 'Ages & technologies', 'Civ-style progression']],
    here: 'you are here',
    btnMac: ['Download for macOS', `v${VERSION} · Apple silicon & Intel`],
    btnWeb: ['Web version', 'static zip, any browser'],
    btnSrc: ['All releases', 'release notes & history'],
    footer: 'Have fun, and may your eggs hatch shiny ✦',
    typesTitle: 'Who beats whom?',
    typesRule: 'An arrow A → B: A beats B.',
    typesUp: '▲ ×1.5  super effective', typesDown: '▼ ×0.7  not very effective',
    typesLines: ['Grass beats Water and Rock · Water beats Fire', 'and Rock · Fire beats Grass · Thunder beats', 'Water · Rock beats Fire and Thunder · Shadow', 'only beats Shadow.'],
    typesSyn: ['2 or 4 different creatures of the same type on', 'the board trigger a team synergy.'],
    el: { feu: 'Fire', plante: 'Grass', roche: 'Rock', foudre: 'Thunder', eau: 'Water', ombre: 'Shadow' },
    chartTitle: "Win rate of a bot player depending on its gold budget (low · normal · comfortable)",
    chartArenas: ['The Fangs of the Edge', 'The Crystal Nest', 'The Black Tides', 'Vermithrax (boss)'],
    chartLeg: ['low', 'normal', 'comfortable'], gold: 'gold',
  },
};

// ——— outils ———
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const FONT = `text{font-family:'Cinzel','Trajan Pro','Palatino Linotype','Book Antiqua',Palatino,Georgia,serif}
.s{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif}
.m{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.c{text-anchor:middle}.e{text-anchor:end}`;
const svg = (w, h, label, defs, body, css = '') =>
  `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">
<defs>${defs}</defs>
<style>
${FONT}
${css}
@media (prefers-reduced-motion: reduce){*{animation:none!important}}
</style>
${body}
</svg>
`;
const hexPath = (cx, cy, r, sy = 1, rot = 30) => 'M' + [0, 1, 2, 3, 4, 5].map((k) => `${(cx + r * Math.cos(((rot + 60 * k) * Math.PI) / 180)).toFixed(1)} ${(cy + r * sy * Math.sin(((rot + 60 * k) * Math.PI) / 180)).toFixed(1)}`).join('L') + 'Z';
const rnd = (seed) => {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
};
const star4 = (cx, cy, r) => `M${cx} ${cy - r}L${cx + r * 0.28} ${cy - r * 0.28}L${cx + r} ${cy}L${cx + r * 0.28} ${cy + r * 0.28}L${cx} ${cy + r}L${cx - r * 0.28} ${cy + r * 0.28}L${cx - r} ${cy}L${cx - r * 0.28} ${cy - r * 0.28}Z`;
const files = [];
function write(name, theme, lang, content) {
  const f = `${name}-${theme}${lang === 'en' ? '-en' : ''}.svg`;
  writeFileSync(join(OUT, f), content);
  files.push([f, content.length]);
}

/** Une image de src/assets/art (ou d'ailleurs) réduite et embarquée en WebP base64 ; h ou w en unités du SVG (×2 pour l'écran Retina). */
const cache = new Map();
async function img(path, { h, w, hue, flip, q = 80, k = 2, crop } = {}) {
  const key = JSON.stringify([path, h, w, hue, flip, q, k, crop]);
  if (cache.has(key)) return cache.get(key);
  let s = sharp(path.startsWith('/') ? path : ART(path));
  if (crop) s = s.extract(crop);
  s = s.resize(h ? { height: Math.round(h * k), withoutEnlargement: true } : { width: Math.round(w * k), withoutEnlargement: true });
  if (hue) s = s.modulate({ hue });
  if (flip) s = s.flop();
  const buf = await s.webp({ quality: q, effort: 6, alphaQuality: 90 }).toBuffer();
  const m = await sharp(buf).metadata();
  const out = { uri: `data:image/webp;base64,${buf.toString('base64')}`, w: m.width / k, h: m.height / k };
  cache.set(key, out);
  return out;
}
const image = (s, x, y, extra = '') => `<image href="${s.uri}" x="${(x - s.w / 2).toFixed(1)}" y="${(y - s.h).toFixed(1)}" width="${s.w.toFixed(1)}" height="${s.h.toFixed(1)}" ${extra}/>`;
const shadow = (T, x, y, rx, ry = 8, o = 0.14) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${T.ink}" opacity="${o}"/>`;

// CSS partagées
const CSS = {
  bob: '.bob{animation:bob 4.6s ease-in-out infinite}@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}',
  tw: '.tw{animation:tw 2.8s ease-in-out infinite;transform-box:fill-box;transform-origin:center;opacity:0}@keyframes tw{0%,100%{opacity:0;transform:scale(.4)}50%{opacity:1;transform:scale(1.15)}}',
  rise: '.rise{animation:rise 1.1s cubic-bezier(.2,.8,.2,1) both}@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}',
  flow: '.flow{stroke-dasharray:6 8;animation:flow 1.4s linear infinite}@keyframes flow{to{stroke-dashoffset:-14}}',
  pulse: '.pulse{animation:pulse 3s ease-in-out infinite;transform-box:fill-box;transform-origin:center}@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}',
  spin: '.spin{animation:spin 18s linear infinite;transform-box:fill-box;transform-origin:center}@keyframes spin{to{transform:rotate(360deg)}}',
};
const arrowMarker = (T, id = 'ar', c = T.teal) => `<marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="${c}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></marker>`;
const goldGrad = (T, id = 'g') => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.gold1}"/><stop offset="1" stop-color="${T.gold2}"/></linearGradient>`;

// ══════════════════════ BANNIÈRE ══════════════════════
async function hero(T, theme, lang, A) {
  const L = TX[lang];
  const W = 1200, H = 470, R = 28;
  const r = rnd(11);
  let hexes = '';
  for (let row = 0; row < 18; row++) {
    for (let col = 0; col < 26; col++) {
      const cx = col * R * 1.732 + (row % 2) * R * 0.866 - 10, cy = row * R * 1.5 + 8;
      if (cx > 700) continue;
      const lit = r() < 0.08;
      hexes += `<path d="${hexPath(cx, cy, R - 2.5)}" fill="${lit ? T.glow : 'none'}" ${lit ? `class="lit" style="animation-delay:${(r() * 7).toFixed(1)}s"` : ''} stroke="${T.line}" stroke-opacity="${(0.13 * (1 - cx / 760)).toFixed(3)}" stroke-width="1"/>`;
    }
  }
  // fenêtre hexagonale sur le royaume peint
  const hx = 905, hy = 228, hr = 214;
  const win = A.world;
  const pills = L.pills.map((t) => [t, 24 + t.length * 7.4]);
  let px = 64;
  const pillSvg = pills.map(([t, w]) => {
    const s = `<rect x="${px}" y="352" width="${w.toFixed(0)}" height="32" rx="16" fill="${T.soft2}" stroke="${T.edge}"/><text class="s c" x="${(px + w / 2).toFixed(0)}" y="373" font-size="13.5" fill="${T.ink}">${esc(t)}</text>`;
    px += w + 10;
    return s;
  }).join('');
  const sparks = [[640, 70, 7], [700, 400, 6], [1150, 40, 8], [668, 210, 5], [1170, 420, 7], [720, 30, 5]]
    .map(([x, y, s], i) => `<path d="${star4(x, y, s)}" fill="${T.glow}" class="tw" style="animation-delay:${(i * 0.6).toFixed(1)}s"/>`).join('');
  const defs = `${goldGrad(T)}
<linearGradient id="shine" gradientUnits="userSpaceOnUse" x1="-400" y1="0" x2="-100" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity="${theme === 'dark' ? 0.55 : 0.75}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/><animateTransform attributeName="gradientTransform" type="translate" values="0 0;1200 0;1200 0" keyTimes="0;.45;1" dur="6s" repeatCount="indefinite"/></linearGradient>
<clipPath id="hexw"><path d="${hexPath(hx, hy, hr)}"/></clipPath>
<radialGradient id="vig" cx="50%" cy="50%" r="55%"><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
<linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${T.gold1}"/><stop offset=".5" stop-color="${T.gold2}"/><stop offset="1" stop-color="${T.gold1}"/></linearGradient>`;
  const css = `${CSS.bob}${CSS.tw}${CSS.rise}
.lit{animation:lit 7s ease-in-out infinite;fill-opacity:0}@keyframes lit{0%,100%{fill-opacity:0}50%{fill-opacity:.22}}
.pan{animation:pan 22s ease-in-out infinite alternate}@keyframes pan{from{transform:translate(0,0) scale(1.06)}to{transform:translate(-46px,-18px) scale(1.06)}}
.run{stroke-dasharray:60 1290;animation:run 7s linear infinite}@keyframes run{to{stroke-dashoffset:-1350}}`;
  const body = `${hexes}
<text class="rise" x="62" y="178" font-size="104" font-weight="700" textLength="560" lengthAdjust="spacingAndGlyphs" fill="url(#g)">HEXARIA</text>
<text class="rise" x="62" y="178" font-size="104" font-weight="700" textLength="560" lengthAdjust="spacingAndGlyphs" fill="url(#shine)" style="mix-blend-mode:${theme === 'dark' ? 'screen' : 'soft-light'}">HEXARIA</text>
<text class="rise" x="66" y="228" font-size="23" font-weight="700" textLength="552" lengthAdjust="spacing" fill="${T.teal}" style="animation-delay:.15s">${esc(L.sub)}</text>
<text class="s rise" x="66" y="279" font-size="17.5" fill="${T.muted}" style="animation-delay:.3s">${esc(L.tag1)}</text>
<text class="s rise" x="66" y="305" font-size="17.5" fill="${T.muted}" style="animation-delay:.4s">${esc(L.tag2)}</text>
<g class="rise" style="animation-delay:.55s">${pillSvg}</g>
<g clip-path="url(#hexw)"><g class="pan"><image href="${win.uri}" x="${hx - win.w / 2 + 20}" y="${hy - win.h / 2 + 8}" width="${win.w}" height="${win.h}" preserveAspectRatio="xMidYMid slice"/></g><rect x="${hx - hr}" y="${hy - hr}" width="${2 * hr}" height="${2 * hr}" fill="url(#vig)"/></g>
<path d="${hexPath(hx, hy, hr)}" fill="none" stroke="url(#rim)" stroke-width="4"/>
<path d="${hexPath(hx, hy, hr + 9)}" fill="none" stroke="${T.gold2}" stroke-opacity=".45" stroke-width="1.3"/>
<path class="run" d="${hexPath(hx, hy, hr + 9)}" fill="none" stroke="${T.glow}" stroke-width="3" stroke-linecap="round"/>
<g class="bob" style="animation-delay:.8s">${shadow(T, 768, 452, 70, 9)}${image(A.fox, 768, 452)}</g>
<g class="bob" style="animation-delay:2.1s">${shadow(T, 1092, 452, 64, 9)}${image(A.lev, 1092, 452)}</g>
${sparks}`;
  write('hero', theme, lang, svg(W, H, L.title, defs, body, css));
}

// ══════════════════════ CHIFFRES CLÉS ══════════════════════
function stats(T, theme, lang) {
  const L = TX[lang];
  const W = 1200, H = 150, n = L.stats.length, cw = W / n;
  const css = `.drawh{stroke-dasharray:240;stroke-dashoffset:240;animation:drawh 1.6s cubic-bezier(.3,.7,.2,1) forwards}@keyframes drawh{to{stroke-dashoffset:0}}
.num{opacity:0;animation:num .9s cubic-bezier(.2,.8,.2,1) forwards}@keyframes num{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.glowh{animation:glowh 4.2s ease-in-out infinite;opacity:0}@keyframes glowh{0%,100%{opacity:0}50%{opacity:.18}}`;
  const body = L.stats.map(([v, t], i) => {
    const cx = cw * i + cw / 2, d = (i * 0.16).toFixed(2);
    return `<path d="${hexPath(cx, 58, 40)}" fill="${T.glow}" class="glowh" style="animation-delay:${(i * 0.6).toFixed(1)}s"/>
<path d="${hexPath(cx, 58, 40)}" fill="none" stroke="${T.gold2}" stroke-width="1.6" class="drawh" style="animation-delay:${d}s"/>
<text class="c num" x="${cx}" y="72" font-size="38" font-weight="700" fill="url(#g)" style="animation-delay:${(i * 0.16 + 0.3).toFixed(2)}s">${v}</text>
<text class="s c num" x="${cx}" y="128" font-size="13.5" fill="${T.muted}" style="animation-delay:${(i * 0.16 + 0.45).toFixed(2)}s">${esc(t)}</text>`;
  }).join('\n');
  write('stats', theme, lang, svg(W, H, L.stats.map(([v, t]) => `${v} ${t}`).join(', '), goldGrad(T), body, css));
}

// ══════════════════════ CARTES DE PRÉSENTATION ══════════════════════
async function features(T, theme, lang, A) {
  const L = TX[lang];
  const W = 1200, cw = 282, gap = 24, x0 = 3, H = 352;
  const css = `${CSS.bob}${CSS.tw}${CSS.spin}
.clash{animation:clash 2.4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}@keyframes clash{0%,35%,100%{opacity:0;transform:scale(.3)}50%{opacity:1;transform:scale(1.25)}65%{opacity:0;transform:scale(1.6)}}
.lunge{animation:lunge 2.4s ease-in-out infinite}@keyframes lunge{0%,100%{transform:translateX(0)}30%{transform:translateX(-8px)}48%{transform:translateX(14px)}60%{transform:translateX(0)}}
.lungeb{animation:lungeb 2.4s ease-in-out infinite}@keyframes lungeb{0%,100%{transform:translateX(0)}30%{transform:translateX(8px)}48%{transform:translateX(-14px)}60%{transform:translateX(0)}}`;
  const art = [
    (cx) => `${shadow(T, cx, 190, 92, 10)}<g class="bob">${image(A.townhall, cx + 4, 192)}</g>${image(A.house, cx - 86, 196)}${image(A.farm, cx + 92, 200)}`,
    (cx) => `${shadow(T, cx - 54, 194, 52, 8)}${shadow(T, cx + 58, 194, 56, 8)}<g class="lunge">${image(A.fox2, cx - 58, 194)}</g><g class="lungeb">${image(A.wolf, cx + 62, 194)}</g><path class="clash" d="${star4(cx + 4, 140, 18)}" fill="${T.glow}"/>`,
    (cx) => `${shadow(T, cx, 192, 60, 9)}<g class="bob">${image(A.shiny, cx, 192)}</g>${[[-70, 92, 10], [72, 70, 13], [58, 150, 7], [-58, 160, 8]].map(([dx, y, s], i) => `<path class="tw" style="animation-delay:${i * 0.7}s" d="${star4(cx + dx, y, s)}" fill="${T.glow}"/>`).join('')}`,
    (cx) => {
      const keys = ['feu', 'plante', 'roche', 'foudre', 'eau', 'ombre'];
      const dots = keys.map((k, i) => `<circle cx="${(cx + 66 * Math.cos(((-90 + 60 * i) * Math.PI) / 180)).toFixed(1)}" cy="${(122 + 66 * Math.sin(((-90 + 60 * i) * Math.PI) / 180)).toFixed(1)}" r="15" fill="${EL[k]}" fill-opacity=".92" stroke="${T.ink}" stroke-opacity=".5" stroke-width="1.2"/>`).join('');
      return `<circle class="spin" cx="${cx}" cy="122" r="66" fill="none" stroke="${T.teal}" stroke-width="1.6" stroke-dasharray="5 7"/>${dots}<g class="bob">${image(A.spark, cx, 150)}</g>`;
    },
  ];
  const body = L.feat.map(([title, lines], i) => {
    const x = x0 + i * (cw + gap), cx = x + cw / 2;
    return `<g><rect x="${x}" y="6" width="${cw}" height="${H - 12}" rx="18" fill="${T.soft}" stroke="${T.edge}"/>
${art[i](cx)}
<text class="c" x="${cx}" y="240" font-size="23" font-weight="700" fill="${T.gold3}">${esc(title)}</text>
${lines.map((l, j) => `<text class="s c" x="${cx}" y="${270 + j * 22}" font-size="14" fill="${T.muted}">${esc(l)}</text>`).join('')}</g>`;
  }).join('\n');
  write('features', theme, lang, svg(W, H, L.feat.map((f) => f[0]).join(', '), '', body, css));
}

// ══════════════════════ BOUCLE DE JEU ══════════════════════
function loop(T, theme, lang) {
  const L = TX[lang];
  const xs = [130, 365, 600, 835, 1070];
  const css = `${CSS.flow}${CSS.pulse}`;
  const defs = arrowMarker(T);
  let body = '';
  xs.forEach((x, i) => {
    const c = i === 4 ? T.red : T.gold2;
    body += `<g class="pulse" style="animation-delay:${i * 0.5}s"><path d="${hexPath(x, 100, 52)}" fill="${T.soft2}" stroke="${c}" stroke-width="2"/><text class="c" x="${x}" y="109" font-size="27" font-weight="700" fill="${c}">${i + 1}</text></g>
<text class="c" x="${x}" y="188" font-size="17" font-weight="700" fill="${T.ink}">${esc(L.loop[i][0])}</text><text class="s c" x="${x}" y="210" font-size="12.5" fill="${T.muted}">${esc(L.loop[i][1])}</text>`;
    if (i < 4) body += `<path class="flow" d="M${x + 62} 100H${xs[i + 1] - 62}" fill="none" stroke="${T.teal}" stroke-width="2" marker-end="url(#ar)"/>`;
  });
  body += `<path class="flow" d="M${xs[3]} 232q-340 44 -${xs[3] - xs[0]} 0" fill="none" stroke="${T.edge}" stroke-width="1.6" marker-end="url(#ar)"/>
<text class="s c" x="${(xs[0] + xs[3]) / 2}" y="268" font-size="13" fill="${T.muted}">${esc(L.loopFoot)}</text>
<circle r="7" fill="${T.glow}"><animateMotion dur="10s" repeatCount="indefinite" path="M130 100H1070"/></circle>`;
  write('loop', theme, lang, svg(1200, 292, L.loop.map((l) => l[0]).join(' → '), defs, body, css));
}

// ══════════════════════ ADJACENCES ══════════════════════
async function adjacency(T, theme, lang, A) {
  const L = TX[lang];
  const W = 1200, H = 430, R = 66, SY = 0.56, TH = 16;
  const ox = 300, oy = 220;
  const center = (q, r) => [ox + R * Math.sqrt(3) * (q + r / 2), oy + R * 1.5 * r * SY];
  const isoHex = (cx, cy, rr = R - 2) => hexPath(cx, cy, rr, SY);
  const tiles = [
    [0, -1, 'forest', 'tree'], [1, -1, 'forest', 'tree2'], [2, -1, 'shallow'],
    [-1, 0, 'plains', 'farm'], [0, 0, 'plains', 'lumber'], [1, 0, 'plains', 'auction'], [2, 0, 'shallow', 'port'],
    [-1, 1, 'plains', 'farm'], [0, 1, 'plains', 'house'], [1, 1, 'shallow'],
  ].sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const side = { forest: '#24402a', plains: '#4b5a2c', shallow: '#1d5a63' };
  // les trois paires, chacune allumée un tiers du cycle (9 s)
  const pairs = [[[1, 0], [2, 0]], [[-1, 0], [-1, 1]], [[0, 0], [0, -1], [1, -1]]];
  const win = (i) => `@keyframes w${i}{0%,${i * 33.3}%{opacity:0}${i * 33.3 + 4}%,${i * 33.3 + 27}%{opacity:1}${i * 33.3 + 32}%,100%{opacity:0}}.w${i}{opacity:0;animation:w${i} 9s ease-in-out infinite}
@keyframes f${i}{0%,${i * 33.3 + 3}%{opacity:0;transform:translateY(10px)}${i * 33.3 + 8}%{opacity:1;transform:translateY(0)}${i * 33.3 + 25}%{opacity:1;transform:translateY(-22px)}${i * 33.3 + 30}%,100%{opacity:0;transform:translateY(-28px)}}.f${i}{opacity:0;animation:f${i} 9s ease-out infinite}`;
  const css = `${CSS.tw}${[0, 1, 2].map(win).join('\n')}`;
  const pats = ['forest', 'plains', 'shallow'].map((t) => `<pattern id="t-${t}" patternUnits="userSpaceOnUse" width="150" height="150"><image href="${A.tex[t].uri}" width="150" height="150" preserveAspectRatio="none"/></pattern>`).join('');
  let body = '';
  for (const [q, r, t, b] of tiles) {
    const [cx, cy] = center(q, r);
    body += `<path d="${isoHex(cx, cy + TH)}" fill="${side[t]}"/><rect x="${cx - (R - 2) * 0.866}" y="${cy}" width="${(R - 2) * 1.732}" height="${TH}" fill="${side[t]}"/>
<path d="${isoHex(cx, cy)}" fill="url(#t-${t})" stroke="${theme === 'dark' ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.22)'}" stroke-width="1"/>`;
  }
  pairs.forEach((p, i) => {
    body += p.map(([q, r]) => { const [cx, cy] = center(q, r); return `<path class="w${i}" d="${isoHex(cx, cy, R - 6)}" fill="${T.glow}" fill-opacity=".25" stroke="${T.gold3}" stroke-width="3"/>`; }).join('');
  });
  for (const [q, r, , b] of tiles) {
    if (!b) continue;
    const [cx, cy] = center(q, r);
    body += image(A.b[b], cx, cy + R * SY * 0.55);
  }
  pairs.forEach((p, i) => {
    const [cx, cy] = center(...p[0]);
    body += `<g class="f${i}"><text class="c" x="${cx}" y="${cy - 82}" font-size="26" font-weight="700" fill="${T.gold3}" stroke="${theme === 'dark' ? '#0d1117' : '#fff'}" stroke-width="5" paint-order="stroke">${esc(L.adj[i][2])}</text></g>`;
  });
  const lx = 690;
  body += `<text x="${lx}" y="86" font-size="30" font-weight="700" fill="${T.gold3}">${esc(L.adjTitle)}</text>
<text class="s" x="${lx}" y="116" font-size="15.5" fill="${T.muted}">${esc(L.adjSub)}</text>`;
  L.adj.forEach(([a, b], i) => {
    const y = 158 + i * 66;
    body += `<rect class="w${i}" x="${lx - 14}" y="${y - 24}" width="490" height="56" rx="12" fill="${T.glow}" fill-opacity=".12" stroke="${T.gold3}" stroke-opacity=".6"/>
<path d="${hexPath(lx + 14, y + 4, 13)}" fill="none" stroke="${T.gold2}" stroke-width="1.8"/><text class="c" x="${lx + 14}" y="${y + 10}" font-size="15" font-weight="700" fill="${T.gold2}">${i + 1}</text>
<text x="${lx + 40}" y="${y}" font-size="17.5" font-weight="700" fill="${T.ink}">${esc(a)}</text><text class="s" x="${lx + 40}" y="${y + 22}" font-size="14.5" fill="${T.teal}">${esc(b)}</text>`;
  });
  body += `<text class="s" x="${lx}" y="372" font-size="13.5" fill="${T.muted}">${esc(L.adjFoot)}</text><text class="s" x="${lx}" y="393" font-size="13.5" fill="${T.muted}">${esc(L.adjFoot2)}</text>`;
  write('adjacency', theme, lang, svg(W, H, `${L.adjTitle} : ${L.adj.map((a) => a[0]).join(', ')}`, pats, body, css));
}

// ══════════════════════ ÉCONOMIE DE L'ARÈNE ══════════════════════
async function economy(T, theme, lang, A) {
  const L = TX[lang];
  const W = 1200, H = 330, xs = [150, 450, 750, 1050], y = 120;
  const coin = (x, yy, r = 11) => `<ellipse cx="${x}" cy="${yy}" rx="${r}" ry="${r * 0.42}" fill="${T.gold1}" stroke="${T.gold2}" stroke-width="1.4"/>`;
  const stack = (x, yy, n, r = 22) => Array.from({ length: n }, (_, i) => `<g>${`<ellipse cx="${x}" cy="${yy - i * 7 + 4}" rx="${r}" ry="${r * 0.42}" fill="${T.gold2}"/>`}${`<ellipse cx="${x}" cy="${yy - i * 7}" rx="${r}" ry="${r * 0.42}" fill="${T.gold1}" stroke="${T.gold2}" stroke-width="1.3"/>`}</g>`).join('');
  // pièces : départ (1 → 2) puis retour (2 → 4) et récompense (3 → 4) ; cycle de 8 s
  const travel = (path, begin, n, dur = 1.3) => Array.from({ length: n }, (_, i) => `<g opacity="0">${coin(0, 0, 9)}<animateMotion dur="8s" repeatCount="indefinite" keyPoints="0;0;1;1" keyTimes="0;${((begin + i * 0.12) / 8).toFixed(3)};${((begin + i * 0.12 + dur) / 8).toFixed(3)};1" calcMode="spline" keySplines="0 0 1 1;.4 0 .2 1;0 0 1 1" path="${path}"/><animate attributeName="opacity" dur="8s" repeatCount="indefinite" values="0;0;1;1;0;0" keyTimes="0;${((begin + i * 0.12) / 8).toFixed(3)};${((begin + i * 0.12 + 0.1) / 8).toFixed(3)};${((begin + i * 0.12 + dur - 0.1) / 8).toFixed(3)};${((begin + i * 0.12 + dur) / 8).toFixed(3)};1"/></g>`).join('');
  const css = `${CSS.flow}${CSS.bob}
.ring{stroke-dasharray:226;animation:ring 8s linear infinite}@keyframes ring{0%,10%{stroke-dashoffset:0}50%,100%{stroke-dashoffset:226}}
.clash{animation:clash 8s ease-in-out infinite;transform-box:fill-box;transform-origin:center;opacity:0}@keyframes clash{0%,52%,100%{opacity:0;transform:scale(.3)}56%,60%,64%{opacity:1;transform:scale(1.2)}58%,62%{opacity:.4;transform:scale(.9)}68%{opacity:0}}
.lit4{animation:lit4 8s ease-in-out infinite}@keyframes lit4{0%,72%{opacity:.25}80%,96%{opacity:1}100%{opacity:.25}}
.plus{animation:plus 8s ease-out infinite;opacity:0}@keyframes plus{0%,74%{opacity:0;transform:translateY(8px)}80%,92%{opacity:1;transform:translateY(-6px)}100%{opacity:0;transform:translateY(-12px)}}`;
  const defs = `${arrowMarker(T)}${goldGrad(T)}`;
  let body = '';
  for (let i = 0; i < 3; i++) body += `<path class="flow" d="M${xs[i] + 92} ${y}H${xs[i + 1] - 92}" fill="none" stroke="${T.teal}" stroke-width="2" marker-end="url(#ar)"/>`;
  // 1. la bourse
  body += `${stack(xs[0], y + 30, 5)}<text class="c" x="${xs[0]}" y="${y - 30}" font-size="30" font-weight="700" fill="url(#g)">46</text>`;
  // 2. la boutique et son minuteur
  const cards = A.shop.map((s, i) => {
    const cx = xs[1] - 72 + i * 36;
    return `<rect x="${cx - 16}" y="${y - 6}" width="32" height="46" rx="6" fill="${T.soft2}" stroke="${T.edge}"/>${image(s, cx, y + 34)}`;
  }).join('');
  body += `<circle cx="${xs[1]}" cy="${y - 38}" r="36" fill="none" stroke="${T.edge}" stroke-width="5"/><circle class="ring" cx="${xs[1]}" cy="${y - 38}" r="36" fill="none" stroke="${T.gold3}" stroke-width="5" stroke-linecap="round" transform="rotate(-90 ${xs[1]} ${y - 38})"/><text class="s c" x="${xs[1]}" y="${y - 32}" font-size="16" font-weight="700" fill="${T.ink}">1:30</text>${cards}`;
  // 3. le combat
  body += `${shadow(T, xs[2] - 40, y + 44, 40, 7)}${shadow(T, xs[2] + 44, y + 44, 44, 7)}${image(A.fox2s, xs[2] - 42, y + 44)}${image(A.wolfs, xs[2] + 46, y + 44)}<path class="clash" d="${star4(xs[2] + 2, y + 6, 16)}" fill="${T.glow}"/>`;
  // 4. tout revient
  body += `<g class="lit4">${stack(xs[3], y + 30, 7)}</g><g class="plus"><text class="c" x="${xs[3] + 62}" y="${y - 22}" font-size="24" font-weight="700" fill="${T.teal}">+25</text></g>`;
  body += travel(`M${xs[0]} ${y - 4}Q${(xs[0] + xs[1]) / 2} ${y - 120} ${xs[1] - 40} ${y + 10}`, 0.4, 5);
  body += travel(`M${xs[1] + 40} ${y + 10}Q${xs[2]} ${y + 210} ${xs[3]} ${y}`, 4.6, 5, 1.6);
  body += travel(`M${xs[2]} ${y + 10}Q${(xs[2] + xs[3]) / 2} ${y - 110} ${xs[3]} ${y - 10}`, 5.0, 3);
  L.eco.forEach(([a, b], i) => {
    body += `<text class="c" x="${xs[i]}" y="${y + 100}" font-size="18" font-weight="700" fill="${T.ink}">${esc(a)}</text><text class="s c" x="${xs[i]}" y="${y + 123}" font-size="13.5" fill="${T.muted}">${esc(b)}</text>`;
  });
  body += `<text class="s c" x="${W / 2}" y="${H - 20}" font-size="14.5" font-style="italic" fill="${T.teal}">${esc(L.ecoFoot)}</text>`;
  write('economy', theme, lang, svg(W, H, L.eco.map((e) => e[0]).join(' → '), defs, body, css));
}

// ══════════════════════ CYCLE DES TYPES ══════════════════════
function types(T, theme, lang) {
  const L = TX[lang];
  const W = 1040, H = 560, cx = 330, cy = 285, R = 200;
  const ring = ['feu', 'plante', 'roche', 'foudre', 'eau'];
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
  body += `<path class="flow" d="M${cx - 30} ${cy + 40}c-34 44 74 44 40 0" fill="none" stroke="${T.teal}" stroke-width="2.1" marker-end="url(#ar)"/>`;
  Object.entries(pos).forEach(([k, [x, y]], i) => {
    body += `<g class="pulse" style="animation-delay:${i * 0.45}s"><circle cx="${x}" cy="${y}" r="40" fill="${EL[k]}" fill-opacity=".22" stroke="${EL[k]}" stroke-width="3"/><text class="c" x="${x}" y="${y + 6}" font-size="${L.el[k].length > 6 ? 15 : 17}" font-weight="700" fill="${T.ink}">${L.el[k]}</text></g>`;
  });
  const lx = 640;
  body += `<text x="${lx}" y="120" font-size="24" font-weight="700" fill="${T.gold3}">${esc(L.typesTitle)}</text>
<text class="s" x="${lx}" y="156" font-size="15" fill="${T.ink}">${esc(L.typesRule)}</text>
<text class="s" x="${lx}" y="190" font-size="15" fill="${T.teal}" font-weight="700">${esc(L.typesUp)}</text>
<text class="s" x="${lx}" y="216" font-size="15" fill="${T.red}" font-weight="700">${esc(L.typesDown)}</text>
${L.typesLines.map((t, i) => `<text class="s" x="${lx}" y="${262 + i * 22}" font-size="14" fill="${T.muted}">${esc(t)}</text>`).join('\n')}
${L.typesSyn.map((t, i) => `<text class="s" x="${lx}" y="${376 + i * 22}" font-size="14" fill="${T.muted}">${esc(t)}</text>`).join('\n')}`;
  write('types', theme, lang, svg(W, H, L.typesTitle, defs, body, css));
}

// ══════════════════════ ÉVOLUTIONS (sans texte traduisible) ══════════════════════
async function evolution(T, theme, A) {
  const W = 1200, H = 660;
  const css = `${CSS.tw}.bob{animation:bob 4.6s ease-in-out infinite}@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
.flow{stroke-dasharray:5 7;animation:flow 1.3s linear infinite}@keyframes flow{to{stroke-dashoffset:-12}}`;
  const defs = `<marker id="ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M1 1L9 5L1 9" fill="none" stroke="${T.teal}" stroke-width="1.7" stroke-linecap="round"/></marker>`;
  const rows = [
    { y: 270, items: [A.f1, A.f2, A.f3, A.f3s], names: ['Flammèche', 'Pyrolis', 'Infernyx', 'Infernyx'] },
    { y: 582, items: [A.w1, A.w2, A.w3, A.w3s], names: ['Goutelle', 'Marélis', 'Léviathys', 'Léviathys'] },
  ];
  const cxs = [150, 415, 715, 1030];
  const starTxt = ['★', '★★', '★★★', '✦'];
  let body = '';
  rows.forEach((row, r) => {
    row.items.forEach((s, i) => {
      const cx = cxs[i];
      body += `<g class="bob" style="animation-delay:${(i * 0.6 + r * 0.9).toFixed(1)}s"><ellipse cx="${cx}" cy="${row.y + 3}" rx="${Math.min(s.w * 0.34, 110)}" ry="9" fill="${T.ink}" opacity=".12"/>${image(s, cx, row.y)}</g>
<text class="c" x="${cx}" y="${row.y + 32}" font-size="19" font-weight="700" fill="${T.ink}">${row.names[i]}</text>
<text class="s c" x="${cx}" y="${row.y + 54}" font-size="16" fill="${i === 3 ? T.gold3 : T.gold2}" font-weight="700">${starTxt[i]}</text>`;
      if (i < 2) body += `<path class="flow" d="M${cx + Math.max(60, s.w / 2) + 14} ${row.y - 70}H${cxs[i + 1] - Math.max(60, row.items[i + 1].w / 2) - 16}" fill="none" stroke="${T.teal}" stroke-width="2" marker-end="url(#ar)"/><text class="s c" x="${(cx + cxs[i + 1]) / 2 + 4}" y="${row.y - 80}" font-size="13" fill="${T.muted}">×3</text>`;
    });
    body += [0, 1, 2].map((k) => `<path class="tw" style="animation-delay:${(k * 0.8 + r * 0.4).toFixed(1)}s" d="${star4(cxs[3] + (k - 1) * 70, row.y - row.items[3].h - 6 - (k % 2) * 14, 8)}" fill="${T.glow}"/>`).join('');
  });
  write('evolution', theme, 'fr', svg(W, H, 'Flammèche → Pyrolis → Infernyx, Goutelle → Marélis → Léviathys, et leurs variantes chromatiques', defs, body, css));
}

// ══════════════════════ DÉFILÉ DU BESTIAIRE (sans texte traduisible) ══════════════════════
async function parade(T, theme, A) {
  const W = 1200, H = 250, base = 188;
  let x = 0, row = '';
  for (const c of A.parade) {
    const cx = x + c.s.w / 2 + 20;
    row += `${shadow(T, cx, base + 2, Math.min(c.s.w * 0.36, 70), 7, 0.12)}${image(c.s, cx, base)}<circle cx="${cx - c.name.length * 4.6 - 9}" cy="${base + 25}" r="5" fill="${EL[c.el]}"/><text class="c" x="${cx + 4}" y="${base + 30}" font-size="15" font-weight="700" fill="${T.ink}">${esc(c.name)}</text>`;
    x += c.s.w + 40;
  }
  const total = Math.round(x);
  const css = `.mq{animation:mq ${(total / 34).toFixed(0)}s linear infinite}@keyframes mq{to{transform:translateX(-${total}px)}}`;
  const defs = `<linearGradient id="fadeg" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".08" stop-color="#fff"/><stop offset=".92" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<mask id="fade" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#fadeg)"/></mask><g id="row">${row}</g>`;
  const body = `<g mask="url(#fade)"><g class="mq"><use href="#row"/><use href="#row" x="${total}"/></g></g>`;
  write('parade', theme, 'fr', svg(W, H, 'Les 15 lignées de créatures de Hexaria, sous leur forme finale', defs, body, css));
}

// ══════════════════════ PIPELINE D'IMAGES ══════════════════════
async function pipeline(T, theme, lang, A) {
  const L = TX[lang];
  const W = 1200, H = 340, xs = [150, 450, 750, 1050], y = 150;
  const css = `${CSS.flow}
.type{transform-box:fill-box;transform-origin:left center;animation:type 6s ease-out infinite}@keyframes type{0%,8%{transform:scaleX(0)}22%,100%{transform:scaleX(1)}}
.scan{animation:scan 3s ease-in-out infinite}@keyframes scan{0%{transform:translateX(-118px)}60%,100%{transform:translateX(118px)}}
.cut{animation:cut 3s ease-in-out infinite}@keyframes cut{0%,10%{opacity:1}55%,100%{opacity:0}}
.breath{transform-box:fill-box;transform-origin:50% 100%;animation:breath 2.2s ease-in-out infinite}@keyframes breath{0%,100%{transform:scale(1,1)}50%{transform:scale(1.03,.965)}}
.atk{animation:atk 3.6s cubic-bezier(.3,.6,.2,1) infinite}@keyframes atk{0%,55%,100%{transform:translateX(0)}66%{transform:translateX(-14px)}74%{transform:translateX(22px)}84%{transform:translateX(0)}}
.flash{animation:flash 3.6s linear infinite;opacity:0}@keyframes flash{0%,72%{opacity:0}75%{opacity:.85}86%,100%{opacity:0}}
.copy{animation:copy 6s ease-in-out infinite}@keyframes copy{0%,30%{opacity:.55}36%,44%{opacity:1}50%,100%{opacity:.55}}`;
  const defs = `${arrowMarker(T)}<pattern id="chk" patternUnits="userSpaceOnUse" width="16" height="16"><rect width="16" height="16" fill="${theme === 'dark' ? '#1d232c' : '#ffffff'}"/><rect width="8" height="8" fill="${theme === 'dark' ? '#2a313b' : '#e6e9ec'}"/><rect x="8" y="8" width="8" height="8" fill="${theme === 'dark' ? '#2a313b' : '#e6e9ec'}"/></pattern>
<filter id="white"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter>
<clipPath id="scanclip"><rect x="${xs[2] - 118}" y="${y - 70}" width="236" height="120" rx="10"/></clipPath>`;
  let body = '';
  for (let i = 0; i < 3; i++) body += `<path class="flow" d="M${xs[i] + 128} ${y - 10}H${xs[i + 1] - 128}" fill="none" stroke="${T.teal}" stroke-width="2" marker-end="url(#ar)"/>`;
  // 1. la fiche de prompt
  const cx0 = xs[0];
  body += `<rect x="${cx0 - 112}" y="${y - 78}" width="224" height="136" rx="12" fill="${T.soft2}" stroke="${T.edge}"/>
<text class="m" x="${cx0 - 96}" y="${y - 54}" font-size="12.5" font-weight="700" fill="${T.gold3}">line_feu.png</text>
<g class="copy"><rect x="${cx0 + 38}" y="${y - 68}" width="58" height="22" rx="11" fill="${T.teal}" fill-opacity=".18" stroke="${T.teal}"/><text class="s c" x="${cx0 + 67}" y="${y - 53}" font-size="11.5" font-weight="700" fill="${T.teal}">${esc(L.copy)}</text></g>
${[150, 182, 120, 170, 96].map((w, i) => `<rect class="type" style="animation-delay:${(i * 0.25).toFixed(2)}s" x="${cx0 - 96}" y="${y - 34 + i * 17}" width="${w}" height="7" rx="3.5" fill="${T.muted}" fill-opacity=".55"/>`).join('')}`;
  // 2. l'image brute, sur fond blanc
  body += `<rect x="${xs[1] - 118}" y="${y - 70}" width="236" height="120" rx="10" fill="#ffffff" stroke="${T.edge}"/><image href="${A.raw.uri}" x="${xs[1] - A.raw.w / 2}" y="${y - 10 - A.raw.h / 2}" width="${A.raw.w}" height="${A.raw.h}"/>`;
  // 3. détourage : un damier apparaît derrière les sprites pendant qu'une ligne balaie
  body += `<rect x="${xs[2] - 118}" y="${y - 70}" width="236" height="120" rx="10" fill="url(#chk)" stroke="${T.edge}"/>
${[A.c1, A.c2, A.c3].map((s, i) => image(s, xs[2] - 76 + i * 72, y + 38)).join('')}
<g clip-path="url(#scanclip)"><g class="scan"><rect x="${xs[2] - 1.5}" y="${y - 70}" width="3" height="120" fill="${T.gold3}"/><rect x="${xs[2] - 24}" y="${y - 70}" width="22" height="120" fill="${T.glow}" opacity=".18"/></g></g>`;
  // 4. en jeu : la marionnette respire, prend son élan, frappe et clignote
  body += `${shadow(T, xs[3], y + 42, 70, 9)}<g class="atk"><g class="breath">${image(A.c3big, xs[3], y + 42)}<g class="flash">${image(A.c3big, xs[3], y + 42, 'filter="url(#white)"')}</g></g></g>`;
  L.pipe.forEach(([a, b], i) => {
    body += `<text class="${i === 2 ? 'm ' : ''}c" x="${xs[i]}" y="${y + 104}" font-size="${i === 2 ? 17 : 18}" font-weight="700" fill="${T.ink}">${esc(a)}</text><text class="s c" x="${xs[i]}" y="${y + 127}" font-size="13.5" fill="${T.muted}">${esc(b)}</text>`;
  });
  write('pipeline', theme, lang, svg(W, H, L.pipe.map((p) => p[0]).join(' → '), defs, body, css));
}

// ══════════════════════ ARCHITECTURE ══════════════════════
function architecture(T, theme, lang) {
  const L = TX[lang].arch;
  const W = 1200, H = 470, bw = 236, bh = 66;
  const N = {
    data: [230, 60], core: [550, 60], ui: [910, 170],
    game: [230, 170], render: [550, 170], scripts: [230, 300],
    scenes: [550, 300], app: [550, 410], mac: [910, 410],
  };
  const css = `${CSS.flow}.node{animation:node 6s ease-in-out infinite}@keyframes node{0%,100%{stroke-opacity:.5}50%{stroke-opacity:1}}`;
  const defs = arrowMarker(T);
  const edge = (a, b, label, curve = 0) => {
    const [x1, y1] = N[a], [x2, y2] = N[b];
    let s, e;
    if (Math.abs(y1 - y2) < 5) { s = [x1 + (x2 > x1 ? bw / 2 : -bw / 2), y1]; e = [x2 - (x2 > x1 ? bw / 2 : -bw / 2) - (x2 > x1 ? 6 : -6), y2]; }
    else { s = [x1, y1 + (y2 > y1 ? bh / 2 : -bh / 2)]; e = [x2, y2 - (y2 > y1 ? bh / 2 : -bh / 2) - (y2 > y1 ? 6 : -6)]; }
    const mx = (s[0] + e[0]) / 2 + curve, my = (s[1] + e[1]) / 2;
    const vert = Math.abs(x1 - x2) < 5;
    return `<path class="flow" d="M${s[0]} ${s[1]}Q${mx} ${my} ${e[0]} ${e[1]}" fill="none" stroke="${T.teal}" stroke-width="1.8" marker-end="url(#ar)" opacity=".9"/>${label ? `<text class="s" x="${vert ? mx + 12 : mx}" y="${vert ? my + 4 : my - 8}" text-anchor="${vert ? 'start' : 'middle'}" font-size="12" font-style="italic" fill="${T.muted}">${esc(label)}</text>` : ''}`;
  };
  let body = [
    edge('data', 'game'), edge('core', 'game'), edge('core', 'render'), edge('game', 'scenes'), edge('render', 'scenes'), edge('ui', 'scenes'),
    edge('scenes', 'app'), edge('app', 'mac', L.web), edge('game', 'scripts', L.sim),
  ].join('');
  Object.entries(N).forEach(([k, [x, y]], i) => {
    const [t, s] = L[k];
    const hot = k === 'game' || k === 'data';
    body += `<rect class="node" style="animation-delay:${(i * 0.5).toFixed(1)}s" x="${x - bw / 2}" y="${y - bh / 2}" width="${bw}" height="${bh}" rx="13" fill="${T.soft2}" stroke="${hot ? T.gold3 : T.edge}" stroke-width="${hot ? 1.8 : 1.3}"/>
<text class="m c" x="${x}" y="${y - 4}" font-size="15" font-weight="700" fill="${hot ? T.gold3 : T.ink}">${esc(t)}</text><text class="s c" x="${x}" y="${y + 17}" font-size="12.5" fill="${T.muted}">${esc(s)}</text>`;
  });
  write('architecture', theme, lang, svg(W, H, 'Architecture : src/data, src/core, src/game, src/render, src/ui, src/scenes, src/app.ts, mac/HexariaApp.swift, scripts/', defs, body, css));
}

// ══════════════════════ FEUILLE DE ROUTE ══════════════════════
function roadmap(T, theme, lang) {
  const L = TX[lang];
  const W = 1200, H = 250, xs = [120, 360, 600, 840, 1080], y = 96, cur = 1;
  const css = `${CSS.flow}
.done{stroke-dasharray:${xs[cur] - xs[0]};stroke-dashoffset:${xs[cur] - xs[0]};animation:done 1.8s cubic-bezier(.3,.7,.2,1) .2s forwards}@keyframes done{to{stroke-dashoffset:0}}
.halo{animation:halo 2.2s ease-out infinite;transform-box:fill-box;transform-origin:center}@keyframes halo{0%{transform:scale(.6);opacity:.9}100%{transform:scale(1.9);opacity:0}}
.in{opacity:0;animation:in .8s ease-out forwards}@keyframes in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`;
  let body = `<line x1="${xs[cur]}" y1="${y}" x2="${xs[4]}" y2="${y}" class="flow" stroke="${T.edge}" stroke-width="2.4"/>
<line class="done" x1="${xs[0]}" y1="${y}" x2="${xs[cur]}" y2="${y}" stroke="${T.gold3}" stroke-width="4" stroke-linecap="round"/>`;
  L.road.forEach(([v, t, s], i) => {
    const x = xs[i], done = i < cur, now = i === cur;
    const c = done || now ? T.gold3 : T.muted;
    body += `<g class="in" style="animation-delay:${(0.3 + i * 0.18).toFixed(2)}s">
${now ? `<path class="halo" d="${hexPath(x, y, 22)}" fill="none" stroke="${T.gold3}" stroke-width="2"/>` : ''}
<path d="${hexPath(x, y, 20)}" fill="${done || now ? T.gold3 : 'none'}" fill-opacity="${now ? 1 : done ? 0.9 : 0}" stroke="${c}" stroke-width="2"/>
${done ? `<path d="M${x - 7} ${y}l5 5 9-10" fill="none" stroke="${theme === 'dark' ? '#0d1117' : '#fff'}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
<text class="m c" x="${x}" y="${y - 36}" font-size="14" font-weight="700" fill="${c}">${esc(v)}</text>
<text class="c" x="${x}" y="${y + 52}" font-size="17" font-weight="700" fill="${done || now ? T.ink : T.muted}">${esc(t)}</text>
<text class="s c" x="${x}" y="${y + 75}" font-size="13" fill="${T.muted}">${esc(s)}</text>
${now ? `<text class="s c" x="${x}" y="${y + 102}" font-size="12.5" font-style="italic" fill="${T.teal}">▲ ${esc(L.here)}</text>` : ''}</g>`;
  });
  write('roadmap', theme, lang, svg(W, H, L.road.map((r) => `${r[0]} ${r[1]}`).join(', '), '', body, css));
}

// ══════════════════════ BOUTONS ══════════════════════
function buttons(T, theme, lang) {
  const L = TX[lang];
  const make = (name, [t, s], primary, icon) => {
    const W = 360, H = 70;
    const defs = `${goldGrad(T, 'bg')}<linearGradient id="sh" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><clipPath id="cl"><rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="${(H - 4) / 2}"/></clipPath>`;
    const css = `.sw{animation:sw 4.5s ease-in-out infinite}@keyframes sw{0%,55%{transform:translateX(-140px)}85%,100%{transform:translateX(${W + 40}px)}}`;
    const ink = primary ? T.btnInk : T.ink;
    const body = `<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="${(H - 4) / 2}" fill="${primary ? 'url(#bg)' : T.soft2}" stroke="${primary ? T.gold2 : T.gold3}" stroke-width="${primary ? 1.5 : 1.8}"/>
${primary ? `<g clip-path="url(#cl)"><rect class="sw" x="0" y="0" width="90" height="${H}" fill="url(#sh)" transform="skewX(-20)"/></g>` : ''}
<g transform="translate(40 ${H / 2})" fill="none" stroke="${primary ? ink : T.gold3}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${icon}</g>
<text x="72" y="${H / 2 - 2}" font-size="19" font-weight="700" fill="${primary ? ink : T.ink}">${esc(t)}</text>
<text class="s" x="72" y="${H / 2 + 18}" font-size="12.5" fill="${primary ? ink : T.muted}" opacity="${primary ? 0.8 : 1}">${esc(s)}</text>`;
    write(name, theme, lang, svg(W, H, t, defs, body, css));
  };
  make('btn-macos', L.btnMac, true, '<path d="M0 -14V8M-8 0l8 8 8-8M-12 14h24"/>');
  make('btn-web', L.btnWeb, false, `<path d="${hexPath(0, 0, 13).replace(/(\d+\.\d)/g, (m) => m)}"/><path d="M-4 -6l9 6-9 6z" fill="currentColor"/>`);
  make('btn-releases', L.btnSrc, false, '<path d="M-12 -12h15l9 9-15 15-9-9z"/><circle cx="-5" cy="-5" r="2.2"/>');
}

// ══════════════════════ PIED DE PAGE ══════════════════════
function footer(T, theme, lang, A) {
  const L = TX[lang];
  const W = 1200, H = 200, base = 118;
  const css = `.hop{animation:hop 2.6s cubic-bezier(.3,.6,.3,1) infinite}@keyframes hop{0%,40%,100%{transform:translateY(0)}55%{transform:translateY(-18px)}70%{transform:translateY(0)}78%{transform:translateY(-5px)}86%{transform:translateY(0)}}${CSS.tw}`;
  const xs = [360, 480, 600, 720, 840];
  let body = xs.map((x) => `<path d="${hexPath(x, base + 6, 40, 0.42)}" fill="none" stroke="${T.edge}" stroke-width="1.3"/>`).join('');
  A.starters.forEach((s, i) => {
    body += `${shadow(T, xs[i], base + 4, 26, 5, 0.12)}<g class="hop" style="animation-delay:${(i * 0.18).toFixed(2)}s">${image(s, xs[i], base + 4)}</g>`;
  });
  body += `<path class="tw" d="${star4(950, 60, 9)}" fill="${T.glow}"/><path class="tw" style="animation-delay:1.2s" d="${star4(250, 80, 7)}" fill="${T.glow}"/>
<text class="c" x="${W / 2}" y="${H - 22}" font-size="18" font-weight="700" fill="${T.gold3}">${esc(L.footer)}</text>`;
  write('footer', theme, lang, svg(W, H, L.footer, '', body, css));
}

// ══════════════════════ COURBE DE DIFFICULTÉ ══════════════════════
function chart(T, theme, lang) {
  const L = TX[lang];
  const data = [[[18, 91, 100], '18 · 30 · 45'], [[29, 74, 100], '35 · 55 · 80'], [[28, 68, 87], '55 · 85 · 120'], [[37, 64, 71], '80 · 120 · 170']];
  const W = 1000, H = 440, x0 = 90, y0 = 360, ph = 270, gw = 205;
  const cols = [T.red, T.teal, T.gold2];
  const css = `.grow{transform-box:fill-box;transform-origin:50% 100%;animation:grow 1.4s cubic-bezier(.2,.8,.2,1) both}@keyframes grow{from{transform:scaleY(0)}to{transform:scaleY(1)}}`;
  let body = `<text class="s" x="${W / 2}" y="26" text-anchor="middle" font-size="15" fill="${T.muted}">${esc(L.chartTitle)}</text>`;
  for (const v of [0, 25, 50, 75, 100]) {
    const y = y0 - (ph * v) / 100;
    body += `<line x1="${x0 - 8}" x2="${W - 30}" y1="${y}" y2="${y}" stroke="${T.edge}" stroke-width="1" stroke-dasharray="3 5"/><text class="s" x="${x0 - 16}" y="${y + 4}" font-size="12.5" text-anchor="end" fill="${T.muted}">${v} %</text>`;
  }
  data.forEach(([vals, gold], g) => {
    const gx = x0 + 20 + g * (gw + 22);
    vals.forEach((v, i) => {
      const h = (ph * v) / 100, bx = gx + i * 62;
      body += `<rect class="grow" style="animation-delay:${(g * 0.25 + i * 0.1).toFixed(2)}s" x="${bx}" y="${y0 - h}" width="52" height="${h}" rx="6" fill="${cols[i]}" fill-opacity=".85"/><text class="s c" x="${bx + 26}" y="${y0 - h - 8}" font-size="13.5" font-weight="700" fill="${T.ink}">${v} %</text>`;
    });
    body += `<text class="c" x="${gx + 88}" y="${y0 + 28}" font-size="14.5" font-weight="700" fill="${T.ink}">${esc(L.chartArenas[g])}</text><text class="s c" x="${gx + 88}" y="${y0 + 48}" font-size="12" fill="${T.muted}">${gold} ${L.gold}</text>`;
  });
  L.chartLeg.forEach((t, i) => {
    body += `<rect x="${W - 360 + i * 115}" y="46" width="14" height="14" rx="3" fill="${cols[i]}"/><text class="s" x="${W - 341 + i * 115}" y="58" font-size="13" fill="${T.ink}">${esc(t)}</text>`;
  });
  write('balance', theme, lang, svg(W, H, L.chartTitle, '', body, css));
}

// ══════════════════════ IMAGES ══════════════════════
const C = (n) => `creatures/${n}.webp`;
const shot = join(ROOT, 'docs', 'screenshots', 'worldzoom.jpg');
const A = {
  world: await img(shot, { h: 490, crop: { left: 300, top: 40, width: 930, height: 780 }, q: 70, k: 1.6 }),
  fox: await img(C('flammeche_3'), { h: 182 }),
  lev: await img(C('goutelle_3'), { h: 150 }),
  townhall: await img('buildings/townhall.webp', { h: 150 }),
  house: await img('buildings/house.webp', { h: 80 }),
  farm: await img('buildings/farm.webp', { h: 74 }),
  fox2: await img(C('flammeche_2'), { h: 120 }),
  wolf: await img('monsters/loup.webp', { h: 104, flip: true }),
  shiny: await img(C('goutelle_2'), { h: 140, hue: 150 }),
  spark: await img(C('etincelle_1'), { h: 64 }),
  tex: {
    forest: await img('terrain/forest.webp', { w: 150, q: 70, k: 1.4 }),
    plains: await img('terrain/plains.webp', { w: 150, q: 70, k: 1.4 }),
    shallow: await img('terrain/shallow.webp', { w: 150, q: 70, k: 1.4 }),
  },
  b: {
    farm: await img('buildings/farm.webp', { w: 104 }),
    lumber: await img('buildings/lumber.webp', { w: 110 }),
    auction: await img('buildings/auction.webp', { w: 96 }),
    port: await img('buildings/port.webp', { w: 124 }),
    house: await img('buildings/house.webp', { w: 92 }),
    tree: await img('props/tree_1.webp', { h: 108 }),
    tree2: await img('props/tree_3.webp', { h: 100 }),
  },
  shop: await Promise.all(['flammeche_1', 'goutelle_1', 'galet_1', 'bourgeon_1', 'etincelle_1'].map((n) => img(C(n), { h: 30 }))),
  fox2s: await img(C('flammeche_2'), { h: 84 }),
  wolfs: await img('monsters/loup.webp', { h: 70, flip: true }),
  f1: await img(C('flammeche_1'), { h: 118 }), f2: await img(C('flammeche_2'), { h: 190 }), f3: await img(C('flammeche_3'), { h: 215 }), f3s: await img(C('flammeche_3'), { h: 215, hue: 150 }),
  w1: await img(C('goutelle_1'), { h: 118 }), w2: await img(C('goutelle_2'), { h: 175 }), w3: await img(C('goutelle_3'), { h: 185 }), w3s: await img(C('goutelle_3'), { h: 185, hue: 150 }),
  c1: await img(C('flammeche_1'), { h: 44 }), c2: await img(C('flammeche_2'), { h: 64 }), c3: await img(C('flammeche_3'), { h: 74 }),
  c3big: await img(C('flammeche_3'), { h: 128 }),
  starters: await Promise.all(['flammeche_1', 'goutelle_1', 'bourgeon_1', 'galet_1', 'etincelle_1'].map((n) => img(C(n), { h: 58 }))),
};
const RAW = join(ROOT, 'art', 'raw', 'line_feu.png');
A.raw = existsSync(RAW) ? await img(RAW, { w: 228, q: 72 }) : await img(C('flammeche_2'), { h: 90 });
const LINES = [['flammeche', 'Infernyx', 'feu'], ['bourgeon', 'Ancestrel', 'plante'], ['goutelle', 'Léviathys', 'eau'], ['galet', 'Titanor', 'roche'], ['etincelle', 'Fulgurion', 'foudre'], ['ombrelin', 'Nécrombre', 'ombre'], ['mycelor', 'Myconide-roi', 'plante'], ['carapix', 'Bastiodon', 'eau'], ['salamandre', 'Drakéon', 'feu'], ['cristallon', 'Colosse prismatique', 'roche'], ['griffon', 'Tonnegriffe', 'foudre', 2], ['faucheur', 'Moissonneur', 'ombre'], ['phenix', 'Phénix solaire', 'feu'], ['hydrelle', 'Hydre des abysses', 'eau'], ['dryade', 'Reine des bois', 'plante']];
A.parade = await Promise.all(LINES.map(async ([id, name, el, st = 3]) => ({ s: await img(C(`${id}_${st}`), { h: 140, q: 74 }), name, el })));

for (const [theme, T] of Object.entries(THEMES)) {
  await evolution(T, theme, A);
  await parade(T, theme, A);
  for (const lang of ['fr', 'en']) {
    await hero(T, theme, lang, A);
    stats(T, theme, lang);
    await features(T, theme, lang, A);
    loop(T, theme, lang);
    await adjacency(T, theme, lang, A);
    await economy(T, theme, lang, A);
    types(T, theme, lang);
    await pipeline(T, theme, lang, A);
    architecture(T, theme, lang);
    roadmap(T, theme, lang);
    buttons(T, theme, lang);
    footer(T, theme, lang, A);
    chart(T, theme, lang);
  }
}
for (const [f, n] of files.filter(([f]) => f.includes('-dark') && !f.endsWith('-en.svg'))) console.log('✓', f.replace('-dark', '-{light,dark}'), (n / 1024).toFixed(0), 'Ko');
console.log(files.length, 'fichiers');
