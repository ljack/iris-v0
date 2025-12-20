import { TestCase } from '../src/test-types';
import { getBuiltinDoc } from '../src/lsp-docs';

export const t_unit_lsp_docs: TestCase = {
  name: 'Unit: LSP builtin docs',
  fn: async () => {
    const doc = getBuiltinDoc('Bool');
    if (!doc || !doc.markdown.includes('Boolean')) {
      throw new Error('Expected Bool docs');
    }
    if (getBuiltinDoc('UnknownType')) {
      throw new Error('Unexpected docs for unknown type');
    }
  },
};
