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
      '      (body (call bar x)))',
      '    )',
      '    (deffn (name broken)',
      '      (args)',
      '      (ret I64)',
      '      (eff !Pure)',
      '      (body \"oops\"))',
      '    )',
      '    (deffn (name uses_lexer)',
      '      (args)',
      '      (ret I64)',
      '      (eff !Pure)',
      '      (body (call lexer.tokenize)))',
      '    )',
      '  )',
      ')',
    ].join('\n');

    const doc = TextDocument.create('file:///test.iris', 'iris', 1, source);

    const unknownVar = buildDiagnostic('TypeError: Unknown variable: bar', doc);
    const unknownVarText = doc.getText(unknownVar.range);
    if (unknownVarText !== 'bar') {
      throw new Error(`Expected to highlight 'bar', got '${unknownVarText}'`);
    }

    const unknownCall = buildDiagnostic(
      'TypeError: Unknown function call: lexer.tokenize',
      doc,
    );
    const unknownCallText = doc.getText(unknownCall.range);
    if (unknownCallText !== 'lexer.tokenize') {
      throw new Error(
        `Expected to highlight 'lexer.tokenize', got '${unknownCallText}'`,
      );
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

    const fnMismatch = buildDiagnostic(
      'TypeError: Function broken return type mismatch: Expected I64, got Str',
      doc,
    );
    const fnText = doc.getText(fnMismatch.range);
    if (fnText !== 'broken') {
      throw new Error(`Expected to highlight 'broken', got '${fnText}'`);
    }
  },
};
