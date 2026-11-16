import { type ChildProcess, spawn } from 'node:child_process';
import { EngineError, withinCleanupBudget } from 'e2e/engine';
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
    detached: platform !== 'win32',
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

/** Stops the owned process tree within a bounded cleanup budget. */
async function endChild(child: ChildProcess, closed: Promise<unknown>, platform: NodeJS.Platform): Promise<void> {
  let helper: ChildProcess | undefined;
  const budget = { signal: new AbortController().signal, timeoutMs: STOP_GRACE_MS };
  const signalGroup = (signal: NodeJS.Signals): void => {
    if (child.pid === undefined) return;
    try {
      process.kill(-child.pid, signal);
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ESRCH')) throw error;
    }
  };
  try {
    if (platform === 'win32') {
      if (child.pid === undefined) return;
      helper = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
        env: process.env,
      });
      const helperClosed = Promise.withResolvers<void>();
      helper.once('close', () => helperClosed.resolve());
      helper.once('error', () => helperClosed.resolve());
      await withinCleanupBudget(Promise.allSettled([closed, helperClosed.promise]), budget);
    } else {
      signalGroup('SIGTERM');
      await withinCleanupBudget(closed, budget);
      signalGroup('SIGKILL');
    }
  } finally {
    if (platform === 'win32') {
      helper?.kill('SIGKILL');
      helper?.unref();
      if (child.pid !== undefined) child.kill('SIGKILL');
    }
    child.stdout?.destroy();
    child.stderr?.destroy();
    child.unref();
  }
}
