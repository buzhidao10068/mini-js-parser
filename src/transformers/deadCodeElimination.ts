import type {
  BinaryExpression,
  Block,
  ExpressionStatement,
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
import { forEachChild, isDeclarationName } from '../binder';

export function deadCodeEliminationTransformer(): TransformerFactory {
  return function (context) {
    let liveSymbols: Set<Symbol> | undefined;

    return function (node) {
      if (node.kind === SyntaxKind.SourceFile && !liveSymbols) {
        liveSymbols = analyzeLiveness(node);
      }
      return context.visitEachChild(node, visitor, context);
    };

    function visitor(node: Node): Node | undefined {
      if (node.flowNode && !isReachable(node.flowNode)) {
        return undefined;
      }

      if (node.kind === SyntaxKind.FunctionDecl) {
        const funcDecl = node as FunctionDeclaration;
        const symbol = getSymbolInScope(funcDecl.name, funcDecl.parent);
        if (symbol && !liveSymbols?.has(symbol) && symbol.name !== 'main') {
          return undefined;
        }
      } else if (node.kind === SyntaxKind.VariableStatement) {
        const varStmt = node as VariableStatement;
        const decl = varStmt.declaration;
        const symbol = getSymbolInScope(decl.name, varStmt.parent);

        if (symbol && !liveSymbols?.has(symbol)) {
          if (!decl.initializer || isPure(decl.initializer)) {
            return undefined;
          } else {
            const exprStmt: ExpressionStatement = {
              kind: SyntaxKind.ExpressionStatement,
              expression: decl.initializer,
              pos: node.pos,
              end: node.end,
              _statementBrand: null,
            };
            return exprStmt;
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

function getSymbolInScope(nameNode: Identifier, startNode?: Node): Symbol | undefined {
  let current = startNode;
  while (current) {
    if ((current as Block).locals) {
      const scope = (current as Block).locals as Map<string, Symbol>;
      if (scope.has(nameNode.text)) {
        return scope.get(nameNode.text)!;
      }
    }
    current = current.parent;
  }
  return undefined;
}

function analyzeLiveness(root: Node): Set<Symbol> {
  const liveSymbols = new Set<Symbol>();
  const visitedNodes = new Set<Node>();
  const workList: Node[] = [];

  function markLive(node: Node) {
    if (visitedNodes.has(node)) return;
    visitedNodes.add(node);
    workList.push(node);
  }

  // TODO:
  // function findRoots(node: Node) {
  //   if (!node) return;

  //   if (node.flowNode && !isReachable(node.flowNode)) return;

  //   if (node.kind === SyntaxKind.SourceFile) {
  //   }

  //   if (node.kind === SyntaxKind.SourceFile) {
  //     const file = node;
  //   }

  //   if (node.kind === SyntaxKind.ExpressionStatement) {
  //   }
  // }

  // function collectRoots(node: Node) {
  //   if (!node) return;

  //   if (node.kind === SyntaxKind.SourceFile) {
  //   }
  // }

  // const sourceFile = root;

  // function getChildren(n: Node): Node[] {
  //   const children: Node[] = [];
  //   forEachChild(n, (child) => {
  //     children.push(child);
  //     return undefined;
  //   });
  //   return children;
  // }

  function rootVisitor(node: Node) {
    if (node.kind === SyntaxKind.SourceFile) {
      forEachChild(node, rootVisitor);
      return;
    }

    if (node.kind === SyntaxKind.FunctionDecl) {
      const func = node as FunctionDeclaration;
      if (func.name.text === 'main') {
        const symbol = getSymbolInScope(func.name, func.parent);
        if (symbol) markSymbolLive(symbol);
      }
      return;
    }

    if (node.kind === SyntaxKind.VariableStatement) {
      const v = node as VariableStatement;
      if (v.declaration.initializer && !isPure(v.declaration.initializer)) {
        markLive(v.declaration.initializer);
      }
      return;
    }

    markLive(node);
  }

  function markSymbolLive(symbol: Symbol) {
    if (liveSymbols.has(symbol)) return;
    liveSymbols.add(symbol);
    if (symbol.declarations) {
      for (const decl of symbol.declarations) {
        markLive(decl);
      }
    }
  }

  forEachChild(root, rootVisitor);

  let head = 0;
  while (head < workList.length) {
    const current = workList[head++];

    if (current.flowNode && !isReachable(current.flowNode)) continue;

    if (current.kind === SyntaxKind.Identifier) {
      const id = current as Identifier;
      if (!isDeclarationName(id)) {
        if (id.symbol) {
          markSymbolLive(id.symbol);
        }
      }
    }

    if (current.kind === SyntaxKind.Block || current.kind === SyntaxKind.SourceFile) {
      forEachChild(current, (child) => {
        if (shouldSkipInBlock(child)) return;
        markLive(child);
      });
    } else if (current.kind === SyntaxKind.FunctionDecl) {
      const func = current as FunctionDeclaration;
      if (func.parameters) func.parameters.forEach((p) => markLive(p));
      if (func.body) markLive(func.body);
    } else {
      forEachChild(current, (child) => {
        markLive(child);
      });
    }
  }

  return liveSymbols;
}

function shouldSkipInBlock(node: Node): boolean {
  if (node.kind === SyntaxKind.VariableStatement) {
    const varStmt = node as VariableStatement;
    if (!varStmt.declaration.initializer || isPure(varStmt.declaration.initializer)) {
      return true;
    }
    return false;
  }
  if (node.kind === SyntaxKind.FunctionDecl) {
    return true;
  }
  return false;
}

function isReachable(flow: FlowNode): boolean {
  if (flow.flags & FlowFlags.Unreachable) {
    return false;
  }

  return true;
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
