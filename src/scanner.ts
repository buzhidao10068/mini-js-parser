import { SyntaxKind } from './ast';
import { CharacterCodes } from './types';

export interface Scanner {
  getToken(): SyntaxKind;
  getTokenPos(): number;
  getTextPos(): number;
  getTokenValue(): string;
  getTokenText(): string;
  scan(): SyntaxKind;
  lookAhead<T>(callback: () => T): T;
}

export const textToKeywordObj = {
  else: SyntaxKind.ElseKeyword,
  function: SyntaxKind.FunctionKeyword,
  let: SyntaxKind.LetKeyword,
  if: SyntaxKind.IfKeyword,
  while: SyntaxKind.WhileKeyword,
  for: SyntaxKind.ForKeyword,
  in: SyntaxKind.InKeyword,
  return: SyntaxKind.ReturnKeyword,
  true: SyntaxKind.TrueKeyword,
  false: SyntaxKind.FalseKeyword,
  delete: SyntaxKind.DeleteKeyword,
};

const textToKeyword = new Map(Object.entries(textToKeywordObj));

export function createScanner(text: string): Scanner {
  let pos = 0;
  let end = text.length;
  let tokenPos = 0;
  let token: SyntaxKind = SyntaxKind.Unknown;
  let tokenValue = '';

  return {
    getToken,
    getTokenPos,
    getTextPos,
    getTokenValue,
    getTokenText,
    scan,
    lookAhead,
  };

  function getToken(): SyntaxKind {
    return token;
  }

  function getTokenPos(): number {
    return tokenPos;
  }

  function getTextPos(): number {
    return pos;
  }

  function getTokenValue(): string {
    return tokenValue;
  }

  function getTokenText(): string {
    return text.substring(tokenPos, pos);
  }

  function scan(): SyntaxKind {
    while (true) {
      tokenPos = pos;

      if (pos >= end) {
        tokenValue = '';
        return (token = SyntaxKind.EndOfFileToken);
      }

      const ch = text.codePointAt(pos);

      switch (ch) {
        case CharacterCodes.lineFeed:
        case CharacterCodes.carriageReturn:
        case CharacterCodes.tab:
        case CharacterCodes.verticalTab:
        case CharacterCodes.formFeed:
        case CharacterCodes.space:
          pos++;
          continue;
        case CharacterCodes._0:
        case CharacterCodes._1:
        case CharacterCodes._2:
        case CharacterCodes._3:
        case CharacterCodes._4:
        case CharacterCodes._5:
        case CharacterCodes._6:
        case CharacterCodes._7:
        case CharacterCodes._8:
        case CharacterCodes._9:
          return scanNumber();
        case CharacterCodes.openBrace:
          pos++;
          return (token = SyntaxKind.OpenBraceToken);
        case CharacterCodes.closeBrace:
          pos++;
          return (token = SyntaxKind.CloseBraceToken);
        case CharacterCodes.openParen:
          pos++;
          return (token = SyntaxKind.OpenParenToken);
        case CharacterCodes.closeParen:
          pos++;
          return (token = SyntaxKind.CloseParenToken);
        case CharacterCodes.openBracket:
          pos++;
          return (token = SyntaxKind.OpenBracketToken);
        case CharacterCodes.closeBracket:
          pos++;
          return (token = SyntaxKind.CloseBracketToken);
        case CharacterCodes.semicolon:
          pos++;
          return (token = SyntaxKind.SemicolonToken);
        case CharacterCodes.comma:
          pos++;
          return (token = SyntaxKind.CommaToken);
        case CharacterCodes.dot:
          pos++;
          return (token = SyntaxKind.DotToken);
        case CharacterCodes.colon:
          pos++;
          return (token = SyntaxKind.ColonToken);
        case CharacterCodes.question:
          pos++;
          return (token = SyntaxKind.QuestionToken);
        case CharacterCodes.equals:
          if (pos < end && text.charCodeAt(pos + 1) === CharacterCodes.equals) {
            return ((pos += 2), (token = SyntaxKind.EqualsEqualsToken));
          }
          pos++;
          return (token = SyntaxKind.EqualsToken);
        case CharacterCodes.exclamation:
          if (pos < end && text.charCodeAt(pos + 1) === CharacterCodes.equals) {
            return ((pos += 2), (token = SyntaxKind.ExclamationEqualsToken));
          }
          pos++;
          return (token = SyntaxKind.ExclamationEqualsToken);
        case CharacterCodes.plus:
          if (pos < end && text.charCodeAt(pos + 1) === CharacterCodes.plus) {
            return ((pos += 2), (token = SyntaxKind.PlusPlusToken));
          }
          pos++;
          return (token = SyntaxKind.PlusToken);
        case CharacterCodes.minus:
          if (pos < end && text.charCodeAt(pos + 1) === CharacterCodes.minus) {
            return ((pos += 2), (token = SyntaxKind.MinusMinusToken));
          }
          pos++;
          return (token = SyntaxKind.MinusToken);
        case CharacterCodes.asterisk:
          pos++;
          return (token = SyntaxKind.AsteriskToken);
        case CharacterCodes.slash:
          pos++;
          return (token = SyntaxKind.SlashToken);
        case CharacterCodes.lessThan:
          if (pos < end && text.charCodeAt(pos + 1) === CharacterCodes.equals) {
            return ((pos += 2), (token = SyntaxKind.LessThanEqualsToken));
          }
          pos++;
          return (token = SyntaxKind.LessThanToken);
        case CharacterCodes.greaterThan:
          if (pos < end && text.charCodeAt(pos + 1) === CharacterCodes.equals) {
            return ((pos += 2), (token = SyntaxKind.GreaterThanEqualsToken));
          }
          pos++;
          return (token = SyntaxKind.GreaterThanToken);
        case CharacterCodes.doubleQuote:
          return scanString();
        default:
          return scanIdentifier();
      }
    }
  }

  function lookAhead<T>(callback: () => T): T {
    const savePos = pos;
    const saveTokenPos = tokenPos;
    const saveToken = token;
    const saveTokenValue = tokenValue;

    const res = callback();

    pos = savePos;
    tokenPos = saveTokenPos;
    token = saveToken;
    tokenValue = saveTokenValue;

    return res;
  }

  function scanNumber(): SyntaxKind {
    let start = pos;

    if (text.charCodeAt(pos) === 48 && pos + 1 < end && isDigit(text.charCodeAt(pos + 1))) {
      error('Numeric literal cannot start with 0');
    }

    pos++;
    while (pos < end && isDigit(text.charCodeAt(pos))) {
      pos++;
    }
    tokenValue = text.substring(start, pos);

    return (token = SyntaxKind.NumericLiteral);
  }

  function scanString(): SyntaxKind {
    let start = pos;
    pos++;
    while (pos < end) {
      if (text.charCodeAt(pos) === 34) {
        break;
      }
      pos++;
    }
    if (pos >= end) {
      error('Unterminated string literal');
    }
    tokenValue = text.substring(start + 1, pos);
    pos++;
    return (token = SyntaxKind.StringLiteral);
  }

  function scanIdentifier(): SyntaxKind {
    let start = pos;
    pos++;
    while (pos < end && isIdentifierPart(text.charCodeAt(pos))) {
      pos++;
    }
    const value = text.substring(start, pos);
    tokenValue = value;
    return (token = textToKeyword.get(value) ?? SyntaxKind.Identifier);
  }

  function error(message: string): void {
    throw new Error(`Scanner Error at ${pos}: ${message}`);
  }
}

function isDigit(ch: number): boolean {
  return ch >= CharacterCodes._0 && ch <= CharacterCodes._9;
}

function isIdentifierStart(ch: number): boolean {
  return (
    (ch >= CharacterCodes.A && ch <= CharacterCodes.Z) ||
    (ch >= CharacterCodes.a && ch <= CharacterCodes.z) ||
    ch === CharacterCodes._ ||
    ch === CharacterCodes.$
  );
}

function isIdentifierPart(ch: number): boolean {
  return isIdentifierStart(ch) || isDigit(ch);
}
