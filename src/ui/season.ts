import { resolveTraits, type BirdClass } from '../birds/core/reflect';
import type { Ecology } from '../birds/core/traits';

/** The month the page was opened in, 0 for January. */
export const THIS_MONTH = new Date().getMonth();
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Indexed by presence level, 0..3. */
export const PRESENCE = ['Away', 'Scarce', 'Regular', 'Hard to miss'];

/** The twelve monthly presence levels of a species. One without data counts as regular all year. */
export const presenceOf = (cls: BirdClass): readonly number[] => resolveTraits<Ecology>(cls, 'ecology').presence ?? Array(12).fill(2);
