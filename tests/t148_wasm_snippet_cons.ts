import { Interpreter } from '../src/eval';
import { TypeChecker } from '../src/typecheck';
import { Parser } from '../src/sexp';
import { ModuleResolver } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

export const t148_wasm_snippet_cons = {
  name: 't148_wasm_snippet_cons',
  fn: async () => {
    console.log('Running T148: WAT snippet for cons...');

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

    const valI64 = (n: bigint) => ({ kind: 'Tagged', tag: 'I64', value: { kind: 'I64', value: n } } as any);
    const exprLit = (v: any) => ({ kind: 'Tagged', tag: 'Literal', value: v } as any);
    const valStr = (s: string) => ({ kind: 'Str', value: s });
    const valList = (items: any[]) => ({ kind: 'List', items });
    const valRecord = (fields: Record<string, any>) => ({ kind: 'Record', fields });
    const exprIntrinsic = (op: string, args: any[]) => ({
      kind: 'Tagged',
      tag: 'Intrinsic',
      value: valRecord({
        op: valStr(op),
        args: valList(args)
      })
    } as any);

    const ast = exprIntrinsic('cons', [exprLit(valI64(1n)), exprLit(valI64(0n))]);
    const res = await interpreter.callFunction('codegen_expr', [ast]);

    const expected = [
      '(i64.const 1)',
      '(local.set $t0)',
      '(i64.const 0)',
      '(local.set $t1)',
      '(call $alloc (i64.add (i64.const 16) (i64.mul (i64.load (i32.wrap_i64 (local.get $t1))) (i64.const 8))))',
      '(local.set $t2)',
      '(i64.store (i32.wrap_i64 (local.get $t2)) (i64.add (i64.load (i32.wrap_i64 (local.get $t1))) (i64.const 1)))',
      '(i64.store (i32.wrap_i64 (i64.add (local.get $t2) (i64.const 8))) (local.get $t0))',
      '(memory.copy',
      '  (i32.wrap_i64 (i64.add (local.get $t2) (i64.const 16)))',
      '  (i32.wrap_i64 (i64.add (local.get $t1) (i64.const 8)))',
      '  (i32.wrap_i64 (i64.mul (i64.load (i32.wrap_i64 (local.get $t1))) (i64.const 8)))',
      ')',
      '(local.get $t2)'
    ].join('\n');

    assertEx(res, expected);
    console.log('T148 Passed: cons WAT snippet matches expected output.');
  }
};

function assertEx(res: any, expected: string) {
  if (res.kind !== 'Str' || res.value !== expected) {
    throw new Error(`Expected codegen result "${expected}", got ${JSON.stringify(res)}`);
  }
}
