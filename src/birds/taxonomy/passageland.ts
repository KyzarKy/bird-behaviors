/**
 * Migrant, winter-visitor and scarce land birds of the yard habitat: sparrows,
 * orioles and meadowlarks, a bunting, shrikes, thrushes, pipits, flycatchers,
 * a hawk, owls and three kinds of landfowl. Their orders and many of their
 * families already exist and are imported; only the missing families (Laniidae,
 * Motacillidae) and genera start here.
 *
 * Presence arrays are what separate them from the resident birds: most are
 * zero for several months, and the winter visitors are zero all summer.
 */
import { clamp, rand } from '../core/Bird';
import type { BehaviorTable, Ecology, FlightProfile, Look, Script, Taxon } from '../core/traits';
import { Phasianidae } from './galliformes';
import { Passerellidae, Passeriformes, Tyrannidae, Turdidae } from './passeriformes';
import { Buteo, Strigidae } from './raptors';
import { Icteridae, Melospiza, Zonotrichia } from './seedeaters';
import { Cardinalidae } from './summerbirds';

const TAU = Math.PI * 2;

// ============================================================ Passerellidae

// ---- Spizella

export abstract class Spizella extends Passerellidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Spizella',
    common: 'Chipping and field sparrows',
    note: 'Small, slim, long-tailed sparrows with a plain gray breast and a thin dark line through the eye. They sing from the highest twig they can find.',
  };

  static override ecology: Partial<Ecology> = { perches: ['treetop', 'branch', 'shrub'] };
  static override look: Partial<Look> = { build: 0.5, tailLength: 0.7 };

  static override behaviors: BehaviorTable<Spizella> = {
    topTrill: {
      label: 'Trill from the top',
      cue: 'Climbs to the highest bare twig, tilts the head back and gives one long, dry, unbroken trill on a single pitch. It sounds like a sewing machine. A Dark-eyed Junco’s trill is slower and more musical, and a Song Sparrow opens with separate notes.',
    },
  };

  *topTrill(): Script {
    yield* this.toPerch(['treetop', 'branch'], 'far');
    yield* this.poseTo({ pitch: this.restingPose().pitch + 0.25, neck: 1.2, head: 0.5 }, 0.2);
    this.say(`♪ ${this.ecology.song}`, 3);
    yield* this.poseTo({ beakOpen: 0.7 }, 0.1);
    // One unbroken trill: the bill stays open and the tail shivers instead of pulsing note by note.
    for (let t = 0; t < 2.6; ) {
      t += yield;
      this.pose.tailAngle = this.look.tailCock + 0.06 * Math.sin(t * 60);
    }
    yield* this.poseTo({ beakOpen: 0 }, 0.1);
    yield* this.lookAround(1);
    yield* this.relax();
  }
}

export class ChippingSparrow extends Spizella {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Spizella passerina',
    common: 'Chipping Sparrow',
    note: 'Bright rusty cap, white eyebrow, black eyeline and a clean gray breast. A summer visitor to the Miller Peninsula clearings and Gardiner yards, arriving in late April and gone by September.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'tsip (a thin, dry chip)',
    song: 'a dry, mechanical trill, chi-chi-chi-chi-chi-chi',
    presence: [0, 0, 0, 1, 2, 2, 2, 2, 1, 0, 0, 0],
  };

  static override look: Partial<Look> = {
    length: 0.14,
    body: '#8a6a4a',
    belly: '#cfcdc8',
    breast: '#c3c1bc',
    head: '#b9b8b3',
    cap: '#b5532a',
    eyeLine: '#161616',
    throat: '#cfcdc8',
    wing: '#7a5a3e',
    wingBar: '#e4dfd4',
    tail: '#6a5a4a',
    beak: '#2a2a2a',
    legs: '#c9a98a',
  };
}

// ---- Zonotrichia (genus in seedeaters.ts)

export class WhiteThroatedSparrow extends Zonotrichia {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Zonotrichia albicollis',
    common: 'White-throated Sparrow',
    note: 'Black and white crown stripes, a yellow spot before the eye and a crisp white throat patch on a gray breast. A scarce winter bird at Gardiner feeders and brush piles, usually singly in a flock of juncos and White-crowned Sparrows.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'seep (a thin, sharp note) and a hard chink',
    song: 'old Sam Peabody Peabody Peabody (clear, quavering whistles)',
    presence: [1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1],
  };

  // Stands tall and still between pecks.
  protected override alertPitch = 0.6;

  static override look: Partial<Look> = {
    length: 0.17,
    tailLength: 0.65,
    body: '#8a6a4a',
    belly: '#ddd9d0',
    breast: '#8f8f8c',
    head: '#8a8478',
    cap: '#2a2622',
    eyeLine: '#e8c93a',
    throat: '#f7f7f4',
    wing: '#7a5a3e',
    wingBar: '#e0dbd0',
    tail: '#6a5a4a',
    beak: '#5a5650',
    legs: '#c9a98a',
  };

  static override behaviors: BehaviorTable<WhiteThroatedSparrow> = {
    whistle: {
      label: 'Whistle the Peabody song',
      cue: 'Stretches tall on a low perch with the white throat thrown forward and sings two long, clear notes followed by three triplets. The song is the usual way to find one in a winter flock of other crowned sparrows.',
    },
  };

  *whistle(): Script {
    yield* this.toPerch(['shrub', 'post']);
    yield* this.poseTo({ pitch: this.restingPose().pitch + 0.3, neck: 1.25, head: 0.5 }, 0.2);
    this.say(`♪ ${this.ecology.song}`, 4);
    for (let i = 0; i < 2; i++) {
      yield* this.poseTo({ beakOpen: 0.8 }, 0.08);
      yield* this.wait(0.55);
      yield* this.poseTo({ beakOpen: 0 }, 0.08);
      yield* this.wait(0.2);
    }
    for (let i = 0; i < 9; i++) {
      yield* this.poseTo({ beakOpen: 0.8 }, 0.05);
      yield* this.poseTo({ beakOpen: 0 }, 0.07);
      if (i % 3 === 2) yield* this.wait(0.3);
    }
    yield* this.relax();
  }
}

// ---- Melospiza (genus in seedeaters.ts)

