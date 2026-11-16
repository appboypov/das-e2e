/** The `terminal` fixture: input and size of the pseudo terminal. */
export interface Terminal {
  /** Sends one key of the e2e key grammar, such as `Enter` or `Control+c`. */
  press(key: string): Promise<void>;
  /** Sends text as typed. `replace` is refused, as a terminal has no field to clear. */
  type(text: string, options?: { replace?: boolean }): Promise<void>;
  /** Sets the screen size in pixels; the grid gets as many cells as fit. */
  resize(size: { width: number; height: number }): Promise<void>;
}
