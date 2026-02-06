import type {
  FunctionDeclaration,
  Node,
  ParameterDeclaration,
  SourceFile,
  VariableDeclaration,
  Symbol,
  Block,
  VariableStatement,
  ExpressionStatement,
  IfStatement,
  WhileStatement,
  ForStatement,
  ForInStatement,
  ReturnStatement,
  BinaryExpression,
  PrefixUnaryExpression,
  CallExpression,
  ArrayLiteralExpression,
  ObjectLiteralExpression,
  PropertyAssignment,
  PropertyAccessExpression,
  ElementAccessExpression,
  DeleteExpression,
  FlowNode,
  LocalScope,
  AssignmentExpression,
  PostfixUnaryExpression,
  Identifier,
} from './ast';
import { SyntaxKind, FlowFlags } from './ast';

type CbNode<T> = (node: Node) => T | undefined;

export function bindSourceFile(file: SourceFile) {
  let parent: Node | undefined;
  let currentScope: LocalScope = new Map();
  let currentFlow: FlowNode = {
    flags: FlowFlags.Start,
  };

  file.locals = currentScope;

  bind(file);

  function bind(node: Node) {
    if (!node) return;
    node.parent = parent;
    node.flowNode = currentFlow;

    const saveParent = parent;
    parent = node;

    let saveScope = currentScope;
    if (
      (node.kind === SyntaxKind.Block && node.parent?.kind !== SyntaxKind.FunctionDecl) ||
      node.kind === SyntaxKind.ForStatement ||
      node.kind === SyntaxKind.ForInStatement ||
      node.kind === SyntaxKind.FunctionDecl
    ) {
      currentScope = new Map();
      (node as SourceFile).locals = currentScope;
    }

    if (node.kind === SyntaxKind.VariableDeclaration) {
      const decl = node as VariableDeclaration;
      declareSymbol(decl.name.text, decl);
    } else if (node.kind === SyntaxKind.FunctionDecl) {
      const funcDecl = node as FunctionDeclaration;
      declareSymbolInScope(saveScope, funcDecl.name.text, funcDecl);
    } else if (node.kind === SyntaxKind.ParameterDecl) {
      const param = node as ParameterDeclaration;
      declareSymbol(param.name.text, param);
    }

    switch (node.kind) {
      case SyntaxKind.IfStatement:
        bindIfStatement(node as IfStatement);
        break;
      case SyntaxKind.WhileStatement:
        bindWhileStatement(node as WhileStatement);
        break;
      case SyntaxKind.ForStatement:
        bindForStatement(node as ForStatement);
        break;
      case SyntaxKind.ForInStatement:
        bindForInStatement(node as ForInStatement);
        break;
      case SyntaxKind.VariableStatement:
        forEachChild(node, bind);
        break;
      case SyntaxKind.ExpressionStatement:
        forEachChild(node, bind);
        break;
      case SyntaxKind.PropertyAccessExpression:
      case SyntaxKind.ElementAccessExpression:
      case SyntaxKind.DeleteExpression:
        forEachChild(node, bind);
        break;
      case SyntaxKind.FunctionDecl:
        bindFunctionDeclaration(node as FunctionDeclaration);
        break;
      case SyntaxKind.ReturnStatement:
        bindReturnStatement(node as ReturnStatement);
        break;
      case SyntaxKind.Identifier:
        bindIdentifier(node as Identifier);
        break;
      default:
        forEachChild(node, bind);
        break;
    }

    currentScope = saveScope;
    parent = saveParent;
  }

  function declareSymbol(name: string, declaration: Node) {
    let symbol = currentScope.get(name);
    if (!symbol) {
      symbol = { name, declarations: [] };
      currentScope.set(name, symbol);
    }
    symbol.declarations.push(declaration);
  }

  function declareSymbolInScope(scope: Map<string, Symbol>, name: string, declaration: Node) {
    let symbol = scope.get(name);
    if (!symbol) {
      symbol = { name, declarations: [] };
      scope.set(name, symbol);
    }
    symbol.declarations.push(declaration);
  }

  function resolveSymbol(id: Identifier) {
    let current: Node | undefined = id;
    while (current) {
      if ((current as SourceFile).locals) {
        const scope = (current as SourceFile).locals as Map<string, Symbol>;
        if (scope.has(id.text)) {
          const symbol = scope.get(id.text)!;
          symbol.isReferenced = true;
          id.symbol = symbol;
          return;
        }
      }
      current = current.parent;
    }
    if (file.locals && file.locals.has(id.text)) {
      file.locals.get(id.text)!.isReferenced = true;
      const symbol = file.locals.get(id.text)!;
      symbol.isReferenced = true;
      id.symbol = symbol;
    }
  }

  function createFlowCondition(flags: FlowFlags, expression: Node): FlowNode {
    const flow: FlowNode = {
      flags,
      antecedent: currentFlow,
      node: expression,
    };
    return flow;
  }

  function createFlowLabel(): FlowNode {
    const flow: FlowNode = {
      flags: FlowFlags.BranchLabel,
      antecedents: [],
    };
    return flow;
  }

  function bindIfStatement(node: IfStatement) {
    bind(node.expression);

    currentFlow = createFlowCondition(FlowFlags.TrueCondition, node.expression);
    bind(node.thenStatement);
    const thenFlow = currentFlow;

    currentFlow = createFlowCondition(FlowFlags.FalseCondition, node.expression);
    if (node.elseStatement) bind(node.elseStatement);
    const elseFlow = currentFlow;

    const mergeNode = createFlowLabel();
    if (mergeNode.antecedents) {
      mergeNode.antecedents.push(thenFlow);
      mergeNode.antecedents.push(elseFlow);
    }
    currentFlow = mergeNode;

    if (thenFlow.flags & FlowFlags.Unreachable && elseFlow.flags & FlowFlags.Unreachable) {
      currentFlow.flags |= FlowFlags.Unreachable;
    }
  }

  function bindWhileStatement(node: WhileStatement) {
    const preLoopFlow = currentFlow;

    const loopLabel = createFlowLabel();
    if (loopLabel.antecedents) {
      loopLabel.antecedents.push(preLoopFlow);
    }

    bind(node.expression);

    currentFlow = createFlowCondition(FlowFlags.TrueCondition, node.expression);
    bind(node.statement);

    if (loopLabel.antecedents) {
      loopLabel.antecedents.push(currentFlow);
    }

    currentFlow = createFlowCondition(FlowFlags.FalseCondition, node.expression);
    currentFlow.antecedent = loopLabel;
  }

  function bindForStatement(node: ForStatement) {
    if (node.initializer) bind(node.initializer);

    const preLoopFlow = currentFlow;
    const loopLabel = createFlowLabel();
    if (loopLabel.antecedents) loopLabel.antecedents.push(preLoopFlow);
    currentFlow = loopLabel;

    if (node.condition) bind(node.condition);

    currentFlow = createFlowCondition(FlowFlags.TrueCondition, node.condition || node);
    bind(node.statement);

    if (node.incrementor) bind(node.incrementor);

    if (loopLabel.antecedents) loopLabel.antecedents.push(currentFlow);

    currentFlow = createFlowCondition(FlowFlags.FalseCondition, node.condition || node);
    currentFlow.antecedent = loopLabel;
  }

  function bindForInStatement(node: ForInStatement) {
    bind(node.expression);

    const preLoopFlow = currentFlow;
    const loopLabel = createFlowLabel();
    if (loopLabel.antecedents) loopLabel.antecedents.push(preLoopFlow);
    currentFlow = loopLabel;

    bind(node.initializer);

    currentFlow = createFlowCondition(FlowFlags.TrueCondition, node.expression);
    bind(node.statement);

    if (loopLabel.antecedents) loopLabel.antecedents.push(currentFlow);

    currentFlow = createFlowCondition(FlowFlags.FalseCondition, node.expression);
    currentFlow.antecedent = loopLabel;
  }

  function bindFunctionDeclaration(node: FunctionDeclaration) {
    if (node.name) bind(node.name);
    if (node.parameters) {
      for (const param of node.parameters) bind(param);
    }

    const saveFlow = currentFlow;
    currentFlow = {
      flags: FlowFlags.Start,
    };
    if (node.body) bind(node.body);
    currentFlow = saveFlow;
  }

  function bindReturnStatement(node: ReturnStatement) {
    forEachChild(node, bind);
    currentFlow = {
      flags: FlowFlags.Unreachable,
      antecedent: currentFlow,
    };
  }

  function bindIdentifier(node: Identifier) {
    if (!isDeclarationName(node)) {
      resolveSymbol(node);
    }
  }
}

