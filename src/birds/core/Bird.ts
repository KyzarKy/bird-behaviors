import { eatsIn, FOODS, type FoodKind, type FoodSite } from './food';
import { behaviorsOf, resolveTraits, variantsOf, type BirdClass } from './reflect';
import type { BehaviorTable, Ecology, FlightProfile, Item, Look, PerchKind, Script, Taxon, Variant, Variants, Vec } from './traits';
import type { Flock } from './Flock';
import { DEEP, peekSpot, SHELVE, STAGE, type Trunk, type World } from './World';

/** Stage units per second for each m/s of real airspeed. */
const SPEED = 2.2;
const TAU = Math.PI * 2;
/** Wingbeats up to this rate are drawn at their real speed: at 60 frames a second each beat still gets six frames. */
const TRUE_TO_LIFE_FLAP = 10;
/** The fastest beat a 60 Hz screen draws smoothly, three frames per beat. The hummingbird's 45 is drawn here. */
const MAX_DRAWN_FLAP = 20;
/** Chosen so the curve passes through (45, 20): solves k * ln(1 + 35 / k) = 10. */
const FLAP_KNEE = 4.68;

/**
 * Real wingbeats per second to drawn ones. Up to 10 a second they are left
 * alone. Above that the extra is compressed on a log curve that starts at
 * the same slope, so there is no visible kink, and reaches 20 at the
 * hummingbird's 45. A chickadee's 25 is drawn at about 17; an eagle's 2.5 at 2.5.
 */
export const drawnFlapRate = (real: number) =>
  real <= TRUE_TO_LIFE_FLAP ? real : Math.min(MAX_DRAWN_FLAP, TRUE_TO_LIFE_FLAP + FLAP_KNEE * Math.log(1 + (real - TRUE_TO_LIFE_FLAP) / FLAP_KNEE));

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const ease = (t: number) => t * t * (3 - 2 * t);
const angleDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

/** Small birds are drawn larger than life so their movements stay readable. */
export const drawLength = (meters: number) => 3 + 7 * meters ** 0.6;

/** What the renderer reads each frame. Behaviors animate a bird by writing here. */
export interface Pose {
  facing: 1 | -1;
  /** Whole-bird rotation about the feet: clinging to bark, hanging under a twig. */
  rotation: number;
  /** Roll about the direction of travel. */
  roll: number;
  /** Body angle: 0 horizontal, positive head-up. */
  pitch: number;
  /** Neck direction and how far it is extended (0..1+). */
  neck: number;
  neckExt: number;
  /** Head angle: 0 level, negative bill-down. */
  head: number;
  headThrust: number;
  tailAngle: number;
  tailFan: number;
  /** 0 standing tall .. 1 sitting on its belly. */
  crouch: number;
  crest: number;
  beakOpen: number;
  /** -1..1 walking leg swing. */
  stride: number;
  /** -1 reaching forward .. 1 raked back, per foot. */
  kickNear: number;
  kickFar: number;
  wings: 'folded' | 'open';
  /** -1 downstroke .. 1 upstroke. */
  flap: number;
  carry: Item | null;
  carryInFeet: boolean;
  speech: string | null;
}

type NumericPose = { [K in keyof Pose as Pose[K] extends number ? (number extends Pose[K] ? K : never) : never]: number };

export interface FlyOpts {
  /** Multiple of cruise speed. */
  speed?: number;
  /** Touch down at the target. False passes through it still flying. */
  land?: boolean;
  /** Hold the wings set instead of flapping. */
  glide?: boolean;
}

type PerchPick = 'near' | 'far' | 'any';

/**
 * Class Aves. Everything every bird can do lives here, written once and
 * driven by the trait tables, so a hummingbird and an eagle run the same
 * flyTo() and come out looking nothing alike.
 *
 * Public generator methods are behaviors a user can trigger. Protected
 * generator methods are the building blocks subclasses compose them from.
 */
export abstract class Bird {
  static taxon: Taxon = {
    rank: 'class',
    name: 'Aves',
    common: 'Bird',
    note: 'Feathered, beaked, egg-laying. Flight, perching, preening and calling are defined once here; every order below only says how it differs.',
  };

  static flight: Partial<FlightProfile> = {
    cruiseSpeed: 10,
    power: 0.5,
    agility: 0.5,
    braking: 0.4,
    hover: 0,
    glide: 0.4,
    flapRate: 6,
    flapDuty: 1,
    cyclePeriod: 1,
    restPose: 'spread',
    endurance: Infinity,
    ceiling: 60,
  };

  static ecology: Partial<Ecology> = {
    habitat: 'yard',
    perches: ['branch'],
    gait: 'hop',
    groundSpeed: 5,
    headBob: false,
    swims: false,
    flockSize: 1,
    flockSpacing: 1.5,
    posture: 0.15,
    call: 'chip',
  };

  static look: Partial<Look> = {
    length: 0.2,
    build: 0.5,
    neckLength: 0.08,
    legLength: 0.14,
    tailLength: 0.5,
    wingSpan: 1.5,
    headSize: 1,
    beakLength: 0.5,
    beakShape: 'cone',
    tailShape: 'square',
    tailCock: 0,
    crest: 'none',
    legsTrail: false,
    body: '#8a7a66',
    belly: '#d9d0c2',
    head: '#8a7a66',
    wing: '#6e6152',
    tail: '#5d5245',
    beak: '#333333',
    legs: '#4a4038',
    eye: '#111111',
  };

  static variants?: Variants;

  static behaviors: BehaviorTable<Bird> = {
    flyTogether: {
      label: 'Fly off together',
      cue: 'One bird lifts off and the rest follow within a second or two, keeping together in the air and landing again as a group.',
      flock: true,
      weight: 2,
    },
    fly: {
      label: 'Fly to a new spot',
      cue: 'Watch the wingbeat rhythm and the line it draws through the air: steady rowing, flap-and-bound, flap-and-glide, or soaring. Flight style alone often names the family.',
      weight: 2,
    },
    forage: {
      eats: { yard: 'grassBugs', beach: 'wrack' },
      label: 'Forage',
      cue: 'How a bird feeds is usually its most reliable behavioral field mark.',
      feeding: true,
      weight: 6,
    },
    preen: {
      label: 'Preen and stretch',
      cue: 'Nibbling the breast feathers, a one-wing stretch, then a full-body shake. A relaxed bird; a good moment to study plumage.',
      weight: 2,
    },
    call: {
      label: 'Call',
      cue: 'Calls are short and given year-round by both sexes, unlike song.',
      weight: 3,
    },
  };

  readonly flight: FlightProfile;
  readonly ecology: Ecology;
  readonly look: Look;
  /** The plumage shown (see Bird.variants). */
  readonly variant: Variant;
  /** Drawn body length in stage units. */
  readonly size: number;
  readonly pose: Pose;

  pos: Vec = { x: 50, y: 0 };
  vel: Vec = { x: 0, y: 0 };
  airborne = false;
  /** Key of the behavior in progress, or null when idling. */
  current: string | null = null;
  /** Left to itself, the bird picks its own next behavior after each pause. */
  auto = false;

  /** Seconds since takeoff. Drives the flap cycle and endurance. */
  protected airTime = 0;
  private script: Script | null = null;
  private speechTimer = 0;
  /** Seconds of idling left before an autonomous bird does something. */
  private pause = 0;
  private last: string | null = null;
  /** The food the running behavior is after, so the bird goes where it is and takes it there. */
  private meal: { kind: FoodKind; site: FoodSite } | null = null;
  /**
   * The animal the bird picked out of a peek (see aimAt): every place-picking helper goes back to it
   * until the bird takes something or misses it.
   */
  private lead: Vec | null = null;
  /** Where the bird would like to feed first: the animal it picked out, else one still held in a peek of the kind it eats. */
  private takeLead(): Vec | null {
    const p = this.world.peek;
    return this.lead ?? (p?.held && p.kind === this.meal?.kind ? peekSpot(p, this.world.habitat) : null);
  }
  /** How many times this bird has taken food (see take()). */
  taken = 0;
  /** Seconds left before the bird lets go of what it holds. */
  private holdTimer = 0;
  /** Moves the other birds in the running behavior's story (party), every frame until it ends. */
  private others: ((dt: number) => void) | null = null;
  /** Other birds in the story of the running behavior, such as the tern a jaeger robs. Drawn, and moved by this bird. */
  party: Bird[] = [];
  /** The flock this bird is in when the Flock setting is on, else null. */
  flock: Flock | null = null;
  /** The perch this bird last picked, so flockmates pick others. */
  private claim: Vec | null = null;

  /**
   * `stock` false is a bird that only plays a part in another's behavior, such as the tern a jaeger robs: it leaves the scene's food alone.
   * `variant` picks a plumage from the species' `variants`; one it does not have falls back to the adult.
   */
  constructor(
    readonly world: World,
    stock = true,
    variant: Variant = 'adult',
  ) {
    const cls = this.constructor as BirdClass;
    this.flight = resolveTraits<FlightProfile>(cls, 'flight');
    this.ecology = resolveTraits<Ecology>(cls, 'ecology');
    this.variant = variantsOf(cls).includes(variant) ? variant : 'adult';
    this.look = { ...resolveTraits<Look>(cls, 'look'), ...(this.variant !== 'adult' && cls.variants?.[this.variant]) };
    this.size = drawLength(this.look.length);
    this.pose = {
      facing: 1,
      rotation: 0,
      wings: 'folded',
      carry: null,
      carryInFeet: false,
      speech: null,
      ...this.restingPose(),
    };
    this.spawn();
    if (stock) world.stock(this.diet());
  }

  /** Every food this bird can go after in its scene. */
  diet(): FoodKind[] {
    return behaviorsOf(this.constructor as BirdClass)
      .filter((b) => !this.missing(b.key))
      .flatMap((b) => eatsIn(b.spec, this.world.habitat.id) ?? []);
  }

  // ---------------------------------------------------------------- driving

  /** Start a behavior by method name, replacing whatever was running. */
  perform(key: string) {
    const method = (this as unknown as Record<string, unknown>)[key];
    if (typeof method !== 'function') throw new Error(`${this.constructor.name} has no behavior "${key}"`);
    const p = this.pose;
    p.kickNear = p.kickFar = p.stride = p.headThrust = p.roll = p.beakOpen = p.crest = 0;
    this.hold(null);
    this.world.feeders.delete(this);
    this.world.restore(this);
    this.others = null;
    this.party = [];
    this.current = this.last = key;
    const spec = behaviorsOf(this.constructor as BirdClass).find((b) => b.key === key)?.spec;
    const kind = spec && eatsIn(spec, this.world.habitat.id);
    const site = this.world.site(kind ?? null);
    this.meal = kind && site ? { kind, site } : null;
    // Feeding ends any peek, and none start until it is over. An animal of the kind the bird eats that
    // was showing holds still where it is: if the bird goes for it, it is the prey (see aimAt).
    const peek = this.world.peek;
    this.lead = null;
    if (this.meal) this.world.feeders.add(this);
    if (peek && this.meal) {
      if (peek.kind === this.meal.kind) peek.held = true;
      else this.world.peek = null;
    }
    this.script = (method as () => Script).call(this);
  }

