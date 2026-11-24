/**
 * Waterfowl: order Anseriformes, family Anatidae. Sixteen species in ten genera,
 * all swimmers. They split three ways by how they feed (dabbling, diving,
 * grazing), and the shared feeding routines live on Anatidae and read per-class
 * numbers, so a teal and a swan upend by the same code and look nothing alike.
 */
import { Bird, clamp, rand } from '../core/Bird';
import type { BehaviorTable, Ecology, FlightProfile, Look, Script, Taxon } from '../core/traits';

type Feeding = 'dabble' | 'dive' | 'graze';

// ============================================================= Anseriformes

export abstract class Anseriformes extends Bird {
  static override taxon: Taxon = {
    rank: 'order',
    name: 'Anseriformes',
    common: 'Waterfowl',
    note: 'Ducks, geese and swans: broad flat bills with comb-like edges for straining food, webbed feet set well back, and dense waterproof down. They swim far better than they walk.',
  };

  static override ecology: Partial<Ecology> = { habitat: 'beach', perches: [], gait: 'walk', groundSpeed: 3, swims: true, posture: 0.12 };
  static override look: Partial<Look> = { beakShape: 'stout', legsTrail: false };
}

export abstract class Anatidae extends Anseriformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Anatidae',
    common: 'Ducks, geese and swans',
    note: 'The only family of waterfowl in North America. The three ways of feeding sort it: dabblers tip up in the shallows, divers go under, geese and swans graze. Heavy bodies and short wings mean a run across the water before takeoff.',
  };

  static override flight: Partial<FlightProfile> = {
    cruiseSpeed: 14,
    power: 0.45,
    agility: 0.4,
    braking: 0.3,
    glide: 0.5,
    flapRate: 5,
    flapDuty: 1,
  };

  static override look: Partial<Look> = {
    build: 0.75,
    neckLength: 0.3,
    legLength: 0.1,
    tailLength: 0.2,
    wingSpan: 1.6,
    headSize: 0.55,
    beakLength: 1,
  };

  static override behaviors: BehaviorTable<Anatidae> = {
    forage: {
      eats: { beach: 'eelgrass', yard: 'grass' },
      label: 'Feed',
      cue: 'The way it feeds sorts the family. Tail-up with the head under, bobbing on the surface: a dabbler. Bill-first dive and a long wait: a diver. Walking and cropping like a lawnmower: a goose or swan.',
    },
    takeoffRun: {
      label: 'Take off from the water',
      needs: 'water',
      cue: 'Dabbling ducks spring almost straight up. Diving ducks, geese and swans have to patter along the surface, flapping hard, before they lift. The heavier the bird, the longer the run.',
    },
  };

  /** What forage() does. */
  protected feeding: Feeding = 'dabble';
  /** How far down it reaches when it upends: 0.5 is a teal, 2 is a swan. */
  protected reach = 1;
  protected diveTime = 2;
  protected diveSpan = 8;
  /** Forward jump into a dive, in stage units. */
  protected diveLeap = 0;
  protected diveCount = 3;
  /** Seconds spent looking underwater, face down, before each dive. */
  protected lookFirst = 0;
  /** What it brings up, if anything. */
  /** Stage units of surface run before it leaves the water. */
  protected runUp = 8;
  protected grazeBites = 4;

  override *forage(): Script {
    if (this.feeding === 'dive') yield* this.diveBout();
    else if (this.feeding === 'graze') yield* this.grazeOnLand();
    else yield* this.tipUp();
  }

  *takeoffRun(): Script {
    const water = this.world.habitat.water;
    if (!water) return;
    if (!this.afloat) yield* this.travelTo({ x: water.from + rand(8, 30), y: 0 });
    if (!this.afloat) return;
    const p = this.pose;
    const dir = this.pos.x < 75 ? 1 : -1;
    p.facing = dir;
    const x0 = this.pos.x;
    const to = clamp(x0 + dir * this.runUp, water.from + 2, 96);
    const secs = 0.25 + 0.08 * this.runUp;
    p.wings = 'open';
    yield* this.tween(secs, (t) => {
      this.pos.x = x0 + (to - x0) * t;
      p.flap = Math.sin(t * secs * 28);
      p.stride = Math.sin(t * secs * 20);
      p.pitch = 0.1 + 0.3 * t;
    });
    this.world.burst('splash', to, 0, 3 + Math.round(this.runUp / 3), -dir);
    yield* this.flyTo({ x: clamp(to + dir * 14, 2, 98), y: 9 }, { land: false });
    yield* this.toWater();
  }

  /** Head under and tail up, feet paddling to hold position. */
  protected *tipUp(): Script {
    const water = this.world.habitat.water;
    if (!water) return;
    yield* this.toWater();
    const p = this.pose;
    for (let i = 0; i < 3; i++) {
      // Out over the deeper end of the weed bed, where reaching the bottom takes upending: the bill, which
      // comes down a head and neck ahead of the body, over the weed.
      const m = this.mealRange();
      yield* this.moveOnGround(m ? clamp(rand(m[1] - 3, m[1] - 0.5) - this.groundReach, water.from + 4, 94) : this.foodSpot(6).x);
      // Head and neck straight down, then the neck stretches and the stern tips up until the bill is on
      // the bottom. In the shallows that is only the neck; in deeper water the bird upends as far as it can.
      p.facing = 1;
      yield* this.reachDown({ neck: -1.45, neckExt: 0.25, head: -1.5 }, 0.2);
      yield* this.reachDown({ neckExt: 0.8 + 0.4 * this.reach }, 0.25);
      yield* this.reachDown({ pitch: -clamp(0.5 + 0.5 * this.reach, 0.5, 1.4) }, 0.25);
      for (let t = 0; t < 0.8 + 0.6 * this.reach; ) {
        t += yield;
        p.stride = Math.sin(t * 10) * 0.6;
      }
      p.stride = 0;
      // Up with a beakful of weed.
      if (this.atFood()) this.take();
      yield* this.relax(0.3);
      yield* this.wait(rand(0.2, 0.6));
    }
  }

  protected *diveBout(): Script {
    if (!this.world.habitat.water) return;
    yield* this.toWater();
    for (let i = 0; i < this.diveCount; i++) {
      yield* this.beforeDive();
      const m = this.mealRange();
      const dir = m ? ((m[0] + m[1]) / 2 > this.pos.x ? 1 : -1) : this.pos.x > 80 ? -1 : this.pos.x < 68 ? 1 : Math.random() < 0.5 ? -1 : 1;
      yield* this.diveUnder(this.diveTime, dir * Math.min(this.diveSpan * rand(0.7, 1.1), m ? Math.abs((m[0] + m[1]) / 2 - this.pos.x) + 4 : Infinity), this.diveLeap);
      if (this.pose.carry) yield* this.swallow();
    }
  }

  /** Runs just before each dive. Face-down looking by default. */
  protected *beforeDive(): Script {
    if (this.lookFirst <= 0) return;
    yield* this.poseTo({ neck: 0.1, head: -1.3, pitch: -0.1 }, 0.25);
    yield* this.wait(this.lookFirst);
  }

  /** Swallow what it came up with, head back, at the surface. */
  protected *swallow(): Script {
    this.hold(this.pose.carry);
    yield* this.poseTo({ neck: 1.2, head: 0.5 }, 0.15);
    yield* this.wait(0.4);
    this.hold(null);
    yield* this.relax(0.15);
  }

  /** Walk ashore and crop low plants. */
  protected *grazeOnLand(): Script {
    yield* this.travelTo(this.mealRange(true) ? this.foodSpot(4) : { x: this.world.clampLand(this.world.habitat.land[1] - rand(2, 18)), y: 0 });
    for (let i = 0; i < this.grazeBites; i++) {
      yield* this.moveOnGround(this.foodSpot(5).x);
      yield* this.peck(Math.ceil(rand(2, 4)), 0.9);
    }
    yield* this.lookAround(1.2);
    yield* this.relax();
  }
}