export function forEachChild<T>(node: Node, cbNode: CbNode<T>): T | undefined {
  if (!node || !node.kind) return undefined;

  switch (node.kind) {
    case SyntaxKind.SourceFile:
      return visitNodes((node as SourceFile).statements, cbNode);
    case SyntaxKind.FunctionDecl:
      return bindFunctionDeclaration(node as FunctionDeclaration, cbNode);
    case SyntaxKind.Block:
      return bindBlockStatement(node as Block, cbNode);
    case SyntaxKind.VariableStatement:
      return bindVariableStatement(node as VariableStatement, cbNode);
    case SyntaxKind.VariableDeclaration:
      return bindVariableDeclaration(node as VariableDeclaration, cbNode);
    case SyntaxKind.ExpressionStatement:
      return bindExpressionStatement(node as ExpressionStatement, cbNode);
    case SyntaxKind.IfStatement:
      return bindIfStatement(node as IfStatement, cbNode);
    case SyntaxKind.WhileStatement:
      return bindWhileStatement(node as WhileStatement, cbNode);
    case SyntaxKind.ForStatement:
      return bindForStatement(node as ForStatement, cbNode);
    case SyntaxKind.ForInStatement:
      return bindForInStatement(node as ForInStatement, cbNode);
    case SyntaxKind.ReturnStatement:
      return bindReturnStatement(node as ReturnStatement, cbNode);
    case SyntaxKind.BinaryExpression:
      return bindBinaryExpression(node as BinaryExpression, cbNode);
    case SyntaxKind.AssignmentExpression:
      return bindAssignmentExpression(node as AssignmentExpression, cbNode);
    case SyntaxKind.PrefixUnaryExpression:
      return bindPrefixUnaryExpression(node as PrefixUnaryExpression, cbNode);
    case SyntaxKind.PostfixUnaryExpression:
      return bindPostfixUnaryExpression(node as PostfixUnaryExpression, cbNode);
    case SyntaxKind.CallExpression:
      return bindCallExpression(node as CallExpression, cbNode);
    case SyntaxKind.ArrayLiteralExpression:
      return bindArrayLiteralExpression(node as ArrayLiteralExpression, cbNode);
    case SyntaxKind.ObjectLiteralExpression:
      return bindObjectLiteralExpression(node as ObjectLiteralExpression, cbNode);
    case SyntaxKind.PropertyAssignment:
      return bindPropertyAssignment(node as PropertyAssignment, cbNode);
    case SyntaxKind.PropertyAccessExpression:
      return bindPropertyAccessExpression(node as PropertyAccessExpression, cbNode);
    case SyntaxKind.ElementAccessExpression:
      return bindElementAccessExpression(node as ElementAccessExpression, cbNode);
    case SyntaxKind.DeleteExpression:
      return bindDeleteExpression(node as DeleteExpression, cbNode);
  }
}

