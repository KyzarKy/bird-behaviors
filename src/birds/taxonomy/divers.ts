/**
 * Foot-propelled diving waterbirds: loons, grebes and cormorants. Three
 * unrelated orders that all hunt by going under, so the dive itself is
 * Bird.diveUnder() and each family adds what happens around it.
 */
import { Bird, clamp, rand } from '../core/Bird';
import type { BehaviorTable, Ecology, FlightProfile, Look, Script, Taxon } from '../core/traits';

/**
 * The run across the surface before a heavy swimmer lifts off. It only touches
 * public state, so the three orders share it without a common parent.
 */
function* patter(b: Bird, runUp: number): Script {
  const water = b.world.habitat.water;
  if (!water || !b.afloat) return;
  const p = b.pose;
  const dir = b.pos.x < 75 ? 1 : -1;
  p.facing = dir;
  const x0 = b.pos.x;
  const to = clamp(x0 + dir * runUp, water.from + 2, 96);
  const secs = 0.3 + 0.08 * runUp;
  p.wings = 'open';
  for (let t = 0; t < secs; ) {
    t += yield;
    const k = Math.min(1, t / secs);
    b.pos.x = x0 + (to - x0) * k;
    p.flap = Math.sin(t * 28);
    p.stride = Math.sin(t * 20);
    p.pitch = 0.1 + 0.3 * k;
  }
  b.world.burst('splash', to, 0, 3 + Math.round(runUp / 3), -dir);
}

// ================================================================ Gaviiformes

export abstract class Gaviiformes extends Bird {
  static override taxon: Taxon = {
    rank: 'order',
    name: 'Gaviiformes',
    common: 'Loons',
    note: 'Big fish-eaters with the legs set so far back that they cannot stand or walk, only shove themselves along on the belly. Dense bones make them ride low and dive deep, and they need a long run on the water to take off.',
  };

  static override flight: Partial<FlightProfile> = {
    cruiseSpeed: 20,
    power: 0.2,
    agility: 0.25,
    braking: 0.15,
    glide: 0.2,
    flapRate: 4.5,
    flapDuty: 1,
    ceiling: 30,
  };

  static override ecology: Partial<Ecology> = { habitat: 'beach', perches: [], gait: 'walk', groundSpeed: 2.5, swims: true, posture: 0.03 };
  static override look: Partial<Look> = { build: 0.75, neckLength: 0.3, legLength: 0.04, tailLength: 0.08, wingSpan: 1.5, headSize: 0.6, beakShape: 'dagger', beakLength: 1.3, legsTrail: true };

  static override behaviors: BehaviorTable<Gaviiformes> = {
    fly: {
      label: 'Take off and fly',
      cue: 'A long pattering run across the water, wings beating, before it lifts. Then fast, straight flight with the neck stretched out, a slight hump over the shoulders and the big feet trailing behind the short tail.',
    },
  };

  protected runUp = 14;

  override *fly(): Script {
    const water = this.world.habitat.water;
    if (!water) return yield* super.fly();
    yield* patter(this, this.runUp);
    const dir = this.pos.x < 76 ? 1 : -1;
    yield* this.flyOver({ x: clamp(this.pos.x + dir * rand(14, 28), water.from + 4, 94), y: 0 });
    yield* this.relax();
  }

  protected override adjustFlightPose() {
    this.pose.neck = 0.2;
    this.pose.neckExt = 1.15;
    this.pose.head = -0.1;
  }
}

