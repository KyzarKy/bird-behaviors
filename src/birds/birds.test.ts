import { describe, expect, it, vi } from 'vitest';
import { drawnFlapRate } from './core/Bird';
import { behaviorsOf, buildTree, lineage, resolveTraits, traitSources, variantsOf, type BirdClass } from './core/reflect';
import { DEEP, HABITATS, STAGE, World, peekSpot } from './core/World';
import { FLOCK_CAP, Flock } from './core/Flock';
import { EXTRAS, FOOD_SITES, FOODS, eatsIn, type FoodKind } from './core/food';
import { drawFoodBack, PEEKS, PREY } from '../render/drawFood';
import type { Ecology, HabitatId } from './core/traits';
import { inScene } from '../ui/season';
import { SPECIES } from './taxonomy';
import { Galliformes, Chicken, CaliforniaQuail } from './taxonomy/galliformes';
import { AnnasHummingbird, Trochilidae } from './taxonomy/apodiformes';
import { Colaptes, NorthernFlicker, Picidae } from './taxonomy/piciformes';
import { BaldEagle, BeltedKingfisher } from './taxonomy/waterside';
import { RedBreastedSapsucker } from './taxonomy/yardbirds';

/** Math.random from a fixed seed for the length of `run`, so a simulated check fails the same way every time. */
// SEED=<n> shifts every seed so the checks try other paths; SEED=random picks a new n each run. A failure names the
// SEED that reproduces it. Unset, the seeds stay fixed.
const SEED = (() => {
  const v: string | undefined = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.SEED;
  return v === 'random' ? 1 + Math.floor(Math.random() * 2147483645) : v ? Number(v) : 0;
})();
const seeded = <T>(seed: number, run: () => T): T => {
  let s = SEED ? ((seed + SEED * 48271) % 2147483646) + 1 : seed;
  const spy = vi.spyOn(Math, 'random').mockImplementation(() => ((s = (s * 16807) % 2147483647) - 1) / 2147483646);
  try {
    return run();
  } catch (e) {
    if (e instanceof Error) e.message += ` (reproduce with SEED=${SEED})`;
    throw e;
  } finally {
    spy.mockRestore();
  }
};

const names = (classes: BirdClass[]) => classes.map((c) => c.taxon.name);
const make = (cls: (typeof SPECIES)[number], scene?: HabitatId) => {
  const proto = Object.assign({}, ...lineage(cls).map((c) => (Object.hasOwn(c, 'ecology') ? c.ecology : {})));
  return new cls(new World(HABITATS[scene ?? (proto.habitat as HabitatId)]));
};

describe('hierarchy', () => {
  it('walks class > order > family > genus > species', () => {
    expect(names(lineage(Chicken))).toEqual(['Aves', 'Galliformes', 'Phasianidae', 'Gallus', 'Gallus gallus domesticus']);
    for (const s of SPECIES) expect(lineage(s).map((c) => c.taxon.rank)).toEqual(['class', 'order', 'family', 'genus', 'species']);
  });

  it('places behaviors at the right taxonomic level', () => {
    // Every galliform forages by scratching; a hummingbird forages its own way.
    const forage = (cls: BirdClass) => behaviorsOf(cls).find((b) => b.key === 'forage')!;
    expect(forage(Chicken).implementedIn).toBe(Galliformes);
    expect(forage(Chicken).spec.label).toBe('Scratch and peck');
    expect(forage(CaliforniaQuail).implementedIn).toBe(Galliformes);
    expect(forage(AnnasHummingbird).implementedIn).toBe(Trochilidae);

    const flush = behaviorsOf(Chicken).find((b) => b.key === 'flush')!;
    expect(flush.declaredIn).toBe(Galliformes);
    expect(flush.implementedIn).toBe(Chicken);

    // A flicker is still a woodpecker, but forages its own way.
    const flicker = behaviorsOf(NorthernFlicker);
    expect(flicker.find((b) => b.key === 'drum')!.declaredIn).toBe(Picidae);
    expect(flicker.find((b) => b.key === 'forage')!.implementedIn).toBe(Colaptes);
  });

  it('resolves flight traits from the most specific class that sets them', () => {
    const src = (cls: BirdClass, field: string) => traitSources(cls, 'flight').find((s) => s.field === field)!;
    expect(src(AnnasHummingbird, 'hover')).toMatchObject({ value: 1, from: Trochilidae });
    expect(src(Chicken, 'endurance')).toMatchObject({ value: 2.5, from: Chicken });
    expect(src(Chicken, 'agility').from).toBe(Galliformes);
    // Hummingbird and kingfisher both hover, by different amounts, with no shared ancestor below Bird.
    expect(src(BeltedKingfisher, 'hover').value).toBeGreaterThan(0.3);
    expect(src(BeltedKingfisher, 'hover').value).toBeLessThan(1);
  });

  it('declares each taxon once, however many files extend it', () => {
    const byName = new Map<string, BirdClass>();
    for (const s of SPECIES) for (const c of lineage(s)) expect(byName.get(c.taxon.name) ?? byName.set(c.taxon.name, c).get(c.taxon.name)).toBe(c);
  });

  it('rebuilds one tree from the species list', () => {
    const root = buildTree(SPECIES);
    expect(root.cls.taxon.name).toBe('Aves');
    expect(root.children.length).toBe(18);
  });
});

