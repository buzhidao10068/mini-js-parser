import type {
  SourceFile,
  Statement,
  Expression,
  BinaryExpression,
  Identifier,
  Block,
  VariableStatement,
  IfStatement,
  WhileStatement,
  ForStatement,
  ReturnStatement,
  CallExpression,
  FunctionDeclaration,
  ArrayLiteralExpression,
  ObjectLiteralExpression,
  PropertyAssignment,
  ExpressionStatement,
  PrefixUnaryExpression,
  VariableDeclaration,
  PropertyAccessExpression,
  ElementAccessExpression,
  AssignmentExpression,
  LiteralExpression,
  PostfixUnaryExpression,
  Node,
} from './ast';
import { SyntaxKind } from './ast';
import { sourceMapGenerator } from './sourcemap';

export interface PrinterOptions {
  filename?: string;
  sourceMap?: boolean;
  minify?: boolean;
}

export function createPrinter(options: PrinterOptions = {}) {
  let output = '';
  let indentLevel = 0;
  let line = 1;
  let column = 0;
  let smg: ReturnType<typeof sourceMapGenerator> | undefined;

  if (options.sourceMap && options.filename) {
    smg = sourceMapGenerator(options.filename);
  }

  return {
    printFile,
    getSourceMap,
  };

  function printFile(sourceFile: SourceFile): string {
    output = '';
    indentLevel = 0;
    line = 1;
    column = 0;

    for (const stmt of sourceFile.statements) {
      printStatement(stmt);
    }

    return output;
  }

  function getSourceMap(): string | undefined {
    return smg?.toString();
  }

  function write(text: string, node?: Node) {
    if (node && smg && node.pos >= 0) {
      smg.addMapping(line, column, 1, 0);
    }

    output += text;
    for (const char of text) {
      if (char === '\n') {
        line++;
        column = 0;
      } else {
        column++;
      }
    }
  }

  function indent() {
    indentLevel++;
  }

  function dedent() {
    indentLevel--;
  }

  function writeIndent() {
    if (!options.minify) {
      write('  '.repeat(indentLevel));
    }
  }

  function printStatement(stmt: Statement) {
    writeIndent();
    switch (stmt.kind) {
      case SyntaxKind.VariableStatement:
        printVariableStatement(stmt as VariableStatement);
        break;
      case SyntaxKind.FunctionDecl:
        printFunctionDeclaration(stmt as FunctionDeclaration);
        break;
      case SyntaxKind.Block:
        printBlock(stmt as Block);
        break;
      case SyntaxKind.IfStatement:
        printIfStatement(stmt as IfStatement);
        break;
      case SyntaxKind.WhileStatement:
        printWhileStatement(stmt as WhileStatement);
        break;
      case SyntaxKind.ForStatement:
        printForStatement(stmt as ForStatement);
        break;
      case SyntaxKind.ReturnStatement:
        printReturnStatement(stmt as ReturnStatement);
        break;
      case SyntaxKind.ExpressionStatement:
        printExpressionStatement(stmt as ExpressionStatement);
        break;
    }
    if (
      !options.minify &&
      stmt.kind !== SyntaxKind.Block &&
      stmt.kind !== SyntaxKind.IfStatement &&
      stmt.kind !== SyntaxKind.FunctionDecl &&
      stmt.kind !== SyntaxKind.WhileStatement &&
      stmt.kind !== SyntaxKind.ForStatement
    ) {
      write(';\n');
    } else if (
      options.minify &&
      (stmt.kind === SyntaxKind.ExpressionStatement ||
        stmt.kind === SyntaxKind.VariableStatement ||
        stmt.kind === SyntaxKind.ReturnStatement)
    ) {
      write(';');
    }
  }

  function printBlock(block: Block) {
    write('{');
    if (!options.minify) write('\n');
    indent();
    for (const stmt of block.statements) {
      printStatement(stmt);
    }
    dedent();
    writeIndent();
    write('}');
    if (!options.minify) write('\n');
  }

  function printVariableStatement(stmt: VariableStatement) {
    write('let ', stmt);
    printVariableDeclaration(stmt.declaration);
  }

  function printVariableDeclaration(decl: VariableDeclaration) {
    printIdentifier(decl.name);
    if (decl.initializer) {
      write(options.minify ? '=' : ' = ');
      printExpression(decl.initializer);
    }
  }

  function printFunctionDeclaration(func: FunctionDeclaration) {
    write('function ', func);
    printIdentifier(func.name);
    write('(');
    func.parameters.forEach((param, index) => {
      printIdentifier(param.name);
      if (index < func.parameters.length - 1) write(options.minify ? ',' : ', ');
    });
    write(')');
    if (!options.minify) write(' ');
    printBlock(func.body);
  }

  function printIfStatement(stmt: IfStatement) {
    write('if', stmt);
    if (!options.minify) write(' ');
    write('(');
    printExpression(stmt.expression);
    write(')');
    if (!options.minify) write(' ');

    if (stmt.thenStatement.kind === SyntaxKind.Block) {
      printBlock(stmt.thenStatement as Block);
    } else {
      printStatement(stmt.thenStatement);
    }

    if (stmt.elseStatement) {
      if (!options.minify) write(' ');
      write('else');
      if (!options.minify) write(' ');
      if (
        stmt.elseStatement.kind === SyntaxKind.Block ||
        stmt.elseStatement.kind === SyntaxKind.IfStatement
      ) {
        if (stmt.elseStatement.kind === SyntaxKind.Block) {
          printBlock(stmt.elseStatement as Block);
        } else {
          printIfStatement(stmt.elseStatement as IfStatement);
        }
      } else {
        printStatement(stmt.elseStatement);
      }
    }
  }

  function printWhileStatement(stmt: WhileStatement) {
    write('while', stmt);
    if (!options.minify) write(' ');
    write('(');
    printExpression(stmt.expression);
    write(')');
    if (!options.minify) write(' ');
    if (stmt.statement.kind === SyntaxKind.Block) {
      printBlock(stmt.statement as Block);
    } else {
      printStatement(stmt.statement);
    }
  }

  function printForStatement(stmt: ForStatement) {
    write('for', stmt);
    if (!options.minify) write(' ');
    write('(');
    if (stmt.initializer) {
      if (stmt.initializer.kind === SyntaxKind.VariableStatement) {
        write('let ');
        printVariableDeclaration((stmt.initializer as VariableStatement).declaration);
      } else {
        printExpression(stmt.initializer as Expression);
      }
    }
    write(';');
    if (stmt.condition) {
      if (!options.minify) write(' ');
      printExpression(stmt.condition);
    }
    write(';');
    if (stmt.incrementor) {
      if (!options.minify) write(' ');
      printExpression(stmt.incrementor);
    }
    write(')');
    if (!options.minify) write(' ');
    if (stmt.statement.kind === SyntaxKind.Block) {
      printBlock(stmt.statement as Block);
    } else {
      printStatement(stmt.statement);
    }
  }

  function printReturnStatement(stmt: ReturnStatement) {
    write('return', stmt);
    if (stmt.expression) {
      write(' ');
      printExpression(stmt.expression);
    }
  }

  function printExpressionStatement(stmt: ExpressionStatement) {
    printExpression(stmt.expression);
  }

  function printExpression(expr: Expression) {
    switch (expr.kind) {
      case SyntaxKind.BinaryExpression:
        printBinaryExpression(expr as BinaryExpression);
        break;
      case SyntaxKind.AssignmentExpression:
        printAssignmentExpression(expr as AssignmentExpression);
        break;
      case SyntaxKind.Identifier:
        printIdentifier(expr as Identifier);
        break;
      case SyntaxKind.NumericLiteral:
      case SyntaxKind.StringLiteral:
      case SyntaxKind.TrueKeyword:
      case SyntaxKind.FalseKeyword:
        printLiteral(expr as LiteralExpression);
        break;
      case SyntaxKind.CallExpression:
        printCallExpression(expr as CallExpression);
        break;
      case SyntaxKind.ArrayLiteralExpression:
        printArrayLiteral(expr as ArrayLiteralExpression);
        break;
      case SyntaxKind.ObjectLiteralExpression:
        printObjectLiteral(expr as ObjectLiteralExpression);
        break;
      case SyntaxKind.PropertyAccessExpression:
        printPropertyAccess(expr as PropertyAccessExpression);
        break;
      case SyntaxKind.PrefixUnaryExpression:
        printPrefixUnary(expr as PrefixUnaryExpression);
        break;
      case SyntaxKind.PostfixUnaryExpression:
        printPostfixUnary(expr as PostfixUnaryExpression);
        break;
      case SyntaxKind.ElementAccessExpression:
        printElementAccess(expr as ElementAccessExpression);
        break;
    }
  }

  function printBinaryExpression(expr: BinaryExpression) {
    printExpression(expr.left);
    write(
      options.minify
        ? getOperator(expr.operatorToken.kind)
        : ` ${getOperator(expr.operatorToken.kind)} `,
    );
    printExpression(expr.right);
  }

  function printAssignmentExpression(expr: AssignmentExpression) {
    printExpression(expr.left);
    write(options.minify ? '=' : ' = ');
    printExpression(expr.right);
  }

  function getOperator(kind: SyntaxKind): string {
    switch (kind) {
      case SyntaxKind.PlusToken:
        return '+';
      case SyntaxKind.MinusToken:
        return '-';
      case SyntaxKind.AsteriskToken:
        return '*';
      case SyntaxKind.SlashToken:
        return '/';
      case SyntaxKind.EqualsToken:
        return '=';
      case SyntaxKind.EqualsEqualsToken:
        return '==';
      case SyntaxKind.ExclamationEqualsToken:
        return '!=';
      case SyntaxKind.LessThanToken:
        return '<';
      case SyntaxKind.LessThanEqualsToken:
        return '<=';
      case SyntaxKind.GreaterThanToken:
        return '>';
      case SyntaxKind.GreaterThanEqualsToken:
        return '>=';
      case SyntaxKind.PlusPlusToken:
        return '++';
      default:
        return '?';
    }
  }

  function printIdentifier(node: Identifier) {
    write(node.text, node);
  }

  function printLiteral(node: LiteralExpression) {
    if (node.kind === SyntaxKind.StringLiteral) {
      write(`"${node.value}"`, node);
    } else {
      write(node.text || node.value.toString(), node);
    }
  }

  function printCallExpression(expr: CallExpression) {
    printExpression(expr.expression);
    write('(');
    expr.arguments.forEach((arg, i) => {
      printExpression(arg);
      if (i < expr.arguments.length - 1) write(options.minify ? ',' : ', ');
    });
    write(')');
  }

  function printArrayLiteral(expr: ArrayLiteralExpression) {
    write('[');
    expr.elements.forEach((el, i) => {
      printExpression(el);
      if (i < expr.elements.length - 1) write(options.minify ? ',' : ', ');
    });
    write(']');
  }

  function printObjectLiteral(expr: ObjectLiteralExpression) {
    write('{');
    if (expr.properties.length > 0) write(' ');
    expr.properties.forEach((prop, i) => {
      printPropertyAssignment(prop);
      if (i < expr.properties.length - 1) write(options.minify ? ',' : ', ');
    });
    if (expr.properties.length > 0) write(' ');
    write('}');
  }

  function printPropertyAssignment(prop: PropertyAssignment) {
    if (prop.name.kind === SyntaxKind.Identifier) {
      printIdentifier(prop.name as Identifier);
    } else {
      printLiteral(prop.name);
    }
    write(options.minify ? ':' : ': ');
    printExpression(prop.initializer);
  }

  function printPropertyAccess(expr: PropertyAccessExpression) {
    printExpression(expr.expression);
    write('.');
    printIdentifier(expr.name);
  }

  function printElementAccess(expr: ElementAccessExpression) {
    printExpression(expr.expression);
    write('[');
    printExpression(expr.argumentExpression);
    write(']');
  }

  function printPrefixUnary(expr: PrefixUnaryExpression) {
    write(getOperator(expr.operator));
    printExpression(expr.operand);
  }

  function printPostfixUnary(expr: PostfixUnaryExpression) {
    printExpression(expr.operand);
    write(getOperator(expr.operator));
  }
}
