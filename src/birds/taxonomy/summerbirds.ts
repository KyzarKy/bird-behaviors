import { rand } from '../core/Bird';
import type { BehaviorTable, Ecology, FlightProfile, Look, PerchKind, Script, Taxon } from '../core/traits';
import { Contopus, Passeriformes, Tyrannidae } from './passeriformes';

// Summer songbirds of the Miller Peninsula: swallows, warblers, tanagers, grosbeaks and the
// flycatchers that arrive in April and May and are gone by September.

// ============================================================== Hirundinidae

export abstract class Hirundinidae extends Passeriformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Hirundinidae',
    common: 'Swallows',
    note: 'Aerial insect-eaters with long pointed wings, tiny bills that open very wide, and feet too small for walking. They feed on the wing all day and perch mostly on wires, twigs and nest boxes.',
  };

  // Flap, then a long glide on spread wings: far less flapping than a perching songbird of the same size.
  static override flight: Partial<FlightProfile> = {
    cruiseSpeed: 11,
    power: 0.8,
    agility: 0.9,
    braking: 0.3,
    glide: 0.85,
    flapRate: 10,
    flapDuty: 0.6,
    cyclePeriod: 1,
    restPose: 'spread',
  };

  static override ecology: Partial<Ecology> = { perches: ['twig', 'post'], gait: 'hop', groundSpeed: 2, posture: 0.3 };
  static override look: Partial<Look> = { beakShape: 'thin', beakLength: 0.3, legLength: 0.05, wingSpan: 2, tailShape: 'forked', build: 0.4 };

  static override behaviors: BehaviorTable<Hirundinidae> = {
    forage: {
      eats: 'swarm',
      label: 'Hawk insects on the wing',
      cue: 'Never still in the air: a few quick flaps, a long swoop or glide, a sharp turn toward an insect, and the bill gapes. Height over the ground and how much of the time the wings are set tell the species apart.',
    },
  };

  /** Lowest and highest height of the feeding sweeps, in stage units. */
  protected hawkLow = 4;
  protected hawkHigh = 18;
  /** Multiple of cruise speed during a sweep. */
  protected swoopSpeed = 1.1;
  /** Every Nth sweep is flown on set wings. Higher means more flapping. */
  protected glideEvery = 2;

  override forage(): Script {
    return this.hawk();
  }

  *hawk(): Script {
    for (let i = 0; i < 5; i++) {
      const bug = this.world.emit('insect', rand(15, 85), rand(this.hawkLow, this.hawkHigh), { life: 4 });
      this.pose.beakOpen = 1;
      yield* this.flyTo(bug, { land: false, speed: this.swoopSpeed, glide: i % this.glideEvery === this.glideEvery - 1 });
      bug.life = 0;
      this.pose.beakOpen = 0;
    }
    yield* this.toPerch();
    yield* this.relax();
  }
}

export abstract class Tachycineta extends Hirundinidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Tachycineta',
    common: 'Glossy swallows',
    note: 'Iridescent blue or green above, clean white below, with only a shallow notch in the tail. Both western species nest in old woodpecker holes and nest boxes.',
  };

  static override look: Partial<Look> = { tailLength: 0.5, belly: '#f6f6f2', throat: '#f6f6f2' };
}

export class VioletGreenSwallow extends Tachycineta {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Tachycineta thalassina',
    common: 'Violet-green Swallow',
    note: 'Green back, violet rump, and white that wraps up over the eye and onto the flanks so the rump shows as two white patches. Feeds high over the Miller Peninsula clearings and the Gardiner bluffs from April to August.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 12, flapRate: 12 };
  static override ecology: Partial<Ecology> = { scenes: { beach: 3 },
    habitat: 'yard',
    perches: ['twig', 'branch'],
    call: 'chit-chit, tsip',
    song: 'a soft, rapid twitter of tsiit-tsiit notes',
    presence: [0, 0, 1, 3, 3, 3, 3, 2, 1, 0, 0, 0],
  };

  static override look: Partial<Look> = {
    length: 0.13,
    body: '#3b8a5a',
    head: '#2f7a62',
    cap: '#2f7a62',
    wing: '#2b2f3a',
    tail: '#2b2f3a',
    beak: '#222222',
    legs: '#4a4038',
  };

  protected override hawkLow = 12;
  protected override hawkHigh = 34;
  protected override swoopSpeed = 1.3;
}

