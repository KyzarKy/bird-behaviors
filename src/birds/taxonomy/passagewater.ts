/**
 * Migrant and less frequent waterbirds at Gardiner Beach and Discovery Bay.
 * Most of these are absent for several months. They extend families and genera
 * defined in waterfowl.ts, shorebirds.ts and waterside.ts, and add the orders
 * and families that none of those files has: coots, jaegers and pelicans.
 */
import { Bird, clamp, rand } from '../core/Bird';
import type { BehaviorTable, Ecology, FlightProfile, Look, Script, Taxon } from '../core/traits';
import { Anatidae, Branta } from './waterfowl';
import { Alcidae, Charadrius, Scolopacidae } from './shorebirds';
import { Charadriiformes, Laridae, Pelecaniformes } from './waterside';

type Feeding = 'dabble' | 'dive' | 'graze';

/** x where the water begins, or the end of the sand on a beach with no water. */
const edgeOf = (water?: { from: number }) => water?.from ?? 55;

// ============================================================== Shovelers

export abstract class Spatula extends Anatidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Spatula',
    common: 'Shovelers and blue-winged ducks',
    note: 'Dabbling ducks with a broad bill. The bill is lined with long comb plates that strain small animals out of the surface water.',
  };

  static override flight: Partial<FlightProfile> = { power: 0.55, agility: 0.55 };

  protected override runUp = 2;
}

export class NorthernShoveler extends Spatula {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Spatula clypeata',
    common: 'Northern Shoveler',
    note: 'The bill is nearly as wide as the head is long. Drake: green head, white breast, chestnut flanks, yellow eye. Small numbers stop on Discovery Bay and the Gardiner creek mouth in spring and fall, a few in winter.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'thunk-thunk (the drake, soft and hollow); the hen gives a weak quack',
    presence: [1, 1, 1, 2, 1, 0, 0, 0, 1, 2, 1, 1],
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 15, flapRate: 6 };

  static override look: Partial<Look> = {
    length: 0.48,
    build: 0.8,
    neckLength: 0.25,
    headSize: 0.62,
    beakLength: 1.7,
    head: '#1f5a3e',
    breast: '#f6f6f2',
    body: '#8a3a28',
    belly: '#8a3a28',
    wing: '#8aa0b8',
    wingBar: '#2f8a5a',
    tail: '#2a2a2a',
    beak: '#2a2a2a',
    legs: '#e8802a',
    eye: '#e8c020',
  };

  static override behaviors: BehaviorTable<NorthernShoveler> = {
    forage: {
      label: 'Sieve the surface',
      cue: 'Swims in tight circles with the big bill laid flat on the water, sweeping it from side to side. Often several birds circle together, each stirring up food for the next. A Mallard upends; a shoveler rarely does.',
    },
  };

  override forage(): Script {
    return this.sieve();
  }

  *sieve(): Script {
    const water = this.world.habitat.water;
    if (!water) return;
    yield* this.toWater();
    const cx = clamp(this.pos.x, water.from + 5, 93);
    yield* this.moveOnGround(cx);
    const p = this.pose;
    yield* this.poseTo({ neck: 0.1, neckExt: 1.1, head: -0.7, pitch: -0.05 }, 0.3);
    for (let t = 0, a = 0; t < 7; ) {
      const dt = yield;
      t += dt;
      a += dt * 3;
      this.pos.x = cx + 2.5 * Math.sin(a);
      p.facing = Math.cos(a) >= 0 ? 1 : -1;
      p.stride = Math.sin(t * 10) * 0.5;
    }
    p.stride = 0;
    yield* this.relax(0.3);
  }
}

// ================================================================== Bay ducks

export abstract class Aythya extends Anatidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Aythya',
    common: 'Bay ducks',
    note: 'Diving ducks with a gray or white-and-black pattern and a blue-gray bill. They dive for mollusks and plants in open water and feed in flocks.',
  };

  static override flight: Partial<FlightProfile> = { power: 0.35, agility: 0.5, flapRate: 7 };
  static override look: Partial<Look> = { beakLength: 0.9 };

  static override behaviors: BehaviorTable<Aythya> = {
    forage: {
      label: 'Dive',
      cue: 'Springs forward and goes under with a small jump, and stays down much longer than a Bufflehead. A flock dives raggedly, so heads keep disappearing and reappearing across the raft.',
    },
  };

  protected override feeding: Feeding = 'dive';
  protected override diveLeap = 0.3;
  protected override diveSpan = 6;
  protected override runUp = 8;
}

export class GreaterScaup extends Aythya {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Aythya marila',
    common: 'Greater Scaup',
    note: 'Drake: black head with a green gloss, black breast and tail, pale gray back, white flanks. The white wing stripe runs out into the primaries. Rafts of them winter on open water in Discovery Bay and off the Miller Peninsula, November to March.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'a deep, purring scaup (the hen); the drake gives a soft, cooing whew',
    presence: [2, 2, 2, 1, 0, 0, 0, 0, 0, 1, 2, 2],
  };

  static override flight: Partial<FlightProfile> = { flapRate: 7 };

  static override look: Partial<Look> = {
    length: 0.45,
    build: 0.85,
    neckLength: 0.2,
    headSize: 0.66,
    head: '#26302c',
    breast: '#1c1c1e',
    body: '#b8bcbc',
    belly: '#f6f6f2',
    wing: '#4a4a4c',
    wingBar: '#f4f4f2',
    tail: '#1c1c1e',
    beak: '#6a8aa8',
    legs: '#6a7078',
    eye: '#e8c020',
  };

  // Larger, and it works the deeper water of open bays.
  protected override diveTime = 3;
  protected override diveSpan = 8;
  protected override prey = 'clam' as const;
}

