import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import type { CliSpec } from '../models/cli-spec.ts';
import { runCli } from './run-cli.ts';

const env = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
);

function script(source: string, extraEnv: Record<string, string> = {}): CliSpec {
  return { command: process.execPath, args: ['-e', source], cwd: process.cwd(), env: { ...env, ...extraEnv } };
}

const open = { timeoutMs: 30_000, signal: new AbortController().signal };

async function failure(run: Promise<unknown>): Promise<{ code: unknown; message: string }> {
  try {
    await run;
  } catch (error) {
    assert.ok(error instanceof Error);
    return { code: 'code' in error ? error.code : undefined, message: error.message };
  }
  return assert.fail('expected the run to fail');
}

async function processRegression(abort: boolean, ignoreTerm = false): Promise<void> {
  const folder = await mkdtemp(join(tmpdir(), 'cli-cleanup-'));
  const controller = new AbortController();
  const pids: number[] = [];
  const alive = (pid: number): boolean => {
    try { process.kill(pid, 0); return true; }
    catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ESRCH') return false;
      throw error;
    }
  };
  const waitUntil = async (predicate: () => Promise<boolean>): Promise<void> => {
    const deadline = performance.now() + 3000;
    while (!(await predicate())) {
      assert.ok(performance.now() < deadline, 'fixture condition reached its deadline');
      await delay(20);
    }
  };
  const record = (name: string): string =>
    `require('node:fs').writeFileSync(${JSON.stringify(join(folder, name))},String(process.pid));`;
  const descendant = record('descendant') + 'setTimeout(()=>{},10000);';
  const source = ignoreTerm
    ? "process.on('SIGTERM',()=>{});" + record('parent') + 'setInterval(()=>{},10000);'
    : `require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(descendant)}],{stdio:['ignore',1,2]});`
      + record('parent') + 'setInterval(()=>{},10000);';
  const started = performance.now();
  const operation = failure(runCli(script(source), [], undefined, {
    timeoutMs: abort ? 0 : 1000,
    signal: controller.signal,
  }));
  // Attach failure handling before waiting for fixture readiness.
  const settled = operation.then(value => ({ value }), error => ({ error }));
  try {
    for (const name of ignoreTerm ? ['parent'] : ['parent', 'descendant']) {
      await waitUntil(async () => {
        try {
          const pid = Number(await readFile(join(folder, name), 'utf8'));
          if (!pids.includes(pid)) pids.push(pid);
          return true;
        } catch (error) {
          if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return false;
          throw error;
        }
      });
    }
    const stoppedAt = abort ? performance.now() : started;
    if (abort) controller.abort();
    const watchdog = new AbortController();
    try {
      const result = await Promise.race([
        operation,
        delay(5000, undefined, { signal: watchdog.signal }).then(() => assert.fail('operation cleanup hung')),
      ]);
      assert.equal(result.code, 'OPERATION_TIMEOUT');
      assert.ok(performance.now() - stoppedAt < (abort ? 3500 : 4500));
      await waitUntil(async () => pids.every(pid => !alive(pid)));
    } finally {
      watchdog.abort();
    }
  } finally {
    controller.abort();
    for (const name of ['parent', 'descendant']) {
      try {
        const pid = Number(await readFile(join(folder, name), 'utf8'));
        if (!pids.includes(pid)) pids.push(pid);
      } catch {}
    }
    for (const pid of pids) {
      try { process.kill(pid, 'SIGKILL'); }
      catch (error) {
        if (!(error instanceof Error && 'code' in error && error.code === 'ESRCH')) throw error;
      }
    }
    await settled;
    await rm(folder, { recursive: true, force: true });
  }
}

describe('runCli', () => {
  it('stops inherited pipe descendants on timeout', async () => {
    await processRegression(false);
  });
  it('stops inherited pipe descendants on abort', async () => {
    await processRegression(true);
  });
  it('stops a SIGTERM-ignoring child', { skip: process.platform === 'win32' }, async () => {
    await processRegression(true, true);
  });
  it('given a program that prints JSON, when run, then it answers exit code 0, the output and the parsed JSON', async () => {
    const result = await runCli(script('console.log(JSON.stringify({ ok: true }))'), [], undefined, open);
    assert.deepEqual(result, { exitCode: 0, stdout: '{"ok":true}\n', stderr: '', json: { ok: true } });
  });

  it('given a program that fails with 3, when run, then it answers the code and stderr without json', async () => {
    const result = await runCli(script('process.stderr.write("bad\\n"); process.exit(3)'), [], undefined, open);
    assert.equal(result.exitCode, 3);
    assert.equal(result.stdout, '');
    assert.notEqual(result.stderr, '');
    assert.equal('json' in result, false);
  });

  it('given target env and run env, when run, then the run env wins and the rest of the target env stays', async () => {
    const spec = script('console.log(JSON.stringify([process.env.NAME, process.env.ONLY_TARGET]))', {
      NAME: 't',
      ONLY_TARGET: 'y',
    });
    const result = await runCli(spec, [], { env: { NAME: 'x' } }, open);
    assert.deepEqual(result.json, ['x', 'y']);
  });

  it('given a 300 ms program and a timeout of 0, when run, then it has no own deadline and ends normally', async () => {
    const result = await runCli(script('setTimeout(() => {}, 300)'), [], undefined, { ...open, timeoutMs: 0 });
    assert.equal(result.exitCode, 0);
  });

  it('given a slow program and a 200 ms timeout, when run, then it fails with OPERATION_TIMEOUT without the env', async () => {
    const started = performance.now();
    const { code, message } = await failure(
      runCli(script('setTimeout(() => {}, 10_000)'), [], { env: { SECRET: 'leak-me' } }, { ...open, timeoutMs: 200 }),
    );
    assert.equal(code, 'OPERATION_TIMEOUT');
    assert.equal(message.includes('leak-me'), false);
    assert.ok(performance.now() - started < 3000);
  });

  it('given an abort while the program runs, when run, then it fails with OPERATION_TIMEOUT', async () => {
    const controller = new AbortController();
    // A real child process runs in real time, so the abort must come once it really runs.
    setTimeout(() => controller.abort(), 100);
    const { code } = await failure(
      runCli(script('setTimeout(() => {}, 10_000)'), [], undefined, { timeoutMs: 0, signal: controller.signal }),
    );
    assert.equal(code, 'OPERATION_TIMEOUT');
  });

  it('given a command that does not exist, when run, then it fails with INVALID_STATE', async () => {
    const spec: CliSpec = { command: 'das-e2e-missing-command', args: [], cwd: process.cwd(), env };
    assert.equal((await failure(runCli(spec, [], undefined, open))).code, 'INVALID_STATE');
  });
});
