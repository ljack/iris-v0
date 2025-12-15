import { TestCase } from '../src/test-types';

export const t41: TestCase = {
  name: 'Test 41: Effect inference - all branches must be compatible',
  expect: 'TypeError: If branches mismatch: Expected I64, got (Result Str Str)',
  source: `(program
 (module (name "t41") (version 0))
 (defs
  (deffn (name main)
    (args) (ret (Result Str Str)) (eff !Pure)
    (body
      (if true
        1
        (io.read_file "/a.txt"))))))`
};