// ================================================================== Dabblers

export abstract class Anas extends Anatidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Anas',
    common: 'Dabbling ducks',
    note: 'Surface feeders. Their legs sit near the middle of the body, so they walk and climb out easily, and their wings lift them straight off the water. A bright speculum on the wing is common.',
  };

  static override flight: Partial<FlightProfile> = { power: 0.6, agility: 0.55 };

  static override behaviors: BehaviorTable<Anas> = {
    forage: {
      label: 'Dabble and tip up',
      cue: 'Stern in the air, head and neck under, feet paddling to hold position while it pulls eelgrass and other weed off the bottom. It reaches only as far as its neck allows, so the length of the upended stretch of body tells long-necked Pintails from short-necked Teal. A diving duck never does this.',
    },
  };

  protected override runUp = 2;
}

export class Mallard extends Anas {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Anas platyrhynchos',
    common: 'Mallard',
    note: 'Drake: green head, white collar, chestnut breast, yellow bill, curled black tail feathers. Hen: mottled brown with an orange bill. Along the shore of Discovery Bay and the Gardiner Beach creek mouth all year, often tame.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'QUACK, quack-quack-quack (the hen); the drake gives a soft rhaeb',
    presence: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  };

  static override flight: Partial<FlightProfile> = { flapRate: 5, cruiseSpeed: 15 };

  static override look: Partial<Look> = {
    length: 0.58,
    build: 0.8,
    tailCock: 0.35,
    head: '#1f6a42',
    neck: '#f4f4f0',
    breast: '#6b3a2a',
    body: '#a9a49a',
    belly: '#c9c5bc',
    wing: '#8b8478',
    wingBar: '#2a4a9a',
    tail: '#2a2a2a',
    beak: '#dcc02a',
    legs: '#e07a2a',
  };
}

