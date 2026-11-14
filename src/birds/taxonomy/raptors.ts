/**
 * Birds of prey: the rest of the hawks (Accipitriformes, extending waterside.ts),
 * New World vultures, falcons and owls. Each order is small here, so they share a file.
 */
import { Bird, clamp, rand } from '../core/Bird';
import type { BehaviorTable, Ecology, FlightProfile, Look, Script, Taxon } from '../core/traits';
import { Accipitridae, Accipitriformes } from './waterside';

// ============================================================== Osprey

export abstract class Pandionidae extends Accipitriformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Pandionidae',
    common: 'Osprey',
    note: 'One species, found on every continent but Antarctica. It eats only live fish. Spiny pads under the toes, an outer toe that swings backward and nostrils that close let it plunge feet-first and hold a slippery fish.',
  };

  static override flight: Partial<FlightProfile> = {
    cruiseSpeed: 11,
    power: 0.4,
    agility: 0.35,
    braking: 0.3,
    hover: 0.4,
    glide: 0.7,
    flapRate: 4,
    flapDuty: 0.6,
    cyclePeriod: 3,
  };

  static override ecology: Partial<Ecology> = { perches: ['post', 'treetop'], gait: 'walk', groundSpeed: 2, posture: 0.5 };

  static override behaviors: BehaviorTable<Pandionidae> = {
    plungeDive: {
      label: 'Hover and plunge',
      cue: 'Flies a slow search line 50 feet over the water, stops and hovers with the bill pointing down, then drops feet-first into a big splash and often goes in to the body. It climbs out, shakes like a dog in midair and carries the fish head-first. A Bald Eagle’s strike is a dry snatch from the surface.',
    },
  };

  override forage(): Script {
    return this.plungeDive();
  }

  *plungeDive(): Script {
    const water = this.world.habitat.water;
    if (!water) return;
    const x = water.from + rand(12, 26);
    const dir = this.pos.x < x ? 1 : -1;
    yield* this.flyTo({ x: x - dir * 10, y: 15 }, { land: false });
    yield* this.flyTo({ x, y: 14 }, { land: false, speed: 0.5 });
    yield* this.hoverFor(2.5, { aim: -0.9 });
    yield* this.flyTo({ x: x + dir * 2, y: -1 }, { land: false, speed: 1.7 });
    this.world.burst('splash', this.pos.x, 0, 14);
    yield* this.wait(0.4);
    // Many plunges come up empty.
    const caught = Math.random() < 0.6;
    if (caught) {
      this.pose.carry = 'fish';
      this.pose.carryInFeet = true;
    }
    this.world.burst('splash', this.pos.x, 0, 8);
    yield* this.flyTo({ x: x + dir * 6, y: 9 }, { land: false });
    if (caught) {
      const p = this.pose;
      yield* this.tween(0.6, (t) => (p.roll = 0.35 * Math.sin(t * Math.PI * 6)));
      p.roll = 0;
    }
    yield* this.toPerch();
    if (caught) for (let i = 0; i < 3; i++) yield* this.peck(1, 1.2);
    this.pose.carry = null;
    this.pose.carryInFeet = false;
    yield* this.relax();
  }
}

export abstract class Pandion extends Pandionidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Pandion',
    common: 'Ospreys',
    note: 'The only genus in its family.',
  };
}

export class Osprey extends Pandion {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Pandion haliaetus',
    common: 'Osprey',
    note: 'White below with a dark eye stripe and a brown necklace, and a kink at the wrist in flight. Summer only: arrives in April, fishes Discovery Bay and the Gardiner shoreline, and is gone by October.',
  };

  static override ecology: Partial<Ecology> = {
    habitat: 'beach',
    call: 'chewk-chewk-chewk (a whistled, rising chirp)',
    presence: [0, 0, 0, 1, 2, 2, 2, 2, 1, 0, 0, 0],
  };

  static override look: Partial<Look> = {
    length: 0.58,
    build: 0.55,
    headSize: 0.6,
    tailLength: 0.3,
    wingSpan: 2.9,
    legLength: 0.15,
    body: '#4a382a',
    belly: '#f6f3ec',
    head: '#f6f3ec',
    cap: '#5a4636',
    eyeLine: '#3b2a1e',
    band: '#6a5240',
    wing: '#44332a',
    tail: '#6b5a4c',
    underwing: '#efece4',
    beak: '#2b2b2b',
    legs: '#8c9aa5',
  };
}

// ===================================================== Buteo, Accipiter, Circus

