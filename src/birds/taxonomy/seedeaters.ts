/**
 * Sparrows, finches, blackbirds and their Old World counterparts: the small
 * seed and insect eaters of the yard. Passeriformes and Passerellidae are
 * imported; the other four families (finches, blackbirds, Old World sparrows,
 * starlings) start here.
 *
 * New World sparrows inherit the double-scratch from Passerellidae. Only the
 * ones that feed another way override `forage()`: the Zonotrichia crowned
 * sparrows hop and peck, and the Savannah Sparrow runs.
 */
import { rand } from '../core/Bird';
import type { BehaviorTable, Ecology, FlightProfile, Look, PerchKind, Script, Taxon } from '../core/traits';
import { Passerellidae, Passeriformes } from './passeriformes';

// ============================================================ Passerellidae

// ---- Junco

export abstract class Junco extends Passerellidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Junco',
    common: 'Juncos',
    note: 'Ground-feeding sparrows of conifer forest with pale bills and white outer tail feathers, shown whenever the tail is spread.',
  };

  static override ecology: Partial<Ecology> = { perches: ['shrub', 'post', 'branch'] };

  static override behaviors: BehaviorTable<Junco> = {
    tailFlash: {
      label: 'Flick the tail, then flush',
      cue: 'Hops over the ground and keeps snapping the tail open and shut. The white outer feathers flash, and the same white edges show in a flash when it flies up to a low perch. Towhees and other sparrows have no white in the tail.',
    },
  };

  /** The tail is fanned the whole time it is in the air, so the white edges show on takeoff. */
  protected override adjustFlightPose() {
    this.pose.tailFan = 0.9;
  }

  *tailFlash(): Script {
    yield* this.toGround(8);
    for (let i = 0; i < 3; i++) {
      yield* this.moveOnGround(this.world.clampLand(this.pos.x + rand(-4, 4)));
      yield* this.peck(2);
      yield* this.poseTo({ tailFan: 1, tailAngle: this.look.tailCock + 0.3 }, 0.06);
      yield* this.wait(0.2);
      yield* this.poseTo({ tailFan: 0, tailAngle: this.look.tailCock }, 0.1);
    }
    yield* this.toPerch();
    yield* this.relax();
  }
}

export class DarkEyedJunco extends Junco {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Junco hyemalis',
    common: 'Dark-eyed Junco',
    note: 'The Oregon form here: dark slate hood, brown back, pinkish sides, pale pink bill. Present all year on the Miller Peninsula; the flocks under the feeder and along the forest edge are largest from fall to spring.',
  };

  static override ecology: Partial<Ecology> = { scenes: { beach: 1 },
    call: 'tsip, and a dry smacking tck',
    song: 'a flat, musical trill on one pitch',
    presence: [3, 3, 3, 2, 2, 2, 2, 2, 2, 3, 3, 3],
  };

  // The white outer tail feathers cannot be drawn separately, so the tail is gray rather than black.
  static override look: Partial<Look> = {
    length: 0.15,
    build: 0.65,
    tailLength: 0.6,
    body: '#8a6a52',
    belly: '#f2efe8',
    head: '#2b2d31',
    throat: '#2b2d31',
    wing: '#6b5848',
    tail: '#80858c',
    beak: '#e6c9b8',
    legs: '#c8a79a',
  };
}

// ---- Melospiza

export abstract class Melospiza extends Passerellidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Melospiza',
    common: 'Marsh and song sparrows',
    note: 'Streaky brown sparrows of thickets and wet ground, long in the tail. Their tail wobbles in flight.',
  };

  static override ecology: Partial<Ecology> = { perches: ['shrub', 'post'] };

  static override behaviors: BehaviorTable<Melospiza> = {
    pumpFlight: {
      label: 'Fly low, pumping the tail',
      cue: 'A short, low flight from one thicket to the next with the long tail bobbing up and down. A Dark-eyed Junco flashes white at the same moment; a Song Sparrow shows only brown.',
    },
  };

  protected override adjustFlightPose() {
    this.pose.tailAngle = 0.45 * Math.sin(this.airTime * 22);
  }

  *pumpFlight(): Script {
    const next = this.findPerch(['shrub', 'post'], 'far');
    if (next) yield* this.flyTo(next);
    yield* this.relax();
  }
}

export class SongSparrow extends Melospiza {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Melospiza melodia',
    common: 'Song Sparrow',
    note: 'Brown, heavily streaked, with the streaks gathering into a dark central spot on the breast. The commonest sparrow of Gardiner and the Discovery Bay shoreline thickets, singing from a bush top most of the year.',
  };

  static override ecology: Partial<Ecology> = { scenes: { beach: 2 },
    call: 'chimp (a flat, nasal chip)',
    song: 'maids-maids-maids, put on your tea-kettle-ettle-ettle',
    presence: [2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 2, 2],
  };

  static override look: Partial<Look> = {
    length: 0.15,
    tailLength: 0.65,
    tailShape: 'fan',
    body: '#8b6a4a',
    belly: '#efe9df',
    head: '#8a6648',
    cap: '#7a4e30',
    throat: '#efe9df',
    breast: '#efe9df',
    band: '#5a3b25',
    spots: '#5a3b25',
    wing: '#7a5a3e',
    tail: '#6e5238',
    beak: '#6b5b4c',
    legs: '#c8a58a',
  };
}

