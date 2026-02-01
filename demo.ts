
import { createParser } from './src';
import { SyntaxKind } from './src/ast';

// 1. 输入代码
const inputCode = "let a = 1;";
console.log("=== 1. 输入代码 ===");
console.log(inputCode);
console.log("\n");

// 2. 创建解析器并运行
console.log("=== 2. 运行解析器 ===");
const parser = createParser(inputCode);
const ast = parser.parseSourceFile();
console.log("解析完成！");
console.log("\n");

// 3. 输出结果 (AST)
console.log("=== 3. 输出结果 (AST JSON) ===");
// 为了让输出更易读，我们过滤掉一些位置信息
const jsonOutput = JSON.stringify(ast, (key, value) => {
    // 过滤掉 kind 的数字值，替换为可读的字符串名称（可选优化，为了演示简单先保留数字或直接输出）
    return value;
}, 2);

console.log(jsonOutput);

// 补充解释
console.log("\n=== 结果解读 ===");
console.log(`根节点类型 (kind): ${ast.kind} (SourceFile)`);
const statement = ast.statements[0] as any;
console.log(`第一个语句类型: ${statement.kind} (VariableStatement)`);
console.log(`变量名: ${statement.declaration.name.text}`);
console.log(`初始值: ${statement.declaration.initializer.value}`);
