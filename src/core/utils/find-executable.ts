import { accessSync, constants, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Finds the file that a spawn of `command` would start, or answers `undefined`.
 * A command with a path separator resolves against `cwd`. Any other command is
 * looked up on the `PATH` of `env`, with the `PATHEXT` extensions on Windows.
 */
export function findExecutable(
  command: string,
  env: Readonly<Record<string, string>>,
  cwd: string,
  platform: NodeJS.Platform,
): string | undefined {
  const windows = platform === 'win32';
  const paths = windows ? path.win32 : path.posix;
  const hasSeparator = command.includes('/') || (windows && command.includes('\\'));
  const extensions = windows && paths.extname(command) === '' ? windowsExtensions(env) : [''];

  if (hasSeparator) {
    return firstRunnable(paths.resolve(cwd, command), extensions, windows);
  }

  const searchPath = envValue(env, 'PATH') ?? '';
  for (const folder of searchPath.split(paths.delimiter)) {
    if (folder === '') continue;
    const found = firstRunnable(paths.resolve(cwd, folder, command), extensions, windows);
    if (found !== undefined) return found;
  }
  return undefined;
}

function firstRunnable(
  file: string,
  extensions: readonly string[],
  windows: boolean,
): string | undefined {
  for (const extension of extensions) {
    const candidate = file + extension;
    if (isRunnable(candidate, windows)) return candidate;
  }
  return undefined;
}

function isRunnable(file: string, windows: boolean): boolean {
  try {
    if (!statSync(file).isFile()) return false;
    if (!windows) accessSync(file, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function windowsExtensions(env: Readonly<Record<string, string>>): string[] {
  const value = envValue(env, 'PATHEXT') ?? '.COM;.EXE;.BAT;.CMD';
  return value.split(';').filter((extension) => extension !== '');
}

/** Reads an environment variable by a case-insensitive name, as Windows names `PATH` as `Path`. */
function envValue(env: Readonly<Record<string, string>>, name: string): string | undefined {
  const key = Object.keys(env).find((candidate) => candidate.toUpperCase() === name);
  return key === undefined ? undefined : env[key];
}
