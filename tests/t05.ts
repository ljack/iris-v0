import { TestCase } from '../src/test-types';

export const t05: TestCase = {
  name: 'Test 05: None branch',
  expect: '0',
  source: `(program
 (module (name "t05") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body
      (match None
        (case (tag "Some" (v)) v)
        (case (tag "None") 0))))))`
};
