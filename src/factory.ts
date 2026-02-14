import type {
  Node,
  Identifier,
  VariableDeclaration,
  VariableStatement,
  Expression,
  LiteralExpression,
  Block,
  Statement,
  WhileStatement,
  ExpressionStatement,
} from './ast';
import { SyntaxKind } from './ast';

export const factory = {
  createIdentifier(text: string): Identifier {
    return {
      kind: SyntaxKind.Identifier,
      pos: -1,
      end: -1,
      text,
      _expressionBrand: null,
    };
  },

  createNumericLiteral(value: number): LiteralExpression {
    return {
      kind: SyntaxKind.NumericLiteral,
      pos: -1,
      end: -1,
      value,
      text: value.toString(),
      _expressionBrand: null,
    };
  },

  createVariableDeclaration(
    name: string | Identifier,
    initializer?: Expression,
  ): VariableDeclaration {
    return {
      kind: SyntaxKind.VariableDeclaration,
      pos: -1,
      end: -1,
      name: typeof name === 'string' ? factory.createIdentifier(name) : name,
      initializer,
    };
  },

  createVariableStatement(declaration: VariableDeclaration): VariableStatement {
    return {
      kind: SyntaxKind.VariableStatement,
      pos: -1,
      end: -1,
      declaration,
      _statementBrand: null,
    };
  },

  createBlock(statements: Statement[]): Block {
    return {
      kind: SyntaxKind.Block,
      pos: -1,
      end: -1,
      statements,
      _statementBrand: null,
    };
  },

  createWhileStatement(expression: Expression, statement: Statement): WhileStatement {
    return {
      kind: SyntaxKind.WhileStatement,
      pos: -1,
      end: -1,
      expression,
      statement,
      _statementBrand: null,
    };
  },

  createExpressionStatement(expression: Expression): ExpressionStatement {
    return {
      kind: SyntaxKind.ExpressionStatement,
      pos: -1,
      end: -1,
      expression,
      _statementBrand: null,
    };
  },

  createToken(kind: SyntaxKind): Node {
    return {
      kind,
      pos: -1,
      end: -1,
    };
  },
};
