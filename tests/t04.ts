import { TestCase } from '../src/test-types';

export const t04: TestCase = {
  name: 'Test 04: Option match',
  expect: '5',
  source: `(program
 (module (name "t04") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (Some 5)
        (case (tag "Some" (v)) v)
        (case (tag "None") 0))))))`
};
