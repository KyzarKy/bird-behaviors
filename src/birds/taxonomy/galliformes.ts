import { Bird, rand } from '../core/Bird';
import type { BehaviorTable, Ecology, FlightProfile, Look, Script, Taxon, Vec } from '../core/traits';

export abstract class Galliformes extends Bird {
  static override taxon: Taxon = {
    rank: 'order',
    name: 'Galliformes',
    common: 'Landfowl',
    note: 'Heavy-bodied ground birds with short, round wings and strong scratching feet. They walk everywhere and fly only when they must: a burst of whirring wingbeats, a glide, and back to the ground.',
  };

  static override flight: Partial<FlightProfile> = {
    cruiseSpeed: 13,
    power: 0.8,
    agility: 0.3,
    braking: 0.3,
    glide: 0.3,
    flapRate: 14,
    flapDuty: 0.55,
    cyclePeriod: 1.6,
    endurance: 5,
    ceiling: 14,
  };

  static override ecology: Partial<Ecology> = { perches: [], gait: 'walk', groundSpeed: 5, headBob: true, posture: 0.1 };

  static override look: Partial<Look> = {
    build: 0.9,
    headSize: 0.62,
    neckLength: 0.16,
    legLength: 0.2,
    tailLength: 0.35,
    wingSpan: 1.3,
    beakShape: 'stout',
    beakLength: 0.45,
  };

  static override behaviors: BehaviorTable<Galliformes> = {
    scratch: {
      label: 'Scratch and peck',
      cue: 'One foot at a time rakes backward, then the bird steps back and inspects what it uncovered. Compare the towhee, which kicks with both feet at once.',
    },
    dustBathe: {
      label: 'Dust bathe',
      cue: 'Settles into a scrape on its belly and shuffles its wings to throw dust through the feathers, then stands and shakes.',
    },
    flush: {
      label: 'Flush',
      cue: 'Freezes first. Then an explosive, noisy takeoff, a few seconds of whirring wings, a glide on bowed wings, and it lands running.',
    },
  };

  override forage(): Script {
    return this.scratch();
  }

  *scratch(): Script {
    yield* this.toGround();
    for (let bout = 0; bout < 3; bout++) {
      for (const foot of ['kickNear', 'kickFar', 'kickNear'] as const) {
        yield* this.poseTo({ [foot]: -0.6, pitch: -0.1 }, 0.08);
        yield* this.poseTo({ [foot]: 1 }, 0.1);
        this.world.burst('dust', this.pos.x - this.pose.facing * this.size * 0.4, 0.2, 4, -this.pose.facing);
        yield* this.poseTo({ [foot]: 0 }, 0.1);
      }
      // Step back to look at the scraped patch.
      const x0 = this.pos.x;
      yield* this.tween(0.25, (t) => {
        this.pos.x = x0 - this.pose.facing * this.size * 0.3 * t;
        this.pose.stride = Math.sin(t * Math.PI * 2);
      });
      yield* this.peck(Math.ceil(rand(1, 4)));
      yield* this.moveOnGround(this.world.clampLand(this.pos.x + this.pose.facing * this.size * rand(0.6, 1.4)));
    }
    yield* this.relax();
  }

  *dustBathe(): Script {
    yield* this.toGround();
    yield* this.poseTo({ crouch: 1, pitch: -0.05 }, 0.5);
    this.pose.wings = 'open';
    for (let t = 0, puff = 0; t < 3; ) {
      const dt = yield;
      t += dt;
      this.pose.flap = -0.15 + 0.3 * Math.sin(t * 22);
      this.pose.pitch = 0.2 * Math.sin(t * 5);
      this.pose.tailFan = 0.8;
      if ((puff -= dt) < 0) {
        puff = 0.25;
        this.world.burst('dust', this.pos.x + rand(-1, 1) * this.size * 0.4, 0.3, 3);
      }
    }
    this.pose.wings = 'folded';
    yield* this.relax(0.4);
    for (let i = 0; i < 5; i++) {
      yield* this.poseTo({ pitch: 0.25, tailFan: 1 }, 0.05);
      yield* this.poseTo({ pitch: 0, tailFan: 0.4 }, 0.05);
    }
    this.world.burst('dust', this.pos.x, this.size * 0.5, 6);
    yield* this.relax();
  }

  *flush(): Script {
    yield* this.toGround();
    yield* this.poseTo({ crouch: 0.6, neck: 1.3 }, 0.15);
    yield* this.wait(0.7);
    const dir = this.pos.x > 50 ? -1 : 1;
    const landing = this.world.clampLand(this.pos.x + dir * 42);
    this.world.burst('dust', this.pos.x, 0.3, 5);
    if (yield* this.flyTo({ x: this.pos.x + dir * 12, y: Math.min(this.flight.ceiling, 7) }, { land: false })) {
      yield* this.flyTo({ x: landing, y: 0 }, { glide: true });
    }
    yield* this.moveOnGround(this.world.clampLand(this.pos.x + dir * 8), 1.6);
    yield* this.relax();
  }

  /** Walk to the foot of a low perch, size it up, and flutter onto it. */
  protected *flutterUpTo(perch: Vec): Script {
    const side = this.pos.x < perch.x ? -1 : 1;
    yield* this.travelTo({ x: perch.x + side * 4, y: 0 });
    this.pose.facing = -side as 1 | -1;
    yield* this.poseTo({ crouch: 0.5, head: 0.5 }, 0.4);
    yield* this.wait(0.3);
    yield* this.flyTo(perch);
  }
}

// ---------------------------------------------------------------- pheasants

