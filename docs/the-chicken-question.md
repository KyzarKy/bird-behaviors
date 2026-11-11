# The chicken question

*What would you consider when designing a chicken in an object-oriented, class-based way?*

The considerations below are the ones this project is built around. Each links to where it shows up in the code or the app.

## 1. Most of a chicken is not about chickens

A chicken scratches the ground, dust bathes, and flies badly. So does a quail. Those facts belong to the order they share, `Galliformes`, and each is written once there. Flying, perching, preening, and calling belong to every bird, so they live on `Bird`.

What is left for `Chicken` itself is small: its colors, its call, a flight profile, and one overridden method. You can see exactly that list in the app under [Gallus gallus domesticus](https://kyzarky.github.io/bird-behaviors/#/class/gallus-gallus-domesticus), and in [galliformes.ts](../src/birds/taxonomy/galliformes.ts).

So the first consideration is placement: for each thing a chicken does, find the highest class for which it is still true.

## 2. The hierarchy already exists

Taxonomy gives the levels: class, order, family, genus, species. Following it means the placement question in point 1 usually has a known answer, and new species slot in without redesign. A Blue Jay would be a few lines under `Cyanocitta`, next to the Steller's Jay.

Some classes end up nearly empty (`Phasianidae` holds only a description). They stay, because the next pheasant needs somewhere to go and because a missing level would make the tree wrong.

The scope stops at `Bird` on purpose. Going up to reptiles would add levels without adding anything a bird watcher uses.

## 3. Differences of degree are data; differences of kind are code

A chicken and a quail both fly poorly, in different ways. The quail explodes off the ground and is done in five seconds. The chicken barely clears a fence.

They share one flight method, `Bird.flyTo()`. What differs is a table of numbers that each class may partly override:

| | `power` | `endurance` | `ceiling` | set by |
| --- | --- | --- | --- | --- |
| Galliformes | 0.8 | 5 s | 14 | the order |
| Gallus | | 4 s | 12 | the genus |
| Chicken | 0.3 | 2.5 s | 8 | the species |

A hummingbird and a kingfisher both hover, through the same method, with `hover: 1` and `hover: 0.55`. See [the flight model](flight-model.md).

A method override is kept for a difference of kind. A startled quail flies; a startled chicken runs with its wings beating. That is a different sequence of actions, so `Chicken` overrides `flush()`.

## 4. Inheritance cannot express everything

Three cases where a strict tree is the wrong tool, and what the design does about each:

- **Convergent traits.** Hummingbirds and kingfishers hover, crows and gulls both drop clams on rocks, and none of them share an ancestor below `Bird`. Putting `hover()` on a common parent would give it to chickens. Here the mechanics are protected methods on `Bird` driven by parameters, and each family that has the behavior exposes it publicly under its own name.
- **Exceptions inside a group.** The Northern Flicker is a woodpecker that feeds on the ground. `Colaptes` overrides `forage()` and still inherits `drum()` and `hitchUp()` from `Picidae`. An override handles the exception without splitting the family.
- **A subclass that is worse at something.** A chicken is a bird that mostly cannot fly. It still has `fly()`, because callers should be able to ask any bird to fly and get a truthful result: the chicken flutters a short way, runs out of endurance, and walks the rest. The method's contract is "try to get there", and every subclass can honor that.

## 5. The domestic chicken is a special case of its own genus

A wild junglefowl flies better than a farm chicken. So `Gallus` carries the junglefowl's numbers and `Chicken` overrides them downward. If the model had put the chicken's numbers on the genus, a second `Gallus` species would have inherited the side effects of a breeding program.

## 6. The design should be checkable

A hierarchy like this drifts if the only description of it is a diagram. So the app's class explorer is generated from the classes at runtime ([reflect.ts](../src/birds/core/reflect.ts)): it asks each constructor which trait values it owns and each prototype which methods it owns. The tests assert the placements directly, for example that `scratch` is declared on `Galliformes` and that a hummingbird does not have it ([birds.test.ts](../src/birds/birds.test.ts)).