export abstract class Buteo extends Accipitridae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Buteo',
    common: 'Buteo hawks',
    note: 'Broad-winged, short-tailed hawks of open country. They hunt from a high perch or from the air with very little flapping.',
  };

  static override ecology: Partial<Ecology> = { perches: ['post', 'treetop'] };
  static override look: Partial<Look> = { build: 0.65, headSize: 0.7, tailLength: 0.38, tailShape: 'fan', wingSpan: 2.2 };

  static override behaviors: BehaviorTable<Buteo> = {
    kite: {
      label: 'Kite on the wind',
      cue: 'Hangs almost motionless over one spot on set wings with the tail fanned, riding the breeze, then slides sideways to a new spot. Gulls kite too, but a buteo’s wings are broad and rounded.',
    },
    perchHunt: {
      label: 'Hunt from a perch',
      cue: 'Sits upright and still on a treetop or post for many minutes, head tipped down, then drops on a short glide to the ground and mantles with the wings spread over what it caught.',
    },
  };

  override forage(): Script {
    return this.perchHunt();
  }

  *kite(): Script {
    yield* this.flyTo({ x: this.pos.x < 50 ? 62 : 38, y: 26 }, { land: false });
    const home = { ...this.pos };
    const p = this.pose;
    this.vel = { x: 0, y: 0 };
    for (let t = 0; t < 7; ) {
      const dt = yield;
      t += dt;
      this.airTime += dt;
      this.pos.x = home.x + 0.6 * Math.sin(t * 0.7);
      this.pos.y = home.y + 0.5 * Math.sin(t * 1.1);
      p.wings = 'open';
      p.flap = 0.2 + 0.1 * Math.sin(t * 2);
      p.pitch = 0.15;
      p.neck = 0.25;
      p.tailFan = 1;
    }
    p.tailFan = 0;
    yield* this.toPerch();
  }

  *perchHunt(): Script {
    yield* this.toPerch();
    const perch = { ...this.pos };
    yield* this.lookAround(2.5);
    yield* this.poseTo({ head: -0.7, neck: 0.6 }, 0.3);
    yield* this.wait(1.2);
    const spot = this.groundSpot(perch.x + (perch.x < 50 ? 1 : -1) * 10, 2);
    yield* this.flyTo(spot, { glide: true });
    this.world.burst('dust', spot.x, 0, 5);
    this.pose.wings = 'open';
    yield* this.poseTo({ crouch: 0.6, flap: -0.4 }, 0.15);
    yield* this.wait(1);
    yield* this.relax();
    yield* this.peck(3, 1.1);
    yield* this.toPerch();
  }
}

export class RedTailedHawk extends Buteo {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Buteo jamaicensis',
    common: 'Red-tailed Hawk',
    note: 'Brown above with a pale, streaky belly band, dark bars on the front edge of the underwing and a rusty tail on adults. The common hawk over the Miller Peninsula clearings all year, usually on a pole or treetop.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'keeeeer (a hoarse, descending scream)',
    presence: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  };

  static override look: Partial<Look> = {
    length: 0.55,
    body: '#6b4f3a',
    belly: '#efe6d6',
    head: '#6a5040',
    band: '#5a3d2a',
    wing: '#5b4333',
    tail: '#b5532a',
    underwing: '#e9dfcf',
    beak: '#4a4a45',
    legs: '#e0c050',
    eye: '#4b3320',
  };
}

export abstract class Accipiter extends Accipitridae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Accipiter',
    common: 'Accipiter hawks',
    note: 'Short rounded wings, a long tail and long legs, built to turn through branches after small birds. They hunt by surprise at close range rather than by soaring.',
  };

  // Flap, flap, flap, glide: a quick burst of beats and a short coast on flat wings.
  static override flight: Partial<FlightProfile> = {
    cruiseSpeed: 12,
    power: 0.6,
    agility: 0.8,
    braking: 0.5,
    glide: 0.5,
    flapRate: 5,
    flapDuty: 0.6,
    cyclePeriod: 1.2,
  };

  static override ecology: Partial<Ecology> = { perches: ['branch', 'treetop'], groundSpeed: 2.5 };
  static override look: Partial<Look> = { build: 0.5, headSize: 0.7, tailLength: 0.6, wingSpan: 2, legLength: 0.3, eye: '#c8452a' };

  static override behaviors: BehaviorTable<Accipiter> = {
    ambushDash: {
      label: 'Ambush dash',
      cue: 'Waits out of sight in the trees, then comes through the yard a few feet off the ground, hugging cover, and pops up onto a branch on the far side. Over in seconds. Compare its size and how twisty the line is with the other accipiter.',
    },
  };

  /** Number of straight runs in the dash; more runs means more turns. */
  protected dashLegs = 2;
  /** Height change between runs, in stage units. */
  protected dashJink = 0.6;
  protected dashSpan = 50;
  /** Multiple of cruise speed. */
  protected dashSpeed = 1.3;

  override forage(): Script {
    return this.ambushDash();
  }

  *ambushDash(): Script {
    yield* this.toPerch();
    const perch = { ...this.pos };
    const dir = perch.x < 50 ? 1 : -1;
    yield* this.lookAround(2);
    yield* this.poseTo({ pitch: 0.25, neck: 0.5, crouch: 0.3 }, 0.2);
    for (let i = 1; i <= this.dashLegs; i++) {
      const x = clamp(perch.x + (dir * this.dashSpan * i) / this.dashLegs, 6, 94);
      yield* this.flyTo({ x, y: 3 + (i % 2 ? -1 : 1) * this.dashJink }, { land: false, speed: this.dashSpeed });
    }
    this.world.burst('leaf', this.pos.x, this.pos.y, 6, dir);
    yield* this.toPerch();
    yield* this.relax();
  }
}

