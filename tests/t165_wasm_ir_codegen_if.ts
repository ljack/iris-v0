import { Interpreter } from '../src/eval';
import { TypeChecker } from '../src/typecheck';
import { Parser } from '../src/sexp';
import { ModuleResolver } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

export const t165_wasm_ir_codegen_if = {
  name: 't165_wasm_ir_codegen_if',
  fn: async () => {
    console.log('Running T165: codegen_expr If uses WASM IR renderer...');

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
    const valBool = (b: boolean) => ({ kind: 'Bool', value: b } as any);

    const cond = valTagged('Literal', valTagged('Bool', valBool(true)));
    const thenExpr = valTagged('Literal', valTagged('I64', valI64(2n)));
    const elseExpr = valTagged('Literal', valTagged('I64', valI64(3n)));

    const ifExpr = valTagged(
      'If',
      {
        kind: 'Record',
        fields: {
          cond,
          then: thenExpr,
          else: elseExpr
        }
      } as any
    );

    const res = await interpreter.callFunction('codegen_expr', [ifExpr]);
    const expected = [
      '(if (result i64)',
      '(i64.ne (i64.const 0) (i64.const 1))',
      '(then',
      '(i64.const 2)',
      ')',
      '(else',
      '(i64.const 3)',
      ')',
      ')'
    ].join('\n');

    assertStr(res, expected);
    console.log('T165 Passed: If codegen uses IR render output.');
  }
};

function assertStr(res: any, expected: string) {
  if (res.kind !== 'Str' || res.value !== expected) {
    throw new Error(`Expected "${expected}", got ${JSON.stringify(res)}`);
  }
}
