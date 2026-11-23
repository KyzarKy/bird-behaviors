/**
 * Yard birds from three orders: woodpeckers (extending Picidae), pigeons and
 * doves, swifts (extending Apodiformes) and nighthawks.
 */
import { Bird, clamp, rand, type Pose } from '../core/Bird';
import type { BehaviorTable, Ecology, FlightProfile, Look, Script, Taxon, Vec } from '../core/traits';
import type { World } from '../core/World';
import { Picidae } from './piciformes';
import { Apodiformes } from './apodiformes';

// ================================================================ Picidae

/** The tallest bare trunk is the loudest sounding board. */
const tallestSnag = (world: World) => [...world.habitat.trunks.filter((t) => t.climb)].sort((a, b) => b.climb![1] - a.climb![1])[0];

/** One head stroke; phase advances by pi per stroke. */
const strike = (p: Pose, phase: number) => {
  const hit = Math.abs(Math.sin(phase));
  p.neck = 0.95 - 1.1 * hit;
  p.head = -0.9 * hit;
};

// ------------------------------------------------------------- Dryobates

export abstract class Dryobates extends Picidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Dryobates',
    common: 'Pied woodpeckers',
    note: 'Small black-and-white woodpeckers with a white stripe down the back. The species are close to identical in plumage and are told apart by size, bill length and voice.',
  };

  static override look: Partial<Look> = {
    body: '#2a2a2a',
    belly: '#f2efe8',
    head: '#2a2a2a',
    wing: '#2a2a2a',
    wingBar: '#f2f2ee',
    eyeLine: '#f4f4f0',
    tail: '#2a2a2a',
    beak: '#3a3a3a',
    legs: '#5a5a5a',
  };

  /** Strokes per second and length of one roll. */
  protected drumHz = 15;
  protected drumSecs = 1.3;

  // Same routine as Picidae.drum, with the roll speed and length taken from the species.
  override *drum(): Script {
    const snag = tallestSnag(this.world);
    if (!snag?.climb) return;
    yield* this.flyToTrunk(snag, snag.climb[1] - 3, true);
    this.pose.tailAngle = -0.5;
    for (let roll = 0; roll < 2; roll++) {
      yield* this.wait(0.6);
      this.say('drrrrrrt', 1.2);
      let phase = 0;
      for (let t = 0; t < this.drumSecs; ) {
        const dt = yield;
        t += dt;
        phase += dt * Math.PI * this.drumHz;
        strike(this.pose, phase);
      }
      yield* this.relax(0.1);
      this.pose.tailAngle = -0.5;
      yield* this.lookAround(1.5);
    }
  }
}

export class DownyWoodpecker extends Dryobates {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Dryobates pubescens',
    common: 'Downy Woodpecker',
    note: 'The smallest woodpecker here, with a bill about a third the length of its head. Resident at Gardiner and around the Miller Peninsula yards, often on weed stalks and alder twigs; adult males have a red patch on the nape.',
  };

  static override flight: Partial<FlightProfile> = { flapRate: 11 };

  static override ecology: Partial<Ecology> = {
    call: 'pik! (soft); whinny that falls in pitch',
    presence: [3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3],
  };

  static override look: Partial<Look> = { length: 0.16, build: 0.55, beakLength: 0.5, tailLength: 0.4 };

  static override behaviors: BehaviorTable<DownyWoodpecker> = {
    stemProbe: {
      label: 'Probe weed stems',
      feeding: true,
      cue: 'Small enough to work thin stalks and shrub twigs that would bend under a Hairy. Hangs on the stem, taps lightly and moves on. A Hairy is almost always on a trunk or a big limb.',
    },
  };

  protected override drumHz = 14;
  protected override drumSecs = 1.4;

  *stemProbe(): Script {
    const stem = this.findPerch(['flower', 'twig', 'shrub'], 'any');
    if (!stem) return;
    yield* this.flyOver(stem);
    for (let i = 0; i < 4; i++) {
      yield* this.poseTo({ pitch: 0.7 }, 0.12);
      yield* this.peck(Math.ceil(rand(2, 3)), 0.6);
      yield* this.wait(rand(0.2, 0.5));
    }
    yield* this.relax();
  }
}