export class CoopersHawk extends Accipiter {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Accipiter cooperii',
    common: 'Cooper’s Hawk',
    note: 'Crow-sized, with a blue-gray back, a dark cap that stands out from a paler nape, and a long, rounded, white-tipped tail. Regular around Miller Peninsula yards and feeders, mostly outside the summer months.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'kak-kak-kak-kak (a fast, flicker-like chatter)',
    presence: [2, 2, 2, 2, 1, 1, 1, 1, 2, 2, 2, 2],
  };

  static override look: Partial<Look> = {
    length: 0.43,
    wingSpan: 2.05,
    tailShape: 'fan',
    body: '#5a6b78',
    belly: '#f1e8dd',
    head: '#5a6b78',
    cap: '#3d4a55',
    breast: '#c98f6e',
    wing: '#51616d',
    tail: '#55616b',
    beak: '#4a4a45',
    legs: '#e8c040',
  };

  protected override dashSpan = 55;
}

export class SharpShinnedHawk extends Accipiter {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Accipiter striatus',
    common: 'Sharp-shinned Hawk',
    note: 'Jay-sized with a small, round head, a square-tipped tail and pencil-thin legs. Scarcer than Cooper’s Hawk at Miller Peninsula, mostly seen in fall and winter around feeders.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 11, agility: 0.9, flapRate: 7 };

  static override ecology: Partial<Ecology> = {
    call: 'kik-kik-kik-kik (higher and thinner than Cooper’s)',
    presence: [1, 1, 1, 1, 0, 0, 0, 1, 1, 2, 2, 1],
  };

  static override look: Partial<Look> = {
    length: 0.3,
    headSize: 0.6,
    wingSpan: 2,
    legLength: 0.35,
    tailShape: 'square',
    body: '#5f707d',
    belly: '#f1e8dd',
    head: '#5f707d',
    breast: '#d0875a',
    wing: '#56666f',
    tail: '#55616b',
    beak: '#4a4a45',
    legs: '#e8c040',
  };

  protected override dashLegs = 4;
  protected override dashJink = 2.5;
  protected override dashSpan = 40;
  protected override dashSpeed = 1.5;
}

export abstract class Circus extends Accipitridae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Circus',
    common: 'Harriers',
    note: 'Long-winged, long-tailed hawks that hunt by flying low over marsh and grass. An owl-like facial disc helps them locate prey by sound.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 10, power: 0.35, agility: 0.5, braking: 0.3, glide: 0.7, flapRate: 3.2, flapDuty: 0.5, cyclePeriod: 3 };
  static override ecology: Partial<Ecology> = { perches: ['post', 'log', 'rock'], groundSpeed: 2.5 };
  static override look: Partial<Look> = { build: 0.4, headSize: 0.7, tailLength: 0.6, tailShape: 'square', wingSpan: 2.3, legLength: 0.3 };

  static override behaviors: BehaviorTable<Circus> = {
    quarter: {
      label: 'Quarter low over the ground',
      cue: 'Glides back and forth a few feet above the grass with wings held in a shallow V, rocking from side to side and tipping to look down. No other hawk flies this low and this slowly. It ends in a sudden drop onto prey.',
    },
  };

  override forage(): Script {
    return this.quarter();
  }

  *quarter(): Script {
    const x0 = this.pos.x;
    const end = x0 < 30 ? 52 : 8;
    for (let i = 1; i <= 6; i++) {
      yield* this.flyTo({ x: x0 + ((end - x0) * i) / 6, y: i % 2 ? 1.6 : 3.2 }, { land: false, speed: 0.7 });
    }
    const spot = this.groundSpot(this.pos.x, 3);
    yield* this.flyTo(spot);
    this.world.burst('dust', spot.x, 0, 5);
    this.pose.wings = 'open';
    yield* this.poseTo({ crouch: 0.5, flap: 0.5 }, 0.15);
    yield* this.wait(1);
    yield* this.relax();
    yield* this.peck(2, 1);
  }

  /** Low over the ground the wings are held up in a V and the bird rocks on them. */
  protected override adjustFlightPose() {
    const p = this.pose;
    // flightPose parks set wings at exactly 0.12; raise them to the V.
    if (p.flap === 0.12) p.flap = 0.55;
    if (this.pos.y < 6) p.roll = 0.25 * Math.sin(this.airTime * 1.6);
  }
}

export class NorthernHarrier extends Circus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Circus hudsonius',
    common: 'Northern Harrier',
    note: 'A white rump patch above a long tail marks every plumage. Adult males are pale gray, females and young brown with a streaked buff belly. Winters over the marsh and grass at Gardiner and the head of Discovery Bay, October to March.',
  };

  static override ecology: Partial<Ecology> = {
    habitat: 'beach',
    call: 'kek-kek-kek-kek (thin and rapid, rarely heard)',
    presence: [2, 2, 2, 1, 0, 0, 0, 1, 1, 2, 2, 2],
  };

  static override look: Partial<Look> = {
    length: 0.5,
    body: '#8e99a3',
    belly: '#f4f1ea',
    head: '#8e99a3',
    eyeRing: '#d8d4cb',
    wing: '#8e99a3',
    tail: '#d3d5d6',
    beak: '#3a3a3a',
    legs: '#e8c040',
  };
}

// =============================================================== Vultures

export abstract class Cathartiformes extends Bird {
  static override taxon: Taxon = {
    rank: 'order',
    name: 'Cathartiformes',
    common: 'New World vultures',
    note: 'Scavengers with bare heads and weak feet that cannot grip prey. Unrelated to Old World vultures, and unlike hawks they find carrion partly by smell.',
  };