export class NorthernPintail extends Anas {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Anas acuta',
    common: 'Northern Pintail',
    note: 'Slim and long-necked. The drake has a chocolate head, a white stripe up the neck and a needle-like central tail. Scarce winter visitor on Discovery Bay, more often seen in the fields and sloughs toward Dungeness.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'prrip, prrip (the drake’s soft double whistle); the hen gives a weak quack',
    presence: [2, 2, 1, 1, 0, 0, 0, 0, 1, 1, 2, 2],
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 16, flapRate: 5.5, agility: 0.6 };

  static override look: Partial<Look> = {
    length: 0.66,
    build: 0.6,
    neckLength: 0.42,
    tailLength: 0.4,
    tailShape: 'pointed',
    head: '#6e4c38',
    neck: '#f6f6f2',
    throat: '#f6f6f2',
    breast: '#f6f6f2',
    body: '#a8a8a2',
    belly: '#f2f2ee',
    wing: '#8d8a82',
    wingBar: '#7a5a2a',
    tail: '#1f1f1f',
    beak: '#5a6a78',
    legs: '#6b7480',
  };

  protected override reach = 1.6;
}

export class GreenWingedTeal extends Anas {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Anas crecca',
    common: 'Green-winged Teal',
    note: 'The smallest dabbler. The drake has a chestnut head with a green eye patch, a vertical white bar on the shoulder and a buff patch under the tail. Small groups on the creek mouth and sheltered shore at Gardiner in winter.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'krick, krick (the drake’s high, ringing whistle)',
    presence: [2, 2, 2, 1, 0, 0, 0, 1, 1, 2, 2, 2],
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 15, power: 0.75, agility: 0.75, flapRate: 8 };

  static override look: Partial<Look> = {
    length: 0.36,
    build: 0.7,
    neckLength: 0.22,
    headSize: 0.6,
    beakLength: 0.8,
    head: '#a8523a',
    eyeLine: '#2f8a4a',
    breast: '#c8a888',
    spots: '#3a3a3a',
    band: '#f4f4f0',
    body: '#9a9a94',
    belly: '#f2f0e8',
    wing: '#8a8478',
    wingBar: '#2f9a4a',
    tail: '#2a2a2a',
    beak: '#2a2a2a',
    legs: '#7a7a80',
  };

  protected override reach = 0.5;
  // Teal jump almost vertically; the run is a hop.
  protected override runUp = 0.5;
}

export abstract class Mareca extends Anatidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Mareca',
    common: 'Wigeons',
    note: 'Short-billed dabblers that eat as much plant matter as any duck, grazing on land and plucking eelgrass and algae from the surface.',
  };

  static override flight: Partial<FlightProfile> = { power: 0.6, agility: 0.55 };

  static override behaviors: BehaviorTable<Mareca> = {
    forage: {
      label: 'Pluck at the surface',
      cue: 'Mostly stays level, dipping the bill to pull weed off the surface or off the bottom of the shallows, with little tipping up. Compare the Mallard’s full upend.',
    },
    graze: {
      eats: 'grass',
      label: 'Graze ashore',
      feeding: true,
      cue: 'Comes up the beach and crops short grass like a small goose, walking steadily with the head low. Mallards and Pintails seldom do this.',
    },
  };

  protected override runUp = 3;
  protected override grazeBites = 5;

  graze(): Script {
    return this.grazeOnLand();
  }
}

export class AmericanWigeon extends Mareca {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Mareca americana',
    common: 'American Wigeon',
    note: 'Drake: white crown, green swath behind the eye, pinkish flanks and a small pale-blue bill with a black tip. Rafts of whistling birds on Discovery Bay from fall to early spring, and often seen grazing at the edge of Gardiner Beach.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'whee-whee-WHEW (the drake’s three-note whistle)',
    presence: [3, 3, 2, 1, 0, 0, 0, 0, 1, 2, 3, 3],
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 14, flapRate: 6 };

  static override look: Partial<Look> = {
    length: 0.5,
    neckLength: 0.24,
    beakLength: 0.7,
    head: '#9a9a94',
    cap: '#f1ead0',
    eyeLine: '#2f6b4a',
    breast: '#c0806a',
    body: '#b8806a',
    belly: '#f6f6f2',
    wing: '#8a8680',
    wingBar: '#f6f6f2',
    tail: '#2a2a2a',
    beak: '#9aa8b8',
    legs: '#7a7a80',
  };

  protected override reach = 0.6;
}

// =============================================================== Sea ducks

