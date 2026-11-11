/**
 * Draws a Habitat from its data. Expects a y-up context scaled to stage units.
 * drawBackdrop goes under the bird, drawForeground over it.
 */
import { STAGE, type World } from '../birds/core/World';
import { drawItem } from './drawBird';

const TAU = Math.PI * 2;
type Ctx = CanvasRenderingContext2D;

export function drawBackdrop(ctx: Ctx, world: World) {
  const h = world.habitat;
  const { width, top, bottom } = STAGE;

  const sky = ctx.createLinearGradient(0, top, 0, 0);
  sky.addColorStop(0, '#9cc4e4');
  sky.addColorStop(1, '#e6f1f7');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, top);

  if (h.water) {
    // Far shore across the bay.
    ctx.fillStyle = '#7f9aa6';
    ctx.beginPath();
    ctx.moveTo(h.water.from, 2);
    ctx.quadraticCurveTo(75, 7, 100, 4);
    ctx.lineTo(100, 0);
    ctx.lineTo(h.water.from, 0);
    ctx.fill();
  } else {
    // Distant tree line.
    ctx.fillStyle = '#a9c4b0';
    for (let x = -2; x < width + 6; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x - 4, 0);
      ctx.lineTo(x, 9 + ((x * 7) % 5));
      ctx.lineTo(x + 4, 0);
      ctx.fill();
    }
  }

  for (const f of h.foliage) if (!f.front) blob(ctx, f);

  ctx.lineCap = 'round';
  for (const t of h.trunks) {
    ctx.fillStyle = t.color;
    ctx.fillRect(t.x - t.width / 2, 0, t.width, t.top - 0.6);
    ctx.beginPath();
    ctx.moveTo(t.x - t.width / 2, t.top - 0.7);
    ctx.lineTo(t.x - t.width * 0.1, t.top);
    ctx.lineTo(t.x + t.width / 2, t.top - 0.7);
    ctx.fill();
  }
  ctx.strokeStyle = '#5f4a3a';
  for (const [x1, y1, x2, y2, w] of h.limbs) {
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  for (const f of h.foliage) if (f.front) blob(ctx, f);

  // Flower stems and blossoms.
  for (const q of h.perches) {
    if (q.kind !== 'flower') continue;
    ctx.strokeStyle = '#3f6f3c';
    ctx.lineWidth = 0.18;
    ctx.beginPath();
    ctx.moveTo(q.x + 0.6, q.y - 3.5);
    ctx.quadraticCurveTo(q.x + 0.5, q.y - 1, q.x, q.y);
    ctx.stroke();
    ctx.fillStyle = '#d6336c';
    for (const [dx, dy] of [[0, 0], [-0.5, -0.55], [0.5, -0.5], [0, -1.05]]) {
      ctx.beginPath();
      ctx.arc(q.x + dx, q.y + dy, 0.42, 0, TAU);
      ctx.fill();
    }
  }

  // Ground. Under water it slopes away as the seabed.
  ctx.fillStyle = h.ground === 'grass' ? '#6f9a54' : '#d9c8a0';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let x = 0; x <= width; x += 2) ctx.lineTo(x, world.floorY(x));
  ctx.lineTo(width, bottom);
  ctx.lineTo(0, bottom);
  ctx.fill();
  ctx.fillStyle = h.ground === 'grass' ? '#5e8747' : '#c9b78d';
  ctx.fillRect(0, bottom, width, -bottom - 3.5);

  if (h.litter) {
    const [from, to] = h.litter;
    for (let i = 0, x = from; x < to; x += 0.55, i++) {
      ctx.fillStyle = ['#a8763e', '#8c5a2b', '#c08a4a'][i % 3];
      ctx.beginPath();
      ctx.ellipse(x, 0.12 + ((i * 3) % 4) * 0.07, 0.5, 0.16, (i % 5) * 0.4, 0, TAU);
      ctx.fill();
    }
  }

  for (const o of h.props) {
    if (o.kind === 'rock') {
      ctx.fillStyle = '#8b8d8f';
      ctx.beginPath();
      ctx.ellipse(o.x, o.y, o.w / 2, o.h, 0, Math.PI, 0, true);
      ctx.fill();
    } else {
      ctx.fillStyle = o.kind === 'log' ? '#b8a88e' : '#7a6652';
      ctx.fillRect(o.x - o.w / 2, o.y, o.w, o.h);
    }
  }
}

export function drawForeground(ctx: Ctx, world: World) {
  const water = world.habitat.water;
  if (water) {
    ctx.fillStyle = 'rgba(70, 130, 165, 0.55)';
    ctx.fillRect(water.from, STAGE.bottom, STAGE.width - water.from, -STAGE.bottom);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 0.15;
    ctx.beginPath();
    ctx.moveTo(water.from, 0);
    ctx.lineTo(STAGE.width, 0);
    ctx.stroke();
  }

  for (const p of world.particles) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.globalAlpha = Math.min(1, p.life * 3);
    switch (p.kind) {
      case 'dust':
        dot(ctx, '#b79f7a', 0.3);
        break;
      case 'splash':
        dot(ctx, '#eaf6fb', 0.25);
        break;
      case 'chip':
        dot(ctx, '#a08060', 0.18);
        break;
      case 'leaf':
        ctx.fillStyle = '#a8763e';
        ctx.beginPath();
        ctx.ellipse(0, 0, 0.45, 0.18, p.life * 9, 0, TAU);
        ctx.fill();
        break;
      case 'insect':
        // Jitter in place so it reads as something alive.
        ctx.translate(Math.sin(p.life * 31) * 0.3, Math.cos(p.life * 23) * 0.3);
        dot(ctx, '#222', 0.16);
        break;
      default:
        drawItem(ctx, p.kind, 6);
    }
    ctx.restore();
  }
}

function blob(ctx: Ctx, f: { x: number; y: number; r: number; color: string }) {
  ctx.fillStyle = f.color;
  ctx.beginPath();
  ctx.arc(f.x, f.y, f.r, 0, TAU);
  ctx.fill();
}

function dot(ctx: Ctx, color: string, r: number) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
}