  static override look: Partial<Look> = { beakShape: 'hook' };
}

export abstract class Cathartidae extends Cathartiformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Cathartidae',
    common: 'New World vultures',
    note: 'Big, light-bodied soaring birds that look for rising air before they leave the roost, so they appear late in the morning. They spread their wings to the sun to warm up and dry out.',
  };

  static override flight: Partial<FlightProfile> = {
    cruiseSpeed: 12,
    power: 0.3,
    agility: 0.2,
    braking: 0.2,
    glide: 0.95,
    flapRate: 2.5,
    flapDuty: 0.15,
    cyclePeriod: 6,
    ceiling: 50,
  };

  static override ecology: Partial<Ecology> = { perches: ['treetop', 'post'], gait: 'walk', groundSpeed: 2.5, posture: 0.5 };
  static override look: Partial<Look> = { build: 0.55, headSize: 0.45, tailLength: 0.4, wingSpan: 2.6, legLength: 0.2 };

  static override behaviors: BehaviorTable<Cathartidae> = {
    teeterSoar: {
      label: 'Teeter-soar',
      cue: 'Circles low on wings held up in a V, rocking from side to side as if unsteady and almost never flapping. Two-toned underwings: dark wing linings, silvery flight feathers. An eagle holds its wings flat.',
    },
    sunWings: {
      label: 'Spread wings in the sun',
      cue: 'Perched with both wings held wide open and the back to the sun, motionless for many minutes, usually on a bright morning after rain or fog. No hawk or eagle does this.',
    },
  };

  override forage(): Script {
    return this.carrionSearch();
  }

  *teeterSoar(): Script {
    yield* this.soarCircles(14, { x: 46, y: 22 }, 20);
  }

  *sunWings(): Script {
    yield* this.toPerch();
    yield* this.poseTo({ neck: 0.6, head: -0.2 }, 0.3);
    this.pose.wings = 'open';
    yield* this.poseTo({ flap: 0.2, tailFan: 0.8, pitch: 0.7 }, 0.6);
    yield* this.wait(5);
    yield* this.poseTo({ flap: -0.5 }, 0.3);
    this.pose.wings = 'folded';
    yield* this.relax(0.4);
  }

  /** Search low and slowly, then come down and walk up to what it found. */
  *carrionSearch(): Script {
    const x0 = this.pos.x;
    const dir = x0 < 50 ? 1 : -1;
    for (let i = 1; i <= 3; i++) yield* this.flyTo({ x: clamp(x0 + dir * 12 * i, 8, 92), y: 9 - i }, { land: false, speed: 0.6 });
    const spot = this.groundSpot(this.pos.x, 3);
    yield* this.flyTo(spot);
    yield* this.moveOnGround(this.world.clampLand(spot.x + dir * 4));
    yield* this.peck(3, 1.2);
    yield* this.relax();
  }

  /** Wings stay raised and the bird rocks on them, whatever it is doing in the air. */
  protected override adjustFlightPose() {
    const p = this.pose;
    // flightPose parks set wings at exactly 0.12; raise them to the V.
    if (p.flap === 0.12) p.flap = 0.55;
    p.roll = 0.3 * Math.sin(this.airTime * 1.7);
  }
}

export abstract class Cathartes extends Cathartidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Cathartes',
    common: 'Smell-hunting vultures',
    note: 'The vultures with the best sense of smell, which let them find carrion under a forest canopy.',
  };
}

export class TurkeyVulture extends Cathartes {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Cathartes aura',
    common: 'Turkey Vulture',
    note: 'Blackish with a small, bare red head and a long tail. A summer visitor over the Miller Peninsula, arriving in March and gone by October. Look for it over open ground on warm afternoons.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'hsss (a hiss; it has no true voice)',
    presence: [0, 0, 1, 2, 2, 2, 2, 2, 2, 1, 0, 0],
  };

  static override look: Partial<Look> = {
    length: 0.68,
    body: '#3b332e',
    belly: '#3b332e',
    head: '#c8412f',
    wing: '#3b332e',
    tail: '#3b332e',
    underwing: '#a9a49d',
    beak: '#e8e2d0',
    legs: '#d9a89a',
    eye: '#2a2018',
  };
}

// ================================================================ Falcons

export abstract class Falconiformes extends Bird {
  static override taxon: Taxon = {
    rank: 'order',
    name: 'Falconiformes',
    common: 'Falcons and caracaras',
    note: 'Closer to parrots and songbirds than to hawks. A notch on the bill, called the tooth, lets a falcon kill by biting the neck.',
  };

  static override look: Partial<Look> = { beakShape: 'hook', eye: '#2a2018' };
}