  /** What this scene lacks for a behavior (open water, rocks, bark to climb), or null if it can be done here. */
  missing(key: string): string | null {
    const needs = behaviorsOf(this.constructor as BirdClass).find((b) => b.key === key)?.spec.needs;
    if (needs === 'water' && !this.world.habitat.water) return 'open water';
    if (needs === 'rocks' && !this.world.habitat.perches.some((p) => p.kind === 'rock')) return 'rocks';
    if (needs === 'bark' && !this.world.habitat.trunks.some((t) => t.climb)) return 'a trunk with bark to climb';
    return null;
  }

  /** What auto mode can pick from in this scene, with each behavior's relative odds. Flock behaviors are the flock's to pick (see Flock). */
  autoOptions(): { key: string; weight: number }[] {
    return behaviorsOf(this.constructor as BirdClass)
      .filter((b) => !b.spec.flock && !this.missing(b.key))
      .map((b) => ({ key: b.key, weight: b.spec.weight ?? 1 }));
  }

  /** Whether `key` goes after a small animal that keeps out of sight, which the scene draws one of at a time. */
  private huntsHidden(key: string): boolean {
    const spec = behaviorsOf(this.constructor as BirdClass).find((b) => b.key === key)?.spec;
    const kind = spec && eatsIn(spec, this.world.habitat.id);
    return !!kind && !!FOODS[kind]?.hidden;
  }

  /**
   * A behavior drawn by weight from everything this class can do, never the same one twice running. In a flock
   * a bird does not fly off on its own (the flock moves together), and it waits its turn to hunt a hidden animal.
   */
  private choose(): string {
    const mates = this.flock?.birds.filter((b) => b !== this) ?? [];
    const hunting = mates.some((b) => b.current !== null && b.huntsHidden(b.current));
    const options = this.autoOptions().filter((b) => b.key !== this.last && !(this.flock && (b.key === 'fly' || (hunting && this.huntsHidden(b.key)))));
    let roll = Math.random() * options.reduce((sum, b) => sum + b.weight, 0);
    return options.find((b) => (roll -= b.weight) < 0)!.key;
  }

  update(dt: number) {
    if (this.speechTimer > 0 && (this.speechTimer -= dt) <= 0) this.pose.speech = null;
    if (!this.script) {
      this.current = null;
      this.script = this.idle();
      this.pause = rand(1.5, 4);
    } else if (this.auto && this.current === null && (this.pause -= dt) <= 0) {
      this.perform(this.choose());
    }
    if (this.holdTimer > 0 && (this.holdTimer -= dt) <= 0) this.hold(null);
    this.others?.(dt);
    if (this.script.next(dt).done) {
      this.world.feeders.delete(this);
      if (this.current) {
        this.hold(null);
        this.world.restore(this);
        this.others = null;
        this.party = [];
      }
      this.meal = this.lead = null;
      this.script = null;
    }
  }

  // -------------------------------------------------------------- behaviors

  *fly(): Script {
    const dest = this.findPerch(undefined, 'far') ?? this.groundSpot(this.pos.x > 50 ? 15 : 85, 8);
    if (!(yield* this.flyOver(dest)) && dest.y <= 0.05) yield* this.moveOnGround(dest.x);
    yield* this.relax();
  }

  /** The whole flock moves off: each bird takes off a moment after the one before and lands near the others. */
  *flyTogether(): Script {
    const f = this.flock;
    if (!f) return yield* this.fly();
    yield* this.wait(f.delay(this));
    const dest = f.destination(this) ?? this.findPerch(undefined, 'far') ?? this.groundSpot(this.pos.x > 50 ? 15 : 85, 8);
    if (!(yield* this.flyOver(dest)) && dest.y <= 0.05) yield* this.moveOnGround(dest.x);
    yield* this.relax();
  }

  /**
   * Fly with the flock in formation to where it is going (see Flock): up to `height`, across, and down to this
   * bird's own landing spot. Each bird flies the same course offset to its station, so the shape holds as they
   * go: a V (the arms a step back and a little above or below the bird ahead, seen from the side) or one long,
   * wavering line.
   */
  protected *formationFlight(shape: 'V' | 'line', height: number): Script {
    const f = this.flock;
    if (!f) return yield* this.fly();
    const { rank, side } = f.station(this);
    const dir = f.heading;
    const step = Math.min(this.size * 1.1, (shape === 'V' ? 90 : 60) / f.birds.length);
    const back = shape === 'V' ? rank * step : (2 * rank - (side > 0 ? 1 : 0)) * step;
    const up = shape === 'V' ? side * rank * step * 0.45 : Math.sin(rank * 1.7) * step * 0.3;
    const y = clamp(Math.min(height, this.flight.ceiling) + up, 5, STAGE.top - 4);
    const dest = f.destination(this) ?? this.findPerch(undefined, 'far') ?? this.groundSpot(f.course.to, 6);
    yield* this.wait(f.delay(this));
    yield* this.flyTo({ x: clamp(f.course.from + dir * 10 - dir * back, 2, 98), y }, { land: false });
    yield* this.flyTo({ x: clamp(f.course.to + dir * 6 - dir * back, 2, 98), y }, { land: false });
    if (!(yield* this.flyTo(dest)) && dest.y <= 0.05) yield* this.moveOnGround(dest.x);
    yield* this.relax();
  }

  *forage(): Script {
    yield* this.toGround();
    for (let i = 0; i < 3; i++) {
      yield* this.moveOnGround(this.foodSpot(6).x);
      yield* this.peck(Math.ceil(rand(1, 3)));
    }
    yield* this.relax();
  }

  *preen(): Script {
    yield* this.settle();
    const rest = this.restingPose();
    yield* this.poseTo({ neck: 0.1, head: -1.9, pitch: rest.pitch + 0.1 }, 0.25);
    for (let i = 0; i < 4; i++) {
      yield* this.poseTo({ head: -2.2 }, 0.08);
      yield* this.poseTo({ head: -1.8 }, 0.08);
    }
    yield* this.relax(0.25);
    // One-wing stretch.
    this.pose.wings = 'open';
    yield* this.poseTo({ flap: -0.8, tailFan: 1 }, 0.4);
    yield* this.wait(0.5);
    yield* this.poseTo({ flap: 0, tailFan: 0 }, 0.3);
    this.pose.wings = 'folded';
    // Rouse: shake everything back into place.
    for (let i = 0; i < 5; i++) {
      yield* this.poseTo({ pitch: rest.pitch + 0.12, tailFan: 0.8 }, 0.05);
      yield* this.poseTo({ pitch: rest.pitch - 0.08, tailFan: 0.3 }, 0.05);
    }
    yield* this.relax();
  }

  *call(): Script {
    yield* this.settle();
    this.say(this.ecology.call, 2.4);
    for (let i = 0; i < 4; i++) {
      yield* this.poseTo({ beakOpen: 1, head: 0.2 }, 0.08);
      yield* this.poseTo({ beakOpen: 0 }, 0.14);
    }
    yield* this.relax();
  }

  // ------------------------------------------------------ overridable hooks

  /**
   * Place this new flock member `k` places out from `lead`, alternating sides, `gap` apart: afloat beside it,
   * on the ground beside it, or on a free perch if it is perched.
   */
  joinNear(lead: Bird, k: number, gap: number) {
    const dx = (k % 2 ? -1 : 1) * Math.ceil(k / 2) * gap;
    const water = this.world.habitat.water;
    if (lead.afloat && water) this.pos = { x: clamp(lead.pos.x + dx, water.from + 4, 96), y: 0 };
    else {
      this.pos = { ...lead.pos };
      const perch = lead.pos.y > 0.05 || lead.airborne ? this.findPerch(undefined, 'near') : null;
      this.pos = perch ? { x: perch.x, y: perch.y } : { x: this.world.clampLand(lead.pos.x + dx), y: 0 };
    }
    this.airborne = false;
    this.pose.facing = Math.random() < 0.5 ? 1 : -1;
  }

  /** A swimmer that also comes ashore, so its flock may move between the water and the land. */
  get crossesShore(): boolean {
    return false;
  }

  /** Where a new bird appears. Runs at the end of the constructor. */
  protected spawn() {
    const perch = this.findPerch(undefined, 'any');
    this.pos = perch ? { x: perch.x, y: perch.y } : (this.waterSpot() ?? this.groundSpot(40, 12));
  }

  /** The pose the bird returns to between actions. */
  protected restingPose(): Omit<NumericPose, 'rotation'> {
    return {
      roll: 0,
      pitch: this.ecology.posture,
      neck: 0.95,
      neckExt: 1,
      head: 0,
      headThrust: 0,
      tailAngle: this.look.tailCock,
      tailFan: 0,
      crouch: 0,
      crest: 0,
      beakOpen: 0,
      stride: 0,
      kickNear: 0,
      kickFar: 0,
      flap: 0,
    };
  }

  /** Called every airborne frame after the generic flight pose is set. */
  protected adjustFlightPose() {}

  /** What the bird does when nothing has been asked of it. */
  protected *idle(): Script {
    yield* this.settle();
    yield* this.relax(0.3);
    for (;;) yield* this.lookAround(rand(1, 3));
  }

  // ------------------------------------------------------------- flight

  /**
   * The one flight routine. Steers toward `target` and returns whether it got
   * there; a bird that runs out of endurance or ceiling lands short instead.
   *
   *   cruiseSpeed, power, braking  how fast it goes, launches and stops
   *   agility                      how sharply the path can bend
   *   flapDuty, cyclePeriod        the rhythm of flapping and resting
   *   restPose, glide              what resting costs in height
   *   endurance, ceiling           when it has to give up
   */
  protected *flyTo(target: Vec, { speed = 1, land = true, glide = false }: FlyOpts = {}): Script<boolean> {
    const f = this.flight;
    const cruise = f.cruiseSpeed * SPEED * speed;
    const accel = 12 + 80 * f.power;
    const decel = 10 + 230 * f.braking ** 2;
    const turnRate = 1 + 9 * f.agility;
    // Height lost per second while not flapping: a closed-wing bound drops like a
    // thrown ball, set wings sink only as fast as the glide ratio allows.
    const sink = f.restPose === 'folded' ? 10 : 7 * (1 - f.glide);

    if (!this.airborne) yield* this.takeOff(target);

    // The bird stays between x 1 and 99, so a target past that is reached at the edge, not chased into it forever.
    let goal = { x: clamp(target.x, 1, 99), y: target.y };
    let reached = true;
    if (target.y > f.ceiling) {
      goal = { x: goal.x, y: this.restY(goal.x) };
      reached = false;
      land = true;
    }
    let legTime = 0;

    for (;;) {
      const dt = yield;
      this.airTime += dt;
      legTime += dt;

      if (reached && this.airTime > f.endurance) {
        // Spent. Come down wherever it happens to be.
        const x = this.world.clampLand(this.pos.x + this.pose.facing * 5);
        goal = { x, y: this.restY(x) };
        reached = false;
        land = glide = true;
      }

      const dx = goal.x - this.pos.x;
      const dy = goal.y - this.pos.y;
      const dist = Math.hypot(dx, dy);
      const v = Math.hypot(this.vel.x, this.vel.y);
      if (dist < Math.max(0.6, v * dt * 1.5)) break;

      const cruising = dist > 7 && legTime > 0.35;
      const phase = (this.airTime % f.cyclePeriod) / f.cyclePeriod;
      const flapping = glide ? dist < 3 && land : !cruising || phase < f.flapDuty;

      // Brake early enough to arrive under control: poor brakers need a long approach.
      const wantSpeed = land ? Math.min(cruise, Math.sqrt(2 * decel * dist) + 1.5) : cruise;
      let wx = (dx / dist) * wantSpeed;
      let wy = (dy / dist) * wantSpeed;
      // The flap/rest cycle shows up as a rise and fall around the line of travel.
      if (cruising && !glide && f.flapDuty < 1) wy += flapping ? (sink * (1 - f.flapDuty)) / f.flapDuty : -sink;

      const want = Math.atan2(wy, wx);
      const wantMag = Math.hypot(wx, wy);
      let heading = v > 0.5 ? Math.atan2(this.vel.y, this.vel.x) : want;
      // Turn rate tightens close in (and after a long miss) so nothing orbits its target forever.
      const maxTurn = turnRate * dt * (1 + 6 / Math.max(dist, 1)) * (legTime > 8 ? 5 : 1);
      let turn = angleDiff(want, heading);
      // A near-reversal with no room below goes up and over, not down through the ground.
      const room = this.pos.y - this.restY(this.pos.x);
      if (Math.abs(turn) > 2 && Math.sin(heading + turn / 2) < 0 && room < (2.5 * v) / turnRate) turn -= Math.sign(turn) * TAU;
      heading += clamp(turn, -maxTurn, maxTurn);
      const nv = v < wantMag ? Math.min(wantMag, v + accel * dt) : Math.max(wantMag, v - decel * dt);
      this.vel = { x: Math.cos(heading) * nv, y: Math.sin(heading) * nv };
      this.pos.x = clamp(this.pos.x + this.vel.x * dt, 1, 99);
      this.pos.y += this.vel.y * dt;
      if (dist > 2) this.pos.y = Math.max(this.pos.y, this.restY(this.pos.x) + 0.4);
      // A wide turn swings it up, but not out of the top of the scene.
      this.pos.y = Math.min(this.pos.y, Math.max(goal.y, this.sky));

      this.flightPose(flapping);
    }

    this.pos = { x: goal.x, y: goal.y };
    if (land) this.touchDown();
    return reached;
  }

