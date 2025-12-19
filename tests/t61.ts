import { TestCase } from '../src/test-types';

export const t61: TestCase = {
  name: 'Test 61: Calling literal should fail',
  expect: 'ParseError: Expected Symbol at 6:17, got Int',
  source: `(program
 (module (name "t61") (version 0))
 (defs
  (deffn (name main)
    (args) (ret I64) (eff !Pure)
    (body (call 42)))))`
};