export class HairyWoodpecker extends Dryobates {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Dryobates villosus',
    common: 'Hairy Woodpecker',
    note: 'A near copy of the Downy at robin size, with a bill as long as its head. Uncommon but regular in the conifers at the yard edge around the Miller Peninsula and Discovery Bay; it keeps more to big trunks than the Downy does.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'PEEK! (sharp, loud); even rattle on one pitch',
    presence: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  };

  static override look: Partial<Look> = { length: 0.23, build: 0.55, beakLength: 1, tailLength: 0.45 };

  // A longer, faster roll than the Downy's, and it carries farther.
  protected override drumHz = 21;
  protected override drumSecs = 1;
}

// ------------------------------------------------------------- Dryocopus

export abstract class Dryocopus extends Picidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Dryocopus',
    common: 'Black woodpeckers',
    note: 'Crow-sized woodpeckers that cut deep into rotting wood for carpenter ants. Their feeding holes are rectangles a hand long, and the chips pile up at the base of the tree.',
  };

  static override behaviors: BehaviorTable<Dryocopus> = {
    forage: {
      label: 'Excavate a hole',
      cue: 'Braces its tail, throws its whole body back, and hits the trunk with single heavy blows. Chips fly several feet. No other woodpecker here leaves holes this big or this squared off.',
    },
    drum: {
      label: 'Drum',
      cue: 'A slow, loud roll that speeds up and then trails off, carrying a long way through the woods. A Hairy or Downy is much faster and much quieter.',
    },
  };

  override forage(): Script {
    return this.excavate();
  }

  *excavate(): Script {
    const trunk = this.findTrunk();
    if (!trunk?.climb) return;
    const side = yield* this.flyToTrunk(trunk, (trunk.climb[0] + trunk.climb[1]) / 2, true);
    this.pose.tailAngle = -0.5;
    for (let round = 0; round < 4; round++) {
      yield* this.poseTo({ neck: 1.2, head: 0.5 }, 0.2);
      for (let blow = 0; blow < 3; blow++) {
        yield* this.poseTo({ neck: -0.7, head: -1.2 }, 0.06);
        this.world.burst('chip', this.pos.x, this.pos.y + this.size * 0.5, 5, side);
        yield* this.poseTo({ neck: 1.1, head: 0.4 }, 0.12);
      }
      yield* this.wait(rand(0.3, 0.7));
    }
    yield* this.relax(0.2);
  }

  override *drum(): Script {
    const snag = tallestSnag(this.world);
    if (!snag?.climb) return;
    yield* this.flyToTrunk(snag, snag.climb[1] - 3, true);
    this.pose.tailAngle = -0.5;
    for (let roll = 0; roll < 2; roll++) {
      yield* this.wait(0.8);
      this.say('DRRRRRRUM', 2.2);
      const secs = 2.6;
      let phase = 0;
      for (let t = 0; t < secs; ) {
        const dt = yield;
        t += dt;
        // Strokes per second climb from 5 to 12 and fall back.
        phase += dt * Math.PI * (5 + 7 * Math.sin((Math.PI * t) / secs));
        strike(this.pose, phase);
      }
      yield* this.relax(0.15);
      this.pose.tailAngle = -0.5;
      yield* this.lookAround(2);
    }
  }
}

export class PileatedWoodpecker extends Dryocopus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Dryocopus pileatus',
    common: 'Pileated Woodpecker',
    note: 'Crow-sized and black with a flaming red crest and white stripes on the face. Resident in the big timber around Discovery Bay and the Miller Peninsula; listen for the loud, wild call before you see it.',
  };

  // Steady, crow-like flapping, but with a rise and fall at the end of each cycle.
  static override flight: Partial<FlightProfile> = { cruiseSpeed: 12, power: 0.5, agility: 0.35, flapRate: 4.5, flapDuty: 0.7, cyclePeriod: 1.3 };

  static override ecology: Partial<Ecology> = {
    call: 'kuk-kuk-kuk-kuk-kuk-kuk (loud, ringing, wandering in pitch)',
    presence: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  };

  static override look: Partial<Look> = {
    length: 0.46,
    build: 0.5,
    headSize: 1.1,
    beakLength: 1.1,
    wingSpan: 1.5,
    tailLength: 0.4,
    crest: 'pointed',
    body: '#1f1f21',
    belly: '#26262a',
    head: '#1f1f21',
    cap: '#c4161c',
    throat: '#f3f3f0',
    eyeLine: '#f3f3f0',
    wing: '#1f1f21',
    underwing: '#f5f5f2',
    tail: '#1f1f21',
    beak: '#4a4a4a',
    legs: '#3a3a3a',
  };
}