export class LesserScaup extends Aythya {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Aythya affinis',
    common: 'Lesser Scaup',
    note: 'Like a Greater Scaup but smaller, with a peaked rear crown and a white wing stripe only on the secondaries. Scarce on salt water; a few mixed in with scaup rafts or on freshwater ponds near Gardiner in winter and early spring.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'a harsh scaup (the hen); the drake gives a soft whew',
    presence: [1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1],
  };

  static override flight: Partial<FlightProfile> = { flapRate: 8, agility: 0.55 };

  static override look: Partial<Look> = {
    length: 0.42,
    build: 0.8,
    neckLength: 0.2,
    headSize: 0.62,
    crest: 'pointed',
    head: '#2e2c38',
    breast: '#1c1c1e',
    body: '#b4b8b8',
    belly: '#f4f4f0',
    wing: '#4a4a4c',
    wingBar: '#f4f4f2',
    tail: '#1c1c1e',
    beak: '#6a8aa8',
    legs: '#6a7078',
    eye: '#e8c020',
  };

  protected override diveTime = 2.4;
  protected override diveSpan = 6;
  protected override prey = 'insect' as const;
}

export class RingNeckedDuck extends Aythya {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Aythya collaris',
    common: 'Ring-necked Duck',
    note: 'Drake: black back and peaked head, a white spur up the side of the breast, pale gray flanks and a bill with a white ring. The chestnut neck ring is hard to see. A bird of ponds and lakes; one or two may turn up in the bay after a freeze or a storm.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'a low, purring growl; usually silent',
    presence: [1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1],
  };

  static override flight: Partial<FlightProfile> = { flapRate: 8, agility: 0.55 };

  static override look: Partial<Look> = {
    length: 0.4,
    build: 0.8,
    neckLength: 0.2,
    headSize: 0.62,
    crest: 'pointed',
    head: '#2a2630',
    breast: '#1e1e20',
    band: '#f6f6f2',
    body: '#2c2c30',
    belly: '#c4c8c8',
    wing: '#3c3c40',
    wingBar: '#9aa0a8',
    tail: '#1c1c1e',
    beak: '#6e7a88',
    legs: '#6a7078',
    eye: '#e8c020',
  };

  // Shallow dives for plants and seeds.
  protected override diveTime = 1.8;
  protected override diveSpan = 5;
  protected override prey = 'seed' as const;
}

// ================================================================== Stifftails

export abstract class Oxyura extends Anatidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Oxyura',
    common: 'Stifftails',
    note: 'Dumpy diving ducks with stiff, spiky tail feathers that are held cocked at rest. The feet sit far back, so they barely walk and rarely fly.',
  };

  // Stub-winged: the heaviest takeoff run of any duck here.
  static override flight: Partial<FlightProfile> = { cruiseSpeed: 13, power: 0.3, agility: 0.35, flapRate: 10 };
  static override ecology: Partial<Ecology> = { groundSpeed: 1.5 };
  static override look: Partial<Look> = { build: 0.9, tailShape: 'fan', tailCock: 0.9, beakLength: 0.8 };

  static override behaviors: BehaviorTable<Oxyura> = {
    forage: {
      label: 'Sink and dive',
      cue: 'Slides under without a jump and without much splash, the tail the last thing to go. Unlike a scaup, it also dives to escape rather than flying.',
    },
    bubbleDisplay: {
      label: 'Bubble display',
      cue: 'The drake cocks the tail up over the back, then pounds his bill against the inflated breast so that bubbles boil up around him. Given from late winter on.',
    },
  };

  protected override feeding: Feeding = 'dive';
  protected override diveTime = 2;
  protected override diveSpan = 5;
  protected override runUp = 10;

  *bubbleDisplay(): Script {
    if (!this.world.habitat.water) return;
    yield* this.toWater();
    this.say(this.ecology.call, 3);
    for (let i = 0; i < 6; i++) {
      yield* this.poseTo({ neck: 0.6, neckExt: 0.7, head: 0.3, tailAngle: 1.2 }, 0.12);
      yield* this.poseTo({ neck: 0.2, head: -1.1 }, 0.07);
      this.world.burst('splash', this.pos.x + this.pose.facing * this.size * 0.3, 0, 3);
      yield* this.wait(0.12);
    }
    yield* this.relax(0.3);
  }
}

export class RuddyDuck extends Oxyura {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Oxyura jamaicensis',
    common: 'Ruddy Duck',
    note: 'In winter plumage: gray-brown with a dark cap, a white cheek crossed by a faint line, and a gray-blue bill. The tail is cocked up at rest. Small groups on the bay and coastal ponds, November to March.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'a soft chuck-uck-uck-uck-urrr (the display); otherwise silent',
    presence: [2, 2, 1, 0, 0, 0, 0, 0, 0, 1, 2, 2],
  };

  static override look: Partial<Look> = {
    length: 0.38,
    neckLength: 0.15,
    headSize: 0.7,
    tailLength: 0.35,
    body: '#7a6e62',
    belly: '#d8d2c8',
    head: '#6a5e52',
    cap: '#2e2824',
    throat: '#f2f0ea',
    wing: '#5a5048',
    tail: '#2a2420',
    beak: '#6a7e90',
    legs: '#7a8088',
    eye: '#1a1a1a',
  };
}

// ==================================================================== Geese

