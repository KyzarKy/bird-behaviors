/**
 * The rest of order Charadriiformes at Gardiner Beach: plovers, oystercatchers,
 * sandpipers, more gulls and terns, and the auks. Charadriiformes, Laridae and
 * Larus are defined in waterside.ts and extended here.
 */
import { clamp, rand } from '../core/Bird';
import type { BehaviorTable, Ecology, FlightProfile, Look, Script, Taxon } from '../core/traits';
import { Charadriiformes, Laridae, Larus } from './waterside';

/** x where the water begins, or the end of the sand on a beach with no water. */
const edgeOf = (water?: { from: number }) => water?.from ?? 55;

// ============================================================== Charadriidae

export abstract class Charadriidae extends Charadriiformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Charadriidae',
    common: 'Plovers',
    note: 'Big-eyed, short-billed birds that hunt by sight. They run, stop dead, look, and stab, rather than probing blindly.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 14, power: 0.55, agility: 0.7, braking: 0.4, glide: 0.4, flapRate: 6 };
  static override ecology: Partial<Ecology> = { habitat: 'beach', perches: [], gait: 'run', groundSpeed: 8, posture: 0.3 };
  static override look: Partial<Look> = { build: 0.5, neckLength: 0.1, legLength: 0.3, tailLength: 0.3, wingSpan: 1.9, headSize: 0.95, beakShape: 'stout', beakLength: 0.45 };

  static override behaviors: BehaviorTable<Charadriidae> = {
    runStopPeck: {
      label: 'Run, stop, peck',
      cue: 'A burst of fast running, a dead stop with the body drawn upright and the head cocked, then one stab. A sandpiper walks steadily and probes without stopping to look.',
    },
  };

  /** Metres-ish of stage between stops; the genus sets how far it runs each time. */
  protected runLength = 4;
  protected runCount = 4;

  override forage(): Script {
    return this.runStopPeck();
  }

  *runStopPeck(): Script {
    yield* this.toGround();
    const rest = this.restingPose();
    for (let i = 0; i < this.runCount; i++) {
      const dir = this.pos.x > 45 ? -1 : this.pos.x < 15 ? 1 : Math.random() < 0.5 ? 1 : -1;
      yield* this.moveOnGround(this.world.clampLand(this.pos.x + dir * rand(0.6, 1) * this.runLength), 1.3);
      yield* this.poseTo({ pitch: rest.pitch + 0.35, neck: rest.neck + 0.15, head: -0.35 }, 0.08);
      yield* this.wait(rand(0.4, 0.9));
      yield* this.peck(1, 1.1);
    }
    yield* this.relax();
  }
}

export abstract class Charadrius extends Charadriidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Charadrius',
    common: 'Ringed plovers',
    note: 'Banded plovers that nest in open gravel and sand. A bird with eggs or chicks nearby acts injured to lead a predator away.',
  };

  static override behaviors: BehaviorTable<Charadrius> = {
    brokenWing: {
      label: 'Broken-wing display',
      cue: 'Crouches, spreads the rusty tail, drags one wing and flutters it, calling, always moving away from the nest. When the intruder has followed far enough the bird flies off, healthy.',
    },
  };

  // Short runs: it hunts small patches of gravel and stays near cover.
  protected override runLength = 3;
  protected override runCount = 5;

  *brokenWing(): Script {
    yield* this.toGround();
    const p = this.pose;
    const away = this.pos.x > 30 ? -1 : 1;
    p.facing = away;
    this.say(this.ecology.call, 4);
    p.wings = 'open';
    yield* this.poseTo({ tailFan: 1, tailAngle: -0.2, crouch: 0.35, pitch: 0.05 }, 0.2);
    for (let i = 0; i < 3; i++) {
      const x0 = this.pos.x;
      const x1 = this.world.clampLand(x0 + away * 5);
      yield* this.tween(1.1, (t) => {
        this.pos.x = x0 + (x1 - x0) * t;
        p.flap = -0.9 + 0.25 * Math.sin(t * 40);
        p.stride = Math.sin(t * 30);
      });
      yield* this.wait(0.3);
    }
    p.stride = 0;
    p.flap = 0;
    p.wings = 'folded';
    yield* this.flyOver(this.groundSpot(this.pos.x + away * 15, 3));
    yield* this.relax();
  }
}

export class Killdeer extends Charadrius {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Charadrius vociferus',
    common: 'Killdeer',
    note: 'Two black breast bands, an orange-red eyering and a rusty rump that flashes in flight. Nests on gravel above the beach at Gardiner and on the Miller Peninsula, and is loud about it.',
  };

  static override flight: Partial<FlightProfile> = { flapRate: 5.5 };

  static override ecology: Partial<Ecology> = { scenes: { yard: 1 },
    call: 'kill-DEE kill-DEE dee-dee-dee',
    presence: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  };

  static override look: Partial<Look> = {
    length: 0.25,
    legLength: 0.35,
    tailLength: 0.45,
    tailShape: 'pointed',
    body: '#9c8468',
    belly: '#f6f4ee',
    head: '#9c8468',
    throat: '#f6f4ee',
    band: '#25211e',
    wing: '#8a7456',
    wingBar: '#f6f4ee',
    tail: '#c8742e',
    beak: '#2a2a2a',
    legs: '#d8b8a0',
    eye: '#1c1410',
    eyeRing: '#d9552e',
  };
}

export abstract class Pluvialis extends Charadriidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Pluvialis',
    common: 'Golden and gray plovers',
    note: 'Larger, round-headed plovers that breed on the tundra and winter on open mudflats and beaches.',
  };

  // Long runs and long stands: it scans a wide patch of flat from a distance.
  protected override runLength = 8;
  protected override runCount = 3;
}

export class BlackBelliedPlover extends Pluvialis {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Pluvialis squatarola',
    common: 'Black-bellied Plover',
    note: 'Fall and winter birds are gray, spangled with white, with a heavy black bill and black armpits that show in flight. Small numbers on Gardiner Beach and the Discovery Bay flats from fall to spring.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 15, flapRate: 5 };

  static override ecology: Partial<Ecology> = {
    posture: 0.4,
    call: 'plee-oo-ee (three plaintive notes)',
    presence: [1, 1, 1, 2, 2, 0, 1, 2, 2, 2, 1, 1],
  };

