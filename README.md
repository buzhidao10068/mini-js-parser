# Mini JS Parser

一个使用 TypeScript 编写的简易 JavaScript 编译器前端实现。它实现了从源码到代码生成的完整流程，包括词法分析、语法分析、语义绑定、AST 转换和代码生成。

本项目旨在用于学习和理解编译器前端的基本原理，支持 JavaScript 的一个常用子集。

## 特性

- **零依赖**：核心逻辑不依赖任何第三方库。
- **手写解析器**：采用递归下降算法手动实现 Scanner 和 Parser。
- **完整编译管线**：包含 Scanner、Parser、Binder、Transformer 和 Emitter。
- **高级功能**：支持 Source Map 生成、死代码消除和常量折叠。
- **类型安全**：完全使用 TypeScript 编写。

## 核心模块

### 1. 解析器 (Parser)
将源代码解析为抽象语法树 (AST)。
- 支持变量声明 (let)、函数声明
- 支持控制流 (if, while, for, return)
- 支持各类表达式和字面量

### 2. 绑定器 (Binder)
处理作用域和符号定义，建立 AST 节点与符号 (Symbol) 之间的联系，支持控制流分析 (Control Flow Analysis)。

### 3. 转换器 (Transformer)
提供 AST 转换框架，内置以下转换插件：
- **死代码消除 (Dead Code Elimination)**: 移除不可达代码和未使用的变量/函数。
- **常量折叠 (Constant Folding)**: 编译期计算常量表达式。

### 4. 代码生成器 (Emitter)
将 AST 转换回 JavaScript 代码，并支持生成 Source Map。

## 安装与使用

### 安装依赖

```bash
pnpm install
```

### 使用示例

```typescript
import { compile, deadCodeEliminationTransformer } from './src';

const code = `
function main() {
  let x = 1 + 2;
  return x;
  let dead = 0; // 这行代码将被移除
}
main();
`;

const result = compile(code, {
  filename: 'example.js',
  sourceMap: true,
  minify: false, // 开启 minify 会自动包含死代码消除和常量折叠
  plugins: [deadCodeEliminationTransformer()]
});

console.log('Generated Code:\n', result.code);
console.log('Source Map:\n', result.map);
```

## 开发

本项目使用 `pnpm` 进行包管理，`vitest` 进行测试。

### 构建

```bash
pnpm build
```

### 运行测试

```bash
pnpm test
```

### 代码检查与格式化

```bash
pnpm lint
pnpm fmt
```

## 项目结构

- `src/`
  - `compiler.ts`: 编译器入口，串联整个编译流程
  - `scanner.ts`: 词法分析器
  - `parser.ts`: 语法分析器
  - `binder.ts`: 语义绑定与作用域分析
  - `transformer.ts`: AST 转换器框架
  - `transformers/`: 内置转换插件 (死代码消除、常量折叠)
  - `emitter.ts`: 代码生成器
  - `sourcemap.ts`: Source Map 生成逻辑
  - `ast.ts`: AST 节点定义
  - `factory.ts`: AST 节点创建工厂
  - `index.ts`: 统一导出
- `tests/`: 单元测试

## License

MIT
