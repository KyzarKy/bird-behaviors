import { Bird, rand } from '../core/Bird';
import type { BehaviorTable, Ecology, FlightProfile, Look, Script, Taxon } from '../core/traits';

export abstract class Passeriformes extends Bird {
  static override taxon: Taxon = {
    rank: 'order',
    name: 'Passeriformes',
    common: 'Perching birds',
    note: 'More than half of all bird species. Three toes forward and one back lock onto a twig, and a complex voice box produces true song. Most small ones fly in bounds: a burst of flaps, then wings shut.',
  };

  static override flight: Partial<FlightProfile> = {
    cruiseSpeed: 9,
    power: 0.65,
    agility: 0.65,
    braking: 0.5,
    glide: 0.2,
    flapRate: 12,
    flapDuty: 0.55,
    cyclePeriod: 0.45,
    restPose: 'folded',
  };

  static override ecology: Partial<Ecology> = { perches: ['branch', 'shrub', 'post'] };

  static override behaviors: BehaviorTable<Passeriformes> = {
    sing: {
      label: 'Sing',
      cue: 'Song is delivered from a perch, head back and bill open, mostly by males in spring. Learn the rhythm as a phrase and you will find the bird by ear.',
    },
  };

  *sing(): Script {
    yield* this.toPerch();
    const rest = this.restingPose();
    yield* this.poseTo({ pitch: rest.pitch + 0.25, neck: 1.2, head: 0.45 }, 0.25);
    for (let phrase = 0; phrase < 2; phrase++) {
      this.say(`♪ ${this.ecology.song ?? this.ecology.call}`, 2.6);
      for (let i = 0; i < 6; i++) {
        yield* this.poseTo({ beakOpen: 1, tailAngle: this.look.tailCock - 0.15 }, 0.1);
        yield* this.poseTo({ beakOpen: 0.2, tailAngle: this.look.tailCock }, 0.14);
      }
      yield* this.poseTo({ beakOpen: 0 }, 0.1);
      yield* this.wait(1);
    }
    yield* this.relax();
  }
}

// ================================================================= Corvidae

export abstract class Corvidae extends Passeriformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Corvidae',
    common: 'Crows and jays',
    note: 'Big, bold, clever generalists. They hide food for later and remember where, and they watch who is watching them do it.',
  };

  // Unlike small songbirds, corvids row along with steady wingbeats.
  static override flight: Partial<FlightProfile> = {
    cruiseSpeed: 11,
    power: 0.55,
    agility: 0.5,
    glide: 0.45,
    flapRate: 4.5,
    flapDuty: 1,
    restPose: 'spread',
  };

  static override look: Partial<Look> = { build: 0.55, beakShape: 'stout', beakLength: 0.65, legLength: 0.2 };

  static override behaviors: BehaviorTable<Corvidae> = {
    cache: {
      label: 'Cache food',
      cue: 'Carries food off, looks around to see who is watching, jabs it into the ground, then pulls a leaf over the spot.',
    },
  };

  override *forage(): Script {
    yield* this.toGround();
    for (let i = 0; i < 4; i++) {
      yield* this.moveOnGround(this.world.clampLand(this.pos.x + rand(-7, 7)));
      yield* this.poseTo({ head: -0.5 }, 0.15);
      yield* this.wait(rand(0.3, 0.7));
      yield* this.peck(Math.ceil(rand(0, 2)));
    }
    yield* this.relax();
  }

  *cache(): Script {
    yield* this.toGround();
    yield* this.peck(2);
    this.pose.carry = 'acorn';
    yield* this.lookAround(1.2);
    yield* this.moveOnGround(this.world.clampLand(this.pos.x + (this.pos.x > 50 ? -1 : 1) * rand(7, 12)));
    yield* this.lookAround(1);
    yield* this.peck(1, 1.2);
    this.pose.carry = null;
    yield* this.peck(3, 1.2);
    // Cover it.
    for (let i = 0; i < 2; i++) {
      yield* this.poseTo({ neck: -0.3, head: -0.9, pitch: -0.35 }, 0.12);
      this.world.burst('leaf', this.pos.x + this.pose.facing * this.size * 0.5, 0.2, 2);
      yield* this.relax(0.15);
    }
    yield* this.lookAround(1);
    yield* this.relax();
  }
}