// ---- Zonotrichia

export abstract class Zonotrichia extends Passerellidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Zonotrichia',
    common: 'Crowned sparrows',
    note: 'Large, plain-breasted sparrows with striped or colored crowns. They feed in loose flocks on open ground, hopping and pecking rather than scratching hard.',
  };

  static override ecology: Partial<Ecology> = { perches: ['shrub', 'post'], posture: 0.3 };

  static override behaviors: BehaviorTable<Zonotrichia> = {
    hopFeed: {
      label: 'Hop, peck, look up',
      cue: 'Three short hops, a peck, then it stands tall with head up and scans before the next hop. This is the usual feeding pattern, with little leaf-kicking, unlike a towhee or Fox Sparrow.',
    },
  };

  /** How upright it stands when it stops to scan. */
  protected alertPitch = 0.5;

  override forage(): Script {
    return this.hopFeed();
  }

  *hopFeed(): Script {
    yield* this.toGround(10);
    for (let i = 0; i < 3; i++) {
      yield* this.moveOnGround(this.world.clampLand(this.pos.x + this.pose.facing * rand(1.5, 4)));
      yield* this.peck(Math.ceil(rand(1, 3)));
      yield* this.poseTo({ pitch: this.alertPitch, neck: 1.2, head: 0.2 }, 0.1);
      yield* this.lookAround(rand(0.5, 1));
      yield* this.relax(0.1);
    }
    yield* this.relax();
  }
}

export class WhiteCrownedSparrow extends Zonotrichia {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Zonotrichia leucophrys',
    common: 'White-crowned Sparrow',
    note: 'Crisp black and white head stripes, gray breast, pink-orange bill. The Puget Sound form nests in brushy clearings and the dune edge at Gardiner and along the Miller Peninsula from April to August; a few stay through winter.',
  };

  static override ecology: Partial<Ecology> = { scenes: { beach: 2 },
    call: 'pink! (a sharp, metallic chip)',
    song: 'I-whistle-then-buzz-chee-zee (a clear whistle, then buzzy trills)',
    presence: [1, 1, 2, 3, 3, 3, 3, 3, 2, 2, 1, 1],
  };

  protected override alertPitch = 0.65;

  static override look: Partial<Look> = {
    length: 0.17,
    tailLength: 0.65,
    body: '#8a7a6a',
    belly: '#c6c3bd',
    head: '#b9b6b0',
    cap: '#f5f5f2',
    eyeLine: '#161616',
    throat: '#b9b6b0',
    breast: '#b9b6b0',
    wing: '#7a5e48',
    wingBar: '#e8e3da',
    tail: '#6a5a4a',
    beak: '#e6a852',
    legs: '#c9a98a',
  };
}

export class GoldenCrownedSparrow extends Zonotrichia {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Zonotrichia atricapilla',
    common: 'Golden-crowned Sparrow',
    note: 'A yellow crown patch edged in black, on a dull gray-brown bird with a dark bill. A winter visitor from October to April under brush piles and at feeders around Gardiner; gone by May to nest in Alaska and northern British Columbia.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'tseep (a thin, sliding note)',
    song: 'oh dear me (three whistles, each lower than the last)',
    presence: [3, 3, 2, 1, 0, 0, 0, 0, 0, 2, 3, 3],
  };

  // Stays low and hunched where the White-crowned stands tall.
  protected override alertPitch = 0.4;

  static override look: Partial<Look> = {
    length: 0.17,
    tailLength: 0.65,
    body: '#8a7660',
    belly: '#b5afa6',
    head: '#8a7f74',
    cap: '#e8b923',
    eyeLine: '#1a1a1a',
    throat: '#b5afa6',
    breast: '#b5afa6',
    wing: '#7a6048',
    wingBar: '#d8d0c2',
    tail: '#6a5a4a',
    beak: '#5a5048',
    legs: '#7a6a5a',
  };
}

// ---- Passerella

export abstract class Passerella extends Passerellidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Passerella',
    common: 'Fox sparrows',
    note: 'Big, round sparrows with heavy breast spots and a rusty tail. They scratch harder than any other sparrow.',
  };

  static override behaviors: BehaviorTable<Passerella> = {
    doubleScratch: {
      label: 'Double-scratch',
      cue: 'Two long bouts of hop-and-kick, with leaves flying a body length behind it, enough to hear from across the yard. A towhee does the same, but a Fox Sparrow is the only one with a spotted, rust-tailed look.',
    },
  };

  override *doubleScratch(): Script {
    yield* super.doubleScratch();
    yield* super.doubleScratch();
  }
}

