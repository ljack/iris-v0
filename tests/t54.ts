import { TestCase } from '../src/test-types';

export const t54: TestCase = {
  name: 'Test 54: Pattern variable used with wrong type in case body',
  expect: 'TypeError: Match arms mismatch: Expected I64, got Str',
  source: `(program
 (module (name "t54") (version 0))
 (defs
  (deffn (name main)
    (args) (ret Str) (eff !Pure)
    (body
      (match (Some 5)
        (case (tag "Some" (x)) (+ x 1))
        (case (tag "None") "none"))))))`
};
