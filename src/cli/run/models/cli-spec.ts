/** The target's command as `init` resolved it: program, fixed arguments, folder and environment. */
export interface CliSpec {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
  readonly env: Readonly<Record<string, string>>;
}
