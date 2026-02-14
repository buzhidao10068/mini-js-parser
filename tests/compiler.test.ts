import { describe, it, expect } from 'vitest';
import { compile } from '../src';

describe('Compiler', () => {
  it('该能够编译简单的代码', () => {
    const code = 'let a = 1;';
    const result = compile(code, { filename: 'test.js' });
    expect(result.code.trim()).toBe('let a = 1;');
    expect(result.map).toBeUndefined();
  });

  it('该能够生成 SourceMap', () => {
    const code = 'let a = 1;';
    const result = compile(code, { filename: 'test.js', sourceMap: true });
    expect(result.code).toContain('let a = 1;');
    expect(result.map).toBeDefined();
    if (result.map) {
      const map = JSON.parse(result.map);
      expect(map.version).toBe(3);
      expect(map.file).toBe('test.js');
    }
  });

  it('该能够进行代码压缩', () => {
    const code = `
      function add(a, b) {
        return a + b;
      }
      add(1, 2);
    `;
    const result = compile(code, { filename: 'test.js', minify: true });
    expect(result.code).not.toContain('\n      ');
    expect(result.code.length).toBeLessThan(code.length);
  });

  it('该处理解析错误', () => {
    const code = 'let a = ;';
    const result = compile(code, { filename: 'test.js' });
    expect(result.code).toBe('');
    expect(result.map).toBeUndefined();
  });
});
