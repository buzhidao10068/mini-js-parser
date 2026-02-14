import type { TransformerFactory } from './transformer';
import type { ErrorWithCause } from './report';
import { transform } from './transformer';
import { report } from './report';
import { createParser } from './parser';
import { bindSourceFile } from './binder';
import { createMinifierTransformers } from './minifier';
import { createPrinter } from './emitter';

export interface Config {
  filename: string;
  minify?: boolean;
  sourceMap?: boolean;
  plugins?: TransformerFactory[];
}

export interface CompileResult {
  code: string;
  map?: string;
}

export function compile(source: string, config: Config): CompileResult {
  const parser = createParser(source);
  let sourceFile;
  try {
    sourceFile = parser.parseSourceFile();
  } catch (error) {
    const e = error as ErrorWithCause;
    const output = report(config.filename, source, e.message, e.cause);
    console.log(output);
    return {
      code: '',
      map: undefined,
    };
  }

  bindSourceFile(sourceFile);

  let transformers: TransformerFactory[] = [...(config.plugins || [])];

  const minifier = createMinifierTransformers();

  if (config.minify) {
    transformers = [...minifier, ...transformers];
  }

  const transformedFile = transform(sourceFile, transformers);

  const printer = createPrinter({
    filename: config.filename,
    sourceMap: config.sourceMap,
    minify: config.minify,
  });

  const code = printer.printFile(transformedFile);
  const map = config.sourceMap ? printer.getSourceMap() : undefined;

  return {
    code: code,
    map: map,
  };
}
