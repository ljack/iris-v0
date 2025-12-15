import { TestCase } from '../src/test-types';

export const t74: TestCase = {
  name: 'Test 74: Multiple let-bindings with same variable name shadowing',
  expect: '3',
  source: `(program
 (module (name "t74") (version 0))
 (defs
  (deffn (name main)
    (args) (ret I64) (eff !Pure)
    (body
      (let (x 1)
        (let (x 2)
          (let (x 3) x)))))))`
};
