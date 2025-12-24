import { TestCase } from '../src/test-types';

export const t32: TestCase = {
  name: 'Test 32: Duplicate Args Error',
  expect: 'TypeError: Duplicate argument name: x',
  source: `(program
 (module (name "t32") (version 0))
 (defs
  (deffn (name foo)
    (args (x I64) (x I64))
    (ret I64) (eff !Pure)
    (body x))
  (deffn (name main)
    (args) (ret I64) (eff !Pure)
    (body (foo 1 2)))))`
};
