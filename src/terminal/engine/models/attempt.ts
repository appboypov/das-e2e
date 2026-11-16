import type { IPty } from '@homebridge/node-pty-prebuilt-multiarch';
import type { Terminal } from '@xterm/headless';

/** The state of one test attempt. The program starts lazily, on the first screen read or input. */
export interface Attempt {
  readonly artifactsDir: string;
  /** Grid size, reset each attempt; a resize changes it. */
  cols: number;
  rows: number;
  pty: IPty | null;
  screen: Terminal | null;
  /** Output chunks that the screen model has not applied yet. */
  pendingWrites: number;
  /** Clock time of the last output, start or input. */
  lastOutputAt: number;
  exit: { exitCode: number; signal?: number } | null;
  /** Resolves once the program ended. */
  readonly exited: Promise<void>;
  readonly markExited: () => void;
}

/** An attempt whose program was started. */
export type RunningAttempt = Attempt & { pty: IPty; screen: Terminal };
