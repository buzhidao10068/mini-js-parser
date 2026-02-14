import { describe, expect, it } from 'vitest';
import type { ErrorWithCause } from '../src';
import {
  createReport,
  span,
  ReportKind,
  createLabel,
  createSourceCache,
  createSource,
  Red,
  Yellow,
  Blue,
  createParser,
  report,
} from '../src';

describe('Report', () => {
  it('报告生成', () => {
    const code = `
function add(x: number, y: number): number {
  return x + y;
}

function main() {
  let a = 10;
  let b = "20";
  let c = add(a, b);
  console.log(c);
}`;

    const sourceId = 'main.ts';

    const reportSpanStart = code.indexOf('number') + 1;
    const reportSpan = span(sourceId, reportSpanStart, reportSpanStart);

    const fnArgStart = code.indexOf('y: number');
    const fnArgSpan = span(sourceId, fnArgStart, fnArgStart + 'y: number'.length);

    const letBStart = code.indexOf('"20"');
    const letBSpan = span(sourceId, letBStart, letBStart + '"20"'.length);

    const callBStart = code.indexOf('add(a, b)') + 'add(a, '.length;
    const callBSpan = span(sourceId, callBStart, callBStart + 1);

    const report = createReport({
      kind: ReportKind.Error,
      span: reportSpan,
      code: 'ts(2345)',
      msg: "Argument of type 'string' is not assignable to parameter of type 'number'.",
    });
    report
      .setReportField(
        'labels',
        createLabel({
          span: fnArgSpan,
          displayInfo: {
            msg: 'expected `number`, found `string`',
            color: Red,
            order: 0,
          },
        }),
      )
      .setReportField(
        'labels',
        createLabel({
          span: letBSpan,
          displayInfo: {
            msg: 'expected due to this',
            color: Blue,
            order: 1,
          },
        }),
      )
      .setReportField(
        'labels',
        createLabel({
          span: callBSpan,
          displayInfo: {
            msg: 'arguments to this function are incorrect',
            color: Yellow,
          },
        }),
      )
      .setReportField(
        'notes',
        'You tried to pass a string literal to a function expecting an integer.',
      )
      .setReportField('help', 'Replace the string literal with a number literal.');

    const source = createSourceCache([[sourceId, createSource(code)]]);
    const output = report.writeToString(source);

    expect(output).toMatchInlineSnapshot(`
      "[31mError[ts(2345)][0m: Argument of type 'string' is not assignable to parameter of type 'number'.
        [38;5;246m╭─[[0mmain.ts:2:18[38;5;246m][0m
        [38;5;246m│[0m
      [38;5;246m2 │[0m function add(x: number, y: number): number {
        [38;5;246m│[0m                         [31m────┬────[0m
        [38;5;246m│[0m                             [31m╰─[0m expected \`number\`, found \`string\`
      ...
      [38;5;246m8 │[0m   let b = "20";
        [38;5;246m│[0m           [34m──┬─[0m
        [38;5;246m│[0m             [34m╰────────────[0m expected due to this
      [38;5;246m9 │[0m   let c = add(a, b);
        [38;5;246m│[0m                  [33m┬[0m
        [38;5;246m│[0m                  [33m╰───────[0m arguments to this function are incorrect
      [38;5;246m──╯[0m
      [38;5;115mnote[0m: You tried to pass a string literal to a function expecting an integer.
      [38;5;115mhelp[0m: Replace the string literal with a number literal."
    `);
  });

  it('报告生成-语法错误', () => {
    let code = `let = 1;`;
    let parser = createParser(code);

    try {
      parser.parseSourceFile();
    } catch (e) {
      const error = e as ErrorWithCause;
      const output = report('test.js', code, error.message, error.cause);
      expect(output).toMatchInlineSnapshot(`
        "[31mError[0m: let 语句必须绑定一个标识符。
          [38;5;246m╭─[[0mtest.js:1:1[38;5;246m][0m
          [38;5;246m│[0m
        [38;5;246m1 │[0m let = 1;
          [38;5;246m│[0m [31m─┬─[0m
          [38;5;246m│[0m  [31m╰───────────────────────[0m let 语句必须绑定一个标识符。
        [38;5;246m──╯[0m"
      `);
    }

    code = `a`;
    parser = createParser(code);
    try {
      parser.parseSourceFile();
    } catch (e) {
      const error = e as ErrorWithCause;
      const output = report('test.js', code, error.message, error.cause);
      expect(output).toMatchInlineSnapshot(`
        "[31mError[0m: 缺少分号。
          [38;5;246m╭─[[0mtest.js:1:2[38;5;246m][0m
          [38;5;246m│[0m
        [38;5;246m1 │[0m a
          [38;5;246m│[0m  [31m┬[0m
          [38;5;246m│[0m  [31m╰───────────────────────[0m 缺失符号
        [38;5;246m──╯[0m"
      `);
    }

    code = `function () {}`;
    parser = createParser(code);
    try {
      parser.parseSourceFile();
    } catch (e) {
      const error = e as ErrorWithCause;
      const output = report('test.js', code, error.message, error.cause);
      expect(output).toMatchInlineSnapshot(`
        "[31mError[0m: 函数声明语句必须绑定一个标识符。
          [38;5;246m╭─[[0mtest.js:1:10[38;5;246m][0m
          [38;5;246m│[0m
        [38;5;246m1 │[0m function () {}
          [38;5;246m│[0m          [31m┬[0m
          [38;5;246m│[0m          [31m╰───────────────[0m 缺少标识符
        [38;5;246m──╯[0m"
      `);
    }

    code = `{`;
    parser = createParser(code);
    try {
      parser.parseSourceFile();
    } catch (e) {
      const error = e as ErrorWithCause;
      const output = report('test.js', code, error.message, error.cause);
      expect(output).toMatchInlineSnapshot(`
        "[31mError[0m: 缺少右大括号 '}'。
          [38;5;246m╭─[[0mtest.js:1:2[38;5;246m][0m
          [38;5;246m│[0m
        [38;5;246m1 │[0m {
          [38;5;246m│[0m  [31m┬[0m
          [38;5;246m│[0m  [31m╰───────────────────────[0m 缺失符号
        [38;5;246m──╯[0m"
      `);
    }

    code = `return 1;`;
    parser = createParser(code);
    try {
      parser.parseSourceFile();
    } catch (e) {
      const error = e as ErrorWithCause;
      const output = report('test.js', code, error.message, error.cause);
      expect(output).toMatchInlineSnapshot(`
        "[31mError[0m: return 语句只能在函数体中使用。
          [38;5;246m╭─[[0mtest.js:1:1[38;5;246m][0m
          [38;5;246m│[0m
        [38;5;246m1 │[0m return 1;
          [38;5;246m│[0m [31m───┬──[0m
          [38;5;246m│[0m    [31m╰─────────────────────[0m 返回语句不在函数中
        [38;5;246m──╯[0m"
      `);
    }

    code = `let a = 1 *;`;
    parser = createParser(code);
    try {
      parser.parseSourceFile();
    } catch (e) {
      const error = e as ErrorWithCause;
      const output = report('test.js', code, error.message, error.cause);
      expect(output).toMatchInlineSnapshot(`
        "[31mError[0m: 无效表达式。
          [38;5;246m╭─[[0mtest.js:1:12[38;5;246m][0m
          [38;5;246m│[0m
        [38;5;246m1 │[0m let a = 1 *;
          [38;5;246m│[0m            [31m┬[0m
          [38;5;246m│[0m            [31m╰─────────────[0m 无效表达式
        [38;5;246m──╯[0m"
      `);
    }

    code = `function a(,) {}`;
    parser = createParser(code);
    try {
      parser.parseSourceFile();
    } catch (e) {
      const error = e as ErrorWithCause;
      const output = report('test.js', code, error.message, error.cause);
      expect(output).toMatchInlineSnapshot(`
        "[31mError[0m: 函数参数必须绑定一个标识符。
          [38;5;246m╭─[[0mtest.js:1:12[38;5;246m][0m
          [38;5;246m│[0m
        [38;5;246m1 │[0m function a(,) {}
          [38;5;246m│[0m            [31m┬[0m
          [38;5;246m│[0m            [31m╰─────────────[0m 无效函数参数
        [38;5;246m──╯[0m"
      `);
    }
  });
});