  /** The highest it flies on its own: low enough that its body stays in the scene. */
  protected get sky(): number {
    return STAGE.top - this.size * 0.6;
  }

  /** flyTo, but climbing first when both ends are near the ground. */
  protected *flyOver(target: Vec): Script<boolean> {
    if (target.y < 2 && this.pos.y < 2) {
      const span = Math.abs(target.x - this.pos.x);
      const mid = { x: (this.pos.x + target.x) / 2, y: Math.min(this.flight.ceiling, 3 + span * 0.2) };
      if (!(yield* this.flyTo(mid, { land: false }))) return false;
    }
    return yield* this.flyTo(target);
  }

  /**
   * Hold position in the air for up to `seconds`. The `hover` trait decides
   * how long that really lasts, how much the bird wobbles and how upright it
   * has to hang to manage it. `drift` moves the hover point, which is how a
   * hummingbird flies backward; weak hoverers should leave it alone.
   */
  protected *hoverFor(seconds: number, { aim = 0, drift = { x: 0, y: 0 } }: { aim?: number; drift?: Vec } = {}): Script {
    const h = this.flight.hover;
    if (!this.airborne || h < 0.15) return;
    const hold = h > 0.9 ? seconds : Math.min(seconds, 1 + 9 * h);
    const slop = (1 - h) * 0.9;
    const from = { ...this.pos };
    const p = this.pose;
    this.vel = { x: 0, y: 0 };
    p.wings = 'open';
    p.rotation = 0;
    for (let t = 0; t < hold; ) {
      const dt = yield;
      t += dt;
      this.airTime += dt;
      const k = Math.min(1, t / hold);
      this.pos.x = from.x + drift.x * k + slop * 0.6 * Math.sin(t * 2.3);
      this.pos.y = from.y + drift.y * k + slop * Math.sin(t * 5.1);
      p.pitch = 0.45 + (1 - h) * 0.7;
      p.tailFan = h > 0.9 ? 0.2 : 1;
      p.tailAngle = h > 0.9 ? 0 : -0.5;
      p.neck = 0.6;
      p.head = aim;
      p.flap = Math.sin(this.airTime * TAU * drawnFlapRate(this.flight.flapRate * 1.3));
      this.adjustFlightPose();
    }
    p.tailFan = 0;
    p.tailAngle = this.look.tailCock;
  }

  /** Circle on set wings. Poor gliders have to keep adding flaps. */
  protected *soarCircles(seconds: number, center: Vec, radius: number): Script {
    yield* this.flyTo({ x: center.x - radius, y: center.y }, { land: false });
    const f = this.flight;
    const w = (f.cruiseSpeed * SPEED * 0.45) / radius;
    const y0 = this.pos.y;
    const p = this.pose;
    let angle = 0;
    for (let t = 0; t < seconds; ) {
      const dt = yield;
      t += dt;
      this.airTime += dt;
      angle += w * dt;
      this.vel = { x: radius * w * Math.sin(angle), y: 0 };
      this.pos.x = clamp(center.x - radius * Math.cos(angle), 1, 99);
      this.pos.y = Math.min(Math.max(y0, this.sky), y0 + t * 0.9 * f.glide);
      if (Math.abs(this.vel.x) > 1) p.facing = this.vel.x > 0 ? 1 : -1;
      p.wings = 'open';
      p.pitch = 0.05;
      p.neck = 0.25;
      // Banking through the turn shows first the top of the wings, then the underside.
      const flapNow = f.glide < 0.7 && t % 3 < 0.7;
      p.flap = flapNow ? Math.sin(this.airTime * TAU * drawnFlapRate(f.flapRate)) : 0.25 + 0.45 * Math.cos(angle);
      this.adjustFlightPose();
    }
  }

  protected *takeOff(toward?: Vec): Script {
    const p = this.pose;
    if (toward && Math.abs(toward.x - this.pos.x) > 0.5) p.facing = toward.x > this.pos.x ? 1 : -1;
    // Heavy, underpowered birds need a visible wind-up.
    if (p.rotation === 0) yield* this.poseTo({ crouch: 0.5, pitch: 0.2 }, 0.08 + 0.25 * (1 - this.flight.power));
    p.rotation = 0;
    p.crouch = 0;
    this.airborne = true;
    this.airTime = 0;
    const lift = 3 + 10 * this.flight.power;
    const up = toward && toward.y < this.pos.y - 1 ? 0.3 : 1;
    this.vel = { x: p.facing * lift * 0.5, y: lift * up };
  }

  private flightPose(flapping: boolean) {
    const p = this.pose;
    const f = this.flight;
    if (Math.abs(this.vel.x) > 1) p.facing = this.vel.x > 0 ? 1 : -1;
    p.rotation = 0;
    p.pitch = clamp(Math.atan2(this.vel.y, Math.abs(this.vel.x)) * 0.7, -1.2, 1.2);
    p.neck = 0.25;
    p.neckExt = 1;
    p.head = 0;
    p.stride = p.crouch = 0;
    if (flapping) {
      p.wings = 'open';
      p.flap = Math.sin(this.airTime * TAU * drawnFlapRate(f.flapRate));
    } else if (f.restPose === 'folded') {
      p.wings = 'folded';
    } else {
      p.wings = 'open';
      p.flap = 0.12;
    }
    this.adjustFlightPose();
  }

  private touchDown() {
    this.airborne = false;
    this.airTime = 0;
    this.vel = { x: 0, y: 0 };
    Object.assign(this.pose, this.restingPose(), { wings: 'folded' });
  }

  // ------------------------------------------------------------- ground

  /** Where the feet rest at x: the ground, the bottom for a wader, the surface for a swimmer. */
  protected restY(x: number): number {
    const water = this.world.habitat.water;
    // Up on the log the food is on.
    const site = this.meal?.site;
    if (site?.stand && x >= site.stand[0] && x <= site.stand[1]) return site.y;
    return this.ecology.swims && water && x > water.from ? 0 : this.world.floorY(x);
  }

  /** Sitting on the water. The renderer hides the legs and lowers the body. */
  get afloat(): boolean {
    const water = this.world.habitat.water;
    return this.ecology.swims && !this.airborne && !!water && this.pos.x > water.from && Math.abs(this.pos.y) < 0.05;
  }

  /** A random place out on the water, for birds that swim. */
  protected waterSpot(): Vec | null {
    const water = this.world.habitat.water;
    if (!this.ecology.swims || !water) return null;
    // In a flock, near the others unless it is going to its food.
    const c = this.flock && !this.meal ? this.flock.center().x : null;
    const [lo, hi] = this.mealRange() ?? (c === null ? [0, 100] : [c - this.flock!.reach, c + this.flock!.reach]);
    return { x: rand(Math.max(water.from + 6, Math.min(lo, 90)), Math.max(water.from + 8, Math.min(hi, 94))), y: 0 };
  }

  /** Get onto the water, flying there if need be. Paddling about is moveOnGround(). */
  protected *toWater(): Script {
    const spot = this.waterSpot();
    const m = this.mealRange();
    const offFood = !!m && (this.pos.x < m[0] - 2 || this.pos.x > m[1] + 2);
    if (spot && (!this.afloat || offFood)) yield* this.flyOver(spot);
  }

  /** Swimming under the surface: no legs showing, body level with where it swims. */
  /** A point under the water's surface. */
  protected submergedAt(at: Vec): boolean {
    const water = this.world.habitat.water;
    return !!water && at.x > water.from && at.y < -0.05;
  }

  get submerged(): boolean {
    const water = this.world.habitat.water;
    return this.ecology.swims && !this.airborne && !!water && this.pos.x > water.from && this.pos.y < -0.05;
  }

