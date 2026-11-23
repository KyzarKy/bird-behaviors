/**
 * Draws the food on show and the occasional peek. Expects a y-up context in stage units.
 * drawFoodBack goes under the bird. drawFoodFront goes over it: the cover that hides carrion.
 */
import type { FoodPatch, Peek, World } from '../birds/core/World';

const TAU = Math.PI * 2;
type Ctx = CanvasRenderingContext2D;

export function drawFoodBack(ctx: Ctx, world: World) {
  const sand = world.habitat.ground === 'sand';
  for (const f of world.food) {
    const [lo, hi] = f.site.x;
    switch (f.kind) {
      case 'berries':
        units(ctx, f, (r) => disc(ctx, '#b3263a', 0.36 * r));
        break;
      case 'acorns':
        units(ctx, f, (r) => acorn(ctx, r));
        break;
      case 'cones':
        units(ctx, f, (r) => oval(ctx, '#7a5532', 0.32 * r, 0.62 * r));
        break;
      case 'sap':
        units(ctx, f, (r) => {
          disc(ctx, '#3b2a1e', 0.2);
          ctx.globalAlpha *= r;
          disc(ctx, '#e0a43a', 0.13);
        });
        break;
      case 'seedHeads':
        // Thistle and dock gone to seed: the stalks stay, the heads get eaten.
        ctx.strokeStyle = '#8a7a4a';
        ctx.lineWidth = 0.16;
        for (const u of f.units) line(ctx, u.x + 0.3, 0, u.x, u.y);
        units(ctx, f, (r) => {
          disc(ctx, '#b49a5e', 0.5 * r);
          disc(ctx, '#e6dcc0', 0.28 * r);
        });
        break;
      case 'fallenSeed':
        units(ctx, f, (r) => oval(ctx, '#6b5536', 0.16 * r, 0.1 * r));
        break;
      case 'grass':
        // Dune grass on the beach. The yard's lawn is already grass.
        if (sand) tufts(ctx, lo, hi, '#8fa65a', 3.2);
        break;
      case 'eelgrass':
        ctx.strokeStyle = '#3f7a4a';
        ctx.lineWidth = 0.22;
        for (let x = lo + 0.5; x < hi; x += 1.1) {
          const y0 = world.floorY(x);
          const sway = Math.sin(world.time * 1.3 + x) * 0.5;
          ctx.beginPath();
          ctx.moveTo(x, y0);
          ctx.quadraticCurveTo(x + sway, y0 + 0.9, x + sway * 1.6, Math.min(-0.15, y0 + 1.8));
          ctx.stroke();
        }
        break;
      case 'ants':
        if (!sand) {
          ctx.fillStyle = '#9a7650';
          ctx.beginPath();
          ctx.ellipse((lo + hi) / 2, 0, 1.4, 0.8, 0, 0, Math.PI);
          ctx.fill();
        }
        break;
      case 'swarm':
        ctx.fillStyle = 'rgba(40,40,40,0.55)';
        for (let i = 0; i < 9; i++) {
          const x = (lo + hi) / 2 + Math.sin(world.time * 0.7 + i * 2.1) * 4 + Math.sin(world.time * 3.1 + i) * 0.6;
          const y = f.site.y + Math.cos(world.time * 0.9 + i * 1.7) * 2 + Math.sin(world.time * 4 + i * 3) * 0.4;
          dot(ctx, x, y, 0.09);
        }
        break;
      case 'clams':
        units(ctx, f, (r) => oval(ctx, '#7d6c4c', 0.16 * r, 0.07 * r));
        break;
      case 'mussels':
        units(ctx, f, (r) => oval(ctx, '#27303d', 0.42 * r, 0.24 * r));
        break;
      case 'wrack':
        // A line of kelp and eelgrass left by the tide.
        ctx.lineWidth = 0.28;
        for (let x = lo, i = 0; x < hi; x += 0.8, i++) {
          ctx.strokeStyle = ['#5a5a2a', '#6b6a33', '#4a4f2a'][i % 3];
          ctx.beginPath();
          ctx.moveTo(x, 0.1);
          ctx.quadraticCurveTo(x + 0.5, 0.45 + (i % 2) * 0.2, x + 1.2, 0.1);
          ctx.stroke();
        }
        break;
      case 'plankton':
        ctx.fillStyle = 'rgba(214, 235, 220, 0.35)';
        ctx.fillRect(lo, -0.35, hi - lo, 0.35);
        break;
      case 'flock':
        for (const [dx, dy, face] of [[0.15, 0.2, 1], [0.5, 0.55, -1], [0.85, 0.3, 1]] as const)
          smallBird(ctx, lo + dx * (hi - lo), f.site.y * dy + (sand ? 0 : 1.5), face, sand);
        break;
      case 'carrion':
        // A dull, shapeless mound. The cover drawn over the bird hides most of it.
        ctx.fillStyle = '#6e5a48';
        ctx.beginPath();
        ctx.ellipse((lo + hi) / 2, 0, 1.6, 0.7, 0, 0, Math.PI);
        ctx.fill();
        break;
    }
  }
  if (world.peek) drawPeek(ctx, world, world.peek);
}

