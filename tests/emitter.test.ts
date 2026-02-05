import { describe, it, expect } from 'vitest';
import type {
  Node,
  ForStatement,
  VariableStatement,
  Expression,
  Statement,
  LiteralExpression,
  TransformerFactory,
  TransformationContext,
} from '../src';
import { createParser, createPrinter, SyntaxKind, transform, factory } from '../src';

describe('Emitter', () => {
  it('生成变量声明', () => {
    const code = 'let a = 1;';
    const sourceFile = createParser(code).parseSourceFile();
    const printer = createPrinter();
    const output = printer.printFile(sourceFile);
    expect(output.trim()).toBe(code);
  });

  it('生成二元表达式', () => {
    const code = 'a + b;';
    const sourceFile = createParser(code).parseSourceFile();
    const printer = createPrinter();
    const output = printer.printFile(sourceFile);
    expect(output.trim()).toBe(code);
  });

  it('生成函数声明', () => {
    const code = 'function f(a) { return a; }';
    const sourceFile = createParser(code).parseSourceFile();
    const printer = createPrinter();
    const output = printer.printFile(sourceFile);
    expect(output.replace(/\s+/g, ' ').trim()).toBe('function f(a) { return a; }');
  });

  it('生成 if 语句', () => {
    const code = 'if (a) { b; } else { c; }';
    const sourceFile = createParser(code).parseSourceFile();
    const printer = createPrinter();
    const output = printer.printFile(sourceFile);
    expect(output.replace(/\s+/g, ' ').trim()).toBe('if (a) { b; } else { c; }');
  });

  it('生成 while 语句', () => {
    const code = 'while (true) { a; }';
    const sourceFile = createParser(code).parseSourceFile();
    const printer = createPrinter();
    const output = printer.printFile(sourceFile);
    expect(output.replace(/\s+/g, ' ').trim()).toBe('while (true) { a; }');
  });

  it('生成 for 语句', () => {
    const code = 'for (let i = 0; i < 10; i++) { a; }';
    const sourceFile = createParser(code).parseSourceFile();
    const printer = createPrinter();
    const output = printer.printFile(sourceFile);
    expect(output.replace(/\s+/g, ' ').trim()).toBe('for (let i = 0; i < 10; i++) { a; }');
  });

  it('生成数组字面量', () => {
    const code = 'let a = [1, 2, 3];';
    const sourceFile = createParser(code).parseSourceFile();
    const printer = createPrinter();
    const output = printer.printFile(sourceFile);
    expect(output.replace(/\s+/g, ' ').trim()).toBe('let a = [1, 2, 3];');
  });

  it('生成对象字面量', () => {
    const code = 'let o = { a: 1, b: 2 };';
    const sourceFile = createParser(code).parseSourceFile();
    const printer = createPrinter();
    const output = printer.printFile(sourceFile);
    expect(output.replace(/\s+/g, ' ').trim()).toBe('let o = { a: 1, b: 2 };');
  });

  it('将 for 循环转换为 while 循环并生成代码', () => {
    const code = 'for (let i = 0; i < 10; i++) { a; }';
    const sourceFile = createParser(code).parseSourceFile();

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

    const transformedFile = transform(sourceFile, [forToWhileTransformer]);
    const printer = createPrinter();
    const output = printer.printFile(transformedFile);

    expect(output.replace(/\s+/g, ' ').trim()).toBe(
      '{ let i = 0; while (i < 10) { { a; } i++; } }',
    );
  });

  it('生成 SourceMap', () => {
    const code = 'let a = 1;';
    const sourceFile = createParser(code).parseSourceFile();
    const printer = createPrinter({ sourceMap: true, fileName: 'test.js' });
    printer.printFile(sourceFile);
    const map = printer.getSourceMap();

    expect(map).toBeDefined();
    if (map) {
      const parsedMap = JSON.parse(map);
      console.log(map);
      expect(parsedMap.version).toBe(3);
      expect(parsedMap.file).toBe('test.js');
      expect(parsedMap.sources).toEqual(['test.js']);
      expect(parsedMap.mappings).toBeTypeOf('string');
      expect(parsedMap.mappings.length).toBeGreaterThan(0);
    }
  });
});