// ----------------------------------------------------------- Sphyrapicus

export abstract class Sphyrapicus extends Picidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Sphyrapicus',
    common: 'Sapsuckers',
    note: 'Woodpeckers that drill neat shallow wells in living bark and lick the sap and the insects stuck in it. The wells are in horizontal and vertical rows, and the bird keeps tending them for weeks.',
  };

  static override behaviors: BehaviorTable<Sphyrapicus> = {
    forage: {
      label: 'Tend sap wells',
      cue: 'Drills a column of small square holes up one trunk, flies off, and comes back to lick them in order. Other woodpeckers peck at random and do not return to the same spot.',
    },
    drum: {
      label: 'Drum',
      cue: 'Not a roll. A quick burst that slows into separate taps, like a stuttering Morse code, and it is repeated at the same pace. Downy and Hairy keep an even beat.',
    },
  };

  override forage(): Script {
    return this.tapWells();
  }

  *tapWells(): Script {
    const trunk = this.findTrunk();
    if (!trunk?.climb) return;
    const rows = [0, 1, 2, 3].map((i) => trunk.climb![0] + 2.5 + i * 2.5);
    const goTo = (y: number) => {
      const y0 = this.pos.y;
      return this.tween(0.25, (t) => (this.pos.y = y0 + (y - y0) * t));
    };
    const side = yield* this.flyToTrunk(trunk, rows[0], true);
    for (const y of rows) {
      yield* goTo(y);
      yield* this.peck(3, 0.9);
      this.world.burst('chip', this.pos.x, y, 2, side);
    }
    // Leave for a while, then come back to the first well and lick up the column.
    yield* this.toPerch(['branch'], 'near');
    yield* this.lookAround(1.5);
    yield* this.flyToTrunk(trunk, rows[0], true);
    for (const y of rows) {
      yield* goTo(y);
      yield* this.peck(1, 0.5);
    }
  }

  override *drum(): Script {
    const snag = tallestSnag(this.world);
    if (!snag?.climb) return;
    yield* this.flyToTrunk(snag, snag.climb[1] - 3, true);
    this.pose.tailAngle = -0.5;
    for (let burst = 0; burst < 2; burst++) {
      yield* this.wait(0.5);
      this.say('rat-a-tat… tat… tat   tat', 2);
      // Each gap is a little longer than the last, with some jitter.
      for (let gap = 0.05; gap < 0.6; gap *= rand(1.1, 1.3)) {
        yield* this.poseTo({ neck: -0.15, head: -0.9 }, 0.03);
        yield* this.poseTo({ neck: 0.95, head: 0 }, gap);
      }
      yield* this.relax(0.1);
      this.pose.tailAngle = -0.5;
      yield* this.lookAround(1.5);
    }
  }
}

export class RedBreastedSapsucker extends Sphyrapicus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Sphyrapicus ruber',
    common: 'Red-breasted Sapsucker',
    note: 'The whole head and breast are red, with a pale bill and a white patch on a black wing. Uncommon around the Miller Peninsula, mostly seen in fall and winter in alder and orchard trees; the rows of wells are the best sign.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'neeer (nasal mew)',
    presence: [2, 2, 2, 2, 1, 1, 1, 1, 2, 2, 2, 2],
  };

  static override look: Partial<Look> = {
    length: 0.21,
    build: 0.55,
    beakLength: 0.8,
    body: '#2b2b2b',
    belly: '#e8dca0',
    head: '#b3202a',
    breast: '#b3202a',
    throat: '#b3202a',
    wing: '#2b2b2b',
    wingBar: '#f2f2ee',
    tail: '#2b2b2b',
    beak: '#4a4a4a',
    legs: '#4a4a4a',
  };
}

// ============================================================ Columbiformes

export abstract class Columbiformes extends Bird {
  static override taxon: Taxon = {
    rank: 'order',
    name: 'Columbiformes',
    common: 'Pigeons and doves',
    note: 'Plump, small-headed, short-billed seed and fruit eaters. They feed their young on crop milk and drink by sucking, without tilting the head back.',
  };

