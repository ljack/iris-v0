import { TestCase } from '../src/test-types';

export const t47: TestCase = {
  name: 'Test 47: Type mismatch in return type - List element type',
  expect: 'TypeError: Expression type mismatch',
  source: `(program
 (module (name "t47") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret (List I64))
    (eff !Pure)
    (body (list (int.const 1) "bad")))))`
};
