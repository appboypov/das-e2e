/** What one `cli.run` call answers once the program ended. */
export interface CliRunResult {
  /** The exit code, or `null` when a signal ended the program. */
  exitCode: number | null;
  /** Standard output as UTF-8, untouched. */
  stdout: string;
  /** Standard error as UTF-8, untouched. */
  stderr: string;
  /** Standard output parsed as JSON, set only when it parses. */
  json?: unknown;
}
