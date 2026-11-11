# Roadmap

Built so far: 17 species across 8 orders, 2 habitats, triggerable behaviors with slow motion and close-up, the class hierarchy explorer, and an interface on `@kyzarky/ui`.

## Deferred features

These were considered for the first version and set aside to keep it focused.

### Side-by-side compare
Two stages in split view, each with its own bird, running the same behavior in sync. The cases that motivated it:
- Hummingbird hover next to kingfisher hover.
- Chicken `flush()` next to quail `flush()`.
- Galliform `scratch()` next to towhee `doubleScratch()`.
- Crow flight next to raven flight.

`Stage` already takes a bird as a prop, so this is mostly layout plus a shared clock.

### Autonomous mode
The bird chooses its own behaviors with realistic weighting, as it would in the field, with manual triggers still available. Needs a per-class weight table (another static, merged down the lineage like `flight`) and a chooser in `Bird.idle()`.

### ID quiz
A silhouette performs behaviors and you name the species from movement alone. Needs a silhouette flag in `drawBird` (fill everything one color) and a small quiz component. Good fit with autonomous mode.

## Other ideas

- **More species in existing genera.** Black-capped Chickadee (`Poecile`), Western Wood-Pewee (`Contopus`), Downy and Pileated Woodpecker (`Picidae`), Dark-eyed Junco and Song Sparrow (`Passerellidae`), Blue Jay (`Cyanocitta`) for visitors from the East.
- **New orders.** Waterfowl (dabbling Mallard against diving Bufflehead), shorebirds (Killdeer broken-wing display, Black Oystercatcher), Osprey for the plunge that contrasts with the eagle's snatch, owls.
- **Sexes and seasons.** Female and juvenile plumages as `Look` variants; seasonal presence on the Miller Peninsula.
- **Flocks.** Several instances on one stage: a quail covey with a sentinel, a mixed chickadee and nuthatch flock, gulls mobbing an eagle.
- **Sound.** Real recordings in place of the text mnemonics.
- **Tide and time of day** on the beach habitat, changing which behaviors are available.
- **Wind.** A wind vector in `World` that `flyTo` and `hoverFor` read, so gulls and kingfishers can kite into it.
- **Design system.** Move the navigation row and tag from `src/ui/bits.tsx` into `@kyzarky/ui` once a second app needs them.
- **Browser tests.** One Playwright run on a phone-sized screen with an axe accessibility check, as in Fluent Prior.
- **A theme switch,** and a night scene to go with the dark theme.
