// Génère art/prompts.html (page de prompts autonome) et scripts/art/jobs.json (consignes de détourage).
// Usage : npx tsx scripts/art/build-prompts.ts   (ou npm run art, qui enchaîne avec le détourage)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CAT_LABELS, LINES, STYLE, WHITE, buildItems } from './promptData';

const ROOT = process.cwd();
const manifestPath = join(ROOT, 'src', 'assets', 'art', 'manifest.json');
const manifest: Record<string, unknown> = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};

const items = buildItems();
const data = {
  items: items.map((it) => ({
    ...it,
    job: undefined,
    have: it.previews.filter((p) => manifest[p.replace(/\.webp$/, '')]).length,
  })),
  catLabels: CAT_LABELS,
};

// ——— consignes de détourage ———
interface Job {
  src: string;
  kind: string;
  dir: string;
  names: string[];
  maxH?: number;
  maxW?: number;
  gap?: number;
  rel?: number;
}
const jobs: Job[] = [];
for (const it of items) {
  jobs.push({ src: it.file, kind: it.job.kind, dir: it.job.dir, names: it.job.names, maxH: it.job.maxH, maxW: it.job.maxW, gap: it.job.gap });
  if (it.cat === 'creature') {
    // variantes « une forme par image » : la taille relative est donnée par le rang d'évolution
    const rel = [0.45, 0.78, 1];
    (it.variants ?? []).forEach((v, i) => {
      const line = LINES.find((l) => v.file.startsWith(`creature_${l.id}_`))!;
      jobs.push({ src: v.file, kind: 'single', dir: 'creatures', names: [`${line.id}_${i + 1}`], maxH: 560, rel: rel[i] });
    });
  }
}
writeFileSync(join(ROOT, 'scripts', 'art', 'jobs.json'), JSON.stringify(jobs.map((j) => JSON.parse(JSON.stringify(j))), null, 1));

// ——— page HTML ———
const css = readFileSync(join(ROOT, 'scripts', 'art', 'prompts.css'), 'utf8');
const js = readFileSync(join(ROOT, 'scripts', 'art', 'prompts.client.js'), 'utf8');
const json = JSON.stringify(data).replace(/</g, '\\u003c');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const total = items.length;
const done = data.items.filter((i) => i.have === i.previews.length).length;

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hexaria — prompts d'images</title>
<style>${css}</style>
</head>
<body>
<header class="top">
  <h1>HEXARIA — Atelier d'images</h1>
  <p class="sub">Tous les prompts pour générer, avec votre propre IA d'images, les personnages, monstres, bâtiments, éléments de décor, textures, fonds d'arène et illustrations du jeu.
  Chaque fiche donne le <b>prompt prêt à coller</b>, le <b>format</b>, la <b>taille conseillée</b> et le <b>nom de fichier exact</b> attendu par le jeu. ${done} image(s) sur ${total} sont déjà intégrées.</p>

  <div class="steps">
    <div class="step"><span class="n">1</span><b>Copier</b> un prompt avec le bouton doré, puis le coller dans votre IA (Midjourney, GPT Image, Flux, Gemini…).</div>
    <div class="step"><span class="n">2</span><b>Garder le même style</b> : générez une première image qui vous plaît et fournissez-la comme <i>image de référence de style</i> pour toutes les suivantes.</div>
    <div class="step"><span class="n">3</span><b>Enregistrer</b> l'image sous le <b>nom de fichier indiqué</b> dans le dossier <code>art/raw/</code> (ou la déposer sur la fiche si <code>npm run dev</code> tourne).</div>
    <div class="step"><span class="n">4</span><b>Intégrer</b> : lancez <code>npm run art</code>. Le fond blanc est retiré, les planches sont découpées et converties ; rechargez le jeu, c'est utilisé automatiquement.</div>
  </div>

  <details class="tips">
    <summary>Conseils pour de meilleurs résultats</summary>
    <ul>
      <li><b>Fond blanc pur</b> pour les personnages, monstres, bâtiments et décors (pas d'ombre au sol, pas de dégradé) : c'est ce qui permet le détourage automatique. Les textures, fonds d'arène, événements et écran titre sont au contraire des images pleines.</li>
      <li><b>Vue isométrique de trois quarts, personnages tournés vers la droite</b> : le jeu retourne l'image quand il faut les faire regarder à gauche.</li>
      <li>Les <b>planches</b> (3 formes d'évolution, ou plusieurs objets de décor) doivent avoir de <b>larges espaces blancs</b> entre les éléments, sinon la découpe automatique les fusionnera. Si votre IA n'y arrive pas, utilisez les variantes « une forme à la fois » des créatures, ou découpez les planches de décor vous-même.</li>
      <li>Pour les créatures, gardez les <b>mêmes couleurs et la même identité</b> entre les trois formes ; la forme 3 doit être nettement plus grande.</li>
      <li>Les images restent <b>originales</b> : ne demandez pas de personnages de licences existantes.</li>
      <li>Une image ratée ? Régénérez uniquement celle-là et écrasez le fichier, puis relancez <code>npm run art</code> ; rien d'autre n'est touché.</li>
    </ul>
  </details>

  <div class="style-box"><b>Bloc de style commun</b> (déjà inclus dans chaque prompt) : ${esc(STYLE)}<br><b>Fond :</b> ${esc(WHITE)}</div>
  <div id="devbar"><b>Mode développement détecté.</b> Déposez vos images (une ou plusieurs, nommées comme indiqué) ici ou sur une fiche : elles sont enregistrées, détourées et intégrées au jeu automatiquement.</div>
</header>

<div class="toolbar"><div class="inner">
  <div id="cats" style="display:contents"></div>
  <input id="q" type="search" placeholder="Rechercher (nom, fichier, mot du prompt)…">
  <button id="missing" class="chip-btn">Seulement les manquantes</button>
  <button id="copyall" class="chip-btn">Copier tous les prompts affichés</button>
  <span class="progress"><span id="pcount"></span><span class="bar"><i id="pbar"></i></span></span>
</div></div>

<main id="main"></main>
<footer>
  Page générée par <code>npx tsx scripts/art/build-prompts.ts</code> à partir de <code>scripts/art/promptData.ts</code> — modifiez ce fichier pour changer un prompt ou ajouter une image, puis relancez <code>npm run art</code>.
</footer>

<script>window.__DATA__ = ${json};</script>
<script>${js}</script>
</body>
</html>
`;

writeFileSync(join(ROOT, 'art', 'prompts.html'), html);
console.log(`art/prompts.html : ${total} fiches (${done} déjà prêtes) · jobs.json : ${jobs.length} consignes`);