export abstract class Bucephala extends Anatidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Bucephala',
    common: 'Goldeneyes and Bufflehead',
    note: 'Compact, big-headed diving ducks that nest in tree cavities. The drakes court by throwing the head back, a display that differs by species.',
  };

  static override flight: Partial<FlightProfile> = { power: 0.35, agility: 0.5, flapRate: 8 };
  static override look: Partial<Look> = { beakLength: 0.6 };

  static override behaviors: BehaviorTable<Bucephala> = {
    forage: {
      eats: 'shellfish',
      label: 'Dive',
      cue: 'Pops up and down with a small forward jump, spending only a few seconds under, and comes up with a small mussel or crab from the bottom. It surfaces within a few yards of where it went down.',
    },
    headThrow: {
      label: 'Head-throw display',
      cue: 'Winter and early spring. The head is flung back until the crown touches the rump, bill pointing at the sky, then snapped forward with a splash of the feet. The Goldeneye’s throw is wide and slow, the Bufflehead’s is a quick nod.',
    },
  };

  protected override feeding: Feeding = 'dive';
  protected override diveLeap = 0.3;
  protected override runUp = 9;
  /** How far back the head goes in the courtship throw: 1 is full. */
  protected throwForce = 1;

  *headThrow(): Script {
    yield* this.toWater();
    const k = this.throwForce;
    this.say(this.ecology.call, 2);
    for (let i = 0; i < 3; i++) {
      yield* this.poseTo({ neck: 0.5, neckExt: 0.7, head: -0.4 }, 0.12);
      yield* this.poseTo({ neck: 1.3 + 0.5 * k, neckExt: 1, head: 1.1 * k, pitch: 0.25 * k, beakOpen: 0.5 }, 0.1 + 0.1 * k);
      yield* this.wait(0.2);
      yield* this.poseTo({ neck: 0.2, head: -0.2, pitch: -0.1, beakOpen: 0 }, 0.08);
      this.world.burst('splash', this.pos.x + this.pose.facing * this.size * 0.4, 0, 3);
      yield* this.relax(0.2);
      yield* this.wait(0.3);
    }
  }
}

export class Bufflehead extends Bucephala {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Bucephala albeola',
    common: 'Bufflehead',
    note: 'Our smallest diving duck. The drake has a dark head with a large white patch behind the eye and a white body. Small flocks along the Discovery Bay shore from late fall into April.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'a low squeaky growl; usually silent',
    presence: [3, 3, 3, 2, 1, 0, 0, 0, 0, 2, 3, 3],
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 14, power: 0.5, flapRate: 10 };

  static override look: Partial<Look> = {
    length: 0.36,
    build: 0.85,
    neckLength: 0.18,
    headSize: 0.8,
    beakLength: 0.5,
    head: '#2e3f5a',
    cap: '#f6f6f2',
    body: '#f4f4f0',
    belly: '#f6f6f2',
    wing: '#262629',
    wingBar: '#f6f6f2',
    tail: '#7a7a80',
    beak: '#6b7480',
    legs: '#e8a0b0',
  };

  // Short dives, many of them, and the runway is short for a diver.
  protected override diveTime = 1.2;
  protected override diveSpan = 4;
  protected override diveCount = 5;
  protected override runUp = 5;
  protected override throwForce = 0.5;
}

export class CommonGoldeneye extends Bucephala {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Bucephala clangula',
    common: 'Common Goldeneye',
    note: 'Drake: glossy green head with a round white spot at the base of the bill, white body, black back. Yellow eye in both sexes. A few at a time off Gardiner Beach and in the bay from November to March. The wings whistle in flight.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'speer-ick (the drake in display); the wings whistle in flight',
    presence: [2, 2, 2, 1, 0, 0, 0, 0, 0, 1, 2, 2],
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 15, flapRate: 8 };

  static override look: Partial<Look> = {
    length: 0.46,
    build: 0.8,
    neckLength: 0.22,
    headSize: 0.85,
    head: '#1c4a3a',
    spots: '#f8f8f4',
    body: '#f8f8f4',
    belly: '#f8f8f4',
    wing: '#222222',
    wingBar: '#f6f6f2',
    tail: '#4a4a4a',
    beak: '#262626',
    eye: '#e8c020',
    legs: '#e8a020',
  };

  protected override diveTime = 2.4;
  protected override diveSpan = 8;
  protected override throwForce = 1;
}

export abstract class Melanitta extends Anatidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Melanitta',
    common: 'Scoters',
    note: 'Heavy, dark sea ducks that dive in deeper water for mussels and clams and swallow them whole. Large flocks gather on the Strait in winter.',
  };

  static override flight: Partial<FlightProfile> = { power: 0.3, agility: 0.3, flapRate: 6, cruiseSpeed: 13 };
  static override look: Partial<Look> = { build: 0.9, headSize: 0.7, beakLength: 1.2 };

  static override behaviors: BehaviorTable<Melanitta> = {
    forage: {
      eats: 'shellfish',
      label: 'Dive for mussels',
      cue: 'A quick flick of the wings, then under. Dives are long for the depth, with the bird hunting along the bottom for mussels. Coming up, a mussel may be swallowed whole at the surface with a few jerks of the neck.',
    },
  };

  protected override feeding: Feeding = 'dive';
  protected override diveTime = 3;
  protected override diveSpan = 10;
  protected override runUp = 12;
  /** Keeps the wings partly open while under. */
  protected diveWings = false;

  protected override *beforeDive(): Script {
    const p = this.pose;
    p.wings = 'open';
    yield* this.poseTo({ flap: -0.9 }, 0.07);
    yield* this.poseTo({ flap: 0.9 }, 0.07);
    yield* this.poseTo({ flap: 0 }, 0.05);
    if (!this.diveWings) p.wings = 'folded';
  }
}