export class FoxSparrow extends Passerella {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Passerella iliaca',
    common: 'Fox Sparrow',
    note: 'The dark Sooty form here: chocolate-brown above, with thick, blotchy spots below that merge on the breast. Arrives in October and stays to April in the thickets around Gardiner, scarce and often alone.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'tchup (a loud smack)',
    song: 'sweet sweet swee-et chew chew (rich, slurred whistles, mostly in spring)',
    presence: [2, 2, 2, 1, 0, 0, 0, 0, 0, 1, 2, 2],
  };

  static override look: Partial<Look> = {
    length: 0.18,
    build: 0.7,
    tailLength: 0.65,
    body: '#4d3426',
    belly: '#efe9df',
    head: '#5a4030',
    breast: '#efe9df',
    spots: '#4a2f20',
    wing: '#5a3a28',
    tail: '#7a3a1c',
    beak: '#cfa840',
    legs: '#b89a80',
  };
}

// ---- Passerculus

export abstract class Passerculus extends Passerellidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Passerculus',
    common: 'Savannah sparrow',
    note: 'A single species of grassland sparrow that nests on the ground and feeds by running through the grass.',
  };

  static override ecology: Partial<Ecology> = { perches: ['post', 'shrub'], gait: 'run', groundSpeed: 7 };

  static override behaviors: BehaviorTable<Passerculus> = {
    runAndDrop: {
      label: 'Run, freeze, flush and drop',
      cue: 'Runs through the grass like a mouse, freezes with its head down, then flushes low and drops back into cover a few yards on. Compare a Song Sparrow, which dives into a thicket, and a towhee, which scratches.',
    },
  };

  override forage(): Script {
    return this.runAndDrop();
  }

  *runAndDrop(): Script {
    yield* this.toGround(10);
    const dir = this.pos.x > 50 ? -1 : 1;
    yield* this.moveOnGround(this.world.clampLand(this.pos.x + dir * rand(6, 12)), 1.4);
    yield* this.poseTo({ crouch: 0.5, neck: 0.5 }, 0.12);
    yield* this.wait(rand(0.8, 1.4));
    yield* this.flyOver(this.groundSpot(this.pos.x + dir * 12, 3));
    yield* this.peck(2);
    yield* this.relax();
  }
}

export class SavannahSparrow extends Passerculus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Passerculus sandwichensis',
    common: 'Savannah Sparrow',
    note: 'Streaky and pale, with a yellow eyebrow, a short notched tail and pink legs. A summer bird of the beach-grass edge at Gardiner and the open grass on Protection Island and the Miller Peninsula, from April to September.',
  };

  static override ecology: Partial<Ecology> = { scenes: { beach: 3 },
    call: 'tsip (thin)',
    song: 'tip-tip-tip, see-see-see, say-whee (thin and buzzy)',
    presence: [0, 0, 1, 2, 3, 3, 3, 2, 2, 1, 0, 0],
  };

  static override look: Partial<Look> = {
    length: 0.14,
    tailLength: 0.4,
    body: '#8a7a62',
    belly: '#f2eee6',
    head: '#8a7a62',
    cap: '#7a6a54',
    eyeLine: '#e5c533',
    breast: '#f2eee6',
    spots: '#5a4a3c',
    wing: '#7a6a56',
    tail: '#6a5c4c',
    beak: '#8a7a68',
    legs: '#d8a898',
  };
}

// ============================================================== Fringillidae

export abstract class Fringillidae extends Passeriformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Fringillidae',
    common: 'Finches',
    note: 'Seed-eaters with a thick, conical bill that cracks the hull while the tongue turns the seed. They fly in deep bounds and call as they go, and move in flocks.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 10, flapRate: 14, flapDuty: 0.45, cyclePeriod: 0.5 };
  static override ecology: Partial<Ecology> = { perches: ['branch', 'shrub', 'twig'] };
  static override look: Partial<Look> = { build: 0.65, beakLength: 0.45, tailShape: 'forked', tailLength: 0.5 };

  static override behaviors: BehaviorTable<Fringillidae> = {
    fly: {
      label: 'Fly to a new spot',
      cue: 'Flight is a series of bounds: a few quick wingbeats climb, the wings close, and the bird dips. A finch usually calls on the way, which a sparrow in a short hop does not.',
    },
    seedHusk: {
      label: 'Husk a seed',
      cue: 'Sits on a seed head or a branch, rolls one seed in its bill, and drops the husk. It eats the seed and spits the hull. A chickadee carries the seed away and hammers it.',
    },
  };

  /** Seeds eaten in one visit. */
  protected huskCount = 3;

  override forage(): Script {
    return this.seedHusk();
  }

  *seedHusk(): Script {
    yield* this.travelTo(this.findPerch(['flower', 'shrub']) ?? this.groundSpot(this.pos.x, 8));
    for (let i = 0; i < this.huskCount; i++) {
      yield* this.peck(1, 0.5);
      this.pose.carry = 'seed';
      for (let turn = 0; turn < 4; turn++) {
        yield* this.poseTo({ beakOpen: 0.8, head: -0.3 }, 0.07);
        yield* this.poseTo({ beakOpen: 0, head: -0.5 }, 0.07);
      }
      this.pose.carry = null;
      this.world.burst('chip', this.pos.x, this.pos.y + 0.5, 2);
      yield* this.relax(0.1);
    }
    yield* this.relax();
  }
}

