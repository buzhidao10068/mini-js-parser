import type {
  Block,
  Expression,
  FunctionDeclaration,
  Identifier,
  LiteralExpression,
  ParameterDeclaration,
  ReturnStatement,
  SourceFile,
  Statement,
  VariableStatement,
  WhileStatement,
} from './ast';
import { SyntaxKind } from './ast';
import { createScanner } from './scanner';

export enum ScopeFlags {
  None = 0,
  InFunction = 1 << 0,
  InIteration = 1 << 1,
  InSwitch = 1 << 2,
}

export function createParser(text: string) {
  const scanner = createScanner(text);
  let token: SyntaxKind;
  let scopeFlags = ScopeFlags.None;

  return {
    parseSourceFile,
  };

  function curToken() {
    return token;
  }

  function nextToken() {
    return (token = scanner.scan());
  }

  function parseSourceFile(): SourceFile {
    nextToken();
    const statements: Statement[] = [];
    while (curToken() !== SyntaxKind.EndOfFileToken) {
      statements.push(parseStatement());
    }

    return {
      kind: SyntaxKind.SourceFile,
      pos: 0,
      end: scanner.getTextPos(),
      statements,
      text,
    };
  }

  function parseStatement(): Statement {
    switch (curToken()) {
      case SyntaxKind.LetKeyword:
        if (isLetDeclaration()) {
          return parseVariableStatement();
        }
        break;
      case SyntaxKind.FunctionKeyword:
        return parseFunctionDeclaration();
      case SyntaxKind.OpenBraceToken:
        return parseBlock();
      case SyntaxKind.WhileKeyword:
        return parseWhileStatement();
      case SyntaxKind.ReturnKeyword:
        return parseReturnStatement();
    }
    return {
      kind: SyntaxKind.ExpressionStatement,
      pos: 0,
      end: 0,
      _statementBrand: undefined,
    };
  }

  function parseVariableStatement(): VariableStatement {
    const pos = scanner.getTokenPos();
    nextToken();

    if (curToken() !== SyntaxKind.Identifier) {
      throw new Error('let 语句必须绑定一个标识符');
    }
    const identifier = parseIdentifier();

    let initializer: Expression | undefined;
    if (curToken() === SyntaxKind.EqualsToken) {
      nextToken();
      initializer = parseExpression();
    }

    parseSemicolon();

    return {
      kind: SyntaxKind.VariableStatement,
      pos,
      end: scanner.getTokenPos(),
      declaration: {
        kind: SyntaxKind.VariableDeclaration,
        pos: identifier.pos,
        end: initializer ? initializer.end : identifier.end,
        name: identifier,
        initializer,
      },
      _statementBrand: null,
    };
  }

  function parseFunctionDeclaration(): FunctionDeclaration {
    const pos = scanner.getTokenPos();
    nextToken();

    if (curToken() !== SyntaxKind.Identifier) {
      throw new Error('函数声明语句必须绑定一个标识符');
    }
    const name = parseIdentifier();

    expect(SyntaxKind.OpenParenToken);

    const parameters: ParameterDeclaration[] = [];
    while (
      curToken() !== SyntaxKind.CloseParenToken &&
      curToken() !== SyntaxKind.EndOfFileToken
    ) {
      if (curToken() !== SyntaxKind.Identifier) {
        throw new Error('函数参数必须绑定一个标识符');
      }
      const paramPos = scanner.getTokenPos();
      const paramName = parseIdentifier();
      parameters.push({
        kind: SyntaxKind.ParameterDecl,
        pos: paramPos,
        end: paramName.end,
        name: paramName,
      });

      if (curToken() === SyntaxKind.CommaToken) {
        nextToken();
      }
    }

    expect(SyntaxKind.CloseParenToken);

    const saveScopeFlags = scopeFlags;
    scopeFlags |= ScopeFlags.InFunction;
    const body = parseBlock();
    scopeFlags = saveScopeFlags;

    return {
      kind: SyntaxKind.FunctionDecl,
      pos,
      end: body.end,
      name,
      parameters,
      body,
      _statementBrand: null,
    };
  }

  function parseBlock(): Block {
    const pos = scanner.getTokenPos();
    nextToken();
    const statements: Statement[] = [];
    while (
      curToken() !== SyntaxKind.CloseBraceToken &&
      curToken() !== SyntaxKind.EndOfFileToken
    ) {
      statements.push(parseStatement());
    }
    if (curToken() !== SyntaxKind.CloseBraceToken) {
      throw new Error("Expected '}'");
    }
    nextToken();
    return {
      kind: SyntaxKind.Block,
      pos,
      end: scanner.getTokenPos(),
      statements,
      _statementBrand: null,
    };
  }

  function parseWhileStatement(): WhileStatement {
    const pos = scanner.getTokenPos();
    nextToken(); // while
    expect(SyntaxKind.OpenParenToken);
    const expression = parseExpression();
    expect(SyntaxKind.CloseParenToken);
    const statement = parseStatement();
    return {
      kind: SyntaxKind.WhileStatement,
      pos,
      end: statement.end,
      expression,
      statement,
      _statementBrand: null,
    };
  }

  function parseReturnStatement(): ReturnStatement {
    if ((scopeFlags & ScopeFlags.InFunction) === 0) {
      throw new Error('return 语句只能在函数体中使用');
    }
    const pos = scanner.getTokenPos();
    nextToken();
    let expression: Expression | undefined;
    if (curToken() !== SyntaxKind.SemicolonToken) {
      expression = parseExpression();
    }
    expect(SyntaxKind.SemicolonToken);
    return {
      kind: SyntaxKind.ReturnStatement,
      pos,
      end: scanner.getTokenPos(),
      expression,
      _statementBrand: null,
    };
  }

  function parseIdentifier(): Identifier {
    const pos = scanner.getTokenPos();
    const text = scanner.getTokenValue();
    nextToken();
    return {
      kind: SyntaxKind.Identifier,
      pos,
      end: scanner.getTokenPos(),
      text,
      _expressionBrand: null,
    };
  }

  function parseExpression(): Expression {
    return parsePrimaryExpression();
  }

  function parsePrimaryExpression(): Expression {
    const pos = scanner.getTokenPos();
    if (curToken() === SyntaxKind.NumericLiteral) {
      const val = parseFloat(scanner.getTokenValue());
      const text = scanner.getTokenText();
      nextToken();
      return {
        kind: SyntaxKind.NumericLiteral,
        pos,
        end: scanner.getTokenPos(),
        value: val,
        text,
        _expressionBrand: null,
      } as LiteralExpression;
    } else if (
      curToken() === SyntaxKind.TrueKeyword ||
      curToken() === SyntaxKind.FalseKeyword
    ) {
      const kind = curToken();
      const text = kind === SyntaxKind.TrueKeyword ? 'true' : 'false';
      nextToken();
      return {
        kind,
        pos,
        end: scanner.getTokenPos(),
        value: kind === SyntaxKind.TrueKeyword,
        text,
        _expressionBrand: null,
      } as LiteralExpression;
    } else if (curToken() === SyntaxKind.StringLiteral) {
      const text = scanner.getTokenValue(); // scanner stripped quotes
      nextToken();
      return {
        kind: SyntaxKind.StringLiteral,
        pos,
        end: scanner.getTokenPos(),
        value: text,
        text,
        _expressionBrand: null,
      } as LiteralExpression;
    }

    throw new Error(
      `Unexpected token: ${SyntaxKind[curToken()]} at position ${pos}`,
    );
  }

  function parseSemicolon() {
    if (curToken() !== SyntaxKind.SemicolonToken) {
      throw new Error('变量声明语句必须以分号结尾');
    }
    nextToken();
  }

  function lookAhead<T>(callback: () => T): T {
    return scanner.lookAhead(callback);
  }

  function isLetDeclaration(): boolean {
    return lookAhead(nextTokenIsBindingIdentifier);
  }

  function isBindingIdentifier(): boolean {
    return curToken() === SyntaxKind.Identifier;
  }

  function nextTokenIsBindingIdentifier(): boolean {
    nextToken();
    return isBindingIdentifier();
  }

  function expect(kind: SyntaxKind) {
    if (curToken() !== kind) {
      throw new Error(
        `这里应该是 ${SyntaxKind[kind]} 但得到 ${SyntaxKind[curToken()]} 在 ${scanner.getTokenPos()}`,
      );
    }
    nextToken();
  }
}
