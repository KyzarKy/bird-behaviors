import { describe, expect, it } from 'vitest';
import { drawnFlapRate } from './core/Bird';
import { behaviorsOf, buildTree, lineage, resolveTraits, traitSources, type BirdClass } from './core/reflect';
import { DEEP, HABITATS, World } from './core/World';
import { EXTRAS, FOOD_SITES, FOODS, eatsIn, type FoodKind } from './core/food';
import { drawFoodBack, PEEKS, PREY } from '../render/drawFood';
import type { Ecology, HabitatId } from './core/traits';
import { inScene } from '../ui/season';
import { SPECIES } from './taxonomy';
import { Galliformes, Chicken, CaliforniaQuail } from './taxonomy/galliformes';
import { AnnasHummingbird, Trochilidae } from './taxonomy/apodiformes';
import { Colaptes, NorthernFlicker, Picidae } from './taxonomy/piciformes';
import { BaldEagle, BeltedKingfisher } from './taxonomy/waterside';

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

describe('everyone in the story', () => {
  // A behavior whose description names another bird shows that bird.
  const robbers: [BirdClass, string][] = [
    [SPECIES.find((c) => c.taxon.common === 'Parasitic Jaeger')!, 'forage'],
    [SPECIES.find((c) => c.taxon.common === 'Heermann’s Gull')!, 'pirate'],
  ];
  for (const [cls, key] of robbers) {
    it(`${cls.taxon.common}: ${key} shows the bird it robs`, () => {
      const bird = make(cls as (typeof SPECIES)[number], 'beach');
      bird.update(1 / 60);
      bird.perform(key);
      let seen = false;
      for (let frames = 0; bird.current !== null && frames < 60 * 90; frames++) {
        bird.world.step(1 / 60);
        bird.update(1 / 60);
        seen ||= bird.world.others.length > 0;
      }
      expect(seen).toBe(true);
      expect(bird.world.others).toEqual([]);
    });
  }

  // A description that says the bird feeds in a group, or hands food to a neighbor, shows the others.
  const groups: [string, HabitatId, string][] = [
    ['House Sparrow', 'yard', 'forage'],
    ['Cedar Waxwing', 'yard', 'forage'],
  ];
  for (const [name, scene, key] of groups) {
    it(`${name} (${scene}): ${key} shows the others of its kind`, () => {
      const cls = SPECIES.find((c) => c.taxon.common === name)!;
      const bird = make(cls, scene);
      bird.update(1 / 60);
      bird.perform(key);
      let most = 0;
      for (let frames = 0; bird.current !== null && frames < 60 * 90; frames++) {
        bird.world.step(1 / 60);
        bird.update(1 / 60);
        if (bird.world.others.every((o) => o.constructor === cls)) most = Math.max(most, bird.world.others.length);
      }
      expect(most).toBeGreaterThan(0);
      expect(bird.world.others).toEqual([]);
    });
  }
});

describe('regressions', () => {
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
        expect(bird.pos.x >= 0 && bird.pos.x <= 100 && bird.pos.y > -DEEP - 1 && bird.pos.y < 54).toBe(true);
      }
      expect(seen.size).toBeGreaterThan(1);
    });
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
            for (let frames = 0; bird.current !== null && frames < 60 * 90; frames++) {
              bird.world.step(1 / 60);
              bird.update(1 / 60);
              held ||= bird.pose.carry === FOODS[kind].item;
              track.push(bird.billTip().x);
              // A diver swallows each catch before it goes under for the next.
              if (bird.submerged && !under) expect(bird.pose.carry, 'dives again still holding its last catch').toBeNull();
              under = bird.submerged;
            }
            expect(at.length, 'never takes any').toBeGreaterThan(0);
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
});
