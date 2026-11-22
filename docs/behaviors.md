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

A species with a second, genuinely different way to feed lists that method too. The Rough-legged Hawk forages by hovering and still has the perch hunt of its genus; the Yellow-rumped Warbler flycatches and still gleans.