  static override look: Partial<Look> = {
    length: 0.29,
    build: 0.6,
    wingSpan: 2,
    headSize: 1,
    tailLength: 0.3,
    body: '#8d8e8a',
    belly: '#e8e6df',
    head: '#8d8e8a',
    breast: '#b5b4ae',
    spots: '#f0f0ea',
    wing: '#7c7d79',
    underwing: '#111111',
    tail: '#6d6e6a',
    beak: '#1a1a1a',
    legs: '#3a3a3a',
    eye: '#0e0e0e',
  };
}

// ========================================================== Haematopodidae

export abstract class Haematopodidae extends Charadriiformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Haematopodidae',
    common: 'Oystercatchers',
    note: 'A blade-tipped bill that cuts the muscle of a mussel or chisels a limpet off its rock.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 15, power: 0.5, agility: 0.5, braking: 0.3, glide: 0.4, flapRate: 5 };
  static override ecology: Partial<Ecology> = { habitat: 'beach', perches: ['rock'], gait: 'walk', groundSpeed: 4, posture: 0.3 };
  static override look: Partial<Look> = { build: 0.7, neckLength: 0.1, legLength: 0.3, tailLength: 0.25, wingSpan: 1.9, headSize: 0.85, beakShape: 'chisel', beakLength: 1.8 };

  static override behaviors: BehaviorTable<Haematopodidae> = {
    pryShellfish: {
      label: 'Open a mussel',
      cue: 'Stands at the foot of a rock and hammers with short, hard blows, then twists the bill in and levers the shell open. A gull drops the same shellfish from the air instead.',
    },
  };

  override forage(): Script {
    return this.pryShellfish();
  }

  *pryShellfish(): Script {
    const rock = this.findPerch(['rock'], 'near');
    yield* this.travelTo({ x: this.world.clampLand((rock?.x ?? this.pos.x) - 5), y: 0 });
    this.pose.facing = 1;
    for (let i = 0; i < 3; i++) {
      yield* this.poseTo({ pitch: -0.25, neck: -0.2, head: -1.2 }, 0.2);
      for (let k = 0; k < 5; k++) {
        yield* this.poseTo({ head: -1.5 }, 0.05);
        yield* this.poseTo({ head: -1 }, 0.05);
      }
      this.world.burst('chip', this.pos.x + this.size * 0.5, 0.3, 2);
      yield* this.wait(0.3);
    }
    yield* this.relax(0.15);
    this.pose.carry = 'clam';
    yield* this.poseTo({ head: 0.7, neck: 1.2 }, 0.2);
    yield* this.wait(0.3);
    this.pose.carry = null;
    yield* this.relax();
  }
}

export abstract class Haematopus extends Haematopodidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Haematopus',
    common: 'Oystercatchers',
    note: 'The only genus in the family. Pairs defend a stretch of rocky shore and settle disputes with a ritual walk.',
  };

  static override behaviors: BehaviorTable<Haematopus> = {
    piping: {
      label: 'Piping display',
      cue: 'Two birds walk side by side with bills pointed at the ground, stiff-legged, calling in a shrill run of notes that speeds up and slows down. A territorial argument settled without a fight.',
    },
  };

  *piping(): Script {
    yield* this.toGround();
    this.say(this.ecology.call, 3.5);
    yield* this.poseTo({ neck: 0.4, head: -1, pitch: 0.05 }, 0.2);
    const dir = this.pos.x > 30 ? -1 : 1;
    for (let i = 0; i < 4; i++) {
      yield* this.poseTo({ beakOpen: 0.8 }, 0.08);
      yield* this.moveOnGround(this.world.clampLand(this.pos.x + dir * 2.5), 0.5);
      yield* this.poseTo({ beakOpen: 0 }, 0.08);
    }
    yield* this.relax();
  }
}

export class BlackOystercatcher extends Haematopus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Haematopus bachmani',
    common: 'Black Oystercatcher',
    note: 'All black with a long orange-red bill, yellow eye and pink legs. Resident on rocky shore; look on the rocks and pilings around Gardiner and the bluffs of Protection Island rather than on open sand.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'wheep! wheep! wheep-wheep (piercing)',
    presence: [1, 1, 1, 2, 2, 2, 2, 2, 1, 1, 1, 1],
  };

  static override look: Partial<Look> = {
    length: 0.43,
    body: '#2b2824',
    belly: '#2f2b27',
    head: '#141414',
    wing: '#2b2824',
    tail: '#1e1c1a',
    beak: '#f0481f',
    legs: '#e7b7b0',
    eye: '#f2d12a',
    eyeRing: '#e8451c',
  };
}

// ============================================================== Scolopacidae

export abstract class Scolopacidae extends Charadriiformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Scolopacidae',
    common: 'Sandpipers',
    note: 'Long, sensitive bills that find prey by touch in wet sand and mud. Species sort themselves by bill length and by how far into the water they will go.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 14, power: 0.6, agility: 0.75, braking: 0.4, glide: 0.3, flapRate: 9 };
  static override ecology: Partial<Ecology> = { habitat: 'beach', perches: [], gait: 'run', groundSpeed: 7, posture: 0.2 };
  static override look: Partial<Look> = { build: 0.45, neckLength: 0.1, legLength: 0.3, tailLength: 0.3, wingSpan: 2, headSize: 0.9, beakShape: 'thin', beakLength: 1.1 };

  static override behaviors: BehaviorTable<Scolopacidae> = {
    probe: {
      label: 'Probe the sand',
      cue: 'Walks without stopping and pushes the bill in again and again, like a sewing machine. Compare where each species feeds: Western in the shallows, Dunlin at the edge, Least on the dry mud above.',
    },
  };

  /** Where it feeds relative to the water's edge: negative is up the beach. */
  protected feedOffset = -2;
  /** Quick bill thrusts per probe. A picker uses one or two, a prober many. */
  protected probeStitch = 3;
  protected probeBouts = 3;

  override forage(): Script {
    return this.probe();
  }

  *probe(): Script {
    const edge = edgeOf(this.world.habitat.water);
    const centre = edge + this.feedOffset;
    const x = clamp(centre + rand(-4, 0), 6, 95);
    yield* this.travelTo({ x, y: this.world.floorY(x) });
    const rest = this.restingPose();
    for (let i = 0; i < this.probeBouts; i++) {
      yield* this.moveOnGround(clamp(this.pos.x + rand(-4, 2), centre - 6, centre + 2));
      yield* this.poseTo({ pitch: rest.pitch - 0.45, neck: -0.3, head: -1 }, 0.07);
      for (let k = 0; k < this.probeStitch * 2; k++) yield* this.poseTo({ neck: k % 2 ? -0.3 : -0.55 }, 0.04);
      yield* this.relax(0.1);
    }
    yield* this.relax();
  }
}

