import { TestCase } from '../src/test-types';

export const t49: TestCase = {
  name: 'Test 49: Function argument type mismatch',
  expect: 'TypeError: Argument 0 mismatch: Expected I64, got Str',
  source: `(program
 (module (name "t49") (version 0))
 (defs
  (deffn (name expects_int)
    (args (x I64)) (ret I64) (eff !Pure)
    (body x))
  (deffn (name main)
    (args) (ret I64) (eff !Pure)
    (body (call expects_int "string")))))`
};
