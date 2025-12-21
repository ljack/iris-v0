import { Interpreter } from '../src/eval';
import { TypeChecker } from '../src/typecheck';
import { Parser } from '../src/sexp';
import { ModuleResolver } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

export const t152_wasm_snippet_params_locals = {
  name: 't152_wasm_snippet_params_locals',
  fn: async () => {
    console.log('Running T152: WAT snippet for params and locals...');

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
    const valList = (items: any[]) => ({ kind: 'List', items } as any);
    const valRecord = (fields: Record<string, any>) => ({ kind: 'Record', fields } as any);
    const tag = (name: string, value: any) => ({ kind: 'Tagged', tag: name, value } as any);

    const typeI64 = tag('I64', valRecord({}));

    const arg = (name: string) =>
      valRecord({
        name: valStr(name),
        type: typeI64
      });

    const params = valList([arg('x'), arg('y')]);
    const locals = valList([valStr('tmp'), valStr('acc')]);

    const paramsRes = await interpreter.callFunction('gen_params', [params]);
    const localsRes = await interpreter.callFunction('gen_local_decls', [locals]);

    const expectedParams = ['(param $x i64)', '(param $y i64)', ''].join('\n');
    const expectedLocals = ['(local $tmp i64)', '(local $acc i64)', ''].join('\n');

    assertEx(paramsRes, expectedParams);
    assertEx(localsRes, expectedLocals);
    console.log('T152 Passed: params/local decls match expected output.');
  }
};

function assertEx(res: any, expected: string) {
  if (res.kind !== 'Str' || res.value !== expected) {
    throw new Error(`Expected codegen result "${expected}", got ${JSON.stringify(res)}`);
  }
}