describe('plumage variants', () => {
  it('merge over the adult look and change nothing else', () => {
    const withVariants = SPECIES.filter((s) => variantsOf(s).length > 1);
    expect(withVariants.length).toBeGreaterThan(0);
    for (const cls of withVariants) {
      const world = new World(HABITATS[make(cls).world.habitat.id]);
      const adult = new cls(world, false);
      for (const v of variantsOf(cls).slice(1)) {
        const bird = new cls(world, false, v);
        expect(bird.variant).toBe(v);
        expect(bird.look).toEqual({ ...adult.look, ...cls.variants![v as 'female' | 'juvenile'] });
        expect(bird.look).not.toEqual(adult.look);
        expect(bird.flight).toEqual(adult.flight);
      }
    }
  });

  it('fall back to the adult for a plumage the species does not have, and are not inherited', () => {
    expect(variantsOf(BaldEagle)).toEqual(['adult', 'juvenile']);
    const eagle = new BaldEagle(new World(HABITATS.beach), false, 'female');
    expect(eagle.variant).toBe('adult');
    expect(eagle.look).toEqual(new BaldEagle(new World(HABITATS.beach), false).look);
    expect(variantsOf(SPECIES.find((s) => s.taxon.common === 'Common Raven')!)).toEqual(['adult']);
  });
});

describe('behavior tables', () => {
  it('keep forage tagged as feeding through every relabel', () => {
    const untagged = SPECIES.filter((s) => !behaviorsOf(s).find((b) => b.key === 'forage')?.spec.feeding).map((s) => s.taxon.common);
    expect(untagged).toEqual([]);
  });

  // A method whose whole body is `return this.other();` is the same action listed twice.
  // Relabel the inherited behavior in the class's own table instead (see forage).
  const alias = (cls: BirdClass, key: string) => {
    const owner = lineage(cls).reverse().find((c) => Object.hasOwn(c.prototype, key))!;
    return String(Object.getOwnPropertyDescriptor(owner.prototype, key)!.value).match(/^\s*\w+\(\)\s*\{\s*return this\.(\w+)\(\);\s*\}$/)?.[1];
  };
  for (const cls of SPECIES) {
    it(`${cls.taxon.common} lists each action once`, () => {
      const keys = behaviorsOf(cls).map((b) => b.key);
      for (const key of keys) expect(keys, `${key} only returns another behavior`).not.toContain(alias(cls, key));
    });
  }
});

describe('simulation', () => {
  // Every behavior of every species must run to completion and keep the bird on stage.
  for (const cls of SPECIES) {
    for (const scene of (Object.keys(HABITATS) as HabitatId[]).filter((h) => inScene(cls, h)))
    for (const { key } of behaviorsOf(cls)) {
      it(`${cls.taxon.common} (${scene}): ${key}`, () => {
        const bird = make(cls, scene);
        bird.update(1 / 60);
        bird.perform(key);
        let frames = 0;
        while (bird.current !== null) {
          bird.world.step(1 / 60);
          bird.update(1 / 60);
          expect(Number.isFinite(bird.pos.x + bird.pos.y)).toBe(true);
          expect(bird.pos.x).toBeGreaterThanOrEqual(0);
          expect(bird.pos.x).toBeLessThanOrEqual(100);
          expect(bird.pos.y).toBeGreaterThan(-DEEP - 1);
          expect(bird.pos.y).toBeLessThan(54);
          // Never head first into the ground or the seabed. A bill may probe in; the head stays out.
          const head = bird.headPoint();
          const t = (frames / 60).toFixed(1);
          expect(head.y - head.r * 0.5, `head in the ground at ${t}s, x=${head.x.toFixed(1)}`).toBeGreaterThanOrEqual(bird.world.floorY(head.x) - 0.05);
          // A bird that doesn't swim wades no deeper than most of the way up its legs.
          if (!bird.ecology.swims && !bird.airborne && bird.pose.rotation === 0 && bird.pos.y < 0)
            expect(-bird.pos.y, `wading over its legs at ${t}s, x=${bird.pos.x.toFixed(1)}`).toBeLessThanOrEqual(bird.frame.legFull * 0.7 + 0.05);
          if (++frames > 60 * 90) throw new Error(`${key} did not finish within 90 simulated seconds`);
        }
      });
    }
  }
});

describe('regressions', () => {
  // The Osprey flew on past its plunge to x + 6, which could be 100; held at the edge at 99, it flew into it forever.
  it('a flight to a point past the edge of the scene ends at the edge', () => {
    const bird = make(BaldEagle, 'beach');
    bird.pos = { x: 92, y: 9 };
    const flight = (bird as unknown as { flyTo(t: { x: number; y: number }, o: { land: boolean }): Generator<void, boolean, number> }).flyTo({ x: 104, y: 9 }, { land: false });
    let frames = 0;
    while (!flight.next(1 / 60).done) expect(++frames, 'still flying at the edge').toBeLessThan(60 * 20);
    expect(bird.pos.x).toBeLessThanOrEqual(99);
  });

  // From a piling the run-up used to be placed back over the beach, and the turn toward the water went through the sand.
  for (const post of HABITATS.beach.perches.filter((p) => p.kind === 'post')) {
    it(`Bald Eagle fishing from the piling at x=${post.x} never hits the beach`, () => {
      const bird = make(BaldEagle);
      bird.pos = { x: post.x, y: post.y };
      bird.perform('snatchFish');
      for (let frames = 0; bird.current !== null; frames++) {
        bird.update(1 / 60);
        expect(bird.airborne && bird.pos.y < 2 && bird.pos.x < HABITATS.beach.water!.from).toBe(false);
        if (frames > 60 * 90) throw new Error('did not finish');
      }
    });
  }
});

