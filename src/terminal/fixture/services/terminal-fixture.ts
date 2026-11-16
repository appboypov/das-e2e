import { type EngineFixtureFactory, TestError } from 'e2e/engine';
import type { Terminal } from '../models/terminal.ts';
import type { TerminalActions } from '../models/terminal-actions.ts';

/** The `terminal` fixture: gives a test the key, text and resize input that e2e routes only to agents. */
export function terminalFixture(actions: TerminalActions): EngineFixtureFactory {
  return (ctx) => {
    const terminal: Terminal = {
      press: (key) => actions.pressKey(key, ctx.operation()),
      type: (text, options) => actions.typeText(text, { replace: options?.replace === true }, ctx.operation()),
      resize: async (size) => {
        if (!Number.isFinite(size?.width) || !Number.isFinite(size?.height)) {
          throw new TestError('INVALID_ARGUMENT', 'terminal.resize takes { width, height } in pixels');
        }
        await actions.resizeTo({ width: size.width, height: size.height }, ctx.operation());
      },
    };
    return ctx.fixture('terminal', terminal, {
      press: { kind: 'resource', label: (key) => key, timeout: false },
      type: { kind: 'resource', label: (text) => `${text.length} chars`, timeout: false },
      resize: { kind: 'resource', label: (size) => `${size.width}x${size.height}`, timeout: false },
    });
  };
}