export function drawFoodFront(ctx: Ctx, world: World) {
  const carrion = world.food.find((f) => f.kind === 'carrion');
  if (!carrion) return;
  const [lo, hi] = carrion.site.x;
  if (world.habitat.ground === 'sand') {
    // Heaped kelp.
    ctx.fillStyle = '#4f5326';
    ctx.beginPath();
    ctx.ellipse((lo + hi) / 2, 0, 2.6, 1.1, 0, 0, Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#6b6a33';
    ctx.lineWidth = 0.3;
    for (let i = 0; i < 6; i++) line(ctx, lo - 0.6 + i * 0.9, 0.2, lo + i * 0.9, 1.1 - (i % 2) * 0.3);
  } else tufts(ctx, lo - 0.8, hi + 0.8, '#5c8a45', 2.2, 0.32);
}

/** A grass tussock: blades fanning up from the ground. */
function tufts(ctx: Ctx, lo: number, hi: number, color: string, height: number, step = 0.45) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.16;
  for (let x = lo, i = 0; x < hi; x += step, i++) {
    const h = height * (0.55 + ((i * 7) % 5) * 0.1);
    const lean = (((i * 3) % 5) - 2) * 0.25;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.quadraticCurveTo(x + lean * 0.3, h * 0.6, x + lean, h);
    ctx.stroke();
  }
}

/** Each piece of a patch, shrunk while it grows back. */
function units(ctx: Ctx, f: FoodPatch, draw: (r: number) => void) {
  for (const u of f.units) {
    if (u.left < 0.15) continue;
    ctx.save();
    ctx.translate(u.x, u.y);
    ctx.globalAlpha = Math.min(1, u.left * 1.4);
    draw(u.left);
    ctx.restore();
  }
}

