/**
 * Draws the food on show, the animal a bird is hunting, and the occasional peek of a small animal.
 * Expects a y-up context in stage units.
 * drawFoodBack goes under the bird. drawFoodFront goes over it: the cover that hides carrion.
 */
import type { FoodKind } from '../birds/core/food';
import type { FoodPatch, Peek, World } from '../birds/core/World';

const TAU = Math.PI * 2;
type Ctx = CanvasRenderingContext2D;

type Draw = (ctx: Ctx, f: FoodPatch, world: World) => void;
const nothing: Draw = () => {};

/**
 * How each food looks while it is on show. Keyed by every food, so a new one can't be forgotten.
 * Small animals that keep out of sight draw nothing here; they show in a peek, or as PREY while a bird hunts them.
 */
const BACK: Record<FoodKind, Draw> = {
  berries: (ctx, f) => units(ctx, f, (r) => disc(ctx, '#b3263a', 0.36 * r)),
  acorns: (ctx, f) => units(ctx, f, (r) => acorn(ctx, r)),
  cones: (ctx, f) => units(ctx, f, (r) => oval(ctx, '#7a5532', 0.32 * r, 0.62 * r)),
  sap: (ctx, f) =>
    units(ctx, f, (r) => {
      disc(ctx, '#3b2a1e', 0.2);
      ctx.globalAlpha *= r;
      disc(ctx, '#e0a43a', 0.13);
    }),
  seedHeads(ctx, f) {
    // Thistle and dock gone to seed: the stalks stay, the heads get eaten.
    ctx.strokeStyle = '#8a7a4a';
    ctx.lineWidth = 0.16;
    for (const u of f.units) line(ctx, u.x + 0.3, 0, u.x, u.y);
    units(ctx, f, (r) => {
      disc(ctx, '#b49a5e', 0.5 * r);
      disc(ctx, '#e6dcc0', 0.28 * r);
    });
  },
  fallenSeed: (ctx, f) => units(ctx, f, (r) => oval(ctx, '#6b5536', 0.16 * r, 0.1 * r)),
  // The flowers themselves are the nectar.
  nectar: nothing,
  grass(ctx, f, world) {
    // Dune grass on the beach. The yard's lawn is already grass.
    if (world.habitat.ground === 'sand') tufts(ctx, f.site.x[0], f.site.x[1], '#8fa65a', 3.2);
  },
  eelgrass(ctx, f, world) {
    ctx.strokeStyle = '#3f7a4a';
    ctx.lineWidth = 0.22;
    for (let x = f.site.x[0] + 0.5; x < f.site.x[1]; x += 1.1) {
      const y0 = world.floorY(x);
      const sway = Math.sin(world.time * 1.3 + x) * 0.5;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.quadraticCurveTo(x + sway, y0 + 0.9, x + sway * 1.6, Math.min(-0.15, y0 + 1.8));
      ctx.stroke();
    }
  },
  ants(ctx, f, world) {
    // An anthill in the lawn; on the beach they live in the drift log.
    if (world.habitat.ground === 'sand') return;
    ctx.fillStyle = '#9a7650';
    ctx.beginPath();
    ctx.ellipse((f.site.x[0] + f.site.x[1]) / 2, 0, 1.4, 0.8, 0, 0, Math.PI);
    ctx.fill();
  },
  swarm(ctx, f, world) {
    // The cloud fills the site exactly, so a bird hawking anywhere in the site is in the swarm.
    const mid = (f.site.x[0] + f.site.x[1]) / 2;
    const wide = (f.site.x[1] - f.site.x[0]) / 2 - 0.6;
    const tall = (f.site.spread ?? 3) - 0.4;
    ctx.fillStyle = 'rgba(40,40,40,0.55)';
    for (let i = 0; i < 9; i++) {
      const x = mid + Math.sin(world.time * 0.7 + i * 2.1) * wide + Math.sin(world.time * 3.1 + i) * 0.6;
      const y = f.site.y + Math.cos(world.time * 0.9 + i * 1.7) * tall + Math.sin(world.time * 4 + i * 3) * 0.4;
      dot(ctx, x, y, 0.09);
    }
  },
  clams: (ctx, f) => units(ctx, f, (r) => oval(ctx, '#7d6c4c', 0.16 * r, 0.07 * r)),
  mussels: (ctx, f) => units(ctx, f, (r) => oval(ctx, '#27303d', 0.42 * r, 0.24 * r)),
  // The mussel bed on the bottom of the shallows, for the diving ducks.
  shellfish: (ctx, f) =>
    units(ctx, f, (r) => {
      oval(ctx, '#27303d', 0.4 * r, 0.22 * r);
      oval(ctx, '#3a4558', 0.3 * r, 0.14 * r, 0.6, 0.1);
    }),
  wrack(ctx, f) {
    // A line of kelp and eelgrass left by the tide.
    ctx.lineWidth = 0.28;
    for (let x = f.site.x[0], i = 0; x < f.site.x[1]; x += 0.8, i++) {
      ctx.strokeStyle = ['#5a5a2a', '#6b6a33', '#4a4f2a'][i % 3];
      ctx.beginPath();
      ctx.moveTo(x, 0.1);
      ctx.quadraticCurveTo(x + 0.5, 0.45 + (i % 2) * 0.2, x + 1.2, 0.1);
      ctx.stroke();
    }
  },
  plankton(ctx, f) {
    // A cloudy, greenish slick at the surface, flecked with the tiny animals in it.
    const [x0, x1] = f.site.x;
    ctx.fillStyle = 'rgba(196, 222, 170, 0.6)';
    ctx.fillRect(x0, -0.6, x1 - x0, 0.6);
    ctx.fillStyle = 'rgba(120, 140, 90, 0.8)';
    for (let x = x0 + 0.3, i = 0; x < x1; x += 0.7, i++) ctx.fillRect(x, -0.12 - ((i * 7) % 5) * 0.1, 0.14, 0.14);
  },
  flock: drawFlock,
  carrion(ctx, f) {
    // A dull, shapeless mound. The cover drawn over the bird hides most of it.
    ctx.fillStyle = '#6e5a48';
    ctx.beginPath();
    ctx.ellipse((f.site.x[0] + f.site.x[1]) / 2, 0, 1.6, 0.7, 0, 0, Math.PI);
    ctx.fill();
  },
  worms: nothing,
  grassBugs: nothing,
  litterBugs: nothing,
  barkBugs: nothing,
  leafBugs: nothing,
  sandCritters: nothing,
  minnows: nothing,
  baitfish: nothing,
  voles: nothing,
};

