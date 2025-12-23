import * as fs from 'fs';
import * as path from 'path';
import { check } from '../src/main';
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

export const t507_examples_typecheck: TestCase = {
  name: 't507_examples_typecheck',
  fn: async () => {
    const appsDir = path.resolve(__dirname, '../examples/real/apps');
    const entries = fs.readdirSync(appsDir).filter((f) => f.endsWith('.iris'));

    const skip = new Set(['lsp_demo_broken_by_purpose.iris']);
    const failures: string[] = [];

    for (const file of entries) {
      if (skip.has(file)) continue;
      const filePath = path.join(appsDir, file);
      const source = fs.readFileSync(filePath, 'utf-8');
      const modules = loadAllModulesRecursively(filePath);
      const result = check(source, modules);
      if (!result.success) {
        failures.push(`${file}: ${String(result.error).slice(0, 120)}`);
      }
    }

    if (failures.length > 0) {
      throw new Error(`Typecheck failed on examples:\n${failures.join('\n')}`);
    }
  }
};
