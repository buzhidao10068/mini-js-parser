import { describe, it, expect } from 'vitest';
import type {
  Node,
  Identifier,
  VariableStatement,
  FunctionDeclaration,
  ReturnStatement,
  Block,
  ExpressionStatement,
  BinaryExpression,
  ForStatement,
  WhileStatement,
  LiteralExpression,
  Statement,
  Expression,
  IfStatement,
  TransformerFactory,
  TransformationContext,
} from '../src';
import { SyntaxKind, createParser, transform, bindSourceFile } from '../src';
import { deadCodeEliminationTransformer, constantFoldingTransformer } from '../src';

describe('Transformer', () => {
  function transformCode(code: string, plugins?: TransformerFactory[]) {
    const sourceFile = createParser(code).parseSourceFile();
    bindSourceFile(sourceFile);
    const transformedSourceFile = transform(sourceFile, [...(plugins || [])]);
    return transformedSourceFile;
  }

  describe('代码转换', () => {
    it('如果未进行更改，返回相同的源文件', () => {
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

    it('转换标识符', () => {
      const code = 'let a = 1; function b(a) { return a; }';

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

      const result = transformCode(code, [renameTransformer]);

      const varStmt = result.statements[0] as VariableStatement;
      expect(varStmt.declaration.name.text).toBe('renamed_a');

      const funcDecl = result.statements[1] as FunctionDeclaration;
      expect(funcDecl.name.text).toBe('b');
      expect(funcDecl.parameters[0].name.text).toBe('renamed_a');

      const returnStmt = funcDecl.body.statements[0] as ReturnStatement;
      expect((returnStmt.expression as Identifier).text).toBe('renamed_a');
    });

    it('处理块转换', () => {
      const code = '{ let x = 1; }';

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

      const result = transformCode(code, [renameXTransformer]);
      const block = result.statements[0] as Block;
      const varStmt = block.statements[0] as VariableStatement;
      expect(varStmt.declaration.name.text).toBe('y');
    });

    it('处理二元表达式', () => {
      const code = 'a;';

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

      const result = transformCode(code, [renameATransformer]);
      const exprStmt = result.statements[0] as ExpressionStatement;
      expect((exprStmt.expression as Identifier).text).toBe('b');
    });

    it('处理二元表达式转换', () => {
      const code = 'a + b;';

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

      const result = transformCode(code, [renameBTransformer]);
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

      const result = transformCode(code, [forToWhileTransformer]);
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

  describe('代码消除', () => {
    it('消除 return 之后的不可达代码', () => {
      const code = `
      function foo() {
        return 1;
        let x = 2;
        x = 3;
      }
      foo();
      `;

      const result = transformCode(code, [deadCodeEliminationTransformer()]);
      const func = result.statements[0] as FunctionDeclaration;
      expect(func.body.statements.length).toBe(1);
      expect(func.body.statements[0].kind).toBe(SyntaxKind.ReturnStatement);
    });

    it('消除 if 语句中不可达的分支（不可达代码）', () => {
      const code = `
      function bar(x) {
         if (x) {
           return 1;
         } else {
           return 2;
         }
         let z = 3;
       }
       bar(1);
       `;

      const result = transformCode(code, [deadCodeEliminationTransformer()]);
      const func = result.statements[0] as FunctionDeclaration;
      expect(func.body.statements.length).toBe(1);
      expect(func.body.statements[0].kind).toBe(SyntaxKind.IfStatement);
    });

    it('结合常量折叠消除死代码', () => {
      const code = `
      function test() {
        let constant = 100;
        if (100 > 50) {
          return constant;
        } else {
          return 0;
        }
        let dead = 1;
      }
      test();
      `;

      const result = transformCode(code, [
        constantFoldingTransformer(),
        deadCodeEliminationTransformer(),
      ]);
      const func = result.statements[0] as FunctionDeclaration;

      expect(func.body.statements.length).toBe(2);
      expect((func.body.statements[0] as VariableStatement).declaration.name.text).toBe('constant');
      const block = func.body.statements[1] as Block;
      expect(block.kind).toBe(SyntaxKind.Block);
      expect(block.statements[0].kind).toBe(SyntaxKind.ReturnStatement);
    });

    it('消除未使用的局部函数和变量', () => {
      const code = `
      function main() {
        function unusedFunc() {
          return 0;
        }
        let unusedVar = 1;
        let usedVar = 2;
        return usedVar;
      }
      main();
      `;

      const result = transformCode(code, [deadCodeEliminationTransformer()]);
      const func = result.statements[0] as FunctionDeclaration;

      expect(func.body.statements.length).toBe(2);
      const varStmt = func.body.statements[0] as VariableStatement;
      expect(varStmt.declaration.name.text).toBe('usedVar');
      expect(func.body.statements[1].kind).toBe(SyntaxKind.ReturnStatement);
    });

    it('消除未使用的变量（即便它引用了其他变量）', () => {
      const code = `
      function main() {
        function unusedFunc() {
          return 0;
        }
        let unusedVar1 = 1;
        let unusedVar2 = unusedVar1 + 1;
        let usedVar = 3;
        return usedVar;
      }
      main();
      `;

      const result = transformCode(code, [deadCodeEliminationTransformer()]);
      const func = result.statements[0] as FunctionDeclaration;

      const stmts = func.body.statements;
      const varNames = stmts
        .filter((s) => s.kind === SyntaxKind.VariableStatement)
        .map((s) => ((s as VariableStatement).declaration.name as Identifier).text);

      expect(varNames).not.toContain('unusedVar1');
      expect(varNames).not.toContain('unusedVar2');
      expect(varNames).toContain('usedVar');
    });

    it('消除顶层未使用的函数', () => {
      const code = `
      function main() {
        return 3;
      }

      function unusedFunc() {
        return 0;
      }

      main();
      `;

      const result = transformCode(code, [deadCodeEliminationTransformer()]);

      expect(result.statements.length).toBe(2);
      expect((result.statements[0] as FunctionDeclaration).name.text).toBe('main');
    });
  });
});
