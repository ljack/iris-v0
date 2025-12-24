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

export const t508_fib_runner: TestCase = {
  name: 't508_fib_runner',
  fn: async () => {
    const programPath = path.resolve(__dirname, '../examples/real/apps/fib.iris');
    const source = fs.readFileSync(programPath, 'utf-8');
    const modules = loadAllModulesRecursively(programPath);
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

    const result = await run(source, nodeFs, modules, undefined, ['10']);
    if (result !== '55') {
      throw new Error(`Expected fib(10) to return 55, got ${result}`);
    }
  }
};
