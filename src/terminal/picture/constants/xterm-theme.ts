/** The default theme of xterm.js 6.0.0. */
export const XTERM_THEME = {
  background: '#000000',
  foreground: '#ffffff',
  cursor: '#ffffff',
  ansi: [
    '#2e3436',
    '#cc0000',
    '#4e9a06',
    '#c4a000',
    '#3465a4',
    '#75507b',
    '#06989a',
    '#d3d7cf',
    '#555753',
    '#ef2929',
    '#8ae234',
    '#fce94f',
    '#729fcf',
    '#ad7fa8',
    '#34e2e2',
    '#eeeeec',
  ],
} as const;

const CUBE_LEVELS = [0, 95, 135, 175, 215, 255] as const;

/** The colour of a 256-colour palette index: the 16 theme colours, the 6 × 6 × 6 cube, then the grey ramp. */
export function paletteColor(index: number): string {
  const ansi = XTERM_THEME.ansi[index];
  if (ansi !== undefined) return ansi;
  if (index < 232) {
    const cube = index - 16;
    return hexColor(
      CUBE_LEVELS[Math.floor(cube / 36) % 6] ?? 0,
      CUBE_LEVELS[Math.floor(cube / 6) % 6] ?? 0,
      CUBE_LEVELS[cube % 6] ?? 0,
    );
  }
  const grey = 8 + (index - 232) * 10;
  return hexColor(grey, grey, grey);
}

/** Writes an RGB colour as lowercase `#rrggbb`. */
export function hexColor(red: number, green: number, blue: number): string {
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}
