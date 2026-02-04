import type {
  Block,
  ForInStatement,
  ForStatement,
  FunctionDeclaration,
  IfStatement,
  LocalScope,
  VariableStatement,
  WhileStatement,
} from '../src';
import { describe, it, expect } from 'vitest';
import { createParser, bindSourceFile, SyntaxKind, FlowFlags } from '../src';

describe('Binder', () => {
  function parseAndBind(code: string) {
    const parser = createParser(code);
    const sourceFile = parser.parseSourceFile();
    bindSourceFile(sourceFile);
    return sourceFile;
  }

  describe('作用域绑定', () => {
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

    it('for 循环作用域变量', () => {
      let code = 'for (let i = 0; i < 10; ++i) { }';
      let sourceFile = parseAndBind(code);

      const forStmt = sourceFile.statements[0] as ForStatement;
      expect(forStmt.locals).toBeDefined();
      expect(forStmt.locals!.has('i')).toBe(true);

      code = 'for (let k in obj) { }';
      sourceFile = parseAndBind(code);

      const forInStmt = sourceFile.statements[0] as ForInStatement;
      expect(forInStmt.locals).toBeDefined();
      expect(forInStmt.locals!.has('k')).toBe(true);
    });

    it('函数作用域变量', () => {
      const code = 'function foo(a, b) { let c = 1; }';
      const sourceFile = parseAndBind(code);

      expect(sourceFile.locals!.has('foo')).toBe(true);

      const funcDecl = sourceFile.statements[0] as FunctionDeclaration;

      expect(funcDecl.locals).toBeDefined();
      const funcScope = funcDecl.locals as LocalScope;

      expect(funcScope.has('a')).toBe(true);
      expect(funcScope.has('b')).toBe(true);

      expect(funcScope.has('c')).toBe(true);
    });
  });

  describe('控制流程图', () => {
    it('语句节点', () => {
      const code = 'let x = 1;';
      const sourceFile = parseAndBind(code);
      const stmt = sourceFile.statements[0];
      expect(stmt.flowNode).toBeDefined();
      expect(stmt.flowNode!.flags).toBe(FlowFlags.Start);
    });

    it('if 语句节点', () => {
      const code = 'if (x) { y = 1; } else { y = 2; }';
      const sourceFile = parseAndBind(code);
      const ifStmt = sourceFile.statements[0] as IfStatement;

      const thenStmt = ifStmt.thenStatement as Block;
      expect(thenStmt.statements[0].flowNode).toBeDefined();
      expect(thenStmt.statements[0].flowNode!.flags & FlowFlags.TrueCondition).toBeTruthy();

      const elseStmt = ifStmt.elseStatement as Block;
      expect(elseStmt.statements[0].flowNode).toBeDefined();
      expect(elseStmt.statements[0].flowNode!.flags & FlowFlags.FalseCondition).toBeTruthy();
    });

    it('while 语句节点', () => {
      const code = 'while (x) { y = 1; }';
      const sourceFile = parseAndBind(code);
      const whileStmt = sourceFile.statements[0] as WhileStatement;
      const body = whileStmt.statement as Block;

      expect(body.statements[0].flowNode).toBeDefined();
      expect(body.statements[0].flowNode!.flags & FlowFlags.TrueCondition).toBeTruthy();
    });

    it('while 语句节点后的语句不可达', () => {
      const code = `
        function foo() {
          return;
          let x = 1;
        }
      `;
      const sourceFile = parseAndBind(code);
      const funcDecl = sourceFile.statements[0] as FunctionDeclaration;
      const body = funcDecl.body;

      const unreachableStmt = body.statements[1];

      expect(unreachableStmt.flowNode).toBeDefined();
      expect(unreachableStmt.flowNode!.flags & FlowFlags.Unreachable).toBeTruthy();
    });

    it('if 语句节点后的语句不可达', () => {
      const code = `
          function foo() {
            if (true) {
              return 1;
            } else {
              return 2;
            }
            let x = 1;
          }
        `;
      const sourceFile = parseAndBind(code);
      const funcDecl = sourceFile.statements[0] as FunctionDeclaration;
      const body = funcDecl.body;

      const unreachableStmt = body.statements[1];

      expect(unreachableStmt.flowNode).toBeDefined();
      expect(unreachableStmt.flowNode!.flags & FlowFlags.Unreachable).toBeTruthy();
    });
  });
});
