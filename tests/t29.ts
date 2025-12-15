import { TestCase } from '../src/test-types';

export const t29: TestCase = {
  name: 'Test 29: !Infer pure body infers !Pure',
  expect: '3',
  source: `(program
 (module (name "t29") (version 0))
 (defs
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Infer)
    (body (+ 1 2)))))`
};
