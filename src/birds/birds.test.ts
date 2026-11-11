import { describe, expect, it } from 'vitest';
import { behaviorsOf, buildTree, lineage, traitSources, type BirdClass } from './core/reflect';
import { HABITATS, World } from './core/World';
import { SPECIES } from './taxonomy';
import { Galliformes, Chicken, CaliforniaQuail } from './taxonomy/galliformes';
import { AnnasHummingbird, Trochilidae } from './taxonomy/apodiformes';
import { Colaptes, NorthernFlicker, Picidae } from './taxonomy/piciformes';
import { BeltedKingfisher } from './taxonomy/waterside';

const names = (classes: BirdClass[]) => classes.map((c) => c.taxon.name);
const make = (cls: (typeof SPECIES)[number]) => {
  const proto = Object.assign({}, ...lineage(cls).map((c) => (Object.hasOwn(c, 'ecology') ? c.ecology : {})));
  return new cls(new World(HABITATS[proto.habitat as 'yard' | 'beach']));
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

  it('rebuilds one tree from the species list', () => {
    const root = buildTree(SPECIES);
    expect(root.cls.taxon.name).toBe('Aves');
    expect(root.children.length).toBe(8);
  });
});

describe('simulation', () => {
  // Every behavior of every species must run to completion and keep the bird on stage.
  for (const cls of SPECIES) {
    for (const { key } of behaviorsOf(cls)) {
      it(`${cls.taxon.common}: ${key}`, () => {
        const bird = make(cls);
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
