import { Interpreter } from '../src/eval';
import { TypeChecker } from '../src/typecheck';
import { Parser } from '../src/sexp';
import { ModuleResolver } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

export const t151_wasm_snippet_gen_defs = {
  name: 't151_wasm_snippet_gen_defs',
  fn: async () => {
    console.log('Running T151: WAT snippet for gen_defs...');

    const code = fs.readFileSync(path.join(__dirname, '../examples/real/compiler/codegen_wasm.iris'), 'utf8');
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
    const valRecord = (fields: Record<string, any>) => ({ kind: 'Record', fields } as any);
    const tag = (name: string, value: any) => ({ kind: 'Tagged', tag: name, value } as any);

    const exprLit = (v: any) => tag('Literal', v);
    const typeI64 = tag('I64', valRecord({}));

    const defFn = tag(
      'DefFn',
      valRecord({
        name: valStr('main'),
        args: valList([]),
        ret: typeI64,
        eff: valStr('!Pure'),
        body: exprLit(tag('I64', valI64(1n)))
      })
    );

    const defs = valList([defFn]);
    const res = await interpreter.callFunction('gen_defs', [defs]);

    const expected = [
      '(func $main (export "main") (result i64)',
      '(local $t0 i64)',
      '(local $t1 i64)',
      '(local $t2 i64)',
      '(local $t3 i64)',
      '(local $t4 i64)',
      '(local $t5 i64)',
      '(local $target i64)',
      '(i64.const 1)',
      ')'
    ].join('\n');

    assertEx(res, expected);
    console.log('T151 Passed: gen_defs WAT snippet matches expected output.');
  }
};

function assertEx(res: any, expected: string) {
  if (res.kind !== 'Str' || res.value !== expected) {
    throw new Error(`Expected codegen result "${expected}", got ${JSON.stringify(res)}`);
  }
}
