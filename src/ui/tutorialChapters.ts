// Contenu du tutoriel guidé : trois chapitres (carte, événement, arène) + un bilan après le premier combat.
import type { GameState } from '../game/state';
import { type Rect, type TutStep } from './tutorial';

const CORE = ['townhall', 'colosseum'];
const placed = (s: GameState) => s.tiles.filter((t) => t.building && !CORE.includes(t.building.id)).length;

export interface WorldCtx {
  s: GameState;
  townRect: () => Rect | null; // zone d'écran autour de l'hôtel de ville
}

export function worldChapter(c: WorldCtx): TutStep[] {
  const { s } = c;
  let built0 = 0;
  let step0 = 0;
  return [
    {
      id: 'welcome', title: 'Bienvenue, souverain !', side: 'center',
      text: `<p>Hexaria mêle <b>gestion de royaume</b>, <b>créatures à capturer</b> et <b>combats d’arène</b> automatiques.</p>
        <p>Votre but : bâtir un royaume prospère, recruter des créatures et vaincre <b>Vermithrax</b>, le dragon des marais, avant d’avoir perdu vos <b>3 cœurs</b>.</p>
        <p class="muted">Ce guide dure quelques minutes. <b>Entrée</b> ou <b>→</b> pour avancer, <b>Échap</b> pour le quitter ; vous pourrez le relancer depuis le menu.</p>`,
      next: 'C’est parti',
    },
    {
      id: 'camera', title: 'La carte', side: 'center',
      text: `<p><b>Glissez</b> pour déplacer la caméra, <b>molette</b> pour zoomer (jusqu’à ×4 pour admirer les détails).</p>
        <p>Votre royaume est une île hexagonale : au début, seul le voisinage de l’<b>hôtel de ville</b> vous appartient. Chaque bâtiment étend votre territoire et révèle de nouvelles terres.</p>`,
    },
    {
      id: 'res', title: 'Vos ressources', target: '.resbar', side: 'right',
      text: `<p><b>Or</b>, <b>bois</b>, <b>pierre</b> et <b>nourriture</b>, avec la production nette de chaque tour (<b>+x/t</b>).</p>
        <p>L’or sert à construire <i>et</i> devient votre <b>budget en arène</b> : vous le récupérez en entier après le combat. Survolez une ressource pour les détails.</p>`,
    },
    {
      id: 'villagers', title: 'Villageois : bâtisseurs et ouvriers', target: '.resrow[data-k="builders"]', pad: 22, side: 'right',
      text: `<ul><li>Les <b>bâtisseurs</b> font avancer les chantiers (1 point par tour chacun).</li>
        <li>Les <b>ouvriers</b> font tourner les bâtiments productifs : sans ouvrier, une ferme reste à l’arrêt.</li>
        <li>Les <b>maisons</b> logent de nouveaux villageois, que la nourriture fait croître.</li></ul>
        <p>Les boutons <b>− / +</b> répartissent vos villageois entre les deux rôles.</p>`,
    },
    {
      id: 'menu', title: 'Le menu de construction', target: '.buildbar', side: 'top',
      text: `<p>Deux onglets : <b>Économie</b> (production) et <b>Combat</b> (bonus d’arène : Caserne, Forge, Sanctuaire…).</p>
        <p>Survolez une carte pour voir son effet, son coût et le <b>terrain</b> exigé. Raccourcis : touches <b>1</b> à <b>9</b>, <b>Tab</b> pour changer d’onglet.</p>`,
    },
    {
      id: 'build', title: 'À vous : un premier bâtiment', target: '.bcard[data-b="farm"]', side: 'top',
      text: `<p>Choisissez la <b>Ferme</b> (6 bois), puis cliquez sur une <b>prairie</b> de votre territoire : les cases valides s’éclairent.</p>
        <p>Les bâtiments se construisent en quelques tours, selon vos bâtisseurs.</p>`,
      task: 'Posez un bâtiment sur la carte.',
      enter: () => (built0 = placed(s)),
      wait: () => placed(s) > built0,
    },
    {
      id: 'adjacency', title: 'Les adjacences', target: () => c.townRect(), pad: 0, side: 'right',
      text: `<p>Un bon plan de ville vaut de l’or. Quand vous choisissez un bâtiment, survolez des cases : l’info-bulle détaille le rendement <b>avec ses bonus de voisinage</b>.</p>
        <ul><li><b>Hôtel des ventes + Port</b> : +5 or</li><li>Fermes côte à côte : +1 nourriture chacune</li>
        <li>Marché près des maisons ; scierie près des forêts ; mine sur un filon d’or…</li></ul>`,
    },
    {
      id: 'track', title: 'La piste de progression', target: '.track', side: 'bottom',
      text: `<p>Une partie dure <b>22 tours en 4 actes</b>. Les pastilles annoncent la suite : tours de gestion, <b>?</b> événements, <b>⚔</b> arènes, <b>☠</b> le boss.</p>
        <p>Survolez une pastille pour voir la rencontre à venir et les types des monstres. À droite : vos <b>3 cœurs</b>, un par défaite en arène.</p>`,
    },
    {
      id: 'relics', title: 'Reliques, compagnons et œufs', target: '.relics', side: 'left',
      text: `<ul><li>Les <b>reliques</b> donnent des bonus permanents.</li>
        <li>Les <b>compagnons</b> capturés rejoignent votre banc <b>gratuitement</b> à chaque arène (la Ménagerie ajoute des places).</li>
        <li>Les <b>œufs</b> mystérieux éclosent après quelques tours… parfois en créature <b>chromatique</b> ✦.</li></ul>`,
    },
    {
      id: 'endturn', title: 'Terminer le tour', target: '.endturn', side: 'left',
      text: `<p>Le bandeau annonce la prochaine étape et le <b>budget</b> dont vous disposerez si c’est une arène. Terminer le tour fait produire vos bâtiments et avancer les chantiers.</p>`,
    },
    {
      id: 'endturn-do', title: 'À vous : terminez le tour', target: '.endturn', side: 'left',
      text: `<p>Cliquez sur le bouton (ou appuyez sur <b>Espace</b>). Gardez un œil sur l’<b>or</b> : la première arène arrive vite !</p>`,
      task: 'Terminez votre premier tour.',
      enter: () => (step0 = s.step),
      wait: () => s.step > step0,
    },
    {
      id: 'codex', title: 'Le Codex est toujours là', target: '.codex-btn', side: 'right',
      text: `<p>Touche <b>C</b> ou bouton 📖 : <b>bestiaire</b>, <b>types</b> (qui domine qui), <b>monstres</b> des arènes, bâtiments, reliques et règles.</p>
        <p>Étudiez les monstres avant chaque combat. Bon règne !</p>`,
      next: 'Terminer',
    },
  ];
}

