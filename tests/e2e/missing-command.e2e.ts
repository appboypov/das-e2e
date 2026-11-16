import assert from 'node:assert/strict';
import { test } from 'das-e2e';
import { rejectionOf } from './rejection.ts';

test('a missing command fails the first screen read', { tags: ['missing'] }, async ({ screen }) => {
  const refusal = await rejectionOf(screen.getByText('ready').textContent());
  assert.equal(refusal.code, 'APP_NOT_OPEN');
});
