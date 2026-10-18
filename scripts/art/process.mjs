// Détourage et découpe des planches générées par IA (fond blanc) -> sprites WebP transparents.
// Usage : node scripts/art/process.mjs [filtre]   (lit scripts/art/jobs.json)
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RAW = join(ROOT, 'art', 'raw');
const OUT = join(ROOT, 'src', 'assets', 'art');
const MANIFEST = join(OUT, 'manifest.json');

const isBg = (r, g, b) => Math.min(r, g, b) >= 232 && Math.max(r, g, b) - Math.min(r, g, b) <= 26;

function floodBackground(px, W, H) {
  const bg = new Uint8Array(W * H);
  const stack = [];
  const push = (x, y) => {
    const i = y * W + x;
    if (bg[i]) return;
    const o = i * 4;
    if (!isBg(px[o], px[o + 1], px[o + 2])) return;
    bg[i] = 1;
    stack.push(i);
  };
  for (let x = 0; x < W; x++) {
    push(x, 0);
    push(x, H - 1);
  }
  for (let y = 0; y < H; y++) {
    push(0, y);
    push(W - 1, y);
  }
  while (stack.length) {
    const i = stack.pop();
    const x = i % W;
    const y = (i / W) | 0;
    if (x > 0) push(x - 1, y);
    if (x < W - 1) push(x + 1, y);
    if (y > 0) push(x, y - 1);
    if (y < H - 1) push(x, y + 1);
  }
  return bg;
}

// Certaines IA tracent une ligne de sol fine sous les personnages : elle les relie et empêche la découpe.
// On efface les longs traits horizontaux sombres et neutres (les contours colorés des créatures sont épargnés).
function removeBaselines(px, W, H) {
  const strong = (o) => Math.min(px[o], px[o + 1], px[o + 2]) < 125 && Math.max(px[o], px[o + 1], px[o + 2]) - Math.min(px[o], px[o + 1], px[o + 2]) < 45;
  const loose = (o) => Math.min(px[o], px[o + 1], px[o + 2]) < 218 && Math.max(px[o], px[o + 1], px[o + 2]) - Math.min(px[o], px[o + 1], px[o + 2]) < 36;
  const rows = [];
  for (let y = 0; y < H; y++) {
    let run = 0;
    let best = 0;
    for (let x = 0; x < W; x++) {
      if (strong((y * W + x) * 4)) {
        run++;
        if (run > best) best = run;
      } else run = 0;
    }
    if (best >= W * 0.12) rows.push(y);
  }
  // Une vraie ligne de sol court sur du fond blanc ; un aplat sombre dans un corps (écorce, ombre) est entouré de matière : on l'épargne.
  const whiteAt = (x, y) => {
    if (y < 0 || y >= H) return true;
    const o = (y * W + x) * 4;
    return Math.min(px[o], px[o + 1], px[o + 2]) >= 235;
  };
  const isLine = (y) => {
    let run = 0, bestRun = 0, bestEnd = 0;
    for (let x = 0; x < W; x++) {
      if (strong((y * W + x) * 4)) {
        run++;
        if (run > bestRun) {
          bestRun = run;
          bestEnd = x;
        }
      } else run = 0;
    }
    let above = 0, below = 0;
    for (let x = bestEnd - bestRun + 1; x <= bestEnd; x++) {
      if (whiteAt(x, y - 6)) above++;
      if (whiteAt(x, y + 6)) below++;
    }
    return Math.max(above, below) >= bestRun * 0.6;
  };
  for (let i = rows.length - 1; i >= 0; i--) if (!isLine(rows[i])) rows.splice(i, 1);
  if (!rows.length) return 0;
  const todo = new Set();
  for (const y of rows) for (let d = -2; d <= 2; d++) if (y + d >= 0 && y + d < H) todo.add(y + d);
  for (const y of todo) {
    let x = 0;
    while (x < W) {
      if (!loose((y * W + x) * 4)) {
        x++;
        continue;
      }
      let e = x;
      while (e < W && loose((y * W + e) * 4)) e++;
      if (e - x >= 40) for (let k = x; k < e; k++) px.fill(255, (y * W + k) * 4, (y * W + k) * 4 + 4);
      x = e;
    }
  }
  return todo.size;
}

