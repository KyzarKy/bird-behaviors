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
  AmericanWigeon,
  Bufflehead,
  Brant,
  CanadaGoose,
  CommonGoldeneye,
  CommonMerganser,
  GreenWingedTeal,
  HarlequinDuck,
  HoodedMerganser,
  LongTailedDuck,
  Mallard,
  NorthernPintail,
  RedBreastedMerganser,
  SurfScoter,
  TrumpeterSwan,
  WhiteWingedScoter,
} from './waterfowl';
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
  Mallard,
  AmericanWigeon,
  NorthernPintail,
  GreenWingedTeal,
  Bufflehead,
  CommonGoldeneye,
  SurfScoter,
  WhiteWingedScoter,
  HarlequinDuck,
  LongTailedDuck,
  RedBreastedMerganser,
  CommonMerganser,
  HoodedMerganser,
  Brant,
  CanadaGoose,
  TrumpeterSwan,
];
