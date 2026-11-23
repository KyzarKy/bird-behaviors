/**
 * What birds eat, and where each food sits in each scene.
 *
 * A feeding behavior names its food (`eats` in its BehaviorSpec). A scene only
 * shows the foods its current bird eats, plus a fixed extra or two so it never
 * looks bare. Everything here is natural food: see CLAUDE.md.
 */
import type { BehaviorSpec, HabitatId, Vec } from './traits';

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
  | 'wrack'
  | 'plankton'
  | 'minnows'
  | 'baitfish'
  // Larger prey
  | 'voles'
  | 'flock'
  | 'carrion';

/** Where a food is. */
export interface FoodSite {
  /** The x range birds go to for it. */
  x: [number, number];
  /** Height: 0 on the ground, negative under water, higher in a plant or on a trunk. */
  y: number;
  /** Pieces drawn in place, eaten one or two at a time and grown back. Small animals have none and only peek. */
  units?: Vec[];
}

/** The food a behavior goes after in a scene, if any. */
export function eatsIn(spec: BehaviorSpec, habitat: HabitatId): FoodKind | null {
  const e = spec.eats;
  return (typeof e === 'string' ? e : e?.[habitat]) ?? null;
}

/** Shown in a scene whatever bird is in it. */
export const EXTRAS: Record<HabitatId, FoodKind[]> = { yard: ['berries'], beach: ['wrack'] };

/** Seconds for an eaten piece to grow back. */
export const REGROW = 60;

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
    acorns: { x: [76, 96], y: 21, units: [...inCrowns(12, OAK), ...along(3, 82, 91)] },
    cones: { x: [5, 21], y: 22, units: inCrowns(9, FIR) },
    sap: { x: [85, 87], y: 9, units: [6.5, 8, 9.5, 11].flatMap((y) => [{ x: 85.5, y }, { x: 86.5, y: y + 0.4 }]) },
    seedHeads: { x: [37, 42], y: 6, units: along(6, 37.6, 41.8).map((p, i) => ({ x: p.x, y: 4.6 + ((i * 5) % 3) * 0.9 })) },
    fallenSeed: { x: [33, 43], y: 0, units: along(14, 33, 43, 0.12) },
    nectar: { x: [43, 57], y: 8 },
    grass: { x: [16, 44], y: 0 },
    worms: { x: [14, 44], y: 0 },
    ants: { x: [24, 27], y: 0 },
    grassBugs: { x: [15, 30], y: 0 },
    litterBugs: { x: [60, 73], y: 0 },
    barkBugs: { x: [31, 33], y: 14 },
    leafBugs: { x: [68, 98], y: 20 },
    swarm: { x: [34, 60], y: 15 },
    voles: { x: [16, 44], y: 0 },
    flock: { x: [44, 56], y: 6 },
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
    swarm: { x: [31, 45], y: 4 },
    mussels: { x: [41, 51], y: 1.5, units: [[46.4, 0.3], [47, 0.7], [47.6, 0.35], [48.2, 0.75], [50.4, 0.3], [51, 0.25], [50.8, 0.7], [41, 0.35]].map(([x, y]) => ({ x, y })) },
    sandCritters: { x: [50, 57], y: 0 },
    clams: { x: [52, 57.5], y: 0, units: along(6, 52, 57.5, 0.05) },
    flock: { x: [50, 56], y: 0 },
    minnows: { x: [59, 66], y: -0.5 },
    eelgrass: { x: [60, 70], y: -1 },
    plankton: { x: [72, 88], y: 0 },
    baitfish: { x: [70, 94], y: -1 },
  },
};
