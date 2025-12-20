import { TestCase } from '../src/test-types';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { buildDiagnostic } from '../src/lsp-diagnostics';

export const t_unit_lsp_diagnostics: TestCase = {
  name: 'Unit: LSP diagnostics range',
  fn: async () => {
    const source = [
      '(program',
      '  (defs',
      '    (deffn (name foo)',
      '      (args (x I64))',
      '      (ret I64)',
      '      (eff !Pure)',
      '      (body (call bar x))))',
      '  )',
      ')',
    ].join('\n');

    const doc = TextDocument.create('file:///test.iris', 'iris', 1, source);

    const unknownVar = buildDiagnostic('TypeError: Unknown variable: bar', doc);
    const unknownVarText = doc.getText(unknownVar.range);
    if (unknownVarText !== 'bar') {
      throw new Error(`Expected to highlight 'bar', got '${unknownVarText}'`);
    }

    const parseError = buildDiagnostic('ParseError: Unexpected character \'@\' at 2:3', doc);
    if (parseError.range.start.line !== 1) {
      throw new Error(`Expected line 2 for parse error, got ${parseError.range.start.line + 1}`);
    }
    if (parseError.range.start.character !== 2) {
      throw new Error(
        `Expected column 3 for parse error, got ${parseError.range.start.character + 1}`,
      );
    }
  },
};
