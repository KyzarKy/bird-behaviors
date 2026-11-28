/**
 * Songbirds of the forest edge and thicket: chickadee, bushtit, creeper, wrens,
 * kinglets, thrushes, waxwing and vireos. All are Passeriformes, so they share
 * the order's `sing`; each family below adds the way it moves through cover.
 */
import { clamp, rand } from '../core/Bird';
import type { BehaviorTable, Ecology, FlightProfile, Look, Script, Taxon } from '../core/traits';
import { Passeriformes, Poecile, Turdidae } from './passeriformes';

/** Open-and-close the bill n times, the same gesture `sing` uses. */
function* trill(bird: { pose: { beakOpen: number } }, poseTo: (to: { beakOpen: number }, s: number) => Script, n: number): Script {
  for (let i = 0; i < n; i++) {
    yield* poseTo({ beakOpen: 1 }, 0.07);
    yield* poseTo({ beakOpen: 0.2 }, 0.09);
  }
  bird.pose.beakOpen = 0;
}

// ================================================================== Paridae

export class BlackCappedChickadee extends Poecile {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Poecile atricapillus',
    common: 'Black-capped Chickadee',
    note: 'Black cap and bib, white cheek, gray back, buff flanks. Resident around Discovery Bay and the Miller Peninsula, in deciduous edges more than the dense conifers its chestnut-backed cousin prefers. The only chickadee here that whistles a song.',
  };

  static override ecology: Partial<Ecology> = {
    habitat: 'yard',
    call: 'chick-a-dee-dee-dee',
    song: 'fee-bee (two clear whistled notes, the second lower)',
    presence: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  };

  static override look: Partial<Look> = {
    length: 0.13,
    body: '#8d9296',
    belly: '#e6dccb',
    cap: '#1d1a18',
    wing: '#7a7f84',
    tail: '#6b7075',
  };

  static override behaviors: BehaviorTable<BlackCappedChickadee> = {
    feeBee: {
      label: 'Whistle fee-bee',
      cue: 'Head up, bill open, two pure whistled notes with the second a step lower. A Chestnut-backed Chickadee never does this; it only buzzes and chips.',
    },
  };

  *feeBee(): Script {
    yield* this.toPerch(['treetop', 'branch']);
    const rest = this.restingPose();
    yield* this.poseTo({ pitch: rest.pitch + 0.25, neck: 1.2, head: 0.5 }, 0.2);
    for (let i = 0; i < 3; i++) {
      this.say('♪ fee-bee', 1.6);
      yield* this.poseTo({ beakOpen: 0.7, head: 0.6 }, 0.1);
      yield* this.wait(0.45);
      yield* this.poseTo({ head: 0.35 }, 0.08);
      yield* this.wait(0.45);
      yield* this.poseTo({ beakOpen: 0, head: 0.5 }, 0.1);
      yield* this.wait(0.9);
    }
    yield* this.relax();
  }
}

// ============================================================== Aegithalidae

export abstract class Aegithalidae extends Passeriformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Aegithalidae',
    common: 'Long-tailed tits and bushtits',
    note: 'Tiny, long-tailed, social. A flock of a dozen or more keeps in constant contact by voice and crosses open ground one bird at a time.',
  };

  // Weak, fluttering flight: bushtits cross gaps in a string rather than as a group.
  static override flight: Partial<FlightProfile> = { cruiseSpeed: 6, power: 0.5, agility: 0.8, flapRate: 22, flapDuty: 0.5, cyclePeriod: 0.4 };
  static override ecology: Partial<Ecology> = { flockSize: 15, perches: ['shrub', 'twig', 'branch'], posture: 0.15 };
  static override look: Partial<Look> = { build: 0.7, headSize: 1.05, beakShape: 'cone', beakLength: 0.25, tailLength: 0.85 };

  static override behaviors: BehaviorTable<Aegithalidae> = {
    forage: {
      eats: 'leafBugs',
      label: 'Stream through the bushes',
      cue: 'Hangs upside down at the twig tips picking off aphids and tiny caterpillars, then moves on to the next bush within seconds, calling the whole way. Flocks travel this way, one bird after another in a string.',
    },
  };

  override forage(): Script {
    return this.streamFlock();
  }

  *streamFlock(): Script {
    this.say(this.ecology.call, 2.5);
    const reach = { neck: 0.2, head: -0.8 };
    for (let stop = 0; stop < 3; stop++) {
      const leaf = this.pieceInReach(reach, true);
      if (!leaf) break;
      yield* this.reachFor(leaf, reach, { hang: true, bites: Math.ceil(rand(2, 4)), hold: 0.4 });
      yield* this.poseTo({ rotation: 0 }, 0.15);
    }
    yield* this.relax();
  }
}

export abstract class Psaltriparus extends Aegithalidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Psaltriparus',
    common: 'American bushtits',
    note: 'One species. The gray, brown-capped bushtit of western thickets and gardens.',
  };
}

export class Bushtit extends Psaltriparus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Psaltriparus minimus',
    common: 'Bushtit',
    note: 'A plain gray ball with a long tail, smaller than a chickadee. Flocks pass through the Miller Peninsula brush all year. Males have a dark eye, females a pale yellow one.',
  };

  static override ecology: Partial<Ecology> = {
    habitat: 'yard',
    call: 'sit-sit-sit-sit-tsrrrr (high, thin, constant)',
    presence: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  };

  static override look: Partial<Look> = {
    length: 0.085,
    body: '#8c8780',
    belly: '#b9b2a6',
    head: '#8d8780',
    cap: '#8c7f6f',
    wing: '#7a7772',
    tail: '#76726c',
    beak: '#222222',
    legs: '#2a2826',
  };
}

