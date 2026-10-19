// Codex du jeu : bestiaire, monstres & arènes, types & ascendants, bâtiments, reliques, règles — et panneau d'options.
// Tout est généré à partir des données du jeu (src/data) : un ajout de créature apparaît tout seul ici.
import { audio } from '../audio';
import { BUILDINGS, BUILD_MENU } from '../data/buildings';
import { CREATURES, ENCOUNTERS, MONSTERS, SHOP_ODDS, STAR_MULT, TIER_COST, type CreatureDef } from '../data/creatures';
import { ELEMENTS, ELEMENT_LIST, SUPER, SYNERGIES, WEAK, strongAgainst, typeMultiplier, weakAgainst } from '../data/elements';
import { RELICS } from '../data/relics';
import { TERRAINS } from '../data/terrain';
import type { Element, IconName, Res } from '../data/types';
import { clearSave } from '../game/state';
import { ACHIEVEMENTS } from '../data/achievements';
import { DIFFICULTIES } from '../data/difficulty';
import { profile, resetProfile, unlockedCount } from '../meta';
import { buildingIcon } from '../render/buildingArt';
import { creaturePortrait } from '../render/creatureArt';
import { resetSettings, saveSettings, settings } from '../settings';
import { mount, stars } from './common';
import { resetTutorial } from './tutorial';
import { icon } from './icons';

export type CodexTab = 'bestiary' | 'monsters' | 'types' | 'buildings' | 'relics' | 'rules' | 'achievements';

const TABS: [CodexTab, string, IconName][] = [
  ['bestiary', 'Bestiaire', 'paw'],
  ['monsters', 'Monstres & arènes', 'skull'],
  ['types', 'Types & ascendants', 'sword'],
  ['buildings', 'Bâtiments', 'house'],
  ['relics', 'Reliques', 'gem'],
  ['rules', 'Règles & glossaire', 'scroll'],
  ['achievements', 'Hauts faits', 'crown'],
];

// Or conseillé en arrivant dans chaque arène (issu des simulations d'équilibrage).
const ADVISED_GOLD = [30, 55, 85, 120];

const fx = (n: number) => String(n).replace('.', ',');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ——— Personnages (créatures + monstres) ———
interface Char {
  id: string;
  name: string;
  el: Element;
  monster: boolean;
  tier: number;
  boss: boolean;
  look: CreatureDef['look'];
}

const CHARS: Char[] = [
  ...CREATURES.map((c): Char => ({ id: c.id, name: c.names[0], el: c.element, monster: false, tier: c.tier, boss: false, look: c.look })),
  ...Object.values(MONSTERS).map((m): Char => ({ id: m.id, name: m.name, el: m.element, monster: true, tier: 0, boss: !!m.boss, look: m.look })),
].sort((a, b) => ELEMENT_LIST.indexOf(a.el) - ELEMENT_LIST.indexOf(b.el) || Number(a.monster) - Number(b.monster) || a.tier - b.tier);

const portrait = (c: Char, size = 56, star = 1) => creaturePortrait(c.monster ? `m-${c.id}` : c.id, c.look, star, size);
const beats = (a: Char, b: Char) => typeMultiplier(a.el, b.el) > 1;

function tchip(el: Element) {
  return `<span class="cx-chip" style="--c:${ELEMENTS[el].color}">${icon(el, 14)}${ELEMENTS[el].name}</span>`;
}

function roleOf(range: number, kind: string) {
  const r: Record<string, string> = {
    nuke: 'Frappe puissante', drain: 'Sangsue', aoe: 'Dégâts de zone', slam: 'Contrôle de zone', stun: 'Contrôle', heal: 'Soigneur',
    teamheal: 'Soigneur d\'équipe', shield: 'Protecteur', frenzy: 'Berserker', multishot: 'Multi-cibles',
  };
  return `${range > 1 ? 'Distance' : 'Mêlée'} · ${r[kind] ?? kind}`;
}

function explain(title: string, body: string, open = false) {
  return `<details class="cx-explain" ${open ? 'open' : ''}><summary>${icon('question', 16)} ${title}</summary><div class="cx-ex-body">${body}</div></details>`;
}

// ——— Onglet : Bestiaire ———
function bestiaryHtml() {
  return `
  ${explain('Comment lire ce tableau', `
    <ul>
      <li><b>Groupe</b> : le <i>type élémentaire</i> de la créature. Il décide de ses forces et faiblesses et de la <b>synergie</b> d'équipe à laquelle elle contribue (2 ou 4 créatures <i>différentes</i> du même type sur le plateau).</li>
      <li><b>Palier</b> (T1 à T4) et <b>coût</b> : prix en boutique d'arène (${TIER_COST.slice(1).join(' / ')} or). Plus le palier est haut, plus la créature est forte et rare.</li>
      <li><b>★1 / ★2 / ★3</b> : trois copies identiques fusionnent en une forme évoluée. Les stats sont multipliées par ${STAR_MULT.map(fx).join(' puis ')} et le sort s'améliore. Choisissez l'étoile à afficher avec les boutons du dessus.</li>
      <li><b>PV</b> : points de vie · <b>ATQ</b> : dégâts par coup · <b>Vit.</b> : coups par seconde · <b>Portée</b> : en cases · <b>Armure</b> : % de dégâts évités · <b>Mana</b> : à plein, la créature lance son sort (elle en gagne en frappant et en encaissant).</li>
      <li><b>Fort contre</b> : types que cette créature frappe <b>super efficacement</b> (dégâts ×${fx(SUPER)}) · <b>Faible face à</b> : types qui la frappent ainsi. Un type est <i>peu efficace</i> (×${fx(WEAK)}) contre celui qui le domine.</li>
      <li><b>Domine</b> : nombre de personnages (créatures <i>et</i> monstres) du jeu sur lesquels elle a l'ascendant · <b>Craint</b> : nombre de personnages qui ont l'ascendant sur elle. Passez la souris sur les chiffres pour voir les noms.</li>
      <li>Cliquez sur un titre de colonne pour trier.</li>
    </ul>`, true)}
  <div class="cx-filters">
    <span class="muted">Type :</span><span id="cx-types"></span>
    <input id="cx-q" type="search" placeholder="Rechercher une créature…">
    <span class="muted">Étoile :</span><span id="cx-stars"></span>
  </div>
  <div class="cx-scroll"><table class="cx-table" id="cx-bestiary"></table></div>`;
}