export abstract class Falconidae extends Falconiformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Falconidae',
    common: 'Falcons',
    note: 'Long, pointed wings and fast, stiff wingbeats. Falcons strike from above or from behind at speed, where hawks glide down on broad wings.',
  };

  static override flight: Partial<FlightProfile> = {
    cruiseSpeed: 14,
    power: 0.7,
    agility: 0.6,
    braking: 0.5,
    glide: 0.5,
    flapRate: 5,
    flapDuty: 0.8,
    cyclePeriod: 2,
    ceiling: 50,
  };

  static override ecology: Partial<Ecology> = { perches: ['treetop', 'post'], gait: 'walk', groundSpeed: 3, posture: 0.5 };
  static override look: Partial<Look> = { build: 0.6, headSize: 0.8, tailLength: 0.4, wingSpan: 2.2, legLength: 0.14 };

  static override behaviors: BehaviorTable<Falconidae> = {
    stoop: {
      label: 'Stoop',
      cue: 'Climbs, then folds the wings and falls at the prey in a steep dive with a hard pull-out. How high it starts is the clue: a Peregrine from far above, a Merlin from a low rise, a kestrel from a hover only a few feet up.',
    },
  };

  /** Height the dive starts from, in stage units. */
  protected stoopHeight = 40;

  override forage(): Script {
    return this.stoop();
  }

  *stoop(): Script {
    yield* this.toPerch();
    const dir = this.pos.x < 50 ? 1 : -1;
    const mark = { x: this.world.clampLand(this.pos.x + dir * 30), y: 1 };
    yield* this.flyTo({ x: clamp(this.pos.x + dir * 10, 10, 90), y: this.stoopHeight }, { land: false });
    yield* this.flyTo(mark, { land: false, speed: 2.8 });
    this.world.burst('dust', mark.x, 1, 6);
    yield* this.flyTo({ x: clamp(mark.x + dir * 8, 6, 94), y: this.stoopHeight / 2 }, { land: false });
    yield* this.toPerch();
    yield* this.relax();
  }
}

export abstract class Falco extends Falconidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Falco',
    common: 'True falcons',
    note: 'The typical falcons, from the kestrels to the Peregrine. Each is built for a different kind of chase.',
  };
}

export class PeregrineFalcon extends Falco {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Falco peregrinus',
    common: 'Peregrine Falcon',
    note: 'Crow-sized, with a dark hood and a wide dark moustache over a white throat, and a barred belly. Hunts shorebirds and ducks along Discovery Bay and off Protection Island, most often October to April.',
  };

  static override flight: Partial<FlightProfile> = { flapRate: 4.5, power: 0.75 };

  static override ecology: Partial<Ecology> = {
    habitat: 'beach',
    perches: ['post', 'rock', 'treetop'],
    call: 'kak-kak-kak-kak (harsh and fast)',
    presence: [2, 2, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2],
  };

  static override look: Partial<Look> = {
    length: 0.46,
    build: 0.65,
    body: '#58636e',
    belly: '#e8e0d2',
    head: '#2d333b',
    cap: '#2d333b',
    throat: '#f2f0ea',
    eyeLine: '#26292e',
    breast: '#cfcac0',
    wing: '#4a545e',
    tail: '#4a545e',
    beak: '#555555',
    legs: '#e8c040',
  };

  protected override stoopHeight = 42;
}

export class Merlin extends Falco {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Falco columbarius',
    common: 'Merlin',
    note: 'Pigeon-sized, compact and heavy-chested, with a faint moustache and a banded tail. The dark coastal form winters around the yards and fields of the Miller Peninsula from October to March.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 16, power: 0.8, agility: 0.8, glide: 0.3, flapRate: 7, flapDuty: 0.9 };

  static override ecology: Partial<Ecology> = {
    call: 'ki-ki-ki-ki-ki (a shrill, rapid chatter)',
    presence: [2, 2, 1, 0, 0, 0, 0, 0, 1, 1, 2, 2],
  };

  static override look: Partial<Look> = {
    length: 0.26,
    build: 0.7,
    wingSpan: 2.2,
    tailLength: 0.45,
    body: '#4d4944',
    belly: '#cdbba8',
    head: '#4d4944',
    breast: '#8a6e58',
    eyeLine: '#3a3632',
    wing: '#45413c',
    tail: '#4d4944',
    beak: '#555555',
    legs: '#e8c040',
  };

  protected override stoopHeight = 14;

  static override behaviors: BehaviorTable<Merlin> = {
    lowChase: {
      label: 'Low chase',
      cue: 'Streaks across open ground a few feet up on rapid, shallow wingbeats, following every jink of a small bird, with no ambush and no cover. A Sharp-shinned Hawk waits hidden and comes through trees; the Merlin runs the prey down in the open.',
    },
  };

  *lowChase(): Script {
    yield* this.toPerch();
    yield* this.lookAround(1);
    const dir = this.pos.x < 50 ? 1 : -1;
    const x0 = this.pos.x;
    for (const [dx, y] of [[20, 2.5], [38, 1.5], [55, 3.5]]) {
      yield* this.flyTo({ x: clamp(x0 + dir * dx, 6, 94), y }, { land: false, speed: 1.4 });
    }
    this.world.burst('dust', this.pos.x, 1, 4);
    yield* this.flyTo({ x: clamp(this.pos.x + dir * 6, 6, 94), y: 18 }, { land: false });
    yield* this.toPerch();
    yield* this.relax();
  }
}

export class AmericanKestrel extends Falco {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Falco sparverius',
    common: 'American Kestrel',
    note: 'The smallest falcon, jay-sized, with two black stripes on a pale face and a rusty back and tail. Scarce on the Miller Peninsula. Look on wires and fence posts at field edges in spring, fall and winter.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 11, power: 0.6, hover: 0.6, flapRate: 6 };

