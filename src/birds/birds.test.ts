import { describe, expect, it } from 'vitest';
import { drawnFlapRate } from './core/Bird';
import { behaviorsOf, buildTree, lineage, resolveTraits, traitSources, type BirdClass } from './core/reflect';
import { HABITATS, World } from './core/World';
import { EXTRAS, FOOD_SITES, REGROW, eatsIn } from './core/food';
import type { Ecology, HabitatId } from './core/traits';
import { inScene } from '../ui/season';
import { SPECIES } from './taxonomy';
import { Galliformes, Chicken, CaliforniaQuail } from './taxonomy/galliformes';
import { AnnasHummingbird, Trochilidae } from './taxonomy/apodiformes';
import { Colaptes, NorthernFlicker, Picidae } from './taxonomy/piciformes';
import { BaldEagle, BeltedKingfisher } from './taxonomy/waterside';
import { TurkeyVulture } from './taxonomy/raptors';
import { RedBreastedSapsucker } from './taxonomy/yardbirds';

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
          expect(bird.pos.y).toBeGreaterThan(-4);
          expect(bird.pos.y).toBeLessThan(54);
          if (++frames > 60 * 90) throw new Error(`${key} did not finish within 90 simulated seconds`);
        }
      });
    }
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
        expect(bird.pos.x >= 0 && bird.pos.x <= 100 && bird.pos.y > -4 && bird.pos.y < 54).toBe(true);
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

  it('peeks within 10 seconds, then one to three times a minute', () => {
    for (let run = 0; run < 20; run++) {
      const world = new World(HABITATS.yard);
      world.stock(['worms', 'voles']);
      let first = -1;
      let peeks = 0;
      for (let t = 0; t < 600; t += 0.1) {
        const before = world.peek;
        world.step(0.1);
        if (world.peek && world.peek !== before) {
          peeks++;
          if (first < 0) first = t;
        }
      }
      expect(first).toBeGreaterThanOrEqual(0);
      expect(first).toBeLessThan(10);
      expect(peeks).toBeGreaterThanOrEqual(10);
      expect(peeks).toBeLessThanOrEqual(30);
    }
  });

  // The bird goes where its food is: the oak with the sap wells, the carrion behind its tussock.
  for (const [cls, scene] of [[RedBreastedSapsucker, 'yard'], [TurkeyVulture, 'yard'], [TurkeyVulture, 'beach']] as const) {
    it(`${cls.taxon.common} (${scene}) feeds at its food`, () => {
      const bird = make(cls, scene);
      const site = bird.world.site(eatsIn(behaviorsOf(cls).find((b) => b.key === 'forage')!.spec, scene))!;
      bird.update(1 / 60);
      bird.perform('forage');
      let closest = Infinity;
      for (let frames = 0; bird.current !== null && frames < 60 * 90; frames++) {
        bird.world.step(1 / 60);
        bird.update(1 / 60);
        closest = Math.min(closest, Math.max(0, site.x[0] - bird.pos.x, bird.pos.x - site.x[1]));
      }
      expect(closest).toBeLessThan(5);
    });
  }

  it('runs down where a bird feeds and grows back', () => {
    const world = new World(HABITATS.yard);
    const berries = world.food.find((f) => f.kind === 'berries')!;
    const whole = () => berries.units.filter((u) => u.left >= 1).length;
    const all = whole();
    world.eat('berries', 50);
    expect(whole()).toBeLessThan(all);
    for (let t = 0; t <= REGROW; t += 0.5) world.step(0.5);
    expect(whole()).toBe(all);
  });
});
