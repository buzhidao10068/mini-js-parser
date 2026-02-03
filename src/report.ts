import { ErrorKind } from './types';
import {
  span,
  createReport,
  ReportKind,
  createSource,
  createSourceCache,
  createLabel,
  Red,
} from './diagnostics';
import type { SyntaxKind } from './ast';

export interface TokenMsg {
  kind: SyntaxKind;
  pos: number;
  tokenText: string;
}

export interface Cause {
  kind: ErrorKind;
  curTokenMsg: TokenMsg;
  nextTokenMsg: TokenMsg;
}

export interface ErrorWithCause extends Error {
  cause: Cause;
}

export function report(filename: string, source: string, errMsg: string, cause: Cause) {
  const src = createSourceCache([[filename, createSource(source)]]);
  const r = createReport({
    kind: ReportKind.Error,
    span: span(filename, cause.curTokenMsg.pos, cause.nextTokenMsg.pos),
    msg: errMsg,
  });
  const s = span(
    filename,
    cause.curTokenMsg.pos,
    cause.curTokenMsg.pos + cause.curTokenMsg.tokenText.length,
  );
  r.setReportField(
    'labels',
    createLabel({
      span: s,
      displayInfo: {
        msg: matchErrorKind(cause.kind, cause.curTokenMsg.tokenText),
        color: Red,
        order: 0,
      },
    }),
  );
  return r.writeToString(src);
}

function matchErrorKind(kind: ErrorKind, tokenText: string) {
  switch (kind) {
    case ErrorKind.NotExpectToken:
      return `这里不应该是 ${tokenText}`;
    case ErrorKind.MissingSymbol:
      return '缺失符号';
    case ErrorKind.InvalidIdentifier:
      return 'let 语句必须绑定一个标识符。';
    case ErrorKind.InvalidFunctionIdentifier:
      return '缺少标识符';
    case ErrorKind.InvalidFunctionParameter:
      return '无效函数参数';
    case ErrorKind.InvalidObjectPropertyIdentifier:
      return '无效对象属性标识符';
    case ErrorKind.InvalidExpression:
      return '无效表达式';
    case ErrorKind.ReturnOutsideFunction:
      return '返回语句不在函数中';
  }
}
