import { describe, it, expect } from 'vitest';
import { createParser } from '../src/parser';
import { transform, type TransformerFactory, type TransformationContext } from '../src/transformer';
import {
  SyntaxKind,
  type Node,
  type Identifier,
  type VariableStatement,
  type FunctionDeclaration,
  type ReturnStatement,
  type Block,
  type ExpressionStatement,
  type BinaryExpression,
  type ForStatement,
  type WhileStatement,
  type LiteralExpression,
  type Statement,
  type Expression,
  IfStatement,
} from '../src/ast';

describe('Transformer', () => {
  it('如果未进行更改，应返回相同的源文件', () => {
    const code = 'let a = 1;';
    const sourceFile = createParser(code).parseSourceFile();

    const noOpTransformer: TransformerFactory = (context: TransformationContext) => {
      return (node: Node) => {
        const visitor = (node: Node): Node | undefined => {
          return context.visitEachChild(node, visitor, context);
        };
        return visitor(node) as Node;
      };
    };

    const result = transform(sourceFile, [noOpTransformer]);
    expect(result).toBe(sourceFile);
  });

  it('应转换标识符', () => {
    const code = 'let a = 1; function b(a) { return a; }';
    const sourceFile = createParser(code).parseSourceFile();

    const renameTransformer: TransformerFactory = (context: TransformationContext) => {
      return (node: Node) => {
        const visitor = (node: Node): Node | undefined => {
          if (node.kind === SyntaxKind.Identifier && (node as Identifier).text === 'a') {
            return { ...node, text: 'renamed_a' } as Identifier;
          }
          return context.visitEachChild(node, visitor, context);
        };
        return visitor(node) as Node;
      };
    };

    const result = transform(sourceFile, [renameTransformer]);

    const varStmt = result.statements[0] as VariableStatement;
    expect(varStmt.declaration.name.text).toBe('renamed_a');

    const funcDecl = result.statements[1] as FunctionDeclaration;
    expect(funcDecl.name.text).toBe('b');
    expect(funcDecl.parameters[0].name.text).toBe('renamed_a');

    const returnStmt = funcDecl.body.statements[0] as ReturnStatement;
    expect((returnStmt.expression as Identifier).text).toBe('renamed_a');
  });

  it('应处理块转换', () => {
    const code = '{ let x = 1; }';
    const sourceFile = createParser(code).parseSourceFile();

    const renameXTransformer: TransformerFactory = (context: TransformationContext) => {
      return (node: Node) => {
        const visitor = (node: Node): Node | undefined => {
          if (node.kind === SyntaxKind.Identifier && (node as Identifier).text === 'x') {
            return { ...node, text: 'y' } as Identifier;
          }
          return context.visitEachChild(node, visitor, context);
        };
        return visitor(node) as Node;
      };
    };

    const result = transform(sourceFile, [renameXTransformer]);
    const block = result.statements[0] as Block;
    const varStmt = block.statements[0] as VariableStatement;
    expect(varStmt.declaration.name.text).toBe('y');
  });

  it('处理二元表达式', () => {
    const code = 'a;';
    const sourceFile = createParser(code).parseSourceFile();

    const renameATransformer: TransformerFactory = (context: TransformationContext) => {
      return (node: Node) => {
        const visitor = (node: Node): Node | undefined => {
          if (node.kind === SyntaxKind.Identifier && (node as Identifier).text === 'a') {
            return { ...node, text: 'b' } as Identifier;
          }
          return context.visitEachChild(node, visitor, context);
        };
        return visitor(node) as Node;
      };
    };

    const result = transform(sourceFile, [renameATransformer]);
    const exprStmt = result.statements[0] as ExpressionStatement;
    expect((exprStmt.expression as Identifier).text).toBe('b');
  });

  it('处理二元表达式转换', () => {
    const code = 'a + b;';
    const sourceFile = createParser(code).parseSourceFile();

    const renameBTransformer: TransformerFactory = (context: TransformationContext) => {
      return (node: Node) => {
        const visitor = (node: Node): Node | undefined => {
          if (node.kind === SyntaxKind.Identifier && (node as Identifier).text === 'b') {
            return { ...node, text: 'c' } as Identifier;
          }
          return context.visitEachChild(node, visitor, context);
        };
        return visitor(node) as Node;
      };
    };

    const result = transform(sourceFile, [renameBTransformer]);
    const resStmt = result.statements[0] as ExpressionStatement;
    const resBinary = resStmt.expression as BinaryExpression;
    expect((resBinary.right as Identifier).text).toBe('c');
  });

  it('正确处理嵌套转换', () => {
    const code = 'if (a) { b; }';
    const sourceFile = createParser(code).parseSourceFile();

    const renameBTransformer: TransformerFactory = (context: TransformationContext) => {
      return (node: Node) => {
        const visitor = (node: Node): Node | undefined => {
          if (node.kind === SyntaxKind.Identifier && (node as Identifier).text === 'b') {
            return { ...node, text: 'c' } as Identifier;
          }
          return context.visitEachChild(node, visitor, context);
        };
        return visitor(node) as Node;
      };
    };

    const result = transform(sourceFile, [renameBTransformer]);
    const ifStmt = result.statements[0] as IfStatement;

    expect(ifStmt).not.toBe(sourceFile.statements[0]);
    expect(ifStmt.expression).toBe((sourceFile.statements[0] as IfStatement).expression);
  });

  it('将 for 循环转换为 while 循环', () => {
    const code = 'for (let i = 0; i < 10; i++) { x; }';
    const sourceFile = createParser(code).parseSourceFile();

    const forToWhileTransformer: TransformerFactory = (context: TransformationContext) => {
      const { factory } = context;
      return (node: Node) => {
        const visitor = (node: Node): Node | undefined => {
          if (node.kind === SyntaxKind.ForStatement) {
            const forStmt = node as ForStatement;

            let initStmt: Statement | Expression | undefined;
            if (forStmt.initializer) {
              if (forStmt.initializer.kind === SyntaxKind.VariableStatement) {
                initStmt = forStmt.initializer;
              } else {
                initStmt = factory.createExpressionStatement(forStmt.initializer as Expression);
              }
            }

            const condition =
              forStmt.condition ||
              ({
                kind: SyntaxKind.TrueKeyword,
                pos: -1,
                end: -1,
                value: true,
                text: 'true',
                _expressionBrand: null,
              } as LiteralExpression);

            const statements: Statement[] = [];
            if (forStmt.statement.kind === SyntaxKind.Block) {
              statements.push(...(forStmt.statement as Block).statements);
            } else {
              statements.push(forStmt.statement);
            }

            if (forStmt.incrementor) {
              statements.push(factory.createExpressionStatement(forStmt.incrementor));
            }

            const whileBody = factory.createBlock(statements);
            const whileStmt = factory.createWhileStatement(condition, whileBody);

            const resultStmts: Statement[] = [];
            if (initStmt) resultStmts.push(initStmt as Statement);
            resultStmts.push(whileStmt);

            return factory.createBlock(resultStmts);
          }
          return context.visitEachChild(node, visitor, context);
        };
        return visitor(node) as Node;
      };
    };

    const result = transform(sourceFile, [forToWhileTransformer]);
    const outerBlock = result.statements[0] as Block;

    expect(outerBlock.kind).toBe(SyntaxKind.Block);
    expect(outerBlock.statements.length).toBe(2);

    const initStmt = outerBlock.statements[0] as VariableStatement;
    expect(initStmt.kind).toBe(SyntaxKind.VariableStatement);
    expect(initStmt.declaration.name.text).toBe('i');

    const whileStmt = outerBlock.statements[1] as WhileStatement;
    expect(whileStmt.kind).toBe(SyntaxKind.WhileStatement);

    const condition = whileStmt.expression as BinaryExpression;
    expect(condition.kind).toBe(SyntaxKind.BinaryExpression);
    expect((condition.left as Identifier).text).toBe('i');
    expect((condition.right as LiteralExpression).value).toBe(10);

    const body = whileStmt.statement as Block;
    expect(body.statements.length).toBe(2);
    const stmt1 = body.statements[0] as ExpressionStatement;
    expect((stmt1.expression as Identifier).text).toBe('x');
    const stmt2 = body.statements[1] as ExpressionStatement;
    expect(stmt2.expression.kind).toBe(SyntaxKind.PostfixUnaryExpression);
  });
});