export class SurfScoter extends Melanitta {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Melanitta perspicillata',
    common: 'Surf Scoter',
    note: 'Drake: black with a white patch on the forehead and another on the nape, and a swollen, orange, white and black bill. The most numerous scoter on Discovery Bay, found just off Gardiner Beach most of the year. Dives with the wings closed.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'a low, liquid gurgle; mostly silent',
    presence: [3, 3, 3, 3, 2, 1, 1, 1, 2, 3, 3, 3],
  };

  static override look: Partial<Look> = {
    length: 0.5,
    body: '#1a1a1a',
    belly: '#262626',
    head: '#1a1a1a',
    cap: '#f4f4f0',
    spots: '#f6f6f2',
    wing: '#161616',
    tail: '#161616',
    beak: '#e8602a',
    eye: '#f4f4f0',
    legs: '#e8a030',
  };

  protected override diveLeap = 0.5;
}

export class WhiteWingedScoter extends Melanitta {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Melanitta deglandi',
    common: 'White-winged Scoter',
    note: 'The largest scoter. Black with a white wing patch that is hidden on the water and shows in flight, a white teardrop beside the eye, and an orange bill. Fewer than Surf Scoters on the bay, with groups farther out. It dives with the wings partly open.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'a hoarse, low croak; mostly silent',
    presence: [2, 2, 2, 2, 1, 1, 0, 1, 1, 2, 2, 2],
  };

  static override flight: Partial<FlightProfile> = { power: 0.28, cruiseSpeed: 14, flapRate: 5.5 };

  static override look: Partial<Look> = {
    length: 0.55,
    body: '#1a1a1a',
    belly: '#262626',
    head: '#1a1a1a',
    eyeRing: '#f4f4f0',
    wing: '#161616',
    wingBar: '#f6f6f2',
    tail: '#161616',
    beak: '#e8782a',
    eye: '#f4f4f0',
    legs: '#d8606a',
  };

  protected override diveWings = true;
  protected override diveTime = 3.4;
}

export abstract class Histrionicus extends Anatidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Histrionicus',
    common: 'Harlequin Duck',
    note: 'A single species that feeds in white water along rocky coasts and breeds on fast mountain streams.',
  };

  static override flight: Partial<FlightProfile> = { power: 0.45, agility: 0.6, flapRate: 7 };

  static override behaviors: BehaviorTable<Histrionicus> = {
    forage: {
      eats: 'shellfish',
      label: 'Dive in the surf',
      cue: 'Bobs like a cork in the surf and goes under between waves to pull mussels off the bottom; along rocky shores it works the rock face for crabs too. Other ducks stay out of the surf zone.',
    },
    haulOut: {
      label: 'Haul out on a rock',
      cue: 'Climbs onto a wave-washed rock to rest, head tucked, often in a tight group. Few other ducks roost on rocks the way harlequins do.',
    },
  };

  protected override feeding: Feeding = 'dive';
  protected override diveTime = 2.4;
  protected override diveSpan = 5;
  protected override diveLeap = 0.4;
  protected override runUp = 5;

  *haulOut(): Script {
    yield* this.toPerch(['rock'], 'near');
    yield* this.lookAround(2);
    yield* this.poseTo({ crouch: 0.4, neck: 0.1, head: -2.2 }, 0.4);
    yield* this.wait(1.5);
    yield* this.relax();
    yield* this.toWater();
  }
}

export class HarlequinDuck extends Histrionicus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Histrionicus histrionicus',
    common: 'Harlequin Duck',
    note: 'Drake: slate blue with chestnut flanks and crisp white spots and bars on the head and body. Small groups on rocky shorelines around the Miller Peninsula and Protection Island from fall to spring; look at the rocks, not open water.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'ek-ek-ek (a squeaky, mouse-like squeal)',
    presence: [2, 2, 2, 1, 0, 0, 0, 0, 1, 1, 2, 2],
  };

  static override look: Partial<Look> = {
    length: 0.42,
    build: 0.8,
    headSize: 0.8,
    beakLength: 0.55,
    tailLength: 0.3,
    tailShape: 'pointed',
    head: '#34506e',
    eyeLine: '#b4562a',
    spots: '#f6f6f2',
    band: '#f6f6f2',
    body: '#4d6d8d',
    belly: '#4d6d8d',
    wing: '#41607f',
    tail: '#26323f',
    beak: '#6b7480',
    legs: '#6b7480',
  };
}

