// Générateur pseudo-aléatoire déterministe (mulberry32) pour des parties reproductibles via seed.
export class RNG {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0 || 1;
  }

  get state(): number {
    return this.s;
  }

  set state(v: number) {
    this.s = v >>> 0;
  }

  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(a: number, b: number): number {
    return a + (b - a) * this.next();
  }

  int(a: number, b: number): number {
    return Math.floor(this.range(a, b + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  weighted<T>(items: readonly T[], weight: (t: T) => number): T {
    const total = items.reduce((s, it) => s + weight(it), 0);
    let roll = this.next() * total;
    for (const it of items) {
      roll -= weight(it);
      if (roll <= 0) return it;
    }
    return items[items.length - 1];
  }
}

// Bruit de valeur 2D lissé, suffisant pour générer des îles et des biomes.
export function makeNoise(seed: number) {
  const perm = new Uint8Array(512);
  const rng = new RNG(seed);
  const p = Array.from({ length: 256 }, (_, i) => i);
  rng.shuffle(p);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grad = (h: number) => (h / 255) * 2 - 1;
  const fade = (t: number) => t * t * (3 - 2 * t);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const base = (x: number, y: number) => {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const a = grad(perm[perm[xi] + yi]);
    const b = grad(perm[perm[xi + 1] + yi]);
    const c = grad(perm[perm[xi] + yi + 1]);
    const d = grad(perm[perm[xi + 1] + yi + 1]);
    const u = fade(xf);
    const v = fade(yf);
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  };
  return (x: number, y: number, octaves = 3) => {
    let amp = 1;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += base(x * freq, y * freq) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum / norm;
  };
}
