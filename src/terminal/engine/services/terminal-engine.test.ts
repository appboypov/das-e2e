import assert from 'node:assert/strict';
import { chmod, copyFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { terminal } from './terminal-engine.ts';

it('starts a target-only PATH command with PATHEXT resolution', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'terminal-command-'));
  const executable = join(folder, process.platform === 'win32' ? 'terminal-test-node.exe' : 'terminal-test-node');
  await copyFile(process.execPath, executable);
  if (process.platform !== 'win32') await chmod(executable, 0o755);
  const targetEnv = Object.fromEntries(Object.entries(process.env).filter(
    (entry): entry is [string, string] => entry[1] !== undefined && !/^(path|pathext)$/i.test(entry[0]),
  ));
  const engine = terminal({
    command: 'terminal-test-node',
    args: ['-e', "console.log('terminal-started'); setInterval(()=>{},10000);"],
    env: { ...targetEnv, PATH: folder, PATHEXT: '.EXE' },
  });
  const signal = new AbortController().signal;
  const logs: string[] = [];
  assert.ok(engine.init);
  assert.ok(engine.startAttempt);
  assert.ok(engine.observe);
  assert.ok(engine.endAttempt);
  try {
    await engine.init({ runId: 'command-run', targetName: 'command-target', projectRoot: folder,
      app: {}, env: {}, headed: false, workerSlot: 0, signal, log: line => logs.push(line) });
    await engine.startAttempt({ attemptId: 'command-attempt', artifactsDir: folder, signal,
      resolveSecret: async () => { throw new Error('fixture has no secrets'); },
      appLog: () => {}, navigation: () => {}, environment: () => {} });
    const context = { runId: 'command-run', attemptId: 'command-attempt', origin: 'test' as const,
      timeoutMs: 5000, signal };
    const deadline = performance.now() + 15_000;
    for (;;) {
      const result = await engine.observe(context);
      if (result.root.children?.some(row => row.text === 'terminal-started')) break;
      assert.ok(performance.now() < deadline, `fixture output missing: ${JSON.stringify(result.root)}; ${logs.join('\n')}`);
      // Real PTY output arrives on the platform event loop rather than a fake clock.
      await delay(10);
    }
  } finally {
    await engine.endAttempt({ signal: new AbortController().signal, timeoutMs: 3000 });
    await rm(folder, { recursive: true, force: true });
  }
});