export class LincolnsSparrow extends Melospiza {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Melospiza lincolnii',
    common: 'Lincoln’s Sparrow',
    note: 'Smaller and more finely streaked than a Song Sparrow, with a buff breast band and a gray face. A migrant in April–May and September–October in thickets at Gardiner and along the Discovery Bay shore, with a few in winter.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'tsup (a soft, flat chip)',
    song: 'a fast, bubbling jumble that rises and then falls',
    presence: [1, 1, 1, 2, 2, 0, 0, 1, 2, 2, 1, 1],
  };

  static override look: Partial<Look> = {
    length: 0.14,
    tailLength: 0.6,
    body: '#7a6246',
    belly: '#efe9df',
    breast: '#d9c9a4',
    head: '#8f8a80',
    cap: '#6a4a30',
    eyeRing: '#e8e2d4',
    throat: '#efe9df',
    band: '#d3b57a',
    spots: '#4a3a2a',
    wing: '#74583c',
    tail: '#6a523a',
    beak: '#6b5b4c',
    legs: '#c8a58a',
  };

  static override behaviors: BehaviorTable<LincolnsSparrow> = {
    forage: {
      label: 'Skulk through cover',
      cue: 'Creeps with the body low and the head drawn in, stopping often, and stays under the brush. It pops up for a moment on a low stem, raises the crown and drops back out of sight. Song Sparrows sit up on top of the bush.',
    },
  };

  override forage(): Script {
    return this.skulk();
  }

  *skulk(): Script {
    const [from, to] = this.world.habitat.litter ?? [this.pos.x - 4, this.pos.x + 4];
    yield* this.travelTo({ x: this.world.clampLand(rand(from, to)), y: 0 });
    for (let i = 0; i < 4; i++) {
      yield* this.moveOnGround(this.world.clampLand(this.pos.x + this.pose.facing * rand(1.5, 3)), 0.6);
      yield* this.poseTo({ crouch: 0.55, neck: 0.5, pitch: -0.05 }, 0.12);
      yield* this.wait(rand(0.3, 0.7));
      yield* this.peck(1, 0.8);
    }
    yield* this.toPerch(['shrub']);
    yield* this.poseTo({ pitch: this.restingPose().pitch + 0.3, neck: 1.2 }, 0.1);
    this.say(this.ecology.call, 1.4);
    yield* this.wait(0.8);
    yield* this.relax();
  }
}

// ================================================================ Icteridae

// ---- Sturnella

export abstract class Sturnella extends Icteridae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Sturnella',
    common: 'Meadowlarks',
    note: 'Streaked, short-tailed grassland birds with a long, pointed bill, a yellow breast crossed by a black V, and white outer tail feathers. They are blackbirds, not larks.',
  };

  // Stiff, shallow flutters between glides on set wings.
  static override flight: Partial<FlightProfile> = { cruiseSpeed: 10, flapRate: 8, flapDuty: 0.55, cyclePeriod: 0.9, restPose: 'spread', glide: 0.55 };
  static override ecology: Partial<Ecology> = { perches: ['post', 'shrub'], posture: 0.45 };
  static override look: Partial<Look> = { build: 0.75, beakShape: 'dagger', beakLength: 0.9, tailLength: 0.4, tailShape: 'fan', band: '#161616' };

  static override behaviors: BehaviorTable<Sturnella> = {
    postSong: {
      label: 'Sing from a fence post',
      cue: 'Chest thrust out and head back so the yellow and the black V show from far off. After each phrase it flicks the tail open and the white outer feathers flash. A pipit or a sparrow never sits this tall on a post.',
    },
  };

  /** The white outer tail feathers show in flight. */
  protected override adjustFlightPose() {
    this.pose.tailFan = 0.7;
  }

  *postSong(): Script {
    yield* this.toPerch(['post', 'shrub']);
    yield* this.poseTo({ pitch: this.restingPose().pitch + 0.3, neck: 1.3, head: 0.6 }, 0.25);
    this.say(`♪ ${this.ecology.song}`, 3.4);
    for (let i = 0; i < 2; i++) {
      yield* this.poseTo({ beakOpen: 1 }, 0.1);
      yield* this.wait(0.7);
      yield* this.poseTo({ beakOpen: 0.1, tailFan: 1, tailAngle: this.look.tailCock + 0.35 }, 0.08);
      yield* this.poseTo({ tailFan: 0, tailAngle: this.look.tailCock }, 0.12);
      yield* this.wait(0.4);
    }
    yield* this.relax();
  }
}

export class WesternMeadowlark extends Sturnella {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Sturnella neglecta',
    common: 'Western Meadowlark',
    note: 'Brown and streaked above, bright yellow below with a black V. Mostly a bird of winter fields and fence lines around Sequim and the Miller Peninsula clearings, with a few singing males in spring.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'chupp (a low, harsh chuck) and a dry rattle',
    song: 'a bubbling, flute-like series of gurgling whistles',
    presence: [2, 2, 2, 1, 1, 1, 1, 1, 1, 2, 2, 2],
  };

  static override look: Partial<Look> = {
    length: 0.24,
    body: '#8a7456',
    belly: '#f1c92a',
    breast: '#f1c92a',
    throat: '#f4d233',
    head: '#a0916f',
    cap: '#6e5a3e',
    eyeLine: '#e0d8b8',
    wing: '#7a6648',
    tail: '#7a6a55',
    beak: '#9a948c',
    legs: '#d6b9a4',
  };
}

// ---- Icterus

export abstract class Icterus extends Icteridae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Icterus',
    common: 'Orioles',
    note: 'Slim-billed, orange and black icterids of leafy trees. Unlike the ground-walking blackbirds, they spend their time in the canopy, and they weave a hanging pouch nest.',
  };

  static override ecology: Partial<Ecology> = { perches: ['twig', 'branch', 'treetop'], gait: 'hop', groundSpeed: 5, posture: 0.35 };
  static override look: Partial<Look> = { beakShape: 'dagger', beakLength: 0.75, tailLength: 0.6 };

  static override behaviors: BehaviorTable<Icterus> = {
    forage: {
      label: 'Glean in the canopy',
      cue: 'Works along twigs and flower clusters high in a leafy tree, pecking at insects and nectar, then pauses to look around. The blackbirds it is related to walk on the ground.',
    },
    weaveNest: {
      label: 'Weave the hanging nest',
      cue: 'Picks up a grass strand, flies to the drooping tip of a twig, hangs beneath it and threads the fiber through with the bill. The finished nest is a pouch that swings from the end of a branch.',
    },
  };

  override forage(): Script {
    return this.glean();
  }

  /** Picks insects and nectar from twigs and flower clusters in the canopy rather than from the ground. */
  protected *glean(): Script {
    yield* this.toPerch(['twig', 'branch'], 'any');
    for (let i = 0; i < 3; i++) {
      yield* this.peck(Math.ceil(rand(1, 2)), 0.8);
      yield* this.lookAround(rand(0.4, 0.9));
    }
    yield* this.relax();
  }

  *weaveNest(): Script {
    const twig = this.findPerch(['twig'], 'far');
    if (!twig) return;
    yield* this.toGround(8);
    yield* this.peck(2);
    this.pose.carry = 'seed';
    yield* this.flyTo(twig);
    yield* this.poseTo({ rotation: Math.PI * this.pose.facing }, 0.2);
    for (let i = 0; i < 4; i++) {
      yield* this.poseTo({ head: -0.9, neck: 0.2 }, 0.1);
      yield* this.poseTo({ head: -0.3, neck: 0.8 }, 0.12);
      yield* this.wait(0.15);
    }
    this.pose.carry = null;
    yield* this.poseTo({ rotation: 0 }, 0.2);
    yield* this.relax();
  }
}

