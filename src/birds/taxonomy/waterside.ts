/**
 * The four orders at Gardiner Beach: eagles, kingfishers, herons and gulls.
 * One file because each order contributes a single species.
 */
import { Bird, rand } from '../core/Bird';
import type { BehaviorTable, Ecology, FlightProfile, Look, Script, Taxon, Vec } from '../core/traits';

// ========================================================= Accipitriformes

export abstract class Accipitriformes extends Bird {
  static override taxon: Taxon = {
    rank: 'order',
    name: 'Accipitriformes',
    common: 'Hawks, eagles and kites',
    note: 'Daytime raptors: hooked bill, gripping talons, forward-facing eyes.',
  };

  static override look: Partial<Look> = { beakShape: 'hook', eye: '#e8d44a' };
}

export abstract class Accipitridae extends Accipitriformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Accipitridae',
    common: 'Hawks and eagles',
    note: 'Broad wings with slotted “fingers” at the tips let these birds ride rising air for hours without a wingbeat.',
  };

  static override flight: Partial<FlightProfile> = {
    cruiseSpeed: 12,
    power: 0.4,
    agility: 0.3,
    braking: 0.25,
    glide: 0.9,
    flapRate: 3,
    flapDuty: 0.25,
    cyclePeriod: 5,
  };

  static override ecology: Partial<Ecology> = { perches: ['treetop', 'post'], gait: 'walk', groundSpeed: 2, posture: 0.55 };

  static override behaviors: BehaviorTable<Accipitridae> = {
    soar: {
      label: 'Soar',
      cue: 'Wide circles without flapping. Note how the wings are held: a Bald Eagle’s are flat as a plank, a Turkey Vulture’s are raised in a V and it teeters.',
    },
  };

  *soar(): Script {
    yield* this.soarCircles(13, { x: 46, y: 32 }, 18);
  }
}

export abstract class Haliaeetus extends Accipitridae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Haliaeetus',
    common: 'Sea eagles',
    note: 'Fish eagles of coasts and big water. They take fish from the surface with their feet and steal from Ospreys when they can.',
  };

  // Bigger and heavier than a hawk: slower wingbeats, wider turns, longer glides.
  static override flight: Partial<FlightProfile> = { cruiseSpeed: 14, power: 0.35, agility: 0.2, glide: 0.95, flapRate: 2.5, flapDuty: 0.15, cyclePeriod: 6 };

  static override behaviors: BehaviorTable<Haliaeetus> = {
    snatchFish: {
      label: 'Snatch a fish',
      cue: 'A long, shallow glide low over the water, feet swung forward at the last second, and the fish is lifted off the surface. The eagle barely gets wet. An Osprey plunges in feet-first with a splash.',
    },
  };

  override forage(): Script {
    return this.snatchFish();
  }

  *snatchFish(): Script {
    const water = this.world.habitat.water;
    if (!water) return;
    yield* this.toPerch();
    const perch = { ...this.pos };
    yield* this.lookAround(1.5);
    const strike = { x: water.from + 18, y: 0.8 };
    yield* this.flyTo({ x: strike.x - 22, y: 9 }, { land: false });
    yield* this.flyTo(strike, { land: false, glide: true });
    this.world.burst('splash', strike.x, 0, 5);
    this.pose.carry = 'fish';
    this.pose.carryInFeet = true;
    yield* this.flyTo({ x: strike.x + 12, y: 8 }, { land: false });
    yield* this.flyTo(perch);
    for (let i = 0; i < 3; i++) yield* this.peck(1, 1.2);
    this.pose.carry = null;
    this.pose.carryInFeet = false;
    yield* this.relax();
  }
}

