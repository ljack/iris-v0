import { formatSourcePreserveComments } from '../src/format';
import { TestCase } from '../src/test-types';

export const t_unit_format_source: TestCase = {
  name: 'Unit: format source preserves comments',
  fn: async () => {
    const source = [
      ';; top comment',
      '(program',
      '  (module (name "fmt_comments") (version 0))',
      '  ;; before defs',
      '  (defs',
      '    (deffn (name main) (args) (ret I64) (eff !IO)',
      '      ;; inside body',
      '      (body',
      '        (io.print "hi") ;; trailing comment',
      '      )',
      '    )',
      '  )',
      ')',
    ].join('\n');

    const formatted = formatSourcePreserveComments(source);
    const required = [
      ';; top comment',
      ';; before defs',
      ';; inside body',
      ';; trailing comment',
    ];
    for (const comment of required) {
      if (!formatted.includes(comment)) {
        throw new Error(`Expected formatted output to include comment: ${comment}`);
      }
    }
  },
};