  static override ecology: Partial<Ecology> = {
    perches: ['post', 'branch', 'treetop'],
    call: 'killy-killy-killy (a thin, shrill laugh)',
    presence: [1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1, 1],
  };

  static override look: Partial<Look> = {
    length: 0.25,
    build: 0.5,
    tailLength: 0.55,
    wingSpan: 2.3,
    body: '#b8663a',
    belly: '#e9d9c3',
    head: '#7d8fa0',
    cap: '#c46b3c',
    throat: '#f3eee4',
    eyeLine: '#222222',
    spots: '#3a3028',
    wing: '#7d8fa0',
    tail: '#b5602e',
    beak: '#555555',
    legs: '#e8c040',
  };

  protected override stoopHeight = 8;

  static override behaviors: BehaviorTable<AmericanKestrel> = {
    hoverHunt: {
      label: 'Hover-hunt',
      cue: 'Hangs in one spot 30 feet up, head steady and tail fanned, wings beating fast, then slides down in steps and drops onto prey. Hovering over open ground is the field mark. A hawk soars or kites on set wings, and a kestrel flaps the whole time.',
    },
    tailPump: {
      label: 'Pump the tail',
      cue: 'Perched on a wire or post, it bobs its tail up and down every few seconds with a small head bob, scanning the grass below. A Red-tailed Hawk on the same post sits stiff.',
    },
  };

  *hoverHunt(): Script {
    const x = clamp(this.pos.x + rand(-15, 15), 12, 88);
    yield* this.flyTo({ x, y: 14 }, { land: false });
    for (let i = 0; i < 3; i++) yield* this.hoverFor(1.2, { aim: -1, drift: { x: 0, y: -3 } });
    const spot = this.groundSpot(this.pos.x, 1);
    yield* this.flyTo({ x: spot.x, y: 0.5 }, { land: false, speed: 1.5 });
    this.world.burst('dust', spot.x, 0, 4);
    yield* this.toPerch();
    yield* this.relax();
  }

  *tailPump(): Script {
    yield* this.toPerch();
    for (let i = 0; i < 6; i++) {
      yield* this.poseTo({ tailAngle: -0.5, head: -0.5, tailFan: 0.3 }, 0.15);
      yield* this.poseTo({ tailAngle: this.look.tailCock, head: -0.2, tailFan: 0 }, 0.2);
      yield* this.wait(rand(0.3, 0.9));
    }
    yield* this.relax();
  }
}

// ================================================================== Owls

export abstract class Strigiformes extends Bird {
  static override taxon: Taxon = {
    rank: 'order',
    name: 'Strigiformes',
    common: 'Owls',
    note: 'Forward-facing eyes fixed in their sockets, so an owl turns its whole head to look. Fringed flight feathers make the wings nearly silent, and the ears sit at different heights to place prey by sound.',
  };

  static override flight: Partial<FlightProfile> = {
    cruiseSpeed: 9,
    power: 0.4,
    agility: 0.45,
    braking: 0.35,
    glide: 0.7,
    flapRate: 4,
    flapDuty: 0.75,
    cyclePeriod: 2.5,
  };

  static override ecology: Partial<Ecology> = { perches: ['branch', 'treetop'], gait: 'walk', groundSpeed: 1.5, posture: 0.65 };

  static override look: Partial<Look> = {
    build: 0.75,
    neckLength: 0.05,
    headSize: 1.3,
    beakShape: 'hook',
    beakLength: 0.35,
    tailLength: 0.35,
    wingSpan: 2.2,
    legLength: 0.12,
    eye: '#e8b820',
  };

  static override behaviors: BehaviorTable<Strigiformes> = {
    headSwivel: {
      label: 'Swivel the head',
      cue: 'The body stays put while the head turns far around, up to 270 degrees, and tilts or bobs to line up a sound. Owls cannot move their eyes, so this is how they look.',
    },
    pounce: {
      label: 'Pounce from a perch',
      cue: 'Sits motionless, stares down, then drops without a sound on spread wings with the feet thrust forward, and mantles over the prey. Normally a dusk and night hunt; shown here in daylight.',
    },
  };

  /** How far from the perch it drops, in stage units. */
  protected pounceRange = 10;

  override forage(): Script {
    return this.pounce();
  }

  *headSwivel(): Script {
    yield* this.settle();
    yield* this.poseTo({ neck: 1.45, head: 1, neckExt: 1.15 }, 0.35);
    yield* this.wait(1);
    yield* this.poseTo({ head: 0.4, neck: 1.1 }, 0.1);
    yield* this.poseTo({ head: -0.3, neck: 0.9 }, 0.1);
    yield* this.wait(0.4);
    yield* this.relax(0.3);
  }

  *pounce(): Script {
    yield* this.toPerch();
    const perch = { ...this.pos };
    yield* this.lookAround(1.5);
    yield* this.poseTo({ neck: 0.3, head: -1, pitch: 0.3 }, 0.25);
    yield* this.wait(0.6);
    yield* this.strike(this.groundSpot(perch.x + (perch.x < 50 ? 1 : -1) * this.pounceRange, 2));
    yield* this.flyTo(perch);
    yield* this.relax();
  }