function bestiaryInit(root: HTMLElement) {
  let star = 1;
  let q = '';
  let sortKey = 'el';
  let dir = 1;
  const typeOn = new Set<Element>(ELEMENT_LIST);
  const table = root.querySelector('#cx-bestiary') as HTMLElement;

  const typeBox = root.querySelector('#cx-types')!;
  for (const el of ELEMENT_LIST) {
    const b = document.createElement('button');
    b.className = 'cx-toggle on';
    b.innerHTML = `${icon(el, 14)}${ELEMENTS[el].name}`;
    b.style.setProperty('--c', ELEMENTS[el].color);
    b.addEventListener('click', () => {
      if (typeOn.has(el)) typeOn.delete(el);
      else typeOn.add(el);
      b.classList.toggle('on', typeOn.has(el));
      draw();
    });
    typeBox.appendChild(b);
  }
  const starBox = root.querySelector('#cx-stars')!;
  [1, 2, 3].forEach((s) => {
    const b = document.createElement('button');
    b.className = `cx-toggle ${s === 1 ? 'on' : ''}`;
    b.textContent = stars(s);
    b.addEventListener('click', () => {
      star = s;
      starBox.querySelectorAll('button').forEach((x, i) => x.classList.toggle('on', i + 1 === s));
      draw();
    });
    starBox.appendChild(b);
  });
  (root.querySelector('#cx-q') as HTMLInputElement).addEventListener('input', (e) => {
    q = (e.target as HTMLInputElement).value.toLowerCase();
    draw();
  });

  const cols: [string, string][] = [
    ['', ''], ['name', 'Créature'], ['el', 'Groupe'], ['tier', 'Palier'], ['role', 'Rôle'], ['hp', 'PV'], ['atk', 'ATQ'], ['as', 'Vit.'],
    ['range', 'Portée'], ['armor', 'Armure'], ['mana', 'Mana'], ['', 'Sort'], ['', 'Fort contre'], ['', 'Faible face à'], ['dom', 'Domine'], ['fear', 'Craint'],
  ];

  function draw() {
    const rows = CREATURES.filter((c) => typeOn.has(c.element) && (!q || c.names.join(' ').toLowerCase().includes(q))).map((c) => {
      const me = CHARS.find((x) => x.id === c.id && !x.monster)!;
      const dom = CHARS.filter((o) => o !== me && beats(me, o));
      const fear = CHARS.filter((o) => o !== me && beats(o, me));
      const m = STAR_MULT[star - 1];
      return {
        c, me, dom, fear, name: c.names[star - 1], el: ELEMENT_LIST.indexOf(c.element), tier: c.tier, role: roleOf(c.range, c.ability.kind),
        hp: Math.round(c.hp * m), atk: Math.round(c.atk * m), as: c.as, range: c.range, armor: c.armor, mana: c.mana, domN: dom.length, fearN: fear.length,
      };
    });
    const keyMap: Record<string, string> = { dom: 'domN', fear: 'fearN' };
    const k = keyMap[sortKey] ?? sortKey;
    rows.sort((a, b) => {
      const va = (a as unknown as Record<string, number | string>)[k];
      const vb = (b as unknown as Record<string, number | string>)[k];
      return (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))) * dir || a.el - b.el;
    });
    table.innerHTML = `<thead><tr>${cols.map(([key, label]) => `<th data-k="${key}" class="${key ? 'sortable' : ''} ${key === sortKey ? 'sorted' : ''}">${label}${key === sortKey ? (dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>
      <td><img class="cx-pic" src="${portrait(r.me, 56, star)}" alt=""></td>
      <td><b>${r.name}</b> <span class="gold">${stars(star)}</span><div class="muted small">${r.c.names.join(' → ')}</div></td>
      <td>${tchip(r.c.element)}<div class="muted small">${SYNERGIES[r.c.element].title}</div></td>
      <td>T${r.tier}<div class="muted small">${TIER_COST[r.tier]} or</div></td>
      <td>${r.role}</td>
      <td class="num">${r.hp}</td><td class="num">${r.atk}</td><td class="num">${fx(r.as)}</td><td class="num">${r.range}</td>
      <td class="num">${Math.round(r.armor * 100)}%</td><td class="num">${r.mana}</td>
      <td class="wide"><b class="gold">${r.c.ability.name}</b><div class="small">${r.c.ability.desc.replace('{v}', String(r.c.ability.values[star - 1]))}</div></td>
      <td>${strongAgainst(r.c.element).map(tchip).join(' ') || '—'}</td>
      <td>${weakAgainst(r.c.element).map(tchip).join(' ') || '—'}</td>
      <td class="num up" title="${esc(r.dom.map((o) => o.name).join(', ') || 'Aucun')}">▲ ${r.domN}</td>
      <td class="num down" title="${esc(r.fear.map((o) => o.name).join(', ') || 'Aucun')}">▼ ${r.fearN}</td>
    </tr>`).join('') || '<tr><td colspan="16" class="muted">Aucune créature ne correspond.</td></tr>'}</tbody>`;
    table.querySelectorAll<HTMLElement>('th.sortable').forEach((th) =>
      th.addEventListener('click', () => {
        const key = th.dataset.k!;
        if (sortKey === key) dir = -dir;
        else {
          sortKey = key;
          dir = 1;
        }
        draw();
      }),
    );
  }
  draw();
}

