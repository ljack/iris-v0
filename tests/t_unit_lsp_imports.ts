import { TestCase } from '../src/test-types';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { loadImportModules, resolveImportFile } from '../src/lsp-workspace';

export const t_unit_lsp_imports: TestCase = {
  name: 'Unit: LSP import resolver',
  fn: async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'iris-import-'));
    const baseDir = path.join(root, 'src');
    fs.mkdirSync(baseDir, { recursive: true });

    const baseFile = path.join(baseDir, 'main.iris');
    fs.writeFileSync(baseFile, '(program)', 'utf8');

    const localImport = path.join(baseDir, 'lexer.iris');
    fs.writeFileSync(localImport, '(program)', 'utf8');

    const workspaceImport = path.join(root, 'core.iris');
    fs.writeFileSync(workspaceImport, '(program)', 'utf8');

    const localResolved = resolveImportFile('lexer', baseFile, [root]);
    if (localResolved !== localImport) {
      throw new Error(`Expected local import to resolve to ${localImport}`);
    }

    const workspaceResolved = resolveImportFile('core', baseFile, [root]);
    if (workspaceResolved !== workspaceImport) {
      throw new Error(`Expected workspace import to resolve to ${workspaceImport}`);
    }

    const program = {
      module: { name: 'test', version: 1 },
      imports: [
        { path: 'lexer', alias: 'lexer' },
        { path: 'core', alias: 'core' },
      ],
      defs: [],
    };
    const modules = loadImportModules(baseFile, program, [root]);
    if (!modules.lexer || !modules.core) {
      throw new Error('Expected modules to include lexer and core sources');
    }
  },
};
