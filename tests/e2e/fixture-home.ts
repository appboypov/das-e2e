import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** The working folder of the fixture program. It holds a `pids/<pid>` file per start. */
export const fixtureHome = fileURLToPath(new URL('../../.e2e/fixture-home/', import.meta.url));

export const fixtureProgram = fileURLToPath(new URL('../fixture/program.mjs', import.meta.url));

/** The pids of fixture programs that still run, of one kind or of both. */
export function alivePids(kind?: 'tty' | 'pipe'): number[] {
  const folder = path.join(fixtureHome, 'pids');
  if (!existsSync(folder)) return [];
  return readdirSync(folder)
    .filter((file) => kind === undefined || readFileSync(path.join(folder, file), 'utf8') === kind)
    .map(Number)
    .filter(isAlive);
}

/** Probes a pid with signal 0, which sends no signal. */
function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return !(error instanceof Error && 'code' in error && error.code === 'ESRCH');
  }
}