export abstract class Arenaria extends Scolopacidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Arenaria',
    common: 'Turnstones',
    note: 'Short, wedge-shaped, slightly upturned bills and strong necks, used to shove aside whatever is lying on the shore.',
  };

  static override look: Partial<Look> = { build: 0.6, legLength: 0.22, neckLength: 0.07, beakShape: 'stout', beakLength: 0.7 };

  static override behaviors: BehaviorTable<Arenaria> = {
    flipStones: {
      label: 'Flip stones and weed',
      cue: 'Pushes its bill under the edge of a stone or a mat of seaweed and heaves it over with a jerk of the neck, then picks at what was hiding underneath. No sandpiper does this.',
    },
  };

  override forage(): Script {
    return this.flipStones();
  }

  *flipStones(): Script {
    const rock = this.findPerch(['rock', 'log'], 'near');
    yield* this.travelTo({ x: this.world.clampLand((rock?.x ?? this.pos.x) + rand(-7, -4)), y: 0 });
    for (let i = 0; i < 3; i++) {
      yield* this.poseTo({ pitch: -0.3, neck: -0.2, head: -1.1 }, 0.12);
      yield* this.poseTo({ pitch: 0.1, head: -0.2 }, 0.1);
      this.world.burst('dust', this.pos.x + this.pose.facing * this.size * 0.5, 0.3, 4, this.pose.facing);
      yield* this.peck(Math.ceil(rand(2, 3)), 0.8);
      yield* this.moveOnGround(this.world.clampLand(this.pos.x + rand(-2, 2)));
    }
    yield* this.relax();
  }
}

export class BlackTurnstone extends Arenaria {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Arenaria melanocephala',
    common: 'Black Turnstone',
    note: 'Blackish above and on the breast with a white belly and a white spot in front of the eye; it flashes a bold black-and-white pattern in flight. Winters on the rocks, logs and weed at Gardiner from fall to spring.',
  };

  static override flight: Partial<FlightProfile> = { flapRate: 8 };

  static override ecology: Partial<Ecology> = {
    call: 'a rattling skirr-r-r-r-r',
    presence: [2, 2, 2, 2, 1, 0, 0, 1, 2, 2, 2, 2],
  };

  static override look: Partial<Look> = {
    length: 0.23,
    body: '#2d2b2a',
    belly: '#f4f3ef',
    head: '#2a2927',
    breast: '#2d2b2a',
    spots: '#f3f1ec',
    wing: '#3b3836',
    wingBar: '#f4f3ef',
    tail: '#1f1e1d',
    beak: '#1b1b1b',
    legs: '#6d4d46',
    eye: '#1c1310',
  };
}

export abstract class Calidris extends Scolopacidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Calidris',
    common: 'Calidrid sandpipers',
    note: 'The small “peeps” and their larger relatives. They feed and travel in tight flocks that lift together and turn as one.',
  };

  static override behaviors: BehaviorTable<Calidris> = {
    wheel: {
      label: 'Flush and wheel',
      cue: 'Takes off calling, swings out over the water and back in a low, fast arc. In a flock the whole group turns at once and the flash alternates between dark backs and white bellies.',
    },
  };

  *wheel(): Script {
    const edge = edgeOf(this.world.habitat.water);
    this.say(this.ecology.call, 2);
    yield* this.flyTo({ x: edge + 15, y: 5 }, { land: false, speed: 1.3 });
    yield* this.flyTo({ x: edge - 8, y: 3 }, { land: false, speed: 1.3 });
    yield* this.flyTo(this.groundSpot(edge - 12, 6));
    yield* this.relax();
  }
}

export class Sanderling extends Calidris {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Calidris alba',
    common: 'Sanderling',
    note: 'The palest sandpiper: nearly white below and pale gray above, with a black bill and legs and no hind toe. Runs the wave edge on Gardiner Beach and the Miller Peninsula sand from fall to spring.',
  };

  static override ecology: Partial<Ecology> = {
    groundSpeed: 9,
    call: 'kwit kwit (short and sharp)',
    presence: [2, 2, 2, 2, 2, 1, 1, 2, 2, 2, 2, 2],
  };

  static override behaviors: BehaviorTable<Sanderling> = {
    chaseWaves: {
      label: 'Chase the wave edge',
      cue: 'Races down the wet sand after a wave slides back, stabs at what it uncovered, and sprints back up the beach ahead of the next one, legs a blur. Other sandpipers keep away from the surf.',
    },
  };

  override forage(): Script {
    return this.chaseWaves();
  }

  *chaseWaves(): Script {
    const edge = edgeOf(this.world.habitat.water);
    yield* this.travelTo({ x: this.world.clampLand(edge - 3), y: 0 });
    for (let i = 0; i < 4; i++) {
      yield* this.moveOnGround(edge + 1, 2);
      yield* this.peck(1, 0.8);
      yield* this.moveOnGround(edge - 7, 2.2);
    }
    yield* this.relax();
  }

  static override look: Partial<Look> = {
    length: 0.2,
    build: 0.55,
    headSize: 0.9,
    beakShape: 'stout',
    beakLength: 0.7,
    body: '#c2c6c8',
    belly: '#fcfcfa',
    head: '#e8eaea',
    wing: '#9ea3a6',
    wingBar: '#f6f6f4',
    tail: '#8a8d8f',
    beak: '#171717',
    legs: '#171717',
    eye: '#111111',
  };
}

