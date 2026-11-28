import { EXTRAS, FOOD_SITES, FOODS, type FoodKind, type FoodSite } from './food';
import type { Bird } from './Bird';
import type { HabitatId, Item, PerchKind, Vec } from './traits';

/**
 * Stage coordinates: x runs 0..100 left to right, y is height above the
 * ground line. Distances and bird sizes are stylized, not to scale.
 */
export const STAGE = { width: 100, top: 51, bottom: -13 };

/** Depth of the bay where the beach has shelved away, deep enough for a diving bird to swim under. */
export const DEEP = 11;
/** How fast the bottom drops away from the waterline: depth per stage unit out. */
export const SHELVE = 0.3;

export interface Perch extends Vec {
  kind: PerchKind;
}

export interface Trunk {
  x: number;
  top: number;
  width: number;
  /** Height range of bare bark a bird can climb, if any. */
  climb: [number, number] | null;
  color: string;
}

export interface Habitat {
  id: HabitatId;
  name: string;
  ground: 'grass' | 'sand';
  /** x range of dry land. */
  land: [number, number];
  /** Water lies to the right of `from`. */
  water?: { from: number };
  /** x range of leaf litter. */
  litter?: [number, number];
  trunks: Trunk[];
  /** x1, y1, x2, y2, thickness */
  limbs: [number, number, number, number, number][];
  foliage: { x: number; y: number; r: number; color: string; front?: boolean }[];
  props: { kind: 'post' | 'rock' | 'log' | 'rail'; x: number; y: number; w: number; h: number }[];
  perches: Perch[];
}

const DEBRIS = ['dust', 'splash', 'chip', 'leaf'] as const;
const isDebris = (k: string): boolean => (DEBRIS as readonly string[]).includes(k);
export type ParticleKind = (typeof DEBRIS)[number] | Item;

export interface Particle extends Vec {
  kind: ParticleKind;
  vx: number;
  vy: number;
  gravity: number;
  /** Height at which it stops falling. */
  floor: number;
  life: number;
  /** The bird whose behavior put it down, so only that behavior's end clears it. */
  by?: Bird;
}

/** A food on show. A piece a bird takes is gone until its behavior ends, then the food is as it was. */
export interface FoodPatch {
  kind: FoodKind;
  site: FoodSite;
  /** `by` is the bird that took a piece; it comes back when that bird's behavior ends. */
  units: (Vec & { gone: boolean; by?: Bird })[];
  /** Set while a hunter is after the flock: it bursts out of cover, and settles back once the hunt is over. */
  flushed: boolean;
  flushedBy?: Bird;
  /** 0 settled .. 1 gone from view, easing toward `flushed`. */
  away: number;
}

/** A small animal that keeps out of sight showing itself for a moment. */
export interface Peek extends Vec {
  kind: FoodKind;
  /** Seconds since it began. */
  t: number;
  seconds: number;
  /** Holding still: a bird began feeding on its kind while it showed, and may go for it. */
  held?: boolean;
}

/**
 * Where the animal in a peek is at this moment of it: some run, hop or swim while they show. The
 * drawing follows this, and so does a bird that goes after the one it saw.
 */
export function peekSpot(p: Peek, habitat: Habitat): Vec {
  const t = p.t / p.seconds;
  switch (p.kind) {
    case 'grassBugs':
      return { x: p.x + 2.4 * t, y: p.y + 1.6 * Math.sin(Math.PI * Math.min(1, t * 1.5)) };
    case 'litterBugs':
      return { x: p.x + 1.6 * Math.sin(Math.PI * t), y: p.y };
    case 'barkBugs': {
      const trunk = habitat.trunks.find((k) => Math.abs(k.x - p.x) < 3);
      return { x: (trunk?.x ?? p.x) + 0.3, y: 5 + ((p.x * 37.13) % 1) * 20 + 1.5 * t };
    }
    case 'leafBugs':
      return { x: p.x - 0.4 + 0.6 * t, y: p.y };
    case 'sandCritters':
      return { x: p.x + 2 * t, y: p.y };
    case 'minnows':
      return { x: p.x + 3 * t, y: p.y };
    case 'voles':
      return { x: p.x + 5 * t, y: p.y };
    default:
      return { x: p.x, y: p.y };
  }
}

/** The one animal a hunting bird is going after, drawn where it is until the bird takes it. */
export interface Prey extends Vec {
  kind: FoodKind;
  by?: Bird;
}

/** How far from the bill a piece of food can be and still be taken. */
const REACH = 4;

export class World {
  particles: Particle[] = [];
  food: FoodPatch[] = [];
  peek: Peek | null = null;
  prey: Prey | null = null;
  /** Birds feeding right now. While any is, no peeks start, so none shows beside the animal one is after. */
  feeders = new Set<Bird>();
  get feeding(): boolean {
    return this.feeders.size > 0;
  }
  /** Seconds since the scene was made. */
  time = 0;
  // The first peek comes within a few seconds of a bird arriving, then one every 10 to 15 seconds.
  private nextPeek = 2 + Math.random() * 6;
  private peeked = 0;