// ---- Haemorhous

export abstract class Haemorhous extends Fringillidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Haemorhous',
    common: 'American rosefinches',
    note: 'Males are washed in red, from the head down. House and Purple Finches look alike in a feeder flock and are told apart by head pattern and habitat.',
  };
}

export class HouseFinch extends Haemorhous {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Haemorhous mexicanus',
    common: 'House Finch',
    note: 'Males have a red head and breast and brown-streaked flanks; females are plain streaked brown. Regular at feeders and on the wires and fence posts around Gardiner and the Miller Peninsula homes, in flocks.',
  };

  static override ecology: Partial<Ecology> = {
    perches: ['post', 'branch', 'shrub'],
    call: 'cheep (a sparrow-like chirp)',
    song: 'a long, jumbled warble that ends in a nasal zhweeer',
    presence: [2, 2, 2, 2, 3, 3, 3, 3, 3, 2, 2, 2],
  };

  // A flock bird that eats steadily at one spot.
  protected override huskCount = 4;

  static override look: Partial<Look> = {
    length: 0.15,
    tailLength: 0.55,
    body: '#8a7360',
    belly: '#e8dfd2',
    head: '#c8383a',
    throat: '#d4474a',
    breast: '#d85a4c',
    spots: '#8a5a48',
    wing: '#6d5a48',
    tail: '#5c4c3d',
    beak: '#a89a88',
    legs: '#6a5a4a',
  };
}

export class PurpleFinch extends Haemorhous {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Haemorhous purpureus',
    common: 'Purple Finch',
    note: 'Males are washed raspberry over head, back and breast, with a pale eyebrow and a short notched tail. Found in the conifer edge around Gardiner and the Miller Peninsula, scarce in winter and more regular from April to September.',
  };

  static override ecology: Partial<Ecology> = {
    perches: ['treetop', 'branch'],
    call: 'pik (a dry, metallic note)',
    song: 'a rich, fast warble, longer and smoother than a robin’s',
    presence: [1, 1, 2, 2, 3, 3, 3, 2, 2, 2, 1, 1],
  };

  // A forest bird that takes a few seeds and moves on.
  protected override huskCount = 2;

  static override look: Partial<Look> = {
    length: 0.15,
    build: 0.7,
    headSize: 1.1,
    tailLength: 0.4,
    body: '#9a6a62',
    belly: '#f0e8ea',
    head: '#b04070',
    throat: '#c05a7e',
    breast: '#c05a7e',
    eyeLine: '#d8c4c8',
    wing: '#6a4e44',
    tail: '#4f4440',
    beak: '#8e8478',
    legs: '#6a5a4a',
  };
}

// ---- Spinus

export abstract class Spinus extends Fringillidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Spinus',
    common: 'Siskins and goldfinches',
    note: 'Small, slender-billed finches that hang from the thin tips of seed heads and cones. They fly in a deep bound and call on every bound.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 9, flapRate: 15, flapDuty: 0.4, cyclePeriod: 0.4 };
  static override ecology: Partial<Ecology> = { perches: ['branch', 'twig', 'flower'] };
  static override look: Partial<Look> = { build: 0.55, beakLength: 0.4 };

  static override behaviors: BehaviorTable<Spinus> = {
    fly: {
      label: 'Fly to a new spot',
      cue: 'Deep, rolling bounds, a call on each dip. The pattern repeats along the whole flight line, so you hear the rhythm before you see the bird.',
    },
    hangFeed: {
      label: 'Hang and feed',
      cue: 'Lands on the tip of a seed head or twig and swings upside down to pick at it, fluttering the wings for balance. Only chickadees and crossbills hang like this.',
    },
  };

  /** Perches it hangs from. */
  protected hangOn: PerchKind[] = ['twig'];
  /** Calls on one bound in this many. */
  protected callEvery = 2;
  private bound = -1;

  override forage(): Script {
    return this.hangFeed();
  }

  protected override adjustFlightPose() {
    if (this.airTime < 0.05) this.bound = -1;
    const n = Math.floor(this.airTime / this.flight.cyclePeriod);
    if (n === this.bound) return;
    this.bound = n;
    if (n % this.callEvery === 0) this.say(this.ecology.call, 0.35);
  }

  *hangFeed(): Script {
    const perch = this.findPerch(this.hangOn);
    if (!perch) return;
    yield* this.flyTo(perch);
    yield* this.poseTo({ rotation: Math.PI * this.pose.facing }, 0.18);
    for (let i = 0; i < 3; i++) {
      yield* this.peck(2, 0.7);
      yield* this.wait(rand(0.1, 0.4));
    }
    yield* this.poseTo({ rotation: 0 }, 0.18);
    yield* this.relax();
  }
}

