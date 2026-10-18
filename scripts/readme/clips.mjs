// Enregistre les clips animés du README (docs/media/*.webp) et leurs versions vidéo (release/*.mp4).
// Le jeu tourne dans Chrome avec une horloge simulée : chaque image est calculée puis photographiée,
// le rendu est donc fluide quelle que soit la machine. Scènes : ?shot=combatlive et ?shot=worldlive (src/dev/shots.ts).
// Usage : node scripts/readme/clips.mjs [combat world]
// Prérequis : Google Chrome, playwright-core (cache du skill hairline), ffmpeg (facultatif, pour les MP4).
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const require = createRequire(join(homedir(), 'Library', 'Caches', 'hairline-look', 'x.js'));
const { chromium } = require('playwright-core');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 5189;
const VIEW = { width: 1440, height: 900 }; // rendu, puis réduit (sur-échantillonnage)
const OUT_W = 880; // largeur par défaut des clips
const FPS = 15;

const CLIPS = {
  // Achat d'une Flammèche → évolution en chaîne ★1 → ★2 → ★3, puis combat automatique.
  combat: {
    shot: 'combatlive',
    seconds: 18,
    at: {
      1.5: (a) => a.buy(0),
      3.6: (a) => a.startFight(),
    },
    stop: (a) => a.phase === 'end' && a.endT > 1.6,
  },
  // Survol du royaume : la caméra glisse de l'hôtel de ville vers le colisée en zoomant.
  world: {
    shot: 'worldlive',
    seconds: 8,
    width: 720,
    fps: 12,
    quality: 50,
    each: (sc, t, T) => {
      const u = Math.min(1, t / T), k = u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
      const a = window.__townhall, b = window.__colosseum;
      sc.cam.zoom = 1.05 + k * 1.75;
      sc.cam.x = a.x + 30 + (b.x - a.x) * 0.55 * k;
      sc.cam.y = a.y + 10 + (b.y - a.y) * 0.55 * k - 12 * k;
    },
  },
};

const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CLIPS);
mkdirSync(join(ROOT, 'docs', 'media'), { recursive: true });
mkdirSync(join(ROOT, 'release'), { recursive: true });

const vite = spawn(process.execPath, [join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
process.on('exit', () => vite.kill('SIGTERM'));
for (let i = 0; i < 80; i++) {
  try {
    if ((await fetch(`http://localhost:${PORT}/`)).ok) break;
  } catch {
    await new Promise((r) => setTimeout(r, 250));
  }
}

const browser = await chromium.launch({ executablePath: existsSync(CHROME) ? CHROME : undefined });
for (const name of wanted) {
  const clip = CLIPS[name];
  const page = await browser.newPage({ viewport: VIEW, deviceScaleFactor: 1 });
  await page.clock.install({ time: 0 });
  await page.goto(`http://localhost:${PORT}/?shot=${clip.shot}`);
  // les images et polices se chargent en vrai temps ; les minuteries du jeu avancent à la main
  for (let i = 0; i < 200; i++) {
    await page.waitForTimeout(40);
    await page.clock.runFor(50);
    if (await page.evaluate(() => window.__shot === 'ready')) break;
  }
  await page.waitForTimeout(600);
  const tmp = join(ROOT, 'build', `clip-${name}`);
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  const frames = [];
  const fired = new Set();
  const T = clip.seconds;
  const fps = clip.fps || FPS;
  for (let f = 0; f < T * fps; f++) {
    const t = f / fps;
    for (const [when, fn] of Object.entries(clip.at || {})) {
      if (t >= Number(when) && !fired.has(when)) {
        fired.add(when);
        await page.evaluate(`(${fn.toString()})(window.__scene)`);
      }
    }
    if (clip.each) await page.evaluate(`(${clip.each.toString()})(window.__scene, ${t}, ${T})`);
    await page.clock.runFor(1000 / fps);
    const png = await page.screenshot({ type: 'png' });
    const small = await sharp(png).resize({ width: clip.width || OUT_W }).png().toBuffer();
    const file = join(tmp, `${String(f).padStart(4, '0')}.png`);
    writeFileSync(file, small);
    frames.push(file);
    if (clip.stop && (await page.evaluate(`(${clip.stop.toString()})(window.__scene)`))) break;
  }
  await page.close();

  // WebP animé pour le README (boucle infinie)
  const webp = join(ROOT, 'docs', 'media', `${name}.webp`);
  await sharp(frames, { join: { animated: true } })
    .webp({ quality: clip.quality || 58, effort: 6, loop: 0, delay: frames.map(() => Math.round(1000 / fps)), smartSubsample: true })
    .toFile(webp);
  // première image fixe (aperçu, réseaux sociaux)
  await sharp(frames[Math.min(frames.length - 1, Math.round(fps * 0.4))]).jpeg({ quality: 84, mozjpeg: true }).toFile(join(ROOT, 'docs', 'media', `${name}-poster.jpg`));
  let mp4 = '';
  try {
    mp4 = join(ROOT, 'release', `Hexaria-${name}.mp4`);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(tmp, '%04d.png'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', mp4]);
  } catch {
    mp4 = '(ffmpeg absent)';
  }
  const kb = (await sharp(webp).metadata()).size ?? 0;
  console.log(`✓ ${name} : ${frames.length} images, docs/media/${name}.webp`, mp4 ? `· ${mp4.replace(ROOT + '/', '')}` : '', kb);
}
await browser.close();
vite.kill('SIGTERM');
process.exit(0);