describe('auto mode', () => {
  // A bird runs about 6-8 behaviors a minute, so a behavior at 1/20 of the total comes up
  // about once every 2-3 minutes. Anything rarer looks missing to someone watching.
  for (const cls of SPECIES) {
    for (const scene of (Object.keys(HABITATS) as HabitatId[]).filter((h) => inScene(cls, h))) {
      it(`${cls.taxon.common} (${scene}) does everything it can every few minutes`, () => {
        const options = make(cls, scene).autoOptions();
        const total = options.reduce((sum, o) => sum + o.weight, 0);
        for (const o of options) expect(o.weight / total, o.key).toBeGreaterThanOrEqual(1 / 20);
      });
    }
  }

  for (const cls of SPECIES) {
    it(`${cls.taxon.common} chooses its own behaviors and stays on stage`, () => {
      const bird = make(cls);
      bird.auto = true;
      const seen = new Set<string>();
      for (let frames = 0; frames < 60 * 120; frames++) {
        bird.world.step(1 / 60);
        bird.update(1 / 60);
        if (bird.current) seen.add(bird.current);
        expect(bird.pos.x >= 0 && bird.pos.x <= 100 && bird.pos.y > -DEEP - 1).toBe(true);
        // Its head stays under the top of the scene (wingtips at the top of a beat may go past).
        const head = bird.headPoint();
        expect(head.y + head.r, `${bird.current}: its head goes out the top of the scene`).toBeLessThan(STAGE.top);
      }
      expect(seen.size).toBeGreaterThan(1);
    });
  }
});

describe('flocks', () => {
  const flocking = SPECIES.filter((cls) => Flock.sizeOf(make(cls)) > 1);

  it('come in the sizes the species sets, up to the cap', () => {
    expect(flocking.length).toBeGreaterThan(0);
    for (const cls of flocking) {
      const f = new Flock(make(cls));
      f.grow();
      expect(f.birds.length, cls.taxon.common).toBe(Math.min(FLOCK_CAP, make(cls).ecology.flockSize));
      expect(new Set(f.birds.map((b) => b.world)).size, 'one shared world').toBe(1);
    }
  });

  for (const cls of flocking) {
    for (const scene of (Object.keys(HABITATS) as HabitatId[]).filter((h) => inScene(cls, h))) {
      it(`${cls.taxon.common} (${scene}) runs as a flock on stage, then goes back to one bird`, () =>
        seeded(7, () => {
          const f = new Flock(make(cls, scene));
          f.grow();
          const world = f.lead.world;
          // A flock behavior is done by everyone at once and leaves the one hidden animal to one bird itself.
          const hidden = (b: (typeof f.birds)[number]) => b.current !== null && behaviorsOf(cls).some((x) => x.key === b.current && !x.spec.flock && FOODS[eatsIn(x.spec, scene)!]?.hidden);
          for (let frames = 0; frames < 30 * 40; frames++) {
            f.update(1 / 30);
            for (const b of f.birds) expect(b.pos.x >= 0 && b.pos.x <= 100 && b.pos.y > -DEEP - 1 && b.pos.y < STAGE.top, `${b.current}: off stage`).toBe(true);
            // The scene draws one hunted animal, so one bird at a time goes after one.
            expect(f.birds.filter(hidden).length, 'two birds hunt hidden animals at once').toBeLessThanOrEqual(1);
          }
          // Each flock behavior: everyone takes part, stays on stage, and is done within a minute.
          for (const { key } of behaviorsOf(cls).filter((x) => x.spec.flock && !f.lead.missing(x.key))) {
            f.perform(key);
            expect(f.birds.every((b) => b.current === key), `${key}: not everyone joins in`).toBe(true);
            for (let frames = 0; frames < 30 * 60 && f.birds.some((b) => b.current === key); frames++) {
              f.update(1 / 30);
              for (const b of f.birds) expect(b.pos.x >= 0 && b.pos.x <= 100 && b.pos.y > -DEEP - 1 && b.pos.y < STAGE.top, `${key}: off stage`).toBe(true);
            }
            expect(f.birds.filter((b) => b.current === key).length, `${key}: still going after a minute`).toBe(0);
          }
          // Back to one bird: the one nearest the middle stays, and the others leave nothing behind.
          const c = f.center();
          const d = (b: (typeof f.birds)[number]) => Math.hypot(b.pos.x - c.x, b.pos.y - c.y);
          const nearest = Math.min(...f.birds.map(d));
          const keep = f.solo();
          expect(d(keep)).toBe(nearest);
          expect(f.birds).toEqual([keep]);
          expect(keep.flock).toBeNull();
          expect([...world.feeders].every((b) => b === keep), 'a bird that left is still feeding').toBe(true);
        }));
    }
  }
});

