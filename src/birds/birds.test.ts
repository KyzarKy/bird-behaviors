import { describe, expect, it } from 'vitest';
import { drawnFlapRate } from './core/Bird';
import { behaviorsOf, buildTree, lineage, traitSources, type BirdClass } from './core/reflect';
import { HABITATS, World } from './core/World';
import type { HabitatId } from './core/traits';
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
    const scratch = behaviorsOf(Chicken).find((b) => b.key === 'scratch')!;
    expect(scratch.declaredIn).toBe(Galliformes);
    expect(behaviorsOf(CaliforniaQuail).some((b) => b.key === 'scratch')).toBe(true);
    expect(behaviorsOf(AnnasHummingbird).some((b) => b.key === 'scratch')).toBe(false);

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
