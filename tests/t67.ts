import { TestCase } from '../src/test-types';

export const t67: TestCase = {
  name: 'Test 67: Negative integers',
  expect: '-42',
  source: `(program
 (module (name "t67") (version 0))
 (defs
  (deffn (name main)
    (args) (ret I64) (eff !Pure)
    (body -42)))))`
};