export class CacklingGoose extends Branta {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Branta hutchinsii',
    common: 'Cackling Goose',
    note: 'Looks like a small Canada Goose, with a stubby bill, a rounder head and a short neck. Flocks drop in on the fields and shoreline near Gardiner and Sequim in fall, winter and spring.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'a high, yelping bark: ik-ik-ik',
    presence: [1, 1, 1, 2, 1, 0, 0, 0, 1, 2, 2, 1],
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 13, flapRate: 4.5, agility: 0.4 };

  static override look: Partial<Look> = {
    length: 0.65,
    build: 0.8,
    neckLength: 0.4,
    headSize: 0.65,
    beakLength: 0.45,
    head: '#1a1a1a',
    neck: '#1a1a1a',
    throat: '#f6f6f2',
    breast: '#cfc6b4',
    body: '#7e6e5a',
    belly: '#d8d0c0',
    wing: '#665a4a',
    tail: '#1a1a1a',
    beak: '#1a1a1a',
    legs: '#2a2a2a',
  };

  // Small and quick: shorter run, faster pecking than a Canada Goose.
  protected override grazeBites = 7;
  protected override runUp = 5;
}

export abstract class Anser extends Anatidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Anser',
    common: 'Gray and white geese',
    note: 'Geese with orange or pink bills and legs. They migrate in noisy lines and Vs, high up, and graze on fields and shorelines.',
  };

  static override flight: Partial<FlightProfile> = { power: 0.4, agility: 0.3, glide: 0.6, flapRate: 4 };
  static override ecology: Partial<Ecology> = { groundSpeed: 3.5 };
  static override look: Partial<Look> = { neckLength: 0.42, headSize: 0.6, beakLength: 0.7, tailLength: 0.15 };

  static override behaviors: BehaviorTable<Anser> = {
    flyover: {
      label: 'Fly over, calling',
      cue: 'Crosses the bay high up, calling the whole way, and swings round to drop onto the water. Migrating flocks pass over Discovery Bay in spring and fall without stopping, so the voice often comes first.',
    },
  };

  protected override feeding: Feeding = 'graze';
  protected override runUp = 8;
  /** Cruising height of a migrating flock, in stage units. */
  protected altitude = 30;

  protected override restingPose() {
    return { ...super.restingPose(), neck: 1.15, neckExt: 1.1 };
  }

  *flyover(): Script {
    const dir = this.pos.x > 50 ? -1 : 1;
    this.say(this.ecology.call, 4);
    yield* this.flyTo({ x: 50, y: this.altitude }, { land: false });
    yield* this.flyTo({ x: dir > 0 ? 92 : 8, y: this.altitude - 3 }, { land: false });
    yield* this.toWater();
    yield* this.relax();
  }
}

export class SnowGoose extends Anser {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Anser caerulescens',
    common: 'Snow Goose',
    note: 'White with black wingtips, a pink bill with a dark grin patch and pink legs. A passage migrant between the Fraser and Skagit deltas and Dungeness: mostly high flocks overhead in March and April and from October to December, seldom on the bay itself.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'houk-houk-houk (nasal, from a whole flock)',
    presence: [1, 1, 0, 1, 0, 0, 0, 0, 0, 1, 2, 1],
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 15, flapRate: 4 };

  static override look: Partial<Look> = {
    length: 0.7,
    build: 0.75,
    neckLength: 0.4,
    body: '#f8f8f6',
    belly: '#f8f8f6',
    head: '#f8f8f6',
    wing: '#eeeeec',
    tail: '#f4f4f2',
    underwing: '#1c1c1e',
    beak: '#e87a8a',
    legs: '#d86a7a',
    eye: '#2a2420',
  };

  // The highest flocks of any goose here.
  protected override altitude = 38;
}

export class GreaterWhiteFrontedGoose extends Anser {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Anser albifrons',
    common: 'Greater White-fronted Goose',
    note: 'Gray-brown with a white patch around the base of the pink bill, black bars on the belly and orange legs. A migrant in small groups, mostly April and again from September to October, often calling overhead.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'wik-wik-wik, lyo-lyok (high and laughing)',
    presence: [0, 0, 1, 2, 1, 0, 0, 0, 1, 2, 1, 0],
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 14, flapRate: 4.5 };

  static override look: Partial<Look> = {
    length: 0.72,
    build: 0.75,
    body: '#8a7c6a',
    belly: '#d8d0c0',
    head: '#7a6a58',
    throat: '#f6f4ee',
    spots: '#2a2622',
    wing: '#6c6050',
    tail: '#4a4238',
    beak: '#e8885a',
    legs: '#e8902a',
  };

  protected override altitude = 26;
}

// ===================================================================== Coots

export abstract class Gruiformes extends Bird {
  static override taxon: Taxon = {
    rank: 'order',
    name: 'Gruiformes',
    common: 'Cranes, rails and coots',
    note: 'A mixed order of marsh and wetland birds with long legs or long toes. The rails and coots in it are weak, reluctant fliers.',
  };
}