export class BullocksOriole extends Icterus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Icterus bullockii',
    common: 'Bullock’s Oriole',
    note: 'The male is bright orange with a black crown, eyeline and bib and a large white wing patch. Scarce in the Gardiner and Sequim area from May to July, usually in tall deciduous trees near water.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'kip (a dry note) and a harsh chatter',
    song: 'a short, rough series of whistles and chatters',
    presence: [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0],
  };

  static override look: Partial<Look> = {
    length: 0.19,
    body: '#2a2a2a',
    belly: '#f6b84a',
    breast: '#f08a1c',
    head: '#f08a1c',
    cap: '#161616',
    eyeLine: '#161616',
    throat: '#161616',
    wing: '#2a2a2a',
    wingBar: '#f4f4ee',
    tail: '#d88a1e',
    beak: '#4a4a4a',
    legs: '#7a8aa0',
  };
}

// ============================================================== Cardinalidae

// Also declared in summerbirds.ts for the tanager and grosbeak. Keep only one when the files are merged.
export abstract class Passerina extends Cardinalidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Passerina',
    common: 'Buntings',
    note: 'Small, finch-sized cardinals with a short conical bill. The males are blue and sing from the top of a shrub in open, brushy country.',
  };

  static override ecology: Partial<Ecology> = { perches: ['shrub', 'treetop', 'branch'] };
  static override look: Partial<Look> = { build: 0.55, beakShape: 'cone', beakLength: 0.45, tailLength: 0.55 };

  static override behaviors: BehaviorTable<Passerina> = {
    pairedSong: {
      label: 'Sing in pairs',
      cue: 'Sings from the top of a bush with the head thrown back, and repeats nearly every phrase twice before moving on to a new one. The doubled phrases, plus the blue head, separate it from a finch.',
    },
  };

  *pairedSong(): Script {
    yield* this.toPerch(['shrub', 'treetop'], 'far');
    yield* this.poseTo({ pitch: this.restingPose().pitch + 0.25, neck: 1.2, head: 0.45 }, 0.2);
    this.say(`♪ ${this.ecology.song}`, 3.5);
    for (let phrase = 0; phrase < 4; phrase++) {
      for (let rep = 0; rep < 2; rep++) {
        yield* this.poseTo({ beakOpen: 1 }, 0.07);
        yield* this.poseTo({ beakOpen: 0.1 }, 0.09);
      }
      yield* this.wait(0.25);
    }
    yield* this.poseTo({ beakOpen: 0 }, 0.1);
    yield* this.relax();
  }
}

export class LazuliBunting extends Passerina {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Passerina amoena',
    common: 'Lazuli Bunting',
    note: 'The male is sky blue above with a rusty breast band, white belly and two white wing bars. Scarce from May to August in the brushy clearings of the Miller Peninsula and the edges of Gardiner yards.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'tsit (a dry, sharp note)',
    song: 'sweet-sweet, chew-chew, sweer-sweer, zee-zee (paired notes, falling)',
    presence: [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
  };

  static override look: Partial<Look> = {
    length: 0.14,
    body: '#4d8fd0',
    belly: '#f4f1ea',
    breast: '#d9884a',
    head: '#3a82d0',
    wing: '#4a6fa0',
    wingBar: '#f4f4ee',
    tail: '#4a7bb8',
    beak: '#4a4a4a',
    legs: '#444444',
  };
}

// ================================================================== Laniidae

export abstract class Laniidae extends Passeriformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Laniidae',
    common: 'Shrikes',
    note: 'Songbirds that hunt like small hawks: a hooked, toothed bill and a hunter’s patience. The feet are too weak to hold prey, so the catch is jammed onto a thorn or barbed wire and torn up there.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 10, flapRate: 10, flapDuty: 0.65, cyclePeriod: 0.6 };
  static override ecology: Partial<Ecology> = { perches: ['shrub', 'treetop', 'post'], posture: 0.5 };
  static override look: Partial<Look> = { build: 0.65, headSize: 1.1, beakShape: 'hook', beakLength: 0.5, tailLength: 0.7 };

  static override behaviors: BehaviorTable<Laniidae> = {
    forage: {
      label: 'Hunt from a high perch',
      cue: 'Sits bolt upright on the very top of a shrub, post or snag and scans the ground. Then a low swoop, a catch, and a climb back to a perch. A kestrel hovers to hunt; a shrike waits.',
    },
    impale: {
      label: 'Impale prey on a thorn',
      cue: 'Carries its catch to a thorn or twig fork and jams it on, then tears off pieces. Impaled prey left on a thorn or a wire fence is the sign of a shrike.',
    },
  };

  override forage(): Script {
    return this.perchHunt();
  }

  *perchHunt(): Script {
    yield* this.toPerch(['shrub', 'treetop', 'post'], 'any');
    const perch = { ...this.pos };
    yield* this.lookAround(2);
    yield* this.poseTo({ head: -0.5, neck: 0.8 }, 0.2);
    yield* this.wait(0.6);
    const spot = this.groundSpot(perch.x + (perch.x < 50 ? 1 : -1) * 9, 2);
    yield* this.flyTo(spot, { speed: 1.2 });
    yield* this.peck(2, 1.2);
    this.pose.carry = 'insect';
    yield* this.flyTo(perch);
    this.pose.carry = null;
    yield* this.relax();
  }

  *impale(): Script {
    yield* this.toGround(8);
    yield* this.peck(2, 1.2);
    this.pose.carry = 'insect';
    const thorn = this.findPerch(['shrub'], 'near') ?? this.findPerch(['post'], 'near');
    if (!thorn) {
      this.pose.carry = null;
      return;
    }
    yield* this.flyTo(thorn);
    const rest = this.restingPose();
    for (let i = 0; i < 3; i++) {
      yield* this.poseTo({ pitch: rest.pitch - 0.3, head: -0.9, neck: 0.3 }, 0.08);
      yield* this.poseTo({ pitch: rest.pitch, head: -0.2, neck: 0.9 }, 0.1);
    }
    this.pose.carry = null;
    // The prey stays on the thorn for a few seconds.
    this.world.emit('insect', thorn.x + this.pose.facing * this.size * 0.4, thorn.y - 0.3, { life: 8 });
    yield* this.wait(0.4);
    yield* this.peck(3, 1);
    yield* this.relax();
  }
}

