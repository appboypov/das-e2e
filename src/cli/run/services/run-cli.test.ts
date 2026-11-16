import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
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

describe('runCli', () => {
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
