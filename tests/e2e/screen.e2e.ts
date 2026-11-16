import assert from 'node:assert/strict';
import { expect, test } from 'das-e2e';

test('the screen shows the first output', async ({ screen }) => {
  await expect(screen.getByText('ready', { exact: true })).toBeVisible();
  await expect(screen.getByText('red bold', { exact: true })).toBeVisible();
  await expect(screen.getByText('size 100x30', { exact: true })).toBeVisible();
  const box = await screen.getByText('ready', { exact: true }).boundingBox();
  assert.equal(box?.y, 8);
});

test('typed text reaches stdin', async ({ screen, terminal }) => {
  await expect(screen.getByText('ready', { exact: true })).toBeVisible();
  await terminal.type('abc');
  await terminal.press('Enter');
  await expect(screen.getByText('got: abc', { exact: true })).toBeVisible();
});

test('a resize gives new columns and rows', async ({ screen, terminal }) => {
  await expect(screen.getByText('size 100x30', { exact: true })).toBeVisible();
  await terminal.resize({ width: 736, height: 448 });
  await expect(screen.getByText('size 80x24', { exact: true })).toBeVisible();
});

test('a failing test leaves a picture of the screen', { fail: 'proves the failure picture' }, async ({ screen }) => {
  await expect(screen.getByText('ready', { exact: true })).toBeVisible();
  await expect(screen.getByText('never shown')).toBeVisible({ timeout: 1000 });
});