export abstract class Lanius extends Laniidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Lanius',
    common: 'Typical shrikes',
    note: 'Gray, black and white shrikes with a black mask and a heavy hooked bill. Northern Shrike and Loggerhead Shrike are the two North American species.',
  };

  static override look: Partial<Look> = { eyeLine: '#18181a' };
}

export class NorthernShrike extends Lanius {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Lanius borealis',
    common: 'Northern Shrike',
    note: 'Pale gray above, finely barred below, with a black mask that does not reach over the bill and a white wing patch. A scarce winter visitor to open fields and brush at Gardiner and the Miller Peninsula, from October to March.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'shek-shek (a harsh, grating scold)',
    song: 'a jumbled warble of squeaks and whistles, often mimicking other birds',
    presence: [1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1],
  };

  static override look: Partial<Look> = {
    length: 0.25,
    body: '#8e9298',
    belly: '#e8e6e0',
    spots: '#a09e98',
    head: '#8e9298',
    wing: '#2a2a2e',
    wingBar: '#f2f2f0',
    tail: '#2a2a2e',
    beak: '#2a2a2a',
    legs: '#222222',
  };
}

// ================================================================= Turdidae

// ---- Myadestes

export abstract class Myadestes extends Turdidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Myadestes',
    common: 'Solitaires',
    note: 'Slim, long-tailed thrushes of mountain forest. In winter each one moves to a lowland berry tree and defends it alone.',
  };

  static override ecology: Partial<Ecology> = { perches: ['treetop', 'branch'], gait: 'hop', groundSpeed: 5, posture: 0.55 };
  static override look: Partial<Look> = { build: 0.45, beakLength: 0.4, tailLength: 0.8, eyeRing: '#f1eee6' };

  static override behaviors: BehaviorTable<Myadestes> = {
    forage: {
      label: 'Guard a berry tree',
      cue: 'Perches upright on the top of one tree and chases off any bird that comes near, then returns to the same spot. Robins and waxwings feed in flocks; a solitaire is always alone.',
    },
  };

  override forage(): Script {
    return this.guardBerries();
  }

  *guardBerries(): Script {
    yield* this.toPerch(['treetop'], 'any');
    const post = { ...this.pos };
    yield* this.lookAround(2);
    const dir = post.x < 50 ? 1 : -1;
    this.say(this.ecology.call, 1.2);
    yield* this.flyTo({ x: clamp(post.x + dir * 14, 6, 94), y: Math.max(8, post.y - 4) }, { land: false, speed: 1.4 });
    yield* this.flyTo(post);
    yield* this.poseTo({ tailAngle: this.look.tailCock + 0.3 }, 0.08);
    yield* this.relax(0.2);
  }
}

export class TownsendsSolitaire extends Myadestes {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Myadestes townsendi',
    common: 'Townsend’s Solitaire',
    note: 'Plain gray with a bold white eye-ring, buff wing patches and white outer tail feathers. A scarce fall and winter bird of juniper and berry trees along the Miller Peninsula, found on a high bare perch.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'heek (a clear, flute-like single note)',
    song: 'a long, rambling warble, sung in winter to defend a berry tree',
    presence: [1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1],
  };

  static override look: Partial<Look> = {
    length: 0.22,
    body: '#8b8e94',
    belly: '#a6a9ae',
    head: '#8b8e94',
    wing: '#6a6c72',
    wingBar: '#d9ab68',
    tail: '#4a4b50',
    beak: '#2a2a2a',
    legs: '#2a2a2a',
  };
}

// ---- Sialia

export abstract class Sialia extends Turdidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Sialia',
    common: 'Bluebirds',
    note: 'Small thrushes of open country, blue above in the male. They hunt from a low perch by dropping on insects in short grass.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 10, hover: 0.35, flapRate: 11, flapDuty: 0.8 };
  static override ecology: Partial<Ecology> = { perches: ['post', 'shrub', 'branch'], gait: 'hop', groundSpeed: 5, posture: 0.45 };
  static override look: Partial<Look> = { build: 0.6, legLength: 0.15, beakLength: 0.45, tailLength: 0.55 };

  static override behaviors: BehaviorTable<Sialia> = {
    forage: {
      label: 'Hover and drop',
      cue: 'Watches the grass from a low post, then flies out and hovers for a second, head down, before dropping on an insect and returning to the same perch. A kingfisher hovers over water; a bluebird hovers over a lawn.',
    },
  };

  override forage(): Script {
    return this.dropHunt();
  }

  *dropHunt(): Script {
    yield* this.toPerch(['post', 'shrub'], 'any');
    const perch = { ...this.pos };
    yield* this.lookAround(1.6);
    const dir = perch.x < 50 ? 1 : -1;
    const spot = this.groundSpot(perch.x + dir * rand(4, 8), 1);
    this.pose.facing = dir;
    yield* this.poseTo({ head: -0.6, neck: 0.8 }, 0.15);
    yield* this.flyTo({ x: spot.x, y: 3 }, { land: false });
    yield* this.hoverFor(1.2, { aim: -1 });
    yield* this.flyTo(spot, { speed: 0.7 });
    yield* this.peck(1, 1.2);
    this.pose.carry = 'insect';
    yield* this.flyTo(perch);
    this.pose.carry = null;
    yield* this.relax();
  }
}

export class WesternBluebird extends Sialia {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Sialia mexicana',
    common: 'Western Bluebird',
    note: 'The male is deep blue above and on the throat with a rusty breast and a gray belly. Scarce in open clearings and pasture edges on the Miller Peninsula and at Gardiner, mostly April to October.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'kew (a soft, falling note)',
    song: 'a few quiet, rolling phrases, chur-lee chur-lee',
    presence: [1, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 1],
  };

  static override look: Partial<Look> = {
    length: 0.17,
    body: '#3a68c0',
    belly: '#e4e0d8',
    breast: '#b85a30',
    throat: '#3a68c0',
    head: '#3a68c0',
    wing: '#3a68c0',
    tail: '#3560b0',
    beak: '#222222',
    legs: '#222222',
  };
}

// ============================================================== Motacillidae