export abstract class Cyanocitta extends Corvidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Cyanocitta',
    common: 'Crested jays',
    note: 'The two blue, crested jays of North America: Steller’s in the West and the Blue Jay in the East. The crest is a mood gauge, flat when calm and straight up when agitated.',
  };

  // Jays break the corvid rowing pattern: a few flaps, then a glide on spread wings.
  static override flight: Partial<FlightProfile> = { cruiseSpeed: 10, agility: 0.65, flapRate: 6, flapDuty: 0.55, cyclePeriod: 1.5 };
  static override look: Partial<Look> = { crest: 'pointed', tailLength: 0.7 };

  static override behaviors: BehaviorTable<Cyanocitta> = {
    crestDisplay: {
      label: 'Scold with crest up',
      cue: 'Crest snaps fully upright, harsh calls, and big springy hops with the whole body bouncing.',
    },
  };

  *crestDisplay(): Script {
    yield* this.settle();
    yield* this.poseTo({ crest: 1, pitch: 0.3 }, 0.12);
    this.say(this.ecology.call, 2.2);
    for (let i = 0; i < 4; i++) {
      yield* this.poseTo({ crouch: 0.5, beakOpen: 1 }, 0.08);
      yield* this.poseTo({ crouch: 0, beakOpen: 0 }, 0.1);
      yield* this.wait(0.12);
    }
    if (this.onGround) yield* this.moveOnGround(this.world.clampLand(this.pos.x + this.pose.facing * 5));
    yield* this.wait(0.4);
    yield* this.relax(0.5);
  }
}

export class StellersJay extends Cyanocitta {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Cyanocitta stelleri',
    common: "Steller's Jay",
    note: 'The jay of the conifer forest. Charcoal head and shoulders fading to deep blue. Works its way up a tree by hopping branch to branch in a spiral, then glides out from the top.',
  };

  static override ecology: Partial<Ecology> = { call: 'SHAACK! SHAACK! SHAACK!', song: 'quiet whisper-song of clicks and gurgles' };

  static override look: Partial<Look> = {
    length: 0.3,
    body: '#1f4e9c',
    belly: '#2a62b8',
    breast: '#22252d',
    head: '#1c1f26',
    wing: '#1a4fa8',
    wingBar: '#0e2a5c',
    tail: '#17408a',
    beak: '#111111',
    legs: '#111111',
  };

  static override behaviors: BehaviorTable<StellersJay> = {
    mimicHawk: {
      label: 'Imitate a hawk',
      cue: 'A convincing Red-tailed Hawk scream from inside a tree, often as it arrives at a feeder. If the “hawk” is at eye level in a fir, check for a jay.',
    },
  };

  *mimicHawk(): Script {
    yield* this.toPerch(['branch']);
    yield* this.poseTo({ crest: 0.6, neck: 1.2, head: 0.3, beakOpen: 1 }, 0.15);
    this.say('keeeeeeer!  (Red-tailed Hawk imitation)', 2.5);
    yield* this.wait(1.4);
    yield* this.poseTo({ beakOpen: 0 }, 0.1);
    yield* this.lookAround(1.2);
    yield* this.relax();
  }
}

export abstract class Corvus extends Corvidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Corvus',
    common: 'Crows and ravens',
    note: 'All black, all smart. They walk rather than hop. Telling crow from raven is a matter of tail shape, voice, and whether it soars.',
  };

  static override ecology: Partial<Ecology> = { gait: 'walk', groundSpeed: 4.5, perches: ['branch', 'treetop', 'log', 'post'] };

  static override look: Partial<Look> = {
    body: '#17171a',
    belly: '#1b1b1f',
    head: '#17171a',
    wing: '#202026',
    tail: '#141417',
    beak: '#0e0e10',
    legs: '#0e0e10',
    tailLength: 0.55,
  };
}

