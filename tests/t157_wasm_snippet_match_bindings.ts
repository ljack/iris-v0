import { Interpreter } from '../src/eval';
import { TypeChecker } from '../src/typecheck';
import { Parser } from '../src/sexp';
import { ModuleResolver } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

export const t157_wasm_snippet_match_bindings = {
  name: 't157_wasm_snippet_match_bindings',
  fn: async () => {
    console.log('Running T157: WAT snippet for match bindings...');

    const code = fs.readFileSync(path.join(__dirname, '../examples/real/compiler/codegen_wasm_match.iris'), 'utf8');
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
    const valI64 = (n: bigint) => ({ kind: 'I64', value: n } as any);
    const valList = (items: any[]) => ({ kind: 'List', items } as any);

    const vars = valList([valStr('head'), valStr('tail')]);
    const target = valStr('$target');
    const idx = valI64(0n);

    const res = await interpreter.callFunction('gen_match_bindings', [vars, target, idx]);

    const expected = [
      '(local.set $head (i64.load (i32.wrap_i64 (i64.add (local.get $target) (i64.const 8)))))',
      '(local.set $tail (i64.load (i32.wrap_i64 (i64.add (local.get $target) (i64.const 16)))))',
      ''
    ].join('\n');

    assertEx(res, expected);
    console.log('T157 Passed: match bindings snippet matches expected output.');
  }
};

function assertEx(res: any, expected: string) {
  if (res.kind !== 'Str' || res.value !== expected) {
    throw new Error(`Expected codegen result "${expected}", got ${JSON.stringify(res)}`);
  }
}
