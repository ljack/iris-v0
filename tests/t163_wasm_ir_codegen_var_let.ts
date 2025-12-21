import { Interpreter } from '../src/eval';
import { TypeChecker } from '../src/typecheck';
import { Parser } from '../src/sexp';
import { ModuleResolver } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

export const t163_wasm_ir_codegen_var_let = {
  name: 't163_wasm_ir_codegen_var_let',
  fn: async () => {
    console.log('Running T163: codegen_expr Var/Let uses WASM IR renderer...');

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

    const exprLiteralI64 = valTagged('Literal', valTagged('I64', valI64(5n)));
    const exprVar = valTagged('Var', { kind: 'Record', fields: { name: valStr('x') } } as any);
    const exprLet = valTagged(
      'Let',
      {
        kind: 'Record',
        fields: {
          name: valStr('x'),
          value: exprLiteralI64,
          body: exprVar
        }
      } as any
    );

    const resLet = await interpreter.callFunction('codegen_expr', [exprLet]);
    const expected = ['(i64.const 5)', '(local.set $x)', '(local.get $x)'].join('\n');
    assertStr(resLet, expected);

    console.log('T163 Passed: Var/Let codegen uses IR render output.');
  }
};

function assertStr(res: any, expected: string) {
  if (res.kind !== 'Str' || res.value !== expected) {
    throw new Error(`Expected "${expected}", got ${JSON.stringify(res)}`);
  }
}
