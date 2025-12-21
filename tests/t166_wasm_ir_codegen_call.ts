import { Interpreter } from '../src/eval';
import { TypeChecker } from '../src/typecheck';
import { Parser } from '../src/sexp';
import { ModuleResolver } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

export const t166_wasm_ir_codegen_call = {
  name: 't166_wasm_ir_codegen_call',
  fn: async () => {
    console.log('Running T166: codegen_expr Call uses WASM IR renderer...');

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
    const valTagged = (tag: string, value: any) => ({ kind: 'Tagged', tag, value } as any);
    const valI64 = (n: bigint) => ({ kind: 'I64', value: n } as any);
    const valList = (items: any[]) => ({ kind: 'List', items } as any);
    const valRecord = (fields: Record<string, any>) => ({ kind: 'Record', fields } as any);

    const arg = valTagged('Literal', valTagged('I64', valI64(1n)));
    const callExpr = valTagged(
      'Call',
      valRecord({
        name: valStr('foo'),
        args: valList([arg])
      })
    );

    const res = await interpreter.callFunction('codegen_expr', [callExpr]);
    const expected = ['(i64.const 1)', '(call $foo)'].join('\n');
    assertStr(res, expected);

    console.log('T166 Passed: Call codegen uses IR render output.');
  }
};

function assertStr(res: any, expected: string) {
  if (res.kind !== 'Str' || res.value !== expected) {
    throw new Error(`Expected "${expected}", got ${JSON.stringify(res)}`);
  }
}
