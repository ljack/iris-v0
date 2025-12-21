import { Interpreter } from '../src/eval';
import { TypeChecker } from '../src/typecheck';
import { Parser } from '../src/sexp';
import { ModuleResolver } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

export const t147_wasm_snippet_list_get = {
  name: 't147_wasm_snippet_list_get',
  fn: async () => {
    console.log('Running T147: WAT snippet for list.get...');

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

    const ast = exprIntrinsic('list.get', [exprLit(valI64(0n)), exprLit(valI64(1n))]);
    const res = await interpreter.callFunction('codegen_expr', [ast]);

    const expected = [
      '(i64.const 0)',
      '(local.set $t0)',
      '(i64.const 1)',
      '(local.set $t1)',
      '(if (result i64) (i64.lt_u (local.get $t1) (i64.load (i32.wrap_i64 (local.get $t0))))',
      '(then',
      '(call $alloc (i64.const 16))',
      '(local.set $t2)',
      '(i64.store (i32.wrap_i64 (local.get $t2)) (i64.const 1))',
      '(i64.store (i32.wrap_i64 (i64.add (local.get $t2) (i64.const 8)))',
      '  (i64.load (i32.wrap_i64 (i64.add (i64.add (local.get $t0) (i64.const 8)) (i64.mul (local.get $t1) (i64.const 8)))))',
      ' )',
      '(local.get $t2)',
      ')',
      '(else',
      '(call $alloc (i64.const 16))',
      '(local.set $t2)',
      '(i64.store (i32.wrap_i64 (local.get $t2)) (i64.const 0))',
      '(local.get $t2)',
      ')',
      ')'
    ].join('\n');

    assertEx(res, expected);
    console.log('T147 Passed: list.get WAT snippet matches expected output.');
  }
};

function assertEx(res: any, expected: string) {
  if (res.kind !== 'Str' || res.value !== expected) {
    throw new Error(`Expected codegen result "${expected}", got ${JSON.stringify(res)}`);
  }
}