// ================================================================ Certhiidae

export abstract class Certhiidae extends Passeriformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Certhiidae',
    common: 'Treecreepers',
    note: 'Bark specialists with a stiff tail used as a prop, long toes and a thin curved bill for pulling insects from crevices. Only creep up.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 6, power: 0.55, flapRate: 15, flapDuty: 0.6, cyclePeriod: 0.5 };
  static override look: Partial<Look> = { build: 0.4, headSize: 0.95, beakShape: 'thin', beakLength: 1, legLength: 0.08, tailLength: 0.9, tailShape: 'pointed' };

  static override behaviors: BehaviorTable<Certhiidae> = {
    forage: {
      eats: 'barkBugs',
      label: 'Spiral up the trunk',
      cue: 'Starts at the foot of a tree and works up in short hitches, picking tiny insects and spiders from the bark, swinging round to the other side now and then. At the top it lets go and flutters down to the base of the next tree. A nuthatch goes down head first; a creeper never does.',
    },
  };

  protected override spawn() {
    const trunk = this.findTrunk();
    if (!trunk?.climb) return super.spawn();
    this.pos = { x: trunk.x + trunk.width / 2, y: trunk.climb[0] + 3 };
    this.cling(1, true);
  }

  override forage(): Script {
    return this.spiralUp();
  }

  *spiralUp(): Script {
    for (let tree = 0; tree < 2; tree++) {
      // A creeper never climbs the same tree twice running: after the top it drops to the foot of another.
      const trunk = this.findTrunk(tree > 0);
      if (!trunk?.climb) return;
      const [bottom, top] = trunk.climb;
      // The drop from the last tree is a flutter down, so the bird arrives at the base.
      let side = yield* this.flyToTrunk(trunk, bottom + 0.5, true);
      for (let step = 0; this.pos.y < top - 2; step++) {
        const y0 = this.pos.y;
        yield* this.tween(0.1, (t) => {
          this.pos.y = y0 + this.size * 0.35 * t;
          this.pose.crouch = 0.3 * Math.sin(Math.PI * t);
        });
        yield* this.wait(0.12);
        if (step % 3 === 2) yield* this.peck(1, 0.5);
        if (step % 5 === 4) {
          side = -side as 1 | -1;
          this.cling(side, true);
          this.pos.x = trunk.x + (side * trunk.width) / 2;
        }
      }
      if (tree === 0) this.say(this.ecology.call, 1.5);
    }
  }
}

export abstract class Certhia extends Certhiidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Certhia',
    common: 'Treecreepers',
    note: 'The only treecreeper genus. North America has one species, Eurasia several.',
  };
}

export class BrownCreeper extends Certhia {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Certhia americana',
    common: 'Brown Creeper',
    note: 'Streaky brown above and white below, so well matched to bark that it is usually noticed when it moves. Resident in the mature conifers of the Miller Peninsula, most often found by its thin, high call.',
  };

  static override ecology: Partial<Ecology> = {
    habitat: 'yard',
    call: 'tseee (one thin, high note)',
    song: 'tsee-tsee-tsee-tsoo-eet (thin, high, descending)',
    presence: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
  };

  static override look: Partial<Look> = {
    length: 0.125,
    body: '#7a5f45',
    belly: '#f2eee6',
    head: '#6e5a46',
    eyeLine: '#e8e0d0',
    wing: '#6b5340',
    wingBar: '#d9b27a',
    tail: '#6a5642',
    beak: '#4a4038',
    legs: '#b49a82',
  };
}

// ============================================================= Troglodytidae

export abstract class Troglodytidae extends Passeriformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Troglodytidae',
    common: 'Wrens',
    note: 'Small, round, short-winged and loud for their size. Most keep the tail cocked, and most are a bundle of nervous energy that works low through cover.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 7, agility: 0.8, flapRate: 18, flapDuty: 0.6, cyclePeriod: 0.45, ceiling: 28 };
  static override ecology: Partial<Ecology> = { perches: ['shrub', 'twig', 'post'], groundSpeed: 6, posture: 0.2 };
  static override look: Partial<Look> = { build: 0.8, headSize: 1.05, beakShape: 'thin', beakLength: 0.7, tailLength: 0.4, tailCock: 0.9 };

  static override behaviors: BehaviorTable<Troglodytidae> = {
    forage: {
      eats: 'litterBugs',
      label: 'Creep through the litter',
      cue: 'Body low and tail up, it threads between roots and fallen logs in short hops, poking into every crevice for spiders and beetles. It looks more like a mouse than a bird.',
    },
    sing: {
      label: 'Sing',
      cue: 'A burst of song far bigger than the bird: it sings from a low perch, head back, tail up and quivering. Count the length of one song; it is a good way to tell the wrens apart.',
    },
  };

  /** Phrases of song per performance; each is about a second. */
  protected songBursts = 3;

  override forage(): Script {
    return this.creep();
  }

  *creep(): Script {
    yield* this.travelTo(this.foodSpot(4));
    for (let i = 0; i < 5; i++) {
      yield* this.poseTo({ crouch: 0.35, pitch: 0.05 }, 0.1);
      yield* this.moveOnGround(this.foodSpot(4).x, 1.5);
      yield* this.peck(Math.ceil(rand(1, 2)), 0.8);
      yield* this.wait(rand(0.05, 0.3));
    }
    yield* this.relax();
  }

  override *sing(): Script {
    yield* this.toPerch(['shrub', 'twig', 'post']);
    const rest = this.restingPose();
    yield* this.poseTo({ pitch: rest.pitch + 0.3, neck: 1.2, head: 0.5, tailAngle: this.look.tailCock + 0.4 }, 0.2);
    this.say(`♪ ${this.ecology.song ?? this.ecology.call}`, this.songBursts * 1.2 + 1);
    for (let burst = 0; burst < this.songBursts; burst++) {
      yield* trill(this, (to, s) => this.poseTo(to, s), 7);
      yield* this.poseTo({ tailAngle: this.look.tailCock + 0.2 }, 0.05);
      yield* this.poseTo({ tailAngle: this.look.tailCock + 0.45 }, 0.05);
    }
    yield* this.relax();
  }
}

