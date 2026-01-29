import { describe, it, expect } from 'vitest';
import {
  FunctionDeclaration,
  LiteralExpression,
  ReturnStatement,
  SyntaxKind,
  WhileStatement,
  createParser,
} from '../src';

describe('Parser', () => {
  it('解析 let 语句', () => {
    const code = 'let a = 1;';
    const parser = createParser(code);
    const sourceFile = parser.parseSourceFile();

    expect(sourceFile.statements).toHaveLength(1);
    const statement = sourceFile.statements[0];
    expect(statement.kind).toBe(SyntaxKind.VariableStatement);
    const declaration = (statement as any).declaration;
    expect(declaration.kind).toBe(SyntaxKind.VariableDeclaration);
    expect(declaration.name.kind).toBe(SyntaxKind.Identifier);
    expect(declaration.name.text).toBe('a');
    expect(declaration.initializer.kind).toBe(SyntaxKind.NumericLiteral);
    expect(declaration.initializer.text).toBe('1');
    expect(declaration.initializer.value).toBe(1);
  });

  it('解析函数声明语句', () => {
    const code = 'function a() {}';
    const parser = createParser(code);
    const sourceFile = parser.parseSourceFile();

    expect(sourceFile.statements).toHaveLength(1);
    const functionDecl = sourceFile.statements[0] as FunctionDeclaration;
    expect(functionDecl.kind).toBe(SyntaxKind.FunctionDecl);
    expect(functionDecl.name.kind).toBe(SyntaxKind.Identifier);
    expect(functionDecl.name.text).toBe('a');
  });

  it('解析函数参数', () => {
    const code = 'function A(a, b) {}';
    const parser = createParser(code);
    const sourceFile = parser.parseSourceFile();

    expect(sourceFile.statements).toHaveLength(1);
    const functionDecl = sourceFile.statements[0] as FunctionDeclaration;
    expect(functionDecl.kind).toBe(SyntaxKind.FunctionDecl);
    expect(functionDecl.parameters).toHaveLength(2);
    expect(functionDecl.parameters[0].kind).toBe(SyntaxKind.ParameterDecl);
    expect(functionDecl.parameters[0].name.text).toBe('a');
    expect(functionDecl.parameters[1].kind).toBe(SyntaxKind.ParameterDecl);
    expect(functionDecl.parameters[1].name.text).toBe('b');
  });

  it('解析 return 语句时，不在函数体中使用会报错', () => {
    const code = 'return 1;';
    expect(() => {
      const parser = createParser(code);
      parser.parseSourceFile();
    }).toThrowError('return 语句只能在函数体中使用');
  });

  it('解析 return 语句', () => {
    const code = 'function a() { return 1; }';
    const parser = createParser(code);
    const sourceFile = parser.parseSourceFile();

    expect(sourceFile.statements).toHaveLength(1);
    const functionDecl = sourceFile.statements[0] as FunctionDeclaration;
    expect(functionDecl.kind).toBe(SyntaxKind.FunctionDecl);
    expect(functionDecl.body.statements).toHaveLength(1);
    const returnStmt = functionDecl.body.statements[0] as ReturnStatement;
    expect(returnStmt.kind).toBe(SyntaxKind.ReturnStatement);
    const returnExpr = returnStmt.expression! as LiteralExpression;
    expect(returnExpr.kind).toBe(SyntaxKind.NumericLiteral);
    expect(returnExpr.text).toBe('1');
    expect(returnExpr.value).toBe(1);
  });

  it('解析 while 语句', () => {
    const code = 'while (true) {}';
    const parser = createParser(code);
    const sourceFile = parser.parseSourceFile();

    expect(sourceFile.statements).toHaveLength(1);
    const whileStmt = sourceFile.statements[0] as WhileStatement;
    expect(whileStmt.kind).toBe(SyntaxKind.WhileStatement);
    const expression = whileStmt.expression! as LiteralExpression;
    expect(expression.kind).toBe(SyntaxKind.TrueKeyword);
    expect(expression.text).toBe('true');
  });
});