  /** Glide down on set wings, land on the prey and mantle over it. */
  protected *strike(spot: { x: number; y: number }): Script {
    yield* this.flyTo(spot, { glide: true, speed: 0.8 });
    this.world.burst('dust', spot.x, 0, 4);
    this.pose.wings = 'open';
    yield* this.poseTo({ crouch: 0.5, flap: -0.5 }, 0.15);
    yield* this.wait(0.8);
    yield* this.relax();
    yield* this.peck(2, 0.8);
  }
}

export abstract class Strigidae extends Strigiformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Strigidae',
    common: 'Typical owls',
    note: 'Most of the world’s owls. They are known by their hooting, which carries a long way at night and marks a territory.',
  };

  static override behaviors: BehaviorTable<Strigidae> = {
    hoot: {
      label: 'Hoot',
      cue: 'Upright on a branch, leaning forward with the bill opening for each note. The rhythm names the species: a Barred Owl’s eight or nine notes in two phrases against a Great Horned Owl’s five deeper ones. Really a dusk-to-night behavior, shown in daylight.',
    },
  };

  /** Pause in seconds after each note. The count of notes is one more than the count of pauses. */
  protected hootGaps: number[] = [0.5, 0.5, 0.5];

  *hoot(): Script {
    yield* this.toPerch();
    yield* this.poseTo({ pitch: 0.85, neck: 1.1 }, 0.3);
    this.say(this.ecology.call, this.hootGaps.reduce((a, b) => a + b, 1.5));
    for (const gap of [...this.hootGaps, 0]) {
      yield* this.poseTo({ beakOpen: 0.6, head: 0.25 }, 0.12);
      yield* this.poseTo({ beakOpen: 0, head: 0 }, 0.1);
      yield* this.wait(gap);
    }
    yield* this.relax();
  }
}

export abstract class Strix extends Strigidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Strix',
    common: 'Wood owls',
    note: 'Round-headed owls with no ear tufts and dark eyes, of mature forest.',
  };

  static override ecology: Partial<Ecology> = { perches: ['branch', 'treetop'] };
  static override look: Partial<Look> = { eye: '#1b1410' };
}

export class BarredOwl extends Strix {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Strix varia',
    common: 'Barred Owl',
    note: 'Round head, dark eyes, barred chest and streaked belly. An eastern owl that spread west in the last century and is now regular in the Miller Peninsula forest, often calling by day on cloudy afternoons.',
  };

  static override flight: Partial<FlightProfile> = { flapRate: 4 };

  static override ecology: Partial<Ecology> = {
    call: 'who-cooks-for-you, who-cooks-for-you-all',
    presence: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  };

  static override look: Partial<Look> = {
    length: 0.52,
    build: 0.8,
    wingSpan: 2.1,
    body: '#7a6858',
    belly: '#e6dccb',
    head: '#8a7664',
    breast: '#8a7664',
    spots: '#6b4f3a',
    eyeRing: '#c9bfae',
    wing: '#6e5e4f',
    tail: '#6b5a4b',
    beak: '#e0c060',
    legs: '#d8c8a8',
  };

  protected override hootGaps = [0.3, 0.3, 0.3, 0.8, 0.3, 0.3, 0.3, 0.3];
  protected override pounceRange = 8;
}

export abstract class Bubo extends Strigidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Bubo',
    common: 'Horned and eagle owls',
    note: 'The big, powerful owls with ear tufts and heavy feet. They take prey as large as a skunk or another owl.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 10, power: 0.35, glide: 0.8, flapRate: 3.3 };
  static override ecology: Partial<Ecology> = { perches: ['treetop', 'branch'] };
  static override look: Partial<Look> = { crest: 'pointed' };
}

export class GreatHornedOwl extends Bubo {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Bubo virginianus',
    common: 'Great Horned Owl',
    note: 'Large and bulky, with ear tufts, yellow eyes and a white throat patch. Resident on the Miller Peninsula and the most likely owl to be heard hooting in winter, when pairs are setting up territories.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'hoo, hoo-hoo, hoo, hoo (deep and muffled)',
    presence: [2, 2, 2, 2, 1, 1, 1, 1, 1, 2, 2, 2],
  };

  static override look: Partial<Look> = {
    length: 0.55,
    build: 0.85,
    wingSpan: 2.5,
    body: '#6a5a4a',
    belly: '#d8c8ae',
    head: '#7a6350',
    throat: '#f3efe6',
    breast: '#8f7c66',
    eyeRing: '#b5703a',
    wing: '#5c4d3f',
    tail: '#5c4d3f',
    beak: '#3a3a3a',
    legs: '#c8b090',
    eye: '#e8c020',
  };

  protected override hootGaps = [1, 0.35, 0.8, 0.8];
  protected override pounceRange = 14;
}

