import type { Identifier, Node, SourceFile, Symbol } from '../ast';
import type { TransformerFactory } from '../transformer';
import { SyntaxKind } from '../ast';

export function renameIdentifiersTransformer(): TransformerFactory {
  return function (context) {
    return function (node) {
      const symbolRenameMap = new Map<Symbol, string>();
      let nameCounter = 0;

      const scopeStack: Map<string, Symbol>[] = [];

      const visitor = (node: Node): Node | undefined => {
        let currentScope: Map<string, Symbol> | undefined = (node as SourceFile).locals;
        if (currentScope) {
          scopeStack.push(currentScope);
          for (const symbol of currentScope.values()) {
            if (!symbolRenameMap.has(symbol)) {
              const newName = getName(nameCounter++);
              symbolRenameMap.set(symbol, newName);
            }
          }
        }

        if (node.kind === SyntaxKind.Identifier) {
          const id = node as Identifier;
          const text = id.text;
          let symbol;

          for (let i = scopeStack.length - 1; i >= 0; i--) {
            if (scopeStack[i].has(text)) {
              symbol = scopeStack[i].get(text);
              break;
            }
          }

          if (symbol && symbolRenameMap.has(symbol)) {
            const newName = symbolRenameMap.get(symbol)!;
            if (newName !== text) {
              return context.factory.createIdentifier(newName);
            }
          }
        }

        const visited = context.visitEachChild(node, visitor, context);

        if (currentScope) {
          scopeStack.pop();
        }

        return visited;
      };

      return visitor(node) as Node;

      function getName(index: number): string {
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        let name = '';
        do {
          name = chars[index % 26] + name;
          index = Math.floor(index / 26) - 1;
        } while (index >= 0);
        return name;
      }
    };
  };
}
