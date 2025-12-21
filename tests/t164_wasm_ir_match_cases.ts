import { Interpreter } from '../src/eval';
import { TypeChecker } from '../src/typecheck';
import { Parser } from '../src/sexp';
import { ModuleResolver } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

export const t164_wasm_ir_match_cases = {
  name: 't164_wasm_ir_match_cases',
  fn: async () => {
    console.log('Running T164: gen_match_cases uses WASM IR renderer...');

    const code = fs.readFileSync(
      path.join(__dirname, '../examples/real/compiler/codegen_wasm_expr.iris'),
      'utf8'
    );
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

    const valStr = (value: string) => ({ kind: 'Str', value } as any);
    const valList = (items: any[]) => ({ kind: 'List', items } as any);
    const valRecord = (fields: Record<string, any>) => ({ kind: 'Record', fields } as any);
    const valTagged = (tag: string, value: any) => ({ kind: 'Tagged', tag, value } as any);
    const valI64 = (n: bigint) => ({ kind: 'I64', value: n } as any);

    const exprLiteralI64 = valTagged('Literal', valTagged('I64', valI64(0n)));
    const matchCase = valRecord({
      variantTag: valStr('_'),
      vars: valList([]),
      body: exprLiteralI64
    });

    const cases = valList([matchCase]);
    const res = await interpreter.callFunction('gen_match_cases', [cases, valStr('$target'), { kind: 'I64', value: 0n } as any]);

    const expected = [
      '(if (result i64)',
      '(i32.const 1)',
      '(then',
      '(i64.const 0)',
      ')',
      '(else',
      '(unreachable)',
      ')',
      ')'
    ].join('\n');

    assertStr(res, expected);
    console.log('T164 Passed: match cases render through IR.');
  }
};

function assertStr(res: any, expected: string) {
  if (res.kind !== 'Str' || res.value !== expected) {
    throw new Error(`Expected "${expected}", got ${JSON.stringify(res)}`);
  }
}