// ——— Onglet : Monstres & arènes ———
function monstersHtml() {
  const mons = Object.values(MONSTERS);
  const where = (id: string) => ENCOUNTERS.map((e, i) => (e.enemies.some((x) => x.id === id) ? i + 1 : 0)).filter(Boolean);
  const rows = mons.map((m) => {
    const me = CHARS.find((x) => x.id === m.id && x.monster)!;
    const counters = CHARS.filter((o) => !o.monster && beats(o, me));
    return `<tr>
      <td><img class="cx-pic" src="${portrait(me, 56)}" alt=""></td>
      <td><b>${m.name}</b>${m.boss ? ' <span class="gold">· Boss</span>' : ''}<div class="muted small">Taille ×${fx(m.scale)}</div></td>
      <td>${tchip(m.element)}<div class="muted small">${SYNERGIES[m.element].title}</div></td>
      <td>${where(m.id).length ? `Arène ${where(m.id).join(', ')}` : '<span class="gold">Aventure</span>'}</td>
      <td class="num">${m.hp}</td><td class="num">${m.atk}</td><td class="num">${fx(m.as)}</td><td class="num">${m.range}</td><td class="num">${Math.round(m.armor * 100)}%</td>
      <td class="wide"><b class="gold">${m.ability.name}</b><div class="small">${m.ability.desc.replace('{v}', String(m.ability.values[0]))}</div></td>
      <td>${weakAgainst(m.element).map(tchip).join(' ') || '—'}</td>
      <td class="pics">${counters.map((c) => `<img class="cx-mini" src="${portrait(c, 40)}" title="${esc(c.name)} (${ELEMENTS[c.el].name})" alt="">`).join('') || '—'}</td>
    </tr>`;
  });
  const arenas = ENCOUNTERS.map((e, i) => {
    const ids = [...new Set(e.enemies.map((x) => x.id))];
    const types = [...new Set(ids.map((id) => MONSTERS[id].element))] as Element[];
    const weak = [...new Set(types.flatMap((t) => weakAgainst(t)))] as Element[];
    return `<tr><td class="num">${i + 1}</td><td><b>${e.name}</b><div class="small muted">${e.desc}</div></td>
      <td>${ids.map((id) => `<img class="cx-mini" src="${portrait(CHARS.find((c) => c.id === id && c.monster)!, 40)}" title="${esc(MONSTERS[id].name)}" alt="">`).join('')}</td>
      <td>${types.map(tchip).join(' ')}</td><td>${weak.map(tchip).join(' ')}</td>
      <td class="num">${e.reward ? `${e.reward} or` : '—'}</td><td class="num">≈ ${ADVISED_GOLD[i]} or</td><td class="num">×${fx(e.power)}</td></tr>`;
  });
  return `
  ${explain('Comment lire ces tableaux', `
    <ul>
      <li><b>Monstres</b> : les créatures sauvages que vous affrontez en arène. Les stats affichées sont les valeurs de base ; chaque arène applique en plus un <b>coefficient de puissance</b> (dernière colonne du tableau des arènes) aux PV, à l'attaque et aux sorts.</li>
      <li><b>Faible face à</b> : types élémentaires qui les frappent super efficacement (dégâts ×${fx(SUPER)}). La colonne <b>Vos créatures avantagées</b> montre en portraits toutes vos créatures de ces types : survolez-les pour lire leur nom.</li>
      <li><b>Arènes</b> : l'or conseillé est le budget d'arène qui donne une bonne chance de victoire (~70 %) ; en dessous, il faut compenser avec des bâtiments de combat, des reliques ou un bon contre-type. Le boss final est volontairement le plus difficile.</li>
      <li><b>Types présents</b> et <b>Types qui les dominent</b> résument quels éléments recruter avant d'entrer dans l'arène.</li>
    </ul>`, true)}
  <h3 class="cx-h">Les arènes</h3>
  <div class="cx-scroll"><table class="cx-table"><thead><tr><th>#</th><th>Arène</th><th>Monstres</th><th>Types présents</th><th>Types qui les dominent</th><th>Récompense</th><th>Or conseillé</th><th>Puissance</th></tr></thead><tbody>${arenas.join('')}</tbody></table></div>
  <h3 class="cx-h">Les monstres</h3>
  <div class="cx-scroll"><table class="cx-table"><thead><tr><th></th><th>Monstre</th><th>Type</th><th>Où</th><th>PV</th><th>ATQ</th><th>Vit.</th><th>Portée</th><th>Armure</th><th>Sort</th><th>Faible face à</th><th>Vos créatures avantagées</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}

// ——— Onglet : Types & ascendants ———
function typesHtml() {
  const matrix = `<table class="cx-table cx-matrix6"><thead><tr><th class="corner">Attaquant ↓ &nbsp; Défenseur →</th>${ELEMENT_LIST.map((d) => `<th>${tchip(d)}</th>`).join('')}</tr></thead><tbody>${ELEMENT_LIST.map(
    (a) => `<tr><th>${tchip(a)}</th>${ELEMENT_LIST.map((d) => {
      const m = typeMultiplier(a, d);
      return m > 1 ? `<td class="up">▲ ×${fx(m)}</td>` : m < 1 ? `<td class="down">▼ ×${fx(m)}</td>` : '<td class="neu">·</td>';
    }).join('')}</tr>`,
  ).join('')}</tbody></table>`;

  const groups = ELEMENT_LIST.map((el) => {
    const mem = CHARS.filter((c) => c.el === el);
    const syn = SYNERGIES[el];
    return `<tr><td>${tchip(el)}<div class="small gold">${syn.title}</div></td>
      <td class="small">${syn.tiers.map((t) => `<b>(${t.count})</b> ${t.desc}`).join('<br>')}</td>
      <td>${strongAgainst(el).map(tchip).join(' ') || '—'}</td><td>${weakAgainst(el).map(tchip).join(' ') || '—'}</td>
      <td class="pics">${mem.filter((c) => !c.monster).map((c) => `<img class="cx-mini" src="${portrait(c, 40)}" title="${esc(c.name)}" alt="">`).join('')}</td>
      <td class="pics">${mem.filter((c) => c.monster).map((c) => `<img class="cx-mini" src="${portrait(c, 40)}" title="${esc(c.name)}" alt="">`).join('') || '—'}</td></tr>`;
  }).join('');

  const opt = (c: Char) => `<option value="${c.monster ? 'm' : 'c'}:${c.id}">${c.name} (${ELEMENTS[c.el].name})</option>`;
  const optGroup = (label: string, list: Char[]) => `<optgroup label="${label}">${list.map(opt).join('')}</optgroup>`;
  const selects = optGroup('Créatures', CHARS.filter((c) => !c.monster)) + optGroup('Monstres', CHARS.filter((c) => c.monster));

  return `
  ${explain('Comment lire ces tableaux', `
    <ul>
      <li>Chaque personnage appartient à un <b>groupe</b> = un <b>type élémentaire</b> (Feu, Eau, Plante, Foudre, Roche, Ombre).</li>
      <li><b>Matrice des types</b> : la <b>ligne</b> est l'<i>attaquant</i>, la <b>colonne</b> le <i>défenseur</i>. <span class="up">▲ ×${fx(SUPER)}</span> = super efficace (dégâts augmentés, message « Super efficace ! »), <span class="down">▼ ×${fx(WEAK)}</span> = peu efficace, <span class="neu">·</span> = dégâts normaux.</li>
      <li>Les types se répondent en boucle : <b>Plante</b> domine <b>Eau</b> et <b>Roche</b> ; <b>Eau</b> domine <b>Feu</b> et <b>Roche</b> ; <b>Feu</b> domine <b>Plante</b> ; <b>Foudre</b> domine <b>Eau</b> ; <b>Roche</b> domine <b>Feu</b> et <b>Foudre</b> ; <b>Ombre</b> ne domine que l'<b>Ombre</b> (un duel d'ombres est donc toujours violent des deux côtés).</li>
      <li><b>Groupes & synergies</b> : poser sur le plateau 2 ou 4 créatures <i>différentes</i> d'un même type active un bonus d'équipe (colonne Synergie). Les créatures et monstres du groupe sont listés en portraits.</li>
      <li><b>Comparateur</b> : choisissez deux personnages pour voir lequel a l'ascendant, et de combien.</li>
      <li><b>Matrice complète</b> : tous les personnages face à tous. Lisez-la par <b>ligne</b> : la case indique ce qui se passe quand le personnage de la <i>ligne</i> frappe celui de la <i>colonne</i> (▲ avantage, ▼ désavantage, · neutre). Survolez une case pour surligner la ligne et la colonne.</li>
    </ul>`, true)}
  <h3 class="cx-h">Matrice des types</h3>
  <div class="cx-scroll">${matrix}</div>
  <h3 class="cx-h">Groupes, synergies et membres</h3>
  <div class="cx-scroll"><table class="cx-table"><thead><tr><th>Groupe</th><th>Synergie (nombre de créatures différentes)</th><th>Fort contre</th><th>Faible face à</th><th>Créatures</th><th>Monstres</th></tr></thead><tbody>${groups}</tbody></table></div>
  <h3 class="cx-h">Comparateur : qui a l'ascendant ?</h3>
  <div class="cx-compare"><select id="cmpA">${selects}</select><span class="vs">VS</span><select id="cmpB">${selects}</select></div>
  <div id="cmpOut" class="cx-cmp-out"></div>
  <h3 class="cx-h">Matrice complète des personnages</h3>
  <div class="cx-scroll cx-bigm"><table class="cx-table cx-cross" id="cx-cross"></table></div>`;
}

function typesInit(root: HTMLElement) {
  // comparateur
  const A = root.querySelector('#cmpA') as HTMLSelectElement;
  const B = root.querySelector('#cmpB') as HTMLSelectElement;
  const out = root.querySelector('#cmpOut') as HTMLElement;
  const find = (v: string) => CHARS.find((c) => `${c.monster ? 'm' : 'c'}:${c.id}` === v)!;
  const first = CHARS.find((c) => c.id === 'flammeche')!;
  const second = CHARS.find((c) => c.id === 'bourgeon')!;
  A.value = `c:${first.id}`;
  B.value = `c:${second.id}`;
  const label = (m: number) => (m > 1 ? `super efficace (×${fx(m)})` : m < 1 ? `peu efficace (×${fx(m)})` : 'dégâts normaux (×1)');
  const cmp = () => {
    const a = find(A.value);
    const b = find(B.value);
    const m1 = typeMultiplier(a.el, b.el);
    const m2 = typeMultiplier(b.el, a.el);
    const verdict = m1 > m2 ? `<b class="up">${a.name} a l'ascendant</b> : il frappe plus fort que son adversaire.` : m2 > m1 ? `<b class="up">${b.name} a l'ascendant</b> : il frappe plus fort que son adversaire.` : '<b>Duel équilibré</b> : aucun des deux n\'a l\'ascendant de type, tout se jouera sur les stats et les synergies.';
    out.innerHTML = `<div class="cx-duel">
      <div><img class="cx-pic big" src="${portrait(a, 96)}" alt=""><div><b>${a.name}</b></div>${tchip(a.el)}</div>
      <div class="mid"><div class="${m1 > 1 ? 'up' : m1 < 1 ? 'down' : 'neu'}">${a.name} → ${b.name} : ${label(m1)}</div><div class="${m2 > 1 ? 'up' : m2 < 1 ? 'down' : 'neu'}">${b.name} → ${a.name} : ${label(m2)}</div><div class="verdict">${verdict}</div></div>
      <div><img class="cx-pic big" src="${portrait(b, 96)}" alt=""><div><b>${b.name}</b></div>${tchip(b.el)}</div></div>`;
  };
  A.addEventListener('change', cmp);
  B.addEventListener('change', cmp);
  cmp();

  // matrice complète
  const t = root.querySelector('#cx-cross') as HTMLElement;
  t.innerHTML = `<thead><tr><th class="corner"></th>${CHARS.map((c, j) => `<th class="vh" data-c="${j}" style="--c:${ELEMENTS[c.el].color}"><img class="cx-mini" src="${portrait(c, 40)}" alt=""><span>${c.name}</span></th>`).join('')}</tr></thead>
  <tbody>${CHARS.map((a, i) => `<tr data-r="${i}"><th class="rh" style="--c:${ELEMENTS[a.el].color}"><img class="cx-mini" src="${portrait(a, 40)}" alt=""><span>${a.name}</span></th>${CHARS.map((b, j) => {
    const m = typeMultiplier(a.el, b.el);
    const cls = m > 1 ? 'up' : m < 1 ? 'down' : 'neu';
    return `<td class="${cls}" data-r="${i}" data-c="${j}" title="${esc(a.name)} → ${esc(b.name)} : ${label(m)}">${m > 1 ? '▲' : m < 1 ? '▼' : '·'}</td>`;
  }).join('')}</tr>`).join('')}</tbody>`;
  let hl: HTMLElement[] = [];
  t.addEventListener('mouseover', (e) => {
    hl.forEach((x) => x.classList.remove('hl'));
    const td = (e.target as HTMLElement).closest('td');
    if (!td) return;
    const r = td.dataset.r;
    const c = td.dataset.c;
    hl = [...t.querySelectorAll<HTMLElement>(`[data-r="${r}"], [data-c="${c}"]`)];
    hl.forEach((x) => x.classList.add('hl'));
  });
}

// ——— Onglet : Bâtiments ———
function buildingsHtml() {
  const costTxt = (c: Res) => (Object.keys(c).length ? (['gold', 'wood', 'stone', 'food'] as const).filter((k) => c[k]).map((k) => `<span class="nowrap">${icon(k, 14)}${c[k]}</span>`).join(' ') : 'Gratuit');
  const cat = { eco: 'Économie', combat: 'Combat', core: 'Cœur du royaume' };
  const rows = [...BUILD_MENU, 'townhall' as const, 'colosseum' as const].map((id) => {
    const b = BUILDINGS[id];
    return `<tr><td><img class="cx-pic" src="${buildingIcon(id, 64)}" alt=""></td><td><b>${b.name}</b><div class="muted small">${b.desc}</div></td>
      <td>${cat[b.category]}</td><td>${costTxt(b.cost)}</td><td class="num">${b.work || '—'}</td><td class="num">${b.jobs || '—'}</td>
      <td class="small">${b.terrains.map((t) => TERRAINS[t].name).join(', ')}${b.needsWater ? '<br><i>au bord de l\'eau</i>' : ''}</td>
      <td class="wide">${b.effect}</td><td class="num">${b.max ?? '—'}</td></tr>`;
  });
  return `
  ${explain('Comment lire ce tableau', `
    <ul>
      <li><b>Catégorie</b> : <i>Économie</i> (produisent des ressources), <i>Combat</i> (renforcent vos créatures en arène), <i>Cœur</i> (déjà posés au départ).</li>
      <li><b>Coût</b> : ressources payées dès que vous lancez le chantier (remboursées si vous l'annulez). <b>Chantier</b> : points de construction nécessaires ; chaque <i>bâtisseur</i> en fournit 1 par tour (2 avec le Marteau du maître).</li>
      <li><b>Ouvriers</b> : un bâtiment productif a besoin d'un villageois <i>ouvrier</i> pour fonctionner. Villageois = bâtisseurs + ouvriers ; sans ouvrier le bâtiment est à l'arrêt.</li>
      <li><b>Terrains</b> : où on peut le poser. La colonne <b>Effet</b> décrit aussi les <b>bonus d'adjacence</b> : produire plus quand certains bâtiments ou terrains sont sur les cases voisines (ex. Hôtel des ventes + Port = +5 or, fermes côte à côte, marché entouré de maisons).</li>
      <li><b>Max</b> : nombre maximum constructible. Les territoires s'étendent autour de vos bâtiments ; on ne construit que dans son territoire.</li>
    </ul>`, true)}
  <div class="cx-scroll"><table class="cx-table"><thead><tr><th></th><th>Bâtiment</th><th>Catégorie</th><th>Coût</th><th>Chantier</th><th>Ouvriers</th><th>Terrains</th><th>Effet et adjacences</th><th>Max</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}