  constructor(readonly habitat: Habitat) {
    this.stock([]);
  }

  /** Show these foods, plus the scene's fixed extras, and nothing else. */
  stock(kinds: FoodKind[]) {
    const sites = FOOD_SITES[this.habitat.id];
    this.food = [...new Set([...EXTRAS[this.habitat.id], ...kinds])].flatMap((kind) => {
      const site = sites[kind];
      return site ? [{ kind, site, units: (site.units ?? []).map((u) => ({ x: u.x, y: site.onBottom ? this.floorY(u.x) + u.y : u.y, gone: false })), flushed: false, away: 0 }] : [];
    });
  }

  site(kind: FoodKind | null): FoodSite | null {
    return this.food.find((f) => f.kind === kind)?.site ?? null;
  }

  /** A bird took some at `at`: the nearest piece within reach goes, and so does the animal it was after. */
  eat(kind: FoodKind, at: Vec, by?: Bird) {
    this.prey = null;
    const patch = this.food.find((f) => f.kind === kind);
    if (!patch) return;
    const d = (u: Vec) => Math.hypot(u.x - at.x, u.y - at.y);
    const piece = patch.units.filter((u) => !u.gone && d(u) < REACH).sort((a, b) => d(a) - d(b))[0];
    if (piece) {
      piece.gone = true;
      piece.by = by;
    }
  }

  /**
   * `by`'s behavior is over: what it took goes back, and what it put down or flushed with it. With no bird
   * given, everything does. In a flock each bird only undoes its own.
   */
  restore(by?: Bird) {
    const mine = (o?: Bird) => !by || o === by;
    for (const f of this.food) {
      if (mine(f.flushedBy)) f.flushed = false;
      for (const u of f.units) if (mine(u.by)) u.gone = false;
    }
    if (mine(this.prey?.by)) this.prey = null;
    // A shell, fish or grasshopper the behavior put down goes with it; dust and splashes play out.
    this.particles = this.particles.filter((p) => isDebris(p.kind) || !mine(p.by));
    if (this.peek?.held && !this.feeding) this.peek = null;
  }

  /** A hunter is coming in: the flock bursts out of cover until the hunt is over. */
  startle(kind: FoodKind, by?: Bird) {
    const patch = this.food.find((f) => f.kind === kind);
    if (patch) {
      patch.flushed = true;
      patch.flushedBy = by;
    }
  }

