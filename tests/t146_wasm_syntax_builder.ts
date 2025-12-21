import { Interpreter } from '../src/eval';
import { TypeChecker } from '../src/typecheck';
import { Parser } from '../src/sexp';
import * as fs from 'fs';
import * as path from 'path';

export const t146_wasm_syntax_builder = {
  name: 't146_wasm_syntax_builder',
  fn: async () => {
    const code = fs.readFileSync(path.join(__dirname, '../examples/real/compiler/wasm_syntax.iris'), 'utf8');
    const parser = new Parser(code);
    const program = parser.parse();

    const checker = new TypeChecker();
    checker.check(program);

    const interpreter = new Interpreter(program);

    const valStr = (value: string) => ({ kind: 'Str', value } as any);
    const valList = (items: string[]) => ({ kind: 'List', items: items.map(valStr) } as any);

    const resS = await interpreter.callFunction('s', [valStr('i64.const'), valList(['42'])]);
    assertStr(resS, '(i64.const 42)');

    const resHead = await interpreter.callFunction('head', [valStr('if'), valList(['cond'])]);
    assertStr(resHead, '(if cond');

    const resBlock = await interpreter.callFunction('block', [valStr('then'), valStr('X')]);
    assertStr(resBlock, '(then\nX\n)');
  }
};

function assertStr(res: any, expected: string) {
  if (res.kind !== 'Str' || res.value !== expected) {
    throw new Error(`Expected "${expected}", got ${JSON.stringify(res)}`);
  }
}
