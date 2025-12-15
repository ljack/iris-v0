import { TestCase } from '../src/test-types';

export const t40: TestCase = {
  name: 'Test 40: Empty Record',
  expect: '(record)',
  source: `(program
 (module (name "t40") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (Record))
    (eff !Pure)
    (body (record)))))`
};