export class TreeSwallow extends Tachycineta {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Tachycineta bicolor',
    common: 'Tree Swallow',
    note: 'Glossy blue-green above, white below, with a white throat that stops at a clean dark cap and no white on the rump. The earliest swallow back, from March, perching on bare twigs and nest boxes in the yard.',
  };

  static override flight: Partial<FlightProfile> = { flapRate: 10 };
  static override ecology: Partial<Ecology> = { scenes: { beach: 2 },
    habitat: 'yard',
    perches: ['twig', 'post'],
    call: 'chee-weet, chi-veet',
    song: 'liquid gurgling twitters, chee-ter-weet',
    presence: [0, 0, 2, 3, 3, 3, 2, 2, 1, 0, 0, 0],
  };

  static override look: Partial<Look> = {
    length: 0.13,
    body: '#2a5a86',
    head: '#244f78',
    cap: '#244f78',
    wing: '#1f2d3d',
    tail: '#1f2d3d',
    beak: '#222222',
    legs: '#4a4038',
  };

  protected override hawkLow = 5;
  protected override hawkHigh = 14;
}

export abstract class Hirundo extends Hirundinidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Hirundo',
    common: 'Barn swallows',
    note: 'Deeply forked tails with long outer streamers, built of mud on human structures. They fly lower and farther than the glossy swallows.',
  };

  static override look: Partial<Look> = { tailLength: 0.85, wingSpan: 2.1 };
}

export class BarnSwallow extends Hirundo {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Hirundo rustica',
    common: 'Barn Swallow',
    note: 'Steel-blue back, rusty throat and forehead, buff belly and a long, deeply forked tail. Skims the grass and the water within a few feet of the surface. Common April to September around Discovery Bay farms and the Gardiner bluffs.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 11, flapRate: 9, glide: 0.7 };
  static override ecology: Partial<Ecology> = { scenes: { beach: 3 },
    habitat: 'yard',
    perches: ['post', 'twig'],
    call: 'kvick-kvick, witt-witt',
    song: 'a long, rambling twitter ending in a dry rattle',
    presence: [0, 0, 0, 3, 3, 3, 3, 3, 2, 0, 0, 0],
  };

  static override look: Partial<Look> = {
    length: 0.18,
    body: '#1f3f7a',
    belly: '#dc9a62',
    head: '#1f3f7a',
    cap: '#b5522b',
    throat: '#b5522b',
    band: '#1f3f7a',
    wing: '#17284a',
    tail: '#17284a',
    beak: '#222222',
    legs: '#4a4038',
  };

  // The only swallow here that works the grass tops: low passes, mostly flapped.
  protected override hawkLow = 1.2;
  protected override hawkHigh = 5;
  protected override swoopSpeed = 1.2;
  protected override glideEvery = 4;
}

// ================================================================== Parulidae

export abstract class Parulidae extends Passeriformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Parulidae',
    common: 'New World warblers',
    note: 'Small, thin-billed, restless insect-gleaners that work leaves and twig tips and rarely sit still. Mostly migrants here, with males in bright plumage from April to September.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 8, power: 0.6, agility: 0.85, flapRate: 16, flapDuty: 0.6, cyclePeriod: 0.4 };
  static override ecology: Partial<Ecology> = { perches: ['twig', 'branch', 'shrub'] };
  static override look: Partial<Look> = { build: 0.4, beakShape: 'thin', beakLength: 0.5, tailLength: 0.55, headSize: 0.95 };

  static override behaviors: BehaviorTable<Parulidae> = {
    forage: {
      eats: 'leafBugs',
      label: 'Glean from twig tips',
      cue: 'Flits from tip to tip, pecking at leaves and buds, with a flick of the tail between pecks. Compare the height it works and how long it stays at each stop; a warbler that never pauses is typical.',
    },
  };

  /** Perches it works, which sets the height it feeds at. */
  protected gleanPerches: PerchKind[] = ['twig', 'branch'];
  /** Multiple of the usual pause between pecks. Under 1 is frantic, over 1 is deliberate. */
  protected pace = 1;

  override forage(): Script {
    return this.glean();
  }

  *glean(): Script {
    for (let i = 0; i < 4; i++) {
      const stop = this.findPerch(this.gleanPerches, 'any') ?? this.groundSpot(this.pos.x, 6);
      yield* this.flyOver(stop);
      for (let j = 0; j < 2; j++) {
        yield* this.peck(Math.ceil(rand(1, 2)), 0.6);
        yield* this.poseTo({ tailAngle: this.look.tailCock + 0.3 }, 0.06);
        yield* this.wait(rand(0.1, 0.3) * this.pace);
        yield* this.poseTo({ tailAngle: this.look.tailCock }, 0.06);
      }
    }
    yield* this.relax();
  }
}