export abstract class Troglodytes extends Troglodytidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Troglodytes',
    common: 'Winter and house wrens',
    note: 'The stub-tailed wrens, dark and barred. They bob on bent legs when excited.',
  };

  static override behaviors: BehaviorTable<Troglodytes> = {
    bob: {
      label: 'Bob and curtsy',
      cue: 'Rapid knee-bends on a stump or root, the tail dipping with the body. Given when it is alarmed or interested, often with chips.',
    },
  };

  *bob(): Script {
    yield* this.toPerch(['shrub', 'post']);
    this.say(this.ecology.call, 2);
    for (let i = 0; i < 9; i++) {
      yield* this.poseTo({ crouch: 0.5, tailAngle: this.look.tailCock - 0.3 }, 0.07);
      yield* this.poseTo({ crouch: 0, tailAngle: this.look.tailCock + 0.2 }, 0.07);
    }
    yield* this.relax();
  }
}

export class PacificWren extends Troglodytes {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Troglodytes pacificus',
    common: 'Pacific Wren',
    note: 'A tiny, dark brown, barred bird with a stubby tail held straight up. Lives in root tangles and sword ferns in damp forest on the Miller Peninsula all year. A song of more than a hundred notes that lasts about ten seconds.',
  };

  static override ecology: Partial<Ecology> = {
    habitat: 'yard',
    call: 'kip! kip! (a hard double chip)',
    song: 'a very long, high, tumbling trill of rapid notes, ten seconds or more',
    presence: [2, 2, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2],
  };

  protected override songBursts = 7;

  static override look: Partial<Look> = {
    length: 0.1,
    tailLength: 0.3,
    tailCock: 1.1,
    body: '#6b4a30',
    belly: '#8a6a4c',
    head: '#6b4a30',
    eyeLine: '#d8c8a8',
    spots: '#3a2a1c',
    wing: '#5c3f28',
    tail: '#5a3d27',
    beak: '#4a3a30',
    legs: '#a58a72',
  };
}

export abstract class Thryomanes extends Troglodytidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Thryomanes',
    common: 'Bewick’s wren',
    note: 'One species. Long-tailed and white-browed, favoring dry brush rather than the ferns the winter wren likes.',
  };

  static override behaviors: BehaviorTable<Thryomanes> = {
    tailFlick: {
      label: 'Flick the tail sideways',
      cue: 'The long tail is swung from side to side and fanned, flashing white corners. A Pacific Wren holds its short tail straight up and bobs the whole body instead.',
    },
  };

  *tailFlick(): Script {
    yield* this.toPerch(['shrub', 'twig']);
    for (let i = 0; i < 6; i++) {
      yield* this.poseTo({ tailFan: 1, tailAngle: this.look.tailCock + 0.25 }, 0.06);
      yield* this.poseTo({ tailFan: 0, tailAngle: this.look.tailCock - 0.1 }, 0.09);
      yield* this.wait(rand(0.2, 0.6));
    }
    yield* this.relax();
  }
}

export class BewicksWren extends Thryomanes {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Thryomanes bewickii',
    common: 'Bewick’s Wren',
    note: 'Brown above and gray-white below, with a bold white eyebrow and a long, white-cornered tail. Scarce on the Miller Peninsula, where it keeps to dry thickets and brush piles; more regular on the drier ground toward Sequim.',
  };

  static override ecology: Partial<Ecology> = {
    habitat: 'yard',
    call: 'jeeet (a harsh, buzzy note)',
    song: 'see-see-see-chrrr (thin, like a Song Sparrow’s)',
    presence: [1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 1, 1],
  };

  protected override songBursts = 2;

  static override look: Partial<Look> = {
    length: 0.13,
    tailLength: 0.75,
    tailShape: 'fan',
    tailCock: 0.5,
    beakLength: 0.8,
    body: '#7a6048',
    belly: '#d6d0c4',
    head: '#6f573f',
    eyeLine: '#f4f1ea',
    wing: '#6a523c',
    tail: '#5a4632',
    beak: '#4a4038',
    legs: '#7a6a5a',
  };
}

// ================================================================= Regulidae

