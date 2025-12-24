import { TestCase } from '../src/test-types';

export const t16: TestCase = {
  name: 'Test 16: arity mismatch',
  expect: 'TypeError: Arity mismatch for add10',
  source: `(program
 (module (name "t16") (version 0))
 (defs
  (deffn (name add10) (args (a I64)) (ret I64) (eff !Pure) (body (+ a 10)))
  (deffn (name main)
    (args)
    (ret I64)
    (eff !Pure)
    (body (add10)))))`
};
