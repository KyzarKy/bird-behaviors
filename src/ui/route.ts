/**
 * Hash routing, so every species and every class has a link that can be shared:
 *   #/field/gallus-gallus-domesticus   the chicken in its own habitat
 *   #/field/corvus-corax/beach        the raven on the beach
 *   #/class/galliformes                the Galliformes class in the explorer
 */
import { useMemo, useSyncExternalStore } from 'react';
import { buildTree, lineage, resolveTraits, type BirdClass, type SpeciesClass, type TreeNode } from '../birds/core/reflect';
import type { Ecology, HabitatId } from '../birds/core/traits';
import { HABITATS } from '../birds/core/World';
import { SPECIES } from '../birds/taxonomy';
import { inScene } from './season';

export const TREE = buildTree(SPECIES);

export type Route = { view: 'field'; species: SpeciesClass; scene: HabitatId } | { view: 'class'; cls: BirdClass };

const slug = (cls: BirdClass) => cls.taxon.name.toLowerCase().replace(/[^a-z]+/g, '-');
const home = (species: BirdClass) => resolveTraits<Ecology>(species, 'ecology').habitat;
/** The scene is left out of the link when it is the bird's own habitat. */
export const fieldHref = (species: BirdClass, scene: HabitatId = home(species)) => `#/field/${slug(species)}${scene === home(species) ? '' : `/${scene}`}`;
export const classHref = (cls: BirdClass) => `#/class/${slug(cls)}`;

/** Every class with its depth in the tree, in display order. */
export const CLASSES: { cls: BirdClass; depth: number }[] = [];
const BY_SLUG = new Map<string, BirdClass>();
(function walk(node: TreeNode, depth: number) {
  CLASSES.push({ cls: node.cls, depth });
  BY_SLUG.set(slug(node.cls), node.cls);
  for (const child of node.children) walk(child, depth + 1);
})(TREE, 0);

const isSpecies = (cls: BirdClass): cls is SpeciesClass => SPECIES.includes(cls as SpeciesClass);

/** The species to show for a class: itself, or the first species below it. */
export const speciesFor = (cls: BirdClass) => (isSpecies(cls) ? cls : SPECIES.find((s) => lineage(s).includes(cls))!);

function parse(hash: string): Route {
  const [, view, id, sceneId] = hash.split('/');
  const cls = BY_SLUG.get(id);
  if (view === 'class' && cls) return { view, cls };
  const species = cls && isSpecies(cls) ? cls : SPECIES[0];
  const scene = sceneId in HABITATS && inScene(species, sceneId as HabitatId) ? (sceneId as HabitatId) : home(species);
  return { view: 'field', species, scene };
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return useMemo(() => parse(hash), [hash]);
}