export class AmericanCrow extends Corvus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Corvus brachyrhynchos',
    common: 'American Crow',
    note: 'The beach crows of Puget Sound were once split as “Northwestern Crow.” Square tail, steady rowing flight with no soaring, and a plain caw.',
  };

  static override ecology: Partial<Ecology> = { habitat: 'beach', call: 'caw! caw! caw!' };
  static override look: Partial<Look> = { length: 0.45 };

  static override behaviors: BehaviorTable<AmericanCrow> = {
    dropShellfish: {
      label: 'Drop a clam on the rocks',
      cue: 'Digs a clam at the tideline, flies straight up over rock or pavement, lets go, and follows it down. If it does not break, it goes higher.',
    },
  };

  dropShellfish(): Script {
    return this.dropOnRocks('clam');
  }
}

export class CommonRaven extends Corvus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Corvus corax',
    common: 'Common Raven',
    note: 'A third larger than a crow, with a wedge-shaped tail, a heavy bill and a shaggy throat. Usually in pairs, usually high, and usually heard first.',
  };

  // The quickest way to split it from a crow: ravens soar, crows do not.
  static override flight: Partial<FlightProfile> = { cruiseSpeed: 12, glide: 0.85, flapRate: 3.5, flapDuty: 0.35, cyclePeriod: 3.2 };
  static override ecology: Partial<Ecology> = { call: 'kraaak… kraaak…', perches: ['treetop', 'branch'] };
  static override look: Partial<Look> = { length: 0.62, tailShape: 'pointed', tailLength: 0.6, beakLength: 0.85, wingSpan: 2 };

  static override behaviors: BehaviorTable<CommonRaven> = {
    soar: {
      label: 'Soar',
      cue: 'Circles on flat, set wings like a hawk. A crow flaps the whole way. Check the tail: a raven’s comes to a wedge.',
    },
    barrelRoll: {
      label: 'Roll in flight',
      cue: 'Mid-flight it tucks a wing and flips onto its back for a second, often with a croak. Play, as far as anyone can tell.',
    },
  };

  *soar(): Script {
    yield* this.soarCircles(11, { x: 52, y: 34 }, 16);
  }

  *barrelRoll(): Script {
    const dir = this.pos.x > 50 ? -1 : 1;
    yield* this.flyTo({ x: 50 - dir * 14, y: 36 }, { land: false });
    this.say('kraaak!', 1);
    const vx = dir * this.flight.cruiseSpeed * 2.2;
    this.pose.wings = 'open';
    this.pose.flap = 0.5;
    for (let t = 0; t < 1; ) {
      const dt = yield;
      t += dt;
      this.pos.x += vx * dt;
      this.pos.y -= 2 * dt;
      // Half roll onto the back, a beat inverted, and half roll out the same way.
      this.pose.roll = Math.PI * Math.min(1, t / 0.3, (1 - t) / 0.3);
    }
    this.pose.roll = 0;
    yield* this.toPerch(undefined, 'far');
    yield* this.relax();
  }
}

// =============================================================== Tyrannidae