export class Dunlin extends Calidris {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Calidris alpina',
    common: 'Dunlin',
    note: 'A hunched, dull gray-brown sandpiper in winter, with a long bill that droops at the tip. The winter sandpiper flocks at Gardiner Beach and on the Discovery Bay flats, October to April.',
  };

  static override flight: Partial<FlightProfile> = { flapRate: 9 };

  static override ecology: Partial<Ecology> = {
    posture: 0.05,
    call: 'treeep (rough and reedy)',
    presence: [2, 2, 2, 1, 1, 0, 0, 0, 1, 2, 3, 3],
  };

  protected override feedOffset = -3;
  protected override probeStitch = 6;

  static override look: Partial<Look> = {
    length: 0.2,
    beakLength: 1.2,
    body: '#7d7a74',
    belly: '#f0eee8',
    head: '#7d7a74',
    breast: '#8c8a85',
    throat: '#e6e3dc',
    wing: '#6c6963',
    tail: '#5e5b57',
    beak: '#1e1e1e',
    legs: '#262626',
    eye: '#111111',
  };
}

export class WesternSandpiper extends Calidris {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Calidris mauri',
    common: 'Western Sandpiper',
    note: 'A small peep with a long, drooping bill and black legs; rusty scapulars show on fall juveniles. Migrates through Discovery Bay in late April and May and again from July to September.',
  };

  static override flight: Partial<FlightProfile> = { flapRate: 10 };

  static override ecology: Partial<Ecology> = {
    call: 'jeet, jeet (thin and sharp)',
    presence: [0, 0, 0, 2, 3, 1, 2, 3, 2, 0, 0, 0],
  };

  // Partly webbed toes let it wade belly-deep, often pushing the whole head under.
  protected override feedOffset = 1.5;

  static override look: Partial<Look> = {
    length: 0.16,
    beakLength: 1.1,
    body: '#9a8e80',
    belly: '#f6f4ef',
    head: '#8c8478',
    spots: '#b86f3a',
    wing: '#7a6e60',
    wingBar: '#f1ede4',
    tail: '#6a5f52',
    beak: '#1e1e1e',
    legs: '#2a2a2a',
    eye: '#111111',
  };
}

export class LeastSandpiper extends Calidris {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Calidris minutilla',
    common: 'Least Sandpiper',
    note: 'The smallest sandpiper: brown and streaked, with yellowish legs. Passes through in small numbers in spring and from July to September, on the drier mud and weed at the top of the Discovery Bay flats.',
  };

  static override flight: Partial<FlightProfile> = { flapRate: 12 };

  static override ecology: Partial<Ecology> = {
    posture: 0.1,
    call: 'kreep (thin and rising)',
    presence: [0, 0, 0, 2, 2, 0, 1, 2, 2, 1, 0, 0],
  };

  // A picker, not a prober: stays above the wet sand and takes food from the surface.
  protected override feedOffset = -8;
  protected override probeStitch = 1;

  static override look: Partial<Look> = {
    length: 0.14,
    legLength: 0.28,
    beakLength: 0.75,
    body: '#8a7458',
    belly: '#f7f5f0',
    head: '#8a7458',
    cap: '#6a563c',
    breast: '#a79078',
    eyeLine: '#efe8d8',
    wing: '#74604a',
    tail: '#5f4e3a',
    beak: '#1c1c1c',
    legs: '#c9c05a',
    eye: '#111111',
  };
}

export abstract class Tringa extends Scolopacidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Tringa',
    common: 'Shanks and yellowlegs',
    note: 'Tall, long-legged, long-necked sandpipers that wade and are the first to sound an alarm.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 15, flapRate: 6 };
  static override ecology: Partial<Ecology> = { groundSpeed: 6, posture: 0.3 };
  static override look: Partial<Look> = { build: 0.35, neckLength: 0.22, legLength: 0.6, wingSpan: 2.2, headSize: 0.65, beakShape: 'dagger', beakLength: 2 };

  static override behaviors: BehaviorTable<Tringa> = {
    bob: {
      label: 'Bob and call',
      cue: 'Dips the whole front of the body in quick bobs while calling. A wary yellowlegs on a mudflat sounds an alarm for every bird in earshot.',
    },
  };

  *bob(): Script {
    yield* this.toGround();
    this.say(this.ecology.call, 2.5);
    for (let i = 0; i < 6; i++) {
      yield* this.poseTo({ crouch: 0.35, neck: 1.1, pitch: 0.4 }, 0.12);
      yield* this.poseTo({ crouch: 0, neck: 0.95, pitch: 0.25 }, 0.12);
    }
    yield* this.relax();
  }
}

export class GreaterYellowlegs extends Tringa {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Tringa melanoleuca',
    common: 'Greater Yellowlegs',
    note: 'Tall and gray, spangled with white, with bright yellow legs and a long, slightly upturned bill. A few at the Discovery Bay shallows year-round, most in spring and fall.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'tew-tew-tew (loud and descending)',
    presence: [1, 1, 1, 2, 2, 1, 1, 2, 2, 1, 1, 1],
  };

  static override behaviors: BehaviorTable<GreaterYellowlegs> = {
    chaseMinnows: {
      label: 'Chase minnows',
      cue: 'Runs through knee-deep water swinging the bill from side to side to scythe up small fish. A Lesser Yellowlegs picks at the surface instead.',
    },
  };

  override forage(): Script {
    return this.chaseMinnows();
  }

  *chaseMinnows(): Script {
    const edge = edgeOf(this.world.habitat.water);
    const x = edge + rand(2, 6);
    yield* this.travelTo({ x, y: this.world.floorY(x) });
    yield* this.poseTo({ pitch: 0.05, neck: 0.2, head: -0.7 }, 0.2);
    for (let i = 0; i < 4; i++) {
      const dir = i % 2 ? -1 : 1;
      const x0 = this.pos.x;
      const x1 = clamp(x0 + dir * 4, edge + 1, edge + 8);
      this.pose.facing = dir;
      yield* this.tween(0.8, (t) => {
        this.pos.x = x0 + (x1 - x0) * t;
        this.pos.y = this.world.floorY(this.pos.x);
        this.pose.stride = Math.sin(t * 35);
        this.pose.head = -0.7 + 0.35 * Math.sin(t * 30);
      });
      this.world.burst('splash', this.pos.x, this.pos.y, 2);
    }
    this.pose.stride = 0;
    yield* this.relax();
  }

  static override look: Partial<Look> = {
    length: 0.34,
    body: '#8d8a82',
    belly: '#f8f7f3',
    head: '#9a968d',
    breast: '#bdb9b0',
    spots: '#f3f1eb',
    wing: '#7c786f',
    tail: '#e8e6df',
    beak: '#26262a',
    legs: '#e8c53a',
    eye: '#111111',
    eyeRing: '#f1efe8',
  };
}