export abstract class Clangula extends Anatidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Clangula',
    common: 'Long-tailed Duck',
    note: 'A single species. A sea duck of the far north that winters on cold open water and dives deeper than any other duck here, propelling itself with its wings.',
  };

  static override flight: Partial<FlightProfile> = { power: 0.4, agility: 0.6, flapRate: 6 };

  static override behaviors: BehaviorTable<Clangula> = {
    forage: {
      eats: 'shellfish',
      label: 'Dive deep',
      cue: 'Leaps clear of the water to go under and stays down longer than the other ducks, using the wings underwater to reach mussels and other shellfish on the bottom. It comes up well away from where it went down.',
    },
    yodel: {
      label: 'Yodel',
      cue: 'The drake throws the head up and back, cocks the long tail and gives a rolling, musical call. Winter flocks are noisy, nothing like the silent scoters.',
    },
  };

  protected override feeding: Feeding = 'dive';
  protected override diveTime = 3.6;
  protected override diveSpan = 12;
  protected override diveLeap = 0.6;
  protected override runUp = 8;

  *yodel(): Script {
    yield* this.toWater();
    this.say(this.ecology.call, 3);
    for (let i = 0; i < 3; i++) {
      yield* this.poseTo({ neck: 1.4, head: 0.8, tailAngle: 0.9, beakOpen: 1, pitch: 0.3 }, 0.18);
      yield* this.poseTo({ beakOpen: 0.2, neck: 1.2 }, 0.15);
      yield* this.poseTo({ neck: 0.3, head: -0.2, beakOpen: 0, tailAngle: 0.3 }, 0.2);
      yield* this.wait(0.3);
    }
    yield* this.relax();
  }
}

export class LongTailedDuck extends Clangula {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Clangula hyemalis',
    common: 'Long-tailed Duck',
    note: 'Winter drake: mostly white with a dark cheek patch, dark chest, a short pink-banded bill and two long central tail feathers. Scarce to regular in the bay and Strait from November to April.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'ow-ow-owdle-ow (a yodeling, musical chorus)',
    presence: [2, 2, 2, 1, 0, 0, 0, 0, 0, 1, 2, 2],
  };

  static override look: Partial<Look> = {
    length: 0.55,
    neckLength: 0.2,
    headSize: 0.8,
    beakLength: 0.45,
    tailLength: 0.45,
    tailShape: 'pointed',
    tailCock: 0.2,
    head: '#f2f0ec',
    neck: '#f6f6f2',
    spots: '#6b4a3a',
    breast: '#3a2a22',
    body: '#f2f0ec',
    belly: '#f6f6f2',
    wing: '#3a2a22',
    tail: '#2a2a2a',
    beak: '#d98ca0',
    legs: '#7a7a80',
  };
}

// ============================================================== Mergansers

export abstract class Mergus extends Anatidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Mergus',
    common: 'Mergansers',
    note: 'Fish-eating ducks with a thin, serrated, hooked bill. They hunt by sight, so they look underwater before they dive.',
  };

  static override flight: Partial<FlightProfile> = { power: 0.4, agility: 0.45, flapRate: 6.5 };
  static override look: Partial<Look> = { build: 0.55, neckLength: 0.38, beakShape: 'thin', beakLength: 1.4 };

  static override behaviors: BehaviorTable<Mergus> = {
    forage: {
      eats: 'baitfish',
      label: 'Pursuit dive',
      cue: 'Swims with the face in the water, then dives in a smooth forward roll and chases fish underwater. Fish are swallowed head first at the surface.',
    },
    snorkel: {
      eats: 'baitfish',
      label: 'Snorkel',
      feeding: true,
      cue: 'Cruises along with the head down and the bill underwater, scanning for fish before committing to a dive. No other duck does this for long.',
    },
  };

  protected override feeding: Feeding = 'dive';
  protected override diveTime = 2.2;
  protected override diveSpan = 9;
  protected override lookFirst = 1;
  protected override runUp = 10;

  *snorkel(): Script {
    yield* this.toWater();
    yield* this.poseTo({ neck: 0.1, neckExt: 0.9, head: -1.3, pitch: -0.1 }, 0.3);
    for (let i = 0; i < 3; i++) {
      yield* this.moveOnGround(this.foodSpot(3).x, 0.7);
      yield* this.wait(this.lookFirst * 0.6);
    }
    // A minnow spotted: a quick lunge with the face still under.
    yield* this.peck(1, 1);
    yield* this.relax();
  }
}

export class RedBreastedMerganser extends Mergus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Mergus serrator',
    common: 'Red-breasted Merganser',
    note: 'Drake: dark green head with a shaggy double crest, white collar, streaked rusty breast and a thin red bill. The common merganser on salt water: groups in the bay and off Gardiner Beach from fall to spring.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'a hoarse, rasping krrr; mostly silent',
    presence: [3, 3, 2, 2, 1, 0, 0, 0, 0, 1, 2, 3],
  };

  static override look: Partial<Look> = {
    length: 0.55,
    crest: 'shaggy',
    head: '#1f4a3a',
    neck: '#f6f6f2',
    breast: '#a8643a',
    body: '#7a7a7a',
    belly: '#f6f6f2',
    wing: '#3a3a3a',
    wingBar: '#f6f6f2',
    tail: '#7a7a7a',
    beak: '#c8281e',
    eye: '#c82820',
    legs: '#d8301e',
  };
}