export abstract class Regulidae extends Passeriformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Regulidae',
    common: 'Kinglets',
    note: 'Among the smallest songbirds in North America. They feed in a constant flutter at the ends of branches and flick their wings every few seconds.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 6, power: 0.55, agility: 0.9, braking: 0.7, hover: 0.5, flapRate: 28, flapDuty: 0.6, cyclePeriod: 0.3 };
  static override ecology: Partial<Ecology> = { flockSize: 6, perches: ['twig', 'branch'], posture: 0.2 };
  static override look: Partial<Look> = { build: 0.8, headSize: 1.1, beakShape: 'thin', beakLength: 0.35, tailLength: 0.45 };

  static override behaviors: BehaviorTable<Regulidae> = {
    forage: {
      eats: 'leafBugs',
      label: 'Hover-glean at a twig tip',
      cue: 'Flutters in place at the very end of a branch, picking tiny insects and caterpillars from needles and buds it never lands on, then flits to the next. Chickadees hang from twigs; kinglets hover in front of them.',
    },
    flickWings: {
      label: 'Flick the wings',
      cue: 'Both wings snap open and shut about every second, even when the bird is otherwise still. Hutton’s Vireo, which looks similar, does not do this.',
    },
  };

  /** Seconds each visit to a twig tip holds the hover. */
  protected hoverSeconds = 1.5;
  /** Wing flicks per bout. */
  protected flicks = 6;

  override forage(): Script {
    return this.hoverGlean();
  }

  *hoverGlean(): Script {
    for (let visit = 0; visit < 3; visit++) {
      const twig = this.findPerch(undefined, 'any');
      if (!twig) return;
      // Hovers just off a leaf where the caterpillars are, bill to the leaf, not sitting on it.
      const leaf = this.preySpot({ x: twig.x, y: twig.y + 0.5 });
      // From the side that keeps it inside the scene.
      const dir = leaf.x + this.size * 1.1 > 98 ? 1 : leaf.x - this.size * 1.1 < 2 ? -1 : leaf.x >= this.pos.x ? 1 : -1;
      yield* this.flyTo({ x: leaf.x - dir * this.size * 1.1, y: leaf.y - this.size * 0.25 }, { land: false, speed: 0.8 });
      this.pose.facing = dir;
      yield* this.hoverFor(this.hoverSeconds, { aim: -0.6 });
      // Eases in until the bill is at the leaf.
      const bill = this.billTip();
      yield* this.hoverFor(0.25, { aim: -0.6, drift: { x: leaf.x - bill.x, y: leaf.y - bill.y } });
      // Picks a caterpillar off the leaf tip in the hover.
      this.takeOrHide(yield* this.glimpse(), 0.5);
      // Flits on to the next tip without landing.
      yield* this.hoverFor(0.3, { drift: { x: rand(-2, 2), y: 1 } });
    }
    // Only now perches, flicking its wings.
    const twig = this.findPerch(undefined, 'near');
    if (twig) yield* this.flyTo(twig);
    yield* this.flickWings();
  }

  *flickWings(): Script {
    yield* this.settle();
    for (let i = 0; i < this.flicks; i++) {
      this.pose.wings = 'open';
      yield* this.poseTo({ flap: -0.8 }, 0.04);
      yield* this.poseTo({ flap: 0.2 }, 0.04);
      this.pose.wings = 'folded';
      yield* this.wait(rand(0.1, 0.3));
    }
    yield* this.relax();
  }
}

export abstract class Regulus extends Regulidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Regulus',
    common: 'Crowned kinglets',
    note: 'Olive and gray, with a patch of bright color on the crown. The name means “little king.”',
  };

  static override look: Partial<Look> = { wingBar: '#f4f1ea', beak: '#222222', legs: '#4a4038' };
}

export class GoldenCrownedKinglet extends Regulus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Regulus satrapa',
    common: 'Golden-crowned Kinglet',
    note: 'Olive above, gray below, with a black-bordered yellow crown, a white eyebrow, and a dark eye line. Resident in the conifers of the Miller Peninsula, often in winter flocks with chickadees and creepers. Heard before seen.',
  };

  static override ecology: Partial<Ecology> = {
    habitat: 'yard',
    call: 'tsee-tsee-tsee (extremely high and thin)',
    song: 'tsee tsee tsee, then a short chattering jumble',
    presence: [3, 3, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3],
  };

  // Spends more time hovering at branch tips than its cousin, which keeps lower.
  protected override hoverSeconds = 2.2;

  static override look: Partial<Look> = {
    length: 0.09,
    body: '#8f9a5a',
    belly: '#d8d8c8',
    head: '#8a8c80',
    cap: '#f0b429',
    eyeLine: '#16181a',
    wing: '#6e7448',
    tail: '#6b6f4a',
  };
}

export class RubyCrownedKinglet extends Regulus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Corthylio calendula',
    common: 'Ruby-crowned Kinglet',
    note: 'Plain olive with a bold broken white eye-ring and a dark bar behind the white wingbar. The red crown is almost always hidden and shows only when a male is excited. Winters in thickets at Discovery Bay and the Miller Peninsula, and passes through in spring and fall.',
  };

  static override ecology: Partial<Ecology> = {
    habitat: 'yard',
    perches: ['twig', 'shrub'],
    call: 'je-dit (a dry, scolding chatter)',
    song: 'a thin start, then a long, rich, rolling tumble of notes',
    presence: [2, 2, 2, 2, 2, 0, 0, 1, 2, 3, 2, 2],
  };

  protected override hoverSeconds = 1;
  protected override flicks = 10;

  static override look: Partial<Look> = {
    length: 0.1,
    crest: 'pointed',
    body: '#8c9462',
    belly: '#d9d6bc',
    head: '#8c9462',
    cap: '#c0242c',
    eyeRing: '#f4f1ea',
    wing: '#6c7250',
    tail: '#686c4c',
  };

  static override behaviors: BehaviorTable<RubyCrownedKinglet> = {
    crestFlash: {
      label: 'Flash the red crest',
      cue: 'Crown feathers lift to show a small patch of red, with scolding and constant wing flicks. Males do it in excitement; the patch is hidden the rest of the time.',
    },
  };

  *crestFlash(): Script {
    yield* this.toPerch();
    this.say(this.ecology.call, 2.2);
    yield* this.poseTo({ crest: 1, pitch: this.restingPose().pitch + 0.1 }, 0.1);
    for (let i = 0; i < 4; i++) {
      this.pose.wings = 'open';
      yield* this.poseTo({ flap: -0.8 }, 0.04);
      yield* this.poseTo({ flap: 0.2 }, 0.04);
      this.pose.wings = 'folded';
      yield* this.wait(0.25);
    }
    yield* this.poseTo({ crest: 0 }, 0.25);
    yield* this.relax();
  }
}