// ——— Onglet : Reliques ———
function relicsHtml() {
  const rar = ['', 'Commune', 'Rare', 'Épique'];
  return `
  ${explain('Comment lire ce tableau', `
    <ul>
      <li>Les <b>reliques</b> sont des bonus permanents pour toute la partie. Vous en gagnez comme <b>récompense de victoire d'arène</b> (2 reliques au choix), dans des <b>événements</b> (caravane, autel, marteau du forgeron…) et dans des <b>ruines</b> à explorer.</li>
      <li><b>Rareté</b> : plus elle est haute, moins la relique est fréquente dans les tirages. Une relique déjà possédée n'est jamais proposée.</li>
      <li>Les reliques de <b>type</b> (Cristal ardent, Totem de mousse…) ne renforcent que les créatures de l'élément correspondant : choisissez-les selon votre équipe.</li>
    </ul>`, true)}
  <div class="cx-scroll"><table class="cx-table"><thead><tr><th></th><th>Relique</th><th>Effet</th><th>Rareté</th></tr></thead><tbody>${RELICS.map(
    (r) => `<tr><td class="relic-ic">${icon(r.icon, 28)}</td><td><b>${r.name}</b></td><td class="wide">${r.desc}</td><td><span class="rar r${r.rarity}">${rar[r.rarity]}</span></td></tr>`,
  ).join('')}</tbody></table></div>`;
}

