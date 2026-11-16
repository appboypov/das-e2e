import { writeFileSync } from 'node:fs';
import type { Reporter } from 'e2e';
import { alivePids } from './fixture-home.ts';

/** Records process state after cleanup for every test. The own runs disable retries. */
export function cleanupReporter(): Reporter {
  const checks: { title: string; pids: number[] }[] = [];
  return {
    name: 'fixture-cleanup',
    onEvent(event) {
      if (event.type === 'test-finished') {
        checks.push({ title: event.result.test.title, pids: alivePids() });
      }
    },
    async onRunFinished(run) {
      if (run.reportPath !== undefined) {
        writeFileSync(`${run.reportPath}.cleanup.json`, JSON.stringify(checks));
      }
    },
  };
}