export abstract class Rallidae extends Gruiformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Rallidae',
    common: 'Rails, gallinules and coots',
    note: 'Thin-bodied marsh birds that walk with a jerking head and flicking tail. Coots keep it up on open water, where every stroke of the feet comes with a nod.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 11, power: 0.3, agility: 0.35, braking: 0.2, glide: 0.2, flapRate: 6, ceiling: 10 };
  static override ecology: Partial<Ecology> = { perches: [], gait: 'walk', groundSpeed: 3.5, headBob: true, swims: true, posture: 0.12 };
  static override look: Partial<Look> = { build: 0.8, neckLength: 0.2, legLength: 0.2, tailLength: 0.1, wingSpan: 1.6, headSize: 0.6, beakShape: 'stout', beakLength: 0.6 };

  static override behaviors: BehaviorTable<Rallidae> = {
    paddle: {
      label: 'Swim, head pumping',
      cue: 'The head jerks forward and back with each stroke of the feet, like a pigeon’s on the ground. Ducks and grebes glide with the head still.',
      weight: 2,
    },
    forage: {
      label: 'Dive and graze',
      cue: 'Leans forward and goes under with a small jump, bobbing up like a cork a few yards on with a strand of green in the bill. Unlike a duck it also upends and climbs out to graze on the shore.',
    },
  };

  override *fly(): Script {
    const spot = this.waterSpot();
    if (spot) yield* this.flyOver(spot);
    yield* this.relax();
  }

  *paddle(): Script {
    const water = this.world.habitat.water;
    if (!water) return;
    yield* this.toWater();
    const dir = this.pos.x > 75 ? -1 : 1;
    yield* this.moveOnGround(clamp(this.pos.x + dir * rand(8, 14), water.from + 4, 95));
    yield* this.relax();
  }

  override *forage(): Script {
    const water = this.world.habitat.water;
    if (!water) return;
    yield* this.toWater();
    for (let i = 0; i < 3; i++) {
      yield* this.poseTo({ pitch: -0.3, neck: 0.3, head: -0.8 }, 0.2);
      yield* this.diveUnder(1.6, (this.pos.x > 80 ? -1 : 1) * rand(3, 6), 0.4);
    }
  }
}

export abstract class Fulica extends Rallidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Fulica',
    common: 'Coots',
    note: 'Slate-black swimmers with a white bill and a frontal shield on the forehead. Each toe has its own lobe of skin, so the foot paddles like a webbed one but still grips the ground.',
  };

  static override behaviors: BehaviorTable<Fulica> = {
    patter: {
      label: 'Patter across the water',
      cue: 'Runs along the surface with the wings beating and the feet slapping, for a takeoff or in a chase between rival coots. No duck runs on the water so noisily or for so long.',
    },
  };

  *patter(): Script {
    const water = this.world.habitat.water;
    if (!water) return;
    yield* this.toWater();
    const p = this.pose;
    const dir = this.pos.x < 75 ? 1 : -1;
    const x0 = this.pos.x;
    const to = clamp(x0 + dir * 14, water.from + 3, 96);
    p.facing = dir;
    p.wings = 'open';
    this.say(this.ecology.call, 2);
    yield* this.tween(1.6, (t) => {
      this.pos.x = x0 + (to - x0) * t;
      p.flap = 0.5 * Math.sin(t * 70);
      p.stride = Math.sin(t * 60);
      p.pitch = 0.2;
      if (Math.random() < 0.2) this.world.burst('splash', this.pos.x, 0, 2, -dir);
    });
    p.wings = 'folded';
    yield* this.relax(0.3);
  }
}

export class AmericanCoot extends Fulica {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Fulica americana',
    common: 'American Coot',
    note: 'Slate-black with a white bill, a reddish-brown spot near the tip, and white patches under the tail. Not a duck, though it swims like one. Gathers on the sheltered corners of Discovery Bay from fall to spring.',
  };

  static override ecology: Partial<Ecology> = {
    habitat: 'beach',
    call: 'puhk, puhk, kuk-kuk-kuk (a hollow, clucking croak)',
    presence: [2, 2, 2, 1, 0, 0, 0, 0, 1, 2, 2, 2],
  };

  static override look: Partial<Look> = {
    length: 0.38,
    neckLength: 0.18,
    body: '#3a4044',
    belly: '#4a5156',
    head: '#22272a',
    wing: '#30363a',
    tail: '#22272a',
    beak: '#f1efe8',
    legs: '#a9b070',
    eye: '#8a2a1e',
  };
}

// ============================================================== Plovers, sandpipers

export class SemipalmatedPlover extends Charadrius {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Charadrius semipalmatus',
    common: 'Semipalmated Plover',
    note: 'Brown above, white below, with one dark breast band, an orange bill with a dark tip and orange legs. Smaller than a Killdeer. Migrants stop on the sand and wet gravel at Gardiner in May and from July to September.',
  };

  static override flight: Partial<FlightProfile> = { flapRate: 7 };

  static override ecology: Partial<Ecology> = {
    call: 'chu-WEE (a rising, two-note whistle)',
    presence: [0, 0, 0, 1, 2, 1, 1, 2, 2, 1, 0, 0],
  };

  static override look: Partial<Look> = {
    length: 0.18,
    legLength: 0.3,
    beakLength: 0.4,
    body: '#8c7a62',
    belly: '#f6f4ee',
    head: '#8c7a62',
    throat: '#f6f4ee',
    cap: '#3a3028',
    band: '#25211e',
    wing: '#7a6a54',
    tail: '#6a5c48',
    beak: '#e0902a',
    legs: '#d8902a',
    eye: '#1c1410',
    eyeRing: '#e0a82a',
  };

  // Short dashes and many stops: it hunts the same small patch of gravel.
  protected override runLength = 2.5;
  protected override runCount = 6;
}

