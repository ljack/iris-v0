import { TestCase } from '../src/test-types';
import { collectIrisFiles } from '../src/lsp-workspace';
import fs from 'fs';
import os from 'os';
import path from 'path';

export const t_unit_lsp_workspace: TestCase = {
  name: 'Unit: LSP workspace scan',
  fn: async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-lsp-'));
    const nested = path.join(root, 'nested');
    const ignored = path.join(root, 'node_modules');

    fs.mkdirSync(nested, { recursive: true });
    fs.mkdirSync(ignored, { recursive: true });

    const a = path.join(root, 'a.iris');
    const b = path.join(nested, 'b.iris');
    const c = path.join(ignored, 'c.iris');
    fs.writeFileSync(a, '(program)', 'utf8');
    fs.writeFileSync(b, '(program)', 'utf8');
    fs.writeFileSync(c, '(program)', 'utf8');

    const results = await collectIrisFiles(root);
    const rel = results.map((p) => path.relative(root, p)).sort();
    if (rel.length !== 2 || rel[0] !== 'a.iris' || rel[1] !== path.join('nested', 'b.iris')) {
      throw new Error(`Unexpected scan results: ${rel.join(', ')}`);
    }
  },
};