function bindFunctionDeclaration<T>(node: FunctionDeclaration, cbNode: CbNode<T>) {
  return cbNode(node.name) || visitNodes(node.parameters, cbNode) || cbNode(node.body);
}

function bindBlockStatement<T>(node: Block, cbNode: CbNode<T>) {
  return visitNodes(node.statements, cbNode);
}

function bindVariableStatement<T>(node: VariableStatement, cbNode: CbNode<T>) {
  return node.declaration && cbNode(node.declaration);
}

function bindVariableDeclaration<T>(node: VariableDeclaration, cbNode: CbNode<T>) {
  if (node.name && cbNode(node.name)) return;
  return node.initializer && cbNode(node.initializer);
}

function bindWhileStatement<T>(node: WhileStatement, cbNode: CbNode<T>) {
  return cbNode(node.expression) || cbNode(node.statement);
}

function bindExpressionStatement<T>(node: ExpressionStatement, cbNode: CbNode<T>) {
  return cbNode(node.expression);
}

function bindIfStatement<T>(node: IfStatement, cbNode: CbNode<T>) {
  return (
    cbNode(node.expression) ||
    cbNode(node.thenStatement) ||
    (node.elseStatement && cbNode(node.elseStatement))
  );
}

function bindForStatement<T>(node: ForStatement, cbNode: CbNode<T>) {
  return (
    (node.initializer && cbNode(node.initializer)) ||
    (node.condition && cbNode(node.condition)) ||
    (node.incrementor && cbNode(node.incrementor)) ||
    cbNode(node.statement)
  );
}

