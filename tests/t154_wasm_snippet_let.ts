import { Interpreter } from '../src/eval';
import { TypeChecker } from '../src/typecheck';
import { Parser } from '../src/sexp';
import { ModuleResolver } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

export const t154_wasm_snippet_let = {
  name: 't154_wasm_snippet_let',
  fn: async () => {
    console.log('Running T154: WAT snippet for let...');

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
    const tag = (name: string, value: any) => ({ kind: 'Tagged', tag: name, value } as any);
    const valI64 = (n: bigint) => ({ kind: 'I64', value: n } as any);

    const lit = (n: bigint) => tag('Literal', tag('I64', valI64(n)));
    const letExpr = tag('Let', valRecord({ name: valStr('x'), value: lit(1n), body: lit(2n) }));

    const res = await interpreter.callFunction('codegen_expr', [letExpr]);

    const expected = [
      '(i64.const 1)',
      '(local.set $x)',
      '(i64.const 2)'
    ].join('\n');

    assertEx(res, expected);
    console.log('T154 Passed: let WAT snippet matches expected output.');
  }
};

function assertEx(res: any, expected: string) {
  if (res.kind !== 'Str' || res.value !== expected) {
    throw new Error(`Expected codegen result "${expected}", got ${JSON.stringify(res)}`);
  }
}
