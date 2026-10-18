import type { IconName } from '../data/types';

const S = 'stroke="#1a120a" stroke-width="1.2" stroke-linejoin="round"';

const ICONS: Record<IconName, string> = {
  gold: `<circle cx="12" cy="12" r="9" fill="#f2c14e" ${S}/><circle cx="12" cy="12" r="5.6" fill="none" stroke="#b07d1e" stroke-width="1.6"/><path d="M12 8.5v7M10 10h3.2a1.3 1.3 0 0 1 0 2.6h-2.4a1.3 1.3 0 0 0 0 2.6H14" fill="none" stroke="#8a5a10" stroke-width="1.3"/>`,
  coins: `<ellipse cx="9" cy="16" rx="6.5" ry="3" fill="#d9a43a" ${S}/><ellipse cx="9" cy="13" rx="6.5" ry="3" fill="#f2c14e" ${S}/><ellipse cx="15" cy="10" rx="6.5" ry="3" fill="#d9a43a" ${S}/><ellipse cx="15" cy="7" rx="6.5" ry="3" fill="#ffd96a" ${S}/>`,
  wood: `<rect x="3" y="12" width="15" height="6" rx="3" fill="#8a5a30" ${S}/><ellipse cx="18" cy="15" rx="2.2" ry="3" fill="#e0b47a" ${S}/><rect x="6" y="6" width="15" height="6" rx="3" fill="#a06a38" ${S}/><ellipse cx="21" cy="9" rx="2.2" ry="3" fill="#f0c88a" ${S}/>`,
  stone: `<path d="M4 17l2-7 6-4 7 3 2 7-5 4H8z" fill="#9aa0a6" ${S}/><path d="M12 6l1 6 6 4M6 10l7 2" fill="none" stroke="#5f656b" stroke-width="1.1"/>`,
  food: `<path d="M12 21V8" stroke="#8a6a20" stroke-width="1.6"/><path d="M12 8c-3-1-4-4-3-6 3 1 4 3 3 6zm0 4c-3-1-5-3-4-6 3 1 5 3 4 6zm0 0c3-1 5-3 4-6-3 1-5 3-4 6zm0 4c-3-1-5-3-4-6 3 1 5 3 4 6zm0 0c3-1 5-3 4-6-3 1-5 3-4 6z" fill="#f0c654" ${S}/>`,
  pop: `<circle cx="8.5" cy="8" r="3" fill="#e8c9a0" ${S}/><path d="M3.5 19c0-4 2-6 5-6s5 2 5 6z" fill="#4f8ac9" ${S}/><circle cx="16" cy="9" r="2.6" fill="#e8c9a0" ${S}/><path d="M12.5 19c.4-3.2 1.6-5 3.5-5s4.2 1.8 4.5 5z" fill="#c9644f" ${S}/>`,
  hammer: `<path d="M13 9l-8.5 8.5a1.6 1.6 0 0 0 2.2 2.2L15.2 11.2z" fill="#9a6a3a" ${S}/><path d="M10.5 6.5l4-3 6 6-3 4z" fill="#aab2ba" ${S}/>`,
  heart: `<path d="M12 20s-8-5-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15 12 20 12 20z" fill="#e0435a" ${S}/><path d="M7.5 9.5a2 2 0 0 1 2-2" stroke="#ffb0bc" stroke-width="1.4" fill="none"/>`,
  sword: `<path d="M18.5 3.5l2 2-10 10-2-2z" fill="#d6dde4" ${S}/><path d="M6 14l4 4M7.5 16.5l-3.5 3.5" stroke="#8a5a2a" stroke-width="2.2" stroke-linecap="round"/><path d="M5 13l6 6" stroke="#e0b048" stroke-width="2"/>`,
  shield: `<path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z" fill="#4f7ac9" ${S}/><path d="M12 3v18M5 9h14" stroke="#e0b048" stroke-width="1.4"/>`,
  skull: `<path d="M12 3a7 7 0 0 0-7 7c0 2.5 1.2 4 2.5 5v3h9v-3c1.3-1 2.5-2.5 2.5-5a7 7 0 0 0-7-7z" fill="#e8e0d0" ${S}/><circle cx="9.3" cy="10.5" r="1.8" fill="#1a120a"/><circle cx="14.7" cy="10.5" r="1.8" fill="#1a120a"/><path d="M10 18v2M12 18v2M14 18v2" stroke="#1a120a" stroke-width="1.2"/>`,
  question: `<circle cx="12" cy="12" r="9" fill="#2a4a5a" ${S}/><path d="M9.3 9.5a2.8 2.8 0 1 1 3.8 2.6c-.8.4-1.1.9-1.1 1.8v.6" fill="none" stroke="#bfe8ff" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.3" r="1.2" fill="#bfe8ff"/>`,
  feu: `<path d="M12 21c-4 0-6.5-2.6-6.5-6 0-3.5 3-5.5 3.5-9 2 1.5 3 3 3 4.5 1-1 1.5-2.5 1.5-4 3 2 5 5 5 8.5 0 3.4-2.5 6-6.5 6z" fill="#ff7a3d" ${S}/><path d="M12 21c-2 0-3.2-1.3-3.2-3 0-2 1.6-3 2-5 1.2 1 2.4 2 2.4 3.4.6-.5.9-1 1-1.7 1 1 1.4 2 1.4 3.3 0 1.7-1.6 3-3.6 3z" fill="#ffe08a"/>`,
  eau: `<path d="M12 3c3 4.5 6.5 8 6.5 11.5a6.5 6.5 0 0 1-13 0C5.5 11 9 7.5 12 3z" fill="#3fa9f5" ${S}/><path d="M9 14.5a3 3 0 0 0 2.5 3" stroke="#d6f0ff" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
  plante: `<path d="M5 19C5 10 10 5 20 4c-1 10-6 15-15 15z" fill="#5ad16a" ${S}/><path d="M5 19L15 9" stroke="#1d5a2a" stroke-width="1.4"/>`,
  leaf: `<path d="M12 21c-5-3-7-7-6-12 3 0 5 1 6 3 1-2 3-3 6-3 1 5-1 9-6 12z" fill="#7affc0" ${S}/><path d="M12 21v-9" stroke="#1d5a4a" stroke-width="1.3"/>`,
  foudre: `<path d="M13.5 2L5 13.5h5.5L9 22l9.5-12.5H13z" fill="#f5d33f" ${S}/>`,
  roche: `<path d="M5 18l1.5-8L12 5l6 4 1.5 9z" fill="#c49a6c" ${S}/><path d="M12 5l-1 7 8.5 6M6.5 10l4.5 2" stroke="#6a4a28" stroke-width="1.1" fill="none"/>`,
  ombre: `<path d="M15 3.5A8.5 8.5 0 1 0 20.5 15 7 7 0 0 1 15 3.5z" fill="#a070ff" ${S}/><circle cx="17.5" cy="6" r="1" fill="#e2d5ff"/><circle cx="20" cy="9.5" r=".7" fill="#e2d5ff"/>`,
  gem: `<path d="M7 4h10l4 5-9 11L3 9z" fill="#5ad1d1" ${S}/><path d="M3 9h18M9 4l3 16 3-16M7 4l2 5m8-5l-2 5" stroke="#1d6a6a" stroke-width="1" fill="none"/>`,
  die: `<rect x="4" y="4" width="16" height="16" rx="3.5" fill="#efe6d6" ${S}/><circle cx="8.5" cy="8.5" r="1.5" fill="#7a2a22"/><circle cx="12" cy="12" r="1.5" fill="#7a2a22"/><circle cx="15.5" cy="15.5" r="1.5" fill="#7a2a22"/>`,
  egg: `<path d="M12 3c3.5 0 6 6 6 10.5a6 6 0 0 1-12 0C6 9 8.5 3 12 3z" fill="#e8f0c8" ${S}/><path d="M8 12l2 1.5 2-2 2 2 2-1.5" stroke="#5ad16a" stroke-width="1.4" fill="none"/>`,
  banner: `<path d="M6 3v18" stroke="#5a3a1a" stroke-width="2"/><path d="M7 4h11l-2.5 4L18 12H7z" fill="#c0392b" ${S}/><circle cx="12" cy="8" r="1.6" fill="#e0b048"/>`,
  snow: `<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" stroke="#bfe8ff" stroke-width="2" stroke-linecap="round"/><path d="M10 4.5l2 2 2-2M10 19.5l2-2 2 2" stroke="#bfe8ff" stroke-width="1.4" fill="none"/>`,
  scroll: `<path d="M6 5h11a2 2 0 0 1 0 4H8v10a2 2 0 0 1-4 0V7a2 2 0 0 1 2-2z" fill="#e8d6a8" ${S}/><path d="M8 19h10a2 2 0 0 0 0-4H8" fill="#d6c08a" ${S}/><path d="M10 11h5M10 13.5h4" stroke="#8a6a3a" stroke-width="1.1"/>`,
  crown: `<path d="M3.5 8l4 4 4.5-6 4.5 6 4-4-1.5 11h-14z" fill="#f2c14e" ${S}/><circle cx="12" cy="14.5" r="1.6" fill="#c0392b"/>`,
  eye: `<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" fill="#e8e0d0" ${S}/><circle cx="12" cy="12" r="3.6" fill="#3fa9f5" ${S}/><circle cx="12" cy="12" r="1.5" fill="#0a0a12"/>`,
  potion: `<path d="M9.5 3h5v5l4.5 7.5A3.6 3.6 0 0 1 15.9 21H8.1A3.6 3.6 0 0 1 5 15.5L9.5 8z" fill="#e05ab0" ${S}/><path d="M7 15h10" stroke="#ffd0f0" stroke-width="1.2"/><rect x="9" y="2" width="6" height="2" fill="#8a5a2a"/>`,
  star: `<path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" fill="#ffd25a" ${S}/>`,
  house: `<path d="M4 11l8-7 8 7" fill="#8a3b2a" ${S}/><rect x="6" y="11" width="12" height="9" fill="#a08a6a" ${S}/><rect x="10.5" y="14" width="3" height="6" fill="#ffc76a"/>`,
  flag: `<path d="M6 3v18" stroke="#5a3a1a" stroke-width="2"/><path d="M7 4c3-1.5 5 1.5 8 0s3 0 4 0v8c-1 0-1.5-1.5-4 0s-5-1.5-8 0z" fill="#3fa9f5" ${S}/>`,
  clock: `<circle cx="12" cy="12" r="9" fill="#e8e0d0" ${S}/><path d="M12 6.5V12l3.5 2.5" stroke="#1a120a" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
  turn: `<path d="M6 3h12M6 21h12M7 3c0 5 4 6 5 9-1 3-5 4-5 9h10c0-5-4-6-5-9 1-3 5-4 5-9" fill="#e0b048" ${S}/><path d="M9.5 19h5l-2.5-3z" fill="#7a5410"/>`,
  refresh: `<path d="M19 9a7.5 7.5 0 0 0-13.5-1.5M5 15a7.5 7.5 0 0 0 13.5 1.5" stroke="#ffd25a" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M4 4v4.5h4.5M20 20v-4.5h-4.5" stroke="#ffd25a" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  lock: `<rect x="5" y="10.5" width="14" height="10" rx="2" fill="#e0b048" ${S}/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="#1a120a" stroke-width="1.8" fill="none"/>`,
  paw: `<ellipse cx="12" cy="15.5" rx="4.5" ry="4" fill="#e8c9a0" ${S}/><circle cx="6.5" cy="10" r="2" fill="#e8c9a0" ${S}/><circle cx="9.8" cy="6.5" r="2" fill="#e8c9a0" ${S}/><circle cx="14.2" cy="6.5" r="2" fill="#e8c9a0" ${S}/><circle cx="17.5" cy="10" r="2" fill="#e8c9a0" ${S}/>`,
  anvil: `<path d="M3 7h13c0 2 2 3 5 3-1 2-4 3-7 3l-1 3h3v3H7v-3h3l-1-3C6 13 4 11 3 7z" fill="#7a8088" ${S}/>`,
  tower: `<path d="M8 21V9h8v12z" fill="#8c8fa0" ${S}/><path d="M6.5 9L12 2.5 17.5 9z" fill="#3a3f78" ${S}/><circle cx="12" cy="13" r="1.8" fill="#8fd0ff"/>`,
  boot: `<path d="M7 3h6v9l6 3c1.2.6 1.5 2 1.5 3v2H5v-3l1-3z" fill="#8a5a30" ${S}/><path d="M5 18h15.5" stroke="#1a120a" stroke-width="1.2"/>`,
  moon: `<path d="M15 3.5A8.5 8.5 0 1 0 20.5 15 7 7 0 0 1 15 3.5z" fill="#e8e0b0" ${S}/>`,
  sun: `<circle cx="12" cy="12" r="5" fill="#ffd25a" ${S}/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" stroke="#ffd25a" stroke-width="2" stroke-linecap="round"/>`,
};

export function icon(name: IconName, size = 20, extraClass = ''): string {
  return `<svg class="ico ${extraClass}" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] ?? ICONS.question}</svg>`;
}
