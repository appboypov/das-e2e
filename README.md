# das-e2e

A terminal engine for [e2e](https://www.npmjs.com/package/e2e). It runs a command line tool or terminal app in a pseudo terminal and gives its screen to e2e. It also runs a command with pipes for tests that only need its output.

## Install

Install `das-e2e` beside `e2e` ^0.23.1. Use the npm package:

```sh
npm install --save-dev das-e2e e2e@^0.23.1
```

Or use the git dependency at its pin tag:

```json
{
  "devDependencies": {
    "das-e2e": "github:appboypov/das-e2e#v0.1.0",
    "e2e": "0.23.1"
  }
}
```

The package needs Node 24.21.0.

## Target

Add a target with the `terminal` engine to `e2e.config.ts`:

```ts
import { terminal } from 'das-e2e';
import type { E2EConfig } from 'e2e';

export default {
  targets: [{ name: 'terminal', engine: terminal({ command: 'node', args: ['bin/cli.mjs'] }) }],
} satisfies E2EConfig;
```

|Option|Default|Meaning|
|---|---|---|
|`command`|required|The program to run, found on `PATH` or as a path|
|`args`|`[]`|The arguments before those of a test|
|`cwd`|`'.'`|The working folder, relative to the project root|
|`env`|`{}`|Variables on top of the environment of the runner|
|`cols`|`100`|Columns of the pseudo terminal|
|`rows`|`30`|Rows of the pseudo terminal|

A bad option fails the config load with a `TypeError` that names the option.

## Tests

Import `test` and `expect` from `das-e2e`. Its `test` holds the fixtures `terminal` and `cli`.

```ts
import { expect, test } from 'das-e2e';

test('the menu opens', async ({ screen, terminal }) => {
  await expect(screen.getByText('Choose an action', { exact: true })).toBeVisible();
  await terminal.type('2');
  await terminal.press('Enter');
  await expect(screen.getByText('Settings', { exact: true })).toBeVisible();
  await terminal.resize({ width: 736, height: 448 });
});

test('--json gives json', { requires: ['cli'] }, async ({ cli }) => {
  const result = await cli.run(['--json'], { env: { NO_COLOR: '1' } });
  expect(result.exitCode).toBe(0);
  expect(result.json).toEqual({ ok: true });
});
```

- `terminal.press(key)` sends a key of the e2e key grammar, such as `Enter`, `Control+c` or `F5`.
- `terminal.type(text)` sends the text as it is.
- `terminal.resize({ width, height })` takes pixels and gives the program the cells that fit: 736 × 448 px is 80 × 24 cells.
- `cli.run(args, { env })` runs the command with the target arguments and `args`. It answers `exitCode`, `stdout`, `stderr` and `json` when stdout is JSON. It starts no pseudo terminal.

## Behaviour

- **Lazy Start**: the program starts at the first screen read or input of a test. A test that only uses `cli.run` starts no pseudo terminal.
- **Settle**: after each input or resize the engine waits until the screen is quiet for 100 ms or the program ends. The action timeout bounds the wait.
- **Screen Tree**: the root has role `terminal`, the program as its name and the attributes `cursorRow`, `cursorColumn` and `exitCode` once the program ended. Each row of the screen is a `text` node, so `getByText` matches a whole row.
- **Failure Picture**: a failed test keeps a PNG of the screen in its attempt folder, in DejaVu Sans Mono on the xterm colours.
- **Input Timing**: the engine writes input at once. Wait for the first screen of the program before you type, so the program reads raw input by then.
- **Clean End**: each attempt ends its own program.

## Errors

|Case|What the test sees|
|---|---|
|Bad target option|`TypeError` at config load that names the option|
|Program does not start|`APP_NOT_OPEN` with the command|
|Key a terminal cannot send|`UNSUPPORTED_CAPABILITY` that names the key|
|`type` with `replace`|`UNSUPPORTED_CAPABILITY`|
|Input or resize after the program ended|`ACTION_FAILED` with `cause.code` `NOT_ACTIONABLE` and the exit code|
|`cli.run` past the action timeout|`ACTION_FAILED` with `cause.code` `OPERATION_TIMEOUT`, which names the command and arguments and never the environment|

## Limits

- No mouse and no video.
- A modified named key is refused, such as `Shift+F5`, `Alt+ArrowUp` or `Control+Enter`. `Shift+Tab` works. `ControlOrMeta` is `Control` on Linux and Windows and refused on macOS.
- Emoji widths follow Unicode 11.
- The picture has no colour emoji and no CJK glyphs.

## Licences

The picture uses DejaVu Sans Mono. Its licence is in [fonts/LICENSE](fonts/LICENSE).
