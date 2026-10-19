import { clearUI, tooltip } from './ui/common';
import { stopTutorial } from './ui/tutorial';

export interface Scene {
  enter(): void;
  exit(): void;
  update(dt: number): void;
  render(ctx: CanvasRenderingContext2D, w: number, h: number): void;
  pointerDown?(x: number, y: number, e: PointerEvent): void;
  pointerMove?(x: number, y: number, e: PointerEvent): void;
  pointerUp?(x: number, y: number, e: PointerEvent): void;
  wheel?(x: number, y: number, dy: number, e: WheelEvent): void;
  key?(e: KeyboardEvent, down: boolean): void;
  resize?(): void;
}

class App {
  canvas = document.getElementById('game') as HTMLCanvasElement;
  ctx = this.canvas.getContext('2d')!;
  w = 0;
  h = 0;
  dpr = 1;
  scene: Scene | null = null;
  private last = 0;

  constructor() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
    const pos = (e: PointerEvent | WheelEvent) => {
      const r = this.canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top] as const;
    };
    this.canvas.addEventListener('pointerdown', (e) => {
      this.canvas.setPointerCapture(e.pointerId);
      const [x, y] = pos(e);
      this.scene?.pointerDown?.(x, y, e);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      const [x, y] = pos(e);
      this.scene?.pointerMove?.(x, y, e);
    });
    this.canvas.addEventListener('pointerup', (e) => {
      const [x, y] = pos(e);
      this.scene?.pointerUp?.(x, y, e);
    });
    this.canvas.addEventListener('pointerleave', () => tooltip.hide());
    this.canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const [x, y] = pos(e);
        this.scene?.wheel?.(x, y, e.deltaY, e);
      },
      { passive: false },
    );
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', (e) => {
      // pas de raccourcis de jeu pendant qu'une fenêtre (événement, Codex, options) est ouverte
      if (document.querySelector('.modal-back') || document.querySelector('.tut:not(.open) .tut-block')) return;
      this.scene?.key?.(e, true);
    });
    window.addEventListener('keyup', (e) => this.scene?.key?.(e, false));
  }

  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.scene?.resize?.();
  }

  setScene(s: Scene) {
    this.scene?.exit();
    stopTutorial();
    clearUI();
    this.scene = s;
    s.enter();
  }

  start() {
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - this.last) / 1000 || 0);
      this.last = now;
      if (this.scene) {
        this.scene.update(dt);
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.scene.render(this.ctx, this.w, this.h);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

export const app = new App();
