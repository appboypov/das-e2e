import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveTerminalOptions } from './resolve-terminal-options.ts';

describe('resolveTerminalOptions', () => {
  it('given only a command, when resolved, then every default is filled in', () => {
    assert.deepEqual(resolveTerminalOptions({ command: 'amd' }), {
      command: 'amd',
      args: [],
      cwd: '.',
      env: {},
      cols: 100,
      rows: 30,
    });
  });

  const invalid: [string, Record<string, unknown>][] = [
    ['command', { command: '' }],
    ['args', { command: 'amd', args: [1] }],
    ['cwd', { command: 'amd', cwd: 3 }],
    ['env', { command: 'amd', env: { A: 1 } }],
    ['cols', { command: 'amd', cols: 0 }],
    ['rows', { command: 'amd', rows: 1.5 }],
  ];
  for (const [option, options] of invalid) {
    it(`given an invalid ${option}, when resolved, then a TypeError names ${option}`, () => {
      assert.throws(
        () => resolveTerminalOptions(options as never),
        (error: unknown) => error instanceof TypeError && error.message.includes(option),
      );
    });
  }
});