export abstract class Tyrannidae extends Passeriformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Tyrannidae',
    common: 'Tyrant flycatchers',
    note: 'Sit-and-wait insect hunters. They perch bolt upright on something exposed, launch after a passing insect, and come back. Many species look alike, so perch height, posture and voice do the work.',
  };

  // Built for the out-and-back: quick launch, tight turn, hard stop on the perch.
  static override flight: Partial<FlightProfile> = { cruiseSpeed: 10, power: 0.85, agility: 0.9, braking: 0.65, hover: 0.2, flapDuty: 0.85 };
  static override ecology: Partial<Ecology> = { perches: ['treetop', 'post', 'branch'], posture: 0.6 };
  static override look: Partial<Look> = { beakShape: 'thin', beakLength: 0.6, legLength: 0.08, headSize: 1.1 };

  static override behaviors: BehaviorTable<Tyrannidae> = {
    sally: {
      label: 'Sally for insects',
      cue: 'Upright on an exposed perch, head swiveling. A sudden dart out, an audible bill snap, and a loop back to a perch. How far it goes and whether it returns to the same spot separates the species.',
    },
  };

  /** How far out a sally reaches, in stage units. */
  protected sallyRange = 12;
  /** Chance of returning to the perch it left rather than moving on. */
  protected returnChance = 0.5;

  override forage(): Script {
    return this.sally();
  }

  *sally(): Script {
    yield* this.toPerch();
    for (let i = 0; i < 3; i++) {
      const perch = { ...this.pos };
      yield* this.lookAround(rand(1, 2.2));
      const dir = perch.x > 75 ? -1 : perch.x < 25 ? 1 : Math.random() < 0.5 ? -1 : 1;
      const bug = this.world.emit('insect', perch.x + dir * rand(5, this.sallyRange), Math.min(50, Math.max(3, perch.y + rand(-5, 5))), { life: 8 });
      this.pose.facing = dir;
      yield* this.poseTo({ head: bug.y > perch.y ? 0.4 : -0.4 }, 0.08);
      yield* this.wait(0.15);
      yield* this.flyTo(bug, { land: false, speed: 1.3 });
      bug.life = 0;
      this.say('snap!', 0.6);
      this.pose.beakOpen = 1;
      yield* this.wait(0.06);
      this.pose.beakOpen = 0;
      const next = Math.random() < this.returnChance ? perch : (this.findPerch() ?? perch);
      yield* this.flyTo(next);
      // Tail flick on landing.
      yield* this.poseTo({ tailAngle: 0.4 }, 0.08);
      yield* this.relax(0.15);
    }
  }
}

export abstract class Contopus extends Tyrannidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Contopus',
    common: 'Pewees',
    note: 'The long-winged flycatchers that choose the highest dead twig available, make long sallies, and return to the same perch again and again.',
  };

  static override ecology: Partial<Ecology> = { perches: ['treetop'] };

  protected override sallyRange = 20;
  protected override returnChance = 0.85;
}

export class OliveSidedFlycatcher extends Contopus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Contopus cooperi',
    common: 'Olive-sided Flycatcher',
    note: 'On the very tip of the tallest snag from May to August. Big-headed and short-tailed, with dark flanks like an unbuttoned vest over a white front. The song carries half a mile.',
  };

  static override ecology: Partial<Ecology> = { call: 'pip-pip-pip', song: 'Quick, THREE BEERS!' };

  static override look: Partial<Look> = {
    length: 0.19,
    headSize: 1.2,
    tailLength: 0.4,
    wingSpan: 1.7,
    body: '#5e6152',
    belly: '#f1eee4',
    breast: '#6a6d5e',
    throat: '#f1eee4',
    head: '#55584b',
    wing: '#45473d',
    tail: '#45473d',
    beak: '#222222',
    legs: '#222222',
  };
}

// ================================================================= Turdidae

export abstract class Turdidae extends Passeriformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Turdidae',
    common: 'Thrushes',
    note: 'Plump, upright, long-legged songbirds that feed on the ground and sing from the treetops at dawn and dusk.',
  };

  // Strong, direct flight with barely a pause between wingbeats.
  static override flight: Partial<FlightProfile> = { cruiseSpeed: 11, flapRate: 9, flapDuty: 0.8, cyclePeriod: 0.6 };
  static override ecology: Partial<Ecology> = { gait: 'run', groundSpeed: 9, posture: 0.35 };
  static override look: Partial<Look> = { build: 0.6, legLength: 0.2, beakShape: 'thin', beakLength: 0.55, tailLength: 0.55 };
}