// ================================================================= Turdidae

export abstract class Ixoreus extends Turdidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Ixoreus',
    common: 'Varied thrush',
    note: 'One species. A thrush of dark damp conifer forest that comes down into yards in winter.',
  };

  static override look: Partial<Look> = { tailLength: 0.5 };

  static override behaviors: BehaviorTable<Ixoreus> = {
    longWhistle: {
      label: 'Sing the long whistle',
      cue: 'One long, eerie, slightly buzzy note held for two or three seconds, then silence, then another at a different pitch. It carries across the forest and is usually the first sign the bird is there.',
    },
    forage: {
      eats: 'litterBugs',
      label: 'Toss the leaf litter',
      cue: 'Sweeps its bill sideways through the leaves, flinging them over its shoulder to uncover insects and seeds. A robin pulls worms from lawns; this one works under the shrubs.',
    },
  };

  override forage(): Script {
    return this.leafToss();
  }

  *leafToss(): Script {
    yield* this.travelTo(this.foodSpot(4));
    for (let i = 0; i < 4; i++) {
      yield* this.moveOnGround(this.foodSpot(4).x, 0.8);
      const dir = this.pose.facing;
      yield* this.poseTo({ pitch: -0.3, neck: 0.2, head: -0.9 }, 0.1);
      this.world.burst('leaf', this.pos.x + dir * this.size * 0.5, 0.2, 5, dir);
      yield* this.wait(0.2);
      yield* this.relax(0.1);
      yield* this.peck(1);
    }
    yield* this.relax();
  }

  *longWhistle(): Script {
    yield* this.toPerch(['treetop', 'branch'], 'far');
    const rest = this.restingPose();
    yield* this.poseTo({ pitch: rest.pitch + 0.2, neck: 1.25, head: 0.5 }, 0.3);
    for (let note = 0; note < 3; note++) {
      this.say('♪ eeeeeee…', 2.8);
      yield* this.poseTo({ beakOpen: 0.6 }, 0.1);
      yield* this.wait(2.6);
      yield* this.poseTo({ beakOpen: 0 }, 0.1);
      yield* this.wait(1.4);
    }
    yield* this.relax();
  }
}

export class VariedThrush extends Ixoreus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Ixoreus naevius',
    common: 'Varied Thrush',
    note: 'Like a robin dressed in slate and orange, with a black breast band, an orange eyebrow and orange wing bars. Regular in Miller Peninsula yards from October to March, usually under shrubs or at the edge of the forest. Breeds higher in the Olympics.',
  };

  static override ecology: Partial<Ecology> = {
    habitat: 'yard',
    perches: ['branch', 'shrub', 'post'],
    call: 'chup (soft and low)',
    song: 'one long, eerie, buzzy whistle, then a pause, then another',
    presence: [3, 3, 2, 1, 1, 1, 1, 1, 1, 2, 3, 3],
  };

  static override look: Partial<Look> = {
    length: 0.25,
    body: '#4a5668',
    belly: '#d37a2e',
    breast: '#d37a2e',
    band: '#1d2024',
    head: '#4a5668',
    eyeLine: '#d37a2e',
    wing: '#3a4350',
    wingBar: '#d9a05a',
    tail: '#3a4350',
    beak: '#222222',
    legs: '#a8825f',
  };
}

export abstract class Catharus extends Turdidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Catharus',
    common: 'Spotted thrushes',
    note: 'Brown above and spotted below, shy, with flute-like songs among the finest of any North American bird. They feed on the forest floor and freeze when watched.',
  };

  static override ecology: Partial<Ecology> = { perches: ['shrub', 'branch'], groundSpeed: 7, posture: 0.4 };
  static override look: Partial<Look> = { length: 0.17, build: 0.55, legLength: 0.2, tailLength: 0.5, beakLength: 0.5 };

  static override behaviors: BehaviorTable<Catharus> = {
    forage: {
      eats: 'litterBugs',
      label: 'Hop and freeze',
      cue: 'Two or three quick hops under the shrubs, then it stands bolt upright and motionless, watching. Unlike a robin it does not cock its head or stab the lawn; it takes insects from the litter.',
    },
  };

  override forage(): Script {
    return this.hopFreeze();
  }

  *hopFreeze(): Script {
    yield* this.toGround(10);
    for (let i = 0; i < 3; i++) {
      yield* this.moveOnGround(this.foodSpot(5).x, 0.8);
      yield* this.poseTo({ pitch: 0.55, neck: 1.2 }, 0.1);
      yield* this.wait(rand(0.8, 1.5));
      yield* this.relax(0.1);
      yield* this.peck(1);
    }
    yield* this.relax();
  }
}