// ——— Onglet : Règles & glossaire ———
function rulesHtml() {
  const levels = SHOP_ODDS.map((o, i) => `<tr><td class="num">${i}</td>${o.map((p) => `<td class="num">${p} %</td>`).join('')}</tr>`).join('');
  return `
  ${explain('Comment lire ces tableaux', `<p>Ces tableaux résument les règles chiffrées du jeu : évolutions, boutique d'arène, vocabulaire. Ils se mettent à jour tout seuls avec les données du jeu.</p>`, true)}
  <h3 class="cx-h">Évolutions (étoiles)</h3>
  <div class="cx-scroll"><table class="cx-table"><thead><tr><th>Forme</th><th>Copies à fusionner</th><th>Stats</th><th>Valeur de revente</th></tr></thead><tbody>
    <tr><td>${stars(1)}</td><td class="num">1</td><td class="num">×${fx(STAR_MULT[0])}</td><td>coût de la créature</td></tr>
    <tr><td>${stars(2)}</td><td class="num">3 de ★1</td><td class="num">×${fx(STAR_MULT[1])}</td><td>coût × 3</td></tr>
    <tr><td>${stars(3)}</td><td class="num">3 de ★2 (soit 9)</td><td class="num">×${fx(STAR_MULT[2])}</td><td>coût × 9</td></tr>
  </tbody></table></div>
  <h3 class="cx-h">Boutique d'arène</h3>
  <p class="muted">Chaque créature coûte selon son palier : ${TIER_COST.slice(1).map((c, i) => `T${i + 1} = ${c} or`).join(', ')}. Relancer la boutique coûte 2 or. Le <b>niveau de boutique</b> = numéro de l'arène − 1 + vos Académies (+1 avec le Parchemin d'érudit) ; il décide des chances de voir chaque palier.</p>
  <div class="cx-scroll"><table class="cx-table"><thead><tr><th>Niveau</th><th>T1</th><th>T2</th><th>T3</th><th>T4</th></tr></thead><tbody>${levels}</tbody></table></div>
  <h3 class="cx-h">Glossaire</h3>
  <div class="cx-scroll"><table class="cx-table"><thead><tr><th>Terme</th><th>Signification</th></tr></thead><tbody>
    <tr><td><b>PV</b></td><td>Points de vie. À zéro, la créature tombe.</td></tr>
    <tr><td><b>ATQ</b></td><td>Dégâts d'un coup normal, avant armure et avantage de type.</td></tr>
    <tr><td><b>Vit.</b></td><td>Vitesse d'attaque : nombre de coups par seconde.</td></tr>
    <tr><td><b>Portée</b></td><td>Distance d'attaque en cases (1 = mêlée). Les créatures à distance restent derrière les autres.</td></tr>
    <tr><td><b>Armure</b></td><td>Pourcentage de dégâts évités (plafonné à 75 % avec les bonus).</td></tr>
    <tr><td><b>Mana</b></td><td>Jauge qui se remplit en frappant et en encaissant. À plein, la créature lance son <b>sort</b>.</td></tr>
    <tr><td><b>Synergie</b></td><td>Bonus d'équipe quand 2 ou 4 créatures <i>différentes</i> du même type sont sur le plateau.</td></tr>
    <tr><td><b>Super efficace</b></td><td>L'attaquant domine le type du défenseur : dégâts ×${fx(SUPER)}. À l'inverse, <b>peu efficace</b> : ×${fx(WEAK)}.</td></tr>
    <tr><td><b>Compagnon</b></td><td>Créature capturée (repaire, événement, récompense) qui rejoint gratuitement votre banc à chaque arène. Nombre limité par la Ménagerie.</td></tr>
    <tr><td><b>Œuf mystérieux</b></td><td>Récompense qui éclot après 2 ou 3 tours en une créature de palier croissant avec l'avancée dans le jeu.</td></tr>
    <tr><td><b>Chromatique ✦</b></td><td>Variante rare aux couleurs inversées : +20 % PV et attaque. Chances : 1 sur 8 à l'éclosion d'un œuf, 6 % en boutique d'arène, 10 % à la capture d'un repaire.</td></tr>
    <tr><td><b>Or d'arène</b></td><td>Votre or sert de budget en arène. Vous le <b>récupérez intégralement</b> après le combat, plus la récompense de victoire.</td></tr>
  </tbody></table></div>
  <h3 class="cx-h">Ressources et villageois</h3>
  <div class="cx-scroll"><table class="cx-table"><thead><tr><th>Élément</th><th>Rôle</th></tr></thead><tbody>
    <tr><td>${icon('gold', 16)} <b>Or</b></td><td>Construction, puis budget d'arène. Produit par mines, ports, marchés, hôtel des ventes.</td></tr>
    <tr><td>${icon('wood', 16)} <b>Bois</b></td><td>Construction. Produit par les scieries en forêt.</td></tr>
    <tr><td>${icon('stone', 16)} <b>Pierre</b></td><td>Construction. Produite par les carrières sur collines et montagnes.</td></tr>
    <tr><td>${icon('food', 16)} <b>Nourriture</b></td><td>Chaque villageois en mange 1 par tour. Un surplus fait grandir la population (si un logement est libre) ; la famine en fait partir.</td></tr>
    <tr><td>${icon('hammer', 16)} <b>Bâtisseurs / ouvriers</b></td><td>Les villageois se répartissent : les bâtisseurs font avancer les chantiers, les ouvriers font tourner les bâtiments productifs.</td></tr>
  </tbody></table></div>
  <h3 class="cx-h">Difficultés</h3>
  <div class="cx-scroll"><table class="cx-table"><thead><tr><th>Niveau</th><th>Cœurs</th><th>Départ (or · bois · pierre · nourriture)</th><th>Villageois</th><th>Puissance des monstres</th><th>Récompenses d'arène</th></tr></thead><tbody>
    ${DIFFICULTIES.map((d) => `<tr><td><b>${d.name}</b><div class="muted small">${d.tag}</div></td><td class="num">${d.hearts}</td><td class="num">${d.res.gold} · ${d.res.wood} · ${d.res.stone} · ${d.res.food}</td><td class="num">${d.villagers}</td><td class="num">×${fx(d.power)}</td><td class="num">×${fx(d.reward)}</td></tr>`).join('')}
  </tbody></table></div>
  <h3 class="cx-h">Mode aventure</h3>
  <p class="muted">Après la victoire sur Vermithrax, vous pouvez <b>poursuivre l'aventure</b> : votre royaume, vos compagnons et vos reliques restent, vous regagnez 1 cœur, et la piste s'allonge d'un <b>palier</b> à la fois (quelques tours puis une arène générée). Le nombre de monstres passe de 4 à 8, la puissance monte d’environ 8,5 % par palier, et un <b>Gardien</b> (champion du type dominant, récompense ×1,6) garde chaque quatrième palier. Il n'y a pas de fin : l'aventure s'arrête quand vos cœurs sont épuisés. Votre meilleur palier est conservé dans l'onglet Hauts faits.</p>
  <h3 class="cx-h">La piste des tours (en haut de l'écran)</h3>
  <div class="cx-scroll"><table class="cx-table"><thead><tr><th>Symbole</th><th>Signification</th></tr></thead><tbody>
    <tr><td>◆</td><td>Tour de gestion : construisez et développez le royaume.</td></tr>
    <tr><td>${icon('question', 16)}</td><td>Événement en fin de tour : rencontre avec un choix à faire.</td></tr>
    <tr><td>${icon('sword', 16)}</td><td>Arène : combat automatique contre des monstres.</td></tr>
    <tr><td>${icon('skull', 16)}</td><td>Boss final. Une défaite coûte un cœur ${icon('heart', 14)}, à zéro la partie est perdue.</td></tr>
  </tbody></table></div>`;
}

// ——— Onglet : Hauts faits & annales ———
function achievementsHtml() {
  const stats: [IconName, string, string | number][] = [
    ['crown', 'Parties lancées', profile.runs],
    ['skull', 'Vermithrax vaincu', profile.wins],
    ['sword', 'Arènes gagnées', profile.arenaWins],
    ['heart', 'Arènes perdues', profile.arenaLosses],
    ['house', 'Bâtiments posés', profile.built],
    ['question', 'Événements résolus', profile.events],
    ['egg', 'Œufs éclos', profile.hatched],
    ['star', 'Chromatiques obtenus', profile.shinies],
    ['boot', 'Meilleur palier d’aventure', profile.bestPalier],
  ];
  const cards = ACHIEVEMENTS.map((a) => {
    const at = profile.unlocked[a.id];
    const hidden = a.secret && !at;
    return `<div class="ach ${at ? 'on' : ''}"><div class="ach-ic">${icon(hidden ? 'lock' : a.icon, 26)}</div>
      <div><b>${hidden ? 'Haut fait secret' : a.name}</b><div class="small muted">${hidden ? 'Continuez l’aventure pour le découvrir…' : a.desc}</div>
      ${at ? `<div class="small gold">Débloqué le ${new Date(at).toLocaleDateString('fr-FR')}</div>` : ''}</div></div>`;
  }).join('');
  return `
  ${explain('Comment lire cet onglet', `<p>Vos <b>statistiques</b> et vos <b>hauts faits</b> sont conservés d'une partie à l'autre, sur cet appareil. Chaque haut fait se débloque en jouant ; une notification 🏆 s'affiche à ce moment-là. Le bouton d'effacement se trouve dans les Options.</p>`, true)}
  <h3 class="cx-h">Annales</h3>
  <div class="cx-stats">${stats.map(([ic, l, v]) => `<div class="cx-stat">${icon(ic, 22)}<b>${v}</b><span class="muted small">${l}</span></div>`).join('')}</div>
  <h3 class="cx-h">Hauts faits <span class="muted small">(${unlockedCount()} / ${ACHIEVEMENTS.length})</span></h3>
  <div class="ach-grid">${cards}</div>`;
}

const BODY: Record<CodexTab, () => string> = {
  bestiary: bestiaryHtml, monsters: monstersHtml, types: typesHtml, buildings: buildingsHtml, relics: relicsHtml, rules: rulesHtml, achievements: achievementsHtml,
};
const INIT: Partial<Record<CodexTab, (root: HTMLElement) => void>> = { bestiary: bestiaryInit, types: typesInit };

let openBack: HTMLElement | null = null;
let openTab: (t: CodexTab) => void = () => undefined;

export function codexOpen() {
  return !!openBack;
}

export function closeCodex() {
  openBack?.remove();
  openBack = null;
}

export function openCodex(tab: CodexTab = 'bestiary') {
  if (openBack) {
    openTab(tab);
    return;
  }
  const back = mount(`<div class="modal-back codex-back"></div>`);
  openBack = back;
  const panel = mount(
    `<div class="panel codex">
      <div class="cx-head">
        <div class="title cx-title">Codex</div>
        <div class="cx-tabs">${TABS.map(([id, label, ic]) => `<button class="cx-tab" data-t="${id}">${icon(ic, 16)} ${label}</button>`).join('')}</div>
        <button class="btn cx-close">Fermer <span class="kbd">Échap</span></button>
      </div>
      <div class="cx-body"></div>
    </div>`,
    back,
  );
  const body = panel.querySelector('.cx-body') as HTMLElement;
  openTab = (t) => {
    panel.querySelectorAll<HTMLElement>('.cx-tab').forEach((b) => b.classList.toggle('on', b.dataset.t === t));
    body.innerHTML = BODY[t]();
    body.scrollTop = 0;
    INIT[t]?.(body);
  };
  panel.querySelectorAll<HTMLElement>('.cx-tab').forEach((b) => b.addEventListener('click', () => openTab(b.dataset.t as CodexTab)));
  const close = () => {
    document.removeEventListener('keydown', onKey, true);
    closeCodex();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  };
  document.addEventListener('keydown', onKey, true);
  panel.querySelector('.cx-close')!.addEventListener('click', close);
  back.addEventListener('mousedown', (e) => {
    if (e.target === back) close();
  });
  openTab(tab);
}

// ——— Options ———
let backToMenu: (() => void) | null = null;
export function setMenuHandler(fn: () => void) {
  backToMenu = fn;
}

export function openOptions() {
  const inGame = !document.querySelector('.titlescreen') && !!backToMenu;
  const back = mount(`<div class="modal-back"></div>`);
  const keys: [string, string][] = [
    ['Glisser / molette', 'Carte : déplacer / zoomer (jusqu\'à ×4) · Arène : zoomer le plateau'],
    ['1 – 9, Tab', 'Choisir un bâtiment, changer d\'onglet de construction'],
    ['Espace / Entrée', 'Terminer le tour (carte) · Lancer le combat (arène)'],
    ['D / E', 'Arène : relancer la boutique / vendre la créature sous la souris'],
    ['Clic droit', 'Annuler la construction · vendre une créature'],
    ['C', 'Ouvrir le Codex (bestiaire, types, bâtiments…)'],
    ['M', 'Couper / rétablir le son'],
    ['Échap', 'Fermer une fenêtre, annuler'],
  ];
  const panel = mount(
    `<div class="panel howto opts">
      <h2 class="title">Options</h2>
      <div class="opt-grid">
        <label class="opt-row"><span>Volume de la musique</span><input type="range" min="0" max="100" value="${Math.round(settings.music * 100)}" data-o="music"><b data-v="music"></b></label>
        <label class="opt-row"><span>Volume des effets</span><input type="range" min="0" max="100" value="${Math.round(settings.sfx * 100)}" data-o="sfx"><b data-v="sfx"></b></label>
        <div class="opt-row"><span>Son</span><button class="btn" data-a="mute"></button></div>
        <div class="opt-row"><span>Vitesse de combat par défaut</span><span class="seg" data-o="speed">${[1, 2, 3].map((v) => `<button class="btn ${settings.speed === v ? 'on' : ''}" data-v="${v}">×${v}</button>`).join('')}</span></div>
        <div class="opt-row"><span>Effets d'ambiance <small class="muted">(brume, lucioles, fumée, braises)</small></span><button class="btn tog" data-o="ambient"></button></div>
        <div class="opt-row"><span>Chiffres de dégâts et de soins en arène</span><button class="btn tog" data-o="floatText"></button></div>
        <div class="opt-row"><span>Info-bulles détaillées</span><button class="btn tog" data-o="tooltips"></button></div>
        <div class="opt-row"><span>Conseils du tutoriel guidé</span><button class="btn tog" data-o="tutorial"></button></div>
        <div class="opt-row"><span>Rejouer le tutoriel <small class="muted">(à la prochaine partie)</small></span><button class="btn" data-a="retuto">Rejouer</button></div>
      </div>
      <h3 class="cx-h">Raccourcis</h3>
      <table class="cx-table"><tbody>${keys.map(([k, d]) => `<tr><td><span class="kbd">${k}</span></td><td>${d}</td></tr>`).join('')}</tbody></table>
      <h3 class="cx-h">Données</h3>
      <div class="opt-row"><span>Effacer la partie sauvegardée <small class="muted">(irréversible)</small></span><button class="btn danger" data-a="wipe">Effacer</button></div>
      <div class="opt-row"><span>Effacer statistiques et hauts faits <small class="muted">(irréversible)</small></span><button class="btn danger" data-a="wipeprofile">Effacer</button></div>
      <div class="opt-row"><span>Remettre les options par défaut</span><button class="btn" data-a="reset">Réinitialiser</button></div>
      ${inGame ? `<div class="opt-row"><span>Quitter la partie vers le menu principal <small class="muted">(sauvegardée automatiquement à chaque étape)</small></span><button class="btn" data-a="menu">Menu principal</button></div>` : ''}
      <div style="text-align:right;margin-top:14px"><button class="btn primary" data-a="close">Fermer</button></div>
    </div>`,
    back,
  );
  const sync = () => {
    panel.querySelectorAll<HTMLElement>('[data-v]').forEach((b) => {
      const o = (b as HTMLElement).dataset.v as 'music' | 'sfx';
      if (o === 'music' || o === 'sfx') b.textContent = `${Math.round(settings[o] * 100)} %`;
    });
    panel.querySelectorAll<HTMLElement>('.tog').forEach((b) => {
      const o = b.dataset.o as 'ambient' | 'floatText' | 'tooltips' | 'tutorial';
      b.textContent = settings[o] ? 'Activé' : 'Désactivé';
      b.classList.toggle('on', settings[o]);
    });
    (panel.querySelector('[data-a="mute"]') as HTMLElement).textContent = audio.isMuted ? '🔇 Rétablir le son' : '🔊 Couper le son';
    panel.querySelectorAll<HTMLElement>('.seg button').forEach((b) => b.classList.toggle('on', +b.dataset.v! === settings.speed));
  };
  sync();
  panel.querySelectorAll<HTMLInputElement>('input[type=range]').forEach((r) =>
    r.addEventListener('input', () => {
      settings[r.dataset.o as 'music' | 'sfx'] = +r.value / 100;
      saveSettings();
      audio.applyVolumes();
      sync();
    }),
  );
  panel.querySelectorAll<HTMLElement>('.tog').forEach((b) =>
    b.addEventListener('click', () => {
      const o = b.dataset.o as 'ambient' | 'floatText' | 'tooltips' | 'tutorial';
      settings[o] = !settings[o];
      saveSettings();
      sync();
    }),
  );
  panel.querySelectorAll<HTMLElement>('.seg button').forEach((b) =>
    b.addEventListener('click', () => {
      settings.speed = +b.dataset.v! as 1 | 2 | 3;
      saveSettings();
      sync();
    }),
  );
  const close = () => {
    document.removeEventListener('keydown', onKey, true);
    back.remove();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    }
  };
  document.addEventListener('keydown', onKey, true);
  audio.onMuteChange(sync);
  panel.querySelector('[data-a="mute"]')!.addEventListener('click', () => audio.toggleMute());
  panel.querySelector('[data-a="close"]')!.addEventListener('click', close);
  panel.querySelector('[data-a="menu"]')?.addEventListener('click', () => {
    close();
    backToMenu?.();
  });
  panel.querySelector('[data-a="reset"]')!.addEventListener('click', () => {
    resetSettings();
    audio.applyVolumes();
    panel.querySelectorAll<HTMLInputElement>('input[type=range]').forEach((r) => (r.value = String(Math.round(settings[r.dataset.o as 'music' | 'sfx'] * 100))));
    sync();
  });
  panel.querySelector('[data-a="retuto"]')!.addEventListener('click', (e) => {
    resetTutorial();
    sync();
    (e.currentTarget as HTMLElement).textContent = 'Programmé';
  });
  const wipeP = panel.querySelector('[data-a="wipeprofile"]') as HTMLElement;
  let armedP = false;
  wipeP.addEventListener('click', () => {
    if (!armedP) {
      armedP = true;
      wipeP.textContent = 'Cliquez pour confirmer';
      setTimeout(() => {
        armedP = false;
        wipeP.textContent = 'Effacer';
      }, 3500);
      return;
    }
    resetProfile();
    wipeP.textContent = 'Profil effacé';
    wipeP.setAttribute('disabled', '');
  });
  const wipe = panel.querySelector('[data-a="wipe"]') as HTMLElement;
  let armed = false;
  wipe.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      wipe.textContent = 'Cliquez pour confirmer';
      setTimeout(() => {
        armed = false;
        wipe.textContent = 'Effacer';
      }, 3500);
      return;
    }
    clearSave();
    wipe.textContent = 'Sauvegarde effacée';
    wipe.setAttribute('disabled', '');
  });
}