export abstract class Numenius extends Scolopacidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Numenius',
    common: 'Curlews',
    note: 'The largest sandpipers, with a long bill that curves downward. They reach into burrows for crabs and worms.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 17, power: 0.5, glide: 0.5, flapRate: 4 };
  static override ecology: Partial<Ecology> = { gait: 'walk', groundSpeed: 5, posture: 0.3 };
  static override look: Partial<Look> = { build: 0.4, neckLength: 0.28, legLength: 0.5, wingSpan: 2.2, headSize: 0.6, beakLength: 3 };

  static override behaviors: BehaviorTable<Numenius> = {
    forage: {
      label: 'Probe for crabs',
      cue: 'Pushes the long bill deep into a burrow and holds it there, then draws out a crab, gives it a shake and swallows it whole. A dowitcher probes with a stitching motion and never pulls out anything this big.',
    },
  };

  override forage(): Script {
    return this.reachProbe();
  }

  *reachProbe(): Script {
    const x = clamp(edgeOf(this.world.habitat.water) - rand(3, 8), 6, 95);
    yield* this.travelTo({ x, y: this.world.floorY(x) });
    const rest = this.restingPose();
    for (let i = 0; i < 3; i++) {
      yield* this.moveOnGround(this.world.clampLand(this.pos.x + rand(-3, 3)));
      yield* this.poseTo({ pitch: rest.pitch - 0.5, neck: -0.2, head: -1.1 }, 0.2);
      yield* this.wait(rand(0.5, 0.9));
      yield* this.poseTo({ pitch: rest.pitch, neck: rest.neck, head: 0.1 }, 0.25);
      this.pose.carry = 'clam';
      yield* this.poseTo({ head: 0.5 }, 0.12);
      this.pose.carry = null;
      yield* this.relax(0.2);
    }
  }
}

export class Whimbrel extends Numenius {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Numenius phaeopus',
    common: 'Whimbrel',
    note: 'A large, brown shorebird with a bill bent sharply down and a striped crown with a pale center. Migrants work the Gardiner tideline and the Miller Peninsula beaches in May and from July to September.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'a rapid, rippling whistle: bibibibibibibi',
    presence: [0, 0, 0, 1, 2, 0, 1, 2, 2, 0, 0, 0],
  };

  static override look: Partial<Look> = {
    length: 0.43,
    body: '#8a7660',
    belly: '#d8d0c0',
    head: '#8a7660',
    cap: '#4e4034',
    eyeLine: '#f0e8d8',
    breast: '#b8a890',
    wing: '#7a6650',
    tail: '#6a5a46',
    beak: '#2a2420',
    legs: '#5a6068',
    eye: '#1c1410',
  };
}

export abstract class Limnodromus extends Scolopacidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Limnodromus',
    common: 'Dowitchers',
    note: 'Medium sandpipers with a very long, straight bill. They feed in dense flocks in belly-deep water, probing the mud without looking up.',
  };

  static override flight: Partial<FlightProfile> = { flapRate: 6, cruiseSpeed: 15 };
  static override ecology: Partial<Ecology> = { gait: 'walk', groundSpeed: 5, posture: 0.2 };
  static override look: Partial<Look> = { build: 0.5, neckLength: 0.12, legLength: 0.35, headSize: 0.6, beakShape: 'needle', beakLength: 2.4 };

  // Wades out past the edge and probes far more often than a peep does.
  protected override feedOffset = 3;
  protected override probeStitch = 10;
  protected override probeBouts = 4;
}

export class ShortBilledDowitcher extends Limnodromus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Limnodromus griseus',
    common: 'Short-billed Dowitcher',
    note: 'A stocky sandpiper with a bill about three times the length of the head, a pale line over the eye and a white wedge up the back in flight. Breeding birds are orange below. Migrants on the Discovery Bay flats in May and from July to September.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'tu-tu-tu (a quick, mellow triple whistle)',
    presence: [0, 0, 0, 1, 2, 0, 2, 2, 1, 0, 0, 0],
  };

  static override look: Partial<Look> = {
    length: 0.28,
    body: '#7a6a58',
    belly: '#c9824f',
    head: '#8a7a68',
    cap: '#4a3e32',
    eyeLine: '#efe6d4',
    spots: '#3a3028',
    wing: '#5f5448',
    tail: '#d8d0c0',
    beak: '#2a2a2a',
    legs: '#8a9a5a',
    eye: '#1a1410',
  };
}

export abstract class Phalaropus extends Scolopacidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Phalaropus',
    common: 'Phalaropes',
    note: 'Sandpipers that swim, with lobed toes. The female is the brighter sex and the male raises the young. Outside the breeding season they live on the open sea.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 14, flapRate: 9, agility: 0.8 };
  static override ecology: Partial<Ecology> = { gait: 'walk', groundSpeed: 2.5, swims: true, posture: 0.2 };
  static override look: Partial<Look> = { build: 0.5, neckLength: 0.18, legLength: 0.15, headSize: 0.7, beakShape: 'needle', beakLength: 1.1 };

  static override behaviors: BehaviorTable<Phalaropus> = {
    forage: {
      label: 'Spin on the water',
      cue: 'Swims in quick circles, sometimes ten or more in a row, then picks at the surface. The spin pulls small animals up from below. No other sandpiper swims at all.',
    },
  };

  override *fly(): Script {
    const spot = this.waterSpot();
    if (spot) yield* this.flyOver(spot);
    yield* this.relax();
  }

  override *probe(): Script {
    if (!this.world.habitat.water) return;
    yield* this.toWater();
    const p = this.pose;
    for (let i = 0; i < 5; i++) {
      for (let k = 0; k < 4; k++) {
        p.facing = p.facing === 1 ? -1 : 1;
        yield* this.wait(0.08);
      }
      this.world.burst('splash', this.pos.x, 0, 2);
      yield* this.poseTo({ neck: 0.2, head: -0.9 }, 0.08);
      yield* this.poseTo({ neck: 0.95, head: 0 }, 0.08);
    }
    yield* this.relax();
  }
}

