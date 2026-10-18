/**
 * Codex: the bestiary of Hexaria, an open book lying on the table, nine leaves
 * turning about its spine. The pointer picks a leaf: it stands up, the leaves
 * before it fall to the left and the ones after it to the right, fanned and
 * staggered outwards from it on the 700ms lift curve. Each leaf carries what a
 * bestiary page has: a framed plate and four lines of text. At rest one leaf
 * is caught mid-turn, and it is the bright one. A ribbon hangs from the spine.
 * The slider is the stagger, in ms.
 *
 * The pattern: discrete items. Tweens, a stagger by distance, a hit test on
 * static bands across the book, and paint order recomputed from the angles.
 */
const {
  Cam, clamp, fillet, fit, mk, open, pointer, poly, prism, proj, put, rad, register, rings, rrect, seg, solid,
  tdone, tset, tval, tween, facing, disposer,
} = HL;

const N = 9, W = 56, D = 74, ZP = 7, TV = 39.25; // TV: the angle, about the spine, at which the camera looks along a leaf
const REST = [177, 174.5, 172, 169.5, 124, 12, 9, 6.5, 4];
const SHAPE = fillet([[0, -D / 2], [W, -D / 2], [W, D / 2], [0, D / 2]], [0.6, 3.2, 3.2, 0.6]);

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let stag = value;
  const C = Cam(45, 0.5, 1.92);
  fit(C, [[-W - 3, -D / 2 - 3, 0], [W + 3, D / 2 + 3, 0], [W + 3, -D / 2 - 3, 0], [-W - 3, D / 2 + 3, 0], [0, -D / 2, ZP + W], [0, D / 2 + 9, 0]], 200, 168);
  const P = proj(C), front = facing(C);
  /** A point of a leaf turned th degrees: u from the spine across the page, v along it. */
  const L = (th, u, v) => P(u * Math.cos(rad(th)), v, ZP + u * Math.sin(rad(th)));

  const g = mk("g", {}, svg);
  // the covers and the hinge, then the two blocks of pages lying under the leaves
  for (const [x0, x1] of [[-W - 3, -0.8], [0.8, W + 3]]) {
    const [r, i] = rings(x0, -D / 2 - 3, x1, D / 2 + 3, 3.2, 1);
    put(solid(g), prism(P, front, r, i, 0, 1.8));
  }
  const [hr, hi] = rings(-2.6, -D / 2 - 3, 2.6, D / 2 + 3, 2.4, 0.8);
  put(solid(g), prism(P, front, hr, hi, -0.6, 2.6));
  for (const [x0, x1] of [[-W + 0.5, -1.2], [1.2, W - 0.5]]) {
    const [r, i] = rings(x0, -D / 2 + 0.5, x1, D / 2 - 0.5, 2.6, 0.9);
    const b = solid(g);
    put(b, prism(P, front, r, i, 1.8, ZP - 0.4));
    // the edges of the pages, three dim lines along the near side of the block
    const xs = [x0 + 3, x1 - 3];
    mk("path", { class: "nf lo", d: [3.4, 4.6, 5.8].map((z) => seg(P(xs[0], D / 2 - 0.5, z), P(xs[1], D / 2 - 0.5, z))).join("") }, g);
  }

  const lg = mk("g", {}, g), leaves = [];
  for (let i = 0; i < N; i++) {
    const grp = mk("g", {}, lg);
    leaves.push({
      i, grp, face: mk("path", { class: "sil" }, grp), plate: mk("path", { class: "nf lo" }, grp), text: mk("path", { class: "nf lo" }, grp),
      a: tween(REST[i]), drawn: NaN,
    });
  }

  // the ribbon, out of the spine's near end and down onto the table
  const rib = (dx) => open([P(dx, D / 2 + 0.6, ZP - 0.3), P(dx + 0.6, D / 2 + 2.4, 3.5), P(dx + 1.8, D / 2 + 5, 0.3), P(dx + 3.4, D / 2 + 10.5, 0.1)]);
  mk("path", { class: "nf", d: rib(-1.3) + rib(1.3) + seg(P(2.1, D / 2 + 10.5, 0.1), P(4.7, D / 2 + 10.5, 0.1)) }, g);

  function draw(lf, th) {
    lf.face.setAttribute("d", poly(SHAPE.map((p) => L(th, p[0], p[1]))));
    const pl = rrect(9, -D / 2 + 8, W - 9, -D / 2 + 31, 2.4, 3).map((q) => L(th, q.u, q.v));
    lf.plate.setAttribute("d", poly(pl));
    lf.text.setAttribute("d", [0, 1, 2, 3].map((k) => seg(L(th, 9, -D / 2 + 40 + k * 7.5), L(th, k === 3 ? W - 24 : W - 9, -D / 2 + 40 + k * 7.5))).join(""));
  }

  // Paint order: the farther a leaf's angle from the one the camera looks along, the farther back it is.
  let order = "";
  function sortLeaves(ths) {
    const idx = leaves.map((_, i) => i).sort((a, b) => Math.abs(ths[b] - TV) - Math.abs(ths[a] - TV));
    const key = idx.join(",");
    if (key === order) return;
    order = key;
    for (const i of idx) lg.appendChild(leaves[i].grp);
  }

  const B = register(stage, (_dt, now) => {
    let moving = false;
    const ths = leaves.map((lf) => tval(lf.a, now));
    sortLeaves(ths);
    leaves.forEach((lf, i) => {
      if (!tdone(lf.a, now)) moving = true;
      if (ths[i] !== lf.drawn) { lf.drawn = ths[i]; draw(lf, ths[i]); }
    });
    return moving;
  });
  bag.add(B.unregister);

  // Hit bands: N static strips across the book's width on screen, inside the box the book can ever fill.
  const xl = P(-W * 0.82, 0, ZP)[0], xr = P(W * 0.82, 0, ZP)[0];
  const box = [[-W - 3, -D / 2 - 3, 0], [W + 3, D / 2 + 3, 0], [W + 3, -D / 2 - 3, 0], [-W - 3, D / 2 + 3, 0], [0, -D / 2, ZP + W], [0, D / 2, ZP + W]].map((p) => P(...p));
  const [bx0, bx1] = [Math.min(...box.map((p) => p[0])), Math.max(...box.map((p) => p[0]))];
  const [by0, by1] = [Math.min(...box.map((p) => p[1])), Math.max(...box.map((p) => p[1]))];
  const hit = ([x, y]) => (x < bx0 || x > bx1 || y < by0 || y > by1 ? -1 : clamp(Math.floor(((x - xl) / (xr - xl)) * N), 0, N - 1));

  let act = -1;
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), from = a >= 0 ? a : act;
    act = a;
    leaves.forEach((lf, i) => {
      const th = a < 0 ? REST[i] : i === a ? 92 : i < a ? Math.min(177, 150 + (a - 1 - i) * 4.5) : Math.max(4, 30 - (i - a - 1) * 4.5);
      tset(lf.a, th, now, Math.abs(i - from) * stag);
      lf.face.classList.toggle("hi", a < 0 ? i === 4 : i === a);
    });
    read.textContent = a < 0 ? "rest" : "p. " + String(a + 1).padStart(2, "0");
    B.wake();
  }
  leaves[4].face.classList.add("hi");

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return { set: (v) => { stag = v; }, destroy: bag.dispose };
}

hairline({
  name: "codex",
  means: "Le Codex ouvert sur la table : la page sous le pointeur se dresse et les autres s'écartent tour à tour.",
  rules: [1, 2, 6, 8, 10],
  range: [0, 40, 90],
  mount,
});