  /**
   * Go under, swim to the food and take it there, and come up again. Loons, grebes, cormorants,
   * sea ducks and auks are unrelated and all hunt this way, so the routine lives here. Without food
   * it surfaces `dx` away. `leap` is the forward jump some of them make to get under.
   */
  protected *diveUnder(seconds: number, dx: number, leap = 0): Script {
    const water = this.world.habitat.water;
    if (!this.afloat || !water) return;
    const p = this.pose;
    // The last catch is swallowed before it goes under again.
    this.hold(null);
    let from = { ...this.pos };
    const lo = water.from + 4;
    // How far ahead of the body the bill is in each swimming pose: bill down to the bottom, level after a fish.
    const BOTTOM: Partial<NumericPose> = { pitch: -0.5, neck: -0.3, head: -0.6 };
    const LEVEL: Partial<NumericPose> = { pitch: -0.1, neck: 0.1, head: -0.1 };
    const lead = (reach: Partial<NumericPose>) => {
      const saved = { ...p };
      const y0 = this.pos.y;
      this.pos.y = -1;
      Object.assign(p, reach, { facing: 1 });
      const tip = this.billTip();
      const off = { x: tip.x - this.pos.x, y: tip.y - this.pos.y };
      Object.assign(p, saved);
      this.pos.y = y0;
      return off;
    };
    const ahead = Math.max(lead(BOTTOM).x, lead(LEVEL).x);
    // Food at least a bill's reach away, so it swims forward to it rather than backing up under the bill.
    // A fish already showing (where the bird picked its spot on the surface) swims to the one it dives for.
    const shown = this.world.prey && { x: this.world.prey.x, y: this.world.prey.y };
    const caught = this.catchPoint(from.x + dx, from.x, ahead + 0.3);
    if (shown && this.world.prey) Object.assign(this.world.prey, shown);
    // Paddle on the surface first to food farther off than a dive's swim, or back off from food nearer than the bill
    // reaches, so it dives forward onto it.
    if (caught) {
      const gap = caught.x - from.x;
      const side = Math.sign(gap) || p.facing;
      const to = Math.abs(gap) > 8 ? caught.x - side * 5 : Math.abs(gap) < ahead ? caught.x - side * (ahead + 0.3) : null;
      if (to !== null && Math.abs(clamp(to, lo, 96) - from.x) > 0.3) {
        yield* this.moveOnGround(clamp(to, lo, 96));
        from = { ...this.pos };
      }
    }
    // Bottom food is taken from just above it, so the head stays clear of the seabed.
    const food = caught && caught.y <= this.world.floorY(caught.x) + 0.8 ? { x: caught.x, y: caught.y + 0.4 } : caught;
    const goal = food ?? { x: clamp(from.x + dx, lo, 96), y: this.world.floorY(clamp(from.x + dx, lo, 96)) * 0.5 };
    if (Math.abs(goal.x - from.x) > 0.3) p.facing = goal.x > from.x ? 1 : -1;
    const bottom = !!food && goal.y <= this.world.floorY(goal.x) + 0.8;
    // All the way under if the water is deep enough there, and never into the bottom.
    const under = -(this.frame.b * 1.85 + 0.2);
    const STEEP: Partial<NumericPose> = { pitch: -1.3, neck: -0.2, head: -0.3 };
    // Where the body goes for the bill to be at the food in a pose: never back past where it went under, and never
    // into the bottom, at the body or at the bill.
    const place = (reach: Partial<NumericPose>) => {
      const off = lead(reach);
      const bodyX = clamp(p.facing === 1 ? Math.max(from.x, goal.x - off.x) : Math.min(from.x, goal.x + off.x), lo, 96);
      const billFloor = this.world.floorY(bodyX + p.facing * off.x) + 0.1 - off.y;
      const bodyY = Math.max(this.world.floorY(bodyX) + 0.1, billFloor, bottom ? goal.y - off.y : Math.min(under, goal.y - off.y));
      const bill = { x: bodyX + p.facing * off.x, y: bodyY + off.y };
      return { reach, off, bodyX, bodyY, miss: Math.hypot(bill.x - goal.x, Math.max(0, bill.y - goal.y)) };
    };
    // Level after a fish, bill down for the bottom; head down, steeper, when that leaves the bill short of the food
    // (food nearer than the bill reaches, or shallows that hold the body up).
    const tries = (bottom ? [BOTTOM, STEEP] : [LEVEL, BOTTOM, STEEP]).map(place);
    const best = food ? (tries.find((t) => t.miss < 0.5) ?? tries.reduce((a, b) => (b.miss < a.miss ? b : a))) : tries[0];
    const { reach, off, bodyX, bodyY } = best;

    // Over and under in a forward roll.
    yield* this.tween(0.3, (t) => {
      p.pitch = -0.9 * t;
      p.neck = 0.95 - 0.8 * t;
      this.pos.y = leap * Math.sin(Math.PI * t) - 0.3 * t;
    });
    this.world.burst('splash', from.x, 0, 4);
    const start = { ...this.pos };
    // A fish swims on and meets the bill; food on the bottom stays where it is.
    const units = this.world.food.find((f) => f.kind === this.meal?.kind)?.units.length;
    const fish = food && !units ? this.world.prey : null;
    const swim = fish && { from: { x: fish.x, y: fish.y }, to: { x: bodyX + p.facing * off.x, y: bodyY + off.y } };
    // Down and along to the food, paddling.
    yield* this.tween(seconds * 0.6, (t) => {
      if (fish && swim) Object.assign(fish, { x: swim.from.x + (swim.to.x - swim.from.x) * t, y: swim.from.y + (swim.to.y - swim.from.y) * t });
      this.pos.x = start.x + (bodyX - start.x) * t;
      this.pos.y = start.y + (bodyY - start.y) * t;
      p.pitch = -0.9 + (0.9 + (reach.pitch ?? 0)) * t;
      p.neck = 0.15 + ((reach.neck ?? 0) - 0.15) * t;
      p.head = (reach.head ?? 0) * t;
      p.stride = Math.sin(t * seconds * 12);
    });
    // The fish or mussel is right at the bill as it takes it.
    if (food) {
      this.aimAt(this.billTip());
      this.take(Infinity);
    }
    // Back up to the surface with it.
    const up = clamp(bodyX + p.facing * 1.5, lo, 96);
    yield* this.tween(seconds * 0.4, (t) => {
      this.pos.x = bodyX + (up - bodyX) * t;
      this.pos.y = bodyY * (1 - t);
      p.pitch = (reach.pitch ?? 0) + (0.6 - (reach.pitch ?? 0)) * Math.sin(Math.PI * t * 0.9);
      p.neck = 0.6;
      p.head = 0;
      p.stride = Math.sin(t * seconds * 12);
    });
    this.pos = { x: up, y: 0 };
    p.stride = 0;
    this.world.burst('splash', up, 0, 3);
    // Shown at the surface for a moment, then swallowed.
    if (food && this.pose.carry) this.holdTimer = 1.2;
    yield* this.relax(0.25);
  }

  /** How deep it dives. It works the water from half this down to this, so a deep diver is seen going deep. */
  protected diveDepth = DEEP;