export class SwainsonsThrush extends Catharus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Catharus ustulatus',
    common: 'Swainson’s Thrush',
    note: 'Olive-brown above, buffy spotted breast, and a buff eye-ring that gives a “spectacled” look. Summer breeder in the shady Miller Peninsula woods and thickets from May to September. The song is heard far more often than the bird is seen.',
  };

  static override ecology: Partial<Ecology> = {
    habitat: 'yard',
    call: 'whit (a liquid, drip-like note)',
    song: 'whip-poor-will-a-will-a-zee-zee (a flute-like phrase spiraling upward)',
    presence: [0, 0, 0, 0, 2, 3, 3, 3, 1, 0, 0, 0],
  };

  static override look: Partial<Look> = {
    body: '#7a6a52',
    belly: '#e9e2d3',
    breast: '#d8c8a0',
    head: '#7a6a52',
    spots: '#6a5a44',
    eyeRing: '#e6d6a8',
    wing: '#76664e',
    tail: '#76664e',
    beak: '#b0987a',
    legs: '#b69a80',
  };

  static override behaviors: BehaviorTable<SwainsonsThrush> = {
    spiralSong: {
      label: 'Sing the rising spiral',
      cue: 'Each phrase starts low and spirals upward, a ladder of flute notes. The head tips higher with each step. Hermit Thrush phrases rise and fall instead.',
    },
  };

  *spiralSong(): Script {
    yield* this.toPerch(['treetop', 'branch']);
    const rest = this.restingPose();
    this.say(`♪ ${this.ecology.song}`, 3.6);
    for (let step = 0; step < 6; step++) {
      yield* this.poseTo({ neck: 1 + 0.06 * step, head: 0.1 + 0.1 * step, pitch: rest.pitch + 0.04 * step, beakOpen: 1 }, 0.2);
      yield* this.poseTo({ beakOpen: 0.2 }, 0.1);
    }
    yield* this.poseTo({ beakOpen: 0 }, 0.1);
    yield* this.wait(0.8);
    yield* this.relax();
  }
}

export class HermitThrush extends Catharus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Catharus guttatus',
    common: 'Hermit Thrush',
    note: 'Plain brown with a reddish tail, a bold eye-ring and a spotted breast. A few winter in thickets at Discovery Bay and on the Miller Peninsula, and more pass through in spring and fall. It does not sing here in winter.',
  };

  static override ecology: Partial<Ecology> = {
    habitat: 'yard',
    call: 'chup (low, dry)',
    song: 'a clear flute note, then a rising and falling spiral on different pitches',
    presence: [1, 1, 1, 2, 1, 0, 0, 0, 1, 2, 2, 1],
  };

  static override look: Partial<Look> = {
    body: '#7d6650',
    belly: '#ece6da',
    breast: '#e2d6c0',
    head: '#7d6650',
    spots: '#5b4a3a',
    eyeRing: '#f1eadb',
    wing: '#725e49',
    tail: '#9a4b2a',
    beak: '#a08a6e',
    legs: '#b8a088',
  };

  static override behaviors: BehaviorTable<HermitThrush> = {
    tailRaise: {
      label: 'Raise and lower the tail',
      cue: 'The tail jerks up, then sinks back slowly over a couple of seconds, with a soft chup. Of the brown thrushes, only the Hermit does this; the reddish tail confirms it.',
    },
  };

  *tailRaise(): Script {
    yield* this.settle();
    for (let i = 0; i < 2; i++) {
      yield* this.poseTo({ tailAngle: 0.9, pitch: this.restingPose().pitch + 0.1 }, 0.1);
      this.say('chup', 1);
      yield* this.wait(0.4);
      yield* this.poseTo({ tailAngle: this.look.tailCock }, 2.2);
      yield* this.wait(0.4);
    }
    yield* this.relax();
  }
}

// ============================================================= Bombycillidae

