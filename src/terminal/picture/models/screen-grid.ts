import type { GridCell } from './grid-cell.ts';

/** The screen as a grid of cells, with the cursor when it shows. */
export interface ScreenGrid {
  readonly cols: number;
  readonly rows: number;
  /** Rows of cells, top row first. Empty when no program ran. */
  readonly cells: readonly (readonly GridCell[])[];
  readonly cursor: { readonly column: number; readonly row: number } | undefined;
}