export class PineSiskin extends Spinus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Spinus pinus',
    common: 'Pine Siskin',
    note: 'A small, heavily streaked brown finch with a sharp bill and yellow in the wing and tail. Flocks come and go with the cone crop: scarce some years, abundant at Gardiner and the Miller Peninsula feeders in others, mostly outside summer.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'tit-i-tit, and a rising, buzzy zzzreeee',
    song: 'a rambling jumble of twitters and wheezy buzzes',
    presence: [2, 2, 2, 2, 2, 2, 1, 1, 1, 2, 2, 2],
  };

  // Feeds in the conifer tops, calling rather less per bound than a goldfinch.
  protected override hangOn: PerchKind[] = ['twig', 'treetop'];
  protected override callEvery = 3;

  static override look: Partial<Look> = {
    length: 0.13,
    body: '#8a7a60',
    belly: '#e8e2d2',
    head: '#7a6a54',
    spots: '#4d4034',
    wing: '#5a4c3c',
    wingBar: '#e8d44a',
    underwing: '#e5cf3a',
    tail: '#4e4438',
    beak: '#5a4e42',
    legs: '#4a3f36',
  };
}

export class AmericanGoldfinch extends Spinus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Spinus tristis',
    common: 'American Goldfinch',
    note: 'Breeding males are bright yellow with a black cap and black wings; females and winter birds are dull olive-brown. Common at Gardiner and the Miller Peninsula from April to September on thistle and dandelion heads; a few stay through winter.',
  };

  static override flight: Partial<FlightProfile> = { flapDuty: 0.3, cyclePeriod: 0.38 };

  static override ecology: Partial<Ecology> = {
    call: 'po-ta-to-chip',
    song: 'a long, bright string of twitters and whistles',
    presence: [1, 1, 1, 2, 3, 3, 3, 3, 3, 2, 1, 1],
  };

  protected override hangOn: PerchKind[] = ['flower'];
  protected override callEvery = 1;

  static override look: Partial<Look> = {
    length: 0.12,
    body: '#f3d321',
    belly: '#f7e95a',
    head: '#f3d321',
    cap: '#16161a',
    wing: '#1a1a1d',
    wingBar: '#fafafa',
    tail: '#1a1a1d',
    beak: '#f0a064',
    legs: '#b89a80',
  };
}

// ---- Loxia

export abstract class Loxia extends Fringillidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Loxia',
    common: 'Crossbills',
    note: 'Finches whose bill tips cross. The crossed tips slip under a cone scale and lever it open.',
  };

  static override ecology: Partial<Ecology> = { perches: ['treetop', 'branch'] };
  static override look: Partial<Look> = { beakShape: 'hook', beakLength: 0.8, headSize: 1.1, tailLength: 0.4 };

  static override behaviors: BehaviorTable<Loxia> = {
    pryCones: {
      label: 'Pry open a cone',
      cue: 'Climbs about a conifer top using bill and feet like a small parrot, hangs from a cone, and twists its bill sideways to spread the scales. Seeds and scales drop. Nothing else in the yard feeds this way.',
    },
  };

  override forage(): Script {
    return this.pryCones();
  }

  *pryCones(): Script {
    const top = this.findPerch(['treetop'], 'any');
    if (!top) return;
    yield* this.flyTo(top);
    for (let i = 0; i < 3; i++) {
      const side = i % 2 ? -1 : 1;
      const x0 = this.pos.x;
      const y0 = this.pos.y;
      // Hauls itself along with the bill, then hangs from the cone.
      yield* this.tween(0.4, (t) => {
        this.pos.x = x0 + side * 1.2 * t;
        this.pos.y = y0 - t;
        this.pose.rotation = this.pose.facing * 0.8 * t;
      });
      for (let pry = 0; pry < 4; pry++) {
        yield* this.poseTo({ beakOpen: 1, head: -0.9 }, 0.1);
        yield* this.poseTo({ beakOpen: 0.2, head: -0.5 }, 0.1);
        this.world.emit('seed', this.pos.x, this.pos.y, { vx: rand(-2, 2), gravity: 25, life: 3 });
      }
    }
    this.pose.rotation = 0;
    yield* this.toPerch();
    yield* this.relax();
  }
}

export class RedCrossbill extends Loxia {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Loxia curvirostra',
    common: 'Red Crossbill',
    note: 'Males are brick red with dark wings and a crossed bill; females are olive-yellow. Scarce and irregular around Gardiner and the Miller Peninsula, in small flocks that follow cone crops, most often in June and July.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'jip-jip-jip (hard and dry, usually heard overhead)',
    song: 'a jumble of warbles and chips',
    presence: [1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 1],
  };

  static override look: Partial<Look> = {
    length: 0.16,
    build: 0.7,
    body: '#b9372c',
    belly: '#c24a38',
    head: '#b9372c',
    wing: '#3a2f2a',
    tail: '#3a2f2a',
    beak: '#2a2420',
    legs: '#4a4038',
  };
}

