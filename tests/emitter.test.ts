import { describe, it, expect } from 'vitest';
import {
  Node,
  ForStatement,
  VariableStatement,
  Expression,
  Statement,
  LiteralExpression,
  TransformerFactory,
  TransformationContext,
  constantFoldingTransformer,
  deadCodeEliminationTransformer,
} from '../src';
import {
  createParser,
  createPrinter,
  SyntaxKind,
  transform,
  factory,
  bindSourceFile,
} from '../src';

describe('Emitter', () => {
  function transformCode(code: string, plugins: TransformerFactory[] = []) {
    const sourceFile = createParser(code).parseSourceFile();
    bindSourceFile(sourceFile);
    const transformedSourceFile = transform(sourceFile, plugins);
    const printer = createPrinter();
    const output = printer.printFile(transformedSourceFile);
    return output;
  }

  describe('代码生成', () => {
    it('生成变量声明', () => {
      const code = 'let a = 1;';
      const output = transformCode(code);
      expect(output.trim()).toBe(code);
    });

    it('生成二元表达式', () => {
      const code = 'a + b;';
      const output = transformCode(code);
      expect(output.trim()).toBe(code);
    });

    it('生成函数声明', () => {
      const code = 'function f(a) { return a; }';
      const output = transformCode(code);
      expect(output.replace(/\s+/g, ' ').trim()).toBe('function f(a) { return a; }');
    });

    it('生成 if 语句', () => {
      const code = 'if (a) { b; } else { c; }';
      const output = transformCode(code);
      expect(output.replace(/\s+/g, ' ').trim()).toBe('if (a) { b; } else { c; }');
    });

    it('生成 while 语句', () => {
      const code = 'while (true) { a; }';
      const output = transformCode(code);
      expect(output.replace(/\s+/g, ' ').trim()).toBe('while (true) { a; }');
    });

    it('生成 for 语句', () => {
      const code = 'for (let i = 0; i < 10; i++) { a; }';
      const output = transformCode(code);
      expect(output.replace(/\s+/g, ' ').trim()).toBe('for (let i = 0; i < 10; i++) { a; }');
    });

    it('生成数组字面量', () => {
      const code = 'let a = [1, 2, 3];';
      const output = transformCode(code);
      expect(output.replace(/\s+/g, ' ').trim()).toBe('let a = [1, 2, 3];');
    });

    it('生成对象字面量', () => {
      const code = 'let o = { a: 1, b: 2 };';
      const output = transformCode(code);
      expect(output.replace(/\s+/g, ' ').trim()).toBe('let o = { a: 1, b: 2 };');
    });

    it('将 for 循环转换为 while 循环并生成代码', () => {
      const code = 'for (let i = 0; i < 10; i++) { a; }';

      const forToWhileTransformer: TransformerFactory = (context: TransformationContext) => {
        return (node: Node) => {
          const visitor = (node: Node): Node | undefined => {
            if (node.kind === SyntaxKind.ForStatement) {
              const forStmt = node as ForStatement;
              const statements: Statement[] = [];

              if (forStmt.initializer) {
                if (forStmt.initializer.kind === SyntaxKind.VariableStatement) {
                  statements.push(forStmt.initializer as VariableStatement);
                } else {
                  statements.push(
                    factory.createExpressionStatement(forStmt.initializer as Expression),
                  );
                }
              }

              const bodyStmts: Statement[] = [];
              bodyStmts.push(forStmt.statement);

              if (forStmt.incrementor) {
                bodyStmts.push(factory.createExpressionStatement(forStmt.incrementor));
              }

              const whileBody = factory.createBlock(bodyStmts);

              let condition = forStmt.condition;
              if (!condition) {
                condition = {
                  kind: SyntaxKind.TrueKeyword,
                  pos: -1,
                  end: -1,
                  value: true,
                  text: 'true',
                } as LiteralExpression;
              }

              const whileStmt = factory.createWhileStatement(condition, whileBody);
              statements.push(whileStmt);

              return factory.createBlock(statements);
            }
            return context.visitEachChild(node, visitor, context);
          };
          return visitor(node) as Node;
        };
      };

      const output = transformCode(code, [forToWhileTransformer]);

      expect(output.replace(/\s+/g, ' ').trim()).toBe(
        '{ let i = 0; while (i < 10) { { a; } i++; } }',
      );
    });

    it('生成 SourceMap', () => {
      const code = 'let a = 1;';
      const sourceFile = createParser(code).parseSourceFile();
      const printer = createPrinter({ sourceMap: true, filename: 'test.js' });
      printer.printFile(sourceFile);
      const map = printer.getSourceMap();

      expect(map).toBeDefined();
      if (map) {
        const parsedMap = JSON.parse(map);
        expect(parsedMap.version).toBe(3);
        expect(parsedMap.file).toBe('test.js');
        expect(parsedMap.sources).toEqual(['test.js']);
        expect(parsedMap.mappings).toBeTypeOf('string');
        expect(parsedMap.mappings.length).toBeGreaterThan(0);
      }
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

      const output = transformCode(code, [deadCodeEliminationTransformer()]);

      expect(output).not.toContain('let x = 2;');
      expect(output).not.toContain('x = 3;');
      expect(output).toContain('return 1;');
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

      const output = transformCode(code, [deadCodeEliminationTransformer()]);

      expect(output).not.toContain('let z = 3;');
    });

    it('常量折叠简单表达式', () => {
      const code = `
        let x = 1 + 2 * 3;
        let y = "a" + "b";
      `;

      const output = transformCode(code, [constantFoldingTransformer()]);

      expect(output).toContain('let x = 7;');
      expect(output).toContain('let y = "ab";');
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

      const output = transformCode(code, [
        constantFoldingTransformer(),
        deadCodeEliminationTransformer(),
      ]);

      expect(output).not.toContain('else');
      expect(output).not.toContain('return 0');
      expect(output).not.toContain('let dead=1;');
      expect(output).toContain('100');
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

      const output = transformCode(code, [deadCodeEliminationTransformer()]);

      expect(output).not.toContain('function unusedFunc');
      expect(output).not.toContain('let unusedVar');
      expect(output).toContain('function main');
      expect(output).toContain('let usedVar = 2;');
    });

    it('消除未使用的变量（即便它引用了其他变量）', () => {
      const code = `
      function main() {
        function unusedFunc() {
          return 0;
        }
        let unusedVar = 1;
        let unusedVar2 = unusedVar + 1;
        let usedVar = 3;
        return usedVar;
      }
      main();
      `;

      const output = transformCode(code, [deadCodeEliminationTransformer()]);

      expect(output).not.toContain('function unusedFunc');
      expect(output).not.toContain('let unusedVar');
      expect(output).not.toContain('let unusedVar2');
      expect(output).toContain('function main');
      expect(output).toContain('let usedVar = 3;');
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

      const output = transformCode(code, [deadCodeEliminationTransformer()]);

      expect(output).not.toContain('function unusedFunc');
      expect(output).toContain('function main');
      expect(output).toContain('return 3;');
    });

    it('消除未使用的函数（即便它引用了其他函数）', () => {
      const code = `
      function usedFn1() {
        return 3;
      }

      function usedFn2() {
        return usedFn1;
      }

      function unusedFn() {
        return 0;
      }

      function main() {
        usedFn2();
      }

      main();
    `;
      const output = transformCode(code, [deadCodeEliminationTransformer()]);

      expect(output).not.toContain('function unusedFn');
      expect(output).toContain('function usedFn2');
      expect(output).toContain('function usedFn1');
      expect(output).toContain('function main');
      expect(output).toContain('return 3;');
    });
  });
});