export abstract class Gaviidae extends Gaviiformes {
  protected override diveDepth = 11;
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Gaviidae',
    common: 'Loons',
    note: 'The only family of loons. Solid bones and a long chase underwater: a loon looks before it dives, goes under without a splash and stays down for a minute or more.',
  };

  static override behaviors: BehaviorTable<Gaviidae> = {
    forage: {
      eats: 'baitfish',
      label: 'Peer and dive',
      cue: 'Rides low with the face laid flat in the water, looking for fish. Then it slides under, usually with no leap and hardly a ripple, and stays down far longer than a grebe or a duck, coming up a long way off. Compare how long each loon stays down.',
    },
  };

  protected diveTime = 3.5;
  protected diveSpan = 12;
  /** Seconds the face stays in the water looking before each dive. */
  protected peekTime = 1.2;
  protected dives = 3;

  override forage(): Script {
    return this.peerDive();
  }

  *peerDive(): Script {
    if (!this.world.habitat.water) return;
    yield* this.toWater();
    for (let i = 0; i < this.dives; i++) {
      yield* this.poseTo({ neck: 0.1, head: -1.3, pitch: -0.1 }, 0.25);
      yield* this.wait(this.peekTime);
      yield* this.diveUnder(this.diveTime, this.diveDx(this.diveSpan));
      yield* this.swallowCatch();
      yield* this.relax(0.2);
    }
  }
}

export abstract class Gavia extends Gaviidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Gavia',
    common: 'Loons',
    note: 'The single genus. In winter all of them are dark above and white below, so the head pattern and the bill shape separate the species.',
  };
}

export class CommonLoon extends Gavia {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Gavia immer',
    common: 'Common Loon',
    note: 'The big one: heavy dagger bill, blocky head, dark gray above and white below in winter, with a ragged white half-collar on the neck. Winter visitor to Discovery Bay from fall to spring; look off Gardiner Beach beyond the pilings. The yodeling is a summer lake sound.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'a tremolo laugh, ha-ha-ha-ha-ha (rare in winter); a mournful hoot',
    presence: [3, 3, 2, 2, 1, 1, 1, 0, 1, 2, 3, 3],
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 20, flapRate: 4.3 };

  static override look: Partial<Look> = {
    length: 0.81,
    build: 0.85,
    headSize: 0.7,
    neckLength: 0.28,
    beakLength: 1.4,
    cap: '#2f3438',
    head: '#454b51',
    throat: '#eeeeec',
    body: '#3f454b',
    belly: '#f4f4f2',
    wing: '#383d42',
    tail: '#383d42',
    beak: '#aeb4b8',
    legs: '#4a4f54',
    eye: '#8a1a1a',
  };
}

export class PacificLoon extends Gavia {
  protected override diveDepth = 9.5;
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Gavia pacifica',
    common: 'Pacific Loon',
    note: 'Smaller and slimmer than a Common Loon, with a slender straight gray bill and a clean line between the dark gray nape and the white throat. Passes through the Strait in large flights in April and May, with a few singles through the winter.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'a croaking kwow; silent on migration',
    presence: [1, 1, 2, 3, 1, 0, 0, 0, 0, 1, 2, 1],
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 21, flapRate: 4.8 };

  // Between the other two loons: shorter, more frequent dives than a Common Loon, in loose groups.
  protected override diveTime = 2.8;
  protected override diveSpan = 10;
  protected override peekTime = 0.8;
  protected override dives = 4;
  protected override runUp = 11;

  static override look: Partial<Look> = {
    length: 0.65,
    build: 0.65,
    headSize: 0.55,
    neckLength: 0.3,
    beakLength: 1.2,
    cap: '#4a5057',
    head: '#5d646b',
    throat: '#f2f2f0',
    body: '#4a5057',
    belly: '#f4f4f2',
    wing: '#41474d',
    tail: '#41474d',
    beak: '#5b6166',
    legs: '#3f4448',
    eye: '#8a1a1a',
  };
}

