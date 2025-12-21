import { TestCase } from '../src/test-types';
import { Parser } from '../src/sexp/parser';
import * as fs from 'fs';
import * as path from 'path';

function collectIrisFiles(dir: string, out: string[]) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') {
        continue;
      }
      collectIrisFiles(fullPath, out);
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.iris')) {
      out.push(fullPath);
    }
  }
}

export const t505_iris_parse_smoke: TestCase = {
  name: 'Test 505: Iris parse smoke (apps + stdlib)',
  fn: async () => {
    const roots = [
      path.resolve(__dirname, '../examples/real/apps'),
      path.resolve(__dirname, '../stdlib'),
    ];
    const files: string[] = [];
    for (const root of roots) {
      collectIrisFiles(root, files);
    }

    for (const filePath of files) {
      const text = fs.readFileSync(filePath, 'utf8');
      try {
        const parser = new Parser(text, false);
        parser.parse();
      } catch (err: any) {
        throw new Error(`Parse failed for ${filePath}: ${err.message}`);
      }
    }
  },
};
