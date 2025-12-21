import { Interpreter } from '../src/eval';
import { TypeChecker } from '../src/typecheck';
import { Parser } from '../src/sexp';
import { ModuleResolver } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

export const t159_wasm_snippet_string_bytes = {
  name: 't159_wasm_snippet_string_bytes',
  fn: async () => {
    console.log('Running T159: WAT snippet for string bytes...');

    const code = fs.readFileSync(path.join(__dirname, '../examples/real/compiler/codegen_wasm_emit.iris'), 'utf8');
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

    const res = await interpreter.callFunction('gen_string_bytes', [valStr('hi'), valI64(0n), valI64(2n)]);

    const expected = [
      '(i64.store8 (i32.wrap_i64 (i64.add (local.get $t0) (i64.const 8))) (i64.const 104))',
      '(i64.store8 (i32.wrap_i64 (i64.add (local.get $t0) (i64.const 9))) (i64.const 105))'
    ].join('\n');

    assertEx(res, expected);
    console.log('T159 Passed: string bytes snippet matches expected output.');
  }
};

function assertEx(res: any, expected: string) {
  if (res.kind !== 'Str' || res.value !== expected) {
    throw new Error(`Expected codegen result "${expected}", got ${JSON.stringify(res)}`);
  }
}
