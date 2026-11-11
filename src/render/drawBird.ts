/**
 * Draws any Bird from its Look (proportions and colors) and Pose (what it is
 * doing this frame). There is no per-species drawing code.
 *
 * Expects a y-up context scaled to stage units.
 */
import type { Bird } from '../birds/core/Bird';
import type { Item, Look } from '../birds/core/traits';

const TAU = Math.PI * 2;
const OUTLINE = 'rgba(0,0,0,0.35)';

type Ctx = CanvasRenderingContext2D;

function shape(ctx: Ctx, fill: string, path: () => void, outline = true) {
  ctx.beginPath();
  path();
  ctx.fillStyle = fill;
  ctx.fill();
  if (outline) ctx.stroke();
}

export function drawItem(ctx: Ctx, kind: Item | string, s: number) {
  ctx.save();
  ctx.lineWidth = s * 0.02;
  ctx.strokeStyle = OUTLINE;
  switch (kind) {
    case 'worm':
      ctx.strokeStyle = '#c9788a';
      ctx.lineWidth = s * 0.035;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(s * 0.05, -s * 0.12, -s * 0.02, -s * 0.24);
      ctx.stroke();
      break;
    case 'fish':
      shape(ctx, '#aeb9c2', () => ctx.ellipse(0, -s * 0.09, s * 0.04, s * 0.12, 0, 0, TAU));
      shape(ctx, '#aeb9c2', () => {
        ctx.moveTo(0, -s * 0.2);
        ctx.lineTo(s * 0.05, -s * 0.27);
        ctx.lineTo(-s * 0.05, -s * 0.27);
        ctx.closePath();
      });
      break;
    case 'clam':
      shape(ctx, '#d8d2c4', () => ctx.ellipse(0, 0, s * 0.07, s * 0.05, 0, 0, TAU));
      break;
    case 'acorn':
      shape(ctx, '#8a5a2b', () => ctx.arc(0, 0, s * 0.045, 0, TAU));
      break;
    case 'seed':
      shape(ctx, '#3a3530', () => ctx.ellipse(0, 0, s * 0.035, s * 0.02, 0, 0, TAU));
      break;
    default:
      shape(ctx, '#222', () => ctx.arc(0, 0, s * 0.02, 0, TAU), false);
  }
  ctx.restore();
}

function drawWing(ctx: Ctx, color: string, a: number, b: number, span: number, flap: number) {
  let lift = span * Math.sin(flap * 1.2);
  // Edge-on, a set wing still has some visible thickness.
  if (Math.abs(lift) < span * 0.1) lift = span * 0.1 * (lift < 0 ? -1 : 1);
  shape(ctx, color, () => {
    ctx.moveTo(a * 0.5, b * 0.25);
    ctx.quadraticCurveTo(a * 0.35, lift * 0.9 + b * 0.25, -a * 0.25 - span * 0.14, lift + b * 0.25);
    ctx.quadraticCurveTo(-a * 0.75, lift * 0.4 + b * 0.25, -a * 0.65, b * 0.25);
    ctx.closePath();
  });
}

