import { normalizeConfig, type Config } from './config';
import {
  asciiCharacters,
  CharSet,
  fg,
  fixedColor,
  marginColor,
  noteColor,
  Red,
  stripAnsi,
  unicodeCharacters,
  Yellow,
  type Color,
} from './draw';
import type { Label, LabelLineInfo } from './label';
import type { Span } from './span';
import { LabelAttach } from './label';
import { createSource, createSourceCache } from './source';

export enum IndexType {
  Byte = 'byte',
  Char = 'char',
}

export enum AnsiMode {
  Off = 'off',
  On = 'on',
}

export enum ReportKind {
  Error = 'Error',
  Warning = 'Warning',
  Advice = 'Advice',
}

export interface BasicStyle {
  name: string;
  color: Color;
}

export type ReportStyle = ReportKind | BasicStyle | string;

interface ReportConfig {
  kind?: ReportStyle;
  code?: string | null;
  msg?: string | null;
  notes?: string[];
  help?: string[];
  span: Span;
  labels?: Label[];
  config?: Config;
}

// oxlint-disable-next-line typescript/no-empty-object-type
interface Report extends Required<ReportConfig> {}

export function createBasicStyle(name: string, color: Color): BasicStyle {
  return {
    name,
    color,
  };
}

type ForbiddenKeys = 'config';
type AllowedKeys = Exclude<keyof Report, ForbiddenKeys>;
type UpdateValue<K extends AllowedKeys> = Report[K] extends (infer U)[] ? U : Report[K];

export function createReport(reportConfig: ReportConfig) {
  reportConfig.config = normalizeConfig(reportConfig.config);
  let report: Report = Object.assign(
    {
      kind: ReportKind.Error,
      code: null,
      msg: null,
      notes: [],
      help: [],
      span: {},
      labels: [],
      config: {},
    },
    reportConfig,
  );

  const reportFn = {
    setReportField,
    setLabels,
    setConfig,
    writeToString,
  };

  return reportFn;

  function setReportField<K extends AllowedKeys>(key: K, value: UpdateValue<K>) {
    const currentValue = report[key];

    if (Array.isArray(currentValue)) {
      (currentValue as unknown[]).push(value);
    } else {
      (report as unknown as Record<K, UpdateValue<K>>)[key] = value;
    }

    return reportFn;
  }

  function setLabels(labels: Label[]) {
    for (const label of labels) {
      setReportField('labels', label);
    }
  }

  function setConfig(config: Config) {
    report.config = config;
  }

  function writeToString(cache: ReturnType<typeof createSourceCache>): string {
    return renderReport(report, cache);
  }
}

export function writeToString(report: Report, cache: ReturnType<typeof createSourceCache>): string {
  return renderReport(report, cache);
}

function getLineAndCol(
  src: ReturnType<typeof createSource>,
  offset: number,
  indexType: IndexType,
): [number, number] | null {
  const lineAndCol =
    indexType === IndexType.Char ? src.getOffsetLine(offset) : src.getByteLine(offset);
  if (!lineAndCol) {
    return null;
  }
  // oxlint-disable-next-line no-unused-vars
  const [_, idx, col] = lineAndCol;
  return [idx, col];
}

function attachColumn(startCol: number, endCol: number, attach: LabelAttach): number {
  if (attach === LabelAttach.Start) {
    return startCol;
  }
  if (attach === LabelAttach.End) {
    return Math.max(startCol, endCol - 1);
  }
  return Math.floor((startCol + endCol) / 2);
}

function underlineWithMarker(
  length: number,
  markerIndex: number,
  hbar: string,
  marker: string,
): string {
  if (length <= 0) {
    return '';
  }
  const chars = Array.from(hbar.repeat(length));
  const idx = Math.max(0, Math.min(length - 1, markerIndex));
  chars[idx] = marker;
  return chars.join('');
}

function reportStyleName(style: ReportStyle): string {
  if (typeof style === 'string') {
    return style;
  }
  return style.name ?? style;
}

function reportStyleColor(style: ReportStyle, config: Config): Color | null {
  if (typeof style === 'object' && style !== null && 'color' in style) {
    return config.color ? style.color : null;
  }
  if (style === ReportKind.Error) {
    return Red;
  }
  if (style === ReportKind.Warning) {
    return Yellow;
  }
  if (style === ReportKind.Advice) {
    return fixedColor(147);
  }
  return null;
}

