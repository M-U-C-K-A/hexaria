// Réglages du joueur, sauvegardés dans le navigateur / la fenêtre native.
export interface Settings {
  music: number; // 0..1
  sfx: number; // 0..1
  speed: 1 | 2 | 3; // vitesse de combat par défaut
  ambient: boolean; // brume, lucioles, fumée, braises
  floatText: boolean; // chiffres de dégâts et de soins en arène
  tooltips: boolean; // info-bulles détaillées
  tutorial: boolean; // conseils du tutoriel guidé actifs
  tutoSeen: string[]; // chapitres du tutoriel déjà vus
}

const KEY = 'hexaria.settings.v1';
const DEFAULTS: Settings = { music: 1, sfx: 1, speed: 1, ambient: true, floatText: true, tooltips: true, tutorial: true, tutoSeen: [] };

function load(): Partial<Settings> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Settings>;
  } catch {
    return {};
  }
}

export const settings: Settings = { ...DEFAULTS, ...load() };
if (!Array.isArray(settings.tutoSeen)) settings.tutoSeen = [];

export function saveSettings() {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* stockage indisponible : on ignore */
  }
}

export function resetSettings() {
  Object.assign(settings, DEFAULTS, { tutoSeen: [] });
  saveSettings();
}
