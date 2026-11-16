import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

/** The bundled DejaVu Sans Mono faces. `src/` and `dist/` sit at the same depth, so the path holds in both. */
const FONT_FILES = [
  'DejaVuSansMono.ttf',
  'DejaVuSansMono-Bold.ttf',
  'DejaVuSansMono-Oblique.ttf',
  'DejaVuSansMono-BoldOblique.ttf',
].map((file) => fileURLToPath(new URL(`../../../../fonts/${file}`, import.meta.url)));

/** Renders an SVG of the screen to PNG with the bundled fonts only, so each machine draws the same picture. */
export function renderPng(svg: string): Buffer {
  return new Resvg(svg, {
    font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'DejaVu Sans Mono' },
  })
    .render()
    .asPng();
}
