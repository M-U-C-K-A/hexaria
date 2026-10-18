/**
 * Plateau: the arena board of Hexaria, a hexagonal plinth tiled with 37 hex
 * cells. The pointer is projected back onto the ground, and each cell rises by
 * its distance to it, on its own spring. At rest the board holds two camps: a
 * high rise on the far half, where the monsters wait, and a low one on the near
 * half, the player's. A flower of seven dots rides the lid of the cell under
 * the pointer, or the far peak at rest; cells above three fifths of full height
 * take the bright stroke. The slider is the radius, in cells.
 *
 * The pattern: a continuous field. Springs, a falloff by distance, a hit test
 * on the ground plane (which never moves), and a rest that is a composition.
 */
const {
  Cam, facing, fillet, fit, flatDot, mk, place, pointer, poly, prism, proj, put, register, ringAt, solid,
  spring, stepS, unproj, disposer,
} = HL;

const RAD = Math.PI / 180, N = 3, CELL = 9.6, SQ3 = Math.sqrt(3), HMAX = 44, PB = 6, BR = 60;

/** A rounded hexagon (a vertex at +y) as ring samples, with outward normals from the neighbouring points. */
function hexRing(R, rc, x = 0, y = 0) {
  const v = [];
  for (let k = 0; k < 6; k++) v.push([R * Math.cos((30 + 60 * k) * RAD), R * Math.sin((30 + 60 * k) * RAD)]);
  const pts = fillet(v, v.map(() => rc), 4);
  return pts.map((p, i) => {
    const a = pts[(i + pts.length - 1) % pts.length], b = pts[(i + 1) % pts.length];
    const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
    return { u: p[0] + x, v: p[1] + y, nu: ty / l, nv: -tx / l };
  });
}

/** The share of full height at u radii from the pointer: 1 → .31 at 42% → .09 at the edge and beyond. */
const falloff = (u) =>
  u <= 0 ? 1 : u <= 0.417 ? 1 - (u / 0.417) * 0.6875 : u <= 1 ? 0.3125 - ((u - 0.417) / 0.583) * 0.2185 : 0.094;

/** Two camps: the monsters' rise on the far half (small x + y), the player's lower one on the near half. */
const dune = (x, y) =>
  3 + 31 * Math.exp(-((x + 14) ** 2 + (y + 20) ** 2) / 260) + 13 * Math.exp(-((x - 22) ** 2 + (y - 14) ** 2) / 200);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 2.36);
  const box = [];
  for (let k = 0; k < 6; k++) box.push([BR * Math.cos((30 + 60 * k) * RAD), BR * Math.sin((30 + 60 * k) * RAD), -PB]);
  fit(C, box.concat([[-25, -43, HMAX], [-50, 0, HMAX], [25, -43, HMAX]]), 200, 166);
  const P = proj(C), front = facing(C);
  let R = value * CELL * SQ3, over = null;

  const g = mk("g", {}, svg);
  put(solid(g), prism(P, front, hexRing(BR, 10), hexRing(BR - 2.4, 8), -PB, 0));
  mk("path", { class: "dash nf", d: poly(ringAt(P, hexRing(BR - 6, 7), 0)) }, g); // the ring the cells stand in

  // The cells, by axial coordinates within 3 of the centre, appended by ascending x + y: back to front.
  const cells = [];
  for (let q = -N; q <= N; q++) for (let r = -N; r <= N; r++) {
    if (Math.abs(q + r) > N) continue;
    const x = CELL * SQ3 * (q + r / 2), y = CELL * 1.5 * r;
    cells.push({ q, r, x, y, h0: dune(x, y) });
  }
  cells.sort((a, b) => a.x + a.y - (b.x + b.y));
  for (const c of cells) {
    c.ring = hexRing(CELL - 1.2, 2.4, c.x, c.y);
    c.inner = hexRing(CELL - 2.3, 1.6, c.x, c.y);
    c.sp = spring(c.h0, { eps: 0.04 });
    c.el = solid(g);
    c.drawn = NaN;
  }

  // The mark: a flower of seven dots on one lid, moved in the paint order to just after its cell.
  const mark = mk("g", {}, g), md = [];
  for (let k = 0; k < 7; k++) md.push(flatDot(mark, C, 0.6, k === 0 ? "dot" : "dot m"));
  const peak = cells.reduce((a, b) => (b.h0 > a.h0 ? b : a));
  let mc = null, want = peak;

  function drawMark() {
    if (want !== mc) { mc = want; mc.el.g.after(mark); }
    const h = Math.max(0.6, mc.sp.x);
    md.forEach((el, k) => {
      const a = (k - 1) * 60 * RAD, d = k === 0 ? 0 : 2.7;
      place(el, P(mc.x + d * Math.cos(a), mc.y + d * Math.sin(a), h));
    });
  }
  // A cell whose spring hasn't moved keeps its paths: most of the 37 are still on most frames.
  function drawCell(c) {
    const h = Math.max(0.6, c.sp.x);
    if (h === c.drawn) return;
    c.drawn = h;
    put(c.el, prism(P, front, c.ring, c.inner, 0, h));
    c.el.sil.classList.toggle("hi", h > HMAX * 0.6);
  }

  const B = register(stage, (dt) => {
    let m = false;
    for (const c of cells) { if (stepS(c.sp, dt)) m = true; drawCell(c); }
    drawMark();
    return m;
  });
  bag.add(B.unregister);

  /** The cell whose centre is nearest a ground point, or null off the board. */
  const cellAt = (w) => {
    let best = null, bd = CELL * 1.05;
    for (const c of cells) {
      const d = Math.hypot(c.x - w[0], c.y - w[1]);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  };

  function retarget() {
    for (const c of cells) c.sp.t = over ? HMAX * falloff(Math.hypot(c.x - over[0], c.y - over[1]) / R) : c.h0;
    const c = over && cellAt(over);
    want = c || peak;
    read.textContent = c ? `hex ${c.q + N}·${c.r + N}` : "rest";
    B.wake();
  }

  bag.add(pointer(stage, {
    move: (p) => { const w = unproj(C, p[0], p[1], 0); over = cellAt(w) ? w : null; retarget(); },
    leave: () => { over = null; retarget(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { R = v * CELL * SQ3; if (over) retarget(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "plateau",
  means: "Le plateau d'arène : les cases hexagonales se soulèvent sous le pointeur et retombent avec la distance.",
  rules: [1, 3, 5, 9],
  range: [1.2, 2, 3.2],
  mount,
});
