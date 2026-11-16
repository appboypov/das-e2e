import { EngineError, type EngineFixtureFactory } from 'e2e/engine';
import type { Cli } from '../models/cli.ts';
import type { CliSpec } from '../models/cli-spec.ts';
import { runCli } from './run-cli.ts';

/** The `cli` fixture of the terminal engine. `spec` answers the command that `init` resolved. */
export function cliFixture(spec: () => CliSpec | undefined): EngineFixtureFactory {
  return (ctx) => {
    const cli: Cli = {
      run: async (args, runOptions) => {
        const resolved = spec();
        if (resolved === undefined) {
          throw new EngineError('INVALID_STATE', 'cli: the engine has no init yet', { retryable: false });
        }
        return runCli(resolved, args, runOptions, ctx.operation());
      },
    };
    return ctx.fixture('cli', cli, {
      run: { kind: 'resource', label: (args) => args.join(' '), timeout: false },
    });
  };
}