export abstract class Leiothlypis extends Parulidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Leiothlypis',
    common: 'Plain-plumaged warblers',
    note: 'Drab, unstreaked olive warblers with almost nothing to see in the plumage. They work low brush and fine twigs, and the voice and the feeding height do most of the identifying.',
  };

  static override ecology: Partial<Ecology> = { perches: ['shrub', 'twig'] };
}

export class OrangeCrownedWarbler extends Leiothlypis {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Leiothlypis celata',
    common: 'Orange-crowned Warbler',
    note: 'Plain olive-yellow with faint breast streaks and a broken eye-ring; the orange crown is nearly always hidden. Among the first warblers back in April and common in salal and alder edge through the summer.',
  };

  static override ecology: Partial<Ecology> = {
    habitat: 'yard',
    call: 'a sharp, dry chip',
    song: 'a weak trill that fades and drops in pitch at the end',
    presence: [0, 0, 1, 3, 3, 3, 2, 2, 2, 0, 0, 0],
  };

  static override look: Partial<Look> = {
    length: 0.13,
    body: '#8a9a4a',
    belly: '#c4cc6e',
    head: '#8f9c58',
    eyeLine: '#4f5a2a',
    eyeRing: '#d8dc9a',
    wing: '#6f7d3a',
    tail: '#5f6c32',
    beak: '#5a5a4a',
    legs: '#5a5a4a',
  };

  protected override gleanPerches: PerchKind[] = ['shrub', 'twig'];
  protected override pace = 1.2;
}

export abstract class Setophaga extends Parulidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Setophaga',
    common: 'Wood-warblers',
    note: 'The largest warbler genus, mostly canopy feeders with white wing bars and white in the tail. Several species flutter out to catch insects in the air as well as gleaning them.',
  };

  static override look: Partial<Look> = { wingBar: '#f4f4f0' };
}

export class YellowRumpedWarbler extends Setophaga {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Setophaga coronata',
    common: 'Yellow-rumped Warbler',
    note: 'Gray with a bright yellow rump, yellow flank patches and, in the western Audubon’s form, a yellow throat. The only warbler regular here in winter, in small numbers, and common in April and in autumn migration.',
  };

  static override ecology: Partial<Ecology> = {
    habitat: 'yard',
    call: 'a loud, flat check',
    song: 'a slow, weak warble that rises or falls at the end',
    presence: [1, 1, 2, 3, 3, 1, 0, 1, 3, 3, 2, 1],
  };

  static override look: Partial<Look> = {
    length: 0.14,
    body: '#6b7480',
    belly: '#e9e9e4',
    breast: '#3a3a40',
    throat: '#f2cf3a',
    head: '#6b7480',
    cap: '#6b7480',
    wing: '#3a3d44',
    tail: '#3a3a40',
    beak: '#222222',
    legs: '#222222',
  };

  static override behaviors: BehaviorTable<YellowRumpedWarbler> = {
    forage: {
      eats: 'swarm',
      label: 'Flycatch from a perch',
      cue: 'Darts out from a branch to snap an insect, banks, and returns. The tail fans on the turn and flashes the yellow rump. Other warblers here glean from leaves and rarely do this.',
    },    // It still gleans like the rest of its family, and in winter eats berries and seeds too.
    glean: {
      eats: 'leafBugs',
      label: 'Glean from twig tips',
      feeding: true,
      cue: 'Between sallies it works the twigs like any other warbler, pecking at leaves and buds.',
      weight: 2,
    },
  };

  override forage(): Script {
    return this.flycatch();
  }

  *flycatch(): Script {
    yield* this.toPerch(['branch', 'twig', 'post']);
    for (let i = 0; i < 3; i++) {
      const home = { ...this.pos };
      const dir = home.x > 60 ? -1 : 1;
      const bug = this.world.emit('insect', home.x + dir * rand(4, 9), home.y + rand(-1, 5), { life: 4 });
      this.pose.facing = dir;
      yield* this.flyTo(bug, { land: false, speed: 1.2 });
      bug.life = 0;
      this.say('snap!', 0.6);
      yield* this.poseTo({ roll: 0.7 * dir, tailFan: 1, beakOpen: 1 }, 0.1);
      yield* this.poseTo({ roll: 0, tailFan: 0, beakOpen: 0 }, 0.1);
      yield* this.flyTo(home);
      yield* this.wait(rand(0.4, 1));
    }
    yield* this.relax();
  }
}

