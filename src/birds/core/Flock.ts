import { clamp, rand, type Bird } from './Bird';
import { behaviorsOf, variantsOf, type SpeciesClass } from './reflect';
import type { Variant, Vec } from './traits';

/** The most birds a flock draws, however big it is in life: enough to read as a flock, few enough to stay legible on a phone. */
export const FLOCK_CAP = 30;

/**
 * The birds on the stage: one, or a flock of one species when the Flock setting is on. Every bird runs its
 * own auto mode in the one shared World; the flock now and then does something together (a behavior marked
 * `flock`), such as moving off as a group.
 */
export class Flock {
  birds: Bird[];
  /** Seconds until the flock does something together. */
  private next = 0;
  private plan = new Map<Bird, { delay: number; to: Vec | null; rank: number; side: -1 | 0 | 1 }>();
  /** Which way the flock is heading when it moves, and the middle of where it starts and where it is going. */
  heading: 1 | -1 = 1;
  course = { from: 50, to: 50 };

  constructor(bird: Bird) {
    this.birds = [bird];
  }

  get lead(): Bird {
    return this.birds[0];
  }

  get on(): boolean {
    return this.birds.length > 1;
  }

  /** How many this species is drawn with when the Flock setting is on; 1 for a bird usually seen alone. */
  static sizeOf(bird: Bird): number {
    return Math.min(FLOCK_CAP, Math.max(1, Math.round(bird.ecology.flockSize)));
  }

  /** Neighbor to neighbor: the species' spacing, squeezed so the whole flock fits on the land or water it is on. */
  get gap(): number {
    const { land, water } = this.lead.world.habitat;
    const room = this.lead.afloat && water ? 96 - (water.from + 4) : land[1] - land[0];
    return Math.min(this.lead.ecology.flockSpacing * this.lead.size, room / Math.max(1, this.birds.length));
  }

  /** How far from the middle of the flock a bird strays on its own. */
  get reach(): number {
    return clamp(this.gap * this.birds.length * 0.6, 8, 40);
  }

  center(): Vec {
    const n = this.birds.length;
    return {
      x: this.birds.reduce((s, b) => s + b.pos.x, 0) / n,
      y: this.birds.reduce((s, b) => s + b.pos.y, 0) / n,
    };
  }

  /**
   * Fill out to the species' flock size around the bird on stage. Where the species has a female plumage the
   * sexes are mixed, and `flockJuveniles` of the flock are in juvenile plumage where it has one.
   */
  grow() {
    const lead = this.lead;
    const Kind = lead.constructor as SpeciesClass;
    const variants = variantsOf(Kind);
    const other: Variant = lead.variant === 'female' ? 'adult' : 'female';
    const young = variants.includes('juvenile') ? (lead.ecology.flockJuveniles ?? 0) : 0;
    const every = young > 0 ? Math.max(2, Math.round(1 / young)) : Infinity;
    lead.flock = this;
    for (let k = 1; k < Flock.sizeOf(lead); k++) {
      const v: Variant = k % every === 0 ? 'juvenile' : variants.includes('female') && k % 2 ? other : lead.variant === 'juvenile' ? 'adult' : lead.variant;
      const b = new Kind(lead.world, false, v);
      b.flock = this;
      this.birds.push(b);
      b.joinNear(lead, k, this.gap);
    }
    for (const b of this.birds) b.auto = true;
    this.next = rand(10, 20);
  }

  /** Back to one bird: the one nearest the middle of the flock stays where it is; the rest leave, taking back whatever they had going. */
  solo(): Bird {
    const c = this.center();
    const d = (b: Bird) => Math.hypot(b.pos.x - c.x, b.pos.y - c.y);
    const keep = this.birds.reduce((a, b) => (d(b) < d(a) ? b : a));
    for (const b of this.birds) {
      b.flock = null;
      if (b === keep) continue;
      b.world.feeders.delete(b);
      b.world.restore(b);
    }
    this.birds = [keep];
    this.plan.clear();
    return keep;
  }