export class CommonMerganser extends Mergus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Mergus merganser',
    common: 'Common Merganser',
    note: 'Larger and heavier. Drake: smooth dark green head, no shaggy crest, a clean white body with a salmon wash, thick red bill. Mainly a river duck; a few turn up on Discovery Bay in winter, usually near stream mouths.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'a low, harsh karr; mostly silent',
    presence: [2, 2, 1, 1, 0, 0, 0, 0, 0, 1, 1, 2],
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 15, power: 0.35, flapRate: 6 };

  static override look: Partial<Look> = {
    length: 0.65,
    headSize: 0.65,
    beakLength: 1.5,
    tailLength: 0.25,
    head: '#1a4a3a',
    throat: '#f6f2ea',
    breast: '#f1e4d4',
    body: '#f6f2ea',
    belly: '#f4efe6',
    wing: '#2a2a2a',
    wingBar: '#f6f6f2',
    tail: '#7a7a7a',
    beak: '#d8281e',
    eye: '#4a2a1a',
    legs: '#e8402a',
  };

  // The bigger bird dives longer and farther, and needs a longer run to take off.
  protected override diveTime = 2.8;
  protected override diveSpan = 11;
  protected override lookFirst = 1.3;
  protected override runUp = 13;
}

export abstract class Lophodytes extends Anatidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Lophodytes',
    common: 'Hooded Merganser',
    note: 'A single species. The smallest merganser, a cavity nester of wooded ponds with a bill thinner than its relatives and a fan-shaped crest.',
  };

  static override flight: Partial<FlightProfile> = { power: 0.5, agility: 0.6, flapRate: 8, cruiseSpeed: 13 };
  static override look: Partial<Look> = { build: 0.6, neckLength: 0.3, headSize: 0.85, beakShape: 'thin', beakLength: 1, crest: 'plume' };

  static override behaviors: BehaviorTable<Lophodytes> = {
    forage: {
      eats: 'minnows',
      label: 'Look and dive',
      cue: 'Short looks underwater, then a quick dive after small fish and crayfish in shallow water. It stays in sheltered coves, not open bay.',
    },
    crestFan: {
      label: 'Fan the crest',
      cue: 'The drake raises the crest into a big round fan and lowers it again. Raised, the white patch shows from far off; lowered, the head is slim and dark.',
    },
  };

  protected override feeding: Feeding = 'dive';
  protected override diveTime = 1.8;
  protected override diveSpan = 6;
  protected override lookFirst = 0.7;
  protected override runUp = 4;

  *crestFan(): Script {
    yield* this.toWater();
    for (let i = 0; i < 3; i++) {
      yield* this.poseTo({ crest: 1, neck: 1.1 }, 0.2);
      yield* this.wait(0.6);
      yield* this.poseTo({ crest: 0 }, 0.25);
      yield* this.wait(0.3);
    }
    yield* this.relax();
  }
}

export class HoodedMerganser extends Lophodytes {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Lophodytes cucullatus',
    common: 'Hooded Merganser',
    note: 'Drake: black head with a white fan-shaped patch, two black bars on the white breast and chestnut flanks. Small groups in sheltered water such as the Gardiner Beach lagoon from late fall to spring.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'a low, frog-like croak, hrrroo',
    presence: [2, 2, 2, 1, 0, 0, 0, 0, 0, 1, 2, 2],
  };

  static override look: Partial<Look> = {
    length: 0.46,
    tailLength: 0.35,
    tailShape: 'fan',
    head: '#1a1a1a',
    cap: '#f6f6f2',
    breast: '#f4f4f0',
    band: '#1a1a1a',
    body: '#8a4a2a',
    belly: '#f4f4f0',
    wing: '#26262a',
    tail: '#3a3028',
    beak: '#26262a',
    eye: '#e8c020',
    legs: '#c8a888',
  };
}

// ================================================================== Geese

export abstract class Branta extends Anatidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Branta',
    common: 'Black-necked geese',
    note: 'Geese with black heads and necks and short, strong bills. They walk well and eat plants, mostly grass and aquatic vegetation.',
  };

  static override flight: Partial<FlightProfile> = { power: 0.4, agility: 0.3, glide: 0.6, flapRate: 4 };

  static override ecology: Partial<Ecology> = { groundSpeed: 3.5 };
  static override look: Partial<Look> = { neckLength: 0.45, headSize: 0.6, beakLength: 0.7, tailLength: 0.15 };

  static override behaviors: BehaviorTable<Branta> = {
    forage: {
      eats: 'grass',
      label: 'Feed',
      cue: 'Feeds by walking and cropping grass ashore with the head down, rather than dabbling or diving like the ducks.',
    },
    graze: {
      eats: 'grass',
      label: 'Graze',
      feeding: true,
      cue: 'Walks up the beach or across a lawn in a loose group and crops with short, jerky pulls, head down, one or two birds always standing watch with the neck up.',
    },
  };

  protected override feeding: Feeding = 'graze';
  protected override runUp = 7;

  /** Geese hold the neck upright. */
  protected override restingPose() {
    return { ...super.restingPose(), neck: 1.15, neckExt: 1.1 };
  }

  graze(): Script {
    return this.grazeOnLand();
  }
}

