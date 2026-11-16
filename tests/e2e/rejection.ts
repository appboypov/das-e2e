import assert from 'node:assert/strict';

/** What a refused call threw: its code, the code of its cause and both messages. */
export interface Rejection {
  readonly code: unknown;
  readonly causeCode: unknown;
  readonly messages: string;
}

/** Waits for a call that must throw, because e2e `expect` has no `rejects`. */
export async function rejectionOf(call: Promise<unknown>): Promise<Rejection> {
  try {
    await call;
  } catch (error) {
    assert.ok(error instanceof Error, 'the call threw no Error');
    const cause = error.cause;
    const causeError = cause instanceof Error ? cause : undefined;
    return {
      code: 'code' in error ? error.code : undefined,
      causeCode: causeError !== undefined && 'code' in causeError ? causeError.code : undefined,
      messages: [error.message, causeError?.message ?? ''].join('\n'),
    };
  }
  return assert.fail('the call did not throw');
}
