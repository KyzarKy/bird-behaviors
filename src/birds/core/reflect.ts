/**
 * Introspection over the real class hierarchy.
 *
 * Nothing here is a hand-maintained description of the taxonomy. Trait values
 * are resolved by walking the constructor chain, and "where is this behavior
 * implemented" is answered by asking each prototype whether it owns the
 * method. The hierarchy explorer in the UI is drawn entirely from this file.
 */
import type { Bird } from './Bird';
import type { BehaviorSpec, TaxonStatics } from './traits';
import type { World } from './World';

/** Any class in the hierarchy, abstract or concrete. */
export type BirdClass = (abstract new (world: World) => Bird) & TaxonStatics;
/** A leaf class that can be instantiated. */
export type SpeciesClass = (new (world: World) => Bird) & TaxonStatics;

export type TraitKey = 'flight' | 'ecology' | 'look';

/** Bird first, the class itself last. */
export function lineage(cls: BirdClass): BirdClass[] {
  const chain: BirdClass[] = [];
  for (let c: unknown = cls; typeof c === 'function' && c !== Function.prototype; c = Object.getPrototypeOf(c)) {
    chain.unshift(c as BirdClass);
  }
  return chain;
}

/** The table a class declares itself, ignoring anything inherited. */
export function own<K extends TraitKey | 'behaviors'>(cls: BirdClass, key: K): Partial<TaxonStatics[K]> {
  return Object.hasOwn(cls, key) ? cls[key] : {};
}

/** Merge a trait table down the lineage; more specific classes win. */
export function resolveTraits<T>(cls: BirdClass, key: TraitKey): T {
  return Object.assign({}, ...lineage(cls).map((c) => own(c, key))) as T;
}

export interface TraitSource {
  field: string;
  value: unknown;
  /** The most specific class that sets this field. */
  from: BirdClass;
  /** The value it replaced, if an ancestor also set it. */
  replaced?: { value: unknown; from: BirdClass };
}

/** Every resolved field of a trait table, with the class that had the last word. */
export function traitSources(cls: BirdClass, key: TraitKey): TraitSource[] {
  const out = new Map<string, TraitSource>();
  for (const c of lineage(cls)) {
    for (const [field, value] of Object.entries(own(c, key))) {
      const prev = out.get(field);
      out.set(field, { field, value, from: c, replaced: prev && { value: prev.value, from: prev.from } });
    }
  }
  return [...out.values()];
}

export interface BehaviorInfo {
  /** Method name on the instance. */
  key: string;
  spec: BehaviorSpec;
  /** The class that introduced the behavior. */
  declaredIn: BirdClass;
  /** The most specific class whose prototype implements it. */
  implementedIn: BirdClass;
  /** Classes below `declaredIn` that override the method. */
  overriddenIn: BirdClass[];
}

/** Every behavior available to a class, most general first. */
export function behaviorsOf(cls: BirdClass): BehaviorInfo[] {
  const chain = lineage(cls);
  const out = new Map<string, BehaviorInfo>();
  for (const c of chain) {
    for (const [key, spec] of Object.entries(own(c, 'behaviors') as Record<string, BehaviorSpec>)) {
      const known = out.get(key);
      if (known) known.spec = spec;
      else out.set(key, { key, spec, declaredIn: c, implementedIn: c, overriddenIn: [] });
    }
    for (const info of out.values()) {
      if (c !== info.declaredIn && Object.hasOwn(c.prototype, info.key)) {
        info.implementedIn = c;
        info.overriddenIn.push(c);
      }
    }
  }
  return [...out.values()];
}

/** Behaviors a class introduces or overrides itself. */
export function ownBehaviors(cls: BirdClass): BehaviorInfo[] {
  return behaviorsOf(cls).filter((b) => b.declaredIn === cls || b.overriddenIn.includes(cls));
}

export interface TreeNode {
  cls: BirdClass;
  children: TreeNode[];
}

/** Rebuild the taxonomy tree from nothing but the list of species classes. */
export function buildTree(species: readonly BirdClass[]): TreeNode {
  const nodes = new Map<BirdClass, TreeNode>();
  let root: TreeNode | undefined;
  for (const s of species) {
    let parent: TreeNode | undefined;
    for (const c of lineage(s)) {
      let node = nodes.get(c);
      if (!node) {
        node = { cls: c, children: [] };
        nodes.set(c, node);
        if (parent) parent.children.push(node);
        else root = node;
      }
      parent = node;
    }
  }
  if (!root) throw new Error('buildTree needs at least one species');
  return root;
}