export class TownsendsWarbler extends Setophaga {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Setophaga townsendi',
    common: "Townsend's Warbler",
    note: 'Black throat and ear patch on a bright yellow face, with olive back and streaked flanks. Feeds in the tops of the firs; most often seen in migration in April to May and again in August and September, a few in winter.',
  };

  static override ecology: Partial<Ecology> = {
    habitat: 'yard',
    perches: ['treetop', 'branch', 'twig'],
    call: 'a sharp, high chip',
    song: 'weezy weezy weezy tseet, wheezing and rising',
    presence: [1, 0, 0, 2, 2, 1, 1, 2, 2, 1, 0, 1],
  };

  static override look: Partial<Look> = {
    length: 0.12,
    body: '#7f8a3a',
    belly: '#f4f0d0',
    breast: '#f2d83a',
    head: '#f2d83a',
    cap: '#161616',
    throat: '#161616',
    eyeLine: '#161616',
    wing: '#3a3d44',
    tail: '#3a3d44',
    beak: '#222222',
    legs: '#222222',
  };

  // Works the highest branches of the conifers, so the stops are far overhead.
  protected override gleanPerches: PerchKind[] = ['treetop', 'branch'];
}

export class BlackThroatedGrayWarbler extends Setophaga {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Setophaga nigrescens',
    common: 'Black-throated Gray Warbler',
    note: 'Crisp black, white and gray: black crown and cheek, white eyebrow, black throat, with a small yellow spot in front of the eye. Slower and more deliberate than other warblers, in mixed alder and fir from late April to August.',
  };

  static override ecology: Partial<Ecology> = {
    habitat: 'yard',
    call: 'a soft, flat tsip',
    song: 'weezy weezy weezy weezy-tee, buzzy and even',
    presence: [0, 0, 0, 2, 3, 3, 3, 2, 1, 0, 0, 0],
  };

  static override look: Partial<Look> = {
    length: 0.13,
    body: '#6f7780',
    belly: '#f4f4f2',
    head: '#f0f0ec',
    cap: '#161616',
    throat: '#161616',
    eyeLine: '#161616',
    wing: '#3f444b',
    tail: '#3f444b',
    beak: '#222222',
    legs: '#222222',
  };

  protected override gleanPerches: PerchKind[] = ['branch', 'twig'];
  // Gleans more slowly than other warblers, with long pauses at each stop.
  protected override pace = 2.5;
}

export abstract class Cardellina extends Parulidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Cardellina',
    common: 'Hooded warblers',
    note: 'Bright yellow warblers with a plain face and a black cap or hood. They keep the tail in constant motion.',
  };

  static override behaviors: BehaviorTable<Cardellina> = {
    tailWag: {
      label: 'Wag the tail',
      cue: 'Stands on a low twig and flips the tail up and around in a jerky circle, again and again. A warbler that never stops moving its tail is this genus.',
    },
  };

  *tailWag(): Script {
    yield* this.toPerch(['shrub', 'twig']);
    for (let i = 0; i < 5; i++) {
      yield* this.poseTo({ tailAngle: 0.7, tailFan: 0.6 }, 0.1);
      yield* this.poseTo({ tailAngle: -0.1, tailFan: 0 }, 0.1);
      yield* this.wait(0.15);
    }
    yield* this.relax();
  }
}

