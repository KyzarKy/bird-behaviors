import { EXTRAS, FOOD_SITES, REGROW, type FoodKind, type FoodSite } from './food';
import type { HabitatId, Item, PerchKind, Vec } from './traits';

/**
 * Stage coordinates: x runs 0..100 left to right, y is height above the
 * ground line. Distances and bird sizes are stylized, not to scale.
 */
export const STAGE = { width: 100, top: 53, bottom: -9 };

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

export type ParticleKind = 'dust' | 'splash' | 'chip' | 'leaf' | Item;

export interface Particle extends Vec {
  kind: ParticleKind;
  vx: number;
  vy: number;
  gravity: number;
  /** Height at which it stops falling. */
  floor: number;
  life: number;
}

/** A food on show. `left` is 1 for a whole piece, and climbs back from 0 after one is eaten. */
export interface FoodPatch {
  kind: FoodKind;
  site: FoodSite;
  units: (Vec & { left: number })[];
  /** Seconds before it peeks again, after a bird has just fed on it. */
  quiet: number;
}

/** A small animal showing itself, or a plant stirring, for a moment. */
export interface Peek extends Vec {
  kind: FoodKind;
  /** Seconds since it began. */
  t: number;
  seconds: number;
}

export class World {
  particles: Particle[] = [];
  food: FoodPatch[] = [];
  peek: Peek | null = null;
  /** Seconds since the scene was made. */
  time = 0;
  // The first peek comes soon after a bird arrives, then only one to three a minute.
  private nextPeek = 2 + Math.random() * 6;

  constructor(readonly habitat: Habitat) {
    this.stock([]);
  }

  /** Show these foods, plus the scene's fixed extras, and nothing else. */
  stock(kinds: FoodKind[]) {
    const sites = FOOD_SITES[this.habitat.id];
    this.food = [...new Set([...EXTRAS[this.habitat.id], ...kinds])].flatMap((kind) => {
      const site = sites[kind];
      return site ? [{ kind, site, units: (site.units ?? []).map((u) => ({ ...u, left: 1 })), quiet: 0 }] : [];
    });
  }

  site(kind: FoodKind | null): FoodSite | null {
    return this.food.find((f) => f.kind === kind)?.site ?? null;
  }

  /** A bird fed here: a piece or two near x goes, and the food keeps out of sight for a while. */
  eat(kind: FoodKind, x: number) {
    const patch = this.food.find((f) => f.kind === kind);
    if (!patch) return;
    patch.quiet = 20;
    const whole = patch.units.filter((u) => u.left >= 1).sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x));
    for (const u of whole.slice(0, 1 + Math.round(Math.random()))) u.left = 0;
  }

  step(dt: number) {
    this.time += dt;
    for (const f of this.food) {
      f.quiet -= dt;
      for (const u of f.units) u.left = Math.min(1, u.left + dt / REGROW);
    }
    if (this.peek && (this.peek.t += dt) > this.peek.seconds) this.peek = null;
    if ((this.nextPeek -= dt) <= 0) {
      // Carrion stays still and out of sight.
      const ready = this.food.filter((f) => f.quiet <= 0 && f.kind !== 'carrion');
      const f = ready[Math.floor(Math.random() * ready.length)];
      if (f) {
        const [lo, hi] = f.site.x;
        this.peek = { kind: f.kind, x: lo + Math.random() * (hi - lo), y: f.site.y, t: 0, seconds: 2 };
        this.nextPeek = 20 + Math.random() * 40;
      } else this.nextPeek = 3;
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
    return w && x > w.from ? -Math.min(2.4, (x - w.from) * 0.22) : 0;
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