// Grands trous de fond blanc enfermés dans le sprite (entre bras, jambes, ailes) : traités comme du fond.
function fillEnclosedHoles(px, W, H, bg, minArea) {
  const seen = new Uint8Array(W * H);
  const whiteish = (i) => {
    const o = i * 4;
    return Math.min(px[o], px[o + 1], px[o + 2]) >= 240 && Math.max(px[o], px[o + 1], px[o + 2]) - Math.min(px[o], px[o + 1], px[o + 2]) <= 18;
  };
  for (let s = 0; s < W * H; s++) {
    if (bg[s] || seen[s] || !whiteish(s)) continue;
    const comp = [s];
    seen[s] = 1;
    for (let k = 0; k < comp.length; k++) {
      const i = comp[k];
      const x = i % W;
      const y = (i / W) | 0;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]) {
        if (j >= 0 && !bg[j] && !seen[j] && whiteish(j)) {
          seen[j] = 1;
          comp.push(j);
        }
      }
    }
    if (comp.length >= minArea) for (const i of comp) bg[i] = 1;
  }
}

// Alpha : 0 sur le fond relié aux bords, frange blanchâtre adoucie sur les contours.
function buildAlpha(px, W, H, holeMin) {
  const bg = floodBackground(px, W, H);
  fillEnclosedHoles(px, W, H, bg, holeMin ?? Math.max(1800, (W * H) / 900));
  const alpha = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) alpha[i] = bg[i] ? 0 : 255;
  const near = (x, y, d) => {
    for (let dy = -d; dy <= d; dy++) {
      const yy = y + dy;
      if (yy < 0 || yy >= H) continue;
      for (let dx = -d; dx <= d; dx++) {
        const xx = x + dx;
        if (xx >= 0 && xx < W && bg[yy * W + xx]) return true;
      }
    }
    return false;
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (bg[i]) continue;
      const o = i * 4;
      const mn = Math.min(px[o], px[o + 1], px[o + 2]);
      const sat = Math.max(px[o], px[o + 1], px[o + 2]) - mn;
      if (mn > 190 && sat < 34 && near(x, y, 2)) alpha[i] = Math.round(Math.max(0, Math.min(1, (255 - mn) / 65)) * 255);
    }
  }
  return alpha;
}

