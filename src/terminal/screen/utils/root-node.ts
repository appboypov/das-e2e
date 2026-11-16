import { OBSERVED_NAME_LIMIT, OBSERVED_TEXT_LIMIT, type SemanticNode } from 'e2e/engine';
import { CELL_HEIGHT, CELL_WIDTH, PADDING } from '../../shared/constants/geometry.ts';
import type { ScreenSnapshot } from '../models/screen-snapshot.ts';

/**
 * Builds the observation tree of the screen: a `terminal` root with one `text`
 * node per row, top row first. A blank row stays in the tree as `''`.
 */
export function rootNode(snapshot: ScreenSnapshot): SemanticNode {
  const { cols, rows } = snapshot;
  const children: SemanticNode[] = [];
  for (let n = 0; n < rows; n += 1) {
    children.push({
      ref: { id: `row-${n}`, revision: '' },
      role: 'text',
      text: (snapshot.lines[n] ?? '').slice(0, OBSERVED_TEXT_LIMIT),
      rect: { x: PADDING, y: PADDING + n * CELL_HEIGHT, width: cols * CELL_WIDTH, height: CELL_HEIGHT },
    });
  }

  const attributes: Record<string, string> = {
    cursorRow: String(snapshot.cursorRow),
    cursorColumn: String(snapshot.cursorColumn),
  };
  if (snapshot.exitCode !== undefined) attributes.exitCode = String(snapshot.exitCode);

  return {
    ref: { id: 'terminal', revision: '' },
    role: 'terminal',
    name: snapshot.name.slice(0, OBSERVED_NAME_LIMIT),
    rect: { x: 0, y: 0, width: 2 * PADDING + cols * CELL_WIDTH, height: 2 * PADDING + rows * CELL_HEIGHT },
    attributes,
    children,
  };
}
