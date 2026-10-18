/**
 * Realm: a hexagonal tile of the Hexaria kingdom holding a clock tower, a small
 * colosseum and a crystal obelisk. The pointer picks one of the three; it rises
 * on the 700ms lift curve while the other two slide away along the ground,
 * staggered outwards from the one chosen. The pick is tested against each
 * building's rest pose. The slider is the lift, in world units.
 *
 * The pattern: discrete items. Tweens, a stagger by distance, a hit test on the
 * rest pose, and a rest that is already a composition (the crystal burns).
 */
const {
  Cam, circ, facing, fillet, fit, hull, mk, open, place, pointer, poly, prism, proj, put, register, ringAt, rrect, run, seg,
  solid, tdone, tset, tval, tween, unproj, disposer,
} = HL;

const RAD = Math.PI / 180, PUSH = 9, STEP = 55;

/** A rounded hexagon as ring samples, with outward normals from the neighbouring points. */
function hexRing(R, rc) {
  const v = [];
  for (let k = 0; k < 6; k++) v.push([R * Math.cos((30 + 60 * k) * RAD), R * Math.sin((30 + 60 * k) * RAD)]);
  const pts = fillet(v, v.map(() => rc), 4);
  return pts.map((p, i) => {
    const a = pts[(i + pts.length - 1) % pts.length], b = pts[(i + 1) % pts.length];
    const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1;
    return { u: p[0], v: p[1], nu: ty / l, nv: -tx / l };
  });
}
const at = (ring, x, y) => ring.map((q) => ({ ...q, u: q.u + x, v: q.v + y }));
const sq = (x, y, h, r) => rrect(x - h, y - h, x + h, y + h, r);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 2.0);
  fit(C, [[-64, -64, -7], [64, 64, -7], [64, -64, -7], [-64, 64, -7], [-27, -14, 96], [31, -22, 84]], 200, 168);
  const P = proj(C), front = facing(C);
  let L = value, chosen = null;

  const g = mk("g", {}, svg);
  put(solid(g), prism(P, front, hexRing(64, 9), hexRing(61, 7), -7, 0));
  mk("path", { class: "dash nf", d: poly(ringAt(P, hexRing(52, 8), 0)) }, g); // the border of the realm

  // ——— the three buildings, painted back to front ———
  const RO = circ(21, 32), RI = circ(16.5, 32);
  const tower = { name: "tower", c: [-27, -14], zmid: 24, reach: 17, body: solid(g), gal: solid(g), roof: solid(g) };
  tower.clock = mk("ellipse", { class: "lo nf", rx: 2.2, ry: 2.9 }, g);
  tower.draw = (x, y, h) => {
    const z1 = h + 44;
    put(tower.body, { sil: poly(hull(ringAt(P, sq(x, y, 7, 3.2), h).concat(ringAt(P, sq(x, y, 4.8, 2.2), z1)))), crease: open(ringAt(P, run(sq(x, y, 3.6, 1.4), front), z1)) });
    put(tower.gal, prism(P, front, sq(x, y, 7.2, 3.2), sq(x, y, 5.8, 2), z1, z1 + 3));
    put(tower.roof, { sil: poly(hull(ringAt(P, sq(x, y, 5.2, 2.2), z1 + 3).concat([P(x, y, z1 + 22)]))), crease: seg(P(x, y + 5.2, z1 + 3), P(x, y, z1 + 21)) });
    place(tower.clock, P(x, y + 5.6, h + 31));
  };
  tower.sil = tower.body.sil;

  const crystal = { name: "crystal", c: [31, -22], zmid: 28, reach: 15, body: solid(g) };
  crystal.draw = (x, y, h) => {
    const z1 = h + 36;
    put(crystal.body, {
      sil: poly(hull(ringAt(P, sq(x, y, 5.6, 2.6), h).concat(ringAt(P, sq(x, y, 3.4, 1.6), z1), [P(x, y, h + 55)]))),
      crease: open(ringAt(P, run(sq(x, y, 2.6, 1), front), z1)) + seg(P(x, y + 5.4, h + 1), P(x, y, h + 54)),
    });
  };
  crystal.sil = crystal.body.sil;

  const arena = { name: "arena", c: [6, 28], zmid: 8, reach: 24, body: solid(g) };
  arena.far = mk("path", { class: "lo nf" }, g);
  arena.arches = Array.from({ length: 7 }, () => mk("ellipse", { class: "dot m", rx: 1.2, ry: 1.8 }, g));
  arena.draw = (x, y, h) => {
    const O = at(RO, x, y), I = at(RI, x, y), back = run(I, (q) => !front(q));
    put(arena.body, prism(P, front, O, I, h, h + 15));
    arena.far.setAttribute("d", open(ringAt(P, back, h + 15)) + open(ringAt(P, back, h + 8)));
    arena.arches.forEach((el, k) => {
      const a = (-35 + (k * 160) / 6) * RAD;
      place(el, P(x + 21.3 * Math.cos(a), y + 21.3 * Math.sin(a), h + 7));
    });
  };
  arena.sil = arena.body.sil;

  const S = [tower, crystal, arena];
  for (const s of S) {
    s.lift = tween(0);
    s.slide = tween(0);
    s.dir = [0, 0];
    s.dl = s.ds = NaN;
    s.draw(s.c[0], s.c[1], 0);
  }

  const light = () => S.forEach((s) => s.sil.classList.toggle("hi", chosen ? s === chosen : s === crystal));
  light();

  const B = register(stage, (dt, now) => {
    let moving = false;
    for (const s of S) {
      const l = tval(s.lift, now), k = tval(s.slide, now);
      if (!tdone(s.lift, now) || !tdone(s.slide, now)) moving = true;
      if (l === s.dl && k === s.ds) continue;
      s.dl = l;
      s.ds = k;
      s.draw(s.c[0] + s.dir[0] * k * PUSH, s.c[1] + s.dir[1] * k * PUSH, l * L);
    }
    return moving;
  });
  bag.add(B.unregister);

  function choose(s) {
    if (s === chosen) return;
    chosen = s;
    const now = performance.now();
    const rank = s ? S.filter((t) => t !== s).sort((a, b) => Math.hypot(a.c[0] - s.c[0], a.c[1] - s.c[1]) - Math.hypot(b.c[0] - s.c[0], b.c[1] - s.c[1])) : [];
    for (const t of S) {
      if (t === s) {
        tset(t.lift, 1, now, 0);
        tset(t.slide, 0, now, 0);
      } else if (s) {
        const dx = t.c[0] - s.c[0], dy = t.c[1] - s.c[1], d = Math.hypot(dx, dy) || 1;
        t.dir = [dx / d, dy / d];
        tset(t.slide, 1, now, rank.indexOf(t) * STEP);
        tset(t.lift, 0, now, 0);
      } else {
        tset(t.lift, 0, now, 0);
        tset(t.slide, 0, now, S.indexOf(t) * STEP);
      }
    }
    light();
    read.textContent = s ? s.name : "rest";
    B.wake();
  }

  // The pointer is tested against each building's rest pose, on the plane through its middle.
  const pick = (p) => {
    let best = null, bd = 1e9;
    for (const s of S) {
      const w = unproj(C, p[0], p[1], s.zmid), d = Math.hypot(w[0] - s.c[0], w[1] - s.c[1]);
      if (d < s.reach && d < bd) { bd = d; best = s; }
    }
    return best;
  };
  bag.add(pointer(stage, { move: (p) => choose(pick(p)), leave: () => choose(null) }));
  bag.add(() => svg.replaceChildren());

  return { set: (v) => { L = v; for (const s of S) s.dl = NaN; B.wake(); }, destroy: bag.dispose };
}

hairline({
  name: "realm",
  means: "Un royaume sur sa tuile : le pointeur choisit une bâtisse, qui s'élève pendant que les autres s'écartent.",
  rules: [1, 2, 4, 5, 9],
  range: [8, 16, 26],
  mount,
});