function bindForInStatement<T>(node: ForInStatement, cbNode: CbNode<T>) {
  return cbNode(node.initializer) || cbNode(node.expression) || cbNode(node.statement);
}

function bindReturnStatement<T>(node: ReturnStatement, cbNode: CbNode<T>) {
  return node.expression && cbNode(node.expression);
}

function bindBinaryExpression<T>(node: BinaryExpression, cbNode: CbNode<T>) {
  return cbNode(node.left) || cbNode(node.right);
}

function bindAssignmentExpression<T>(node: AssignmentExpression, cbNode: CbNode<T>) {
  return cbNode(node.left) || cbNode(node.right);
}

function bindPrefixUnaryExpression<T>(node: PrefixUnaryExpression, cbNode: CbNode<T>) {
  return cbNode(node.operand);
}

function bindPostfixUnaryExpression<T>(node: PostfixUnaryExpression, cbNode: CbNode<T>) {
  return cbNode(node.operand);
}

function bindCallExpression<T>(node: CallExpression, cbNode: CbNode<T>) {
  return cbNode(node.expression) || visitNodes(node.arguments, cbNode);
}

function bindArrayLiteralExpression<T>(node: ArrayLiteralExpression, cbNode: CbNode<T>) {
  return visitNodes(node.elements, cbNode);
}

function bindObjectLiteralExpression<T>(node: ObjectLiteralExpression, cbNode: CbNode<T>) {
  return visitNodes(node.properties, cbNode);
}

function bindPropertyAssignment<T>(node: PropertyAssignment, cbNode: CbNode<T>) {
  return cbNode(node.name) || cbNode(node.initializer);
}

function bindPropertyAccessExpression<T>(node: PropertyAccessExpression, cbNode: CbNode<T>) {
  if (cbNode(node.expression)) return;
  return cbNode(node.name);
}

function bindElementAccessExpression<T>(node: ElementAccessExpression, cbNode: CbNode<T>) {
  return cbNode(node.expression) || cbNode(node.argumentExpression);
}

function bindDeleteExpression<T>(node: DeleteExpression, cbNode: CbNode<T>) {
  return cbNode(node.expression);
}

function visitNodes<T>(nodes: Node[], cbNode: CbNode<T>): T | undefined {
  if (nodes) {
    for (const node of nodes) {
      const result = cbNode(node);
      if (result) return result;
    }
  }
  return undefined;
}

export function isDeclarationName(id: Identifier): boolean {
  const parent = id.parent;
  if (!parent) return false;
  if (parent.kind === SyntaxKind.VariableDeclaration) {
    return (parent as VariableDeclaration).name === id;
  }
  if (parent.kind === SyntaxKind.FunctionDecl) {
    return (parent as FunctionDeclaration).name === id;
  }
  if (parent.kind === SyntaxKind.ParameterDecl) {
    return (parent as ParameterDeclaration).name === id;
  }
  return false;
}
