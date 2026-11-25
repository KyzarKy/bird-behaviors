/**
 * What birds eat, and where each food sits in each scene.
 *
 * A feeding behavior names its food (`eats` in its BehaviorSpec). A scene only
 * shows the foods its current bird eats, plus a fixed extra or two so it never
 * looks bare. Everything here is natural food: see CLAUDE.md.
 */
import type { BehaviorSpec, HabitatId, Item, Vec } from './traits';

export type FoodKind =
  // Plants
  | 'berries'
  | 'acorns'
  | 'cones'
  | 'seedHeads'
  | 'fallenSeed'
  | 'nectar'
  | 'sap'
  | 'grass'
  | 'eelgrass'
  // Small animals
  | 'worms'
  | 'ants'
  | 'grassBugs'
  | 'litterBugs'
  | 'barkBugs'
  | 'leafBugs'
  | 'swarm'
  | 'sandCritters'
  | 'clams'
  | 'mussels'
  | 'shellfish'
  | 'wrack'
  | 'plankton'
  | 'minnows'
  | 'baitfish'
  // Larger prey
  | 'voles'
  | 'flock'
  | 'carrion';

export interface FoodSpec {
  /** What shows in the bill or feet after a bird takes some. Null when nothing would: a sip of nectar or sap, a mouthful of plankton, carrion. */
  item: Item | null;
  /** A small animal that keeps out of sight and shows itself now and then (a peek). Plants and the flock are always in view and never peek. */
  hidden?: boolean;
}

export const FOODS: Record<FoodKind, FoodSpec> = {
  berries: { item: 'berry' },
  acorns: { item: 'acorn' },
  // The cone stays on the tree; the bird comes away with its seed.
  cones: { item: 'seed' },
  seedHeads: { item: 'seed' },
  fallenSeed: { item: 'seed' },
  nectar: { item: null },
  sap: { item: null },
  grass: { item: 'grass' },
  eelgrass: { item: 'weed' },
  worms: { item: 'worm', hidden: true },
  ants: { item: 'insect', hidden: true },
  grassBugs: { item: 'grasshopper', hidden: true },
  litterBugs: { item: 'insect', hidden: true },
  barkBugs: { item: 'insect', hidden: true },
  leafBugs: { item: 'caterpillar', hidden: true },
  swarm: { item: 'insect' },
  sandCritters: { item: 'crab', hidden: true },
  clams: { item: 'clam' },
  mussels: { item: 'mussel' },
  shellfish: { item: 'mussel' },
  wrack: { item: 'insect', hidden: true },
  plankton: { item: null },
  minnows: { item: 'fish', hidden: true },
  baitfish: { item: 'fish', hidden: true },
  voles: { item: 'vole', hidden: true },
  flock: { item: 'prey' },
  carrion: { item: null },
};

/** Where a food is. */
export interface FoodSite {
  /** The x range birds go to for it. */
  x: [number, number];
  /** Height: 0 on the ground, negative under water, higher in a plant or on a trunk. */
  y: number;
  /** How far above or below `y` it reaches, for food without pieces: insects through a tree crown, a swarm. Defaults to 3. */
  spread?: number;
  /** Pieces drawn in place. One a bird takes is gone until the bird's behavior ends. Small animals have none and only peek. */
  units?: Vec[];
  /** The pieces lie on the seabed: their y is height above the bottom wherever they are. */
  onBottom?: boolean;
}

/** The food a behavior goes after in a scene, if any. */
export function eatsIn(spec: BehaviorSpec, habitat: HabitatId): FoodKind | null {
  const e = spec.eats;
  return (typeof e === 'string' ? e : e?.[habitat]) ?? null;
}

/** Shown in a scene whatever bird is in it. */
export const EXTRAS: Record<HabitatId, FoodKind[]> = { yard: ['berries'], beach: ['wrack'] };

// A fixed seed, so food is laid out the same way every time.
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const between = (lo: number, hi: number) => lo + rnd() * (hi - lo);

/** n points inside the given circles (a tree crown or a bush). */
function inCrowns(n: number, crowns: [number, number, number][]): Vec[] {
  return Array.from({ length: n }, (_, i) => {
    const [x, y, r] = crowns[i % crowns.length];
    const a = between(0, Math.PI * 2);
    const d = r * Math.sqrt(between(0.1, 0.75));
    return { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d };
  });
}
const along = (n: number, lo: number, hi: number, y = 0): Vec[] =>
  Array.from({ length: n }, (_, i) => ({ x: lo + ((i + between(0.2, 0.8)) * (hi - lo)) / n, y }));