export abstract class Bombycillidae extends Passeriformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Bombycillidae',
    common: 'Waxwings',
    note: 'Sleek, crested, berry-eating flock birds. They live on fruit most of the year and turn to flying insects in summer.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 11, agility: 0.6, flapRate: 14, flapDuty: 0.9, cyclePeriod: 0.6 };
  static override ecology: Partial<Ecology> = { flockSize: 15, perches: ['treetop', 'branch', 'shrub'], posture: 0.4 };
  static override look: Partial<Look> = { build: 0.65, headSize: 1.05, crest: 'pointed', beakShape: 'cone', beakLength: 0.4, tailLength: 0.45 };

  static override behaviors: BehaviorTable<Bombycillidae> = {
    forage: {
      eats: 'berries',
      label: 'Pass a berry',
      cue: 'A bird picks a berry and, instead of eating it, sidles along the branch and hands it to a neighbor, who may hand it on. Berries are swallowed whole with a toss of the head.',
    },
    flycatch: {
      eats: 'swarm',
      label: 'Flycatch from a treetop',
      feeding: true,
      cue: 'Sits on an exposed treetop, darts out after an insect, and returns to the same lookout. It sallies like a flycatcher but is stockier and keeps a crest.',
    },
  };

  override forage(): Script {
    return this.berryPass();
  }

  *berryPass(): Script {
    // findPerch skips the perch it is on, and a scene may have only the one shrub.
    const onShrub = this.world.habitat.perches.some((q) => q.kind === 'shrub' && Math.hypot(q.x - this.pos.x, q.y - this.pos.y) <= 3);
    const shrub = onShrub ? null : this.findPerch(['shrub'], 'near');
    if (!onShrub && !shrub) return;
    // Beside a berry, with a neighbor on the same branch.
    yield* this.flyTo(this.preySpot(shrub ?? { ...this.pos }));
    const [mate] = this.company(1);
    // Leaning in, neck out and bill forward: where the bill gets to, so the two bills meet.
    const lean = { neck: 1.5, head: 0.35, pitch: this.restingPose().pitch - 0.25 };
    const saved = { ...this.pose };
    Object.assign(this.pose, lean);
    const reach = Math.abs(this.billTip().x - this.pos.x);
    Object.assign(this.pose, saved);
    const SIDLE = 0.8;
    // On whichever side keeps both in the shrub.
    const [lo, hi] = [45.5, 55.5];
    const dir: 1 | -1 = this.pos.x + 2 * reach + SIDLE <= hi ? 1 : this.pos.x - 2 * reach - SIDLE >= lo ? -1 : this.pose.facing;
    // A berry's width between the bill tips, so the bills meet rather than cross.
    mate.pos = { x: this.pos.x + dir * (2 * reach + SIDLE + 0.25), y: this.pos.y };
    mate.pose.facing = dir === 1 ? -1 : 1;
    // Picks a berry, then turns to the neighbor.
    yield* this.peck(1, 0.8);
    this.hold(this.pose.carry);
    this.pose.facing = dir;
    yield* this.poseTo({ neck: 1.2, head: 0.2, crest: 0.6 }, 0.2);
    // Sidles along the branch in two little hops.
    const x0 = this.pos.x;
    const y0 = this.pos.y;
    yield* this.tween(0.45, (t) => {
      this.pos.x = x0 + dir * SIDLE * t;
      this.pos.y = y0 + 0.25 * Math.abs(Math.sin(t * Math.PI * 2));
    });
    this.pos.y = y0;
    // Both lean in together, bill to bill, and the berry changes bills. The neighbor is the same species,
    // so its resting pose is this bird's.
    const rest = this.restingPose();
    const from = { neck: this.pose.neck, head: this.pose.head, pitch: this.pose.pitch };
    const bothLean = (t: number) => {
      Object.assign(this.pose, { neck: from.neck + (lean.neck - from.neck) * t, head: from.head + (lean.head - from.head) * t, pitch: from.pitch + (lean.pitch - from.pitch) * t });
      Object.assign(mate.pose, { neck: rest.neck + (lean.neck - rest.neck) * t, head: lean.head * t, pitch: rest.pitch + (lean.pitch - rest.pitch) * t });
    };
    yield* this.tween(0.3, bothLean);
    yield* this.wait(0.25);
    mate.pose.carry = this.pose.carry;
    this.hold(null);
    yield* this.wait(0.25);
    yield* this.tween(0.3, (t) => bothLean(1 - t));
    // The neighbor swallows it whole with a toss of the head.
    yield* this.wait(0.3);
    yield* this.tween(0.15, (t) => Object.assign(mate.pose, { head: 0.8 * t, neck: rest.neck + 0.3 * t, beakOpen: t }));
    mate.pose.carry = null;
    yield* this.tween(0.2, (t) => Object.assign(mate.pose, { head: 0.8 * (1 - t), neck: rest.neck + 0.3 * (1 - t), beakOpen: 1 - t }));
    // Back to the berries for one of its own, swallowed the same way.
    this.pose.facing = dir === 1 ? -1 : 1;
    yield* this.peck(1, 0.8);
    this.hold(this.pose.carry);
    yield* this.poseTo({ head: 0.8, neck: 1.3, beakOpen: 1 }, 0.12);
    this.hold(null);
    yield* this.relax();
  }

  *flycatch(): Script {
    yield* this.toPerch(['treetop', 'branch']);
    for (let i = 0; i < 3; i++) {
      const perch = { ...this.pos };
      const dir = perch.x > 60 ? -1 : 1;
      const bug = this.preySpot({ x: clamp(perch.x + dir * rand(8, 18), 4, 96), y: clamp(perch.y + rand(-2, 5), 4, 50) });
      yield* this.lookAround(rand(0.8, 1.6));
      yield* this.strikeAt(bug, { speed: 1.2, hold: 0.5 });
      this.say('snap!', 0.5);
      yield* this.flyTo(perch);
      yield* this.relax(0.15);
    }
  }
}

export abstract class Bombycilla extends Bombycillidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Bombycilla',
    common: 'Waxwings',
    note: 'Named for the red, waxy tips on the wing feathers. Three species worldwide.',
  };
}

export class CedarWaxwing extends Bombycilla {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Bombycilla cedrorum',
    common: 'Cedar Waxwing',
    note: 'Silky brown with a pale yellow belly, a black mask, a crest, and a yellow tail band. The waxy red wing tips are small and show only up close. Flocks move through Gardiner and the Miller Peninsula yards, most often from May to October, to strip berries and take insects over water.',
  };

  static override ecology: Partial<Ecology> = {
    habitat: 'yard',
    call: 'sreee (a high, thin, trilled hiss)',
    presence: [1, 1, 1, 2, 2, 3, 3, 3, 3, 2, 1, 1],
  };

  static override look: Partial<Look> = {
    length: 0.17,
    body: '#a58a68',
    belly: '#e8dca0',
    breast: '#b79a74',
    head: '#a58a68',
    cap: '#a58a68',
    throat: '#2a2420',
    eyeLine: '#16181a',
    wing: '#8a8e92',
    wingBar: '#d2342a',
    tail: '#7a7d80',
    beak: '#222222',
    legs: '#2a2420',
  };
}

