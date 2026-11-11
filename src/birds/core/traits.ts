/**
 * The vocabulary every class in the hierarchy speaks.
 *
 * Each taxon class may declare four static tables: `flight`, `ecology`,
 * `look`, and `behaviors`. A class only lists what it changes; everything
 * else is inherited from the classes above it (see reflect.ts).
 */

/** A behavior is a generator: it yields once per frame and receives dt (seconds). */
export type Script<R = void> = Generator<void, R, number>;

export interface Vec {
  x: number;
  y: number;
}

export type HabitatId = 'yard' | 'beach';
export type PerchKind = 'treetop' | 'branch' | 'twig' | 'shrub' | 'post' | 'rock' | 'log' | 'flower';
export type Item = 'worm' | 'clam' | 'fish' | 'insect' | 'seed' | 'acorn';

/**
 * The parameters Bird.flyTo() and Bird.hoverFor() read. Two birds with the
 * same code path fly differently only because these numbers differ.
 */
export interface FlightProfile {
  /** Typical level-flight speed, m/s. */
  cruiseSpeed: number;
  /** 0..1 thrust-to-weight: acceleration and how explosively it takes off. */
  power: number;
  /** 0..1 how tightly it can turn. Low values fly wide arcs. */
  agility: number;
  /** 0..1 how abruptly it can stop in midair. 1 stops on a dime. */
  braking: number;
  /** 0 cannot hover; ~0.5 brief, effortful, nose-up; 1 sustained, any direction. */
  hover: number;
  /** 0..1 how little height it loses with wings set. */
  glide: number;
  /** Wingbeats per second. */
  flapRate: number;
  /** Fraction of each flap/rest cycle spent flapping. 1 is continuous flapping. */
  flapDuty: number;
  /** Seconds per flap/rest cycle. */
  cyclePeriod: number;
  /** What the wings do between flap bursts: closed (bounding) or held out (gliding). */
  restPose: 'folded' | 'spread';
  /** Seconds of flight before it must land. */
  endurance: number;
  /** Highest it will fly, in stage units. */
  ceiling: number;
}

/** How the bird lives when it is not flying. */
export interface Ecology {
  habitat: HabitatId;
  /** Perch types it uses, most preferred first. Empty means it lives on the ground. */
  perches: PerchKind[];
  /** 'none' means the feet are for perching only. */
  gait: 'walk' | 'hop' | 'run' | 'none';
  /** Stage units per second on foot. */
  groundSpeed: number;
  /** Pigeon-style head thrust while walking. */
  headBob: boolean;
  /** Resting body angle in radians: 0 horizontal, higher is more upright. */
  posture: number;
  call: string;
  song?: string;
}

/** Everything the renderer needs. Proportions are relative so they scale with `length`. */
export interface Look {
  /** Real body length in meters. */
  length: number;
  /** 0 slender .. 1 rotund. */
  build: number;
  /** Fractions of body length. */
  neckLength: number;
  legLength: number;
  tailLength: number;
  wingSpan: number;
  /** 1 is typical for a songbird. */
  headSize: number;
  /** Multiple of head diameter. */
  beakLength: number;
  beakShape: 'cone' | 'stout' | 'thin' | 'needle' | 'dagger' | 'hook' | 'chisel';
  tailShape: 'square' | 'fan' | 'pointed' | 'forked';
  /** Resting tail angle above horizontal, radians. */
  tailCock: number;
  crest: 'none' | 'pointed' | 'plume' | 'comb' | 'shaggy';
  /** Legs trail behind in flight instead of tucking. */
  legsTrail: boolean;
  body: string;
  belly: string;
  head: string;
  wing: string;
  tail: string;
  beak: string;
  legs: string;
  eye: string;
  neck?: string;
  cap?: string;
  throat?: string;
  breast?: string;
  band?: string;
  spots?: string;
  eyeLine?: string;
  eyeRing?: string;
  wingBar?: string;
  underwing?: string;
}

export type Rank = 'class' | 'order' | 'family' | 'genus' | 'species';

export interface Taxon {
  rank: Rank;
  /** Scientific name. */
  name: string;
  common: string;
  note: string;
}

export interface BehaviorSpec {
  label: string;
  /** What a birder should watch for. */
  cue: string;
}

/**
 * Maps a class's public, zero-argument Script methods to their descriptions.
 * Keys are checked against the class, so a typo or a renamed method fails to compile.
 */
export type BehaviorTable<T> = {
  [K in keyof T as T[K] extends () => Script ? K : never]?: BehaviorSpec;
};

/** The static side shared by every class in the hierarchy. */
export interface TaxonStatics {
  taxon: Taxon;
  flight: Partial<FlightProfile>;
  ecology: Partial<Ecology>;
  look: Partial<Look>;
  behaviors: object;
}