describe('drawn wingbeat rate', () => {
  it('is true to life up to 10/s, smooth above, and 20/s for a hummingbird', () => {
    for (const r of [1, 2.5, 7, 10]) expect(drawnFlapRate(r)).toBe(r);
    expect(drawnFlapRate(45)).toBeCloseTo(20, 1);
    expect(drawnFlapRate(60)).toBe(20);
    // No kink at the knee, and faster birds always beat faster on screen.
    expect(drawnFlapRate(10.01) - 10).toBeCloseTo(0.01, 3);
    for (let r = 1; r < 45; r++) expect(drawnFlapRate(r + 1)).toBeGreaterThan(drawnFlapRate(r));
  });
});

describe('scene requirements', () => {
  // A behavior that gives up on its first frame in a scene is missing something there; it must say what, so the UI can disable it.
  for (const cls of SPECIES) {
    for (const scene of (Object.keys(HABITATS) as HabitatId[]).filter((h) => inScene(cls, h))) {
      it(`${cls.taxon.common} (${scene}) declares what it needs`, () => {
        for (const { key } of behaviorsOf(cls)) {
          const bird = make(cls, scene);
          if (bird.missing(key)) continue;
          bird.update(1 / 60);
          bird.perform(key);
          bird.update(1 / 60);
          bird.update(1 / 60);
          expect(bird.current, `${key} ends at once`).toBe(key);
        }
      });
    }
  }
});

describe('natural food only', () => {
  // The app shows birds eating what they eat in nature and never portrays or promotes feeders.
  // "Canopy feeders" and the like describe how a bird feeds, not where people put food out.
  const FEEDING_STATION = /(?<!\b(?:canopy|surface|bottom|ground|filter|aerial) )\bfeeders?\b|\bsuet\b|\bbird ?seed\b|\bfeeding stations?\b/i;
  it('never mentions feeders, suet or birdseed', () => {
    const texts = SPECIES.flatMap((s) =>
      lineage(s).flatMap((c) => [c.taxon.note, ...behaviorsOf(c).map((b) => b.spec.cue), ...Object.values(resolveTraits<Ecology>(c, 'ecology')).filter((v) => typeof v === 'string')]),
    );
    expect([...new Set(texts)].filter((t) => FEEDING_STATION.test(t))).toEqual([]);
  });
});