export abstract class Turdus extends Turdidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Turdus',
    common: 'True thrushes',
    note: 'The lawn thrushes: American Robin here, Blackbird in Europe. All hunt worms the same stop-and-start way.',
  };

  static override behaviors: BehaviorTable<Turdus> = {
    wormHunt: {
      label: 'Hunt worms',
      cue: 'Runs a few steps, stops dead and stands tall, cocks its head to one side, then stabs. The head tilt is the bird looking, not listening: its eyes are on the sides of its head.',
    },
  };

  override forage(): Script {
    return this.wormHunt();
  }

  *wormHunt(): Script {
    yield* this.toGround(10);
    for (let i = 0; i < 3; i++) {
      yield* this.moveOnGround(this.world.clampLand(this.pos.x + (Math.random() < 0.7 ? this.pose.facing : -this.pose.facing) * rand(3.5, 7)));
      yield* this.poseTo({ pitch: 0.55, neck: 1.2 }, 0.08);
      yield* this.wait(rand(0.4, 0.8));
      yield* this.poseTo({ pitch: 0.15, neck: 0.5, head: -0.6 }, 0.15);
      yield* this.wait(rand(0.5, 0.9));
    }
    yield* this.peck(1, 1.1);
    yield* this.poseTo({ pitch: -0.4, neck: -0.6, head: -1.1 }, 0.08);
    this.pose.carry = 'worm';
    // Tug of war.
    for (let i = 0; i < 3; i++) {
      yield* this.poseTo({ pitch: 0.1 + i * 0.15, neck: 0.3 + i * 0.3, head: -0.5 + i * 0.25 }, 0.25);
      yield* this.wait(0.15);
    }
    yield* this.poseTo({ head: 0.5 }, 0.12);
    this.pose.carry = null;
    yield* this.relax();
  }
}

export class AmericanRobin extends Turdus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Turdus migratorius',
    common: 'American Robin',
    note: 'The yardstick bird: other species are described as “smaller than a robin.” Gray-brown above, brick-orange below, with a broken white eye-ring.',
  };

  static override ecology: Partial<Ecology> = { call: 'tut-tut-tut… peek!', song: 'cheerily, cheer-up, cheer-up, cheerily' };

  static override look: Partial<Look> = {
    length: 0.25,
    body: '#6b6660',
    belly: '#c8551f',
    breast: '#c8551f',
    head: '#2e2b29',
    throat: '#e8e4dc',
    eyeRing: '#ffffff',
    wing: '#5c5751',
    tail: '#3d3936',
    beak: '#e0b030',
    legs: '#5a4632',
  };
}

// ================================================================== Paridae

export abstract class Paridae extends Passeriformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Paridae',
    common: 'Chickadees and titmice',
    note: 'Tiny, round, restless acrobats that never sit still, with strong feet for hanging at any angle. The core of every winter mixed flock.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 7, agility: 0.85, flapRate: 25, flapDuty: 0.5, cyclePeriod: 0.34 };
  static override ecology: Partial<Ecology> = { perches: ['branch', 'twig', 'shrub'] };
  static override look: Partial<Look> = { build: 0.75, headSize: 1.15, beakLength: 0.3, tailLength: 0.55 };

  static override behaviors: BehaviorTable<Paridae> = {
    hangGlean: {
      label: 'Glean upside down',
      cue: 'Flits to the very tip of a twig and swings underneath it to pick at buds and cones. Few other birds this size feed hanging by their feet.',
    },
    seedHammer: {
      label: 'Hammer open a seed',
      cue: 'Takes one seed and leaves. On a branch it pins the seed under both feet and hammers it open with its bill; it never sits at the feeder cracking seeds like a finch.',
    },
  };

  override forage(): Script {
    return this.hangGlean();
  }

  *hangGlean(): Script {
    for (let visit = 0; visit < 2; visit++) {
      const twig = this.findPerch(['twig']);
      if (!twig) return;
      yield* this.flyTo(twig);
      yield* this.wait(0.2);
      yield* this.poseTo({ rotation: Math.PI * this.pose.facing }, 0.18);
      for (let i = 0; i < 3; i++) {
        yield* this.peck(Math.ceil(rand(1, 3)), 0.7);
        yield* this.wait(rand(0.1, 0.4));
      }
      yield* this.poseTo({ rotation: 0 }, 0.18);
      yield* this.wait(0.2);
    }
    yield* this.toPerch(['branch']);
    yield* this.relax();
  }

  *seedHammer(): Script {
    yield* this.travelTo(this.findPerch(['shrub']) ?? this.groundSpot(this.pos.x, 8));
    yield* this.peck(1);
    this.pose.carry = 'seed';
    yield* this.wait(0.2);
    yield* this.toPerch(['branch']);
    this.pose.carry = null;
    for (let i = 0; i < 3; i++) {
      for (let hit = 0; hit < 5; hit++) {
        yield* this.poseTo({ pitch: -0.5, neck: -0.9, head: -1.4 }, 0.05);
        yield* this.poseTo({ pitch: -0.2, neck: -0.2, head: -0.9 }, 0.05);
      }
      this.world.burst('chip', this.pos.x, this.pos.y, 2);
      yield* this.relax(0.1);
      yield* this.lookAround(0.5);
    }
    yield* this.relax();
  }
}

