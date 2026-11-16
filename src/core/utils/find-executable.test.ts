import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { findExecutable } from './find-executable.ts';

const nodeFolder = path.dirname(process.execPath);
const nodeName = path.basename(process.execPath, path.extname(process.execPath));

describe('findExecutable', () => {
  it('given an absolute path to a program, when found, then it answers that path', () => {
    assert.equal(findExecutable(process.execPath, {}, process.cwd(), process.platform), process.execPath);
  });

  it('given a program name on PATH, when found, then it answers the file in that folder', () => {
    const found = findExecutable(nodeName, { PATH: nodeFolder }, process.cwd(), process.platform);
    assert.equal(found?.toLowerCase(), process.execPath.toLowerCase());
  });

  it('given PATH under the key Path, when found, then it reads that key', () => {
    const found = findExecutable(nodeName, { Path: nodeFolder }, process.cwd(), process.platform);
    assert.equal(found?.toLowerCase(), process.execPath.toLowerCase());
  });

  it('given a program that is on no PATH folder, when found, then it answers undefined', () => {
    const found = findExecutable('das-e2e-missing-command', { PATH: nodeFolder }, process.cwd(), process.platform);
    assert.equal(found, undefined);
  });
});