// ---- Hesperiphona

export abstract class Hesperiphona extends Fringillidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Hesperiphona',
    common: 'Evening grosbeaks',
    note: 'Two species of heavy, thick-billed finches, the Evening Grosbeak of northern and western forests and the Hooded Grosbeak of Mexico.',
  };

  static override ecology: Partial<Ecology> = { perches: ['treetop', 'branch'] };
  static override look: Partial<Look> = { beakShape: 'stout', beakLength: 0.9, headSize: 1.2, tailLength: 0.4, tailShape: 'square' };

  static override behaviors: BehaviorTable<Hesperiphona> = {
    seedHusk: {
      label: 'Crack a seed',
      cue: 'One large seed at a time, held in the huge bill and cracked with an audible pop. It sheds the hulls rather than carrying them off, and eats few seeds per visit compared with a House Finch.',
    },
  };

  protected override huskCount = 1;
}

export class EveningGrosbeak extends Hesperiphona {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Hesperiphona vespertina',
    common: 'Evening Grosbeak',
    note: 'A chunky finch: the male has a dark head with a yellow brow, a yellow body, black wings with a large white patch, and a pale ivory bill. Irregular at Gardiner and the Miller Peninsula; most records are of small flocks at feeders in winter and spring.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'peer! (a loud, ringing note, like a House Sparrow’s but louder)',
    song: 'a halting series of the same ringing notes',
    presence: [1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1],
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 12, flapRate: 9 };

  static override look: Partial<Look> = {
    length: 0.2,
    build: 0.8,
    body: '#b89a32',
    belly: '#d6b82e',
    head: '#5a4426',
    eyeLine: '#e8c12a',
    throat: '#5a4426',
    wing: '#161616',
    wingBar: '#f5f5f2',
    tail: '#161616',
    beak: '#c8d88a',
    legs: '#b89a80',
  };
}

// ================================================================ Icteridae

export abstract class Icteridae extends Passeriformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Icteridae',
    common: 'Blackbirds and allies',
    note: 'New World songbirds with a sharp, conical bill and strong jaw muscles that open the bill to pry. Open-country birds that walk rather than hop, and males that display with spread wings and fluffed feathers.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 11, flapRate: 8, flapDuty: 0.85, cyclePeriod: 0.6 };
  static override ecology: Partial<Ecology> = { perches: ['post', 'branch', 'shrub'], gait: 'walk', groundSpeed: 6, posture: 0.3 };
  static override look: Partial<Look> = { build: 0.6, beakLength: 0.7, beakShape: 'cone' };

  static override behaviors: BehaviorTable<Icteridae> = {
    walkForage: {
      label: 'Walk and peck',
      cue: 'Strides across the grass and stabs at the ground without hopping. A sparrow of similar size hops.',
    },
  };

  override forage(): Script {
    return this.walkForage();
  }

  *walkForage(): Script {
    yield* this.toGround(10);
    for (let i = 0; i < 4; i++) {
      yield* this.moveOnGround(this.world.clampLand(this.pos.x + this.pose.facing * rand(2, 6)));
      yield* this.peck(Math.ceil(rand(1, 2)), 0.8);
    }
    yield* this.relax();
  }
}

// ---- Agelaius

export abstract class Agelaius extends Icteridae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Agelaius',
    common: 'Marsh blackbirds',
    note: 'Males with colored shoulder patches that they show off from a high perch to hold a territory in a marsh or wet field.',
  };

  static override behaviors: BehaviorTable<Agelaius> = {
    epauletDisplay: {
      label: 'Song-spread',
      cue: 'Stands tall on a post, tail fanned, and spreads the shoulders to show the red epaulets as it sings. The epaulets are hidden when the bird is at rest, and sometimes only a yellow edge shows.',
    },
  };

  *epauletDisplay(): Script {
    yield* this.toPerch(['post', 'shrub']);
    yield* this.poseTo({ pitch: this.restingPose().pitch + 0.3, neck: 1.2, head: 0.35 }, 0.2);
    this.say(`♪ ${this.ecology.song ?? this.ecology.call}`, 2.6);
    this.pose.wings = 'open';
    for (let i = 0; i < 3; i++) {
      yield* this.poseTo({ beakOpen: 1, flap: 0.45, tailFan: 1 }, 0.12);
      yield* this.poseTo({ beakOpen: 0.2, flap: 0.2, tailFan: 0.4 }, 0.2);
      yield* this.wait(0.3);
    }
    this.pose.wings = 'folded';
    yield* this.relax(0.3);
  }
}

