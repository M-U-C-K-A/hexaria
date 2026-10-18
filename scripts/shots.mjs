// Régénère les captures d'écran du README (docs/screenshots/*.jpg) avec Chrome headless.
// Usage : npm run shots [scène…]   (scènes : title world worldzoom arena fight boss event hatch codex codextypes codexcross codexmonsters prompts)
import { execFile, spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';

const run = promisify(execFile);
const ROOT = process.cwd();
const OUT = join(ROOT, 'docs', 'screenshots');
const PORT = 5188;
const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
].find((p) => existsSync(p));
if (!CHROME) {
  console.error('Chrome introuvable : installez Google Chrome pour générer les captures.');
  process.exit(1);
}

const W = 1600;
const H = 1000;
const SHOTS = {
  title: {},
  world: {},
  worldzoom: {},
  arena: {},
  fight: {},
  boss: {},
  event: {},
  hatch: {},
  codex: {},
  codextypes: {},
  codexcross: {},
  codexmonsters: {},
};
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : [...Object.keys(SHOTS), 'prompts'];

mkdirSync(OUT, { recursive: true });
const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
const stop = () => vite.kill('SIGTERM');
process.on('exit', stop);
for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(`http://localhost:${PORT}/`)).ok) break;
  } catch {
    await new Promise((r) => setTimeout(r, 250));
  }
}

for (const name of wanted) {
  const tmp = join(OUT, `${name}.tmp.png`);
  const url = name === 'prompts' ? `http://localhost:${PORT}/art/prompts.html` : `http://localhost:${PORT}/?shot=${name}`;
  const size = name === 'prompts' ? [1500, 1100] : [W, H];
  try {
    await run(CHROME, [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
      `--window-size=${size[0]},${size[1]}`, '--virtual-time-budget=15000', '--run-all-compositor-stages-before-draw',
      `--screenshot=${tmp}`, url,
    ], { timeout: 120000 });
    await sharp(tmp).jpeg({ quality: 86, mozjpeg: true }).toFile(join(OUT, `${name}.jpg`));
    rmSync(tmp, { force: true });
    console.log('✓', name);
  } catch (e) {
    console.error('✗', name, e.message.split('\n')[0]);
  }
}
stop();
