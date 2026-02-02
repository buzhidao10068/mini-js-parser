import type {
  ArrayLiteralExpression,
  AssignmentExpression,
  BinaryExpression,
  Block,
  CallExpression,
  DeleteExpression,
  ElementAccessExpression,
  Expression,
  ExpressionStatement,
  ForInStatement,
  ForStatement,
  FunctionDeclaration,
  Identifier,
  IfStatement,
  LiteralExpression,
  ObjectLiteralExpression,
  ParameterDeclaration,
  PostfixUnaryExpression,
  PrefixUnaryExpression,
  PropertyAccessExpression,
  PropertyAssignment,
  ReturnStatement,
  SourceFile,
  Statement,
  VariableStatement,
  WhileStatement,
} from './ast';
import { SyntaxKind } from './ast';
import { createScanner } from './scanner';
import { getOperatorPrecedence, OperatorPrecedence } from './utilities';

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
      case SyntaxKind.DoKeyword:
        return parseDoStatement();
      case SyntaxKind.ForKeyword:
        return parseForStatement();
      case SyntaxKind.IfKeyword:
        return parseIfStatement();
      case SyntaxKind.ReturnKeyword:
        return parseReturnStatement();
    }
    return parseExpressionStatement();
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
    while (curToken() !== SyntaxKind.CloseParenToken && curToken() !== SyntaxKind.EndOfFileToken) {
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
    while (curToken() !== SyntaxKind.CloseBraceToken && curToken() !== SyntaxKind.EndOfFileToken) {
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
    nextToken();
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

  function parseForStatement(): ForStatement | ForInStatement {
    const pos = scanner.getTokenPos();
    nextToken();
    expect(SyntaxKind.OpenParenToken);

    if (lookAhead(nextTokenIsInKeyword)) {
      return parseForInStatement(pos);
    } else {
      let initializer: VariableStatement | Expression | undefined;

      if (curToken() === SyntaxKind.LetKeyword) {
        initializer = parseVariableStatement();
      } else if (curToken() !== SyntaxKind.SemicolonToken) {
        initializer = parseExpression();
        expect(SyntaxKind.SemicolonToken);
      } else {
        expect(SyntaxKind.SemicolonToken);
      }

      let condition: Expression | undefined;
      if (curToken() !== SyntaxKind.SemicolonToken) {
        condition = parseExpression();
      }
      expect(SyntaxKind.SemicolonToken);

      let incrementor: Expression | undefined;
      if (curToken() !== SyntaxKind.CloseParenToken) {
        incrementor = parseExpression();
      }
      expect(SyntaxKind.CloseParenToken);

      const statement = parseStatement();

      return {
        kind: SyntaxKind.ForStatement,
        pos,
        end: statement.end,
        initializer,
        condition,
        incrementor,
        statement,
        _statementBrand: null,
      };
    }
  }

  function parseDoStatement(): DoStatement {
    const pos = scanner.getTokenPos();
    nextToken(); // eat 'do'

    const statement = parseStatement();

    expect(SyntaxKind.WhileKeyword);
    expect(SyntaxKind.OpenParenToken);
    const expression = parseExpression();
    expect(SyntaxKind.CloseParenToken);
    parseSemicolon();

    return {
      kind: SyntaxKind.DoStatement,
      pos,
      end: scanner.getTokenPos(),
      statement,
      expression,
      _statementBrand: null,
    };
  }

  function parseForInStatement(pos: number): ForInStatement {
    nextToken();
    const name = parseIdentifier();
    expect(SyntaxKind.InKeyword);
    const expression = parseExpression();
    expect(SyntaxKind.CloseParenToken);
    const statement = parseStatement();

    return {
      kind: SyntaxKind.ForInStatement,
      pos,
      end: statement.end,
      initializer: {
        kind: SyntaxKind.VariableDeclaration,
        pos: name.pos,
        end: name.end,
        name,
      },
      expression,
      statement,
      _statementBrand: null,
    };
  }

  function parseIfStatement(): IfStatement {
    const pos = scanner.getTokenPos();
    nextToken();
    expect(SyntaxKind.OpenParenToken);
    const expression = parseExpression();
    expect(SyntaxKind.CloseParenToken);
    const thenStatement = parseStatement();
    let elseStatement: Statement | undefined;
    if (curToken() === SyntaxKind.ElseKeyword) {
      nextToken();
      elseStatement = parseStatement();
    }
    return {
      kind: SyntaxKind.IfStatement,
      pos,
      end: elseStatement ? elseStatement.end : thenStatement.end,
      expression,
      thenStatement,
      elseStatement,
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
    parseSemicolon();
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
    return parseBinaryExpression(OperatorPrecedence.Lowest);
  }

  function parseBinaryExpression(minPrecedence: number): Expression {
    let left = parseUnaryExpression();

    while (true) {
      const operatorToken = curToken();
      const precedence = getOperatorPrecedence(operatorToken);

      if (precedence === OperatorPrecedence.Lowest || precedence < minPrecedence) {
        break;
      }

      nextToken();
      const nextMinPrecedence =
        operatorToken === SyntaxKind.EqualsToken ? precedence : precedence + 1;
      const right = parseBinaryExpression(nextMinPrecedence);

      if (operatorToken === SyntaxKind.EqualsToken) {
        left = {
          kind: SyntaxKind.AssignmentExpression,
          pos: left.pos,
          end: right.end,
          left,
          right,
          _expressionBrand: null,
        } as AssignmentExpression;
      } else {
        left = {
          kind: SyntaxKind.BinaryExpression,
          pos: left.pos,
          end: right.end,
          left,
          operatorToken: { kind: operatorToken, pos: 0, end: 0 },
          right,
          _expressionBrand: null,
        } as BinaryExpression;
      }
    }

    return left;
  }

  function parseUnaryExpression(): Expression {
    if (
      curToken() === SyntaxKind.PlusPlusToken ||
      curToken() === SyntaxKind.MinusMinusToken ||
      curToken() === SyntaxKind.PlusToken ||
      curToken() === SyntaxKind.MinusToken
    ) {
      const pos = scanner.getTokenPos();
      const operator = curToken();
      nextToken();
      const operand = parseUnaryExpression();
      return {
        kind: SyntaxKind.PrefixUnaryExpression,
        pos,
        end: operand.end,
        operator,
        operand,
        _expressionBrand: null,
      } as PrefixUnaryExpression;
    }

    if (curToken() === SyntaxKind.DeleteKeyword) {
      const pos = scanner.getTokenPos();
      nextToken();
      const expression = parseUnaryExpression();
      return {
        kind: SyntaxKind.DeleteExpression,
        pos,
        end: expression.end,
        expression,
        _expressionBrand: null,
      } as DeleteExpression;
    }

    let expression = parseMemberExpression();

    if (curToken() === SyntaxKind.PlusPlusToken || curToken() === SyntaxKind.MinusMinusToken) {
      const operator = curToken();
      const pos = expression.pos;
      const end = scanner.getTokenPos();
      nextToken();
      return {
        kind: SyntaxKind.PostfixUnaryExpression,
        pos,
        end,
        operand: expression,
        operator,
        _expressionBrand: null,
      } as PostfixUnaryExpression;
    }

    return expression;
  }

  function parseMemberExpression(): Expression {
    let expression = parsePrimaryExpression();
    while (true) {
      if (curToken() === SyntaxKind.DotToken) {
        nextToken(); // .
        const name = parseIdentifier();
        expression = {
          kind: SyntaxKind.PropertyAccessExpression,
          pos: expression.pos,
          end: name.end,
          expression,
          name,
          _expressionBrand: null,
        } as PropertyAccessExpression;
      } else if (curToken() === SyntaxKind.OpenBracketToken) {
        nextToken();
        const argumentExpression = parseExpression();
        expect(SyntaxKind.CloseBracketToken);
        expression = {
          kind: SyntaxKind.ElementAccessExpression,
          pos: expression.pos,
          end: scanner.getTokenPos(),
          expression,
          argumentExpression,
          _expressionBrand: null,
        } as ElementAccessExpression;
      } else if (curToken() === SyntaxKind.OpenParenToken) {
        nextToken();
        const args: Expression[] = [];
        while (
          (curToken() as SyntaxKind) !== SyntaxKind.CloseParenToken &&
          (curToken() as SyntaxKind) !== SyntaxKind.EndOfFileToken
        ) {
          args.push(parseExpression());
          if ((curToken() as SyntaxKind) === SyntaxKind.CommaToken) {
            nextToken();
          }
        }
        expect(SyntaxKind.CloseParenToken);
        expression = {
          kind: SyntaxKind.CallExpression,
          pos: expression.pos,
          end: scanner.getTokenPos(),
          expression,
          arguments: args,
          _expressionBrand: null,
        } as CallExpression;
      } else {
        break;
      }
    }
    return expression;
  }

  function parsePrimaryExpression(): Expression {
    const pos = scanner.getTokenPos();
    if (curToken() === SyntaxKind.Identifier) {
      return parseIdentifier();
    } else if (curToken() === SyntaxKind.NumericLiteral) {
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
    } else if (curToken() === SyntaxKind.StringLiteral) {
      const text = scanner.getTokenValue();
      nextToken();
      return {
        kind: SyntaxKind.StringLiteral,
        pos,
        end: scanner.getTokenPos(),
        value: text,
        text,
        _expressionBrand: null,
      } as LiteralExpression;
    } else if (curToken() === SyntaxKind.TrueKeyword || curToken() === SyntaxKind.FalseKeyword) {
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
    } else if (curToken() === SyntaxKind.OpenBracketToken) {
      return parseArrayLiteralExpression();
    } else if (curToken() === SyntaxKind.OpenBraceToken) {
      return parseObjectLiteralExpression();
    } else if (curToken() === SyntaxKind.OpenParenToken) {
      nextToken();
      const expr = parseExpression();
      expect(SyntaxKind.CloseParenToken);
      return expr;
    }

    throw new Error(`Unexpected token: ${SyntaxKind[curToken()]} at position ${pos}`);
  }

  function parseArrayLiteralExpression(): ArrayLiteralExpression {
    const pos = scanner.getTokenPos();
    nextToken();
    const elements: Expression[] = [];
    while (
      curToken() !== SyntaxKind.CloseBracketToken &&
      curToken() !== SyntaxKind.EndOfFileToken
    ) {
      elements.push(parseExpression());
      if (curToken() === SyntaxKind.CommaToken) {
        nextToken();
      }
    }
    expect(SyntaxKind.CloseBracketToken);
    return {
      kind: SyntaxKind.ArrayLiteralExpression,
      pos,
      end: scanner.getTokenPos(),
      elements,
      _expressionBrand: null,
    };
  }

  function parseObjectLiteralExpression(): ObjectLiteralExpression {
    const pos = scanner.getTokenPos();
    nextToken(); // {
    const properties: PropertyAssignment[] = [];
    while (curToken() !== SyntaxKind.CloseBraceToken && curToken() !== SyntaxKind.EndOfFileToken) {
      properties.push(parsePropertyAssignment());
      if (curToken() === SyntaxKind.CommaToken) {
        nextToken();
      }
    }
    expect(SyntaxKind.CloseBraceToken);
    return {
      kind: SyntaxKind.ObjectLiteralExpression,
      pos,
      end: scanner.getTokenPos(),
      properties,
      _expressionBrand: null,
    } as ObjectLiteralExpression;
  }

  function parsePropertyAssignment(): PropertyAssignment {
    const pos = scanner.getTokenPos();
    let name: Identifier | LiteralExpression;
    if (curToken() === SyntaxKind.Identifier) {
      name = parseIdentifier();
    } else if (curToken() === SyntaxKind.StringLiteral) {
      const text = scanner.getTokenValue();
      nextToken();
      name = {
        kind: SyntaxKind.StringLiteral,
        pos,
        end: scanner.getTokenPos(),
        value: text,
        text,
        _expressionBrand: null,
      } as LiteralExpression;
    } else {
      throw new Error('Expected identifier or string literal for property name');
    }

    expect(SyntaxKind.ColonToken);
    const initializer = parseExpression();

    return {
      kind: SyntaxKind.PropertyAssignment,
      pos,
      end: initializer.end,
      name,
      initializer,
    };
  }

  function parseExpressionStatement(): ExpressionStatement {
    const pos = scanner.getTokenPos();
    const expression = parseExpression();
    if (curToken() === SyntaxKind.SemicolonToken) {
      nextToken();
    } else {
      parseSemicolon();
    }
    return {
      kind: SyntaxKind.ExpressionStatement,
      pos,
      end: scanner.getTokenPos(),
      expression,
      _statementBrand: null,
    };
  }

  function parseSemicolon() {
    if (curToken() !== SyntaxKind.SemicolonToken) {
      throw new Error(
        `位置 ${scanner.getTokenPos()} 变量声明语句必须以分号结尾, 但得到 ${SyntaxKind[curToken()]}.`,
      );
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

  function nextTokenIsInKeyword(): boolean {
    if (curToken() !== SyntaxKind.LetKeyword) {
      return false;
    }
    let token = scanner.scan();
    if (token !== SyntaxKind.Identifier) {
      return false;
    }
    token = scanner.scan();
    return token === SyntaxKind.InKeyword;
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