/** One small animal showing itself, or a plant stirring, for a couple of seconds. */
function drawPeek(ctx: Ctx, world: World, p: Peek) {
  const t = p.t / p.seconds;
  const e = Math.sin(Math.PI * t);
  ctx.save();
  ctx.globalAlpha = Math.min(1, e * 2.5);
  const { x, y } = p;
  // A steady second number per peek, to vary where on the plant or trunk it happens.
  const v = (x * 37.13) % 1;
  switch (p.kind) {
    case 'worms':
      // Small animals are drawn about twice life size, or nobody would see them.
      big(ctx, x, 0);
      ctx.strokeStyle = '#c9788a';
      ctx.lineWidth = 0.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(0.25 * e, 0.5 * e, -0.1, 1.1 * e);
      ctx.stroke();
      break;
    case 'grassBugs':
      // A grasshopper hops.
      big(ctx, x + 2.4 * t, 0.15 + 1.6 * Math.sin(Math.PI * Math.min(1, t * 1.5)));
      ctx.rotate(-0.3);
      oval(ctx, '#7c9a3a', 0.34, 0.12);
      break;
    case 'litterBugs':
      // A beetle runs out of the leaves and back.
      big(ctx, x + 1.6 * Math.sin(Math.PI * t), 0.15);
      oval(ctx, '#2a2420', 0.22, 0.14);
      break;
    case 'barkBugs': {
      // An ant climbs the trunk where the food is.
      const trunk = world.habitat.trunks.find((k) => Math.abs(k.x - x) < 3);
      big(ctx, (trunk?.x ?? x) + 0.2, 5 + v * 20 + 1.5 * t);
      oval(ctx, '#2a2420', 0.12, 0.22);
      break;
    }
    case 'leafBugs':
      // A caterpillar inching along a leaf.
      big(ctx, x + t, 22 + v * 10);
      ctx.strokeStyle = '#8bc34a';
      ctx.lineWidth = 0.18;
      ctx.lineCap = 'round';
      line(ctx, 0, 0, 0.5 - 0.25 * Math.abs(Math.sin(t * 12)), 0.15 * Math.abs(Math.sin(t * 12)));
      break;
    case 'voles':
      // A vole runs between clumps of grass.
      big(ctx, x + 5 * t, 0.3);
      oval(ctx, '#6b5643', 0.55, 0.3);
      disc(ctx, '#6b5643', 0.22, 0.5, 0.08);
      ctx.strokeStyle = '#6b5643';
      ctx.lineWidth = 0.06;
      line(ctx, -0.5, -0.05, -0.85, -0.2);
      break;
    case 'ants':
      ctx.fillStyle = '#1e1a18';
      for (let i = 0; i < 6; i++) dot(ctx, x - 1.5 + ((t * 2 + i / 6) % 1) * 3, y + 0.15, 0.15);
      break;
    case 'swarm':
      ctx.fillStyle = 'rgba(255,255,240,0.9)';
      for (let i = 0; i < 5; i++) dot(ctx, x + Math.sin(i * 2.4 + t * 3) * 2, y + Math.cos(i * 1.9 + t * 2) * 1.5, 0.16);
      break;
    case 'sandCritters':
      // A crab runs sideways.
      big(ctx, x + 2 * t, 0);
      ctx.strokeStyle = '#a0552e';
      ctx.lineWidth = 0.08;
      for (const s of [-1, 1]) for (const k of [0.15, 0.3]) line(ctx, s * k, 0.2, s * (k + 0.2), 0.02 + Math.abs(Math.sin(t * 30 + k * 9)) * 0.08);
      oval(ctx, '#b5653a', 0.32, 0.18, 0, 0.25);
      break;
    case 'clams':
      ctx.fillStyle = 'rgba(234,246,251,0.95)';
      for (let i = 0; i < 4; i++) dot(ctx, x + 0.1 * i, 1.4 * Math.sin(Math.PI * t) * (1 - i * 0.2), 0.07);
      break;
    case 'mussels':
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 4; i++) dot(ctx, 46.6 + i * 1.3, 0.45 + (i % 2) * 0.3, 0.12 * e);
      break;
    case 'wrack':
      // Kelp flies lift off the weed.
      ctx.fillStyle = '#2a2a2a';
      for (let i = 0; i < 7; i++) dot(ctx, x + Math.sin(i * 1.7 + t * 6) * 0.8 + (i - 3) * 0.4, 0.3 + t * (1 + (i % 3) * 0.6), 0.08);
      break;
    case 'plankton':
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 0.1;
      for (let i = 0; i < 5; i++) line(ctx, x + i * 1.2 - 2.4, -0.1, x + i * 1.2 - 1.9, -0.1);
      break;
    case 'minnows':
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 0.1;
      ctx.beginPath();
      ctx.ellipse(x, 0, 0.3 + 1.6 * t, 0.12 + 0.3 * t, 0, 0, TAU);
      ctx.stroke();
      break;
    case 'baitfish':
      // Silver flashes as the school breaks the surface.
      ctx.fillStyle = '#e8eef2';
      for (let i = 0; i < 7; i++) {
        const k = (t * 1.6 + i / 7) % 1;
        dot(ctx, x + (i - 3) * 0.9, -0.3 + 0.8 * Math.sin(Math.PI * k), 0.2);
      }
      break;
    case 'eelgrass':
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 0.07;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(x + i * 0.4, world.floorY(x) + 0.4 + t * 2 - i * 0.3, 0.1, 0, TAU);
        ctx.stroke();
      }
      break;
    case 'flock': {
      // One bird flits up and drops back in.
      const sand = world.habitat.ground === 'sand';
      smallBird(ctx, x + 1.5 * t, y * 0.5 + (sand ? 0 : 1.5) + 2 * Math.sin(Math.PI * t), 1, sand);
      break;
    }
    case 'berries':
    case 'acorns':
    case 'cones':
      fall(ctx, world, p, t);
      break;
    case 'seedHeads':
      // Seed fluff drifts off on the breeze.
      ctx.fillStyle = 'rgba(245,240,225,0.95)';
      for (let i = 0; i < 5; i++) dot(ctx, x + t * (3 + i), 5.5 + t * (1.2 + i * 0.4), 0.12);
      break;
    case 'fallenSeed':
      ctx.fillStyle = '#6b5536';
      for (let i = 0; i < 3; i++) dot(ctx, x + t * (1 + i * 0.6), 0.12 + 0.3 * Math.sin(Math.PI * t * (2 + i)) ** 2, 0.1);
      break;
    case 'nectar': {
      // A bumblebee visits the flowers.
      const bx = 43.5 + (56 - 43.5) * t;
      big(ctx, bx, 8.6 + Math.sin(t * 25) * 0.25);
      oval(ctx, '#e0b01e', 0.24, 0.17);
      oval(ctx, '#2a2420', 0.08, 0.17);
      break;
    }
    case 'sap':
      // A drop runs down from a well.
      oval(ctx, '#e0a43a', 0.09, 0.15, 85.5, 9.5 - 1.2 * t);
      break;
    case 'grass':
      // A gust runs through it.
      if (world.habitat.ground === 'sand') tufts(ctx, x - 1, x + 1, '#b6c77a', 3.4);
      else {
        ctx.strokeStyle = '#8fbd6a';
        ctx.lineWidth = 0.12;
        for (let i = 0; i < 8; i++) line(ctx, x + i * 0.3, 0, x + i * 0.3 + 0.35 * e, 0.6);
      }
      break;
  }
  ctx.restore();
}

