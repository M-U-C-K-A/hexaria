/**
 * Œuf: a mystery egg in its nest, the little surprise of Hexaria. The nearer
 * the pointer comes to the egg, the further it hatches, on a spring: the shell
 * splits along its zigzag crack, the cap lifts and tips back, and a small
 * creature with two pointed ears rises out of it. At rest the egg is already
 * ajar and the crack is bright; once the creature is up, the bright goes to it.
 * The slider is how high the cap lifts, in world units.
 *
 * The pattern: scrub. One spring for the opening, a hit test on the egg's rest
 * centre (which never moves), and paint order that keeps the shell honest:
 * nest, shell, the opening, the creature, the shell's near wall, the cap.
 */
const {
  Cam, circ, clamp, fit, hull, mk, open, place, pointer, poly, proj, register, ringAt, run, facing,
  spring, stepS, disposer,
} = HL;

const RAD = Math.PI / 180, ZB = 4, EH = 50, ER = 17, TC = 29, ZN = 28, REST = 0.13, HR = 7.2;
/** The egg's radius t units above its foot: a short round bottom and a long pointed top. */
const prof = (t) => ER * Math.sqrt(Math.max(0, 1 - ((t - 20) / (t < 20 ? 20 : 30)) ** 2));
const at = (a, t) => [prof(t) * Math.cos(a), prof(t) * Math.sin(a), ZB + t];
const ring = (t, n = 28) => Array.from({ length: n }, (_, k) => at((k / n) * 2 * Math.PI, t));
/** The crack: a ring whose samples zig up and down by two units. */
const ZZ = Array.from({ length: ZN }, (_, k) => at((k / ZN) * 2 * Math.PI, TC + (k % 2 ? 2 : -2)));
const LOW = [0.8, 3, 6, 10, 15, 20, 25].map((t) => ring(t)).flat();
const CAP = [33, 37, 41, 45, 48.6].map((t) => ring(t)).flat();
/** Speckles on the shell, on the side that faces the camera: [angle, height]. */
const SPOTS = [[20, 9], [62, 14], [38, 21], [80, 24], [8, 23]], CAPSPOTS = [[30, 37], [66, 41], [48, 45]];

/** Rotates a world point about the horizontal axis (1, -1, 0) through the crack's centre, then lifts it. */
function lid(p, o, L) {
  const ph = -o * 30 * RAD, c = Math.cos(ph), s = Math.sin(ph), k = [Math.SQRT1_2, -Math.SQRT1_2, 0];
  const v = [p[0], p[1], p[2] - (ZB + TC)], d = k[0] * v[0] + k[1] * v[1];
  const x = [k[1] * v[2], -k[0] * v[2], k[0] * v[1] - k[1] * v[0]];
  const r = v.map((q, i) => q * c + x[i] * s + k[i] * d * (1 - c));
  return [r[0] - o * 3, r[1] - o * 3, r[2] + ZB + TC + o * L];
}

