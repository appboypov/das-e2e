import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { keyBytes } from './key-bytes.ts';

const normalMode: [string, string][] = [
  ['Enter', '\r'],
  ['Tab', '\t'],
  ['Escape', '\x1b'],
  ['Backspace', '\x7f'],
  ['Space', ' '],
  ['Delete', '\x1b[3~'],
  ['Insert', '\x1b[2~'],
  ['PageUp', '\x1b[5~'],
  ['PageDown', '\x1b[6~'],
  ['ArrowUp', '\x1b[A'],
  ['ArrowDown', '\x1b[B'],
  ['ArrowRight', '\x1b[C'],
  ['ArrowLeft', '\x1b[D'],
  ['Home', '\x1b[H'],
  ['End', '\x1b[F'],
  ['F1', '\x1bOP'],
  ['F2', '\x1bOQ'],
  ['F3', '\x1bOR'],
  ['F4', '\x1bOS'],
  ['F5', '\x1b[15~'],
  ['F6', '\x1b[17~'],
  ['F7', '\x1b[18~'],
  ['F8', '\x1b[19~'],
  ['F9', '\x1b[20~'],
  ['F10', '\x1b[21~'],
  ['F11', '\x1b[23~'],
  ['F12', '\x1b[24~'],
  ['Control+a', '\x01'],
  ['Control+Z', '\x1a'],
  ['Alt+x', '\x1bx'],
  ['Alt+Shift+x', '\x1bX'],
  ['Shift+a', 'A'],
  ['$', '$'],
  ['Shift+Tab', '\x1b[Z'],
];

const applicationMode: [string, string][] = [
  ['ArrowUp', '\x1bOA'],
  ['ArrowDown', '\x1bOB'],
  ['ArrowRight', '\x1bOC'],
  ['ArrowLeft', '\x1bOD'],
  ['Home', '\x1bOH'],
  ['End', '\x1bOF'],
];

const refused = [
  'Shift+F5',
  'Alt+ArrowUp',
  'Control+Enter',
  'Meta+a',
  'Control+1',
  'Control+Shift+a',
  'Control+Alt+a',
];

function codeOf(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error instanceof Error && 'code' in error ? error.code : undefined;
  }
  return assert.fail('expected a refusal');
}

describe('keyBytes', () => {
  for (const [key, bytes] of normalMode) {
    it(`given ${key} in normal cursor mode, when translated, then it sends ${JSON.stringify(bytes)}`, () => {
      assert.equal(keyBytes(key, false, 'linux'), bytes);
    });
  }

  for (const [key, bytes] of applicationMode) {
    it(`given ${key} in application cursor mode, when translated, then it sends ${JSON.stringify(bytes)}`, () => {
      assert.equal(keyBytes(key, true, 'linux'), bytes);
    });
  }

  for (const platform of ['linux', 'win32'] as const) {
    it(`given ControlOrMeta+c on ${platform}, when translated, then it sends Control+c`, () => {
      assert.equal(keyBytes('ControlOrMeta+c', false, platform), '\x03');
    });
  }

  for (const key of refused) {
    it(`given ${key}, when translated, then it is refused as unsupported`, () => {
      assert.equal(codeOf(() => keyBytes(key, false, 'linux')), 'UNSUPPORTED_CAPABILITY');
    });
  }

  it('given ControlOrMeta+c on macOS, when translated, then it is refused as unsupported', () => {
    assert.equal(codeOf(() => keyBytes('ControlOrMeta+c', false, 'darwin')), 'UNSUPPORTED_CAPABILITY');
  });

  for (const key of ['Ctrl+q', 'abc']) {
    it(`given ${key} outside the key grammar, when translated, then it is an invalid argument`, () => {
      assert.equal(codeOf(() => keyBytes(key, false, 'linux')), 'INVALID_ARGUMENT');
    });
  }
});
