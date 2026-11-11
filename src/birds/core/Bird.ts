import { resolveTraits, type BirdClass } from './reflect';
import type { BehaviorTable, Ecology, FlightProfile, Item, Look, PerchKind, Script, Taxon, Vec } from './traits';
import type { Trunk, World } from './World';

/** Stage units per second for each m/s of real airspeed. */
const SPEED = 2.2;
const TAU = Math.PI * 2;

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
  /** Wings beating too fast to see. */
  blur: boolean;
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

  static behaviors: BehaviorTable<Bird> = {
    fly: {
      label: 'Fly to a new spot',
      cue: 'Watch the wingbeat rhythm and the line it draws through the air: steady rowing, flap-and-bound, flap-and-glide, or soaring. Flight style alone often names the family.',
    },
    forage: {
      label: 'Forage',
      cue: 'How a bird feeds is usually its most reliable behavioral field mark.',
    },
    preen: {
      label: 'Preen and stretch',
      cue: 'Nibbling the breast feathers, a one-wing stretch, then a full-body shake. A relaxed bird; a good moment to study plumage.',
    },
    call: {
      label: 'Call',
      cue: 'Calls are short and given year-round by both sexes, unlike song.',
    },
  };

  readonly flight: FlightProfile;
  readonly ecology: Ecology;
  readonly look: Look;
  /** Drawn body length in stage units. */
  readonly size: number;
  readonly pose: Pose;

  pos: Vec = { x: 50, y: 0 };
  vel: Vec = { x: 0, y: 0 };
  airborne = false;
  /** Key of the behavior in progress, or null when idling. */
  current: string | null = null;

  /** Seconds since takeoff. Drives the flap cycle and endurance. */
  protected airTime = 0;
  private script: Script | null = null;
  private speechTimer = 0;

  constructor(readonly world: World) {
    const cls = this.constructor as BirdClass;
    this.flight = resolveTraits<FlightProfile>(cls, 'flight');
    this.ecology = resolveTraits<Ecology>(cls, 'ecology');
    this.look = resolveTraits<Look>(cls, 'look');
    this.size = drawLength(this.look.length);
    this.pose = {
      facing: 1,
      rotation: 0,
      wings: 'folded',
      blur: false,
      carry: null,
      carryInFeet: false,
      speech: null,
      ...this.restingPose(),
    };
    this.spawn();
  }

  // ---------------------------------------------------------------- driving

  /** Start a behavior by method name, replacing whatever was running. */
  perform(key: string) {
    const method = (this as unknown as Record<string, unknown>)[key];
    if (typeof method !== 'function') throw new Error(`${this.constructor.name} has no behavior "${key}"`);
    const p = this.pose;
    p.kickNear = p.kickFar = p.stride = p.headThrust = p.roll = p.beakOpen = p.crest = 0;
    p.carry = null;
    p.carryInFeet = false;
    this.current = key;
    this.script = (method as () => Script).call(this);
  }

  update(dt: number) {
    if (this.speechTimer > 0 && (this.speechTimer -= dt) <= 0) this.pose.speech = null;
    if (!this.script) {
      this.current = null;
      this.script = this.idle();
    }
    if (this.script.next(dt).done) this.script = null;
  }

  // -------------------------------------------------------------- behaviors

  *fly(): Script {
    const dest = this.findPerch(undefined, 'far') ?? this.groundSpot(this.pos.x > 50 ? 15 : 85, 8);
    if (!(yield* this.flyOver(dest)) && dest.y <= 0.05) yield* this.moveOnGround(dest.x);
    yield* this.relax();
  }

  *forage(): Script {
    yield* this.toGround();
    for (let i = 0; i < 3; i++) {
      yield* this.moveOnGround(this.world.clampLand(this.pos.x + rand(-6, 6)));
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

  /** Where a new bird appears. Runs at the end of the constructor. */
  protected spawn() {
    const perch = this.findPerch(undefined, 'any');
    this.pos = perch ? { x: perch.x, y: perch.y } : this.groundSpot(40, 12);
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

    let goal = target;
    let reached = true;
    if (target.y > f.ceiling) {
      goal = { x: target.x, y: this.world.floorY(target.x) };
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
        goal = { x, y: this.world.floorY(x) };
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
      heading += clamp(angleDiff(want, heading), -maxTurn, maxTurn);
      const nv = v < wantMag ? Math.min(wantMag, v + accel * dt) : Math.max(wantMag, v - decel * dt);
      this.vel = { x: Math.cos(heading) * nv, y: Math.sin(heading) * nv };
      this.pos.x = clamp(this.pos.x + this.vel.x * dt, 1, 99);
      this.pos.y += this.vel.y * dt;
      if (dist > 2) this.pos.y = Math.max(this.pos.y, this.world.floorY(this.pos.x) + 0.4);

      this.flightPose(flapping);
    }

    this.pos = { x: goal.x, y: goal.y };
    if (land) this.touchDown();
    return reached;
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
      p.blur = this.flight.flapRate >= 20;
      p.flap = Math.sin(this.airTime * TAU * Math.min(this.flight.flapRate * 1.3, 9));
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
      this.pos.y = Math.min(48, y0 + t * 0.9 * f.glide);
      if (Math.abs(this.vel.x) > 1) p.facing = this.vel.x > 0 ? 1 : -1;
      p.wings = 'open';
      p.blur = false;
      p.pitch = 0.05;
      p.neck = 0.25;
      // Banking through the turn shows first the top of the wings, then the underside.
      const flapNow = f.glide < 0.7 && t % 3 < 0.7;
      p.flap = flapNow ? Math.sin(this.airTime * TAU * f.flapRate) : 0.25 + 0.45 * Math.cos(angle);
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
    p.blur = flapping && f.flapRate >= 20;
    if (flapping) {
      p.wings = 'open';
      // Real rates above ~8 Hz alias on a 60 Hz screen, so they are capped (or blurred).
      p.flap = Math.sin(this.airTime * TAU * Math.min(f.flapRate, 8));
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
    Object.assign(this.pose, this.restingPose(), { wings: 'folded', blur: false });
  }

  // ------------------------------------------------------------- ground

  get onGround(): boolean {
    return !this.airborne && this.pose.rotation === 0 && Math.abs(this.pos.y - this.world.floorY(this.pos.x)) < 0.05;
  }

  /** Walk, run or hop to x, as the species' gait dictates. Birds that cannot walk fly. */
  protected *moveOnGround(x: number, speedMul = 1): Script {
    const gait = this.ecology.gait;
    if (!this.onGround || gait === 'none') {
      yield* this.flyOver({ x, y: this.world.floorY(x) });
      return;
    }
    const p = this.pose;
    const dir = x >= this.pos.x ? 1 : -1;
    p.facing = dir;
    if (gait === 'hop') {
      while (Math.abs(x - this.pos.x) > 0.3) {
        const step = Math.min(this.size * 0.45, Math.abs(x - this.pos.x));
        const x0 = this.pos.x;
        yield* this.tween(0.16 / speedMul, (t) => {
          this.pos.x = x0 + dir * step * t;
          this.pos.y = this.world.floorY(this.pos.x) + this.size * 0.12 * Math.sin(Math.PI * t);
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
        this.pos.y = this.world.floorY(this.pos.x);
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
    const gait = this.ecology.gait;
    const span = Math.abs(target.x - this.pos.x);
    const onFoot = this.onGround && target.y <= 0.05 && gait !== 'none' && span < (gait === 'hop' ? 10 : 30);
    if (onFoot || (!(yield* this.flyOver(target)) && target.y <= 0.05)) yield* this.moveOnGround(target.x);
  }

  protected *toGround(range = 8): Script {
    if (!this.onGround) yield* this.travelTo(this.groundSpot(this.pos.x, range));
  }

  protected *toPerch(kinds: PerchKind[] = this.ecology.perches, pick: PerchPick = 'near'): Script {
    const here = this.world.habitat.perches.some(
      (q) => kinds.includes(q.kind) && Math.hypot(q.x - this.pos.x, q.y - this.pos.y) < 0.5,
    );
    if (here && !this.airborne) return;
    const perch = this.findPerch(kinds, pick);
    if (perch) yield* this.flyOver(perch);
    else yield* this.settle();
  }

  /** If caught in the air with nothing to do, land somewhere sensible. */
  protected *settle(): Script {
    if (!this.airborne) return;
    yield* this.flyTo(this.findPerch(undefined, 'near') ?? this.groundSpot(this.pos.x, 6));
  }

  protected *peck(times = 1, depth = 1): Script {
    const rest = this.restingPose();
    for (let i = 0; i < times; i++) {
      yield* this.poseTo({ pitch: rest.pitch - 0.55 * depth, neck: -0.6 * depth, head: -1.1 * depth }, 0.09);
      yield* this.wait(0.04);
      yield* this.poseTo({ pitch: rest.pitch, neck: rest.neck, head: 0 }, 0.11);
      yield* this.wait(rand(0.08, 0.22));
    }
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
  protected *dropOnRocks(item: Item): Script {
    const rock = this.findPerch(['rock'], 'near');
    if (!rock) return;
    yield* this.travelTo({ x: this.world.clampLand(rock.x + 9), y: 0 });
    yield* this.peck(3);
    this.pose.carry = item;
    for (let tries = Math.random() < 0.5 ? 2 : 1; tries > 0; tries--) {
      yield* this.flyTo({ x: rock.x, y: rock.y + 17 }, { land: false });
      this.pose.carry = null;
      const shell = this.world.emit(item, this.pos.x, this.pos.y, { gravity: 30, floor: rock.y, life: 6 });
      yield* this.flyTo({ x: rock.x + 3, y: 0 });
      this.pose.facing = -1;
      yield* this.wait(0.3);
      shell.life = 0;
      if (tries > 1) {
        // Not broken. Pick it up and go again, higher.
        yield* this.peck(1);
        this.pose.carry = item;
      }
    }
    this.world.burst('chip', rock.x, rock.y, 5);
    yield* this.peck(4, 0.8);
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

  protected *flyToTrunk(trunk: Trunk, y: number, headUp: boolean): Script<1 | -1> {
    const side = this.pos.x >= trunk.x ? 1 : -1;
    yield* this.flyTo({ x: trunk.x + (side * trunk.width) / 2, y });
    this.cling(side, headUp);
    return side;
  }

  /** A climbable trunk, preferring one the bird is not already on. */
  protected findTrunk(): Trunk | null {
    const trunks = this.world.habitat.trunks.filter((t) => t.climb);
    const others = trunks.filter((t) => Math.abs(t.x - this.pos.x) > 3);
    const pool = others.length ? others : trunks;
    return pool[Math.floor(Math.random() * pool.length)] ?? null;
  }

  protected findPerch(kinds: PerchKind[] = this.ecology.perches, pick: PerchPick = 'any'): Vec | null {
    const d = (q: Vec) => Math.hypot(q.x - this.pos.x, q.y - this.pos.y);
    const options = this.world.habitat.perches
      .filter((q) => kinds.includes(q.kind) && q.y <= this.flight.ceiling && d(q) > 3)
      .sort((a, b) => d(a) - d(b));
    if (!options.length) return null;
    if (pick === 'near') return options[0];
    if (pick === 'far') return options[options.length - 1];
    return options[Math.floor(Math.random() * options.length)];
  }

  protected groundSpot(near: number, range: number): Vec {
    return { x: this.world.clampLand(near + rand(-range, range)), y: 0 };
  }
}