export abstract class Poecile extends Paridae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Poecile',
    common: 'Chickadees',
    note: 'Dark cap, dark bib, white cheek. The call names the bird, and more “dee” notes on the end mean a more dangerous predator nearby.',
  };

  static override look: Partial<Look> = { head: '#f4f1ea', throat: '#1d1a18', beak: '#111111', legs: '#4a4f57' };
}

export class ChestnutBackedChickadee extends Poecile {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Poecile rufescens',
    common: 'Chestnut-backed Chickadee',
    note: 'The chickadee of wet Pacific conifer forest. Rich chestnut back and flanks and a dark brown cap. Its call is higher, faster and buzzier than a Black-capped’s.',
  };

  static override ecology: Partial<Ecology> = { call: 'tsick-a-zee-zee', song: 'thin, buzzy chips (no whistled song)' };

  static override look: Partial<Look> = {
    length: 0.12,
    body: '#8a4b2a',
    belly: '#ece7dd',
    cap: '#3b2a22',
    wing: '#6b6e72',
    tail: '#5d6064',
  };
}

// ================================================================= Sittidae

export abstract class Sittidae extends Passeriformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Sittidae',
    common: 'Nuthatches',
    note: 'Compact bark-climbers with a long hind claw and no need of the tail for support, which frees them to go down a trunk head first and find what the upward-climbing woodpeckers miss.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 8, flapRate: 18, cyclePeriod: 0.4 };
  static override look: Partial<Look> = { build: 0.6, tailLength: 0.25, beakShape: 'chisel', beakLength: 0.75, legLength: 0.08 };

  static override behaviors: BehaviorTable<Sittidae> = {
    creepDown: {
      label: 'Creep down the trunk',
      cue: 'Head-first down the bark in short jerks, pausing to crane its head out and look around. A small bird pointing downward on a trunk is a nuthatch.',
    },
  };

  protected override spawn() {
    const trunk = this.findTrunk();
    if (!trunk?.climb) return super.spawn();
    this.pos = { x: trunk.x + trunk.width / 2, y: trunk.climb[1] - 4 };
    this.cling(1, false);
  }

  override forage(): Script {
    return this.creepDown();
  }

  *creepDown(): Script {
    const trunk = this.findTrunk();
    if (!trunk?.climb) return;
    const [bottom, top] = trunk.climb;
    yield* this.flyToTrunk(trunk, top - 1, false);
    for (let step = 0; this.pos.y > bottom + 2; step++) {
      const y0 = this.pos.y;
      yield* this.tween(0.1, (t) => {
        this.pos.y = y0 - this.size * 0.4 * t;
        this.pose.crouch = 0.4 * Math.sin(Math.PI * t);
      });
      yield* this.wait(0.1);
      if (step % 4 === 3) {
        // The signature pose: body flat to the bark, head craned out level.
        yield* this.poseTo({ neck: 1.5, head: 1.1 }, 0.12);
        if (step === 3) this.say(this.ecology.call, 1.6);
        yield* this.wait(rand(0.5, 0.9));
        yield* this.relax(0.1);
        yield* this.peck(2, 0.8);
      }
    }
  }
}

export abstract class Sitta extends Sittidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Sitta',
    common: 'Nuthatches',
    note: 'The only genus in the family. The name comes from wedging a nut in a bark crevice and hacking it open.',
  };
}

