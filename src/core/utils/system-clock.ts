import { setTimeout as sleep } from 'node:timers/promises';
import type { Clock } from '../models/clock.ts';

/** The real clock: `performance.now()` and a timer sleep. */
export const systemClock: Clock = {
  now: () => performance.now(),
  sleep: async (ms) => {
    await sleep(ms);
  },
};
