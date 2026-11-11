# Bird Behaviors

A web app for learning to identify birds by what they do. Pick a species, see it in a simplified version of its habitat, and trigger the behaviors it shows in the field: how it flies, how it feeds, how it moves on the ground.

The 17 species are ones you can see from a backyard in Gardiner, Washington or down at Gardiner Beach on Discovery Bay, plus a chicken.

```bash
npm install
npm run dev
```

```bash
npm test
```

## The class hierarchy

Every bird is an instance of a species class that inherits through its real taxonomy, five levels deep:

```
Bird (Aves)
└─ Galliformes            scratch(), dustBathe(), flush()
   ├─ Phasianidae
   │  └─ Gallus           roost()
   │     └─ Chicken       overrides flush()
   └─ Odontophoridae
      └─ Callipepla       sentinel()
         └─ CaliforniaQuail
```

The code is in [src/birds](src/birds):

| File | What it holds |
| --- | --- |
| [core/Bird.ts](src/birds/core/Bird.ts) | The abstract base class: the flight routine, ground movement, pecking, perching, and the four behaviors every bird has. |
| [core/traits.ts](src/birds/core/traits.ts) | The types: `FlightProfile`, `Ecology`, `Look`, `BehaviorTable`. |
| [core/reflect.ts](src/birds/core/reflect.ts) | Runtime introspection of the hierarchy. |
| [core/World.ts](src/birds/core/World.ts) | The two habitats and their perches, trunks, water and particles. |
| [taxonomy/](src/birds/taxonomy) | One file per order, each containing its families, genera and species. |

### Behaviors live at their zoological level

A behavior is a public generator method on the class where the behavior actually arises. `scratch()` is on `Galliformes`, so the chicken and the quail both have it and the hummingbird does not. `sally()` is on `Tyrannidae`. `drum()` is on `Picidae`.

Subclasses change inherited behavior in three ways:

- **Override the method.** `Chicken.flush()` replaces the galliform burst-and-glide with a wing-assisted run. `Colaptes.forage()` sends the flicker to the ground for ants, though it still inherits `hitchUp()` and `drum()` from `Picidae`.
- **Override a knob the method reads.** `Tyrannidae.sally()` reads `sallyRange` and `returnChance`. `Contopus` sets them so the Olive-sided Flycatcher makes long sallies and returns to the same treetop.
- **Override a hook the base class calls.** `Ardeidae.adjustFlightPose()` tucks the neck into an S on every airborne frame.

Behaviors are written as generators so a sequence reads top to bottom:

```ts
*wormHunt(): Script {
  yield* this.toGround(10);
  yield* this.moveOnGround(...);          // run a few steps
  yield* this.poseTo({ pitch: 0.55 }, 0.08); // stop, stand tall
  yield* this.poseTo({ head: -0.6 }, 0.15);  // cock the head
  yield* this.peck(1, 1.1);               // stab
}
```

Each `yield` is one animation frame. Public generators are behaviors a user can trigger; protected ones (`flyTo`, `hoverFor`, `moveOnGround`, `peck`, `poseTo`) are the building blocks.

### Traits are declared where they change

Any class can declare static `flight`, `ecology` and `look` tables listing only the fields it changes. An instance resolves its values by merging those tables from `Bird` down to its own class.

`Bird.flyTo()` is the single flight routine. It reads the resolved `FlightProfile`:

| Parameter | Effect in `flyTo` / `hoverFor` |
| --- | --- |
| `cruiseSpeed`, `power` | Top speed, acceleration, how long the takeoff wind-up is. |
| `agility` | Maximum turn rate. Low values fly wide arcs. |
| `braking` | Deceleration. At 1 the bird stops with no visible slowing; low values need a long approach. |
| `hover` | 0 cannot. Around 0.5 holds for a few seconds, wobbling, body near vertical. 1 holds indefinitely and can drift backward. |
| `flapDuty`, `cyclePeriod`, `restPose` | The flap/rest rhythm: continuous, flap-and-bound (wings shut), or flap-and-glide (wings out). |
| `glide` | Height lost while not flapping. |
| `endurance`, `ceiling` | When the bird is forced to land, and how high it can get. |

So the hummingbird (`hover: 1, braking: 1`, set on `Trochilidae`) and the kingfisher (`hover: 0.55, braking: 0.35`, set on `Alcedinidae`) both hover through the same code and look different. The chicken and the quail are both poor fliers in different ways: the quail has `power: 0.9` and five seconds of endurance, the chicken `power: 0.3`, 2.5 seconds, and a ceiling of 8.

Some traits appear in unrelated lineages (hovering, dropping clams on rocks, soaring, clinging to bark). Those routines are protected methods on `Bird`, and each family that has the behavior exposes it as its own public method.

### The hierarchy explorer is reflection

The app's only list is the array of species classes in [taxonomy/index.ts](src/birds/taxonomy/index.ts). The tree in the Class hierarchy tab is rebuilt from that array by walking constructor prototypes. "Declared in" and "overridden in" come from asking each prototype whether it owns the method. Trait origins come from asking each constructor whether it owns the static table. There is no second description of the taxonomy to keep in sync.

`BehaviorTable<T>` is a mapped type over the class's own Script-returning methods, so a behavior entry whose method was renamed or removed fails to compile.

## Rendering

[render/drawBird.ts](src/render/drawBird.ts) draws any bird on a 2D canvas from two inputs: its `Look` (proportions and colors) and its `Pose` (body pitch, neck, head, wings, legs, tail for this frame). Behaviors animate a bird only by writing to its pose and position. There is no per-species drawing code and no graphics library.

[ui/Stage.tsx](src/ui/Stage.tsx) owns the animation loop and the camera. The React components around it are plain controls.

## Known simplifications

- Sizes and distances are stylized. A hummingbird is drawn about half the length of a heron so both are readable on one stage; speeds keep their real ratios.
- Wingbeats above 8 per second are drawn at 8, and above 20 as a blur.
- Plumage is a handful of color regions, enough to tell species apart, not field-guide accurate. One plumage per species (adult male where the sexes differ).
- The flight parameters are my estimates from natural-history descriptions, not measurements.
- The Blue Jay is not included because it does not occur on the Olympic Peninsula. `Cyanocitta` is ready for it.

See [ROADMAP.md](ROADMAP.md) for what is next.
