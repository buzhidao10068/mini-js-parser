import type { BinaryExpression, LiteralExpression, Node } from '../ast';
import type { TransformerFactory, Visitor } from '../transformer';
import { SyntaxKind } from '../ast';

export function constantFoldingTransformer(): TransformerFactory {
  return function (context) {
    return function (node) {
      const visitor: Visitor = (node) => {
        const visited = context.visitEachChild(node, visitor, context);

        if (visited.kind === SyntaxKind.BinaryExpression) {
          const binExpr = visited as BinaryExpression;
          if (
            binExpr.left.kind === SyntaxKind.NumericLiteral &&
            binExpr.right.kind === SyntaxKind.NumericLiteral
          ) {
            const leftVal = (binExpr.left as LiteralExpression).value as number;
            const rightVal = (binExpr.right as LiteralExpression).value as number;
            let result: number | undefined;

            switch (binExpr.operatorToken.kind) {
              case SyntaxKind.PlusToken:
                result = leftVal + rightVal;
                break;
              case SyntaxKind.MinusToken:
                result = leftVal - rightVal;
                break;
              case SyntaxKind.AsteriskToken:
                result = leftVal * rightVal;
                break;
              case SyntaxKind.SlashToken:
                result = leftVal / rightVal;
                break;
              case SyntaxKind.GreaterThanToken:
                if (leftVal > rightVal) {
                  return context.factory.createToken(SyntaxKind.TrueKeyword);
                } else {
                  return context.factory.createToken(SyntaxKind.FalseKeyword);
                }
              case SyntaxKind.LessThanToken:
                if (leftVal < rightVal) {
                  return context.factory.createToken(SyntaxKind.TrueKeyword);
                } else {
                  return context.factory.createToken(SyntaxKind.FalseKeyword);
                }
            }

            if (result !== undefined) {
              return context.factory.createNumericLiteral(result);
            }
          } else if (
            binExpr.left.kind === SyntaxKind.StringLiteral &&
            binExpr.right.kind === SyntaxKind.StringLiteral &&
            binExpr.operatorToken.kind === SyntaxKind.PlusToken
          ) {
            const leftVal = (binExpr.left as LiteralExpression).value as string;
            const rightVal = (binExpr.right as LiteralExpression).value as string;
            return {
              kind: SyntaxKind.StringLiteral,
              pos: -1,
              end: -1,
              value: leftVal + rightVal,
              text: `"${leftVal + rightVal}"`,
              _expressionBrand: null,
            } as LiteralExpression;
          }
        }
        return visited;
      };
      return visitor(node) as Node;
    };
  };
}
