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
- **Birds go to the food.** While a feeding behavior runs, `toGround`, `findPerch`, `findTrunk` and `waterSpot` pick a spot at that food when it has one there, so a sapsucker goes to the oak with the sap wells and a duck flying in lands by the eelgrass. On foot or afloat, `foodSpot(range)` picks the next step: a point where the bill, not the body, comes down on the food, approached so the bird faces it. How far ahead of the feet the bill comes down is measured on the bird's own drawing (`groundReach`). `huntSpot` and `preySpot` do the same for hunts from the air: over the voles, into the swarm, at a fish in the school. A bird that doesn't swim wades no deeper than most of the way up its legs (`wadeMax`).
- **The bill is where the drawing puts it.** `Bird.frame` holds the body's proportions and where the head is this frame; `drawBird` draws from the same numbers, so `billTip()` and `headPoint()` are exact. `peck()` brings the bill down to the food, the ground or the bottom and stops there (`reachDown`): a long-legged bird crouches and tips further, a swan's neck reaches the bottom of the shallows and no further.
- **Every feeding behavior ends with the bird eating.** `take()` is the one place a bird eats: it removes the nearest piece of the food from the scene and puts that food's item in the bill (or, for hawks, falcons and owls, the feet). `peck()` calls it when the bill is on the food, and `strikeAt()` is the catch at the end of a pounce, sally, stoop or dash. Plunge-divers use `plungeAt()`. Divers go under with `diveUnder()`: they swim down to the fish or the mussel, take it there, and come up with it. What a food leaves in the bill is set once in `FOODS`: a berry, a crab from the wet sand, a mussel from the bed, a fish, a grasshopper. Nectar, sap, plankton and carrion leave nothing to show. A tern may miss a plunge or two, but the last one catches.
- **The animal a bird hunts is drawn until it is caught.** Small animals keep out of sight, so while a bird goes after one, that one is drawn where it is (`world.prey`, set by `aimAt`): the worm the robin pulls, the grasshopper the pipit snaps up, the fish the merganser chases underwater, the small bird the Merlin singles out. A bird that finds one where it stands (a caterpillar under a leaf, a grub in the bark, a crab in the sand) shows it at the bill for a moment before it takes it (`glimpse`). The drawings are the `PREY` table in `src/render/drawFood.ts`.
- **Everyone in the story is on stage.** A behavior that involves another bird brings it in: a jaeger or a Heermann's Gull robs a tern (`robInFlight`), which comes in with a fish, is chased through every twist, drops the fish and flies off empty. A goose grazes with a few others of its kind, one standing watch, House Sparrows feed in a little group, and a waxwing hands its berry to a neighbor (`company`). Other birds are in `world.others`, are drawn with the bird, take none of the food, and leave when the behavior ends.
- **Divers swallow each catch.** A fish or mussel is shown at the surface for a moment, then swallowed, and never carried down into the next dive.
- **Hunters watch from near the food.** A bird that hunts from a perch picks the perch nearest the food, and harriers, barn owls and vultures search in low passes back and forth over it (`quarterOver`).
- **A hunter startles its prey.** `strikeAt` calls `world.startle` as the hunter comes in: the flock of small birds bursts out of the bush, and drifts back in once the hunt is over.
- **Food comes back when the behavior ends.** A piece a bird takes is gone while it eats, and everything is back as it was once the behavior is over (`world.restore`). Nothing runs down or regrows on a timer.
- **Peeks are for animals that keep out of sight.** Now and then one of them shows itself for two seconds: a worm stretches out of the lawn, a grasshopper hops, a beetle runs out of the leaves, a vole runs between grass clumps, minnows dart through the shallows, baitfish flash at the surface. Plants, the swarm and the flock are always in view, so they don't peek. Which foods are hidden is set in `FOODS`; the peek drawings are a table in `src/render/drawFood.ts`, and a test checks the two match. The first peek comes within 10 seconds of a bird arriving, then one every 10 to 15 seconds; with more than one hidden animal they take turns. Small animals are drawn about twice life size so they can be seen.
- **Carrion is never drawn as an animal.** It is a dull mound behind a grass tussock in the yard, or inside a heap of kelp on the beach, and it never peeks. A small bird caught by a hawk is only a dark bundle in the feet.

Tests hold every feeding behavior of every bird, in every scene it visits, to these rules:

- It names a food, the scene has that food, and the food shows without the bird doing anything (drawn, or a hidden animal that peeks).
- The label or the description says what the food is.
- The bird takes its food at least once, only where that food is, with its bill or feet at the spot, and holds the right item. A piece it takes is gone from the scene.
- From the first bite to the last it stays at the food. Insects caught on sallies from a perch are the exception.
- No bird ever puts its head into the ground or the seabed, and a bird that doesn't swim never wades over its legs. These two hold for every behavior, not only feeding.
- An animal that keeps out of sight is drawn where the bird takes it.
- A diver never goes under still holding its last catch.
- A robber shows the bird it robs, and a description of a flock or a neighbor shows them.

A species with a second, genuinely different way to feed lists that method too. The Rough-legged Hawk forages by hovering and still has the perch hunt of its genus; the Yellow-rumped Warbler flycatches and still gleans.

## Auto mode

Left to itself, a bird draws its next behavior by `weight` (default 1) from everything the scene allows, never the same one twice running. Feeding is 6 and calls are 3, on `Bird`, so those are what you see most; `fly` and `preen` are 2, and displays and songs keep 1. A bird runs about 6–8 behaviors a minute, so a test holds every behavior to at least 1/20 of the total for every species in every scene it visits: everything a bird can do comes up every 2–3 minutes.