export class RedThroatedLoon extends Gavia {
  protected override diveDepth = 7;
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Gavia stellata',
    common: 'Red-throated Loon',
    note: 'The smallest loon: pale face and neck, a back finely speckled with white, and a thin bill that looks tilted up because the head is held that way. Winter visitor in the Strait, often in the tide lines off Protection Island and along the outer bay.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'a goose-like kak-kak-kak in flight; quiet in winter',
    presence: [2, 2, 2, 1, 0, 0, 0, 0, 0, 1, 2, 2],
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 20, power: 0.3, flapRate: 5.2 };

  // The lightest loon: a shorter run, and it can lift off from small water where the others cannot.
  protected override diveTime = 2.2;
  protected override diveSpan = 8;
  protected override peekTime = 0.6;
  protected override runUp = 6;

  static override look: Partial<Look> = {
    length: 0.61,
    build: 0.6,
    headSize: 0.5,
    neckLength: 0.32,
    beakShape: 'thin',
    beakLength: 1.2,
    cap: '#59616a',
    head: '#c4c9cd',
    throat: '#f4f4f2',
    body: '#4a5057',
    belly: '#f6f6f4',
    spots: '#e6e8ea',
    wing: '#444a50',
    tail: '#444a50',
    beak: '#6a7075',
    legs: '#3f4448',
    eye: '#8a1a1a',
  };

  protected override restingPose() {
    return { ...super.restingPose(), head: 0.3 };
  }
}

// ========================================================= Podicipediformes

export abstract class Podicipediformes extends Bird {
  static override taxon: Taxon = {
    rank: 'order',
    name: 'Podicipediformes',
    common: 'Grebes',
    note: 'Compact diving birds with lobed toes instead of webbed feet and legs set far back. They have almost no tail, hold their feathers tight to control buoyancy and rarely fly except at migration.',
  };

  static override flight: Partial<FlightProfile> = {
    cruiseSpeed: 17,
    power: 0.25,
    agility: 0.3,
    braking: 0.2,
    glide: 0.1,
    flapRate: 7.5,
    flapDuty: 1,
    ceiling: 25,
  };

  static override ecology: Partial<Ecology> = { habitat: 'beach', perches: [], gait: 'walk', groundSpeed: 2.5, swims: true, posture: 0.12 };
  static override look: Partial<Look> = { build: 0.75, neckLength: 0.4, legLength: 0.04, tailLength: 0.02, wingSpan: 1.5, headSize: 0.8, beakShape: 'dagger', beakLength: 1, legsTrail: true };

  static override behaviors: BehaviorTable<Podicipediformes> = {
    fly: {
      label: 'Take off and fly',
      cue: 'Grebes fly only when they must. A long patter over the surface on lobed feet, then fast, whirring flight low over the water with the neck stretched, a hunched look and the feet trailing. White secondaries show in flight on some.',
    },
  };

  protected runUp = 10;

  override *fly(): Script {
    const water = this.world.habitat.water;
    if (!water) return yield* super.fly();
    yield* patter(this, this.runUp);
    const dir = this.pos.x < 76 ? 1 : -1;
    yield* this.flyOver({ x: clamp(this.pos.x + dir * rand(12, 24), water.from + 4, 94), y: 0 });
    yield* this.relax();
  }

  protected override adjustFlightPose() {
    this.pose.neck = 0.2;
    this.pose.neckExt = 1.25;
    this.pose.head = -0.2;
  }
}

