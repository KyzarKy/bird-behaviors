/**
 * The vocabulary every class in the hierarchy speaks.
 *
 * Each taxon class may declare four static tables: `flight`, `ecology`,
 * `look`, and `behaviors`. A class only lists what it changes; everything
 * else is inherited from the classes above it (see reflect.ts).
 */
import type { FoodKind } from './food';

/** A behavior is a generator: it yields once per frame and receives dt (seconds). */
export type Script<R = void> = Generator<void, R, number>;

export interface Vec {
  x: number;
  y: number;
}

export type HabitatId = 'yard' | 'beach';
export type PerchKind = 'treetop' | 'branch' | 'twig' | 'shrub' | 'post' | 'rock' | 'log' | 'flower';
/** Something a bird holds in its bill or feet. */
export type Item =
  | 'worm'
  | 'clam'
  | 'mussel'
  | 'crab'
  | 'fish'
  | 'insect'
  | 'caterpillar'
  | 'grasshopper'
  | 'seed'
  | 'acorn'
  | 'berry'
  | 'cone'
  | 'grass'
  | 'weed'
  | 'vole'
  /** A small bird, drawn only as a vague dark shape. */
  | 'prey';

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
  /**
   * Other scenes it turns up in, each with the most it is ever seen there
   * (0..3, as in `presence`). Its own `habitat` always counts as 3.
   */
  scenes?: Partial<Record<HabitatId, number>>;
  /** Floats on the water instead of wading on the bottom. */
  swims: boolean;
  /**
   * How easy it is to find on the Miller Peninsula in each month, January first:
   * 0 absent, 1 scarce, 2 regular, 3 hard to miss.
   */
  presence?: readonly number[];
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
  /** Color of a throat pouch under the bill, for a pelican. */
  pouch?: string;
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
  /** Something the scene must have for the behavior to make sense. */
  needs?: 'water' | 'rocks' | 'bark';
  /** Relative odds of the bird choosing this on its own. Defaults to 1. */
  weight?: number;
  /** Finding, catching, handling or eating food. Shown as a tag, since many labels don't say so. */
  feeding?: boolean;
  /** The food it goes after, if it differs by scene then per scene. The scene shows that food while this bird is in it. */
  eats?: FoodKind | Partial<Record<HabitatId, FoodKind>>;
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
