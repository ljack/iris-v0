import { TestCase } from '../src/test-types';

export const t66: TestCase = {
  name: 'Test 66: Large integer handling',
  expect: '9223372036854775807',
  source: `(program
 (module (name "t66") (version 0))
 (defs
  (deffn (name main)
    (args) (ret I64) (eff !Pure)
    (body 9223372036854775807)))))`
};