export abstract class Podicipedidae extends Podicipediformes {
  protected override diveDepth = 5.5;
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Podicipedidae',
    common: 'Grebes',
    note: 'The only family of grebes. A grebe hunts in short dives from the surface and controls how high it floats by squeezing air out of its plumage.',
  };

  static override behaviors: BehaviorTable<Podicipedidae> = {
    forage: {
      eats: 'baitfish',
      label: 'Leap and dive',
      cue: 'A quick glance below, then a forward jump that arches the body out of the water and a head-first plunge after a small fish. The dive is short and the bird comes up not far away. A loon slips under with no arch and stays down longer.',
    },
    sinkLow: {
      label: 'Sink low',
      cue: 'Squeezes the air out of its feathers and settles until the back is awash and only the neck and head show, then swims along that way. A grebe can ride high like a duck or low like a periscope.',
    },
  };

  protected diveTime = 2;
  protected diveSpan = 7;
  protected diveLeap = 1.1;
  protected dives = 4;

  override forage(): Script {
    return this.leapDive();
  }

  *leapDive(): Script {
    if (!this.world.habitat.water) return;
    yield* this.toWater();
    for (let i = 0; i < this.dives; i++) {
      yield* this.poseTo({ neck: 0.3, head: -1, pitch: -0.05 }, 0.2);
      yield* this.wait(rand(0.2, 0.5));
      yield* this.diveUnder(this.diveTime, this.diveDx(this.diveSpan), this.diveLeap);
      yield* this.swallowCatch();
    }
    yield* this.relax();
  }

  *sinkLow(): Script {
    const water = this.world.habitat.water;
    if (!water) return;
    yield* this.toWater();
    yield* this.poseTo({ crouch: 0.8, pitch: 0.15, neckExt: 1.2 }, 0.9);
    const dir = this.pos.x > 76 ? -1 : 1;
    yield* this.moveOnGround(clamp(this.pos.x + dir * rand(6, 10), water.from + 3, 94), 0.8);
    yield* this.lookAround(1);
    yield* this.relax(0.8);
  }
}

export abstract class Podiceps extends Podicipedidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Podiceps',
    common: 'Typical grebes',
    note: 'Medium grebes that are black or dark gray and white in winter, with a dark crown. They dive from the surface close to shore, usually alone or in small, loose groups.',
  };
}

export class HornedGrebe extends Podiceps {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Podiceps auritus',
    common: 'Horned Grebe',
    note: 'Small and crisp in winter: black cap and back, clean white cheek and foreneck, flat-topped head and a short, straight, pale-tipped bill. Winter flocks of a few to a dozen in the shallows off Gardiner Beach from fall to spring. The gold “horns” are a summer feature.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'a rattling trill, krrrrr (mostly summer); silent in winter',
    presence: [3, 3, 2, 1, 0, 0, 0, 0, 1, 2, 3, 3],
  };

  static override flight: Partial<FlightProfile> = { flapRate: 8.5 };

  // Small, shallow and close to shore: short dives and many of them.
  protected override diveTime = 1.6;
  protected override diveSpan = 5;
  protected override dives = 5;
  protected override runUp = 8;

  static override look: Partial<Look> = {
    length: 0.33,
    build: 0.75,
    neckLength: 0.35,
    headSize: 0.85,
    beakShape: 'cone',
    beakLength: 0.7,
    cap: '#2c2e30',
    head: '#2c2e30',
    throat: '#f2f2f0',
    eyeRing: '#f2f2f0',
    body: '#34373a',
    belly: '#f4f4f2',
    wing: '#34373a',
    tail: '#34373a',
    beak: '#3a3c3e',
    legs: '#4a4f54',
    eye: '#b02020',
  };
}

export class RedNeckedGrebe extends Podiceps {
  protected override diveDepth = 7;
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Podiceps grisegena',
    common: 'Red-necked Grebe',
    note: 'Larger and longer-necked than a Horned Grebe, with a dingy gray neck in winter, a dark cap and a heavy bill that is yellow at the base. One of the common winter grebes on Discovery Bay and the Strait, October to April, often a little offshore.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'a loud, braying series, ah-ah-ah-kerr (summer); mostly silent in winter',
    presence: [2, 2, 2, 2, 0, 0, 0, 0, 1, 2, 3, 2],
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 18, flapRate: 6.5 };

  // The bigger bird dives deeper and farther, with fewer dives.
  protected override diveTime = 2.6;
  protected override diveSpan = 9;
  protected override dives = 3;
  protected override runUp = 12;

  static override look: Partial<Look> = {
    length: 0.47,
    build: 0.7,
    neckLength: 0.45,
    headSize: 0.8,
    beakShape: 'stout',
    beakLength: 1,
    cap: '#363a3d',
    head: '#b8bcbe',
    throat: '#d2d5d6',
    neck: '#8d9194',
    body: '#4a4e51',
    belly: '#eceeee',
    wing: '#43474a',
    tail: '#43474a',
    beak: '#d6b43a',
    legs: '#4a4f54',
    eye: '#2a2420',
  };
}

