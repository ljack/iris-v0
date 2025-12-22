import { Interpreter } from '../src/eval';
import { TypeChecker } from '../src/typecheck';
import { Parser } from '../src/sexp';
import { ModuleResolver } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

export const t160_wasm_snippet_option_constructors = {
  name: 't160_wasm_snippet_option_constructors',
  fn: async () => {
    console.log('Running T160: WAT snippet for Option constructors...');

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

    const tag = (name: string, value: any) => ({ kind: 'Tagged', tag: name, value } as any);
    const valI64 = (n: bigint) => ({ kind: 'I64', value: n } as any);
    const valRecord = (fields: Record<string, any>) => ({ kind: 'Record', fields } as any);

    const someExpr = tag('Literal', tag('Some', tag('I64', valI64(9n))));
    const noneExpr = tag('Literal', tag('None', valRecord({})));

    const someRes = await interpreter.callFunction('codegen_expr', [someExpr]);
    const noneRes = await interpreter.callFunction('codegen_expr', [noneExpr]);

    const expectedSome = [
      '(call $alloc (i64.const 16))',
      '(local.set $t0)',
      '(i64.store (i32.wrap_i64 (local.get $t0)) (i64.const 1))',
      '(i64.const 9)',
      '(local.set $t1)',
      '(i64.store (i32.wrap_i64 (i64.add (local.get $t0) (i64.const 8))) (local.get $t1))',
      '(local.get $t0)'
    ].join('\n');

    const expectedNone = [
      '(call $alloc (i64.const 16))',
      '(local.set $t0)',
      '(i64.store (i32.wrap_i64 (local.get $t0)) (i64.const 0))',
      '(local.get $t0)'
    ].join('\n');

    assertEx(someRes, expectedSome);
    assertEx(noneRes, expectedNone);
    console.log('T160 Passed: Option constructors match expected output.');
  }
};

function assertEx(res: any, expected: string) {
  if (res.kind !== 'Str' || res.value !== expected) {
    throw new Error(`Expected codegen result "${expected}", got ${JSON.stringify(res)}`);
  }
}
