import { Interpreter } from '../src/eval';
import { TypeChecker } from '../src/typecheck';
import { Parser } from '../src/sexp';
import { ModuleResolver } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

export const t158_wasm_snippet_string_literal = {
  name: 't158_wasm_snippet_string_literal',
  fn: async () => {
    console.log('Running T158: WAT snippet for string literal...');

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
    const valStr = (s: string) => ({ kind: 'Str', value: s });

    const strExpr = tag('Literal', tag('Str', valStr('hi')));
    const res = await interpreter.callFunction('codegen_expr', [strExpr]);

    const expected = [
      '(call $alloc (i64.const 16))',
      '(local.set $t0)',
      '(i64.store (i32.wrap_i64 (local.get $t0)) (i64.const 2))',
      '(i64.store8 (i32.wrap_i64 (i64.add (local.get $t0) (i64.const 8))) (i64.const 104))',
      '(i64.store8 (i32.wrap_i64 (i64.add (local.get $t0) (i64.const 9))) (i64.const 105))',
      '(local.get $t0)'
    ].join('\n');

    assertEx(res, expected);
    console.log('T158 Passed: string literal WAT snippet matches expected output.');
  }
};

function assertEx(res: any, expected: string) {
  if (res.kind !== 'Str' || res.value !== expected) {
    throw new Error(`Expected codegen result "${expected}", got ${JSON.stringify(res)}`);
  }
}
