import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Clock } from '../../../core/models/clock.ts';
import { settle } from './settle.ts';

/** A clock that only moves when the code under test sleeps, and then lets the program act. */
class FakeClock implements Clock {
  t = 0;
  readonly onTick: (t: number) => void;
  constructor(onTick: (t: number) => void = () => {}) {
    this.onTick = onTick;
  }
  now(): number {
    return this.t;
  }
  async sleep(ms: number): Promise<void> {
    this.t += ms;
    this.onTick(this.t);
  }
}

function program() {
  return {
    pendingWrites: 0,
    lastOutputAt: 0,
    exited: false,
    paused: false,
    pauses: 0,
    pause() {
      this.paused = true;
      this.pauses += 1;
    },
  };
}

const open = { timeoutMs: 30_000, signal: new AbortController().signal };

describe('settle', () => {
  it('given a silent program, when it settles, then it is quiet 100 ms after the start', async () => {
    const subject = program();
    const clock = new FakeClock();
    assert.equal(await settle(subject, open, clock), 'quiet');
    assert.equal(clock.t, 100);
  });

  it('given output every 50 ms until 300, when it settles, then it is quiet no sooner than 400', async () => {
    const subject = program();
    const clock = new FakeClock((t) => {
      if (t <= 300 && t % 50 === 0) subject.lastOutputAt = t;
    });
    assert.equal(await settle(subject, open, clock), 'quiet');
    assert.ok(clock.t >= 400, `settled at ${clock.t}`);
  });

  it('given a write that stays open until 250, when it settles, then it is quiet only after the write ends', async () => {
    const subject = program();
    subject.pendingWrites = 1;
    const clock = new FakeClock((t) => {
      if (t >= 250) subject.pendingWrites = 0;
    });
    assert.equal(await settle(subject, open, clock), 'quiet');
    assert.ok(clock.t >= 250, `settled at ${clock.t}`);
  });

  it('given a program that exits at 30, when it settles, then it answers exited before the quiet time', async () => {
    const subject = program();
    const clock = new FakeClock((t) => {
      if (t >= 30) subject.exited = true;
    });
    assert.equal(await settle(subject, open, clock), 'exited');
    assert.ok(clock.t < 100, `settled at ${clock.t}`);
  });

  it('given endless output and a 250 ms timeout, when it settles, then it pauses once at the deadline and drains the writes', async () => {
    const subject = program();
    const clock = new FakeClock((t) => {
      if (subject.paused) {
        subject.pendingWrites = 0;
      } else {
        subject.pendingWrites = 1;
        subject.lastOutputAt = t;
      }
    });
    assert.equal(await settle(subject, { ...open, timeoutMs: 250 }, clock), 'deadline');
    assert.equal(subject.pauses, 1);
    assert.equal(subject.pendingWrites, 0);
    assert.ok(clock.t >= 250 && clock.t < 270, `settled at ${clock.t}`);
  });

  it('given output until 1000 and a timeout of 0, when it settles, then it waits past any deadline until quiet', async () => {
    const subject = program();
    const clock = new FakeClock((t) => {
      if (t <= 1000) subject.lastOutputAt = t;
    });
    assert.equal(await settle(subject, { ...open, timeoutMs: 0 }, clock), 'quiet');
    assert.ok(clock.t >= 1100, `settled at ${clock.t}`);
  });

  it('given an aborted signal and endless output, when it settles, then it answers cancelled after a pause', async () => {
    const subject = program();
    const clock = new FakeClock((t) => {
      subject.lastOutputAt = t;
    });
    const controller = new AbortController();
    controller.abort();
    assert.equal(await settle(subject, { timeoutMs: 30_000, signal: controller.signal }, clock), 'cancelled');
    assert.equal(subject.pauses, 1);
  });
});
