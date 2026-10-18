import { audio } from '../audio';
import { settings } from '../settings';
import { RNG } from '../core/rng';
import type { GameEvent } from '../data/events';
import type { Res, ResKey } from '../data/types';
import type { GameState } from '../game/state';
import { paintEventArt } from '../render/eventArt';
import { ensureSprite } from '../render/sprites';
import { CREATURE_BY_ID } from '../data/creatures';
import { icon } from './icons';

export const uiRoot = document.getElementById('ui')!;

export function el<T extends HTMLElement = HTMLElement>(html: string): T {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as T;
}

export function mount<T extends HTMLElement = HTMLElement>(html: string, parent: HTMLElement = uiRoot): T {
  const e = el<T>(html);
  parent.appendChild(e);
  return e;
}

export function clearUI() {
  uiRoot.innerHTML = '';
  tooltip.hide();
}

export const RES_ORDER: ResKey[] = ['gold', 'wood', 'stone', 'food'];

export function costHtml(cost: Res, s?: GameState) {
  return RES_ORDER.filter((k) => cost[k])
    .map((k) => `<span class="${s && s.res[k] < cost[k]! ? 'short' : ''}">${icon(k, 14)}${cost[k]}</span>`)
    .join('');
}

export function resInline(res: Res, signed = true) {
  return RES_ORDER.filter((k) => res[k])
    .map((k) => `<span style="display:inline-flex;align-items:center;gap:2px">${icon(k, 14)}${signed && res[k]! > 0 ? '+' : ''}${res[k]}</span>`)
    .join(' ');
}

// ——— Info-bulle ———
class Tooltip {
  private node: HTMLDivElement | null = null;

  show(html: string, x: number, y: number) {
    if (!settings.tooltips) return;
    if (!this.node) {
      this.node = document.createElement('div');
      this.node.className = 'tooltip';
      document.body.appendChild(this.node);
    }
    if (this.node.innerHTML !== html) this.node.innerHTML = html;
    this.node.style.display = 'block';
    const r = this.node.getBoundingClientRect();
    let px = x + 16;
    let py = y + 16;
    if (px + r.width > window.innerWidth - 8) px = x - r.width - 12;
    if (py + r.height > window.innerHeight - 8) py = y - r.height - 12;
    this.node.style.left = `${Math.max(8, px)}px`;
    this.node.style.top = `${Math.max(8, py)}px`;
  }

  hide() {
    if (this.node) this.node.style.display = 'none';
  }
}

export const tooltip = new Tooltip();

// Attache une info-bulle à un élément DOM.
export function bindTip(node: HTMLElement, html: () => string) {
  node.addEventListener('mouseenter', (e) => tooltip.show(html(), e.clientX, e.clientY));
  node.addEventListener('mousemove', (e) => {
    if (node.isConnected) tooltip.show(html(), e.clientX, e.clientY);
  });
  node.addEventListener('mouseleave', () => tooltip.hide());
  node.addEventListener('mousedown', () => tooltip.hide());
}

// ——— Notifications ———
let toastBox: HTMLDivElement | null = null;

export function toast(text: string, kind: 'good' | 'bad' | 'info' = 'info') {
  if (!toastBox || !toastBox.isConnected) {
    toastBox = document.createElement('div');
    toastBox.className = 'toasts';
    document.body.appendChild(toastBox);
  }
  if (kind === 'bad') audio.play('error');
  const t = document.createElement('div');
  t.className = `toast ${kind}`;
  t.textContent = text;
  toastBox.appendChild(t);
  setTimeout(() => t.remove(), 3100);
}

// ——— Modale d'événement (illustration à gauche, choix à droite) ———
export function showEvent(ev: GameEvent, s: GameState, onDone: () => void) {
  tooltip.hide();
  audio.play(ev.id === 'victory' ? 'victory' : ev.id === 'defeat' ? 'defeat' : 'event');
  const back = mount(`<div class="modal-back"></div>`);
  const box = mount(
    `<div class="panel event">
      <div class="art"><canvas width="720" height="560"></canvas></div>
      <div class="body">
        <h2 class="title">${ev.title}</h2>
        <div class="text">${ev.text}</div>
        <div class="choices"></div>
      </div>
    </div>`,
    back,
  );
  const paint = () =>
    paintEventArt(
      box.querySelector('canvas')!, ev.art, s.seed + s.step,
      ev.creature ? { key: ev.creature, monster: false, star: 1, look: CREATURE_BY_ID[ev.creature].look, shiny: ev.shiny } : undefined,
    );
  // illustration peinte éventuelle : chargée à la demande, puis dessinée ; sinon rendu procédural immédiat
  paint();
  ensureSprite(`events/${ev.creature && ev.art === 'egg' ? 'hatch' : ev.art}`).then((sp) => sp && paint());
  const list = box.querySelector('.choices') as HTMLElement;
  for (const ch of ev.choices) {
    const why = ch.check?.(s) ?? null;
    const btn = mount(
      `<button class="choice ${why ? 'locked' : ''}">
        <div class="ct">
          <div class="cl">${ch.label}</div>
          <div class="cd">${ch.desc}</div>
          ${why ? `<div class="why">${why}</div>` : ''}
        </div>
        <div class="cic">${icon(ch.icon, 26)}</div>
      </button>`,
      list,
    );
    if (why) continue;
    btn.addEventListener('click', () => {
      const rng = new RNG(s.rng || s.seed);
      const result = ch.apply(s, rng);
      s.rng = rng.state;
      s.stats.events++;
      list.innerHTML = '';
      const res = mount(`<div class="result">${result}</div>`, list);
      res.insertAdjacentElement('afterend', el(`<button class="btn primary big" style="align-self:flex-end">Continuer</button>`));
      const cont = list.querySelector('.btn') as HTMLButtonElement;
      cont.focus();
      cont.addEventListener('click', () => {
        back.remove();
        onDone();
      });
    });
  }
}

export function stars(n: number) {
  return '★'.repeat(n);
}