export class RedNeckedPhalarope extends Phalaropus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Phalaropus lobatus',
    common: 'Red-necked Phalarope',
    note: 'A tiny, needle-billed swimmer. Gray above with a white throat and a rusty neck band in breeding plumage; in fall, gray and white with a dark eye patch. Seen on tide rips and quiet water off Gardiner in May and from July to September.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'a short, sharp kirrit',
    presence: [0, 0, 0, 0, 2, 0, 1, 2, 2, 0, 0, 0],
  };

  static override look: Partial<Look> = {
    length: 0.18,
    body: '#4e5660',
    belly: '#f6f4ee',
    head: '#4a5560',
    neck: '#c0552e',
    throat: '#f6f4ee',
    wing: '#555d66',
    wingBar: '#f4f2ea',
    tail: '#454c54',
    beak: '#1a1a1a',
    legs: '#4a5058',
    eye: '#111111',
  };
}

export abstract class Gallinago extends Scolopacidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Gallinago',
    common: 'Snipes',
    note: 'Short-legged, long-billed sandpipers of wet ground. Streaked plumage hides them in grass, and they sit tight until almost stepped on.',
  };

  static override flight: Partial<FlightProfile> = { flapRate: 8, agility: 0.85 };
  static override ecology: Partial<Ecology> = { gait: 'walk', groundSpeed: 3, posture: 0.25 };
  static override look: Partial<Look> = { build: 0.55, neckLength: 0.08, legLength: 0.25, headSize: 0.7, beakLength: 2.4 };

  static override behaviors: BehaviorTable<Gallinago> = {
    flush: {
      label: 'Freeze, then flush',
      cue: 'Crouches motionless in the grass for seconds, then explodes upward with a harsh rasp and zigzags away before it climbs and circles back. Most people only ever see this part.',
    },
  };

  // Stays up in the wet grass behind the sand and probes fast.
  protected override feedOffset = -10;
  protected override probeStitch = 6;

  *flush(): Script {
    yield* this.toGround();
    yield* this.poseTo({ crouch: 0.45, pitch: 0.05, neck: 0.7 }, 0.25);
    yield* this.wait(rand(1.2, 2));
    this.say(this.ecology.call, 1.5);
    const x0 = this.pos.x;
    const dir = x0 > 30 ? -1 : 1;
    for (let i = 0; i < 4; i++) {
      yield* this.flyTo({ x: clamp(x0 + dir * 5 * (i + 1), 2, 98), y: (i % 2 ? 8 : 4) + 3 * i }, { land: false, speed: 1.4 });
    }
    yield* this.flyTo(this.groundSpot(x0, 8));
    yield* this.relax();
  }
}

export class WilsonsSnipe extends Gallinago {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Gallinago delicata',
    common: 'Wilson’s Snipe',
    note: 'Cryptic brown and buff, striped on the head and back, with a very long bill, short legs and a rusty tail. Winters in the wet grass above the beach at Gardiner and the Miller Peninsula, and flushes at close range.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'scaip! (a harsh rasp when flushed)',
    presence: [2, 2, 2, 1, 0, 0, 0, 1, 1, 2, 2, 2],
  };

  static override look: Partial<Look> = {
    length: 0.27,
    body: '#7a6448',
    belly: '#f0ebe0',
    head: '#6e5a40',
    cap: '#3e3226',
    eyeLine: '#e8d8b0',
    spots: '#d0b070',
    wing: '#6e5a40',
    tail: '#a8643a',
    beak: '#7a6a50',
    legs: '#9aa070',
    eye: '#1a1410',
  };
}

// ====================================================================== Terns

export abstract class Sterna extends Laridae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Sterna',
    common: 'Typical terns',
    note: 'Slim, long-winged, fork-tailed birds with a black cap and a thin, pointed bill. They fly with the bill pointed down, looking for fish.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 11, agility: 0.8, hover: 0.5, glide: 0.5, flapRate: 4, flapDuty: 1 };
  static override look: Partial<Look> = { build: 0.35, headSize: 0.7, legLength: 0.1, tailLength: 0.35, tailShape: 'forked', wingSpan: 2.6, beakShape: 'dagger', beakLength: 1 };

  static override behaviors: BehaviorTable<Sterna> = {
    forage: {
      label: 'Hover and plunge',
      cue: 'Flies slowly with the head and bill pointed down, stops in a short hover, then folds and drops. If it misses it climbs and tries again a short way on. Smaller than a Caspian Tern, with a thin bill and quicker, lighter wingbeats.',
    },
  };

  /** Tries before it gives up and goes back to the post. */
  protected attempts = 3;

  override forage(): Script {
    return this.plungeDive();
  }

  *plungeDive(): Script {
    const water = this.world.habitat.water;
    if (!water) return;
    const x = water.from + rand(10, 24);
    yield* this.flyTo({ x: x - 6, y: 7 }, { land: false });
    let caught = false;
    for (let i = 0; i < this.attempts && !caught; i++) {
      const at = x + i * 6;
      yield* this.flyTo({ x: at, y: 6 }, { land: false, speed: 0.6 });
      yield* this.hoverFor(1, { aim: -1.2 });
      yield* this.flyTo({ x: at + 1, y: -1 }, { land: false, speed: 1.8 });
      this.world.burst('splash', this.pos.x, 0, 8);
      yield* this.wait(0.25);
      caught = Math.random() < 0.5;
      this.vel = { x: 0, y: 8 };
    }
    if (caught) this.pose.carry = 'fish';
    yield* this.flyTo(this.findPerch() ?? this.groundSpot(water.from - 8, 6));
    if (caught) {
      yield* this.poseTo({ head: 0.7, neck: 1.2 }, 0.15);
      this.pose.carry = null;
    }
    yield* this.relax();
  }
}

