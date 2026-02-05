import type {
  BinaryExpression,
  Block,
  ExpressionStatement,
  ForStatement,
  FunctionDeclaration,
  IfStatement,
  Node,
  ParameterDeclaration,
  PostfixUnaryExpression,
  PrefixUnaryExpression,
  ReturnStatement,
  SourceFile,
  VariableDeclaration,
  VariableStatement,
  WhileStatement,
} from './ast';
import { SyntaxKind } from './ast';
import { factory } from './factory';

export type TransformerFactory = (context: TransformationContext) => Transformer;
export type Transformer = (node: Node) => Node;

export interface TransformationContext {
  factory: typeof factory;

  visitEachChild(node: Node, visitor: Visitor, context: TransformationContext): Node;
}

export type Visitor = (node: Node) => Node | undefined;

export function transform(sourceFile: SourceFile, transformers: TransformerFactory[]): SourceFile {
  const context: TransformationContext = {
    factory,
    visitEachChild,
  };

  let transformedFile = sourceFile;

  for (const transformerFactory of transformers) {
    const transformer = transformerFactory(context);
    transformedFile = transformer(transformedFile) as SourceFile;
  }

  return transformedFile;
}

function visitEachChild(node: Node, visitor: Visitor, _context: TransformationContext): Node {
  if (!node) return node;

  const kind = node.kind;

  switch (kind) {
    case SyntaxKind.SourceFile: {
      const sourceFile = node as SourceFile;
      const statements = visitNodes(sourceFile.statements);
      if (statements !== sourceFile.statements) {
        return { ...sourceFile, statements } as SourceFile;
      }
      break;
    }
    case SyntaxKind.Block: {
      const block = node as Block;
      const blockStmts = visitNodes(block.statements);
      if (blockStmts !== block.statements) {
        return { ...block, statements: blockStmts } as Block;
      }
      break;
    }
    case SyntaxKind.VariableStatement: {
      const statement = node as VariableStatement;
      const decl = visitNode(statement.declaration);
      if (decl !== statement.declaration) {
        return { ...statement, declaration: decl } as VariableStatement;
      }
      break;
    }
    case SyntaxKind.VariableDeclaration: {
      const decl = node as VariableDeclaration;
      const varName = visitNode(decl.name);
      const init = decl.initializer ? visitNode(decl.initializer) : undefined;
      if (varName !== decl.name || init !== decl.initializer) {
        return { ...decl, name: varName, initializer: init } as VariableDeclaration;
      }
      break;
    }
    case SyntaxKind.FunctionDecl: {
      const funcDecl = node as FunctionDeclaration;
      const funcName = visitNode(funcDecl.name);
      const params = visitNodes(funcDecl.parameters);
      const body = visitNode(funcDecl.body);
      if (funcName !== funcDecl.name || params !== funcDecl.parameters || body !== funcDecl.body) {
        return {
          ...funcDecl,
          name: funcName,
          parameters: params,
          body,
        } as FunctionDeclaration;
      }
      break;
    }
    case SyntaxKind.ParameterDecl: {
      const paramDecl = node as ParameterDeclaration;
      const paramName = visitNode(paramDecl.name);
      if (paramName !== paramDecl.name) {
        return { ...paramDecl, name: paramName } as ParameterDeclaration;
      }
      break;
    }
    case SyntaxKind.IfStatement: {
      const ifStmt = node as IfStatement;
      const expr = visitNode(ifStmt.expression);
      const thenStmt = visitNode(ifStmt.thenStatement);
      const elseStmt = ifStmt.elseStatement ? visitNode(ifStmt.elseStatement) : undefined;
      if (
        expr !== ifStmt.expression ||
        thenStmt !== ifStmt.thenStatement ||
        elseStmt !== ifStmt.elseStatement
      ) {
        return {
          ...ifStmt,
          expression: expr,
          thenStatement: thenStmt,
          elseStatement: elseStmt,
        } as IfStatement;
      }
      break;
    }
    case SyntaxKind.WhileStatement: {
      const whileStmt = node as WhileStatement;
      const wExpr = visitNode(whileStmt.expression);
      const wStmt = visitNode(whileStmt.statement);
      if (wExpr !== whileStmt.expression || wStmt !== whileStmt.statement) {
        return { ...whileStmt, expression: wExpr, statement: wStmt } as WhileStatement;
      }
      break;
    }
    case SyntaxKind.ForStatement: {
      const forStmt = node as ForStatement;
      const fInit = forStmt.initializer ? visitNode(forStmt.initializer) : undefined;
      const fCond = forStmt.condition ? visitNode(forStmt.condition) : undefined;
      const fInc = forStmt.incrementor ? visitNode(forStmt.incrementor) : undefined;
      const fStmt = visitNode(forStmt.statement);
      if (
        fInit !== forStmt.initializer ||
        fCond !== forStmt.condition ||
        fInc !== forStmt.incrementor ||
        fStmt !== forStmt.statement
      ) {
        return {
          ...forStmt,
          initializer: fInit,
          condition: fCond,
          incrementor: fInc,
          statement: fStmt,
        } as ForStatement;
      }
      break;
    }
    case SyntaxKind.BinaryExpression: {
      const binaryExpr = node as BinaryExpression;
      const left = visitNode(binaryExpr.left);
      const right = visitNode(binaryExpr.right);
      if (left !== binaryExpr.left || right !== binaryExpr.right) {
        return { ...binaryExpr, left, right } as BinaryExpression;
      }
      break;
    }
    case SyntaxKind.ReturnStatement: {
      const returnStmt = node as ReturnStatement;
      const retExpr = returnStmt.expression ? visitNode(returnStmt.expression) : undefined;
      if (retExpr !== returnStmt.expression) {
        return { ...returnStmt, expression: retExpr } as ReturnStatement;
      }
      break;
    }
    case SyntaxKind.ExpressionStatement: {
      const exprStmt = node as ExpressionStatement;
      const eExpr = visitNode(exprStmt.expression);
      if (eExpr !== exprStmt.expression) {
        return { ...exprStmt, expression: eExpr } as ExpressionStatement;
      }
      break;
    }
    case SyntaxKind.PrefixUnaryExpression:
    case SyntaxKind.PostfixUnaryExpression: {
      const unaryExpr = node as PrefixUnaryExpression | PostfixUnaryExpression;
      const operand = visitNode(unaryExpr.operand);
      if (operand !== unaryExpr.operand) {
        return { ...unaryExpr, operand } as PrefixUnaryExpression | PostfixUnaryExpression;
      }
      break;
    }
  }

  return node;

  function visitNode(n: Node): Node {
    if (!n) return n;
    const visited = visitor(n);
    return visited || n;
  }

  function visitNodes(nodes: Node[]): Node[] {
    if (!nodes) return nodes;
    let someChanged = false;
    const newNodes: Node[] = [];
    for (const child of nodes) {
      const visited = visitor(child);
      if (visited) {
        if (visited !== child) someChanged = true;
        newNodes.push(visited);
      } else {
        someChanged = true;
      }
    }
    return someChanged ? newNodes : nodes;
  }
}