export class RedWingedBlackbird extends Agelaius {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Agelaius phoeniceus',
    common: 'Red-winged Blackbird',
    note: 'The male is black with a red and yellow shoulder patch; the female is heavily streaked brown, like a large sparrow. Nests in the wet grass and cattails around Discovery Bay and visits yards in flocks; most visible from March to August.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'chack (a hard, dry note)',
    song: 'conk-la-reeee',
    presence: [1, 1, 2, 3, 3, 3, 3, 3, 2, 2, 1, 1],
  };

  // The epaulet cannot be drawn separately, so it is a red wing bar.
  static override look: Partial<Look> = {
    length: 0.22,
    tailLength: 0.6,
    tailShape: 'fan',
    body: '#141416',
    belly: '#141416',
    head: '#141416',
    wing: '#141416',
    wingBar: '#e03a1e',
    tail: '#141416',
    beak: '#222222',
    legs: '#222222',
  };
}

// ---- Euphagus

export abstract class Euphagus extends Icteridae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Euphagus',
    common: 'Grackle-like blackbirds',
    note: 'Glossy black, long-tailed blackbirds of open ground that walk in flocks.',
  };

  // The only icterid here with the pigeon-style head jerk.
  static override ecology: Partial<Ecology> = { headBob: true };
  static override look: Partial<Look> = { tailLength: 0.65 };
}

export class BrewersBlackbird extends Euphagus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Euphagus cyanocephalus',
    common: 'Brewer’s Blackbird',
    note: 'The male is glossy black with a purple head and a pale yellow eye; the female is gray-brown with a dark eye. Uncommon at Gardiner and the Miller Peninsula, in parking lots and farm fields, more often in flocks from spring to fall.',
  };

  static override ecology: Partial<Ecology> = { scenes: { beach: 2 },
    call: 'tchk (a hard click)',
    song: 'a creaky, wheezy ksh-eeek',
    presence: [1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1],
  };

  static override look: Partial<Look> = {
    length: 0.23,
    body: '#1c1c24',
    belly: '#1c1c24',
    head: '#2a2036',
    wing: '#1e2a26',
    tail: '#1a2a26',
    beak: '#111111',
    legs: '#111111',
    eye: '#f0e9a6',
  };
}

// ---- Molothrus

export abstract class Molothrus extends Icteridae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Molothrus',
    common: 'Cowbirds',
    note: 'Brood parasites: females lay in other birds’ nests, so the young are raised by hosts such as sparrows and warblers.',
  };

  static override look: Partial<Look> = { beakLength: 0.45, tailLength: 0.5, build: 0.7 };

  static override behaviors: BehaviorTable<Molothrus> = {
    bowDisplay: {
      label: 'Bow-spread display',
      cue: 'The male puffs up, spreads wings and tail, and bows head down while giving a bubbling song. The bow and the glugging notes are distinctive; a Red-winged Blackbird stands tall and shows red.',
    },
  };

  *bowDisplay(): Script {
    yield* this.toPerch(['post', 'branch']);
    yield* this.poseTo({ pitch: this.restingPose().pitch + 0.2, neck: 1.2 }, 0.2);
    this.say(`♪ ${this.ecology.song ?? this.ecology.call}`, 2.4);
    this.pose.wings = 'open';
    yield* this.poseTo({ flap: 0.6, tailFan: 1, pitch: -0.45, neck: 0.2, head: -0.8, beakOpen: 1 }, 0.3);
    yield* this.wait(0.8);
    this.pose.wings = 'folded';
    yield* this.relax(0.3);
  }
}

export class BrownHeadedCowbird extends Molothrus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Molothrus ater',
    common: 'Brown-headed Cowbird',
    note: 'Short, thick bill; the male has a brown head on a glossy black body, the female is plain gray-brown. Uncommon around Gardiner and the Miller Peninsula, in yards and horse pastures from April to August.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'a dry chatter or rattle',
    song: 'glug-glug-gleee (a liquid gurgle, then a thin whistle)',
    presence: [0, 0, 1, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  };

  static override look: Partial<Look> = {
    length: 0.19,
    body: '#17171a',
    belly: '#17171a',
    head: '#5a3d2a',
    wing: '#17171a',
    tail: '#17171a',
    beak: '#222222',
    legs: '#222222',
  };
}

// ================================================================= Passeridae

export abstract class Passeridae extends Passeriformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Passeridae',
    common: 'Old World sparrows',
    note: 'Not related to the New World sparrows, only similar in looks. Stocky, thick-billed, social birds that live around people.',
  };

  static override ecology: Partial<Ecology> = { perches: ['post', 'branch', 'shrub'] };
  static override look: Partial<Look> = { build: 0.75, beakLength: 0.4 };

  static override behaviors: BehaviorTable<Passeridae> = {
    dustBath: {
      label: 'Dust-bathe',
      cue: 'Squats on bare ground, flutters the wings and shuffles in a cloud of dust. It does this in groups, and the shallow dents it makes remain.',
    },
  };

  *dustBath(): Script {
    yield* this.toGround(6);
    this.pose.wings = 'open';
    yield* this.poseTo({ crouch: 0.8, pitch: -0.1 }, 0.2);
    for (let i = 0; i < 8; i++) {
      yield* this.poseTo({ flap: i % 2 ? 0.7 : -0.5, roll: i % 2 ? 0.3 : -0.3 }, 0.1);
      this.world.burst('dust', this.pos.x, 0.3, 3);
    }
    this.pose.wings = 'folded';
    yield* this.relax(0.2);
    for (let i = 0; i < 3; i++) {
      yield* this.poseTo({ pitch: 0.3, tailFan: 0.8 }, 0.05);
      yield* this.poseTo({ pitch: 0, tailFan: 0.2 }, 0.05);
    }
    yield* this.relax();
  }
}