export class BaldEagle extends Haliaeetus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Haliaeetus leucocephalus',
    common: 'Bald Eagle',
    note: 'Nests around Discovery Bay and sits for hours on bluff-top snags. Adults are unmistakable. The voice is the surprise: a thin, chittering whinny, not the scream films dub in.',
  };

  static override ecology: Partial<Ecology> = { habitat: 'beach', call: 'kleek-kik-ik-ik-ik (weak and squeaky)' };

  static override look: Partial<Look> = {
    length: 0.85,
    build: 0.6,
    headSize: 0.68,
    neckLength: 0.1,
    legLength: 0.16,
    tailLength: 0.35,
    wingSpan: 2.3,
    beakLength: 0.65,
    body: '#3b2a1e',
    belly: '#35251a',
    head: '#f7f5ee',
    wing: '#33241a',
    tail: '#f7f5ee',
    beak: '#e8b820',
    legs: '#e8b820',
  };
}

// =========================================================== Coraciiformes

export abstract class Coraciiformes extends Bird {
  static override taxon: Taxon = {
    rank: 'order',
    name: 'Coraciiformes',
    common: 'Kingfishers and allies',
    note: 'Big-headed, big-billed birds with small, weak feet whose front toes are partly fused. They perch and they fly; they do not walk.',
  };

  static override ecology: Partial<Ecology> = { gait: 'none' };
  static override look: Partial<Look> = { legLength: 0.05 };
}

export abstract class Alcedinidae extends Coraciiformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Alcedinidae',
    common: 'Kingfishers',
    note: 'Plunge-divers. A kingfisher can hover, but only by working hard against its own weight: body hanging steeply, tail fanned, for a few seconds at a time. It cannot back up or stop instantly the way a hummingbird does.',
  };

  static override flight: Partial<FlightProfile> = {
    cruiseSpeed: 11,
    power: 0.65,
    agility: 0.45,
    braking: 0.35,
    hover: 0.55,
    glide: 0.2,
    flapRate: 7,
    flapDuty: 0.75,
    cyclePeriod: 0.8,
  };

  static override ecology: Partial<Ecology> = { perches: ['post'], posture: 0.45 };
  static override look: Partial<Look> = { build: 0.6, headSize: 1.3, beakShape: 'dagger', beakLength: 1, tailLength: 0.3, crest: 'shaggy' };

  static override behaviors: BehaviorTable<Alcedinidae> = {
    plungeDive: {
      label: 'Plunge from a perch',
      cue: 'Sits over the water staring down, bobs its head, then drops headfirst and goes right under. Back on the perch it beats the fish against the wood before swallowing it head first.',
    },
    hoverHunt: {
      label: 'Hover and plunge',
      cue: 'With no perch handy it swings up and hovers 20 to 40 feet over the water, bill pointing straight down, body nearly vertical, then folds and drops. Compare the hummingbird’s level, effortless hover.',
    },
  };

  override forage(): Script {
    return this.plungeDive();
  }

  *plungeDive(): Script {
    yield* this.toPerch();
    const perch = { ...this.pos };
    const dir = perch.x < 80 ? 1 : -1;
    this.pose.facing = dir;
    yield* this.poseTo({ head: -0.7 }, 0.2);
    for (let i = 0; i < 3; i++) {
      yield* this.poseTo({ neck: 1.3, tailAngle: 0.5 }, 0.1);
      yield* this.poseTo({ neck: 0.8, tailAngle: 0 }, 0.12);
      yield* this.wait(0.3);
    }
    const caught = yield* this.plunge({ x: perch.x + dir * 6, y: -1.2 });
    yield* this.flyTo(perch);
    if (caught) yield* this.subdue();
    yield* this.relax();
  }

  *hoverHunt(): Script {
    const water = this.world.habitat.water;
    if (!water) return;
    const home = this.findPerch(undefined, 'near') ?? { ...this.pos };
    const x = water.from + rand(16, 24);
    yield* this.flyTo({ x: x - 5, y: 7 }, { land: false });
    yield* this.flyTo({ x, y: 12 }, { land: false, speed: 0.6 });
    yield* this.hoverFor(5, { aim: -1.1 });
    const caught = yield* this.plunge({ x: x + this.pose.facing, y: -1.2 });
    yield* this.flyTo(home);
    if (caught) yield* this.subdue();
    yield* this.relax();
  }

  /** Headfirst into the water. Comes up with a fish a little more than half the time. */
  protected *plunge(at: Vec): Script<boolean> {
    yield* this.flyTo(at, { land: false, speed: 1.6 });
    this.world.burst('splash', at.x, 0, 12);
    yield* this.wait(0.35);
    const caught = Math.random() < 0.65;
    if (caught) this.pose.carry = 'fish';
    this.vel = { x: 0, y: 8 }; // burst back out of the water
    this.world.burst('splash', at.x, 0, 6);
    return caught;
  }

  /** Beat the fish on the perch, then swallow it. */
  protected *subdue(): Script {
    for (let i = 0; i < 4; i++) {
      yield* this.poseTo({ head: 0.5, neck: 1.2 }, 0.1);
      yield* this.poseTo({ head: -0.9, neck: 0.1 }, 0.07);
    }
    yield* this.poseTo({ head: 0.6, neck: 1.1 }, 0.15);
    this.pose.carry = null;
  }
}

