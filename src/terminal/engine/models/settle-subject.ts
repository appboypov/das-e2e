/** What the settle rule reads of a running program. */
export interface SettleSubject {
  /** Output chunks that the screen model has not applied yet. */
  readonly pendingWrites: number;
  /** Clock time of the last output chunk, or of the start. */
  readonly lastOutputAt: number;
  /** Whether the program ended. */
  readonly exited: boolean;
  /** Stops the flow of new output, so the screen can be read as it is. */
  pause(): void;
}
