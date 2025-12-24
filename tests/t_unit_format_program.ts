import { Parser } from '../src/sexp';
import { formatProgram, viewProgram } from '../src/format';
import { TestCase } from '../src/test-types';

export const t_unit_format_program: TestCase = {
  name: 'Unit: format/view program',
  fn: async () => {
    const source = [
      '(program',
      '  (module (name "fmt_test") (version 1))',
      '  (imports',
      '    (import "io" (as "io"))',
      '  )',
      '  (defs',
      '    (deffn (name main) (args) (ret I64) (eff !IO)',
      '      (body (io.print "hi"))',
      '    )',
      '  )',
      ')',
    ].join('\n');

    const parser = new Parser(source);
    const program = parser.parse();
    const formatted = formatProgram(program);
    if (!formatted.startsWith('(program')) {
      throw new Error('formatProgram should start with (program');
    }

    const reparsed = new Parser(formatted).parse();
    const formattedAgain = formatProgram(reparsed);
    if (formattedAgain !== formatted) {
      throw new Error('formatProgram should be idempotent');
    }

    const sugarSource = [
      '(program',
      '  (module (name "sugar") (version 0))',
      '  (defs',
      '    (deffn (name main) (args) (ret I64) (eff !Pure)',
      '      (body',
      '        (let* ((x 1) (y 2))',
      '          (cond',
      '            (case true (record.update (record) (a x)))',
      '            (else y)',
      '          )',
      '        )',
      '      )',
      '    )',
      '  )',
      ')',
    ].join('\n');
    const sugarProgram = new Parser(sugarSource).parse();
    const preserved = formatProgram(sugarProgram, { preserveSugar: true });
    if (!preserved.includes('(let*')) {
      throw new Error('Expected preserve-sugar to emit let*');
    }
    if (!preserved.includes('(cond')) {
      throw new Error('Expected preserve-sugar to emit cond');
    }
    if (!preserved.includes('(record.update')) {
      throw new Error('Expected preserve-sugar to emit record.update');
    }

    const view = viewProgram(program);
    if (!view.includes('program') || !view.includes('defn main')) {
      throw new Error('viewProgram should include program and defn lines');
    }
  },
};