const SHRUB: [number, number, number][] = [[46, 3.6, 4], [50.5, 4.6, 4.6], [54, 3.2, 3.4]];
const OAK: [number, number, number][] = [[86, 31, 8], [78, 27, 6], [94, 29, 6], [86, 37, 6]];
const FIR: [number, number, number][] = [[12, 32.5, 5.4], [11.5, 26, 7], [12.5, 18.5, 8.2]];

export const FOOD_SITES: Record<HabitatId, Partial<Record<FoodKind, FoodSite>>> = {
  yard: {
    berries: { x: [45, 56], y: 6, units: inCrowns(16, SHRUB).map((p) => ({ x: p.x, y: Math.max(1.2, p.y + 1.2) })) },
    acorns: { x: [80, 92], y: 0, units: [...inCrowns(12, OAK), ...along(3, 82, 91)] },
    cones: { x: [5, 21], y: 22, units: inCrowns(9, FIR) },
    sap: { x: [85, 87], y: 9, units: [6.5, 8, 9.5, 11].flatMap((y) => [{ x: 85.5, y }, { x: 86.5, y: y + 0.4 }]) },
    seedHeads: { x: [37, 42], y: 6, units: along(6, 37.6, 41.8).map((p, i) => ({ x: p.x, y: 4.6 + ((i * 5) % 3) * 0.9 })) },
    fallenSeed: { x: [33, 43], y: 0, units: along(14, 33, 43, 0.12) },
    nectar: { x: [43, 57], y: 8.5, spread: 2.5 },
    grass: { x: [16, 44], y: 0 },
    worms: { x: [14, 44], y: 0 },
    ants: { x: [24, 27], y: 0 },
    grassBugs: { x: [15, 30], y: 0 },
    litterBugs: { x: [60, 73], y: 0 },
    barkBugs: { x: [31, 33], y: 15, spread: 14 },
    // Under the leaves at the ends of the low oak limbs and along the bottom of the crown.
    leafBugs: { x: [68, 98], y: 18, units: [[70.6, 16.5], [71.9, 17], [74.4, 20.6], [75.8, 21.2], [96.6, 18.5], [97.8, 18.9], [79, 21.6], [92.5, 23.6]].map(([x, y]) => ({ x, y })) },
    swarm: { x: [42, 52], y: 15, spread: 2.5 },
    voles: { x: [16, 44], y: 0 },
    flock: { x: [44, 56], y: 4, spread: 4 },
    carrion: { x: [91, 95], y: 0 },
  },
  beach: {
    grass: { x: [4, 18], y: 0 },
    fallenSeed: { x: [5, 17], y: 0, units: along(12, 5, 17, 0.12) },
    grassBugs: { x: [5, 17], y: 0 },
    voles: { x: [5, 17], y: 0 },
    ants: { x: [21, 31], y: 1.6 },
    wrack: { x: [33, 42], y: 0 },
    carrion: { x: [36, 39], y: 0 },
    swarm: { x: [33, 43], y: 5, spread: 2.5 },
    // A mussel bed on the bottom of the shallows, for the diving ducks.
    shellfish: { x: [62, 76], y: -3.3, spread: 2.5, onBottom: true, units: along(8, 62, 76, 0.35) },
    // Clusters at the foot of the rocks, clear of the wrack line so they can be seen.
    mussels: { x: [42, 51], y: 1.5, units: [[42.6, 0.3], [43.2, 0.7], [43.8, 0.3], [46.4, 0.3], [47, 0.7], [47.6, 0.35], [48.2, 0.75], [50.4, 0.3], [51, 0.25], [50.8, 0.7]].map(([x, y]) => ({ x, y })) },
    sandCritters: { x: [46, 64], y: 0 },
    clams: { x: [52, 57.5], y: 0, units: along(6, 52, 57.5, 0.05) },
    flock: { x: [50, 56], y: 0 },
    // Small fish in the shallows, near the surface: for waders, kingfishers and the Hooded Merganser.
    minnows: { x: [60, 72], y: -0.8, spread: 1 },
    // Rooted on the bottom of the shallows and reaching up toward the surface.
    eelgrass: { x: [60, 70], y: -1.6, spread: 2.4 },
    plankton: { x: [72, 88], y: 0 },
    // A school of herring and sand lance from near the surface down to the deep water.
    baitfish: { x: [70, 94], y: -1.5, spread: 2.5 },
  },
};
