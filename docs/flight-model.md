# The flight model

`Bird.flyTo()` in [Bird.ts](../src/birds/core/Bird.ts) is the only flight routine. It steers the bird toward a target each frame, and every quantity it uses comes from the bird's `FlightProfile`.

| Parameter | What it controls |
| --- | --- |
| `cruiseSpeed`, `power` | Top speed, acceleration, and how long the wind-up before takeoff lasts |
| `agility` | Maximum turn rate. Low values fly wide arcs |
| `braking` | Deceleration. At 1 the bird stops with no visible slowing; low values need a long approach |
| `hover` | 0 cannot. Near 0.5 holds a few seconds, wobbling, body almost vertical. 1 holds indefinitely and can move backward |
| `flapRate`, `flapDuty`, `cyclePeriod` | The rhythm: how fast the wings beat, and what fraction of each cycle is spent flapping |
| `restPose` | Between flaps the wings are shut (bounding) or held out (gliding) |
| `glide` | How little height is lost with the wings set |
| `endurance`, `ceiling` | When the bird has to come down, and how high it can get |

## Declared where they change

Any class may declare a partial `static flight` table. An instance merges those tables from `Bird` down to its own class, and the most specific value wins.

| | hover | braking | glide | flapDuty | Set mostly by |
| --- | --- | --- | --- | --- | --- |
| Anna's Hummingbird | 1 | 1 | 0.05 | 1 | `Trochilidae` |
| Belted Kingfisher | 0.55 | 0.35 | 0.2 | 0.75 | `Alcedinidae` |
| Bald Eagle | 0 | 0.25 | 0.95 | 0.15 | `Accipitridae`, `Haliaeetus` |
| Northern Flicker | 0 | 0.5 | 0.1 | 0.45, wings shut | `Picidae` |
| Chicken | 0 | 0.3 | 0.1 | 1 | `Galliformes`, `Chicken` |

The hummingbird arrives at a flower at full speed and stops. The kingfisher has to swing up into its hover and can only hold it for seconds. The flicker's path rises and falls because its wings are shut for more than half of each cycle. None of that is special-cased; it follows from the numbers.

## What is simplified

- The model is kinematic. It steers a velocity; it does not compute lift and drag.
- Wingbeats above 8 per second are drawn at 8, and above 20 as a blur, because a 60 Hz screen cannot show them.
- The values are estimates from natural-history descriptions.
