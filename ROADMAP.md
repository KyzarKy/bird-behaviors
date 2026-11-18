# Roadmap

Built so far: 165 species across 18 orders, 2 habitats, triggerable behaviors with slow motion and close-up, an auto mode where the bird chooses for itself, a species list sorted by how likely each bird is this month, the class hierarchy explorer, and an interface on `@kyzarky/ui`.

## Deferred features

These were considered for the first version and set aside to keep it focused.

### Side-by-side compare
Two stages in split view, each with its own bird, running the same behavior in sync. The cases that motivated it:
- Hummingbird hover next to kingfisher hover.
- Chicken `flush()` next to quail `flush()`.
- Galliform `scratch()` next to towhee `doubleScratch()`.
- Crow flight next to raven flight.

`Stage` already takes a bird as a prop, so this is mostly layout plus a shared clock.

### Flock toggle
A switch beside Auto and Close-up that fills the stage with a flock of the selected species, so you can see how it looks and acts in a group: a quail covey with a sentinel, bushtits streaming bush to bush, a tight starling flock wheeling, a goose V, scoters rafting offshore. Solitary species would show a loose pair or nothing more. Needs `Stage` to step and draw several birds, and a per-class flock size and spacing (another static merged down the lineage). Mixed flocks, such as chickadees with nuthatches or gulls mobbing an eagle, come after.

### ID quiz
A silhouette performs behaviors and you name the species from movement alone. Needs a silhouette flag in `drawBird` (fill everything one color) and a small quiz component. Good fit with auto mode.

## Other ideas

- **Things the renderer cannot draw yet.** White outer tail feathers (junco), a wing epaulet (Red-winged Blackbird), a rump patch (Yellow-rumped Warbler), a head that turns without the neck (owls), and rodent prey for hawks and owls. Each is worked around in the species files today.
- **Behavior weights for auto mode.** Only the four `Bird`-level behaviors set a `weight`; displays and rare behaviors still come up as often as anything else.
- **Sexes and seasons.** Female and juvenile plumages as `Look` variants; seasonal presence on the Miller Peninsula.
- **Sound.** Real recordings in place of the text mnemonics.
- **Tide and time of day** on the beach habitat, changing which behaviors are available.
- **Wind.** A wind vector in `World` that `flyTo` and `hoverFor` read, so gulls and kingfishers can kite into it.
- **Design system.** Move the navigation row and tag from `src/ui/bits.tsx` into `@kyzarky/ui` once a second app needs them.
- **Browser tests.** One Playwright run on a phone-sized screen with an axe accessibility check, as in Fluent Prior.
- **A theme switch,** and a night scene to go with the dark theme.