export abstract class Actitis extends Scolopacidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Actitis',
    common: 'Spotted sandpipers',
    note: 'Two species of solitary shoreline sandpipers that never stop bobbing the rear end and fly with stiff, flickering wings.',
  };

  // Short glides on bowed wings between bursts of shallow, stiff beats, low over the water.
  static override flight: Partial<FlightProfile> = { cruiseSpeed: 11, glide: 0.35, flapRate: 11, flapDuty: 0.7, cyclePeriod: 0.5, ceiling: 6 };
  static override ecology: Partial<Ecology> = { perches: ['log', 'rock'], gait: 'walk', groundSpeed: 5, posture: 0.15 };
  static override look: Partial<Look> = { legLength: 0.22, tailLength: 0.35, wingSpan: 1.9, beakLength: 0.9 };

  static override behaviors: BehaviorTable<Actitis> = {
    teeter: {
      label: 'Teeter',
      cue: 'The rear half pumps up and down about three times a second, whether feeding, standing or alarmed. Other sandpipers do not do this constantly; a bobbing tail at the water’s edge is nearly enough to name it.',
    },
  };

  protected override adjustFlightPose() {
    // Wings flicker through a narrow arc below the horizontal.
    this.pose.flap *= 0.35;
  }

  protected *teeterFor(seconds: number): Script {
    const p = this.pose;
    const rest = this.restingPose();
    for (let t = 0; t < seconds; ) {
      t += yield;
      const s = Math.sin(t * 18);
      p.pitch = rest.pitch - 0.1 + 0.22 * s;
      p.tailAngle = rest.tailAngle + 0.3 * s;
    }
  }

  *teeter(): Script {
    yield* this.toGround();
    yield* this.teeterFor(4);
    yield* this.relax();
  }

  override *forage(): Script {
    yield* this.toGround();
    for (let i = 0; i < 3; i++) {
      yield* this.moveOnGround(this.world.clampLand(this.pos.x + rand(-5, 5)));
      yield* this.teeterFor(1.2);
      yield* this.peck(1, 0.8);
    }
    yield* this.relax();
  }
}

export class SpottedSandpiper extends Actitis {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Actitis macularius',
    common: 'Spotted Sandpiper',
    note: 'Olive-brown above with bold dark spots below in summer and an orange bill; plain white below in fall. Nests along streams on the Miller Peninsula and feeds on the logs and wrack at Gardiner from April to September.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'peet-weet! (clear and whistled)',
    presence: [0, 0, 0, 1, 2, 2, 2, 2, 1, 0, 0, 0],
  };

  static override look: Partial<Look> = {
    length: 0.19,
    body: '#8a7b62',
    belly: '#fbfaf6',
    head: '#8a7b62',
    spots: '#2b2724',
    eyeLine: '#2a2622',
    wing: '#7a6c54',
    wingBar: '#f3f0e8',
    tail: '#6f6350',
    beak: '#e49a4a',
    legs: '#e0b88f',
    eye: '#111111',
  };
}

// =================================================================== Laridae

export class ShortBilledGull extends Larus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Larus brachyrhynchus',
    common: 'Short-billed (Mew) Gull',
    note: 'A small, round-headed gull with a short, unmarked greenish-yellow bill and a dark eye; the back is medium gray. The common winter gull at Gardiner and Discovery Bay, October to April, with a few through summer.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 10, flapRate: 3.6 };

  static override ecology: Partial<Ecology> = {
    call: 'keeow, mew-mew-mew (high and nasal)',
    presence: [3, 3, 3, 2, 1, 1, 1, 2, 2, 3, 3, 3],
  };

  static override behaviors: BehaviorTable<ShortBilledGull> = {
    dipFeed: {
      label: 'Dip-feed',
      cue: 'Hovers on fast wingbeats a metre above the water and dips to take small food from the surface without landing. Larger gulls land or plunge.',
    },
  };

  *dipFeed(): Script {
    const water = this.world.habitat.water;
    if (!water) return;
    const x = water.from + rand(6, 16);
    yield* this.flyTo({ x, y: 2.5 }, { land: false });
    yield* this.hoverFor(1.5, { aim: -0.9 });
    yield* this.flyTo({ x: x + 3, y: 0.3 }, { land: false, speed: 0.6 });
    this.world.burst('splash', this.pos.x, 0, 3);
    yield* this.flyTo(this.groundSpot(water.from - 8, 6));
    yield* this.relax();
  }

  static override look: Partial<Look> = {
    length: 0.43,
    wingSpan: 2.5,
    headSize: 0.72,
    beakLength: 0.55,
    body: '#f6f6f3',
    belly: '#fbfbf9',
    head: '#f4f3f0',
    wing: '#8a96a3',
    tail: '#f6f6f3',
    beak: '#d8cf5a',
    legs: '#d8cf6a',
    eye: '#2a2018',
  };
}

export class CaliforniaGull extends Larus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Larus californicus',
    common: 'California Gull',
    note: 'Medium-large, with a darker gray back than a Glaucous-winged Gull, black wingtips, a dark eye and greenish legs; the bill has both a red and a black spot. Mostly late summer through winter on Gardiner Beach and the Discovery Bay bluffs, with some moving through in spring.',
  };

  static override flight: Partial<FlightProfile> = { flapRate: 3 };

  static override ecology: Partial<Ecology> = {
    call: 'kyow, kyow, kuh-kuh-kuh',
    presence: [1, 1, 1, 1, 1, 1, 2, 3, 3, 2, 1, 1],
  };

  static override behaviors: BehaviorTable<CaliforniaGull> = {
    wrackLine: {
      label: 'Work the wrack line',
      cue: 'Walks the line of seaweed at the high-tide mark, turning over debris and picking up anything edible. Gulls like this one are more often scavenging than hunting.',
    },
  };

  override forage(): Script {
    return this.wrackLine();
  }

  *wrackLine(): Script {
    const edge = edgeOf(this.world.habitat.water);
    yield* this.travelTo({ x: this.world.clampLand(edge - rand(4, 8)), y: 0 });
    for (let i = 0; i < 4; i++) {
      yield* this.moveOnGround(this.world.clampLand(this.pos.x + rand(-6, 6)));
      yield* this.peck(Math.ceil(rand(1, 2)), 1);
      if (Math.random() < 0.5) {
        this.pose.carry = 'insect';
        yield* this.poseTo({ head: 0.6, neck: 1.2 }, 0.15);
        this.pose.carry = null;
        yield* this.relax(0.15);
      }
    }
    yield* this.relax();
  }

  static override look: Partial<Look> = {
    length: 0.53,
    wingSpan: 2.4,
    body: '#f5f5f2',
    belly: '#fbfbf9',
    head: '#f5f5f2',
    spots: '#c8301f',
    wing: '#6f7a86',
    tail: '#f5f5f2',
    beak: '#e6c93a',
    legs: '#a7b58a',
    eye: '#1a1410',
    eyeRing: '#d9402b',
  };
}