/** A run of points ordered left to right on screen. */
const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  let L = value;
  const C = Cam(45, 0.5, 2.95);
  fit(C, [[-30, -30, 0], [30, 30, 0], [30, -30, 12], [-30, 30, 12], [0, 0, ZB + EH], lid([0, 0, ZB + EH], 1, 34), lid([-ER, ER, ZB + TC], 1, 34)], 200, 164);
  const P = proj(C), front = facing(C);
  const PP = (pts) => pts.map((p) => P(...p));
  const isFront = (i) => front({ nu: Math.cos((i / ZN) * 2 * Math.PI), nv: Math.sin((i / ZN) * 2 * Math.PI) });

  // ——— the nest: a woven bowl, its far rim, then (after the egg) its near wall ———
  const base = circ(22, 32), outer = circ(30, 32), inner = circ(26.5, 32);
  const g = mk("g", {}, svg);
  const nestSil = poly(hull(ringAt(P, base, 0).concat(ringAt(P, outer, 12))));
  mk("path", { class: "sil", d: nestSil }, g);
  mk("path", { class: "lo", d: poly(ringAt(P, inner, 12)) }, g);
  mk("path", { class: "nf lo", d: open(ringAt(P, run(circ(21, 32), (q) => !front(q)), 6)) }, g);

  // ——— the egg ———
  const shell = mk("path", { class: "sil" }, g);
  const hole = mk("path", { class: "lo" }, g);
  const ears = [mk("path", { class: "sil" }, g), mk("path", { class: "sil" }, g)];
  const head = mk("path", { class: "sil" }, g);
  const eyes = [mk("circle", { r: 1.3, class: "dot m" }, g), mk("circle", { r: 1.3, class: "dot m" }, g)];
  const near = mk("path", { class: "fo" }, g), wall = mk("path", { class: "nf sil" }, g), lip = mk("path", { class: "nf sil" }, g);
  const spots = SPOTS.map(() => mk("circle", { r: 1.1, class: "dot off" }, g));
  const cap = mk("path", { class: "sil" }, g), capEdge = mk("path", { class: "nf" }, g);
  const capSpots = CAPSPOTS.map(() => mk("circle", { r: 1.1, class: "dot off" }, g));

  // ——— the nest's near wall, over the egg's foot ———
  const iF = LR(ringAt(P, run(inner, front), 12)), oT = ringAt(P, outer, 12), bF = LR(ringAt(P, run(base, front), 0));
  const oL = oT.reduce((a, b) => (b[0] < a[0] ? b : a)), oR = oT.reduce((a, b) => (b[0] > a[0] ? b : a));
  mk("path", { class: "fo", d: poly([...iF, oR, ...bF.slice().reverse(), oL]) }, g);
  mk("path", { class: "nf", d: open(iF) }, g);
  mk("path", { class: "nf sil", d: nestSil }, g);
  const twigs = [];
  for (let k = 0; k < 7; k++) {
    const a = (8 + k * 12.5) * RAD, b = a + 9 * RAD;
    twigs.push(open([P(23.4 * Math.cos(a), 23.4 * Math.sin(a), 2.5), P(28.3 * Math.cos(b), 28.3 * Math.sin(b), 9.5)]));
  }
  mk("path", { class: "nf lo", d: twigs.join("") }, g);

  // The bottom shell never moves: its outline is the crack's far run over the lower chain of its hull.
  const low = hull(PP(LOW.concat(ZZ)));
  const yL = low.reduce((a, b) => (b[0] < a[0] ? b : a)), yR = low.reduce((a, b) => (b[0] > a[0] ? b : a));
  const lineY = (p) => yL[1] + ((p[0] - yL[0]) / (yR[0] - yL[0] || 1)) * (yR[1] - yL[1]);
  const lowChain = low.filter((p) => p[1] >= lineY(p) - 0.01).sort((a, b) => b[0] - a[0]);
  const zz = PP(ZZ), zzBack = LR(run(zz.map((p, i) => ({ p, i })), (q) => !isFront(q.i)).map((q) => q.p));
  const zzFront = LR(run(zz.map((p, i) => ({ p, i })), (q) => isFront(q.i)).map((q) => q.p));
  shell.setAttribute("d", poly([...zzBack, ...lowChain]));
  hole.setAttribute("d", poly(zz));
  near.setAttribute("d", poly([...zzFront, ...lowChain]));
  lip.setAttribute("d", open(zzFront));
  wall.setAttribute("d", open([zzFront[zzFront.length - 1], ...lowChain, zzFront[0]]));
  const spot = (a, t) => at((a + 20) * RAD, t);
  spots.forEach((el, k) => place(el, P(...spot(SPOTS[k][0], SPOTS[k][1]))));

  const sp = spring(REST, { eps: 0.002 });
  let drawn = NaN;
  function draw(o) {
    // the cap, tipped and lifted
    const cz = PP(ZZ.map((p) => lid(p, o, L)));
    cap.setAttribute("d", poly(hull(cz.concat(PP(CAP.map((p) => lid(p, o, L)))))));
    capEdge.setAttribute("d", open(LR(run(cz.map((p, i) => ({ p, i })), (q) => isFront(q.i)).map((q) => q.p))));
    capSpots.forEach((el, k) => place(el, P(...lid(spot(CAPSPOTS[k][0], CAPSPOTS[k][1]), o, L))));
    // the creature, rising out of the shell
    const hz = ZB + TC - 11 + o * L * 0.45, R = HR * C.S;
    const c = P(0, 0, hz), circle = Array.from({ length: 40 }, (_, k) => [c[0] + R * Math.cos((k / 40) * 2 * Math.PI), c[1] + R * Math.sin((k / 40) * 2 * Math.PI)]);
    head.setAttribute("d", poly(circle));
    [-1, 1].forEach((sd, k) => {
      const a = (45 + sd * 62) * RAD, e = (v, z) => P(v * Math.cos(a), v * Math.sin(a), hz + z);
      ears[k].setAttribute("d", poly(hull([e(HR * 0.3, HR * 0.85), e(HR * 0.85, HR * 0.4), e(HR * 0.6, HR * 1.0), e(HR * 0.95, HR * 1.5)])));
      place(eyes[k], P(HR * 0.86 * Math.cos((45 + sd * 26) * RAD), HR * 0.86 * Math.sin((45 + sd * 26) * RAD), hz + 1.2));
    });
    const up = o > 0.55;
    head.classList.toggle("hi", up);
    ears.forEach((el) => el.classList.toggle("hi", up));
    lip.classList.toggle("hi", !up);
    capEdge.classList.toggle("hi", !up);
  }

  const B = register(stage, (dt) => {
    const m = stepS(sp, dt);
    const o = clamp(sp.x, 0, 1.05);
    if (o !== drawn) { drawn = o; draw(o); }
    return m;
  });
  bag.add(B.unregister);

  // The egg answers to the pointer's distance from its rest centre, which never moves.
  const mid = P(0, 0, ZB + 26);
  function aim(p) {
    if (!p) { sp.t = REST; read.textContent = "rest"; return B.wake(); }
    const o = clamp(1 - (Math.hypot(p[0] - mid[0], p[1] - mid[1]) - 26) / 120, 0, 1);
    sp.t = Math.max(REST, o);
    read.textContent = `éclos ${String(Math.round(o * 100)).padStart(2, "0")}`;
    B.wake();
  }
  bag.add(pointer(stage, { move: aim, leave: () => aim(null) }));
  bag.add(() => svg.replaceChildren());

  return { set: (v) => { L = v; drawn = NaN; B.wake(); }, destroy: bag.dispose };
}

hairline({
  name: "oeuf",
  means: "Un œuf mystérieux dans son nid : plus le pointeur approche, plus il éclot, et une petite créature en sort.",
  rules: [1, 4, 5, 6, 8],
  range: [16, 24, 34],
  mount,
});