function bboxOf(alpha, W, H, x0 = 0, x1 = W, y0 = 0, y1 = H, thr = 24) {
  let minX = x1, minY = y1, maxX = x0 - 1, maxY = y0 - 1;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (alpha[y * W + x] > thr) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return maxX < minX ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

// Sépare une rangée en n formes grâce aux plus larges colonnes vides.
function splitRow(alpha, W, H, n) {
  const col = new Uint32Array(W);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (alpha[y * W + x] > 24) col[x]++;
  const runs = [];
  let start = -1;
  for (let x = 0; x <= W; x++) {
    const empty = x < W && col[x] < 3;
    if (empty && start < 0) start = x;
    if (!empty && start >= 0) {
      if (start > 0 && x < W) runs.push({ a: start, b: x, len: x - start });
      start = -1;
    }
  }
  const cuts = runs.sort((p, q) => q.len - p.len).slice(0, n - 1).sort((p, q) => p.a - q.a);
  const bounds = [];
  let prev = 0;
  for (const c of cuts) {
    bounds.push([prev, (c.a + c.b) >> 1]);
    prev = (c.a + c.b) >> 1;
  }
  bounds.push([prev, W]);
  return bounds;
}

// Découpage de planches d'objets par colonnes (puis lignes) vides, en sachant combien d'objets on attend.
function profileOf(alpha, W, x0, x1, y0, y1, axis) {
  const n = axis === 'x' ? x1 - x0 : y1 - y0;
  const out = new Uint32Array(n);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (alpha[y * W + x] > 24) out[axis === 'x' ? x - x0 : y - y0]++;
  return out;
}

function interiorGaps(profile, minLen) {
  const gaps = [];
  let start = -1;
  for (let i = 0; i <= profile.length; i++) {
    const empty = i < profile.length && profile[i] < 2;
    if (empty && start < 0) start = i;
    if (!empty && start >= 0) {
      if (start > 0 && i < profile.length && i - start >= minLen) gaps.push({ a: start, b: i, len: i - start });
      start = -1;
    }
  }
  return gaps;
}

function segmentsFrom(gaps, size, count) {
  const cuts = [...gaps].sort((p, q) => q.len - p.len).slice(0, count - 1).sort((p, q) => p.a - q.a);
  const segs = [];
  let prev = 0;
  for (const c of cuts) {
    segs.push([prev, (c.a + c.b) >> 1]);
    prev = (c.a + c.b) >> 1;
  }
  segs.push([prev, size]);
  return segs;
}

function splitGrid(alpha, W, H, n) {
  const boxOf = (x0, x1, y0, y1) => {
    const b = bboxOf(alpha, W, H, x0, x1, y0, y1);
    return b ? [b.x, b.y, b.x + b.w, b.y + b.h] : null;
  };
  const xg = interiorGaps(profileOf(alpha, W, 0, W, 0, H, 'x'), 10);
  if (xg.length >= n - 1) {
    const boxes = segmentsFrom(xg, W, n).map(([a, b]) => boxOf(a, b, 0, H));
    if (boxes.every(Boolean)) return boxes;
  }
  const yg = interiorGaps(profileOf(alpha, W, 0, W, 0, H, 'y'), 10);
  for (let rows = 2; rows <= 3 && yg.length >= rows - 1; rows++) {
    const bands = segmentsFrom(yg, H, rows);
    const boxes = [];
    for (const [ya, yb] of bands) {
      const g = interiorGaps(profileOf(alpha, W, 0, W, ya, yb, 'x'), 10);
      for (const [xa, xb] of segmentsFrom(g, W, g.length + 1)) {
        const b = boxOf(xa, xb, ya, yb);
        if (b) boxes.push(b);
      }
    }
    if (boxes.length === n) return boxes;
  }
  return null;
}

// Composantes connexes (sur masque réduit) fusionnées quand elles sont proches : pour les planches d'objets.
function splitObjects(alpha, W, H, gap, minArea, expected) {
  const S = 4;
  const w = Math.ceil(W / S);
  const h = Math.ceil(H / S);
  const m = new Uint8Array(w * h);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (alpha[y * W + x] > 24) m[((y / S) | 0) * w + ((x / S) | 0)] = 1;
  const lab = new Int32Array(w * h).fill(-1);
  const boxes = [];
  for (let i = 0; i < w * h; i++) {
    if (!m[i] || lab[i] >= 0) continue;
    const id = boxes.length;
    const st = [i];
    lab[i] = id;
    const b = { x0: w, y0: h, x1: 0, y1: 0, area: 0, ids: [id] };
    while (st.length) {
      const j = st.pop();
      const x = j % w;
      const y = (j / w) | 0;
      b.x0 = Math.min(b.x0, x); b.x1 = Math.max(b.x1, x);
      b.y0 = Math.min(b.y0, y); b.y1 = Math.max(b.y1, y);
      b.area++;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const k = yy * w + xx;
        if (m[k] && lab[k] < 0) { lab[k] = id; st.push(k); }
      }
    }
    boxes.push(b);
  }
  // On garde les n plus grosses composantes (n = nombre d'objets attendu) et on rattache les petits fragments au plus proche.
  const g = Math.ceil(gap / S);
  boxes.sort((p, q) => q.area - p.area);
  const main = boxes.slice(0, Math.max(1, expected));
  for (const f of boxes.slice(main.length)) {
    let best = null;
    let bd = Infinity;
    for (const m of main) {
      const dx = Math.max(0, m.x0 - f.x1, f.x0 - m.x1);
      const dy = Math.max(0, m.y0 - f.y1, f.y0 - m.y1);
      const d = Math.hypot(dx, dy);
      if (d < bd) {
        bd = d;
        best = m;
      }
    }
    if (best && bd <= g) {
      best.x0 = Math.min(best.x0, f.x0); best.x1 = Math.max(best.x1, f.x1);
      best.y0 = Math.min(best.y0, f.y0); best.y1 = Math.max(best.y1, f.y1);
      best.area += f.area;
      best.ids.push(...f.ids);
    }
  }
  const big = main.filter((b) => b.area * S * S >= minArea * 0.1);
  // ordre de lecture par bandes horizontales
  const rowH = Math.max(...big.map((b) => b.y1 - b.y0)) * 0.6;
  big.sort((p, q) => (Math.abs(p.y1 - q.y1) < rowH ? p.x0 - q.x0 : p.y1 - q.y1));
  // propriétaire de chaque pixel : sert à ne garder, dans la boîte d'un objet, que ses propres pixels
  const ownerOfLabel = new Int32Array(boxes.length).fill(-2);
  big.forEach((b, j) => b.ids.forEach((id) => (ownerOfLabel[id] = j)));
  const owner = (x, y) => {
    const l = lab[((y / S) | 0) * w + ((x / S) | 0)];
    return l < 0 ? -1 : ownerOfLabel[l];
  };
  return { boxes: big.map((b) => [b.x0 * S, b.y0 * S, Math.min(W, (b.x1 + 1) * S), Math.min(H, (b.y1 + 1) * S)]), owner };
}

