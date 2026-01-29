import { describe, it, expect } from 'vitest';
import type {
  BinaryExpression,
  Expression,
  ExpressionStatement,
  FunctionDeclaration,
  LiteralExpression,
  PostfixUnaryExpression,
  PrefixUnaryExpression,
  ReturnStatement,
  WhileStatement,
  Node,
  VariableStatement,
  ForStatement,
  VariableDeclaration,
  ArrayLiteralExpression,
  ElementAccessExpression,
  AssignmentExpression,
  CallExpression,
} from '../src';
import { SyntaxKind, createParser } from '../src';

describe('Parser', () => {
  function printOperatorToken(token: Node): string {
    switch (token.kind) {
      case SyntaxKind.PlusToken:
        return '+';
      case SyntaxKind.MinusToken:
        return '-';
      case SyntaxKind.AsteriskToken:
        return '*';
      case SyntaxKind.SlashToken:
        return '/';
      default:
        throw new Error(`Unsupported operator token kind: ${token.kind}`);
    }
  }
  function printExpression(expression: Expression): string {
    if (expression.kind === SyntaxKind.BinaryExpression) {
      const binaryExpr = expression as BinaryExpression;
      return `(${printExpression(binaryExpr.left)} ${printOperatorToken(binaryExpr.operatorToken)} ${printExpression(binaryExpr.right)})`;
    } else if (expression.kind === SyntaxKind.NumericLiteral) {
      const literal = expression as LiteralExpression;
      return literal.text;
    } else {
      throw new Error(`Unsupported expression kind: ${expression.kind}`);
    }
  }

  describe('关键字解析', () => {
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

    it('解析 for 语句', () => {
      const code = 'for (let i = 0; i < 10; i++) {}';
      const parser = createParser(code);
      const sourceFile = parser.parseSourceFile();

      expect(sourceFile.statements).toHaveLength(1);
      const forStmt = sourceFile.statements[0] as ForStatement;
      expect(forStmt.kind).toBe(SyntaxKind.ForStatement);
      const initializer = forStmt.initializer! as VariableStatement;
      expect(initializer.kind).toBe(SyntaxKind.VariableStatement);
      const declaration = initializer.declaration! as VariableDeclaration;
      expect(declaration.kind).toBe(SyntaxKind.VariableDeclaration);
      expect(declaration.name.kind).toBe(SyntaxKind.Identifier);
      expect(declaration.name.text).toBe('i');
      const initializerExpr = declaration.initializer! as LiteralExpression;
      expect(initializerExpr.kind).toBe(SyntaxKind.NumericLiteral);
      expect(initializerExpr.text).toBe('0');
      expect(initializerExpr.value).toBe(0);
    });

    it('解析 if else 语句', () => {
      const code = `
    if (a) {
      x = 1;
    } else if (b) {
      x = 2;
    } else {
      x = 3;
    }`;
      const parser = createParser(code);
      const sourceFile = parser.parseSourceFile();
      const stmt = sourceFile.statements[0] as any;
      expect(stmt.kind).toBe(SyntaxKind.IfStatement);

      const nestedIf = stmt.elseStatement;
      expect(nestedIf.kind).toBe(SyntaxKind.IfStatement);
      expect(nestedIf.expression.text).toBe('b');

      const finalElse = nestedIf.elseStatement;
      expect(finalElse.kind).toBe(SyntaxKind.Block);
    });
  });

  describe('解析表达式', () => {
    it('解析赋值表达式', () => {
      const code = 'x = 1;';
      const parser = createParser(code);
      const sourceFile = parser.parseSourceFile();
      expect(sourceFile.statements).toHaveLength(1);
      const stmt = sourceFile.statements[0] as ExpressionStatement;
      expect(stmt.kind).toBe(SyntaxKind.ExpressionStatement);
      const expression = stmt.expression as AssignmentExpression;
      expect(expression.kind).toBe(SyntaxKind.AssignmentExpression);
      const left = expression.left as LiteralExpression;
      expect(left.kind).toBe(SyntaxKind.Identifier);
      expect(left.text).toBe('x');
      const right = expression.right as LiteralExpression;
      expect(right.kind).toBe(SyntaxKind.NumericLiteral);
      expect(right.text).toBe('1');
      expect(right.value).toBe(1);
    });

    it('解析 > 表达式', () => {
      const code = '2 > 1;';
      const parser = createParser(code);
      const sourceFile = parser.parseSourceFile();

      expect(sourceFile.statements).toHaveLength(1);
      const statement = sourceFile.statements[0] as ExpressionStatement;
      expect(statement.kind).toBe(SyntaxKind.ExpressionStatement);
      const expression = statement.expression as BinaryExpression;
      expect(expression.kind).toBe(SyntaxKind.BinaryExpression);
      expect(expression.operatorToken.kind).toBe(SyntaxKind.GreaterThanToken);
      expect(expression.left.kind).toBe(SyntaxKind.NumericLiteral);
      const left = expression.left as LiteralExpression;
      expect(left.text).toBe('2');
      expect(left.value).toBe(2);
      const right = expression.right as LiteralExpression;
      expect(right.kind).toBe(SyntaxKind.NumericLiteral);
      expect(right.text).toBe('1');
      expect(right.value).toBe(1);
    });

    it('解析 >= 表达式', () => {
      const code = '2 >= 1;';
      const parser = createParser(code);
      const sourceFile = parser.parseSourceFile();

      expect(sourceFile.statements).toHaveLength(1);
      const statement = sourceFile.statements[0] as ExpressionStatement;
      expect(statement.kind).toBe(SyntaxKind.ExpressionStatement);
      const expression = statement.expression as BinaryExpression;
      expect(expression.kind).toBe(SyntaxKind.BinaryExpression);
      expect(expression.operatorToken.kind).toBe(
        SyntaxKind.GreaterThanEqualsToken,
      );
      expect(expression.left.kind).toBe(SyntaxKind.NumericLiteral);
      const left = expression.left as LiteralExpression;
      expect(left.text).toBe('2');
      expect(left.value).toBe(2);
      const right = expression.right as LiteralExpression;
      expect(right.kind).toBe(SyntaxKind.NumericLiteral);
      expect(right.text).toBe('1');
      expect(right.value).toBe(1);
    });

    it('解析 < 表达式', () => {
      const code = '2 < 1;';
      const parser = createParser(code);
      const sourceFile = parser.parseSourceFile();

      expect(sourceFile.statements).toHaveLength(1);
      const statement = sourceFile.statements[0] as ExpressionStatement;
      expect(statement.kind).toBe(SyntaxKind.ExpressionStatement);
      const expression = statement.expression as BinaryExpression;
      expect(expression.kind).toBe(SyntaxKind.BinaryExpression);
      expect(expression.operatorToken.kind).toBe(SyntaxKind.LessThanToken);
      expect(expression.left.kind).toBe(SyntaxKind.NumericLiteral);
      const left = expression.left as LiteralExpression;
      expect(left.text).toBe('2');
      expect(left.value).toBe(2);
      const right = expression.right as LiteralExpression;
      expect(right.kind).toBe(SyntaxKind.NumericLiteral);
      expect(right.text).toBe('1');
      expect(right.value).toBe(1);
    });

    it('解析 <= 表达式', () => {
      const code = '2 <= 1;';
      const parser = createParser(code);
      const sourceFile = parser.parseSourceFile();

      expect(sourceFile.statements).toHaveLength(1);
      const statement = sourceFile.statements[0] as ExpressionStatement;
      expect(statement.kind).toBe(SyntaxKind.ExpressionStatement);
      const expression = statement.expression as BinaryExpression;
      expect(expression.kind).toBe(SyntaxKind.BinaryExpression);
      expect(expression.operatorToken.kind).toBe(
        SyntaxKind.LessThanEqualsToken,
      );
      expect(expression.left.kind).toBe(SyntaxKind.NumericLiteral);
      const left = expression.left as LiteralExpression;
      expect(left.text).toBe('2');
      expect(left.value).toBe(2);
      const right = expression.right as LiteralExpression;
      expect(right.kind).toBe(SyntaxKind.NumericLiteral);
      expect(right.text).toBe('1');
    });

    it('解析 == 表达式', () => {
      const code = '2 == 1;';
      const parser = createParser(code);
      const sourceFile = parser.parseSourceFile();

      expect(sourceFile.statements).toHaveLength(1);
      const statement = sourceFile.statements[0] as ExpressionStatement;
      expect(statement.kind).toBe(SyntaxKind.ExpressionStatement);
      const expression = statement.expression as BinaryExpression;
      expect(expression.kind).toBe(SyntaxKind.BinaryExpression);
      expect(expression.operatorToken.kind).toBe(SyntaxKind.EqualsEqualsToken);
      expect(expression.left.kind).toBe(SyntaxKind.NumericLiteral);
      const left = expression.left as LiteralExpression;
      expect(left.text).toBe('2');
      expect(left.value).toBe(2);
      const right = expression.right as LiteralExpression;
      expect(right.kind).toBe(SyntaxKind.NumericLiteral);
      expect(right.text).toBe('1');
      expect(right.value).toBe(1);
    });

    it('解析 != 表达式', () => {
      const code = '2 != 1;';
      const parser = createParser(code);
      const sourceFile = parser.parseSourceFile();

      expect(sourceFile.statements).toHaveLength(1);
      const statement = sourceFile.statements[0] as ExpressionStatement;
      expect(statement.kind).toBe(SyntaxKind.ExpressionStatement);
      const expression = statement.expression as BinaryExpression;
      expect(expression.kind).toBe(SyntaxKind.BinaryExpression);
      expect(expression.operatorToken.kind).toBe(
        SyntaxKind.ExclamationEqualsToken,
      );
      expect(expression.left.kind).toBe(SyntaxKind.NumericLiteral);
      const left = expression.left as LiteralExpression;
      expect(left.text).toBe('2');
      expect(left.value).toBe(2);
      const right = expression.right as LiteralExpression;
      expect(right.kind).toBe(SyntaxKind.NumericLiteral);
      expect(right.text).toBe('1');
      expect(right.value).toBe(1);
    });

    it('解析 + 表达式', () => {
      const code = '2 + 1;';
      const parser = createParser(code);
      const sourceFile = parser.parseSourceFile();

      expect(sourceFile.statements).toHaveLength(1);
      const statement = sourceFile.statements[0] as ExpressionStatement;
      expect(statement.kind).toBe(SyntaxKind.ExpressionStatement);
      const expression = statement.expression as BinaryExpression;
      expect(expression.kind).toBe(SyntaxKind.BinaryExpression);
      expect(expression.operatorToken.kind).toBe(SyntaxKind.PlusToken);
      expect(expression.left.kind).toBe(SyntaxKind.NumericLiteral);
      const left = expression.left as LiteralExpression;
      expect(left.text).toBe('2');
      expect(left.value).toBe(2);
      const right = expression.right as LiteralExpression;
      expect(right.kind).toBe(SyntaxKind.NumericLiteral);
      expect(right.text).toBe('1');
      expect(right.value).toBe(1);
    });

    it('解析 - 表达式', () => {
      const code = '2 - 1;';
      const parser = createParser(code);
      const sourceFile = parser.parseSourceFile();

      expect(sourceFile.statements).toHaveLength(1);
      const statement = sourceFile.statements[0] as ExpressionStatement;
      expect(statement.kind).toBe(SyntaxKind.ExpressionStatement);
      const expression = statement.expression as BinaryExpression;
      expect(expression.kind).toBe(SyntaxKind.BinaryExpression);
      expect(expression.operatorToken.kind).toBe(SyntaxKind.MinusToken);
      expect(expression.left.kind).toBe(SyntaxKind.NumericLiteral);
      const left = expression.left as LiteralExpression;
      expect(left.text).toBe('2');
      expect(left.value).toBe(2);
      const right = expression.right as LiteralExpression;
      expect(right.kind).toBe(SyntaxKind.NumericLiteral);
      expect(right.text).toBe('1');
      expect(right.value).toBe(1);
    });

    it('解析 * 表达式', () => {
      const code = '2 * 1;';
      const parser = createParser(code);
      const sourceFile = parser.parseSourceFile();

      expect(sourceFile.statements).toHaveLength(1);
      const statement = sourceFile.statements[0] as ExpressionStatement;
      expect(statement.kind).toBe(SyntaxKind.ExpressionStatement);
      const expression = statement.expression as BinaryExpression;
      expect(expression.kind).toBe(SyntaxKind.BinaryExpression);
      expect(expression.operatorToken.kind).toBe(SyntaxKind.AsteriskToken);
      expect(expression.left.kind).toBe(SyntaxKind.NumericLiteral);
      const left = expression.left as LiteralExpression;
      expect(left.text).toBe('2');
      expect(left.value).toBe(2);
      const right = expression.right as LiteralExpression;
      expect(right.kind).toBe(SyntaxKind.NumericLiteral);
      expect(right.text).toBe('1');
      expect(right.value).toBe(1);
    });

    it('解析 / 表达式', () => {
      const code = '2 / 1;';
      const parser = createParser(code);
      const sourceFile = parser.parseSourceFile();

      expect(sourceFile.statements).toHaveLength(1);
      const statement = sourceFile.statements[0] as ExpressionStatement;
      expect(statement.kind).toBe(SyntaxKind.ExpressionStatement);
      const expression = statement.expression as BinaryExpression;
      expect(expression.kind).toBe(SyntaxKind.BinaryExpression);
      expect(expression.operatorToken.kind).toBe(SyntaxKind.SlashToken);
      expect(expression.left.kind).toBe(SyntaxKind.NumericLiteral);
      const left = expression.left as LiteralExpression;
      expect(left.text).toBe('2');
      expect(left.value).toBe(2);
      const right = expression.right as LiteralExpression;
      expect(right.kind).toBe(SyntaxKind.NumericLiteral);
      expect(right.text).toBe('1');
      expect(right.value).toBe(1);
    });

    it('解析前缀 ++ 表达式', () => {
      const code = '++2;';
      const parser = createParser(code);
      const sourceFile = parser.parseSourceFile();

      expect(sourceFile.statements).toHaveLength(1);
      const statement = sourceFile.statements[0] as ExpressionStatement;
      expect(statement.kind).toBe(SyntaxKind.ExpressionStatement);
      const expression = statement.expression as PrefixUnaryExpression;
      expect(expression.kind).toBe(SyntaxKind.PrefixUnaryExpression);
      expect(expression.operator).toBe(SyntaxKind.PlusPlusToken);
      expect(expression.operand.kind).toBe(SyntaxKind.NumericLiteral);
      const operand = expression.operand as LiteralExpression;
      expect(operand.text).toBe('2');
      expect(operand.value).toBe(2);
    });

    it('解析前缀 -- 表达式', () => {
      const code = '--2;';
      const parser = createParser(code);
      const sourceFile = parser.parseSourceFile();

      expect(sourceFile.statements).toHaveLength(1);
      const statement = sourceFile.statements[0] as ExpressionStatement;
      expect(statement.kind).toBe(SyntaxKind.ExpressionStatement);
      const expression = statement.expression as PrefixUnaryExpression;
      expect(expression.kind).toBe(SyntaxKind.PrefixUnaryExpression);
      expect(expression.operator).toBe(SyntaxKind.MinusMinusToken);
      expect(expression.operand.kind).toBe(SyntaxKind.NumericLiteral);
      const operand = expression.operand as LiteralExpression;
      expect(operand.text).toBe('2');
      expect(operand.value).toBe(2);
    });

    it('解析后缀 ++ 表达式', () => {
      const code = '2++;';
      const parser = createParser(code);
      const sourceFile = parser.parseSourceFile();

      expect(sourceFile.statements).toHaveLength(1);
      const statement = sourceFile.statements[0] as ExpressionStatement;
      expect(statement.kind).toBe(SyntaxKind.ExpressionStatement);
      const expression = statement.expression as PostfixUnaryExpression;
      expect(expression.kind).toBe(SyntaxKind.PostfixUnaryExpression);
      expect(expression.operator).toBe(SyntaxKind.PlusPlusToken);
      expect(expression.operand.kind).toBe(SyntaxKind.NumericLiteral);
      const operand = expression.operand as LiteralExpression;
      expect(operand.text).toBe('2');
      expect(operand.value).toBe(2);
    });

    it('解析后缀 -- 表达式', () => {
      const code = '2--;';
      const parser = createParser(code);
      const sourceFile = parser.parseSourceFile();

      expect(sourceFile.statements).toHaveLength(1);
      const statement = sourceFile.statements[0] as ExpressionStatement;
      expect(statement.kind).toBe(SyntaxKind.ExpressionStatement);
      const expression = statement.expression as PostfixUnaryExpression;
      expect(expression.kind).toBe(SyntaxKind.PostfixUnaryExpression);
      expect(expression.operator).toBe(SyntaxKind.MinusMinusToken);
      expect(expression.operand.kind).toBe(SyntaxKind.NumericLiteral);
      const operand = expression.operand as LiteralExpression;
      expect(operand.text).toBe('2');
      expect(operand.value).toBe(2);
    });

    it('解析中缀表达式 1 + 2 - 3', () => {
      const code = '1 + 2 - 3;';
      const parser = createParser(code);
      const sourceFile = parser.parseSourceFile();

      expect(sourceFile.statements).toHaveLength(1);
      const statement = sourceFile.statements[0] as ExpressionStatement;
      expect(statement.kind).toBe(SyntaxKind.ExpressionStatement);
      const expression = statement.expression as BinaryExpression;
      expect(printExpression(expression)).toBe('((1 + 2) - 3)');
    });

    it('解析中缀表达式 1 + 2 * 3', () => {
      const code = '1 + 2 * 3;';
      const parser = createParser(code);
      const sourceFile = parser.parseSourceFile();

      expect(sourceFile.statements).toHaveLength(1);
      const statement = sourceFile.statements[0] as ExpressionStatement;
      expect(statement.kind).toBe(SyntaxKind.ExpressionStatement);
      const expression = statement.expression as BinaryExpression;
      expect(printExpression(expression)).toBe('(1 + (2 * 3))');
    });
  });

  describe('函数调用', () => {
    it('解析简单函数调用 foo()', () => {
      const code = 'foo();';
      const parser = createParser(code);
      const sourceFile = parser.parseSourceFile();

      expect(sourceFile.statements).toHaveLength(1);
      const statement = sourceFile.statements[0] as ExpressionStatement;
      expect(statement.kind).toBe(SyntaxKind.ExpressionStatement);
      const expression = statement.expression as CallExpression;
      expect(expression.kind).toBe(SyntaxKind.CallExpression);
      expect(expression.expression.kind).toBe(SyntaxKind.Identifier);
      expect(expression.arguments).toHaveLength(0);
    });

    it('解析带参数函数调用 foo(1, 2, 3)', () => {
      const code = 'foo(1, 2, 3);';
      const parser = createParser(code);
      const sourceFile = parser.parseSourceFile();

      expect(sourceFile.statements).toHaveLength(1);
      const statement = sourceFile.statements[0] as ExpressionStatement;
      expect(statement.kind).toBe(SyntaxKind.ExpressionStatement);
      const expression = statement.expression as CallExpression;
      expect(expression.kind).toBe(SyntaxKind.CallExpression);
      expect(expression.expression.kind).toBe(SyntaxKind.Identifier);
      expect(expression.arguments).toHaveLength(3);
      expect(expression.arguments[0].kind).toBe(SyntaxKind.NumericLiteral);
      expect(expression.arguments[1].kind).toBe(SyntaxKind.NumericLiteral);
      expect(expression.arguments[2].kind).toBe(SyntaxKind.NumericLiteral);
      expect((expression.arguments[0] as LiteralExpression).value).toBe(1);
      expect((expression.arguments[1] as LiteralExpression).value).toBe(2);
      expect((expression.arguments[2] as LiteralExpression).value).toBe(3);
    });
  });

  describe('解析数组', () => {
    it('解析空数组 []', () => {
      const code = '[];';
      const parser = createParser(code);
      const sourceFile = parser.parseSourceFile();

      const statement = sourceFile.statements[0] as ExpressionStatement;
      expect(statement.kind).toBe(SyntaxKind.ExpressionStatement);
      const expression = statement.expression as ArrayLiteralExpression;
      expect(expression.kind).toBe(SyntaxKind.ArrayLiteralExpression);
      expect(expression.elements).toHaveLength(0);
    });

    it('解析 a[0]', () => {
      const code = 'a[0];';
      const parser = createParser(code);
      const sourceFile = parser.parseSourceFile();

      expect(sourceFile.statements).toHaveLength(1);
      const statement = sourceFile.statements[0] as ExpressionStatement;
      expect(statement.kind).toBe(SyntaxKind.ExpressionStatement);
      const expression = statement.expression as ElementAccessExpression;
      expect(expression.kind).toBe(SyntaxKind.ElementAccessExpression);
      expect(expression.expression.kind).toBe(SyntaxKind.Identifier);
      expect(expression.argumentExpression.kind).toBe(
        SyntaxKind.NumericLiteral,
      );
    });

    it('解析 a[0] = 1', () => {
      const code = 'a[0] = 1;';
      const parser = createParser(code);
      const sourceFile = parser.parseSourceFile();

      expect(sourceFile.statements).toHaveLength(1);
      const statement = sourceFile.statements[0] as ExpressionStatement;
      expect(statement.kind).toBe(SyntaxKind.ExpressionStatement);
      const expression = statement.expression as AssignmentExpression;
      expect(expression.kind).toBe(SyntaxKind.AssignmentExpression);
      const left = expression.left as ElementAccessExpression;
      expect(left.kind).toBe(SyntaxKind.ElementAccessExpression);
      expect(left.expression.kind).toBe(SyntaxKind.Identifier);
      expect(left.argumentExpression.kind).toBe(SyntaxKind.NumericLiteral);
      const argumentExpression = left.argumentExpression as LiteralExpression;
      expect(argumentExpression.text).toBe('0');
      expect(argumentExpression.value).toBe(0);
      const right = expression.right as LiteralExpression;
      expect(right.kind).toBe(SyntaxKind.NumericLiteral);
      expect(right.text).toBe('1');
      expect(right.value).toBe(1);
    });

    it('解析 let a = [1, 2, 3];', () => {
      let code = 'let a = [1, 2, 3];';
      const parser = createParser(code);
      const sourceFile = parser.parseSourceFile();

      expect(sourceFile.statements).toHaveLength(1);
      const statement = sourceFile.statements[0] as VariableStatement;
      expect(statement.kind).toBe(SyntaxKind.VariableStatement);
      const declaration = statement.declaration as VariableDeclaration;
      expect(declaration.kind).toBe(SyntaxKind.VariableDeclaration);
      expect(declaration.name.kind).toBe(SyntaxKind.Identifier);
      expect(declaration.name.text).toBe('a');
      const initializer = declaration.initializer as ArrayLiteralExpression;
      expect(initializer.kind).toBe(SyntaxKind.ArrayLiteralExpression);
      expect(initializer.elements).toHaveLength(3);
      const element0 = initializer.elements[0] as LiteralExpression;
      expect(element0.kind).toBe(SyntaxKind.NumericLiteral);
      expect(element0.text).toBe('1');
      expect(element0.value).toBe(1);
      const element1 = initializer.elements[1] as LiteralExpression;
      expect(element1.kind).toBe(SyntaxKind.NumericLiteral);
      expect(element1.text).toBe('2');
      expect(element1.value).toBe(2);
      const element2 = initializer.elements[2] as LiteralExpression;
      expect(element2.kind).toBe(SyntaxKind.NumericLiteral);
      expect(element2.text).toBe('3');
      expect(element2.value).toBe(3);
    });
  });
});
