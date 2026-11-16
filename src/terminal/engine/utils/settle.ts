import type { Clock } from '../../../core/models/clock.ts';
import { QUIET_MS, SETTLE_STEP_MS } from '../../shared/constants/geometry.ts';
import type { SettleOutcome } from '../models/settle-outcome.ts';
import type { SettleSubject } from '../models/settle-subject.ts';

/** Waits until the screen model applied every open output chunk. */
export async function drainWrites(subject: SettleSubject, clock: Clock): Promise<void> {
  while (subject.pendingWrites > 0) {
    await clock.sleep(1);
  }
}

/**
 * Waits until the program is quiet for `QUIET_MS` or ended. At the deadline or
 * on abort it pauses the output and drains the open writes, so the caller reads
 * a stable screen. The caller resumes the output afterwards. A `timeoutMs` of 0
 * sets no own deadline.
 */
export async function settle(
  subject: SettleSubject,
  context: { readonly timeoutMs: number; readonly signal: AbortSignal },
  clock: Clock,
): Promise<SettleOutcome> {
  const deadline = context.timeoutMs === 0 ? undefined : clock.now() + context.timeoutMs;
  for (;;) {
    if (subject.pendingWrites === 0) {
      if (subject.exited) return 'exited';
      if (clock.now() - subject.lastOutputAt >= QUIET_MS) return 'quiet';
    }
    const cancelled = context.signal.aborted;
    if (cancelled || (deadline !== undefined && clock.now() >= deadline)) {
      subject.pause();
      await drainWrites(subject, clock);
      return cancelled ? 'cancelled' : 'deadline';
    }
    await clock.sleep(SETTLE_STEP_MS);
  }
}
