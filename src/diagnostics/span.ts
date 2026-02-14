export interface Span {
  sourceId: string | null;
  start: number;
  end: number;
}

export const span = (sourceId: string | null = null, start: number, end: number): Span => ({
  sourceId,
  start,
  end,
});