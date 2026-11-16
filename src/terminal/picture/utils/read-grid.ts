import type { Terminal } from '@xterm/headless';
import type { ColorRef } from '../models/color-ref.ts';
import type { GridCell } from '../models/grid-cell.ts';
import type { ScreenGrid } from '../models/screen-grid.ts';

/** Reads the visible screen of the model into a grid. No model gives an empty grid of the same size. */
export function readGrid(screen: Terminal | null, cols: number, rows: number, showCursor: boolean): ScreenGrid {
  if (screen === null) return { cols, rows, cells: [], cursor: undefined };

  const buffer = screen.buffer.active;
  const reusable = buffer.getNullCell();
  const cells: GridCell[][] = [];
  for (let n = 0; n < rows; n += 1) {
    const line = buffer.getLine(buffer.baseY + n);
    const row: GridCell[] = [];
    for (let c = 0; c < cols; c += 1) {
      const cell = line?.getCell(c, reusable);
      if (cell === undefined) break;
      // #FEEDBACK 2026-11-16T18:24:55.000+01:00 | [Conventions] Screen styling and cursor extraction have no business test. SVG tests supply grids directly and the failure-picture check verifies only a PNG signature rather than this mapping as required by our-development-conventions/references/unit-tests.md.
      row.push({
        char: cell.getChars(),
        width: cell.getWidth(),
        fg: colorRef(cell.isFgDefault(), cell.isFgPalette(), cell.getFgColor()),
        bg: colorRef(cell.isBgDefault(), cell.isBgPalette(), cell.getBgColor()),
        bold: cell.isBold() !== 0,
        italic: cell.isItalic() !== 0,
        inverse: cell.isInverse() !== 0,
      });
    }
    cells.push(row);
  }

  return {
    cols,
    rows,
    cells,
    cursor: showCursor ? { column: buffer.cursorX, row: buffer.cursorY } : undefined,
  };
}

function colorRef(isDefault: boolean, isPalette: boolean, color: number): ColorRef {
  // #FEEDBACK 2026-11-16T18:24:55.000+01:00 | [Performance] Default colours allocate two identical readonly objects per cell. A default-colour 100x30 screenshot creates 6000 redundant default references although rendering only reads their value.
  if (isDefault) return { kind: 'default' };
  return isPalette ? { kind: 'palette', index: color } : { kind: 'rgb', value: color };
}
