# Rendering

The app draws on the browser's 2D canvas with no graphics library.

[drawBird.ts](../src/render/drawBird.ts) draws any bird from two inputs:

- **`Look`**: proportions (body length, build, neck, legs, tail, wingspan, bill shape) and a few color regions. Declared as static tables in the hierarchy, like flight.
- **`Pose`**: what the bird is doing this frame (body pitch, neck and head angles, wing position, leg stride, tail fan, what it is carrying).

There is no drawing code per species. A heron and a chickadee go through the same function with different numbers.

Behaviors never draw. They move the bird and write to its pose; the renderer reads it. That separation is why the tests can run every behavior to completion without a browser.

[drawWorld.ts](../src/render/drawWorld.ts) draws a habitat from data in [World.ts](../src/birds/core/World.ts): trunks, limbs, foliage, perches, and water. [Stage.tsx](../src/ui/Stage.tsx) owns the animation loop and a camera that follows the bird.