// ================================================================ Vireonidae

export abstract class Vireonidae extends Passeriformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Vireonidae',
    common: 'Vireos',
    note: 'Thick-billed, thick-headed, rather deliberate leaf-gleaners. Where warblers and kinglets are quick, vireos stop to look before reaching.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 7, agility: 0.6, flapRate: 16, flapDuty: 0.7, cyclePeriod: 0.5 };
  static override ecology: Partial<Ecology> = { perches: ['branch', 'twig'], posture: 0.25 };
  static override look: Partial<Look> = { build: 0.65, headSize: 1.1, beakShape: 'cone', beakLength: 0.45, tailLength: 0.45 };

  static override behaviors: BehaviorTable<Vireonidae> = {
    forage: {
      eats: 'leafBugs',
      label: 'Peer and glean',
      cue: 'A slow hop, a pause with the head tilted one way and then the other, then a reach under a leaf for a caterpillar. Compare the near-constant motion of a kinglet.',
    },
  };

  /** Seconds spent peering at each stop. */
  protected pace = 1.2;

  override forage(): Script {
    return this.peerAndGlean();
  }

  *peerAndGlean(): Script {
    for (let stop = 0; stop < 3; stop++) {
      const next = this.findPerch(['twig', 'branch', 'shrub'], 'any');
      if (!next) return;
      yield* this.flyTo(next, { speed: 0.6 });
      yield* this.poseTo({ head: 0.35 }, 0.2);
      yield* this.wait(this.pace / 2);
      yield* this.poseTo({ head: -0.35 }, 0.2);
      yield* this.wait(this.pace / 2);
      // Reach under the leaf.
      yield* this.poseTo({ neck: 0.3, head: -1.1, pitch: -0.3 }, 0.25);
      this.takeOrHide(yield* this.glimpse(), 0.4);
      yield* this.wait(0.3);
      yield* this.relax(0.2);
    }
  }
}

export abstract class Vireo extends Vireonidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Vireo',
    common: 'Vireos',
    note: 'The one large genus in the family: most are olive or gray above, plain below, and sing the same short phrase over and over.',
  };
}

export class HuttonsVireo extends Vireo {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Vireo huttoni',
    common: 'Hutton’s Vireo',
    note: 'Looks like a Ruby-crowned Kinglet, but the bill is thicker, the eye-ring is broken, the legs are blue-gray, and it never flicks its wings. Resident but scarce on the Miller Peninsula, in mossy oak and fir at the forest edge; most often found by its repeated song in late winter.',
  };

  static override ecology: Partial<Ecology> = {
    habitat: 'yard',
    perches: ['twig', 'branch', 'shrub'],
    call: 'a nasal, rising rah-weeee',
    song: 'zu-wee, zu-wee, zu-wee (monotonous, repeated)',
    presence: [1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 1, 1],
  };

  protected override pace = 2;

  static override look: Partial<Look> = {
    length: 0.125,
    body: '#8a9068',
    belly: '#d6d3b8',
    head: '#8a8f78',
    eyeRing: '#f4f1ea',
    wing: '#6d7058',
    wingBar: '#f4f1ea',
    tail: '#6a6e5a',
    beak: '#6b727a',
    legs: '#6f8696',
  };
}

export class WarblingVireo extends Vireo {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Vireo gilvus',
    common: 'Warbling Vireo',
    note: 'A plain, gray-olive bird with a pale eyebrow and no wingbars, easy to overlook. Summer visitor to the deciduous trees at Discovery Bay and the Miller Peninsula from May to August, where it is heard far more often than seen.',
  };

  static override ecology: Partial<Ecology> = {
    habitat: 'yard',
    perches: ['branch', 'treetop'],
    call: 'a nasal, wheezy ehh',
    song: 'a rich, running warble that rises to a note at the end',
    presence: [0, 0, 0, 0, 2, 3, 3, 3, 1, 0, 0, 0],
  };

  protected override pace = 0.8;

  static override look: Partial<Look> = {
    length: 0.13,
    body: '#8f9378',
    belly: '#efeede',
    head: '#a0a38f',
    wing: '#767963',
    tail: '#727560',
    beak: '#5a6068',
    legs: '#6a7580',
  };

  static override behaviors: BehaviorTable<WarblingVireo> = {
    singWhileGleaning: {
      eats: 'leafBugs',
      label: 'Sing while foraging',
      feeding: true,
      cue: 'Warbles from inside the foliage and keeps picking caterpillars off the leaves between phrases, often well above eye level. It sings from the nest too.',
    },
  };

  *singWhileGleaning(): Script {
    const rest = this.restingPose();
    for (let i = 0; i < 2; i++) {
      const next = this.findPerch(['branch', 'twig'], 'any');
      if (!next) return;
      yield* this.flyTo(next, { speed: 0.7 });
      yield* this.poseTo({ pitch: rest.pitch + 0.2, neck: 1.2, head: 0.4 }, 0.15);
      this.say(`♪ ${this.ecology.song}`, 2.4);
      yield* trill(this, (to, s) => this.poseTo(to, s), 8);
      yield* this.relax(0.1);
      yield* this.peck(2, 0.8);
    }
  }
}
