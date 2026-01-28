# 语法定义 (Grammar)

Mini-Parser 支持 JavaScript 的一个子集。以下是其 Extended Backus-Naur Form (EBNF) 描述。

## 词法定义 (Lexical)

```ebnf
Identifier      ::= [a-zA-Z_$] [a-zA-Z0-9_$]*
NumericLiteral  ::= [0-9]+
StringLiteral   ::= '"' [^"]* '"'
```

## 语法定义 (Syntactic)

### 源码结构

```ebnf
SourceFile ::= Statement*
```

### 语句 (Statements)

```ebnf
Statement ::=
    VariableStatement
  | FunctionDeclaration
  | Block
  | IfStatement
  | WhileStatement
  | ForStatement
  | ReturnStatement
  | ExpressionStatement

Block ::= '{' Statement* '}'

VariableStatement ::= 'let' Identifier ('=' Expression)? ';'

FunctionDeclaration ::= 'function' Identifier '(' ParameterList? ')' Block
ParameterList ::= Identifier (',' Identifier)*

IfStatement ::= 'if' '(' Expression ')' Statement ('else' Statement)?

WhileStatement ::= 'while' '(' Expression ')' Statement

ForStatement ::=
    'for' '(' (VariableStatement | Expression? ';') Expression? ';' Expression? ')' Statement
  | 'for' '(' 'let' Identifier 'in' Expression ')' Statement

ReturnStatement ::= 'return' Expression? ';'

ExpressionStatement ::= Expression ';'?
```

### 表达式 (Expressions)

表达式解析使用优先级控制，以下按优先级从低到高排列：

```ebnf
Expression ::= AssignmentExpression

AssignmentExpression ::= Identifier '=' AssignmentExpression
                       | BinaryExpression

BinaryExpression ::= LogicalOrExpression

LogicalOrExpression ::= LogicalAndExpression ('||' LogicalAndExpression)*
LogicalAndExpression ::= EqualityExpression ('&&' EqualityExpression)*
EqualityExpression ::= RelationalExpression (('==' | '!=') RelationalExpression)*
RelationalExpression ::= AdditiveExpression (('<' | '>' | '<=' | '>=') AdditiveExpression)*
AdditiveExpression ::= MultiplicativeExpression (('+' | '-') MultiplicativeExpression)*
MultiplicativeExpression ::= UnaryExpression (('*' | '/') UnaryExpression)*

UnaryExpression ::= ('++' | '--' | '+' | '-') UnaryExpression
                  | 'delete' UnaryExpression
                  | PostfixExpression

PostfixExpression ::= LeftHandSideExpression ('++' | '--')?

LeftHandSideExpression ::= CallExpression
                         | MemberExpression
                         | PrimaryExpression

CallExpression ::= MemberExpression '(' ArgumentList? ')'
ArgumentList ::= Expression (',' Expression)*

MemberExpression ::= PrimaryExpression ('.' Identifier | '[' Expression ']')*

PrimaryExpression ::= Identifier
                    | NumericLiteral
                    | StringLiteral
                    | 'true'
                    | 'false'
                    | '(' Expression ')'
                    | ArrayLiteral
                    | ObjectLiteral

ArrayLiteral ::= '[' (Expression (',' Expression)*)? ']'
ObjectLiteral ::= '{' (PropertyAssignment (',' PropertyAssignment)*)? '}'
PropertyAssignment ::= (Identifier | StringLiteral) ':' Expression
```