  /** Where a dive near x ends with the bill on the food: a piece of it, or the water it swims in. Null when not feeding. */
  protected catchPoint(x: number, from = x, ahead = 0): Vec | null {
    const site = this.meal?.site;
    const water = this.world.habitat.water;
    if (!site || !water) return null;
    const patch = this.world.food.find((f) => f.kind === this.meal!.kind);
    // Where the water is deep enough to swim under, if any of the food is.
    const deep = (this.frame.b * 1.85 + 0.6) / SHELVE + water.from;
    const far = (u: Vec) => Math.abs(u.x - from) >= ahead;
    const d = this.diveDepth;
    // Narrow the pieces by each wish in turn, as long as some are left: within its depth, at its usual depth and a
    // bill's reach or more away, then either one, then where the water is deep enough to swim under.
    const prefer = (list: Vec[], ok: (u: Vec) => boolean) => (list.some(ok) ? list.filter(ok) : list);
    const usual = (u: Vec) => -u.y >= d / 2;
    let pieces: Vec[] = patch?.units.filter((u) => !u.gone && u.x > water.from + 4) ?? [];
    for (const ok of [(u: Vec) => -u.y <= d, (u: Vec) => usual(u) && far(u), usual, far, (u: Vec) => u.x > deep]) pieces = prefer(pieces, ok);
    if (pieces.length) return { ...pieces.sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0] };
    const lo = Math.max(site.x[0], water.from + 4);
    const hi = Math.min(site.x[1], 96);
    const range: [number, number] = [hi > deep ? Math.max(lo, deep) : lo, hi];
    // The fish that showed, even in the shallower part of the school: the bird already went for it. Else somewhere in
    // the school, in the deep part if there is one, a bill's reach or more away.
    const seen = this.takeLead();
    if (seen && seen.x >= lo - 1 && seen.x <= hi + 1) return this.aimAt({ x: seen.x, y: seen.y });
    // A depth from half its limit to its limit, inside the food's depth range.
    const spread = site.spread ?? 0;
    const want = clamp(-rand(d / 2, d), site.y - spread, Math.min(-0.6, site.y + spread));
    // Food along the bottom is where the bottom is that deep; a fish is anywhere the water is deeper than it.
    const at = water.from + (site.onBottom ? -want : -want + 0.8) / SHELVE;
    if (site.onBottom) {
      range[0] = clamp(at - 2, lo, hi);
      range[1] = clamp(at + 2, lo, hi);
    } else if (at <= range[1]) range[0] = Math.max(range[0], at);
    let cx = clamp(x, ...range);
    if (!far({ x: cx, y: 0 })) {
      const sides = [from + ahead, from - ahead].filter((v) => v >= range[0] && v <= range[1]);
      if (sides.length) cx = sides.sort((a, b) => Math.abs(a - x) - Math.abs(b - x))[0];
    }
    const floor = this.world.floorY(cx);
    return this.aimAt({ x: cx, y: site.onBottom ? floor + rand(0.3, 1.2) : clamp(want, floor + 0.6, -0.6) });
  }

  get onGround(): boolean {
    return !this.airborne && this.pose.rotation === 0 && Math.abs(this.pos.y - this.restY(this.pos.x)) < 0.05;
  }

  /** How far out a bird that doesn't swim can wade: until the water is most of the way up its legs. */
  protected wadeMax(): number {
    const water = this.world.habitat.water;
    if (!water || this.ecology.swims) return 100;
    return water.from + (this.look.legLength * this.size * 0.6) / SHELVE;
  }

  /** Walk, run or hop to x, as the species' gait dictates. Birds that cannot walk fly. */
  protected *moveOnGround(x: number, speedMul = 1): Script {
    x = Math.min(x, this.wadeMax());
    const gait = this.ecology.gait;
    if (!this.onGround || gait === 'none') {
      yield* this.flyOver({ x, y: this.restY(x) });
      return;
    }
    const p = this.pose;
    const dir = x >= this.pos.x ? 1 : -1;
    // Already there: it keeps facing the way it was (toward its food).
    if (Math.abs(x - this.pos.x) > 0.05) p.facing = dir;
    if (gait === 'hop') {
      while (Math.abs(x - this.pos.x) > 0.3) {
        const step = Math.min(this.size * 0.45, Math.abs(x - this.pos.x));
        const x0 = this.pos.x;
        yield* this.tween(0.16 / speedMul, (t) => {
          this.pos.x = x0 + dir * step * t;
          this.pos.y = this.restY(this.pos.x) + this.size * 0.12 * Math.sin(Math.PI * t);
          p.crouch = 0.3 * Math.sin(Math.PI * t);
        });
        yield* this.wait(0.07);
      }
    } else {
      const speed = this.ecology.groundSpeed * speedMul;
      let phase = 0;
      while (Math.abs(x - this.pos.x) > 0.2) {
        const dt = yield;
        this.pos.x += dir * Math.min(speed * dt, Math.abs(x - this.pos.x));
        this.pos.y = this.restY(this.pos.x);
        phase += (dt * speed * Math.PI) / (this.size * 0.5);
        p.stride = Math.sin(phase);
        // The head stays fixed in space while the body walks under it, then snaps forward.
        if (this.ecology.headBob) p.headThrust = 0.5 - ((phase / Math.PI) % 1);
      }
      p.stride = p.headThrust = 0;
    }
  }

  /** Get to `target` by whichever means suits the distance. */
  protected *travelTo(target: Vec): Script {
    if (target.y <= 0.05 && target.x > this.wadeMax()) target = { x: this.wadeMax(), y: this.restY(this.wadeMax()) };
    const gait = this.ecology.gait;
    const span = Math.abs(target.x - this.pos.x);
    const onFoot = this.onGround && target.y <= 0.05 && gait !== 'none' && span < (gait === 'hop' ? 10 : 30);
    if (onFoot || (!(yield* this.flyOver(target)) && target.y <= 0.05)) yield* this.moveOnGround(target.x);
  }

  /** Down to the ground nearby, or to where the food is if it is on the ground. */
  protected *toGround(range = 8): Script {
    const m = this.mealRange(true);
    // Beside the food, not on it, so the bill comes down on it.
    if (m && (this.pos.x < m[0] - 2 || this.pos.x > m[1] + 2 || !this.onGround))
      yield* this.travelTo(((x) => ({ x, y: this.restY(x) }))(this.beside(this.mealX(m), ...(this.meal?.site.stand ?? this.world.habitat.land))));
    else if (!this.onGround) yield* this.travelTo(this.groundSpot(this.pos.x, range));
  }

  /** Somewhere along the food at x range m: where the animal it saw is, if it is there. */
  private mealX(m: [number, number]): number {
    const lead = this.takeLead();
    return lead && lead.x >= m[0] && lead.x <= m[1] ? lead.x : rand(m[0], m[1]);
  }

  protected *toPerch(kinds: PerchKind[] = this.ecology.perches, pick: PerchPick = 'near'): Script {
    const m = this.mealRange();
    const here = this.world.habitat.perches.some(
      (q) => kinds.includes(q.kind) && Math.hypot(q.x - this.pos.x, q.y - this.pos.y) < 0.5 && (!m || (q.x >= m[0] - 4 && q.x <= m[1] + 4)),
    );
    if (here && !this.airborne) return;
    const perch = this.findPerch(kinds, pick);
    if (perch) yield* this.flyOver(perch);
    else yield* this.settle();
  }

  /** If caught in the air with nothing to do, land somewhere sensible. */
  protected *settle(): Script {
    if (!this.airborne) return;
    yield* this.flyTo(this.findPerch(undefined, 'near') ?? this.waterSpot() ?? this.groundSpot(this.pos.x, 6));
  }

  /** Peck `times` times. The first takes the food the behavior is after if the bill is on it, unless `eat` is false. */
  protected *peck(times = 1, depth = 1, eat = true): Script {
    const rest = this.restingPose();
    // Food just behind it: turn round to it first. Only the bill's x matters here; the peck brings it down.
    // Not while clinging to bark: turning round there would turn it head-down.
    const site = this.meal?.site;
    const off = (x: number) => (site ? Math.max(0, site.x[0] - x, x - site.x[1]) : 0);
    // The animal it saw, wherever in the food it is, decides it instead.
    if (!this.faceLead() && site && !this.pose.carry && this.pose.rotation === 0 && off(this.billTip().x) > 0) {
      this.pose.facing = this.pose.facing === 1 ? -1 : 1;
      if (off(this.billTip().x) > 0) this.pose.facing = this.pose.facing === 1 ? -1 : 1;
    }
    // Down to the food, or the ground, or what it holds in its feet: a long-legged bird reaches further.
    const low = this.peckHeight();
    const up = { pitch: rest.pitch - 0.55 * depth, neck: -0.6 * depth, head: -1.1 * depth };
    const down = { pitch: rest.pitch - 0.9 * depth, neck: -1.4, head: -1.5, crouch: 0.45 };
    for (let i = 0; i < times; i++) {
      // The animal shows where the bill is about to land, not where it is now: up in a plant or on bark, or no
      // deeper than the bill reaches in water (a fish of the school deeper down stays out of sight).
      const reach = low === null ? this.billWith(up) : this.billWith(down);
      const where = low === null ? reach : this.submergedAt(reach) ? { x: reach.x, y: Math.max(low, reach.y) } : undefined;
      const spot = eat && i === 0 && (yield* this.glimpse(where));
      if (low === null) yield* this.poseTo(up, 0.09);
      else yield* this.reachDown(down, 0.09, low - 0.3 * (depth - 1));
      if (spot) this.aimAt(this.billTip());
      if (eat && i === 0) this.takeOrHide(spot);
      yield* this.wait(0.04);
      yield* this.poseTo({ pitch: rest.pitch, neck: rest.neck, head: 0, crouch: rest.crouch }, 0.11);
      yield* this.wait(rand(0.08, 0.22));
    }
  }

  /**
   * After a glimpse that `shown` the animal: take it if the bill is at the food, else it hides again rather than
   * staying drawn. A hidden animal that didn't show isn't taken.
   */
  protected takeOrHide(shown: boolean, hold?: number) {
    if (!this.meal) return;
    if (!this.pose.carry && this.atFood() && (shown || !FOODS[this.meal.kind].hidden)) this.take(hold);
    else if (shown) this.world.prey = this.lead = null;
  }

  /**
   * A hidden animal (a caterpillar under a leaf, a grub in the bark, a crab in the sand) shows at the
   * bill for a moment as the bird goes for it, so it is seen before it is taken. True if it showed.
   */
  protected *glimpse(where?: Vec): Generator<void, boolean, number> {
    const site = this.meal?.site;
    if (!site || !FOODS[this.meal!.kind].hidden || this.pose.carry) return false;
    if (!where) this.faceLead();
    // Where the bill is about to come down (`where`, if the caller knows): on the ground just ahead of the feet,
    // else (up in a plant, on bark) right at the bill.
    const low = this.takesInFeet || this.pose.rotation !== 0 || !this.onGround ? null : this.peckHeight();
    const at = where ?? (this.takesInFeet ? { ...this.pos } : low === null ? this.billTip() : { x: this.pos.x + this.pose.facing * this.groundReach, y: low });
    if (at.x < site.x[0] - 3 || at.x > site.x[1] + 3) return false;
    // A fish already showing swims to where the bill comes down (up from deeper than the bill reaches, say) rather
    // than jumping there.
    const fish = this.world.prey;
    if (fish && this.submergedAt(fish)) {
      const from = { x: fish.x, y: fish.y };
      this.lead = { x: at.x, y: at.y };
      yield* this.tween(0.3, (t) => Object.assign(fish, { x: from.x + (at.x - from.x) * t, y: from.y + (at.y - from.y) * t }));
      return true;
    }
    this.aimAt(at);
    yield* this.wait(0.3);
    return true;
  }

  /** Standing (not clinging) by the animal it saw: turn to it. True if there is one to face. */
  private faceLead(): boolean {
    const lead = this.takeLead();
    if (!lead || !this.meal || this.pose.carry || this.pose.rotation !== 0) return false;
    if (Math.abs(lead.x - this.pos.x) > 0.3 && Math.sign(lead.x - this.pos.x) !== this.pose.facing) this.pose.facing = this.pose.facing === 1 ? -1 : 1;
    return true;
  }

  private reachCache: number | null = null;

  /** How far ahead of its feet the bill comes down when it pecks at the ground, measured on the bird's own drawing. */
  protected get groundReach(): number {
    if (this.reachCache !== null) return this.reachCache;
    const saved = { pos: { ...this.pos }, airborne: this.airborne, pose: { ...this.pose } };
    this.pos = { x: 30, y: 0 };
    this.airborne = false;
    Object.assign(this.pose, this.restingPose(), { facing: 1, rotation: 0 });
    const rest = this.restingPose();
    const down = this.reachDown({ pitch: rest.pitch - 0.9, neck: -1.4, head: -1.5, crouch: 0.45 }, 0.09, 0);
    while (!down.next(0.02).done);
    this.reachCache = Math.max(0.3, this.billTip().x - this.pos.x);
    Object.assign(this, { pos: saved.pos, airborne: saved.airborne });
    Object.assign(this.pose, saved.pose);
    return this.reachCache;
  }

  /** How low a peck goes: to the food on or under the ground or water, to the ground, or to the feet on a perch. Null: food up in a plant, peck as usual. */
  protected peckHeight(): number | null {
    const site = this.meal?.site;
    const b = this.billTip();
    if (site) {
      const piece = site.units?.reduce<Vec | null>((best, u) => (!best || Math.hypot(u.x - b.x, u.y - b.y) < Math.hypot(best.x - b.x, best.y - b.y) ? u : best), null);
      if (piece && Math.abs(piece.y - this.pos.y) < this.size) return piece.y;
      if (site.y <= 0 && this.onGround) return Math.max(site.y, this.world.floorY(b.x));
      if (site.stand && Math.abs(this.pos.y - site.y) < 0.3) return site.y;
      if (site.y > 0) return null;
    }
    if (this.onGround) return this.world.floorY(b.x);
    return this.pose.rotation === 0 ? this.pos.y : null;
  }

  /** poseTo, but stopping where the bill meets the ground or the bottom (or `low`): a long neck reaches the bottom, not into it. */
  protected *reachDown(to: Partial<NumericPose>, seconds: number, low = -Infinity): Script {
    const p = this.pose as unknown as Record<string, number>;
    const keys = Object.keys(to) as (keyof NumericPose)[];
    const from = keys.map((k) => p[k]);
    const set = (t: number) => keys.forEach((k, i) => (p[k] = from[i] + (to[k]! - from[i]) * t));
    const below = () => {
      const b = this.billTip();
      return b.y < Math.max(low, this.world.floorY(b.x));
    };
    let last = 0;
    yield* this.tween(seconds, (t) => {
      if (last < 0) return;
      set(t);
      if (!below()) return void (last = t);
      // Gone past it this frame: find where the bill just touches.
      let lo = last;
      for (let i = 0; i < 10; i++) {
        const mid = (lo + t) / 2;
        set(mid);
        if (below()) t = mid;
        else lo = mid;
      }
      set(lo);
      last = -1;
    });
  }

  protected *lookAround(seconds: number): Script {
    while (seconds > 0) {
      const pause = rand(0.25, 0.9);
      yield* this.poseTo({ head: rand(-0.35, 0.35) }, 0.08);
      yield* this.wait(pause);
      seconds -= pause + 0.08;
    }
  }

  /**
   * Carry a hard-shelled item up and drop it on the rocks until it cracks.
   * Crows and gulls are unrelated and both do this, so the routine lives here
   * and each family exposes it under its own behavior.
   */
  protected *dropOnRocks(): Script {
    // Any rock will do, including one the bird is already standing on.
    const rock = this.world.habitat.perches.find((q) => q.kind === 'rock');
    if (!rock) return;
    const item = (this.meal && FOODS[this.meal.kind].item) || 'clam';
    yield* this.travelTo(this.mealRange(true) ? this.foodSpot(4) : { x: this.world.clampLand(rock.x + 9), y: 0 });
    yield* this.peck(3);
    this.hold(item);
    // It drops the shell onto the rock top just ahead of where it will stand, so the bill comes down on it.
    const at = { x: rock.x + this.groundReach, y: rock.y - 0.2 };
    let shell = null as ReturnType<World['emit']> | null;
    for (let tries = Math.random() < 0.5 ? 2 : 1; tries > 0; tries--) {
      yield* this.flyTo({ x: at.x, y: rock.y + 17 }, { land: false });
      this.hold(null);
      shell = this.world.emit(item, at.x, this.pos.y, { gravity: 30, floor: at.y, life: 30, by: this });
      yield* this.flyTo({ x: rock.x, y: rock.y });
      this.pose.facing = 1;
      yield* this.wait(0.3);
      if (tries > 1) {
        // Not broken. Pick it up and go again, higher.
        yield* this.peck(1, 1, false);
        shell.life = 0;
        this.hold(item);
      }
    }
    this.world.burst('chip', at.x, at.y, 5);
    yield* this.peck(4, 0.8);
    if (shell) shell.life = 0;
    yield* this.relax();
  }

  // ----------------------------------------------------------- utilities

  protected *wait(seconds: number): Script {
    while (seconds > 0) seconds -= yield;
  }

  protected *tween(seconds: number, apply: (t: number) => void): Script {
    for (let t = 0; t < seconds; ) {
      t += yield;
      apply(ease(Math.min(1, t / seconds)));
    }
    apply(1);
  }

  /** Ease the listed pose values from wherever they are now. */
  protected *poseTo(to: Partial<NumericPose>, seconds: number): Script {
    const p = this.pose as unknown as Record<string, number>;
    const keys = Object.keys(to) as (keyof NumericPose)[];
    const from = keys.map((k) => p[k]);
    yield* this.tween(seconds, (t) => keys.forEach((k, i) => (p[k] = from[i] + (to[k]! - from[i]) * t)));
  }

  protected *relax(seconds = 0.2): Script {
    if (!this.airborne) this.pose.wings = 'folded';
    yield* this.poseTo(this.restingPose(), seconds);
  }

  protected say(text: string, seconds = 2) {
    this.pose.speech = text;
    this.speechTimer = seconds;
  }

  /** Stick to a vertical surface. `side` is which side of it the bird is on. */
  protected cling(side: 1 | -1, headUp: boolean) {
    this.pose.rotation = (-side * Math.PI) / 2;
    this.pose.facing = (headUp ? -side : side) as 1 | -1;
  }

  /** Onto the trunk at height y, on `side` of it (by default the side the bird is on). Returns the side. */
  protected *flyToTrunk(trunk: Trunk, y: number, headUp: boolean, side: 1 | -1 = this.pos.x >= trunk.x ? 1 : -1): Script<1 | -1> {
    yield* this.flyTo({ x: trunk.x + (side * trunk.width) / 2, y });
    this.cling(side, headUp);
    return side;
  }

  /** A climbable trunk, preferring one the bird is not already on. */
  /** A trunk to climb: the one with the food on it, or with `next`, any other than the one it is on. */
  protected findTrunk(next = false): Trunk | null {
    const trunks = this.world.habitat.trunks.filter((t) => t.climb);
    const m = this.mealRange();
    const fed = !next && m && trunks.find((t) => t.x >= m[0] - 3 && t.x <= m[1] + 3);
    if (fed) return fed;
    const others = trunks.filter((t) => Math.abs(t.x - this.pos.x) > 3);
    const pool = others.length ? others : trunks;
    return pool[Math.floor(Math.random() * pool.length)] ?? null;
  }

  protected findPerch(kinds: PerchKind[] = this.ecology.perches, pick: PerchPick = 'any'): Vec | null {
    this.claim = this.pickPerch(kinds, pick);
    return this.claim;
  }

  private pickPerch(kinds: PerchKind[], pick: PerchPick): Vec | null {
    const d = (q: Vec) => Math.hypot(q.x - this.pos.x, q.y - this.pos.y);
    // In a flock, one bird to a perch: none that a flockmate sits on or is heading for.
    const close = (a: Vec | null, q: Vec) => !!a && Math.hypot(a.x - q.x, a.y - q.y) < 1.5;
    const held = (q: Vec) => !!this.flock?.birds.some((b) => b !== this && (close(b.claim, q) || close(b.pos, q)));
    const options = this.world.habitat.perches
      .filter((q) => kinds.includes(q.kind) && q.y <= this.flight.ceiling && d(q) > 3 && !held(q))
      .sort((a, b) => d(a) - d(b));
    if (!options.length) return null;
    // Near the food if there is a perch there.
    const m = this.mealRange();
    // With food in pieces (caterpillars under leaves), a perch with one in reach of the bill.
    const pieces = this.world.food.find((f) => f.kind === this.meal?.kind)?.units.filter((u) => !u.gone) ?? [];
    const near = (q: Vec) => q.x >= m![0] - 4 && q.x <= m![1] + 4 && (!pieces.length || pieces.some((u) => Math.hypot(u.x - q.x, u.y - q.y) < 3.5));
    const fed = m && pick !== 'far' ? options.filter(near) : [];
    if (fed.length) return fed[Math.floor(Math.random() * fed.length)];
    // Otherwise the perch nearest the food, so a hunter is not watching it from across the scene.
    if (m && pick !== 'far') return options.reduce((a, b) => (Math.abs(b.x - (m[0] + m[1]) / 2) < Math.abs(a.x - (m[0] + m[1]) / 2) ? b : a));
    if (pick === 'near') return options[0];
    if (pick === 'far') return options[options.length - 1];
    return options[Math.floor(Math.random() * options.length)];
  }

  // ------------------------------------------------------------- feeding

  /**
   * Take some of the food the running behavior is after. A piece goes from
   * the scene where the bill (or the feet) are, and the catch shows for
   * `hold` seconds; Infinity holds it until the behavior lets go with hold(null).
   * peck(), diveUnder() and strikeAt() call this when they land on the food.
   */
  protected take(hold = 0.7, at: Vec = this.takesInFeet ? this.pos : this.billTip()) {
    if (!this.meal) return;
    this.lead = null;
    this.taken++;
    this.world.eat(this.meal.kind, at, this);
    const item = FOODS[this.meal.kind].item;
    if (item) this.hold(item, hold);
  }

  /** Hold an item in the bill or feet for `seconds`, or let go with null. */
  protected hold(item: Item | null, seconds = Infinity) {
    this.pose.carry = item;
    this.pose.carryInFeet = !!item && this.takesInFeet;
    this.holdTimer = item ? seconds : 0;
  }

  /** Raptors and owls take prey in their feet; other birds use the bill. */
  protected get takesInFeet(): boolean {
    return false;
  }

  /**
   * The body's proportions and where the head sits this frame, in the body's own frame: x forward
   * along the body, y up, origin at the body's center. drawBird draws from these numbers, so
   * billTip() and headPoint() are exactly where the drawing puts the bill and head.
   */
  get frame() {
    const k = this.look;
    const p = this.pose;
    const L = this.size;
    const a = L * 0.27;
    const b = a * (0.5 + 0.35 * k.build);
    const hr = b * 0.62 * k.headSize;
    const legFull = k.legLength * L;
    const legLen = this.airborne || this.afloat || this.submerged ? 0 : legFull * (1 - p.crouch);
    // A swimming bird rides with the lower third of its body under the surface.
    const cy = this.afloat ? b * 0.45 : legLen + b * 0.85;
    const neckLen = k.neckLength * 2 * a * p.neckExt + hr * 0.5;
    const neckAngle = p.neck - p.pitch;
    const hx = a * 0.7 + Math.cos(neckAngle) * neckLen + p.headThrust * L * 0.12;
    const hy = b * 0.3 + Math.sin(neckAngle) * neckLen;
    return { a, b, hr, legFull, legLen, cy, neckLen, hx, hy, beakLen: k.beakLength * 2 * hr };
  }

  /** A point in the body's frame (see frame), in stage coordinates. */
  protected toStage(x: number, y: number): Vec {
    const p = this.pose;
    const cos = Math.cos(p.pitch);
    const sin = Math.sin(p.pitch);
    const bx = (x * cos - y * sin) * p.facing;
    const by = (x * sin + y * cos) * Math.cos(p.roll) + this.frame.cy;
    const rc = Math.cos(p.rotation);
    const rs = Math.sin(p.rotation);
    return { x: this.pos.x + bx * rc - by * rs, y: this.pos.y + bx * rs + by * rc };
  }

  /** A point `along` the head's axis from its center: 0 is the center of the head. */
  private alongHead(along: number): Vec {
    const f = this.frame;
    const turn = this.pose.head - this.pose.pitch;
    return this.toStage(f.hx + along * Math.cos(turn), f.hy + along * Math.sin(turn));
  }

  /** The tip of the bill, where it is drawn. */
  billTip(): Vec {
    const f = this.frame;
    return this.alongHead(f.hr * 0.75 + f.beakLen);
  }

  /** The center of the head, and its radius. */
  headPoint(): Vec & { r: number } {
    return { ...this.alongHead(0), r: this.frame.hr };
  }

  /** Where the bill tip would be with the pose changed by `to` and the feet at `at`. The bird is left as it was. */
  protected billWith(to: Partial<Pose>, at: Vec = this.pos, perched = !this.airborne): Vec {
    const saved = { pos: this.pos, airborne: this.airborne, pose: { ...this.pose } };
    this.pos = { ...at };
    this.airborne = !perched;
    Object.assign(this.pose, to);
    const tip = this.billTip();
    Object.assign(this, { pos: saved.pos, airborne: saved.airborne });
    Object.assign(this.pose, saved.pose);
    return tip;
  }

  /** The pose for reaching `reach` facing `f`, upside down if `hang`, starting from the resting pose. */
  private reachPose(reach: Partial<NumericPose>, f: 1 | -1, hang: boolean): Partial<Pose> {
    return { ...this.restingPose(), ...reach, facing: f, rotation: hang ? Math.PI * f : 0 };
  }

  /** Which way to face to reach food at `at` from here. Hanging upside down turns the bill the other way. */
  private reachFacing(at: Vec, hang: boolean): 1 | -1 {
    const toward: 1 | -1 = Math.abs(at.x - this.pos.x) < 0.5 ? this.pose.facing : at.x > this.pos.x ? 1 : -1;
    return hang ? (-toward as 1 | -1) : toward;
  }

  /** Where the feet go for the bill to be on `at` in the reaching pose. */
  private feetFor(at: Vec, reach: Partial<NumericPose>, hang: boolean): Vec {
    const tip = this.billWith(this.reachPose(reach, this.reachFacing(at, hang), hang), at, true);
    return { x: at.x - (tip.x - at.x), y: at.y - (tip.y - at.y) };
  }

  /** A piece of the food the bird can reach from above the ground and inside the scene, for reachFor(). Null if none is left. */
  protected pieceInReach(reach: Partial<NumericPose>, hang = false): Vec | null {
    const patch = this.meal && this.world.food.find((f) => f.kind === this.meal!.kind);
    const ok = patch?.units.filter((u) => {
      if (u.gone) return false;
      const feet = this.feetFor(u, reach, hang);
      return feet.x > 2 && feet.x < 98 && feet.y >= this.restY(feet.x) + 0.3;
    });
    if (!ok?.length) return null;
    const lead = this.takeLead();
    const led = lead && ok.find((u) => Math.hypot(u.x - lead.x, u.y - lead.y) < 0.5);
    return { ...(led || ok[Math.floor(Math.random() * ok.length)]) };
  }

  /**
   * Pick food from a plant or a twig: a berry, a cone, a caterpillar under a leaf. The bird lands where
   * its bill, in pose `reach`, is on the piece at `at`, swings upside down first if it `hang`s, works at
   * it `bites` times, and takes it there. Chickadees, bushtits, grosbeaks, pigeons and crossbills.
   */
  protected *reachFor(at: Vec, reach: Partial<NumericPose>, { hang = false, bites = 1, hold = 0.7 } = {}): Script {
    const f = this.reachFacing(at, hang);
    const feet = this.feetFor(at, reach, hang);
    const p = this.pose;
    const gap = Math.hypot(feet.x - this.pos.x, feet.y - this.pos.y);
    if (this.airborne || gap > Math.max(4, this.size * 1.5)) yield* this.flyTo(feet);
    else if (gap > 0.3) {
      // Within the same plant it clambers across rather than taking off.
      const from = { ...this.pos };
      if (Math.abs(feet.x - from.x) > 0.3) p.facing = feet.x > from.x ? 1 : -1;
      if (p.rotation !== 0) yield* this.poseTo({ rotation: 0 }, 0.12);
      yield* this.tween(0.15 + gap * 0.06, (t) => {
        this.pos.x = from.x + (feet.x - from.x) * t;
        this.pos.y = from.y + (feet.y - from.y) * t + this.size * 0.1 * Math.sin(Math.PI * t);
        p.crouch = 0.3 * Math.sin(Math.PI * t);
      });
    }
    p.facing = f;
    if (hang) yield* this.poseTo({ rotation: Math.PI * f }, 0.18);
    // A hidden animal shows on its leaf as the bird spots it.
    if (this.meal && FOODS[this.meal.kind].hidden) {
      this.aimAt(at);
      yield* this.wait(0.3);
    }
    const rest = this.restingPose();
    const half = Object.fromEntries(Object.keys(reach).map((k) => [k, ((rest as Record<string, number>)[k] + reach[k as keyof NumericPose]!) / 2]));
    for (let i = 0; i < bites; i++) {
      yield* this.poseTo(reach, 0.12);
      if (i < bites - 1) yield* this.poseTo(half, 0.1);
    }
    this.take(hold, at);
  }

  /** Whether the bill (or feet) are at the food the running behavior is after. */
  protected atFood(): boolean {
    const site = this.meal?.site;
    if (!site) return false;
    const b = this.takesInFeet ? this.pos : this.billTip();
    if (b.x < site.x[0] - 2 || b.x > site.x[1] + 2) return false;
    const pieces = this.world.food.find((f) => f.kind === this.meal!.kind)?.units.filter((u) => !u.gone);
    if (site.units) return !!pieces?.some((u) => Math.hypot(u.x - b.x, u.y - b.y) < 4);
    // A bed along the bottom (eelgrass) is at the bottom, however deep that is there.
    if (site.onBottom) return b.y - this.world.floorY(b.x) <= 1.5;
    return Math.abs(b.y - site.y) <= (site.spread ?? 3);
  }

  /**
   * The catch at the end of a pounce, plunge, sally or stoop: the prey is
   * startled as the hunter comes in, and the hunter takes it at `target`.
   */
  protected *strikeAt(target: Vec, { land = false, speed = 1.3, hold = 1.2 }: { land?: boolean; speed?: number; hold?: number } = {}): Script {
    // At the animal it saw, if it saw one.
    target = this.takeLead() ?? target;
    this.startlePrey();
    this.aimAt(target);
    yield* this.flyTo(target, { land, speed });
    this.take(hold, target);
  }

  /**
   * Plunge-dive at x from wherever the bird is in the air, come up with a
   * fish and burst back out. Ospreys, kingfishers, terns and pelicans.
   * `miss` comes up empty, as many plunges do; the last one of a behavior should not.
   */
  protected *plungeAt(x: number, { speed = 1.6, depth = 1.2, miss = false } = {}): Script {
    // The body drops at x, head down, the bill going in a little ahead of it; in shallows too thin for the bill to
    // get under, the drop moves out to the first place deep enough. The bird faces the way it goes to get there,
    // turning at the top if it has to (unless the drop is about under it), and keeps that facing all the way down:
    // a dive does not turn round, or fly backward.
    const dive: Partial<Pose> = { pitch: -1, neck: 0.25, head: 0 };
    const m = this.mealRange();
    const drop = (f: 1 | -1, bill?: number) => {
      const facing = this.pose.facing;
      this.pose.facing = f;
      const tip = this.billWith(dive, this.pos, false);
      this.pose.facing = facing;
      const dx = tip.x - this.pos.x, dy = tip.y - this.pos.y;
      // The bill stays over the fish and in the scene, and the body in the scene; the body goes as deep as the bill
      // needs, but not into the bottom.
      const [lo, hi] = [Math.max(3, (m?.[0] ?? 3) - 1), Math.min(96, (m?.[1] ?? 96) + 1)];
      const bodyAt = (bill: number) => {
        const bx = clamp(clamp(bill, lo, hi) - dx, 1, 99);
        return { x: bx, y: Math.max(Math.min(-depth, -0.7 - dy), this.world.floorY(bx) + this.size * 0.4) };
      };
      let body = bodyAt(bill ?? x + dx);
      while (body.y + dy > -0.5 && body.x + dx < Math.min(94, hi)) body = bodyAt(body.x + dx + 0.5);
      return { f, dx, body, back: (body.x - this.pos.x) * f < -0.5 };
    };
    const f0: 1 | -1 = Math.abs(x - this.pos.x) > 1 ? (x > this.pos.x ? 1 : -1) : this.pose.facing;
    // Behind it whichever way it faces (it is right over the fish): straight down instead, the fish coming the
    // short way to the bill.
    const now = this.pose.facing;
    const other: 1 | -1 = now === 1 ? -1 : 1;
    let plan = drop(f0);
    if (plan.back) plan = drop(now, this.pos.x + drop(now).dx);
    if (plan.back) plan = drop(other, this.pos.x + drop(other).dx);
    if (plan.back) plan = drop(f0 === 1 ? -1 : 1);
    const { f, dx, body } = plan;
    this.pose.facing = f;
    x = body.x + dx;
    // Plunge-divers take fish from the top of the water: a fish already showing swims up and over to where the bill
    // goes in as the bird comes down, never hiding and showing again somewhere else; the one it went for is not missed.
    const shown = this.world.prey;
    if (shown && this.lead && Math.hypot(shown.x - this.lead.x, shown.y - this.lead.y) < 0.01) miss = false;
    const fish = shown ?? (this.meal ? this.aimAt({ x, y: -0.6 }) && this.world.prey : null);
    const swim = (dt: number) => {
      if (!fish) return;
      const k = Math.min(1, dt * 6);
      const [mx, my] = [(x - fish.x) * k, (-0.6 - fish.y) * k];
      const cap = Math.min(1, (12 * dt) / (Math.hypot(mx, my) || 1));
      fish.x += mx * cap;
      fish.y += my * cap;
    };
    // The flight down, held to its facing and easing into the head-down pose on the way. It folds and drops: the
    // way it was flying doesn't carry it on past the spot.
    this.vel = { x: 0, y: -1 };
    const down = this.flyTo(body, { land: false, speed });
    for (;;) {
      const dt = yield;
      swim(dt);
      if (down.next(dt).done) break;
      this.pose.facing = f;
      const k = Math.min(1, dt * 8);
      for (const key of ['pitch', 'neck', 'head'] as const) this.pose[key] += (dive[key]! - this.pose[key]) * k;
    }
    this.pose.facing = f;
    yield* this.alongside(this.poseTo(dive, 0.06), swim);
    // The last of the way to wherever the bill really went in: just under the surface, if the shallows kept the bill
    // from going deeper.
    const bill = this.billTip();
    const at = { x: bill.x, y: clamp(bill.y, -0.6, -0.3) };
    if (fish) {
      const from = { x: fish.x, y: fish.y };
      yield* this.tween(Math.max(0.1, Math.hypot(at.x - from.x, at.y - from.y) / 10), (t) => Object.assign(fish, { x: from.x + (at.x - from.x) * t, y: from.y + (at.y - from.y) * t }));
    }
    this.world.burst('splash', body.x, 0, 12);
    // Held head-down in the water while it grabs, so the bill stays on the fish.
    const held = { ...this.pose };
    yield* this.alongside(this.wait(0.35), () => Object.assign(this.pose, held));
    if (!miss) this.take(Infinity, at);
    // A missed fish gets away.
    else if (fish) this.world.prey = this.lead = null;
    this.vel = { x: 0, y: 8 };
    this.world.burst('splash', body.x, 0, 6);
  }

  /** How far to swim underwater, up to `span`: toward somewhere in the food, else away from the nearer end of the water. */
  protected diveDx(span: number): number {
    const site = this.meal?.site;
    const water = this.world.habitat.water;
    if (site && water) {
      const x = rand(Math.max(site.x[0], water.from + 4, this.pos.x - span), Math.min(site.x[1], 96, this.pos.x + span));
      return clamp(x - this.pos.x, -span, span) || rand(-1, 1);
    }
    const dir = this.pos.x > 80 ? -1 : this.pos.x < 68 ? 1 : Math.random() < 0.5 ? -1 : 1;
    return dir * span * rand(0.7, 1.1);
  }

  /** Run `main` to the end, calling `side` every frame alongside it. */
  protected *alongside(main: Script<unknown>, side: (dt: number) => void): Script {
    for (;;) {
      const dt = yield;
      side(dt);
      if (main.next(dt).done) return;
    }
  }

  /**
   * Others of its kind beside it, only for a behavior that cannot happen alone (a waxwing hands its
   * berry to a neighbor). They sit still, a body and a half apart, for the behavior to place and move.
   * Birds that feed in flocks feed alone until the scene has a flock setting.
   */
  protected company(n: number): Bird[] {
    const Kind = this.constructor as new (world: World, stock: boolean) => Bird;
    const [lo, hi] = this.world.habitat.land;
    const gap = this.size * 1.6;
    const flock: Bird[] = [];
    // Alternate sides outward from the bird, skipping spots off the land or too close to another.
    for (let k = 1; flock.length < n && k < 4 * n + 4; k++) {
      const x = this.pos.x + (k % 2 ? -1 : 1) * gap * Math.ceil(k / 2);
      if (x < lo || x > hi || flock.some((o) => Math.abs(o.pos.x - x) < gap)) continue;
      const b = new Kind(this.world, false);
      b.pos = { x, y: this.pos.y };
      b.airborne = false;
      b.pose.facing = Math.random() < 0.5 ? 1 : -1;
      flock.push(b);
    }
    this.party = flock;
    return flock;
  }

  /**
   * Rob `victim`, another bird carrying a fish: chase it through every twist and turn until it drops
   * the fish, and catch the fish before it hits the water. Jaegers and Heermann's Gulls are unrelated
   * and both do this. The victim is drawn for the rest of the behavior, flying off empty.
   */
  protected *robInFlight(victim: Bird): Script {
    const water = this.world.habitat.water;
    if (!water) return;
    const item = (this.meal && FOODS[this.meal.kind].item) || 'fish';
    // The victim comes in over the water with its catch, from the far end of the bay.
    const dir: 1 | -1 = this.pos.x < 77 ? -1 : 1;
    const x0 = dir === -1 ? 97 : water.from + 2;
    const CHASE = 5;
    const v = victim.pose;
    v.carry = item;
    let dropped = false;
    // Weaving and climbing to shake off the chaser, then off and away once it has let go of the fish.
    const path = (t: number): Vec =>
      dropped ? { x: clamp(x0 + dir * (CHASE * 4.5 + (t - CHASE) * 9), 1, 99), y: 9 + (t - CHASE) * 4 } : { x: x0 + dir * t * 4.5, y: 9 + 3 * Math.sin(t * 2.4) };
    const clock = this.flyOther(victim, path);
    // Up to meet it, then in behind it, matching every turn.
    yield* this.wait(0.6);
    while (clock() < CHASE) {
      const ahead = path(clock() + 0.4);
      yield* this.flyTo({ x: ahead.x - dir * 3, y: ahead.y - 0.5 }, { land: false, speed: 1.4 });
    }
    // The victim lets go of its fish, and the robber drops after it.
    dropped = true;
    v.carry = null;
    const from = { ...victim.billTip() };
    const fish = this.world.emit(item, from.x, from.y, { vx: dir * 2, gravity: 6, floor: 0, life: 4, by: this });
    const at = { x: from.x + dir * 2.4, y: Math.max(1.2, from.y - 3) };
    this.startlePrey();
    yield* this.alongside(this.flyTo(at, { land: false, speed: 1.9 }), () => {
      // The fish falls to meet it.
      const k = clamp(1 - Math.hypot(at.x - this.pos.x, at.y - this.pos.y) / 10, 0, 1);
      fish.x += (at.x - fish.x) * k * 0.2;
      fish.y += (at.y - fish.y) * k * 0.2;
    });
    fish.life = 0;
    // The dropped fish, caught where it falls.
    this.aimAt(at);
    this.take(Infinity, at);
  }

  /**
   * Another bird in this behavior's story flying `path` (seconds since it appeared to position) until the
   * behavior ends: a jaeger's victim, the crow a kingbird chases off. Returns the seconds it has flown.
   */
  protected flyOther(other: Bird, path: (t: number) => Vec, flapHz = 4): () => number {
    const v = other.pose;
    other.airborne = true;
    other.pos = path(0);
    Object.assign(v, { wings: 'open', carryInFeet: false, neck: 0.25, head: 0, rotation: 0, facing: path(0.05).x >= path(0).x ? 1 : -1 });
    this.party = [other];
    let clock = 0;
    this.others = (dt) => {
      clock += dt;
      const a = path(clock);
      const b = path(clock + 0.05);
      other.pos = a;
      v.facing = b.x >= a.x ? 1 : -1;
      v.pitch = clamp(Math.atan2(b.y - a.y, Math.abs(b.x - a.x)) * 0.7, -0.8, 0.8);
      v.flap = Math.sin(clock * TAU * flapHz);
    };
    return () => clock;
  }

  /** Tear at a catch held in the feet, bite by bite, until it is gone. Hawks, falcons and owls on a perch. */
  protected *eatCatch(bites = 4): Script {
    for (let i = 0; i < bites; i++) {
      yield* this.peck(1, 1.1);
      yield* this.wait(0.25);
    }
    this.hold(null);
  }

  /** Swallow what it came up with, head back. */
  protected *swallowCatch(): Script {
    if (!this.pose.carry) return;
    this.hold(this.pose.carry);
    yield* this.poseTo({ neck: 1.2, head: 0.5 }, 0.15);
    yield* this.wait(0.5);
    this.hold(null);
  }

  /**
   * Low passes back and forth over the stretch from a to b, starting from the nearer end, the way a
   * harrier, a barn owl or a vulture searches open ground. Ends over whichever end the last pass reaches.
   */
  protected *quarterOver(a: number, b: number, height: number, passes = 2, speed = 0.6): Script {
    let [from, to] = Math.abs(this.pos.x - a) < Math.abs(this.pos.x - b) ? [a, b] : [b, a];
    yield* this.flyTo({ x: from, y: height }, { land: false });
    for (let i = 0; i < passes; i++) {
      yield* this.flyTo({ x: (from + to) / 2, y: height + 0.8 }, { land: false, speed });
      yield* this.flyTo({ x: to, y: height }, { land: false, speed });
      [from, to] = [to, from];
    }
  }

  /** Warn the prey: a hunter is coming in. */
  protected startlePrey() {
    if (this.meal) this.world.startle(this.meal.kind, this);
  }

  /** The animal this bird is going after is at `at`: it is drawn there until the bird takes it. Returns `at`. */
  protected aimAt<V extends Vec>(at: V, show = true): V {
    if (!this.meal) return at;
    // An animal held in a peek becomes the prey if this is where it is; if the bird goes for another, it hides as
    // that one shows.
    const p = this.world.peek;
    if (p?.held) {
      const s = peekSpot(p, this.world.habitat);
      const near = Math.hypot(at.x - s.x, at.y - s.y) < 1.5;
      if (near) this.lead = { x: at.x, y: at.y };
      if (near || show) this.world.peek = null;
    }
    // Picking where to go (`show` false) draws nothing yet, unless this is the animal it saw: a hidden animal shows
    // when the bill comes down, so it never has to move from where it was guessed to where the bill lands.
    const seen = this.lead && Math.hypot(at.x - this.lead.x, at.y - this.lead.y) < 0.01;
    this.world.prey = show || seen ? { kind: this.meal.kind, x: at.x, y: at.y, by: this } : null;
    return at;
  }

  /** Drop onto prey on the ground, mantle over it with wings spread, then tear at it. Hawks, owls and the harrier. */
  protected *grab(spot: Vec, bites = 2): Script {
    spot = this.takeLead() ?? spot;
    yield* this.strikeAt(spot, { land: true, speed: 0.9, hold: Infinity });
    this.world.burst('dust', spot.x, 0, 4);
    this.pose.wings = 'open';
    yield* this.poseTo({ crouch: 0.5, flap: -0.5 }, 0.15);
    yield* this.wait(0.8);
    yield* this.relax();
    yield* this.peck(bites, 0.9);
  }

  /** Somewhere within `range` to move to on foot or on the water: on the food while feeding, else around here. */
  protected foodSpot(range: number): Vec {
    const site = this.meal?.site;
    const water = this.world.habitat.water;
    const land = this.world.habitat.land;
    const wet: [number, number] | null = water ? [water.from + 4, 94] : null;
    const over = (r: [number, number]) => !!site && site.x[1] >= r[0] && site.x[0] <= r[1];
    // Afloat it stays on the water unless the food is only ashore (geese coming up to graze).
    let [lo, hi] = this.afloat && wet && (!site || over(wet) || !over(land)) ? wet : land;
    // Food on top of a log is eaten from up on the log.
    if (site?.stand) [lo, hi] = [Math.max(lo, site.stand[0]), Math.min(hi, site.stand[1])];
    const at = (x: number) => ({ x, y: this.restY(x) });
    if (!site || !over([lo, hi])) return at(clamp(this.pos.x + rand(-range, range), lo, hi));
    // Walking turns the bird to face the way it goes, so it reaches a bill point b by walking toward
    // it and stopping a head-and-bill short: from the right of here if b is far enough right, and so on.
    const off = this.groundReach;
    const gap = off + 0.2;
    const bodyFor = (b: number) => (b > this.pos.x ? b - off : b + off);
    const ok = (b: number) => Math.abs(b - this.pos.x) >= gap && bodyFor(b) >= lo && bodyFor(b) <= hi;
    const pieces = site.units?.filter((u) => Math.abs(u.y - this.restY(u.x)) < 1.5).map((u) => u.x);
    let options: number[];
    if (pieces?.length) options = pieces.filter(ok);
    else {
      // Sample the stretch of food; the reachable part of it is at most two intervals.
      options = [];
      for (let i = 0; i <= 24; i++) {
        const b = site.x[0] + ((site.x[1] - site.x[0]) * i) / 24;
        if (ok(b)) options.push(b);
      }
    }
    // A patch too small to walk up to facing it (an ant mound): stand at its edge; peck() turns round to it.
    // The animal it saw, if it can stand beside it.
    const lead = this.takeLead();
    const reachable = (x: number) => x >= site.x[0] - 3 && x <= site.x[1] + 3 && Math.abs(Math.abs(this.beside(x, lo, hi) - x) - off) < 0.01;
    if (!options.length || (lead && !ok(lead.x) && reachable(lead.x))) {
      const mid = lead?.x ?? (site.x[0] + site.x[1]) / 2;
      this.aimAt(lead ?? { x: mid, y: this.aimY(site) }, false);
      const x = this.beside(mid, lo, hi);
      // Standing there already: it turns to the food, as walking up to it would have.
      if (Math.abs(x - this.pos.x) <= 0.05 && Math.abs(mid - x) > 0.3) this.pose.facing = mid > x ? 1 : -1;
      return at(x);
    }
    const near = options.filter((b) => Math.abs(b - this.pos.x) <= range + off);
    const pool = near.length ? near : options;
    const b = lead && ok(lead.x) ? lead.x : pool[Math.floor(Math.random() * pool.length)] + (pieces?.length ? 0 : rand(-0.2, 0.2));
    this.aimAt(lead && b === lead.x ? lead : { x: b, y: this.aimY(site) }, false);
    const x = clamp(bodyFor(b), lo, hi);
    // The jitter can leave the spot a step's width from here, too little for walking to turn the bird to it.
    if (Math.abs(x - this.pos.x) <= 0.05) this.pose.facing = b > x ? 1 : -1;
    return at(x);
  }

  /** How deep to look for food in water from the surface: no deeper than the bill reaches. Elsewhere, the food's height. */
  private aimY(site: FoodSite): number {
    if (!this.afloat || site.y >= 0 || site.units) return site.y;
    const rest = this.restingPose();
    return Math.max(site.y, this.billWith({ pitch: rest.pitch - 0.9, neck: -1.4, head: -1.5, crouch: 0.45 }).y);
  }

  /** Where to stand for the bill to come down on the ground at x = b: a head and bill to one side of it, the side nearer the bird. */
  protected beside(b: number, lo: number, hi: number): number {
    const sides = [b - this.groundReach, b + this.groundReach].filter((x) => x >= lo && x <= Math.min(hi, this.wadeMax()));
    if (!sides.length) return clamp(b, lo, hi);
    return sides.reduce((a, c) => (Math.abs(c - this.pos.x) < Math.abs(a - this.pos.x) ? c : a));
  }

  /** A point `height` above the food, for a bird that hunts from the air; null when not feeding. */
  protected huntSpot(height: number): Vec | null {
    const site = this.meal?.site;
    if (!site) return null;
    const x = this.takeLead()?.x ?? rand(site.x[0], site.x[1]);
    this.aimAt({ x, y: site.y }, false);
    return { x, y: Math.min(this.flight.ceiling, site.y + height) };
  }

  /** The point a strike aims at: on the food, else `fallback`. */
  protected preySpot(fallback: Vec): Vec {
    const site = this.meal?.site;
    if (!site) return fallback;
    const lead = this.takeLead();
    if (lead) return this.aimAt(lead);
    const piece = site.units?.[Math.floor(Math.random() * site.units.length)];
    if (piece) return { ...piece };
    // Anywhere through a loose swarm or flock's depth, but not into the ground under it; a fish stays in the water.
    const x = rand(site.x[0], site.x[1]);
    const y = site.y + (site.spread ? rand(-1, 1) * site.spread : 0);
    return this.aimAt({ x, y: site.y > 0 ? Math.max(1, y) : site.y < 0 ? clamp(y, this.world.floorY(x) + 0.6, -0.4) : y });
  }

  /** The x range of the food the running behavior is after, optionally only if it lies on dry ground. */
  protected mealRange(onLand = false): [number, number] | null {
    const site = this.meal?.site;
    if (!site) return null;
    const [lo, hi] = this.world.habitat.land;
    if (onLand && ((site.y !== 0 && !site.stand) || site.x[1] < lo || site.x[0] > hi)) return null;
    return onLand ? [Math.max(lo, site.x[0]), Math.min(hi, site.x[1])] : site.x;
  }

  protected groundSpot(near: number, range: number): Vec {
    return { x: this.world.clampLand(near + rand(-range, range)), y: 0 };
  }
}