  step(dt: number) {
    this.time += dt;
    for (const f of this.food) f.away = Math.max(0, Math.min(1, f.away + (f.flushed ? dt / 1.2 : -dt / 2)));
    if (this.peek && !this.peek.held && (this.peek.t += dt) > this.peek.seconds) this.peek = null;
    if (!this.feeding && (this.nextPeek -= dt) <= 0) {
      // Only small animals that keep out of sight peek, taking turns. Plants and the flock are always in view.
      const hidden = this.food.filter((f) => FOODS[f.kind].hidden);
      const f = hidden[this.peeked++ % Math.max(1, hidden.length)];
      if (f) {
        // At one of its places when it has them (a caterpillar under a leaf), else anywhere along its patch.
        const [lo, hi] = f.site.x;
        const u = f.units[Math.floor(Math.random() * f.units.length)];
        this.peek = { kind: f.kind, x: u ? u.x : lo + Math.random() * (hi - lo), y: u ? u.y : f.site.y, t: 0, seconds: 2 };
      }
      this.nextPeek = 10 + Math.random() * 5;
    }
    for (const p of this.particles) {
      p.life -= dt;
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y < p.floor) {
        p.y = p.floor;
        p.vx = p.vy = p.gravity = 0;
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  emit(kind: ParticleKind, x: number, y: number, opts: Partial<Particle> = {}): Particle {
    const p: Particle = { kind, x, y, vx: 0, vy: 0, gravity: 0, floor: 0, life: 1, ...opts };
    this.particles.push(p);
    return p;
  }

  /** A puff of debris. `dirX` biases which way it flies. */
  burst(kind: ParticleKind, x: number, y: number, count: number, dirX = 0) {
    for (let i = 0; i < count; i++) {
      this.emit(kind, x, y, {
        vx: dirX * (2 + Math.random() * 5) + (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 6,
        gravity: 25,
        life: 0.5 + Math.random() * 0.5,
      });
    }
  }

  /** Height of whatever a bird's feet would rest on: 0 on land, the bottom under water. */
  floorY(x: number): number {
    const w = this.habitat.water;
    return w && x > w.from ? -Math.min(DEEP, (x - w.from) * SHELVE) : 0;
  }

  clampLand(x: number): number {
    const [lo, hi] = this.habitat.land;
    return Math.max(lo, Math.min(hi, x));
  }
}

export const HABITATS: Record<HabitatId, Habitat> = {
  yard: {
    id: 'yard',
    name: 'Backyard at the forest edge',
    ground: 'grass',
    land: [4, 96],
    litter: [60, 73],
    trunks: [
      { x: 12, top: 44, width: 2.2, climb: null, color: '#5b4636' },
      { x: 32, top: 34, width: 1.9, climb: [2, 30], color: '#8d8478' },
      { x: 86, top: 22, width: 2.4, climb: [2, 15], color: '#6b5443' },
    ],
    limbs: [
      [12, 21, 21, 22.5, 0.6],
      [32, 24, 37, 27, 0.5],
      [86, 16, 74, 21, 0.8],
      [86, 18, 97, 24, 0.8],
      [86, 21, 84, 31, 0.7],
      [77, 19.8, 70, 17, 0.25],
      [94, 22.4, 98, 19, 0.25],
    ],
    foliage: [
      { x: 12, y: 38, r: 3.6, color: '#2f5d3a', front: true },
      { x: 12, y: 32.5, r: 5.4, color: '#2a5535', front: true },
      { x: 11.5, y: 26, r: 7, color: '#2f5d3a', front: true },
      { x: 12.5, y: 18.5, r: 8.2, color: '#2a5535', front: true },
      { x: 86, y: 31, r: 8, color: '#7fae5a' },
      { x: 78, y: 27, r: 6, color: '#8ab864' },
      { x: 94, y: 29, r: 6, color: '#8ab864' },
      { x: 86, y: 37, r: 6, color: '#7fae5a' },
      // Leafy sprays at the ends of the low oak limbs, where gleaners work.
      { x: 70.8, y: 18.3, r: 2.1, color: '#8ab864' },
      { x: 74.6, y: 22.5, r: 2.2, color: '#7fae5a' },
      { x: 97.2, y: 20.3, r: 2.1, color: '#8ab864' },
      { x: 46, y: 3.6, r: 4, color: '#4f8a4a' },
      { x: 50.5, y: 4.6, r: 4.6, color: '#458043' },
      { x: 54, y: 3.2, r: 3.4, color: '#4f8a4a' },
    ],
    props: [
      { kind: 'post', x: 62, y: 0, w: 1, h: 6 },
      { kind: 'post', x: 72, y: 0, w: 1, h: 6 },
      { kind: 'rail', x: 67, y: 4.2, w: 10, h: 0.6 },
      { kind: 'rail', x: 67, y: 2.2, w: 10, h: 0.6 },
    ],
    perches: [
      { kind: 'treetop', x: 12, y: 44 },
      { kind: 'treetop', x: 32, y: 34 },
      { kind: 'branch', x: 21, y: 22.8 },
      { kind: 'branch', x: 37, y: 27.3 },
      { kind: 'branch', x: 74, y: 21.4 },
      { kind: 'branch', x: 97, y: 24.4 },
      { kind: 'twig', x: 70, y: 17.1 },
      { kind: 'twig', x: 98, y: 19.1 },
      { kind: 'shrub', x: 51, y: 9.2 },
      { kind: 'post', x: 62, y: 6 },
      { kind: 'post', x: 72, y: 6 },
      { kind: 'flower', x: 43.5, y: 8 },
      { kind: 'flower', x: 48, y: 11 },
      { kind: 'flower', x: 56, y: 7.5 },
    ],
  },
  beach: {
    id: 'beach',
    name: 'Gardiner Beach on Discovery Bay',
    ground: 'sand',
    land: [4, 55],
    water: { from: 58 },
    trunks: [{ x: 8, top: 42, width: 2.2, climb: null, color: '#8d8478' }],
    limbs: [[8, 30, 16, 33, 0.6]],
    foliage: [
      { x: 1, y: 7, r: 9, color: '#3a6b45' },
      { x: 15, y: 3, r: 4.5, color: '#4f8a4a' },
    ],
    props: [
      { kind: 'log', x: 26, y: 0, w: 13, h: 1.6 },
      { kind: 'rock', x: 44, y: 0, w: 8, h: 3 },
      { kind: 'rock', x: 49, y: 0, w: 5, h: 1.8 },
      { kind: 'post', x: 66, y: -2, w: 1.3, h: 11 },
      { kind: 'post', x: 90, y: -3, w: 1.3, h: 10 },
    ],
    perches: [
      { kind: 'treetop', x: 8, y: 42 },
      { kind: 'branch', x: 16, y: 33.3 },
      { kind: 'log', x: 26, y: 1.6 },
      { kind: 'rock', x: 44, y: 3 },
      { kind: 'post', x: 66, y: 9 },
      { kind: 'post', x: 90, y: 7 },
    ],
  },
};
