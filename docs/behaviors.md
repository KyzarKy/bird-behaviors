# Behaviors

A behavior is a public generator method on the class where the behavior arises. Each `yield` is one animation frame.

```ts
// Turdus: the lawn thrushes
*wormHunt(): Script {
  yield* this.toGround(10);
  yield* this.moveOnGround(...);              // run a few steps
  yield* this.poseTo({ pitch: 0.55 }, 0.08);  // stop and stand tall
  yield* this.poseTo({ head: -0.6 }, 0.15);   // cock the head
  yield* this.peck(1, 1.1);                   // stab
}
```

Generators let a sequence that plays out over several seconds read top to bottom, with no state machine and no callbacks. Public generators are what a user can trigger. Protected ones on `Bird` (`flyTo`, `hoverFor`, `moveOnGround`, `peck`, `poseTo`) are the building blocks.

## Where each one lives

| Behavior | Class | Why there |
| --- | --- | --- |
| `fly`, `forage`, `preen`, `call` | `Bird` | Every bird |
| `dustBathe`, `flush`, and `forage` as scratching | `Galliformes` | All landfowl |
| `sing` | `Passeriformes` | Song needs the songbird voice box |
| `forage` as a sally | `Tyrannidae` | The flycatcher hunting method |
| `cache` | `Corvidae` | Crows and jays hide food |
| `drum`, and `forage` as hitching up a trunk | `Picidae` | Woodpeckers |
| `roost` | `Gallus` | Junglefowl fly up to sleep |
| `mimicHawk` | `StellersJay` | One species' trick |

## Three ways a subclass changes a behavior

1. **Override the method.** `Chicken.flush()` replaces the burst-and-glide with a flapping run.
2. **Override a value the method reads.** `Tyrannidae.sally()` reads `sallyRange` and `returnChance`. `Contopus` raises both, so the Olive-sided Flycatcher makes long sallies and comes back to the same treetop.
3. **Override a hook the base class calls.** `Bird.flyTo()` calls `adjustFlightPose()` every airborne frame. `Ardeidae` uses it to fold the heron's neck into an S.

The smallest one that works is the right one. A changed number is easier to read and test than a rewritten method.

## Declaring a behavior

Each class lists its behaviors in a static table with a label and a field note. The table's type is derived from the class's own methods:

```ts
type BehaviorTable<T> = {
  [K in keyof T as T[K] extends () => Script ? K : never]?: BehaviorSpec;
};
```

So an entry for a method that was renamed or removed fails to compile.

## Feeding is `forage`

Every bird has one feeding behavior, `forage`. A class that feeds its own way overrides `forage()` to call a named method and relabels `forage` in its own table:

```ts
static override behaviors = {
  forage: { label: 'Pass a berry', cue: '…' },
};

override forage(): Script {
  return this.berryPass();
}
```

`berryPass` stays a public method but leaves the table, so the action is listed once and auto mode's `forage` weight covers it. A relabel keeps the weight of the entry it replaces unless it sets its own; `needs` is not carried down, since a relabel is often a different way of doing it. A test fails if a listed behavior's whole body returns another listed behavior.

Field notes tag every feeding behavior "Feeding", since labels such as "Toss the leaf litter" don't say so. `forage` sets `feeding: true` once in `Bird` and a relabel keeps it; any other behavior about finding, catching, handling or eating food sets it itself.

## Food in the scene

Each feeding behavior names what it eats with `eats`, either one food (`eats: 'berries'`) or one per scene (`eats: { yard: 'worms', beach: 'sandCritters' }`). A relabel keeps the food of the entry it replaces unless it sets its own. Foods and where they sit in each scene are in `src/birds/core/food.ts`.

- **The scene shows only what its bird eats.** When a bird is made, it stocks its `World` with the foods of every behavior it can do there, plus the scene's fixed extras (berries on the yard shrub, a wrack line on the beach). Nothing else is drawn, so the scene stays uncluttered.
- **Birds go to the food.** While a feeding behavior runs, `toGround`, `findPerch`, `findTrunk` and `waterSpot` pick a spot at that food when it has one there, so a sapsucker goes to the oak with the sap wells and a duck flying in lands by the eelgrass. Hunts in the air, such as hawking insects, start from wherever the bird is.
- **Food runs down and grows back.** When a feeding behavior ends, the bird has eaten a piece or two of what it was after (berries, acorns, cones, seed heads, fallen seed, clams, mussels). Each piece grows back over a minute. It is only for show: a scene never runs out.
- **Peeks.** Now and then one food shows itself for two seconds: a worm stretches out of the lawn, a vole runs between grass clumps, a berry drops, baitfish flash at the surface. The first comes within 10 seconds of a bird arriving, then one to three a minute. A food a bird just fed on keeps out of sight for a while. Small animals are drawn about twice life size so they can be seen.
- **Carrion is never drawn as an animal.** It is a dull mound behind a grass tussock in the yard, or inside a heap of kelp on the beach, and it never peeks.

A test fails if a feeding behavior names no food, or if a scene a bird visits lacks one of its foods.

A species with a second, genuinely different way to feed lists that method too. The Rough-legged Hawk forages by hovering and still has the perch hunt of its genus; the Yellow-rumped Warbler flycatches and still gleans.

## Auto mode

Left to itself, a bird draws its next behavior by `weight` (default 1) from everything the scene allows, never the same one twice running. Feeding is 6 and calls are 3, on `Bird`, so those are what you see most; `fly` and `preen` are 2, and displays and songs keep 1. A bird runs about 6–8 behaviors a minute, so a test holds every behavior to at least 1/20 of the total for every species in every scene it visits: everything a bird can do comes up every 2–3 minutes.
