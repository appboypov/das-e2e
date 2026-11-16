import type { CliRunOptions } from './cli-run-options.ts';
import type { CliRunResult } from './cli-run-result.ts';

/** The `cli` fixture: runs the target's command with pipes, without a pseudo terminal. */
export interface Cli {
  run(args: readonly string[], options?: CliRunOptions): Promise<CliRunResult>;
}
