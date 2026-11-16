// The program the own e2e tests drive. In a pseudo terminal it shows a screen
// and answers lines and keys. With pipes it answers its arguments.
import { mkdirSync, writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

mkdirSync('pids', { recursive: true });
writeFileSync(`pids/${process.pid}`, process.stdout.isTTY ? 'tty' : 'pipe');

if (process.stdout.isTTY) {
  runScreen();
} else {
  await runPipes(process.argv.slice(2));
}

async function runPipes(args) {
  const [flag, value] = args;
  switch (flag) {
    case '--json':
      process.stdout.write('{"ok":true}\n');
      return;
    case '--fail':
      process.stderr.write('failed on purpose\n');
      process.exitCode = 3;
      return;
    case '--env':
      process.stdout.write(`${JSON.stringify({ [value]: process.env[value] ?? null })}\n`);
      return;
    case '--sleep':
      await sleep(Number(value));
      process.stdout.write('slept\n');
      return;
    default:
      process.stderr.write(`unknown arguments: ${args.join(' ')}\n`);
      process.exitCode = 2;
  }
}

function runScreen() {
  const size = () => `size ${process.stdout.columns}x${process.stdout.rows}\r\n`;
  const bye = () => {
    process.stdout.write('bye\r\n', () => process.exit(130));
  };

  process.stdout.on('resize', () => process.stdout.write(size()));
  // ConPTY on Windows can turn Control+c into a signal.
  process.on('SIGINT', bye);

  process.stdin.setRawMode(true);
  let keysMode = false;
  let line = '';
  process.stdin.on('data', (chunk) => {
    if (chunk.includes(0x03)) {
      bye();
      return;
    }
    if (keysMode) {
      process.stdout.write(`keys: ${chunk.toString('hex')};\r\n`);
      return;
    }
    for (const char of chunk.toString('utf8')) {
      if (char !== '\r') {
        line += char;
        continue;
      }
      answerLine(line);
      line = '';
    }
  });
  // The first screen shows once raw input is on, so a test that waits for it can type at once.
  process.stdout.write('ready\r\n');
  process.stdout.write('\x1b[31mred\x1b[0m \x1b[1mbold\x1b[0m\r\n');
  process.stdout.write(size());

  function answerLine(text) {
    switch (text) {
      case 'keys':
        keysMode = true;
        process.stdout.write('keys mode\r\n');
        return;
      case 'app-cursor':
        process.stdout.write('\x1b[?1happ cursor\r\n');
        return;
      case 'normal-cursor':
        process.stdout.write('\x1b[?1lnormal cursor\r\n');
        return;
      default:
        process.stdout.write(`got: ${text}\r\n`);
    }
  }
}
