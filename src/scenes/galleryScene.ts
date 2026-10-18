import type { Scene } from '../app';
import { CREATURES, MONSTERS } from '../data/creatures';
import { ELEMENTS } from '../data/elements';
import { BUILDINGS } from '../data/buildings';
import type { BuildingId } from '../data/types';
import { drawBuilding } from '../render/buildingArt';
import { drawCreature } from '../render/creatureArt';

// Planche de vérification visuelle (ouvrir avec ?gallery) : créatures ★1-3, monstres et bâtiments.
export class GalleryScene implements Scene {
  private t = 0;

  enter() {}

  exit() {}

  update(dt: number) {
    this.t += dt;
  }

  render(ctx: CanvasRenderingContext2D, W: number, H: number) {
    ctx.fillStyle = '#0d1a17';
    ctx.fillRect(0, 0, W, H);
    const q = new URLSearchParams(location.search);
    const z = Number(q.get('z') ?? 1);
    const ox = Number(q.get('x') ?? 0);
    const oy = Number(q.get('y') ?? 0);
    ctx.scale(z, z);
    ctx.translate(-ox, -oy);
    ctx.font = '600 11px "Alegreya Sans", sans-serif';
    ctx.textAlign = 'center';
    const cw = 90;
    CREATURES.forEach((c, i) => {
      const col = i % 8;
      const row = Math.floor(i / 8);
      const x0 = 30 + col * cw * 1.75;
      const y0 = 90 + row * 250;
      for (let st = 1; st <= 3; st++) {
        const y = y0 + (st - 1) * 78;
        drawCreature(ctx, c.look, x0 + 60, y, 34, { t: this.t, facing: 1, star: st });
        ctx.fillStyle = ELEMENTS[c.element].glow;
        ctx.fillText(c.names[st - 1], x0 + 60, y + 14);
      }
    });
    const mons = Object.values(MONSTERS);
    mons.forEach((m, i) => {
      const x = 80 + i * 150;
      const y = H - 210;
      drawCreature(ctx, m.look, x, y, 34 * Math.min(m.scale, 2), { t: this.t, facing: 1 });
      ctx.fillStyle = '#ffb0a0';
      ctx.fillText(m.name, x, y + 16);
    });
    (Object.keys(BUILDINGS) as BuildingId[]).forEach((id, i) => {
      const x = 60 + i * 86;
      const y = H - 40;
      drawBuilding(ctx, id, x, y, 40, { done: true, t: this.t, waterDir: 1 });
      ctx.fillStyle = '#e6e1d3';
      ctx.fillText(BUILDINGS[id].name, x, y + 26);
    });
  }
}