describe('food in the scene', () => {
  // Every feeding behavior names what it eats, and every scene the bird visits has it.
  for (const cls of SPECIES) {
    for (const scene of (Object.keys(HABITATS) as HabitatId[]).filter((h) => inScene(cls, h))) {
      it(`${cls.taxon.common} (${scene}) finds its food`, () => {
        const bird = make(cls, scene);
        for (const b of behaviorsOf(cls).filter((b) => b.spec.feeding && !bird.missing(b.key))) {
          const kind = eatsIn(b.spec, scene);
          expect(kind, `${b.key} names no food`).not.toBeNull();
          expect(bird.world.site(kind), `${b.key}: no ${kind} in the ${scene}`).not.toBeNull();
        }
      });
    }
  }

  it('shows only the fixed extras when no bird eats anything else', () => {
    for (const id of Object.keys(HABITATS) as HabitatId[]) {
      const world = new World(HABITATS[id]);
      expect(world.food.map((f) => f.kind)).toEqual(EXTRAS[id]);
      for (const kind of EXTRAS[id]) expect(FOOD_SITES[id][kind]).toBeDefined();
    }
  });

  it('peeks within 10 seconds, then every 10 to 15 seconds, taking turns', () => {
    for (let run = 0; run < 20; run++) {
      const world = new World(HABITATS.yard);
      world.stock(['worms', 'voles']);
      const starts: number[] = [];
      const kinds = new Set<string>();
      for (let t = 0; t < 600; t += 0.1) {
        const before = world.peek;
        world.step(0.1);
        if (world.peek && world.peek !== before) starts.push(t), kinds.add(world.peek.kind);
      }
      expect(starts[0]).toBeLessThan(10);
      for (let i = 1; i < starts.length; i++) {
        expect(starts[i] - starts[i - 1]).toBeGreaterThanOrEqual(9.9);
        expect(starts[i] - starts[i - 1]).toBeLessThanOrEqual(15.1);
      }
      expect([...kinds].sort()).toEqual(['voles', 'worms']);
    }
  });

  it('draws a peek for each small animal that keeps out of sight, and for nothing else', () => {
    const hidden = (Object.keys(FOODS) as FoodKind[]).filter((k) => FOODS[k].hidden).sort();
    expect(Object.keys(PEEKS).sort()).toEqual(hidden);
  });

  it('draws the animal a bird hunts for every food that is not already in view', () => {
    const hidden = (Object.keys(FOODS) as FoodKind[]).filter((k) => FOODS[k].hidden);
    expect(Object.keys(PREY).sort()).toEqual([...hidden, 'flock'].sort());
  });

  // A bird feeds alone unless the behavior cannot happen without another bird: a waxwing hands its berry to a
  // neighbor, a robber chases the bird carrying the fish. Flock feeders feed alone until the scene has a flock setting.
  const NEEDS_OTHERS = new Set(['Cedar Waxwing:forage', 'Cedar Waxwing:feedTogether', 'Parasitic Jaeger:forage', 'Heermann’s Gull:pirate']);

  // Every feeding behavior ends with the bird eating: it takes its food at least once, always where that food is,
  // and holds the catch in its bill or feet unless there is nothing to show (nectar, sap, plankton, carrion).
  for (const cls of SPECIES) {
    for (const scene of (Object.keys(HABITATS) as HabitatId[]).filter((h) => inScene(cls, h))) {
      for (const b of behaviorsOf(cls).filter((b) => b.spec.feeding)) {
        it(`${cls.taxon.common} (${scene}): ${b.key} takes its food where it is`, () => {
          const kind = eatsIn(b.spec, scene)!;
          for (let run = 0; run < 3; run++) {
            const bird = make(cls, scene);
            if (bird.missing(b.key)) return;
            const site = bird.world.site(kind)!;
            const at: { x: number; y: number }[] = [];
            const eat = bird.world.eat.bind(bird.world);
            // Where the bill (or the feet, for a catch in the talons) was each frame.
            const track: number[] = [];
            const takes: number[] = [];
            bird.world.eat = (k, where) => {
              const bill = bird.billTip();
              // Taken at the bill or the feet, not somewhere the bird isn't.
              const gap = Math.min(Math.hypot(where.x - bill.x, where.y - bill.y), Math.hypot(where.x - bird.pos.x, where.y - bird.pos.y));
              expect(gap, `takes it ${gap.toFixed(1)} away from its bill and feet`).toBeLessThan(2.5);
              takes.push(track.length);
              at.push({ ...where });
              // Food on top of something (ants along the drift log): it stands up there to eat, not on the ground below.
              if (site.stand) expect(Math.abs(bird.pos.y - site.y), `feeds from the ground below the ${k} on the log`).toBeLessThan(0.3);
              // An animal that keeps out of sight is seen before it is taken: drawn where the bird takes it.
              if (FOODS[k].hidden) {
                const prey = bird.world.prey;
                expect(prey, `takes a ${k} that was never drawn`).not.toBeNull();
                if (prey) expect(Math.hypot(prey.x - where.x, prey.y - where.y), `takes a ${k} away from where it was drawn`).toBeLessThan(4);
              }
              const patch = bird.world.food.find((f) => f.kind === k)!;
              const left = patch.units.filter((u) => !u.gone).length;
              eat(k, where);
              // A berry, a seed, a mussel: the piece it took is gone from the scene.
              if (left) expect(patch.units.filter((u) => !u.gone).length, `takes no ${k} from where it pecks`).toBe(left - 1);
            };
            let held = false;
            bird.update(1 / 60);
            bird.perform(b.key);
            let under = false;
            let others = 0;
            for (let frames = 0; bird.current !== null && frames < 60 * 90; frames++) {
              bird.world.step(1 / 60);
              bird.update(1 / 60);
              others = Math.max(others, bird.party.length);
              held ||= bird.pose.carry === FOODS[kind].item;
              track.push(bird.billTip().x);
              // A diver swallows each catch before it goes under for the next.
              if (bird.submerged && !under) expect(bird.pose.carry, 'dives again still holding its last catch').toBeNull();
              under = bird.submerged;
            }
            expect(at.length, 'never takes any').toBeGreaterThan(0);
            const needs = NEEDS_OTHERS.has(`${cls.taxon.common}:${b.key}`);
            expect(others > 0, needs ? 'never shows the other bird it needs' : 'brings in other birds it could feed without').toBe(needs);
            expect(bird.party, 'other birds stay after the behavior').toEqual([]);
            // From the first bite to the last it stays at the food. Insects caught in the air are taken on
            // sallies from a perch, so a flycatcher goes back to its perch between catches.
            const margin = kind === 'swarm' ? Infinity : Math.max(8, bird.size);
            for (const x of track.slice(takes[0], takes[takes.length - 1]))
              expect(x, `wanders to x=${x.toFixed(1)} between bites, away from the ${kind}`).toBeGreaterThanOrEqual(site.x[0] - margin);
            for (const x of track.slice(takes[0], takes[takes.length - 1]))
              expect(x, `wanders to x=${x.toFixed(1)} between bites, away from the ${kind}`).toBeLessThanOrEqual(site.x[1] + margin);
            for (const p of at) expect(p.x, `takes it at x=${p.x.toFixed(1)}, away from the ${kind}`).toBeGreaterThanOrEqual(site.x[0] - 3);
            for (const p of at) expect(p.x, `takes it at x=${p.x.toFixed(1)}, away from the ${kind}`).toBeLessThanOrEqual(site.x[1] + 3);
            if (FOODS[kind].item) expect(held, `never holds a ${FOODS[kind].item}`).toBe(true);
          }
        });
      }
    }
  }

  // Someone watching should be able to tell what the bird is after from the label or the description.
  const WORDS: Record<FoodKind, RegExp> = {
    berries: /berr|fruit/i,
    acorns: /acorn/i,
    cones: /cone|seed/i,
    seedHeads: /seed/i,
    fallenSeed: /seed/i,
    nectar: /nectar|flower/i,
    sap: /sap/i,
    grass: /grass|graz/i,
    eelgrass: /eelgrass|weed|green/i,
    worms: /worm/i,
    ants: /\bants?\b/i,
    grassBugs: /grasshopper|insect|bug|beetle|cricket/i,
    litterBugs: /insect|bug|beetle|grub|spider|millipede/i,
    barkBugs: /insect|bug|beetle|grub|larva|ants?\b|spider/i,
    leafBugs: /insect|caterpillar|bug|spider|aphid/i,
    swarm: /insect|gnat|midge|fl(y|ies)|moth|bug/i,
    sandCritters: /crab|amphipod|worm|crustacean|invertebrate|sand flea|hopper/i,
    clams: /clam|shell/i,
    mussels: /mussel|shell|limpet|barnacle|snail/i,
    shellfish: /mussel|shell|clam|crab/i,
    wrack: /fl(y|ies)|hopper|insect|sand flea/i,
    plankton: /plankton|krill|copepod|tiny|invertebrate/i,
    minnows: /fish|minnow/i,
    baitfish: /fish|herring|sand lance/i,
    voles: /vole|rodent|mouse|mice/i,
    flock: /bird|sparrow|finch|songbird/i,
    carrion: /carrion|dead|carcass/i,
  };
  for (const cls of SPECIES) {
    for (const scene of (Object.keys(HABITATS) as HabitatId[]).filter((h) => inScene(cls, h))) {
      for (const b of behaviorsOf(cls).filter((b) => b.spec.feeding)) {
        const kind = eatsIn(b.spec, scene)!;
        it(`${cls.taxon.common} (${scene}): ${b.key} says it eats ${kind}`, () => {
          expect(`${b.spec.label}. ${b.spec.cue}`).toMatch(WORDS[kind]);
        });
      }
    }
  }

  it('shows every food without a bird going after it, or has it peek', () => {
    // A canvas that only counts what gets drawn.
    let marks = 0;
    const ctx = new Proxy({}, {
      get: (_, key) => (['fill', 'stroke', 'fillRect'].includes(key as string) ? () => marks++ : typeof key === 'string' && /^[a-z]/.test(key) && !['fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'globalAlpha'].includes(key) ? () => {} : undefined),
      set: () => true,
    }) as unknown as CanvasRenderingContext2D;
    for (const id of Object.keys(HABITATS) as HabitatId[]) {
      for (const kind of Object.keys(FOOD_SITES[id]) as FoodKind[]) {
        const world = new World(HABITATS[id]);
        world.food = [];
        world.stock([kind]);
        world.food = world.food.filter((f) => f.kind === kind);
        marks = 0;
        drawFoodBack(ctx, world);
        const shown = marks > 0 || (kind === 'nectar' && HABITATS[id].perches.some((q) => q.kind === 'flower')) || (kind === 'grass' && HABITATS[id].ground === 'grass');
        expect(shown || (!!FOODS[kind].hidden && !!PEEKS[kind]), `${kind} in the ${id}`).toBe(true);
      }
    }
  });

  it('puts back what a bird took once its behavior is over', () => {
    const world = new World(HABITATS.yard);
    const berries = world.food.find((f) => f.kind === 'berries')!;
    const left = () => berries.units.filter((u) => !u.gone).length;
    const all = left();
    world.eat('berries', { x: 50, y: 6 });
    expect(left()).toBe(all - 1);
    for (let t = 0; t <= 120; t += 0.5) world.step(0.5);
    expect(left(), 'nothing grows back by itself').toBe(all - 1);
    world.restore();
    expect(left()).toBe(all);
  });

  it('ends a peek of another animal when feeding starts, and starts none until it is done', () => {
    const flicker = make(NorthernFlicker, 'yard');
    const world = flicker.world;
    world.peek = { kind: 'worms', x: 30, y: 0, t: 0.5, seconds: 2 };
    flicker.perform('forage');
    expect(world.peek).toBeNull();
    for (let t = 0; t < 40 && flicker.current; t += 0.25) {
      flicker.update(0.25);
      world.step(0.25);
      expect(world.peek, 'no new peek while it feeds').toBeNull();
    }
  });

  // An animal of the kind a bird eats that is showing when it starts to feed holds still where it is. Either the bird
  // goes for it and takes it, the animal never jumping or vanishing on the way, or the bird goes for another and it
  // hides as that one shows. A check of only the first frame let birds pick a new target a moment later.
  const seedOf = (s: string) => ([...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 2147483646, 7) || 1);
  for (const cls of SPECIES) {
    for (const scene of (Object.keys(HABITATS) as HabitatId[]).filter((h) => inScene(cls, h))) {
      for (const b of behaviorsOf(cls).filter((b) => b.spec.feeding && FOODS[eatsIn(b.spec, scene)!]?.hidden)) {
        const kind = eatsIn(b.spec, scene)!;
        it(`${cls.taxon.common} (${scene}): ${b.key} goes for the ${kind} that showed, or lets it hide`, () =>
          seeded(seedOf(`${cls.taxon.common}${scene}${b.key}`), () => {
            for (let run = 0; run < 3; run++) {
              const bird = make(cls, scene);
              if (bird.missing(b.key)) return;
              const world = bird.world;
              bird.update(1 / 60);
              const f = world.food.find((f) => f.kind === kind)!;
              const u = f.units[Math.floor(Math.random() * f.units.length)];
              world.peek = { kind, x: u ? u.x : f.site.x[0] + Math.random() * (f.site.x[1] - f.site.x[0]), y: u ? u.y : f.site.y, t: 0.3 + Math.random() * 1.4, seconds: 2 };
              const spot = peekSpot(world.peek, world.habitat);
              let taken = false;
              const eat = world.eat.bind(world);
              world.eat = (k, w) => ((taken = true), eat(k, w));
              bird.perform(b.key);
              let picked = false;
              let last = world.prey && { ...world.prey };
              for (let frames = 0; frames < 60 * 60 && !taken && bird.current; frames++) {
                world.step(1 / 60);
                bird.update(1 / 60);
                if (taken || !bird.current) break;
                const q = world.prey;
                if (!picked && !q) expect(world.peek, 'the animal that showed vanishes before the bird picks one').not.toBeNull();
                if (!picked && q) {
                  picked = Math.hypot(q.x - spot.x, q.y - spot.y) < 2;
                  if (!picked) {
                    expect(world.peek, 'goes for another while the one that showed stays out').toBeNull();
                    break;
                  }
                }
                if (picked) {
                  expect(q, 'the animal it went for vanishes before it is taken').not.toBeNull();
                  if (q && last) expect(Math.hypot(q.x - last.x, q.y - last.y), 'the animal it went for jumps somewhere else').toBeLessThan(2);
                }
                last = q && { ...q };
              }
            }
          }));
      }
    }
  }

  // A dabbler tips up over the eelgrass as deep as it can still reach the bottom, so each bite shows its full upend.
  // The bed used to be so shallow that a swan's neck alone reached the bottom anywhere in it, so it never tipped.
  for (const cls of SPECIES.filter((c) => inScene(c, 'beach'))) {
    const probe = make(cls, 'beach') as unknown as { feeding?: string; tipUp?: unknown };
    const forage = behaviorsOf(cls).find((b) => b.key === 'forage');
    if (probe.feeding !== 'dabble' || !probe.tipUp || !forage || eatsIn(forage.spec, 'beach') !== 'eelgrass') continue;
    it(`${cls.taxon.common} upends to the bottom of the eelgrass`, () =>
      seeded(seedOf(`${cls.taxon.common}upend`), () => {
        const bird = make(cls, 'beach');
        const rest = bird.pose.pitch;
        let bites = 0;
        const eat = bird.world.eat.bind(bird.world);
        bird.world.eat = (k, at) => {
          const b = bird.billTip();
          expect(Math.abs(b.y - bird.world.floorY(b.x)), 'takes the weed with its bill off the bottom').toBeLessThan(0.3);
          expect(bird.pose.pitch, 'takes the weed without tipping up').toBeLessThan(rest - 0.3);
          bites++;
          eat(k, at);
        };
        bird.update(1 / 60);
        bird.perform('forage');
        for (let frames = 0; frames < 60 * 60 && bird.current; frames++) {
          bird.world.step(1 / 60);
          bird.update(1 / 60);
        }
        expect(bites).toBeGreaterThan(0);
      }));
  }

  // Each diver works its own depth: down to at least half its limit where the food goes that deep, and no deeper than
  // the limit. With the mussels only in the shallows, a Long-tailed Duck's deep dive went no deeper than a Bufflehead's.
  for (const cls of SPECIES.filter((c) => inScene(c, 'beach'))) {
    const feeding = behaviorsOf(cls).filter((b) => b.spec.feeding);
    if (!make(cls, 'beach').ecology.swims || !feeding.length) continue;
    it(`${cls.taxon.common} dives to its own depth`, () =>
      seeded(seedOf(`${cls.taxon.common}depth`), () => {
        for (const b of feeding) {
          const bird = make(cls, 'beach');
          if (bird.missing(b.key)) continue;
          const limit = (bird as unknown as { diveDepth: number }).diveDepth;
          bird.update(1 / 60);
          bird.perform(b.key);
          let deepest = 0;
          for (let frames = 0; frames < 60 * 60 && bird.current; frames++) {
            bird.world.step(1 / 60);
            bird.update(1 / 60);
            if (bird.submerged) deepest = Math.max(deepest, -bird.billTip().y);
          }
          const site = bird.world.site(eatsIn(b.spec, 'beach')!);
          if (!deepest || !site) continue;
          // How deep the food goes: the bottom at the outer edge of a bed, or the bottom of a school.
          const food = site.onBottom ? -bird.world.floorY(Math.min(site.x[1], 96)) : -(site.y - (site.spread ?? 0));
          const reach = Math.min(limit / 2, food, -bird.world.floorY(Math.min(site.x[1], 96)) - 0.6);
          expect(deepest, `${b.key}: dives only ${deepest.toFixed(1)} deep, short of its usual ${reach.toFixed(1)}`).toBeGreaterThan(reach - 1);
          expect(deepest, `${b.key}: dives ${deepest.toFixed(1)} deep, past its limit of ${limit}`).toBeLessThan(limit + 1.5);
        }
      }));
  }

  // The animal a bird hunts moves like an animal while it is drawn: it shows, swims or hops, and hides, but never
  // jumps across the scene. The snorkeling mergansers showed a new fish 10 apart at each stop, and a fish deeper than
  // the bill reached jumped up to it. Checked from the start of the behavior, not only once the bird has picked one.
  for (const cls of SPECIES) {
    for (const scene of (Object.keys(HABITATS) as HabitatId[]).filter((h) => inScene(cls, h))) {
      for (const b of behaviorsOf(cls).filter((b) => b.spec.feeding && FOODS[eatsIn(b.spec, scene)!]?.hidden)) {
        it(`${cls.taxon.common} (${scene}): the animal ${b.key} hunts never jumps while drawn`, () =>
          seeded(seedOf(`${cls.taxon.common}${scene}${b.key}moves`), () => {
            for (let run = 0; run < 3; run++) {
              const bird = make(cls, scene);
              if (bird.missing(b.key)) return;
              bird.update(1 / 60);
              bird.perform(b.key);
              let last = bird.world.prey && { ...bird.world.prey };
              for (let frames = 0; frames < 60 * 60 && bird.current; frames++) {
                bird.world.step(1 / 60);
                bird.update(1 / 60);
                const q = bird.world.prey;
                if (q && last) expect(Math.hypot(q.x - last.x, q.y - last.y), `${(frames / 60).toFixed(2)}s: jumps from ${last.x.toFixed(1)},${last.y.toFixed(1)} to ${q.x.toFixed(1)},${q.y.toFixed(1)}`).toBeLessThan(1);
                last = q && { ...q };
              }
            }
          }));
      }
    }
  }

  // Under water a bird swims the way it faces. The dive helper put the body a bill's reach short of food that was
  // closer than that, so the bird rolled forward and then swam backward to it.
  for (const cls of SPECIES.filter((c) => inScene(c, 'beach'))) {
    const feeding = behaviorsOf(cls).filter((b) => b.spec.feeding);
    if (!make(cls, 'beach').ecology.swims || !feeding.length) continue;
    it(`${cls.taxon.common} swims forward under water`, () =>
      seeded(seedOf(cls.taxon.common), () => {
        for (const b of feeding) {
          for (let run = 0; run < 2; run++) {
            const bird = make(cls, 'beach');
            if (bird.missing(b.key)) break;
            bird.update(1 / 60);
            bird.perform(b.key);
            let back = 0;
            for (let frames = 0; frames < 60 * 60 && bird.current; frames++) {
              const x0 = bird.pos.x;
              const was = bird.submerged;
              bird.world.step(1 / 60);
              bird.update(1 / 60);
              if (was && bird.submerged) back += Math.max(0, -(bird.pos.x - x0) * bird.pose.facing);
              if (!bird.submerged) {
                expect(back, `${b.key}: swims ${back.toFixed(1)} backward on one dive`).toBeLessThan(0.3);
                back = 0;
              }
            }
          }
        }
      }));
  }

  // Two feeding behaviors of one bird that move it exactly alike, given the same luck, are one action listed twice.
  // The geese's Feed and Graze both ran grazeOnLand by different routes, which the alias check above can't see.
  for (const cls of SPECIES) {
    for (const scene of (Object.keys(HABITATS) as HabitatId[]).filter((h) => inScene(cls, h))) {
      // One bird alone; a flock behavior only ever runs in a flock, where it is the flock's action.
      const feeding = behaviorsOf(cls).filter((b) => b.spec.feeding && !b.spec.flock);
      if (feeding.length < 2) continue;
      it(`${cls.taxon.common} (${scene}) has no two feeding behaviors that are the same action`, () => {
        const trace = (key: string) =>
          seeded(12345, () => {
            const bird = make(cls, scene);
            if (bird.missing(key)) return key;
            bird.update(1 / 60);
            bird.perform(key);
            const out: string[] = [];
            for (let frames = 0; frames < 60 * 90 && bird.current; frames++) {
              bird.world.step(1 / 60);
              bird.update(1 / 60);
              if (frames % 6 === 0) out.push(`${bird.pos.x.toFixed(2)},${bird.pos.y.toFixed(2)},${bird.pose.pitch.toFixed(2)},${bird.pose.neck.toFixed(2)}`);
            }
            return out.join(' ');
          });
        const seen = new Map<string, string>();
        for (const b of feeding) {
          const t = trace(b.key);
          expect(seen.get(t), `${b.key} does exactly what ${seen.get(t)} does`).toBeUndefined();
          seen.set(t, b.key);
        }
      });
    }
  }

  it('Red-breasted Sapsucker licks the wells on the side of the trunk it drilled', () =>
    seeded(99, () => {
      for (let run = 0; run < 12; run++) {
        const bird = make(RedBreastedSapsucker, 'yard');
        // Start on either side of the oak, so it drills on either side.
        bird.pos = { x: run % 2 ? 70 : 99, y: 20 };
        const chips: number[] = [];
        const licks: number[] = [];
        const burst = bird.world.burst.bind(bird.world);
        bird.world.burst = (kind, x, y, n, dir) => (kind === 'chip' && chips.push(x), burst(kind, x, y, n, dir));
        const eat = bird.world.eat.bind(bird.world);
        bird.world.eat = (k, at) => (licks.push(at.x), eat(k, at));
        bird.update(1 / 60);
        bird.perform('forage');
        for (let frames = 0; frames < 60 * 60 && bird.current; frames++) {
          bird.world.step(1 / 60);
          bird.update(1 / 60);
        }
        const trunk = 86;
        expect(chips.length).toBeGreaterThan(0);
        expect(licks.length).toBeGreaterThan(0);
        const side = Math.sign(chips[0] - trunk);
        for (const x of [...chips, ...licks]) expect(Math.sign(x - trunk), 'drills one side and licks the other').toBe(side);
      }
    }));
});
