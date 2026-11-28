import { Bird, rand } from '../core/Bird';
import type { BehaviorTable, Ecology, FlightProfile, Look, Script, Taxon, Variants, Vec } from '../core/traits';

export abstract class Apodiformes extends Bird {
  static override taxon: Taxon = {
    rank: 'order',
    name: 'Apodiformes',
    common: 'Swifts and hummingbirds',
    note: '"Footless ones." The legs are so reduced that these birds cannot walk or hop; the feet only grip a perch. Everything else is done on the wing.',
  };

  static override ecology: Partial<Ecology> = { gait: 'none', posture: 0.5 };
  static override look: Partial<Look> = { legLength: 0.04 };
}

export abstract class Trochilidae extends Apodiformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Trochilidae',
    common: 'Hummingbirds',
    note: 'The only birds that generate lift on both the downstroke and the upstroke. That is what buys true hovering, backward flight, and stops with no visible deceleration.',
  };

  // Every flight parameter at its limit except glide: a hummingbird cannot coast.
  static override flight: Partial<FlightProfile> = {
    cruiseSpeed: 12,
    power: 1,
    agility: 1,
    braking: 1,
    hover: 1,
    glide: 0.05,
    flapRate: 45,
    flapDuty: 1,
  };

  static override ecology: Partial<Ecology> = { perches: ['twig', 'shrub'] };

  static override look: Partial<Look> = {
    build: 0.35,
    headSize: 0.95,
    beakShape: 'needle',
    beakLength: 1.5,
    wingSpan: 1.2,
    tailLength: 0.4,
    wing: '#3d3d3d',
    beak: '#111111',
  };

  static override behaviors: BehaviorTable<Trochilidae> = {
    forage: {
      eats: 'nectar',
      label: 'Feed at flowers',
      cue: 'Arrives fast and stops dead with no slowing. Hangs motionless, bill in the flower, then backs straight out in reverse before pivoting to the next one. Nothing else flies backward.',
    },
    diveDisplay: {
      label: 'Dive display',
      cue: 'Climbs until it is a speck, then dives in a J and pulls up right over its audience. The sound at the bottom is made by the tail feathers.',
    },
  };

  /** How high the display dive starts, in stage units above the audience. */
  protected diveHeight = 28;

  override forage(): Script {
    return this.hoverFeed();
  }

  *hoverFeed(): Script {
    const all = this.world.habitat.perches.filter((q) => q.kind === 'flower');
    // The flowers in bloom, where the nectar is.
    const m = this.mealRange();
    const open = m ? all.filter((q) => q.x >= m[0] - 2 && q.x <= m[1] + 2) : all;
    const flowers = open.length ? open : all;
    for (const flower of flowers) {
      const dir = flower.x >= this.pos.x ? 1 : -1;
      // Hang a short way off the flower, then ease in until the bill tip is in it.
      yield* this.flyTo({ x: flower.x - dir * this.size * 1.5, y: flower.y - this.size * 0.3 }, { land: false });
      this.pose.facing = dir;
      yield* this.hoverFor(0.35);
      const bill = this.billTip();
      yield* this.hoverFor(0.25, { drift: { x: flower.x - bill.x, y: flower.y - bill.y } });
      if (open.length) this.take(0.5);
      yield* this.hoverFor(rand(0.9, 1.5));
      // Straight back out, then on to the next.
      yield* this.hoverFor(0.3, { drift: { x: -dir * this.size * 0.8, y: 0.3 } });
      yield* this.hoverFor(0.2);
    }
    yield* this.toPerch();
    yield* this.relax();
  }

  *diveDisplay(): Script {
    const audience = this.findPerch(['shrub', 'flower'], 'near') ?? { x: 50, y: 8 };
    const dir = this.pos.x > audience.x ? -1 : 1;
    yield* this.flyTo({ x: audience.x - dir * 3, y: audience.y + 3 }, { land: false });
    this.pose.facing = dir;
    yield* this.hoverFor(0.8);
    for (let i = 0; i < 2; i++) {
      yield* this.flyTo({ x: audience.x - dir * 7, y: Math.min(this.sky, audience.y + this.diveHeight) }, { land: false });
      yield* this.flyTo({ x: audience.x - dir * 1.5, y: audience.y + 2 }, { land: false, speed: 2.2 });
      this.diveSound();
      yield* this.flyTo({ x: audience.x + dir * 7, y: audience.y + 7 }, { land: false, speed: 1.6 });
      yield* this.flyTo({ x: audience.x - dir * 3, y: audience.y + 3 }, { land: false });
      this.pose.facing = dir;
      yield* this.hoverFor(0.5);
    }
    yield* this.toPerch();
    yield* this.relax();
  }

  /** The noise at the bottom of the dive. Each genus has its own. */
  protected diveSound() {
    this.say('bzzzt!', 1);
  }

  /** Hover along a path without turning to face it. */
  protected *hoverAlong(to: Vec, seconds: number): Script {
    yield* this.hoverFor(seconds, { drift: { x: to.x - this.pos.x, y: to.y - this.pos.y } });
  }
}