export abstract class Megaceryle extends Alcedinidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Megaceryle',
    common: 'Giant kingfishers',
    note: 'The big, crested, loud kingfishers. Each one patrols a stretch of shoreline it treats as its own.',
  };

  static override behaviors: BehaviorTable<Megaceryle> = {
    patrol: {
      label: 'Patrol, rattling',
      cue: 'Flies low and direct along the shore with oddly uneven wingbeats, rattling as it goes. You will hear this bird before you see it.',
    },
  };

  *patrol(): Script {
    const next = this.findPerch(undefined, 'far');
    if (!next) return;
    this.say(this.ecology.call, 3);
    yield* this.flyTo({ x: (this.pos.x + next.x) / 2, y: 4 }, { land: false });
    yield* this.flyTo(next);
    yield* this.poseTo({ tailAngle: 0.5, crest: 1 }, 0.1);
    yield* this.relax(0.3);
  }
}

export class BeltedKingfisher extends Megaceryle {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Megaceryle alcyon',
    common: 'Belted Kingfisher',
    note: 'Top-heavy, slate-blue, with a ragged crest and a white collar. On pilings and overhanging branches along Discovery Bay all year. The female, unusually, is the more colorful, with a second, rusty belly band.',
  };

  static override ecology: Partial<Ecology> = { habitat: 'beach', call: 'k-k-k-k-k-k-k-k-k (a dry, mechanical rattle)' };

  static override look: Partial<Look> = {
    length: 0.32,
    body: '#4f7396',
    belly: '#f3f1ea',
    band: '#4f7396',
    head: '#4f7396',
    throat: '#f3f1ea',
    wing: '#46688a',
    tail: '#3c5a78',
    beak: '#222222',
    legs: '#333333',
  };
}

// ========================================================== Pelecaniformes

export abstract class Pelecaniformes extends Bird {
  static override taxon: Taxon = {
    rank: 'order',
    name: 'Pelecaniformes',
    common: 'Pelicans, herons and ibises',
    note: 'Large waterbirds that catch fish with the bill.',
  };
}

