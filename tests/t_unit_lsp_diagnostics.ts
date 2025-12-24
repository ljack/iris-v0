import { TestCase } from '../src/test-types';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { buildDiagnostic, buildDiagnosticsForError } from '../src/lsp-diagnostics';

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
      '      (body (bar x)))',
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
      '      (body (lexer.tokenize)))',
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

    const programDoc = TextDocument.create('file:///program.iris', 'iris', 1, source);
    const spanFor = (needle: string) => {
      const idx = source.indexOf(needle);
      if (idx === -1) {
        throw new Error(`Missing needle ${needle}`);
      }
      const prefix = source.slice(0, idx);
      const lines = prefix.split('\n');
      const line = lines.length;
      const col = lines[lines.length - 1].length + 1;
      return { line, col, len: needle.length };
    };
    const fnDiagnostics = buildDiagnosticsForError(
      'TypeError: Function broken return type mismatch: Expected I64, got Str',
      programDoc,
      {
        module: { name: 'test', version: 1 },
        imports: [],
        defs: [
          {
            kind: 'DefFn',
            name: 'broken',
            nameSpan: spanFor('broken'),
            args: [],
            ret: { type: 'I64' },
            eff: '!Pure',
            body: { kind: 'Literal', value: { kind: 'Str', value: 'oops' }, span: spanFor('"oops"') },
          },
        ],
      },
    );
    const fnText = programDoc.getText(fnDiagnostics[0].range);
    if (fnText !== 'broken') {
      throw new Error(`Expected to highlight 'broken', got '${fnText}'`);
    }
    if (fnDiagnostics.length < 3) {
      throw new Error('Expected extra diagnostics for return mismatch');
    }

    const spanError = buildDiagnostic(
      'TypeError: Unknown function call: foo at 3:5',
      doc,
    );
    if (spanError.range.start.line !== 2 || spanError.range.start.character !== 4) {
      throw new Error(
        `Expected span at 3:5, got ${spanError.range.start.line + 1}:${spanError.range.start.character + 1}`,
      );
    }
  },
};
