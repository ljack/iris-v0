import { TestCase } from '../src/test-types';

export const t65: TestCase = {
  name: 'Test 65: Chain of function calls with correct types',
  expect: '121',
  source: `(program
 (module (name "t65") (version 0))
 (defs
  (deffn (name double)
    (args (x I64)) (ret I64) (eff !Pure)
    (body (+ x x)))
  (deffn (name add_five)
    (args (x I64)) (ret I64) (eff !Pure)
    (body (+ x 5)))
  (deffn (name main)
    (args) (ret I64) (eff !Pure)
    (body
      (call add_five (call double (call add_five 53)))))))`
};
