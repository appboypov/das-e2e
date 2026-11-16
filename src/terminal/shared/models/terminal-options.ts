/** The options of a terminal target in `e2e.config.ts`. */
export interface TerminalOptions {
  /** The program to start. */
  command: string;
  /** Its arguments. Default `[]`. */
  args?: readonly string[];
  /** Its working folder, resolved against the project root. Default `'.'`. */
  cwd?: string;
  /** Variables laid over the runner's environment. Default `{}`. */
  env?: Readonly<Record<string, string>>;
  /** Columns of the pseudo terminal. Default `100`. */
  cols?: number;
  /** Rows of the pseudo terminal. Default `30`. */
  rows?: number;
}
