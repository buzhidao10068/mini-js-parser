import { describe, it, expect } from 'vitest';
import type { TransformerFactory } from '../src';
import {
  bindSourceFile,
  createMinifierTransformers,
  createParser,
  createPrinter,
  transform,
} from '../src';

describe('', () => {
  function minify(code: string, plugins: TransformerFactory[] = []) {
    const parser = createParser(code);
    const sourceFile = parser.parseSourceFile();
    bindSourceFile(sourceFile);
    const transformedSourceFile = transform(sourceFile, plugins);
    return createPrinter({ minify: true }).printFile(transformedSourceFile);
  }

  it('最小化函数声明', () => {
    const code = `
      function calculate(width, height) {
        let area = width * height;
        return area;
      }
    `;
    const output = minify(code, createMinifierTransformers());

    expect(output).toBe('');
  });

  it('最小化函数调用', () => {
    const code = `
      function calculate(width, height) {
        let area = width * height;
        return area;
      }
      calculate(2, 3);
    `;
    const output = minify(code, createMinifierTransformers());

    expect(output).toMatchInlineSnapshot(`"function a(b,c){let d=b*c;return d;}calculate(2,3);"`);
  });
});