export abstract class Ardeidae extends Pelecaniformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Ardeidae',
    common: 'Herons and egrets',
    note: 'A modified neck vertebra works like a hinge and lets the neck fold into an S and fire the bill forward like a spear. Herons fly with that S tucked in; cranes fly with the neck straight out.',
  };

  static override flight: Partial<FlightProfile> = { cruiseSpeed: 10, power: 0.3, agility: 0.2, braking: 0.25, glide: 0.5, flapRate: 2.3, flapDuty: 1 };
  static override ecology: Partial<Ecology> = { perches: [], gait: 'walk', groundSpeed: 2.5, posture: 0.3 };
  static override look: Partial<Look> = { build: 0.35, headSize: 0.42, neckLength: 0.8, legLength: 0.5, tailLength: 0.2, wingSpan: 1.9, beakShape: 'dagger', beakLength: 1.6, legsTrail: true };

  static override behaviors: BehaviorTable<Ardeidae> = {
    stalk: {
      label: 'Stalk and strike',
      cue: 'Wades in slow motion, one foot placed at a time, neck easing forward. Freezes completely. The strike itself is too fast to follow; then the head comes up and the fish goes down whole.',
    },
  };

  protected override spawn() {
    const water = this.world.habitat.water;
    if (!water) return super.spawn();
    this.pos = { x: water.from + 5, y: this.world.floorY(water.from + 5) };
  }

  /** At rest the neck is drawn back into its S. */
  protected override restingPose() {
    return { ...super.restingPose(), neck: 1.25, neckExt: 0.6 };
  }

  /** The family flight silhouette: head pulled back onto the shoulders. */
  protected override adjustFlightPose() {
    this.pose.neck = 1;
    this.pose.neckExt = 0.3;
  }

  override forage(): Script {
    return this.stalk();
  }

  *stalk(): Script {
    const water = this.world.habitat.water;
    if (!water) return;
    const x = water.from + rand(3, 7);
    yield* this.travelTo({ x, y: this.world.floorY(x) });
    this.pose.facing = 1;
    for (let i = 0; i < 3; i++) {
      yield* this.moveOnGround(this.pos.x + this.size * 0.14, 0.35);
      yield* this.poseTo({ neck: 0.75, neckExt: 0.8 + i * 0.1, pitch: 0.1 - i * 0.08 }, 0.7);
      yield* this.wait(rand(0.4, 0.9));
    }
    yield* this.poseTo({ neck: 0.45, head: -0.4 }, 0.6);
    yield* this.wait(1.4);
    yield* this.poseTo({ neck: -0.45, neckExt: 1.25, head: -0.9, pitch: -0.45 }, 0.06);
    this.world.burst('splash', this.pos.x + this.size * 0.75, 0, 8);
    yield* this.wait(0.12);
    this.pose.carry = 'fish';
    yield* this.poseTo({ neck: 1.2, neckExt: 1, head: 0.2, pitch: 0.3 }, 0.45);
    yield* this.wait(0.5);
    yield* this.poseTo({ head: 0.7 }, 0.12);
    this.pose.carry = null;
    yield* this.wait(0.4);
    yield* this.relax(0.6);
  }
}

export abstract class Ardea extends Ardeidae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Ardea',
    common: 'Great herons',
    note: 'The tall, patient herons that hunt by standing still, in contrast to the smaller egrets that chase and stir.',
  };
}

export class GreatBlueHeron extends Ardea {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Ardea herodias',
    common: 'Great Blue Heron',
    note: 'Four feet tall and motionless at the tideline. In the air: slow, deep wingbeats, neck folded, legs trailing well past the tail. Startled, it leaves with a croak like tearing canvas.',
  };

  static override ecology: Partial<Ecology> = { habitat: 'beach', call: 'FRAAHNK!' };

  static override look: Partial<Look> = {
    length: 1.17,
    body: '#7d8fa3',
    belly: '#6f8196',
    neck: '#a9a3a6',
    head: '#f2f2ee',
    cap: '#1f2630',
    wing: '#64768b',
    tail: '#64768b',
    beak: '#d9a52a',
    legs: '#6b6456',
    eye: '#e8d44a',
  };
}

// ========================================================= Charadriiformes

export abstract class Charadriiformes extends Bird {
  static override taxon: Taxon = {
    rank: 'order',
    name: 'Charadriiformes',
    common: 'Shorebirds, gulls and auks',
    note: 'The birds of the water’s edge, from sandpipers to puffins.',
  };
}

export abstract class Laridae extends Charadriiformes {
  static override taxon: Taxon = {
    rank: 'family',
    name: 'Laridae',
    common: 'Gulls and terns',
    note: 'Long, narrow wings make gulls nearly effortless in a sea breeze: they hang in place facing the wind (kiting) and glide for minutes. They walk well, swim well, and eat anything.',
  };

  static override flight: Partial<FlightProfile> = {
    cruiseSpeed: 11,
    agility: 0.55,
    hover: 0.25,
    glide: 0.85,
    flapRate: 3.2,
    flapDuty: 0.5,
    cyclePeriod: 3,
  };