export class HeermannsGull extends Larus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Larus heermanni',
    common: 'Heermann’s Gull',
    note: 'Slate-gray body, white head, bright red bill with a black tip, black legs and a black tail. A summer-to-fall visitor from Mexico: look for it from July to November off Gardiner Beach and along the Miller Peninsula shore.',
  };

  static override flight: Partial<FlightProfile> = { flapRate: 3.4, glide: 0.8 };

  static override ecology: Partial<Ecology> = {
    call: 'whee-ow (whining), nasal ow-ow-ow',
    presence: [0, 0, 0, 0, 0, 1, 2, 3, 3, 2, 1, 0],
  };

  static override behaviors: BehaviorTable<HeermannsGull> = {
    pirate: {
      label: 'Steal a fish',
      cue: 'Chases another seabird low over the water, matching every twist, until the victim drops its catch. It lands with the stolen fish and swallows it fast.',
    },
  };

  *pirate(): Script {
    const water = this.world.habitat.water;
    if (!water) return;
    const x = water.from + rand(10, 20);
    yield* this.flyTo({ x, y: 4 }, { land: false });
    for (let i = 0; i < 3; i++) {
      yield* this.flyTo({ x: clamp(x + rand(-12, 12), water.from + 3, 96), y: rand(1, 6) }, { land: false, speed: 1.4 });
    }
    this.pose.carry = 'fish';
    yield* this.flyTo(this.groundSpot(water.from - 6, 6));
    yield* this.peck(2, 1.2);
    this.pose.carry = null;
    yield* this.relax();
  }

  static override look: Partial<Look> = {
    length: 0.48,
    wingSpan: 2.5,
    beakLength: 0.9,
    body: '#6c6f74',
    belly: '#5f6368',
    head: '#f4f3f0',
    wing: '#3f4348',
    tail: '#1b1b1b',
    beak: '#d8402a',
    legs: '#1a1a1a',
    eye: '#1a1410',
  };
}

export abstract class Chroicocephalus extends Laridae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Chroicocephalus',
    common: 'Hooded gulls',
    note: 'Small, light gulls with slim bills that fly like terns. In breeding plumage the head is dark.',
  };

  // Lighter than a Larus: quick, buoyant wingbeats and good hovering.
  static override flight: Partial<FlightProfile> = { cruiseSpeed: 10, agility: 0.8, hover: 0.45, glide: 0.5, flapRate: 4.5, flapDuty: 0.9 };
  static override look: Partial<Look> = { build: 0.45, headSize: 0.65, beakShape: 'thin', beakLength: 0.55 };

  static override behaviors: BehaviorTable<Chroicocephalus> = {
    skimDips: {
      label: 'Skim and dip',
      cue: 'Flutters low over the water and dips down three or four times in a row to pick from the surface, climbing between dips. Tern-like, and nothing a Larus gull does.',
    },
  };

  *skimDips(): Script {
    const water = this.world.habitat.water;
    if (!water) return;
    const x0 = water.from + rand(8, 14);
    yield* this.flyTo({ x: x0, y: 3 }, { land: false });
    for (let i = 0; i < 3; i++) {
      const x = x0 + (i + 1) * 7;
      yield* this.flyTo({ x, y: 0.3 }, { land: false, speed: 0.8 });
      this.world.burst('splash', this.pos.x, 0, 2);
      yield* this.flyTo({ x: x + 4, y: 3 }, { land: false });
    }
    yield* this.flyTo(this.groundSpot(water.from - 8, 6));
    yield* this.relax();
  }
}

export class BonapartesGull extends Chroicocephalus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Chroicocephalus philadelphia',
    common: 'Bonaparte’s Gull',
    note: 'A small, pale gull with a thin black bill, orange-red legs, a dark ear spot in winter and a white wedge on the outer wing. Passes through Discovery Bay in flocks in April and May and from October to November, often over tide rips.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'geeer (nasal, tern-like rasp)',
    presence: [1, 1, 1, 2, 2, 0, 0, 1, 2, 3, 3, 1],
  };

  static override look: Partial<Look> = {
    length: 0.33,
    wingSpan: 2.6,
    body: '#f7f7f5',
    belly: '#fcfcfa',
    head: '#f4f4f2',
    eyeLine: '#3a3a3a',
    wing: '#a4adb5',
    wingBar: '#fdfdfd',
    tail: '#f7f7f5',
    beak: '#1c1c1c',
    legs: '#e0604a',
    eye: '#1a1410',
  };
}

export abstract class Hydroprogne extends Laridae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Hydroprogne',
    common: 'Caspian tern',
    note: 'A genus of one: the largest tern, with a heavy, bright red bill.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 13, power: 0.5, agility: 0.5, hover: 0.4, glide: 0.5, flapRate: 3.5, flapDuty: 1 };
  static override look: Partial<Look> = { build: 0.55, headSize: 0.85, legLength: 0.12, tailLength: 0.22, tailShape: 'forked', wingSpan: 2.6, beakShape: 'dagger', beakLength: 1.3, crest: 'shaggy' };

  static override behaviors: BehaviorTable<Hydroprogne> = {
    plungeDive: {
      label: 'Hover and plunge',
      cue: 'Patrols with the bill angled down, stops to hover for a moment, then folds and drops headfirst into the water. A gull never dives from the air like this.',
    },
  };

  override forage(): Script {
    return this.plungeDive();
  }

  *plungeDive(): Script {
    const water = this.world.habitat.water;
    if (!water) return;
    const x = water.from + rand(14, 24);
    yield* this.flyTo({ x: x - 6, y: 8 }, { land: false });
    yield* this.flyTo({ x, y: 9 }, { land: false, speed: 0.7 });
    yield* this.hoverFor(1.5, { aim: -1.1 });
    yield* this.flyTo({ x: x + 1, y: -1 }, { land: false, speed: 1.6 });
    this.world.burst('splash', this.pos.x, 0, 10);
    yield* this.wait(0.3);
    const caught = Math.random() < 0.6;
    if (caught) this.pose.carry = 'fish';
    this.vel = { x: 0, y: 8 };
    this.world.burst('splash', this.pos.x, 0, 5);
    yield* this.flyTo({ x: x - 6, y: 6 }, { land: false });
    yield* this.flyTo(this.findPerch() ?? this.groundSpot(water.from - 8, 6));
    if (caught) {
      yield* this.poseTo({ head: 0.7, neck: 1.2 }, 0.15);
      this.pose.carry = null;
    }
    yield* this.relax();
  }
}

