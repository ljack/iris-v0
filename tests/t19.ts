import { TestCase } from '../src/test-types';

export const t19: TestCase = {
  name: 'Test 19: match Ok',
  expect: '1',
  source: `(program
 (module (name "t19") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match (Ok 1)
        (case (tag "Ok" (v)) v)
        (case (tag "Err" (e)) 0))))))`
};
