import { type Scene, app } from '../app';
import { hexDistance } from '../core/hex';
import { BUILDINGS } from '../data/buildings';
import type { BuildingId } from '../data/types';
import { adjTiles, isWater } from '../game/economy';
import { newGame } from '../game/mapgen';
import { type GameState, clearSave, loadGame } from '../game/state';
import { drawCover, ensureSprite, type Sprite } from '../render/sprites';
import { mount } from '../ui/common';
import { openCodex, openOptions } from '../ui/codex';
import { icon } from '../ui/icons';
import { WorldScene } from './worldScene';

// Île de démonstration en arrière-plan du menu.
function demoState(): GameState {
  const s = newGame(Math.floor(Math.random() * 1e9));
  for (const t of s.tiles) t.explored = true;
  const wants: BuildingId[] = ['house', 'house', 'farm', 'farm', 'market', 'lumber', 'mine', 'port', 'auction', 'shrine', 'academy', 'forge', 'barracks', 'house', 'tavern'];
  for (const id of wants) {
    const def = BUILDINGS[id];
    const spot = s.tiles
      .filter((t) => !t.building && !t.feature && def.terrains.includes(t.terrain) && (!def.needsWater || adjTiles(s, t).some((n) => isWater(n))))
      .sort((a, b) => hexDistance(a, { q: 0, r: 0 }) - hexDistance(b, { q: 0, r: 0 }))[0];
    if (spot && hexDistance(spot, { q: 0, r: 0 }) < 6) spot.building = { id, progress: 0, done: true, paused: false, order: 0 };
  }
  return s;
}

export class TitleScene implements Scene {
  private bg = new WorldScene(demoState(), undefined, true);
  private art: Sprite | null = null;
  private t = 0;

  enter() {
    this.bg.enter();
    // Illustration d'écran titre peinte (art/title_bg.png) : remplace l'île de démonstration.
    ensureSprite('title/bg').then((sp) => (this.art = sp));
    const save = loadGame();
    const root = mount(`<div class="titlescreen">
      <h1 class="logo">HEXARIA</h1>
      <div class="tagline">ROYAUMES &amp; ARÈNES</div>
      <div class="menu">
        ${save ? `<button class="btn primary big" data-a="continue">${icon('turn', 20)} Continuer · Tour ${save.step + 1}</button>` : ''}
        <button class="btn ${save ? '' : 'primary'} big" data-a="new">${icon('crown', 20)} Nouvelle partie</button>
        <div class="menu-grid">
          <button class="btn" data-a="bestiary">${icon('paw', 18)} Bestiaire</button>
          <button class="btn" data-a="types">${icon('sword', 18)} Types &amp; ascendants</button>
          <button class="btn" data-a="buildings">${icon('house', 18)} Bâtiments &amp; reliques</button>
          <button class="btn" data-a="monsters">${icon('skull', 18)} Monstres &amp; arènes</button>
          <button class="btn" data-a="howto">${icon('scroll', 18)} Comment jouer</button>
          <button class="btn" data-a="options">${icon('refresh', 18)} Options</button>
        </div>
      </div>
      <div class="muted" style="position:absolute;bottom:16px;font-size:12px">Prototype v0.1 · Bâtissez · Capturez · Combattez</div>
    </div>`);
    root.querySelector('[data-a="continue"]')?.addEventListener('click', () => {
      const s = loadGame();
      if (s) app.setScene(new WorldScene(s));
    });
    root.querySelector('[data-a="new"]')?.addEventListener('click', () => {
      clearSave();
      app.setScene(new WorldScene(newGame(Math.floor(Math.random() * 1e9))));
    });
    root.querySelector('[data-a="howto"]')?.addEventListener('click', () => this.howto());
    root.querySelector('[data-a="bestiary"]')?.addEventListener('click', () => openCodex('bestiary'));
    root.querySelector('[data-a="types"]')?.addEventListener('click', () => openCodex('types'));
    root.querySelector('[data-a="buildings"]')?.addEventListener('click', () => openCodex('buildings'));
    root.querySelector('[data-a="monsters"]')?.addEventListener('click', () => openCodex('monsters'));
    root.querySelector('[data-a="options"]')?.addEventListener('click', () => openOptions());
  }

  private howto() {
    const back = mount(`<div class="modal-back"></div>`);
    mount(
      `<div class="panel howto">
        <h2 class="title">Comment jouer</h2>
        <ol>
          <li><b>Bâtissez votre royaume</b> sur une île hexagonale. Chaque bâtiment se pose sur un terrain précis (ferme en prairie, mine en montagne, port au bord de l’eau…).</li>
          <li><b>Les adjacences comptent</b> : un Hôtel des ventes à côté d’un Port rapporte +5 or, des fermes côte à côte se renforcent, un marché profite des maisons voisines.</li>
          <li><b>Villageois</b> : répartissez-les entre <i>bâtisseurs</i> (chantiers) et <i>ouvriers</i> (production). Nourrissez-les pour faire grandir la population.</li>
          <li><b>La piste en haut</b> rythme la partie : tours de gestion, événements <b>?</b>, arènes <b>⚔</b> et le boss final <b>☠</b>.</li>
          <li><b>En arène</b> (auto-battler) : votre or devient votre budget. Achetez des créatures, relancez la boutique, placez-les sur les hexagones. 3 copies identiques <b>évoluent</b>. Vous récupérez tout votre or après le combat, plus la récompense.</li>
          <li><b>Types élémentaires</b> : Feu &gt; Plante &gt; Eau &gt; Feu, Foudre &gt; Eau, Roche &gt; Feu/Foudre… Étudiez les monstres avant chaque combat.</li>
          <li><b>Bâtiments de combat</b> : Caserne (+1 place), Forge (+attaque), Sanctuaire (+PV), Académie (créatures rares), Taverne (relances), Ménagerie (compagnons).</li>
          <li><b>Compagnons</b> : capturez des créatures dans les repaires ou lors d’événements ; elles vous rejoignent gratuitement à chaque arène.</li>
          <li><b>Surprises</b> : les <b>œufs mystérieux</b> éclosent après quelques tours, et certaines créatures sont <b>chromatiques</b> ✦ (couleurs inversées, +20 % PV et attaque).</li>
          <li><b>Codex</b> : toutes les créatures, les types (qui a l’ascendant sur qui), les monstres, les bâtiments et les règles sont dans le menu principal, et à tout moment en jeu avec la touche <b>C</b> ou le bouton 📖.</li>
        </ol>
        <div class="muted">Commandes : glisser pour déplacer la carte · molette pour zoomer · Espace pour finir le tour · en arène : D pour relancer, E pour vendre.</div>
        <div style="text-align:right;margin-top:14px"><button class="btn primary">Compris</button></div>
      </div>`,
      back,
    ).querySelector('button')!.addEventListener('click', () => back.remove());
  }

  exit() {
    this.bg.exit();
  }

  update(dt: number) {
    this.t += dt;
    this.bg.update(dt);
  }

  render(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (this.art) {
      // légère dérive de caméra pour garder l'écran vivant
      ctx.fillStyle = '#050c0b';
      ctx.fillRect(0, 0, w, h);
      drawCover(ctx, this.art, -20, -20, w + 40, h + 40, 0.5 + Math.sin(this.t * 0.15) * 0.04, 0.5);
      const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
      v.addColorStop(0, 'rgba(0,0,0,0.25)');
      v.addColorStop(1, 'rgba(0,0,0,0.65)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);
      return;
    }
    this.bg.render(ctx, w, h);
  }

  resize() {
    this.bg.resize();
  }
}