  static override ecology: Partial<Ecology> = { gait: 'walk', groundSpeed: 4, headBob: true, perches: ['branch', 'post', 'treetop'], posture: 0.3 };
}

export abstract class Columbidae extends Columbiformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Columbidae',
    common: 'Pigeons and doves',
    note: 'Big flight muscles make a fast takeoff, often with a loud wing clap. The head thrusts forward and holds while the body catches up, which is what makes the walk look nodding.',
  };

  static override flight: Partial<FlightProfile> = {
    cruiseSpeed: 15,
    power: 0.75,
    agility: 0.45,
    braking: 0.3,
    glide: 0.5,
    flapRate: 7,
    flapDuty: 1,
  };

  static override look: Partial<Look> = {
    build: 0.7,
    neckLength: 0.1,
    legLength: 0.1,
    tailLength: 0.45,
    wingSpan: 1.9,
    headSize: 0.65,
    beakLength: 0.55,
    tailShape: 'fan',
  };

  static override behaviors: BehaviorTable<Columbidae> = {
    clapOff: {
      label: 'Burst into flight',
      cue: 'Crouches, then leaves the ground in one explosive takeoff with a noisy clap or whistle from the wings. Doves and pigeons all do it; the sound differs by species.',
    },
    displayFlight: {
      label: 'Display flight',
      cue: 'Rises in a steep, noisy climb, then spreads the wings and tail and glides down on stiff, motionless wings. A courting bird does this in sight of a mate.',
    },
  };

  /** What the wings do at takeoff and at the top of the display. */
  protected wingSound = 'clatter';
  /** How high the display climb goes. */
  protected displayHeight = 30;

  // They feed on the ground with a steady nod and rapid pecks, not the stop-and-stab of a robin.
  override *forage(): Script {
    yield* this.toGround();
    for (let i = 0; i < 4; i++) {
      yield* this.moveOnGround(this.world.clampLand(this.pos.x + rand(-5, 5)));
      for (let j = 0; j < 3; j++) yield* this.peck(1, 0.8);
    }
    yield* this.relax();
  }

  *clapOff(): Script {
    yield* this.toGround();
    yield* this.peck(2);
    yield* this.poseTo({ crouch: 0.5, neck: 1.2 }, 0.12);
    this.say(this.wingSound, 1.6);
    this.world.burst('dust', this.pos.x, 0, 4, this.pose.facing);
    const dest = this.findPerch(undefined, 'far');
    if (dest) yield* this.flyOver(dest);
    yield* this.relax();
  }

  *displayFlight(): Script {
    const dir = this.pos.x > 50 ? -1 : 1;
    const top = { x: clamp(this.pos.x + dir * 8, 8, 92), y: this.displayHeight };
    yield* this.flyTo(top, { land: false, speed: 1.15 });
    this.say(this.wingSound, 1.5);
    yield* this.flyTo({ x: clamp(top.x + dir * 24, 8, 92), y: 11 }, { land: false, glide: true, speed: 0.8 });
    yield* this.toPerch();
    yield* this.relax();
  }
}

// ------------------------------------------------------------ Patagioenas

export abstract class Patagioenas extends Columbidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Patagioenas',
    common: 'New World pigeons',
    note: 'Large forest pigeons that feed in trees. They climb about the outer twigs for berries and fly in fast flocks.',
  };

  static override behaviors: BehaviorTable<Patagioenas> = {
    canopyFeed: {
      label: 'Reach for berries',
      feeding: true,
      cue: 'A pigeon in the treetop, neck stretched out far and body tilted up, flapping to stay balanced on a thin twig. A ground-feeding dove or town pigeon almost never does this.',
    },
  };

  *canopyFeed(): Script {
    yield* this.toPerch(['branch', 'treetop'], 'any');
    for (let i = 0; i < 4; i++) {
      yield* this.poseTo({ pitch: 0.7, neckExt: 1.7, head: 0.3 }, 0.2);
      yield* this.wait(rand(0.3, 0.6));
      yield* this.poseTo({ pitch: this.restingPose().pitch, neckExt: 1, head: 0 }, 0.2);
      yield* this.lookAround(0.6);
    }
    yield* this.relax();
  }
}