export class CommonTern extends Sterna {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Sterna hirundo',
    common: 'Common Tern',
    note: 'Pale gray above, white below, with a black cap, a red bill with a dark tip and a deeply forked tail. Small numbers pass through Discovery Bay in May and from July to September, usually over the tide rips.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'kee-arr (drawn out and falling)',
    presence: [0, 0, 0, 0, 1, 0, 1, 2, 2, 1, 0, 0],
  };

  static override look: Partial<Look> = {
    length: 0.33,
    body: '#f6f6f4',
    belly: '#eef0f0',
    head: '#f6f6f4',
    cap: '#1b1b1b',
    wing: '#a8b0b8',
    tail: '#f2f2ef',
    beak: '#d94a2c',
    legs: '#d8402a',
    eye: '#1a1410',
  };
}

// ================================================================== Jaegers

export abstract class Stercorariidae extends Charadriiformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Stercorariidae',
    common: 'Skuas and jaegers',
    note: 'Dark, hawk-like seabirds with a hooked bill. They spend the nonbreeding season at sea, where they steal food from gulls and terns.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 16, power: 0.7, agility: 0.85, braking: 0.4, glide: 0.6, flapRate: 4, flapDuty: 0.8, cyclePeriod: 2 };
  static override ecology: Partial<Ecology> = { habitat: 'beach', perches: ['rock', 'post'], gait: 'walk', groundSpeed: 3, posture: 0.15 };
  static override look: Partial<Look> = { build: 0.5, headSize: 0.7, legLength: 0.15, tailLength: 0.3, wingSpan: 2.6, beakShape: 'hook', beakLength: 0.7 };

  static override behaviors: BehaviorTable<Stercorariidae> = {
    forage: {
      label: 'Chase and rob a tern',
      cue: 'Shadows a tern or gull carrying a fish, matching every twist and turn at speed until the victim drops it. The jaeger then swoops down and catches the fish before it hits the water.',
    },
  };

  override forage(): Script {
    return this.pirate();
  }

  *pirate(): Script {
    const water = this.world.habitat.water;
    if (!water) return;
    const x0 = water.from + rand(14, 22);
    yield* this.flyTo({ x: x0, y: 8 }, { land: false, speed: 1.2 });
    for (let i = 0; i < 4; i++) {
      yield* this.flyTo({ x: x0 + 4 * i, y: i % 2 ? 12 : 6 }, { land: false, speed: 1.5 });
    }
    const dir = this.pose.facing;
    const fish = this.world.emit('fish', this.pos.x + dir * 4, this.pos.y - 1, { gravity: 30, floor: 0, life: 2 });
    yield* this.flyTo({ x: this.pos.x + dir * 6, y: 1.2 }, { land: false, speed: 1.8 });
    fish.life = 0;
    this.pose.carry = 'fish';
    yield* this.flyTo({ x: clamp(this.pos.x + dir * 8, water.from + 2, 95), y: 5 }, { land: false });
    yield* this.flyTo(this.findPerch() ?? this.groundSpot(water.from - 8, 6));
    yield* this.poseTo({ head: 0.7, neck: 1.2 }, 0.15);
    this.pose.carry = null;
    yield* this.relax();
  }
}

export abstract class Stercorarius extends Stercorariidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Stercorarius',
    common: 'Jaegers',
    note: 'Gull-sized, falcon-like piracy specialists. The central tail feathers project as a short point or a long streamer, depending on the species.',
  };

  static override look: Partial<Look> = { tailShape: 'pointed' };
}

export class ParasiticJaeger extends Stercorarius {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Stercorarius parasiticus',
    common: 'Parasitic Jaeger',
    note: 'Dark brown or pale-bellied, with a white flash at the base of the primaries and a short pointed tail. Fast and falcon-like. A fall migrant off Gardiner and Protection Island, chasing terns and Bonaparte’s Gulls over the tide rips, August to October.',
  };

  static override ecology: Partial<Ecology> = {
    habitat: 'beach',
    call: 'a nasal, mewing ka-wow (rarely heard away from the nest)',
    presence: [0, 0, 0, 0, 1, 0, 0, 1, 2, 2, 1, 0],
  };

  static override look: Partial<Look> = {
    length: 0.46,
    body: '#6a6358',
    belly: '#f2efe6',
    head: '#6a6358',
    cap: '#2c2824',
    throat: '#f2efe6',
    wing: '#4e4840',
    wingBar: '#f2efe6',
    tail: '#3a3630',
    beak: '#2e2c2a',
    legs: '#2a2a2a',
    eye: '#1a1410',
  };
}

// ================================================================== Murrelets

export abstract class Synthliboramphus extends Alcidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Synthliboramphus',
    common: 'Pacific murrelets',
    note: 'Small, round-bodied auks that nest in burrows on islands. The chicks leave for the sea within days. Unlike the Brachyramphus murrelets they stay at sea and winter in flocks.',
  };

  static override flight: Partial<FlightProfile> = { flapRate: 10, ceiling: 4 };

  protected override diveTime = 2.2;
  protected override diveReach = 7;
  protected override diveLeap = 0.2;

  static override behaviors: BehaviorTable<Synthliboramphus> = {
    scurry: {
      label: 'Scurry and flush',
      cue: 'When a boat or an eagle approaches, runs across the water with the wings whirring and then skims off just above the waves. A Marbled Murrelet flushes with a similar run but climbs and flies off higher.',
    },
  };

  *scurry(): Script {
    const water = this.world.habitat.water;
    if (!water) return;
    yield* this.toWater();
    const p = this.pose;
    const dir = this.pos.x < 75 ? 1 : -1;
    const x0 = this.pos.x;
    const to = clamp(x0 + dir * 10, water.from + 2, 96);
    p.facing = dir;
    p.wings = 'open';
    yield* this.tween(1.4, (t) => {
      this.pos.x = x0 + (to - x0) * t;
      p.flap = Math.sin(t * 56);
      p.stride = Math.sin(t * 40);
      p.pitch = 0.25;
      if (Math.random() < 0.3) this.world.burst('splash', this.pos.x, 0, 1, -dir);
    });
    yield* this.flyTo({ x: clamp(to + dir * 20, 2, 98), y: 1.8 }, { land: false });
    yield* this.toWater();
    yield* this.relax();
  }
}