/** Move to (x, y) and draw at twice life size from there. */
function big(ctx: Ctx, x: number, y: number) {
  ctx.translate(x, y);
  ctx.scale(2, 2);
}

/** A berry, acorn or cone drops from the plant. */
function fall(ctx: Ctx, world: World, p: Peek, t: number) {
  const patch = world.food.find((f) => f.kind === p.kind);
  const from = patch?.units.filter((u) => u.left >= 1 && u.y > 1).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
  if (!from) return;
  ctx.translate(from.x, Math.max(0.2, from.y * (1 - t * t)));
  if (p.kind === 'berries') disc(ctx, '#b3263a', 0.36);
  else if (p.kind === 'acorns') acorn(ctx, 1);
  else oval(ctx, '#7a5532', 0.32, 0.62);
}

function smallBird(ctx: Ctx, x: number, y: number, face: number, sand: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face * 1.8, 1.8);
  // Feet at y = 0: a sparrow in the bush, a sandpiper on the beach.
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 0.07;
  line(ctx, 0, 0.3, 0, 0);
  const body = sand ? '#9a8c78' : '#7a5f45';
  oval(ctx, sand ? '#f0ece4' : '#c9b89a', 0.55, 0.3, 0, 0.5);
  oval(ctx, body, 0.6, 0.22, -0.05, 0.62);
  disc(ctx, body, 0.22, 0.48, 0.82);
  line(ctx, 0.68, 0.82, sand ? 1 : 0.84, sand ? 0.74 : 0.8);
  ctx.restore();
}

function acorn(ctx: Ctx, r: number) {
  oval(ctx, '#9a6a35', 0.24 * r, 0.32 * r);
  ctx.fillStyle = '#5e4630';
  ctx.beginPath();
  ctx.ellipse(0, 0.18 * r, 0.27 * r, 0.14 * r, 0, 0, TAU);
  ctx.fill();
}

function disc(ctx: Ctx, color: string, r: number, x = 0, y = 0) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function oval(ctx: Ctx, color: string, rx: number, ry: number, x = 0, y = 0) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}

function dot(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
