import { TestCase } from '../src/test-types';

export const t73: TestCase = {
  name: 'Test 73: Let-binding type mismatch in body',
  expect: 'TypeError: Type Error in + operand 1: Expected I64, got Str',
  source: `(program
 (module (name "t73") (version 0))
 (defs
  (deffn (name main)
    (args) (ret I64) (eff !Pure)
    (body
      (let (x "string")
      (+ x 1))))))`
};
