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
| `scratch`, `dustBathe`, `flush` | `Galliformes` | All landfowl |
| `sing` | `Passeriformes` | Song needs the songbird voice box |
| `sally` | `Tyrannidae` | The flycatcher hunting method |
| `cache` | `Corvidae` | Crows and jays hide food |
| `drum`, `hitchUp` | `Picidae` | Woodpeckers |
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