export class BandTailedPigeon extends Patagioenas {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Patagioenas fasciata',
    common: 'Band-tailed Pigeon',
    note: 'Our native pigeon: purple-gray with a white crescent on the nape, a yellow bill with a dark tip, yellow feet and a pale band across the end of the tail. Scarce in winter; common from spring into fall in tall trees around the Miller Peninsula and Discovery Bay.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 17, flapRate: 5.5 };

  static override ecology: Partial<Ecology> = {
    call: 'whoo-whoo… whoo (low, owl-like, two or three notes)',
    presence: [1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 1, 1],
  };

  static override look: Partial<Look> = {
    length: 0.36,
    build: 0.75,
    body: '#8e8aa0',
    belly: '#a8a4b4',
    head: '#9a8aa0',
    neck: '#7d8f70',
    band: '#f2f2f0',
    wing: '#767689',
    tail: '#8a8a96',
    beak: '#e8c030',
    legs: '#e8c030',
    eye: '#2a2a2a',
  };

  // The loudest takeoff of the group.
  protected override wingSound = 'CLAP-clap-clap! (loud wings)';
  protected override displayHeight = 34;
}

// --------------------------------------------------------------- Columba

export abstract class Columba extends Columbidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Columba',
    common: 'Old World pigeons',
    note: 'Pigeons of cliffs and open country. The domestic pigeon, bred from the wild rock dove, lives in cities and farms on every continent.',
  };

  static override behaviors: BehaviorTable<Columba> = {
    strut: {
      label: 'Strut and bow',
      cue: 'A male puffs his throat, fans his tail, bows low and spins on the spot, cooing, and follows the female around. A dove does not do this on the ground.',
    },
  };

  *strut(): Script {
    yield* this.toGround();
    const p = this.pose;
    this.say("coo-roo-c'too-coo", 2.5);
    for (let i = 0; i < 3; i++) {
      p.facing = p.facing === 1 ? -1 : 1;
      yield* this.poseTo({ pitch: -0.25, neck: 1.2, tailFan: 1, tailAngle: 0.5 }, 0.2);
      yield* this.poseTo({ pitch: 0.4, neckExt: 1.3 }, 0.15);
      yield* this.wait(0.2);
      yield* this.moveOnGround(this.world.clampLand(this.pos.x + p.facing * 3), 1.3);
    }
    yield* this.relax();
  }
}

export class RockPigeon extends Columba {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Columba livia',
    common: 'Rock Pigeon',
    note: 'Slate-gray with a green and purple neck, two black bars on the wing and a white rump; feral birds are often spotted or white. Resident around farms and buildings near Gardiner and Sequim, less so in the woods of the Miller Peninsula.',
  };

  static override flight: Partial<FlightProfile> = { flapRate: 6 };

  static override ecology: Partial<Ecology> = { scenes: { beach: 2 },
    call: "coo-roo-c'too-coo",
    presence: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  };

  static override look: Partial<Look> = {
    length: 0.33,
    body: '#8e949c',
    belly: '#9ca2aa',
    head: '#6f7480',
    neck: '#5d8a7a',
    wing: '#8e949c',
    wingBar: '#2c2c30',
    tail: '#6a6e76',
    beak: '#3a3a3a',
    legs: '#c04a5a',
    eye: '#d86a1c',
  };

  // Mostly a short flapping circuit, not a long glide.
  protected override wingSound = 'clatter (wings smack together)';
  protected override displayHeight = 20;
}

// ----------------------------------------------------------- Streptopelia

export abstract class Streptopelia extends Columbidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Streptopelia',
    common: 'Collared doves',
    note: 'Pale doves with a black half-collar at the nape. Several species have spread out of Asia and Africa and live around houses and farms.',
  };

  static override behaviors: BehaviorTable<Streptopelia> = {
    perchCoo: {
      label: 'Coo from a high perch',
      cue: 'Sits high on a treetop or post and bows forward on each coo, tail spread and throat swelling. The song is a steady three-note phrase repeated for minutes.',
    },
  };

  *perchCoo(): Script {
    yield* this.toPerch(['treetop', 'post', 'branch'], 'far');
    for (let i = 0; i < 3; i++) {
      this.say('koo-KOO-kook', 1.4);
      yield* this.poseTo({ pitch: 0.05, neckExt: 1.2, tailFan: 0.7, beakOpen: 0.4 }, 0.2);
      yield* this.wait(0.9);
      yield* this.poseTo({ pitch: this.restingPose().pitch, neckExt: 1, tailFan: 0, beakOpen: 0 }, 0.2);
      yield* this.lookAround(1);
    }
    yield* this.relax();
  }
}

