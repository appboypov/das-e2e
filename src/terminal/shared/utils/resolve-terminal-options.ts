import type { ResolvedTerminalOptions } from '../models/resolved-terminal-options.ts';
import type { TerminalOptions } from '../models/terminal-options.ts';

/** Validates the target options and fills in the defaults. Throws `TypeError` at config load. */
export function resolveTerminalOptions(options: TerminalOptions): ResolvedTerminalOptions {
  const { command, args = [], cwd = '.', env = {}, cols = 100, rows = 30 } = options;

  if (typeof command !== 'string' || command === '') {
    throw new TypeError('terminal: command must be a non-empty string');
  }
  if (!Array.isArray(args) || !args.every((arg) => typeof arg === 'string')) {
    throw new TypeError('terminal: args must be an array of strings');
  }
  if (typeof cwd !== 'string') {
    throw new TypeError('terminal: cwd must be a string');
  }
  if (
    typeof env !== 'object' ||
    env === null ||
    Array.isArray(env) ||
    !Object.values(env).every((value) => typeof value === 'string')
  ) {
    throw new TypeError('terminal: env must be an object of string values');
  }
  requirePositiveInteger('cols', cols);
  requirePositiveInteger('rows', rows);

  return { command, args: [...args], cwd, env: { ...env }, cols, rows };
}

function requirePositiveInteger(option: string, value: unknown): void {
  if (!Number.isInteger(value) || (value as number) <= 0) {
    throw new TypeError(`terminal: ${option} must be a positive integer, got ${String(value)}`);
  }
}
