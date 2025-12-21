import { Interpreter } from '../src/eval';
import { TypeChecker } from '../src/typecheck';
import { Parser } from '../src/sexp';
import { ModuleResolver } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

export const t156_wasm_snippet_intrinsics = {
  name: 't156_wasm_snippet_intrinsics',
  fn: async () => {
    console.log('Running T156: WAT snippet for intrinsics...');

    const code = fs.readFileSync(path.join(__dirname, '../examples/real/compiler/codegen_wasm_expr.iris'), 'utf8');
    const parser = new Parser(code);
    const program = parser.parse();

    const compilerRoot = path.join(__dirname, '../examples/real/compiler');
    const stdlibRoot = path.join(__dirname, '../stdlib');
    const moduleCache = new Map<string, any>();

    const resolver: ModuleResolver = (modulePath: string) => {
      if (moduleCache.has(modulePath)) return moduleCache.get(modulePath);

      const candidates = [
        path.join(compilerRoot, `${modulePath}.iris`),
        path.join(stdlibRoot, `${modulePath}.iris`)
      ];

      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          const source = fs.readFileSync(candidate, 'utf8');
          const parsed = new Parser(source).parse();
          moduleCache.set(modulePath, parsed);
          return parsed;
        }
      }

      return undefined;
    };

    const checker = new TypeChecker(resolver);
    checker.check(program);

    const interpreter = new Interpreter(program, {}, resolver);

    const valStr = (s: string) => ({ kind: 'Str', value: s });
    const valRecord = (fields: Record<string, any>) => ({ kind: 'Record', fields } as any);
    const valList = (items: any[]) => ({ kind: 'List', items } as any);
    const tag = (name: string, value: any) => ({ kind: 'Tagged', tag: name, value } as any);
    const valI64 = (n: bigint) => ({ kind: 'I64', value: n } as any);

    const intrinsic = (op: string, args: any[]) =>
      tag('Intrinsic', valRecord({ op: valStr(op), args: valList(args) }));

    const addExpr = intrinsic('+', [tag('Literal', tag('I64', valI64(1n))), tag('Literal', tag('I64', valI64(2n)))]);
    const addRes = await interpreter.callFunction('codegen_expr', [addExpr]);

    const printExpr = intrinsic('io.print', [tag('Literal', tag('I64', valI64(7n)))]);
    const printRes = await interpreter.callFunction('codegen_expr', [printExpr]);

    assertEx(addRes, '(i64.const 1)\n(i64.const 2)\n(i64.add)');
    assertEx(printRes, '(i64.const 7)\n(call $print)\n(i64.const 1)');
    console.log('T156 Passed: intrinsic snippets match expected output.');
  }
};

function assertEx(res: any, expected: string) {
  if (res.kind !== 'Str' || res.value !== expected) {
    throw new Error(`Expected codegen result "${expected}", got ${JSON.stringify(res)}`);
  }
}
