import type { OperationContext, ViewportSize } from 'e2e/engine';

/** The engine's input functions that the `terminal` fixture calls. */
export interface TerminalActions {
  pressKey(key: string, context: OperationContext): Promise<void>;
  typeText(text: string, options: { readonly replace: boolean }, context: OperationContext): Promise<void>;
  resizeTo(size: ViewportSize, context: OperationContext): Promise<void>;
}