export class AncientMurrelet extends Synthliboramphus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Synthliboramphus antiquus',
    common: 'Ancient Murrelet',
    note: 'Black head and throat, a white streak behind the eye, a gray back, a pale bill and white underparts. Small flocks come into the Strait of Juan de Fuca and Discovery Bay late in the fall and are rare after January.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'a thin, whistled chirp, often from a flock',
    presence: [1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 2],
  };

  static override look: Partial<Look> = {
    length: 0.25,
    build: 0.8,
    beakShape: 'stout',
    beakLength: 0.55,
    body: '#5a6068',
    belly: '#f4f3ef',
    head: '#1e1e22',
    throat: '#1c1c20',
    eyeLine: '#f6f6f2',
    wing: '#4e545a',
    tail: '#3e444a',
    beak: '#e8e0d0',
    legs: '#8a8e90',
    eye: '#111111',
  };
}

// ==================================================================== Pelicans

export abstract class Pelecanidae extends Pelecaniformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Pelecanidae',
    common: 'Pelicans',
    note: 'Huge birds with a throat pouch hung from a very long bill. The pouch scoops fish and drains water before the bird swallows.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 12, power: 0.25, agility: 0.2, braking: 0.15, glide: 0.85, flapRate: 2.2, flapDuty: 0.5, cyclePeriod: 4, ceiling: 25 };
  static override ecology: Partial<Ecology> = { perches: ['post', 'rock', 'log'], gait: 'walk', groundSpeed: 2, posture: 0.2 };
  static override look: Partial<Look> = { build: 0.7, neckLength: 0.4, legLength: 0.1, tailLength: 0.18, wingSpan: 1.75, headSize: 0.45, beakShape: 'stout', beakLength: 2.4 };

  static override behaviors: BehaviorTable<Pelecanidae> = {
    skim: {
      label: 'Skim the swell',
      cue: 'Glides in a line just above the water with the wingtips close to the surface, flapping a few times and then gliding again. The air cushion under the wings saves energy. Cormorants flap continuously and fly lower.',
    },
  };

  protected override restingPose() {
    return { ...super.restingPose(), neck: 1.25, neckExt: 0.6 };
  }

  *skim(): Script {
    const water = this.world.habitat.water;
    if (!water) return;
    yield* this.flyTo({ x: water.from + 4, y: 1.6 }, { land: false });
    yield* this.flyTo({ x: water.from + rand(28, 34), y: 1.2 }, { land: false, glide: true });
    yield* this.flyTo(this.findPerch() ?? this.groundSpot(water.from - 8, 6));
    yield* this.relax();
  }
}

export abstract class Pelecanus extends Pelecanidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Pelecanus',
    common: 'Pelicans',
    note: 'The only genus of pelicans. The white species feed together by herding fish in the shallows; the Brown Pelican is the one that dives.',
  };
}

export class BrownPelican extends Pelecanus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Pelecanus occidentalis',
    common: 'Brown Pelican',
    note: 'Gray-brown and very large, with a pale yellow head and a long bill and pouch. Adults in breeding plumage have a chestnut hind neck. After breeding in California and Mexico, a few come north to the Salish Sea in late summer and fall, and one may turn up on a Gardiner piling or over the bay.',
  };

  static override ecology: Partial<Ecology> = {
    habitat: 'beach',
    call: 'usually silent; the young give a hoarse croak',
    presence: [0, 0, 0, 0, 0, 0, 1, 1, 2, 2, 1, 0],
  };

  static override look: Partial<Look> = {
    length: 1.15,
    body: '#6d6860',
    belly: '#4a3c32',
    head: '#f4eed0',
    cap: '#f2e4a0',
    neck: '#5a3a28',
    wing: '#7d786e',
    tail: '#6a655c',
    beak: '#a09a8a',
    legs: '#2a2a2a',
    eye: '#2a2420',
  };

  static override behaviors: BehaviorTable<BrownPelican> = {
    forage: {
      label: 'Plunge-dive',
      cue: 'Circles 30 feet or more above the water, then folds the wings and drops headfirst with a huge splash. It comes up with the pouch full, tips the bill down to drain the water, then swallows. No other large waterbird here dives from this height.',
    },
  };

  override forage(): Script {
    return this.plungeDive();
  }

  *plungeDive(): Script {
    const water = this.world.habitat.water;
    if (!water) return;
    const x = water.from + rand(12, 26);
    yield* this.flyTo({ x: x - 12, y: 14 }, { land: false });
    yield* this.flyTo({ x: x - 2, y: 15 }, { land: false, speed: 0.6 });
    yield* this.flyTo({ x, y: -1.2 }, { land: false, speed: 2.2 });
    this.world.burst('splash', x, 0, 16);
    yield* this.wait(0.4);
    const caught = Math.random() < 0.55;
    if (caught) this.pose.carry = 'fish';
    this.vel = { x: 0, y: 8 };
    this.world.burst('splash', x, 0, 6);
    yield* this.flyTo(this.findPerch() ?? this.groundSpot(water.from - 8, 6));
    if (caught) {
      yield* this.poseTo({ head: -1.2, neck: 0.8 }, 0.3);
      yield* this.wait(0.5);
      yield* this.poseTo({ head: 0.9, neck: 1.3 }, 0.2);
      this.pose.carry = null;
    }
    yield* this.relax();
  }
}