function feetAnchor(alpha, W, box) {
  const rows = Math.max(2, Math.round(box.h * 0.07));
  let sx = 0, n = 0;
  for (let y = box.y + box.h - rows; y < box.y + box.h; y++) {
    for (let x = box.x; x < box.x + box.w; x++) {
      if (alpha[y * W + x] > 120) { sx += x; n++; }
    }
  }
  return n ? (sx / n - box.x) / box.w : 0.5;
}

async function emit(px, alpha, W, H, box, name, maxH, manifest, outDir, forced, relOverride) {
  const pad = 6;
  const x = Math.max(0, box.x - pad), y = Math.max(0, box.y - pad);
  const w = Math.min(W - x, box.w + pad * 2), h = Math.min(H - y, box.h + pad * 2);
  const rgba = Buffer.alloc(w * h * 4);
  for (let yy = 0; yy < h; yy++) {
    for (let xx = 0; xx < w; xx++) {
      const s = (y + yy) * W + (x + xx);
      const d = (yy * w + xx) * 4;
      rgba[d] = px[s * 4]; rgba[d + 1] = px[s * 4 + 1]; rgba[d + 2] = px[s * 4 + 2]; rgba[d + 3] = alpha[s];
    }
  }
  const scale = forced ? forced.scale : Math.min(1, maxH / h);
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));
  mkdirSync(join(OUT, outDir), { recursive: true });
  const file = join(OUT, outDir, `${name}.webp`);
  await sharp(rgba, { raw: { width: w, height: h, channels: 4 } })
    .resize(tw, th, { kernel: 'lanczos3' })
    .webp({ quality: 90, alphaQuality: 100, effort: 5 })
    .toFile(file);
  manifest[`${outDir}/${name}`] = {
    w: tw,
    h: th,
    ax: +feetAnchor(alpha, W, { x: box.x, y: box.y, w: box.w, h: box.h }).toFixed(3),
    // la zone utile (sans marge) dans l'image finale, utile pour centrer
    pad: +(pad * scale).toFixed(1),
    // taille relative dans sa planche (la plus grande forme = 1) : conserve la progression ★1 -> ★3
    rel: relOverride ?? (forced ? +(h / forced.refH).toFixed(3) : 1),
  };
}