export function eventChapter(): TutStep[] {
  return [
    {
      id: 'event', title: 'Un événement !', target: '.event .choices', side: 'left', modal: true, pad: 6,
      text: `<p>Sur la piste, les <b>?</b> déclenchent des rencontres : on lit l’histoire, puis on <b>choisit</b>.</p>
        <p>Chaque option a un coût ou un risque (de l’or, un villageois, parfois un cœur) et une récompense : ressources, <b>reliques</b>, <b>compagnons</b>… Une option grisée explique ce qui manque.</p>`,
      next: 'Compris',
    },
  ];
}

export interface ArenaCtx {
  playRect: () => Rect | null; // votre moitié du plateau + le banc
  unitsOwned: () => number;
  boardCount: () => number;
  inFight: () => boolean;
}

export function arenaChapter(c: ArenaCtx): TutStep[] {
  let owned0 = 0;
  let board0 = 0;
  return [
    {
      id: 'intro', title: 'L’arène', side: 'center',
      text: `<p>Ici, vos créatures affrontent des monstres en <b>combat automatique</b> : tout se joue pendant la <b>préparation</b> (environ 1 min 30).</p>
        <p>Votre <b>or</b> est un budget : tout ce que vous dépensez vous est <b>rendu après le combat</b>, plus la récompense de victoire. Acheter ne coûte donc jamais rien : c’est un pari sur votre composition.</p>`,
      next: 'Voyons ça',
    },
    {
      id: 'top', title: 'Budget et temps', target: '.arena-top', side: 'bottom',
      text: `<p>À gauche, votre <b>or disponible</b> ; au centre, le <b>minuteur</b> (le combat se lance tout seul à zéro) ; à droite, le nom de l’arène.</p>`,
    },
    {
      id: 'enemies', title: 'Vos adversaires', target: '.enemy-info', side: 'left',
      text: `<p>Voici les monstres, leur <b>type</b> et leurs <b>faiblesses</b>. Choisissez des créatures dont le type les domine : un coup <b>super efficace</b> inflige <b>×1,5</b>.</p>
        <p>Survolez un monstre pour ses statistiques et son sort.</p>`,
    },
    {
      id: 'shop', title: 'La boutique', target: '.shop', side: 'top',
      text: `<ul><li>Cinq cartes : le prix en or est en bas à droite. Le badge <b>×1,5</b> signale un avantage de type sur l’adversaire.</li>
        <li><b>Relancer</b> (2 or, touche <b>D</b>) renouvelle la boutique.</li>
        <li><b>3 copies identiques évoluent</b> en une forme plus puissante (★2 puis ★3) : visez les doublons !</li></ul>`,
    },
    {
      id: 'buy', title: 'À vous : recrutez', target: '.shop .ccard:not(.empty)', side: 'top',
      text: `<p>Cliquez sur une carte pour acheter la créature : elle arrive sur votre <b>banc</b>.</p>`,
      task: 'Achetez une créature.',
      enter: () => (owned0 = c.unitsOwned()),
      wait: () => c.unitsOwned() > owned0,
    },
    {
      id: 'place', title: 'À vous : placez-la', target: () => c.playRect(), pad: 4, side: 'top',
      text: `<p><b>Glissez</b> votre créature du banc vers un hexagone de <b>votre moitié</b> (en bas). Les créatures à <b>distance</b> restent en arrière, la <b>mêlée</b> devant. Clic droit ou <b>E</b> sur une créature : la vendre.</p>`,
      task: 'Posez une créature sur le plateau.',
      enter: () => (board0 = c.boardCount()),
      wait: () => c.boardCount() > board0,
    },
    {
      id: 'syn', title: 'Synergies', target: '.synergies', side: 'right',
      text: `<p>Avec <b>2 ou 4 créatures différentes du même type</b> sur le plateau, une <b>synergie</b> s’active : Brasier (Feu), Marée (Eau), Sylve (Plante), Orage (Foudre), Rempart (Roche), Crépuscule (Ombre).</p>
        <p>Le nombre de places est limité (la <b>Caserne</b> en ajoute) : choisissez bien.</p>`,
    },
    {
      id: 'fight', title: 'À vous : au combat !', target: '.shop .side-btns', side: 'top',
      text: `<p>Quand vous êtes prêt, lancez le combat (ou appuyez sur <b>Espace</b>). Mieux vaut avoir <b>dépensé votre or</b> : il vous sera rendu.</p>`,
      task: 'Lancez le combat.',
      wait: () => c.inFight(),
    },
    {
      id: 'during', title: 'Le combat est automatique', target: '.arena-top', anchor: 'bl', light: true,
      text: `<p>Les créatures choisissent leur cible, avancent et attaquent seules. Leur jauge de <b>mana</b> se remplit en frappant, puis elles lancent leur <b>sort</b>.</p>
        <p>Accélérez avec <b>×2</b> / <b>×3</b>. Le panneau de droite compte les dégâts de chacun. Une victoire rapporte de l’or, et souvent une relique, un compagnon ou un œuf.</p>`,
      next: 'Compris',
    },
  ];
}

export function postArenaChapter(): TutStep[] {
  return [
    {
      id: 'after', title: 'Premier combat terminé', side: 'center',
      text: `<p>Votre <b>or</b> vous a été rendu, avec la <b>récompense</b> en cas de victoire. Une <b>défaite</b> coûte un cœur (vous en avez 3) mais la partie continue.</p>
        <p>Entre deux arènes, développez l’économie <i>et</i> les bâtiments de combat : Caserne, Forge, Sanctuaire, Académie, Taverne, Ménagerie. Capturez aussi des créatures dans les <b>repaires</b> de la carte.</p>`,
      next: 'Continuer',
    },
  ];
}