  /** Every bird does `key`, a flock behavior. */
  perform(key: string) {
    this.planMove();
    for (const b of this.birds) b.perform(key);
    this.next = rand(25, 45);
  }

  /** How long `bird` waits before it joins in what the flock is doing. */
  delay(bird: Bird): number {
    return this.plan.get(bird)?.delay ?? 0;
  }

  /**
   * `bird`'s station for the behavior under way: `rank` 0 is the bird that goes first, and the rest are ranked
   * by how far back they are, alternating `side` (1 or -1) so there are two even arms.
   */
  station(bird: Bird): { rank: number; side: -1 | 0 | 1 } {
    const p = this.plan.get(bird);
    return p ? { rank: p.rank, side: p.side } : { rank: 0, side: 0 };
  }

  /** Where `bird` goes when the flock moves, or null for a perch of its own. */
  destination(bird: Bird): Vec | null {
    return this.plan.get(bird)?.to ?? null;
  }

  /** Steps the world once and every bird in it, and starts something together now and then. */
  update(dt: number) {
    this.lead.world.step(dt);
    for (const b of this.birds) b.update(dt);
    if (this.on && (this.next -= dt) <= 0) {
      const options = behaviorsOf(this.lead.constructor as SpeciesClass).filter((b) => b.spec.flock && !this.lead.missing(b.key));
      let roll = Math.random() * options.reduce((sum, b) => sum + (b.spec.weight ?? 1), 0);
      const pick = options.find((b) => (roll -= b.spec.weight ?? 1) < 0);
      if (pick) this.perform(pick.key);
      else this.next = Infinity;
    }
  }

  /**
   * Where everyone goes if the flock moves off: to the far side of the land or water it is on, or, for a bird
   * that `crossesShore`, to whichever of the land and the water is farther. Destinations keep the birds' order
   * along x. Stations are separate: the bird that goes first, then the rest alternating sides behind it, so a
   * V gets two even arms. A perched flock picks perches, one bird to each.
   */
  private planMove() {
    const lead = this.lead;
    const { land, water } = lead.world.habitat;
    const wet: [number, number] | null = water ? [water.from + 4, 96] : null;
    const afloat = lead.afloat && !!wet;
    const perched = !afloat && (lead.airborne || lead.pos.y > 0.05);
    const c = this.center().x;
    const options: [number, number][] = [afloat ? wet! : land];
    if (wet && lead.crossesShore) options.push(afloat ? land : wet);
    const far = (r: [number, number]) => Math.max(Math.abs(r[0] - c), Math.abs(r[1] - c));
    const [lo, hi] = options.reduce((a, b) => (far(b) > far(a) ? b : a));
    const n = this.birds.length;
    const gap = Math.min(lead.ecology.flockSpacing * lead.size, (hi - lo) / Math.max(1, n));
    const half = Math.min((gap * (n - 1)) / 2, (hi - lo) / 2);
    const mid = (lo + hi) / 2;
    const between = (a: number, b: number) => rand(Math.min(a, b), Math.max(a, b));
    // The half of the range away from where the flock is now.
    const to = c > mid ? between(lo + half, mid) : between(mid, hi - half);
    this.heading = to >= c ? 1 : -1;
    this.course = { from: c, to };
    this.plan.clear();
    const stations = [...this.birds].sort(() => Math.random() - 0.5);
    [...this.birds]
      .sort((a, b) => a.pos.x - b.pos.x)
      .forEach((b, i) => {
        const k = stations.indexOf(b);
        this.plan.set(b, {
          delay: k * rand(0.08, 0.25),
          to: perched ? null : { x: clamp(to - half + i * gap, lo, hi), y: 0 },
          rank: Math.ceil(k / 2),
          side: k === 0 ? 0 : k % 2 ? 1 : -1,
        });
      });
  }
}
