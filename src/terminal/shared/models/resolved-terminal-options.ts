/** `TerminalOptions` after validation, with every default filled in. */
export interface ResolvedTerminalOptions {
  command: string;
  args: readonly string[];
  cwd: string;
  env: Readonly<Record<string, string>>;
  cols: number;
  rows: number;
}
