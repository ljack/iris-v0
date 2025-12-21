import { Interpreter } from '../src/eval';
import { TypeChecker } from '../src/typecheck';
import { Parser } from '../src/sexp';
import { ModuleResolver } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

export const t150_wasm_snippet_call_args = {
  name: 't150_wasm_snippet_call_args',
  fn: async () => {
    console.log('Running T150: WAT snippet for call args...');

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
    const exprCall = (name: string, args: any[]) => ({
      kind: 'Tagged',
      tag: 'Call',
      value: valRecord({
        name: valStr(name),
        args: valList(args)
      })
    } as any);

    const ast = exprCall('foo', [exprLit(valI64(1n)), exprLit(valI64(2n))]);
    const res = await interpreter.callFunction('codegen_expr', [ast]);

    const expected = [
      '(i64.const 1)',
      '(i64.const 2)',
      '(call $foo)'
    ].join('\n');

    assertEx(res, expected);
    console.log('T150 Passed: call args WAT snippet matches expected output.');
  }
};

function assertEx(res: any, expected: string) {
  if (res.kind !== 'Str' || res.value !== expected) {
    throw new Error(`Expected codegen result "${expected}", got ${JSON.stringify(res)}`);
  }
}