export abstract class Passer extends Passeridae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Passer',
    common: 'Old World sparrows',
    note: 'The sparrows of buildings and farmyards across Europe, Asia and Africa. The House Sparrow has been introduced worldwide.',
  };
}

export class HouseSparrow extends Passer {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Passer domesticus',
    common: 'House Sparrow',
    note: 'The male has a gray crown, black bib and chestnut nape; the female is plain buff with a pale eyebrow. Scarce on the Miller Peninsula and around Gardiner, regular near farms and buildings toward Sequim, at feeders and in the weedy edges of yards.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'cheep, chirrup (a harsh, repeated chatter)',
    song: 'a repeated cheep-cheep-cheep',
    presence: [1, 1, 1, 1, 2, 2, 2, 2, 2, 1, 1, 1],
  };

  static override look: Partial<Look> = {
    length: 0.16,
    body: '#8a6a48',
    belly: '#cfc8bc',
    head: '#c9c4bc',
    cap: '#8a8d92',
    eyeLine: '#7a3a1e',
    throat: '#1a1a1a',
    breast: '#cfc8bc',
    wing: '#7a5a3e',
    wingBar: '#f2efe6',
    tail: '#6a5a48',
    beak: '#2b2b2b',
    legs: '#b09a88',
  };
}

// ================================================================== Sturnidae

export abstract class Sturnidae extends Passeriformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Sturnidae',
    common: 'Starlings and mynas',
    note: 'Gregarious, noisy, strong-footed birds that walk, mimic other birds and sounds, and feed by prying the bill open in the ground.',
  };

  // Steady, fast wingbeats on triangular wings, with brief glides.
  static override flight: Partial<FlightProfile> = { cruiseSpeed: 15, power: 0.7, agility: 0.5, flapRate: 11, flapDuty: 0.85, cyclePeriod: 0.8, restPose: 'spread', glide: 0.5 };
  static override ecology: Partial<Ecology> = { perches: ['branch', 'post', 'treetop'], gait: 'walk', groundSpeed: 7, posture: 0.25 };
  static override look: Partial<Look> = { build: 0.7, beakShape: 'dagger', beakLength: 0.9, wingSpan: 1.7, legLength: 0.2, tailLength: 0.3 };

  static override behaviors: BehaviorTable<Sturnidae> = {
    gapeProbe: {
      label: 'Probe by gaping',
      cue: 'Walks briskly, pushes the closed bill into the turf, then opens it to widen the hole and look in. A robin pulls worms with a stab; a starling pries.',
    },
  };

  override forage(): Script {
    return this.gapeProbe();
  }

  *gapeProbe(): Script {
    yield* this.toGround(10);
    for (let i = 0; i < 3; i++) {
      yield* this.moveOnGround(this.world.clampLand(this.pos.x + this.pose.facing * rand(2, 5)));
      yield* this.poseTo({ pitch: -0.35, neck: -0.2, head: -0.9 }, 0.1);
      yield* this.poseTo({ beakOpen: 1 }, 0.25);
      yield* this.wait(0.2);
      yield* this.poseTo({ beakOpen: 0 }, 0.1);
      yield* this.relax(0.1);
    }
    yield* this.relax();
  }
}

export abstract class Sturnus extends Sturnidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Sturnus',
    common: 'Starlings',
    note: 'The Old World starlings. The European Starling was released in New York in 1890 and has spread across the continent.',
  };
}

export class EuropeanStarling extends Sturnus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Sturnus vulgaris',
    common: 'European Starling',
    note: 'Black with a green and purple gloss, a short square tail and a long pointed bill that is yellow in spring and dark in fall; winter birds are speckled white. Common at Gardiner and the Miller Peninsula all year, on lawns and in nest holes in dead trees.',
  };

  static override ecology: Partial<Ecology> = { scenes: { beach: 2 },
    call: 'a drawn-out, descending sleeee',
    song: 'whistles, clicks and rattles mixed with mimicry of other birds',
    presence: [2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 2, 2],
  };

  static override look: Partial<Look> = {
    length: 0.21,
    body: '#1d2321',
    belly: '#1d2321',
    head: '#2a2438',
    wing: '#252a28',
    tail: '#1d2321',
    beak: '#e5c933',
    legs: '#c56a5a',
  };
}
