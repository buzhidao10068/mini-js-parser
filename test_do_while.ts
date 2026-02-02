
import { createParser } from './src';
import { SyntaxKind } from './src/ast';

const code = `
do {
  a = a + 1;
} while (a < 10);
`;

console.log('Testing do...while loop parsing:');
console.log(code);

try {
  const parser = createParser(code);
  const ast = parser.parseSourceFile();
  
  const doStatement = ast.statements[0] as any;
  
  if (doStatement.kind === SyntaxKind.DoStatement) {
    console.log('✅ Successfully parsed DoStatement');
    
    // Verify structure
    if (doStatement.statement.kind === SyntaxKind.Block) {
       console.log('✅ Body is a Block');
    } else {
       console.log('❌ Body is NOT a Block');
    }
    
    if (doStatement.expression.kind === SyntaxKind.BinaryExpression) {
       console.log('✅ Condition is a BinaryExpression');
    } else {
       console.log('❌ Condition is NOT a BinaryExpression');
    }
    
    console.log('\nFull AST:');
    console.log(JSON.stringify(ast, (key, value) => {
      // Helper to make output more readable by converting SyntaxKind numbers to strings
      if (key === 'kind') {
        return SyntaxKind[value];
      }
      return value;
    }, 2));
    
  } else {
    console.log(`❌ Expected DoStatement, got Kind ${doStatement.kind}`);
  }

} catch (e) {
  console.error('❌ Parsing failed:', e);
}