// Fonds et textures : pas de détourage, simple redimensionnement. Les gros fonds sont chargés à la demande par le jeu.
async function emitFull(file, job, manifest) {
  const name = job.names[0];
  mkdirSync(join(OUT, job.dir), { recursive: true });
  const out = join(OUT, job.dir, `${name}.webp`);
  const info = await sharp(file)
    .resize({ width: job.maxW ?? 2048, withoutEnlargement: true })
    .webp({ quality: job.kind === 'texture' ? 88 : 84, effort: 5 })
    .toFile(out);
  manifest[`${job.dir}/${name}`] = { w: info.width, h: info.height, ax: 0.5, pad: 0, rel: 1, ...(job.kind === 'background' ? { lazy: true } : {}) };
  console.log(`✓ ${job.src}`);
}

async function runJob(job, manifest) {
  const file = join(RAW, job.src);
  if (!existsSync(file)) {
    absent++;
    return;
  }
  if (job.kind === 'background' || job.kind === 'texture') return emitFull(file, job, manifest);
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  // les lignes de sol ne se rencontrent que sous les planches de créatures ; ailleurs on risquerait d'effacer des contours
  if (job.kind === 'row') removeBaselines(data, W, H);
  // décors et bâtiments n'ont pas d'yeux à protéger : on y supprime aussi les petits trous de fond (sous les couronnes d'arbres…)
  const holeMin = job.kind === 'objects' || job.dir === 'buildings' ? 350 : undefined;
  const alpha = buildAlpha(data, W, H, holeMin);
  const maxH = job.maxH ?? 640;
  const dir = job.dir;
  if (job.kind === 'row') {
    const parts = splitRow(alpha, W, H, job.names.length);
    const boxes = parts.map(([a, b]) => bboxOf(alpha, W, H, a, b));
    const refH = Math.max(...boxes.map((b) => (b ? b.h + 12 : 0)));
    const forced = { scale: Math.min(1, maxH / refH), refH };
    for (let i = 0; i < job.names.length; i++) {
      if (!boxes[i]) {
        console.log(`  !! vide : ${job.names[i]}`);
        continue;
      }
      await emit(data, alpha, W, H, boxes[i], job.names[i], maxH, manifest, dir, forced);
    }
  } else if (job.kind === 'single') {
    const box = bboxOf(alpha, W, H);
    if (box) await emit(data, alpha, W, H, box, job.names[0], maxH, manifest, dir, undefined, job.rel);
  } else {
    const grid = splitGrid(alpha, W, H, job.names.length);
    const comp = grid ? null : splitObjects(alpha, W, H, job.gap ?? 28, job.minArea ?? 9000, job.names.length);
    const boxes = grid ?? comp.boxes;
    if (boxes.length !== job.names.length) console.log(`  !! ${job.src} : ${boxes.length} objets trouvés, ${job.names.length} attendus`);
    for (let i = 0; i < Math.min(boxes.length, job.names.length); i++) {
      const [x0, y0, x1, y1] = boxes[i];
      let a2 = alpha;
      if (comp) {
        // on efface les pixels qui appartiennent à un autre objet (arbres dont les branches se chevauchent en largeur)
        a2 = Uint8Array.from(alpha);
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) if (a2[y * W + x] && comp.owner(x, y) !== i) a2[y * W + x] = 0;
      }
      const box = bboxOf(a2, W, H, x0, x1, y0, y1);
      if (box) await emit(data, a2, W, H, box, job.names[i], maxH, manifest, dir);
    }
  }
  console.log(`✓ ${job.src}`);
}

let absent = 0;
const filter = process.argv[2];
const jobs = JSON.parse(readFileSync(join(ROOT, 'scripts', 'art', 'jobs.json'), 'utf8')).filter((j) => !filter || j.src.includes(filter));
mkdirSync(OUT, { recursive: true });
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
for (const j of jobs) await runJob(j, manifest);
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1));
console.log(`manifest : ${Object.keys(manifest).length} sprites${filter ? '' : ` · ${absent} image(s) pas encore fournie(s)`}`);
