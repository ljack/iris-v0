import * as fs from 'fs';
import * as path from 'path';
import { run } from '../src/main';
import { TestCase } from '../src/test-types';

function loadAllModulesRecursively(entryFile: string, loaded: Record<string, string> = {}): Record<string, string> {
  const content = fs.readFileSync(entryFile, 'utf-8');
  const baseDir = path.dirname(entryFile);

  const importRegex = /\(import\s+"([^"]+)"/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (!loaded[importPath]) {
      const resolvedPath = path.resolve(baseDir, importPath.endsWith('.iris') ? importPath : `${importPath}.iris`);
      if (fs.existsSync(resolvedPath)) {
        const modContent = fs.readFileSync(resolvedPath, 'utf-8');
        loaded[importPath] = modContent;
        loadAllModulesRecursively(resolvedPath, loaded);
      }
    }
  }
  return loaded;
}

export const t509_fib_wasm: TestCase = {
  name: 't509_fib_wasm',
  fn: async () => {
    const compilerPath = path.resolve(__dirname, '../examples/real/compiler/compiler.iris');
    const programPath = path.resolve(__dirname, '../examples/real/apps/fib.iris');
    const compilerSource = fs.readFileSync(compilerPath, 'utf-8');
    const modules = loadAllModulesRecursively(compilerPath);

    const nodeFs = {
      readFile: (p: string) => {
        try {
          return fs.readFileSync(p, 'utf-8');
        } catch {
          return null;
        }
      },
      writeFile: (_p: string, _c: string) => false,
      exists: (p: string) => fs.existsSync(p),
      readDir: (p: string) => {
        try {
          return fs.readdirSync(p);
        } catch {
          return null;
        }
      }
    };

    const watResult = await run(compilerSource, nodeFs, modules, undefined, [programPath, 'wasm']);
    if (typeof watResult !== 'string') {
      throw new Error('Expected compiler to return WAT string.');
    }
    let wat = watResult;
    if (wat.startsWith('"') && wat.endsWith('"')) {
      wat = JSON.parse(wat);
    }
    if (!wat.startsWith('(module')) {
      throw new Error(`Expected WAT module, got: ${wat.slice(0, 80)}`);
    }

    const wabt = await require('wabt')();
    const wasmModule = wabt.parseWat('module.wat', wat);
    const { buffer } = wasmModule.toBinary({ write_debug_names: true });
    const wasmBytes = new Uint8Array(buffer);

    const importObj = {
      host: {
        print: (_ptr: bigint) => 0n,
        i64_to_string: (_value: bigint) => 0n,
        str_concat: (_aPtr: bigint, _bPtr: bigint) => 0n,
        rand_u64: () => 0n,
        args_list: () => 0n,
        parse_i64: (_ptr: bigint) => 0n,
        record_get: (_recordPtr: bigint, _keyPtr: bigint) => 0n
      }
    };

    const instantiated = await WebAssembly.instantiate(wasmBytes, importObj);
    const instResult = instantiated as unknown as WebAssembly.WebAssemblyInstantiatedSource;
    const instance = instResult.instance ?? (instantiated as WebAssembly.Instance);
    const fib = instance.exports.fib as ((n: bigint) => bigint) | undefined;
    if (!fib) {
      throw new Error('Expected wasm module to export fib.');
    }

    const result = fib(10n);
    if (result !== 55n) {
      throw new Error(`Expected fib(10) to return 55n, got ${result}`);
    }
  }
};
