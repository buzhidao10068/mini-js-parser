import type { Color } from './draw';
import type { Span } from './span';

type DeepRequired<T> = T extends (...args: unknown[]) => unknown
  ? T
  : T extends (infer U)[]
    ? DeepRequired<U>[]
    : T extends object
      ? { [P in keyof T]-?: DeepRequired<Exclude<T[P], undefined>> }
      : T;

interface LabelDisplay {
  msg: string | null;
  color?: Color | null;
  order?: number;
  priority?: number;
}

export enum LabelAttach {
  Start = 'start',
  Middle = 'middle',
  End = 'end',
}

export interface LabelConfig {
  span: Span;
  displayInfo: LabelDisplay;
}
// oxlint-disable-next-line typescript/no-empty-object-type
export interface Label extends DeepRequired<LabelConfig> {}

export interface LabelLineInfo {
  lineIndex: number;
  startCol: number;
  endCol: number;
  attachCol: number;
  msg: string | null;
  order: number;
  color: Color | null;
}

export function createLabel(label: LabelConfig): Label {
  if (label.span.start > label.span.end) {
    throw new Error('标签的开始位置不能在结束位置之后');
  }

  return {
    span: label.span,
    displayInfo: Object.assign(
      {
        msg: null,
        color: null,
        order: 0,
        priority: 0,
      },
      label.displayInfo,
    ),
  };
}
