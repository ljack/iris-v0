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

export const t506_wasm_smoke: TestCase = {
  name: 't506_wasm_smoke',
  fn: async () => {
    const compilerPath = path.resolve(__dirname, '../examples/real/compiler/compiler.iris');
    const programPath = path.resolve(__dirname, '../examples/real/apps/hello_full.iris');
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

    const logs: string[] = [];
    let memory: WebAssembly.Memory | null = null;
    const importObj = {
      io: {
        print: (ptr: bigint) => {
          if (!memory) return 0n;
          const view = new DataView(memory.buffer);
          const base = Number(ptr);
          const len = Number(view.getBigInt64(base, true));
          const bytes = new Uint8Array(memory.buffer, base + 8, len);
          const text = new TextDecoder('utf-8').decode(bytes);
          logs.push(text);
          return 0n;
        }
      }
    };

    const instantiated = await WebAssembly.instantiate(wasmBytes, importObj);
    const instResult = instantiated as unknown as WebAssembly.WebAssemblyInstantiatedSource;
    const instance = instResult.instance ?? (instantiated as WebAssembly.Instance);
    memory = (instance.exports.memory as WebAssembly.Memory) ?? null;
    const main = instance.exports.main as (() => bigint) | undefined;
    if (!main) {
      throw new Error('Expected wasm module to export main.');
    }
    const result = main();
    if (result !== 0n) {
      throw new Error(`Expected main to return 0n, got: ${result}`);
    }
    if (!logs[0] || !logs[0].includes('Hello from CLI!')) {
      throw new Error(`Expected print output to include 'Hello from CLI!', got: ${logs[0] ?? ''}`);
    }
  }
};