export class EurasianCollaredDove extends Streptopelia {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Streptopelia decaocto',
    common: 'Eurasian Collared-Dove',
    note: 'Pale buff-gray with a thin black collar and a broad square tail tipped in white. Introduced; common year-round around farms, fields and rooftops from Sequim to Gardiner, and on the edge of the Miller Peninsula.',
  };

  static override flight: Partial<FlightProfile> = { flapRate: 6.5 };

  static override ecology: Partial<Ecology> = { scenes: { beach: 1 },
    call: 'koo-KOO-kook (three notes, middle one stressed); harsh hwaah in flight',
    presence: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  };

  static override look: Partial<Look> = {
    length: 0.32,
    build: 0.7,
    tailLength: 0.5,
    tailShape: 'square',
    body: '#c9bba8',
    belly: '#dad0c2',
    head: '#cfc3b2',
    band: '#1d1d1f',
    wing: '#a89a88',
    tail: '#8b7f72',
    beak: '#333333',
    legs: '#b6475a',
    eye: '#7a1c1c',
  };

  // The highest climb of the group, then a long glide down.
  protected override wingSound = 'koo-KOO-kook (call at the top)';
  protected override displayHeight = 40;
}

// ---------------------------------------------------------------- Zenaida

export abstract class Zenaida extends Columbidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Zenaida',
    common: 'Zenaida doves',
    note: 'Slender New World doves with a long pointed tail. They feed on open ground and sunbathe in full view on the ground and on wires.',
  };

  static override behaviors: BehaviorTable<Zenaida> = {
    sunLean: {
      label: 'Sunbathe',
      cue: 'Tips over onto one side on open ground, one wing lifted and the feathers fluffed, and stays like that for a minute with the eyes half shut. It can look injured; it is not.',
    },
  };

  *sunLean(): Script {
    yield* this.toGround();
    this.pose.wings = 'open';
    yield* this.poseTo({ roll: 0.6, flap: -0.6, crouch: 0.4 }, 0.5);
    yield* this.wait(rand(3, 5));
    yield* this.relax(0.4);
  }
}

export class MourningDove extends Zenaida {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Zenaida macroura',
    common: 'Mourning Dove',
    note: 'Slim and warm buff with black spots on the wing, a blue-gray crown, a small head and a long pointed tail edged in white. Scarce in winter; most numerous from April to September on the dry ground and open lots around Sequim and the Miller Peninsula.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 16, power: 0.8, agility: 0.5, flapRate: 7.5 };

  static override ecology: Partial<Ecology> = {
    call: 'cooOO-coo, coo, coo (mournful, slow)',
    presence: [1, 1, 1, 2, 2, 2, 2, 2, 2, 1, 1, 1],
  };

  static override look: Partial<Look> = {
    length: 0.3,
    build: 0.5,
    headSize: 0.6,
    tailLength: 0.6,
    tailShape: 'pointed',
    body: '#b39a82',
    belly: '#d8c0a6',
    head: '#bba58e',
    cap: '#8d96a2',
    breast: '#d4b49c',
    spots: '#2a2a2a',
    eyeRing: '#6fa8d8',
    wing: '#9a8a78',
    tail: '#7f7366',
    beak: '#2a2a2a',
    legs: '#c4506a',
  };

  // The wing feathers whistle at every takeoff and again in the display.
  protected override wingSound = 'wooo-ee-ooo (whistling wings)';
  protected override displayHeight = 30;
}

// ================================================================ Apodidae

