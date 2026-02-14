export interface Line {
  offset: number;
  charLen: number;
  byteOffset: number;
  byteLen: number;
}

const lineTerminators = new Set(['\n', '\r', '\u000b', '\u000c', '\u0085', '\u2028', '\u2029']);

const splitLines = (input: string): string[] => {
  if (input.length === 0) {
    return [''];
  }
  const lines: string[] = [];
  let current = '';
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    current += ch;
    if (ch === '\r' && input[i + 1] === '\n') {
      current += '\n';
      i += 1;
      lines.push(current);
      current = '';
      continue;
    }
    if (lineTerminators.has(ch)) {
      lines.push(current);
      current = '';
    }
  }
  if (current.length > 0) {
    lines.push(current);
  } else if (input.length > 0 && lineTerminators.has(input[input.length - 1])) {
    lines.push('');
  }
  return lines;
};

const countChars = (value: string): number => Array.from(value).length;

const byteLength = (value: string): number => new TextEncoder().encode(value).length;

export interface Source {
  readonly text: string;
  readonly linesData: Line[];
  readonly len: number;
  readonly byteLen: number;
  displayLineOffset: number;
}

export type SourceFn = ReturnType<typeof createSource>;

export function createSource(input: string) {
  let text = input;
  const lines = splitLines(input);
  const lineData: Line[] = [];
  let charOffset = 0;
  let byteOffset = 0;
  for (const line of lines) {
    const charLen = countChars(line);
    const bytes = byteLength(line);
    lineData.push({
      offset: charOffset,
      charLen,
      byteOffset,
      byteLen: bytes,
    });
    charOffset += charLen;
    byteOffset += bytes;
  }

  let source: Source = {
    text,
    linesData: lineData,
    len: charOffset,
    byteLen: byteOffset,
    displayLineOffset: 0,
  };

  return {
    getSourceValue,
    getOffsetLine,
    getByteLine,
    getLineRange,
    getLineText,
    getLine,
    getLines,
    setDisplayLineOffset,
  };

  function getSourceValue<K extends keyof Source>(key: K): Source[K] {
    return source[key];
  }

  function getOffsetLine(offset: number): [Line, number, number] | null {
    if (offset > source.len) {
      return null;
    }
    let low = 0;
    let high = source.linesData.length - 1;
    let idx = 0;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const line = source.linesData[mid];
      if (offset < line.offset) {
        high = mid - 1;
      } else {
        idx = mid;
        low = mid + 1;
      }
    }
    const line = source.linesData[idx] ?? null;
    if (!line) {
      return null;
    }
    return [line, idx, offset - line.offset];
  }

  function getByteLine(byteOffset: number): [Line, number, number] | null {
    if (byteOffset > source.byteLen) {
      return null;
    }
    let low = 0;
    let high = source.linesData.length - 1;
    let idx = 0;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const line = source.linesData[mid];
      if (byteOffset < line.byteOffset) {
        high = mid - 1;
      } else {
        idx = mid;
        low = mid + 1;
      }
    }
    const line = source.linesData[idx] ?? null;
    if (!line) {
      return null;
    }
    return [line, idx, byteOffset - line.byteOffset];
  }

  function getLineRange(start: number, end: number): [number, number] {
    const startLine = getOffsetLine(start);
    const endLine = getOffsetLine(Math.max(start, end - 1));
    const startIdx = startLine ? startLine[1] : 0;
    const endIdx = endLine ? endLine[1] + 1 : source.linesData.length;
    return [startIdx, endIdx];
  }

  function getLineText(line: Line): string | null {
    const lines = splitLines(source.text);
    const idx = source.linesData.findIndex((l) => l.offset === line.offset);
    if (idx < 0) {
      return null;
    }
    return lines[idx] ?? null;
  }

  function getLine(idx: number): Line | null {
    return source.linesData[idx] ?? null;
  }

  function getLines(): Line[] {
    return source.linesData;
  }

  function setDisplayLineOffset(offset: number) {
    source.displayLineOffset = offset;
  }
}

export interface SourceCache {
  sources: Map<string, SourceFn>;
}

export function createSourceCache(entries: [string, SourceFn][]) {
  let sources = new Map(entries);

  return {
    fetch,
  };

  function fetch(id: string): SourceFn {
    const src = sources.get(id);
    if (!src) {
      throw new Error(`Failed to fetch source '${id}'`);
    }
    return src;
  }
}