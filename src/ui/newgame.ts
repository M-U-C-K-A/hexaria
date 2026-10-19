// Écran « Nouvelle partie » : difficulté, graine du royaume et tutoriel guidé.
import { app } from '../app';
import { DIFFICULTIES, type Difficulty } from '../data/difficulty';
import { newGame } from '../game/mapgen';
import { clearSave, loadGame } from '../game/state';
import { meta } from '../meta';
import { WorldScene } from '../scenes/worldScene';
import { saveSettings, settings } from '../settings';
import { mount } from './common';
import { icon } from './icons';
import { resetTutorial, tutorialOn } from './tutorial';

// Texte libre → graine numérique stable (FNV-1a) ; un nombre est pris tel quel.
export function seedFrom(text: string): number {
  const t = text.trim();
  if (!t) return Math.floor(Math.random() * 1e9);
  if (/^\d{1,10}$/.test(t)) return Number(t) % 2147483647;
  let h = 2166136261;
  for (const ch of t) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0) % 2147483647;
}

export const dailySeed = () => {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
};

export function openNewGame(opts: { difficulty?: Difficulty; tutorial?: boolean } = {}) {
  const hasSave = !!loadGame();
  let diff: Difficulty = opts.difficulty ?? 'normal';
  const back = mount(`<div class="modal-back"></div>`);
  const box = mount(
    `<div class="panel howto newgame">
      <h2 class="title">Nouvelle partie</h2>
      ${hasSave ? `<div class="ng-warn">${icon('skull', 16)} Une partie est en cours : elle sera remplacée.</div>` : ''}
      <div class="ng-label">Difficulté</div>
      <div class="ng-diff">
        ${DIFFICULTIES.map(
          (d) => `<button class="ng-card" data-d="${d.id}">
            <div class="ng-name">${d.name}</div><div class="ng-tag">${d.tag}</div>
            <div class="ng-hearts">${Array.from({ length: d.hearts }, () => icon('heart', 16)).join('')}</div>
            <div class="ng-desc">${d.desc}</div></button>`,
        ).join('')}
      </div>
      <div class="ng-label">Graine du royaume <span class="muted">(la même graine redonne la même île)</span></div>
      <div class="ng-seedrow">
        <input class="ng-seed" type="text" maxlength="40" placeholder="Aléatoire, un nombre ou n’importe quel mot" spellcheck="false" />
        <button class="btn" data-a="dice" title="Graine au hasard">${icon('die', 18)}</button>
        <button class="btn" data-a="daily" title="Même île pour tous aujourd’hui">Graine du jour</button>
      </div>
      <label class="ng-tut"><input type="checkbox" ${(opts.tutorial ?? tutorialOn('world')) ? 'checked' : ''} /> <span><b>Tutoriel guidé</b> : de courtes bulles expliquent la carte, les événements et l’arène au fil de la partie.</span></label>
      <div class="ng-actions"><button class="btn" data-a="cancel">Annuler</button><button class="btn primary big" data-a="start">${icon('crown', 18)} Commencer</button></div>
    </div>`,
    back,
  );
  const cards = [...box.querySelectorAll<HTMLElement>('.ng-card')];
  const paint = () => cards.forEach((c) => c.classList.toggle('on', c.dataset.d === diff));
  paint();
  cards.forEach((c) => c.addEventListener('click', () => ((diff = c.dataset.d as Difficulty), paint())));
  const seedIn = box.querySelector('.ng-seed') as HTMLInputElement;
  box.querySelector('[data-a="dice"]')!.addEventListener('click', () => (seedIn.value = String(Math.floor(Math.random() * 1e9))));
  box.querySelector('[data-a="daily"]')!.addEventListener('click', () => (seedIn.value = String(dailySeed())));
  const close = () => {
    back.remove();
    window.removeEventListener('keydown', onKey, true);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
    if (e.key === 'Enter') start();
  };
  window.addEventListener('keydown', onKey, true);
  box.querySelector('[data-a="cancel"]')!.addEventListener('click', close);
  const start = () => {
    const tut = (box.querySelector('.ng-tut input') as HTMLInputElement).checked;
    if (tut) resetTutorial();
    else {
      settings.tutorial = false;
      saveSettings();
    }
    const seed = seedFrom(seedIn.value);
    close();
    clearSave();
    meta.runStart();
    app.setScene(new WorldScene(newGame(seed, diff)));
  };
  box.querySelector('[data-a="start"]')!.addEventListener('click', start);
  seedIn.focus();
}