export abstract class Aechmophorus extends Podicipedidae {
  protected override diveDepth = 8;
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Aechmophorus',
    common: 'Large long-necked grebes',
    note: 'The biggest North American grebes, with very long necks and long, thin bills. They spear fish instead of grabbing them, and pairs perform a rushing display in which both run upright across the water.',
  };

  static override behaviors: BehaviorTable<Aechmophorus> = {
    rush: {
      label: 'Rushing display',
      cue: 'Rises upright, neck arched, and runs across the surface with the feet slapping and a wake behind, then dives. A pair does it side by side in perfect step. Nothing else on the bay runs on water like this.',
    },
  };

  protected override diveTime = 2.4;
  protected override diveSpan = 9;
  protected override runUp = 14;

  *rush(): Script {
    const water = this.world.habitat.water;
    if (!water) return;
    yield* this.toWater();
    const p = this.pose;
    const dir = this.pos.x < 76 ? 1 : -1;
    const x0 = this.pos.x;
    const to = clamp(x0 + dir * 14, water.from + 3, 96);
    p.facing = dir;
    this.say(this.ecology.call, 2);
    yield* this.poseTo({ neck: 1.3, neckExt: 1.2, pitch: 0.55, head: 0.3 }, 0.4);
    const secs = 2.2;
    yield* this.tween(secs, (t) => {
      this.pos.x = x0 + (to - x0) * t;
      p.stride = Math.sin(t * secs * 30);
      if (Math.random() < 0.25) this.world.burst('splash', this.pos.x, 0, 1, -dir);
    });
    p.stride = 0;
    yield* this.diveUnder(2, dir * 3);
    yield* this.relax();
  }
}

export class WesternGrebe extends Aechmophorus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Aechmophorus occidentalis',
    common: 'Western Grebe',
    note: 'Long white neck and a black cap that runs down to the eye, with a greenish-yellow bill. Winter visitor to the bay and Strait, scattered flocks off Gardiner Beach from fall to spring, in smaller numbers than a few decades ago. Pairing displays start before spring.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'a two-note, creaky krrreeet-kreet',
    presence: [2, 2, 2, 1, 0, 0, 0, 0, 1, 2, 2, 2],
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 18, flapRate: 5.5 };

  static override look: Partial<Look> = {
    length: 0.64,
    build: 0.55,
    neckLength: 0.65,
    headSize: 0.6,
    beakLength: 1.9,
    cap: '#1c1d1e',
    head: '#f4f4f1',
    neck: '#f4f4f1',
    throat: '#f4f4f1',
    body: '#3a3d40',
    belly: '#f6f6f3',
    wing: '#3a3d40',
    tail: '#3a3d40',
    beak: '#c4c25a',
    legs: '#4a4f54',
    eye: '#b02020',
  };
}

export abstract class Podilymbus extends Podicipedidae {
  protected override diveDepth = 4;
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Podilymbus',
    common: 'Thick-billed grebes',
    note: 'Brown, thick-billed grebes of ponds and marshes. They often sink out of sight instead of leaping into a dive.',
  };

  static override behaviors: BehaviorTable<Podilymbus> = {
    forage: {
      label: 'Sink out of sight',
      cue: 'No leap. The body settles lower and lower as it squeezes air out of its plumage, until only the head is above water, then it goes straight down after a small fish and comes up close by, often near cover. Most other grebes jump.',
    },
  };

  protected override diveTime = 2.4;
  protected override diveSpan = 2;
  protected override diveLeap = 0;
  protected override dives = 3;

  override *leapDive(): Script {
    if (!this.world.habitat.water) return;
    yield* this.toWater();
    for (let i = 0; i < this.dives; i++) {
      yield* this.poseTo({ crouch: 0.8, pitch: 0.1, neckExt: 0.9 }, 1.1);
      yield* this.wait(0.3);
      yield* this.diveUnder(this.diveTime, this.diveDx(this.diveSpan), 0);
      yield* this.swallowCatch();
      yield* this.wait(rand(0.4, 1));
    }
    yield* this.relax();
  }
}