export class Brant extends Branta {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Branta bernicla',
    common: 'Brant',
    note: 'A small, dark sea goose with a black head and neck and a partial white necklace. Winter and spring on Discovery Bay, a local specialty, feeding on eelgrass at low tide in the shallows off Gardiner Beach. Rarely seen away from salt water.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'cruk-cruk-cruk (a low, guttural chorus)',
    presence: [2, 2, 3, 3, 1, 0, 0, 0, 0, 0, 1, 2],
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 14, flapRate: 4.5, agility: 0.4 };

  static override look: Partial<Look> = {
    length: 0.64,
    build: 0.8,
    neckLength: 0.4,
    head: '#1f1f22',
    neck: '#1f1f22',
    band: '#f6f6f2',
    body: '#4a4440',
    belly: '#8a8680',
    wing: '#3a3632',
    tail: '#1a1a1a',
    beak: '#1a1a1a',
    legs: '#1a1a1a',
  };

  static override behaviors: BehaviorTable<Brant> = {
    forage: {
      eats: 'eelgrass',
      label: 'Feed on eelgrass',
      cue: 'Tips up like a dabbling duck in the shallows to pull eelgrass, with the tail in the air. Canada Geese graze on land; Brant stay on the water and the tideline.',
    },
  };

  protected override feeding: Feeding = 'dabble';
  protected override reach = 1;
  protected override runUp = 6;
}

export class CanadaGoose extends Branta {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Branta canadensis',
    common: 'Canada Goose',
    note: 'Black neck and head with a white chinstrap, brown body. Around Gardiner Beach and the Miller Peninsula shore all year, grazing the grass above the beach and loafing on the water.',
  };

  static override ecology: Partial<Ecology> = { scenes: { yard: 2 },
    call: 'ah-HONK, ah-HONK',
    presence: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 13, power: 0.35, flapRate: 3, agility: 0.25 };

  static override look: Partial<Look> = {
    length: 0.95,
    build: 0.75,
    neckLength: 0.55,
    beakLength: 0.8,
    head: '#1a1a1a',
    neck: '#1a1a1a',
    throat: '#f6f6f2',
    breast: '#d4ccbc',
    body: '#8a7a66',
    belly: '#d8d0c0',
    wing: '#6e6152',
    tail: '#1a1a1a',
    beak: '#1a1a1a',
    legs: '#2a2a2a',
  };

  // Heavier than a Brant: more bites, and the longest run of the geese.
  protected override grazeBites = 6;
  protected override runUp = 9;
}

export abstract class Cygnus extends Anatidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Cygnus',
    common: 'Swans',
    note: 'The largest waterfowl. Long necks let them reach the bottom in water too deep for geese; they upend rather than dive.',
  };

  static override flight: Partial<FlightProfile> = { power: 0.25, agility: 0.15, glide: 0.7, flapRate: 2.5, cruiseSpeed: 12 };

  static override ecology: Partial<Ecology> = { groundSpeed: 2.5, posture: 0.2 };
  static override look: Partial<Look> = { build: 0.7, neckLength: 0.85, legLength: 0.12, headSize: 0.4, beakLength: 2.4, wingSpan: 2.2 };

  static override behaviors: BehaviorTable<Cygnus> = {
    forage: {
      label: 'Upend',
      cue: 'The neck goes straight down to the bottom, pulling roots and eelgrass. In the shallows the neck alone reaches; in deeper water the whole front of the body tips after it, tail high. It reaches farther than any duck and stays under longer.',
    },
  };

  protected override feeding: Feeding = 'dabble';
  protected override reach = 2;
  protected override runUp = 16;

  /** A swan holds the neck straight and tall. */
  protected override restingPose() {
    return { ...super.restingPose(), neck: 1.4, neckExt: 1.2 };
  }
}

export class TrumpeterSwan extends Cygnus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Cygnus buccinator',
    common: 'Trumpeter Swan',
    note: 'All white with a straight, black bill that meets the forehead without a notch, and no yellow at the bill base. Scarce in winter around Discovery Bay and the Sequim farmland; a few may rest on the bay.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'a low, nasal, French-horn honk, hoo-hoo',
    presence: [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1],
  };

  static override look: Partial<Look> = {
    length: 1.5,
    head: '#f6f6f2',
    neck: '#f8f8f6',
    body: '#f8f8f6',
    belly: '#f8f8f6',
    wing: '#f4f4f2',
    tail: '#f8f8f6',
    beak: '#1a1a1a',
    legs: '#1a1a1a',
    eye: '#222222',
  };
}