export abstract class Motacillidae extends Passeriformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Motacillidae',
    common: 'Pipits and wagtails',
    note: 'Slim, long-tailed ground birds that walk instead of hopping and keep the tail moving. They flush with a thin call and fly in a deep, bounding undulation.',
  };

  static override ecology: Partial<Ecology> = { perches: ['post', 'shrub'], gait: 'walk', groundSpeed: 5, posture: 0.2 };
  static override look: Partial<Look> = { build: 0.45, headSize: 0.9, legLength: 0.2, tailLength: 0.7, beakShape: 'thin', beakLength: 0.6 };

  static override behaviors: BehaviorTable<Motacillidae> = {
    forage: {
      label: 'Walk, bobbing the tail',
      cue: 'Walks in short, quick steps and every few steps pumps the tail up and down. A sparrow hops and does not bob. A spotted sandpiper bobs the rear half of the body, a pipit only the tail.',
    },
  };

  override forage(): Script {
    return this.tailBob();
  }

  *tailBob(): Script {
    yield* this.toGround(10);
    for (let i = 0; i < 4; i++) {
      yield* this.moveOnGround(this.world.clampLand(this.pos.x + this.pose.facing * rand(2, 5)));
      for (let j = 0; j < 3; j++) {
        yield* this.poseTo({ tailAngle: this.look.tailCock + 0.5 }, 0.1);
        yield* this.poseTo({ tailAngle: this.look.tailCock - 0.1 }, 0.1);
      }
      yield* this.peck(1);
    }
    yield* this.relax();
  }
}

export abstract class Anthus extends Motacillidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Anthus',
    common: 'Pipits',
    note: 'Streaked, buff-brown birds of open ground, tundra and shorelines. In winter they gather in small flocks on bare fields.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 10, flapRate: 11, flapDuty: 0.55, cyclePeriod: 0.8 };

  static override behaviors: BehaviorTable<Anthus> = {
    flushCalling: {
      label: 'Flush, calling',
      cue: 'Flies up from underfoot with a thin pi-pit and goes off in a deep, bouncing line. The bird often circles high and drops back down some way off.',
    },
  };

  *flushCalling(): Script {
    yield* this.toGround(8);
    yield* this.lookAround(1);
    this.say(this.ecology.call, 1.4);
    const dir = this.pos.x > 50 ? -1 : 1;
    yield* this.flyTo(this.groundSpot(this.pos.x + dir * 25, 4), { speed: 1.2 });
    yield* this.relax();
  }
}

export class AmericanPipit extends Anthus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Anthus rubescens',
    common: 'American Pipit',
    note: 'Slim, grayish-brown with a streaked buff breast, thin bill, dark legs and white outer tail feathers. A migrant on fields and the Discovery Bay shore in April and from September to November, and local in winter.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'pip-it (a thin, two-note call, often given in flight)',
    song: 'a rapid, repeated chwee-chwee-chwee on its breeding grounds',
    presence: [1, 1, 1, 2, 1, 0, 0, 0, 2, 2, 2, 1],
  };

  static override look: Partial<Look> = {
    length: 0.16,
    body: '#8a7e6e',
    belly: '#e2cfae',
    breast: '#d9c4a0',
    spots: '#5a4a3a',
    head: '#8a7e6e',
    eyeRing: '#e8e0d0',
    wing: '#6a5e50',
    wingBar: '#d8cdb8',
    tail: '#5a5048',
    beak: '#3a3a3a',
    legs: '#2a2a2a',
  };
}

// ============================================================== Tyrannidae

// ---- Tyrannus

export abstract class Tyrannus extends Tyrannidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Tyrannus',
    common: 'Kingbirds',
    note: 'Large-headed, yellow-bellied flycatchers of open country. They perch on wires and fence posts in plain view and attack hawks and crows that pass over.',
  };

  static override ecology: Partial<Ecology> = { perches: ['post', 'treetop'], posture: 0.55 };
  static override look: Partial<Look> = { build: 0.6, tailLength: 0.6, beakShape: 'stout', beakLength: 0.55 };

  static override behaviors: BehaviorTable<Tyrannus> = {
    chaseIntruder: {
      label: 'Chase an intruder',
      cue: 'Leaves its perch in a steep climb, calling, to chase a bigger bird right out of the territory, then drops back onto the same post. A phoebe or pewee sallies for insects only.',
    },
  };

  *chaseIntruder(): Script {
    yield* this.toPerch(['post', 'treetop']);
    const home = { ...this.pos };
    yield* this.lookAround(1.2);
    const dir = home.x < 50 ? 1 : -1;
    this.say(this.ecology.call, 1.6);
    yield* this.flyTo({ x: clamp(home.x + dir * 18, 6, 94), y: 30 }, { land: false, speed: 1.5 });
    yield* this.flyTo({ x: clamp(home.x + dir * 28, 6, 94), y: 28 }, { land: false, speed: 1.5 });
    yield* this.flyTo(home);
    yield* this.relax(0.3);
  }
}

export class WesternKingbird extends Tyrannus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Tyrannus verticalis',
    common: 'Western Kingbird',
    note: 'Pale gray head and breast, a lemon-yellow belly and a dark tail edged with white. A scarce spring arrival to Sequim and Gardiner pastures, usually seen on a wire or post from May to July.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'whit (a sharp, high note) and a twittering kit-kit-kit',
    song: 'a rapid, excited twitter that ends on a stressed note',
    presence: [0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0],
  };

  // Longer and bolder sallies than a phoebe, and it mostly returns to its post.
  protected override sallyRange = 16;
  protected override returnChance = 0.75;

  static override look: Partial<Look> = {
    length: 0.22,
    body: '#8a9096',
    belly: '#f0d440',
    breast: '#b9bec2',
    throat: '#e6e8ea',
    head: '#a7adb2',
    wing: '#4a4a4e',
    tail: '#3a3a3e',
    beak: '#222222',
    legs: '#222222',
  };
}

// ---- Sayornis

