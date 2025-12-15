import { TestCase } from '../src/test-types';

export const t31: TestCase = {
  name: 'Test 31: Shadowing correctness',
  expect: '2',
  source: `(program
 (module (name "t31") (version 0))
 (defs
  (deffn (name main)
    (args) (ret I64) (eff !Pure)
    (body (let (x 1) (let (x 2) x))))))`
};
