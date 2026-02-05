import type {
  BinaryExpression,
  Block,
  FlowNode,
  FunctionDeclaration,
  Identifier,
  IfStatement,
  Node,
  Symbol,
  VariableStatement,
} from '../ast';
import type { TransformerFactory } from '../transformer';
import { FlowFlags, SyntaxKind } from '../ast';

export function deadCodeEliminationTransformer(): TransformerFactory {
  return function (context) {
    return function (node) {
      return context.visitEachChild(node, visitor, context);
    };

    function visitor(node: Node): Node | undefined {
      if (node.flowNode && !isReachable(node.flowNode)) {
        return undefined;
      }

      if (node.kind === SyntaxKind.FunctionDecl) {
        const funcDecl = node as FunctionDeclaration;
        if (isUnusedSymbol(funcDecl.name, funcDecl.parent)) {
          return undefined;
        }
      } else if (node.kind === SyntaxKind.VariableStatement) {
        const varStmt = node as VariableStatement;
        const decl = varStmt.declaration;
        if (isUnusedSymbol(decl.name, varStmt.parent)) {
          if (!decl.initializer || isPure(decl.initializer)) {
            return undefined;
          }
        }
      }

      const visited = context.visitEachChild(node, visitor, context);

      if (visited.kind === SyntaxKind.IfStatement) {
        const ifStmt = visited as IfStatement;
        if (ifStmt.expression.kind === SyntaxKind.FalseKeyword) {
          return ifStmt.elseStatement || undefined;
        } else if (ifStmt.expression.kind === SyntaxKind.TrueKeyword) {
          return ifStmt.thenStatement;
        }
      }

      return visited;
    }
  };
}

function isReachable(flow: FlowNode): boolean {
  if (flow.flags & FlowFlags.Unreachable) {
    return false;
  }

  return true;
}

function isUnusedSymbol(nameNode: Node, startNode?: Node): boolean {
  let current = startNode;
  while (current) {
    if ((current as Block).locals) {
      const scope = (current as Block).locals as Map<string, Symbol>;
      const name = (nameNode as Identifier).text;
      if (scope.has(name)) {
        const symbol = scope.get(name)!;
        if (name === 'main') return false;

        return !symbol.isReferenced;
      }
    }
    current = current.parent;
  }
  return false;
}

function isPure(node: Node): boolean {
  if (node.kind >= SyntaxKind.NumericLiteral && node.kind <= SyntaxKind.StringLiteral) return true;
  if (node.kind === SyntaxKind.TrueKeyword || node.kind === SyntaxKind.FalseKeyword) return true;
  if (node.kind === SyntaxKind.Identifier) return true;

  if (node.kind === SyntaxKind.BinaryExpression) {
    const bin = node as BinaryExpression;
    return isPure(bin.left) && isPure(bin.right);
  }

  return false;
}
