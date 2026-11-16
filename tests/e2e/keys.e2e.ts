import assert from 'node:assert/strict';
import { expect, test } from 'das-e2e';
import type { Role } from 'e2e';
import { rejectionOf } from './rejection.ts';

// The e2e Role type lists only ARIA roles. The runner matches any role, and the screen root has role `terminal`.
const terminalRole = 'terminal' as Role;

/** Each key with the hex of the bytes the program must receive in normal cursor mode. */
const normalModeKeys: readonly (readonly [string, string])[] = [
  ['Enter', '0d'],
  ['Tab', '09'],
  ['Escape', '1b'],
  ['Backspace', '7f'],
  ['Space', '20'],
  ['Delete', '1b5b337e'],
  ['Insert', '1b5b327e'],
  ['PageUp', '1b5b357e'],
  ['PageDown', '1b5b367e'],
  ['ArrowUp', '1b5b41'],
  ['ArrowDown', '1b5b42'],
  ['ArrowRight', '1b5b43'],
  ['ArrowLeft', '1b5b44'],
  ['Home', '1b5b48'],
  ['End', '1b5b46'],
  ['F1', '1b4f50'],
  ['F2', '1b4f51'],
  ['F3', '1b4f52'],
  ['F4', '1b4f53'],
  ['F5', '1b5b31357e'],
  ['F6', '1b5b31377e'],
  ['F7', '1b5b31387e'],
  ['F8', '1b5b31397e'],
  ['F9', '1b5b32307e'],
  ['F10', '1b5b32317e'],
  ['F11', '1b5b32337e'],
  ['F12', '1b5b32347e'],
  ['Control+a', '01'],
  ['Alt+x', '1b78'],
  ['Shift+a', '41'],
  ['$', '24'],
  ['Shift+Tab', '1b5b5a'],
];

test('each key sends its bytes', async ({ screen, terminal }) => {
  await expect(screen.getByText('ready', { exact: true })).toBeVisible();
  await terminal.type('keys');
  await terminal.press('Enter');
  await expect(screen.getByText('keys mode', { exact: true })).toBeVisible();
  for (const [key, hex] of normalModeKeys) {
    await terminal.press(key);
    await expect(screen.getByText(`keys: ${hex};`, { exact: true })).toBeVisible();
  }
});

test('arrows follow the cursor mode', async ({ screen, terminal }) => {
  await expect(screen.getByText('ready', { exact: true })).toBeVisible();
  await terminal.type('app-cursor');
  await terminal.press('Enter');
  await expect(screen.getByText('app cursor', { exact: true })).toBeVisible();
  await terminal.type('keys');
  await terminal.press('Enter');
  await expect(screen.getByText('keys mode', { exact: true })).toBeVisible();
  for (const [key, hex] of [
    ['ArrowUp', '1b4f41'],
    ['Home', '1b4f48'],
    ['End', '1b4f46'],
  ] as const) {
    await terminal.press(key);
    await expect(screen.getByText(`keys: ${hex};`, { exact: true })).toBeVisible();
  }
});

test('Control+c ends the program', async ({ screen, terminal }) => {
  await expect(screen.getByText('ready', { exact: true })).toBeVisible();
  await terminal.press('Control+c');
  await expect(screen.getByText('bye', { exact: true })).toBeVisible();
  await expect(screen.getByRole(terminalRole)).toHaveAttribute('exitCode', '130');
  const refusal = await rejectionOf(terminal.press('a'));
  assert.equal(refusal.code, 'ACTION_FAILED');
  assert.equal(refusal.causeCode, 'NOT_ACTIONABLE');
});

test('keys a terminal cannot send are refused', async ({ terminal }) => {
  assert.equal((await rejectionOf(terminal.press('Shift+F5'))).code, 'UNSUPPORTED_CAPABILITY');
  assert.equal((await rejectionOf(terminal.press('Alt+ArrowUp'))).code, 'UNSUPPORTED_CAPABILITY');
  assert.equal((await rejectionOf(terminal.type('x', { replace: true }))).code, 'UNSUPPORTED_CAPABILITY');
});