export abstract class Apodidae extends Apodiformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Apodidae',
    common: 'Swifts',
    note: 'Cigar-bodied aerial specialists that eat, drink, mate and gather nest material in flight. Their feet cannot perch on a branch; they cling to vertical walls, hollow trees and chimneys.',
  };

  static override flight: Partial<FlightProfile> = {
    cruiseSpeed: 16,
    power: 0.6,
    agility: 0.8,
    braking: 0.3,
    glide: 0.65,
    flapRate: 10,
    flapDuty: 0.7,
    cyclePeriod: 0.5,
    ceiling: 48,
  };

  static override ecology: Partial<Ecology> = { perches: [] };

  static override look: Partial<Look> = {
    build: 0.4,
    neckLength: 0.03,
    tailLength: 0.2,
    wingSpan: 2.5,
    headSize: 0.8,
    beakShape: 'cone',
    beakLength: 0.25,
  };

  static override behaviors: BehaviorTable<Apodidae> = {
    forage: {
      label: 'Hawk insects',
      cue: 'Continuous flight at all heights, in long loops with sudden turns. The wings are bowed and stiff and seem to flicker alternately, not beat together. A swallow flaps and glides on a more relaxed rhythm.',
    },
    roostDrop: {
      label: 'Roost circle',
      cue: 'At dusk the birds gather in circling flocks above a hollow tree or chimney and drop into it one after another, wings held up. They roost clinging to the inside wall, never on a branch.',
    },
    fly: {
      label: 'Fly to a new spot',
      cue: 'It never lands on a wire or branch: any swift you see at rest on one is a swallow. A swift flies the whole time it is in view.',
    },
    preen: {
      label: 'Glide',
      cue: 'Wings set, held in a shallow V, coasting. Swifts do not preen or call from a perch because they have none, so the only pause in the flicker is the glide.',
    },
    call: {
      label: 'Call',
      cue: 'Thin chipping and twittering given in flight, often by pairs or groups. Listen for it overhead before you find the bird.',
    },
  };

  protected override spawn() {
    this.pos = { x: rand(30, 70), y: rand(20, 32) };
    this.airborne = true;
    this.pose.wings = 'open';
  }

  /** A swift never lands, so nothing below ever has to bring it down. */
  protected override *settle(): Script {}

  protected override *idle(): Script {
    for (;;) yield* this.hawkInsects();
  }

  /** A new place in the air, on the far side of the stage. */
  protected airSpot(): Vec {
    return { x: this.pos.x > 50 ? rand(10, 35) : rand(65, 90), y: rand(14, 44) };
  }

  override forage(): Script {
    return this.hawkInsects();
  }

  override *fly(): Script {
    yield* this.flyTo(this.airSpot(), { land: false });
  }

  override *call(): Script {
    this.say(this.ecology.call, 2.4);
    yield* this.flyTo(this.airSpot(), { land: false });
  }

  override *preen(): Script {
    yield* this.flyTo(this.airSpot(), { land: false, glide: true });
  }

  *hawkInsects(): Script {
    for (let i = 0; i < 6; i++) yield* this.flyTo(this.airSpot(), { land: false, speed: rand(0.9, 1.2) });
  }

  *roostDrop(): Script {
    yield* this.soarCircles(8, { x: 46, y: 32 }, 10);
    // The snag at x=32 stands in for the chimney.
    yield* this.flyTo({ x: 32, y: 34 }, { land: false, speed: 1.6 });
    yield* this.flyTo({ x: 44, y: 28 }, { land: false });
  }
}

export abstract class Chaetura extends Apodidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Chaetura',
    common: 'Spine-tailed swifts',
    note: 'Small, short-tailed swifts whose tail feathers end in stiff spines used as a prop against the inside of a hollow tree or chimney.',
  };
}

export class VauxsSwift extends Chaetura {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Chaetura vauxi',
    common: "Vaux's Swift",
    note: 'A small sooty-brown "cigar with wings", paler on the throat and rump, with a very short tail. Arrives in late April and leaves by early October; look up over Gardiner, Discovery Bay and the Miller Peninsula clearings, especially before rain and at dusk.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'chip-chip-chip (dry, insect-like twittering)',
    presence: [0, 0, 0, 1, 2, 3, 3, 3, 2, 0, 0, 0],
  };

  static override look: Partial<Look> = {
    length: 0.11,
    body: '#5d5648',
    belly: '#a79f8e',
    head: '#4a4439',
    throat: '#c8c1b2',
    wing: '#3b362e',
    tail: '#3b362e',
    beak: '#222222',
    legs: '#444444',
  };
}

// ======================================================== Caprimulgiformes

export abstract class Caprimulgiformes extends Bird {
  static override taxon: Taxon = {
    rank: 'order',
    name: 'Caprimulgiformes',
    common: 'Nightjars and allies',
    note: 'Night and dusk insect-eaters with a tiny bill that opens into a very wide mouth, large dark eyes and mottled bark-colored plumage that makes them nearly invisible when they sit still.',
  };

