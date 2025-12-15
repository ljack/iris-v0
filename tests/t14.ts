import { TestCase } from '../src/test-types';

export const t14: TestCase = {
  name: 'Test 14: type error intrinsic arg',
  expect: 'TypeError: Type Error in + operand 1: Expected I64, got Bool',
  source: `(program
 (module (name "t14") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (+ true 1)))))`
};