export class PiedBilledGrebe extends Podilymbus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Podilymbus podiceps',
    common: 'Pied-billed Grebe',
    note: 'Brown and plump, with a short, thick, chicken-like bill, a white patch under the tail and no neck to speak of. A bird of freshwater ponds that is scarce on the bay itself, where it sits in sheltered corners in winter.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'cuk-cuk-cuk-cow-cow-cow (a spring call from ponds); quiet in winter',
    presence: [1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1],
  };

  static override flight: Partial<FlightProfile> = { flapRate: 8, cruiseSpeed: 15 };

  static override look: Partial<Look> = {
    length: 0.33,
    build: 0.85,
    neckLength: 0.3,
    headSize: 0.9,
    beakShape: 'stout',
    beakLength: 0.6,
    tailLength: 0.03,
    head: '#7a6048',
    throat: '#ece6da',
    eyeRing: '#f0ece2',
    body: '#80674f',
    belly: '#c9bca8',
    wing: '#6f5842',
    tail: '#6f5842',
    beak: '#cdb98e',
    legs: '#4a4038',
    eye: '#2a2018',
  };
}

// ================================================================= Suliformes

export abstract class Suliformes extends Bird {
  static override taxon: Taxon = {
    rank: 'order',
    name: 'Suliformes',
    common: 'Cormorants and relatives',
    note: 'Fish-eaters with all four toes joined by webbing, a hooked bill tip and plumage that gets wet. They swim low with the bill tilted up, and they have to take off with a run across the water.',
  };

  static override flight: Partial<FlightProfile> = {
    cruiseSpeed: 16,
    power: 0.35,
    agility: 0.35,
    braking: 0.25,
    glide: 0.35,
    flapRate: 4.5,
    flapDuty: 1,
    ceiling: 30,
  };

  static override ecology: Partial<Ecology> = { habitat: 'beach', perches: ['post', 'rock'], gait: 'walk', groundSpeed: 2.5, swims: true, posture: 0.7 };
  static override look: Partial<Look> = { build: 0.55, neckLength: 0.45, legLength: 0.1, tailLength: 0.3, wingSpan: 1.7, headSize: 0.5, beakShape: 'hook', beakLength: 1.4, legsTrail: false };

  static override behaviors: BehaviorTable<Suliformes> = {
    fly: {
      label: 'Take off and fly',
      cue: 'From the water it pattering-runs on the surface, flapping hard. From a post it just drops and flaps. In flight the neck is stretched out and the wingbeat is steady and fast, with no gliding bursts like a gull.',
    },
  };

  protected runUp = 8;

  override *fly(): Script {
    yield* patter(this, this.runUp);
    yield* super.fly();
  }

  protected override adjustFlightPose() {
    this.pose.neck = 0.3;
    this.pose.neckExt = 1.1;
    this.pose.head = 0.15;
  }

  /** Upright on a perch, flat and low with the bill tilted up on the water. */
  protected override restingPose() {
    return this.afloat ? { ...super.restingPose(), pitch: 0.05, head: 0.2 } : super.restingPose();
  }

  /** A bird on a piling over the water is not swimming. */
  override get afloat(): boolean {
    return super.afloat && this.pos.y < 0.5;
  }
}