export abstract class Glaucidium extends Strigidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Glaucidium',
    common: 'Pygmy owls',
    note: 'Sparrow- to jay-sized owls that hunt in daylight, often after songbirds. Two dark spots on the back of the head look like a second pair of eyes.',
  };

  static override flight: Partial<FlightProfile> = {
    cruiseSpeed: 10,
    power: 0.7,
    agility: 0.85,
    braking: 0.55,
    glide: 0.3,
    flapRate: 10,
    flapDuty: 0.5,
    cyclePeriod: 0.8,
    restPose: 'folded',
  };

  static override ecology: Partial<Ecology> = { perches: ['treetop', 'branch'], posture: 0.6 };
  static override look: Partial<Look> = { tailLength: 0.5, tailCock: 0.2, wingSpan: 2.2 };

  static override behaviors: BehaviorTable<Glaucidium> = {
    tailFlick: {
      label: 'Flick the tail',
      cue: 'The tail jerks up and down every few seconds while the owl sits still and stares. A hunting owl, usually in good light; a small owl with a long, cocked tail that is not flicking is probably something else.',
    },
    dayHunt: {
      label: 'Daytime dash',
      cue: 'Perched in the open at the top of a conifer, in full daylight, until it launches on a fast, undulating dash after a songbird. Chickadees and nuthatches scold it, which is often how it gets found.',
    },
  };

  override forage(): Script {
    return this.dayHunt();
  }

  *tailFlick(): Script {
    yield* this.toPerch();
    for (let i = 0; i < 5; i++) {
      yield* this.poseTo({ tailAngle: 0.9, tailFan: 0.4 }, 0.1);
      yield* this.poseTo({ tailAngle: this.look.tailCock - 0.3, tailFan: 0 }, 0.08);
      yield* this.poseTo({ tailAngle: this.look.tailCock }, 0.1);
      yield* this.lookAround(rand(0.6, 1.4));
    }
    yield* this.relax();
  }

  *dayHunt(): Script {
    yield* this.toPerch();
    yield* this.lookAround(2);
    yield* this.poseTo({ tailAngle: 0.9 }, 0.1);
    const dir = this.pos.x < 50 ? 1 : -1;
    yield* this.flyTo({ x: clamp(this.pos.x + dir * 25, 8, 92), y: 8 }, { land: false, speed: 1.3 });
    this.world.burst('leaf', this.pos.x, this.pos.y, 5, dir);
    yield* this.toPerch();
    yield* this.relax();
  }
}

export class NorthernPygmyOwl extends Glaucidium {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Glaucidium gnoma',
    common: 'Northern Pygmy-Owl',
    note: 'Starling-sized, brown, with a streaked belly, a small round head and a long tail it jerks. Scarce and easily missed on the Miller Peninsula. It hunts by day and is found by following the alarm calls of chickadees.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'toot… toot… toot (a steady, whistled series)',
    presence: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  };

  static override look: Partial<Look> = {
    length: 0.17,
    build: 0.7,
    headSize: 1.3,
    body: '#7a6048',
    belly: '#f0e8da',
    head: '#7a6048',
    cap: '#6e5640',
    throat: '#f5f0e6',
    spots: '#6b4f3a',
    wing: '#6e5640',
    tail: '#5c4838',
    beak: '#d8c860',
    legs: '#d8c8a8',
  };
}

export abstract class Tytonidae extends Strigiformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Tytonidae',
    common: 'Barn owls',
    note: 'A heart-shaped face, long legs and a slim body, and the most sensitive hearing of any owl. They hunt open ground by flying low over it, not by waiting on a perch.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 8, power: 0.35, agility: 0.5, glide: 0.8, hover: 0.3, flapRate: 4, flapDuty: 0.7 };
  static override ecology: Partial<Ecology> = { perches: ['post', 'branch'], posture: 0.6 };
  static override look: Partial<Look> = { build: 0.5, headSize: 1.4, beakLength: 0.3, tailLength: 0.25, wingSpan: 2.8, legLength: 0.35, eye: '#1a1a1a' };

  static override behaviors: BehaviorTable<Tytonidae> = {
    quarterSearch: {
      label: 'Quarter low, then drop',
      cue: 'Pale and ghostlike, it floats slowly back and forth a few feet over open ground with the head tipped down, hangs for a moment, then drops. Wingbeats are silent and buoyant, unlike a hawk’s. Normally a dusk and night hunt; shown here in daylight.',
    },
  };

  override forage(): Script {
    return this.quarterSearch();
  }

  *quarterSearch(): Script {
    yield* this.toPerch();
    const dir = this.pos.x < 50 ? 1 : -1;
    const x0 = this.pos.x;
    for (let i = 1; i <= 4; i++) {
      yield* this.flyTo({ x: clamp(x0 + dir * 12 * i, 8, 92), y: i % 2 ? 3.5 : 2.5 }, { land: false, speed: 0.55 });
    }
    yield* this.hoverFor(1.2, { aim: -1 });
    yield* this.strike(this.groundSpot(this.pos.x, 2));
    yield* this.toPerch();
    yield* this.relax();
  }
}

export abstract class Tyto extends Tytonidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Tyto',
    common: 'Barn owls',
    note: 'The barn owls proper, found on every continent but Antarctica.',
  };
}

export class BarnOwl extends Tyto {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Tyto alba',
    common: 'Barn Owl',
    note: 'White heart-shaped face, golden-buff back and white underparts, with no ear tufts. Scarce on the Miller Peninsula, best looked for at dusk over fields and near old outbuildings.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'kschhh (a harsh, raspy screech)',
    presence: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  };

  static override look: Partial<Look> = {
    length: 0.36,
    body: '#c99a5e',
    belly: '#f6f1e7',
    head: '#f4efe4',
    eyeRing: '#d8b98a',
    spots: '#8c8a84',
    wing: '#c0925a',
    tail: '#d6b684',
    beak: '#e8dcc0',
    legs: '#e8dcc0',
  };
}
