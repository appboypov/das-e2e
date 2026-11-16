import type { ColorRef } from './color-ref.ts';

/** One cell of the screen grid. `width` is 0 for the second half of a wide character. */
export interface GridCell {
  readonly char: string;
  readonly width: number;
  readonly fg: ColorRef;
  readonly bg: ColorRef;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly inverse: boolean;
}