export abstract class Phalacrocoracidae extends Suliformes {
  protected override diveDepth = 7.5;
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Phalacrocoracidae',
    common: 'Cormorants',
    note: 'Unlike ducks and loons, cormorant feathers soak up water, which cuts buoyancy for diving. The price is that a cormorant has to stand with its wings spread to dry out after every fishing trip.',
  };

  static override behaviors: BehaviorTable<Phalacrocoracidae> = {
    dryWings: {
      label: 'Spread wings to dry',
      cue: 'Stands on a post or rock facing the wind with both wings held out and drooping, and stays like that for minutes. No gull or duck does this; it identifies a cormorant at a distance. Note how long each species holds the pose.',
    },
    forage: {
      eats: 'baitfish',
      label: 'Dive for fish',
      cue: 'Swims low with the bill tilted up, gives a small forward surge and a hop, then goes under. Compare a loon, which slips under without the hop. After a dive it often swims to a perch to dry.',
    },
  };

  protected diveTime = 2.5;
  protected diveSpan = 8;
  protected dives = 3;
  /** Seconds it holds the wings out. */
  protected dryTime = 6;

  override forage(): Script {
    return this.fishDive();
  }

  *fishDive(): Script {
    if (!this.world.habitat.water) return;
    yield* this.toWater();
    for (let i = 0; i < this.dives; i++) {
      yield* this.moveOnGround(this.foodSpot(4).x, 0.8);
      yield* this.diveUnder(this.diveTime, this.diveDx(this.diveSpan), 0.5);
      if (this.pose.carry) {
        this.hold(this.pose.carry);
        yield* this.poseTo({ neck: 1.3, head: 0.6 }, 0.2);
        yield* this.wait(0.6);
        this.hold(null);
      }
    }
    yield* this.relax();
  }

  *dryWings(): Script {
    yield* this.toPerch();
    const p = this.pose;
    yield* this.poseTo({ pitch: 0.75, neck: 1, head: 0.1 }, 0.3);
    p.wings = 'open';
    yield* this.poseTo({ flap: 0.15, tailFan: 0.3 }, 0.6);
    for (let t = 0; t < this.dryTime; ) {
      t += yield;
      // Now and then a shiver runs through the spread wings.
      p.flap = 0.15 + (t % 2 < 0.4 ? 0.06 * Math.sin(t * 30) : 0);
    }
    yield* this.poseTo({ flap: 0, tailFan: 0 }, 0.3);
    p.wings = 'folded';
    yield* this.relax();
  }

  /** Cross the bay at `height`, landing back on the water. */
  protected *cross(height: number): Script {
    const water = this.world.habitat.water;
    if (!water) return;
    yield* patter(this, this.runUp);
    const x = this.pos.x > 76 ? water.from + 8 : 92;
    yield* this.flyTo({ x: (this.pos.x + x) / 2, y: height }, { land: false });
    yield* this.flyTo({ x, y: 0 });
    yield* this.relax();
  }
}

export abstract class Nannopterum extends Phalacrocoracidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Nannopterum',
    common: 'Double-crested and Neotropic cormorants',
    note: 'Cormorants of lakes, rivers and bays as well as the coast. They fly well above the water and travel in lines and Vs.',
  };

  static override behaviors: BehaviorTable<Nannopterum> = {
    vFlight: {
      label: 'Fly high across the bay',
      cue: 'Crosses the bay well above the water in a V or ragged line, steady wingbeats, neck kinked upward in the middle. Compare the Pelagic and Brandt’s Cormorants, which skim the waves.',
    },
  };

  *vFlight(): Script {
    yield* this.cross(14);
  }
}

export class DoubleCrestedCormorant extends Nannopterum {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Nannopterum auritum',
    common: 'Double-crested Cormorant',
    note: 'Black with an orange-yellow patch of bare skin at the base of the bill and a kink in the neck in flight. The one that perches on pilings in the bay and flies in lines over the water. Present all year, most numerous in late summer and fall.',
  };

  static override ecology: Partial<Ecology> = {
    perches: ['post', 'log', 'rock'],
    call: 'a low, pig-like grunt, urrrrk (at the nest and roost); silent otherwise',
    presence: [2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 2, 2],
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 17, flapRate: 4 };

  // Likes shallow, sheltered water: shorter dives than the open-coast cormorants, and long drying sessions.
  protected override diveTime = 2.2;
  protected override diveSpan = 7;
  protected override dryTime = 8;

  static override look: Partial<Look> = {
    length: 0.81,
    build: 0.6,
    neckLength: 0.5,
    headSize: 0.5,
    beakLength: 1.4,
    throat: '#e0902a',
    body: '#2b2a28',
    belly: '#2b2a28',
    head: '#2b2a28',
    wing: '#4a4338',
    tail: '#232220',
    beak: '#8c7a4a',
    legs: '#232220',
    eye: '#2f8a8a',
  };
}

