// Tutoriel guidé : un halo lumineux sur l'élément expliqué, une bulle de texte, et des étapes
// « à vous de jouer » qui avancent d'elles-mêmes quand le joueur a fait l'action demandée.
import { audio } from '../audio';
import { meta } from '../meta';
import { saveSettings, settings } from '../settings';
import { el, toast } from './common';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TutStep {
  id: string;
  title: string;
  text: string; // HTML
  target?: string | (() => HTMLElement | Rect | null); // sélecteur CSS ou fonction
  pad?: number;
  side?: 'left' | 'right' | 'top' | 'bottom' | 'center';
  task?: string; // consigne d'une étape interactive
  wait?: () => boolean; // l'étape se termine dès que la condition est vraie
  next?: string; // libellé du bouton principal
  modal?: boolean; // reste visible par-dessus une fenêtre (événement…)
  anchor?: 'tl' | 'tr' | 'bl' | 'br'; // place la bulle dans un coin (pour ne pas cacher l'action)
  light?: boolean; // assombrit à peine l'écran (on veut voir ce qui se passe derrière)
  enter?: () => void;
}

let active: Tour | null = null;

export const tutorialOn = (chapter: string) => settings.tutorial && !settings.tutoSeen.includes(chapter);

export function stopTutorial() {
  active?.stop();
}

export function tutorialActive() {
  return active !== null;
}

// Rejoue tout le tutoriel : le prochain chapitre rencontré se relance.
export function resetTutorial() {
  settings.tutorial = true;
  settings.tutoSeen = [];
  saveSettings();
}

export function startTour(chapter: string, steps: TutStep[], opts: { force?: boolean; start?: number; onEnd?: () => void } = {}): boolean {
  if (!opts.force && !tutorialOn(chapter)) return false;
  active?.stop();
  active = new Tour(chapter, steps, opts.onEnd);
  active.start(opts.start ?? 0);
  return true;
}

const resolve = (t: TutStep['target']): Rect | null => {
  if (!t) return null;
  const v = typeof t === 'string' ? document.querySelector<HTMLElement>(t) : t();
  if (!v) return null;
  if (v instanceof HTMLElement) {
    const r = v.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return null;
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }
  return v;
};

class Tour {
  private i = -1;
  private root!: HTMLElement;
  private spot!: HTMLElement;
  private bubble!: HTMLElement;
  private timer = 0;
  private advancing = 0;
  private satisfied = false;
  private stopped = false;

  constructor(private chapter: string, private steps: TutStep[], private onEnd?: () => void) {}

  start(first = 0) {
    this.root = el(`<div class="tut"><div class="tut-block"></div><div class="tut-spot"></div><div class="tut-bubble panel"></div></div>`);
    this.spot = this.root.querySelector('.tut-spot') as HTMLElement;
    this.bubble = this.root.querySelector('.tut-bubble') as HTMLElement;
    document.body.appendChild(this.root);
    window.addEventListener('keydown', this.onKey, true);
    window.addEventListener('resize', this.layout);
    this.timer = window.setInterval(() => this.tick(), 200);
    this.go(first);
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    clearInterval(this.timer);
    clearTimeout(this.advancing);
    window.removeEventListener('keydown', this.onKey, true);
    window.removeEventListener('resize', this.layout);
    this.root.remove();
    if (active === this) active = null;
  }

  private finish() {
    if (!settings.tutoSeen.includes(this.chapter)) settings.tutoSeen.push(this.chapter);
    saveSettings();
    if (this.chapter === 'world') meta.tutorial();
    const end = this.onEnd;
    this.stop();
    end?.();
  }

  private skipAll() {
    settings.tutorial = false;
    saveSettings();
    this.stop();
    toast('Tutoriel désactivé : Options › Rejouer le tutoriel pour le relancer.', 'info');
  }