  static override ecology: Partial<Ecology> = { habitat: 'beach', perches: ['post', 'rock', 'log'], gait: 'walk', groundSpeed: 4, posture: 0.1 };
  static override look: Partial<Look> = { build: 0.6, headSize: 0.75, legLength: 0.16, tailLength: 0.3, wingSpan: 2.1, beakShape: 'stout', beakLength: 0.7 };

  static override behaviors: BehaviorTable<Laridae> = {
    soar: {
      label: 'Soar',
      cue: 'Circles and glides on long, narrow, slightly bent wings. The wing shape separates it from an eagle at any distance.',
    },
    dropShellfish: {
      label: 'Drop a clam on the rocks',
      cue: 'The same trick the crows use, learned independently: carry the clam up, drop it on something hard, follow it down.',
    },
    footPaddle: {
      label: 'Foot-paddle',
      cue: 'Stands in the wet sand at the tideline and marches rapidly in place. The vibration brings worms and small clams to the surface; it steps back and picks them off.',
    },
  };

  *soar(): Script {
    yield* this.soarCircles(11, { x: 58, y: 28 }, 15);
  }

  dropShellfish(): Script {
    return this.dropOnRocks('clam');
  }

  *footPaddle(): Script {
    const water = this.world.habitat.water;
    yield* this.travelTo({ x: water ? water.from - 2 : this.pos.x, y: 0 });
    for (let bout = 0; bout < 3; bout++) {
      for (let t = 0; t < 1.6; ) {
        t += yield;
        this.pose.stride = Math.sin(t * 28) * 0.5;
        this.pose.crouch = 0.1 + 0.05 * Math.sin(t * 56);
        this.pose.head = -0.4;
      }
      this.pose.stride = 0;
      const x0 = this.pos.x;
      yield* this.tween(0.25, (t) => (this.pos.x = x0 - this.pose.facing * this.size * 0.2 * t));
      yield* this.peck(Math.ceil(rand(1, 3)));
      this.pos.x = x0;
    }
    yield* this.relax();
  }
}

export abstract class Larus extends Laridae {
  static override taxon: Taxon = {
    rank: 'genus',
    name: 'Larus',
    common: 'Large white-headed gulls',
    note: 'The big four-year gulls. All of them give the long call, the display everyone thinks of as “the seagull sound.”',
  };

  static override behaviors: BehaviorTable<Larus> = {
    longCall: {
      label: 'Long call',
      cue: 'Head goes down to the feet, then is thrown up and back as the bird trumpets a long series of notes. A territorial announcement, given standing.',
    },
  };

  *longCall(): Script {
    yield* this.settle();
    yield* this.poseTo({ neck: -0.3, head: -1, pitch: -0.2 }, 0.3);
    yield* this.wait(0.3);
    this.say(this.ecology.call, 3);
    yield* this.poseTo({ neck: 1.35, head: 0.9, pitch: 0.3, beakOpen: 1 }, 0.3);
    for (let i = 0; i < 7; i++) {
      yield* this.poseTo({ beakOpen: 0.4 }, 0.12);
      yield* this.poseTo({ beakOpen: 1 }, 0.12);
    }
    yield* this.relax(0.4);
  }
}

export class GlaucousWingedGull extends Larus {
  static override taxon: Taxon = {
    rank: 'species',
    name: 'Larus glaucescens',
    common: 'Glaucous-winged Gull',
    note: 'The default big gull of the Salish Sea. Pale gray back with wingtips the same gray (no black), pink legs, and a red spot on the bill.',
  };

  static override ecology: Partial<Ecology> = { call: 'keow… keow… kyow-kyow-kyow-kyow!' };

  static override look: Partial<Look> = {
    length: 0.6,
    body: '#f5f5f2',
    belly: '#fbfbf9',
    head: '#f5f5f2',
    wing: '#9ea7b0',
    tail: '#f5f5f2',
    beak: '#e8c020',
    legs: '#e59aa0',
    eye: '#222222',
  };
}
