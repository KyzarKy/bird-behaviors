import { useEffect, useRef } from 'react';
import type { Flock } from '../birds/core/Flock';
import { STAGE } from '../birds/core/World';
import { drawBird } from '../render/drawBird';
import { drawFoodBack, drawFoodFront } from '../render/drawFood';
import { drawBackdrop, drawForeground } from '../render/drawWorld';

const HEIGHT = STAGE.top - STAGE.bottom;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

interface Props {
  /** One bird, or a flock. */
  flock: Flock;
  /** Zoom in on a single bird. A flock is always framed whole. */
  closeUp: boolean;
  onBehaviorChange: (key: string | null) => void;
}

/** Owns the animation loop: steps the simulation and paints it. */
export function Stage({ flock, closeUp, onBehaviorChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Read through a ref so changing controls does not restart the loop.
  const live = useRef({ closeUp, onBehaviorChange });
  live.current = { closeUp, onBehaviorChange };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const cam = { x: STAGE.width / 2, y: STAGE.bottom + HEIGHT / 2, zoom: 1 };
    let last = performance.now();
    let shown: string | null | undefined;
    let raf = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const real = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (real > 0) flock.update(real);
      const bird = flock.lead;
      const world = bird.world;
      if (bird.current !== shown) live.current.onBehaviorChange((shown = bird.current));

      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round((canvas.clientWidth * dpr * HEIGHT) / STAGE.width);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      if (!w) return;

      // Camera: ease toward the bird, or toward a frame that holds the whole flock, never showing past the edge of the stage.
      const aim = flock.on ? frameAll(flock) : { x: bird.pos.x, y: bird.pos.y + bird.size * 0.5, zoom: live.current.closeUp ? 2.4 : 1 };
      cam.zoom += (aim.zoom - cam.zoom) * Math.min(1, real * 4);
      const halfW = STAGE.width / 2 / cam.zoom;
      const halfH = HEIGHT / 2 / cam.zoom;
      const follow = Math.min(1, real * 5);
      cam.x += (aim.x - cam.x) * follow;
      cam.y += (aim.y - cam.y) * follow;
      cam.x = clamp(cam.x, halfW, STAGE.width - halfW);
      cam.y = clamp(cam.y, STAGE.bottom + halfH, STAGE.top - halfH);

      const k = (w / STAGE.width) * cam.zoom;
      ctx.setTransform(k, 0, 0, -k, w / 2 - cam.x * k, h / 2 + cam.y * k);
      drawBackdrop(ctx, world);
      drawFoodBack(ctx, world);
      for (const b of flock.birds) {
        drawBird(ctx, b);
        for (const other of b.party) drawBird(ctx, other);
      }
      drawFoodFront(ctx, world);
      drawForeground(ctx, world);

      // In a flock several may call at once: a bubble that would cover one already drawn is left out.
      const bubbles: [number, number, number][] = [];
      for (const bird of flock.birds) {
        if (!bird.pose.speech) continue;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const cssW = w / dpr;
        ctx.font = '600 14px system-ui, sans-serif';
        const tw = ctx.measureText(bird.pose.speech).width + 16;
        const sx = clamp((w / 2 + (bird.pos.x - cam.x) * k) / dpr - tw / 2, 4, cssW - tw - 4);
        const sy = Math.max(4, (h / 2 - (bird.pos.y + bird.size * 1.25 - cam.y) * k) / dpr - 26);
        if (bubbles.some(([x, y, wd]) => sx < x + wd && x < sx + tw && Math.abs(sy - y) < 24)) continue;
        bubbles.push([sx, sy, tw]);
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(sx, sy, tw, 24, 8);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#222';
        ctx.textBaseline = 'middle';
        ctx.fillText(bird.pose.speech, sx + 8, sy + 12.5);
      }
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [flock]);

  return <canvas ref={canvasRef} className="block aspect-[100/62] w-full rounded-2xl border border-border bg-muted" aria-label={`Animated ${flock.lead.world.habitat.name}`} />;
}

/**
 * Center and zoom that hold every bird in the flock, with a margin of a couple of body lengths so birds
 * moving fast stay in view while the camera catches up. Never closer than zoom 2, so a flock reads as a flock.
 */
function frameAll(flock: Flock) {
  let [x0, x1, y0, y1] = [Infinity, -Infinity, Infinity, -Infinity];
  for (const b of flock.birds) {
    x0 = Math.min(x0, b.pos.x - b.size * 2);
    x1 = Math.max(x1, b.pos.x + b.size * 2);
    y0 = Math.min(y0, b.pos.y - b.size);
    y1 = Math.max(y1, b.pos.y + b.size * 2.5);
  }
  const zoom = clamp(Math.min(STAGE.width / (x1 - x0), HEIGHT / (y1 - y0)), 1, 2);
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, zoom };
}
