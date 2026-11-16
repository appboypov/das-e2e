import { EngineError, type KeyName, parseKey, TestError } from 'e2e/engine';

/**
 * Translates a key of the e2e key grammar into the bytes a terminal sends for
 * it. `applicationCursor` is the DECCKM mode of the screen, which changes the
 * arrows, Home and End. A key a terminal cannot send is refused with
 * `UNSUPPORTED_CAPABILITY`.
 */
export function keyBytes(key: string, applicationCursor: boolean, platform: NodeJS.Platform): string {
  const parsed = parseKey(key);
  if (parsed === undefined) {
    throw new TestError('INVALID_ARGUMENT', `terminal: "${key}" is no key of the e2e key grammar`);
  }
  const refuse = (): never => {
    throw new EngineError('UNSUPPORTED_CAPABILITY', `terminal: ${key} has no terminal bytes`, {
      retryable: false,
    });
  };

  const { modifiers } = parsed;
  const has = (modifier: (typeof modifiers)[number]): boolean => modifiers.includes(modifier);
  if (has('Meta') || (has('ControlOrMeta') && platform === 'darwin')) refuse();
  const control = has('Control') || has('ControlOrMeta');

  if (parsed.key.kind === 'char') {
    const { char } = parsed.key;
    if (control) {
      if (/^[a-z]$/i.test(char) && !has('Alt') && !has('Shift')) {
        return String.fromCharCode(char.toLowerCase().charCodeAt(0) - 96);
      }
      return refuse();
    }
    const typed = has('Shift') ? char.toUpperCase() : char;
    return (has('Alt') ? '\x1b' : '') + typed;
  }

  const { name } = parsed.key;
  if (modifiers.length === 1 && has('Shift') && name === 'Tab') return '\x1b[Z';
  if (modifiers.length > 0) return refuse();
  return namedKeyBytes(name, applicationCursor);
}

function namedKeyBytes(name: KeyName, applicationCursor: boolean): string {
  const cursor = (final: string): string => (applicationCursor ? '\x1bO' : '\x1b[') + final;
  switch (name) {
    case 'Enter':
      return '\r';
    case 'Tab':
      return '\t';
    case 'Escape':
      return '\x1b';
    case 'Backspace':
      return '\x7f';
    case 'Space':
      return ' ';
    case 'Delete':
      return '\x1b[3~';
    case 'Insert':
      return '\x1b[2~';
    case 'PageUp':
      return '\x1b[5~';
    case 'PageDown':
      return '\x1b[6~';
    case 'ArrowUp':
      return cursor('A');
    case 'ArrowDown':
      return cursor('B');
    case 'ArrowRight':
      return cursor('C');
    case 'ArrowLeft':
      return cursor('D');
    case 'Home':
      return cursor('H');
    case 'End':
      return cursor('F');
    case 'F1':
      return '\x1bOP';
    case 'F2':
      return '\x1bOQ';
    case 'F3':
      return '\x1bOR';
    case 'F4':
      return '\x1bOS';
    case 'F5':
      return '\x1b[15~';
    case 'F6':
      return '\x1b[17~';
    case 'F7':
      return '\x1b[18~';
    case 'F8':
      return '\x1b[19~';
    case 'F9':
      return '\x1b[20~';
    case 'F10':
      return '\x1b[21~';
    case 'F11':
      return '\x1b[23~';
    case 'F12':
      return '\x1b[24~';
  }
}