export class WilsonsWarbler extends Cardellina {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Cardellina pusilla',
    common: "Wilson's Warbler",
    note: 'A small, yellow-faced warbler with a round black cap like a tiny beret and no wing bars. A shrub-layer bird in alder and willow thickets, common May to August and heard before it is seen.',
  };

  static override ecology: Partial<Ecology> = {
    habitat: 'yard',
    perches: ['shrub', 'twig'],
    call: 'a flat, nasal timp',
    song: 'chi-chi-chi-chi-chi-chi, a fast chatter that drops at the end',
    presence: [0, 0, 0, 2, 3, 3, 3, 2, 2, 0, 0, 0],
  };

  static override look: Partial<Look> = {
    length: 0.11,
    body: '#8ba33a',
    belly: '#f2dd3a',
    head: '#f2dd3a',
    cap: '#111111',
    wing: '#6f8530',
    tail: '#6f8530',
    beak: '#7a6a4a',
    legs: '#b48a6a',
  };

  protected override gleanPerches: PerchKind[] = ['shrub', 'twig'];
  // The most frantic of the group: barely a pause between pecks.
  protected override pace = 0.4;
}

export abstract class Geothlypis extends Parulidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Geothlypis',
    common: 'Yellowthroats',
    note: 'Marsh and thicket warblers that keep close to the ground in dense cover. They are heard far more than seen, and males pop up to sing.',
  };

  static override behaviors: BehaviorTable<Geothlypis> = {
    popUp: {
      label: 'Pop up and sing',
      cue: 'Skulks in the low cover, then flies up to an open post or twig, throws its head back to sing, and drops straight back in. The song is the best way to find one.',
    },
  };

  static override ecology: Partial<Ecology> = { perches: ['shrub', 'post'] };

  protected override gleanPerches: PerchKind[] = ['shrub'];
  protected override pace = 0.8;

  *popUp(): Script {
    yield* this.toPerch(['shrub']);
    yield* this.lookAround(1);
    yield* this.toPerch(['post', 'twig'], 'any');
    yield* this.poseTo({ pitch: this.restingPose().pitch + 0.25, neck: 1.2, head: 0.45 }, 0.2);
    this.say(`♪ ${this.ecology.song ?? this.ecology.call}`, 2.6);
    for (let i = 0; i < 5; i++) {
      yield* this.poseTo({ beakOpen: 1 }, 0.1);
      yield* this.poseTo({ beakOpen: 0.2 }, 0.14);
    }
    yield* this.poseTo({ beakOpen: 0 }, 0.1);
    yield* this.relax();
    yield* this.toPerch(['shrub']);
  }
}

export class CommonYellowthroat extends Geothlypis {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Geothlypis trichas',
    common: 'Common Yellowthroat',
    note: 'Males wear a black bandit mask over a bright yellow throat; females are plain olive with a pale eye-ring. In wet thickets and tall grass near Gardiner and Discovery Bay from late April to September.',
  };

  static override ecology: Partial<Ecology> = {
    habitat: 'yard',
    call: 'a dry, husky tchep',
    song: 'wichity-wichity-wichity-wich',
    presence: [0, 0, 0, 2, 3, 3, 3, 3, 2, 0, 0, 0],
  };

  static override look: Partial<Look> = {
    length: 0.12,
    body: '#7a7f3a',
    belly: '#e8e0c0',
    breast: '#f2d83a',
    throat: '#f2d83a',
    head: '#7a7f3a',
    eyeLine: '#111111',
    wing: '#5f6430',
    tail: '#5f6430',
    beak: '#222222',
    legs: '#b48a6a',
  };
}

// ============================================================== Cardinalidae

export abstract class Cardinalidae extends Passeriformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Cardinalidae',
    common: 'Cardinals, tanagers and grosbeaks',
    note: 'Heavy-billed, brightly colored songbirds. The males are among the most colorful summer birds in the Pacific Northwest, and both sexes eat fruit as well as insects and seeds.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 10, power: 0.65, agility: 0.6, flapRate: 12, flapDuty: 0.7, cyclePeriod: 0.5 };
  static override look: Partial<Look> = { build: 0.6, beakShape: 'stout', beakLength: 0.7, tailLength: 0.6 };

  static override behaviors: BehaviorTable<Cardinalidae> = {
    pluckFruit: {
      eats: 'berries',
      label: 'Pluck a berry',
      feeding: true,
      cue: 'Reaches out from a perch, snips a berry with the heavy bill, then tips its head back and swallows it whole. Fruit is a large part of the late-summer diet.',
    },
  };

  *pluckFruit(): Script {
    yield* this.toPerch(['shrub']);
    for (let i = 0; i < 2; i++) {
      yield* this.poseTo({ neck: 1.1, head: -0.5, pitch: 0.5 }, 0.2);
      this.pose.carry = 'seed';
      yield* this.poseTo({ neck: 0.95, head: 0, pitch: this.restingPose().pitch }, 0.2);
      yield* this.wait(0.3);
      yield* this.poseTo({ head: 0.8, neck: 1.2 }, 0.15);
      this.pose.carry = null;
      yield* this.relax(0.2);
      yield* this.wait(0.3);
    }
  }
}