export abstract class Urile extends Phalacrocoracidae {
  protected override diveDepth = 10;
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Urile',
    common: 'Rock cormorants',
    note: 'Glossy, slim-necked cormorants of rocky coasts, usually found on rocks and cliffs and fishing in clean salt water. They nest on cliff ledges.',
  };

  static override behaviors: BehaviorTable<Urile> = {
    skimLow: {
      label: 'Skim the waves',
      cue: 'Flies in a straight, fast line a few feet above the water, neck stretched out, wings beating steadily. Compare the Double-crested Cormorant, which crosses the bay high and in a V.',
    },
  };

  static override look: Partial<Look> = { neckLength: 0.52, beakShape: 'thin', beakLength: 1.2 };

  protected override diveTime = 3;
  protected override diveSpan = 10;
  protected override dryTime = 4;

  *skimLow(): Script {
    yield* this.cross(1.8);
  }
}

export class PelagicCormorant extends Urile {
  protected override diveDepth = 11;
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Urile pelagicus',
    common: 'Pelagic Cormorant',
    note: 'The slimmest cormorant, with a thin neck, a thin dark bill and a small head. In summer a white patch shows on the flank. Nests on the cliffs of Protection Island and is present all year, often on rocks and pilings along the bay.',
  };

  static override ecology: Partial<Ecology> = {
    perches: ['rock', 'post'],
    call: 'a soft, hissing croak at the nest; usually silent',
    presence: [2, 2, 2, 2, 2, 3, 3, 3, 2, 2, 2, 2],
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 16, flapRate: 5.5 };

  // Deepest and longest dives of the three, with the shortest drying time.
  protected override diveTime = 3.2;
  protected override dryTime = 3;
  protected override runUp = 7;

  static override look: Partial<Look> = {
    length: 0.7,
    build: 0.4,
    neckLength: 0.55,
    headSize: 0.42,
    beakLength: 1.1,
    throat: '#8a2f2a',
    body: '#232a2a',
    belly: '#232a2a',
    head: '#232a2a',
    wing: '#2e3636',
    tail: '#1d2222',
    beak: '#3a3a3a',
    legs: '#2a2222',
    eye: '#2f8a6a',
  };
}

export class BrandtsCormorant extends Urile {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Urile penicillatus',
    common: 'Brandt’s Cormorant',
    note: 'The stocky black cormorant of the open coast, with a buff band across the throat and short tail. Not resident at Discovery Bay; seen on the Strait from late summer through winter on rocks and over the water, often in long, low lines.',
  };

  static override ecology: Partial<Ecology> = {
    perches: ['rock', 'post'],
    call: 'a low grunt; silent away from the colony',
    presence: [2, 2, 1, 1, 0, 0, 0, 1, 2, 2, 2, 2],
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 17, flapRate: 4.5 };

  // Strong, steady diver of open water: longest runs, long dives, average drying.
  protected override diveSpan = 11;
  protected override dryTime = 5;
  protected override runUp = 10;

  static override look: Partial<Look> = {
    length: 0.84,
    build: 0.65,
    neckLength: 0.42,
    headSize: 0.5,
    tailLength: 0.22,
    beakLength: 1.3,
    throat: '#b39a6c',
    body: '#1e2020',
    belly: '#1e2020',
    head: '#1e2020',
    wing: '#2a2c2c',
    tail: '#1a1c1c',
    beak: '#3a3a3a',
    legs: '#1e1e1e',
    eye: '#2f8a8a',
  };
}
