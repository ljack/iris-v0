import { Interpreter } from '../src/eval';
import { TypeChecker } from '../src/typecheck';
import { Parser } from '../src/sexp';
import { ModuleResolver } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

export const t162_wasm_ir_codegen_literal = {
  name: 't162_wasm_ir_codegen_literal',
  fn: async () => {
    console.log('Running T162: codegen_expr literal path uses WASM IR renderer...');

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

    const valTagged = (tag: string, value: any) => ({ kind: 'Tagged', tag, value } as any);
    const valI64 = (n: bigint) => ({ kind: 'I64', value: n } as any);
    const valBool = (b: boolean) => ({ kind: 'Bool', value: b } as any);

    const exprLiteralI64 = valTagged('Literal', valTagged('I64', valI64(7n)));
    const resI64 = await interpreter.callFunction('codegen_expr', [exprLiteralI64]);
    assertStr(resI64, '(i64.const 7)');

    const exprLiteralBool = valTagged('Literal', valTagged('Bool', valBool(true)));
    const resBool = await interpreter.callFunction('codegen_expr', [exprLiteralBool]);
    assertStr(resBool, '(i64.const 1)');

    console.log('T162 Passed: literal codegen uses IR render output.');
  }
};

function assertStr(res: any, expected: string) {
  if (res.kind !== 'Str' || res.value !== expected) {
    throw new Error(`Expected "${expected}", got ${JSON.stringify(res)}`);
  }
}