function drawHead(ctx: Ctx, bird: Bird, hr: number) {
  const k = bird.look;
  const p = bird.pose;
  const crestColor = k.cap ?? k.head;

  if (k.crest === 'pointed') {
    shape(ctx, crestColor, () => {
      ctx.moveTo(hr * 0.6, hr * 0.7);
      ctx.lineTo(-hr * (1.3 - 1.1 * p.crest), hr * (1.2 + 0.9 * p.crest));
      ctx.lineTo(-hr * 0.7, hr * 0.5);
      ctx.closePath();
    });
  } else if (k.crest === 'shaggy') {
    for (let i = 0; i < 4; i++) {
      const at = 1.3 + i * 0.45;
      shape(ctx, crestColor, () => {
        ctx.moveTo(Math.cos(at - 0.25) * hr, Math.sin(at - 0.25) * hr);
        ctx.lineTo(Math.cos(at + 0.25) * hr * (1.5 + 0.3 * p.crest), Math.sin(at + 0.25) * hr * (1.5 + 0.3 * p.crest));
        ctx.lineTo(Math.cos(at + 0.3) * hr, Math.sin(at + 0.3) * hr);
        ctx.closePath();
      });
    }
  } else if (k.crest === 'comb') {
    for (const [x, y] of [[-0.25, 0.95], [0.2, 1.1], [0.62, 0.9]]) shape(ctx, '#c8202a', () => ctx.arc(x * hr, y * hr, hr * 0.36, 0, TAU));
    shape(ctx, '#c8202a', () => ctx.ellipse(hr * 0.75, -hr * 0.85, hr * 0.3, hr * 0.48, 0, 0, TAU));
  }

  // Beak, behind the head circle so the gape meets the face cleanly.
  const depth = { cone: 0.75, stout: 0.95, thin: 0.32, needle: 0.2, dagger: 0.55, hook: 0.9, chisel: 0.45 }[k.beakShape] * hr;
  const len = k.beakLength * 2 * hr;
  const gape = p.beakOpen * 0.3;
  ctx.save();
  ctx.translate(hr * 0.75, 0);
  ctx.save();
  ctx.rotate(gape);
  shape(ctx, k.beak, () => {
    ctx.moveTo(0, depth / 2);
    if (k.beakShape === 'hook') {
      ctx.quadraticCurveTo(len * 0.9, depth / 2, len, -depth * 0.4);
      ctx.lineTo(len * 0.72, -depth * 0.02);
    } else {
      ctx.lineTo(len, 0);
    }
    ctx.lineTo(0, 0);
    ctx.closePath();
  });
  ctx.restore();
  ctx.rotate(-gape);
  shape(ctx, k.beak, () => {
    ctx.moveTo(0, 0);
    ctx.lineTo(len * (k.beakShape === 'hook' ? 0.75 : 0.96), 0);
    ctx.lineTo(0, -depth / 2);
    ctx.closePath();
  });
  ctx.restore();

  shape(ctx, k.head, () => ctx.arc(0, 0, hr, 0, TAU));
  if (k.cap) {
    shape(ctx, k.cap, () => {
      ctx.arc(0, 0, hr, 0.35, Math.PI);
      ctx.closePath();
    }, false);
  }
  if (k.throat) {
    shape(ctx, k.throat, () => {
      ctx.arc(0, 0, hr, -2.1, -0.15);
      ctx.closePath();
    }, false);
  }
  if (k.eyeLine) {
    ctx.save();
    ctx.strokeStyle = k.eyeLine;
    ctx.lineWidth = hr * 0.24;
    ctx.beginPath();
    ctx.moveTo(hr * 0.85, hr * 0.12);
    ctx.lineTo(-hr * 0.8, hr * 0.38);
    ctx.stroke();
    ctx.restore();
  }
  if (k.crest === 'plume') {
    ctx.save();
    ctx.strokeStyle = '#1c1c1c';
    ctx.lineWidth = hr * 0.22;
    ctx.beginPath();
    ctx.moveTo(hr * 0.2, hr * 0.9);
    ctx.quadraticCurveTo(hr * 0.3, hr * 1.7, hr * 1.0, hr * 1.6);
    ctx.stroke();
    ctx.restore();
    shape(ctx, '#1c1c1c', () => ctx.arc(hr * 1.05, hr * 1.55, hr * 0.26, 0, TAU), false);
  }
  const eye = Math.max(hr * 0.17, 0.07);
  if (k.eyeRing) shape(ctx, k.eyeRing, () => ctx.arc(hr * 0.3, hr * 0.2, eye * 1.6, 0, TAU), false);
  shape(ctx, k.eye, () => ctx.arc(hr * 0.3, hr * 0.2, eye, 0, TAU), false);
  if (k.eye !== '#111111') shape(ctx, '#111', () => ctx.arc(hr * 0.3, hr * 0.2, eye * 0.5, 0, TAU), false);

  if (p.carry && !p.carryInFeet) {
    ctx.translate(hr * 0.75 + len * 0.9, 0);
    drawItem(ctx, p.carry, bird.size);
  }
}

function drawTail(ctx: Ctx, k: Look, a: number, b: number, angle: number, fan: number) {
  const len = k.tailLength * 2 * a;
  const spread = Math.max(fan, k.tailShape === 'fan' ? 0.6 : 0);
  const w0 = b * 0.3;
  const w1 = b * (0.35 + 1.1 * spread);
  ctx.save();
  ctx.translate(-a * 0.8, b * 0.1);
  ctx.rotate(-angle);
  shape(ctx, k.tail, () => {
    ctx.moveTo(0, w0);
    if (k.tailShape === 'pointed') {
      ctx.lineTo(-len * 0.8, w1);
      ctx.lineTo(-len * 1.1, 0);
      ctx.lineTo(-len * 0.8, -w1);
    } else if (k.tailShape === 'forked') {
      ctx.lineTo(-len, w1);
      ctx.lineTo(-len * 0.8, 0);
      ctx.lineTo(-len, -w1);
    } else {
      ctx.lineTo(-len, w1);
      ctx.lineTo(-len, -w1);
    }
    ctx.lineTo(0, -w0);
    ctx.closePath();
  });
  ctx.restore();
}

