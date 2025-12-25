import * as fs from 'fs';
import * as path from 'path';
import { IrisWasmHost } from '../src/runtime/wasm_host';
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

export const t511_fibviz_wasm_trace: TestCase = {
  name: 't511_fibviz_wasm_trace',
  fn: async () => {
    const compilerPath = path.resolve(__dirname, '../examples/real/compiler/compiler.iris');
    const programPath = path.resolve(__dirname, '../examples/real/apps/fib_viz.iris');
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

    const lines: string[] = [];
    const host = new IrisWasmHost({
      args: ['15'],
      onPrint: (text) => lines.push(text)
    });
    const importObj = host.getImportObject();
    const instantiated = await WebAssembly.instantiate(wasmBytes, importObj as WebAssembly.Imports);
    const instResult = instantiated as unknown as WebAssembly.WebAssemblyInstantiatedSource;
    const instance = instResult.instance ?? (instantiated as WebAssembly.Instance);
    const memory = instance.exports.memory as WebAssembly.Memory | undefined;
    if (!memory) throw new Error('Expected wasm module to export memory.');
    host.attachMemory(memory);
    const alloc = instance.exports.alloc as ((size: bigint) => bigint) | undefined;
    if (alloc) host.attachAlloc(alloc);

    const main = instance.exports.main as (() => bigint) | undefined;
    if (!main) throw new Error('Expected wasm module to export main.');
    main();

    if (!lines.some((line) => line.startsWith('METRIC '))) {
      throw new Error(`Expected METRIC output, got: ${lines.slice(0, 5).join(' | ')}`);
    }
  }
};
