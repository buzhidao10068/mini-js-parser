export function sourceMapGenerator(sourceFile: string) {
  let file = sourceFile;
  let mappings = '';
  let lastGeneratedLine = 1;
  let lastGeneratedColumn = 0;
  let lastOriginalLine = 0;
  let lastOriginalColumn = 0;
  let lastSourceIndex = 0;
  let lastNameIndex = 0;

  return {
    addMapping,
    toString,
  };

  function addMapping(
    generatedLine: number,
    generatedColumn: number,
    originalLine: number,
    originalColumn: number,
    sourceIndex = 0,
    nameIndex?: number,
  ) {
    if (generatedLine > lastGeneratedLine) {
      mappings += ';'.repeat(generatedLine - lastGeneratedLine);
      lastGeneratedLine = generatedLine;
      lastGeneratedColumn = 0;
    } else if (mappings.length > 0 && !mappings.endsWith(';')) {
      mappings += ',';
    }

    const genColDiff = generatedColumn - lastGeneratedColumn;
    const sourceIndexDiff = sourceIndex - lastSourceIndex;
    const origLineDiff = originalLine - lastOriginalLine;
    const origColDiff = originalColumn - lastOriginalColumn;

    mappings += vlqEncode(genColDiff);
    mappings += vlqEncode(sourceIndexDiff);
    mappings += vlqEncode(origLineDiff);
    mappings += vlqEncode(origColDiff);

    if (nameIndex !== undefined) {
      const nameIndexDiff = nameIndex - lastNameIndex;
      mappings += vlqEncode(nameIndexDiff);
      lastNameIndex = nameIndex;
    }

    lastGeneratedColumn = generatedColumn;
    lastSourceIndex = sourceIndex;
    lastOriginalLine = originalLine;
    lastOriginalColumn = originalColumn;
  }

  function toString() {
    return JSON.stringify({
      version: 3,
      file: file,
      sources: [file],
      names: [],
      mappings: mappings,
    });
  }

  function vlqEncode(value: number): string {
    let vlq = '';
    let digit = value < 0 ? (-value << 1) | 1 : value << 1;

    do {
      let segment = digit & 31;
      digit >>>= 5;
      if (digit > 0) {
        segment |= 32;
      }
      vlq += base64Encode(segment);
    } while (digit > 0);

    return vlq;
  }

  function base64Encode(value: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    return chars[value];
  }
}