export abstract class Piranga extends Cardinalidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Piranga',
    common: 'Tanagers',
    note: 'Slow, deliberate canopy birds. They move through the treetops in long pauses rather than quick flits, and are easily overlooked until one calls.',
  };

  static override ecology: Partial<Ecology> = { perches: ['treetop', 'branch'] };

  static override behaviors: BehaviorTable<Piranga> = {
    forage: {
      eats: 'leafBugs',
      label: 'Work along the canopy',
      cue: 'Moves from branch to branch at a slow pace, stopping to stare for several seconds before reaching out to take an insect or a berry. Compare the pause length with a warbler’s.',
    },
  };

  override forage(): Script {
    return this.canopyCreep();
  }

  *canopyCreep(): Script {
    for (let i = 0; i < 3; i++) {
      const stop = this.findPerch(['treetop', 'branch'], 'any');
      if (!stop) break;
      yield* this.flyTo(stop, { speed: 0.6 });
      yield* this.lookAround(rand(1.5, 3));
      yield* this.poseTo({ neck: 1.3, head: 0.3 }, 0.3);
      yield* this.peck(1, 0.5);
    }
    yield* this.relax();
  }
}

export class WesternTanager extends Piranga {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Piranga ludoviciana',
    common: 'Western Tanager',
    note: 'Males have a red face, yellow body, black back and wings, and two wing bars. Females are olive-yellow with wing bars. Arrives in May and sings from the tops of the firs through July.',
  };

  static override ecology: Partial<Ecology> = {
    habitat: 'yard',
    call: 'pit-ick, pit-er-ick',
    song: 'a hoarse, robin-like phrase, pirrit-pit-ter-it, rising and falling',
    presence: [0, 0, 0, 1, 3, 3, 3, 2, 1, 0, 0, 0],
  };

  static override look: Partial<Look> = {
    length: 0.18,
    body: '#1d1d1d',
    belly: '#f2d83a',
    breast: '#f2d83a',
    head: '#d8332a',
    throat: '#d8332a',
    wing: '#1d1d1d',
    wingBar: '#f2e8a8',
    tail: '#1d1d1d',
    beak: '#d8c06a',
    legs: '#444444',
  };
}

export abstract class Pheucticus extends Cardinalidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Pheucticus',
    common: 'Grosbeaks',
    note: 'Big, thick-billed songbirds that crush hard seeds and also take insects and fruit. The bill is the tool for it and the shape to look for.',
  };

  static override look: Partial<Look> = { beakLength: 1, headSize: 1.15 };

  static override behaviors: BehaviorTable<Pheucticus> = {
    crackSeed: {
      eats: 'seedHeads',
      label: 'Crack a seed',
      feeding: true,
      cue: 'Takes a seed to a branch and works it between the two halves of the bill with a slow, rolling chewing motion, then drops the husk. A finch does the same on a smaller scale; the grosbeak takes visibly longer.',
    },
  };

  *crackSeed(): Script {
    yield* this.travelTo(this.findPerch(['shrub']) ?? this.groundSpot(this.pos.x, 8));
    yield* this.peck(1);
    this.pose.carry = 'seed';
    yield* this.toPerch(['branch']);
    for (let i = 0; i < 6; i++) {
      yield* this.poseTo({ beakOpen: 0.6, head: -0.3 }, 0.12);
      yield* this.poseTo({ beakOpen: 0, head: 0 }, 0.12);
    }
    this.pose.carry = null;
    this.world.burst('chip', this.pos.x, this.pos.y, 3);
    yield* this.relax();
  }
}

