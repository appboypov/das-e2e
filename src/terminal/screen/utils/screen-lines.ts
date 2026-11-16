import type { Terminal } from '@xterm/headless';

/** Reads the visible rows of the screen model as text, without trailing blanks. */
export function screenLines(screen: Terminal, rows: number): string[] {
  const buffer = screen.buffer.active;
  const lines: string[] = [];
  for (let n = 0; n < rows; n += 1) {
    lines.push(buffer.getLine(buffer.baseY + n)?.translateToString(true) ?? '');
  }
  return lines;
}
