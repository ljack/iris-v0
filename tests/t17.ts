import { TestCase } from '../src/test-types';

export const t17: TestCase = {
  name: 'Test 17: match non-option',
  expect: 'TypeError: Match target must be Option, Result, or List (got I64)',
  source: `(program
 (module (name "t17") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match 5
        (case (tag "Some" (v)) v)
        (case (tag "None") 0))))))`
};
