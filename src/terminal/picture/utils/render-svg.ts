import { CELL_HEIGHT, CELL_WIDTH, FONT_SIZE, PADDING } from '../../shared/constants/geometry.ts';
import { hexColor, paletteColor, XTERM_THEME } from '../constants/xterm-theme.ts';
import type { ColorRef } from '../models/color-ref.ts';
import type { ScreenGrid } from '../models/screen-grid.ts';

/** Draws the screen grid as an SVG in the xterm.js default theme and DejaVu Sans Mono. */
export function renderSvg(grid: ScreenGrid): string {
  const width = 2 * PADDING + grid.cols * CELL_WIDTH;
  const height = 2 * PADDING + grid.rows * CELL_HEIGHT;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect x="0" y="0" width="${width}" height="${height}" fill="${XTERM_THEME.background}"/>`,
  ];

  grid.cells.forEach((row, n) => {
    row.forEach((cell, c) => {
      if (cell.width === 0) return;
      let fg = themeColor(cell.fg, XTERM_THEME.foreground);
      let bg = themeColor(cell.bg, XTERM_THEME.background);
      if (cell.inverse) [fg, bg] = [bg, fg];
      const x = PADDING + c * CELL_WIDTH;
      const y = PADDING + n * CELL_HEIGHT;
      if (bg !== XTERM_THEME.background) {
        parts.push(`<rect x="${x}" y="${y}" width="${CELL_WIDTH * cell.width}" height="${CELL_HEIGHT}" fill="${bg}"/>`);
      }
      if (cell.char !== '' && cell.char !== ' ') {
        const weight = cell.bold ? ' font-weight="bold"' : '';
        const style = cell.italic ? ' font-style="oblique"' : '';
        parts.push(
          `<text x="${x}" y="${y + FONT_SIZE}" font-family="DejaVu Sans Mono" font-size="${FONT_SIZE}"${weight}${style} fill="${fg}">${escapeXml(cell.char)}</text>`,
        );
      }
    });
  });

  if (grid.cursor !== undefined) {
    const x = PADDING + grid.cursor.column * CELL_WIDTH;
    const y = PADDING + grid.cursor.row * CELL_HEIGHT;
    parts.push(
      `<rect x="${x}" y="${y}" width="${CELL_WIDTH}" height="${CELL_HEIGHT}" fill="none" stroke="${XTERM_THEME.cursor}"/>`,
    );
  }

  parts.push('</svg>');
  return parts.join('');
}

function themeColor(color: ColorRef, fallback: string): string {
  switch (color.kind) {
    case 'default':
      return fallback;
    case 'palette':
      return paletteColor(color.index);
    case 'rgb':
      return hexColor((color.value >> 16) & 0xff, (color.value >> 8) & 0xff, color.value & 0xff);
  }
}

const XML_ENTITIES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

function escapeXml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => XML_ENTITIES[char] ?? char);
}
