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
  AssignmentExpression,
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

export enum FlowFlags {
  Unreachable = 1 << 0,
  Start = 1 << 1,
  BranchLabel = 1 << 2,
  LoopLabel = 1 << 3,
  Assignment = 1 << 4,
  TrueCondition = 1 << 5,
  FalseCondition = 1 << 6,
  SwitchClause = 1 << 7,
  ArrayMutation = 1 << 8,
  Call = 1 << 9,
  ReduceLabel = 1 << 10,
  Referenced = 1 << 11,
  Shared = 1 << 12,
}

export type LocalScope = Map<string, Symbol>;

export interface FlowNode {
  flags: FlowFlags;
  antecedent?: FlowNode;
  antecedents?: FlowNode[];
  node?: Node;
}

export interface Node {
  kind: SyntaxKind;
  pos: number;
  end: number;
  parent?: Node;
  flowNode?: FlowNode;
}

export interface SourceFile extends Node {
  kind: SyntaxKind.SourceFile;
  statements: Statement[];
  text: string;
  locals?: LocalScope;
}

export interface Statement extends Node {
  _statementBrand: null;
}

export interface Expression extends Node {
  _expressionBrand: null;
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
  locals?: Map<string, Symbol>;
}

export interface ParameterDeclaration extends Node {
  kind: SyntaxKind.ParameterDecl;
  name: Identifier;
}

export interface Block extends Statement {
  kind: SyntaxKind.Block;
  statements: Statement[];
  locals?: Map<string, Symbol>;
}

export interface WhileStatement extends Statement {
  kind: SyntaxKind.WhileStatement;
  expression: Expression;
  statement: Statement;
}

export interface ForStatement extends Statement {
  kind: SyntaxKind.ForStatement;
  initializer?: VariableStatement | Expression;
  condition?: Expression;
  incrementor?: Expression;
  statement: Statement;
  locals?: Map<string, Symbol>;
}

export interface ForInStatement extends Statement {
  kind: SyntaxKind.ForInStatement;
  initializer: VariableDeclaration;
  expression: Expression;
  statement: Statement;
  locals?: Map<string, Symbol>;
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

export interface AssignmentExpression extends Expression {
  kind: SyntaxKind.AssignmentExpression;
  left: Expression;
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

export interface ArrayLiteralExpression extends Expression {
  kind: SyntaxKind.ArrayLiteralExpression;
  elements: Expression[];
}

export interface ObjectLiteralExpression extends Expression {
  kind: SyntaxKind.ObjectLiteralExpression;
  properties: PropertyAssignment[];
}

export interface PropertyAssignment extends Node {
  kind: SyntaxKind.PropertyAssignment;
  name: Identifier | LiteralExpression;
  initializer: Expression;
}

export interface PropertyAccessExpression extends Expression {
  kind: SyntaxKind.PropertyAccessExpression;
  expression: Expression;
  name: Identifier;
}

export interface ElementAccessExpression extends Expression {
  kind: SyntaxKind.ElementAccessExpression;
  expression: Expression;
  argumentExpression: Expression;
}

export interface DeleteExpression extends Expression {
  kind: SyntaxKind.DeleteExpression;
  expression: Expression;
}

export interface CallExpression extends Expression {
  kind: SyntaxKind.CallExpression;
  expression: Expression;
  arguments: Expression[];
}

export interface ExpressionStatement extends Statement {
  kind: SyntaxKind.ExpressionStatement;
  expression: Expression;
}

export interface Symbol {
  name: string;
  declarations: Node[];
}