// ------------------------------------------------------------------ Calypte

export abstract class Calypte extends Trochilidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Calypte',
    common: 'Helmeted hummingbirds',
    note: 'The iridescent gorget extends up over the crown like a helmet. Males sing, which is unusual for North American hummingbirds.',
  };

  // The highest dive of any North American hummingbird.
  protected override diveHeight = 38;

  protected override diveSound() {
    this.say('TEWK!', 1.2);
  }
}

export class AnnasHummingbird extends Calypte {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Calypte anna',
    common: "Anna's Hummingbird",
    note: 'Year-round on the Olympic Peninsula, even through snow. Stocky and gray-green; the male’s whole head flashes rose-magenta when it turns toward you.',
  };

  static override ecology: Partial<Ecology> = { call: 'tzip… tzip…', song: 'bzz-bzz-bzz chrrr zwee (thin, scratchy)', presence: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3] };

  static override look: Partial<Look> = {
    length: 0.1,
    body: '#5f8f5a',
    belly: '#b9bdb4',
    head: '#c2255c',
    throat: '#d6336c',
    tail: '#3f5a45',
  };
  static override variants: Variants = {
    // Female: green crown and a grayish throat, usually with a small rose spot in the middle.
    female: { head: '#5f8f5a', throat: '#c4bfb4' },
  };
}

// --------------------------------------------------------------- Selasphorus

export abstract class Selasphorus extends Trochilidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Selasphorus',
    common: 'Flame-bearers',
    note: 'Small, rufous, pugnacious. Notched outer wing feathers give adult males a metallic wing trill you can hear before you see them.',
  };

  static override look: Partial<Look> = { tailShape: 'pointed' };

  static override behaviors: BehaviorTable<Selasphorus> = {
    shuttle: {
      label: 'Shuttle display',
      cue: 'Swings side to side in tight, fast arcs just in front of a perched female, tail fanned, wings buzzing loudly at each pass.',
    },
  };

  protected override diveSound() {
    this.say('ch-ch-ch-chew!', 1.2);
  }

  *shuttle(): Script {
    const audience = this.findPerch(['shrub', 'flower'], 'near') ?? { x: 50, y: 8 };
    yield* this.flyTo({ x: audience.x - 4, y: audience.y + 2.5 }, { land: false });
    this.say('zeeeeeee (wing trill)', 2.5);
    for (let pass = 0; pass < 8; pass++) {
      const side = pass % 2 ? -1 : 1;
      this.pose.facing = side;
      yield* this.hoverAlong({ x: audience.x + side * 4, y: audience.y + 2.5 + rand(-0.4, 0.4) }, 0.28);
      this.pose.tailFan = 1;
    }
    yield* this.toPerch();
    yield* this.relax();
  }
}

export class RufousHummingbird extends Selasphorus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Selasphorus rufus',
    common: 'Rufous Hummingbird',
    note: 'Arrives in March with the red-flowering currant and leaves by late summer. Smaller than an Anna’s, bright orange, and the one starting every fight at the currant bush.',
  };

  static override ecology: Partial<Ecology> = { call: 'chip-chip-chip (hard, scolding)', presence: [0, 0, 2, 3, 3, 3, 3, 2, 1, 0, 0, 0] };

  static override look: Partial<Look> = {
    length: 0.09,
    body: '#c56a1e',
    belly: '#f0e3cf',
    breast: '#f4efe6',
    head: '#c56a1e',
    throat: '#e8451e',
    tail: '#b5591a',
  };
  static override variants: Variants = {
    // Green above, white below with rufous flanks, a white throat dotted with green and a small orange center spot,
    // and a rufous-based tail with white tips.
    female: { body: '#5c8a4a', head: '#5c8a4a', belly: '#e8c49a', throat: '#f2ece2', spots: '#c8501e' },
  };
}
