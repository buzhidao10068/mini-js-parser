import { CharSet } from './draw';
import { LabelAttach } from './label';
import { AnsiMode, IndexType } from './report';

export interface Config {
  crossGap: boolean;
  labelAttach: LabelAttach;
  compact: boolean;
  underlines: boolean;
  multilineArrows: boolean;
  color: boolean;
  tabWidth: number;
  charSet: CharSet;
  indexType: IndexType;
  minimiseCrossings: boolean;
  contextLines: number;
  ansiMode: AnsiMode;
  enumerateNotes: boolean;
  enumerateHelps: boolean;
}

export function normalizeConfig(config?: Config): Config {
  return Object.assign(
    {
      crossGap: true,
      labelAttach: LabelAttach.Middle,
      compact: false,
      underlines: true,
      multilineArrows: true,
      color: true,
      tabWidth: 4,
      charSet: CharSet.Unicode,
      indexType: IndexType.Char,
      minimiseCrossings: false,
      contextLines: 0,
      ansiMode: AnsiMode.On,
      enumerateNotes: true,
      enumerateHelps: true,
    },
    config,
  );
}

export function charWidth(char: string, col: number, tabWidth: number): [string, number] {
  if (char === '\t') {
    const tabEnd = Math.floor(col / tabWidth + 1) * tabWidth;
    return [' ', tabEnd - col];
  }
  if (char.trim() === '') {
    return [' ', 1];
  }
  return [char, 1];
}