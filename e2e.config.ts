import { mkdirSync } from 'node:fs';
import { terminal } from 'das-e2e';
import type { E2EConfig } from 'e2e';
import { fixtureHome, fixtureProgram } from './tests/e2e/fixture-home.ts';
import { cleanupReporter } from './tests/e2e/cleanup-reporter.ts';

mkdirSync(fixtureHome, { recursive: true });

export default {
  workers: 1,
  retries: 0,
  actionTimeout: 5000,
  reporters: ['list', cleanupReporter()],
  targets: [
    { name: 'terminal', engine: terminal({
      command: process.execPath, args: [fixtureProgram], cwd: fixtureHome,
      env: { NAME: 'target', ONLY_TARGET: 'kept' },
    }) },
    { name: 'missing', engine: terminal({ command: 'das-e2e-missing-command', cwd: fixtureHome }) },
  ],
} satisfies E2EConfig;
