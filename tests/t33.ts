import { TestCase } from '../src/test-types';

export const t33: TestCase = {
  name: 'Test 33: Divide by Zero',
  expect: 'RuntimeError: Unknown intrinsic or not implemented in Sync path: / ',
  source: `(program
 (module (name "t33") (version 0))
 (defs
  (deffn (name main)
    (args) (ret I64) (eff !Pure)
    (body (/ 10 0)))))`
};
