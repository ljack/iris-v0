import { Interpreter } from '../src/eval';
import { TypeChecker } from '../src/typecheck';
import { Parser } from '../src/sexp';
import { ModuleResolver } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

export const t149_wasm_snippet_list_items = {
  name: 't149_wasm_snippet_list_items',
  fn: async () => {
    console.log('Running T149: WAT snippet for list literal storage...');

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
    const exprList = (items: any[]) => ({
      kind: 'Tagged',
      tag: 'List',
      value: {
        kind: 'Record',
        fields: {
          items: { kind: 'List', items },
          typeArg: { kind: 'Tagged', tag: 'None', value: { kind: 'Record', fields: {} } }
        }
      }
    } as any);

    const valI64Raw = (n: bigint) => ({ kind: 'I64', value: n } as any);
    const astList = { kind: 'List', items: [exprLit(valI64(1n)), exprLit(valI64(2n))] } as any;
    const res = await interpreter.callFunction('gen_list_items', [astList, valI64Raw(0n)]);

    const expected = [
      '(i64.store (i32.wrap_i64 (i64.add (local.get $t0) (i64.const 8))) (i64.const 1))',
      '(i64.store (i32.wrap_i64 (i64.add (local.get $t0) (i64.const 16))) (i64.const 2))'
    ].join('\n');

    assertEx(res, expected);
    console.log('T149 Passed: list item storage WAT snippet matches expected output.');
  }
};

function assertEx(res: any, expected: string) {
  if (res.kind !== 'Str' || res.value !== expected) {
    throw new Error(`Expected codegen result "${expected}", got ${JSON.stringify(res)}`);
  }
}
