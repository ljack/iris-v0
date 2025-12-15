import { TestCase } from '../src/test-types';

export const t55: TestCase = {
  name: 'Test 55: All match branches return same type',
  expect: '42',
  source: `(program
 (module (name "t55") (version 0))
 (defs
  (deffn (name main)
    (args) (ret I64) (eff !Pure)
    (body
      (match (Ok 42)
        (case (tag "Ok" (v)) v)
        (case (tag "Err" (e)) 0))))))`
};