export class RedBreastedNuthatch extends Sitta {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Sitta canadensis',
    common: 'Red-breasted Nuthatch',
    note: 'The conifer nuthatch. Blue-gray back, rusty underparts, and a black line through the eye under a white eyebrow. Sounds like a tiny tin horn.',
  };

  static override ecology: Partial<Ecology> = { call: 'yank-yank-yank', song: 'eeen-eeen-eeen-eeen (nasal, rapid)' };

  static override look: Partial<Look> = {
    length: 0.11,
    body: '#5f7890',
    belly: '#c98248',
    head: '#f4f1ea',
    cap: '#16181a',
    eyeLine: '#16181a',
    wing: '#4f667c',
    tail: '#3c4f60',
    beak: '#222222',
    legs: '#333333',
  };
}

// ============================================================ Passerellidae

export abstract class Passerellidae extends Passeriformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Passerellidae',
    common: 'New World sparrows',
    note: 'Seed-eaters of the ground and the brush pile. Many uncover food with a move unrelated landfowl never use: a two-footed backward hop-kick.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 8, power: 0.6, flapDuty: 0.7, cyclePeriod: 0.5 };
  static override ecology: Partial<Ecology> = { perches: ['shrub', 'post'] };
  static override look: Partial<Look> = { build: 0.6, beakLength: 0.4 };

  static override behaviors: BehaviorTable<Passerellidae> = {
    doubleScratch: {
      label: 'Double-scratch',
      cue: 'A quick hop forward, then both feet kick backward together, throwing leaves behind it. You often hear the rustling in the litter before you see the bird. A chicken scratches one foot at a time.',
    },
  };

  override forage(): Script {
    return this.doubleScratch();
  }

  *doubleScratch(): Script {
    const [from, to] = this.world.habitat.litter ?? [this.pos.x - 4, this.pos.x + 4];
    yield* this.travelTo({ x: this.world.clampLand(rand(from, to)), y: 0 });
    const hop = this.size * 0.3;
    for (let i = 0; i < 6; i++) {
      const f = this.pose.facing;
      const x0 = this.pos.x;
      yield* this.tween(0.08, (t) => {
        this.pos.x = x0 + f * hop * t;
        this.pos.y = this.size * 0.08 * Math.sin(Math.PI * t);
      });
      yield* this.tween(0.12, (t) => {
        this.pos.x = x0 + f * hop * (1 - t);
        this.pos.y = this.size * 0.15 * Math.sin(Math.PI * t);
        this.pose.kickNear = this.pose.kickFar = Math.sin(Math.PI * t);
      });
      this.pos.y = 0;
      this.world.burst('leaf', this.pos.x - f * this.size * 0.4, 0.2, 3, -f);
      if (i % 2) yield* this.peck(Math.ceil(rand(1, 3)));
      else yield* this.wait(0.1);
    }
    yield* this.relax();
  }
}

export abstract class Pipilo extends Passerellidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Pipilo',
    common: 'Towhees',
    note: 'Oversized, long-tailed sparrows that live under bushes. The most committed double-scratchers in the family.',
  };

  static override look: Partial<Look> = { tailLength: 0.75, tailCock: 0.2 };
}

export class SpottedTowhee extends Pipilo {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Pipilo maculatus',
    common: 'Spotted Towhee',
    note: 'Black hood, red eye, rufous flanks, white belly, white spots on the wing. Lives in the salal and sword fern and rarely comes far out of cover.',
  };

  static override ecology: Partial<Ecology> = { call: 'meeewww? (a rising, catlike whine)', song: 'chup-chup-zeeeeeee' };

  static override look: Partial<Look> = {
    length: 0.21,
    body: '#1b1b1d',
    belly: '#b5531f',
    breast: '#1b1b1d',
    head: '#1b1b1d',
    wing: '#1b1b1d',
    wingBar: '#ffffff',
    tail: '#1b1b1d',
    beak: '#111111',
    legs: '#b48a6a',
    eye: '#c0201a',
  };
}
