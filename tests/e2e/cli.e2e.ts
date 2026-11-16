import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'das-e2e';
import { alivePids, fixtureHome } from './fixture-home.ts';
import { rejectionOf } from './rejection.ts';

test('--json gives json', { requires: ['cli'] }, async ({ cli }) => {
  const result = await cli.run(['--json']);
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, '{"ok":true}\n');
  assert.deepEqual(result.json, { ok: true });
});

test('--fail gives stderr and exit code 3', { requires: ['cli'] }, async ({ cli }) => {
  const result = await cli.run(['--fail']);
  assert.equal(result.exitCode, 3);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, 'failed on purpose\n');
  assert.equal('json' in result, false);
});

test('plain stdout has no json answer', { requires: ['cli'] }, async ({ cli }) => {
  const result = await cli.run(['--sleep', '1']);
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, 'slept\n');
  assert.equal(result.stderr, '');
  assert.equal('json' in result, false);
});

test('run env reaches the program', { requires: ['cli'] }, async ({ cli }) => {
  const result = await cli.run(['--env', 'NAME'], { env: { NAME: 'x' } });
  assert.deepEqual(result.json, { NAME: 'x' });
  const inherited = await cli.run(['--env', 'ONLY_TARGET'], { env: { NAME: 'x' } });
  assert.deepEqual(inherited.json, { ONLY_TARGET: 'kept' });
});

test('a cli test starts no pseudo terminal', { requires: ['cli'] }, async ({ cli }) => {
  const folder = path.join(fixtureHome, 'pids');
  const before = existsSync(folder) ? readdirSync(folder)
    .filter(file => readFileSync(path.join(folder, file), 'utf8') === 'tty').sort() : [];
  await cli.run(['--json']);
  const after = readdirSync(folder)
    .filter(file => readFileSync(path.join(folder, file), 'utf8') === 'tty').sort();
  assert.deepEqual(after, before);
  assert.deepEqual(alivePids('tty'), []);
});

test('a slow run ends at the action timeout', { requires: ['cli'] }, async ({ cli }) => {
  const refusal = await rejectionOf(cli.run(['--sleep', '20000'], { env: { SECRET_TOKEN: 'leak-me' } }));
  assert.equal(refusal.code, 'ACTION_FAILED');
  assert.equal(refusal.causeCode, 'OPERATION_TIMEOUT');
  assert.equal(refusal.messages.includes('leak-me'), false);
  assert.deepEqual(alivePids('pipe'), []);
});