  static override ecology: Partial<Ecology> = { gait: 'none', perches: ['branch', 'post'], posture: 0.05 };
}

export abstract class Caprimulgidae extends Caprimulgiformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Caprimulgidae',
    common: 'Nightjars and nighthawks',
    note: 'The name means "goat sucker", from the old and false story that they milk goats. They catch moths and beetles in an open mouth with soft, silent wingbeats.',
  };

  static override flight: Partial<FlightProfile> = {
    cruiseSpeed: 11,
    power: 0.55,
    agility: 0.9,
    braking: 0.3,
    glide: 0.7,
    flapRate: 5,
    flapDuty: 0.55,
    cyclePeriod: 0.7,
  };

  static override look: Partial<Look> = {
    build: 0.4,
    neckLength: 0.03,
    legLength: 0.04,
    tailLength: 0.5,
    wingSpan: 2.3,
    headSize: 1,
    beakShape: 'cone',
    beakLength: 0.3,
    tailShape: 'forked',
  };

  static override behaviors: BehaviorTable<Caprimulgidae> = {
    forage: {
      label: 'Hawk insects',
      cue: 'Erratic and high, in loose bounding turns on long, pointed, slightly bent wings. Wings are quicker and more irregular than a gull’s, and the bird twists to chase each insect.',
    },
    roostStill: {
      label: 'Roost on a branch',
      cue: 'Sits lengthwise along a limb, not across it as other birds do, eyes nearly shut. It is nearly invisible and almost never seen this way.',
    },
  };

  override forage(): Script {
    return this.hawkInsects();
  }

  *hawkInsects(): Script {
    for (let i = 0; i < 7; i++) {
      const to = { x: clamp(this.pos.x + rand(-22, 22), 8, 92), y: rand(22, 42) };
      yield* this.flyTo(to, { land: false, speed: rand(0.9, 1.3) });
    }
    yield* this.toPerch();
    yield* this.relax();
  }

  *roostStill(): Script {
    yield* this.toPerch(undefined, 'any');
    yield* this.poseTo({ crouch: 0.5, neck: 0.6 }, 0.5);
    yield* this.wait(rand(3, 5));
    yield* this.relax();
  }
}

export abstract class Chordeiles extends Caprimulgidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Chordeiles',
    common: 'Nighthawks',
    note: 'Nightjars that hunt in the air at dusk instead of from the ground. The males dive in display, and the wing feathers make the noise.',
  };

  static override behaviors: BehaviorTable<Chordeiles> = {
    boomDive: {
      label: 'Booming dive',
      cue: 'The male climbs high, folds the wings and falls steeply, then turns up at the bottom with a deep whoosh from the wing feathers. The bird is a dot at the top of the dive, so watch the sky.',
    },
  };

  *boomDive(): Script {
    const dir = this.pos.x > 50 ? -1 : 1;
    const x = (n: number) => clamp(this.pos.x + dir * n, 8, 92);
    yield* this.flyTo({ x: x(8), y: 44 }, { land: false });
    yield* this.flyTo({ x: x(20), y: 14 }, { land: false, speed: 2.2 });
    this.say('BWOOOM', 1.4);
    yield* this.flyTo({ x: x(30), y: 30 }, { land: false, speed: 1.4 });
    yield* this.toPerch();
    yield* this.relax();
  }
}

export class CommonNighthawk extends Chordeiles {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Chordeiles minor',
    common: 'Common Nighthawk',
    note: 'Long pointed wings with a white bar across each, a white throat and a notched tail. Scarce from June to August, over the Miller Peninsula clearings and Discovery Bay at dusk; not a hawk.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'peent! (nasal, buzzy)',
    presence: [0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0],
  };

  static override look: Partial<Look> = {
    length: 0.24,
    body: '#4b4238',
    belly: '#d8cdb8',
    head: '#4b4238',
    throat: '#f5f3ee',
    spots: '#3a322a',
    wing: '#3b342c',
    wingBar: '#f5f3ee',
    tail: '#3b342c',
    beak: '#2a2a2a',
    legs: '#6a5a4a',
    eye: '#111111',
  };
}
