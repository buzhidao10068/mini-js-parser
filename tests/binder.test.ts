import type { Block, ForStatement, VariableStatement } from '../src';
import { describe, it, expect } from 'vitest';
import { createParser, bindSourceFile, SyntaxKind } from '../src';

describe('Binder', () => {
  function parseAndBind(code: string) {
    const parser = createParser(code);
    const sourceFile = parser.parseSourceFile();
    bindSourceFile(sourceFile);
    return sourceFile;
  }

  it('父节点指向', () => {
    const code = 'let x = 1;';
    const sourceFile = parseAndBind(code);

    const stmt = sourceFile.statements[0];
    expect(stmt.parent).toBe(sourceFile);

    const varStmt = stmt as VariableStatement;
    expect(varStmt.declaration.parent).toBe(varStmt);
  });

  it('全局作用域变量', () => {
    const code = 'let x = 1; let y = 2;';
    const sourceFile = parseAndBind(code);

    expect(sourceFile.locals).toBeDefined();
    expect(sourceFile.locals!.has('x')).toBe(true);
    expect(sourceFile.locals!.has('y')).toBe(true);

    const xSymbol = sourceFile.locals!.get('x');
    expect(xSymbol?.declarations.length).toBe(1);
    expect(xSymbol?.name).toBe('x');
  });

  it('块作用域变量', () => {
    const code = 'let x = 1; { let y = 2; }';
    const sourceFile = parseAndBind(code);

    console.log(sourceFile.locals);
    expect(sourceFile.locals!.has('x')).toBe(true);
    expect(sourceFile.locals!.has('y')).toBe(false);

    const block = sourceFile.statements[1] as Block;
    expect(block.kind).toBe(SyntaxKind.Block);
    expect(block.locals).toBeDefined();
    expect(block.locals!.has('y')).toBe(true);
    expect(block.locals!.has('x')).toBe(false);
  });

  it('块作用域变量遮蔽', () => {
    const code = 'let x = 1; { let x = 2; }';
    const sourceFile = parseAndBind(code);

    const outerX = sourceFile.locals!.get('x');
    const block = sourceFile.statements[1] as Block;
    const innerX = block.locals!.get('x');

    expect(outerX).not.toBe(innerX);
  });

  it('for循环作用域变量', () => {
    const code = 'for (let i = 0; i < 10; ++i) { }';
    const sourceFile = parseAndBind(code);

    const forStmt = sourceFile.statements[0] as ForStatement;
    expect(forStmt.locals).toBeDefined();
    expect(forStmt.locals!.has('i')).toBe(true);
  });
});