export function drawBird(ctx: Ctx, bird: Bird) {
  const p = bird.pose;
  const k = bird.look;
  const L = bird.size;
  const a = L * 0.27; // body half-length
  const b = a * (0.5 + 0.35 * k.build); // body half-depth
  const hr = b * 0.62 * k.headSize;
  const flying = bird.airborne;
  const legFull = k.legLength * L;
  const legLen = flying ? 0 : legFull * (1 - p.crouch);
  const cy = legLen + b * 0.85;
  const cos = Math.cos(p.pitch);
  const sin = Math.sin(p.pitch);

  ctx.save();
  ctx.translate(bird.pos.x, bird.pos.y);
  ctx.rotate(p.rotation);
  ctx.scale(p.facing, 1);
  ctx.lineCap = ctx.lineJoin = 'round';

  // Legs stay planted while the body pitches above them.
  if (!flying) {
    const hipX = -a * 0.05 * cos + b * 0.55 * sin;
    const hipY = cy - a * 0.05 * sin - b * 0.55 * cos;
    ctx.strokeStyle = k.legs;
    ctx.lineWidth = Math.max(0.12, L * 0.022);
    for (const [side, kick] of [[-1, p.kickFar], [1, p.kickNear]]) {
      const fx = side * (p.stride * L * 0.16 + L * 0.03) - kick * L * 0.4;
      const fy = Math.max(0, side * p.stride) * L * 0.05 + Math.abs(kick) * L * 0.06;
      ctx.beginPath();
      ctx.moveTo(hipX, hipY);
      ctx.lineTo(fx, fy);
      ctx.moveTo(fx - L * 0.03, fy);
      ctx.lineTo(fx + L * 0.09, fy);
      ctx.stroke();
    }
  }

  ctx.translate(0, cy);
  if (p.roll) ctx.scale(1, Math.cos(p.roll));
  ctx.rotate(p.pitch);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = L * 0.012;

  const span = k.wingSpan * L * 0.42;
  const open = p.wings === 'open';

  if (flying && k.legsTrail) {
    ctx.save();
    ctx.strokeStyle = k.legs;
    ctx.lineWidth = Math.max(0.12, L * 0.022);
    ctx.beginPath();
    ctx.moveTo(-a * 0.3, -b * 0.5);
    ctx.lineTo(-a - legFull * 0.95, -b * 0.25);
    ctx.stroke();
    ctx.restore();
  }

  if (open && !p.blur) {
    ctx.save();
    ctx.translate(a * 0.12, 0);
    ctx.globalAlpha = 0.8;
    drawWing(ctx, k.underwing ?? k.wing, a, b, span, p.flap);
    ctx.restore();
  }

  drawTail(ctx, k, a, b, p.tailAngle, p.tailFan);

  // Body, with belly and markings clipped to its outline.
  shape(ctx, k.body, () => ctx.ellipse(0, 0, a, b, 0, 0, TAU));
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, a, b, 0, 0, TAU);
  ctx.clip();
  shape(ctx, k.belly, () => ctx.ellipse(a * 0.05, -b * 0.7, a, b * 0.7, 0, 0, TAU), false);
  if (k.breast) shape(ctx, k.breast, () => ctx.arc(a * 0.62, -b * 0.2, b * 0.85, 0, TAU), false);
  if (k.band) shape(ctx, k.band, () => ctx.rect(a * 0.3, -b, a * 0.22, b * 2), false);
  if (k.spots) {
    for (let i = 0; i < 7; i++) {
      shape(ctx, k.spots, () => ctx.arc(-a * 0.55 + i * a * 0.2, -b * (0.3 + 0.28 * (i % 2)), b * 0.08, 0, TAU), false);
    }
  }
  ctx.restore();

  if (p.carry && p.carryInFeet) {
    ctx.save();
    ctx.translate(0, -b);
    ctx.rotate(Math.PI / 2);
    drawItem(ctx, p.carry, L);
    ctx.restore();
  }

  // Neck and head. The neck angle is in the bird's frame, so the head stays level when the body tips.
  const neckAngle = p.neck - p.pitch;
  const neckLen = k.neckLength * 2 * a * p.neckExt + hr * 0.5;
  const nx = a * 0.7;
  const ny = b * 0.3;
  const hx = nx + Math.cos(neckAngle) * neckLen + p.headThrust * L * 0.12;
  const hy = ny + Math.sin(neckAngle) * neckLen;
  ctx.save();
  ctx.strokeStyle = k.neck ?? (k.neckLength > 0.25 ? k.body : k.head);
  ctx.lineWidth = hr * 1.5;
  ctx.beginPath();
  ctx.moveTo(nx, ny);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(p.head - p.pitch);
  drawHead(ctx, bird, hr);
  ctx.restore();

  if (p.blur) {
    // Wings beating too fast to resolve: draw the swept arc instead.
    ctx.save();
    ctx.globalAlpha = 0.4;
    for (const f of [-1, -0.45, 0.45, 1]) drawWing(ctx, k.wing, a, b, span, f);
    ctx.restore();
  } else if (open) {
    drawWing(ctx, k.wing, a, b, span, p.flap);
  } else {
    shape(ctx, k.wing, () => ctx.ellipse(-a * 0.12, b * 0.12, a * 0.72, b * 0.55, -0.12, 0, TAU));
    if (k.wingBar) {
      ctx.save();
      ctx.strokeStyle = k.wingBar;
      ctx.lineWidth = b * 0.12;
      ctx.beginPath();
      ctx.moveTo(a * 0.1, b * 0.35);
      ctx.lineTo(a * 0.02, -b * 0.15);
      ctx.moveTo(-a * 0.2, b * 0.4);
      ctx.lineTo(-a * 0.28, -b * 0.12);
      ctx.stroke();
      ctx.restore();
    }
  }

  ctx.restore();
}
