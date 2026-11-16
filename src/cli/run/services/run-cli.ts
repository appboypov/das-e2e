import { type ChildProcess, spawn } from 'node:child_process';
import { EngineError } from 'e2e/engine';
import { definedEnv } from '../../../core/utils/process-env.ts';
import type { CliRunOptions } from '../models/cli-run-options.ts';
import type { CliRunResult } from '../models/cli-run-result.ts';
import type { CliSpec } from '../models/cli-spec.ts';

/** How long a stopped program gets to close before it is killed on macOS and Linux. */
const STOP_GRACE_MS = 2000;

/**
 * Runs the target's command with `args` and pipes, and answers its exit code
 * and output. A non-zero exit code is a result. At `timeoutMs` (none when 0)
 * or on abort it stops the program and throws `OPERATION_TIMEOUT`.
 */
export async function runCli(
  spec: CliSpec,
  args: readonly string[],
  runOptions: CliRunOptions | undefined,
  operation: { readonly timeoutMs: number; readonly signal: AbortSignal },
  platform: NodeJS.Platform = process.platform,
): Promise<CliRunResult> {
  const allArgs = [...spec.args, ...args];
  const child = spawn(spec.command, allArgs, {
    cwd: spec.cwd,
    env: definedEnv(spec.env, runOptions?.env ?? {}),
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
  child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));

  const closed = Promise.withResolvers<{ code: number | null }>();
  child.once('error', (error) =>
    closed.reject(
      new EngineError('INVALID_STATE', `cli: ${spec.command} did not start: ${error.message}`, { retryable: false }),
    ),
  );
  child.once('close', (code) => closed.resolve({ code }));

  const stopped = Promise.withResolvers<'stopped'>();
  const stop = (): void => stopped.resolve('stopped');
  const timer = operation.timeoutMs === 0 ? undefined : setTimeout(stop, operation.timeoutMs);
  if (operation.signal.aborted) stop();
  operation.signal.addEventListener('abort', stop, { once: true });

  try {
    const outcome = await Promise.race([closed.promise, stopped.promise]);
    if (outcome === 'stopped') {
      await endChild(child, closed.promise, platform);
      throw new EngineError('OPERATION_TIMEOUT', `cli: ${[spec.command, ...allArgs].join(' ')} did not end in time`, {
        retryable: false,
      });
    }
    const result: CliRunResult = {
      exitCode: outcome.code,
      stdout: Buffer.concat(stdout).toString('utf8'),
      stderr: Buffer.concat(stderr).toString('utf8'),
    };
    try {
      result.json = JSON.parse(result.stdout);
    } catch {
      // Output that is not JSON leaves `json` unset.
    }
    return result;
  } finally {
    clearTimeout(timer);
    operation.signal.removeEventListener('abort', stop);
  }
}

/** Ends the child: a stop signal first, then a kill on macOS and Linux when it does not close in time. */
async function endChild(child: ChildProcess, closed: Promise<unknown>, platform: NodeJS.Platform): Promise<void> {
  const settled = closed.then(
    () => true,
    () => true,
  );
  child.kill();
  const grace = Promise.withResolvers<false>();
  setTimeout(() => grace.resolve(false), STOP_GRACE_MS).unref();
  if (await Promise.race([settled, grace.promise])) return;
  if (platform !== 'win32') child.kill('SIGKILL');
  await settled;
}