export abstract class Phasianidae extends Galliformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Phasianidae',
    common: 'Pheasants, grouse and allies',
    note: 'The larger landfowl. Males are often ornamented with combs, wattles and long tail feathers.',
  };
}

export abstract class Gallus extends Phasianidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Gallus',
    common: 'Junglefowl',
    note: 'Forest-floor birds of South and Southeast Asia. Even the wild ones fly mainly to reach a roost for the night.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 9, endurance: 4, ceiling: 12 };
  static override look: Partial<Look> = { crest: 'comb', tailShape: 'fan', tailCock: 0.7, tailLength: 0.5 };

  static override behaviors: BehaviorTable<Gallus> = {
    roost: {
      label: 'Fly up to roost',
      cue: 'Walks to the base of a perch, crouches and stares up at it, then goes up in one labored, flapping jump.',
    },
  };

  *roost(): Script {
    const perch = this.findPerch(['post'], 'near');
    if (!perch) return;
    yield* this.flutterUpTo(perch);
    yield* this.poseTo({ crouch: 0.8 }, 0.6);
    yield* this.wait(2);
    yield* this.relax(0.4);
  }
}

export class Chicken extends Gallus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Gallus gallus domesticus',
    common: 'Chicken',
    note: 'Domestic junglefowl, bred heavier than its wings were built for. Not a Miller Peninsula native, but the bird that started this project.',
  };

  // Same wings as a junglefowl carrying twice the weight: slow, low, and done in seconds.
  static override flight: Partial<FlightProfile> = {
    cruiseSpeed: 4.5,
    power: 0.3,
    glide: 0.1,
    flapRate: 8,
    flapDuty: 1,
    endurance: 2.5,
    ceiling: 8,
  };

  static override ecology: Partial<Ecology> = { call: 'buk… buk… buk-buk-bu-GAWK!' };

  static override look: Partial<Look> = {
    length: 0.45,
    body: '#a4532a',
    belly: '#b9683a',
    head: '#a4532a',
    wing: '#8c4423',
    tail: '#2d2a26',
    beak: '#d9b45a',
    legs: '#d9b45a',
  };

  static override behaviors: BehaviorTable<Chicken> = {
    flush: {
      label: 'Panic flap-run',
      cue: 'Where a quail explodes into the air, a startled chicken runs with its wings beating, getting a foot or two of lift at best.',
    },
  };

  override *flush(): Script {
    yield* this.toGround();
    this.say('BAWK!', 1);
    const dir = this.pos.x > 50 ? -1 : 1;
    const end = this.world.clampLand(this.pos.x + dir * 26);
    const p = this.pose;
    p.facing = dir;
    p.wings = 'open';
    for (let t = 0; Math.abs(end - this.pos.x) > 0.3; ) {
      const dt = yield;
      t += dt;
      this.pos.x += dir * Math.min(this.ecology.groundSpeed * 2.4 * dt, Math.abs(end - this.pos.x));
      // Wing-assisted bounds: the feet keep coming back down.
      this.pos.y = 1.6 * Math.max(0, Math.sin(t * 4.5));
      p.flap = Math.sin(t * 50);
      p.stride = Math.sin(t * 30);
      p.pitch = 0.15;
    }
    this.pos.y = 0;
    p.wings = 'folded';
    yield* this.relax();
  }
}

// --------------------------------------------------------- New World quail

export abstract class Odontophoridae extends Galliformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Odontophoridae',
    common: 'New World quail',
    note: 'Small, round, sociable landfowl that live in coveys and would always rather run than fly.',
  };

  static override ecology: Partial<Ecology> = { gait: 'run', groundSpeed: 11 };
}

export abstract class Callipepla extends Odontophoridae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Callipepla',
    common: 'Crested quail',
    note: 'Quail of the dry West with a forward-drooping head plume.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 14, power: 0.9 };
  static override look: Partial<Look> = { crest: 'plume' };

  static override behaviors: BehaviorTable<Callipepla> = {
    sentinel: {
      label: 'Stand sentinel',
      cue: 'While the covey feeds, one male flutters to a fence post and stands tall, calling. Look up for the lone quail above the others.',
    },
  };

  *sentinel(): Script {
    const post = this.findPerch(['post'], 'near');
    if (!post) return;
    yield* this.flutterUpTo(post);
    yield* this.poseTo({ pitch: 0.45, neck: 1.25 }, 0.3);
    for (let i = 0; i < 3; i++) {
      this.say(this.ecology.call, 1.3);
      yield* this.poseTo({ beakOpen: 1, head: 0.3 }, 0.1);
      yield* this.wait(0.5);
      yield* this.poseTo({ beakOpen: 0, head: 0 }, 0.1);
      yield* this.lookAround(1.2);
    }
    yield* this.relax();
  }
}

export class CaliforniaQuail extends Callipepla {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Callipepla californica',
    common: 'California Quail',
    note: 'Common in the brushy edges of the Sequim–Gardiner rain shadow. Plump, gray, scaly-bellied, with a black teardrop plume.',
  };

  static override ecology: Partial<Ecology> = { call: 'chi-CA-go!' };

  static override look: Partial<Look> = {
    length: 0.25,
    body: '#6d7684',
    belly: '#cdb88c',
    breast: '#7d8794',
    head: '#3a2a22',
    cap: '#6a4326',
    throat: '#141414',
    eyeLine: '#f2f2f2',
    spots: '#5a4630',
    wing: '#7a6a55',
    tail: '#6d7684',
    beak: '#222222',
    legs: '#444444',
  };
}
