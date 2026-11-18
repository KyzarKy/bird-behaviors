import { resolveTraits, type BirdClass, type SpeciesClass } from '../birds/core/reflect';
import type { Ecology, HabitatId } from '../birds/core/traits';
import { SPECIES } from '../birds/taxonomy';

/** The month the page was opened in, 0 for January. */
export const THIS_MONTH = new Date().getMonth();
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Indexed by presence level, 0..3. */
export const PRESENCE = ['Away', 'Scarce', 'Regular', 'Hard to miss'];

/** The twelve monthly presence levels of a species. One without data counts as regular all year. */
export const presenceOf = (cls: BirdClass): readonly number[] => resolveTraits<Ecology>(cls, 'ecology').presence ?? Array(12).fill(2);

/** The most a species is ever seen in a scene: 3 in its own habitat, 0 where it never goes. */
const capIn = (cls: BirdClass, scene: HabitatId) => {
  const e = resolveTraits<Ecology>(cls, 'ecology');
  return e.habitat === scene ? 3 : (e.scenes?.[scene] ?? 0);
};

export const inScene = (cls: BirdClass, scene: HabitatId) => capIn(cls, scene) > 0;

/** How easy a species is to find in a scene this month: its presence in the area, capped by how much it uses the scene. */
export const levelIn = (cls: BirdClass, scene: HabitatId, month = THIS_MONTH) => Math.min(capIn(cls, scene), presenceOf(cls)[month]);

/** A scene's species grouped by this month's level, likeliest first, empty groups left out. */
export const groupsIn = (scene: HabitatId) =>
  [3, 2, 1, 0]
    .map((level) => ({ level, species: SPECIES.filter((s) => inScene(s, scene) && levelIn(s, scene) === level) }))
    .filter((g) => g.species.length > 0);

/** The bird to show when switching to a scene the current one never visits. */
export const likeliestIn = (scene: HabitatId): SpeciesClass => groupsIn(scene)[0].species[0];
