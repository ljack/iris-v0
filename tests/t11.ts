import { TestCase } from '../src/test-types';

export const t11: TestCase = {
  name: 'Test 11: string escaping',
  expect: '"a\\"b\\\\c\\n"',
  source: `(program
 (module (name "t11") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret Str)
    (eff !Pure)
    (body "a\\"b\\\\c\\n"))))`
};
