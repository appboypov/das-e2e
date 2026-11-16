import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { paletteColor } from '../constants/xterm-theme.ts';
import type { GridCell } from '../models/grid-cell.ts';
import type { ScreenGrid } from '../models/screen-grid.ts';
import { renderSvg } from './render-svg.ts';

const blank: GridCell = {
  char: '',
  width: 1,
  fg: { kind: 'default' },
  bg: { kind: 'default' },
  bold: false,
  italic: false,
  inverse: false,
};

function grid(cols: number, rows: number, cells: Record<string, Partial<GridCell>>, cursor?: ScreenGrid['cursor']): ScreenGrid {
  return {
    cols,
    rows,
    cells: Array.from({ length: rows }, (_, n) =>
      Array.from({ length: cols }, (_, c) => ({ ...blank, ...cells[`${c},${n}`] })),
    ),
    cursor,
  };
}

/** Every element of one tag in the SVG, as its attributes plus its text content. */
function elements(svg: string, tag: string): Record<string, string>[] {
  const found: Record<string, string>[] = [];
  for (const match of svg.matchAll(new RegExp(`<${tag}([^>]*?)/?>(?:([^<]*)</${tag}>)?`, 'g'))) {
    const attributes: Record<string, string> = { content: match[2] ?? '' };
    for (const [, name, value] of (match[1] ?? '').matchAll(/([\w-]+)="([^"]*)"/g)) {
      if (name !== undefined && value !== undefined) attributes[name] = value;
    }
    found.push(attributes);
  }
  return found;
}

describe('renderSvg', () => {
  it('given a 3 by 2 grid with blank cells, when drawn, then it is 43 by 52 with only the background', () => {
    const svg = renderSvg(grid(3, 2, {}));
    const [root] = elements(svg, 'svg');
    assert.equal(root?.width, '43');
    assert.equal(root?.height, '52');
    assert.equal(elements(svg, 'rect').length, 1);
    assert.equal(elements(svg, 'text').length, 0);
  });

  it('given a cell with palette background 196, when drawn, then its cell rect is red', () => {
    const rects = elements(renderSvg(grid(3, 2, { '1,1': { bg: { kind: 'palette', index: 196 } } })), 'rect');
    assert.deepEqual(
      rects.slice(1).map(({ x, y, fill }) => ({ x, y, fill })),
      [{ x: '17', y: '26', fill: '#ff0000' }],
    );
  });

  it('given a bold oblique A with an RGB foreground, when drawn, then the text carries weight, style and colour', () => {
    const svg = renderSvg(
      grid(1, 1, { '0,0': { char: 'A', bold: true, italic: true, fg: { kind: 'rgb', value: 0x123456 } } }),
    );
    const [text] = elements(svg, 'text');
    assert.equal(text?.content, 'A');
    assert.equal(text?.['font-weight'], 'bold');
    assert.equal(text?.['font-style'], 'oblique');
    assert.equal(text?.fill, '#123456');
    assert.equal(text?.y, '22');
  });

  it('given an inverse cell in default colours, when drawn, then foreground and background swap', () => {
    const svg = renderSvg(grid(1, 1, { '0,0': { char: 'x', inverse: true } }));
    assert.equal(elements(svg, 'rect')[1]?.fill, '#ffffff');
    assert.equal(elements(svg, 'text')[0]?.fill, '#000000');
  });

  it('given a wide character, when drawn, then its background spans two cells and its second half is skipped', () => {
    const svg = renderSvg(
      grid(2, 1, {
        '0,0': { char: '界', width: 2, bg: { kind: 'palette', index: 1 } },
        '1,0': { width: 0, bg: { kind: 'palette', index: 1 } },
      }),
    );
    const cellRects = elements(svg, 'rect').slice(1);
    assert.equal(cellRects.length, 1);
    assert.equal(cellRects[0]?.width, '18');
  });

  it('given a < character, when drawn, then it is escaped', () => {
    assert.equal(elements(renderSvg(grid(1, 1, { '0,0': { char: '<' } })), 'text')[0]?.content, '&lt;');
  });

  it('given a cursor at column 2 of row 0, when drawn, then one outlined cell marks it', () => {
    const outlined = elements(renderSvg(grid(3, 1, {}, { column: 2, row: 0 })), 'rect').filter(
      (rect) => rect.stroke !== undefined,
    );
    assert.deepEqual(
      outlined.map(({ x, y, fill, stroke }) => ({ x, y, fill, stroke })),
      [{ x: '26', y: '8', fill: 'none', stroke: '#ffffff' }],
    );
  });
});

describe('paletteColor', () => {
  const expected: [number, string][] = [
    [1, '#cc0000'],
    [16, '#000000'],
    [196, '#ff0000'],
    [231, '#ffffff'],
    [232, '#080808'],
    [255, '#eeeeee'],
  ];
  for (const [index, color] of expected) {
    it(`given palette index ${index}, when looked up, then it is ${color}`, () => {
      assert.equal(paletteColor(index), color);
    });
  }
});
