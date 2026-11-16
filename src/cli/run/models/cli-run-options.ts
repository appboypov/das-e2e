/** Options of one `cli.run` call. */
export interface CliRunOptions {
  /** Variables laid over the target's environment for this one run. */
  env?: Readonly<Record<string, string>>;
}
