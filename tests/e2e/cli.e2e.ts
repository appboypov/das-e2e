import assert from 'node:assert/strict';
import { test } from 'das-e2e';
import { alivePids } from './fixture-home.ts';
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
  assert.notEqual(result.stderr, '');
  assert.equal('json' in result, false);
});

test('run env reaches the program', { requires: ['cli'] }, async ({ cli }) => {
  const result = await cli.run(['--env', 'NAME'], { env: { NAME: 'x' } });
  assert.deepEqual(result.json, { NAME: 'x' });
});

test('a cli test starts no pseudo terminal', { requires: ['cli'] }, async ({ cli }) => {
  await cli.run(['--json']);
  // #FEEDBACK 2026-11-16T18:24:55.000+01:00 | [Scope] This checks for a live PTY rather than any PTY start. The approved PRD Own Tests requires absence of a recorded start but alivePids discards processes that already exited.
  assert.deepEqual(alivePids('tty'), []);
});

test('a slow run ends at the action timeout', { requires: ['cli'] }, async ({ cli }) => {
  const refusal = await rejectionOf(cli.run(['--sleep', '20000'], { env: { SECRET_TOKEN: 'leak-me' } }));
  assert.equal(refusal.code, 'ACTION_FAILED');
  assert.equal(refusal.causeCode, 'OPERATION_TIMEOUT');
  assert.equal(refusal.messages.includes('leak-me'), false);
  assert.deepEqual(alivePids('pipe'), []);
});
