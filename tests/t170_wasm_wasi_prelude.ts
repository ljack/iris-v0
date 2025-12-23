import { Interpreter } from '../src/eval';
import { TypeChecker } from '../src/typecheck';
import { Parser } from '../src/sexp';
import { ModuleResolver } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

export const t170_wasm_wasi_prelude = {
  name: 't170_wasm_wasi_prelude',
  fn: async () => {
    console.log('Running T170: WAT snippet for WASI prelude...');

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

    const prog = valRecord({
      progMod: valRecord({ name: valStr('m'), version: valI64(0n) }),
      progImports: valList([]),
      progDefs: valList([])
    });

    const res = await interpreter.callFunction('codegen_module_profile', [prog, valStr('wasi')]);
    if (res.kind !== 'Str') {
      throw new Error(`Expected codegen result Str, got ${JSON.stringify(res)}`);
    }

    if (!res.value.includes('(import "wasi_snapshot_preview1" "fd_write"')) {
      throw new Error('Expected fd_write import in WASI prelude.');
    }
    if (!res.value.includes('(func $host.print')) {
      throw new Error('Expected host.print shim function in WASI prelude.');
    }
    if (!res.value.includes('(export "_start")')) {
      throw new Error('Expected _start export in WASI prelude.');
    }
  }
};
