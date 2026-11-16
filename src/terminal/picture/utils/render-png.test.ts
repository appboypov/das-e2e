import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { GridCell } from '../models/grid-cell.ts';
import { renderPng } from './render-png.ts';
import { renderSvg } from './render-svg.ts';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function cell(char: string): GridCell {
  return { char, width: 1, fg: { kind: 'default' }, bg: { kind: 'default' }, bold: false, italic: false, inverse: false };
}

describe('renderPng', () => {
  it('given a 2 by 1 grid with ab, when rendered, then it is a PNG 34 pixels wide', () => {
    const png = renderPng(renderSvg({ cols: 2, rows: 1, cells: [[cell('a'), cell('b')]], cursor: undefined }));
    assert.deepEqual(png.subarray(0, 8), PNG_SIGNATURE);
    assert.equal(png.readUInt32BE(16), 34);
    assert.equal(png.readUInt32BE(20), 34);
  });
});
