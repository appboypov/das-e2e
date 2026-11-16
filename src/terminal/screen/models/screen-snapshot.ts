/** What the observation tree is made of: the target name, the grid size, the rows and the cursor. */
export interface ScreenSnapshot {
  readonly name: string;
  readonly cols: number;
  readonly rows: number;
  readonly lines: readonly string[];
  readonly cursorRow: number;
  readonly cursorColumn: number;
  readonly exitCode: number | undefined;
}
