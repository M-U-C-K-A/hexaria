import '@fontsource/cinzel/400.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/alegreya-sans/400.css';
import '@fontsource/alegreya-sans/500.css';
import '@fontsource/alegreya-sans/700.css';
import '@fontsource/alegreya-sans/800.css';
import './ui/style.css';
import { app } from './app';
import { audio } from './audio';
import { loadSprites } from './render/sprites';
import { closeCodex, codexOpen, openCodex } from './ui/codex';
import { GalleryScene } from './scenes/galleryScene';
import { IconScene } from './scenes/iconScene';
import { TitleScene } from './scenes/titleScene';

function firstScene() {
  if (import.meta.env.DEV && location.search.includes('gallery')) return new GalleryScene();
  if (import.meta.env.DEV && location.search.includes('icon')) return new IconScene();
  return new TitleScene();
}

// Accès debug en développement : window.hx.app.scene
if (import.meta.env.DEV) (window as unknown as { hx: unknown }).hx = { app };

// Son : clic sur les éléments d'interface, bouton et touche M pour couper.
document.addEventListener('click', (e) => {
  if ((e.target as HTMLElement).closest('.btn, .choice:not(.locked), .bcard, .tab, .ccard')) audio.play('click');
});
const muteBtn = document.createElement('button');
muteBtn.className = 'btn mute-btn';
const paintMute = () => (muteBtn.textContent = audio.isMuted ? '🔇' : '🔊');
paintMute();
muteBtn.title = 'Couper / rétablir le son (M)';
muteBtn.addEventListener('click', () => audio.toggleMute());
audio.onMuteChange(paintMute);
document.body.appendChild(muteBtn);
const codexBtn = document.createElement('button');
codexBtn.className = 'btn mute-btn codex-btn';
codexBtn.textContent = '📖';
codexBtn.title = 'Codex : bestiaire, types, bâtiments, règles (C)';
codexBtn.addEventListener('click', () => (codexOpen() ? closeCodex() : openCodex()));
document.body.appendChild(codexBtn);
window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'm') audio.toggleMute();
  if (e.key.toLowerCase() === 'c' && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLSelectElement)) {
    if (codexOpen()) closeCodex();
    else if (!document.querySelector('.modal-back')) openCodex();
  }
});

Promise.all([document.fonts.ready.catch(() => undefined), loadSprites()]).finally(() => {
  app.setScene(firstScene());
  app.start();
  // Mode captures d'écran (dev) : ?shot=<scène>, utilisé par `npm run shots`
  const shot = new URLSearchParams(location.search).get('shot');
  if (import.meta.env.DEV && shot) import('./dev/shots').then((m) => m.runShot(shot));
});