export class BlackHeadedGrosbeak extends Pheucticus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Pheucticus melanocephalus',
    common: 'Black-headed Grosbeak',
    note: 'Males are orange and black with white wing patches and a massive pale bill; females are streaked brown with a buff eyebrow. Arrives in May and sings from deciduous trees in the yard until August.',
  };

  static override flight: Partial<FlightProfile> = { flapRate: 10 };
  static override ecology: Partial<Ecology> = {
    habitat: 'yard',
    call: 'a sharp, squeaky pik',
    song: 'a long, rich, robin-like warble, faster and more slurred than a robin’s',
    presence: [0, 0, 0, 2, 3, 3, 3, 2, 1, 0, 0, 0],
  };

  static override look: Partial<Look> = {
    length: 0.21,
    body: '#c8661f',
    belly: '#e5a23a',
    head: '#1a1a1a',
    cap: '#1a1a1a',
    wing: '#1a1a1a',
    wingBar: '#ffffff',
    tail: '#1a1a1a',
    beak: '#a8a090',
    legs: '#6a6a6a',
  };
}

// ======================================================== Empidonax and Contopus

export abstract class Empidonax extends Tyrannidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Empidonax',
    common: 'Empidonax flycatchers',
    note: 'Small olive flycatchers with eye-rings and pale wing bars that are famously hard to tell apart by plumage. Voice, habitat and habits do it instead.',
  };

  static override ecology: Partial<Ecology> = { perches: ['branch', 'twig'] };

  static override behaviors: BehaviorTable<Empidonax> = {
    tailFlick: {
      label: 'Flick the tail up',
      cue: 'Perched upright, the tail jerks sharply upward and drops back slowly, many times a minute. Empidonax flick up; a phoebe wags its tail down and up.',
    },
  };

  *tailFlick(): Script {
    yield* this.toPerch();
    for (let i = 0; i < 5; i++) {
      yield* this.poseTo({ tailAngle: this.look.tailCock + 0.6 }, 0.07);
      yield* this.poseTo({ tailAngle: this.look.tailCock }, 0.12);
      yield* this.wait(rand(0.4, 1));
    }
    yield* this.relax();
  }
}

export class WesternFlycatcher extends Empidonax {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Empidonax difficilis',
    common: 'Western Flycatcher',
    note: 'Olive-brown with yellowish underparts, a teardrop eye-ring and two buffy wing bars. A shade bird of mossy alder and fir, giving a rising pseet from May to August. Splits into Pacific-slope and Cordilleran; Pacific-slope is the local one.',
  };

  static override ecology: Partial<Ecology> = {
    habitat: 'yard',
    call: 'a sharp, rising pseet',
    song: 'a three-part tsip, ptsick, seet repeated from a shaded perch',
    presence: [0, 0, 0, 1, 3, 3, 3, 2, 1, 0, 0, 0],
  };

  static override look: Partial<Look> = {
    length: 0.15,
    body: '#7d7a45',
    belly: '#e6d97a',
    breast: '#b0a85a',
    throat: '#e6d97a',
    head: '#716f40',
    eyeRing: '#f0efe0',
    wingBar: '#d9d6b8',
    wing: '#5c5a34',
    tail: '#5c5a34',
    beak: '#5a4a3a',
    legs: '#333333',
  };

  // Short sallies from a shaded perch, and it often takes a new one.
  protected override sallyRange = 7;
  protected override returnChance = 0.6;
}

export class WesternWoodPewee extends Contopus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Contopus sordidulus',
    common: 'Western Wood-Pewee',
    note: 'Dusky gray-brown with a vested look, dull wing bars and no eye-ring, smaller than the Olive-sided Flycatcher. Arrives in May and repeats its nasal peeer from the same dead branch at the forest edge until August.',
  };

  static override ecology: Partial<Ecology> = {
    habitat: 'yard',
    perches: ['branch', 'treetop'],
    call: 'a nasal, descending peeer',
    song: 'pee-ur, pee-wee, peeer',
    presence: [0, 0, 0, 0, 3, 3, 3, 2, 1, 0, 0, 0],
  };

  static override look: Partial<Look> = {
    length: 0.15,
    wingSpan: 1.8,
    body: '#6d6a5a',
    belly: '#cfc9b0',
    breast: '#85806c',
    throat: '#d6d1b8',
    head: '#5f5c4e',
    wingBar: '#a8a38a',
    wing: '#4a483e',
    tail: '#4a483e',
    beak: '#2a2a2a',
    legs: '#222222',
  };

  // Sallies a little shorter than the Olive-sided, and almost always goes back to the same perch.
  protected override sallyRange = 16;
  protected override returnChance = 0.95;
}
