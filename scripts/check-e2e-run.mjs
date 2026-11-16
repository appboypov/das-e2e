// Checks what the own e2e runs leave behind: a PNG of the screen for each
// attempt of the expected failure, and no fixture program that still runs.
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';

const pictureTest = 'a failing test leaves a picture of the screen';
const repeats = 3;
const output = '.e2e/terminal';
const pidsFolder = '.e2e/fixture-home/pids';
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const failures = [...pictureFailures(), ...leftoverFailures()];
rmSync(pidsFolder, { recursive: true, force: true });
for (const failure of failures) console.error(`check-e2e-run: ${failure}`);
if (failures.length > 0) process.exit(1);
console.log(`check-e2e-run: ${repeats} failure pictures found and no fixture program left running`);

function pictureFailures() {
  const report = JSON.parse(readFileSync(path.join(output, 'report.json'), 'utf8'));
  const results = report.run.results.filter((result) => result.titlePath.at(-1) === pictureTest);
  const failures = [];
  if (results.length !== repeats) failures.push(`"${pictureTest}" ran ${results.length} times, not ${repeats}`);
  for (const result of results) {
    for (const attempt of result.attempts) {
      const screenshot = attempt.artifacts.find((artifact) => artifact.kind === 'screenshot');
      const name = `"${pictureTest}" repeat ${result.repeat} attempt ${attempt.index + 1}`;
      if (screenshot === undefined) {
        failures.push(`${name} names no screenshot`);
        continue;
      }
      const file = path.join(output, 'results', screenshot.path);
      if (!existsSync(file)) failures.push(`${name} has no file ${file}`);
      else if (!readFileSync(file).subarray(0, pngSignature.length).equals(pngSignature)) failures.push(`${file} is no PNG`);
    }
  }
  return failures;
}

function leftoverFailures() {
  if (!existsSync(pidsFolder)) return [];
  return readdirSync(pidsFolder)
    .map(Number)
    .filter(isAlive)
    .map((pid) => `fixture program ${pid} still runs`);
}

/** Probes a pid with signal 0, which sends no signal. */
function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code !== 'ESRCH';
  }
}
