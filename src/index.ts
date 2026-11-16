import { test as base } from 'e2e';
import type { Cli } from './cli/run/models/cli.ts';
import type { Terminal } from './terminal/fixture/models/terminal.ts';

export { expect } from 'e2e';
export type { Cli } from './cli/run/models/cli.ts';
export type { CliRunOptions } from './cli/run/models/cli-run-options.ts';
export type { CliRunResult } from './cli/run/models/cli-run-result.ts';
export { terminal } from './terminal/engine/services/terminal-engine.ts';
export type { Terminal } from './terminal/fixture/models/terminal.ts';
export type { TerminalOptions } from './terminal/shared/models/terminal-options.ts';

/** The e2e `test` with the `cli` and `terminal` fixtures of the terminal engine. */
export const test = base.extend<{ cli: Cli; terminal: Terminal }>();