export abstract class Sayornis extends Tyrannidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Sayornis',
    common: 'Phoebes',
    note: 'Plain, long-tailed flycatchers that hunt from low perches and are among the first to return in spring. They are the flycatchers that keep the tail moving.',
  };

  static override ecology: Partial<Ecology> = { perches: ['post', 'shrub'], posture: 0.45 };
  static override look: Partial<Look> = { tailLength: 0.7 };

  protected override sallyRange = 9;
  protected override returnChance = 0.9;

  static override behaviors: BehaviorTable<Sayornis> = {
    tailDip: {
      label: 'Dip the tail',
      cue: 'Sits on a post or low branch and every few seconds sweeps the tail down and back up. A pewee or Empidonax flycatcher holds its tail still, so a flycatcher that wags is a phoebe.',
    },
  };

  *tailDip(): Script {
    yield* this.toPerch(['post', 'shrub']);
    for (let i = 0; i < 5; i++) {
      yield* this.poseTo({ tailAngle: this.look.tailCock - 0.5 }, 0.15);
      yield* this.poseTo({ tailAngle: this.look.tailCock + 0.1 }, 0.2);
      yield* this.lookAround(rand(0.4, 0.9));
    }
    yield* this.relax();
  }
}

export class SaysPhoebe extends Sayornis {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Sayornis saya',
    common: 'Say’s Phoebe',
    note: 'Gray-brown above with a cinnamon belly and a black tail. A scarce migrant in open fields and fence lines near Gardiner and Sequim, earliest in March and April, with a few more in September.',
  };

  static override flight: Partial<FlightProfile> = { hover: 0.4 };

  static override ecology: Partial<Ecology> = {
    call: 'pee-ur (a plaintive, downslurred whistle)',
    song: 'a harsh, rising pit-tsee-ar',
    presence: [0, 1, 2, 2, 1, 0, 0, 0, 1, 1, 0, 0],
  };

  static override look: Partial<Look> = {
    length: 0.17,
    body: '#8a7d70',
    belly: '#d79a62',
    breast: '#a89a8a',
    throat: '#a89a8a',
    head: '#7a6e63',
    wing: '#5a5048',
    tail: '#2a2624',
    beak: '#222222',
    legs: '#222222',
  };

  static override behaviors: BehaviorTable<SaysPhoebe> = {
    hoverHunt: {
      label: 'Hover over the field',
      cue: 'Leaves the post and hovers a few feet over short grass, bill pointing down, before dropping or snatching an insect and returning. The Eastern Phoebe and the pewees do not hover.',
    },
  };

  *hoverHunt(): Script {
    yield* this.toPerch(['post', 'shrub']);
    const perch = { ...this.pos };
    yield* this.lookAround(1.5);
    const x = clamp(perch.x + (perch.x < 50 ? 1 : -1) * rand(8, 14), 6, 94);
    yield* this.flyTo({ x, y: 4 }, { land: false });
    yield* this.hoverFor(1.2, { aim: -0.9 });
    yield* this.flyTo({ x, y: 0.5 }, { land: false, speed: 0.8 });
    this.say('snap!', 0.6);
    yield* this.flyTo(perch);
    yield* this.relax(0.2);
  }
}

// ================================================================ Accipitridae

export class RoughLeggedHawk extends Buteo {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Buteo lagopus',
    common: 'Rough-legged Hawk',
    note: 'Pale head, a dark belly band, a white tail with a dark tip, and dark wrist patches under the wing. A scarce winter bird over the fields around Sequim and the open Miller Peninsula clearings, October to March.',
  };

  // A buteo that hovers on the wind more than the others.
  static override flight: Partial<FlightProfile> = { hover: 0.5, flapRate: 3 };

  static override ecology: Partial<Ecology> = {
    call: 'peee-ur (a thin, catlike, descending squeal)',
    presence: [1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1],
  };

  static override look: Partial<Look> = {
    length: 0.52,
    wingSpan: 2.4,
    legLength: 0.1,
    beakLength: 0.5,
    body: '#6a5a4a',
    belly: '#efe8dc',
    band: '#2a2420',
    head: '#c9bfae',
    wing: '#5a4a3c',
    tail: '#e6e0d4',
    underwing: '#f0ece2',
    beak: '#3a3a3a',
    legs: '#d8cdb0',
    eye: '#4b3320',
  };

  static override behaviors: BehaviorTable<RoughLeggedHawk> = {
    forage: {
      label: 'Hover over a field',
      cue: 'Hangs in one spot on rapidly beating wings, tail fanned and head down, then slides sideways and hangs again. A Red-tailed Hawk mostly sits and watches, or kites on a steady wind without flapping.',
    },    // Its second way to hunt, and the one the rest of its genus uses.
    perchHunt: {
      label: 'Hunt from a perch',
      cue: 'Just as often it sits on a pole or a fence post at the edge of a field and drops on prey from there, like a Red-tailed Hawk.',
    },
  };

  override forage(): Script {
    return this.hoverHunt();
  }

  *hoverHunt(): Script {
    yield* this.flyTo({ x: this.pos.x < 50 ? 62 : 38, y: 16 }, { land: false });
    for (let i = 0; i < 2; i++) {
      yield* this.hoverFor(i ? 3 : 4, { aim: -1 });
      yield* this.flyTo({ x: clamp(this.pos.x + this.pose.facing * 10, 6, 94), y: 14 }, { land: false, glide: true });
    }
    const spot = this.groundSpot(this.pos.x + this.pose.facing * 8, 2);
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

// ===================================================================== Owls

// ---- Aegolius

export abstract class Aegolius extends Strigidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Aegolius',
    common: 'Boreal owls',
    note: 'Small, round-headed owls with a pale facial disc. They roost by day in dense conifers and sit so tight that a person can walk almost up to one.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 9, power: 0.55, agility: 0.6, flapRate: 7, flapDuty: 0.6, cyclePeriod: 1.2 };
  static override ecology: Partial<Ecology> = { perches: ['branch'], posture: 0.55 };
  static override look: Partial<Look> = { build: 0.7, headSize: 1.4, tailLength: 0.28, wingSpan: 1.7, legLength: 0.1 };

  static override behaviors: BehaviorTable<Aegolius> = {
    dozeRoost: {
      label: 'Doze on the roost',
      cue: 'Round and fluffed with the head sunk into the shoulders, eyes half shut, on a low branch against the trunk. It opens one eye now and then. A screech-owl roosting in the open stretches thin and raises its ear tufts instead.',
    },
  };

  *dozeRoost(): Script {
    yield* this.toPerch(['branch'], 'near');
    yield* this.poseTo({ crouch: 0.35, neck: 0.5, head: -0.25, pitch: 0.4 }, 0.5);
    yield* this.wait(2.5);
    yield* this.poseTo({ head: 0.1, neck: 0.9 }, 0.2);
    yield* this.lookAround(1);
    yield* this.relax(0.4);
  }
}