  private go(i: number) {
    clearTimeout(this.advancing);
    if (i >= this.steps.length) {
      this.finish();
      return;
    }
    if (i < 0) i = 0;
    this.i = i;
    this.satisfied = false;
    const st = this.steps[i];
    st.enter?.();
    const interactive = !!st.wait;
    const total = this.steps.length;
    this.bubble.innerHTML = `
      <div class="tut-top"><span class="tut-count">Tutoriel · ${i + 1}/${total}</span><button class="tut-skip" data-a="skip">Passer le tutoriel</button></div>
      <h3 class="title">${st.title}</h3>
      <div class="tut-text">${st.text}</div>
      ${st.task ? `<div class="tut-task"><span class="tut-mark">▶</span> <span class="tut-task-t">${st.task}</span></div>` : ''}
      <div class="tut-actions">
        ${i > 0 ? '<button class="btn" data-a="prev">Précédent</button>' : '<span></span>'}
        <button class="btn ${interactive ? '' : 'primary'}" data-a="next">${interactive ? 'Passer cette étape' : st.next ?? (i === total - 1 ? 'Terminer' : 'Suivant →')}</button>
      </div>
      <div class="tut-dots">${this.steps.map((_, k) => `<i class="${k === i ? 'on' : k < i ? 'done' : ''}"></i>`).join('')}</div>`;
    this.bubble.querySelector('[data-a="skip"]')!.addEventListener('click', () => this.skipAll());
    this.bubble.querySelector('[data-a="prev"]')?.addEventListener('click', () => this.go(this.i - 1));
    this.bubble.querySelector('[data-a="next"]')!.addEventListener('click', () => this.go(this.i + 1));
    this.root.classList.toggle('open', interactive);
    this.root.classList.toggle('light', !!st.light);
    this.bubble.classList.remove('pop');
    void this.bubble.offsetWidth;
    this.bubble.classList.add('pop');
    audio.play('click');
    this.layout();
  }

  private onKey = (e: KeyboardEvent) => {
    if (this.root.style.display === 'none') return;
    const st = this.steps[this.i];
    const eat = () => {
      e.preventDefault();
      e.stopPropagation();
    };
    if (e.key === 'Escape') {
      eat();
      this.skipAll();
    } else if (!st.wait && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight')) {
      eat();
      this.go(this.i + 1);
    } else if (!st.wait && e.key === 'ArrowLeft') {
      eat();
      this.go(this.i - 1);
    }
  };

  private tick() {
    const st = this.steps[this.i];
    // une fenêtre (événement, éclosion, Codex) masque le tutoriel, sauf les étapes qui la visent
    const modal = !!document.querySelector('.modal-back');
    const hide = modal && !st.modal;
    this.root.style.display = hide ? 'none' : '';
    if (hide) return;
    this.layout();
    if (st.wait && !this.satisfied && st.wait()) {
      this.satisfied = true;
      const t = this.bubble.querySelector('.tut-task');
      if (t) {
        t.classList.add('ok');
        (t.querySelector('.tut-mark') as HTMLElement).textContent = '✓';
        (t.querySelector('.tut-task-t') as HTMLElement).textContent = 'Bien joué !';
      }
      audio.play('coin');
      this.advancing = window.setTimeout(() => this.go(this.i + 1), 900);
    }
  }

  private layout = () => {
    if (this.stopped) return;
    const st = this.steps[this.i];
    const W = window.innerWidth;
    const H = window.innerHeight;
    const r = resolve(st.target);
    const b = this.bubble;
    b.style.maxWidth = `${Math.min(400, W - 28)}px`;
    if (r) {
      const pad = st.pad ?? 8;
      this.spot.style.display = 'block';
      this.spot.style.left = `${r.x - pad}px`;
      this.spot.style.top = `${r.y - pad}px`;
      this.spot.style.width = `${r.w + pad * 2}px`;
      this.spot.style.height = `${r.h + pad * 2}px`;
      this.root.classList.remove('dim');
    } else {
      this.spot.style.display = 'none';
      this.root.classList.toggle('dim', !st.wait);
    }
    const bw = b.offsetWidth;
    const bh = b.offsetHeight;
    const M = 14;
    let x = (W - bw) / 2;
    let y = (H - bh) / 2;
    if (r && st.side !== 'center') {
      const pad = (st.pad ?? 8) + 14;
      const room = {
        right: W - (r.x + r.w) - pad,
        left: r.x - pad,
        bottom: H - (r.y + r.h) - pad,
        top: r.y - pad,
      };
      const order = [st.side, 'right', 'left', 'bottom', 'top'].filter((s): s is 'left' | 'right' | 'top' | 'bottom' => !!s && s !== 'center');
      const fit = order.find((s) => (s === 'left' || s === 'right' ? room[s] >= bw + M : room[s] >= bh + M));
      const side = fit ?? order.sort((a, c) => room[c] - room[a])[0];
      if (side === 'right') [x, y] = [r.x + r.w + pad, r.y + r.h / 2 - bh / 2];
      else if (side === 'left') [x, y] = [r.x - pad - bw, r.y + r.h / 2 - bh / 2];
      else if (side === 'bottom') [x, y] = [r.x + r.w / 2 - bw / 2, r.y + r.h + pad];
      else [x, y] = [r.x + r.w / 2 - bw / 2, r.y - pad - bh];
    }
    if (st.anchor) {
      x = st.anchor.endsWith('l') ? M : W - bw - M;
      y = st.anchor.startsWith('t') ? M : H - bh - M;
    }
    b.style.left = `${Math.max(M, Math.min(W - bw - M, x))}px`;
    b.style.top = `${Math.max(M, Math.min(H - bh - M, y))}px`;
  };
}
