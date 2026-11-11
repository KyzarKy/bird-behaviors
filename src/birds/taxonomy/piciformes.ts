import { Bird, rand } from '../core/Bird';
import type { BehaviorTable, Ecology, FlightProfile, Look, Script, Taxon } from '../core/traits';

export abstract class Piciformes extends Bird {
  static override taxon: Taxon = {
    rank: 'order',
    name: 'Piciformes',
    common: 'Woodpeckers and allies',
    note: 'Two toes forward and two back: a foot built for gripping vertical bark rather than wrapping a twig.',
  };
}

export abstract class Picidae extends Piciformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Picidae',
    common: 'Woodpeckers',
    note: 'Stiff tail feathers act as a third leg against the trunk, so woodpeckers climb upward, never head-down. In flight they are the most deeply undulating birds in the woods.',
  };

  // Three or four flaps, then wings clamped shut for longer than they were open.
  static override flight: Partial<FlightProfile> = {
    cruiseSpeed: 10,
    power: 0.6,
    braking: 0.5,
    glide: 0.1,
    flapRate: 9,
    flapDuty: 0.45,
    cyclePeriod: 0.9,
    restPose: 'folded',
  };

  static override ecology: Partial<Ecology> = { perches: ['branch'], posture: 0.25 };
  static override look: Partial<Look> = { beakShape: 'chisel', beakLength: 0.9, tailShape: 'pointed', tailLength: 0.45, legLength: 0.1 };

  static override behaviors: BehaviorTable<Picidae> = {
    hitchUp: {
      label: 'Hitch up the trunk',
      cue: 'Lands low and works upward in jerks, tail pressed to the bark as a prop, stopping to tap and probe. Reaches the top, drops to the base of the next tree, and starts again.',
    },
    drum: {
      label: 'Drum',
      cue: 'A fast, even roll on the most resonant dead wood available. Drumming is the woodpecker’s song: it claims territory, and it is far faster than feeding taps.',
    },
  };

  protected override spawn() {
    const trunk = this.findTrunk();
    if (!trunk?.climb) return super.spawn();
    this.pos = { x: trunk.x + trunk.width / 2, y: (trunk.climb[0] + trunk.climb[1]) / 2 };
    this.cling(1, true);
  }

  override forage(): Script {
    return this.hitchUp();
  }

  *hitchUp(): Script {
    const trunk = this.findTrunk();
    if (!trunk?.climb) return;
    const [bottom, top] = trunk.climb;
    yield* this.flyToTrunk(trunk, bottom + 1, true);
    for (let step = 0; this.pos.y < top - 2; step++) {
      const y0 = this.pos.y;
      this.pose.tailAngle = -0.5;
      yield* this.tween(0.1, (t) => {
        this.pos.y = y0 + this.size * 0.4 * t;
        this.pose.crouch = 0.4 * Math.sin(Math.PI * t);
      });
      yield* this.wait(0.16);
      if (step % 3 === 2) {
        yield* this.wait(rand(0.2, 0.5));
        yield* this.peck(Math.ceil(rand(2, 4)), 0.8);
        this.world.burst('chip', this.pos.x, this.pos.y + this.size * 0.5, 2, this.pose.rotation < 0 ? 1 : -1);
      }
    }
  }

  *drum(): Script {
    const trunks = this.world.habitat.trunks.filter((t) => t.climb);
    // The tallest bare trunk is the loudest sounding board.
    const snag = trunks.sort((a, b) => b.climb![1] - a.climb![1])[0];
    if (!snag?.climb) return;
    yield* this.flyToTrunk(snag, snag.climb[1] - 3, true);
    this.pose.tailAngle = -0.5;
    for (let roll = 0; roll < 2; roll++) {
      yield* this.wait(0.6);
      this.say('drrrrrrrrrrrrt', 1.2);
      for (let t = 0; t < 1; ) {
        t += yield;
        const hit = Math.abs(Math.sin(t * Math.PI * 18));
        this.pose.neck = 0.95 - 1.1 * hit;
        this.pose.head = -0.9 * hit;
      }
      yield* this.relax(0.1);
      this.pose.tailAngle = -0.5;
      yield* this.lookAround(1.5);
    }
  }
}

export abstract class Colaptes extends Picidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Colaptes',
    common: 'Flickers',
    note: 'The woodpeckers that came down out of the trees. Flickers eat ants, and they get them by hopping around on the ground like a robin.',
  };

  static override ecology: Partial<Ecology> = { perches: ['branch', 'post'] };

  static override behaviors: BehaviorTable<Colaptes> = {
    antProbe: {
      label: 'Probe for ants',
      cue: 'A woodpecker on the lawn. Hops, then drives its bill into the ground again and again in one spot, lapping ants with a tongue that reaches two inches past the bill tip.',
    },
  };

  // Still a woodpecker (it inherits hitchUp and drum) but its default feeding is on the ground.
  override forage(): Script {
    return this.antProbe();
  }

  *antProbe(): Script {
    yield* this.toGround(10);
    for (let i = 0; i < 3; i++) {
      yield* this.moveOnGround(this.world.clampLand(this.pos.x + rand(-5, 5)));
      yield* this.lookAround(0.5);
      for (let j = 0; j < 3; j++) {
        yield* this.peck(Math.ceil(rand(2, 5)), 1.2);
        yield* this.wait(rand(0.2, 0.5));
      }
    }
    yield* this.relax();
  }
}

export class NorthernFlicker extends Colaptes {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Colaptes auratus',
    common: 'Northern Flicker',
    note: 'Brown and barred with a spotted belly and a black crescent on the chest. When it flies, look for the white rump and the salmon-red flash under the wings of our western “red-shafted” birds.',
  };

  static override ecology: Partial<Ecology> = { call: 'kleeer!   …wicka-wicka-wicka' };

  static override look: Partial<Look> = {
    length: 0.31,
    build: 0.55,
    body: '#8a6a48',
    belly: '#e6d5b8',
    spots: '#222222',
    band: '#1b1b1d',
    head: '#9a8f86',
    cap: '#96785a',
    wing: '#7a5c3e',
    wingBar: '#3a2a1c',
    underwing: '#e8683a',
    tail: '#2a2420',
    beak: '#333333',
    legs: '#555555',
  };
}
