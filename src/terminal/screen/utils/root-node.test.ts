import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ScreenSnapshot } from '../models/screen-snapshot.ts';
import { rootNode } from './root-node.ts';

const base: ScreenSnapshot = {
  name: 'amd',
  cols: 80,
  rows: 3,
  lines: ['first', '', 'third'],
  cursorRow: 2,
  cursorColumn: 5,
  exitCode: undefined,
};

describe('rootNode', () => {
  it('given 3 rows with a blank middle row, when built, then each row is a text node and the blank one is empty', () => {
    const root = rootNode(base);
    assert.deepEqual(
      root.children?.map((child) => [child.ref.id, child.role, child.text]),
      [
        ['row-0', 'text', 'first'],
        ['row-1', 'text', ''],
        ['row-2', 'text', 'third'],
      ],
    );
    assert.deepEqual(root.children?.[2]?.rect, { x: 8, y: 44, width: 720, height: 18 });
  });

  it('given 80 columns and 24 rows, when built, then the root covers 736 by 448 pixels', () => {
    const root = rootNode({ ...base, rows: 24 });
    assert.deepEqual(root.rect, { x: 0, y: 0, width: 736, height: 448 });
    assert.equal(root.children?.length, 24);
  });

  it('given a long name and a long line, when built, then they are cut at the contract limits', () => {
    const root = rootNode({ ...base, name: 'n'.repeat(300), lines: ['l'.repeat(600)] });
    assert.equal(root.name?.length, 256);
    assert.equal(root.children?.[0]?.text?.length, 512);
  });

  it('given a program that ended with 130, when built, then the root holds the exit code and the cursor as text', () => {
    assert.deepEqual(rootNode({ ...base, exitCode: 130 }).attributes, {
      cursorRow: '2',
      cursorColumn: '5',
      exitCode: '130',
    });
  });

  it('given a running program, when built, then the root has no exit code', () => {
    assert.equal('exitCode' in (rootNode(base).attributes ?? {}), false);
  });
});