export class NorthernSawWhetOwl extends Aegolius {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Aegolius acadicus',
    common: 'Northern Saw-whet Owl',
    note: 'Smaller than a robin, with a big round head, white eyebrows and a streaked chest. Hard to see on the Miller Peninsula and at Gardiner, but it toots steadily at night in late winter and spring.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'too-too-too-too-too-too (a steady, whistled toot, about two a second)',
    presence: [1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1],
  };

  // A long, even series of toots with no breaks.
  protected override hootGaps = Array.from({ length: 12 }, () => 0.28);
  protected override pounceRange = 6;

  static override look: Partial<Look> = {
    length: 0.2,
    body: '#7a5a40',
    belly: '#f0e8dc',
    spots: '#8a5a3a',
    head: '#a89480',
    eyeRing: '#e8dcc8',
    wing: '#6a4a34',
    tail: '#6a4a34',
    beak: '#222222',
    legs: '#e8dcc8',
    eye: '#e8c820',
  };
}

// ---- Megascops

export abstract class Megascops extends Strigidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Megascops',
    common: 'Screech-owls',
    note: 'Small, eared owls of woodland edge and backyards. They roost in tree holes and against trunks, where the bark pattern hides them.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 9, power: 0.55, agility: 0.6, flapRate: 6, flapDuty: 0.65, cyclePeriod: 1.2 };
  static override ecology: Partial<Ecology> = { perches: ['branch'], posture: 0.6 };
  static override look: Partial<Look> = { build: 0.65, crest: 'pointed', headSize: 1.25, tailLength: 0.3, wingSpan: 1.9 };

  static override behaviors: BehaviorTable<Megascops> = {
    stubPose: {
      label: 'Freeze as a stub',
      cue: 'Pulls the body in tall and thin, raises the ear tufts and closes the eyes to slits, so it looks like a broken branch stub. A saw-whet stays round and fluffed.',
    },
  };

  *stubPose(): Script {
    yield* this.toPerch(['branch'], 'near');
    yield* this.poseTo({ neck: 1.45, neckExt: 0.8, pitch: 1, crest: 1 }, 0.4);
    yield* this.wait(3);
    yield* this.relax(0.4);
  }
}

export class WesternScreechOwl extends Megascops {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Megascops kennicottii',
    common: 'Western Screech-Owl',
    note: 'Gray, with ear tufts, a streaked chest and a dark bill. Scarce and mostly heard at night around Gardiner and the Miller Peninsula, where it calls from the forest edge.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'boo-boo-boo-boo-boo-boobooboo (a bouncing-ball series that speeds up)',
    presence: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  };

  // The hoots speed up like a ball coming to rest.
  protected override hootGaps = [0.9, 0.7, 0.5, 0.4, 0.3, 0.25, 0.2, 0.16];
  protected override pounceRange = 7;

  static override look: Partial<Look> = {
    length: 0.22,
    body: '#8a8a82',
    belly: '#d9d4c8',
    spots: '#4a4640',
    head: '#8a8a82',
    wing: '#7a7a72',
    tail: '#6a6a62',
    beak: '#3a3a3a',
    legs: '#d8d0c0',
    eye: '#e8c820',
  };
}

// ---- Asio

export abstract class Asio extends Strigidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Asio',
    common: 'Eared owls',
    note: 'Long-winged owls with short ear tufts that nest on or near the ground and hunt by quartering open ground at dusk.',
  };

  // Long, floppy wings flown low over the ground.
  static override flight: Partial<FlightProfile> = {
    cruiseSpeed: 8,
    power: 0.3,
    agility: 0.55,
    glide: 0.6,
    flapRate: 3,
    flapDuty: 0.55,
    cyclePeriod: 1.6,
    restPose: 'spread',
    ceiling: 12,
  };

  static override ecology: Partial<Ecology> = { perches: ['post'], posture: 0.5 };
  static override look: Partial<Look> = { build: 0.6, headSize: 1.2, wingSpan: 2.8 };

  static override behaviors: BehaviorTable<Asio> = {
    forage: {
      label: 'Quarter the field',
      cue: 'Flies back and forth a few feet above the grass in a loose, wobbling, moth-like flight, tilting from wing to wing, then drops. A harrier does the same by day with a white rump and a steadier tilt; a short-eared owl hunts at dusk.',
    },
  };

  override forage(): Script {
    return this.quarter();
  }

  protected override adjustFlightPose() {
    this.pose.roll = 0.3 * Math.sin(this.airTime * 2.4);
  }

  *quarter(): Script {
    let dir = this.pos.x > 50 ? -1 : 1;
    yield* this.flyTo({ x: clamp(this.pos.x + dir * 6, 8, 92), y: 2.5 }, { land: false });
    for (let leg = 0; leg < 4; leg++) {
      const x = clamp(this.pos.x + dir * rand(10, 16), 8, 92);
      if (x <= 8 || x >= 92) dir = -dir;
      yield* this.flyTo({ x, y: rand(2, 4) }, { land: false, speed: 0.7 });
    }
    yield* this.strike(this.groundSpot(this.pos.x + dir * 4, 2));
    yield* this.toPerch();
  }
}

export class ShortEaredOwl extends Asio {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Asio flammeus',
    common: 'Short-eared Owl',
    note: 'Buff and streaked, with black patches around yellow eyes and a pale, wide-winged look in the air. A scarce winter bird over open fields and the Dungeness lowlands near Sequim from October to March, flying at dusk.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'a raspy, barking kee-yow',
    presence: [1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1],
  };

  static override look: Partial<Look> = {
    length: 0.38,
    body: '#a07a4a',
    belly: '#e0cfa8',
    spots: '#5a4026',
    head: '#a68a60',
    eyeRing: '#161616',
    wing: '#8a6a40',
    tail: '#8a7048',
    underwing: '#f0e6d0',
    beak: '#222222',
    legs: '#e8dcc0',
    eye: '#f0d020',
  };
}

// ================================================================== Landfowl

// ---- Bonasa

export abstract class Bonasa extends Phasianidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Bonasa',
    common: 'Ruffed grouse',
    note: 'A woodland grouse with a small crest, a dark ruff on the neck and a fan tail with a dark band. The male announces his territory by beating his wings, not by calling.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 14, power: 0.9 };
  static override look: Partial<Look> = { build: 0.8, crest: 'pointed', tailShape: 'fan', tailLength: 0.5 };

  static override behaviors: BehaviorTable<Bonasa> = {
    drum: {
      label: 'Drum on a log',
      cue: 'Stands upright on a log, stump or post and beats the wings forward and up in accelerating strokes: a slow thump, thump, thump that speeds into a roll like a distant engine starting. The only sound is the air, not the voice.',
    },
  };

  *drum(): Script {
    const stand = this.findPerch(['log', 'post'], 'near');
    if (stand) yield* this.flutterUpTo(stand);
    else yield* this.toGround();
    yield* this.poseTo({ pitch: 0.55, neck: 1.25, tailFan: 0.6 }, 0.4);
    yield* this.wait(0.6);
    this.say('thump… thump… thump-thump-thumpthumpthrrr', 3.4);
    this.pose.wings = 'open';
    // One beat per second at first, then too fast to count.
    for (let t = 0, phase = 0, next = 0; t < 3.2; ) {
      const dt = yield;
      t += dt;
      phase += dt * Math.min(12, 1 + t * 3.5) * TAU;
      this.pose.flap = Math.sin(phase);
      if ((next -= dt) < 0) {
        next = Math.max(0.12, 1 - t * 0.35);
        this.world.burst('dust', this.pos.x, this.pos.y + 0.3, 2);
      }
    }
    this.pose.wings = 'folded';
    yield* this.relax(0.4);
  }
}