export class CaspianTern extends Hydroprogne {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Hydroprogne caspia',
    common: 'Caspian Tern',
    note: 'Gull-sized and white with a black cap, a thick coral-red bill with a dark tip, and dark undersides to the wingtips. Fishes over Discovery Bay and the Gardiner shallows from April to September.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'rrraah! (deep and raspy)',
    presence: [0, 0, 0, 1, 2, 2, 3, 3, 1, 0, 0, 0],
  };

  static override look: Partial<Look> = {
    length: 0.53,
    body: '#f7f7f5',
    belly: '#fcfcfa',
    head: '#f4f4f2',
    cap: '#1b1b1b',
    wing: '#a3abb4',
    underwing: '#43474b',
    tail: '#f2f2ef',
    beak: '#d8381f',
    legs: '#1a1a1a',
    eye: '#1a1410',
  };
}

// ================================================================== Alcidae

export abstract class Alcidae extends Charadriiformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Alcidae',
    common: 'Auks',
    note: 'Cold-water diving birds that use short wings to fly under water. In the air the same wings must beat very fast, so the flight is low, direct and whirring, and takeoff takes a long run.',
  };

  static override flight: Partial<FlightProfile> = {
    cruiseSpeed: 18,
    power: 0.3,
    agility: 0.25,
    braking: 0.1,
    glide: 0.05,
    flapRate: 8,
    flapDuty: 1,
    ceiling: 6,
  };

  static override ecology: Partial<Ecology> = { habitat: 'beach', perches: [], gait: 'walk', groundSpeed: 3, swims: true, posture: 0.35 };
  static override look: Partial<Look> = { build: 0.75, neckLength: 0.08, legLength: 0.06, tailLength: 0.12, wingSpan: 1.4, headSize: 0.8, beakShape: 'dagger', beakLength: 1.2, legsTrail: true };

  static override behaviors: BehaviorTable<Alcidae> = {
    dive: {
      label: 'Dive for fish',
      cue: 'Peers under the surface, then slips under and flies with its wings. It stays down for many seconds and comes up some way off. Loons and grebes dive with their feet instead.',
    },
    fly: {
      label: 'Fly to a new spot',
      cue: 'Fast, low and direct over the water, with wingbeats so quick they whir. It turns wide, lands on the water with a skid and never perches.',
    },
  };

  protected diveTime = 2.5;
  protected diveReach = 8;
  protected diveLeap = 0;
  protected dives = 3;

  override forage(): Script {
    return this.dive();
  }

  override *fly(): Script {
    const spot = this.waterSpot();
    if (spot) yield* this.flyOver(spot);
    yield* this.relax();
  }

  *dive(): Script {
    if (!this.world.habitat.water) return;
    yield* this.toWater();
    for (let i = 0; i < this.dives; i++) {
      yield* this.poseTo({ head: -0.8, neck: 0.7 }, 0.2);
      yield* this.wait(rand(0.3, 0.8));
      const dir = this.pos.x > 78 ? -1 : 1;
      yield* this.diveUnder(this.diveTime, dir * this.diveReach, this.diveLeap);
      if (Math.random() < 0.4) {
        this.pose.carry = 'fish';
        yield* this.wait(0.9);
        this.pose.carry = null;
      }
    }
    yield* this.relax();
  }
}

export abstract class Cepphus extends Alcidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Cepphus',
    common: 'Guillemots',
    note: 'Black alcids with white wing patches and bright red feet. They hunt close to the bottom near shore and nest in crevices and burrows.',
  };

  // Shallow bottom feeders: short dives close to where they went under.
  protected override diveTime = 2;
  protected override diveReach = 5;
  protected override dives = 4;

  static override behaviors: BehaviorTable<Cepphus> = {
    whistleDisplay: {
      label: 'Whistle display',
      cue: 'Rises up on the water, stretches the neck and whistles with the bill open, showing the red mouth lining. Pairs do this together in spring near the nest cliffs.',
    },
  };

  *whistleDisplay(): Script {
    if (!this.world.habitat.water) return;
    yield* this.toWater();
    this.say(this.ecology.call, 3);
    for (let i = 0; i < 3; i++) {
      yield* this.poseTo({ neck: 1.3, head: 0.4, pitch: 0.6, beakOpen: 1 }, 0.2);
      yield* this.wait(0.5);
      yield* this.poseTo({ neck: 0.95, head: -0.2, pitch: 0.2, beakOpen: 0 }, 0.2);
    }
    yield* this.relax();
  }
}

export class PigeonGuillemot extends Cepphus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Cepphus columba',
    common: 'Pigeon Guillemot',
    note: 'Black with a large white wing patch and bright red feet and mouth. Nests in the bluffs and on Protection Island; seen near shore off Gardiner Beach all year, most often April to August.',
  };

  static override flight: Partial<FlightProfile> = { flapRate: 9 };

  static override ecology: Partial<Ecology> = {
    call: 'a thin, high seeeee whistle',
    presence: [1, 1, 1, 2, 3, 3, 3, 3, 2, 1, 1, 1],
  };

  static override look: Partial<Look> = {
    length: 0.33,
    beakLength: 1.1,
    body: '#1e1b1a',
    belly: '#1e1b1a',
    head: '#1e1b1a',
    wing: '#1e1b1a',
    wingBar: '#fbfbf9',
    tail: '#1e1b1a',
    beak: '#161616',
    legs: '#e8402a',
    eye: '#111111',
  };
}

