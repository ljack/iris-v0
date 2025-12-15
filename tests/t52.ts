import { TestCase } from '../src/test-types';

export const t52: TestCase = {
  name: 'Test 52: Pattern match type mismatch in case body',
  expect: 'TypeError: Expression type mismatch',
  source: `(program
 (module (name "t52") (version 0))
 (defs
  (deffn (name main)
    (args) (ret I64) (eff !Pure)
    (body
      (match (Some 42)
        (case (tag "Some" (x)) x)
        (case (tag "None") "not a number"))))))`
};
