import { existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from '@homebridge/node-pty-prebuilt-multiarch';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import xterm from '@xterm/headless';
import {
  defineEngine,
  EngineError,
  type EngineHandle,
  type OperationContext,
  resolveExpression,
  type SemanticNode,
  type ViewportSize,
  withinCleanupBudget,
} from 'e2e/engine';
import type { CliSpec } from '../../../cli/run/models/cli-spec.ts';
import { cliFixture } from '../../../cli/run/services/cli-fixture.ts';
import { findExecutable } from '../../../core/utils/find-executable.ts';
import { definedEnv } from '../../../core/utils/process-env.ts';
import { systemClock } from '../../../core/utils/system-clock.ts';
import { terminalFixture } from '../../fixture/services/terminal-fixture.ts';
import { keyBytes } from '../../keys/utils/key-bytes.ts';
import { readGrid } from '../../picture/utils/read-grid.ts';
import { renderPng } from '../../picture/utils/render-png.ts';
import { renderSvg } from '../../picture/utils/render-svg.ts';
import { rootNode } from '../../screen/utils/root-node.ts';
import { screenLines } from '../../screen/utils/screen-lines.ts';
import { CELL_HEIGHT, CELL_WIDTH, PADDING } from '../../shared/constants/geometry.ts';
import type { TerminalOptions } from '../../shared/models/terminal-options.ts';
import { resolveTerminalOptions } from '../../shared/utils/resolve-terminal-options.ts';
import type { Attempt, RunningAttempt } from '../models/attempt.ts';
import type { SettleSubject } from '../models/settle-subject.ts';
import { drainWrites, settle } from '../utils/settle.ts';

const packageJson: unknown = JSON.parse(readFileSync(new URL('../../../../package.json', import.meta.url), 'utf8'));
const version =
  typeof packageJson === 'object' && packageJson !== null && 'version' in packageJson && typeof packageJson.version === 'string'
    ? packageJson.version
    : '0.0.0';

/**
 * The e2e engine of a terminal target. It runs `command` in a pseudo terminal,
 * reads the screen as a tree of rows and contributes the fixtures `cli` and
 * `terminal`. A bad option throws `TypeError` when the config loads.
 */
export function terminal(options: TerminalOptions): EngineHandle {
  const resolved = resolveTerminalOptions(options);
  const name = [resolved.command, ...resolved.args].join(' ');
  let spec: CliSpec | undefined;
  let attempt: Attempt | null = null;

  const fail = (code: 'INVALID_STATE' | 'NOT_ACTIONABLE' | 'UNSUPPORTED_CAPABILITY', message: string): never => {
    throw new EngineError(code, `terminal: ${message}`, { retryable: false });
  };

  function requireAttempt(): Attempt {
    return attempt ?? fail('INVALID_STATE', 'no attempt runs');
  }

  function ensureStarted(): RunningAttempt {
    const current = requireAttempt();
    if (isRunning(current)) return current;
    const target = spec ?? fail('INVALID_STATE', 'the engine has no init yet');
    const executable = findExecutable(target.command, target.env, target.cwd, process.platform);
    if (executable === undefined) {
      return fail('INVALID_STATE', `${target.command} did not start: no such program on PATH`);
    }

    const screen = new xterm.Terminal({ cols: current.cols, rows: current.rows, allowProposedApi: true });
    screen.loadAddon(new Unicode11Addon());
    screen.unicode.activeVersion = '11';
    let pty;
    try {
      pty = spawn(executable, [...target.args], {
        name: 'xterm-256color',
        cols: current.cols,
        rows: current.rows,
        cwd: target.cwd,
        env: { ...target.env },
      });
    } catch (error) {
      screen.dispose();
      return fail('INVALID_STATE', `${target.command} did not start: ${error instanceof Error ? error.message : String(error)}`);
    }

    const running: RunningAttempt = Object.assign(current, { screen, pty });
    running.lastOutputAt = systemClock.now();
    pty.onData((chunk) => {
      current.pendingWrites += 1;
      current.lastOutputAt = systemClock.now();
      screen.write(chunk, () => {
        current.pendingWrites -= 1;
      });
    });
    // Answers of the screen model, such as a cursor position report, go back to the program.
    screen.onData((reply) => {
      if (current.exit === null) pty.write(reply);
    });
    pty.onExit((result) => {
      current.exit = result;
      current.markExited();
    });
    return running;
  }

  function settleSubject(current: RunningAttempt): SettleSubject {
    return {
      get pendingWrites() {
        return current.pendingWrites;
      },
      get lastOutputAt() {
        return current.lastOutputAt;
      },
      get exited() {
        return current.exit !== null;
      },
      pause: () => current.pty.pause(),
    };
  }

  function requireRunning(current: RunningAttempt): void {
    if (current.exit !== null) fail('NOT_ACTIONABLE', `the program ended with exit code ${current.exit.exitCode}`);
  }

  /** Reads the screen once, with the output paused so no chunk lands halfway. */
  async function readNow(current: RunningAttempt): Promise<SemanticNode> {
    current.pty.pause();
    try {
      await drainWrites(settleSubject(current), systemClock);
      const buffer = current.screen.buffer.active;
      return rootNode({
        name,
        cols: current.cols,
        rows: current.rows,
        lines: screenLines(current.screen, current.rows),
        cursorRow: buffer.cursorY,
        cursorColumn: buffer.cursorX,
        exitCode: current.exit?.exitCode,
      });
    } finally {
      current.pty.resume();
    }
  }

  /** Waits for the program's answer to input: quiet for the settle time, ended, or out of time. */
  async function settleAfterInput(current: RunningAttempt, context: OperationContext): Promise<void> {
    current.lastOutputAt = systemClock.now();
    try {
      await settle(settleSubject(current), context, systemClock);
    } finally {
      current.pty.resume();
    }
  }

  async function pressKey(key: string, context: OperationContext): Promise<void> {
    const current = ensureStarted();
    requireRunning(current);
    current.pty.write(keyBytes(key, current.screen.modes.applicationCursorKeysMode, process.platform));
    await settleAfterInput(current, context);
  }

  async function typeText(text: string, { replace }: { readonly replace: boolean }, context: OperationContext) {
    if (replace) fail('UNSUPPORTED_CAPABILITY', 'a terminal has no field to replace');
    const current = ensureStarted();
    requireRunning(current);
    current.pty.write(text);
    await settleAfterInput(current, context);
  }

  async function resizeTo({ width, height }: ViewportSize, context: OperationContext): Promise<void> {
    const cols = Math.floor((width - 2 * PADDING) / CELL_WIDTH);
    const rows = Math.floor((height - 2 * PADDING) / CELL_HEIGHT);
    if (cols < 1 || rows < 1) fail('NOT_ACTIONABLE', `${width}x${height} px holds no cell`);
    const current = requireAttempt();
    if (isRunning(current)) {
      requireRunning(current);
      current.pty.resize(cols, rows);
      current.screen.resize(cols, rows);
      current.cols = cols;
      current.rows = rows;
      await settleAfterInput(current, context);
      return;
    }
    current.cols = cols;
    current.rows = rows;
    await settleAfterInput(ensureStarted(), context);
  }

  async function screenshot(label: string | undefined): Promise<string> {
    const current = requireAttempt();
    const showCursor = current.pty !== null && current.exit === null;
    const png = renderPng(renderSvg(readGrid(current.screen, current.cols, current.rows, showCursor)));
    await mkdir(current.artifactsDir, { recursive: true });
    const stem = (label ?? 'screen').replace(/[^A-Za-z0-9._-]/g, '-').slice(0, 100);
    let file = path.join(current.artifactsDir, `${stem}.png`);
    // #FEEDBACK 2026-11-16T18:24:55.000+01:00 | [Performance] Filename selection repeats blocking probes of every previous same-label picture. N pictures incur N(N+1)/2 existsSync calls although bounded bookkeeping can retain the next suffix.
    for (let n = 2; existsSync(file); n += 1) file = path.join(current.artifactsDir, `${stem}-${n}.png`);
    await writeFile(file, png);
    return path.relative(current.artifactsDir, file);
  }

  return defineEngine({
    name: 'terminal',
    version,
    spiVersion: 1,
    platform: 'terminal',
    async init(info) {
      spec = {
        command: resolved.command,
        args: resolved.args,
        cwd: path.resolve(info.projectRoot, resolved.cwd),
        env: definedEnv(info.env, resolved.env),
      };
      info.log(`terminal: runs ${resolved.command} in ${spec.cwd} at ${resolved.cols}x${resolved.rows}`);
    },
    async startAttempt(context) {
      const exited = Promise.withResolvers<void>();
      attempt = {
        artifactsDir: context.artifactsDir,
        cols: resolved.cols,
        rows: resolved.rows,
        pty: null,
        screen: null,
        pendingWrites: 0,
        lastOutputAt: 0,
        exit: null,
        exited: exited.promise,
        markExited: () => exited.resolve(),
      };
    },
    async endAttempt(context) {
      const current = attempt;
      if (current === null) return;
      attempt = null;
      if (current.pty !== null && current.exit === null) {
        const half = context.timeoutMs / 2;
        killQuietly(() => current.pty?.kill());
        await withinCleanupBudget(current.exited, { signal: context.signal, timeoutMs: half });
        if (current.exit === null && process.platform !== 'win32') {
          killQuietly(() => current.pty?.kill('SIGKILL'));
          await withinCleanupBudget(current.exited, { signal: context.signal, timeoutMs: context.timeoutMs - half });
        }
      }
      current.screen?.dispose();
    },
    async observe() {
      const root = await readNow(ensureStarted());
      const rect = root.rect ?? { width: 0, height: 0 };
      return { root, viewport: { width: rect.width, height: rect.height } };
    },
    async locate(expression) {
      return resolveExpression(expression, [await readNow(ensureStarted())]);
    },
    keyboard: {
      type: (text, typeOptions, context) => typeText(text, typeOptions, context),
      press: pressKey,
    },
    session: { resize: resizeTo },
    artifacts: { screenshot: (label) => screenshot(label) },
    fixtures: {
      cli: cliFixture(() => spec),
      terminal: terminalFixture({ pressKey, typeText, resizeTo }),
    },
  });
}

/** A kill of a program that already ended throws on some platforms; the exit wait that follows decides. */
function killQuietly(kill: () => void): void {
  try {
    kill();
  } catch {
    // The program is gone already.
  }
}

function isRunning(attempt: Attempt): attempt is RunningAttempt {
  return attempt.pty !== null && attempt.screen !== null;
}