export class RuffedGrouse extends Bonasa {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Bonasa umbellus',
    common: 'Ruffed Grouse',
    note: 'Mottled brown or gray, with a dark ruff and a banded fan tail. Scarce in the alder and conifer forest of the Miller Peninsula; the drumming of males in spring is how most are found.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'a low, quiet pit-pit and a hiss',
    presence: [1, 1, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1],
  };

  static override look: Partial<Look> = {
    length: 0.43,
    body: '#8a6a44',
    belly: '#e0d4b8',
    spots: '#5a4630',
    head: '#8a6a44',
    neck: '#2a2420',
    wing: '#7a5e3c',
    tail: '#8a6a44',
    beak: '#3a3a3a',
    legs: '#7a6a58',
  };
}

// ---- Dendragapus

export abstract class Dendragapus extends Phasianidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Dendragapus',
    common: 'Blue grouse',
    note: 'Large forest grouse of western mountains. They eat conifer needles through the winter and spend much of the year high in the trees.',
  };

  // The tallest flyer among the landfowl here: it goes up into a conifer to display.
  static override flight: Partial<FlightProfile> = { cruiseSpeed: 14, endurance: 8, ceiling: 26 };
  static override look: Partial<Look> = { build: 0.85, tailLength: 0.45, tailShape: 'square' };

  static override behaviors: BehaviorTable<Dendragapus> = {
    boom: {
      label: 'Hoot from a conifer',
      cue: 'Flies up into a conifer, puffs out the neck and hoots five low, muffled notes that are felt more than heard. The bird is hard to spot against the branches, and the sound seems to come from several directions.',
    },
  };

  *boom(): Script {
    const branch = this.findPerch(['branch'], 'near');
    if (!branch) return;
    yield* this.flutterUpTo(branch);
    yield* this.poseTo({ pitch: 0.5, neck: 1.1, neckExt: 1.25, crouch: 0.2 }, 0.3);
    this.say(this.ecology.call, 4);
    for (let i = 0; i < 5; i++) {
      yield* this.poseTo({ neckExt: 1.5, beakOpen: 0.2 }, 0.25);
      yield* this.poseTo({ neckExt: 1.1, beakOpen: 0 }, 0.35);
      yield* this.wait(0.5);
    }
    yield* this.relax(0.3);
    yield* this.flyTo(this.groundSpot(this.pos.x, 6), { glide: true });
  }
}

export class SootyGrouse extends Dendragapus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Dendragapus fuliginosus',
    common: 'Sooty Grouse',
    note: 'Dark slate-gray, with an orange comb over the eye and a yellow neck sac in the male. A scarce bird of the Olympic Peninsula forest, more often heard than seen on the Miller Peninsula, in spring.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'hoo-hoo-hoo-hoo-hoo (five low, muffled hoots)',
    presence: [1, 1, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1],
  };

  static override look: Partial<Look> = {
    length: 0.48,
    body: '#4a4e58',
    belly: '#5a5e68',
    spots: '#e8e8e4',
    head: '#4a4e58',
    throat: '#3a3c44',
    eyeRing: '#e8941c',
    wing: '#5a5048',
    tail: '#2a2c30',
    beak: '#222222',
    legs: '#6a6258',
  };
}

// ---- Phasianus

export abstract class Phasianus extends Phasianidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Phasianus',
    common: 'Pheasants',
    note: 'Long-tailed Asian landfowl. The males are brightly colored and loud, and they have been released as game birds across North America.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 14, power: 0.9, endurance: 4, ceiling: 12 };
  static override ecology: Partial<Ecology> = { gait: 'run', groundSpeed: 7 };
  static override look: Partial<Look> = { build: 0.7, headSize: 0.55, neckLength: 0.2, tailLength: 1, tailShape: 'pointed', tailCock: 0.05 };

  static override behaviors: BehaviorTable<Phasianus> = {
    crow: {
      label: 'Crow and whirr',
      cue: 'The male stands tall with the neck stretched, gives a hoarse two-note crow, then beats his wings in a whirring burst. The wings are the surprise: the crow is followed by their sound.',
    },
  };

  *crow(): Script {
    yield* this.toGround();
    yield* this.poseTo({ pitch: 0.7, neck: 1.5, neckExt: 1.2 }, 0.25);
    yield* this.wait(0.4);
    this.say(this.ecology.call, 2);
    yield* this.poseTo({ beakOpen: 1, head: 0.5 }, 0.1);
    yield* this.wait(0.4);
    yield* this.poseTo({ beakOpen: 0 }, 0.08);
    this.pose.wings = 'open';
    for (let t = 0; t < 0.9; ) {
      t += yield;
      this.pose.flap = Math.sin(t * 70);
    }
    this.pose.wings = 'folded';
    yield* this.relax(0.4);
  }
}

export class RingNeckedPheasant extends Phasianus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Phasianus colchicus',
    common: 'Ring-necked Pheasant',
    note: 'The male has a dark green head, a red face wattle, a white neck ring, a coppery body and a very long tail. Introduced and local, with a few in the fields and brushy edges of the Sequim–Dungeness lowlands.',
  };

  static override ecology: Partial<Ecology> = {
    call: 'KOR-kok! (a hoarse, two-note crow)',
    presence: [1, 1, 1, 2, 2, 2, 1, 1, 1, 1, 1, 1],
  };

  static override look: Partial<Look> = {
    length: 0.75,
    body: '#b0652a',
    belly: '#8a4a24',
    breast: '#a85a28',
    head: '#1f4a3a',
    neck: '#f4f1e8',
    eyeRing: '#c0201a',
    wing: '#9a8a64',
    tail: '#a8864a',
    beak: '#d8d0a8',
    legs: '#9a8a78',
  };
}
