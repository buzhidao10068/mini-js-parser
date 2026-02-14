export interface Characters {
  hbar: string;
  vbar: string;
  xbar: string;
  vbarGap: string;
  lineMargin: string;
  uarrow: string;
  rarrow: string;
  ltop: string;
  mtop: string;
  rtop: string;
  lbot: string;
  rbot: string;
  mbot: string;
  lbox: string;
  rbox: string;
  lcross: string;
  rcross: string;
  lunderbar: string;
  runderbar: string;
  munderbar: string;
  underline: string;
  underbarSingle: string;
}

export enum CharSet {
  Unicode = 'unicode',
  Ascii = 'ascii',
}

export const unicodeCharacters = (): Characters => ({
  hbar: '─',
  vbar: '│',
  xbar: '┼',
  vbarGap: '┆',
  lineMargin: '┤',
  uarrow: '▲',
  rarrow: '▶',
  ltop: '╭',
  mtop: '┬',
  rtop: '╮',
  lbot: '╰',
  rbot: '╯',
  mbot: '┴',
  lbox: '┤',
  rbox: '│',
  lcross: '├',
  rcross: '┤',
  lunderbar: '┌',
  runderbar: '┐',
  munderbar: '┬',
  underline: '─',
  underbarSingle: '▲',
});

export const asciiCharacters = (): Characters => ({
  hbar: '-',
  vbar: '|',
  xbar: '+',
  vbarGap: ':',
  lineMargin: '|',
  uarrow: '^',
  rarrow: '>',
  ltop: ',',
  mtop: 'v',
  rtop: '.',
  lbot: '`',
  rbot: "'",
  mbot: '-',
  lbox: '[',
  rbox: ']',
  lcross: '|',
  rcross: '|',
  lunderbar: '-',
  runderbar: '-',
  munderbar: '-',
  underline: '-',
  underbarSingle: '^',
});

export type ColorKind = 'basic' | 'fixed';

export type BasicColorName =
  | 'black'
  | 'red'
  | 'green'
  | 'yellow'
  | 'blue'
  | 'magenta'
  | 'cyan'
  | 'white';

export interface Color {
  readonly kind: ColorKind;
  readonly value: number | BasicColorName;
}

export function createColor(kind: ColorKind, value: number | BasicColorName): Color {
  return { kind, value };
}

export function fixedColor(value: number): Color {
  const clamped = Math.max(0, Math.min(255, Math.floor(value)));
  return createColor('fixed', clamped);
}

export const Black = createColor('basic', 'black');
export const Red = createColor('basic', 'red');
export const Green = createColor('basic', 'green');
export const Yellow = createColor('basic', 'yellow');
export const Blue = createColor('basic', 'blue');
export const Magenta = createColor('basic', 'magenta');
export const Cyan = createColor('basic', 'cyan');
export const White = createColor('basic', 'white');

function basicColorToCode(name: BasicColorName): number {
  switch (name) {
    case 'black':
      return 30;
    case 'red':
      return 31;
    case 'green':
      return 32;
    case 'yellow':
      return 33;
    case 'blue':
      return 34;
    case 'magenta':
      return 35;
    case 'cyan':
      return 36;
    case 'white':
      return 37;
  }
}

function ansiFg(color: Color): string {
  if (color.kind === 'fixed') {
    return `\u001b[38;5;${color.value}m`;
  }
  return `\u001b[${basicColorToCode(color.value as BasicColorName)}m`;
}

function ansiBg(color: Color): string {
  if (color.kind === 'fixed') {
    return `\u001b[48;5;${color.value}m`;
  }
  return `\u001b[${basicColorToCode(color.value as BasicColorName) + 10}m`;
}

export function fg(value: string, color: Color | null): string {
  if (!color) {
    return value;
  }
  return `${ansiFg(color)}${value}\u001b[0m`;
}

export function bg(value: string, color: Color | null): string {
  if (!color) {
    return value;
  }
  return `${ansiBg(color)}${value}\u001b[0m`;
}

export function stripAnsi(value: string): string {
  return value.replace(/\u001b\[[0-9;]*m/g, '');
}

export function errorColor(is: boolean): Color | null {
  return is ? Red : null;
}

export function warningColor(is: boolean): Color | null {
  return is ? Yellow : null;
}

export function adviceColor(is: boolean): Color | null {
  return is ? fixedColor(147) : null;
}

export function marginColor(is: boolean): Color | null {
  return is ? fixedColor(246) : null;
}

export function noteColor(is: boolean): Color | null {
  return is ? fixedColor(115) : null;
}

export function skippedMarginColor(is: boolean): Color | null {
  return is ? fixedColor(240) : null;
}

export function unimportantColor(is: boolean): Color | null {
  return is ? fixedColor(249) : null;
}