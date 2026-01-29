export enum SyntaxKind {
  Unknown,
  EndOfFileToken,

  // Keywords
  FunctionKeyword, // function
  LetKeyword, // let
  IfKeyword, // if
  ElseKeyword, // else
  WhileKeyword, // while
  ForKeyword, // for
  InKeyword, // in
  ReturnKeyword, // return
  TrueKeyword, // true
  FalseKeyword, // false
  DeleteKeyword, // delete

  // Punctuation
  OpenBraceToken, // {
  CloseBraceToken, // }
  OpenParenToken, // (
  CloseParenToken, // )
  OpenBracketToken, // [
  CloseBracketToken, // ]
  SemicolonToken, // ;
  CommaToken, // ,
  DotToken, // .
  ColonToken, // :
  QuestionToken, // ?

  // Operators
  EqualsToken, // =
  PlusToken, // +
  MinusToken, // -
  AsteriskToken, // *
  SlashToken, // /
  PlusPlusToken, // ++
  MinusMinusToken, // --
  EqualsEqualsToken, // ==
  ExclamationEqualsToken, // !=
  LessThanToken, // <
  LessThanEqualsToken, // <=
  GreaterThanToken, // >
  GreaterThanEqualsToken, // >=

  // Literals & Identifiers
  Identifier = 50,
  ParameterDecl,
  NumericLiteral,
  StringLiteral,

  // Nodes
  SourceFile,
  FunctionDecl,
  Block,
  VariableStatement,
  VariableDeclaration,
  ExpressionStatement,
  IfStatement,
  WhileStatement,
  ForStatement,
  ForInStatement,
  ReturnStatement,
  BinaryExpression,
  PrefixUnaryExpression,
  PostfixUnaryExpression,
  LiteralExpression,
  CallExpression,
  ArrayLiteralExpression,
  ObjectLiteralExpression,
  PropertyAssignment,
  PropertyAccessExpression,
  ElementAccessExpression,
  DeleteExpression,
}

export interface Node {
  kind: SyntaxKind;
  pos: number;
  end: number;
  parent?: Node;
}

export interface SourceFile extends Node {
  kind: SyntaxKind.SourceFile;
  statements: Statement[];
  text: string;
  locals?: Map<string, Symbol>;
}

export interface Statement extends Node {
  _statementBrand: any;
}

export interface Expression extends Node {
  _expressionBrand: any;
}

export interface Identifier extends Expression {
  kind: SyntaxKind.Identifier;
  text: string;
}

export interface VariableStatement extends Statement {
  kind: SyntaxKind.VariableStatement;
  declaration: VariableDeclaration;
}

export interface VariableDeclaration extends Node {
  kind: SyntaxKind.VariableDeclaration;
  name: Identifier;
  initializer?: Expression;
}

export interface FunctionDeclaration extends Statement {
  kind: SyntaxKind.FunctionDecl;
  name: Identifier;
  parameters: ParameterDeclaration[];
  body: Block;
}

export interface ParameterDeclaration extends Node {
  kind: SyntaxKind.ParameterDecl;
  name: Identifier;
}

export interface Block extends Statement {
  kind: SyntaxKind.Block;
  statements: Statement[];
}

export interface WhileStatement extends Statement {
  kind: SyntaxKind.WhileStatement;
  expression: Expression;
  statement: Statement;
}

export interface ForStatement extends Statement {
  kind: SyntaxKind.ForStatement;
  initializer?: VariableStatement | Expression; // Simplified: usually ForInitializer
  condition?: Expression;
  incrementor?: Expression;
  statement: Statement;
}

export interface IfStatement extends Statement {
  kind: SyntaxKind.IfStatement;
  expression: Expression;
  thenStatement: Statement;
  elseStatement?: Statement;
}

export interface ReturnStatement extends Statement {
  kind: SyntaxKind.ReturnStatement;
  expression?: Expression;
}

export interface LiteralExpression extends Expression {
  kind:
    | SyntaxKind.NumericLiteral
    | SyntaxKind.StringLiteral
    | SyntaxKind.TrueKeyword
    | SyntaxKind.FalseKeyword;
  value: number | string | boolean;
  text: string;
}

export interface BinaryExpression extends Expression {
  kind: SyntaxKind.BinaryExpression;
  left: Expression;
  operatorToken: Node;
  right: Expression;
}

export interface PrefixUnaryExpression extends Expression {
  kind: SyntaxKind.PrefixUnaryExpression;
  operator: SyntaxKind;
  operand: Expression;
}

export interface PostfixUnaryExpression extends Expression {
  kind: SyntaxKind.PostfixUnaryExpression;
  operand: Expression;
  operator: SyntaxKind;
}

export interface ExpressionStatement extends Statement {
  kind: SyntaxKind.ExpressionStatement;
  expression: Expression;
}
