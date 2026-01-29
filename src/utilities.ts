import { SyntaxKind } from './ast';

export const enum OperatorPrecedence {
  Comma,
  Assignment,
  Equality,
  Relational,
  Additive,
  Multiplicative,
  Lowest = Comma,
  Invalid = -1,
}

export function getOperatorPrecedence(
  operator: SyntaxKind,
): OperatorPrecedence {
  switch (operator) {
    case SyntaxKind.CommaToken:
      return OperatorPrecedence.Comma;
    case SyntaxKind.EqualsToken:
      return OperatorPrecedence.Assignment;
    case SyntaxKind.EqualsEqualsToken:
      return OperatorPrecedence.Equality;
    case SyntaxKind.LessThanToken:
    case SyntaxKind.GreaterThanToken:
    case SyntaxKind.LessThanEqualsToken:
    case SyntaxKind.GreaterThanEqualsToken:
    case SyntaxKind.ExclamationEqualsToken:
      return OperatorPrecedence.Relational;
    case SyntaxKind.PlusToken:
    case SyntaxKind.MinusToken:
      return OperatorPrecedence.Additive;
    case SyntaxKind.AsteriskToken:
    case SyntaxKind.SlashToken:
      return OperatorPrecedence.Multiplicative;
    default:
      return OperatorPrecedence.Invalid;
  }
}