export function drawFoodBack(ctx: Ctx, world: World) {
  for (const f of world.food) BACK[f.kind](ctx, f, world);
  const q = world.prey;
  const prey = q && PREY[q.kind];
  if (q && prey) {
    ctx.save();
    ctx.translate(q.x, q.y);
    prey(ctx, world.time, world);
    ctx.restore();
  }
  const p = world.peek;
  const draw = p && PEEKS[p.kind];
  if (p && draw) {
    const t = p.t / p.seconds;
    ctx.save();
    ctx.globalAlpha = Math.min(1, Math.sin(Math.PI * t) * 2.5);
    draw(ctx, p, t, world);
    ctx.restore();
  }
}

/** Three small birds feeding in the bush (on the beach, at the tideline). A hunter flushes them; they come back later. */
function drawFlock(ctx: Ctx, f: FoodPatch, world: World) {
  const sand = world.habitat.ground === 'sand';
  const [lo, hi] = f.site.x;
  // 0 while settled; climbs to 1 as they burst away, and falls back to 0 as they drift in again.
  const away = f.away;
  if (away >= 1) return;
  ctx.save();
  ctx.globalAlpha = 1 - away;
  for (const [dx, dy, face] of [[0.15, 0.2, 1], [0.5, 0.55, -1], [0.85, 0.3, 1]] as const) {
    const x = lo + dx * (hi - lo) + (dx - 0.5) * 30 * away;
    const y = f.site.y * dy + (sand ? 0 : 1.5) + 18 * away * (0.6 + dy);
    smallBird(ctx, x, y, away > 0 ? (dx < 0.5 ? -1 : 1) : face, sand, away > 0);
  }
  ctx.restore();
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

/** Each piece of a patch still there. */
function units(ctx: Ctx, f: FoodPatch, draw: (r: number) => void) {
  for (const u of f.units) {
    if (u.gone) continue;
    ctx.save();
    ctx.translate(u.x, u.y);
    draw(1);
    ctx.restore();
  }
}

type PeekDraw = (ctx: Ctx, p: Peek, t: number, world: World) => void;

/**
 * The small animals that keep out of sight, showing themselves for a moment. Only foods marked
 * hidden in FOODS peek, and a test checks this table against them. They are drawn about twice
 * life size, or nobody would see them.
 */
export const PEEKS: Partial<Record<FoodKind, PeekDraw>> = {
  worms(ctx, p, t) {
    const e = Math.sin(Math.PI * t);
    big(ctx, p.x, 0);
    ctx.strokeStyle = '#c9788a';
    ctx.lineWidth = 0.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(0.25 * e, 0.5 * e, -0.1, 1.1 * e);
    ctx.stroke();
  },
  grassBugs(ctx, p, t) {
    // A grasshopper hops out of the grass and lands again.
    big(ctx, p.x + 2.4 * t, 0.15 + 1.6 * Math.sin(Math.PI * Math.min(1, t * 1.5)));
    grasshopper(ctx, t);
  },
  litterBugs(ctx, p, t) {
    // A beetle runs out of the leaves and back.
    big(ctx, p.x + 1.6 * Math.sin(Math.PI * t), 0.12);
    ctx.scale(t < 0.5 ? 1 : -1, 1);
    beetle(ctx, t);
  },
  barkBugs(ctx, p, t, world) {
    // An ant climbs the trunk where the food is.
    const trunk = world.habitat.trunks.find((k) => Math.abs(k.x - p.x) < 3);
    big(ctx, (trunk?.x ?? p.x) + 0.3, 5 + ((p.x * 37.13) % 1) * 20 + 1.5 * t);
    ctx.rotate(Math.PI / 2);
    ant(ctx, t);
  },
  leafBugs(ctx, p, t) {
    // A caterpillar inching along under a leaf.
    big(ctx, p.x - 0.4 + 0.6 * t, p.y);
    caterpillar(ctx, t);
  },
  ants(ctx, p, t) {
    // A file of ants out of the hill, or along the log.
    for (let i = 0; i < 5; i++) {
      ctx.save();
      big(ctx, p.x - 1.5 + ((t * 1.5 + i / 5) % 1) * 3, p.y + 0.12);
      ant(ctx, t + i * 0.3);
      ctx.restore();
    }
  },
  sandCritters(ctx, p, t) {
    // A crab runs sideways.
    big(ctx, p.x + 2 * t, 0);
    crab(ctx, t);
  },
  wrack(ctx, p, t) {
    // Kelp flies lift off the weed.
    for (let i = 0; i < 6; i++) {
      ctx.save();
      big(ctx, p.x + Math.sin(i * 1.7 + t * 6) * 0.8 + (i - 3) * 0.4, 0.3 + t * (1 + (i % 3) * 0.6));
      fly(ctx, t * 40 + i);
      ctx.restore();
    }
  },
  minnows(ctx, p, t, world) {
    // A few minnows dart through the shallows, and dimple the surface.
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(p.x + (i - 1) * 0.9 + 3 * t, p.y - i * 0.25);
      fish(ctx, world.time + i, 0.8);
      ctx.restore();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 0.1;
    ctx.beginPath();
    ctx.ellipse(p.x + 1.5, 0, 0.3 + 1.6 * t, 0.12 + 0.3 * t, 0, 0, TAU);
    ctx.stroke();
  },
  baitfish(ctx, p, t) {
    // Silver flashes as the school breaks the surface.
    ctx.fillStyle = '#e8eef2';
    for (let i = 0; i < 7; i++) {
      const k = (t * 1.6 + i / 7) % 1;
      dot(ctx, p.x + (i - 3) * 0.9, -0.3 + 0.8 * Math.sin(Math.PI * k), 0.2);
    }
  },
  voles(ctx, p, t) {
    // A vole runs between clumps of grass.
    big(ctx, p.x + 5 * t, 0.3);
    vole(ctx);
  },
};

type PreyDraw = (ctx: Ctx, time: number, world: World) => void;

/**
 * The one animal a bird is hunting, drawn where it is (the context is already moved there) until the
 * bird takes it: the worm the robin pulls, the fish the merganser chases. Every hidden food has one,
 * and so does the flock, and a test checks it.
 */
export const PREY: Partial<Record<FoodKind, PreyDraw>> = {
  worms(ctx, time) {
    // Half out of its burrow, swaying.
    ctx.scale(2, 2);
    ctx.strokeStyle = '#c9788a';
    ctx.lineWidth = 0.2;
    ctx.lineCap = 'round';
    const sway = Math.sin(time * 3) * 0.2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(0.3 + sway, 0.4, sway, 0.8);
    ctx.stroke();
  },
  grassBugs(ctx, time) {
    ctx.translate(0, 0.15);
    ctx.scale(2, 2);
    grasshopper(ctx, (time * 0.3) % 1);
  },
  litterBugs(ctx, time) {
    ctx.translate(Math.sin(time * 2) * 0.3, 0.12);
    ctx.scale(2, 2);
    beetle(ctx, time);
  },
  barkBugs(ctx, time) {
    ctx.translate(0, Math.sin(time) * 0.3);
    ctx.scale(2, 2);
    ctx.rotate(Math.PI / 2);
    ant(ctx, time);
  },
  leafBugs(ctx, time) {
    ctx.scale(2, 2);
    caterpillar(ctx, time * 0.2);
  },
  ants(ctx, time) {
    ctx.translate(Math.sin(time * 2) * 0.4, 0.12);
    ctx.scale(2, 2);
    ant(ctx, time);
  },
  sandCritters(ctx, time) {
    ctx.translate(Math.sin(time * 1.5) * 0.4, 0);
    ctx.scale(2, 2);
    crab(ctx, time);
  },
  wrack(ctx, time) {
    // A kelp fly buzzing over the weed.
    ctx.translate(Math.sin(time * 5) * 0.5, 0.6 + Math.sin(time * 7) * 0.25);
    ctx.scale(3, 3);
    fly(ctx, time * 40);
  },
  minnows: (ctx, time) => fish(ctx, time, 1),
  baitfish: (ctx, time) => fish(ctx, time, 1.2),
  voles(ctx, time) {
    ctx.translate(Math.sin(time * 1.2) * 0.4, 0.3);
    ctx.scale(2, 2);
    vole(ctx);
  },
  flock(ctx, time, world) {
    // The one the hunter singled out, fluttering to get away.
    ctx.translate(Math.sin(time * 6) * 0.3, Math.sin(time * 9) * 0.3);
    smallBird(ctx, 0, 0, Math.sin(time * 2) > 0 ? 1 : -1, world.habitat.ground === 'sand', true);
  },
};

/** A small silver fish swimming, its tail beating. */
function fish(ctx: Ctx, time: number, length: number) {
  ctx.translate(Math.sin(time * 1.3) * 0.5, Math.sin(time * 2.1) * 0.15);
  ctx.scale(Math.cos(time * 1.3) > 0 ? length : -length, length);
  const beat = Math.sin(time * 14) * 0.12;
  oval(ctx, '#c9d3da', 0.5, 0.16);
  oval(ctx, '#7f8e99', 0.42, 0.06, -0.02, 0.07);
  ctx.fillStyle = '#c9d3da';
  ctx.beginPath();
  ctx.moveTo(-0.45, 0);
  ctx.lineTo(-0.75, 0.16 + beat);
  ctx.lineTo(-0.75, -0.16 + beat);
  ctx.closePath();
  ctx.fill();
  disc(ctx, '#1e1a18', 0.035, 0.36, 0.03);
}

function crab(ctx: Ctx, t: number) {
  ctx.strokeStyle = '#a0552e';
  ctx.lineWidth = 0.08;
  for (const s of [-1, 1]) for (const k of [0.15, 0.3]) line(ctx, s * k, 0.2, s * (k + 0.2), 0.02 + Math.abs(Math.sin(t * 30 + k * 9)) * 0.08);
  oval(ctx, '#b5653a', 0.32, 0.18, 0, 0.25);
}

function vole(ctx: Ctx) {
  oval(ctx, '#6b5643', 0.55, 0.3);
  disc(ctx, '#6b5643', 0.22, 0.5, 0.08);
  ctx.strokeStyle = '#6b5643';
  ctx.lineWidth = 0.06;
  line(ctx, -0.5, -0.05, -0.85, -0.2);
}

/** Six legs scuttling, three a side, at these points along the body. */
function legs(ctx: Ctx, t: number, len: number, at: number[]) {
  ctx.strokeStyle = '#1e1a18';
  ctx.lineWidth = 0.035;
  at.forEach((x, i) => {
    const swing = Math.sin(t * 60 + i * 2) * 0.06;
    line(ctx, x, 0.06, x + swing - 0.05, 0.06 - len * 0.5);
    line(ctx, x, 0.12, x - swing + 0.05, 0.12 + len * 0.4);
  });
}

function ant(ctx: Ctx, t: number) {
  legs(ctx, t, 0.22, [-0.08, 0, 0.08]);
  ctx.fillStyle = '#1e1a18';
  dot(ctx, -0.22, 0.08, 0.1);
  dot(ctx, 0, 0.08, 0.07);
  dot(ctx, 0.17, 0.09, 0.07);
}

function beetle(ctx: Ctx, t: number) {
  legs(ctx, t, 0.26, [-0.12, 0, 0.12]);
  oval(ctx, '#2a2420', 0.26, 0.15, 0, 0.12);
  disc(ctx, '#2a2420', 0.09, 0.28, 0.12);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 0.025;
  line(ctx, -0.24, 0.12, 0.2, 0.12);
}

function grasshopper(ctx: Ctx, t: number) {
  ctx.strokeStyle = '#5f6e28';
  ctx.lineWidth = 0.04;
  // The big hind leg folds up in a Z; the front legs are short.
  const kick = Math.sin(Math.PI * t) * 0.15;
  line(ctx, -0.05, 0.12, -0.25, 0.32 + kick);
  line(ctx, -0.25, 0.32 + kick, -0.42, 0.02);
  line(ctx, 0.15, 0.08, 0.2, -0.04);
  line(ctx, 0.22, 0.1, 0.28, -0.02);
  oval(ctx, '#7c9a3a', 0.34, 0.11, 0, 0.12);
  disc(ctx, '#7c9a3a', 0.1, 0.32, 0.16);
  line(ctx, 0.38, 0.22, 0.6, 0.38);
}

function caterpillar(ctx: Ctx, t: number) {
  // Inches along: the middle arches up and flattens again.
  const arch = Math.abs(Math.sin(t * 9)) * 0.18;
  for (let i = 0; i < 6; i++) disc(ctx, i === 5 ? '#3a2a1a' : i % 2 ? '#e8d24a' : '#c9a62e', 0.09, i * 0.13 * (1 - arch), Math.sin((i / 5) * Math.PI) * arch);
}

function fly(ctx: Ctx, phase: number) {
  oval(ctx, 'rgba(230,235,240,0.8)', 0.08, 0.08 + Math.abs(Math.sin(phase)) * 0.06, -0.02, 0.1);
  oval(ctx, '#2a2a2a', 0.1, 0.06);
}

/** Move to (x, y) and draw at twice life size from there. */
function big(ctx: Ctx, x: number, y: number) {
  ctx.translate(x, y);
  ctx.scale(2, 2);
}

function smallBird(ctx: Ctx, x: number, y: number, face: number, sand: boolean, flying = false) {
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
  if (flying) {
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(0.2, 0.7);
    ctx.lineTo(-0.35, 1.3);
    ctx.lineTo(-0.3, 0.65);
    ctx.closePath();
    ctx.fill();
  }
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