function renderReport(report: Report, cache: ReturnType<typeof createSourceCache>): string {
  const srcId = report.span.sourceId ?? '<unknown>';
  const srcName = srcId;
  const src = cache.fetch(srcId);
  const draw = report.config.charSet === CharSet.Ascii ? asciiCharacters() : unicodeCharacters();
  const lineAndCol = getLineAndCol(src, report.span.start, report.config.indexType);
  const lineNo = lineAndCol ? lineAndCol[0] + 1 + src.getSourceValue('displayLineOffset') : '?';
  const colNo = lineAndCol ? lineAndCol[1] + 1 : '?';
  const lineRef = `${srcName}:${lineNo}:${colNo}`;

  const isColor = report.config.color;

  const labelLines: LabelLineInfo[] = [];
  for (const label of report.labels) {
    if (label.span.sourceId !== report.span.sourceId) {
      continue;
    }
    const startInfo = getLineAndCol(src, label.span.start, report.config.indexType);
    const endInfo = getLineAndCol(
      src,
      Math.max(label.span.end - 1, label.span.start),
      report.config.indexType,
    );
    if (!startInfo || !endInfo || startInfo[0] !== endInfo[0]) {
      continue;
    }
    const lineIndex = startInfo[0];
    const lineObj = src.getLine(lineIndex);
    if (!lineObj) {
      continue;
    }
    const startCol = label.span.start - lineObj.offset;
    const endCol = Math.max(startCol + 1, label.span.end - lineObj.offset);
    const attachColValue = attachColumn(startCol, endCol, report.config.labelAttach);
    labelLines.push({
      lineIndex,
      startCol,
      endCol,
      attachCol: attachColValue,
      msg: label.displayInfo.msg,
      order: label.displayInfo.order,
      color: label.displayInfo.color,
    });
  }

  labelLines.sort((a, b) => a.order - b.order || a.lineIndex - b.lineIndex);

  const lineIndices = Array.from(new Set(labelLines.map((l) => l.lineIndex))).sort((a, b) => a - b);
  const lineNoWidth = Math.max(
    1,
    ...lineIndices.map((idx) => String(idx + 1 + src.getSourceValue('displayLineOffset')).length),
  );
  const indent = ' '.repeat(lineNoWidth + 1);

  const codePrefix = report.code ? `[${report.code}]` : '';
  const headerLabel = `${reportStyleName(report.kind)}${codePrefix}`;
  const header = `${fg(headerLabel, reportStyleColor(report.kind, report.config))}: ${showOptional(report.msg)}`;

  const lines: string[] = [
    header,
    `${indent}${fg(`${draw.ltop}${draw.hbar}[`, marginColor(isColor))}${lineRef}${fg(']', marginColor(isColor))}`,
    `${indent}${fg(draw.vbar, marginColor(isColor))}`,
  ];

  let lastLineIndex: number | null = null;
  const messageColumn = 25;

  for (const lineIndex of lineIndices) {
    if (lastLineIndex !== null && lineIndex - lastLineIndex > 1) {
      lines.push('...');
    }
    const lineObj = src.getLine(lineIndex);
    const lineText = lineObj ? (src.getLineText(lineObj) ?? '') : '';
    const trimmedLine = lineText.replace(/\s+$/, '');
    const lineNoText = String(lineIndex + 1 + src.getSourceValue('displayLineOffset')).padStart(
      lineNoWidth,
      ' ',
    );
    const marginPrefix = `${lineNoText} ${draw.vbar}`;
    lines.push(`${fg(marginPrefix, marginColor(isColor))} ${trimmedLine}`);

    const lineLabels = labelLines.filter((l) => l.lineIndex === lineIndex);
    for (const labelInfo of lineLabels) {
      const underlineLen = Math.max(1, labelInfo.endCol - labelInfo.startCol);
      const underline = underlineWithMarker(
        underlineLen,
        labelInfo.attachCol - labelInfo.startCol,
        draw.hbar,
        draw.munderbar,
      );
      const underlineText = fg(underline, isColor ? labelInfo.color : null);
      lines.push(
        `${indent}${fg(draw.vbar, marginColor(isColor))} ${' '.repeat(labelInfo.startCol)}${underlineText}`,
      );
      if (labelInfo.msg) {
        const tailLen = Math.max(1, messageColumn - labelInfo.attachCol - 1);
        const arrow = fg(
          `${draw.lbot}${draw.hbar.repeat(tailLen)}`,
          isColor ? labelInfo.color : null,
        );
        lines.push(
          `${indent}${fg(draw.vbar, marginColor(isColor))} ${' '.repeat(labelInfo.attachCol)}${arrow} ${labelInfo.msg}`,
        );
      }
    }

    lastLineIndex = lineIndex;
  }

  lines.push(fg(`${draw.hbar.repeat(lineNoWidth + 1)}${draw.rbot}`, marginColor(isColor)));

  for (const note of report.notes) {
    lines.push(`${fg('note', noteColor(isColor))}: ${note}`);
  }
  for (const help of report.help) {
    lines.push(`${fg('help', noteColor(isColor))}: ${help}`);
  }

  const result = lines.join('\n');
  if (report.config.ansiMode === AnsiMode.Off) {
    return stripAnsi(result);
  }
  return result;
}

function showOptional(value: string | undefined | null): string {
  if (value === undefined || value === null) {
    return '';
  }
  return value;
}
