import type { SpeciesClass } from '../core/reflect';
import { AnnasHummingbird, RufousHummingbird } from './apodiformes';
import { CaliforniaQuail, Chicken } from './galliformes';
import {
  AmericanCrow,
  AmericanRobin,
  ChestnutBackedChickadee,
  CommonRaven,
  OliveSidedFlycatcher,
  RedBreastedNuthatch,
  SpottedTowhee,
  StellersJay,
} from './passeriformes';
import { NorthernFlicker } from './piciformes';
import {
  BlackBelliedPlover,
  BlackOystercatcher,
  BlackTurnstone,
  BonapartesGull,
  CaliforniaGull,
  CaspianTern,
  CommonMurre,
  Dunlin,
  GreaterYellowlegs,
  HeermannsGull,
  Killdeer,
  LeastSandpiper,
  MarbledMurrelet,
  PigeonGuillemot,
  RhinocerosAuklet,
  Sanderling,
  ShortBilledGull,
  SpottedSandpiper,
  WesternSandpiper,
} from './shorebirds';
import { BaldEagle, BeltedKingfisher, GlaucousWingedGull, GreatBlueHeron } from './waterside';

/**
 * The only list in the app. The taxonomy tree, the species menu and the
 * hierarchy explorer are all derived from these classes by reflection.
 */
export const SPECIES: readonly SpeciesClass[] = [
  Chicken,
  CaliforniaQuail,
  AnnasHummingbird,
  RufousHummingbird,
  NorthernFlicker,
  OliveSidedFlycatcher,
  StellersJay,
  CommonRaven,
  AmericanRobin,
  ChestnutBackedChickadee,
  RedBreastedNuthatch,
  SpottedTowhee,
  AmericanCrow,
  BaldEagle,
  BeltedKingfisher,
  GreatBlueHeron,
  GlaucousWingedGull,
  Killdeer,
  BlackBelliedPlover,
  BlackOystercatcher,
  BlackTurnstone,
  Sanderling,
  Dunlin,
  WesternSandpiper,
  LeastSandpiper,
  GreaterYellowlegs,
  SpottedSandpiper,
  ShortBilledGull,
  CaliforniaGull,
  HeermannsGull,
  BonapartesGull,
  CaspianTern,
  PigeonGuillemot,
  RhinocerosAuklet,
  MarbledMurrelet,
  CommonMurre,
];