export abstract class Cerorhinca extends Alcidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Cerorhinca',
    common: 'Rhinoceros Auklet',
    note: 'A genus of one: a burrow-nesting alcid, in the puffin lineage, that fishes by day and brings food to the colony after dark.',
  };

  // Long dives to deeper water for schooling fish.
  protected override diveTime = 3;
  protected override diveReach = 9;
  protected override dives = 2;

  static override behaviors: BehaviorTable<Cerorhinca> = {
    carryFishHome: {
      label: 'Carry fish to the colony',
      cue: 'Surfaces with several small fish held crosswise in the bill and flies straight out toward the colony, low and fast. It does not eat them.',
    },
  };

  *carryFishHome(): Script {
    if (!this.world.habitat.water) return;
    yield* this.toWater();
    yield* this.diveUnder(3, (this.pos.x > 78 ? -1 : 1) * 9);
    this.pose.carry = 'fish';
    yield* this.wait(0.6);
    yield* this.flyOver({ x: rand(88, 95), y: 0 });
    yield* this.wait(0.5);
    this.pose.carry = null;
    yield* this.relax();
  }
}

export class RhinocerosAuklet extends Cerorhinca {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Cerorhinca monocerata',
    common: 'Rhinoceros Auklet',
    note: 'Dusky gray with a stout orange bill, a small horn at its base, and white plumes on the face in summer. Protection Island at the mouth of Discovery Bay holds one of the largest colonies in the world; the birds come in at dusk with fish, March to September.',
  };

  static override flight: Partial<FlightProfile> = { flapRate: 8 };

  static override ecology: Partial<Ecology> = {
    call: 'a low, growling moan, mostly at the colony',
    presence: [1, 1, 1, 2, 3, 3, 3, 3, 2, 1, 1, 1],
  };

  static override look: Partial<Look> = {
    length: 0.38,
    beakShape: 'stout',
    beakLength: 1.1,
    body: '#4b4a4c',
    belly: '#a8a7a6',
    head: '#3f3d3f',
    eyeLine: '#f2f0ea',
    wing: '#3a383a',
    tail: '#3a383a',
    beak: '#e8a23a',
    legs: '#e1a64a',
    eye: '#f0ece0',
  };
}

export abstract class Brachyramphus extends Alcidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Brachyramphus',
    common: 'Brachyramphus murrelets',
    note: 'Small, secretive alcids that feed at sea and nest alone on the high limbs of old-growth conifers, up to many miles inland.',
  };

  // Commutes to the forest, so unlike the other auks it climbs well above the water.
  static override flight: Partial<FlightProfile> = { cruiseSpeed: 20, power: 0.4, flapRate: 10, ceiling: 20 };

  protected override diveTime = 1.8;
  protected override diveReach = 6;
  protected override diveLeap = 0.3;

  static override behaviors: BehaviorTable<Brachyramphus> = {
    dawnFlight: {
      label: 'Dawn flight inland',
      cue: 'Leaves the water at first light, climbs and flies fast and straight over the land, calling in flight. No other auk does this. It returns to the bay later.',
    },
  };

  *dawnFlight(): Script {
    if (!this.world.habitat.water) return;
    this.say(this.ecology.call, 2.5);
    yield* this.flyTo({ x: rand(8, 14), y: 16 }, { land: false, speed: 1.2 });
    yield* this.wait(0.2);
    const spot = this.waterSpot();
    if (spot) yield* this.flyTo(spot);
    yield* this.relax();
  }
}

export class MarbledMurrelet extends Brachyramphus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Brachyramphus marmoratus',
    common: 'Marbled Murrelet',
    note: 'A small, dumpy alcid, black above and white below in winter and mottled brown in summer, with a thin bill. Scarce but regular on Discovery Bay and the strait; look for singles and pairs off Gardiner Beach, especially in summer.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'keer! keer! (fast and gull-like, given in flight)',
    presence: [1, 1, 1, 2, 2, 2, 2, 2, 1, 1, 1, 1],
  };

  static override look: Partial<Look> = {
    length: 0.25,
    beakLength: 0.7,
    body: '#2a2b2e',
    belly: '#f4f3ef',
    head: '#2a2b2e',
    throat: '#f4f3ef',
    wingBar: '#f4f3ef',
    wing: '#2a2b2e',
    tail: '#2a2b2e',
    beak: '#1c1c1c',
    legs: '#3a3a3a',
    eye: '#111111',
  };
}

export abstract class Uria extends Alcidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Uria',
    common: 'Murres',
    note: 'Large, upright alcids that nest shoulder to shoulder on bare cliff ledges and dive deeper than any other bird here.',
  };

  protected override diveTime = 3.5;
  protected override diveReach = 12;
  protected override diveLeap = 0.6;
  protected override dives = 2;

  static override behaviors: BehaviorTable<Uria> = {
    wingFlap: {
      label: 'Stand up and flap',
      cue: 'Rises almost upright on the water, flaps the wings for a few seconds, and settles back down. The only auk that does this after diving.',
    },
  };

  *wingFlap(): Script {
    if (!this.world.habitat.water) return;
    yield* this.toWater();
    yield* this.poseTo({ pitch: 1, neck: 1.3 }, 0.35);
    this.pose.wings = 'open';
    for (let t = 0; t < 2.2; ) {
      t += yield;
      this.pose.flap = Math.sin(t * 20);
    }
    this.pose.wings = 'folded';
    yield* this.relax(0.4);
  }
}

export class CommonMurre extends Uria {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Uria aalge',
    common: 'Common Murre',
    note: 'Chocolate-brown above and white below, with a long, thin, pointed bill and an upright stance. A small colony on Protection Island, and regular in the strait and off Gardiner Beach year-round, most often fall to spring.',
  };

  static override flight: Partial<FlightProfile> = { flapRate: 8 };

  static override ecology: Partial<Ecology> = {
    call: 'a low, growling arrr',
    posture: 0.5,
    presence: [2, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  };

  static override look: Partial<Look> = {
    length: 0.43,
    beakLength: 1.4,
    wingSpan: 1.5,
    tailLength: 0.1,
    body: '#3d3430',
    belly: '#fbfbf9',
    head: '#3b312d',
    wing: '#3a312d',
    tail: '#3a312d',
    beak: '#222222',
    legs: '#2a2a2a',
    eye: '#111111',
  };
}
