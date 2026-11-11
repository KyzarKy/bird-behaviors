import { useEffect, useRef } from 'react';
import type { Bird } from '../birds/core/Bird';
import { STAGE } from '../birds/core/World';
import { drawBird } from '../render/drawBird';
import { drawBackdrop, drawForeground } from '../render/drawWorld';

const HEIGHT = STAGE.top - STAGE.bottom;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

interface Props {
  bird: Bird;
  /** Simulation speed multiplier; 0 pauses. */
  speed: number;
  closeUp: boolean;
  onBehaviorChange: (key: string | null) => void;
}

/** Owns the animation loop: steps the simulation and paints it. */
export function Stage({ bird, speed, closeUp, onBehaviorChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Read through a ref so changing controls does not restart the loop.
  const live = useRef({ speed, closeUp, onBehaviorChange });
  live.current = { speed, closeUp, onBehaviorChange };

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
      const dt = real * live.current.speed;
      if (dt > 0) {
        bird.world.step(dt);
        bird.update(dt);
      }
      if (bird.current !== shown) live.current.onBehaviorChange((shown = bird.current));

      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round((canvas.clientWidth * dpr * HEIGHT) / STAGE.width);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      if (!w) return;

      // Camera: ease toward the bird, never showing past the edge of the stage.
      cam.zoom += ((live.current.closeUp ? 2.4 : 1) - cam.zoom) * Math.min(1, real * 4);
      const halfW = STAGE.width / 2 / cam.zoom;
      const halfH = HEIGHT / 2 / cam.zoom;
      const follow = Math.min(1, real * 5);
      cam.x += (bird.pos.x - cam.x) * follow;
      cam.y += (bird.pos.y + bird.size * 0.5 - cam.y) * follow;
      cam.x = clamp(cam.x, halfW, STAGE.width - halfW);
      cam.y = clamp(cam.y, STAGE.bottom + halfH, STAGE.top - halfH);

      const k = (w / STAGE.width) * cam.zoom;
      ctx.setTransform(k, 0, 0, -k, w / 2 - cam.x * k, h / 2 + cam.y * k);
      drawBackdrop(ctx, bird.world);
      drawBird(ctx, bird);
      drawForeground(ctx, bird.world);

      if (bird.pose.speech) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const cssW = w / dpr;
        ctx.font = '600 14px system-ui, sans-serif';
        const tw = ctx.measureText(bird.pose.speech).width + 16;
        const sx = clamp((w / 2 + (bird.pos.x - cam.x) * k) / dpr - tw / 2, 4, cssW - tw - 4);
        const sy = Math.max(4, (h / 2 - (bird.pos.y + bird.size * 1.25 - cam.y) * k) / dpr - 26);
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
  }, [bird]);

  return <canvas ref={canvasRef} className="stage" aria-label={`Animated ${bird.world.habitat.name}`} />;
}
