import { TestCase } from '../src/test-types';

export const t53: TestCase = {
  name: 'Test 53: Pattern match on wrong type constructor',
  expect: 'TypeError: Match target must be Option, Result, List, or Union (got I64)',
  source: `(program
 (module (name "t53") (version 0))
 (defs
  (deffn (name main)
    (args) (ret I64) (eff !Pure)
    (body
      (match 42
        (case (tag "Some" (x)) x)
        (case (tag "None") 0))))))`
};
